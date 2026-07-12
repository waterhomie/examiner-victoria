# V2 API contract

Base URL in local fullstack preview:

```text
http://127.0.0.1:5174
```

The React frontend and the FastAPI `/api` routes are served from the same
local port by `v2/scripts/run_local_stack.ps1`.

Production backend environment variables that affect this contract:

```text
CORS_ORIGINS=https://your-frontend-domain.com
MAX_AUDIO_UPLOAD_MB=12
RATE_LIMIT_PER_MINUTE=120
MAX_ANSWER_CHARS=4000
MAX_SESSION_MESSAGES=120
MAX_TTS_CHARS=1200
ADMIN_TOKEN=replace-with-a-long-random-token
TELEMETRY_MAX_EVENTS=500
```

## GET /api/health

Checks backend availability.

Response:

```json
{
  "status": "ok",
  "app": "examiner-victoria-v2"
}
```

This public health endpoint intentionally does not return provider settings,
model names, CORS origins, runtime limits, environment variables, or secrets.
Use `GET /api/diagnostics/runtime` for detailed non-sensitive runtime checks.

## GET /api/question-bank

Returns the question-bank counts currently loaded by the backend. This is a
small sanity-check endpoint for deployment and debugging.

Response:

```json
{
  "part1_topics": 32,
  "part1_secondary_topics": 30,
  "part1_total_questions": 152,
  "part1_secondary_questions": 139,
  "part1_identity_followup_questions": 13,
  "part2_base_cards": 3,
  "part2_extra_cards": 70,
  "part2_total_cards": 73,
  "part2_expected_cards": 73,
  "part3_reference_questions": 383
}
```

## GET /api/practice-options

Returns selectable Part 1 topics and Part 2/3 cue-card titles for focused practice.

Response:

```json
{
  "part1_topics": ["work or studies", "..."],
  "cue_cards": [
    { "title": "an interesting building" }
  ]
}
```

## POST /api/sessions

Starts a new IELTS speaking session.

Request:

```json
{
  "practice_mode": true,
  "practice_type": "full",
  "part1_topic": null,
  "cue_card_title": null,
  "answer_expansion_mode": true,
  "voice_playback_enabled": true
}
```

`practice_type` can be `full`, `part1`, `part2`, or `part3`.
`part1_topic` and `cue_card_title` are optional; omit or set to `null` for random selection.

Response:

```json
{
  "session": {
    "session_id": "...",
    "phase": "identity",
    "messages": [
      {
        "role": "assistant",
        "content": "**Part 1 - Introduction and Interview**...",
        "phase": "identity"
      }
    ],
    "current_question": "...",
    "test_active": true
  }
}
```

The real session object contains additional fields for Part 1, Part 2, Part 3,
answer stats, and candidate answer logs. The frontend should keep and resend the
whole session object. Part 3 also includes optional source-tracking fields such
as `part3_question_sources` (`bank`, `dynamic`, or `fallback`) and
`part3_consecutive_dynamic`; clients should preserve these fields but do not need
to display them.

## POST /api/answer

Submits one typed or transcribed answer.
If one answer exceeds `MAX_ANSWER_CHARS` or the returned session exceeds
`MAX_SESSION_MESSAGES`, the backend returns `413` with a short user-safe message.

Request:

```json
{
  "session": { "...": "full current session object" },
  "answer": "I'm a student.",
  "source": "text",
  "duration": null
}
```

For recorded answers:

```json
{
  "session": { "...": "full current session object" },
  "answer": "I'm a student.",
  "source": "audio",
  "duration": 4.2
}
```

Response:

```json
{
  "session": { "...": "updated session object" },
  "assistant_message": {
    "role": "assistant",
    "content": "What do you study?",
    "phase": "part1"
  },
  "spoken_text": "What do you study?",
  "start_prep_timer": false
}
```

## POST /api/transcribe

Transcribes one audio file. The current frontend sends compact 16kHz mono WAV.

Request:

```text
multipart/form-data
file=answer.wav
```

Response:

```json
{
  "text": "I'm a student."
}
```

If the uploaded audio is empty or too short, the backend returns `400` with a
short retry prompt. If the uploaded audio is larger than `MAX_AUDIO_UPLOAD_MB`,
the backend returns `413` with a short user-safe error message.
If the transcription provider fails, the backend returns `502` with a short
user-safe message and does not expose provider/internal error details.

## POST /api/tts

Generates speech audio for a short assistant prompt.
If the requested speech text exceeds `MAX_TTS_CHARS`, the backend returns
`413` before calling the voice provider.

Request:

```json
{
  "text": "What do you study?"
}
```

Response:

```text
audio/mpeg
```

If voice generation fails, the backend returns `502` with a short user-safe
message and does not expose provider/internal error details.

## POST /api/report

Generates a final IELTS report from the session's raw candidate answers.

Request:

```json
{
  "session": { "...": "full current session object" }
}
```

Response:

```json
{
  "report": "Estimated overall band..."
}
```

## POST /api/telemetry

Accepts anonymous frontend performance metadata. The backend redacts sensitive
detail keys such as `answer`, `text`, `transcript`, `token`, and `api_key`.

Request:

```json
{
  "event": "transcription",
  "details": {
    "durationMs": 1200,
    "source": "server"
  }
}
```

Response:

```text
204 No Content
```

## GET /api/telemetry/summary

Returns aggregate telemetry counts and timing summaries. This endpoint is for
admin debugging only and requires `ADMIN_TOKEN`.

Allowed authentication forms:

```text
X-Admin-Token: your-admin-token
```

or, for quick browser inspection:

```text
/api/telemetry/summary?token=your-admin-token
```

Without a valid token, the backend returns `403`. If `ADMIN_TOKEN` is not
configured at all, the backend returns `503` so the summary cannot accidentally
be exposed.

## Stateless session rule

The backend does not currently store sessions in a database. The frontend must:

1. Keep the latest `session` object.
2. Send the full object with every `/api/answer` and `/api/report` request.
3. Replace local session state with the response session.

This keeps V2 easy to deploy while the product is still changing quickly.
