# Local Run Guide

> Current source and tooling live in `frontend/`, `backend/`, and `scripts/`. The `v2/` directory contains frozen historical evidence only.

## Start

From the project root:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\run_local_stack.ps1 -BackendPort 8010 -FrontendPort 5174 -SkipInstall
```

The app now runs as a single fullstack service:

```text
Frontend: http://127.0.0.1:5174
API:      http://127.0.0.1:5174/api/health
Phone:    http://192.168.x.x:5174
```

`BackendPort` is kept only for compatibility with older commands. In the new local preview architecture, the app and API both run on `FrontendPort`.

## Stop

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\stop_local_stack.ps1 -Ports "8010,5174"
```

## Why this changed

The earlier local setup used two services:

```text
Vite dev server on 5174 + FastAPI backend on 8010
```

That made development fragile on Windows because the project path contains Chinese characters and Vite dev server sometimes failed to resolve `/src/main.jsx`, causing a blank page.

The new setup is:

```text
Build React dist -> FastAPI serves frontend dist and /api on one port
```

This is closer to deployment and much easier to debug.

## Dependencies and environment

The current local stack uses Python/FastAPI from `backend/` and Node.js/pnpm/Vite from `frontend/`. Reuse existing repository-local dependencies where possible; do not install project packages globally.

Private backend settings belong in the ignored file:

```text
backend/.env
```

Variable-name examples are committed in `backend/.env.example` and `frontend/.env.example`. Never commit, print, or paste real API keys, tokens, credentials, or `.env` values.

For separate debugging, use:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\run_backend.ps1 -Port 8010 -SkipInstall
powershell.exe -ExecutionPolicy Bypass -File .\scripts\run_frontend.ps1 -Port 5174 -SkipInstall
```

Run the complete current project check from the repository root:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\check_project.ps1 -SkipInstall
```

The root `validate_question_bank.py` command validates the data exported by `backend/question_bank/`; the backend no longer relies on a root-module `sys.path` workaround.

The automated checks use deterministic provider stubs and must not call real LLM, STT, or TTS services.

## iPhone microphone note

The local LAN URL is useful for layout and text testing. iPhone Safari still requires HTTPS before it can reliably request microphone access, so voice recording on phone needs an HTTPS tunnel or public deployment.

## Temporary HTTPS phone testing

When the local app is already running, start a temporary Cloudflare HTTPS tunnel:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\start_https_tunnel.ps1 -Port 5174 -Restart
```

The script prints a URL like:

```text
https://xxxx.trycloudflare.com
```

Open that URL on iPhone Safari or WeChat to test microphone permission, recording,
transcription, and Victoria voice playback. The tunnel is temporary; if it stops or
the URL expires, run the command again.

Stop both the local app and tunnel with:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\stop_local_stack.ps1 -Ports "8010,5174"
```

## V4 UI work without provider keys

For frontend work on the V4 coach UI you can run a fake backend that patches
the model, TTS, and STT calls with deterministic local fakes (no network, no
keys, no `.env` needed):

```bash
python scripts/run_fake_backend.py          # FastAPI on http://127.0.0.1:8010
cd frontend && pnpm dev                     # Vite proxies /api to :8010
```

or build once (`pnpm build`) and open `http://127.0.0.1:8010`. The fake
backend is for UI development only. It never changes real provider behavior
and must not be deployed.

V4 focused checks:

```bash
python -m backend.answer_feedback_test
python -m backend.smoke_test
cd frontend && pnpm run test:smoke && pnpm run build
```
