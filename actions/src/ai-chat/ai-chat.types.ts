import type { ItineraryResponse } from '../trips/trip-planner.types';

export interface PlacePin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  address: string;
  distanceKm: number;
}

export interface AiChatResponse {
  response: string;
  intent: 'nearby' | 'trip_plan' | 'trip_plan_collecting' | 'general';
  places?: PlacePin[];
  itinerary?: ItineraryResponse;
}

// Partial params collected during multi-turn trip planning conversation
export interface TripPlanParams {
  numDays?: number;
  travelDate?: string;
  startTime?: number;   // minutes from midnight (e.g. 480 = 08:00)
  endTime?: number;     // minutes from midnight
  categories?: string[];
  districts?: string[];
}
