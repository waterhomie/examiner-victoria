# Examiner Victoria

> **V3 Beta | AI IELTS Speaking Coach**

Examiner Victoria is a mobile-friendly IELTS Speaking practice application. It combines structured Practice and Mock flows with recording, transcription, AI feedback, spoken examiner prompts, reports, and lightweight anonymous feedback.

## Current status

V3 Beta is the active product line and is in small-scale invitation testing. Five anonymous testers (T001–T005) have completed the first round, producing feedback records F001–F016. The next step is targeted follow-up validation; this is not yet a broad public release or a claim of market validation.

- Current integration branch: `v3/domestic-public-beta`
- Domestic beta: [Open Examiner Victoria V3 Beta](https://examiner-victoria-v3-beta-281197-7-1330057446.sh.run.tcloudbase.com)
- Health check: [`/api/health`](https://examiner-victoria-v3-beta-281197-7-1330057446.sh.run.tcloudbase.com/api/health)
- Current-state reference: [V3 Current Status](docs/V3_CURRENT_STATUS.md)
- Source repository: [waterhomie/examiner-victoria-v2](https://github.com/waterhomie/examiner-victoria-v2)
- Frozen V2 Railway reference: [Examiner Victoria V2](https://examiner-victoria-v2-production.up.railway.app)

The repository name is retained for compatibility. A rename to `examiner-victoria` is planned only after V3 is promoted to `main` and the CloudBase deployment is verified from `main`.

## What V3 Beta includes

- Practice and Mock modes
- IELTS Speaking Part 1, Part 2, Part 3, and Full flows
- voice-first Mock experience
- direct-topic Part 1 practice
- browser recording and server-side transcription
- AI examiner questions and feedback
- Tencent Cloud TTS on the CloudBase deployment
- text fallback when TTS is unavailable
- reports, transcripts, practice records, export, and download
- runtime diagnostics and a user-facing System check
- mobile H5 support and anonymous tester feedback

## Architecture

The current application keeps the proven V2 shape:

- React 19 + Vite + pnpm frontend
- FastAPI + Pydantic backend
- a single Docker container
- FastAPI serves both the built frontend and `/api`
- frontend-held sessions passed through API requests
- no account system or application database

The active application remains in the legacy-compatible `v2/` directory. Imports, Docker paths, scripts, and tests depend on that location, so the directory is not being renamed during the V3 beta transition.

## Deployment and providers

CloudBase Run in Shanghai is the current domestic V3 Beta entry. Verified scope includes iPhone Wi-Fi, iPhone 4G, Safari, the WeChat embedded browser, HTTPS, microphone recording, local playback, and the transcribe/answer/TTS API chain with VPN disabled.

Railway is retained as historical deployment evidence and rollback context:

- the V2 Railway deployment represents the frozen V2 baseline
- the V3 Railway beta was an overseas test baseline
- Railway is not the current domestic V3 entry

Provider positioning:

- LLM: existing OpenAI-compatible provider
- STT: existing server transcription path, with browser capability checks and fallback behavior
- TTS: Tencent Cloud TextToVoice through the official Python SDK on CloudBase
- gTTS: explicit local/legacy provider only
- voice degradation: written feedback and the next question remain available if TTS fails

## Product boundaries

V3 Beta intentionally does not add accounts, cross-device identity, a persistent application database, payment, a WeChat Mini Program rewrite, full-duplex voice, acoustic pronunciation scoring, long-term learner profiles, or persistent personalized answer histories.

## Version history

| Version | Status | Reference |
| --- | --- | --- |
| V1 | Historical prototype | Repository history |
| V2 | Frozen stable baseline | `main`, tag `v2.0.0`, commit `d592900` |
| V3 Beta | Active invitation-testing line | `v3/domestic-public-beta`, CloudBase Run |

## Documentation

- [V3 Current Status](docs/V3_CURRENT_STATUS.md) — authoritative current state
- [User Feedback Log](docs/USER_FEEDBACK_LOG.md) — tester evidence and decisions
- [V3 Beta Constraints](docs/V3_BETA_CONSTRAINTS.md) — active scope and cost boundaries
- [Runtime Dependencies](docs/V3_RUNTIME_DEPENDENCIES.md) — provider and environment-variable contract
- [Runtime Diagnostics](docs/V3_RUNTIME_DIAGNOSTICS.md) — non-sensitive diagnostics contract
- [Manual Test Checklist](docs/V3_MANUAL_TEST_CHECKLIST.md) — manual acceptance coverage
- [Development Workflow](docs/DEVELOPMENT_WORKFLOW.md) — branch, release, and rollback workflow
- [AGENTS.md](AGENTS.md) — project-level AI collaboration rules

Older migration, audit, and access-test documents remain in the repository as historical evidence. Use [V3 Current Status](docs/V3_CURRENT_STATUS.md) when an older planning statement conflicts with the present release state.
