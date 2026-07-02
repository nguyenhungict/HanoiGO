/**
 * fixture-places.ts
 *
 * Controlled benchmark dataset for Chapter 4 (Trip Planner Effectiveness).
 *
 * Coordinates and opening hours are taken from PUBLIC sources (Google Maps / the
 * landmarks' official pages) so the experiment is reproducible and the committee
 * can verify the inputs. These are INPUT data, not invented evaluation results.
 * The `places_data.json` shipped in the repo intentionally omits lat/lng and
 * opening hours (those live in Postgres), so we restate them here as a fixture.
 *
 * openDays: 0=Sun, 1=Mon, ... 6=Sat. Time fields are minutes-from-midnight,
 * matching the production Place model.
 */

import type { Place } from '../../src/trips/trip-planner.types';

/** minutes-from-midnight helper */
const hm = (h: number, m = 0): number => h * 60 + m;

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
/** every day except Monday (common museum closing day) */
const EXCEPT_MON = [0, 2, 3, 4, 5, 6];
/** Ho Chi Minh Mausoleum complex: closed Monday AND Friday */
const EXCEPT_MON_FRI = [0, 2, 3, 4, 6];

interface FixtureSpec {
  name: string;
  district: string;
  category: string;
  lat: number;
  lng: number;
  alwaysOpen?: boolean;
  openDays?: number[];
  open?: [number, number]; // [start, end] in minutes
  visit: number;
}

const SPECS: FixtureSpec[] = [
  // ── Ba Dinh — the "early-closing" cluster that traps naive planners ──
  {
    name: 'Ho Chi Minh Mausoleum',
    district: 'Ba Dinh',
    category: 'Heritage & History',
    lat: 21.0368,
    lng: 105.8345,
    openDays: EXCEPT_MON_FRI,
    open: [hm(7, 30), hm(10, 30)], // closes 10:30 — the classic trap
    visit: 60,
  },
  {
    name: 'Ho Chi Minh Museum',
    district: 'Ba Dinh',
    category: 'Arts & Culture',
    lat: 21.036,
    lng: 105.8347,
    openDays: EXCEPT_MON,
    open: [hm(8), hm(12)], // morning session only -> closes at noon
    visit: 60,
  },
  {
    name: 'One Pillar Pagoda',
    district: 'Ba Dinh',
    category: 'Spiritual',
    lat: 21.0359,
    lng: 105.8336,
    open: [hm(7), hm(18)],
    visit: 30,
  },
  {
    name: 'Imperial Citadel of Thang Long',
    district: 'Ba Dinh',
    category: 'Heritage & History',
    lat: 21.0353,
    lng: 105.84,
    openDays: EXCEPT_MON,
    open: [hm(8), hm(17)],
    visit: 90,
  },
  {
    name: 'B52 Victory Museum',
    district: 'Ba Dinh',
    category: 'Arts & Culture',
    lat: 21.0227,
    lng: 105.8189,
    openDays: EXCEPT_MON_FRI,
    open: [hm(8), hm(16, 30)],
    visit: 60,
  },
  {
    name: 'Quan Thanh Temple',
    district: 'Ba Dinh',
    category: 'Spiritual',
    lat: 21.0451,
    lng: 105.838,
    open: [hm(8), hm(17)],
    visit: 30,
  },

  // ── Hoan Kiem — the dense central core ──
  {
    name: 'Hoan Kiem Lake',
    district: 'Hoan Kiem',
    category: 'Sightseeing',
    lat: 21.0287,
    lng: 105.8525,
    alwaysOpen: true,
    visit: 45,
  },
  {
    name: 'Ngoc Son Temple',
    district: 'Hoan Kiem',
    category: 'Spiritual',
    lat: 21.0309,
    lng: 105.8525,
    open: [hm(7), hm(18)],
    visit: 30,
  },
  {
    name: "St Joseph's Cathedral",
    district: 'Hoan Kiem',
    category: 'Sightseeing',
    lat: 21.0288,
    lng: 105.8489,
    open: [hm(8), hm(19)],
    visit: 30,
  },
  {
    name: 'Hoa Lo Prison',
    district: 'Hoan Kiem',
    category: 'Heritage & History',
    lat: 21.0246,
    lng: 105.8466,
    open: [hm(8), hm(17)],
    visit: 60,
  },
  {
    name: 'Vietnamese Women Museum',
    district: 'Hoan Kiem',
    category: 'Arts & Culture',
    lat: 21.0246,
    lng: 105.8556,
    openDays: EXCEPT_MON,
    open: [hm(8), hm(17)],
    visit: 60,
  },
  {
    name: 'Dong Xuan Market',
    district: 'Hoan Kiem',
    category: 'Shopping',
    lat: 21.0382,
    lng: 105.8497,
    open: [hm(6), hm(18)],
    visit: 45,
  },
  {
    name: 'Hanoi Opera House',
    district: 'Hoan Kiem',
    category: 'Arts & Culture',
    lat: 21.0245,
    lng: 105.8576,
    open: [hm(8), hm(17)],
    visit: 30,
  },

  // ── Dong Da ──
  {
    name: 'Temple of Literature',
    district: 'Dong Da',
    category: 'Heritage & History',
    lat: 21.0294,
    lng: 105.8355,
    open: [hm(8), hm(17)],
    visit: 60,
  },

  // ── Tay Ho ──
  {
    name: 'Tran Quoc Pagoda',
    district: 'Tay Ho',
    category: 'Spiritual',
    lat: 21.0479,
    lng: 105.8357,
    open: [hm(8), hm(16)],
    visit: 30,
  },
  {
    name: 'West Lake Water Park',
    district: 'Tay Ho',
    category: 'Sightseeing',
    lat: 21.0645,
    lng: 105.8217,
    open: [hm(9), hm(18)],
    visit: 90,
  },

  // ── Gia Lam — deliberate geographic outlier (far east of the river) ──
  {
    name: 'Bat Trang Ceramic Village',
    district: 'Gia Lam',
    category: 'Arts & Culture',
    lat: 20.9758,
    lng: 105.9128,
    open: [hm(8), hm(17)],
    visit: 90,
  },

  // ── Hoan Kiem — afternoon-only venue (water puppet shows start 15:00) ──
  {
    name: 'Thang Long Water Puppet Theatre',
    district: 'Hoan Kiem',
    category: 'Arts & Culture',
    lat: 21.0335,
    lng: 105.8536,
    open: [hm(15), hm(21)], // first show 15:00 — traps planners that visit it early
    visit: 60,
  },
];

