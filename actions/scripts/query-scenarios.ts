/**
 * query-scenarios.ts
 * Queries Supabase DB to build placeId sets for all 13 benchmark scenarios.
 * Run: ts-node scripts/query-scenarios.ts
 * Output: scripts/scenarios.json
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// DAY constants matching openDays[] in DB
const SUN = 0, MON = 1, SAT = 6;

function timeToMin(t: Date | null): number | null {
  if (!t) return null;
  return t.getHours() * 60 + t.getMinutes();
}

function ids(places: { id: string; name: string }[]) {
  return places.map(p => p.id);
}

function label(places: { id: string; name: string; district: string }[]) {
  return places.map(p => `${p.name} (${p.district})`);
}

async function main() {
  const all = await prisma.place.findMany({
    select: {
      id: true, name: true, category: true, district: true,
      lat: true, lng: true,
      alwaysOpen: true, openDays: true,
      openTimeStart: true, openTimeEnd: true,
      visitDurationMin: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log(`\nTotal places in DB: ${all.length}`);

  // ── District summary ─────────────────────────────────────────────────────────
  const byDistrict = new Map<string, typeof all>();
  for (const p of all) {
    if (!byDistrict.has(p.district)) byDistrict.set(p.district, []);
    byDistrict.get(p.district)!.push(p);
  }
  console.log('\nDistricts:');
  for (const [d, places] of [...byDistrict.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${d}: ${places.length} places`);
  }

  // ── Fixed start location: Hồ Hoàn Kiếm (user mock position) ────────────────
  const START_LAT = 21.0285;
  const START_LNG = 105.8542;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const alwaysOpen = all.filter(p => p.alwaysOpen);
  const closedMonday = all.filter(p => !p.alwaysOpen && !p.openDays.includes(MON));
  const openMonday   = all.filter(p => p.alwaysOpen || p.openDays.includes(MON));
  const closedSunday = all.filter(p => !p.alwaysOpen && !p.openDays.includes(SUN));
  const openSunday   = all.filter(p => p.alwaysOpen || p.openDays.includes(SUN));
  const openSaturday = all.filter(p => p.alwaysOpen || p.openDays.includes(SAT));

  const hoanKiem = (byDistrict.get('Hoàn Kiếm') ?? byDistrict.get('Hoan Kiem') ?? []);
  // Find Gia Lam / Bat Trang district
  const giaLam = all.filter(p =>
    p.district.toLowerCase().includes('gia lâm') ||
    p.district.toLowerCase().includes('gia lam') ||
    p.district.toLowerCase().includes('bat trang') ||
    p.district.toLowerCase().includes('bát tràng')
  );



  // Places opening at or after 17:00 (1020 min)
  const openLate = all.filter(p => {
    if (p.alwaysOpen) return false;
    const start = timeToMin(p.openTimeStart);
    return start !== null && start >= 17 * 60;
  });

  // High visitDuration places (for B2 tight schedule)
  const highDuration = [...all]
    .filter(p => (p.visitDurationMin ?? 60) >= 60)
    .sort((a, b) => (b.visitDurationMin ?? 60) - (a.visitDurationMin ?? 60));

  // ── Build scenarios ───────────────────────────────────────────────────────────
  const scenarios: Record<string, {
    description: string;
    numDays: number;
    travelDate: string;
    startTime: number;
    endTime: number;
    startLat: number;
    startLng: number;
    placeIds: string[];
    placeLabels: string[];
    notes: string;
  }> = {};

  // A1: 1 day, 3 places, Hoàn Kiếm, alwaysOpen
  const a1_pool = alwaysOpen.filter(p =>
    p.district.toLowerCase().includes('hoàn kiếm') ||
    p.district.toLowerCase().includes('hoan kiem')
  );
  const a1 = a1_pool.slice(0, 3);
  scenarios['A1'] = {
    description: 'Tourist nhanh – 1 ngày, 3 điểm, Hoàn Kiếm, mở 24/7',
    numDays: 1, travelDate: '2026-06-07', startTime: 480, endTime: 1260,
    startLat: START_LAT, startLng: START_LNG,
    placeIds: ids(a1), placeLabels: label(a1 as any),
    notes: `alwaysOpen in Hoàn Kiếm (found ${a1_pool.length})`,
  };

  // A2: 2 days, 6 places, 2 clear geographic clusters (2 biggest districts, 3 each)
  const bigDistricts = [...byDistrict.entries()]
    .filter(([, v]) => v.length >= 3)
    .sort((a, b) => b[1].length - a[1].length);
  const [d1Name, d1Places] = bigDistricts[0] ?? ['', []];
  const [d2Name, d2Places] = bigDistricts[1] ?? ['', []];
  const a2 = [...d1Places.slice(0, 3), ...d2Places.slice(0, 3)];
  scenarios['A2'] = {
    description: `Tourist trung – 2 ngày, 6 điểm, 2 cụm (${d1Name} + ${d2Name})`,
    numDays: 2, travelDate: '2026-06-08', startTime: 480, endTime: 1260,
    startLat: START_LAT, startLng: START_LNG,
    placeIds: ids(a2), placeLabels: label(a2 as any),
    notes: `Top-2 districts by count`,
  };

  // A3: 3 days, 10 places, distributed
  const a3 = all.filter(p => p.alwaysOpen || p.openDays.includes(1)).slice(0, 10);
  scenarios['A3'] = {
    description: 'Tourist dài – 3 ngày, 10 điểm, phân tán đều',
    numDays: 3, travelDate: '2026-06-09', startTime: 480, endTime: 1260,
    startLat: START_LAT, startLng: START_LNG,
    placeIds: ids(a3), placeLabels: label(a3 as any),
    notes: 'Open on Monday, first 10',
  };

  // A4: 2 days, 5 places, travel date Saturday
  const a4 = openSaturday.slice(0, 5);
  scenarios['A4'] = {
    description: 'Cuối tuần – 2 ngày, 5 điểm, travel date thứ Bảy',
    numDays: 2, travelDate: '2026-06-06', startTime: 480, endTime: 1260,
    startLat: START_LAT, startLng: START_LNG,
    placeIds: ids(a4), placeLabels: label(a4 as any),
    notes: 'Open on Saturday',
  };

  // A5: 1 day, 4 places, startTime 7:00, endTime 12:00
  const a5_pool = all.filter(p => {
    if (!p.alwaysOpen) {
      const start = timeToMin(p.openTimeStart);
      const end = timeToMin(p.openTimeEnd);
      return start !== null && start <= 420 && end !== null && end >= 720;
    }
    return true;
  });
  const a5 = a5_pool.slice(0, 4);
  scenarios['A5'] = {
    description: 'Buổi sáng – 1 ngày, 4 điểm, 7:00–12:00',
    numDays: 1, travelDate: '2026-06-10', startTime: 420, endTime: 720,
    startLat: START_LAT, startLng: START_LNG,
    placeIds: ids(a5), placeLabels: label(a5 as any),
    notes: `Open before 7am and after 12pm (found ${a5_pool.length})`,
  };

  // B1: 1 day, 5 places, 3 closed on Sunday
  const b1_closed = closedSunday.slice(0, 3);
  const b1_open   = openSunday.filter(p => !b1_closed.find(x => x.id === p.id)).slice(0, 2);
  const b1 = [...b1_closed, ...b1_open];
  scenarios['B1'] = {
    description: 'Đóng cửa hôm đó – 1 ngày (Chủ Nhật), 5 điểm, 3/5 đóng cửa',
    numDays: 1, travelDate: '2026-06-07', startTime: 480, endTime: 1260,
    startLat: START_LAT, startLng: START_LNG,
    placeIds: ids(b1), placeLabels: label(b1 as any),
    notes: `3 closed Sunday + 2 open Sunday (closed pool: ${closedSunday.length})`,
  };

  // B2: 1 day, 5 places, tight schedule — window 8:00–15:00 = 420 min, total visitDuration > 420 min → must drop ≥1
  const b2 = highDuration.slice(0, 5);
  const b2TotalDuration = b2.reduce((s, p) => s + (p.visitDurationMin ?? 60), 0);
  const b2Window = 900 - 480; // 420 min
  scenarios['B2'] = {
    description: `Lịch chật – 1 ngày, 5 điểm, total visitDuration=${b2TotalDuration}min > window ${b2Window}min → buộc drop ≥1`,
    numDays: 1, travelDate: '2026-06-10', startTime: 480, endTime: 900,
    startLat: START_LAT, startLng: START_LNG,
    placeIds: ids(b2), placeLabels: label(b2 as any),
    notes: `Total visitDuration=${b2TotalDuration} min vs ${b2Window} min window. Ratio=${(b2TotalDuration/b2Window*100).toFixed(0)}% (>100% → must drop)`,
  };

  // B3: 2 days, 5 places, 4 Hoàn Kiếm + 1 Gia Lâm (outlier 12km)
  const b3_hk  = hoanKiem.slice(0, 4);
  const b3_gl  = giaLam.slice(0, 1);
  const b3 = [...b3_hk, ...b3_gl];
  scenarios['B3'] = {
    description: 'Outlier địa lý – 2 ngày, 4 Hoàn Kiếm + 1 Gia Lâm/Bát Tràng',
    numDays: 2, travelDate: '2026-06-09', startTime: 480, endTime: 1260,
    startLat: START_LAT, startLng: START_LNG,
    placeIds: ids(b3), placeLabels: label(b3 as any),
    notes: `Hoàn Kiếm pool: ${hoanKiem.length}, Gia Lâm pool: ${giaLam.length}`,
  };

  // B4 (redesigned): 1 day, 4 places, all open evening-only (≥17:00), startTime=8:00
  // Tests wait time: algorithm must schedule long wait before venues open → avg waitTime should be high
  const b4 = openLate.slice(0, 4);
  scenarios['B4'] = {
    description: 'Mở buổi tối – 1 ngày, 4 điểm, tất cả mở từ 17:00+, startTime 8:00',
    numDays: 1, travelDate: '2026-06-10', startTime: 480, endTime: 1320,
    startLat: START_LAT, startLng: START_LNG,
    placeIds: ids(b4), placeLabels: label(b4 as any),
    notes: `All openTimeStart >= 17:00 (pool: ${openLate.length}). Tests avgWaitTime metric — algorithm must schedule ~9h wait before venues open.`,
  };

  // B5: 1 day, 5 places, mix alwaysOpen + openLate (opens ≥17:00)
  const b5_always = alwaysOpen.slice(0, 3);
  const b5_late   = openLate.slice(0, 2);
  const b5 = [...b5_always, ...b5_late];
  scenarios['B5'] = {
    description: 'Mở muộn lẫn lộn – 1 ngày, 3 mở 24/7 + 2 mở từ 17:00',
    numDays: 1, travelDate: '2026-06-10', startTime: 480, endTime: 1260,
    startLat: START_LAT, startLng: START_LNG,
    placeIds: ids(b5), placeLabels: label(b5 as any),
    notes: `openLate pool: ${openLate.length}`,
  };

  // B6: 2 days, 15 places, overload
  const b6 = all.filter(p => p.alwaysOpen || p.openDays.includes(2)).slice(0, 15);
  scenarios['B6'] = {
    description: 'Vượt quá khả năng – 2 ngày, 15 điểm, thuật toán phải drop ≥5',
    numDays: 2, travelDate: '2026-06-10', startTime: 480, endTime: 1260,
    startLat: START_LAT, startLng: START_LNG,
    placeIds: ids(b6), placeLabels: label(b6 as any),
    notes: 'Open on Wednesday, 15 places for 2-day window',
  };

  // B7: 2 days, 7 places, Monday, 4/7 closed on Monday
  const b7_closed = closedMonday.slice(0, 4);
  const b7_open   = openMonday.filter(p => !b7_closed.find(x => x.id === p.id)).slice(0, 3);
  const b7 = [...b7_closed, ...b7_open];
  scenarios['B7'] = {
    description: 'Thứ Hai – 2 ngày, 7 điểm, 4/7 đóng cửa thứ Hai',
    numDays: 2, travelDate: '2026-06-08', startTime: 480, endTime: 1260,
    startLat: START_LAT, startLng: START_LNG,
    placeIds: ids(b7), placeLabels: label(b7 as any),
    notes: `Closed Monday pool: ${closedMonday.length}, open Monday: ${openMonday.length}`,
  };

  // B8: 2 days, 12 places (>10 → Haversine fallback for Goong matrix)
  const b8 = all.filter(p => p.alwaysOpen || p.openDays.includes(2)).slice(0, 12);
  scenarios['B8'] = {
    description: 'Goong fail – 2 ngày, 12 điểm (>10 buộc Haversine fallback)',
    numDays: 2, travelDate: '2026-06-10', startTime: 480, endTime: 1260,
    startLat: START_LAT, startLng: START_LNG,
    placeIds: ids(b8), placeLabels: label(b8 as any),
    notes: 'Goong matrix limited to 10 waypoints, 12 places forces Haversine',
  };

  // ── Group C: 2-opt working-set tests (respecting MAX_PLACES_PER_DAY = 5) ─────
  // 2-opt only runs when a day's cluster has >= 4 stops (trip-planner.service.ts:516),
  // and the system caps every day at MAX_PLACES_PER_DAY = 5 (a realistic limit — few
  // tourists visit more than 5 sites/day). So 2-opt's ENTIRE operating range is routes
  // of exactly 4–5 stops. Group C fills days to that cap inside ONE tight cluster
  // (Hoàn Kiếm, all alwaysOpen) so each day is a full 5-stop route — the only condition
  // under which 2-opt can act. This measures 2-opt's real value within the system's
  // actual constraints, not an artificial large-N regime the app never reaches.

  const hkAlwaysOpen = alwaysOpen.filter(p =>
    p.district.toLowerCase().includes('hoàn kiếm') ||
    p.district.toLowerCase().includes('hoan kiem'),
  );
  console.log(`\nHoàn Kiếm alwaysOpen pool: ${hkAlwaysOpen.length}`);

  // C1: 1 day, 5 places (full cap), all Hoàn Kiếm alwaysOpen → one full 5-stop route.
  // Largest single-day route the system allows → 2-opt's best-case operating point.
  const c1 = hkAlwaysOpen.slice(0, 5);
  scenarios['C1'] = {
    description: '2-opt – 1 ngày, 5 điểm Hoàn Kiếm 24/7 (đầy cap, route 5 stop)',
    numDays: 1, travelDate: '2026-06-10', startTime: 480, endTime: 1260,
    startLat: START_LAT, startLng: START_LNG,
    placeIds: ids(c1), placeLabels: label(c1 as any),
    notes: `Full ${c1.length}-stop single-day route (= MAX_PLACES_PER_DAY). 2-opt's largest possible working set.`,
  };

  // C2: 2 days, 10 places, all Hoàn Kiếm alwaysOpen → two full 5-stop routes.
  // Both days hit the cap → 2-opt runs on each day independently.
  const c2 = hkAlwaysOpen.slice(0, 10);
  scenarios['C2'] = {
    description: '2-opt – 2 ngày, 10 điểm Hoàn Kiếm 24/7 (2 ngày đầy cap 5+5)',
    numDays: 2, travelDate: '2026-06-10', startTime: 480, endTime: 1260,
    startLat: START_LAT, startLng: START_LNG,
    placeIds: ids(c2), placeLabels: label(c2 as any),
    notes: `Two full 5-stop routes. 2-opt runs on both clusters. Tests 2-opt across multiple full days.`,
  };

  // ── Print summary ─────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════');
  console.log('SCENARIO SUMMARY');
  console.log('═══════════════════════════════════════════════');
  for (const [id, s] of Object.entries(scenarios)) {
    const ok = s.placeIds.length >= (id.startsWith('B6') ? 10 : parseInt(s.description.match(/(\d+) điểm/)?.[1] ?? '1'));
    console.log(`\n${id} [${ok ? '✓' : '⚠ INSUFFICIENT DATA'}] ${s.description}`);
    console.log(`   placeIds (${s.placeIds.length}): ${s.placeIds.slice(0, 3).join(', ')}${s.placeIds.length > 3 ? '...' : ''}`);
    console.log(`   places: ${s.placeLabels.join(' | ')}`);
    console.log(`   note: ${s.notes}`);
  }

  // ── Write output ──────────────────────────────────────────────────────────────
  const outPath = path.join(__dirname, 'scenarios.json');
  fs.writeFileSync(outPath, JSON.stringify(scenarios, null, 2), 'utf-8');
  console.log(`\n✓ Written to ${outPath}`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
