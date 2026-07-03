# Examiner Victoria V2 Backend Architecture

The backend is a FastAPI app with a small set of service modules. The goal is
to keep the exam engine readable and avoid mixing API routing, model-provider
details, question-bank data, audio services, and report generation in one file.

## Module map

```text
v2/backend/
  app.py
    FastAPI routes, request limits, rate limiting, upload validation, static
    frontend serving, and API error boundaries.

  schemas.py
    Pydantic request, response, message, answer-stat, and session models.

  engine.py
    Answer processing coordinator: answer logging, coaching reply assembly,
    current-question updates, and public re-exports used by the API layer.

  exam_flow_service.py
    IELTS flow control: session start, identity, Part 1, Part 2, Part 3,
    clarification handling, and phase transitions.

  ai_provider.py
    Local env loading, API key/base URL/model configuration, OpenAI-compatible
    client creation, and chat model calls.

  audio_services.py
    Audio transcription, TTS generation, TTS text cleanup, and in-memory TTS
    cache.

  feedback_service.py
    Spoken-answer correction, expression tips, natural-answer upgrade logic,
    and reply assembly.

  part3_service.py
    Part 3 dynamic follow-up generation, fallback questions, Part 3 question
    count rules, and single-question extraction from model output.

  question_bank_service.py
    Part 1 topic selection, Part 2 cue-card selection, question-bank counts,
    practice-option lists, and app-level fallback cue cards.

  report_service.py
    Final report generation, rule-based fallback report, learning summary,
    and raw answer-log formatting.

  smoke_test.py
    Local safety checks for the main API routes and core session flow.
```

## Where to change common backend behavior

- API limits, route errors, static frontend serving: `app.py`.
- Session fields or API payload shape: `schemas.py`.
- IELTS flow, phase transitions, or Part 3 turn count: `exam_flow_service.py`.
- Answer logging, current-question updates, or reply assembly: `engine.py`.
- Part 3 dynamic follow-up prompts or fallback behavior: `part3_service.py`.
- Model name, base URL, API key loading, provider client: `ai_provider.py`.
- Audio transcription or Victoria voice playback: `audio_services.py`.
- Spoken correction or natural-answer upgrade rules: `feedback_service.py`.
- Cue cards, Part 1 topic choices, question-bank counts: `question_bank_service.py`.
- Final report format or scoring-summary fallback: `report_service.py`.
- Smoke-test scenarios: `smoke_test.py`.

## Refactor-plan vocabulary

The user-facing refactor plan uses product-layer names. The current code uses
slightly more explicit service filenames. Treat them as the same boundaries:

```text
exam_flow          -> exam_flow_service.py
question_selector  -> question_bank_service.py + part3_service.py
feedback           -> feedback_service.py
scoring            -> report_service.py
speech             -> audio_services.py
provider           -> ai_provider.py
api_shell          -> app.py
schema_contract    -> schemas.py
answer_pipeline    -> engine.py
```

This means most future product changes should land in one service module rather
than in the API shell. For example:

- "Part 3 asks too many / too few questions" belongs in `part3_service.py`
  first, then `exam_flow_service.py` only if the phase transition itself must
  change.
- "Correction style is too harsh / too verbose" belongs in
  `feedback_service.py`.
- "Final report format is not useful" belongs in `report_service.py`.
- "Audio upload fails or TTS is slow" belongs in `audio_services.py` and only
  touches `app.py` if request validation or API response shape changes.

## Refactor direction

The next safe backend splits are:

1. Rename service files to the shorter plan names only if the current names
   become confusing in day-to-day development. Do not rename them just for
   aesthetics; import churn creates avoidable risk.
2. If `exam_flow_service.py` grows again, split Part 1, Part 2, and Part 3
   handlers into focused files only after adding narrower flow tests.

Do these one at a time and run `smoke_test.py` after each step.
