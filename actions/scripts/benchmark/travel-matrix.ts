/**
 * travel-matrix.ts
 *
 * Supplies travel durations to the benchmark from ONE of two sources:
 *   1. A frozen Goong distance-matrix cache (goong-cache.json) — real road times,
 *      fetched once by fetch-goong-cache.ts and committed for reproducibility.
 *   2. Haversine fallback — straight-line distance / average speed, when no cache
 *      is present. This is the same fallback the production service uses.
 *
 * The HanoiGO arm of the benchmark calls the real TripPlannerService, which issues
 * HTTP requests to the Goong API. installGoongFetchMock() intercepts those requests
 * and answers them from the chosen lookup, so the production algorithm runs unchanged
 * but offline and deterministically.
 */

import * as fs from 'fs';
import * as path from 'path';
import { haversine } from '../../src/trips/trip-planner-geo';
import { AVG_SPEED_KMH } from '../../src/trips/trip-planner.constants';

export const CACHE_PATH = path.resolve(__dirname, 'goong-cache.json');

/** "lat,lng" string exactly as the production service formats coordinates. */
export function coordKey(lat: number, lng: number): string {
  return `${lat},${lng}`;
}

/** Travel duration in seconds between two "lat,lng" coordinate strings. */
export type TravelLookup = (originStr: string, destStr: string) => number;

function parseCoord(s: string): { lat: number; lng: number } {
  const [lat, lng] = s.split(',').map(Number);
  return { lat, lng };
}

function haversineSec(originStr: string, destStr: string): number {
  const o = parseCoord(originStr);
  const d = parseCoord(destStr);
  const distKm = haversine(o.lat, o.lng, d.lat, d.lng);
  return (distKm / AVG_SPEED_KMH) * 3600;
}

export interface LoadedLookup {
  lookup: TravelLookup;
  mode: 'GOONG' | 'HAVERSINE';
  /** count of pairs that fell back to Haversine because the cache missed them */
  misses: number;
}

/**
 * Returns the travel lookup. Uses the Goong cache when available, otherwise
 * Haversine. In GOONG mode, any pair missing from the cache silently falls back
 * to Haversine (and is counted) so the run never crashes on a stale cache.
 */
export function loadTravelLookup(): LoadedLookup {
  if (fs.existsSync(CACHE_PATH)) {
    const raw = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8')) as Record<
      string,
      number
    >;
    let misses = 0;
    const lookup: TravelLookup = (o, d) => {
      if (o === d) return 0;
      const v = raw[`${o}->${d}`];
      if (v != null) return v;
      misses++;
      return haversineSec(o, d);
    };
    return { lookup, mode: 'GOONG', misses };
  }

  const lookup: TravelLookup = (o, d) => (o === d ? 0 : haversineSec(o, d));
  return { lookup, mode: 'HAVERSINE', misses: 0 };
}

/** Build the cache key used in goong-cache.json. */
export function pairKey(originStr: string, destStr: string): string {
  return `${originStr}->${destStr}`;
}

type FetchFn = typeof globalThis.fetch;

/**
 * Replace global.fetch with a stub that answers Goong DistanceMatrix calls from
 * `lookup`. Non-Goong URLs are passed through to the original fetch. Returns a
 * restore function.
 */
export function installGoongFetchMock(lookup: TravelLookup): () => void {
  const original = globalThis.fetch;

  const mock: FetchFn = (async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input?.url ?? '';
    if (!url.includes('rsapi.goong.io/DistanceMatrix')) {
      return original(input, init);
    }

    const parsed = new URL(url);
    const origins = (parsed.searchParams.get('origins') ?? '').split('|');
    const destinations = (parsed.searchParams.get('destinations') ?? '').split(
      '|',
    );

    const rows = origins.map((o) => ({
      elements: destinations.map((d) => {
        const sec = lookup(o, d);
        return {
          status: 'OK',
          duration: { value: Math.round(sec), text: `${Math.round(sec)}s` },
          distance: { value: 0, text: '0 m' },
        };
      }),
    }));

    return {
      ok: true,
      status: 200,
      json: async () => ({ rows }),
    } as Response;
  }) as FetchFn;

  globalThis.fetch = mock;
  return () => {
    globalThis.fetch = original;
  };
}
