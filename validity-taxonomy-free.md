# Validity check: arm C decomposition is taxonomy-free

Verdict: **GREEN.** Verified 2026-07-01 against `pdd_commit` 731ba4d by an adversarial
6-agent pass (2 mappers, 3 independent refuters, 1 synthesizer), all reading PDD source
directly. 0 of 3 refuters could move a unit boundary with taxonomy input. Workflow run
`wf_cfc5de77-c5c`.

## Why this matters

plan.md's top validity risk: arm C must receive PDD's structural decomposition, not the
risk-ranked carve roadmap. If the taxonomy re-enters through the partition, R-vs-C stops
being a clean test of chunking.

## Verified facts (file:line, all under the PDD `cli`)

Structural chunker identity:

- The pre-analysis structural decomposition is `scopeSubsystems()` at `cli/src/scope.ts:162`,
  wrapped as `buildWorklist().scope` (`cli/src/map/worklist.ts:121`) and consumed by the atlas
  at `cli/src/map/spine.ts:191`. It runs first, before atlas / classify / carve.
- Unit boundaries are set by two pure functions: `subsystemOf` (`scope.ts:50-58`) assigns each
  file to the directory `depth` levels below the scan root from the path split alone; `scopeGlob`
  (`scope.ts:63-65`) derives the owned glob from the subsystem name alone. Neither takes a
  findings / atlas / classify argument.
- In the accumulation loop (`scope.ts:193-199`) a file's subsystem is `subsystemOf(...)`;
  findings and churn only increment counters and can never re-bucket a file or add/remove a
  subsystem.
- Tests pin the invariant: `cli/test/scope.test.ts:24-44` and `:87-94` show the subsystem set
  and scope globs are identical with or without findings; findings change only rank.

Correction to the plan's wording:

- The pre-analysis decomposition is **directory-depth-based, not "duration-sized."** There is no
  LOC / byte / duration chunker upstream of the atlas. The only S/M/L size bucketing (`bucketSize`,
  `carve.ts:87`) lives inside carve and is a function of the classified-finding fingerprint count,
  not file size. Read plan.md's "duration-sized chunker" as "directory-depth structural chunker
  (`scopeSubsystems`, `depth` knob)."

The taxonomy-dependent artifact to exclude:

- `carveUnits` producing units.json (`cli/src/map/carve.ts:170`) is the risk-ranked carve roadmap.
  It reads `merged.rolled` (`carve.ts:181`), drops `equivalent|benign` findings by classify verdict
  (`carve.ts:38-39,195`), skips the atlas `code-map` kind (`carve.ts:194`), and orders units by risk
  (`rankUnits`, `carve.ts:120`). It consumes atlas + classify by construction. Arm C must not
  receive it. `cli/src/units.ts` is only the units.json schema/persistence sink, not part of
  boundary computation.

## The one real wiring risk (rank/limit, not boundary)

There is a genuine path by which atlas/classify output reaches `scopeSubsystems`: `buildWorklist`
passes `merged.findings` into it (`worklist.ts:135`), and on a repeat run `merged.findings`
includes the atlas map slice (`cli/src/mutation/findings.ts:419`) with the classify overlay (`:444`).
Inside `scopeSubsystems` those findings feed only density -> score -> sort -> rank
(`scope.ts:202-215`). Consequences:

- They change the ORDER of subsystems.
- Under a finite `--limit`, `selectScopeWorklist.slice(0, limit)` (`worklist.ts:107-108`) then
  changes WHICH subsystems survive the cut.
- They never move a boundary. At the default `--limit` of Infinity (`cli/bin/pdd.ts:26`) the full
  set is returned uncut.

So if arm C's units were read from a `--limit`-truncated worklist produced after arm P's atlas ran,
the SET (not the boundaries) arm C receives would be atlas-influenced. That is the trap to avoid.

## Arm C wiring rule (the actionable output)

1. Obtain arm C's units from the structural chunker only. Safest: call
   `scopeSubsystems(repoRoot, scanRoot, findings, {depth, exts})` with null/empty `findings`, which
   removes even the ranking dependency, and take each subsystem's `{subsystem, scope}`.
2. If using the CLI `pdd map worklist` and reading its `.scope` array: run with no finite `--limit`
   and before any atlas has been ingested (no `.pdd/findings` `map` slice present).
3. Do NOT give arm C the carve roadmap units.json from `carveUnits`.
4. Fix `depth` as an operator constant, identical wherever the partition applies across C and P;
   default is 1. Never derive it from atlas/risk output.
5. Keep `scanRoot` = the target region and `exts` = `[.ts, .tsx]`, matching target.json, so the
   file set (hence the subsystems) matches the pinned target.

## Note for THIS target (decide at wiring/calibration, not now)

The prior protocol docs (`five-model-experiment.md`, `selfrun-pdd-vs-control.md`) targeted `cli/src`
at 7 subsystems. This experiment targets cave-public `src/engine` minus compiler/linker. A `depth=1`
partition of `src/engine` yields exactly the 9 `region_paths` subsystems already in target.json
(phaser, runtime, terminal, physics, vfs, workspace, logic, balancing, registry). Two of those
(phaser ~267 files, runtime ~179 files) are large; `depth` may need raising for those at wiring so
arm C units stay context-sized. Decide from the calibration read, and keep `depth` equal across C
and P.

## Provenance

- `pdd_commit`: 731ba4d
- workflow: `wf_cfc5de77-c5c`, 6 agents, 417k subagent tokens, 0/3 refutations, GREEN synthesis.
- verified: 2026-07-01.
