# Examiner Victoria V3 Beta — Current Status

> Authoritative current-state reference.

## 1. Status date

This status was consolidated on **2026-07-13** from the current V3 code, deployment evidence, Git history, and reviewed project documentation.

## 2. Product stage

Examiner Victoria is in the **V3 Beta** stage. The product is ready for small, targeted invitation testing; it is not presented as a broad public release or as market validation.

## 3. Current integration branch and release line

- Current integration branch: `v3/domestic-public-beta`
- Task branches are based on the V3 integration branch and merge back through review
- `main` remains the frozen V2 release line until an explicit V3 promotion PR is reviewed and merged
- A V3 release tag has not been created yet

## 4. Frozen V2 baseline and repository compatibility

- Branch: `main`
- Tag: `v2.0.0`
- Commit: `d592900e29c0cdcc4576d884c178991deea7013c`
- The original V2 Railway deployment remains a historical reference and rollback option

V2 history must not be rewritten or removed during V3 work.

The GitHub repository is still named `waterhomie/examiner-victoria-v2` for compatibility. The active React and FastAPI application remains under the legacy-named `v2/` directory because imports, Docker paths, tests, and scripts depend on that layout. Neither the repository nor the directory should be renamed as part of ordinary V3 tasks.

## 5. Current architecture

- Frontend: React 19, Vite, and pnpm
- Backend: FastAPI and Pydantic
- Packaging: one Docker container
- Serving model: FastAPI serves the built frontend and `/api` routes
- Sessions: held by the frontend and passed through API requests
- Persistence: no account system and no application database

## 6. Current deployment

The current domestic beta entry is Tencent CloudBase Run in Shanghai:

- Service: `examiner-victoria-v3-beta`
- Source branch: `v3/domestic-public-beta`
- URL: <https://examiner-victoria-v3-beta-281197-7-1330057446.sh.run.tcloudbase.com>
- Health: <https://examiner-victoria-v3-beta-281197-7-1330057446.sh.run.tcloudbase.com/api/health>
- Runtime diagnostics: <https://examiner-victoria-v3-beta-281197-7-1330057446.sh.run.tcloudbase.com/api/diagnostics/runtime>

CloudBase automatic deployment is not assumed. Deployment and source-branch changes require explicit human confirmation in the CloudBase console.

Railway is not the primary domestic V3 entry. The V2 Railway service is a frozen historical/rollback reference, while the V3 Railway beta was an overseas test baseline.

## 7. Verified domestic access scope

With VPN disabled, the CloudBase deployment has been verified on:

- iPhone over Wi-Fi
- iPhone over 4G
- Safari
- WeChat embedded browser
- HTTPS and secure context
- microphone permission, recording, local audio playback, and local storage
- `/api/transcribe`, `/api/answer`, and `/api/tts`

These observations do not establish coverage for 5G, every Android model, every carrier, high concurrency, or broad public traffic.

## 8. Provider status

- LLM: the existing OpenAI-compatible provider path remains in use
- STT: the existing server transcription provider remains in use, with browser capability checks and fallback behavior
- TTS on CloudBase: Tencent Cloud TextToVoice through the official Python SDK and the project provider adapter
- gTTS: explicit local/legacy provider only; it is not the current CloudBase TTS path
- Text fallback: retained when TTS is disabled, times out, or fails; a voice failure must not remove feedback or the next question

Provider credentials are configured only through the deployment secret store. Documentation records variable names and non-sensitive public options, never credential values.

## 9. Current product capabilities

- Practice and Mock modes
- Part 1, Part 2, Part 3, and Full speaking flows
- voice-first Mock experience
- direct-topic Part 1 practice
- recording, STT transcription, LLM feedback, and Tencent TTS playback
- feedback reports, transcripts, practice records, export, and download
- runtime diagnostics and the user-facing System check
- text-first degradation when voice generation is unavailable
- mobile H5 operation and anonymous feedback collection

## 10. Recent V3 changes

- established the CloudBase domestic beta deployment
- added runtime diagnostics and System check
- isolated TTS failures from the answer flow and added non-sensitive timing diagnostics
- integrated Tencent Cloud TTS with least-privilege credential guidance
- made Practice Part 1 start directly from the selected topic
- completed the first invitation round with five anonymous testers
- consolidated branch governance and release-transition rules

