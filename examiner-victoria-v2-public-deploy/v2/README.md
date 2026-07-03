# Examiner Victoria V2

V2 is the migration path from the Streamlit prototype to a real chat-product
architecture:

- React frontend for the iOS/WeChat-style chat experience.
- Python FastAPI backend for IELTS test state, feedback, transcription, TTS, and reports.
- Stateless API contract: the frontend sends the current `ExamSession`, and the backend
  returns the updated session. This keeps deployment simple and avoids server-side session
  loss across instances.

The original Streamlit app remains the stable production fallback. V2 is built beside it
instead of replacing it immediately.

## Why V2 exists

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

- Keep the original Streamlit app as the stable public fallback.
- Treat V2 as the custom React/FastAPI successor and private-beta build.
- Do not replace the public Streamlit link until V2 frontend and backend are deployed
  as real services and mobile microphone behavior is live-tested.

Ready now:

- Local React/FastAPI development flow.
- Stateless backend API for IELTS session state.
- Question-bank validation, backend smoke tests, and frontend production build.
- Custom chat UI, tap-to-record voice input, transcription, TTS playback, scoring reports,
  practice-record export, and focused practice modes.

Still required before public replacement:

- Public one-service V2 deployment with protected backend environment variables.
- iPhone Safari and WeChat in-app-browser microphone testing on the public HTTPS URL.
- Production `CORS_ORIGINS` restricted to the real public domain before wider sharing.
- iPhone Safari and WeChat in-app-browser microphone testing.
- Budget-aware rate-limit tuning for the real API provider.

Intentionally not included yet:

- User accounts or database-backed history.
- Payment, subscription, or WeChat Mini Program release.
- Formal acoustic pronunciation scoring.
- Human tutor review or marketplace features.

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
|   |-- part3_service.py          # Dynamic Part 3 follow-up generation
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

For iPhone/WeChat microphone testing before public deployment, start the local
fullstack preview first, then open a temporary HTTPS tunnel:

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
API_KEY=sk-your-real-provider-key
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

## Current V2 capabilities

- Starts a new IELTS speaking session.
- Supports Full, Part 1, Part 2, and Part 3 focused practice modes.
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
- Supports dynamic Part 3 follow-up generation through the backend.
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

## Still to finish before replacing Streamlit

- Live-test microphone permissions on iPhone Safari and WeChat in-app browser.
- Add proper authentication/rate limiting before public launch.
- Deploy the one-service FastAPI public preview with the included Dockerfile.
- Add persistent practice history if user accounts become necessary.
- Set production `CORS_ORIGINS` to the deployed public domain.

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
