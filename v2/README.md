# Examiner Victoria application (`v2/` compatibility directory)

> **Current status:** this legacy-named directory contains the active V3 Beta React + FastAPI application. It is not a frozen V2-only tree. Imports, Docker paths, tests, and scripts rely on `v2/`, so the directory will be retained until a separately reviewed compatibility migration.

The architecture originated in V2 when Examiner Victoria moved from Streamlit to React + FastAPI. V3 Beta continues that proven shape:

- React frontend for the iOS/WeChat-style chat experience.
- Python FastAPI backend for IELTS test state, feedback, transcription, TTS, diagnostics, and reports.
- Stateless API contract: the frontend sends the current `ExamSession`, and the backend returns the updated session.
- One Docker container in which FastAPI serves both the built frontend and `/api`.

The frozen V2 release remains on `main`, tag `v2.0.0`, commit `d592900e29c0cdcc4576d884c178991deea7013c`. Current V3 work is integrated on `v3/domestic-public-beta`. See [V3 Current Status](../docs/V3_CURRENT_STATUS.md).

## Why this architecture exists

Streamlit is excellent for fast prototypes, but it reruns the whole script after each
interaction. That makes it difficult to build a truly native chat interface with:

- a fixed bottom composer,
- local message-list updates,
- mobile-first recording behavior,
- iOS-style interaction polish,
- frontend-controlled audio capture.

V2 moves those responsibilities into React and leaves Python to handle AI logic.

Related docs:

- [API contract](./API_CONTRACT.md)
- [Local run guide](./RUN_LOCAL.md)
- [Frontend architecture](./frontend/ARCHITECTURE.md)
- [Backend architecture](./backend/ARCHITECTURE.md)
- [Mobile QA checklist](./MOBILE_QA.md)
- [Mobile QA result template](./MOBILE_QA_RESULT.template.md)
- [Structure refactor audit](./COMPLETION_AUDIT.md)
- [Deployment plan](./DEPLOYMENT.md)

## Readiness snapshot

Current recommendation:

- Treat V3 Beta as the active product line and `v3/domestic-public-beta` as the transition integration branch.
- Keep V2 frozen on `main` and tag `v2.0.0`.
- Keep the `v2/` directory name until imports, Docker paths, tests, and scripts are intentionally migrated.
- Use Tencent CloudBase Run as the current domestic beta entry; keep Railway as historical and rollback context.

Ready now:

- Local React/FastAPI development and one-container deployment.
- Practice and Mock flows for Part 1, Part 2, Part 3, and Full sessions.
- Direct-topic Part 1 practice and voice-first Mock behavior.
- Browser recording, STT transcription, LLM feedback, Tencent Cloud TTS, and text fallback.
- Reports, transcripts, practice-record export, runtime diagnostics, and System check.
- Domestic H5 access verified on iPhone Wi-Fi, iPhone 4G, Safari, and WeChat embedded browser.
- First invitation round completed with five anonymous testers.

Still worth validating:

- targeted follow-up fixes and mobile regression coverage
- Android, carrier, 5G, and concurrency behavior
- provider latency, reliability, quotas, and observed monthly cost
- production CORS and operational settings before wider sharing

Intentionally not included:

- accounts, database-backed history, or cross-device identity
- payment, subscription, or WeChat Mini Program release
- full-duplex voice or formal acoustic pronunciation scoring
- long-term learner profiles or persistent personalized answer histories

## Directory structure

