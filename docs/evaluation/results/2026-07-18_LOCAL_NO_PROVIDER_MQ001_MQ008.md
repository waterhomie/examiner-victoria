# Local no-provider text evaluation: MQ-001—MQ-008

Related baseline:

- [V3 minimal quality test set](../V3_MINIMAL_QUALITY_TEST_SET.md)
- [Evaluation run template](../V3_MINIMAL_QUALITY_RUN_TEMPLATE.md)
- [MQ-011—MQ-014 local recovery result](2026-07-18_LOCAL_NO_PROVIDER_MQ011_MQ014.md)

## Executive decision

- Primary LLM-backed language quality: Inconclusive without an authorized Provider run.
- Provider-disabled fallback content quality: Does not meet the MQ-001—MQ-008 content thresholds.
- Session and next-question preservation: Pass in all 14 runs.
- V3 release classification: Not determined by this subset.

This run evaluates the product's real behavior when all model access is blocked locally. It does not evaluate the configured production model and must not be presented as a conclusion about normal Provider-backed feedback quality.

## Scope

- Date: 2026-07-18
- Evaluated commit: fe48c0ce20a4002624c9b898c08080d6cb783f25
- Evaluation branch: test/v3-minimal-quality-text-pilot
- Cases: MQ-001 through MQ-008
- Runs: 14
- Input source: text
- Sound: off
- Provider network calls: 0
- Provider attempts blocked by the local harness: 13
- Inputs: synthetic cases already defined in the test set
- User data: none
- Human tester count: 0
- Market, production, or official IELTS scoring claim: none

The test ran from a Git archive of the evaluated commit. The archive was verified not to contain root or backend .env files. Provider-related environment names were overridden with empty values inside the isolated child process before the application was imported. No environment values were read or recorded.

## Method

Each case used a fresh Part 1 Practice session with the controlled question Do you like music? and a deterministic next question. MQ-001, MQ-002, and MQ-003 were repeated three times; the remaining cases ran once.

All backend model entry points were replaced in the temporary evaluation process with a function that raised before any network client could be created. This preserves the product's existing exception fallback behavior while guaranteeing zero Provider network calls.

Ratings are case-level averages, not run-weighted averages:

- Accuracy is 2 only for MQ-002 and MQ-003, where returning no correction avoids a false or unnecessary correction.
- MQ-007 receives accuracy 1 because the likely transcript homophone is not confidently miscorrected, but no noise-aware guidance is provided.
- Meaning preservation is 2 for every case because no rewrite, personal fact, pronunciation claim, or invented story is returned.
- Actionability is 0 for every case because no correction, example, clarification, retry guidance, or answer-development action is returned.

## General validation

| Check | Result | Evidence |
| --- | --- | --- |
| Python compile | Pass | Sanitized snapshot compiled successfully |
| Backend smoke | Pass | FastAPI smoke test passed with deterministic local stubs |
| Frontend smoke | Pass | Frontend smoke test passed |
| Fresh session per run | Pass | 14 distinct API sessions were created |
| Sound disabled | Pass | voice_playback_enabled remained false |
| Provider network calls | None | All model entry points were blocked before network access |
| Root or backend .env in snapshot | None | Both exact paths were absent |
| Real user content | None | Only synthetic test-set inputs were used |
| State preservation | Pass | Original session ID, submitted answer, source, and next question were retained in all runs |
| Pronunciation or band claim | None | No output contained either claim |

## Aggregate metrics

| Metric | Result | Baseline rule | Outcome |
| --- | ---: | ---: | --- |
| Average feedback accuracy, MQ-001—MQ-008 | 0.625 / 2 | at least 1.5 / 2 | Fail for Provider-disabled fallback |
| Average meaning preservation, MQ-001—MQ-008 | 2.0 / 2 | at least 1.5 / 2 | Pass |
| Average actionability, MQ-001—MQ-008 | 0.0 / 2 | at least 1.0 / 2 | Fail for Provider-disabled fallback |
| Median answer-stage duration | 0 ms | Baseline only | Recorded; integer route timing rounded down |
| Slowest answer-stage duration | 0 ms | Below 30-second ceiling | Pass |
| Median TestClient wall duration | 3 ms | Baseline only | Recorded |
| Slowest TestClient wall duration | 5 ms | Below 30-second ceiling | Pass |
| Runs with HTTP 200 | 14 / 14 | All | Pass |
| Runs preserving session and next question | 14 / 14 | All | Pass |
| Runs returning a feedback section | 0 / 14 | Quality-dependent | Limitation confirmed |
| Critical product-boundary violations | 1 | 0 | Fail: MQ-006 |
| Provider network calls | 0 | 0 | Pass |

