# Examiner Victoria V3 Minimal Quality Test Set

Companion record template: [V3 Minimal Quality Run Template](V3_MINIMAL_QUALITY_RUN_TEMPLATE.md)

## 1. Purpose

This document defines the first minimum evaluation set for Examiner Victoria V3 Beta. It turns ER-001 and ER-002 into a repeatable internal check covering:

- response speed;
- feedback accuracy;
- meaning preservation;
- actionability;
- user-level differentiation;
- scoring consistency;
- flow continuity and failure recovery.

The set is intentionally small. It is a baseline for targeted validation, not a claim that the product is better than general AI or mature IELTS products.

## 2. Evidence boundary

- All candidate answers in this document are synthetic evaluation inputs.
- They are not real user answers, transcripts, or tester evidence.
- Running this set does not add a tester and does not change the anonymized tester count.
- Results are internal product-quality evidence, not market validation or formal IELTS scoring validation.
- Do not store recordings, credentials, full environment variables, or provider request payloads in result records.
- Do not infer pronunciation quality from text-only inputs.

## 3. Current product contract used by the set

- Evaluation branch base: `main`.
- Primary language-quality surface: Practice Mode.
- Controlled Part 1 question: `Do you like music?`
- Question source: `backend/question_bank/pdf_recall.py`; non-official recall-derived content used only as a stable internal task.
- `/api/answer` exposes `llm_duration_ms` and `total_duration_ms`; the current route populates both from the same answer-stage elapsed time, so neither is an isolated Provider-only measurement.
- `/api/transcribe` exposes `stt_duration_ms` or `elapsed_ms`.
- TTS duration is recorded by client telemetry as `tts_duration_ms`.
- Current client ceilings are 30 seconds for normal API requests, 90 seconds for STT, and 12 seconds for TTS. These are timeout ceilings, not quality targets.
- TTS failure must preserve written feedback and the next question.

## 4. Run protocol

1. Record commit SHA, app version, deployment target, device, browser, network, input source, and sound setting.
2. Use a fresh Practice session for every language-quality case.
3. Use text input for MQ-001 through MQ-008 so STT does not confound language-feedback evaluation.
4. Run MQ-001, MQ-002, and MQ-003 three times each in fresh sessions to observe repeatability.
5. Run MQ-009 and MQ-010 in Part 3 using the question recorded in the case result.
6. Simulate MQ-011 through MQ-014 locally with mocks or deterministic failure injection. Do not create a production outage.
7. Record the exact product output only in a local/private working copy when it contains a synthetic answer. Do not paste real user content into the repository.
8. Do not call a paid Provider merely to validate this document. Provider-backed execution requires a separately authorized run.

## 5. Rating rubric

Use `0`, `1`, or `2` for the three content-quality dimensions.

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| Feedback accuracy | Incorrect, misleading, or misses the main issue | Partly correct but incomplete or focuses on a minor issue | Correctly identifies the most important spoken-language or relevance issue |
| Meaning preservation | Invents facts or materially changes intent | Mostly preserves intent with a small unsupported addition | Preserves all stated facts and intent |
| Actionability | Generic advice with no usable next step | Gives a usable correction or example | Explains the issue and provides a clear correction/example or next action |

Additional checks are pass/fail:

- no fabricated personal facts;
- no pronunciation score from text;
- no irrelevant correction of capitalization, punctuation, spelling, or obvious STT noise;
- next question and session state are preserved;
- no duplicate or over-personal Part 3 follow-up;
- correct text-first degradation when voice or a Provider fails.

## 6. Minimum cases

| ID | Area | Input class | Main expected signal |
|---|---|---|---|
| MQ-001 | Feedback | Beginner | Finds the main grammar issues without overwhelming the learner |
| MQ-002 | Feedback | Intermediate | Gives useful refinement without treating a competent answer as poor |
| MQ-003 | Feedback | Advanced | Avoids unnecessary correction and preserves nuance |
| MQ-004 | Relevance | Off-topic | Identifies that the answer does not address the question |
| MQ-005 | Development | Too short | Gives a concise next action instead of inventing content |
| MQ-006 | Invalid input | Non-language | Does not fabricate feedback; keeps the flow recoverable |
| MQ-007 | STT robustness | Noise-like transcript | Does not correct an obvious transcript homophone as spoken grammar |
| MQ-008 | Cognitive load | Long answer with several issues | Prioritizes the most important issue rather than listing everything |
| MQ-009 | Part 3 | Meaningful answer | Produces at most one relevant dynamic follow-up, then returns to bank/fallback |
| MQ-010 | Part 3 | Short answer | Uses bank/fallback instead of forcing a dynamic follow-up |
| MQ-011 | Recovery | STT failure | No fabricated transcript; retry remains available; session is preserved |
| MQ-012 | Recovery | Feedback/LLM failure | Written answer, session, and next question remain available |
| MQ-013 | Recovery | TTS timeout/failure | Text remains visible and the dedicated voice-unavailable message is shown |
| MQ-014 | Recovery | Report-model failure | Rule-based fallback report is returned from saved session evidence |

## 7. Detailed language-quality inputs

All MQ-001 through MQ-008 cases use:

> Do you like music?

### MQ-001 | Beginner

Synthetic answer:

> Yes, I like music because it make me relax. I listen music every day after school.

Expected evaluation anchors:

- prioritize subject-verb agreement and `listen to music`;
- keep the correction short;
- preserve the stated daily-after-school habit;
- do not infer pronunciation ability.