```text
v2/
|-- backend/
|   |-- app.py                    # FastAPI routes, limits, static frontend serving
|   |-- ai_provider.py            # OpenAI-compatible provider config/client
|   |-- audio_services.py         # Transcription and TTS
|   |-- engine.py                 # Answer processing coordinator and reply assembly
|   |-- exam_flow_service.py      # IELTS state machine and phase transitions
|   |-- feedback_service.py       # Correction and natural-answer upgrade rules
|   |-- part3_service.py          # Part 3 bank backbone, dynamic follow-up, and fallback rules
|   |-- question_bank_service.py  # Part 1/2/3 question-bank helpers
|   |-- report_service.py         # Final reports and rule-based fallback summary
|   |-- schemas.py                # Pydantic request/response/session models
|   |-- smoke_test.py             # API route smoke test
|   `-- requirements.txt          # Backend dependencies
`-- frontend/
    |-- package.json        # React/Vite project
    |-- vite.config.js      # Vite build/dev config
    `-- src/
        |-- App.jsx         # Screen coordinator
        |-- api.js          # API client
        |-- recorder.js     # Browser WAV recorder
        |-- components/     # Layout and message components
        |-- config/         # UI mode/default settings
        |-- hooks/          # Recording, playback, and browser-side effects
        |-- utils/          # Formatting, labels, errors, exports, session view helpers
        |-- styles.css      # Shared/desktop visual system
        `-- styles/
            `-- mobile.css  # Phone responsive rules and overrides
```

## Local development

Recommended Windows script from the repository root:

Start the local fullstack preview:

```powershell
.\v2\scripts\run_local_stack.ps1 -BackendPort 8010 -FrontendPort 5174 -SkipInstall
```

The current local architecture is one Python/FastAPI process serving both:

```text
Frontend: http://127.0.0.1:5174
API:      http://127.0.0.1:5174/api/health
Phone:    http://192.168.x.x:5174
```

`BackendPort` is kept for compatibility with older commands. In this local
fullstack preview, the app and API both run on `FrontendPort`.

Stop the background stack:

```powershell
.\v2\scripts\stop_local_stack.ps1
```

The older separate backend/frontend scripts are still present for debugging, but
the single fullstack preview above is the recommended path.

Run all local checks:

```powershell
.\v2\scripts\check_v2.ps1
```

For repeat checks with the cached local dependencies, use `.\v2\scripts\check_v2.ps1 -SkipInstall`.

For iPhone/WeChat microphone testing before a deployment is available, start the
local fullstack preview first, then open a temporary HTTPS tunnel:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\start_https_tunnel.ps1 -Port 5174 -Restart
```

Use the printed `https://...trycloudflare.com` URL on the phone.

Check the local preview and saved HTTPS tunnel before testing on the phone:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_local_preview.ps1 -Port 5174 -UseSavedTunnel
```

Check a deployed one-service public preview:

```powershell
.\v2\scripts\check_deployed_v2.ps1 `
  -BackendUrl "https://your-public-domain.com" `
  -FrontendUrl "https://your-public-domain.com"
```

If Windows blocks PowerShell scripts, run them with:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_v2.ps1
```

Before syncing this local V2 work to GitHub, check whether the current folder is
a valid Git repository:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_git_ready.ps1
```

After real-device phone testing, validate the filled QA result:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_mobile_qa_result.ps1
```

Manual backend command:

```powershell
cd <repo-root>
python -m pip install -r v2/backend/requirements.txt
python -m uvicorn v2.backend.app:app --host 0.0.0.0 --port 5174
```

For local development, put your private API settings in this ignored file:

```text
v2/backend/.env
```

Example:

```env
API_KEY=<provider-api-key>
BASE_URL=https://api.gptsapi.net/v1
MODEL=gpt-5.4-mini
TRANSCRIPTION_MODEL=whisper-1
CORS_ORIGINS=http://localhost:5174
```

Do not paste a real API key into GitHub or chat. The local `.env` file is ignored
by Git; the committed template is:

```text
v2/backend/.env.example
```

You can also set the same values directly in PowerShell with `$env:API_KEY="..."`;
system environment variables override local `.env` values.

Manual backend smoke test:

```powershell
cd <repo-root>
python -m v2.backend.smoke_test
```

Advanced frontend-only debug command:

```powershell
cd v2/frontend
pnpm install
pnpm run dev
```

This runs the Vite development server only. It is useful for frontend debugging,
but it is not the normal local preview path. For integrated product testing,
use the single fullstack preview at:

```text
http://127.0.0.1:5174
```

Frontend deployment variables are listed in:

```text
v2/frontend/.env.example
```

## Current application capabilities

