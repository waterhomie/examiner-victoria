# Examiner Victoria Backend Architecture

The backend is a FastAPI app with a small set of service modules. The goal is
to keep the exam engine readable and avoid mixing API routing, model-provider
details, question-bank data, audio services, and report generation in one file.

## Module map

```text
backend/
  app.py
    FastAPI app factory, CORS middleware, route mounting, static frontend
    serving, and the container-compatible `backend.app:app` entrypoint.

  core/
    config.py
      Central environment parsing for API provider settings, CORS, limits,
      telemetry capacity, and admin-token status.

    rate_limit.py
      Request rate limiting shared by API routes.

    payload_limits.py
      Shared answer/session payload limit validation.

  routes/
    health.py
      `/api/health`, `/api/question-bank`, and `/api/practice-options`.

    sessions.py
      `/api/sessions` session start route.

    answer.py
      `/api/answer` answer-processing route.

    audio.py
      `/api/transcribe` and `/api/tts`, including upload validation and safe
      provider error boundaries.

    report.py
      `/api/report` final-report route.

    telemetry.py
      `/api/telemetry` anonymous event intake and protected
      `/api/telemetry/summary`.

  schemas.py
    Pydantic request, response, message, answer-stat, and session models.

  engine.py
    Answer processing coordinator: answer logging, coaching reply assembly,
    current-question updates, and public re-exports used by the API layer.

  exam_flow_service.py
    IELTS flow control: session start, identity, Part 1, Part 2, Part 3,
    clarification handling, and phase transitions.

  ai_provider.py
    OpenAI-compatible client creation and chat model calls. Environment
    parsing lives in `core/config.py`.

  audio_services.py
    Audio transcription, TTS generation, TTS text cleanup, and in-memory TTS
    cache.

  feedback_service.py
    Spoken-answer correction, expression tips, natural-answer upgrade logic,
    and reply assembly.

  answer_feedback_service.py
    V4 structured answer feedback for the coach UI. Deterministic, no model
    calls: word diff (answer vs natural version), filler/repeat hesitations,
    pace label, and the parsed correction quote. Practice only; Mock and the
    identity phase return `coaching=false`. Tested by `answer_feedback_test.py`.

  part3_service.py
    Part 3 dynamic follow-up generation, fallback questions, Part 3 question
    count rules, and single-question extraction from model output.

  question_bank/
    __init__.py
      Explicit stable exports for the backend question-bank package.

    catalog.py
      Curated app cue cards and the combined current question-bank catalog.

    pdf_recall.py
      Candidate-recall Part 1, Part 2, and Part 3 source data.

  question_bank_service.py
    Part 1 topic selection, Part 2 cue-card selection, question-bank counts,
    practice-option lists, and app-level fallback cue cards. It imports the
    backend package directly and does not modify `sys.path`.

  report_service.py
    Final report generation, rule-based fallback report, learning summary,
    and raw answer-log formatting.

  telemetry_service.py
    Lightweight in-memory performance telemetry for transcription, answer,
    TTS, and frontend-error events. It stores timing metadata, not answer text.

  smoke_test.py
    Local safety checks for the main API routes and core session flow.
```

## Where to change common backend behavior

- App factory, route mounting, and static frontend serving: `app.py`.
- Environment variables and runtime limits: `core/config.py`.
- Rate limiting: `core/rate_limit.py`.
- Payload size/session size rules: `core/payload_limits.py`.
- API route request/response boundaries: `routes/`.
- Session fields or API payload shape: `schemas.py`.
- IELTS flow, phase transitions, or Part 3 turn count: `exam_flow_service.py`.
- Answer logging, current-question updates, or reply assembly: `engine.py`.
- Part 3 bank/dynamic/fallback rules, source tracking, and prompt behavior: `part3_service.py`.
- Model name, base URL, API key loading, provider client: `ai_provider.py`.
- Audio transcription or Victoria voice playback: `audio_services.py`.
- Spoken correction or natural-answer upgrade rules: `feedback_service.py`.
- Structured `feedback` object on `/api/answer` (edits, hesitations, pace):
  `answer_feedback_service.py`; `engine.process_answer_detailed` assembles it.
- Question-bank source data and exports: `question_bank/`; selection, app fallback cards, and counts: `question_bank_service.py`.
- Final report format or scoring-summary fallback: `report_service.py`.
- Mobile performance monitoring or telemetry summaries: `telemetry_service.py`
  plus the `/api/telemetry` routes in `routes/telemetry.py`.
- Smoke-test scenarios: `smoke_test.py`.

## Guardrails

- Business service modules should not import FastAPI. Keep FastAPI request,
  header, status-code, and response concerns inside `routes/` or `core/`.
- `app.py` should stay small. New API endpoints belong in `routes/`, then get
  mounted from `create_app()`.
- New environment variables should be parsed in `core/config.py` and mirrored
  in `backend/.env.example`, `deploy/vps/.env.example`, and deployment
  templates where relevant.
- `/api/telemetry` may accept anonymous performance metadata, but
  `/api/telemetry/summary` must stay protected by `ADMIN_TOKEN`.

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

## Structure refactor completion

The planned version-neutral repository migration is complete:

- runtime source uses top-level `frontend/` and `backend/`;
- operational tooling uses top-level `scripts/`;
- current operating documentation uses `docs/`;
- question-bank data uses `backend/question_bank/` with explicit package exports;
- root `validate_question_bank.py` remains the stable project-level verification command;
- `v2/` contains frozen historical evidence only.

No further structural refactor is currently planned. Future work should be driven by user feedback, product value, reliability, and portfolio evidence rather than directory aesthetics.
