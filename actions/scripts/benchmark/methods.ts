/**
 * methods.ts
 *
 * The three planning methods compared on Axis A and the metric computation.
 *
 *  - HanoiGO  : the REAL production TripPlannerService.generateItinerary, with
 *               Postgres and the Goong API replaced by in-memory test doubles.
 *  - ByDistrict: places grouped by administrative district, then partitioned across
 *               the available days; visited in listed order (naive manual heuristic).
 *  - Random   : places shuffled and round-robin assigned to days, visited in random
 *               order (seeded for reproducibility, averaged over many seeds).
 *
 * Feasibility for the two baselines is computed with the SAME production function
 * (calculateVisitWindow) the planner uses, so any difference in results comes only
 * from the planning strategy, not from a different time model.
 */

import { TripPlannerService } from '../../src/trips/trip-planner.service';
import {
  calculateVisitWindow,
  createStop,
} from '../../src/trips/trip-planner-scheduling';
import { haversine } from '../../src/trips/trip-planner-geo';
import {
  MAX_PLACES_PER_DAY,
  PARKING_BUFFER_MIN,
} from '../../src/trips/trip-planner.constants';
import type {
  DbPlace,
  GenerateItineraryDto,
  ItineraryResponse,
  Place,
  ScheduledStop,
} from '../../src/trips/trip-planner.types';
import { FIXTURE } from './fixture-places';
import type { Scenario } from './fixture-places';
import {
  coordKey,
  installGoongFetchMock,
  type TravelLookup,
} from './travel-matrix';

export interface Metrics {
  method: string;
  placesVisited: number;
  totalInput: number;
  totalTravelMin: number;
  totalWaitMin: number;
  compactnessKm: number;
  perDay: { day: number; visited: string[] }[];
  droppedNames: string[];
}

// ── helpers ─────────────────────────────────────────────────────────────────

function dayOfWeekFor(sc: Scenario, dayIdx: number): number {
  const base = new Date(sc.travelDate);
  const d = new Date(base);
  d.setDate(base.getDate() + dayIdx);
  return d.getDay();
}

function startStrOf(sc: Scenario): string | undefined {
  return sc.startLat != null && sc.startLng != null
    ? coordKey(sc.startLat, sc.startLng)
    : undefined;
}

/** Mean distance (km) of points to their centroid — how geographically tight a day is. */
function spreadKm(pts: { lat: number; lng: number }[]): number {
  if (pts.length <= 1) return 0;
  const cLat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
  const cLng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
  return (
    pts.reduce((s, p) => s + haversine(p.lat, p.lng, cLat, cLng), 0) / pts.length
  );
}

function avgCompactness(daysPts: { lat: number; lng: number }[][]): number {
  const nonEmpty = daysPts.filter((d) => d.length > 0);
  if (nonEmpty.length === 0) return 0;
  return nonEmpty.reduce((s, d) => s + spreadKm(d), 0) / nonEmpty.length;
}

// ── baseline simulation ──────────────────────────────────────────────────────

/**
 * Walk one day's ordered places against the matrix, dropping any stop that cannot
 * meet its opening hours or the daily end time. Mirrors the production cascade
 * (parking buffer, lunch shift, closing-time check) via calculateVisitWindow.
 */
