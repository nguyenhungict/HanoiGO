import {
  AVG_SPEED_KMH,
  DAY_NAMES,
  MAX_PLACES_PER_DAY,
  PARKING_BUFFER_MIN,
} from './trip-planner.constants';
import { haversine } from './trip-planner-geo';
import type {
  DayItinerary,
  Place,
  ScheduledStop,
  VisitWindowResult,
} from './trip-planner.types';
import { minToTime } from './trip-planner.utils';

// STEP 1 — Pre-Filtering. A place closed on every date of the trip can never be
// scheduled, so it leaves the pipeline here instead of being carried through
// clustering and sequencing. Returned as `infeasible` with the reason.
export function preFilter(places: Place[], travelDate: Date, numDays: number) {
  const feasible: Place[] = [];
  const infeasible: { place: Place; reason: string }[] = [];

  for (const place of places) {
    if (place.alwaysOpen) {
      feasible.push(place);
      continue;
    }

    let openOnAnyDay = false;
    for (let d = 0; d < numDays; d++) {
      const dayDate = new Date(travelDate);
      dayDate.setDate(dayDate.getDate() + d);
      if (place.openDays.includes(dayDate.getDay())) {
        openOnAnyDay = true;
        break;
      }
    }

    if (!openOnAnyDay) {
      infeasible.push({
        place,
        reason: `Closed on all travel days (open: [${place.openDays.map((d) => DAY_NAMES[d]).join(',')}])`,
      });
    } else {
      feasible.push(place);
    }
  }
  return { feasible, infeasible };
}

// STEP 4 — Route Sequencing (fallback path, N > BRUTE_FORCE_MAX_PLACES).
// Nearest-neighbour by cost = travel×2 + wait. Only looks one step ahead, so it
// can strand a tight-window place; the exact search above is the primary path
// and this runs only when N! would be too expensive. Unlike the exact search it
// charges NO travel and NO parking buffer for the first stop — the caller's
// cascadeRouteTimes() applies the real GPS first leg afterwards.
export function greedyNearestNeighborWithTimeWindow(
  places: Place[],
  durationMatrix: number[][],
  dayOfWeek: number,
  startTimeMin: number,
  endTimeMin: number,
  lunchStart: number,
  lunchEnd: number,
  startLat?: number,
  startLng?: number,
) {
  const n = places.length;
  const visited = new Array(n).fill(false);
  const route: ScheduledStop[] = [];

  // FIX Bug 1: Find first place — must check openDays
  let firstIdx = -1;
  if (startLat && startLng) {
    let minDistanceToStart = Infinity;
    for (let i = 0; i < n; i++) {
      const p = places[i];
      if (!p.alwaysOpen && !p.openDays.includes(dayOfWeek)) continue;
      const dist = haversine(startLat, startLng, p.lat, p.lng);
      if (dist < minDistanceToStart) {
        minDistanceToStart = dist;
        firstIdx = i;
      }
    }
  } else {
    for (let i = 0; i < n; i++) {
      if (places[i].alwaysOpen || places[i].openDays.includes(dayOfWeek)) {
        firstIdx = i;
        break;
      }
    }
  }

  // No valid first stop found (all closed today)
  if (firstIdx === -1) {
    return {
      route: [],
      droppedInGNN: places.map((p) => ({
        place: p,
        reason: `Closed on ${DAY_NAMES[dayOfWeek]}`,
      })),
    };
  }

  const firstPlace = places[firstIdx];
  const firstWindow = calculateVisitWindow(
    firstPlace,
    startTimeMin,
    endTimeMin,
    lunchStart,
    lunchEnd,
    0, // No travel time for first stop in GNN phase
    0, // No parking buffer for first stop in GNN phase
  );

  if (!firstWindow) {
    return {
      route: [],
      droppedInGNN: places.map((p) => ({
        place: p,
        reason: `Could not fit in day (time window ${minToTime(startTimeMin)}-${minToTime(endTimeMin)})`,
      })),
    };
  }

  let currentTimeMin = firstWindow.departMin;
  let currentIdx = firstIdx;
  visited[firstIdx] = true;

  route.push(createStop(firstPlace, firstWindow, 0, 0));

  while (true) {
    let bestIdx = -1;
    let bestCost = Infinity;
    let bestWindow: VisitWindowResult | null = null;

    for (let j = 0; j < n; j++) {
      if (visited[j]) continue;
      const travelSec = durationMatrix[currentIdx][j];
      const travelMin = travelSec / 60;
      const arriveMin = currentTimeMin + travelMin + PARKING_BUFFER_MIN;
      const place = places[j];

      if (!place.alwaysOpen && !place.openDays.includes(dayOfWeek)) continue;

      const window = calculateVisitWindow(
        place,
        arriveMin,
        endTimeMin,
        lunchStart,
        lunchEnd,
        travelMin,
        PARKING_BUFFER_MIN,
      );

      if (!window) continue;

      // Multiply travelSec by 2 to penalize active travel time over free wait time.
      const cost = travelSec * 2 + window.waitMin * 60;
      if (cost < bestCost) {
        bestCost = cost;
        bestIdx = j;
        bestWindow = window;
      }
    }

    if (bestIdx === -1 || !bestWindow) break;

    visited[bestIdx] = true;
    const chosenPlace = places[bestIdx];
    route.push(
      createStop(
        chosenPlace,
        bestWindow,
        durationMatrix[currentIdx][bestIdx],
        PARKING_BUFFER_MIN,
      ),
    );

    currentIdx = bestIdx;
    currentTimeMin = bestWindow.departMin;
  }

  const droppedInGNN: { place: Place; reason: string }[] = [];
  for (let j = 0; j < n; j++) {
    if (!visited[j]) {
      droppedInGNN.push({
        place: places[j],
        reason: `Could not fit in day (time window ${minToTime(startTimeMin)}-${minToTime(endTimeMin)})`,
      });
    }
  }

  return { route, droppedInGNN };
}

