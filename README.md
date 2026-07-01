# pdd-experiment-cave

Does PDD show a real, defensible advantage over a strong raw agent on a large brownfield
codebase? This project runs that experiment on the Cave engine and records every finding and
every action.

Status: draft plan, not started. Kickoff requires explicit approval.

## Navigate

- [plan.md](plan.md) — the design: the question, three arms (R raw, C chunk-only, P full
  PDD), the wide deterministic gate suite, scope, budget, metrics, results schema,
  kill-condition, and protocol.
- [prompts/](prompts/) — frozen finder and judge prompts: `raw.md` (shared by R and C),
  `judge.md`, `pdd.md`.
- [view/](view/) — the dod dashboard: [dod.project.json](dod.project.json) manifest, the atom
  spec in [view/render-spec.sample.json](view/render-spec.sample.json), the contract in
  [view/README.md](view/README.md).
- [results/](results/) — per-cell records, written as the run proceeds: runs, findings,
  gate_runs, grade, oracle.
- `metrics.json` — derived from results, written by the run.
- [calibration/](calibration/) — the budget read that sizes the run against the 20 percent
  weekly headroom.
- `events.jsonl` — the append-only action ledger.

## How everything is recorded

Three layers, so no finding and no action is lost:

1. **Git history.** Every step is a small commit; the log is the durable, searchable record.
2. **`events.jsonl`.** One line per action: `{ ts, actor, action, target, note }`,
   append-only. Append with `./log-event <actor> <action> <target> <note>`.
3. **`results/`.** Every finding is a durable object with full provenance: arm, run, blind
   verdict, judge severity and class, oracle match.

The dod dashboard renders all three, including a live view of the event stream.

## Run status

Nothing has run. The three arms, the gate suite, adjudication, and the grade are all pending.
See the status grid in [plan.md](plan.md) and the progress panels in the dashboard.
