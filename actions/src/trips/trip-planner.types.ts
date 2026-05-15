export interface Place {
  id: string;
  name: string;
  category: string;
  district: string;
  lat: number;
  lng: number;
  imageUrl: string | null;
  alwaysOpen: boolean;
  openDays: number[];
  openTimeStart: number;
  openTimeEnd: number;
  hasBreak: boolean;
  breakStart: number;
  breakEnd: number;
  visitDurationMin: number;
}

export interface ScheduledStop {
  place: Place;
  arriveMin: number;
  waitMin: number;
  startVisitMin: number;
  departMin: number;
  travelFromPrevSec: number;
  parkingBufferMin: number;
  status: 'OK' | 'WAIT' | 'SKIPPED';
}

export interface DayItinerary {
  dayNumber: number;
  dayOfWeek: number;
  stops: ScheduledStop[];
  totalTravelSec: number;
  totalWaitMin: number;
}

export interface VisitWindowResult {
  arriveMin: number;
  waitMin: number;
  startVisitMin: number;
  departMin: number;
}

export interface GenerateItineraryDto {
  placeIds?: string[];
  placeNames?: string[];
  numDays: number;
  startTime: number;
  endTime: number;
  travelDate: string;
  visitDurationMin: number;
  startLat?: number;
  startLng?: number;
  lunchBreakStart?: number;
  lunchBreakEnd?: number;
}

export interface ItineraryStopResponse {
  order: number;
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  district: string;
  imageUrl: string | null;
  arriveAt: string;
  departAt: string;
  visitDurationMin: number;
  travelFromPrevMin: number;
  waitMin: number;
}

export interface ItineraryDayResponse {
  dayNumber: number;
  dayLabel: string;
  color: string;
  stops: ItineraryStopResponse[];
  totalTravelMin: number;
  freeTimeMin: number;
}

export interface ItineraryResponse {
  days: ItineraryDayResponse[];
  infeasible: { name: string; reason: string }[];
  unscheduled: { name: string; reason: string }[];
}

export interface GoongMatrixResponse {
  rows: Array<{
    elements: Array<{
      status: string;
      duration?: {
        value: number;
        text: string;
      };
      distance?: {
        value: number;
        text: string;
      };
    }>;
  }>;
}

export interface DbPlace {
  id: string;
  name: string;
  category: string;
  district: string;
  lat: number;
  lng: number;
  image_url: string | null;
  always_open: boolean;
  open_days: number[];
  open_time_start: Date | string | null;
  open_time_end: Date | string | null;
  has_break: boolean;
  break_start: Date | string | null;
  break_end: Date | string | null;
  visit_duration_min: number;
}
