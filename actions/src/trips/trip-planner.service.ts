import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DAY_COLORS,
  DAY_NAMES,
  DEFAULT_LUNCH_END,
  DEFAULT_LUNCH_START,
  EARTH_RADIUS_KM,
  GOONG_API_KEY,
  MAX_PLACES_PER_DAY,
  PARKING_BUFFER_MIN,
} from './trip-planner.constants';
import { calculateVisitWindow, createStop, recomputeDayTotals } from './trip-planner-scheduling';
import type {
  DayItinerary,
  GenerateItineraryDto,
  ItineraryResponse,
  Place,
  ScheduledStop,
  VisitWindowResult,
} from './trip-planner.types';
import { dbTimeToMin, minToTime, sleep } from './trip-planner.utils';

// ── Constants ────────────────────────────────────────────────────────────────
// ── Interfaces ───────────────────────────────────────────────────────────────
// ── Public DTOs ──────────────────────────────────────────────────────────────
// ── Utility ──────────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
//  SERVICE
// ══════════════════════════════════════════════════════════════════════════════
@Injectable()
export class TripPlannerService {
  private readonly logger = new Logger(TripPlannerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get real travel time between two places.
   * Tries Goong API first (same as GNN matrix), falls back to Haversine.
   */
  private async getRealTravelSec(from: Place, to: Place): Promise<number> {
    if (GOONG_API_KEY) {
      try {
        const origin = `${from.lat},${from.lng}`;
        const dest = `${to.lat},${to.lng}`;
        const url = `https://rsapi.goong.io/DistanceMatrix?origins=${origin}&destinations=${dest}&vehicle=bike&api_key=${GOONG_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.rows?.[0]?.elements?.[0]?.duration?.value) {
          return data.rows[0].elements[0].duration.value;
        }
      } catch {
        this.logger.warn('Goong API failed for inter-stop travel. Using Haversine fallback.');
      }
    }
    return this.estimateTravelSec(from, to);
  }

  /**
   * Cascade GPS travel time offset through a GNN route.
   * Reuses Goong matrix travel times already stored in each stop (travelFromPrevSec).
   * Only calls the API again when a stop is dropped and its successor needs a new travel
   * time from a different predecessor.
   */
  private async cascadeRouteTimes(
    dto: GenerateItineraryDto,
    route: ScheduledStop[],
    endTimeMin: number,
    lunchStart: number,
    lunchEnd: number,
    dropReason: string,
  ): Promise<{ route: ScheduledStop[]; dropped: { place: Place; reason: string }[] }> {
    // Work with ScheduledStop[] so we can reuse travelFromPrevSec from GNN matrix.
    const remaining = route.map(s => ({ ...s }));
    const dropped: { place: Place; reason: string }[] = [];

    while (true) {
      const rebuilt: ScheduledStop[] = [];
      let currentTimeMin = dto.startTime;
      let removedIdx = -1;

      for (let i = 0; i < remaining.length; i++) {
        const stop = remaining[i];
        const place = stop.place;
        const isFirst = i === 0;

        // First stop: real GPS travel from user location (Goong API).
        // Subsequent stops: reuse the matrix travel time already stored from the GNN run.
        const travelFromPrevSec = isFirst
          ? await this.getTravelToFirstStop(dto, place)
          : stop.travelFromPrevSec;

        const arriveMin = isFirst
          ? dto.startTime + (travelFromPrevSec / 60) + PARKING_BUFFER_MIN
          : currentTimeMin + (travelFromPrevSec / 60) + PARKING_BUFFER_MIN;

        const window = calculateVisitWindow(place, arriveMin, endTimeMin, lunchStart, lunchEnd);

        if (!window) {
          removedIdx = i;
          dropped.push({ place, reason: `${dropReason} (${place.name})` });
          break;
        }

        rebuilt.push(createStop(place, window, travelFromPrevSec, PARKING_BUFFER_MIN));
        currentTimeMin = window.departMin;
      }

      if (removedIdx === -1) {
        return { route: rebuilt, dropped };
      }

      // Remove the infeasible stop and fix the travel time for its successor,
      // since its predecessor has changed.
      remaining.splice(removedIdx, 1);
      if (removedIdx > 0 && removedIdx < remaining.length) {
        const prevPlace = remaining[removedIdx - 1].place;
        const nextPlace = remaining[removedIdx].place;
        remaining[removedIdx] = {
          ...remaining[removedIdx],
          travelFromPrevSec: await this.getRealTravelSec(prevPlace, nextPlace),
        };
      }
    }
  }

  // ── PUBLIC: Generate optimized itinerary ─────────────────────────────────
  async generateItinerary(dto: GenerateItineraryDto): Promise<ItineraryResponse> {
    const lookupByIds = Array.isArray(dto.placeIds) && dto.placeIds.length > 0;
    const lookupByNames = Array.isArray(dto.placeNames) && dto.placeNames.length > 0;

    if (!lookupByIds && !lookupByNames) {
      throw new BadRequestException('placeIds or placeNames is required');
    }

    // 1. Fetch places from database by id (preferred) or name (legacy)
    const lookupValues = lookupByIds ? dto.placeIds : dto.placeNames;
    const whereClause = lookupByIds ? 'id = ANY($1::uuid[])' : 'name = ANY($1)';
    const dbPlaces = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT id, name, category, district, lat, lng, image_url,
             always_open, open_days, open_time_start, open_time_end,
             has_break, break_start, break_end,
             visit_duration_min
      FROM places
      WHERE ${whereClause}
    `, lookupValues);

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

      if (cluster.length === 0) {
        itineraries.push({ dayNumber: d + 1, dayOfWeek, stops: [], totalTravelSec: 0, totalWaitMin: 0 });
        continue;
      }

      if (cluster.length === 1) {
        const place = cluster[0];
        // FIX: Check openDays for single-place day
        if (!place.alwaysOpen && !place.openDays.includes(dayOfWeek)) {
          allDropped.push({ place, reason: `Closed on ${DAY_NAMES[dayOfWeek]}` });
          itineraries.push({ dayNumber: d + 1, dayOfWeek, stops: [], totalTravelSec: 0, totalWaitMin: 0 });
          continue;
        }
        const travelToFirstSec = await this.getTravelToFirstStop(dto, place);
        const arriveMin = dto.startTime + (travelToFirstSec / 60) + PARKING_BUFFER_MIN;
        const window = calculateVisitWindow(place, arriveMin, dto.endTime, lunchStart, lunchEnd);

        const singlePlaceClose = place.alwaysOpen ? dto.endTime : Math.min(place.openTimeEnd, dto.endTime);
        if (!window) {
          allDropped.push({ place, reason: `Visit exceeds ${place.alwaysOpen ? 'endTime' : 'closing time'} ${minToTime(singlePlaceClose)}` });
          itineraries.push({ dayNumber: d + 1, dayOfWeek, stops: [], totalTravelSec: 0, totalWaitMin: 0 });
          continue;
        }

        itineraries.push({
          dayNumber: d + 1,
          dayOfWeek,
          stops: [createStop(place, window, travelToFirstSec, PARKING_BUFFER_MIN)],
          totalTravelSec: Math.round(travelToFirstSec),
          totalWaitMin: Math.round(window.waitMin),
        });
        continue;
      }

      // Get duration matrix (Goong or Haversine fallback)
      const matrix = await this.getDurationMatrix(cluster);

      let { route, droppedInGNN } = this.greedyNearestNeighborWithTimeWindow(
        cluster, matrix, dayOfWeek, dto.startTime, dto.endTime, lunchStart, lunchEnd, dto.startLat, dto.startLng
      );

      allDropped.push(...droppedInGNN);

      // Calculate travel from user's start location to the first stop
      if (route.length > 0) {
        const cascaded = await this.cascadeRouteTimes(
          dto,
          route,
          dto.endTime,
          lunchStart,
          lunchEnd,
          'Exceeds time limit after GPS adjustment',
        );
        route = cascaded.route;
        allDropped.push(...cascaded.dropped);
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
    const { resolved, unscheduled } = await this.resolveConflicts(
      allDropped, itineraries, feasible, dto, dto.endTime, dto.startTime, lunchStart, lunchEnd,
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
    const firstWindow = calculateVisitWindow(firstPlace, startTimeMin, endTimeMin, lunchStart, lunchEnd);

    if (!firstWindow) {
      return {
        route: [],
        droppedInGNN: places.map(p => ({
          place: p,
          reason: `Could not fit in day (time window ${minToTime(startTimeMin)}-${minToTime(endTimeMin)})`,
        })),
      };
    }

    let currentTimeMin = firstWindow.departMin;
    let currentIdx = firstIdx;
    visited[firstIdx] = true;

    route.push(createStop(firstPlace, firstWindow, 0, 0));


    while (true) {
      let bestIdx = -1;
      let bestCost = Infinity;
      let bestWindow: VisitWindowResult | null = null;

      for (let j = 0; j < n; j++) {
        if (visited[j]) continue;
        const travelSec = durationMatrix[currentIdx][j];
        const travelMin = travelSec / 60;
        const arriveMin = currentTimeMin + travelMin + PARKING_BUFFER_MIN;
        const place = places[j];

        if (!place.alwaysOpen && !place.openDays.includes(dayOfWeek)) continue;

        const window = calculateVisitWindow(place, arriveMin, endTimeMin, lunchStart, lunchEnd);
        if (!window) continue;

        // Multiply travelSec by 2 to penalize active travel time over free wait time.
        // This also breaks the tie when multiple places get pushed to the end of a lunch break
        // (where travel + wait = constant).
        const cost = (travelSec * 2) + (window.waitMin * 60);
        if (cost < bestCost) {
          bestCost = cost;
          bestIdx = j;
          bestWindow = window;
        }
      }

      if (bestIdx === -1 || !bestWindow) break;

      visited[bestIdx] = true;
      const chosenPlace = places[bestIdx];
      route.push(createStop(chosenPlace, bestWindow, durationMatrix[currentIdx][bestIdx], PARKING_BUFFER_MIN));

      currentIdx = bestIdx;
      currentTimeMin = bestWindow.departMin;
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

  private async resolveConflicts(
    droppedPlaces: { place: Place; reason: string }[],
    itineraries: DayItinerary[],
    allFeasiblePlaces: Place[],
    dto: GenerateItineraryDto,
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
            travelFromPrevSec = await this.getTravelToFirstStop(dto, place);
            arriveMin = startTimeMin + (travelFromPrevSec / 60) + PARKING_BUFFER_MIN;
          }

          const window = calculateVisitWindow(place, arriveMin, endTimeMin, lunchStart, lunchEnd);
          if (!window) continue;
          // If there's a next stop, must finish before next stop's arrival
          // (with travel time to next stop)
          if (nextStop) {
            const travelToNextSec = this.estimateTravelSec(place, nextStop.place);
            const travelToNextMin = travelToNextSec / 60;
            if (window.departMin + travelToNextMin + PARKING_BUFFER_MIN > nextStop.arriveMin) continue;
          }

          // Valid insertion point found — insert
          const newStop = createStop(place, window, travelFromPrevSec, PARKING_BUFFER_MIN);
          day.stops.splice(i, 0, newStop);

          // Keep the next stop's displayed travel leg consistent with the inserted stop.
          if (i + 1 < day.stops.length) {
            const nextAfterInsert = day.stops[i + 1];
            const newTravelToNext = this.estimateTravelSec(place, nextAfterInsert.place);
            nextAfterInsert.travelFromPrevSec = Math.round(newTravelToNext);
          }
          recomputeDayTotals(day);
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
