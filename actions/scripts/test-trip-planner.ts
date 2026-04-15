/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║         HanoiGO Trip Planner — Algorithm Test Harness          ║
 * ║                                                                 ║
 * ║  Pipeline: Step 0 (Pre-filter) → Step 1 (K-Means)             ║
 * ║            → Step 2 (OSRM + GNN with Cost Function)           ║
 * ║            → Step 3 (Time-Window Constraints)                  ║
 * ║                                                                 ║
 * ║  Fixes applied:                                                ║
 * ║    #1 Cluster imbalance (MAX_PLACES_PER_DAY rebalance)        ║
 * ║    #2 OSRM crash on single-point cluster                      ║
 * ║    #3 Silent place drop detection                             ║
 * ║    #4 Smart start time (align with first place opening)       ║
 * ║    #5 PARKING_BUFFER for realistic travel time                ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Utility ──────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ── Config ───────────────────────────────────────────────────────────────────
const EARTH_RADIUS_KM = 6371;
const MAX_PLACES_PER_DAY = 5;          // FIX #1: cluster cap
const PARKING_BUFFER_MIN = 10;         // FIX #5: parking + walking buffer per stop

// ── Routing Engine ───────────────────────────────────────────────────────────
// Primary: Goong.io (DistanceMatrix + Direction APIs)
// Legacy:  OSRM (self-hosted, disabled — motorbike.lua profile kept for reference)
const ROUTING_ENGINE: 'GOONG' | 'OSRM' = 'GOONG';
const GOONG_API_KEY = process.env.GOONG_API_KEY || 'YOUR_GOONG_API_KEY';
const ENABLE_DIRECTIONS_TEST = true; // Set to false to save 50% API calls
const OSRM_BASE_URL = 'http://localhost:5000'; // Legacy — only used when ROUTING_ENGINE = 'OSRM'

// ── Interfaces ───────────────────────────────────────────────────────────────
interface Place {
  id: string;
  name: string;
  category: string;
  district: string;
  lat: number;
  lng: number;
  alwaysOpen: boolean;
  openDays: number[];       // [0=Sun, 1=Mon, ..., 6=Sat]
  openTimeStart: number;    // minutes from 00:00 (e.g., 480 = 08:00)
  openTimeEnd: number;      // minutes from 00:00 (e.g., 1020 = 17:00)
  hasBreak: boolean;
  breakStart: number;
  breakEnd: number;
  visitDurationMin: number;
}

interface TripInput {
  placeNames: string[];
  numDays: number;
  startTime: number;             // phút, VD 480 = 8:00 AM
  endTime: number;               // phút, VD 1140 = 19:00
  travelDate: Date;
  visitDurationOverrides?: Record<string, number>;
}

interface ScheduledStop {
  place: Place;
  arriveMin: number;
  waitMin: number;
  startVisitMin: number;
  departMin: number;
  travelFromPrevSec: number;
  parkingBufferMin: number;
  status: 'OK' | 'WAIT' | 'SKIPPED';
  reason?: string;
}

interface DayItinerary {
  dayNumber: number;
  dayOfWeek: number;
  stops: ScheduledStop[];
  totalTravelSec: number;
  totalWaitMin: number;
}

// ── Utility: Time formatting ─────────────────────────────────────────────────
function minToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function dbTimeToMin(dbTime: any): number {
  if (!dbTime) return 0;
  if (dbTime instanceof Date) {
    return dbTime.getUTCHours() * 60 + dbTime.getUTCMinutes();
  }
  const parts = String(dbTime).split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ══════════════════════════════════════════════════════════════════════════════
//  STEP 0: FEASIBILITY PRE-FILTER
// ══════════════════════════════════════════════════════════════════════════════
function preFilter(places: Place[], travelDate: Date, numDays: number): {
  feasible: Place[];
  infeasible: { place: Place; reason: string }[];
} {
  const feasible: Place[] = [];
  const infeasible: { place: Place; reason: string }[] = [];

  for (const place of places) {
    if (place.alwaysOpen) {
      feasible.push(place);
      continue;
    }

    let openOnAnyDay = false;
    for (let d = 0; d < numDays; d++) {
      const dayDate = new Date(travelDate);
      dayDate.setDate(dayDate.getDate() + d);
      const dayOfWeek = dayDate.getDay();
      if (place.openDays.includes(dayOfWeek)) {
        openOnAnyDay = true;
        break;
      }
    }

    if (!openOnAnyDay) {
      infeasible.push({
        place,
        reason: `Closed on all travel days (open days: [${place.openDays.map(d => DAY_NAMES[d]).join(',')}])`,
      });
    } else {
      feasible.push(place);
    }
  }

  return { feasible, infeasible };
}

// ══════════════════════════════════════════════════════════════════════════════
//  STEP 1: K-MEANS CLUSTERING (HAVERSINE) + REBALANCE
// ══════════════════════════════════════════════════════════════════════════════
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
}

