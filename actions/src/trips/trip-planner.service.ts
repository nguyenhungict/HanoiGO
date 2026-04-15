import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ── Constants ────────────────────────────────────────────────────────────────
const EARTH_RADIUS_KM = 6371;
const MAX_PLACES_PER_DAY = 5;
const PARKING_BUFFER_MIN = 10;
const GOONG_API_KEY = process.env.GOONG_API_KEY || '';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];

// ── Interfaces ───────────────────────────────────────────────────────────────
interface Place {
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

interface ScheduledStop {
  place: Place;
  arriveMin: number;
  waitMin: number;
  startVisitMin: number;
  departMin: number;
  travelFromPrevSec: number;
  parkingBufferMin: number;
  status: 'OK' | 'WAIT' | 'SKIPPED';
}

interface DayItinerary {
  dayNumber: number;
  dayOfWeek: number;
  stops: ScheduledStop[];
  totalTravelSec: number;
  totalWaitMin: number;
}

// ── Public DTOs ──────────────────────────────────────────────────────────────
export interface GenerateItineraryDto {
  placeNames: string[];
  numDays: number;
  startTime: number;        // minutes from midnight (480 = 08:00)
  endTime: number;          // minutes from midnight (1080 = 18:00)
  travelDate: string;       // ISO date string
  visitDurationMin: number; // default visit duration per place
  startLat?: number;
  startLng?: number;
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

// ── Utility ──────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

// ══════════════════════════════════════════════════════════════════════════════
//  SERVICE
// ══════════════════════════════════════════════════════════════════════════════
@Injectable()
export class TripPlannerService {
  private readonly logger = new Logger(TripPlannerService.name);

  constructor(private prisma: PrismaService) {}

