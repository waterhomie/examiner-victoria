# Session-scoped Part 1 feedback MVP: implementation and review

Date: 2026-10-17. Scope: focused Practice Part 1 only. Experiment default: **off**.

## Baseline and F-015 compatibility

Implementation starts from main `4941354b834158fe029ec4bc495adef8ba7d6dff`, which merged PR [#35](https://github.com/waterhomie/examiner-victoria/pull/35), including audio-unlock fix `551bb1e`.
The three display labels remain Quick correction, Better expression and A natural version of your answer. F-015 text extraction, manual sound-off playback and cancellation are retained. Internal observations never enter message content, exports or `spoken_text`. Automatic speech remains the next question only.

The handoff was reviewed against current code rather than the older status-document date. Prompt and related session-schema changes in focused Part 1 were explicitly authorized by the owner. This document makes them reviewable; it does not record human approval of the final PR.

## Files and responsibilities

| Files | Change |
| --- | --- |
| `backend/part1_feedback_service.py` | One feedback call, bounded prompt, content guards, optional internal observation; legacy three-field fallback |
| `backend/learner_support_service.py` | Pure scope gate, bounded evidence window, conservative state transitions, merge guard, system-rewrite exclusion |
| `backend/schemas.py` | Backward-compatible settings/profile defaults and bounded enums, observations, fingerprints and counters |
| `backend/engine.py` | Use pre-answer guidance, then merge the observation once; preserve question flow and next-question speech |
| `backend/exam_flow_service.py`, `backend/routes/sessions.py` | Initialize configuration; force standard for other modes/types |
| `frontend/src/state/{actions,appReducer,initialState}.js` | Toggle without replacing the session; preserve the profile through existing snapshot persistence |
| `frontend/src/hooks/useExamController.js`, `frontend/src/App.jsx` | Wire settings into session creation and the header |
| `frontend/src/components/layout/{ExamHeader,ChatPanel}.jsx`, `frontend/src/styles/header.css` | More-menu experiment checkbox on desktop/mobile, one explanation attached to the first applicable feedback |
| `backend/adaptive_feedback_test.py`, `backend/smoke_test.py` | Content, state, API, isolation, call-budget and privacy regression |
| `frontend/{adaptive_feedback_test,adaptive_render_test,smoke_test}.js` | Toggle, restore, export, rendered-control and F-015 regression |

`feedback_service.py`, `report_service.py`, question-bank data, provider configuration and Mock rules are unchanged. The existing `coach_spoken_answer` four-tuple contract remains intact. A separate internal result type is used only by the new focused Part 1 path.

## Prompt and core-rule review

Both standard and adaptive focused Part 1 receive the boundary fixes. Only adaptive requests ask for support observations or use session guidance. Other flows retain the old prompt.

- System instructions own policy; current question/answer are untrusted user JSON. Attempts to set a support state are answer material, not commands.
- One principal correction uses one original phrase and replacement when valid anchors are returned. Each feedback field is short; correction lists are reduced to one focus. At most one distinct expression tip is displayed. Generic praise and a redundant request for an already supplied reason/example are removed.
- Off-topic, one-word, clarification, instruction and uncertain-transcript answers cannot produce evidence or a natural version. Local checks cover the known `listen two` case; wider uncertainty/relevance recognition still depends on the model.
- Rewrites require relevant classification, explicit grounded output, preserved quantities/qualifiers and a conservative lexical/morphological guard. This intentionally suppresses some useful paraphrases. It is a backstop, not a semantic verifier. A paid evaluation must check fabricated facts in every state, including mistakes that could pass lexical checks.
- All-NONE is valid. Malformed feedback falls back to the existing unavailable message; valid ordinary fields with invalid observation metadata can still display. Missing/invalid observation enums or unanchored evidence never change guidance.
- Current explicit difficulties take priority over history. Guidance cannot alter scoring, question difficulty, counts or the exam structure. No new question, forced retry, translation, pronunciation assessment or model provider is introduced.

## Guidance contract

States: unknown, guided, balanced, refinement. They describe support depth, not IELTS bands.

Thresholds are centralized in `learner_support_service.py`; the window bound is shared with the schema. Fewer than three valid observations keep unknown. Thereafter a strict majority of the latest five can establish a provisional state. A different majority must persist across two valid updates before switching. A tie clears a pending switch; a different target starts a new pending sequence. Invalid observations do not vote or advance the pending sequence.

The current answer is coached with the previous state, then merged. Three valid observations can therefore first affect question four. The existing four-question maximum is unchanged.

Profiles store bounded categorical observations, answer indices and fingerprints, never another copy of the original text. The prompt includes only the current bounded answer plus up to five minimal category summaries. No WPM, duration or source is passed as ability evidence. Oversized answers are clipped for the model and excluded from profile/rewrite evidence.

The More checkbox changes only future feedback. Turning it off preserves the session profile without accumulating new observations. Refresh preserves it via the existing local snapshot; new sessions/topic/type changes create a fresh profile. A UI explanation appears once in the conversation, next to the first successful adaptive feedback, and is not speech or an internal state label.

Merge guards reject a repeated answer index, a recent question/answer fingerprint and a previously submitted identical question/answer in the same session. They prevent double accumulation inside a returned session. This client-held architecture does not provide global HTTP idempotency across independently replayed/forked snapshots, and the profile is not a trusted certification or permission source.

## Offline evaluation cases and results

All model responses are deterministic synthetic fixtures. These checks validate policy plumbing and guards; they do **not** prove a live model will classify relevance/support correctly or improve learning outcomes.

| Cases | Required result | Local result |
| --- | --- | --- |
| MQ-001 | Do not ask again for an existing reason/example; anchor one correction | Passed |
| MQ-003 | Accept NONE; remove praise-only tips; no mandatory refinement rewrite | Passed |
| MQ-004 / MQ-005 | Suppress invented natural versions for off-topic/one-word input in every state | Passed with deterministic classification and local one-word guard |
| MQ-006 | Invalid non-language answer returns 422 before model use | Passed |
| MQ-007 | Known transcript homophone gets uncertainty guidance, no confident correction or observation | Passed |
| MQ-008 | One anchored main correction, not a six-fix list | Passed |
| Crossed evidence | Short accurate; complex off-topic; topic uncertainty with accurate expression; content-rich basic errors | Passed with synthetic observation fixtures |
| Sequences | Stable guided/refinement; mixed; sustained change; invalid interruptions; failure recovery | Passed |
| Hysteresis/duplicates | Strict majority, tie reset, pending confirmation, duplicate merge/index/fingerprint | Passed |
| Failures/format | Unknown enum, missing fields, broken output, exception, old three-field response | Passed |
| Compatibility | Old session/API defaults, schema bounds, refresh, off/on, fresh session | Passed |
| Isolation | Crafted Mock/Full/Part 2/3 adaptive config; unchanged fallback report and legacy tuple | Passed |
| Privacy/F-015 | No metadata in feedback/export/automatic speech; Natural version remains manually playable | Passed |
| UI | Rendered checkbox only for focused Practice Part 1, disabled during recording; explanation once | Passed (server render, not a browser/device visual test) |

Backend regression: 14 test groups, including parameterized content/state cases. Frontend regression includes state/storage tests, real component server rendering and existing delayed-audio tests. Full project check covers Python compilation, question-bank validation, backend smoke, deployment configuration, frontend smoke and production build. No real LLM/STT/TTS calls, cloud changes, merge or deployment were made.

## Performance evidence and pending provider review

Additional model calls: **zero**. Each standard/adaptive feedback path makes exactly one existing `operation=feedback` call. No startup classification call is added.

For the same synthetic question/answer, input characters across actual message contents were: legacy 1,048; new standard 2,591; adaptive with five observations 3,010. These are character counts, not tokens. The larger instruction budget is a cost/latency risk requiring measurement; a constant call count does not establish constant latency. Safe production logs add only adaptation setting and aggregate input/output character counts alongside the existing feedback/answer timing logs; no raw model output or learner text is logged.

Live input/output token usage, feedback and end-to-end latency, factuality and usefulness remain **unmeasured** in this task. Mock wall time and synthetic output length do not establish model performance, so no speed or quality gain is claimed. A separately budgeted provider run should compare the same MQ-001—MQ-008 inputs and six multi-turn sequences, record input/output usage and feedback/end-to-end duration, and manually score accuracy/meaning preservation/actionability by case. Fabricated facts, acoustic attribution, Mock regression or session corruption block acceptance regardless of averages.

After provider review, targeted invited-user comparison may assess comprehension, correction burden, mistaken adaptation and next-answer use. Human review of prompt/core rules, paid evaluation, real browser/iPhone/WeChat acceptance, merge and deployment remain separate steps. Rollback is to disable the experimental switch; do not expand beyond focused Part 1 on this evidence.
