/**
 * benchmark.ts
 * Runs all 13 scenarios against both backends (GNN-only vs GNN+2-opt),
 * computes 4 metrics per scenario, and prints a comparison table.
 *
 * Prerequisites: both backends must be running.
 *   HanoiGO          → http://localhost:8888  (GNN + 2-opt)
 *   HanoiGO-baseline → http://localhost:8889  (GNN-only)
 *
 * Run: ts-node scripts/benchmark.ts
 * Output: scripts/benchmark-results.json + console table
 */

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

// ── Config ───────────────────────────────────────────────────────────────────

const BACKENDS = {
  'GNN-only':    'http://localhost:8889',
  'GNN + 2-opt': 'http://localhost:8888',
};

const SCENARIOS_PATH = path.join(__dirname, 'scenarios.json');
const OUTPUT_PATH    = path.join(__dirname, 'benchmark-results.json');

// ── Types ─────────────────────────────────────────────────────────────────────

interface Scenario {
  description: string;
  numDays: number;
  travelDate: string;
  startTime: number;
  endTime: number;
  startLat: number;
  startLng: number;
  placeIds: string[];
  placeLabels: string[];
  notes: string;
}

interface StopResponse {
  travelFromPrevMin: number;
  waitMin: number;
  visitDurationMin: number;
}

interface DayResponse {
  stops: StopResponse[];
  totalTravelMin: number;
}

interface ItineraryResponse {
  days: DayResponse[];
  infeasible: { name: string; reason: string }[];
  unscheduled: { name: string; reason: string }[];
}

interface Metrics {
  totalTravelMin: number;       // lower = better
  scheduleRate: number;         // % scheduled, higher = better
  avgWaitMin: number;           // lower = better
  latencyMs: number;            // lower = better
  scheduledCount: number;
  droppedCount: number;
  error?: string;
}