  // ── PUBLIC: Generate optimized itinerary ─────────────────────────────────
  async generateItinerary(dto: GenerateItineraryDto): Promise<ItineraryResponse> {
    // 1. Fetch places from database by name
    const dbPlaces = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT id, name, category, district, lat, lng, image_url,
             always_open, open_days, open_time_start, open_time_end,
             has_break, break_start, break_end,
             visit_duration_min
      FROM places
      WHERE name = ANY($1)
    `, dto.placeNames);

    if (dbPlaces.length === 0) {
      return { days: [], infeasible: [], unscheduled: [] };
    }

    const places: Place[] = dbPlaces.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      district: p.district,
      lat: p.lat,
      lng: p.lng,
      imageUrl: p.image_url,
      alwaysOpen: p.always_open,
      openDays: p.open_days,
      openTimeStart: dbTimeToMin(p.open_time_start),
      openTimeEnd: dbTimeToMin(p.open_time_end),
      hasBreak: p.has_break,
      breakStart: dbTimeToMin(p.break_start),
      breakEnd: dbTimeToMin(p.break_end),
      visitDurationMin: dto.visitDurationMin || p.visit_duration_min || 60,
    }));

    const travelDate = new Date(dto.travelDate);

    // 2. Pre-filter
    const { feasible, infeasible } = this.preFilter(places, travelDate, dto.numDays);

    if (feasible.length === 0) {
      return {
        days: [],
        infeasible: infeasible.map(i => ({ name: i.place.name, reason: i.reason })),
        unscheduled: [],
      };
    }

    // 3. K-Means Clustering
    const clusters = this.kMeansClustering(feasible, dto.numDays);

    // 4. Schedule each day with Greedy NN
    const itineraries: DayItinerary[] = [];
    const allDropped: { place: Place; reason: string }[] = [];

    for (let d = 0; d < clusters.length; d++) {
      const cluster = clusters[d];
      const dayDate = new Date(travelDate);
      dayDate.setDate(dayDate.getDate() + d);
      const dayOfWeek = dayDate.getDay();

      if (cluster.length === 1) {
        const place = cluster[0];
        // Calculate travel from start location to this single place
        const travelToFirstSec = this.getTravelToFirstStop(dto, place);
        const travelToFirstMin = travelToFirstSec / 60;
        const arriveMin = dto.startTime + travelToFirstMin + PARKING_BUFFER_MIN;
        const effectiveStart = place.alwaysOpen
          ? arriveMin
          : Math.max(arriveMin, place.openTimeStart);
        const waitMin = effectiveStart - arriveMin;

        itineraries.push({
          dayNumber: d + 1,
          dayOfWeek,
          stops: [{
            place,
            arriveMin: Math.round(arriveMin),
            waitMin: Math.round(waitMin),
            startVisitMin: Math.round(effectiveStart),
            departMin: Math.round(effectiveStart + place.visitDurationMin),
            travelFromPrevSec: Math.round(travelToFirstSec),
            parkingBufferMin: PARKING_BUFFER_MIN,
            status: waitMin > 10 ? 'WAIT' : 'OK',
          }],
          totalTravelSec: Math.round(travelToFirstSec),
          totalWaitMin: Math.round(waitMin),
        });
        continue;
      }

      // Get duration matrix (Goong or Haversine fallback)
      const matrix = await this.getDurationMatrix(cluster);

      const { route, droppedInGNN } = this.greedyNearestNeighborWithTimeWindow(
        cluster, matrix, dayOfWeek, dto.startTime, dto.endTime,
      );

      allDropped.push(...droppedInGNN);

      // Calculate travel from user's start location to the first stop
      if (route.length > 0) {
        const travelToFirstSec = this.getTravelToFirstStop(dto, route[0].place);
        route[0].travelFromPrevSec = Math.round(travelToFirstSec);
        // Shift arrival times for the first stop
        const travelToFirstMin = travelToFirstSec / 60;
        const newArriveMin = dto.startTime + travelToFirstMin + PARKING_BUFFER_MIN;
        const firstPlace = route[0].place;
        const effectiveOpen = firstPlace.alwaysOpen ? newArriveMin : Math.max(newArriveMin, firstPlace.openTimeStart);
        route[0].arriveMin = Math.round(newArriveMin);
        route[0].waitMin = Math.round(Math.max(0, effectiveOpen - newArriveMin));
        route[0].startVisitMin = Math.round(effectiveOpen);
        route[0].departMin = Math.round(effectiveOpen + firstPlace.visitDurationMin);

        // Cascade: shift subsequent stops
        let currentTimeMin = route[0].departMin;
        for (let i = 1; i < route.length; i++) {
          const travelMin = route[i].travelFromPrevSec / 60;
          const arriveMin = currentTimeMin + travelMin + PARKING_BUFFER_MIN;
          const p = route[i].place;
          const effOpen = p.alwaysOpen ? arriveMin : Math.max(arriveMin, p.openTimeStart);
          route[i].arriveMin = Math.round(arriveMin);
          route[i].waitMin = Math.round(Math.max(0, effOpen - arriveMin));
          route[i].startVisitMin = Math.round(effOpen);
          route[i].departMin = Math.round(effOpen + p.visitDurationMin);
          currentTimeMin = route[i].departMin;
        }
      }

      let totalTravelSec = 0;
      let totalWaitMin = 0;
      for (const stop of route) {
        totalTravelSec += stop.travelFromPrevSec;
        totalWaitMin += stop.waitMin;
      }

      itineraries.push({
        dayNumber: d + 1,
        dayOfWeek,
        stops: route,
        totalTravelSec,
        totalWaitMin,
      });
    }

    // 5. Conflict resolution
    const { resolved, unscheduled } = this.resolveConflicts(
      allDropped, itineraries, feasible, dto.endTime,
    );

    // 6. Format response
    return {
      days: resolved.map((day, idx) => {
        const lastStop = day.stops[day.stops.length - 1];
        const dayEndMin = lastStop ? lastStop.departMin : dto.startTime;
        const freeTimeMin = dto.endTime - dayEndMin;

        return {
          dayNumber: day.dayNumber,
          dayLabel: DAY_NAMES[day.dayOfWeek],
          color: DAY_COLORS[idx % DAY_COLORS.length],
          stops: day.stops.map((stop, i) => ({
            order: i + 1,
            placeId: stop.place.id,
            name: stop.place.name,
            lat: stop.place.lat,
            lng: stop.place.lng,
            category: stop.place.category,
            district: stop.place.district,
            imageUrl: stop.place.imageUrl,
            arriveAt: minToTime(stop.arriveMin),
            departAt: minToTime(stop.departMin),
            visitDurationMin: stop.place.visitDurationMin,
            travelFromPrevMin: Math.round(stop.travelFromPrevSec / 60),
            waitMin: stop.waitMin,
          })),
          totalTravelMin: Math.round(day.totalTravelSec / 60),
          freeTimeMin: Math.max(0, freeTimeMin),
        };
      }),
      infeasible: infeasible.map(i => ({ name: i.place.name, reason: i.reason })),
      unscheduled: unscheduled.map(u => ({ name: u.place.name, reason: u.reason })),
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 0: Pre-filter — check if places are open on any travel day
  // ══════════════════════════════════════════════════════════════════════════
  private preFilter(places: Place[], travelDate: Date, numDays: number) {
    const feasible: Place[] = [];
    const infeasible: { place: Place; reason: string }[] = [];

    for (const place of places) {
      if (place.alwaysOpen) { feasible.push(place); continue; }

      let openOnAnyDay = false;
      for (let d = 0; d < numDays; d++) {
        const dayDate = new Date(travelDate);
        dayDate.setDate(dayDate.getDate() + d);
        if (place.openDays.includes(dayDate.getDay())) {
          openOnAnyDay = true;
          break;
        }
      }

      if (!openOnAnyDay) {
        infeasible.push({
          place,
          reason: `Closed on all travel days (open: [${place.openDays.map(d => DAY_NAMES[d]).join(',')}])`,
        });
      } else {
        feasible.push(place);
      }
    }
    return { feasible, infeasible };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 1: K-Means Clustering + Rebalance
  // ══════════════════════════════════════════════════════════════════════════
  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return EARTH_RADIUS_KM * 2 * Math.asin(Math.sqrt(a));
  }

  private getCentroid(places: Place[]) {
    const lat = places.reduce((s, p) => s + p.lat, 0) / places.length;
    const lng = places.reduce((s, p) => s + p.lng, 0) / places.length;
    return { lat, lng };
  }

  private kMeansClustering(places: Place[], k: number, maxIter = 50): Place[][] {
    if (places.length <= k) return places.map(p => [p]);

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
          const dist = this.haversine(place.lat, place.lng, centroids[c].lat, centroids[c].lng);
          if (dist < minDist) { minDist = dist; bestCluster = c; }
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

    clusters = clusters.filter(c => c.length > 0);

    // Rebalance
    for (const cluster of clusters) {
      while (cluster.length > MAX_PLACES_PER_DAY) {
        const sourceCentroid = this.getCentroid(cluster);
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

        const destCentroid = this.getCentroid(clusters[lightestIdx]);
        let bestMoveIdx = 0;
        let bestScore = Infinity;
        for (let i = 0; i < cluster.length; i++) {
          const distToDest = this.haversine(cluster[i].lat, cluster[i].lng, destCentroid.lat, destCentroid.lng);
          const distToSource = this.haversine(cluster[i].lat, cluster[i].lng, sourceCentroid.lat, sourceCentroid.lng);
          const score = distToDest - distToSource;
          if (score < bestScore) { bestScore = score; bestMoveIdx = i; }
        }

        const moved = cluster.splice(bestMoveIdx, 1)[0];
        clusters[lightestIdx].push(moved);
        this.logger.debug(`Rebalanced: "${moved.name}" → cluster ${lightestIdx + 1}`);
      }
    }

    return clusters;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 2: Distance Matrix (Goong API with Haversine fallback)
  // ══════════════════════════════════════════════════════════════════════════
  private async getDurationMatrix(places: Place[]): Promise<number[][]> {
    if (places.length <= 1) return [[0]];

    if (!GOONG_API_KEY) {
      this.logger.warn('Goong API key not set. Using Haversine fallback.');
      return this.haversineFallbackMatrix(places);
    }

    const coords = places.map(p => `${p.lat},${p.lng}`).join('|');
    const url = `https://rsapi.goong.io/DistanceMatrix?origins=${coords}&destinations=${coords}&vehicle=bike&api_key=${GOONG_API_KEY}`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.error?.code === 'OVER_RATE_LIMIT') {
        this.logger.warn('Goong rate limited. Retrying in 3s...');
        await sleep(3000);
        const retryRes = await fetch(url);
        const retryData = await retryRes.json();
        if (retryData.rows?.length > 0) {
          return this.parseGoongMatrix(retryData);
        }
        this.logger.warn('Goong retry failed. Using Haversine fallback.');
        return this.haversineFallbackMatrix(places);
      }

