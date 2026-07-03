# Examiner Victoria V2 Structure Refactor Audit

This audit maps the structure-refactor goal to current evidence. It is not a
marketing document; it exists so future work does not depend on memory.

## Goal

Turn the working React + FastAPI V2 into a clearer, more maintainable structure
without rewriting the product from scratch.

## Evidence summary

| Requirement | Current evidence | Status |
| --- | --- | --- |
| Keep React frontend, do not restart from scratch | `v2/frontend/src/App.jsx` remains the coordinator and existing Vite app is preserved. | Done |
| Split frontend responsibilities | `components/layout`, `components/messages`, `hooks`, `utils`, `config`, `styles/mobile.css`. | Done |
| Keep `App.jsx` as coordinator | Frontend architecture doc defines `App.jsx` as top-level coordinator; detailed UI is in components/hooks/utils. | Done |
| Split backend business logic | `ai_provider.py`, `audio_services.py`, `exam_flow_service.py`, `feedback_service.py`, `part3_service.py`, `question_bank_service.py`, `report_service.py`. | Done |
| Preserve FastAPI backend | `v2/backend/app.py` still owns API routes, limits, static frontend serving, and error boundaries. | Done |
| Mobile-first layout separated | Shared styles are in `styles.css`; phone responsive rules are in `styles/mobile.css`. | Done |
| Fixed chat-style composer | `components/layout/AnswerComposer.jsx` owns text/voice composer behavior. | Done |
| Tap-to-record instead of hold-to-speak | Implemented through `useAnswerRecording.js` and composer controls. | Done |
| Faster voice transcription path | `browserSpeechTranscriber.js` tries browser-native speech recognition first; compressed `MediaRecorder` audio is preferred for server fallback, with 16 kHz WAV as the final fallback. | Done, pending real-device speed check |
| iPhone audio fallback | `useSpeechPlayback.js` owns TTS cache and iPhone/Safari tap-to-play fallback. | Done, pending real-device verification |
| Single local development entry | `run_local_stack.ps1` builds React dist and serves frontend + `/api` on `http://127.0.0.1:5174`. | Done |
| HTTPS phone testing path | `start_https_tunnel.ps1` creates a temporary Cloudflare HTTPS URL and defaults to HTTP/2 for better reliability on this network. | Done |
| Local/HTTPS preview preflight | `check_local_preview.ps1` checks frontend HTML, `/api/health`, and question-bank counts for local and saved tunnel URLs. | Done |
| Public one-service deployment config | Root `Dockerfile`, `.dockerignore`, `railway.json`, `render.yaml`, and `check_deploy_config.ps1` prepare V2 for Railway/Render-style FastAPI deployment serving React dist plus `/api`. | Done, pending hosting-account deployment |
| Phase 2 VPS deployment config | `deploy/vps/docker-compose.yml`, `deploy/vps/Caddyfile`, `.env.example`, and README prepare a Hong Kong/Singapore Docker + Caddy automatic HTTPS deployment path. | Done, pending VPS/domain deployment |
| Mobile QA result gate | `check_mobile_qa_result.ps1` validates the filled `v2/MOBILE_QA_RESULT.md` after real-device testing. | Done, pending filled result |
| Browser-test anchors | Core controls and message bubbles expose stable `data-testid` anchors; `check_v2.ps1` verifies they reach the production JS bundle. | Done |
| Structure guardrails | `check_v2.ps1` verifies required frontend/backend modules exist, `App.jsx` and `engine.py` stay coordinator-sized, `styles/mobile.css` owns phone breakpoints, and style import order is preserved. | Done |
| Automated checks | `check_v2.ps1 -SkipInstall` runs compile, script parse, question-bank validation, backend smoke test, frontend build, and secret scan. | Done |
| Git/GitHub readiness check | `check_git_ready.ps1` detects that the current local folder is not a valid Git repo because `.git` is empty. | Done |
| Public replacement readiness | Requires real iPhone/WeChat microphone verification and production deployment. | Not done |

## Latest known verification

Last checked: 2026-07-02.

Run:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_v2.ps1 -SkipInstall
```

Expected:

```text
All V2 checks passed.
```

The smoke test intentionally simulates transcription provider failure, so stack
traces mentioning `provider duration parse failed` are acceptable only when the
final line still says all checks passed.

For the current local preview and saved HTTPS tunnel, run:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_local_preview.ps1 -Port 5174 -UseSavedTunnel
```

Expected:

```text
Local preview check passed.
```

Latest verified preview endpoints:

```text
Local: http://127.0.0.1:5174
HTTPS tunnel: https://bizarre-hurricane-protect-null.trycloudflare.com
```

The HTTPS tunnel is temporary. If it stops working, restart it with:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\start_https_tunnel.ps1 -Port 5174 -Restart
```

If Cloudflare QUIC is unstable on the current network, force HTTP/2 explicitly:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\start_https_tunnel.ps1 -Port 5174 -Restart -Protocol http2
```

## Current blockers before calling the goal complete

1. A human must open the HTTPS tunnel URL on iPhone Safari and confirm:
   - microphone permission appears,
   - tap-to-record starts and stops,
   - transcription works or fails gracefully,
   - Victoria voice playback behavior is acceptable,
   - text fallback still works.
2. If the app will be shared through WeChat, WeChat in-app browser must at least
   pass layout and text-mode checks.
3. The real-device result should be recorded by copying
   `v2/MOBILE_QA_RESULT.template.md` to `v2/MOBILE_QA_RESULT.md` and filling in
   the pass/fail details.
4. Run `v2/scripts/check_mobile_qa_result.ps1` against the filled result. A full
   release-ready pass requires the voice loop items to be checked.
5. GitHub sync cannot be done from the current folder until it is placed inside
   a valid Git repository or Git is initialized intentionally.

## Next conversation startup prompt

If starting a fresh Codex conversation, paste this:

```text
We are working on Examiner Victoria V2 in the current Codex workspace.
Goal: continue the React + FastAPI structure refactor and mobile-first QA.
Read v2/README.md, v2/COMPLETION_AUDIT.md, v2/MOBILE_QA.md, v2/MOBILE_QA_RESULT.template.md, v2/frontend/ARCHITECTURE.md, and v2/backend/ARCHITECTURE.md first.
Use v2/scripts/check_v2.ps1 -SkipInstall after meaningful changes.
Use v2/scripts/run_local_stack.ps1 for local preview and v2/scripts/start_https_tunnel.ps1 for iPhone HTTPS testing.
Do not mark the refactor complete until iPhone/WeChat real-device behavior is verified and v2/MOBILE_QA_RESULT.md records the result.
```
