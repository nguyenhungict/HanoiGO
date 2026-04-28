import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ── Constants ────────────────────────────────────────────────────────────────
const EARTH_RADIUS_KM = 6371;
const MAX_PLACES_PER_DAY = 5;
const PARKING_BUFFER_MIN = 10;
const GOONG_API_KEY = process.env.GOONG_API_KEY || '';
const DEFAULT_LUNCH_START = 660;  // 11:00
const DEFAULT_LUNCH_END = 780;    // 13:00
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
  lunchBreakStart?: number;  // minutes from midnight, default 660 (11:00)
  lunchBreakEnd?: number;    // minutes from midnight, default 780 (13:00)
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
    let clusters = this.kMeansClustering(feasible, dto.numDays);
    clusters = this.postClusterOpenDaySwap(clusters, travelDate);
    clusters = clusters.filter(c => c.length > 0);

    const lunchStart = dto.lunchBreakStart ?? DEFAULT_LUNCH_START;
    const lunchEnd = dto.lunchBreakEnd ?? DEFAULT_LUNCH_END;

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
        // FIX: Check openDays for single-place day
        if (!place.alwaysOpen && !place.openDays.includes(dayOfWeek)) {
          allDropped.push({ place, reason: `Closed on ${DAY_NAMES[dayOfWeek]}` });
          itineraries.push({ dayNumber: d + 1, dayOfWeek, stops: [], totalTravelSec: 0, totalWaitMin: 0 });
          continue;
        }
        // FIX: await async getTravelToFirstStop
        const travelToFirstSec = await this.getTravelToFirstStop(dto, place);
        const travelToFirstMin = travelToFirstSec / 60;
        const arriveMin = dto.startTime + travelToFirstMin + PARKING_BUFFER_MIN;
        const effectiveOpen = place.alwaysOpen
          ? arriveMin
          : Math.max(arriveMin, place.openTimeStart);
        let waitMin = effectiveOpen - arriveMin;
        let startVisitMin = effectiveOpen;

        // FIX: Lunch break — push visit to after lunch if overlapping
        if (startVisitMin < lunchEnd && startVisitMin + place.visitDurationMin > lunchStart) {
          waitMin += lunchEnd - startVisitMin;
          startVisitMin = lunchEnd;
        }

        const departMin = startVisitMin + place.visitDurationMin;
        // FIX: Validate endTime
        if (departMin > dto.endTime) {
          allDropped.push({ place, reason: `Depart ${minToTime(departMin)} exceeds endTime ${minToTime(dto.endTime)}` });
          itineraries.push({ dayNumber: d + 1, dayOfWeek, stops: [], totalTravelSec: 0, totalWaitMin: 0 });
          continue;
        }

        itineraries.push({
          dayNumber: d + 1,
          dayOfWeek,
          stops: [{
            place,
            arriveMin: Math.round(arriveMin),
            waitMin: Math.round(waitMin),
            startVisitMin: Math.round(startVisitMin),
            departMin: Math.round(departMin),
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
        cluster, matrix, dayOfWeek, dto.startTime, dto.endTime, lunchStart, lunchEnd, dto.startLat, dto.startLng
      );

      allDropped.push(...droppedInGNN);

      // Calculate travel from user's start location to the first stop
      if (route.length > 0) {
        const travelToFirstSec = await this.getTravelToFirstStop(dto, route[0].place);
        route[0].travelFromPrevSec = Math.round(travelToFirstSec);
        // Shift arrival times for the first stop
        const travelToFirstMin = travelToFirstSec / 60;
        const newArriveMin = dto.startTime + travelToFirstMin + PARKING_BUFFER_MIN;
        const firstPlace = route[0].place;
        const effectiveOpen = firstPlace.alwaysOpen ? newArriveMin : Math.max(newArriveMin, firstPlace.openTimeStart);
        let firstWaitMin = Math.max(0, effectiveOpen - newArriveMin);
        let firstStartVisit = effectiveOpen;

        // Lunch break for first stop in cascade
        if (firstStartVisit < lunchEnd && firstStartVisit + firstPlace.visitDurationMin > lunchStart) {
          firstWaitMin += lunchEnd - firstStartVisit;
          firstStartVisit = lunchEnd;
        }

        route[0].arriveMin = Math.round(newArriveMin);
        route[0].waitMin = Math.round(firstWaitMin);
        route[0].startVisitMin = Math.round(firstStartVisit);
        route[0].departMin = Math.round(firstStartVisit + firstPlace.visitDurationMin);

        // Cascade: shift subsequent stops (with lunch break)
        let currentTimeMin = route[0].departMin;
        for (let i = 1; i < route.length; i++) {
          const travelMin = route[i].travelFromPrevSec / 60;
          const arriveMin = currentTimeMin + travelMin + PARKING_BUFFER_MIN;
          const p = route[i].place;
          const effOpen = p.alwaysOpen ? arriveMin : Math.max(arriveMin, p.openTimeStart);
          let waitMin = Math.max(0, effOpen - arriveMin);
          let startVisit = effOpen;

          // Lunch break for cascaded stop
          if (startVisit < lunchEnd && startVisit + p.visitDurationMin > lunchStart) {
            waitMin += lunchEnd - startVisit;
            startVisit = lunchEnd;
          }

          route[i].arriveMin = Math.round(arriveMin);
          route[i].waitMin = Math.round(waitMin);
          route[i].startVisitMin = Math.round(startVisit);
          route[i].departMin = Math.round(startVisit + p.visitDurationMin);
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
      allDropped, itineraries, feasible, dto.endTime, dto.startTime, lunchStart, lunchEnd,
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

    // Deterministic random to ensure stable clustering results across identical requests
    let seed = places.reduce((sum, p) => sum + p.lat + p.lng, 0) * 10000;
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    // K-Means++ initialization — better geographic spread
    const centroids: { lat: number; lng: number }[] = [];
    const firstIdx = Math.floor(random() * places.length);
    centroids.push({ lat: places[firstIdx].lat, lng: places[firstIdx].lng });

    for (let c = 1; c < k; c++) {
      const distances = places.map(p => {
        let minDist = Infinity;
        for (const centroid of centroids) {
          const d = this.haversine(p.lat, p.lng, centroid.lat, centroid.lng);
          if (d < minDist) minDist = d;
        }
        return minDist * minDist; // squared for probability weighting
      });
      const totalDist = distances.reduce((s, d) => s + d, 0);
      if (totalDist === 0) {
        centroids.push({ lat: places[c].lat, lng: places[c].lng });
        continue;
      }
      let r = random() * totalDist;
      let selectedIdx = 0;
      for (let i = 0; i < distances.length; i++) {
        r -= distances[i];
        if (r <= 0) { selectedIdx = i; break; }
      }
      centroids.push({ lat: places[selectedIdx].lat, lng: places[selectedIdx].lng });
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
        // Exponential backoff: 3 retries (1s → 2s → 4s)
        for (let attempt = 1; attempt <= 3; attempt++) {
          const delayMs = 1000 * Math.pow(2, attempt - 1);
          this.logger.warn(`Goong rate limited. Retry ${attempt}/3 in ${delayMs}ms...`);
          await sleep(delayMs);
          try {
            const retryRes = await fetch(url);
            const retryData = await retryRes.json();
            if (retryData.rows?.length > 0) {
              return this.parseGoongMatrix(retryData);
            }
          } catch { /* continue to next retry */ }
        }
        this.logger.warn('Goong retries exhausted. Using Haversine fallback.');
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
    lunchStart: number,
    lunchEnd: number,
    startLat?: number,
    startLng?: number,
  ) {
    const n = places.length;
    const visited = new Array(n).fill(false);
    const route: ScheduledStop[] = [];

    // FIX Bug 1: Find first place — must check openDays
    let firstIdx = -1;
    if (startLat && startLng) {
      let minDistanceToStart = Infinity;
      for (let i = 0; i < n; i++) {
        const p = places[i];
        if (!p.alwaysOpen && !p.openDays.includes(dayOfWeek)) continue;
        const dist = this.haversine(startLat, startLng, p.lat, p.lng);
        if (dist < minDistanceToStart) {
          minDistanceToStart = dist;
          firstIdx = i;
        }
      }
    } else {
      for (let i = 0; i < n; i++) {
        if (places[i].alwaysOpen || places[i].openDays.includes(dayOfWeek)) {
          firstIdx = i;
          break;
        }
      }
    }

    // No valid first stop found (all closed today)
    if (firstIdx === -1) {
      return {
        route: [],
        droppedInGNN: places.map(p => ({
          place: p,
          reason: `Closed on ${DAY_NAMES[dayOfWeek]}`,
        })),
      };
    }

    const firstPlace = places[firstIdx];
    const effectiveStart = firstPlace.alwaysOpen
      ? startTimeMin
      : Math.max(startTimeMin, firstPlace.openTimeStart);

    let firstWait = firstPlace.alwaysOpen
      ? 0
      : Math.max(0, firstPlace.openTimeStart - startTimeMin);

    let firstStartVisit = effectiveStart;

    // FIX: Check breakTime for first stop
    if (firstPlace.hasBreak && effectiveStart >= firstPlace.breakStart && effectiveStart < firstPlace.breakEnd) {
      firstWait += firstPlace.breakEnd - effectiveStart;
      firstStartVisit = firstPlace.breakEnd;
    }

    // Lunch break for first stop
    if (firstStartVisit < lunchEnd && firstStartVisit + firstPlace.visitDurationMin > lunchStart) {
      firstWait += lunchEnd - firstStartVisit;
      firstStartVisit = lunchEnd;
    }

    const firstDepartMin = firstStartVisit + firstPlace.visitDurationMin;

    // FIX Bug 4: Validate endTime for first stop
    if (firstDepartMin > endTimeMin) {
      return {
        route: [],
        droppedInGNN: places.map(p => ({
          place: p,
          reason: `Could not fit in day (time window ${minToTime(startTimeMin)}-${minToTime(endTimeMin)})`,
        })),
      };
    }

    let currentTimeMin = effectiveStart;
    let currentIdx = firstIdx;
    visited[firstIdx] = true;

    route.push({
      place: firstPlace,
      arriveMin: currentTimeMin,
      waitMin: firstWait,
      startVisitMin: firstStartVisit,
      departMin: firstDepartMin,
      travelFromPrevSec: 0,
      parkingBufferMin: 0,
      status: firstWait > 0 ? 'WAIT' : 'OK',
    });

    currentTimeMin = firstDepartMin;


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

        // Lunch break: push visit to after lunch if overlapping
        let startVisit = arriveMin + waitMin;
        if (startVisit < lunchEnd && startVisit + place.visitDurationMin > lunchStart) {
          waitMin += lunchEnd - startVisit;
          startVisit = lunchEnd;
        }

        const departMin = startVisit + place.visitDurationMin;
        if (departMin > endTimeMin) continue;

        // Multiply travelSec by 2 to penalize active travel time over free wait time.
        // This also breaks the tie when multiple places get pushed to the end of a lunch break
        // (where travel + wait = constant).
        const cost = (travelSec * 2) + (waitMin * 60);
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
  //  STEP 3: Conflict Resolution (improved — real travel time + gap insertion)
  // ══════════════════════════════════════════════════════════════════════════
  private estimateTravelSec(from: Place, to: Place): number {
    const AVG_SPEED_KMH = 15;
    const distKm = this.haversine(from.lat, from.lng, to.lat, to.lng);
    return (distKm / AVG_SPEED_KMH) * 3600;
  }

  private resolveConflicts(
    droppedPlaces: { place: Place; reason: string }[],
    itineraries: DayItinerary[],
    allFeasiblePlaces: Place[],
    endTimeMin: number,
    startTimeMin: number,
    lunchStart: number,
    lunchEnd: number,
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
        if (reassigned) break;

        // Strategy 1: Try inserting into GAPS between existing stops
        for (let i = 0; i <= day.stops.length; i++) {
          const prevStop = i > 0 ? day.stops[i - 1] : null;
          const nextStop = i < day.stops.length ? day.stops[i] : null;

          // Calculate arrival time at the dropped place
          let arriveMin: number;
          let travelFromPrevSec: number;
          if (prevStop) {
            travelFromPrevSec = this.estimateTravelSec(prevStop.place, place);
            arriveMin = prevStop.departMin + (travelFromPrevSec / 60) + PARKING_BUFFER_MIN;
          } else {
            travelFromPrevSec = 0;
            arriveMin = startTimeMin; // FIX Bug 2: was hardcoded 480
          }

          // Check open time window
          let waitMin = 0;
          if (!place.alwaysOpen && arriveMin < place.openTimeStart) {
            waitMin = place.openTimeStart - arriveMin;
          }
          if (place.hasBreak && arriveMin >= place.breakStart && arriveMin < place.breakEnd) {
            waitMin = place.breakEnd - arriveMin;
          }

          let startVisit = arriveMin + waitMin;

          // Lunch break: push visit to after lunch if overlapping
          if (startVisit < lunchEnd && startVisit + place.visitDurationMin > lunchStart) {
            waitMin += lunchEnd - startVisit;
            startVisit = lunchEnd;
          }

          const departMin = startVisit + place.visitDurationMin;

          // Must finish before endTime
          if (departMin > endTimeMin) continue;

          // Must finish before place closes
          if (!place.alwaysOpen && departMin > place.openTimeEnd) continue;

          // If there's a next stop, must finish before next stop's arrival
          // (with travel time to next stop)
          if (nextStop) {
            const travelToNextSec = this.estimateTravelSec(place, nextStop.place);
            const travelToNextMin = travelToNextSec / 60;
            if (departMin + travelToNextMin + PARKING_BUFFER_MIN > nextStop.arriveMin) continue;
          }

          // Valid insertion point found — insert
          const newStop: ScheduledStop = {
            place,
            arriveMin: Math.round(arriveMin),
            waitMin: Math.round(waitMin),
            startVisitMin: Math.round(startVisit),
            departMin: Math.round(departMin),
            travelFromPrevSec: Math.round(travelFromPrevSec),
            parkingBufferMin: PARKING_BUFFER_MIN,
            status: waitMin > 10 ? 'WAIT' : 'OK',
          };
          day.stops.splice(i, 0, newStop);

          // Update totalTravelSec: add inserted stop's travel + adjust next stop's travel
          day.totalTravelSec += Math.round(travelFromPrevSec);
          if (i + 1 < day.stops.length) {
            const nextAfterInsert = day.stops[i + 1];
            const newTravelToNext = this.estimateTravelSec(place, nextAfterInsert.place);
            const oldTravelToNext = nextAfterInsert.travelFromPrevSec;
            nextAfterInsert.travelFromPrevSec = Math.round(newTravelToNext);
            day.totalTravelSec += Math.round(newTravelToNext) - Math.round(oldTravelToNext);
          }
          scheduledIds.add(place.id);
          reassigned = true;
          this.logger.debug(`Reassigned "${place.name}" → Day ${day.dayNumber}, position ${i + 1}`);
          break;
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

  // FIX Bug 6: Use Goong API for accurate travel time, fallback to Haversine
  private async getTravelToFirstStop(dto: GenerateItineraryDto, firstPlace: Place): Promise<number> {
    if (!dto.startLat || !dto.startLng) return 0;

    if (GOONG_API_KEY) {
      try {
        const origin = `${dto.startLat},${dto.startLng}`;
        const dest = `${firstPlace.lat},${firstPlace.lng}`;
        const url = `https://rsapi.goong.io/DistanceMatrix?origins=${origin}&destinations=${dest}&vehicle=bike&api_key=${GOONG_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.rows?.[0]?.elements?.[0]?.duration?.value) {
          return data.rows[0].elements[0].duration.value;
        }
      } catch {
        this.logger.warn('Goong API failed for first stop travel. Using Haversine fallback.');
      }
    }

    // Haversine fallback
    const AVG_SPEED_KMH = 15;
    const distKm = this.haversine(dto.startLat, dto.startLng, firstPlace.lat, firstPlace.lng);
    return (distKm / AVG_SPEED_KMH) * 3600;
  }

  // FIX Bug 5: Post-cluster swap — move places to days when they're actually open
  private postClusterOpenDaySwap(clusters: Place[][], travelDate: Date): Place[][] {
    for (let c = 0; c < clusters.length; c++) {
      const dayDate = new Date(travelDate);
      dayDate.setDate(dayDate.getDate() + c);
      const dayOfWeek = dayDate.getDay();

      for (let i = clusters[c].length - 1; i >= 0; i--) {
        const place = clusters[c][i];
        if (place.alwaysOpen) continue;
        if (place.openDays.includes(dayOfWeek)) continue;

        // Place is closed on this cluster's day → find a better cluster
        for (let target = 0; target < clusters.length; target++) {
          if (target === c) continue;
          const targetDate = new Date(travelDate);
          targetDate.setDate(targetDate.getDate() + target);
          if (place.openDays.includes(targetDate.getDay())) {
            clusters[c].splice(i, 1);
            clusters[target].push(place);
            this.logger.debug(`OpenDay swap: "${place.name}" cluster ${c + 1} → ${target + 1}`);
            break;
          }
        }
      }
    }
    return clusters;
  }
}
