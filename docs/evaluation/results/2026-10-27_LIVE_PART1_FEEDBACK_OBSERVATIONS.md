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
