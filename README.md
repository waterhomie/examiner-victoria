# Examiner Victoria

> **V3 Beta | AI IELTS Speaking Coach**

Examiner Victoria is a mobile-friendly IELTS Speaking practice application. It combines structured Practice and Mock flows with recording, transcription, AI feedback, spoken examiner prompts, reports, and lightweight anonymous feedback.

## Current status

V3 Beta is the current product line on the default branch, `main`. Five anonymous testers (T001–T005) completed the first invitation round, producing feedback records F001–F016. The next step is targeted follow-up validation; this is not a broad public release or a claim of market validation.

- Current repository: [waterhomie/examiner-victoria](https://github.com/waterhomie/examiner-victoria)
- Default and development branch: `main`
- Domestic beta: [Open Examiner Victoria V3 Beta](https://examiner-victoria-v3-beta-281197-7-1330057446.sh.run.tcloudbase.com)
- Health check: [`/api/health`](https://examiner-victoria-v3-beta-281197-7-1330057446.sh.run.tcloudbase.com/api/health)
- Current release: [Examiner Victoria V3.0.0 Beta 1](https://github.com/waterhomie/examiner-victoria/releases/tag/v3.0.0-beta.1)
- Current-state reference: [V3 Current Status](docs/V3_CURRENT_STATUS.md)
- Frozen V2 Railway reference: [Examiner Victoria V2](https://examiner-victoria-v2-production.up.railway.app)

The GitHub repository was renamed from `waterhomie/examiner-victoria-v2` to `waterhomie/examiner-victoria` on 2026-07-13. The canonical local worktree folder keeps its historical name. The active runtime and tooling now live in top-level `frontend/`, `backend/`, and `scripts/`. Current operating guides live in `docs/`; `v2/` contains frozen V2 historical evidence only.

## What V3 Beta includes

- Practice and Mock modes
- IELTS Speaking Part 1, Part 2, Part 3, and Full flows
- voice-first Mock experience
- direct-topic Part 1 practice with up to four non-duplicate questions
- browser recording and server-side transcription
- AI examiner questions and feedback
- configurable OpenAI-compatible or Tencent Cloud TTS
- text fallback when TTS is unavailable
- reports, transcripts, practice records, export, and download
- runtime/build diagnostics and a user-facing System check
- mobile H5 support and anonymous tester feedback

## Architecture

- React 19 + Vite + pnpm frontend
- FastAPI + Pydantic backend
- a single Docker container
- FastAPI serves both the built frontend and `/api`
- frontend-held sessions passed through API requests
- no account system or application database

Active React code lives in `frontend/`, active FastAPI code and question-bank data live in `backend/`, and current PowerShell tooling lives in `scripts/`. The question bank is exposed by `backend/question_bank/`; the production entrypoint is `backend.app:app`, and the built frontend is served from `frontend/dist`.

Phase 0 audit, Phase 1 runtime paths, Phase 3 scripts/documents, and Phase 2 question-bank packaging are complete. The root `validate_question_bank.py` remains the stable validation command; no further repository-structure refactor is currently planned.

## Deployment and providers

Tencent CloudBase Run in Shanghai is the current domestic V3 Beta entry. CloudBase now builds from `main`; the main-based deployment and core product flow were manually verified by the project owner.

Verified access scope includes iPhone Wi-Fi, iPhone 4G, Safari, the WeChat embedded browser, HTTPS, microphone recording, local playback, and the transcribe/answer/TTS API chain with VPN disabled. This does not establish universal Android, carrier, 5G, concurrency, or broad-public coverage.

Railway remains historical deployment and rollback context:

- the V2 Railway deployment represents the frozen V2 baseline
- the V3 Railway beta was an overseas test baseline
- Railway is not the current domestic V3 entry

Provider positioning:

- LLM: existing OpenAI-compatible provider
- STT: existing server transcription path, with browser capability checks and fallback behavior
- TTS: OpenAI-compatible Audio Speech API using the existing provider key, or Tencent Cloud TextToVoice as rollback
- gTTS: explicit local/legacy provider only
- voice degradation: written feedback and the next question remain available if TTS fails

## Product boundaries

V3 Beta intentionally does not add accounts, cross-device identity, a persistent application database, payment, a WeChat Mini Program release, full-duplex voice, acoustic pronunciation scoring, long-term learner profiles, or persistent personalized answer histories.

## Version history

| Version | Status | Reference |
| --- | --- | --- |
| V1 | Historical Streamlit prototype | Repository history |
| V2 | Frozen stable baseline | tag `v2.0.0`, commit `d592900` |
| V3 Beta | Current `main` release line | tag `v3.0.0-beta.1`, CloudBase Run |

## Documentation

- [V3 Current Status](docs/V3_CURRENT_STATUS.md) — authoritative current state
- [User Feedback Log](docs/USER_FEEDBACK_LOG.md) — tester evidence and decisions
- [V3 Beta Constraints](docs/V3_BETA_CONSTRAINTS.md) — active scope and cost boundaries
- [Runtime Dependencies](docs/V3_RUNTIME_DEPENDENCIES.md) — provider and environment-variable contract
- [Runtime Diagnostics](docs/V3_RUNTIME_DIAGNOSTICS.md) — non-sensitive diagnostics contract
- [Manual Test Checklist](docs/V3_MANUAL_TEST_CHECKLIST.md) — manual acceptance coverage
- [Local Run Guide](docs/RUN_LOCAL.md) — current local commands and safe environment boundaries
- [Deployment Guide](docs/DEPLOYMENT.md) — current CloudBase/container contract and rollback context
- [Development Workflow](docs/DEVELOPMENT_WORKFLOW.md) — branch, release, and rollback workflow
- [AGENTS.md](AGENTS.md) — project-level AI collaboration rules

Older migration, audit, and access-test documents remain as historical evidence. Use [V3 Current Status](docs/V3_CURRENT_STATUS.md) when an older planning statement conflicts with the current release state.
