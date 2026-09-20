# Provider-backed text evaluation: MQ-001—MQ-008

Related baseline:

- [V3 minimal quality test set](../V3_MINIMAL_QUALITY_TEST_SET.md)
- [Evaluation run template](../V3_MINIMAL_QUALITY_RUN_TEMPLATE.md)
- [Local no-provider MQ-001—MQ-008 result](2026-07-18_LOCAL_NO_PROVIDER_MQ001_MQ008.md)
- [MQ-011—MQ-014 local recovery result](2026-07-18_LOCAL_NO_PROVIDER_MQ011_MQ014.md)

## Executive decision

- Provider-backed MQ-001—MQ-008 aggregate thresholds: Pass.
- Case-anchor quality: Conditional; MQ-004, MQ-005, MQ-007, and MQ-008 still need targeted improvement.
- Invalid non-language recovery: Pass; MQ-006 is rejected before a Provider call and the session remains recoverable.
- Repeatability and level differentiation: Pass for the three repeated cases.
- V3 release classification: Not determined by this subset.

This run establishes a bounded normal-feedback baseline. It does not validate official IELTS band accuracy, production networking, speech recognition, speech playback, report generation, or real-user outcomes.

## Scope

- Date: 2026-07-18
- Evaluated commit: `86f358caa396d2a76e7487e58f0e9f8c19ee113b`
- Evaluation branch: `test/v3-provider-backed-mq001-mq008`
- Cases: MQ-001 through MQ-008
- Answer requests: 14
- Actual LLM calls: 13
- Authorized maximum LLM calls: 14
- Input source: text
- Sound: off
- STT calls: 0
- TTS calls: 0
- Report calls: 0
- Inputs: synthetic cases already defined in the test set
- User data: none
- Human tester count: 0
- Market, production, or official IELTS scoring claim: none

The application used its existing configured runtime. The evaluation harness checked only whether model access was configured; it did not enumerate, inspect, or record Provider identity, model name, endpoint, credentials, or environment values. MQ-006 was rejected deterministically before model execution, which reduced the actual paid-call count from the 14-request plan to 13.

## Method

Each case used a fresh Part 1 Practice session with the controlled question `Do you like music?` and the deterministic next question `What kinds of music do you listen to?`. MQ-001, MQ-002, and MQ-003 were repeated three times; the remaining cases ran once.

A process-local hard guard stopped model execution before a fifteenth Provider attempt. Only `/api/answer` was exercised. The harness did not call transcription, speech synthesis, report, deployment, or browser surfaces. Full synthetic model outputs were retained only in an ignored temporary working file for scoring and were removed after this summary was prepared.

Ratings are case-level averages, not run-weighted averages. Accuracy assesses whether the feedback claim is correct for the supplied text and evaluation anchor. Meaning preservation separately penalizes invented preferences, reasons, routines, or stories. Actionability assesses whether the learner receives a concise and usable next action.

## General validation

| Check | Result | Evidence |
| --- | --- | --- |
| Authorized call ceiling | Pass | 13 actual LLM calls; hard limit 14 |
| Planned answer requests | Pass | 14 / 14 completed with expected status |
| Valid answer responses | Pass | 13 / 13 returned HTTP 200 |
| Invalid non-language response | Pass | MQ-006 returned HTTP 422 before model execution |
| Fresh session per run | Pass | 14 independent API sessions were used |
| Sound disabled | Pass | Voice playback remained off |
| STT and TTS isolation | Pass | 0 STT calls and 0 TTS calls |
| Real user content | None | Only the published synthetic test-set inputs were used |
| State preservation | Pass | All valid answers retained answer, session, and next question; MQ-006 retained the original recoverable session without saving invalid text |
| Pronunciation or band claim | None | No output made either claim |
| Provider configuration disclosure | None | No Provider, model, endpoint, credential, or environment value was recorded |

The backend emitted the existing Starlette TestClient and httpx deprecation warning. It did not affect any recorded response.

## Aggregate metrics

| Metric | Result | Baseline rule | Outcome |
| --- | ---: | ---: | --- |
| Average feedback accuracy, MQ-001—MQ-008 | 1.625 / 2 | at least 1.5 / 2 | Pass |
| Average meaning preservation, MQ-001—MQ-008 | 1.5 / 2 | at least 1.5 / 2 | Pass at boundary |
| Average actionability, MQ-001—MQ-008 | 1.375 / 2 | at least 1.0 / 2 | Pass |
| Median answer-stage duration | 2,297 ms | Baseline only | Recorded |
| Slowest answer-stage duration | 14,650 ms | Below 30-second ceiling | Pass |
| Median successful TestClient wall duration | 2,301 ms | Baseline only | Recorded |
| Slowest successful TestClient wall duration | 14,658 ms | Below 30-second ceiling | Pass |
| Expected HTTP outcomes | 14 / 14 | All | Pass |
| Valid runs returning feedback | 13 / 13 | All valid runs | Pass |
| Runs preserving a recoverable session | 14 / 14 | All | Pass |
| Actual LLM calls | 13 | No more than 14 | Pass |
| Case-anchor failures | 4 | Follow-up required | MQ-004, MQ-005, MQ-007, MQ-008 |