function getCentroid(places: Place[]): { lat: number; lng: number } {
  const lat = places.reduce((s, p) => s + p.lat, 0) / places.length;
  const lng = places.reduce((s, p) => s + p.lng, 0) / places.length;
  return { lat, lng };
}

function kMeansClustering(places: Place[], k: number, maxIter: number = 50): Place[][] {
  if (places.length <= k) {
    return places.map((p) => [p]);
  }

  // Initialize centroids spread out
  const centroids: { lat: number; lng: number }[] = [];
  const step = Math.floor(places.length / k);
  for (let i = 0; i < k; i++) {
    centroids.push({ lat: places[i * step].lat, lng: places[i * step].lng });
  }

  let clusters: Place[][] = [];

  for (let iter = 0; iter < maxIter; iter++) {
    clusters = Array.from({ length: k }, () => [] as Place[]);
    for (const place of places) {
      let minDist = Infinity;
      let bestCluster = 0;
      for (let c = 0; c < k; c++) {
        const dist = haversine(place.lat, place.lng, centroids[c].lat, centroids[c].lng);
        if (dist < minDist) {
          minDist = dist;
          bestCluster = c;
        }
      }
      clusters[bestCluster].push(place);
    }

    let converged = true;
    for (let c = 0; c < k; c++) {
      if (clusters[c].length === 0) continue;
      const newLat = clusters[c].reduce((s, p) => s + p.lat, 0) / clusters[c].length;
      const newLng = clusters[c].reduce((s, p) => s + p.lng, 0) / clusters[c].length;
      if (Math.abs(newLat - centroids[c].lat) > 0.0001 || Math.abs(newLng - centroids[c].lng) > 0.0001) {
        converged = false;
      }
      centroids[c] = { lat: newLat, lng: newLng };
    }

    if (converged) break;
  }

  clusters = clusters.filter((c) => c.length > 0);

  // ── FIX #1: Rebalance clusters that exceed MAX_PLACES_PER_DAY ──────────
  // Strategy: pick the candidate that is CLOSEST to destination centroid
  //           AND FARTHEST from source centroid (combined score)
  let rebalanced = false;
  for (const cluster of clusters) {
    while (cluster.length > MAX_PLACES_PER_DAY) {
      const sourceCentroid = getCentroid(cluster);

      // Find the cluster with fewest places (destination)
      let lightestIdx = -1;
      let lightestSize = Infinity;
      for (let c = 0; c < clusters.length; c++) {
        if (clusters[c] === cluster) continue;
        if (clusters[c].length < lightestSize) {
          lightestSize = clusters[c].length;
          lightestIdx = c;
        }
      }

      if (lightestIdx === -1) break;

      const destCentroid = getCentroid(clusters[lightestIdx]);

      // Score each candidate: prefer closer to dest AND farther from source
      let bestMoveIdx = 0;
      let bestScore = Infinity;
      for (let i = 0; i < cluster.length; i++) {
        const distToDest = haversine(cluster[i].lat, cluster[i].lng, destCentroid.lat, destCentroid.lng);
        const distToSource = haversine(cluster[i].lat, cluster[i].lng, sourceCentroid.lat, sourceCentroid.lng);
        // Lower score = better candidate (close to dest, far from source)
        const score = distToDest - distToSource;
        if (score < bestScore) {
          bestScore = score;
          bestMoveIdx = i;
        }
      }

      const moved = cluster.splice(bestMoveIdx, 1)[0];
      const distToDest = haversine(moved.lat, moved.lng, destCentroid.lat, destCentroid.lng);
      clusters[lightestIdx].push(moved);
      rebalanced = true;
      console.log(`  🔄 Rebalanced: moved "${moved.name}" → cluster ${lightestIdx + 1} (${(distToDest * 1000).toFixed(0)}m to dest centroid)`);
    }
  }

  if (rebalanced) {
    console.log(`  ℹ️  Max ${MAX_PLACES_PER_DAY} places per day enforced`);
  }

  return clusters;
}

