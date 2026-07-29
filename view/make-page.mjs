#!/usr/bin/env node
// Builds docs/, the published dashboard, from the same spec the local dod view renders.
//
// dod's renderer is a self-contained IIFE that assigns `window.dashkit` and exposes
// `renderSpec(spec, el)`. Nothing about it needs a server, so the whole dashboard is a static
// page: vendor the renderer, inline the spec, render once. Omitting the action handler makes
// it read-only, which is correct for a finished run.
//
// Regenerate the spec first:  node view/server.mjs --dump view/render-spec.sample.json
// Then:                       node view/make-page.mjs

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const DOCS = resolve(REPO, 'docs');

// Vendored rather than fetched: a published page that depends on a sibling checkout is a page
// that breaks the first time someone else clones this.
const DASHKIT_SRC = resolve(REPO, '../dod/src/dod/web/dashkit.js');
const DASHKIT_OUT = resolve(DOCS, 'dashkit.js');

mkdirSync(DOCS, { recursive: true });

if (existsSync(DASHKIT_SRC)) {
  copyFileSync(DASHKIT_SRC, DASHKIT_OUT);
  console.log('vendored dashkit.js from ../dod');
} else if (!existsSync(DASHKIT_OUT)) {
  throw new Error(`no dashkit.js at ${DASHKIT_SRC} and none vendored in docs/`);
} else {
  console.log('kept the vendored docs/dashkit.js (../dod not present)');
}

const spec = JSON.parse(readFileSync(resolve(REPO, 'view/render-spec.sample.json'), 'utf8'));

// The action ledger is a live-run panel. On a frozen page it shows twelve stale lines under a
// heading that says "live", which claims the run is still moving. The local dod view keeps it.
const isLedger = (p) =>
  p.type === 'log' || (p.type === 'section' && /^action ledger/i.test(p.title || ''));
const panels = spec.panels.filter((p) => !isLedger(p));

// Inlined rather than fetched so the page also works opened from disk, where fetch of a
// file:// JSON is blocked.
const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PDD vs a raw agent, Cave engine</title>
<meta name="description" content="Run 1 of a three-arm, blind-adjudicated experiment measuring a spec-driven method against a raw agent on a large brownfield codebase.">
<style>
  html, body { margin: 0; background: #16140f; color: #cfc9bd; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
  header { padding: 28px 24px 8px; max-width: 1100px; margin: 0 auto; }
  header h1 { font-size: 19px; margin: 0 0 6px; font-weight: 700; }
  header p { font-size: 14px; margin: 0 0 8px; color: #9a9284; line-height: 1.5; }
  header p.quiet { font-size: 13px; color: #7d7466; }
  header a { color: #d9a441; }
  main { max-width: 1100px; margin: 0 auto; padding: 0 24px 60px; }
</style>
</head>
<body>
<header>
  <h1>PDD vs a raw agent, Cave engine</h1>
  <p>Run 1 of a three-arm experiment on a 9-subsystem brownfield target. Frozen prompts, pinned
  commits, a kill-condition declared before the run, blind adjudication by a separate judge.
  Arm C and runs 2 and 3 are not done, and the kill-condition has not been evaluated.</p>
  <p><a href="https://github.com/AlexTavor/pdd-experiment-cave">Method, results and the raw
  verdicts</a> are in the repository, including the frozen prompts and the pinned commits that
  make run 1 reproducible.</p>
  <p class="quiet">The panels below are drawn by <a href="https://github.com/AlexTavor/dod">dod</a>'s
  dashkit, the same renderer the local dashboard uses.</p>
</header>
<main><div id="root"></div></main>
<script src="dashkit.js"></script>
<script>
  var SPEC = ${JSON.stringify({ ...spec, panels })};
  dashkit.renderSpec(SPEC, document.getElementById('root'));
</script>
</body>
</html>
`;

writeFileSync(resolve(DOCS, 'index.html'), page);
console.log(`wrote docs/index.html (${panels.length} panels, ledger dropped)`);