- Starts a new IELTS speaking session.
- Supports Full, Part 1, Part 2, and Part 3 focused practice modes.
- Practice Mode is the learning view: full chat, transcript, immediate feedback, expression coaching, and natural-answer upgrades.
- Mock Mode is the exam view: voice-first turns, reduced real-time text, no per-turn coaching during the test, Part 2 Cue Card support, and final report review.
- Supports random or selected Part 1 topics and Part 2/3 cue cards for focused practice.
- Displays messages in a real React chat panel.
- Uses a fixed iOS-style bottom composer.
- Shows a live practice summary for answered turns, average WPM, timed duration, and voice/text usage.
- Includes mobile/PWA basics: viewport-fit, theme color, manifest, and lightweight app icon.
- Supports typed answers.
- Supports chat-style text entry: Enter sends and Shift+Enter creates a new line.
- Supports tap-to-record / tap-to-send voice capture.
- Automatically falls back to text mode when microphone permission or transcription fails.
- Encodes browser audio as compact 16kHz mono WAV before transcription.
- Sends answers to the Python state machine.
- Supports Part 3 hybrid questioning through the backend: question-bank backbone, answer-driven follow-up when the answer contains enough substance, and safe fallback when generation is unavailable or unsuitable.
- Shows a refresh-safe Part 2 preparation countdown when the long-turn cue card starts.
- Can request a current scoring report from the backend before or after completing the full test.
- Falls back to a rule-based report if the scoring model is temporarily unavailable.
- Adds a rule-based session learning summary to every report using only raw answers and timing data.
- Can download the final report, full transcript, and a combined practice record as plain text files.
- Renders report headings, lists, quotes, and inline examples cleanly in the React UI.
- Splits generated reports into focused cards for score, issues, examples, next tasks, and session summary.
- Adds quick navigation chips for long generated reports without changing downloaded text files.
- Keeps voice playback single-channel so restarting or answering stops any previous prompt audio.
- Checks backend health on startup and turns timeout/backend failures into clear UI errors.
- Exposes safe backend health diagnostics for model/configuration/limits without leaking API keys.
- Includes a simple backend rate limit for public-deployment safety.
- Limits oversized answers, sessions, and TTS requests before they reach provider backends.
- Saves the current practice session locally on a best-effort basis so a refresh can restore the conversation.
- Local check scripts automatically load the cached backend dependencies under `tmp/v2_backend_deps` when present.

## Future product work

- Continue targeted follow-up validation from the first five anonymous testers.
- Improve CloudBase stability, provider latency visibility, and budget observation.
- Expand Android, carrier, 5G, and concurrency coverage before wider sharing.
- Consider accounts, persistent history, payment, or Mini Program work only after a separate product decision.
- Set production `CORS_ORIGINS` to the deployed public domain when the rollout requires it.
## Verification already completed

- Python compile check for the V2 backend modules.
- PowerShell parse check for all V2 helper scripts.
- GitHub Actions workflow file prepared locally for V2 Python validation, question-bank validation,
  backend smoke test, frontend dependency install, and frontend production build. Publishing this
  workflow requires a GitHub token with `workflow` scope.
- Backend flow smoke test: Full session progression, focused Part 1/2/3
  practice starts and completion, Mock-mode start, and Part 3 maximum-count guard.
- Local stack helper smoke test on alternate ports: backend health and frontend HTTP status.
- Deployment smoke-check helper for public backend/frontend URLs, CORS, question bank, and core API flow.
- FastAPI route smoke test with `python -m v2.backend.smoke_test`:
  `/api/health`, `/api/question-bank`, `/api/sessions`, `/api/answer`,
  report fallback behavior, oversized audio rejection for `/api/transcribe`,
  user-safe 502 messages for transcription/TTS provider failures, report
  learning-summary output, and deterministic AI stubs so CI-style checks do
  not depend on external model latency.
- Frontend dependency install with pnpm.
- Frontend production build with Vite.
- Question-bank validation from the existing app.
- Browser startup check against the local V2 frontend after backend health guard changes.