/**
 * STEP 4 — Route Sequencing (primary path).
 *
 * Ranking is two-tier, and both tiers live in the single comparison at the end
 * of evaluate(): the order that schedules the MOST places wins outright, and
 * only ties are broken by the cheaper (2 × travel + wait) score. The two cannot
 * be separated into "pick the places, then order them" — how many places fit
 * DEPENDS on the order, which is precisely why the search is exhaustive.
 *
 * Exact day sequencing: tries every visit order (Heap's algorithm) and keeps the
 * one that schedules the MOST places, breaking ties by least total travel. Unlike
 * the greedy nearest-neighbour heuristic it never misses a place that a different
 * ordering could have fit, which matters for tight time windows (e.g. Ba Dinh's
 * early-closing museums). Same signature/return shape as the greedy version so the
 * two are interchangeable. Caller must keep N within BRUTE_FORCE_MAX_PLACES.
 *
 * When `startTravelSec` is supplied (place id → real start→place seconds, e.g. the
 * prefetched Goong durations) the first leg is charged on the first stop too, so the
 * chosen order stays feasible once the GPS first-leg is applied by cascadeRouteTimes
 * — otherwise a tight-window stop that only fits at an idealised 08:00 start can be
 * silently dropped after the real first leg shifts the whole day later. Without it,
 * the first leg is treated as 0 and the straight-line start→first leg feeds the
 * tie-break score only (used by the greedy fallback path / direct test calls).
 */