// ══════════════════════════════════════════════════════════════════════════════
//  STEP 2: GOONG DISTANCE MATRIX + GREEDY NN WITH COST FUNCTION
//  (Legacy OSRM fallback available but disabled)
// ══════════════════════════════════════════════════════════════════════════════

async function getDurationMatrix(places: Place[]): Promise<number[][]> {
  if (places.length <= 1) {
    return [[0]];
  }

  if (ROUTING_ENGINE === 'GOONG') {
    return getGoongDurationMatrix(places);
  } else {
    return getOSRMDurationMatrix(places);
  }
}

async function getGoongDurationMatrix(places: Place[], retryCount = 0): Promise<number[][]> {
  if (GOONG_API_KEY === 'YOUR_GOONG_API_KEY' || !GOONG_API_KEY) {
    console.warn(`  ⚠️  Goong API key not found. Using Haversine fallback.`);
    return haversineFallbackMatrix(places);
  }

  // Goong expects lat,lng separated by '|'
  const coords = places.map((p) => `${p.lat},${p.lng}`).join('|');
  const url = `https://rsapi.goong.io/DistanceMatrix?origins=${coords}&destinations=${coords}&vehicle=bike&api_key=${GOONG_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    // Handle rate limit with retry
    if (data.error?.code === 'OVER_RATE_LIMIT' && retryCount < 3) {
      const waitSec = (retryCount + 1) * 2; // 2s, 4s, 6s
      console.warn(`  ⏳ Rate limited. Retrying in ${waitSec}s... (attempt ${retryCount + 1}/3)`);
      await sleep(waitSec * 1000);
      return getGoongDurationMatrix(places, retryCount + 1);
    }

    if (data.rows && data.rows.length > 0) {
      // Parse N x N matrix. data.rows[i].elements[j].duration.value is in seconds
      return data.rows.map((row: any) =>
        row.elements.map((el: any) => {
          if (el.status === 'OK' && el.duration) {
            return el.duration.value;
          }
          return Infinity;
        })
      );
    } else {
      console.warn(`  ⚠️  Goong returned error/empty: ${JSON.stringify(data)}. Using Haversine fallback.`);
      return haversineFallbackMatrix(places);
    }
  } catch (err) {
    console.warn(`  ⚠️  Goong API unavailable. Using Haversine fallback.`);
    return haversineFallbackMatrix(places);
  }
}

// ── TEST GOONG DIRECTIONS API ───────────────────────────────────────────────
// Step 4: After optimizing the route, we can call Goong Direction API to get polyline/details
async function testGoongDirectionRoute(stops: ScheduledStop[]) {
  if (stops.length < 2 || GOONG_API_KEY === 'YOUR_GOONG_API_KEY' || !GOONG_API_KEY) return;

  // Small delay to avoid rate limiting
  await sleep(1000);

  const origin = `${stops[0].place.lat},${stops[0].place.lng}`;
  const destinations = stops.slice(1).map(s => `${s.place.lat},${s.place.lng}`).join(';');
  
  // NOTE: According to docs, Goong uses `/direction` (lowercase)
  // and `destination` parameter can take multiple semicolon-separated points.
  const url = `https://rsapi.goong.io/direction?origin=${origin}&destination=${destinations}&vehicle=bike&api_key=${GOONG_API_KEY}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      let totalDistanceText = '';
      let totalDurationText = '';
      
      if (route.legs && route.legs.length > 0) {
          const totalDistMeters = route.legs.reduce((acc: number, leg: any) => acc + (leg.distance?.value || 0), 0);
          const totalDurSec = route.legs.reduce((acc: number, leg: any) => acc + (leg.duration?.value || 0), 0);
          totalDistanceText = `${(totalDistMeters / 1000).toFixed(2)} km`;
          totalDurationText = `${Math.round(totalDurSec / 60)} min`;
      }
      
      console.log(`    🗺️  Goong Directions API Success!`);
      console.log(`       • Distance: ${totalDistanceText}`);
      console.log(`       • Duration (Goong): ${totalDurationText}`);
      console.log(`       • Polyline: ${route.overview_polyline?.points?.substring(0, 30)}...`);
    } else {
      console.log(`    ⚠️  Goong Directions API returned no routes. Status: ${JSON.stringify(data.status || data)}`);
    }
  } catch (err) {
      console.warn(`    ⚠️  Goong Direction API error: ${err}`);
  }
}