export function simulateDay(
  ordered: Place[],
  dayOfWeek: number,
  sc: Scenario,
  lookup: TravelLookup,
  startStr?: string,
): { scheduled: ScheduledStop[]; dropped: Place[] } {
  const scheduled: ScheduledStop[] = [];
  const dropped: Place[] = [];
  let currentTime = sc.startTime;
  let lastStr = startStr;

  for (const place of ordered) {
    if (!place.alwaysOpen && !place.openDays.includes(dayOfWeek)) {
      dropped.push(place);
      continue;
    }

    const isFirst = scheduled.length === 0;
    const originStr = isFirst ? startStr : lastStr;
    const travelSec = originStr ? lookup(originStr, coordKey(place.lat, place.lng)) : 0;
    const baseTime = isFirst ? sc.startTime : currentTime;
    const arriveMin = baseTime + travelSec / 60 + PARKING_BUFFER_MIN;

    const window = calculateVisitWindow(
      place,
      arriveMin,
      sc.endTime,
      sc.lunchStart,
      sc.lunchEnd,
      travelSec / 60,
      PARKING_BUFFER_MIN,
    );

    if (!window) {
      dropped.push(place);
      continue;
    }

    scheduled.push(createStop(place, window, travelSec, PARKING_BUFFER_MIN));
    currentTime = window.departMin;
    lastStr = coordKey(place.lat, place.lng);
  }

  return { scheduled, dropped };
}

function metricsFromPlan(
  method: string,
  plan: Place[][],
  sc: Scenario,
  lookup: TravelLookup,
): Metrics {
  const startStr = startStrOf(sc);
  let travelSec = 0;
  let waitMin = 0;
  const perDay: { day: number; visited: string[] }[] = [];
  const droppedNames: string[] = [];
  const daysPts: { lat: number; lng: number }[][] = [];

  plan.forEach((dayPlaces, idx) => {
    const dow = dayOfWeekFor(sc, idx);
    const { scheduled, dropped } = simulateDay(dayPlaces, dow, sc, lookup, startStr);
    travelSec += scheduled.reduce((s, st) => s + st.travelFromPrevSec, 0);
    waitMin += scheduled.reduce((s, st) => s + st.waitMin, 0);
    perDay.push({ day: idx + 1, visited: scheduled.map((s) => s.place.name) });
    droppedNames.push(...dropped.map((p) => p.name));
    daysPts.push(scheduled.map((s) => ({ lat: s.place.lat, lng: s.place.lng })));
  });

  const placesVisited = perDay.reduce((s, d) => s + d.visited.length, 0);
  return {
    method,
    placesVisited,
    totalInput: sc.placeNames.length,
    totalTravelMin: Math.round(travelSec / 60),
    totalWaitMin: Math.round(waitMin),
    compactnessKm: +avgCompactness(daysPts).toFixed(2),
    perDay,
    droppedNames,
  };
}

// ── method 2: By-District ────────────────────────────────────────────────────

export function byDistrictPlan(places: Place[], numDays: number): Place[][] {
  const groups = new Map<string, Place[]>();
  for (const p of places) {
    if (!groups.has(p.district)) groups.set(p.district, []);
    groups.get(p.district)!.push(p);
  }
  // district-contiguous flat list (preserves first-seen district order)
  const flat: Place[] = [];
  for (const g of groups.values()) flat.push(...g);

  const days: Place[][] = Array.from({ length: numDays }, () => []);
  const per = Math.max(1, Math.ceil(flat.length / numDays));
  let di = 0;
  for (const p of flat) {
    if (
      di < numDays - 1 &&
      days[di].length >= Math.min(per, MAX_PLACES_PER_DAY)
    ) {
      di++;
    }
    days[di].push(p);
  }
  return days;
}

export function byDistrictMetrics(
  places: Place[],
  sc: Scenario,
  lookup: TravelLookup,
): Metrics {
  return metricsFromPlan('By-District', byDistrictPlan(places, sc.numDays), sc, lookup);
}

// ── method 3: Random (seeded, averaged) ──────────────────────────────────────

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomPlan(places: Place[], numDays: number, seed: number): Place[][] {
  const rng = mulberry32(seed);
  const shuffled = [...places];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const days: Place[][] = Array.from({ length: numDays }, () => []);
  shuffled.forEach((p, i) => days[i % numDays].push(p));
  return days;
}

export interface RandomResult {
  mean: Metrics; // numeric fields are averages over all seeds
  sample: Metrics; // one representative seed for illustration
}