export function bruteForceWithTimeWindow(
  places: Place[],
  durationMatrix: number[][],
  dayOfWeek: number,
  startTimeMin: number,
  endTimeMin: number,
  lunchStart: number,
  lunchEnd: number,
  startLat?: number,
  startLng?: number,
  startTravelSec?: Map<string, number>,
): { route: ScheduledStop[]; dropped: { place: Place; reason: string }[] } {
  const openIdx = places
    .map((_, i) => i)
    .filter((i) => places[i].alwaysOpen || places[i].openDays.includes(dayOfWeek));

  const closedDropped = places
    .filter((p) => !p.alwaysOpen && !p.openDays.includes(dayOfWeek))
    .map((p) => ({ place: p, reason: `Closed on ${DAY_NAMES[dayOfWeek]}` }));

  if (openIdx.length === 0) return { route: [], dropped: closedDropped };

  let bestRoute: ScheduledStop[] = [];
  let bestStops = -1;
  let bestTravelScore = Infinity;

  const evaluate = (perm: number[]) => {
    const route: ScheduledStop[] = [];
    let currentTimeMin = startTimeMin;
    let lastIdx = -1;
    let totalTravelSec = 0;
    let totalWaitMin = 0;

    for (const idx of perm) {
      const place = places[idx];
      const isFirst = route.length === 0;
      const startSec = startTravelSec?.get(place.id);
      const travelSec = isFirst
        ? startSec ?? 0
        : durationMatrix[lastIdx][idx];
      const travelMin = travelSec / 60;
      const buffer =
        isFirst && startSec == null ? 0 : PARKING_BUFFER_MIN;
      const arriveMin = isFirst
        ? startTimeMin + travelMin + buffer
        : currentTimeMin + travelMin + buffer;

      const window = calculateVisitWindow(
        place,
        arriveMin,
        endTimeMin,
        lunchStart,
        lunchEnd,
        travelMin,
        buffer,
      );
      if (!window) continue; // infeasible here — skip it, keep filling the order

      route.push(createStop(place, window, travelSec, buffer));
      currentTimeMin = window.departMin;
      lastIdx = idx;
      totalTravelSec += travelSec;
      totalWaitMin += window.waitMin;
    }

    if (route.length === 0) return;

    // Tie-break score mirrors the greedy cost (travel×2 + wait×60) so the exact
    // search shares the same preferences — penalising idle waiting, not just
    // distance. The straight-line start→first leg keeps the first stop start-aware.
    let score = totalTravelSec * 2 + totalWaitMin * 60;
    // Only fold the straight-line start→first leg into the score when the real first
    // leg was NOT already charged above (otherwise it would be double-counted).
    if (startTravelSec == null && startLat != null && startLng != null) {
      const f = route[0].place;
      score +=
        ((haversine(startLat, startLng, f.lat, f.lng) / AVG_SPEED_KMH) * 3600) *
        2;
    }

    if (
      route.length > bestStops ||
      (route.length === bestStops && score < bestTravelScore)
    ) {
      bestStops = route.length;
      bestTravelScore = score;
      bestRoute = route;
    }
  };

  permuteIndices(openIdx, evaluate);

  const scheduledIds = new Set(bestRoute.map((s) => s.place.id));
  const dropped = [
    ...closedDropped,
    ...openIdx
      .filter((i) => !scheduledIds.has(places[i].id))
      .map((i) => ({
        place: places[i],
        reason: `Could not fit in day (time window ${minToTime(startTimeMin)}-${minToTime(endTimeMin)})`,
      })),
  ];

  return { route: bestRoute, dropped };
}

// Heap's algorithm — enumerate every permutation of `items` without allocating
// them all at once, invoking `cb` on each. cb must not mutate the passed array.
function permuteIndices(items: number[], cb: (perm: number[]) => void) {
  const arr = items.slice();
  const n = arr.length;
  const c = new Array(n).fill(0);
  cb(arr);
  let i = 0;
  while (i < n) {
    if (c[i] < i) {
      const swap = i % 2 === 0 ? 0 : c[i];
      [arr[swap], arr[i]] = [arr[i], arr[swap]];
      cb(arr);
      c[i]++;
      i = 0;
    } else {
      c[i] = 0;
      i++;
    }
  }
}

/**
 * Shared feasibility test behind STEP 4 and STEP 5. Given an arrival time,
 * returns the exact visit timing, or null if the visit cannot legally happen:
 *   1. arriving before opening produces idle `waitMin`, not an early visit;
 *   2. a visit overlapping lunch is pushed after it, re-charging the travel leg
 *      from the end of lunch;
 *   3. the visit must END by min(closing time, end of day) — not merely start
 *      before it, which is what forces early-closing sites to the front of a day.
 * Returning null is normal control flow: it is how callers learn a place does
 * not fit this slot, driving both the exact search's ranking and drop→reinsert.
 */
