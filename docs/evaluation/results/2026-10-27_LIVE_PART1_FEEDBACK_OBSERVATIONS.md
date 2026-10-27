# Exploratory Live Feedback Observations — Practice Part 1

Date: 2026-10-27
Evaluator: Product owner, anonymized
Evaluation type: Informal exploratory use; not a formal MQ test-set run

## Scope and evidence limits

- Observations were shared as screenshots from live Practice Part 1 use.
- An earlier screenshot showed the experimental adaptive-feedback setting enabled. Its state was not independently visible in every later example.
- Device, browser, deployed commit, provider/model, request timing, and exact prompt response were not captured for these cases.
- The repository does not retain raw model responses or user answers in runtime logs; therefore the precise cause of an omission cannot be established from screenshots alone.
- The records below are anonymized paraphrases. Original answers, screenshots, personal details, and credentials are intentionally not stored here.
- This exploratory set does not count as a formal quality-run result and does not change existing aggregate metrics or tester counts.

## Observations

| ID | Sanitized answer pattern | Observed feedback | Product-quality observation | Confidence |
|---|---|---|---|---|
| LIVE-P1-01 | A comparison of which school period was more memorable, with an awkward past-tense explanation | The next question appeared without feedback | A potentially useful tense/meaning clarification may have been missed | Medium; exact model output is unavailable |
| LIVE-P1-02 | A conditional answer contrasting social activity with time alone | “Better expression” advised linking examples with a conjunction, although the answer already used one; apparent grammar issues were not addressed | The suggestion was redundant and did not prioritize the salient language issue | High for the visible mismatch; root cause unknown |
| LIVE-P1-03 | A short statement about chatting with an AI for advice, with article/word-choice errors | “Quick correction” supplied a corrected phrase; no separate “Better expression” appeared | The correction was actionable. A separate rewrite may have been redundant, but the output format varied from other turns | High for visible output; whether this is a defect remains open |
| LIVE-P1-04 | An answer about wanting to learn swimming, with an unclear pronoun/preposition phrase | No feedback appeared before the Part 1 completion message | A material expression issue may have been missed on the final turn. Code inspection found the Part 1 feedback path runs before the completion transition, so the screenshot does not indicate an intentional final-turn bypass | High for visible omission; exact model/filter outcome unknown |
| LIVE-P1-05 | An answer about spending time with friends, including fishing and travelling, with verb-form/tense inconsistency | “Better expression” advised connecting examples with a conjunction already present in the answer | The tip was redundant and a concrete corrected expression was absent | High for the visible mismatch; root cause unknown |

## Initial synthesis

- Feedback selection varies across turns: no visible feedback, Quick correction only, or Better expression only.
- At least two visible Better expression suggestions did not match the answer and failed to address more salient verb-form or tense issues.
- At least one answer with a material expression issue received no visible feedback, including a final Part 1 answer.
- A Quick correction can already provide a usable local rewrite; adding another section should not duplicate it. The desired distinction between a targeted correction and a complete natural rewrite remains under evaluation.
- Plausible explanations include model judgment, prompt prioritization, and local content guards. The available evidence cannot distinguish them.

## Follow-up questions (no implementation authorized by this record)

1. For clearly material language issues, how often does feedback omit the issue across repeated comparable trials?
2. Does the model provide an unhelpful tip because it treats “one short expression tip” as optional but does not rank candidate issues reliably?
3. Should a complete natural rewrite be required only when it adds value beyond the Quick correction, while abstract/redundant tips are suppressed?
4. What minimum anonymized diagnostic evidence can distinguish model `NONE` from a local filter suppressing a candidate rewrite without storing raw answers or provider output?

No code, prompt, scoring, question bank, deployment configuration, or PR was changed as part of this exploratory record.

## Follow-up implementation for review

The observations above were subsequently used to scope a focused Practice Part 1 change. This section is an implementation record, not a claim that the live model has passed a new evaluation:

