# Examiner Victoria V3 Minimal Quality Run Template

> Copy this file for an authorized evaluation run. Do not replace the template with unreviewed production data.

Test definition: [V3 Minimal Quality Test Set](V3_MINIMAL_QUALITY_TEST_SET.md)

## 1. Run metadata

| Field | Value |
|---|---|
| Run ID | `YYYY-MM-DD-environment-sequence` |
| Evaluator | Anonymous/internal role only |
| Date and timezone |  |
| Git SHA |  |
| App version |  |
| Deploy target | local / CloudBase / other |
| Source branch |  |
| Device |  |
| OS |  |
| Browser / container |  |
| Network | local / Wi-Fi / 4G / 5G / other |
| VPN | on / off / not applicable |
| Input source | text / synthetic audio |
| Sound | on / off |
| LLM configured | yes / no; do not record credentials |
| STT configured | yes / no; do not record credentials |
| TTS provider | public provider name only |

## 2. Scope confirmation

- [ ] Only synthetic inputs from `V3_MINIMAL_QUALITY_TEST_SET.md` were used.
- [ ] No real user answer, recording, transcript, identity, or contact detail was stored.
- [ ] No API key, token, cookie, authorization header, or environment-variable value was recorded.
- [ ] The run does not change the tester count.
- [ ] The run is not described as market validation or official IELTS scoring validation.

## 3. Per-case results

Use `0–2` for accuracy, meaning preservation, and actionability. Use `P`, `F`, or `N/A` for pass/fail fields. The current `llm_duration_ms` field equals the answer-route elapsed time, so record it as answer-stage timing rather than isolated Provider latency.

| Case | Run | HTTP / outcome | STT ms | Answer-stage ms | TTS ms | Total ms | Accuracy | Meaning | Actionability | State preserved | Boundary checks | Notes / issue link |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|---|---|---|
| MQ-001 | 1 |  |  |  |  |  |  |  |  |  |  |  |
| MQ-001 | 2 |  |  |  |  |  |  |  |  |  |  |  |
| MQ-001 | 3 |  |  |  |  |  |  |  |  |  |  |  |
| MQ-002 | 1 |  |  |  |  |  |  |  |  |  |  |  |
| MQ-002 | 2 |  |  |  |  |  |  |  |  |  |  |  |
| MQ-002 | 3 |  |  |  |  |  |  |  |  |  |  |  |
| MQ-003 | 1 |  |  |  |  |  |  |  |  |  |  |  |
| MQ-003 | 2 |  |  |  |  |  |  |  |  |  |  |  |
| MQ-003 | 3 |  |  |  |  |  |  |  |  |  |  |  |
| MQ-004 | 1 |  |  |  |  |  |  |  |  |  |  |  |
| MQ-005 | 1 |  |  |  |  |  |  |  |  |  |  |  |
| MQ-006 | 1 |  |  |  |  |  |  |  |  |  |  |  |
| MQ-007 | 1 |  |  |  |  |  |  |  |  |  |  |  |
| MQ-008 | 1 |  |  |  |  |  |  |  |  |  |  |  |
| MQ-009 | 1 |  | N/A |  | N/A |  |  |  |  |  |  |  |
| MQ-010 | 1 |  | N/A |  | N/A |  |  |  |  |  |  |  |
| MQ-011 | 1 |  |  | N/A | N/A |  | N/A | N/A | N/A |  |  |  |
| MQ-012 | 1 |  | N/A |  | N/A |  | N/A | N/A | N/A |  |  |  |
| MQ-013 | 1 |  | N/A | N/A |  |  | N/A | N/A | N/A |  |  |  |
| MQ-014 | 1 |  | N/A |  | N/A |  |  |  |  |  |  |  |

## 4. Level differentiation summary

| Comparison | Expected relationship | Observed result | Pass |
|---|---|---|---|
| MQ-001 vs MQ-002 | Intermediate answer receives fewer or less severe corrections |  |  |
| MQ-002 vs MQ-003 | Advanced answer is not over-corrected |  |  |
| MQ-001 vs MQ-003 | Feedback clearly distinguishes language control and development |  |  |
| Identical repeats | No contradictory corrections or priorities |  |  |
| Comparable score repeats | Spread is recorded; `>0.5` band is flagged |  |  |

## 5. Part 3 flow summary

| Check | MQ-009 | MQ-010 |
|---|---|---|
| Actual bank question recorded |  |  |
| Next question source (`bank` / `dynamic` / `fallback`) |  |  |
| Follow-up relates to answer substance |  | N/A |
| No duplicate question |  |  |
| No over-personal question |  |  |
| No consecutive dynamic follow-up |  |  |
| Short answer uses bank/fallback | N/A |  |

## 6. Failure-recovery summary

| Case | Failure injected | Text preserved | Next question preserved | Session preserved | Correct user message | Retry available | Pass |
|---|---|---|---|---|---|---|---|
| MQ-011 | STT |  | N/A |  |  |  |  |
| MQ-012 | Feedback / LLM |  |  |  |  |  |  |
| MQ-013 | TTS |  |  |  |  |  |  |
| MQ-014 | Report model |  | N/A |  |  |  |  |

## 7. Aggregate metrics

| Metric | Result | First-round rule | Pass |
|---|---:|---:|---|
| Average feedback accuracy, MQ-001–MQ-008 |  | `>= 1.5 / 2` |  |
| Average meaning preservation, MQ-001–MQ-008 |  | `>= 1.5 / 2` |  |
| Average actionability, MQ-001–MQ-008 |  | `>= 1.0 / 2` |  |
| Median STT duration |  | Baseline only | N/A |
| Slowest STT duration |  | Must remain below current client ceiling |  |
| Median answer-stage duration |  | Baseline only | N/A |
| Slowest normal API duration |  | Must remain below current client ceiling |  |
| Median TTS duration |  | Baseline only | N/A |
| Slowest TTS duration |  | Must remain below current client ceiling |  |
| Critical boundary violations |  | `0` |  |
| Failed recovery cases |  | `0` |  |

## 8. Findings and decisions

### Confirmed strengths

- _None recorded yet._

### Confirmed failures

- _None recorded yet._

### Inconclusive items

- _None recorded yet._

### Recommended next optimization

- Issue:
- Evidence:
- Smallest proposed change:
- Regression risk:
- Validation needed after change:

## 9. Final classification

- [ ] Pass: all first-round rules met.
- [ ] Conditional pass: no critical boundary failure, but one or more quality metrics need targeted improvement.
- [ ] Fail: a critical boundary, state-preservation, or recovery rule failed.

Decision rationale:

> _Add rationale._

## 10. Repository evidence boundary

Before committing a completed result record, remove raw synthetic output if it contains unnecessary provider detail and confirm that the record contains no real user data or credentials. A completed run should reference issues by ID and preserve only the evidence needed to reproduce the product decision.
