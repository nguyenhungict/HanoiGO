import type { DayItinerary, Place, ScheduledStop, VisitWindowResult } from './trip-planner.types';

export function calculateVisitWindow(
  place: Place,
  arriveMin: number,
  endTimeMin: number,
  lunchStart: number,
  lunchEnd: number,
): VisitWindowResult | null {
  let startVisitMin = place.alwaysOpen
    ? arriveMin
    : Math.max(arriveMin, place.openTimeStart);
  let waitMin = Math.max(0, startVisitMin - arriveMin);

  const blockedWindows: { start: number; end: number }[] = [];
  if (place.hasBreak && place.breakEnd > place.breakStart) {
    blockedWindows.push({ start: place.breakStart, end: place.breakEnd });
  }
  if (lunchEnd > lunchStart) {
    blockedWindows.push({ start: lunchStart, end: lunchEnd });
  }
  blockedWindows.sort((a, b) => a.start - b.start);

  for (let pass = 0; pass < blockedWindows.length + 1; pass++) {
    let shifted = false;
    for (const window of blockedWindows) {
      const overlapsWindow =
        startVisitMin < window.end &&
        startVisitMin + place.visitDurationMin > window.start;
      if (overlapsWindow) {
        waitMin += window.end - startVisitMin;
        startVisitMin = window.end;
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
  day.totalTravelSec = day.stops.reduce((sum, stop) => sum + stop.travelFromPrevSec, 0);
  day.totalWaitMin = day.stops.reduce((sum, stop) => sum + stop.waitMin, 0);
}
