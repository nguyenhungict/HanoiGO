/**
 * trip-planner-algorithm.spec.ts
 *
 * Study-case tests for the GNN scheduling algorithm using real Hanoi tourism
 * data patterns. Each test is designed to validate (or expose limits of) the
 * Greedy Nearest-Neighbour heuristic against an expected optimal outcome.
 *
 * Run with: npx jest trip-planner-algorithm --verbose
 */

import {
  greedyNearestNeighborWithTimeWindow,
  calculateVisitWindow,
} from './trip-planner-scheduling';
import { haversineFallbackMatrix } from './trip-planner-geo';
import type { Place } from './trip-planner.types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const THURSDAY = 4; // 2026-05-07 is a Thursday
const START_TIME = 480; // 08:00
const END_TIME = 1080; // 18:00
const LUNCH_START = 660; // 11:00
const LUNCH_END = 780; // 13:00

/** Shorthand to build a Place fixture for tests. */
function makePlace(
  id: string,
  name: string,
  lat: number,
  lng: number,
  opts: Partial<
    Pick<
      Place,
      | 'alwaysOpen'
      | 'openDays'
      | 'openTimeStart'
      | 'openTimeEnd'
      | 'visitDurationMin'
      | 'category'
      | 'district'
    >
  > = {},
): Place {
  return {
    id,
    name,
    category: opts.category ?? 'LANDMARK',
    district: opts.district ?? 'Hà Nội',
    lat,
    lng,
    imageUrl: null,
    alwaysOpen: opts.alwaysOpen ?? true,
    openDays: opts.openDays ?? [0, 1, 2, 3, 4, 5, 6],
    openTimeStart: opts.openTimeStart ?? 0,
    openTimeEnd: opts.openTimeEnd ?? 1440,
    visitDurationMin: opts.visitDurationMin ?? 60,
  };
}

