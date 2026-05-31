import { recomputeRouteTimings, twoOptImprove } from './trip-planner-2opt';
import type { Place, ScheduledStop } from './trip-planner.types';

function makePlace(id: string, lat: number, lng: number, overrides: Partial<Place> = {}): Place {
  return {
    id,
    name: id,
    category: 'LANDMARK',
    district: 'D',
    lat,
    lng,
    imageUrl: null,
    alwaysOpen: true,
    openDays: [0, 1, 2, 3, 4, 5, 6],
    openTimeStart: 0,
    openTimeEnd: 1440,
    hasBreak: false,
    breakStart: 0,
    breakEnd: 0,
    visitDurationMin: 30,
    ...overrides,
  };
}

function stopOf(place: Place, travelFromPrevSec: number): ScheduledStop {
  return {
    place,
    arriveMin: 0,
    waitMin: 0,
    startVisitMin: 0,
    departMin: 0,
    travelFromPrevSec,
    parkingBufferMin: 0,
    status: 'OK',
  };
}

describe('recomputeRouteTimings', () => {
  const ctx = {
    startTimeMin: 480,
    endTimeMin: 1080,
    lunchStart: 660,
    lunchEnd: 780,
  };

  it('full feasibility → failedAt is null and stops length matches input', () => {
    const A = makePlace('A', 0, 0);
    const B = makePlace('B', 0, 1);
    const result = recomputeRouteTimings(
      [
        { place: A, travelFromPrevSec: 0 },
        { place: B, travelFromPrevSec: 300 },
      ],
      ctx,
    );
    expect(result.failedAt).toBeNull();
    expect(result.stops).toHaveLength(2);
    expect(result.stops[0].place.id).toBe('A');
    expect(result.stops[1].place.id).toBe('B');
  });

  it('flags the first stop that exceeds endTime', () => {
    const A = makePlace('A', 0, 0, { visitDurationMin: 30 });
    // B opens at 17:00 and needs 120 min visit → depart at 19:00 > endTime 18:00
    const B = makePlace('B', 0, 1, {
      alwaysOpen: false,
      openTimeStart: 17 * 60,
      openTimeEnd: 23 * 60,
      visitDurationMin: 120,
    });
    const result = recomputeRouteTimings(
      [
        { place: A, travelFromPrevSec: 0 },
        { place: B, travelFromPrevSec: 60 },
      ],
      ctx,
    );
    expect(result.failedAt).toBe(1);
    expect(result.stops).toHaveLength(1);
    expect(result.stops[0].place.id).toBe('A');
  });

  it('rejects Infinity travel times (Goong NOT_FOUND case is upstream — defensive check)', () => {
    // recomputeRouteTimings itself doesn't filter Infinity, but calculateVisitWindow
    // returning null for a wildly-late arrive surfaces it as a failedAt.
    const A = makePlace('A', 0, 0, {
      alwaysOpen: false,
      openTimeStart: 480,
      openTimeEnd: 540,
    });
    const result = recomputeRouteTimings(
      [{ place: A, travelFromPrevSec: 10 * 3600 }],
      ctx,
    );
    expect(result.failedAt).toBe(0);
  });
});