export function calculateVisitWindow(
  place: Place,
  arriveMin: number,
  endTimeMin: number,
  lunchStart: number,
  lunchEnd: number,
  travelMin: number = 0,
  parkingBufferMin: number = 0,
): VisitWindowResult | null {
  let startVisitMin = place.alwaysOpen
    ? arriveMin
    : Math.max(arriveMin, place.openTimeStart);
  let waitMin = Math.max(0, startVisitMin - arriveMin);

  const blockedWindows: { start: number; end: number; isLunch?: boolean }[] =
    [];
  if (lunchEnd > lunchStart) {
    blockedWindows.push({ start: lunchStart, end: lunchEnd, isLunch: true });
  }
  blockedWindows.sort((a, b) => a.start - b.start);

  for (let pass = 0; pass < blockedWindows.length + 1; pass++) {
    let shifted = false;
    for (const window of blockedWindows) {
      const overlapsWindow =
        startVisitMin < window.end &&
        startVisitMin + place.visitDurationMin > window.start;

      if (overlapsWindow) {
        if (window.isLunch) {
          // If pushed by lunch, travel happens AFTER lunch
          arriveMin = window.end + travelMin + parkingBufferMin;
          startVisitMin = place.alwaysOpen
            ? arriveMin
            : Math.max(arriveMin, place.openTimeStart);
          waitMin = Math.max(0, startVisitMin - arriveMin);
        } else {
          // Place's own break: arrive early and wait
          waitMin += window.end - startVisitMin;
          startVisitMin = window.end;
        }
        shifted = true;
        break;
      }
    }
    if (!shifted) break;
  }

  const departMin = startVisitMin + place.visitDurationMin;
  const effectiveClose = place.alwaysOpen
    ? endTimeMin
    : Math.min(place.openTimeEnd, endTimeMin);

  if (departMin > effectiveClose) return null;

  return { arriveMin, waitMin, startVisitMin, departMin };
}

export function createStop(
  place: Place,
  window: VisitWindowResult,
  travelFromPrevSec: number,
  parkingBufferMin: number,
): ScheduledStop {
  return {
    place,
    arriveMin: Math.round(window.arriveMin),
    waitMin: Math.round(window.waitMin),
    startVisitMin: Math.round(window.startVisitMin),
    departMin: Math.round(window.departMin),
    travelFromPrevSec: Math.round(travelFromPrevSec),
    parkingBufferMin,
    status: window.waitMin > 10 ? 'WAIT' : 'OK',
  };
}

export function recomputeDayTotals(day: DayItinerary) {
  day.totalTravelSec = day.stops.reduce(
    (sum, stop) => sum + stop.travelFromPrevSec,
    0,
  );
  day.totalWaitMin = day.stops.reduce((sum, stop) => sum + stop.waitMin, 0);
}

// STEP 2 (second half) — open-day correction after clustering.
// kMeansClustering() is purely spatial and never looks at openDays, so a place
// can land in the cluster of a weekday it is closed on. This pass moves such a
// place to the first other cluster whose day it IS open on and that still has
// room. Note it takes the first eligible cluster, not the geographically
// nearest one: being open outranks being close. If no cluster qualifies the
// place stays put and STEP 4 will drop it, handing it to STEP 5.
export function postClusterOpenDaySwap(
  clusters: Place[][],
  travelDate: Date,
): Place[][] {
  for (let c = 0; c < clusters.length; c++) {
    const dayDate = new Date(travelDate);
    dayDate.setDate(dayDate.getDate() + c);
    const dayOfWeek = dayDate.getDay();

    for (let i = clusters[c].length - 1; i >= 0; i--) {
      const place = clusters[c][i];
      if (place.alwaysOpen) continue;
      if (place.openDays.includes(dayOfWeek)) continue;

      // Place is closed on this cluster's day → find a better cluster
      for (let target = 0; target < clusters.length; target++) {
        if (target === c) continue;
        if (clusters[target].length >= MAX_PLACES_PER_DAY) continue;
        const targetDate = new Date(travelDate);
        targetDate.setDate(targetDate.getDate() + target);
        if (place.openDays.includes(targetDate.getDay())) {
          clusters[c].splice(i, 1);
          clusters[target].push(place);
          break;
        }
      }
    }
  }
  return clusters;
}