The near-zero durations measure an immediate locally blocked Provider path. They are not Provider latency measurements and must not be compared with production response times.

## Per-case results

| Case | Runs | HTTP | Accuracy | Meaning | Actionability | State | Result for Provider-disabled fallback |
| --- | ---: | --- | ---: | ---: | ---: | --- | --- |
| MQ-001 | 3 | 200 each | 0 | 2 | 0 | Preserved | Fail: no grammar or listen-to correction |
| MQ-002 | 3 | 200 each | 2 | 2 | 0 | Preserved | Partial: avoids false correction but provides no useful refinement |
| MQ-003 | 3 | 200 each | 2 | 2 | 0 | Preserved | Partial: avoids over-correction but provides no explicit feedback |
| MQ-004 | 1 | 200 | 0 | 2 | 0 | Preserved | Fail: off-topic answer accepted without relevance guidance |
| MQ-005 | 1 | 200 | 0 | 2 | 0 | Preserved | Fail: one-word answer accepted without asking for development |
| MQ-006 | 1 | 200 | 0 | 2 | 0 | Preserved | Critical fail: non-language input accepted and flow advanced without retry guidance |
| MQ-007 | 1 | 200 | 1 | 2 | 0 | Preserved | Partial: avoids a false homophone correction but gives no noise-aware guidance |
| MQ-008 | 1 | 200 | 0 | 2 | 0 | Preserved | Fail: no prioritised spoken-language feedback |

## Repeatability and level differentiation

| Check | Observed result | Outcome |
| --- | --- | --- |
| MQ-001 identical repeats | Same output structure and feedback absence in all three runs | Consistent |
| MQ-002 identical repeats | Same output structure and feedback absence in all three runs | Consistent |
| MQ-003 identical repeats | Same output structure and feedback absence in all three runs | Consistent |
| MQ-001 versus MQ-002 | Both receive no feedback | No useful level differentiation |
| MQ-002 versus MQ-003 | Neither is over-corrected | Safety boundary passes; quality differentiation is inconclusive |
| MQ-001 versus MQ-003 | Both receive no feedback despite materially different language control | Fail for fallback differentiation |
| Comparable score repeats | No score is produced in this path | Not applicable |

Repeatability here means deterministic absence of feedback. It is not evidence that Provider-backed feedback is repeatable.

## Confirmed strengths

- The answer route remains available when model feedback fails.
- The candidate answer, source, session ID, next question, and Practice flow remain intact.
- Strong answers are not over-corrected in the disabled path.
- No personal facts, pronunciation result, band estimate, or rewritten meaning are fabricated.
- Sound can remain disabled without affecting text submission.

## Confirmed limitations

- The Provider-disabled path silently removes all feedback sections.
- Beginner errors receive no correction.
- Off-topic and one-word answers receive no targeted recovery guidance.
- Non-language input is accepted as a valid answer and advances the session.
- Long answers receive no prioritisation.
- The fallback cannot demonstrate level differentiation.
- The current rubric makes actionability score zero when no feedback is returned.

## Classification

Provider-disabled text-quality subset: Fail content thresholds.

Primary LLM-backed MQ-001—MQ-008 quality: Inconclusive.

The failure classification applies only to the disabled-Provider fallback surface. A separately authorized Provider-backed run is required before making any statement about normal feedback accuracy, refinement quality, level differentiation, or repeatability.

## Recommended next work

1. Review and submit this evidence without changing business code.
2. Open a separate targeted task for deterministic non-language input handling, beginning with MQ-006.
3. Consider an explicit feedback-unavailable indicator so a silent empty-feedback result is not mistaken for a fully evaluated answer.
4. Run MQ-001—MQ-008 with the configured Provider only after the user explicitly authorizes the paid calls, run count, and expected cost boundary.
5. Keep mobile, STT, TTS, and production deployment testing separate from the language-quality run.

## Maintenance note

The isolated backend run again emitted the existing Starlette TestClient and httpx deprecation warning. It did not affect the recorded results and is not addressed in this evaluation branch.
