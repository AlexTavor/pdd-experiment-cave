# results

Every finding and every verdict from the run, written as it proceeded. Run 1 is complete for
arms R and P and blind-adjudicated; arm C has not started.

## Pins

- `experiment.json` — frozen commits, prompt hashes, arm definitions.
- `target.json` — the target region: 9 engine subsystems, compiler and linker excluded.

## Findings

`findings/` holds the pooled per-arm sets, raw as produced and again after adjudication:

- `arm-R.run1.json`, `arm-R.adjudicated.json`
- `arm-P.raw.json`, `arm-P.adjudicated.json`

## Adjudication

`adjudication/arm-R/` and `adjudication/arm-P/`, each split into `input/` and `verdicts/`,
one file per subsystem. The judge saw the `input/` file alone, with no arm label, and
`prompts/judge.md` was frozen before the run. Verdicts classify each finding as real, false
or trivial and assign a severity.

## Gates

`gates/` holds the deterministic layer, which is the axis where the two arms diverge most.

- `mutation-summary.json` — 7,227 survivors surfaced.
- `mutation-sample/` — the killable triage, 14 input slices with matching verdicts,
  `sample-manifest.json` for how the sample was drawn, `triage-result.json` for the outcome
  (n=385, roughly 93.8% killable).
- `static-sample/` — the static-gate validation, n=58 over five gates, with
  `static-triage-result.json`: 10 real, 43 false, 5 trivial. This is where
  `cover-the-mirror` returned 0 real of 36 and `boundary-tests` did best at 6 real of 10.
- `static-gates.json`, `prove-boundary.json` — per-gate output.

Schema and method are in [../plan.md](../plan.md). Headline numbers are in
[../README.md](../README.md).
