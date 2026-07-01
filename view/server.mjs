#!/usr/bin/env node
// Thin dod dashkit reader for the PDD-vs-raw experiment. No dependencies.
//
// Contract (dod-kit/1, render mode "spec"):
//   GET /api/meta   -> { contract, render, name, refresh_ms, accepts_actions }
//   GET /api/render -> a dashkit Spec { title, refresh_ms, panels: [...] }
//
// The Spec panels mirror view/render-spec.sample.json exactly (reviewed layout),
// populated from ../metrics.json when it exists and degrading to an all-pending
// spec when it does not, so the dashboard renders from the first cell onward.
//
// metrics.json (written by the run, derived from results/) is the single source
// for the numeric panels. Expected shape (every field optional; missing -> pending):
//   {
//     "headline": { "killable_missed", "gate_verified_real",
//                   "recall_delta_c_vs_r", "precision_delta_p_vs_c" },
//     "finder_by_arm_run": { "runs": ["run 1","run 2","run 3"],
//                            "R": [..], "C": [..], "P": [..] },
//     "gate_yield": { "labels": [..], "values": [..] },
//     "kill_condition": [ { "condition", "threshold", "status" }, ... ],
//     "progress_arm_run": { "R": ["pending","pending","pending"], "C": [...], "P": [...] },
//     "pipeline": [ { "stage", "status" }, ... ]
//   }
// The live event log is read straight from ../events.jsonl, independent of metrics.

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

// Return the value if present, else a "pending" string, so stats never render blank.
function stat(label, value) {
  return { type: 'stat', label, value: value === undefined || value === null ? 'pending' : value };
}

function tailEvents(n) {
  try {
    const lines = fs.readFileSync(path.join(ROOT, 'events.jsonl'), 'utf8')
      .split('\n').filter(Boolean);
    return lines.slice(-n).map((l) => {
      try {
        const e = JSON.parse(l);
        return `${e.ts}  ${e.actor}/${e.action}  ${e.target}${e.note ? '  — ' + e.note : ''}`;
      } catch { return l; }
    });
  } catch { return []; }
}

function buildSpec() {
  const m = readJSON(path.join(ROOT, 'metrics.json')) || {};
  const h = m.headline || {};
  const f = m.finder_by_arm_run || {};
  const g = m.gate_yield || {};
  const runs = Array.isArray(f.runs) ? f.runs : ['run 1', 'run 2', 'run 3'];

  const panels = [];

  panels.push({ type: 'section', title: 'headline outcomes' });
  panels.push(stat('killable gaps missed by finders', h.killable_missed));
  panels.push(stat('gate suite verified-real yield', h.gate_verified_real));
  panels.push(stat('recall delta, C vs R', h.recall_delta_c_vs_r));
  panels.push(stat('precision delta, P vs C', h.precision_delta_p_vs_c));

  panels.push({ type: 'section', title: 'finder findings by arm and run' });
  panels.push({
    type: 'chart', kind: 'bars', x: runs,
    series: [
      { name: 'R raw', values: f.R || [] },
      { name: 'C chunk-only', values: f.C || [] },
      { name: 'P full pdd', values: f.P || [] },
    ],
  });

  panels.push({ type: 'section', title: 'deterministic gate yield, verified-real' });
  panels.push({
    type: 'chart', kind: 'hbar',
    x: g.labels || [],
    values: g.values || [],
  });

  panels.push({ type: 'section', title: 'kill-condition' });
  const killRows = (m.kill_condition || [
    { condition: 'a. C recall exceeds R', threshold: '>= 10 pts and > run spread', status: 'pending' },
    { condition: 'b. killable gaps missed by finders', threshold: 'K >= 1, report count', status: 'pending' },
    { condition: 'c. P precision exceeds C', threshold: '>= 8 pts and > run spread', status: 'pending' },
  ]).map((r) => [r.condition, r.threshold, r.status]);
  panels.push({
    type: 'table', columns: ['condition', 'threshold', 'status'],
    align: ['left', 'left', 'right'], rows: killRows,
  });

  panels.push({ type: 'section', title: 'progress, arm by run' });
  const pa = m.progress_arm_run || {};
  const armRow = (name, key) => [name, ...(pa[key] || ['pending', 'pending', 'pending']).slice(0, runs.length)];
  panels.push({
    type: 'table', columns: ['arm', ...runs],
    rows: [
      armRow('R raw', 'R'),
      armRow('C chunk-only', 'C'),
      armRow('P full pdd', 'P'),
    ],
  });

  panels.push({ type: 'section', title: 'progress, pipeline' });
  const pipeRows = (m.pipeline || [
    { stage: 'gate suite (wide)', status: 'pending' },
    { stage: 'blind adjudication', status: 'pending' },
    { stage: 'survivor triage', status: 'pending' },
    { stage: 'metrics + kill-condition', status: 'pending' },
  ]).map((r) => [r.stage, r.status]);
  panels.push({ type: 'table', columns: ['stage', 'status'], rows: pipeRows });

  const ev = tailEvents(12);
  if (ev.length) {
    panels.push({ type: 'section', title: 'action ledger (live)' });
    panels.push({ type: 'log', lines: ev });
  }

  return { title: META.name, refresh_ms: META.refresh_ms, panels };
}

function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = (req.url || '').split('?')[0];
  if (url === '/api/meta') return send(res, 200, META);
  if (url === '/api/render') {
    try { return send(res, 200, buildSpec()); }
    catch (e) { return send(res, 500, { error: String(e && e.message || e) }); }
  }
  return send(res, 404, { error: 'not found', paths: ['/api/meta', '/api/render'] });
});

server.listen(argPort, () => {
  process.stdout.write(`view/server.mjs listening on :${argPort} (root ${ROOT})\n`);
});
