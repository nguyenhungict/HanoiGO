/**
 * fetch-goong-cache.ts
 *
 * One-time fetch of the real Goong DistanceMatrix for every coordinate used by the
 * benchmark scenarios (each start point + every place). The result is frozen to
 * goong-cache.json so run-benchmark.ts can use real road travel times offline and
 * reproducibly. Re-run only if the fixture coordinates change.
 *
 * Requires GOONG_API_KEY (loaded from actions/.env). Motorbike mode (vehicle=bike),
 * matching production. Origins are batched with a delay to stay under the rate limit;
 * any pair Goong cannot resolve falls back to the Haversine estimate.
 *
 * Run:  npx ts-node scripts/benchmark/fetch-goong-cache.ts
 *       (or: npm run benchmark:fetch-goong)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { SCENARIOS, byName } from './fixture-places';
import { CACHE_PATH, coordKey, pairKey } from './travel-matrix';
import { haversine } from '../../src/trips/trip-planner-geo';
import { AVG_SPEED_KMH } from '../../src/trips/trip-planner.constants';
import type { GoongMatrixResponse } from '../../src/trips/trip-planner.types';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ORIGIN_BATCH = 5;
const DELAY_MS = 2000;

interface Coord {
  key: string;
  lat: number;
  lng: number;
}

function collectCoords(): Coord[] {
  const map = new Map<string, Coord>();
  const add = (lat: number, lng: number) => {
    const key = coordKey(lat, lng);
    if (!map.has(key)) map.set(key, { key, lat, lng });
  };
  for (const sc of SCENARIOS) {
    if (sc.startLat != null && sc.startLng != null) add(sc.startLat, sc.startLng);
    for (const name of sc.placeNames) {
      const p = byName(name);
      add(p.lat, p.lng);
    }
  }
  return [...map.values()];
}

function haversineSec(o: Coord, d: Coord): number {
  return (haversine(o.lat, o.lng, d.lat, d.lng) / AVG_SPEED_KMH) * 3600;
}

async function main(): Promise<void> {
  const apiKey = process.env.GOONG_API_KEY;
  if (!apiKey) {
    console.error('GOONG_API_KEY not set in actions/.env. Aborting.');
    process.exit(1);
  }

  const coords = collectCoords();
  const dests = coords.map((c) => `${c.lat},${c.lng}`).join('|');
  console.log(`Fetching ${coords.length} x ${coords.length} Goong matrix...`);

  const cache: Record<string, number> = {};
  let fallbacks = 0;

  for (let i = 0; i < coords.length; i += ORIGIN_BATCH) {
    const batch = coords.slice(i, i + ORIGIN_BATCH);
    const origins = batch.map((c) => `${c.lat},${c.lng}`).join('|');
    const url = `https://rsapi.goong.io/DistanceMatrix?origins=${origins}&destinations=${dests}&vehicle=bike&api_key=${apiKey}`;

    let rows: GoongMatrixResponse['rows'] | undefined;
    try {
      const res = await fetch(url);
      rows = ((await res.json()) as GoongMatrixResponse).rows;
    } catch (e) {
      console.warn(`Batch ${i} request failed, using Haversine for it.`);
    }

    batch.forEach((o, bi) => {
      coords.forEach((d, di) => {
        const val = rows?.[bi]?.elements?.[di]?.duration?.value;
        let sec: number;
        if (val != null) {
          sec = val;
        } else {
          sec = haversineSec(o, d);
          if (o.key !== d.key) fallbacks++;
        }
        cache[pairKey(o.key, d.key)] = Math.round(sec);
      });
    });

    console.log(`  origins ${i}..${i + batch.length - 1} done`);
    if (i + ORIGIN_BATCH < coords.length) await sleep(DELAY_MS);
  }

  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
  console.log(
    `Wrote ${Object.keys(cache).length} pairs -> ${path.relative(process.cwd(), CACHE_PATH)} (Haversine fallbacks: ${fallbacks})`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
