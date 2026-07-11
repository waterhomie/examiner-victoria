# Examiner Victoria V2

Examiner Victoria V2 is a React + FastAPI IELTS speaking coach that runs as a
single web service: FastAPI serves the React app and the `/api` routes.

## Current Status

V2 is the current production version and the only main development version.
It is deployed on Railway from this repository root. The V1 Streamlit app is a
frozen historical prototype kept only for reference and emergency comparison.

This project was product-led and implemented with AI coding agents. The work
focuses on user-flow design, prompt and interaction rules, structured question
data, testing, deployment, and the delivery of a working AI product prototype.

## Online Links

- Production app: https://examiner-victoria-v2-production.up.railway.app
- Health check: https://examiner-victoria-v2-production.up.railway.app/api/health
- GitHub repository: https://github.com/waterhomie/examiner-victoria-v2

## V1 to V2

- V1: Python + Streamlit prototype. Frozen. No new features.
- V2: React frontend + FastAPI backend. Current production version.

New product work belongs in V2. V1 should not be changed unless a documented
historical-reference or security reason requires it.

## Tech Stack

- Frontend: React 19, Vite, pnpm
- Backend: FastAPI, Pydantic, OpenAI-compatible provider client
- Speech: browser recording, server transcription fallback, gTTS-based TTS
- Deployment: Dockerfile-based Railway single service
- Tests: question-bank validation, backend smoke test, frontend smoke test,
  production build, deployment config check

## Core Features

- IELTS Speaking Part 1, Part 2, Part 3, Full, Practice, and Mock flows
- Practice Mode keeps the full chat, transcript, immediate correction, expression coaching, and natural-answer upgrade.
- Mock Mode is voice-first: it hides the main chat stream and real-time transcript during the test, keeps Part 2 Cue Card support, and reserves feedback for the final report.
- Part 3 uses a question-bank backbone with answer-driven follow-up and question-bank fallback, without a fixed dynamic-question ratio.
- Mobile-first chat interface with fixed composer
- Text answers and tap-to-record voice answers
- Transcription and AI feedback
- Victoria voice playback with mobile autoplay fallbacks
- Practice feedback, reports, transcript export, and practice record export
- In-memory telemetry summary for performance debugging without storing answer text

## Repository Structure

```text
.
|-- AGENTS.md
|-- README.md
|-- Dockerfile
|-- railway.json
|-- render.yaml
|-- question_bank.py
|-- pdf_recall_question_bank.py
|-- validate_question_bank.py
|-- deploy/
|   `-- vps/
|-- docs/
|   `-- DEVELOPMENT_WORKFLOW.md
`-- v2/
    |-- backend/
    |-- frontend/
    |-- scripts/
    |-- API_CONTRACT.md
    |-- DEPLOYMENT.md
    |-- RUN_LOCAL.md
    `-- README.md
```

## Local Run

From the repository root:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\run_local_stack.ps1 -BackendPort 8010 -FrontendPort 5174 -SkipInstall
```

Open:

```text
http://127.0.0.1:5174
http://127.0.0.1:5174/api/health
```

Stop the local stack:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\stop_local_stack.ps1
```

## Tests

Run the main deterministic check:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_v2.ps1 -SkipInstall
```

Run deployment config checks:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_deploy_config.ps1
```

These checks must not call real LLM, STT, TTS, or production telemetry services.

## Deployment

Railway builds from the repository root using:

```text
Dockerfile
railway.json
```

`railway.json` uses Dockerfile builder and `/api/health` as the health check.
Railway Root Directory should be the repository root. If Railway exposes a
Config File Path setting, it should point to `/railway.json`.

See [v2/DEPLOYMENT.md](v2/DEPLOYMENT.md) for deployment details.

## Environment Variables

Set real secrets only in local ignored `.env` files or hosting-provider
variable dashboards. Do not commit real values.

Backend variables include:

```text
API_KEY
BASE_URL
MODEL
TRANSCRIPTION_MODEL
CORS_ORIGINS
MAX_AUDIO_UPLOAD_MB
RATE_LIMIT_PER_MINUTE
MAX_ANSWER_CHARS
MAX_SESSION_MESSAGES
MAX_TTS_CHARS
TTS_CACHE_MAX_ITEMS
ADMIN_TOKEN
TELEMETRY_MAX_EVENTS
```

Frontend examples are documented in `v2/frontend/.env.example`. Any `VITE_*`
value can be exposed to the browser, so do not put secrets there.

## Git Development Flow

All changes must follow:

```text
branch -> test -> commit -> push -> PR -> merge
```

Do not commit directly on `main`. Do not use the old `tmp/github-sync-*` copy
workflow for new development. See
[docs/DEVELOPMENT_WORKFLOW.md](docs/DEVELOPMENT_WORKFLOW.md).

## Security and Privacy

- Never commit real `.env` files.
- Never commit private feedback data, user names, user answers, audio, logs, or
  generated telemetry exports.
- Keep API keys server-side.
- Do not paste secrets into chat, screenshots, or GitHub issues.
- Build artifacts such as `node_modules`, `dist`, caches, and `tmp` are not
  source files.

## Product Boundaries

Current V2 is a working IELTS speaking coach prototype. It does not yet include:

- user accounts
- database-backed practice history
- payments or subscriptions
- WeChat Mini Program release
- formal acoustic pronunciation scoring
- human tutor marketplace features
