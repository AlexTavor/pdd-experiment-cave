# Outcomes view (dod, render mode "spec")

The view is a dod dashkit dashboard in declarative-atom mode. dod discovers
`../dod.project.json`, launches this server, and renders the atoms natively (no custom HTML,
no iframe).

The server (`server.mjs`, written at kickoff) answers two endpoints:

- `GET /api/meta` -> `{ "contract": "dod-kit/1", "render": "spec", "name": "PDD vs raw, Cave engine", "refresh_ms": 4000, "accepts_actions": false }`
- `GET /api/render` -> the `Spec` object: `{ title, refresh_ms, panels: [...] }`, built by reading
  `../results/` and `../metrics.json`.

`render-spec.sample.json` is a snapshot of that `Spec` with the current real numbers. The layout
is comparison-first: every per-arm panel is series-per-arm, so arm C drops in as a third
series/column with no code change. Panel-to-atom mapping:

| Panel | dod atom |
|---|---|
| head-to-head (real, false, precision, high-sev, cost) | `table` (columns: metric, R, P) |
| severity mix (real) | `chart` kind `bars` (series per arm) |
| class mix (real) | `chart` kind `bars` (series per arm) |
| coverage by subsystem (real) | `chart` kind `bars` (series per arm) |
| cost (tokens priced, USD estimate) | `table` |
| deterministic gate axis (PDD-only, primary metric) | `table` |
| progress, arm by run + pipeline | `table` (x2) |
| action ledger (live) | `log` |

The panels are driven by `../metrics.json` (written from the adjudicated results). The finder
axis is complete for R and P (run 1); the gate axis shows raw counts with the killable triage
marked pending; production cost per arm is marked pending a controlled measure.

All atoms are shipped by dod (`dod/frontend/src/types.ts`), so nothing is missing. The only
build step is `server.mjs`, which is a thin reader that emits the spec from the results.

Note: dod scans for `dod.project.json` under its roots to a bounded depth (default 4 from
`~/Documents`). This manifest sits at the repo root, depth 2, so dod discovers it with no
config change.
