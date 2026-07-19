/*
 * setup-demo-trips.ts  (one-off, safe to delete after the defense)
 *
 * 1. Backs up current opening hours of the demo places -> demo-hours-backup.json
 * 2. Aligns those places' opening hours to the Chapter-4 fixture (public hours)
 *    so the live planner reproduces the report's four cases.
 * 3. Deletes the admin account's existing saved trips.
 * 4. Runs the REAL TripPlannerService on the real DB for each case and saves the
 *    resulting itinerary as a Trip owned by the admin.
 *
 * Restore hours later with:  npx ts-node scripts/restore-demo-hours.ts
 */
import { NestFactory } from '@nestjs/core';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TripPlannerService } from '../src/trips/trip-planner.service';
import { TripCrudService } from '../src/trips/trip-crud.service';
import type {
  GenerateItineraryDto,
  ItineraryResponse,
} from '../src/trips/trip-planner.types';
import {
  installGoongFetchMock,
  loadTravelLookup,
} from './benchmark/travel-matrix';

const ADMIN_EMAIL = 'admin@hanoigo.com';
const ALL = [0, 1, 2, 3, 4, 5, 6];
const EXCEPT_MON = [0, 2, 3, 4, 5, 6];
const EXCEPT_MON_FRI = [0, 2, 3, 4, 6];

/** UTC time-of-day Date for a @db.Time column (read path uses UTC hours). */
const t = (h: number, m = 0) => new Date(Date.UTC(1970, 0, 1, h, m));

interface HourCfg {
  alwaysOpen?: boolean;
  start?: [number, number];
  end?: [number, number];
  days?: number[];
  visit: number;
}

// DB name -> fixture opening hours (from scripts/benchmark/fixture-places.ts)
const HOURS: Record<string, HourCfg> = {
  'Ho Chi Minh Mausoleum': { start: [7, 30], end: [10, 30], days: EXCEPT_MON_FRI, visit: 60 },
  'Ho Chi Minh Museum': { start: [8, 0], end: [12, 0], days: EXCEPT_MON, visit: 60 },
  'One Pillar Pagoda': { start: [7, 0], end: [18, 0], days: ALL, visit: 30 },
  'Imperial Citadel of Thang Long': { start: [8, 0], end: [17, 0], days: EXCEPT_MON, visit: 90 },
  "Vietnamese Women's Museum": { start: [8, 0], end: [17, 0], days: EXCEPT_MON, visit: 60 },
  'Hoan Kiem Lake': { alwaysOpen: true, visit: 45 },
  'Ngoc Son Temple': { start: [7, 0], end: [18, 0], days: ALL, visit: 30 },
  'Hoa Lo Prison': { start: [8, 0], end: [17, 0], days: ALL, visit: 60 },
  'Temple of Literature': { start: [8, 0], end: [17, 0], days: ALL, visit: 60 },
  'Chua Tran Quoc': { start: [8, 0], end: [16, 0], days: ALL, visit: 30 },
  'Dong Xuan Market': { start: [6, 0], end: [18, 0], days: ALL, visit: 45 },
  'Bat Trang Ceramic Village': { start: [8, 0], end: [17, 0], days: ALL, visit: 90 },
  'Thang Long Water Puppet Theater': { start: [15, 0], end: [21, 0], days: ALL, visit: 60 },
  "St. Joseph's Cathedral": { start: [8, 0], end: [19, 0], days: ALL, visit: 30 },
};

// DB name -> fixture coordinates [lat, lng] (same public fixture the report used).
// Aligning these makes the live K-Means clustering match the documented benchmark.
const COORDS: Record<string, [number, number]> = {
  'Ho Chi Minh Mausoleum': [21.0368, 105.8345],
  'Ho Chi Minh Museum': [21.036, 105.8347],
  'One Pillar Pagoda': [21.0359, 105.8336],
  'Imperial Citadel of Thang Long': [21.0353, 105.84],
  "Vietnamese Women's Museum": [21.0246, 105.8556],
  'Hoan Kiem Lake': [21.0287, 105.8525],
  'Ngoc Son Temple': [21.0309, 105.8525],
  'Hoa Lo Prison': [21.0246, 105.8466],
  'Temple of Literature': [21.0294, 105.8355],
  'Chua Tran Quoc': [21.0479, 105.8357],
  'Dong Xuan Market': [21.0382, 105.8497],
  'Bat Trang Ceramic Village': [20.9758, 105.9128],
  'Thang Long Water Puppet Theater': [21.0335, 105.8536],
  "St. Joseph's Cathedral": [21.0288, 105.8489],
};

