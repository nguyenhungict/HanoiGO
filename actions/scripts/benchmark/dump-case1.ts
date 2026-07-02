/** Prints exact Case-1 schedules (HH:MM) for all three methods — for the Gantt figure. */
import { SCENARIOS, byName, FIXTURE } from './fixture-places';
import { loadTravelLookup, installGoongFetchMock, coordKey } from './travel-matrix';
import { byDistrictPlan, randomPlan, simulateDay } from './methods';
import { TripPlannerService } from '../../src/trips/trip-planner.service';
import type { GenerateItineraryDto, ScheduledStop } from '../../src/trips/trip-planner.types';

const m = (x: number) =>
  `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;

function printStops(label: string, stops: ScheduledStop[], dropped: string[]) {
  console.log(`\n[${label}]  visited ${stops.length}`);
  for (const s of stops)
    console.log(`  ${m(s.arriveMin)}-${m(s.departMin)}  ${s.place.name}`);
  console.log('  dropped:', dropped.length ? dropped.join(', ') : '(none)');
}

async function main() {
  const { lookup, mode } = loadTravelLookup();
  console.log(`mode=${mode}`);
  const sc = SCENARIOS[0];
  const places = sc.placeNames.map(byName);
  const startStr = coordKey(sc.startLat!, sc.startLng!);
  const DOW = 4; // 2026-05-07 Thursday

  // HanoiGO via real service
  process.env.GOONG_API_KEY = 'benchmark';
  const restore = installGoongFetchMock(lookup);
  const pad = (n: number) => String(n).padStart(2, '0');
  const hhmm = (x: number) => `${pad(Math.floor(x / 60))}:${pad(x % 60)}`;
  const fakePrisma = {
    $queryRawUnsafe: async (_s: string, vals: string[]) =>
      FIXTURE.filter((p) => vals.includes(p.name)).map((p) => ({
        id: p.id, name: p.name, category: p.category, district: p.district,
        lat: p.lat, lng: p.lng, image_url: null, always_open: p.alwaysOpen,
        open_days: p.openDays, open_time_start: hhmm(p.openTimeStart),
        open_time_end: hhmm(p.openTimeEnd), visit_duration_min: p.visitDurationMin,
      })),
  } as any;
  const dto: GenerateItineraryDto = {
    placeNames: sc.placeNames, numDays: 1, startTime: sc.startTime, endTime: sc.endTime,
    travelDate: sc.travelDate, visitDurationMin: 0, startLat: sc.startLat,
    startLng: sc.startLng, lunchBreakStart: sc.lunchStart, lunchBreakEnd: sc.lunchEnd,
  };
  const res = await new TripPlannerService(fakePrisma).generateItinerary(dto);
  restore();
  console.log('\n[HanoiGO]  visited', res.days[0].stops.length);
  for (const s of res.days[0].stops)
    console.log(`  ${s.arriveAt}-${s.departAt}  ${s.name}`);
  console.log('  dropped:', res.unscheduled.map((u) => u.name).join(', ') || '(none)');

  // Baselines
  const bd = byDistrictPlan(places, 1);
  const bdSim = simulateDay(bd[0], DOW, sc, lookup, startStr);
  printStops('By-District', bdSim.scheduled, bdSim.dropped.map((p) => p.name));

  const rnd = randomPlan(places, 1, 1); // seed 1 = the sample seed
  const rndSim = simulateDay(rnd[0], DOW, sc, lookup, startStr);
  printStops('Random (seed 1)', rndSim.scheduled, rndSim.dropped.map((p) => p.name));
}
main();