/** Extract stop names in order from GNN result. */
function routeNames(
  places: Place[],
  matrix: number[][],
  dayOfWeek: number = THURSDAY,
  startLat?: number,
  startLng?: number,
): string[] {
  const { route } = greedyNearestNeighborWithTimeWindow(
    places,
    matrix,
    dayOfWeek,
    START_TIME,
    END_TIME,
    LUNCH_START,
    LUNCH_END,
    startLat,
    startLng,
  );
  return route.map((s) => s.place.name);
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDY CASE 1 — Hoàn Kiếm loop: tất cả alwaysOpen, GNN = Optimal
// ─────────────────────────────────────────────────────────────────────────────
describe('Case 1 — Hoàn Kiếm loop (alwaysOpen, no time constraints)', () => {
  const places: Place[] = [
    makePlace('hk1', 'Hồ Hoàn Kiếm', 21.0285, 105.8542, { visitDurationMin: 60 }),
    makePlace('hk2', 'Đền Ngọc Sơn', 21.0292, 105.8528, { visitDurationMin: 45 }),
    makePlace('hk3', 'Nhà Thờ Lớn', 21.0287, 105.8489, { visitDurationMin: 30 }),
    makePlace('hk4', 'Phố Hàng Mã', 21.0358, 105.8492, { visitDurationMin: 60 }),
    makePlace('hk5', 'Chợ Đồng Xuân', 21.0380, 105.8499, { visitDurationMin: 45 }),
  ];
  const matrix = haversineFallbackMatrix(places);

  it('nên xếp lịch được cả 5 điểm trong ngày', () => {
    const { route, droppedInGNN } = greedyNearestNeighborWithTimeWindow(
      places,
      matrix,
      THURSDAY,
      START_TIME,
      END_TIME,
      LUNCH_START,
      LUNCH_END,
    );
    expect(route.length).toBe(5);
    expect(droppedInGNN.length).toBe(0);
  });

  it('tổng travel time phải hợp lý (< 120 phút cho khu nội thành)', () => {
    const { route } = greedyNearestNeighborWithTimeWindow(
      places,
      matrix,
      THURSDAY,
      START_TIME,
      END_TIME,
      LUNCH_START,
      LUNCH_END,
    );
    const totalTravelMin = route.reduce(
      (s, st) => s + st.travelFromPrevSec / 60,
      0,
    );
    expect(totalTravelMin).toBeLessThan(120);
  });

  it('khi có điểm xuất phát, stop đầu tiên phải là điểm gần nhất', () => {
    // Khách ở sát Hồ Hoàn Kiếm
    const names = routeNames(places, matrix, THURSDAY, 21.0284, 105.8540);
    expect(names[0]).toBe('Hồ Hoàn Kiếm');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STUDY CASE 2 — Bảo tàng khu Ba Đình: giờ hành chính, GNN đúng
// ─────────────────────────────────────────────────────────────────────────────
describe('Case 2 — Khu Ba Đình: bảo tàng giờ hành chính', () => {
  // Lăng Bác đóng cửa rất sớm (10:30), cần đi trước
  const langBac = makePlace('bd1', 'Lăng Bác', 21.0368, 105.8349, {
    alwaysOpen: false,
    openDays: [0, 1, 2, 3, 4, 5, 6],
    openTimeStart: 450, // 07:30
    openTimeEnd: 630, // 10:30 ← đóng rất sớm
    visitDurationMin: 60,
    category: 'LANDMARK',
  });
  const chuaMotCot = makePlace('bd2', 'Chùa Một Cột', 21.0358, 105.8341, {
    visitDurationMin: 45,
  });
  const baotangHCM = makePlace('bd3', 'Bảo tàng Hồ Chí Minh', 21.0360, 105.8338, {
    alwaysOpen: false,
    openDays: [0, 1, 2, 3, 4, 5, 6],
    openTimeStart: 480, // 08:00
    openTimeEnd: 690, // 11:30 ← đóng sớm
    visitDurationMin: 60,
    category: 'MUSEUM',
  });
  const hoTayGoc = makePlace('bd4', 'Góc Hồ Tây', 21.0531, 105.8281, {
    visitDurationMin: 60,
  });

  const allPlaces = [langBac, chuaMotCot, baotangHCM, hoTayGoc];
  const matrix = haversineFallbackMatrix(allPlaces);

  it('Lăng Bác (đóng 10:30) phải được xếp TRƯỚC 10:30', () => {
    const { route } = greedyNearestNeighborWithTimeWindow(
      allPlaces,
      matrix,
      THURSDAY,
      START_TIME,
      END_TIME,
      LUNCH_START,
      LUNCH_END,
    );
    const langBacStop = route.find((s) => s.place.id === 'bd1');
    expect(langBacStop).toBeDefined();
    // departMin phải ≤ 630 (10:30)
    if (langBacStop) {
      expect(langBacStop.departMin).toBeLessThanOrEqual(630);
    }
  });

  it('[GNN KNOWN LIMITATION] Bảo tàng HCM (đóng 11:30) có thể bị drop nếu GNN chọn điểm xa trước', () => {
    /**
     * GNN tham lam — nếu không có startLat/startLng, nó chọn điểm đầu tiên trong
     * mảng (Lăng Bác). Sau đó greedy chọn Chùa Một Cột (gần Lăng Bác nhất) thay
     * vì Bảo tàng HCM, khiến Bảo tàng HCM bị arrive muộn hơn 11:30 → bị drop.
     *
     * Đây là hành vi đã biết của GNN. Brute Force sẽ tìm được route tốt hơn.
     */
    const { route, droppedInGNN } = greedyNearestNeighborWithTimeWindow(
      allPlaces,
      matrix,
      THURSDAY,
      START_TIME,
      END_TIME,
      LUNCH_START,
      LUNCH_END,
    );

    const scheduled = route.map((s) => s.place.name);
    const dropped = droppedInGNN.map((d) => d.place.name);
    console.log('\n[Case 2 — Ba Đình GNN Result]');
    console.log('  Scheduled:', scheduled);
    console.log('  Dropped  :', dropped);

    // GNN xếp được Lăng Bác (đóng 10:30) và ít nhất 1 điểm khác
    expect(route.some((s) => s.place.id === 'bd1')).toBe(true);
    // Tổng phải có ít nhất 2 điểm (baseline)
    expect(route.length).toBeGreaterThanOrEqual(2);
    // Ghi nhận: nếu Bảo tàng HCM bị drop, đây là giới hạn của GNN
    if (!route.some((s) => s.place.id === 'bd3')) {
      console.log(
        '  ⚠️  Bảo tàng HCM bị GNN drop — Brute Force sẽ giải quyết được case này.',
      );
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STUDY CASE 3 — ⚠️ "Bẫy" GNN: điểm đóng sớm xa hơn điểm đóng muộn
// Đây là case GNN CÓ THỂ sai. Test này xác nhận kết quả.
// ─────────────────────────────────────────────────────────────────────────────
describe('Case 3 — Bẫy GNN: điểm đóng cửa sớm nằm xa điểm xuất phát', () => {
  /**
   * Setup:
   *  - Start: Khách sạn tại Hoàn Kiếm (21.0242, 105.8411)
   *  - A: Bảo tàng Phụ Nữ VN     — gần start (1km),  mở 08–17:00, visit 90 min
   *  - B: Lăng Bác                — xa start (3km),   mở 07:30–10:30, visit 60 min ← ĐÓNG SỚM
   *  - C: Bảo tàng HCM            — xa start (3.2km), mở 08:00–11:30, visit 60 min ← ĐÓNG SỚM
   *  - D: Chùa Một Cột            — xa start (3.1km), mở 24/7, visit 45 min
   *
   * GNN (greedy):
   *   Start → A (gần nhất, 1km) → 08:00–09:30
   *   Từ A → D (gần nhất còn lại) → 09:50–10:35
   *   Từ D → B (Lăng Bác) → arrive ~10:45 → ĐÃ ĐÓNG (10:30) → BỎ
   *   Từ D → C (Bảo tàng HCM) → arrive ~10:45 → còn mở đến 11:30 → fit 10:45–11:45 > 11:30 → BỎ
   *   → GNN chỉ xếp được 3/4 điểm
   *
   * Optimal (Brute Force):
   *   B (07:30–08:30) → C (08:45–09:45) → A (10:00–11:30) → D (11:45–12:30)
   *   → 4/4 điểm ✅
   *
   * Test này kiểm tra xem GNN có xếp được 4 điểm hay không (kỳ vọng có thể fail = GNN sai).
   */

  const startLat = 21.0242;
  const startLng = 105.8411;

  const placeA = makePlace('a', 'Bảo tàng Phụ Nữ VN', 21.0244, 105.8479, {
    alwaysOpen: false,
    openDays: [0, 1, 2, 3, 4, 5, 6],
    openTimeStart: 480,
    openTimeEnd: 1020, // 17:00
    visitDurationMin: 90,
    category: 'MUSEUM',
  });
  const placeB = makePlace('b', 'Lăng Bác', 21.0368, 105.8349, {
    alwaysOpen: false,
    openDays: [0, 1, 2, 3, 4, 5, 6],
    openTimeStart: 450, // 07:30
    openTimeEnd: 630, // 10:30 ← ĐÃ ĐÓNG SỚM
    visitDurationMin: 60,
  });
  const placeC = makePlace('c', 'Bảo tàng HCM', 21.0360, 105.8338, {
    alwaysOpen: false,
    openDays: [0, 1, 2, 3, 4, 5, 6],
    openTimeStart: 480, // 08:00
    openTimeEnd: 690, // 11:30 ← ĐÃ ĐÓNG SỚM
    visitDurationMin: 60,
  });
  const placeD = makePlace('d', 'Chùa Một Cột', 21.0358, 105.8341, {
    visitDurationMin: 45,
  });

  const places = [placeA, placeB, placeC, placeD];
  const matrix = haversineFallbackMatrix(places);

  it('[GNN baseline] ghi nhận số điểm GNN xếp được (có thể < 4)', () => {
    const { route, droppedInGNN } = greedyNearestNeighborWithTimeWindow(
      places,
      matrix,
      THURSDAY,
      START_TIME,
      END_TIME,
      LUNCH_START,
      LUNCH_END,
      startLat,
      startLng,
    );

    const scheduledNames = route.map((s) => s.place.name);
    const droppedNames = droppedInGNN.map((d) => d.place.name);

    console.log('\n[Case 3 — GNN Result]');
    console.log('  Scheduled:', scheduledNames);
    console.log('  Dropped  :', droppedNames);
    console.log(
      '  Total    :',
      route.length,
      '/',
      places.length,
      'điểm',
    );

    // GNN baseline — ghi nhận kết quả thực tế (có thể chỉ 2/4)
    // Test này KHÔNG fail nếu GNN chỉ xếp được 2 điểm —
    // mục đích là DOCUMENT sự chênh lệch so với optimal (4 điểm)
    console.log(
      `  ⚠️  GNN: ${route.length}/4 điểm. Optimal (Brute Force): 4/4 điểm.`,
    );
    if (route.length < 4) {
      console.log(
        '  → GNN dưới mức optimal. Cần Brute Force để đạt kết quả tốt nhất.',
      );
    }
    expect(route.length).toBeGreaterThanOrEqual(1); // luôn xếp được ít nhất 1 điểm
  });

  it('[OPTIMAL check] nếu đi B→C trước, cả 4 điểm đều có thể fit trong ngày', () => {
    /**
     * Kiểm tra độc lập: mô phỏng thủ công route tối ưu B→C→A→D
     * để xác nhận rằng về mặt lý thuyết 4 điểm là khả thi.
     * Nếu test này pass mà GNN baseline chỉ ra 3 điểm → GNN đang dưới optimal.
     */
    const PARKING = 10;

    // Stop 1: B — Lăng Bác, arrive 08:00 (start), no travel
    const windowB = calculateVisitWindow(
      placeB,
      START_TIME,
      END_TIME,
      LUNCH_START,
      LUNCH_END,
    );
    expect(windowB).not.toBeNull();
    const departB = windowB!.departMin; // 08:00 + 60 = 09:00

    // Stop 2: C — Bảo tàng HCM, arrive after B + travel (~5 min) + parking
    const travelBtoC_min = 3; // B và C cách nhau ~150m
    const arriveC = departB + travelBtoC_min + PARKING;
    const windowC = calculateVisitWindow(
      placeC,
      arriveC,
      END_TIME,
      LUNCH_START,
      LUNCH_END,
    );
    expect(windowC).not.toBeNull();
    const departC = windowC!.departMin; // ~09:13 + 60 = ~10:13

    // Stop 3: A — Bảo tàng Phụ Nữ VN, arrive after C + travel (~8km = ~16 min) + parking
    const travelCtoA_min = 18;
    const arriveA = departC + travelCtoA_min + PARKING;
    const windowA = calculateVisitWindow(
      placeA,
      arriveA,
      END_TIME,
      LUNCH_START,
      LUNCH_END,
    );
    expect(windowA).not.toBeNull();
    const departA = windowA!.departMin;

    // Stop 4: D — Chùa Một Cột, arrive after A + travel (~8km = ~16 min) + parking
    const travelAtoD_min = 18;
    const arriveD = departA + travelAtoD_min + PARKING;
    const windowD = calculateVisitWindow(
      placeD,
      arriveD,
      END_TIME,
      LUNCH_START,
      LUNCH_END,
    );
    expect(windowD).not.toBeNull();

    console.log('\n[Case 3 — Optimal Route Simulation B→C→A→D]');
    console.log(
      `  B: depart ${departB} (${Math.floor(departB / 60)}:${String(departB % 60).padStart(2, '0')})`,
    );
    console.log(
      `  C: depart ${departC} (${Math.floor(departC / 60)}:${String(departC % 60).padStart(2, '0')})`,
    );
    console.log(
      `  A: depart ${departA} (${Math.floor(departA / 60)}:${String(departA % 60).padStart(2, '0')})`,
    );
    if (windowD) {
      console.log(
        `  D: depart ${windowD.departMin} (${Math.floor(windowD.departMin / 60)}:${String(windowD.departMin % 60).padStart(2, '0')})`,
      );
    }
    console.log('  → Cả 4 điểm khả thi trong ngày ✅');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STUDY CASE 4 — Quán cafe/bar mở muộn (16:00), không bị GNN drop
// ─────────────────────────────────────────────────────────────────────────────
describe('Case 4 — Điểm mở muộn (cafe, bar): GNN xử lý đúng', () => {
  const places: Place[] = [
    makePlace('hk1', 'Hồ Hoàn Kiếm', 21.0285, 105.8542, { visitDurationMin: 60 }),
    makePlace('hk2', 'Phố Cổ Hà Nội', 21.0345, 105.8516, { visitDurationMin: 90 }),
    makePlace('bar1', 'Tạ Hiện Beer Street', 21.0347, 105.8509, {
      alwaysOpen: false,
      openDays: [0, 1, 2, 3, 4, 5, 6],
      openTimeStart: 960, // 16:00
      openTimeEnd: 1380, // 23:00
      visitDurationMin: 60,
      category: 'BAR',
    }),
  ];
  const matrix = haversineFallbackMatrix(places);

  it('Bar mở 16:00 phải được xếp cuối ngày, không bị drop', () => {
    const { route, droppedInGNN } = greedyNearestNeighborWithTimeWindow(
      places,
      matrix,
      THURSDAY,
      START_TIME,
      END_TIME,
      LUNCH_START,
      LUNCH_END,
    );
    expect(route.length).toBe(3);
    expect(droppedInGNN.length).toBe(0);

    // Bar phải là stop cuối cùng
    expect(route[route.length - 1].place.id).toBe('bar1');
  });

  it('Bar phải có waitMin > 0 (phải chờ đến 16:00)', () => {
    const { route } = greedyNearestNeighborWithTimeWindow(
      places,
      matrix,
      THURSDAY,
      START_TIME,
      END_TIME,
      LUNCH_START,
      LUNCH_END,
    );
    const barStop = route.find((s) => s.place.id === 'bar1');
    expect(barStop).toBeDefined();
    expect(barStop!.waitMin).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STUDY CASE 5 — Điểm đóng cửa hôm đó: phải bị filtered trước GNN
// ─────────────────────────────────────────────────────────────────────────────
describe('Case 5 — Bảo tàng Dân tộc học đóng thứ 2: không xuất hiện trong route', () => {
  const MONDAY = 1;

  const baotangDTH = makePlace('dth', 'Bảo tàng Dân tộc học', 21.0404, 105.7955, {
    alwaysOpen: false,
    openDays: [0, 2, 3, 4, 5, 6], // Không có thứ 2
    openTimeStart: 510, // 08:30
    openTimeEnd: 1050, // 17:30
    visitDurationMin: 120,
    category: 'MUSEUM',
  });
  const hoTayAlways = makePlace('ht', 'Hồ Tây', 21.0547, 105.8163, {
    visitDurationMin: 90,
  });

  const places = [baotangDTH, hoTayAlways];
  const matrix = haversineFallbackMatrix(places);

  it('Bảo tàng DTH không được xuất hiện trong route vào thứ 2', () => {
    const { route, droppedInGNN } = greedyNearestNeighborWithTimeWindow(
      places,
      matrix,
      MONDAY,
      START_TIME,
      END_TIME,
      LUNCH_START,
      LUNCH_END,
    );
    expect(route.some((s) => s.place.id === 'dth')).toBe(false);
    expect(droppedInGNN.some((d) => d.place.id === 'dth')).toBe(true);
  });

  it('Hồ Tây (alwaysOpen) vẫn được xếp vào thứ 2', () => {
    const { route } = greedyNearestNeighborWithTimeWindow(
      places,
      matrix,
      MONDAY,
      START_TIME,
      END_TIME,
      LUNCH_START,
      LUNCH_END,
    );
    expect(route.some((s) => s.place.id === 'ht')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STUDY CASE 6 — Lunch break: không có stop nào bắt đầu trong 11:00–13:00
// ─────────────────────────────────────────────────────────────────────────────
describe('Case 6 — Lunch break: không visit trong 11:00–13:00', () => {
  const places: Place[] = [
    makePlace('p1', 'Văn Miếu Quốc Tử Giám', 21.0277, 105.8358, {
      visitDurationMin: 90,
    }),
    makePlace('p2', 'Bảo tàng Lịch sử QG', 21.0240, 105.8606, {
      visitDurationMin: 90,
    }),
    makePlace('p3', 'Nhà hát Lớn Hà Nội', 21.0242, 105.8576, {
      visitDurationMin: 45,
    }),
  ];
  const matrix = haversineFallbackMatrix(places);

  it('không có stop nào có startVisit trong khung 11:00–13:00', () => {
    const { route } = greedyNearestNeighborWithTimeWindow(
      places,
      matrix,
      THURSDAY,
      START_TIME,
      END_TIME,
      LUNCH_START,
      LUNCH_END,
    );

    for (const stop of route) {
      const startVisit = stop.arriveMin + stop.waitMin;
      const endVisit = startVisit + stop.place.visitDurationMin;

      // startVisit không nằm giữa lunch, hoặc nếu visit bắt đầu trước lunch
      // thì phải kết thúc trước lunch hoặc bắt đầu sau lunch
      const overlapsLunch =
        startVisit < LUNCH_END &&
        endVisit > LUNCH_START &&
        startVisit >= LUNCH_START;

      expect(overlapsLunch).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STUDY CASE 7 — Tính nhất quán thời gian: arrive < depart, stops không chồng
// ─────────────────────────────────────────────────────────────────────────────
describe('Case 7 — Tính hợp lệ thời gian cho mọi route', () => {
  const places: Place[] = [
    makePlace('s1', 'Lăng Bác', 21.0368, 105.8349, {
      alwaysOpen: false,
      openDays: [0, 1, 2, 3, 4, 5, 6],
      openTimeStart: 450,
      openTimeEnd: 630,
      visitDurationMin: 60,
    }),
    makePlace('s2', 'Hồ Hoàn Kiếm', 21.0285, 105.8542, { visitDurationMin: 60 }),
    makePlace('s3', 'Văn Miếu', 21.0277, 105.8358, {
      alwaysOpen: false,
      openDays: [0, 1, 2, 3, 4, 5, 6],
      openTimeStart: 480,
      openTimeEnd: 1050,
      visitDurationMin: 90,
    }),
    makePlace('s4', 'Bảo tàng Mỹ thuật VN', 21.0267, 105.8383, {
      alwaysOpen: false,
      openDays: [0, 1, 2, 3, 4, 5, 6],
      openTimeStart: 540,
      openTimeEnd: 1020,
      visitDurationMin: 90,
    }),
    makePlace('s5', 'Phủ Tây Hồ', 21.0531, 105.8188, { visitDurationMin: 60 }),
  ];
  const matrix = haversineFallbackMatrix(places);

  it('mỗi stop phải có arriveMin < departMin', () => {
    const { route } = greedyNearestNeighborWithTimeWindow(
      places,
      matrix,
      THURSDAY,
      START_TIME,
      END_TIME,
      LUNCH_START,
      LUNCH_END,
    );
    for (const stop of route) {
      expect(stop.arriveMin).toBeLessThanOrEqual(stop.startVisitMin);
      expect(stop.startVisitMin).toBeLessThan(stop.departMin);
    }
  });

  it('stop sau phải arrive sau stop trước depart', () => {
    const { route } = greedyNearestNeighborWithTimeWindow(
      places,
      matrix,
      THURSDAY,
      START_TIME,
      END_TIME,
      LUNCH_START,
      LUNCH_END,
    );
    for (let i = 1; i < route.length; i++) {
      expect(route[i].arriveMin).toBeGreaterThanOrEqual(route[i - 1].departMin);
    }
  });

  it('không có stop nào departMin vượt quá endTime (18:00)', () => {
    const { route } = greedyNearestNeighborWithTimeWindow(
      places,
      matrix,
      THURSDAY,
      START_TIME,
      END_TIME,
      LUNCH_START,
      LUNCH_END,
    );
    for (const stop of route) {
      expect(stop.departMin).toBeLessThanOrEqual(END_TIME);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STUDY CASE 8 — So sánh GNN vs. route tối ưu tay (regression check)
// ─────────────────────────────────────────────────────────────────────────────
describe('Case 8 — GNN vs. known optimal: Bờ Hồ morning tour', () => {
  /**
   * Route tối ưu đã biết cho 3 điểm quanh Hồ Hoàn Kiếm, khởi hành từ ga Hà Nội:
   * Nhà Thờ Lớn → Hồ Hoàn Kiếm → Phố Cổ
   * (Đây là route ngắn nhất về tổng travel khi start từ phía nam Hồ)
   */
  const places: Place[] = [
    makePlace('nhl', 'Nhà Thờ Lớn', 21.0287, 105.8489, { visitDurationMin: 30 }),
    makePlace('hhk', 'Hồ Hoàn Kiếm', 21.0285, 105.8542, { visitDurationMin: 60 }),
    makePlace('pc', 'Phố Cổ Hà Nội', 21.0345, 105.8516, { visitDurationMin: 90 }),
  ];
  const matrix = haversineFallbackMatrix(places);

  // Khách từ ga Hà Nội (phía nam, gần Nhà Thờ Lớn nhất)
  const gaHaNoi = { lat: 21.0242, lng: 105.8411 };

  it('stop đầu tiên phải là Nhà Thờ Lớn (gần ga Hà Nội nhất)', () => {
    const names = routeNames(
      places,
      matrix,
      THURSDAY,
      gaHaNoi.lat,
      gaHaNoi.lng,
    );
    expect(names[0]).toBe('Nhà Thờ Lớn');
  });

  it('cả 3 điểm phải được xếp lịch', () => {
    const { route } = greedyNearestNeighborWithTimeWindow(
      places,
      matrix,
      THURSDAY,
      START_TIME,
      END_TIME,
      LUNCH_START,
      LUNCH_END,
      gaHaNoi.lat,
      gaHaNoi.lng,
    );
    expect(route.length).toBe(3);
  });
});