/** Deterministic id from the name so runs are stable and DB-free. */
function idFromName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const FIXTURE: Place[] = SPECS.map((s) => ({
  id: idFromName(s.name),
  name: s.name,
  category: s.category,
  district: s.district,
  lat: s.lat,
  lng: s.lng,
  imageUrl: null,
  alwaysOpen: s.alwaysOpen ?? false,
  openDays: s.openDays ?? ALL_DAYS,
  openTimeStart: s.open ? s.open[0] : 0,
  openTimeEnd: s.open ? s.open[1] : hm(24),
  visitDurationMin: s.visit,
}));

export function byName(name: string): Place {
  const p = FIXTURE.find((x) => x.name === name);
  if (!p) throw new Error(`Fixture place not found: ${name}`);
  return p;
}

export interface Scenario {
  key: string;
  title: string;
  placeNames: string[];
  numDays: number;
  startTime: number;
  endTime: number;
  lunchStart: number;
  lunchEnd: number;
  /** Thursday 2026-05-07 keeps every fixture place open (avoids Mon/Fri closures). */
  travelDate: string;
  startLat?: number;
  startLng?: number;
}

const COMMON = {
  startTime: hm(8),
  endTime: hm(18),
  lunchStart: hm(11),
  lunchEnd: hm(13),
  travelDate: '2026-05-07', // Thursday
  // Start: a hotel by Hoan Kiem Lake (the typical tourist base).
  startLat: 21.0285,
  startLng: 105.8521,
};

export const SCENARIOS: Scenario[] = [
  {
    key: 'badinh-trap',
    title: 'Case 1 — Ba Dinh early-closing trap (1 day)',
    placeNames: [
      'Vietnamese Women Museum', // nearest to start — the bait
      'Ho Chi Minh Mausoleum', // closes 10:30
      'Ho Chi Minh Museum', // closes 12:00
      'One Pillar Pagoda', // open all day
      'Imperial Citadel of Thang Long',
    ],
    numDays: 1,
    ...COMMON,
  },
  {
    key: 'multi-district-3day',
    title: 'Case 2 — Mixed multi-district trip (3 days, 12 places)',
    placeNames: [
      'Ho Chi Minh Mausoleum',
      'Ho Chi Minh Museum',
      'One Pillar Pagoda',
      'Imperial Citadel of Thang Long',
      'Hoan Kiem Lake',
      'Ngoc Son Temple',
      'Hoa Lo Prison',
      'Vietnamese Women Museum',
      'Temple of Literature',
      'Tran Quoc Pagoda',
      'Dong Xuan Market',
      'Bat Trang Ceramic Village', // far outlier
    ],
    numDays: 3,
    ...COMMON,
  },
  {
    key: 'closed-day-2day',
    title: 'Case 3 — Monday closures (2 days)',
    placeNames: [
      'Ho Chi Minh Museum', // closed Mon
      'Imperial Citadel of Thang Long', // closed Mon
      'One Pillar Pagoda', // open all day
      'Vietnamese Women Museum', // closed Mon
      'Hoan Kiem Lake', // always open
      'Ngoc Son Temple', // open all day
      'Hoa Lo Prison', // open all day
      'Temple of Literature', // open all day
    ],
    numDays: 2,
    ...COMMON,
    travelDate: '2026-05-04', // Monday — day 1 falls on the museum closing day
  },
  {
    key: 'late-opening-1day',
    title: 'Case 4 — Afternoon-only venue (1 day)',
    placeNames: [
      'Thang Long Water Puppet Theatre', // opens 15:00 — must be visited last
      'Hoan Kiem Lake',
      'Ngoc Son Temple',
      "St Joseph's Cathedral",
      'Hoa Lo Prison',
    ],
    numDays: 1,
    ...COMMON,
  },
];
