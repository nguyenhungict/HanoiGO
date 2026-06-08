import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AVG_SPEED_KMH,
  DAY_COLORS,
  DAY_NAMES,
  DEFAULT_LUNCH_END,
  DEFAULT_LUNCH_START,
  PARKING_BUFFER_MIN,
} from './trip-planner.constants';
import {
  calculateVisitWindow,
  createStop,
  greedyNearestNeighborWithTimeWindow,
  postClusterOpenDaySwap,
  preFilter,
  recomputeDayTotals,
} from './trip-planner-scheduling';
import {
  estimateTravelSec,
  haversine,
  haversineFallbackMatrix,
  kMeansClustering,
} from './trip-planner-geo';
import type {
  DayItinerary,
  DbPlace,
  GenerateItineraryDto,
  GoongMatrixResponse,
  ItineraryResponse,
  Place,
  ScheduledStop,
} from './trip-planner.types';
import {
  dbTimeToMin,
  minToTime,
  sleep,
} from './trip-planner.utils';

@Injectable()
export class TripPlannerService {
  private readonly logger = new Logger(TripPlannerService.name);

  private get goongApiKey(): string {
    return process.env.GOONG_API_KEY || '';
  }

  constructor(private prisma: PrismaService) {}

  private dominantDistrict(places: Place[]): string | null {
    if (places.length === 0) return null;
    const counts = new Map<string, number>();
    for (const p of places) counts.set(p.district, (counts.get(p.district) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  private async fetchGoongTravelSec(
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ): Promise<number | null> {
    try {
      const url = `https://rsapi.goong.io/DistanceMatrix?origins=${fromLat},${fromLng}&destinations=${toLat},${toLng}&vehicle=bike&api_key=${this.goongApiKey}`;
      const data = (await (await fetch(url)).json()) as GoongMatrixResponse;
      return data.rows?.[0]?.elements?.[0]?.duration?.value ?? null;
    } catch {
      return null;
    }
  }

  private async prefetchStartToPlaces(
    dto: GenerateItineraryDto,
    places: Place[],
  ): Promise<Map<string, number>> {
    const cache = new Map<string, number>();
    if (!dto.startLat || !dto.startLng || places.length === 0) return cache;

    if (this.goongApiKey) {
      try {
        const destinations = places.map((p) => `${p.lat},${p.lng}`).join('|');
        const url = `https://rsapi.goong.io/DistanceMatrix?origins=${dto.startLat},${dto.startLng}&destinations=${destinations}&vehicle=bike&api_key=${this.goongApiKey}`;
        const data = (await (await fetch(url)).json()) as GoongMatrixResponse;
        const elements = data.rows?.[0]?.elements ?? [];
        for (let i = 0; i < places.length; i++) {
          const val = elements[i]?.duration?.value;
          if (val != null) cache.set(places[i].id, val);
        }
        if (cache.size === places.length) return cache;
        this.logger.warn('prefetchStartToPlaces: some elements missing, filling with Haversine.');
      } catch {
        this.logger.warn('prefetchStartToPlaces: API failed, falling back to Haversine.');
      }
    }

    // Haversine fallback for any place not covered
    for (const p of places) {
      if (!cache.has(p.id)) {
        const distKm = haversine(dto.startLat, dto.startLng, p.lat, p.lng);
        cache.set(p.id, (distKm / AVG_SPEED_KMH) * 3600);
      }
    }
    return cache;
  }

  // Single Goong call: origins=[start?, ...places], destinations=[...places].
  // Returns start→place cache + full place↔place matrix for cluster slicing.
  // Falls back to Haversine + null placeMatrix on API failure.
  private async fetchCombinedMatrix(
    dto: GenerateItineraryDto,
    places: Place[],
  ): Promise<{
    startCache: Map<string, number>;
    placeMatrix: Map<string, Map<string, number>> | null;
  }> {
    const startCache = new Map<string, number>();
    const hasStart = dto.startLat != null && dto.startLng != null;

    const fillStartHaversine = () => {
      if (!hasStart) return;
      for (const p of places) {
        const distKm = haversine(dto.startLat!, dto.startLng!, p.lat, p.lng);
        startCache.set(p.id, (distKm / AVG_SPEED_KMH) * 3600);
      }
    };

    const originCoords: string[] = [];
    if (hasStart) originCoords.push(`${dto.startLat},${dto.startLng}`);
    for (const p of places) originCoords.push(`${p.lat},${p.lng}`);
    const destCoords = places.map((p) => `${p.lat},${p.lng}`);

    const url = `https://rsapi.goong.io/DistanceMatrix?origins=${originCoords.join('|')}&destinations=${destCoords.join('|')}&vehicle=bike&api_key=${this.goongApiKey}`;

    try {
      const data = (await (await fetch(url)).json()) as GoongMatrixResponse & {
        error?: { code: string };
      };
      const rows = data.rows;
      if (data.error?.code === 'OVER_RATE_LIMIT' || !rows?.length) {
        fillStartHaversine();
        return { startCache, placeMatrix: null };
      }

      const startOffset = hasStart ? 1 : 0;

      // Row 0 → start → all places
      if (hasStart) {
        const startRow = rows[0]?.elements ?? [];
        for (let j = 0; j < places.length; j++) {
          const v = startRow[j]?.duration?.value;
          startCache.set(
            places[j].id,
            v != null
              ? v
              : (haversine(dto.startLat!, dto.startLng!, places[j].lat, places[j].lng) /
                  AVG_SPEED_KMH) *
                  3600,
          );
        }
      }

      // Remaining rows → place ↔ place
      const placeMatrix = new Map<string, Map<string, number>>();
      for (let i = 0; i < places.length; i++) {
        const row = rows[startOffset + i]?.elements ?? [];
        const inner = new Map<string, number>();
        for (let j = 0; j < places.length; j++) {
          const v = row[j]?.duration?.value;
          inner.set(places[j].id, v != null ? v : estimateTravelSec(places[i], places[j]));
        }
        placeMatrix.set(places[i].id, inner);
      }
      return { startCache, placeMatrix };
    } catch {
      this.logger.warn('fetchCombinedMatrix: API failed, falling back.');
      fillStartHaversine();
      return { startCache, placeMatrix: null };
    }
  }

  private buildMatrixFromLookup(
    cluster: Place[],
    lookup: Map<string, Map<string, number>>,
  ): number[][] {
    return cluster.map((from) =>
      cluster.map((to) => {
        const v = lookup.get(from.id)?.get(to.id);
        return v != null ? v : estimateTravelSec(from, to);
      }),
    );
  }

  private async getRealTravelSec(from: Place, to: Place): Promise<number> {
    if (this.goongApiKey) {
      const sec = await this.fetchGoongTravelSec(
        from.lat,
        from.lng,
        to.lat,
        to.lng,
      );
      if (sec !== null) return sec;
      this.logger.warn(
        'Goong API failed for inter-stop travel. Using Haversine fallback.',
      );
    }
    return estimateTravelSec(from, to);
  }

  private async cascadeRouteTimes(
    dto: GenerateItineraryDto,
    route: ScheduledStop[],
    endTimeMin: number,
    lunchStart: number,
    lunchEnd: number,
    dropReason: string,
    startCache?: Map<string, number>,
  ): Promise<{
    route: ScheduledStop[];
    dropped: { place: Place; reason: string }[];
  }> {
    // Work with ScheduledStop[] so we can reuse travelFromPrevSec from GNN matrix.
    const remaining = route.map((s) => ({ ...s }));
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
          ? await this.getTravelToFirstStop(dto, place, startCache)
          : stop.travelFromPrevSec;

        const arriveMin = isFirst
          ? dto.startTime + travelFromPrevSec / 60 + PARKING_BUFFER_MIN
          : currentTimeMin + travelFromPrevSec / 60 + PARKING_BUFFER_MIN;

        const window = calculateVisitWindow(
          place,
          arriveMin,
          endTimeMin,
          lunchStart,
          lunchEnd,
          travelFromPrevSec / 60,
          PARKING_BUFFER_MIN,
        );

        if (!window) {
          removedIdx = i;
          dropped.push({ place, reason: dropReason });
          break;
        }

        rebuilt.push(
          createStop(place, window, travelFromPrevSec, PARKING_BUFFER_MIN),
        );
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

  private async fetchAndMapPlaces(dto: GenerateItineraryDto): Promise<Place[]> {
    const lookupByIds = Array.isArray(dto.placeIds) && dto.placeIds.length > 0;

    const lookupValues = lookupByIds ? dto.placeIds : dto.placeNames;
    const whereClause = lookupByIds ? 'id = ANY($1::uuid[])' : 'name = ANY($1)';

    const dbPlaces = await this.prisma.$queryRawUnsafe<DbPlace[]>(
      `SELECT id, name, category, district, lat, lng, image_url,
              always_open, open_days, open_time_start, open_time_end,
              visit_duration_min
       FROM places WHERE ${whereClause}`,
      lookupValues,
    );

    return dbPlaces.map((p) => ({
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
      visitDurationMin: dto.visitDurationMin || p.visit_duration_min || 60,
    }));
  }

  private buildItineraryResponse(
    resolved: DayItinerary[],
    infeasible: { place: Place; reason: string }[],
    unscheduled: { place: Place; reason: string }[],
    dto: GenerateItineraryDto,
  ): ItineraryResponse {
    return {
      days: resolved.map((day, idx) => {
        const lastStop = day.stops[day.stops.length - 1];
        const dayEndMin = lastStop ? lastStop.departMin : dto.startTime;
        return {
          dayNumber: day.dayNumber,
          dayLabel: DAY_NAMES[day.dayOfWeek],
          district: day.district ?? null,
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
          freeTimeMin: Math.max(0, dto.endTime - dayEndMin),
        };
      }),
      infeasible: infeasible.map((i) => ({
        name: i.place.name,
        reason: i.reason,
      })),
      unscheduled: unscheduled.map((u) => ({
        name: u.place.name,
        reason: u.reason,
      })),
    };
  }

  private async scheduleSinglePlaceDay(
    place: Place,
    dayNumber: number,
    dayOfWeek: number,
    dto: GenerateItineraryDto,
    lunchStart: number,
    lunchEnd: number,
    startCache?: Map<string, number>,
  ): Promise<{
    itinerary: DayItinerary;
    dropped: { place: Place; reason: string } | null;
  }> {
    const emptyDay: DayItinerary = {
      dayNumber,
      dayOfWeek,
      district: place.district,
      stops: [],
      totalTravelSec: 0,
      totalWaitMin: 0,
    };

    if (!place.alwaysOpen && !place.openDays.includes(dayOfWeek)) {
      return {
        itinerary: emptyDay,
        dropped: { place, reason: `Closed on ${DAY_NAMES[dayOfWeek]}` },
      };
    }

    const travelToFirstSec = await this.getTravelToFirstStop(dto, place, startCache);
    const arriveMin =
      dto.startTime + travelToFirstSec / 60 + PARKING_BUFFER_MIN;
    const window = calculateVisitWindow(
      place,
      arriveMin,
      dto.endTime,
      lunchStart,
      lunchEnd,
      travelToFirstSec / 60,
      PARKING_BUFFER_MIN,
    );

    if (!window) {
      const closeTime = place.alwaysOpen
        ? dto.endTime
        : Math.min(place.openTimeEnd, dto.endTime);
      return {
        itinerary: emptyDay,
        dropped: {
          place,
          reason: `Visit exceeds ${place.alwaysOpen ? 'endTime' : 'closing time'} ${minToTime(closeTime)}`,
        },
      };
    }

    return {
      itinerary: {
        dayNumber,
        dayOfWeek,
        district: place.district,
        stops: [
          createStop(place, window, travelToFirstSec, PARKING_BUFFER_MIN),
        ],
        totalTravelSec: Math.round(travelToFirstSec),
        totalWaitMin: Math.round(window.waitMin),
      },
      dropped: null,
    };
  }

  async generateItinerary(
    dto: GenerateItineraryDto,
  ): Promise<ItineraryResponse> {
    const hasIds = Array.isArray(dto.placeIds) && dto.placeIds.length > 0;
    const hasNames = Array.isArray(dto.placeNames) && dto.placeNames.length > 0;
    if (!hasIds && !hasNames)
      throw new BadRequestException('placeIds or placeNames is required');

    const places = await this.fetchAndMapPlaces(dto);
    if (places.length === 0)
      return { days: [], infeasible: [], unscheduled: [] };

    const travelDate = new Date(dto.travelDate);
    const { feasible, infeasible } = preFilter(places, travelDate, dto.numDays);
    if (feasible.length === 0) {
      return {
        days: [],
        infeasible: infeasible.map((i) => ({
          name: i.place.name,
          reason: i.reason,
        })),
        unscheduled: [],
      };
    }

    let clusters = kMeansClustering(feasible, dto.numDays);
    clusters = postClusterOpenDaySwap(clusters, travelDate);

    const lunchStart = dto.lunchBreakStart ?? DEFAULT_LUNCH_START;
    const lunchEnd = dto.lunchBreakEnd ?? DEFAULT_LUNCH_END;
    const itineraries: DayItinerary[] = [];
    const allDropped: { place: Place; reason: string }[] = [];

    // Fetch travel times. Common case: ONE combined API call returning both the
    // start→places row and the full place↔place matrix; cluster matrices are then
    // sliced locally with no further calls. For very large N (undocumented Goong
    // matrix-size limit), fall back to the proven per-cluster path.
    const MAX_BATCH_PLACES = 24; // keep origins (start + places) within a safe matrix size
    let startCache: Map<string, number>;
    let placeMatrix: Map<string, Map<string, number>> | null = null;
    if (
      this.goongApiKey &&
      feasible.length >= 1 &&
      feasible.length <= MAX_BATCH_PLACES
    ) {
      const combined = await this.fetchCombinedMatrix(dto, feasible);
      startCache = combined.startCache;
      placeMatrix = combined.placeMatrix;
    } else {
      startCache = await this.prefetchStartToPlaces(dto, feasible);
    }

    for (let d = 0; d < clusters.length; d++) {
      const cluster = clusters[d];
      const dayDate = new Date(travelDate);
      dayDate.setDate(dayDate.getDate() + d);
      const dayOfWeek = dayDate.getDay();

      if (cluster.length === 0) {
        itineraries.push({
          dayNumber: d + 1,
          dayOfWeek,
          district: null,
          stops: [],
          totalTravelSec: 0,
          totalWaitMin: 0,
        });
        continue;
      }

      if (cluster.length === 1) {
        const { itinerary, dropped } = await this.scheduleSinglePlaceDay(
          cluster[0],
          d + 1,
          dayOfWeek,
          dto,
          lunchStart,
          lunchEnd,
          startCache,
        );
        if (dropped) allDropped.push(dropped);
        itineraries.push(itinerary);
        continue;
      }

      const matrix = placeMatrix
        ? this.buildMatrixFromLookup(cluster, placeMatrix)
        : await this.getDurationMatrix(cluster);
      const gnnResult = greedyNearestNeighborWithTimeWindow(
        cluster,
        matrix,
        dayOfWeek,
        dto.startTime,
        dto.endTime,
        lunchStart,
        lunchEnd,
        dto.startLat,
        dto.startLng,
      );
      allDropped.push(...gnnResult.droppedInGNN);

      let route = gnnResult.route;
      if (route.length > 0) {
        const cascaded = await this.cascadeRouteTimes(
          dto,
          route,
          dto.endTime,
          lunchStart,
          lunchEnd,
          'Exceeds time limit after GPS adjustment',
          startCache,
        );
        route = cascaded.route;
        allDropped.push(...cascaded.dropped);
      }

      itineraries.push({
        dayNumber: d + 1,
        dayOfWeek,
        district: this.dominantDistrict(cluster),
        stops: route,
        totalTravelSec: route.reduce(
          (s, stop) => s + stop.travelFromPrevSec,
          0,
        ),
        totalWaitMin: route.reduce((s, stop) => s + stop.waitMin, 0),
      });
    }

    const { resolved, unscheduled } = await this.resolveConflicts(
      allDropped,
      itineraries,
      dto,
      dto.endTime,
      dto.startTime,
      lunchStart,
      lunchEnd,
      startCache,
    );

    return this.buildItineraryResponse(resolved, infeasible, unscheduled, dto);
  }

  private async getDurationMatrix(places: Place[]): Promise<number[][]> {
    if (places.length <= 1) return [[0]];

    const apiKey = this.goongApiKey;
    if (!apiKey) {
      this.logger.warn('Goong API key not set. Using Haversine fallback.');
      return haversineFallbackMatrix(places);
    }

    const coords = places.map((p) => `${p.lat},${p.lng}`).join('|');
    const url = `https://rsapi.goong.io/DistanceMatrix?origins=${coords}&destinations=${coords}&vehicle=bike&api_key=${apiKey}`;

    try {
      const res = await fetch(url);
      const data = (await res.json()) as GoongMatrixResponse & {
        error?: { code: string };
      };

      if (data.error?.code === 'OVER_RATE_LIMIT') {
        // Exponential backoff: 3 retries (1s → 2s → 4s)
        for (let attempt = 1; attempt <= 3; attempt++) {
          const delayMs = 1000 * Math.pow(2, attempt - 1);
          this.logger.warn(
            `Goong rate limited. Retry ${attempt}/3 in ${delayMs}ms...`,
          );
          await sleep(delayMs);
          try {
            const retryRes = await fetch(url);
            const retryData = (await retryRes.json()) as GoongMatrixResponse;
            if (retryData.rows?.length > 0) {
              return this.parseGoongMatrix(retryData);
            }
          } catch {
            /* continue to next retry */
          }
        }
        this.logger.warn('Goong retries exhausted. Using Haversine fallback.');
        return haversineFallbackMatrix(places);
      }

      if (data.rows?.length > 0) {
        return this.parseGoongMatrix(data);
      }

      this.logger.warn('Goong returned empty data. Using Haversine fallback.');
      return haversineFallbackMatrix(places);
    } catch {
      this.logger.warn('Goong API unavailable. Using Haversine fallback.');
      return haversineFallbackMatrix(places);
    }
  }

  private parseGoongMatrix(data: GoongMatrixResponse): number[][] {
    return data.rows.map((row) =>
      row.elements.map((el) => {
        if (el.status === 'OK' && el.duration) return el.duration.value;
        return Infinity;
      }),
    );
  }
  private async tryInsertPlace(
    place: Place,
    day: DayItinerary,
    dto: GenerateItineraryDto,
    startTimeMin: number,
    endTimeMin: number,
    lunchStart: number,
    lunchEnd: number,
    startCache?: Map<string, number>,
  ): Promise<boolean> {
    for (let i = 0; i <= day.stops.length; i++) {
      const prevStop = i > 0 ? day.stops[i - 1] : null;
      const nextStop = i < day.stops.length ? day.stops[i] : null;

      let travelFromPrevSec: number;
      let arriveMin: number;
      if (prevStop) {
        travelFromPrevSec = estimateTravelSec(prevStop.place, place);
        arriveMin =
          prevStop.departMin + travelFromPrevSec / 60 + PARKING_BUFFER_MIN;
      } else {
        travelFromPrevSec = await this.getTravelToFirstStop(dto, place, startCache);
        arriveMin = startTimeMin + travelFromPrevSec / 60 + PARKING_BUFFER_MIN;
      }

      const window = calculateVisitWindow(
        place,
        arriveMin,
        endTimeMin,
        lunchStart,
        lunchEnd,
        travelFromPrevSec / 60,
        PARKING_BUFFER_MIN,
      );
      if (!window) continue;

      if (nextStop) {
        const travelToNextMin = estimateTravelSec(place, nextStop.place) / 60;
        if (
          window.departMin + travelToNextMin + PARKING_BUFFER_MIN >
          nextStop.arriveMin
        )
          continue;
      }

      day.stops.splice(
        i,
        0,
        createStop(place, window, travelFromPrevSec, PARKING_BUFFER_MIN),
      );
      if (i + 1 < day.stops.length) {
        day.stops[i + 1].travelFromPrevSec = Math.round(
          estimateTravelSec(place, day.stops[i + 1].place),
        );
      }
      recomputeDayTotals(day);
      this.logger.debug(
        `Reassigned "${place.name}" → Day ${day.dayNumber}, position ${i + 1}`,
      );
      return true;
    }
    return false;
  }

  private async resolveConflicts(
    droppedPlaces: { place: Place; reason: string }[],
    itineraries: DayItinerary[],
    dto: GenerateItineraryDto,
    endTimeMin: number,
    startTimeMin: number,
    lunchStart: number,
    lunchEnd: number,
    startCache?: Map<string, number>,
  ) {
    const scheduledIds = new Set<string>(
      itineraries.flatMap((day) => day.stops.map((stop) => stop.place.id)),
    );
    const unscheduled: { place: Place; reason: string }[] = [];

    for (const { place, reason: originalReason } of droppedPlaces) {
      if (scheduledIds.has(place.id)) continue;

      const openDays = itineraries.filter(
        (day) => place.alwaysOpen || place.openDays.includes(day.dayOfWeek),
      );

      if (openDays.length === 0) {
        const dayNames = itineraries
          .map((day) => DAY_NAMES[day.dayOfWeek])
          .join(', ');
        unscheduled.push({
          place,
          reason: `Đóng cửa trong suốt chuyến đi (${dayNames})`,
        });
        continue;
      }

      let reassigned = false;
      for (const day of openDays) {
        reassigned = await this.tryInsertPlace(
          place,
          day,
          dto,
          startTimeMin,
          endTimeMin,
          lunchStart,
          lunchEnd,
          startCache,
        );
        if (reassigned) {
          scheduledIds.add(place.id);
          break;
        }
      }

      if (!reassigned) {
        unscheduled.push({ place, reason: originalReason });
      }
    }

    return { resolved: itineraries, unscheduled };
  }

  private async getTravelToFirstStop(
    dto: GenerateItineraryDto,
    firstPlace: Place,
    startCache?: Map<string, number>,
  ): Promise<number> {
    if (!dto.startLat || !dto.startLng) return 0;

    // Use pre-fetched cache if available — no extra API call needed
    if (startCache?.has(firstPlace.id)) {
      return startCache.get(firstPlace.id)!;
    }

    if (this.goongApiKey) {
      const sec = await this.fetchGoongTravelSec(
        dto.startLat,
        dto.startLng,
        firstPlace.lat,
        firstPlace.lng,
      );
      if (sec !== null) return sec;
      this.logger.warn(
        'Goong API failed for first stop travel. Using Haversine fallback.',
      );
    }
    const distKm = haversine(
      dto.startLat,
      dto.startLng,
      firstPlace.lat,
      firstPlace.lng,
    );
    return (distKm / AVG_SPEED_KMH) * 3600;
  }
}