// ── LEGACY: OSRM Duration Matrix (disabled — kept for reference) ────────────
async function getOSRMDurationMatrix(places: Place[]): Promise<number[][]> {
  // OSRM expects lng,lat separated by ';'
  const coords = places.map((p) => `${p.lng},${p.lat}`).join(';');
  const url = `${OSRM_BASE_URL}/table/v1/driving/${coords}?annotations=duration`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.code !== 'Ok') {
      console.warn(`  ⚠️  OSRM error: ${data.code}. Using Haversine fallback.`);
      return haversineFallbackMatrix(places);
    }

    return data.durations; // seconds
  } catch (err) {
    console.warn(`  ⚠️  OSRM unavailable. Using Haversine fallback (15km/h).`);
    return haversineFallbackMatrix(places);
  }
}

function haversineFallbackMatrix(places: Place[]): number[][] {
  const AVG_SPEED_KMH = 15;
  return places.map((a) =>
    places.map((b) => {
      const distKm = haversine(a.lat, a.lng, b.lat, b.lng);
      return (distKm / AVG_SPEED_KMH) * 3600;
    }),
  );
}

// ── FIX #4: Smart start time based on FIRST place's opening hour ─────────
// The GNN always starts at index 0, so align start time with that place.
function getEffectiveStartTime(firstPlace: Place, defaultStart: number): number {
  if (firstPlace.alwaysOpen) return defaultStart;
  // If first place opens later than default start, wait until it opens
  return Math.max(defaultStart, firstPlace.openTimeStart);
}

/**
 * Greedy Nearest Neighbor with Time-Window-Aware Cost Function
 *
 *   T_arrival(j) = T_current + OSRM_Duration[i][j] + PARKING_BUFFER
 *   T_wait(j)    = max(0, openTimeStart_j - T_arrival)
 *   Cost(j)      = OSRM_Duration[i][j] + T_wait(j) * 60
 *
 *   Skip j if T_arrival > openTimeEnd_j - visitDuration_j
 */
function greedyNearestNeighborWithTimeWindow(
  places: Place[],
  durationMatrix: number[][],
  dayOfWeek: number,
  startTimeMin: number,
  endTimeMin: number,
): { route: ScheduledStop[]; droppedInGNN: { place: Place; reason: string }[] } {
  const n = places.length;
  const visited = new Array(n).fill(false);
  const route: ScheduledStop[] = [];

  // ── FIX #4: Adjust start time to first place's (index 0) opening hour ──
  let currentTimeMin = getEffectiveStartTime(places[0], startTimeMin);

  // Start from index 0
  let currentIdx = 0;
  visited[0] = true;

  const firstPlace = places[0];
  const firstWait = firstPlace.alwaysOpen
    ? 0
    : Math.max(0, firstPlace.openTimeStart - currentTimeMin);
  const firstStartVisit = currentTimeMin + firstWait;

  route.push({
    place: firstPlace,
    arriveMin: currentTimeMin,
    waitMin: firstWait,
    startVisitMin: firstStartVisit,
    departMin: firstStartVisit + firstPlace.visitDurationMin,
    travelFromPrevSec: 0,
    parkingBufferMin: 0,  // no parking needed for first stop
    status: firstWait > 0 ? 'WAIT' : 'OK',
  });

  currentTimeMin = firstStartVisit + firstPlace.visitDurationMin;

  // Greedy loop
  while (true) {
    let bestIdx = -1;
    let bestCost = Infinity;
    let bestArriveMin = 0;
    let bestWaitMin = 0;

    for (let j = 0; j < n; j++) {
      if (visited[j]) continue;

      const travelSec = durationMatrix[currentIdx][j];
      const travelMin = travelSec / 60;
      // FIX #5: Add parking buffer to arrival time
      const arriveMin = currentTimeMin + travelMin + PARKING_BUFFER_MIN;

      const place = places[j];

      // Check open on this day of week
      if (!place.alwaysOpen && !place.openDays.includes(dayOfWeek)) continue;

      // Check closing time feasibility
      const effectiveClose = place.alwaysOpen ? endTimeMin : Math.min(place.openTimeEnd, endTimeMin);
      if (arriveMin > effectiveClose - place.visitDurationMin) continue;

      // Wait time if arriving before opening
      let waitMin = 0;
      if (!place.alwaysOpen && arriveMin < place.openTimeStart) {
        waitMin = place.openTimeStart - arriveMin;
      }
      // Wait through lunch break
      if (place.hasBreak && arriveMin >= place.breakStart && arriveMin < place.breakEnd) {
        waitMin = place.breakEnd - arriveMin;
      }

      // Check if visit would exceed end of day
      const departMin = arriveMin + waitMin + place.visitDurationMin;
      if (departMin > endTimeMin) continue;

      // Cost = travel time + wait time (seconds)
      const cost = travelSec + waitMin * 60;

      if (cost < bestCost) {
        bestCost = cost;
        bestIdx = j;
        bestArriveMin = arriveMin;
        bestWaitMin = waitMin;
      }
    }

    if (bestIdx === -1) break;

    visited[bestIdx] = true;
    const chosenPlace = places[bestIdx];
    const startVisitMin = bestArriveMin + bestWaitMin;
    const departMin = startVisitMin + chosenPlace.visitDurationMin;

    route.push({
      place: chosenPlace,
      arriveMin: Math.round(bestArriveMin),
      waitMin: Math.round(bestWaitMin),
      startVisitMin: Math.round(startVisitMin),
      departMin: Math.round(departMin),
      travelFromPrevSec: Math.round(durationMatrix[currentIdx][bestIdx]),
      parkingBufferMin: PARKING_BUFFER_MIN,
      status: bestWaitMin > 10 ? 'WAIT' : 'OK',
    });

    currentIdx = bestIdx;
    currentTimeMin = departMin;
  }

  // ── FIX #3: Explicitly track places dropped by GNN ─────────────────────
  const droppedInGNN: { place: Place; reason: string }[] = [];
  for (let j = 0; j < n; j++) {
    if (!visited[j]) {
      droppedInGNN.push({
        place: places[j],
        reason: `GNN could not fit in Day (time window ${minToTime(startTimeMin)}-${minToTime(endTimeMin)})`,
      });
    }
  }

  return { route, droppedInGNN };
}

