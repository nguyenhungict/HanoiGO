export const EARTH_RADIUS_KM = 6371;
export const MAX_PLACES_PER_DAY = 5;
// Upper bound for exact (brute-force) day sequencing. At N=8 the search is 8! =
// 40,320 permutations (<1ms); above this we fall back to the greedy heuristic to
// avoid factorial blow-up on pathological many-places/few-days requests.
export const BRUTE_FORCE_MAX_PLACES = 8;
export const PARKING_BUFFER_MIN = 10;
export const AVG_SPEED_KMH = 30;
export const GOONG_API_KEY = process.env.GOONG_API_KEY || '';
export const DEFAULT_LUNCH_START = 660;
export const DEFAULT_LUNCH_END = 780;
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_COLORS = [
  '#3B82F6',
  '#EF4444',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
];