- Prompt priority now explicitly checks clear spoken verb form, tense, word choice, preposition and pronoun-reference issues before returning all `NONE`, including on the final Part 1 answer.
- A redundant connector/reason/example suggestion and a generic “make it clearer” tip are suppressed locally. No stand-alone tip is displayed without a safe rewrite.
- A grounded full rewrite is displayed as **Natural version**. **Quick correction** stays separate; these are the only visible feedback labels in focused Practice Part 1. Older Better expression and Natural version messages remain readable and playable.
- Safe aggregate outcome flags distinguish model-provided fields from displayed fields in runtime logs without storing the answer, feedback text or credentials.
- The previously promised persistent playback hint was absent from the merged main commit of PR #37; it is included in this follow-up.

Deterministic checks cover the redundant advice, grounded verb-form rewrite, merged display/playback, legacy playback, final-turn formatting, isolation and privacy. They do **not** prove that a live model will consistently identify every error. No paid provider calls, merge or deployment were part of this follow-up implementation.

## Post-deployment regression observation

After PR #38 was deployed, two further focused Part 1 turns about buildings showed only the next question despite visible spoken-language issues. The deployed version was confirmed by the product owner; this is not attributed to a stale deployment. Raw provider output was unavailable, so the exact model/filter decision for either turn remains unknown.

The follow-up fix targets two deterministic suppression paths: a concrete model tip is no longer dropped merely because there is no full rewrite, and a small grounded grammatical rewrite is no longer discarded for being too similar to the original. The lexical guard now handles simple plural and verb-form variants. Privacy-safe log categories distinguish a model omission from a grounding or display guard without retaining answer or feedback text. Synthetic tests cover these paths and preserve the two visible feedback labels. This does not guarantee that a live model will find every error; real-provider retesting remains necessary.

## Further live regression review

After the next deployment, the owner reported another missing Natural version and a Quick correction that incorrectly claimed the transcript might be inaccurate. The screenshots showed an ordinary pet-related answer and a later answer mentioning animals; the submission source and raw provider output were not available from the screenshots. A separate screenshot showed the adaptive notice without an instruction to tap feedback for audio.

Code inspection identified three concrete paths: the model was not told whether the input was typed or recorded and could freely select `transcript_uncertain`; the local classifier treated a phrase such as “listen two” as transcript uncertainty without an explicit audio-gap marker; and the playback tip was rendered before all messages, where auto-scroll could hide it. A strict rewrite guard could still omit a model rewrite; its exact role in these two live calls cannot be proven without the provider output.

The next fix passes the actual input source into focused Part 1 feedback, reserves transcript uncertainty for explicit markers in recorded input, prevents an overridden uncertainty classification from becoming adaptive learner evidence, and derives a minimal Natural version from a grounded correction when the model's full rewrite is absent or unsafe. The grounded fact guard remains in place. Its initial UI follow-up placed the tap-to-play instruction once at the top of the scrollable conversation. The owner later clarified that in adaptive Practice, this instruction belongs in the existing adaptive notice; that placement correction is pending review in Draft PR #42. These are local code-path fixes, not a claim of completed live model evaluation.

## Website-comparison omission: controlled investigation

The owner subsequently showed a focused Part 1 turn comparing online information search with books. The preceding turn displayed both Quick correction and Natural version, but the comparison answer was followed only by the next question. The owner confirmed that the comparison answer was typed, not transcribed from audio. It was relevant and understandable; its comparative phrasing could merit a concise refinement, but this screenshot alone does not prove that feedback was mandatory or identify which stage omitted it. The screenshot does not reveal the deployed commit, model configuration, raw model fields, or matching backend log entry.

On 2026-10-27, code inspection traced the focused Part 1 path through `backend/engine.py`, `backend/part1_feedback_service.py`, `backend/feedback_service.py`, and the React message renderer. There is no deliberate every-other-turn or final-turn skip. A valid model result can contain `NONE` for all three feedback fields; the prompt explicitly permits that for an already appropriate answer. A non-`NONE` correction, tip, or rewrite can also be removed by the local content and grounding guards. If all visible fields are absent, `build_reply` displays only the next question. In this implementation, a provider exception or missing required labels sets `feedback_available=False` and would add a separate “Feedback is temporarily unavailable” notice; that notice is not visible in this screenshot. This narrows, but does not establish, the explanation because the deployed revision is unverified.

