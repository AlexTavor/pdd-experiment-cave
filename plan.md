# Experiment: PDD versus a raw agent on a large codebase

Status: DRAFT plan, not yet running. Created for review, uncommitted.

## Why this exists (the oil-check)

PDD is work in progress and improving daily, so this is not a final grade. It is a
signal detector: does the readiest part of PDD (MAP, i.e. decomposition, atlas, finder,
plus the deterministic gates) show a real, defensible advantage on the terrain it is
built for, a large brownfield codebase. The pinned commit makes the number meaningful
and re-runnable, so the same experiment can be run again later to see whether utility
rose. Measure the readiest slice now, cheaply, and let the signal decide whether to keep
investing.

## Question

Three sub-questions, one per comparison:

1. Does PDD's decomposition beat the model's own handling of scale? (R vs C)
2. Does PDD's taxonomy add value once decomposition is held constant? (C vs P)
3. Does the deterministic gate suite prove adequacy gaps that no finder produces? (gates)

## Pre-registered claims

- Claim 1 (chunking). At equal budget on a target too large for one context, C exceeds R
  on coverage and precision.
- Claim 2 (taxonomy, conditional). P exceeds C on precision and on the adequacy and
  silent-failure classes.
- Claim 3 (proof, unconditional). The deterministic gates surface real, killable test gaps
  that no finder arm reports.
- Expected negative (not a kill trigger). P and C find fewer high-severity bugs than R,
  following the prior runs' pattern.

## Arms

| Arm | Decomposition | Analysis prompt | Budget |
|---|---|---|---|
| R (raw, steelmanned) | the model's own navigation | generic review prompt | B |
| C (chunk-only) | PDD structural chunker + per-unit isolation | same generic prompt as R | B |
| P (full PDD) | PDD structural chunker + per-unit isolation | PDD taxonomy + skills | B |
| Gate suite | none (runs wide over the whole engine) | deterministic detectors, no model | none |

R vs C isolates PDD's scale handling. C vs P isolates the taxonomy. R vs P is the whole
product. The gate suite is the model-independent proof layer.

## Scope

- Repo: cave-public (public, shareable), commit pinned as `target_commit`.
- PDD version: pinned as `pdd_commit`. PDD is a moving target; the number is only
  meaningful against a commit.
- Finder target: the engine minus the already-processed compiler and linker, about 29k
  source lines on cave-public (34.4k engine minus 4.1k compiler minus 0.7k linker), large
  enough to exceed a single context window. Calibration (see Budget) may run a large subset
  of this if the full three-arm, three-run pass exceeds the weekly headroom.
- Gate suite: the whole engine, including compiler and linker (their gate output on
  hardened code is itself informative).
- Runs: 3 per finder arm.
- Round 2 (later): a second large region, or a non-Cave repo, for generalization.
  Cave-only rules out "this subsystem was a fluke," not "Cave-specific."

## Budget and headroom

Goal: keep at least 20 percent of the weekly Max allowance free.

There is no cost to anchor to. The prior compiler and linker passes recorded no tokens, no
wall-clock per run, no agent count, and no model, which matches the flat subscription. The
committed proxies: the compiler pass was a multi-day hardening effort (about 26 new test
files, +12k test lines, four property tests, roughly 93 percent mutation on a 4,065-line
surface, full-slice mutation about 14 minutes); the linker pass was a diagnostic-only MAP
(about 40 minutes span, docs only, 19 findings, zero mutants on 686 lines). Neither gives a
token number, and the linker MAP is the closer analogue for a finder pass since it only
diagnoses.

So B is not a token count; it is set operationally and gated by a calibration read:

1. Calibrate first. Run one arm (P) over one chunk of about 1 to 2k lines and read the weekly
   Max meter before and after. That gives consumption per arm per kiloline in meter terms.
2. Extrapolate. Multiply by target lines times arms times runs and compare against 80 percent
   of the weekly allowance.
3. If it fits, run the full three by three. If not, reduce in this order: runs three to two,
   then shrink the target to a large subset, then drop arm C last (it answers the chunking
   question). Never cut silently; record the cut.
4. B per arm is a wall-clock and agent-count cap per arm-run, set from the calibration so the
   three arms are equal, plus a checkpoint: after calibration and after each arm, confirm the
   meter is under 80 percent before continuing, else pause.

This makes the 20 percent headroom an enforced checkpoint, not a guess.

## Validity conditions

- Equal budget across R, C, P. Without it, a PDD win reduces to "spent more attention,"
  which a raw user could also do.
- Taxonomy-free decomposition for C: use the structural, duration-sized chunker, not PDD's
  carve roadmap (which is risk-ranked from the atlas and would reintroduce the taxonomy).
  VERIFY AT WIRING that the chunker boundaries come from structure, not the taxonomy pass.
- Frozen, committed prompts: `raw.md` (shared by R and C), the PDD taxonomy for P,
  `judge.md`. Referenced by content hash.
- Blind adjudication: the judge never sees which arm produced a finding; findings are
  normalized to one shape first so phrasing cannot reveal the arm.
