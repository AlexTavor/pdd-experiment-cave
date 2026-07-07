#!/usr/bin/env node
// Thin dod dashkit reader for the PDD-vs-raw experiment. No dependencies.
//
// Contract (dod-kit/1, render mode "spec"):
//   GET /api/meta   -> { contract, render, name, refresh_ms, accepts_actions }
//   GET /api/render -> a dashkit Spec { title, refresh_ms, panels: [...] }
//
// Comparison-first layout, driven by ../metrics.json (written from the adjudicated
// results). Every per-arm panel is series-per-arm, so arm C drops in as a third
// series/column with no code change. Degrades to a minimal pending spec if metrics
// is absent. The live event ledger is read straight from ../events.jsonl.
//
// metrics.json shape (all optional):
//   { title, subtitle,
//     headline: [[col,...], [row,...], ...],          // first row = header
//     severity: { x:[...], R:[...], P:[...], C?:[...] },
//     klass:    { x:[...], R:[...], P:[...], C?:[...] },
//     coverage: { x:[...], R:[...], P:[...], C?:[...] },
//     cost:     [[col,...], ...],                      // first row = header
//     gate:     [[col,...], ...],
//     progress_arm_run: { R:[...], C:[...], P:[...] },
//     pipeline: [[col,...], ...] }

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const argPort = (() => {
  const i = process.argv.indexOf('--port');
  const v = i >= 0 ? Number(process.argv[i + 1]) : NaN;
  return Number.isFinite(v) ? v : 4320;
})();

const META = {
  contract: 'dod-kit/1',
  render: 'spec',
  name: 'PDD vs raw, Cave engine',
  refresh_ms: 4000,
  accepts_actions: false,
};

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

const ARM_NAME = { R: 'R raw', P: 'P full pdd', C: 'C chunk-only' };

// A table atom from a rows array whose first element is the header row.
function tableFromRows(rows, align) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const [header, ...body] = rows;
  const t = { type: 'table', columns: header, rows: body };
  if (align) t.align = align;
  return t;
}

// Grouped bars from { x, R, P, C? }: one series per arm that has data.
function groupedBars(block) {
  const series = [];
  for (const arm of ['R', 'P', 'C']) {
    if (Array.isArray(block[arm]) && block[arm].length) {
      series.push({ name: ARM_NAME[arm], values: block[arm] });
    }
  }
  return { type: 'chart', kind: 'bars', x: block.x || [], series };
}

function progressTable(pa) {
  const runs = ['run 1', 'run 2', 'run 3'];
  const row = (name, key) => [name, ...(pa[key] || ['pending', 'pending', 'pending']).slice(0, 3)];
  return {
    type: 'table', columns: ['arm', ...runs],
    rows: [row('R raw', 'R'), row('C chunk-only', 'C'), row('P full pdd', 'P')],
  };
}

function tailEvents(n) {
  try {
    const lines = fs.readFileSync(path.join(ROOT, 'events.jsonl'), 'utf8').split('\n').filter(Boolean);
    return lines.slice(-n).map((l) => {
      try { const e = JSON.parse(l); return `${e.ts}  ${e.actor}/${e.action}  ${e.target}${e.note ? '  — ' + e.note : ''}`; }
      catch { return l; }
    });
  } catch { return []; }
}

function buildSpec() {
  const m = readJSON(path.join(ROOT, 'metrics.json')) || {};
  const panels = [];
  const push = (p) => { if (p) panels.push(p); };

  if (m.subtitle) push({ type: 'prose', text: m.subtitle });

  push({ type: 'section', title: 'head-to-head (real findings, target region)' });
  push(tableFromRows(m.headline, ['left', 'right', 'right', 'right']));

  if (m.severity) { push({ type: 'section', title: 'severity mix (real)' }); push(groupedBars(m.severity)); }
  if (m.klass) { push({ type: 'section', title: 'class mix (real)' }); push(groupedBars(m.klass)); }
  if (m.coverage) { push({ type: 'section', title: 'coverage by subsystem (real)' }); push(groupedBars(m.coverage)); }

  push({ type: 'section', title: 'cost (tokens priced, USD estimate)' });
  push(tableFromRows(m.cost) || { type: 'prose', text: 'cost pending' });

  push({ type: 'section', title: 'deterministic gate axis (PDD-only, R has no equivalent): primary metric' });
  push(tableFromRows(m.gate) || { type: 'prose', text: 'gate axis pending' });

  push({ type: 'section', title: 'source contribution (what works best)' });
  push(tableFromRows(m.contribution, ['left', 'right', 'right', 'right']));

  push({ type: 'section', title: 'progress' });
  push(progressTable(m.progress_arm_run || {}));
  push(tableFromRows(m.pipeline));

  const ev = tailEvents(12);
  if (ev.length) { push({ type: 'section', title: 'action ledger (live)' }); push({ type: 'log', lines: ev }); }

  return { title: m.title || META.name, refresh_ms: META.refresh_ms, panels };
}

function send(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  const url = (req.url || '').split('?')[0];
  if (url === '/api/meta') return send(res, 200, META);
  if (url === '/api/render') {
    try { return send(res, 200, buildSpec()); }
    catch (e) { return send(res, 500, { error: String((e && e.message) || e) }); }
  }
  return send(res, 404, { error: 'not found', paths: ['/api/meta', '/api/render'] });
});

server.listen(argPort, () => {
  process.stdout.write(`view/server.mjs listening on :${argPort} (root ${ROOT})\n`);
});