      if (data.rows?.length > 0) {
        return this.parseGoongMatrix(data);
      }

      this.logger.warn('Goong returned empty data. Using Haversine fallback.');
      return this.haversineFallbackMatrix(places);
    } catch (err) {
      this.logger.warn('Goong API unavailable. Using Haversine fallback.');
      return this.haversineFallbackMatrix(places);
    }
  }

  private parseGoongMatrix(data: any): number[][] {
    return data.rows.map((row: any) =>
      row.elements.map((el: any) => {
        if (el.status === 'OK' && el.duration) return el.duration.value;
        return Infinity;
      }),
    );
  }

  private haversineFallbackMatrix(places: Place[]): number[][] {
    const AVG_SPEED_KMH = 15;
    return places.map(a =>
      places.map(b => {
        const distKm = this.haversine(a.lat, a.lng, b.lat, b.lng);
        return (distKm / AVG_SPEED_KMH) * 3600;
      }),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  Greedy Nearest Neighbor with Time-Window-Aware Cost
  // ══════════════════════════════════════════════════════════════════════════
  private greedyNearestNeighborWithTimeWindow(
    places: Place[],
    durationMatrix: number[][],
    dayOfWeek: number,
    startTimeMin: number,
    endTimeMin: number,
  ) {
    const n = places.length;
    const visited = new Array(n).fill(false);
    const route: ScheduledStop[] = [];

    const effectiveStart = places[0].alwaysOpen
      ? startTimeMin
      : Math.max(startTimeMin, places[0].openTimeStart);
    let currentTimeMin = effectiveStart;
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
      parkingBufferMin: 0,
      status: firstWait > 0 ? 'WAIT' : 'OK',
    });

    currentTimeMin = firstStartVisit + firstPlace.visitDurationMin;

    while (true) {
      let bestIdx = -1;
      let bestCost = Infinity;
      let bestArriveMin = 0;
      let bestWaitMin = 0;

      for (let j = 0; j < n; j++) {
        if (visited[j]) continue;
        const travelSec = durationMatrix[currentIdx][j];
        const travelMin = travelSec / 60;
        const arriveMin = currentTimeMin + travelMin + PARKING_BUFFER_MIN;
        const place = places[j];

        if (!place.alwaysOpen && !place.openDays.includes(dayOfWeek)) continue;

        const effectiveClose = place.alwaysOpen ? endTimeMin : Math.min(place.openTimeEnd, endTimeMin);
        if (arriveMin > effectiveClose - place.visitDurationMin) continue;

        let waitMin = 0;
        if (!place.alwaysOpen && arriveMin < place.openTimeStart) {
          waitMin = place.openTimeStart - arriveMin;
        }
        if (place.hasBreak && arriveMin >= place.breakStart && arriveMin < place.breakEnd) {
          waitMin = place.breakEnd - arriveMin;
        }

        const departMin = arriveMin + waitMin + place.visitDurationMin;
        if (departMin > endTimeMin) continue;

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

    const droppedInGNN: { place: Place; reason: string }[] = [];
    for (let j = 0; j < n; j++) {
      if (!visited[j]) {
        droppedInGNN.push({
          place: places[j],
          reason: `Could not fit in day (time window ${minToTime(startTimeMin)}-${minToTime(endTimeMin)})`,
        });
      }
    }

    return { route, droppedInGNN };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  STEP 3: Conflict Resolution
  // ══════════════════════════════════════════════════════════════════════════
  private resolveConflicts(
    droppedPlaces: { place: Place; reason: string }[],
    itineraries: DayItinerary[],
    allFeasiblePlaces: Place[],
    endTimeMin: number,
  ) {
    const scheduledIds = new Set<string>();
    for (const day of itineraries) {
      for (const stop of day.stops) scheduledIds.add(stop.place.id);
    }

    const unscheduled: { place: Place; reason: string }[] = [];

    for (const { place } of droppedPlaces) {
      if (scheduledIds.has(place.id)) continue;

      let reassigned = false;
      for (const day of itineraries) {
        if (!place.alwaysOpen && !place.openDays.includes(day.dayOfWeek)) continue;

        const lastStop = day.stops[day.stops.length - 1];
        const availableTime = lastStop ? endTimeMin - lastStop.departMin : endTimeMin;

        if (availableTime >= place.visitDurationMin + PARKING_BUFFER_MIN + 15) {
          const arriveMin = lastStop ? lastStop.departMin + PARKING_BUFFER_MIN + 10 : 480;
          const waitMin = (!place.alwaysOpen && arriveMin < place.openTimeStart)
            ? place.openTimeStart - arriveMin : 0;
          const startVisit = arriveMin + waitMin;
          const departMin = startVisit + place.visitDurationMin;

          if (departMin <= endTimeMin) {
            day.stops.push({
              place,
              arriveMin: Math.round(arriveMin),
              waitMin: Math.round(waitMin),
              startVisitMin: Math.round(startVisit),
              departMin: Math.round(departMin),
              travelFromPrevSec: 600,
              parkingBufferMin: PARKING_BUFFER_MIN,
              status: waitMin > 10 ? 'WAIT' : 'OK',
            });
            scheduledIds.add(place.id);
            reassigned = true;
            this.logger.debug(`Reassigned "${place.name}" → Day ${day.dayNumber}`);
            break;
          }
        }
      }

      if (!reassigned) {
        unscheduled.push({
          place,
          reason: `Could not fit in any day`,
        });
      }
    }

    return { resolved: itineraries, unscheduled };
  }

  private getTravelToFirstStop(dto: GenerateItineraryDto, firstPlace: Place): number {
    if (dto.startLat && dto.startLng) {
      const distKm = this.haversine(dto.startLat, dto.startLng, firstPlace.lat, firstPlace.lng);
      const AVG_SPEED_KMH = 15; // Giả sử tốc độ xe máy/xe đạp trung bình trong phố
      return (distKm / AVG_SPEED_KMH) * 3600;
    }
    return 0;
  }
}