// ══════════════════════════════════════════════════════════════════════════════
//  STEP 3: TIME-WINDOW CONFLICT RESOLUTION (3 LEVELS)
// ══════════════════════════════════════════════════════════════════════════════
function resolveConflicts(
  droppedPlaces: { place: Place; reason: string }[],
  itineraries: DayItinerary[],
  allFeasiblePlaces: Place[],
  endTimeMin: number,
): { resolved: DayItinerary[]; unscheduled: { place: Place; reason: string }[] } {
  const scheduledIds = new Set<string>();
  for (const day of itineraries) {
    for (const stop of day.stops) {
      scheduledIds.add(stop.place.id);
    }
  }

  const unscheduled: { place: Place; reason: string }[] = [];

  for (const { place, reason } of droppedPlaces) {
    if (scheduledIds.has(place.id)) continue; // already scheduled elsewhere

    // Level 2: Try to reassign to a different day
    let reassigned = false;
    for (const day of itineraries) {
      // Check this place is open on that day
      if (!place.alwaysOpen && !place.openDays.includes(day.dayOfWeek)) continue;

      const lastStop = day.stops[day.stops.length - 1];
      const availableTime = lastStop ? endTimeMin - lastStop.departMin : endTimeMin;

      if (availableTime >= place.visitDurationMin + PARKING_BUFFER_MIN + 15) {
        // Can roughly fit — add to this day
        const arriveMin = lastStop ? lastStop.departMin + PARKING_BUFFER_MIN + 10 : 480;
        const waitMin = (!place.alwaysOpen && arriveMin < place.openTimeStart)
          ? place.openTimeStart - arriveMin
          : 0;
        const startVisit = arriveMin + waitMin;
        const departMin = startVisit + place.visitDurationMin;

        if (departMin <= endTimeMin) {
          day.stops.push({
            place,
            arriveMin: Math.round(arriveMin),
            waitMin: Math.round(waitMin),
            startVisitMin: Math.round(startVisit),
            departMin: Math.round(departMin),
            travelFromPrevSec: 600, // estimated 10 min
            parkingBufferMin: PARKING_BUFFER_MIN,
            status: waitMin > 10 ? 'WAIT' : 'OK',
            reason: 'Reassigned (Level 2)',
          });
          scheduledIds.add(place.id);
          reassigned = true;
          console.log(
            `  🔄 Level 2 — Reassigned "${place.name}" → Day ${day.dayNumber} ` +
            `(${minToTime(startVisit)}-${minToTime(departMin)})`,
          );
          break;
        }
      }
    }

    if (!reassigned) {
      // Level 3: Remove & suggest nearby alternatives
      const nearby = allFeasiblePlaces
        .filter((p) =>
          p.id !== place.id &&
          !scheduledIds.has(p.id) &&
          haversine(p.lat, p.lng, place.lat, place.lng) < 0.5,
        )
        .slice(0, 2);

      const altStr = nearby.length > 0
        ? `Nearby alternatives: ${nearby.map((p) => `${p.name} (${Math.round(haversine(p.lat, p.lng, place.lat, place.lng) * 1000)}m)`).join(', ')}`
        : 'No nearby alternatives';

      unscheduled.push({
        place,
        reason: `Level 3 — Could not fit in any day. ${altStr}`,
      });
      console.log(`  ❌ Level 3 — Removed "${place.name}": ${altStr}`);
    }
  }

  return { resolved: itineraries, unscheduled };
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN: RUN FULL PIPELINE
// ══════════════════════════════════════════════════════════════════════════════
async function runTripPlanner(input: TripInput) {
  console.log('\n' + '═'.repeat(70));
  console.log('  🗺️  HanoiGO Trip Planner — Algorithm Test');
  console.log('═'.repeat(70));
  console.log(`  📅 Travel date: ${input.travelDate.toDateString()}`);
  console.log(`  📆 Number of days: ${input.numDays}`);
  console.log(`  ⏰ Daily window: ${minToTime(input.startTime)} → ${minToTime(input.endTime)}`);
  console.log(`  📍 Selected places: ${input.placeNames.length}`);
  console.log(`  🅿️  Parking buffer: ${PARKING_BUFFER_MIN} min/stop`);
  console.log(`  📦 Max per day: ${MAX_PLACES_PER_DAY}`);
  console.log('');

  // ── Fetch places from DB ─────────────────────────────────────────────────
  const dbPlaces = await prisma.$queryRawUnsafe<any[]>(`
    SELECT id, name, category, district, lat, lng,
           always_open, open_days, open_time_start, open_time_end,
           has_break, break_start, break_end,
           visit_duration_min
    FROM places
    WHERE name = ANY($1)
  `, input.placeNames);

  const places: Place[] = dbPlaces.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    district: p.district,
    lat: p.lat,
    lng: p.lng,
    alwaysOpen: p.always_open,
    openDays: p.open_days,
    openTimeStart: dbTimeToMin(p.open_time_start),
    openTimeEnd: dbTimeToMin(p.open_time_end),
    hasBreak: p.has_break,
    breakStart: dbTimeToMin(p.break_start),
    breakEnd: dbTimeToMin(p.break_end),
    visitDurationMin: input.visitDurationOverrides?.[p.name] ?? p.visit_duration_min ?? 60,
  }));

  console.log(`  📦 Found ${places.length}/${input.placeNames.length} places in DB\n`);

  // ── STEP 0: Pre-filter ────────────────────────────────────────────────────
  console.log('─── STEP 0: Feasibility Pre-filter ────────────────────────────────');
  const { feasible, infeasible } = preFilter(places, input.travelDate, input.numDays);

  for (const f of feasible) {
    const days = f.alwaysOpen ? '24/7' : `${minToTime(f.openTimeStart)}-${minToTime(f.openTimeEnd)}`;
    console.log(`  ✅ ${f.name} — ${days}`);
  }
  for (const inf of infeasible) {
    console.log(`  ❌ ${inf.place.name} — ${inf.reason}`);
  }
  console.log(`  → ${feasible.length} feasible, ${infeasible.length} removed\n`);

  if (feasible.length === 0) {
    console.log('  ⚠️  No feasible places! Aborting.');
    return;
  }

  // ── STEP 1: K-Means Clustering + Rebalance ────────────────────────────────
  console.log('─── STEP 1: K-Means Clustering (Haversine) + Rebalance ────────────');
  const clusters = kMeansClustering(feasible, input.numDays);

  clusters.forEach((cluster, i) => {
    const names = cluster.map((p) => p.name).join(', ');
    console.log(`  📍 Day ${i + 1} cluster (${cluster.length} places): ${names}`);
  });
  console.log('');

  // ── STEP 2: Goong DistanceMatrix + Greedy NN ──────────────────────────────
  const engineLabel = ROUTING_ENGINE === 'GOONG' ? 'Goong DistanceMatrix' : 'OSRM Table';
  console.log(`─── STEP 2: ${engineLabel} + Greedy NN (Cost = Duration + T_wait) ────`);
  console.log(`           (+${PARKING_BUFFER_MIN} min parking buffer per stop)`);
  const itineraries: DayItinerary[] = [];
  const allDroppedByGNN: { place: Place; reason: string }[] = [];

  for (let d = 0; d < clusters.length; d++) {
    const cluster = clusters[d];
    const dayDate = new Date(input.travelDate);
    dayDate.setDate(dayDate.getDate() + d);
    const dayOfWeek = dayDate.getDay();

    console.log(`\n  📅 Day ${d + 1} (${DAY_NAMES[dayOfWeek]}):`);

    // FIX #2: Skip API call for single-point cluster
    if (cluster.length === 1) {
      const place = cluster[0];
      const effectiveStart = place.alwaysOpen ? input.startTime : Math.max(input.startTime, place.openTimeStart);
      console.log(
        `    ${minToTime(effectiveStart)} arrive → ` +
        `${minToTime(effectiveStart)} visit → ` +
        `${minToTime(effectiveStart + place.visitDurationMin)} depart  |  ` +
        `${place.name} (${place.visitDurationMin}min)  [🏁 ONLY STOP]`,
      );

      itineraries.push({
        dayNumber: d + 1,
        dayOfWeek,
        stops: [{
          place,
          arriveMin: effectiveStart,
          waitMin: 0,
          startVisitMin: effectiveStart,
          departMin: effectiveStart + place.visitDurationMin,
          travelFromPrevSec: 0,
          parkingBufferMin: 0,
          status: 'OK',
        }],
        totalTravelSec: 0,
        totalWaitMin: 0,
      });
      continue;
    }

    // Get duration matrix (Goong primary, OSRM legacy fallback)
    const matrix = await getDurationMatrix(cluster);

    // Run Greedy NN with time window
    const { route, droppedInGNN } = greedyNearestNeighborWithTimeWindow(
      cluster,
      matrix,
      dayOfWeek,
      input.startTime,
      input.endTime,
    );

    allDroppedByGNN.push(...droppedInGNN);

    let totalTravelSec = 0;
    let totalWaitMin = 0;

    for (const stop of route) {
      totalTravelSec += stop.travelFromPrevSec;
      totalWaitMin += stop.waitMin;

      const travelStr = stop.travelFromPrevSec > 0
        ? `🚗 ${Math.round(stop.travelFromPrevSec / 60)}min + 🅿️ ${stop.parkingBufferMin}min`
        : '🏁 START';
      const waitStr = stop.waitMin > 0 ? ` ⏳ wait ${stop.waitMin}min` : '';

      console.log(
        `    ${minToTime(stop.arriveMin)} arrive → ` +
        `${minToTime(stop.startVisitMin)} visit → ` +
        `${minToTime(stop.departMin)} depart  |  ` +
        `${stop.place.name} (${stop.place.visitDurationMin}min)` +
        `  [${travelStr}${waitStr}]`,
      );
    }

    // Log places dropped by GNN for this day
    for (const drop of droppedInGNN) {
      console.log(`    ⚠️  DROPPED: ${drop.place.name} — ${drop.reason}`);
    }

    // TEST GOONG DIRECTIONS (Optional - costs 1 API call per day)
    if (ENABLE_DIRECTIONS_TEST && ROUTING_ENGINE === 'GOONG' && route.length > 1) {
      await testGoongDirectionRoute(route);
    }

    itineraries.push({
      dayNumber: d + 1,
      dayOfWeek,
      stops: route,
      totalTravelSec,
      totalWaitMin,
    });
  }

  // ── STEP 3: Conflict Resolution ───────────────────────────────────────────
  console.log('\n─── STEP 3: Time-Window Conflict Resolution ──────────────────────');

  if (allDroppedByGNN.length === 0) {
    console.log('  ✅ All places successfully scheduled by GNN!');
  } else {
    console.log(`  ⚠️  ${allDroppedByGNN.length} place(s) dropped by GNN — attempting resolution...`);
  }

  const { resolved, unscheduled } = resolveConflicts(
    allDroppedByGNN,
    itineraries,
    feasible,
    input.endTime,
  );

  // ── FIX #3: Final integrity check — no place should be silently lost ───
  console.log('\n─── INTEGRITY CHECK ───────────────────────────────────────────────');
  const allScheduledIds = new Set<string>();
  for (const day of resolved) {
    for (const stop of day.stops) {
      allScheduledIds.add(stop.place.id);
    }
  }
  const infeasibleIds = new Set(infeasible.map((i) => i.place.id));
  const unscheduledIds = new Set(unscheduled.map((u) => u.place.id));

  const missing = places.filter(
    (p) => !allScheduledIds.has(p.id) && !infeasibleIds.has(p.id) && !unscheduledIds.has(p.id),
  );

  if (missing.length > 0) {
    console.log(`  🚨 BUG DETECTED: ${missing.length} place(s) silently lost in pipeline!`);
    for (const m of missing) {
      console.log(`    → ${m.name} (id: ${m.id})`);
    }
  } else {
    console.log(`  ✅ All ${places.length} places accounted for:`);
    console.log(`     • Scheduled: ${allScheduledIds.size}`);
    console.log(`     • Infeasible (Step 0): ${infeasibleIds.size}`);
    console.log(`     • Unscheduled (Step 3): ${unscheduledIds.size}`);
  }

  // ── Summary with Free Time ─────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(70));
  console.log('  📊 SUMMARY');
  console.log('═'.repeat(70));
  for (const day of resolved) {
    const totalTravel = Math.round(day.totalTravelSec / 60);
    const lastStop = day.stops[day.stops.length - 1];
    const dayEndMin = lastStop ? lastStop.departMin : input.startTime;
    const freeTimeMin = input.endTime - dayEndMin;
    const freeHours = Math.floor(freeTimeMin / 60);
    const freeMin = freeTimeMin % 60;
    const freeStr = freeTimeMin > 30
      ? ` | 🕐 ${freeHours}h${freeMin > 0 ? freeMin + 'm' : ''} free`
      : '';

    console.log(
      `  Day ${day.dayNumber} (${DAY_NAMES[day.dayOfWeek]}): ${day.stops.length} stops | ` +
      `${totalTravel}min travel | ${day.totalWaitMin}min wait${freeStr}`,
    );
    for (const stop of day.stops) {
      const tag = stop.reason ? ` [${stop.reason}]` : '';
      console.log(
        `    ${minToTime(stop.startVisitMin)}-${minToTime(stop.departMin)} ` +
        `${stop.place.name} (${stop.place.district})${tag}`,
      );
    }
    if (freeTimeMin > 30) {
      console.log(`    ${minToTime(dayEndMin)}-${minToTime(input.endTime)} ⏸️  Free time — can add more places`);
    }
  }
  if (infeasible.length > 0) {
    console.log(`\n  ❌ Infeasible (Step 0): ${infeasible.map((i) => i.place.name).join(', ')}`);
  }
  if (unscheduled.length > 0) {
    console.log(`  ⚠️  Unscheduled (Step 3): ${unscheduled.map((u) => u.place.name).join(', ')}`);
  }
  console.log('═'.repeat(70));
}