## 11. Testing status

The first invitation-testing target of 3–5 people has been reached:

- anonymous testers: T001–T005
- feedback records: F001–F016

The next step is targeted follow-up validation of fixes, mobile stability, provider latency, and cost. These results are product feedback and operational evidence, not a claim of statistical coverage or market validation.

## 12. Current boundaries and non-goals

V3 Beta does not currently include:

- accounts or cross-device identity
- a persistent application database
- payments
- a WeChat Mini Program rewrite
- full-duplex real-time voice conversation
- acoustic pronunciation scoring
- long-term learner profiles
- persistent personal experiences or a personalized full-answer flow

These items require separate product decisions and must not be added incidentally.

## 13. Known risks and open validation

- CloudBase source-branch and deployment-version selection remain human-controlled
- provider latency, egress reliability, quotas, and monthly spend need continued observation
- WeChat and iOS media behavior can vary by device and OS version
- Android, carrier, 5G, and concurrency coverage remain incomplete
- anonymous beta feedback must continue to avoid collecting unnecessary personal data
- vendor pricing, filing requirements, and platform policy must be checked against current official sources before decisions are made

## 14. Current development workflow

Until V3 promotion is complete:

1. branch from `v3/domestic-public-beta`
2. open task PRs back to `v3/domestic-public-beta`
3. keep `main` and the `v2.0.0` baseline unchanged
4. do not switch CloudBase source branches or deploy without human confirmation
5. prefer revert or CloudBase version rollback over history rewriting

See [Development Workflow](DEVELOPMENT_WORKFLOW.md) and the repository [AGENTS.md](../AGENTS.md).

## 15. Planned promotion to main

The planned sequence is:

1. finish V3 consolidation work on the V3 integration branch
2. merge reviewed task PRs into `v3/domestic-public-beta`
3. open a final promotion PR from V3 to `main`
4. merge only after explicit review and approval
5. switch CloudBase build source to `main`
6. deploy and verify the main-based CloudBase version
7. create `v3.0.0-beta.1`

This document update does not perform any of those promotion actions.

## 16. Planned repository rename

The repository may be renamed from `examiner-victoria-v2` to `examiner-victoria` only after V3 is promoted to `main` and the CloudBase deployment has been verified from `main`. The rename requires explicit confirmation, followed by remote and documentation link updates. The legacy `v2/` application directory is a separate compatibility decision and is not automatically renamed with the repository.

## 17. Documentation authority

For current decisions, use this order:

1. root [README](../README.md) — public project overview
2. this document — authoritative current V3 state
3. [User Feedback Log](USER_FEEDBACK_LOG.md) — tester evidence and decisions
4. [AGENTS.md](../AGENTS.md) — AI collaboration rules
5. [Development Workflow](DEVELOPMENT_WORKFLOW.md) — Git and maintenance workflow
6. other V3 migration, audit, diagnostic, and test documents — specialized evidence or historical snapshots

When an older planning document conflicts with this file, this file takes precedence unless newer code or reviewed deployment evidence proves otherwise.

## 18. Historical and specialized document index

- [V3 Kickoff Context](V3_KICKOFF_CONTEXT.md) — historical kickoff snapshot
- [Domestic Access Audit](V3_DOMESTIC_ACCESS_AUDIT.md) — historical migration audit
- [Beta Access Test Log](V3_BETA_ACCESS_TEST_LOG.md) — access-test evidence, including Railway-era checks
- [CloudBase Migration Plan](V3_CLOUDBASE_MIGRATION_PLAN.md) — migration record with active operational references
- [Runtime Dependencies](V3_RUNTIME_DEPENDENCIES.md) — current provider and runtime dependency details
- [Runtime Diagnostics](V3_RUNTIME_DIAGNOSTICS.md) — diagnostics design and safety contract
- [Build Version Diagnostics](V3_BUILD_VERSION_DIAGNOSTICS.md) — build identity fields and deployment inputs
- [Manual Test Checklist](V3_MANUAL_TEST_CHECKLIST.md) — current manual acceptance checklist
- [V3 Beta Constraints](V3_BETA_CONSTRAINTS.md) — active scope and cost boundaries
- [V2 Final QA Checklist](V2_FINAL_QA_CHECKLIST.md) and `v2/` completion records — frozen V2 evidence
