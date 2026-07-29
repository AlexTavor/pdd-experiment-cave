#!/usr/bin/env node
// Renders the run-1 headline into docs/run1.svg, read from metrics.json rather than typed in,
// so the chart in the README cannot drift from the results the way the status lines did.
//
// Colours are chosen to read on both a light and a dark page, and the background is
// transparent, because GitHub serves README images as <img> and the page theme is not ours.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');

const R_COLOR = '#58a6ff';
const P_COLOR = '#f0883e';
const MUTED = '#7d8590';

/** Panels are scaled independently: the three metrics share no unit, and a shared axis would
 *  flatten the high-severity tie into invisibility, which is the result worth seeing. */
const PANELS = [
  { row: 'real issues', label: 'real issues' },
  { row: 'high-severity real', label: 'high-severity real' },
  { row: 'production cost (USD est)', label: 'cost (USD)' },
];

const num = (s) => Number(String(s).replace(/[^0-9.]/g, ''));

const metrics = JSON.parse(readFileSync(resolve(REPO, 'metrics.json'), 'utf8'));
const byRow = new Map(metrics.headline.slice(1).map(([k, r, p]) => [k, { r, p }]));

const W = 760;
const H = 300;
const PANEL_W = 230;
const PANEL_GAP = 25;
const BASELINE = 232;
const BAR_H = 118;
const BAR_W = 56;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

const bar = (x, value, max, color, raw) => {
  const h = max > 0 ? Math.max(2, Math.round((value / max) * BAR_H)) : 2;
  const y = BASELINE - h;
  return `
    <rect x="${x}" y="${y}" width="${BAR_W}" height="${h}" fill="${color}" rx="2"/>
    <text x="${x + BAR_W / 2}" y="${y - 9}" fill="${color}" font-size="16" font-weight="700"
          text-anchor="middle">${esc(raw)}</text>`;
};

const panel = (p, i) => {
  const cell = byRow.get(p.row);
  if (!cell) throw new Error(`metrics.json has no headline row "${p.row}"`);
  const r = num(cell.r);
  const pv = num(cell.p);
  const max = Math.max(r, pv);
  const x0 = 20 + i * (PANEL_W + PANEL_GAP);
  const rx = x0 + 38;
  const px = x0 + 38 + BAR_W + 24;
  return `
  <g>
    <text x="${x0 + PANEL_W / 2 - 20}" y="66" fill="${MUTED}" font-size="13" font-weight="600"
          text-anchor="middle" letter-spacing="0.4">${esc(p.label)}</text>
    <line x1="${x0}" y1="${BASELINE + 0.5}" x2="${x0 + PANEL_W - 40}" y2="${BASELINE + 0.5}"
          stroke="${MUTED}" stroke-opacity="0.35"/>
    ${bar(rx, r, max, R_COLOR, cell.r)}
    ${bar(px, pv, max, P_COLOR, cell.p)}
    <text x="${rx + BAR_W / 2}" y="${BASELINE + 20}" fill="${MUTED}" font-size="12"
          text-anchor="middle">raw</text>
    <text x="${px + BAR_W / 2}" y="${BASELINE + 20}" fill="${MUTED}" font-size="12"
          text-anchor="middle">full</text>
  </g>`;
};

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"
     font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
     role="img" aria-label="Run 1: a raw agent and the full method compared on real issues, high-severity issues and cost">
  <title>Run 1: raw agent against the full method</title>
  <text x="20" y="28" fill="${MUTED}" font-size="15" font-weight="700">Run 1: raw agent against the full method</text>
  <text x="20" y="46" fill="${MUTED}" font-size="12">9 engine subsystems, blind-adjudicated. Panels are scaled independently.</text>
${PANELS.map(panel).join('\n')}
  <text x="20" y="${H - 12}" fill="${MUTED}" font-size="12">Four times the findings, four times the cost, and the same four high-severity issues.</text>
</svg>
`;

mkdirSync(resolve(REPO, 'docs'), { recursive: true });
writeFileSync(resolve(REPO, 'docs/run1.svg'), svg);
console.log('wrote docs/run1.svg from metrics.json');