interface ScenarioResult {
  scenarioId: string;
  description: string;
  placeCount: number;
  results: Record<string, Metrics>;  // keyed by backend label
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

function postJson(url: string, body: object): Promise<{ data: unknown; ms: number }> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const parsed  = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port:     parseInt(parsed.port || '80'),
      path:     parsed.pathname,
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const t0  = Date.now();
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        const ms = Date.now() - t0;
        try {
          resolve({ data: JSON.parse(raw), ms });
        } catch {
          reject(new Error(`JSON parse failed (status ${res.statusCode}): ${raw.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(new Error('Request timeout (30s)')); });
    req.write(payload);
    req.end();
  });
}

// ── Metrics extraction ────────────────────────────────────────────────────────

function extractMetrics(
  res: ItineraryResponse,
  latencyMs: number,
  totalPlaces: number,
): Metrics {
  const allStops  = res.days.flatMap(d => d.stops);
  const scheduled = allStops.length;
  const dropped   = (res.infeasible?.length ?? 0) + (res.unscheduled?.length ?? 0);

  const totalTravelMin = res.days.reduce((s, d) => s + (d.totalTravelMin ?? 0), 0);
  const totalWaitMin   = allStops.reduce((s, stop) => s + (stop.waitMin ?? 0), 0);
  const avgWaitMin     = scheduled > 0 ? totalWaitMin / scheduled : 0;
  const scheduleRate   = totalPlaces > 0 ? (scheduled / totalPlaces) * 100 : 0;

  return {
    totalTravelMin:  Math.round(totalTravelMin * 10) / 10,
    scheduleRate:    Math.round(scheduleRate * 10) / 10,
    avgWaitMin:      Math.round(avgWaitMin * 10) / 10,
    latencyMs,
    scheduledCount:  scheduled,
    droppedCount:    dropped,
  };
}

// ── Run one scenario against one backend ──────────────────────────────────────

async function runOne(
  baseUrl: string,
  scenario: Scenario,
): Promise<Metrics> {
  try {
    const dto = {
      placeIds:        scenario.placeIds,
      numDays:         scenario.numDays,
      travelDate:      scenario.travelDate,
      startTime:       scenario.startTime,
      endTime:         scenario.endTime,
      visitDurationMin: 60,          // default; each place overrides internally
      startLat:        scenario.startLat,
      startLng:        scenario.startLng,
    };

    const { data, ms } = await postJson(`${baseUrl}/trips/generate-itinerary`, dto);
    return extractMetrics(data as ItineraryResponse, ms, scenario.placeIds.length);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      totalTravelMin: -1,
      scheduleRate:   -1,
      avgWaitMin:     -1,
      latencyMs:      -1,
      scheduledCount: -1,
      droppedCount:   -1,
      error: msg,
    };
  }
}

// ── Table printer ─────────────────────────────────────────────────────────────

function pad(s: string | number, n: number, right = false): string {
  const str = String(s);
  return right ? str.padStart(n) : str.padEnd(n);
}

function printTable(results: ScenarioResult[]) {
  const labels = Object.keys(BACKENDS);
  const COL_ID   = 4;
  const COL_DESC = 46;
  const COL_MET  = 9;

  const header =
    pad('ID',   COL_ID) + ' ' +
    pad('Description', COL_DESC) + ' ' +
    labels.flatMap(l => [
      pad(`[${l}] Travel`, COL_MET, true),
      pad('Sched%',        COL_MET, true),
      pad('Wait',          COL_MET, true),
      pad('ms',            COL_MET, true),
    ]).join(' ');

  const divider = '─'.repeat(header.length);
  console.log('\n' + divider);
  console.log(header);
  console.log(divider);

  for (const r of results) {
    const cols = labels.flatMap(l => {
      const m = r.results[l];
      if (m.error) return [
        pad('ERR', COL_MET, true),
        pad('ERR', COL_MET, true),
        pad('ERR', COL_MET, true),
        pad('ERR', COL_MET, true),
      ];
      return [
        pad(m.totalTravelMin.toFixed(1), COL_MET, true),
        pad(m.scheduleRate.toFixed(1) + '%', COL_MET, true),
        pad(m.avgWaitMin.toFixed(1),    COL_MET, true),
        pad(m.latencyMs,                COL_MET, true),
      ];
    });
    const desc = r.description.length > COL_DESC
      ? r.description.slice(0, COL_DESC - 1) + '…'
      : r.description;
    console.log(pad(r.scenarioId, COL_ID) + ' ' + pad(desc, COL_DESC) + ' ' + cols.join(' '));
  }

  console.log(divider);

  // Summary: avg improvement of GNN+2-opt vs GNN-only
  const valid = results.filter(r =>
    !r.results['GNN-only']?.error && !r.results['GNN + 2-opt']?.error
  );
  if (valid.length > 0) {
    const avgTravelOld = valid.reduce((s, r) => s + r.results['GNN-only'].totalTravelMin, 0) / valid.length;
    const avgTravelNew = valid.reduce((s, r) => s + r.results['GNN + 2-opt'].totalTravelMin, 0) / valid.length;
    const avgSchedOld  = valid.reduce((s, r) => s + r.results['GNN-only'].scheduleRate, 0) / valid.length;
    const avgSchedNew  = valid.reduce((s, r) => s + r.results['GNN + 2-opt'].scheduleRate, 0) / valid.length;
    const travelDiff   = avgTravelOld > 0 ? ((avgTravelOld - avgTravelNew) / avgTravelOld * 100) : 0;

    console.log(`\nSUMMARY (${valid.length} valid scenarios)`);
    console.log(`  Avg travel:   GNN-only=${avgTravelOld.toFixed(1)} min  →  GNN+2-opt=${avgTravelNew.toFixed(1)} min  (${travelDiff >= 0 ? '-' : '+'}${Math.abs(travelDiff).toFixed(1)}%)`);
    console.log(`  Avg sched%:   GNN-only=${avgSchedOld.toFixed(1)}%     →  GNN+2-opt=${avgSchedNew.toFixed(1)}%`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const scenarios: Record<string, Scenario> = JSON.parse(
    fs.readFileSync(SCENARIOS_PATH, 'utf-8'),
  );

  const scenarioIds = Object.keys(scenarios);
  console.log(`\nBenchmark: ${scenarioIds.length} scenarios × ${Object.keys(BACKENDS).length} backends`);
  console.log(`Start location: Hồ Hoàn Kiếm (21.0285, 105.8542)\n`);

  // Check backends are reachable
  for (const [label, base] of Object.entries(BACKENDS)) {
    try {
      await postJson(`${base}/trips/generate-itinerary`, {
        placeIds: [scenarios['A1'].placeIds[0]],
        numDays: 1, travelDate: scenarios['A1'].travelDate,
        startTime: 480, endTime: 1260, visitDurationMin: 60,
      });
      console.log(`  ✓ ${label} (${base}) reachable`);
    } catch {
      console.log(`  ✗ ${label} (${base}) UNREACHABLE — start the backend first`);
    }
  }
  console.log('');

  const allResults: ScenarioResult[] = [];

  for (const [id, scenario] of Object.entries(scenarios)) {
    process.stdout.write(`Running ${id}... `);

    // Run both backends in parallel
    const [m1, m2] = await Promise.all([
      runOne(Object.values(BACKENDS)[0], scenario),
      runOne(Object.values(BACKENDS)[1], scenario),
    ]);

    const result: ScenarioResult = {
      scenarioId:  id,
      description: scenario.description,
      placeCount:  scenario.placeIds.length,
      results: {
        [Object.keys(BACKENDS)[0]]: m1,
        [Object.keys(BACKENDS)[1]]: m2,
      },
    };

    allResults.push(result);

    const e1 = m1.error ? '✗' : `travel=${m1.totalTravelMin}min sched=${m1.scheduleRate}%`;
    const e2 = m2.error ? '✗' : `travel=${m2.totalTravelMin}min sched=${m2.scheduleRate}%`;
    console.log(`done  [GNN-only: ${e1}]  [GNN+2-opt: ${e2}]`);
  }

  printTable(allResults);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allResults, null, 2), 'utf-8');
  console.log(`\n✓ Results saved to ${OUTPUT_PATH}`);
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
