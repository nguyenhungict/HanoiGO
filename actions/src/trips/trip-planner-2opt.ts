import { PARKING_BUFFER_MIN } from './trip-planner.constants';
import { calculateVisitWindow, createStop } from './trip-planner-scheduling';
import type { Place, ScheduledStop } from './trip-planner.types';

export interface TimingContext {
  startTimeMin: number;
  endTimeMin: number;
  lunchStart: number;
  lunchEnd: number;
}

export interface RouteSegment {
  place: Place;
  travelFromPrevSec: number;
}

export interface RecomputeResult {
  stops: ScheduledStop[];
  failedAt: number | null;
}

/**
 * Pure synchronous timing reconstruction shared by cascadeRouteTimes (async path
 * that re-fetches Goong on drops) and twoOptImprove (matrix-only path).
 *
 * Given an ordered list of (place, travel-from-previous-seconds), iterate left
 * to right, compute arrive/wait/depart for each stop via calculateVisitWindow.
 * Stops are returned up to (but not including) the first time-window violation;
 * failedAt is the index of the offending stop, or null on full feasibility.
 */
export function recomputeRouteTimings(
  segments: RouteSegment[],
  ctx: TimingContext,
): RecomputeResult {
  const stops: ScheduledStop[] = [];
  let currentTimeMin = ctx.startTimeMin;

  for (let i = 0; i < segments.length; i++) {
    const { place, travelFromPrevSec } = segments[i];
    const travelMin = travelFromPrevSec / 60;
    const arriveMin = currentTimeMin + travelMin + PARKING_BUFFER_MIN;

    const window = calculateVisitWindow(
      place,
      arriveMin,
      ctx.endTimeMin,
      ctx.lunchStart,
      ctx.lunchEnd,
      travelMin,
      PARKING_BUFFER_MIN,
    );

    if (!window) {
      return { stops, failedAt: i };
    }

    stops.push(
      createStop(place, window, travelFromPrevSec, PARKING_BUFFER_MIN),
    );
    currentTimeMin = window.departMin;
  }

  return { stops, failedAt: null };
}

/**
 * 2-opt local search with time-window feasibility check.
 *
 * Construct phase (GNN) makes locally-greedy choices that can leave crossing
 * edges in the route. 2-opt fixes this by trying every reversal of a segment
 * [i..j] (Lin 1965): if the rewired route is shorter AND every stop still fits
 * its open-hours / endTime window, accept. Repeat until no improving feasible
 * swap remains — a 2-opt local minimum.
 *
 * The first stop is fixed because its travel comes from the user origin (via
 * Goong), not from the cluster matrix; reversing it would require a new async
 * lookup. Standard practice for open-path VRP with depot.
 */
export function twoOptImprove(
  route: ScheduledStop[],
  matrix: number[][],
  placeIdToIdx: Map<string, number>,
  ctx: TimingContext,
): ScheduledStop[] {
  if (route.length < 4) return route;

  let best = route;
  let bestTravelSec = best.reduce((s, st) => s + st.travelFromPrevSec, 0);
  const travelToFirstSec = best[0].travelFromPrevSec;

  let improved = true;
  while (improved) {
    improved = false;

    outer: for (let i = 1; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const candidatePlaces: Place[] = best.map((st) => st.place);
        const reversed = candidatePlaces.slice(i, j + 1).reverse();
        candidatePlaces.splice(i, j - i + 1, ...reversed);

        const segments: RouteSegment[] = [
          { place: candidatePlaces[0], travelFromPrevSec: travelToFirstSec },
        ];
        let edgeValid = true;
        for (let k = 1; k < candidatePlaces.length; k++) {
          const fromIdx = placeIdToIdx.get(candidatePlaces[k - 1].id);
          const toIdx = placeIdToIdx.get(candidatePlaces[k].id);
          if (fromIdx === undefined || toIdx === undefined) {
            edgeValid = false;
            break;
          }
          const sec = matrix[fromIdx][toIdx];
          if (!Number.isFinite(sec)) {
            edgeValid = false;
            break;
          }
          segments.push({
            place: candidatePlaces[k],
            travelFromPrevSec: sec,
          });
        }
        if (!edgeValid) continue;

        const { stops, failedAt } = recomputeRouteTimings(segments, ctx);
        if (failedAt !== null) continue;

        const newTravelSec = stops.reduce(
          (s, st) => s + st.travelFromPrevSec,
          0,
        );
        if (newTravelSec + 1e-6 < bestTravelSec) {
          best = stops;
          bestTravelSec = newTravelSec;
          improved = true;
          break outer;
        }
      }
    }
  }

  return best;
}