// ══════════════════════════════════════════════════════════════════════════════
//  TEST CASES
// ══════════════════════════════════════════════════════════════════════════════
async function main() {
  /*
  // ── Test 1: Basic 2-day trip ──────────────────────────────────────────────
  console.log('\n🧪 TEST 1: Classic 2-day Hanoi trip (tests rebalance + parking buffer)');
  ...
  */

  // ── Test 4: 8 địa điểm, 2 ngày, 30 phút/địa điểm ──────────────────────────
  console.log('\n\n🧪 TEST 4: 8 places, 2 days, 30 min override each');
  await sleep(2000); // Rate limit buffer between tests
  await runTripPlanner({
    placeNames: [
      'Ho Chi Minh Mausoleum',
      'Temple of Literature & National University',
      'Hoa Lo Prison',
      'Lake of the Restored Sword (Hoan Kiem Lake)',
      'Ho Chi Minh Museum',
      'One Pillar Pagoda',
      'Đền Ngọc Sơn',
      'Vietnam Museum of Ethnology',
    ],
    numDays: 2,
    startTime: 480,    // 08:00
    endTime: 1080,     // 18:00
    travelDate: new Date('2026-04-14'), // Thứ 3
    visitDurationOverrides: {
      'Ho Chi Minh Mausoleum': 30,
      'Temple of Literature & National University': 30,
      'Hoa Lo Prison': 30,
      'Lake of the Restored Sword (Hoan Kiem Lake)': 30,
      'Ho Chi Minh Museum': 30,
      'One Pillar Pagoda': 30,
      'Đền Ngọc Sơn': 30,
      'Vietnam Museum of Ethnology': 30,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