The first MQ-001 request was the slowest at 14,650 ms answer-stage time. The remaining answer-stage measurements were between 638 ms and 3,845 ms. This is a local TestClient baseline, not a production latency measurement or a Provider-only latency measurement.

## Per-case results

| Case | Runs | HTTP | Answer-stage ms | Accuracy | Meaning | Actionability | State | Result |
| --- | ---: | --- | ---: | ---: | ---: | ---: | --- | --- |
| MQ-001 | 3 | 200 each | 822—14,650 | 1 | 2 | 2 | Preserved | Partial: both target grammar issues are corrected, but the learner is told to add a reason or example even though both are already present |
| MQ-002 | 3 | 200 each | 670—2,922 | 2 | 2 | 2 | Preserved | Pass: no false correction; one optional, concise spoken-expression refinement |
| MQ-003 | 3 | 200 each | 638—2,663 | 2 | 2 | 1 | Preserved | Pass with limited added value: restrained feedback consistently recognizes the existing contrast rather than over-correcting it |
| MQ-004 | 1 | 200 | 2,638 | 2 | 0 | 1 | Preserved | Fail: identifies the off-topic response, then invents a music preference and benefit in a natural version |
| MQ-005 | 1 | 200 | 2,297 | 2 | 0 | 2 | Preserved | Fail: gives the right concise development action, then invents listening frequency and a reason in a natural version |
| MQ-006 | 1 | 422 | N/A; 4 ms wall | 2 | 2 | 2 | Preserved | Pass: clear retry guidance, no saved invalid answer, no session advance, and no Provider call |
| MQ-007 | 1 | 200 | 2,918 | 0 | 2 | 0 | Preserved | Fail: confidently treats `two` as the learner's spoken grammar error instead of likely STT noise |
| MQ-008 | 1 | 200 | 3,845 | 2 | 2 | 1 | Preserved | Fail: corrections are accurate and facts are retained, but six fixes are mechanically listed instead of prioritizing one high-impact issue |

## Repeatability and level differentiation

| Check | Observed result | Outcome |
| --- | --- | --- |
| MQ-001 identical repeats | The same two corrections, generic development tip, and next question appeared in all three runs | Consistent |
| MQ-002 identical repeats | The same optional expression refinement and next question appeared in all three runs | Consistent |
| MQ-003 identical repeats | The same restrained positive expression note and next question appeared in all three runs | Consistent |
| Contradictory corrections | None across repeated cases | Pass |
| MQ-001 versus MQ-002 | Two grammar corrections for the beginner case versus expression-only refinement for the competent case | Sensible differentiation |
| MQ-002 versus MQ-003 | Optional refinement versus positive recognition of an already effective contrast | Sensible, though MQ-003 adds limited value |
| MQ-001 versus MQ-003 | Corrective beginner feedback versus non-corrective advanced feedback | Pass |
| Comparable score repeats | No numeric or band score was produced | Not applicable |

## Confirmed strengths

- The beginner case receives both intended high-value corrections without a pronunciation claim.
- Competent and advanced answers are not falsely grammar-corrected.
- Repeated inputs produce identical priorities and no contradictory advice.
- The invalid non-language case now stops before model execution, preserves the session, and gives a clear retry path.
- All valid answers, next questions, and sessions remain available.
- The long-answer rewrite preserves the supplied schoolwork, pop-music, energy, and delayed-homework facts.
- All recorded requests remain below the current 30-second client ceiling.

## Confirmed limitations

- MQ-001 receives redundant advice to add a reason or example that already exists.
- MQ-004 correctly detects irrelevance but then supplies a fabricated preference and benefit.
- MQ-005 gives an appropriate development cue but also fabricates frequency and motivation.
- MQ-007 misclassifies a likely transcription homophone as spoken grammar.
- MQ-008 exposes too many corrections at once and does not follow the one-priority cognitive-load boundary.
- MQ-003 is appropriately restrained but its expression note mainly praises existing language rather than offering a concrete improvement.

## Classification

Provider-backed MQ-001—MQ-008 aggregate thresholds: Pass.

Provider-backed MQ-001—MQ-008 case-anchor classification: Conditional pass; targeted content-boundary fixes remain necessary.

The aggregate result must not hide the four failed case anchors. In particular, the meaning-preservation average passes only at the `1.5 / 2` boundary because MQ-004 and MQ-005 invent user content. This subset alone is not sufficient for a V3 release decision and does not supersede separate Part 3, recovery, mobile, speech, or deployment evidence.

## Recommended next work

1. Submit this bounded Provider-backed baseline without changing business code in the evaluation branch.
2. Open one targeted feedback-quality task that prevents natural-version generation for off-topic and one-word answers, beginning with MQ-004 and MQ-005.
3. In a separate task, make noise-like transcript guidance uncertainty-aware so MQ-007 is not scored as a confident spoken error.
4. Enforce the existing one-correction cognitive-load boundary for long answers such as MQ-008.
5. Re-run only the affected cases after deterministic local tests pass; do not repeat all 13 Provider calls unless a full regression baseline is separately authorized.

## Evidence handling

- No real user answer, recording, transcript, or practice history was used.
- No credential, token, endpoint, model name, Provider name, or environment value appears in this document.
- The ignored temporary raw-output file was deleted after scoring.
- No STT, TTS, report, browser, deployment, CloudBase, or Railway action was performed.