const COMMON = {
  numDays: 1,
  startTime: 8 * 60,
  endTime: 18 * 60,
  lunchBreakStart: 11 * 60,
  lunchBreakEnd: 13 * 60,
  travelDate: '2026-05-07', // Thursday
  startLat: 21.0285,
  startLng: 105.8521, // hotel by Hoan Kiem Lake
};

interface CaseDef {
  title: string;
  placeNames: string[];
  numDays: number;
  travelDate?: string;
}

const CASES: CaseDef[] = [
  {
    title: 'Case 1 — Ba Dinh Early-Closing Trap (1 day)',
    numDays: 1,
    placeNames: [
      "Vietnamese Women's Museum",
      'Ho Chi Minh Mausoleum',
      'Ho Chi Minh Museum',
      'One Pillar Pagoda',
      'Imperial Citadel of Thang Long',
    ],
  },
  {
    title: 'Case 2 — Multi-District Trip (3 days, 12 places)',
    numDays: 3,
    placeNames: [
      'Ho Chi Minh Mausoleum', 'Ho Chi Minh Museum', 'One Pillar Pagoda',
      'Imperial Citadel of Thang Long', 'Hoan Kiem Lake', 'Ngoc Son Temple',
      'Hoa Lo Prison', "Vietnamese Women's Museum", 'Temple of Literature',
      'Chua Tran Quoc', 'Dong Xuan Market', 'Bat Trang Ceramic Village',
    ],
  },
  {
    title: 'Case 3 — Monday Closures (2 days)',
    numDays: 2,
    travelDate: '2026-05-04', // Monday
    placeNames: [
      'Ho Chi Minh Museum', 'Imperial Citadel of Thang Long', 'One Pillar Pagoda',
      "Vietnamese Women's Museum", 'Hoan Kiem Lake', 'Ngoc Son Temple',
      'Hoa Lo Prison', 'Temple of Literature',
    ],
  },
  {
    title: 'Case 4 — Afternoon-Only Venue (1 day)',
    numDays: 1,
    placeNames: [
      'Thang Long Water Puppet Theater', 'Hoan Kiem Lake', 'Ngoc Son Temple',
      "St. Joseph's Cathedral", 'Hoa Lo Prison',
    ],
  },
];

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);
  const planner = app.get(TripPlannerService);
  const crud = app.get(TripCrudService);

  const names = Object.keys(HOURS);

  // ── 1. Backup current hours + coords (guard: never overwrite the original) ─
  const before = await prisma.place.findMany({
    where: { name: { in: names } },
    select: {
      name: true, alwaysOpen: true, openTimeStart: true, openTimeEnd: true,
      openDays: true, visitDurationMin: true, lat: true, lng: true,
    },
  });
  const backupPath = join(__dirname, 'demo-hours-backup.json');
  if (existsSync(backupPath)) {
    console.log(`Backup already exists (original preserved): ${backupPath}`);
  } else {
    writeFileSync(backupPath, JSON.stringify(before, null, 2));
    console.log(`Backed up ${before.length} places -> ${backupPath}`);
  }
  if (before.length !== names.length) {
    const found = new Set(before.map((p) => p.name));
    console.warn('MISSING in DB:', names.filter((n) => !found.has(n)));
  }
  // Separate coords backup (coords are still original on the first coord run).
  const coordsBackupPath = join(__dirname, 'demo-coords-backup.json');
  if (existsSync(coordsBackupPath)) {
    console.log(`Coords backup already exists (original preserved): ${coordsBackupPath}`);
  } else {
    writeFileSync(
      coordsBackupPath,
      JSON.stringify(before.map((p) => ({ name: p.name, lat: p.lat, lng: p.lng })), null, 2),
    );
    console.log(`Backed up original coords -> ${coordsBackupPath}`);
  }

  // ── 2. Align hours + coordinates to the documented fixture ───────────────
  for (const [name, cfg] of Object.entries(HOURS)) {
    const coord = COORDS[name];
    await prisma.place.update({
      where: { name },
      data: {
        ...(coord ? { lat: coord[0], lng: coord[1] } : {}),
        ...(cfg.alwaysOpen
          ? { alwaysOpen: true, visitDurationMin: cfg.visit }
          : {
              alwaysOpen: false,
              openTimeStart: t(cfg.start![0], cfg.start![1]),
              openTimeEnd: t(cfg.end![0], cfg.end![1]),
              openDays: cfg.days,
              visitDurationMin: cfg.visit,
            }),
      },
    });
    // Keep the PostGIS geometry consistent with the new lat/lng.
    if (coord) {
      await prisma.$executeRawUnsafe(
        `UPDATE places SET location = ST_SetSRID(ST_MakePoint($1,$2),4326) WHERE name = $3`,
        coord[1], coord[0], name,
      );
    }
  }

  // Verify write
  const after = await prisma.place.findMany({
    where: { name: { in: names } },
    select: { name: true, alwaysOpen: true, openTimeStart: true, openTimeEnd: true, openDays: true, visitDurationMin: true },
    orderBy: { name: 'asc' },
  });
  console.log('\n=== HOURS AFTER UPDATE ===');
  for (const p of after) {
    const hrs = p.alwaysOpen
      ? '24/7'
      : `${p.openTimeStart?.toISOString().slice(11, 16)}-${p.openTimeEnd?.toISOString().slice(11, 16)}`;
    console.log(`  ${p.name}: ${hrs} days=${JSON.stringify(p.openDays)} visit=${p.visitDurationMin}`);
  }

  // ── 3. Delete admin's existing trips ─────────────────────────────────────
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL }, select: { id: true } });
  if (!admin) throw new Error(`Admin ${ADMIN_EMAIL} not found`);
  const del = await prisma.trip.deleteMany({ where: { userId: admin.id } });
  console.log(`\nDeleted ${del.count} old trip(s) for ${ADMIN_EMAIL}`);

  // ── 4. Generate + save each case ─────────────────────────────────────────
  // Use the SAME frozen Goong matrix the report used (goong-cache.json), not live
  // Goong, so the saved trips reproduce the documented benchmark exactly (e.g. Bat
  // Trang isolated on its own day). Coords are aligned to the fixture, so cache keys
  // match. We count any pair missing from the cache (should be 0).
  const { lookup, mode } = loadTravelLookup();
  const rawCache: Record<string, number> = existsSync(join(__dirname, 'benchmark', 'goong-cache.json'))
    ? JSON.parse(readFileSync(join(__dirname, 'benchmark', 'goong-cache.json'), 'utf8'))
    : {};
  let cacheMisses = 0;
  const restoreFetch = installGoongFetchMock((o, d) => {
    if (o !== d && rawCache[`${o}->${d}`] == null) cacheMisses++;
    return lookup(o, d);
  });
  console.log(`\nTravel matrix mode: ${mode} (frozen cache, ${Object.keys(rawCache).length} pairs)`);

  for (const c of CASES) {
    const dto: GenerateItineraryDto = {
      placeNames: c.placeNames,
      numDays: c.numDays,
      startTime: COMMON.startTime,
      endTime: COMMON.endTime,
      lunchBreakStart: COMMON.lunchBreakStart,
      lunchBreakEnd: COMMON.lunchBreakEnd,
      travelDate: c.travelDate ?? COMMON.travelDate,
      startLat: COMMON.startLat,
      startLng: COMMON.startLng,
    };
    const it: ItineraryResponse = await planner.generateItinerary(dto);

    const scheduled = it.days.reduce((s, d) => s + d.stops.length, 0);
    const saved = await crud.saveTrip(admin.id, {
      title: c.title,
      numDays: c.numDays,
      days: it.days.map((d) => ({
        dayNumber: d.dayNumber,
        district: d.district ?? undefined,
        stops: d.stops.map((s) => ({
          placeId: s.placeId,
          stopOrder: s.order,
          arriveAt: s.arriveAt,
          departAt: s.departAt,
          durationFromPrevS: s.travelFromPrevMin * 60,
          isSkipped: false,
        })),
      })),
    });

    console.log(`\n=== ${c.title} ===`);
    console.log(`  scheduled ${scheduled}/${c.placeNames.length} places over ${it.days.length} day(s) -> trip ${saved.id}`);
    for (const d of it.days) {
      const stops = d.stops.map((s) => `${s.arriveAt} ${s.name}`).join('  |  ');
      console.log(`  Day ${d.dayNumber} (${d.district ?? '-'}): ${stops || '(empty)'}`);
    }
    if (it.infeasible.length) console.log('  infeasible:', it.infeasible.map((x) => x.name).join(', '));
    if (it.unscheduled.length) console.log('  unscheduled:', it.unscheduled.map((x) => x.name).join(', '));
  }

  restoreFetch();
  console.log(`\nCache misses (fell back to Haversine): ${cacheMisses}`);

  await app.close();
  console.log('\nDone.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