export function randomMetrics(
  places: Place[],
  sc: Scenario,
  lookup: TravelLookup,
  seeds = 200,
): RandomResult {
  const runs: Metrics[] = [];
  for (let s = 1; s <= seeds; s++) {
    runs.push(metricsFromPlan('Random', randomPlan(places, sc.numDays, s), sc, lookup));
  }
  const avg = (sel: (m: Metrics) => number) =>
    runs.reduce((sum, m) => sum + sel(m), 0) / runs.length;

  const mean: Metrics = {
    method: 'Random (avg)',
    placesVisited: +avg((m) => m.placesVisited).toFixed(2),
    totalInput: sc.placeNames.length,
    totalTravelMin: Math.round(avg((m) => m.totalTravelMin)),
    totalWaitMin: Math.round(avg((m) => m.totalWaitMin)),
    compactnessKm: +avg((m) => m.compactnessKm).toFixed(2),
    perDay: [],
    droppedNames: [],
  };
  return { mean, sample: runs[0] };
}

// ── method 1: HanoiGO (real production service) ──────────────────────────────

function toDbPlaces(values: string[]): DbPlace[] {
  const pad = (n: number) => String(n).padStart(2, '0');
  const hhmm = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
  return FIXTURE.filter(
    (p) => values.includes(p.name) || values.includes(p.id),
  ).map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    district: p.district,
    lat: p.lat,
    lng: p.lng,
    image_url: null,
    always_open: p.alwaysOpen,
    open_days: p.openDays,
    open_time_start: hhmm(p.openTimeStart),
    open_time_end: hhmm(p.openTimeEnd),
    visit_duration_min: p.visitDurationMin,
  }));
}

function metricsFromResponse(res: ItineraryResponse, sc: Scenario): Metrics {
  let travelMin = 0;
  let waitMin = 0;
  const perDay: { day: number; visited: string[] }[] = [];
  const daysPts: { lat: number; lng: number }[][] = [];

  res.days.forEach((day, i) => {
    travelMin += day.totalTravelMin;
    waitMin += day.stops.reduce((s, st) => s + st.waitMin, 0);
    perDay.push({ day: i + 1, visited: day.stops.map((s) => s.name) });
    daysPts.push(day.stops.map((s) => ({ lat: s.lat, lng: s.lng })));
  });

  const placesVisited = perDay.reduce((s, d) => s + d.visited.length, 0);
  const droppedNames = [
    ...res.infeasible.map((x) => x.name),
    ...res.unscheduled.map((x) => x.name),
  ];

  return {
    method: 'HanoiGO',
    placesVisited,
    totalInput: sc.placeNames.length,
    totalTravelMin: Math.round(travelMin),
    totalWaitMin: Math.round(waitMin),
    compactnessKm: +avgCompactness(daysPts).toFixed(2),
    perDay,
    droppedNames,
  };
}

export async function hanoiGoMetrics(
  sc: Scenario,
  lookup: TravelLookup,
): Promise<Metrics> {
  process.env.GOONG_API_KEY = 'benchmark'; // force the Goong code path
  const restore = installGoongFetchMock(lookup);
  try {
    const fakePrisma = {
      $queryRawUnsafe: async (_sql: string, values: string[]) =>
        toDbPlaces(values),
    } as any;
    const service = new TripPlannerService(fakePrisma);
    const dto: GenerateItineraryDto = {
      placeNames: sc.placeNames,
      numDays: sc.numDays,
      startTime: sc.startTime,
      endTime: sc.endTime,
      travelDate: sc.travelDate,
      visitDurationMin: 0, // 0 -> use each place's own visit duration
      startLat: sc.startLat,
      startLng: sc.startLng,
      lunchBreakStart: sc.lunchStart,
      lunchBreakEnd: sc.lunchEnd,
    };
    const res = await service.generateItinerary(dto);
    return metricsFromResponse(res, sc);
  } finally {
    restore();
  }
}