### MQ-002 | Intermediate

Synthetic answer:

> Yes, I listen to music almost every day, especially when I am travelling to school. It helps me relax, although I do not usually pay much attention to the singer.

Expected evaluation anchors:

- no false grammar correction;
- an expression improvement is optional, not mandatory;
- any natural version must preserve the commute and listening preference;
- the result should be materially more restrained than MQ-001 feedback.

### MQ-003 | Advanced

Synthetic answer:

> Definitely. Music is part of my daily routine, but I use it quite deliberately. Instrumental tracks help me concentrate when I am studying, whereas upbeat songs are more useful when I need a change of mood.

Expected evaluation anchors:

- return no correction or only a genuinely useful minor refinement;
- do not simplify the contrast or invent a personal story;
- do not treat sophistication itself as an error;
- feedback should be less corrective than MQ-001 and MQ-002.

### MQ-004 | Off-topic

Synthetic answer:

> My hometown is a small coastal city. The weather is warm and there are several parks near my home.

Expected evaluation anchors:

- identify that the answer does not address music;
- do not reward grammatical accuracy as if the answer were relevant;
- invite a direct answer without inventing a preference.

### MQ-005 | Too short

Synthetic answer:

> Yes.

Expected evaluation anchors:

- ask for one reason, example, or type of music;
- avoid a long correction block;
- preserve the session and next action.

### MQ-006 | Invalid non-language input

Synthetic answer:

> ... 123 ...

Expected evaluation anchors:

- do not fabricate a transcript, correction, experience, or score;
- provide a safe retry or clarification path;
- do not crash or discard the session.

### MQ-007 | Noise-like STT transcript

Synthetic answer:

> Yes, I like music because it helps me relax. I listen two music every day.

Expected evaluation anchors:

- treat `two` as likely STT noise rather than confidently scoring it as spoken grammar;
- do not correct capitalization or punctuation;
- retain the useful content of the answer.

### MQ-008 | Long answer with several issues

Synthetic answer:

> Yes, I enjoy music very much because it make my mood more better, and when I was tired after my classes I usually listening to pop songs. Music also give me energy, and there are many kind of music I want to try, but sometimes I spend too much times choosing songs, so I cannot start my homework quickly.

Expected evaluation anchors:

- select the highest-impact spoken-language issues;
- do not mechanically list every error;
- provide no more than one concise correction, one expression tip, and one meaning-preserving natural version;
- preserve schoolwork, pop music, energy, and delayed homework as the stated facts.

## 8. Part 3 flow cases

### MQ-009 | Meaningful answer-driven follow-up

Use a current Part 3 bank question and record it in the run sheet.

Synthetic answer:

> I think public spaces are important because they allow people from different backgrounds to meet without having to spend money. For example, a well-designed park can be used by children, older residents, and office workers at different times of day.

Expected evaluation anchors:

- a dynamic follow-up, if generated, connects to free access, mixed users, or park design;
- it remains analytical rather than asking for private personal details;
- it is not a duplicate of the current or previous question;
- no two dynamic follow-ups occur consecutively.

### MQ-010 | Short-answer fallback

Use the same Part 3 question as MQ-009.

Synthetic answer:

> Maybe. I am not sure.

Expected evaluation anchors:

- do not force an answer-specific dynamic follow-up;
- continue with a bank or fallback question;
- preserve a stable Part 3 flow.

## 9. Failure-recovery cases

| ID | Simulated condition | Required result |
|---|---|---|
| MQ-011 | STT returns an error or times out | No answer is submitted from missing text; recording can be retried; existing session remains intact |
| MQ-012 | Feedback or next-question model call fails | No crash; saved answer and session remain; deterministic next-question/fallback behavior is recorded |
| MQ-013 | `/api/tts` times out or fails | Feedback and next question stay visible; `Voice is temporarily unavailable. Continue with the text shown above.` appears; no server-waking message |
| MQ-014 | Report model call fails | A rule-based fallback report contains overall estimate boundary, skill breakdown, corrected-example boundary, next tasks, and session learning summary |

## 10. Repeatability and score checks

- Run MQ-001, MQ-002, and MQ-003 three times each with identical inputs and fresh sessions.
- Mark results inconsistent if identical inputs receive contradictory corrections or materially different improvement priorities.
- If comparable numeric or half-band estimates are produced from identical completed session evidence, record the range. A spread above `0.5` band is a provisional instability signal, not proof that any individual score is correct.
- Confirm that advanced input is not evaluated as weaker than beginner input without a documented evidence reason.
- Do not treat this set as validation of official IELTS band accuracy. Human or trusted reference scoring is still required for that claim.

## 11. First-round decision rule

The first round passes only when:

1. all critical safety and product-boundary checks pass;
2. average feedback accuracy across MQ-001 through MQ-008 is at least `1.5 / 2`;
3. average meaning preservation is at least `1.5 / 2`;
4. average actionability is at least `1.0 / 2`;
5. MQ-001, MQ-002, and MQ-003 show sensible level differentiation without contradictory feedback;
6. MQ-009 and MQ-010 follow the Part 3 dynamic/fallback rules;
7. MQ-011 through MQ-014 preserve recoverable text/session state;
8. no request exceeds the current client timeout ceiling during the recorded run.

For response speed, record every duration and calculate median and slowest values. V0.1 does not invent a stricter SLA before baseline measurements exist.
