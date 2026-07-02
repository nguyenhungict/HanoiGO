/**
 * run-benchmark.ts  —  Chapter 4 / Axis A trip-planner comparison.
 *
 * Compares HanoiGO vs By-District vs Random on the fixture scenarios and prints
 * a results table per scenario. Runs fully offline:
 *   - GOONG mode    if goong-cache.json exists (real road times, frozen).
 *   - HAVERSINE mode otherwise (straight-line fallback).
 *
 * Run:  npx ts-node scripts/benchmark/run-benchmark.ts
 *       (or: npm run benchmark:trip)
 */

import * as fs from 'fs';
import * as path from 'path';
import { SCENARIOS, byName } from './fixture-places';
import { loadTravelLookup } from './travel-matrix';
import {
  byDistrictMetrics,
  hanoiGoMetrics,
  randomMetrics,
  type Metrics,
} from './methods';

function row(cells: string[], widths: number[]): string {
  return (
    '| ' +
    cells.map((c, i) => c.padEnd(widths[i])).join(' | ') +
    ' |'
  );
}

function printTable(scTitle: string, total: number, rows: Metrics[]): void {
  const head = ['Method', 'Visited', 'Travel(min)', 'Wait(min)', 'Compact(km)'];
  const widths = [14, 9, 11, 9, 11];
  const sep = '|' + widths.map((w) => '-'.repeat(w + 2)).join('|') + '|';
  console.log(`\n### ${scTitle}`);
  console.log(row(head, widths));
  console.log(sep);
  for (const m of rows) {
    console.log(
      row(
        [
          m.method,
          `${m.placesVisited}/${total}`,
          String(m.totalTravelMin),
          String(m.totalWaitMin),
          m.compactnessKm.toFixed(2),
        ],
        widths,
      ),
    );
  }
}

function printRoutes(label: string, m: Metrics): void {
  const days = m.perDay
    .map((d) => `  Day ${d.day}: ${d.visited.join(' -> ') || '(none)'}`)
    .join('\n');
  const dropped = m.droppedNames.length
    ? `  Dropped: ${m.droppedNames.join(', ')}`
    : '  Dropped: (none)';
  console.log(`\n[${label}]\n${days}\n${dropped}`);
}

async function main(): Promise<void> {
  const { lookup, mode, misses } = loadTravelLookup();

  console.log('='.repeat(70));
  console.log('  HanoiGO Trip Planner Benchmark — Axis A');
  console.log(`  Travel-time source: ${mode}${mode === 'GOONG' ? ` (cache misses -> Haversine: ${misses})` : ' (no Goong cache found)'}`);
  if (mode === 'HAVERSINE') {
    console.log('  NOTE: run "npm run benchmark:fetch-goong" once to use real Goong road times.');
  }
  console.log('='.repeat(70));

  const out: Record<string, unknown> = { mode, scenarios: {} as Record<string, unknown> };

  for (const sc of SCENARIOS) {
    const places = sc.placeNames.map(byName);

    const hanoiGo = await hanoiGoMetrics(sc, lookup);
    const byDistrict = byDistrictMetrics(places, sc, lookup);
    const random = randomMetrics(places, sc, lookup);

    printTable(sc.title, sc.placeNames.length, [hanoiGo, byDistrict, random.mean]);

    // Visual detail (most useful for the Case-1 trap).
    printRoutes('HanoiGO', hanoiGo);
    printRoutes('By-District', byDistrict);
    printRoutes('Random (sample seed)', random.sample);

    (out.scenarios as Record<string, unknown>)[sc.key] = {
      title: sc.title,
      totalInput: sc.placeNames.length,
      hanoiGo,
      byDistrict,
      randomMean: random.mean,
      randomSample: random.sample,
    };
  }

  const resultsPath = path.resolve(__dirname, 'results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(out, null, 2));
  console.log(`\nSaved raw results -> ${path.relative(process.cwd(), resultsPath)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