describe('twoOptImprove', () => {
  const ctx = {
    startTimeMin: 480,
    endTimeMin: 1200,
    lunchStart: 660,
    lunchEnd: 780,
  };

  it('reverses a crossing segment when it strictly reduces total travel', () => {
    // Four points in a square where the GNN-ish order A→B→C→D crosses itself.
    // Matrix is hand-crafted so reversing positions [1..2] turns the path into
    // A→C→B→D which is dramatically shorter.
    const A = makePlace('A', 0, 0);
    const B = makePlace('B', 0, 1);
    const C = makePlace('C', 1, 0);
    const D = makePlace('D', 1, 1);
    const places = [A, B, C, D];
    const idx = new Map(places.map((p, i) => [p.id, i] as const));
    const m = (sec: number) => sec;
    const matrix = [
      [0, m(6000), m(300), m(6000)],
      [m(6000), 0, m(6000), m(300)],
      [m(300), m(6000), 0, m(6000)],
      [m(6000), m(300), m(6000), 0],
    ];

    const route: ScheduledStop[] = [
      stopOf(A, 0),
      stopOf(B, m(6000)),
      stopOf(C, m(6000)),
      stopOf(D, m(6000)),
    ];

    const improved = twoOptImprove(route, matrix, idx, ctx);

    expect(improved.map((s) => s.place.id)).toEqual(['A', 'C', 'B', 'D']);

    const oldTravel = route.reduce((s, st) => s + st.travelFromPrevSec, 0);
    const newTravel = improved.reduce((s, st) => s + st.travelFromPrevSec, 0);
    expect(newTravel).toBeLessThan(oldTravel);
  });

  it('returns input unchanged when no improving swap exists', () => {
    const A = makePlace('A', 0, 0);
    const B = makePlace('B', 0, 1);
    const C = makePlace('C', 0, 2);
    const D = makePlace('D', 0, 3);
    const places = [A, B, C, D];
    const idx = new Map(places.map((p, i) => [p.id, i] as const));
    const matrix = [
      [0, 60, 120, 180],
      [60, 0, 60, 120],
      [120, 60, 0, 60],
      [180, 120, 60, 0],
    ];

    const route: ScheduledStop[] = [
      stopOf(A, 0),
      stopOf(B, 60),
      stopOf(C, 60),
      stopOf(D, 60),
    ];

    const improved = twoOptImprove(route, matrix, idx, ctx);
    expect(improved.map((s) => s.place.id)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('no-ops on routes shorter than 4 stops', () => {
    const A = makePlace('A', 0, 0);
    const B = makePlace('B', 0, 1);
    const C = makePlace('C', 0, 2);
    const matrix = [
      [0, 60, 120],
      [60, 0, 60],
      [120, 60, 0],
    ];
    const idx = new Map([A, B, C].map((p, i) => [p.id, i] as const));
    const route: ScheduledStop[] = [stopOf(A, 0), stopOf(B, 60), stopOf(C, 60)];
    const improved = twoOptImprove(route, matrix, idx, ctx);
    expect(improved).toBe(route);
  });

  it('keeps the first stop fixed (depot invariant) even when reversal would help', () => {
    // Hand-crafted matrix where reversing [0..3] would be best, but 2-opt must
    // not touch index 0 because its travel comes from user origin (not the matrix).
    const A = makePlace('A', 0, 0);
    const B = makePlace('B', 0, 1);
    const C = makePlace('C', 1, 0);
    const D = makePlace('D', 1, 1);
    const places = [A, B, C, D];
    const idx = new Map(places.map((p, i) => [p.id, i] as const));
    // Tight matrix: best after-fixing-A order should be A,C,B,D (reverse [1..2])
    const matrix = [
      [0, 6000, 300, 6000],
      [6000, 0, 6000, 300],
      [300, 6000, 0, 6000],
      [6000, 300, 6000, 0],
    ];
    const route: ScheduledStop[] = [
      stopOf(A, 0),
      stopOf(B, 6000),
      stopOf(C, 6000),
      stopOf(D, 6000),
    ];
    const improved = twoOptImprove(route, matrix, idx, ctx);
    expect(improved[0].place.id).toBe('A');
  });

  it('rejects an improving swap that breaks a time-window constraint', () => {
    // Set up so the only improving (1,2)-reversal makes B arrive past its closing.
    // Original A→B→C→D: B is visited early (feasible).
    // Reversed A→C→B→D: B is visited later (past openTimeEnd) → infeasible → reject.
    const A = makePlace('A', 0, 0, { visitDurationMin: 30 });
    const B = makePlace('B', 0, 1, {
      alwaysOpen: false,
      openTimeStart: 480,
      openTimeEnd: 600, // tight: visit must end by 10:00
      visitDurationMin: 30,
    });
    const C = makePlace('C', 1, 0, { visitDurationMin: 30 });
    const D = makePlace('D', 1, 1, { visitDurationMin: 30 });
    const places = [A, B, C, D];
    const idx = new Map(places.map((p, i) => [p.id, i] as const));

    // Asymmetric matrix where ONLY the (1,2) reversal improves travel:
    //   D→C is deliberately expensive (6000s) so reversing positions involving
    //   the C↔D edge becomes worse, not better.
    const matrix = [
      [0, 1800, 300, 1800],
      [1800, 0, 1800, 300],
      [300, 1800, 0, 1800],
      [1800, 300, 6000, 0],
    ];

    const route: ScheduledStop[] = [
      stopOf(A, 0),
      stopOf(B, 1800),
      stopOf(C, 1800),
      stopOf(D, 1800),
    ];

    const tightCtx = {
      startTimeMin: 480,
      endTimeMin: 1080,
      lunchStart: 1500,
      lunchEnd: 1500,
    };

    const improved = twoOptImprove(route, matrix, idx, tightCtx);

    // The single improving swap A→C→B→D would visit B at 605–635 (past
    // openTimeEnd=600) → infeasible → rejected. The other two candidates
    // (A→D→C→B and A→B→D→C) have higher travel than the original due to the
    // asymmetric D→C cost → also rejected. Result: original order preserved.
    expect(improved.map((s) => s.place.id)).toEqual(['A', 'B', 'C', 'D']);
  });
});
