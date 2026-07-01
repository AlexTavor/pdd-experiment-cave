# Outcomes view (dod, render mode "spec")

The view is a dod dashkit dashboard in declarative-atom mode. dod discovers
`../dod.project.json`, launches this server, and renders the atoms natively (no custom HTML,
no iframe).

The server (`server.mjs`, written at kickoff) answers two endpoints:

- `GET /api/meta` -> `{ "contract": "dod-kit/1", "render": "spec", "name": "PDD vs raw, Cave engine", "refresh_ms": 4000, "accepts_actions": false }`
- `GET /api/render` -> the `Spec` object: `{ title, refresh_ms, panels: [...] }`, built by reading
  `../results/` and `../metrics.json`.

`render-spec.sample.json` is exactly that `Spec`, with sample numbers, so the atom layout is
reviewable before any data exists. Panel-to-atom mapping:

| Panel | dod atom |
|---|---|
| headline numbers | `stat` (x4) |
| finder by arm and run | `chart` kind `bars` (series per arm) |
| gate yield | `chart` kind `hbar` (single series) |
| kill-condition | `table` |
| progress, arm by run | `table` |
| progress, pipeline | `table` |

All atoms are shipped by dod (`dod/frontend/src/types.ts`), so nothing is missing. The only
build step is `server.mjs`, which is a thin reader that emits the spec from the results.

Note: dod scans for `dod.project.json` under its roots to a bounded depth (default 4 from
`~/Documents`). This manifest sits at the repo root, depth 2, so dod discovers it with no
config change.