Three bounded paid-provider calls used a sanitized reconstruction of this comparison with `gpt-6-luna`, adaptive mode, an empty support profile, text input, and upgrade enabled. No credentials, full answers, or raw provider responses were printed or retained. In all three trials the model supplied a correction and a rewrite, and the local guards retained both Quick correction and Natural version. This demonstrates that the current local path can show feedback for this input; it does **not** reproduce the missing-feedback outcome or prove production uses the same model, profile, source, prompt, or code revision. The correction quality was not assessed in this metadata-only test. A read-only request to the public runtime diagnostics URL timed out, so it did not confirm the deployed revision.

Next evidence needed: the approximate time of the affected request and its privacy-safe `Part1 feedback outcome` log entry (`answer_kind`, model field-presence flags, `correction_source`, and `rewrite_state`), plus the deployed commit/model. Input source is now confirmed as text, narrowing the investigation away from STT-specific handling. Do not log raw learner answers or model text to obtain this evidence. Until those are correlated, classify this case as **unexplained live omission**, not a confirmed prompt failure or frontend bug. No Prompt, rule, code, cloud configuration, or scoring change is made by this investigation record.

## Subsequent-turn omission and topic-selector behavior

A later screenshot showed Quick correction and Natural version after the first Part 1 answer, but only the next question after the second answer. That second answer contained a past-versus-present tense mismatch and an unnatural phrase about keeping a dog outdoors. The topic selector also remained visible after the first Victoria response. The input source for this later screenshot was not confirmed.

The initial three calls against this second-turn content used adaptive mode but an empty `unknown` support profile. All returned non-empty correction and rewrite fields, and the local guards displayed both sections. This test did not exercise ability-matched support states; the owner correctly pointed out that this omitted the mode most relevant to the live session. The earlier three website-comparison calls had the same limitation.

To address that gap, three additional bounded calls used the same anonymized second-turn content, `gpt-6-luna`, adaptive mode, text input, and upgrade enabled, varying only the support profile state. The provider succeeded in all three. With `guided`, neither correction nor Natural version was shown. With `balanced` and `refinement`, Quick correction was shown, but Natural version was not. Only field-presence booleans were retained; no raw response or answer was logged. This is direct evidence that the ability-matched prompt state can change whether feedback appears. It still does not prove which profile state or exact model result the deployed screenshot used.

The likely prompt weakness is specific: the former `SUPPORT_GUIDANCE["guided"]` told the model to explain a “meaning-blocking basic issue.” A grammatical error can be understandable and still be important IELTS practice feedback, so that wording could permit `NONE` for the kind of error shown. After the owner explicitly approved the change, the guided instruction was revised to prioritize clear grammar errors (including tense, agreement, articles and prepositions) even when meaning remains understandable, while still rejecting invented errors, capitalization, punctuation and minor-style corrections. This addresses the supported prompt-level cause, but does not prove the exact production omission until deployed logs/model state are correlated.

Post-change verification used deterministic mocked model responses across standard mode and all adaptive states (`unknown`, `guided`, `balanced`, `refinement`): a clear grammar error remains visible as Quick correction, while an already natural answer yields no forced feedback in every mode. The full offline repository suite passed. No post-change live-provider matrix was run: doing so would exceed the explicit budget of 14 real LLM calls. Earlier live calls were pre-change and showed a guided-state omission versus a correction in balanced/refinement; they are the experimental evidence that prompted this change, not post-change validation.

UI inspection found the topic control was shown whenever Part 1 and topic options were available, independent of answer progress. The selector now hides once the session contains its first Part 1 candidate answer; it remains available during identity/introduction and before the first Part 1 answer. This implements the owner's requested interaction. Frontend smoke tests cover both the pre-answer visible state and post-answer hidden state. No question-generation, feedback prompt, or scoring logic was changed for this UI adjustment.