- Bootstrapped union oracle: recall is measured against the union of all arms plus the
  gates plus any seeded bugs, and is a lower bound, stated as such.
- Grade survivors triaged killable / equivalent / dead; killable survivors are the real gaps.

## Metrics

Primary (proof, prompt-independent, per gate over the whole engine):

- per-gate verified-real yield, and yield unique to that gate.
- killable gaps, and killable gaps missed by every finder arm (the number that decides it).
- grade score; survivor triage {killable, equivalent, dead}.
- mutation reported as gaps; properties reported as defects; never merged into one number.

Secondary (finder, per arm, median plus run spread):

- real, precision (real / raw), high-severity real (judge-assigned), recall vs union,
  unique, class distribution.
- cross-unit versus local split (the R vs C isolation tradeoff).

Diagnostic: precision delta R->C, C->P, R->P with spread; high-severity delta (expected
negative); wallclock; budget used.

## Results schema (raw record; metrics.json is derived from it)

```jsonc
// experiment.json
{ "id", "protocol_version", "target_commit", "pdd_commit",
  "models": { "finder": "claude-opus-4-8", "judge": "claude-opus-4-8" },
  "prompt_refs": { "raw": "prompts/raw.md@<sha>", "pdd": "...", "judge": "..." },
  "arms": ["R","C","P"], "runs_per_arm": 3, "budget_per_arm": "<B>",
  "kill_condition": "<text + thresholds>" }

// target.json
{ "id", "repo", "region_paths": ["..."], "source_loc", "test_loc", "prior_pdd": false }

// run.json (one per arm x run)
{ "experiment_id", "arm": "R|C|P", "run_index", "model", "budget_used",
  "status": "pending|generated|adjudicated", "raw_findings": ["<finding_id>"] }

// finding.json (pooled, opaque id; source sealed during blind adjudication)
{ "id", "file", "line", "title", "detail", "finder_severity", "finder_class",
  "source": { "arm", "run_index" },            // hidden from the judge
  "cluster_id", "cross_unit": false,
  "adjudication": { "verdict": "real|false|trivial|pending",
                    "judge_severity", "judge_class",
                    "by": "agent|human", "oracle_match": "<oracle_id|null>", "notes" } }

// gate_run.json (one per gate; deterministic, model-independent, run wide)
{ "gate", "role": "detector|adequacy", "scope": "whole-engine",
  "findings": [ { "file", "line", "detail",
                  "verdict": "real|false|pending", "unique_vs_finders": true } ],
  // adequacy gates (mutation) also carry:
  "score", "mutants_total", "killed", "survived", "uncovered",
  "survivors": [ { "mutant_id", "file", "line", "op",
                   "triage": "killable|equivalent|dead|pending", "found_by_finder": false } ] }

// oracle.json (derived: the bootstrapped union)
{ "members": [ { "oracle_id", "file", "line", "title", "severity",
                 "from": ["<finding_id>"], "source": "finder|gate|seeded" } ] }
```

## Kill-condition

Keep iff, on the large target:
(a) C beats R on recall by at least 10 points AND by more than the within-arm run spread; and
(b) the gate suite yields at least K = 1 killable gap missed by all finders, confirmed
    killable after triage; and
(c) P beats C on precision by at least 8 points AND by more than the within-arm run spread.
Kill iff C is within the run spread of R AND the gates yield near-zero killable-missed gaps
after triage. A negative high-severity delta is expected and is not a kill trigger.

Reading K: K = 1 is the floor, read as "keep exploring", and the real count is always
reported. Treat >= 5 confirmed killable-missed gaps as a clear signal. The point floors in
(a) and (c) only stop a trivial-but-consistent difference from counting; with three runs the
"exceeds the run spread" clause is the real guard, and both floors are revisited once the
actual spread is known.

## Protocol

1. Pin `target_commit` and `pdd_commit`.
2. Chunk the target; verify the decomposition is taxonomy-free.
3. Freeze and hash the prompts.
4. Run the gate suite wide over the whole engine.
5. Run R, C, P, three each, at equal budget.
6. Pool findings; blind tiered adjudication (agents first, contested and high-severity to
   the operator).
7. Triage the grade survivors.
8. Derive metrics.json.
9. Evaluate the kill-condition.

## Observability

- This file is the cold-resume thread. Reopen it to remember why and where you are.
- The outcomes dashboard reads `results/` and `metrics.json` and surfaces through dod
  (`experiment.project.json`), showing the progress grid, the R/C/P finder comparison with
  the three deltas, the per-gate attribution, the proof wedge, and the kill-condition verdict.

## Status grid (updated as cells complete)

| Stage | State |
|---|---|
| Pin commits | pending |
| Chunk + verify taxonomy-free | pending |
| Freeze prompts | pending |
| Gate suite (wide) | pending |
| Arm R (3 runs) | pending |
| Arm C (3 runs) | pending |
| Arm P (3 runs) | pending |
| Blind adjudication | pending |
| Survivor triage | pending |
| Metrics + kill-condition | pending |
