# Examiner Victoria V3 Beta deployment

> The active application remains in the legacy-compatible `v2/` directory. Current release facts are maintained in [V3 Current Status](../docs/V3_CURRENT_STATUS.md).

Examiner Victoria uses one Docker container: Vite builds the React frontend, FastAPI serves the resulting static files, and the same HTTPS origin exposes `/api`. This deployment shape is supported on CloudBase Run and remains compatible with Railway.

## Current deployment roles

### CloudBase Run — current domestic V3 Beta entry

- Region: Shanghai
- Service: `examiner-victoria-v3-beta`
- Expected transition source branch: `v3/domestic-public-beta`
- Container port: `8080`
- Public URL: <https://examiner-victoria-v3-beta-281197-7-1330057446.sh.run.tcloudbase.com>
- Health: `/api/health`
- Runtime diagnostics: `/api/diagnostics/runtime`

CloudBase deployment and source-branch selection are human-controlled. Do not assume automatic deployment, switch branches, create resources, or publish a new version without explicit authorization.

### Railway — historical and rollback context

- The original V2 Railway service represents the frozen V2 baseline.
- The V3 Railway beta was an overseas test baseline.
- Railway is not the current domestic V3 entry.
- Keep the Railway files and instructions below for reproducibility, rollback context, and overseas checks; do not treat them as the default V3 deployment path.

## Container contract

The repository root contains the deployable files:

```text
Dockerfile
.dockerignore
railway.json
render.yaml
v2/scripts/check_deploy_config.ps1
```

The root Dockerfile builds `v2/frontend` with pnpm, copies the React `dist` into the Python image, installs `v2/backend/requirements.txt`, and starts the FastAPI application. The hosting platform supplies `PORT`; CloudBase currently expects `8080`.

FastAPI serves:

```text
https://your-public-domain/
https://your-public-domain/api/health
https://your-public-domain/api/diagnostics/runtime
```

## CloudBase configuration

Configure non-sensitive settings and secrets in the CloudBase console. Never commit real values or paste them into documentation.

Core provider and safety variable names are documented in [V3 Runtime Dependencies](../docs/V3_RUNTIME_DEPENDENCIES.md). The Tencent TTS path uses names including:

```text
TTS_PROVIDER
TENCENTCLOUD_SECRET_ID
TENCENTCLOUD_SECRET_KEY
TENCENT_TTS_REGION
TENCENT_TTS_VOICE_TYPE
TENCENT_TTS_CODEC
TENCENT_TTS_SAMPLE_RATE
TENCENT_TTS_SPEED
TENCENT_TTS_VOLUME
```

The CloudBase deployment should use `TTS_PROVIDER=tencent`. Credential values belong only in the deployment secret store and should follow CAM least-privilege principles.

Optional build identity uses:

```text
APP_GIT_SHA
APP_BUILD_TIME
APP_DEPLOY_TARGET
APP_SOURCE_BRANCH
APP_VERSION
```

See [Build Version Diagnostics](../docs/V3_BUILD_VERSION_DIAGNOSTICS.md) for safe placeholder examples.

Other backend settings include the existing LLM/STT provider variables, CORS, upload limits, answer/session limits, rate limits, TTS limits, and telemetry protection. Refer to the runtime dependency document and environment examples for names; do not copy real environment values into Git.

## Provider behavior

- LLM uses the existing OpenAI-compatible provider adapter.
- STT uses the existing server transcription path.
- TTS on CloudBase uses Tencent Cloud TextToVoice through the official Python SDK and project adapter.
- gTTS is an explicit local/legacy option only.
- If TTS is unconfigured, times out, or fails, written feedback and the next question remain available.
- Runtime logs and diagnostics must not contain credentials, complete environment dumps, recordings, full user answers, or transcripts.

## CloudBase release checklist

Before a human-triggered deployment:

1. Confirm the intended Git commit and source branch.
2. Review the root `Dockerfile` and deployment diff.
3. Confirm required variable names are present in the CloudBase configuration without exposing values.
4. Set non-sensitive build identity fields for the intended build.
5. Deploy from the selected source branch.
6. Verify the exact deployed build with runtime diagnostics.
7. Check the frontend, `/api/health`, and `/api/diagnostics/runtime`.
8. Run one controlled manual flow only when provider calls are explicitly authorized.
9. Record non-sensitive results and observed timing/cost.
10. Retain the previous CloudBase version for rollback.

## Local deployment checks

Run the repository deployment check before a hosting change:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_deploy_config.ps1
```

If Docker Desktop is available:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_deploy_config.ps1 -BuildDockerImage
```

The local full-stack preview is documented in [RUN_LOCAL.md](RUN_LOCAL.md).

## Public smoke check

For the one-service architecture, use the same origin for frontend and backend:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_deployed_v2.ps1 `
  -BackendUrl "https://your-public-domain" `
  -FrontendUrl "https://your-public-domain"
```

Despite the compatibility name, this helper validates the current one-service application. Use protected/admin checks only with explicit authorization, and never print the token.

The expected read-only checks include the homepage, health, safe diagnostics, CORS behavior, question-bank metadata, and frontend HTML. Do not run paid-provider flows unless the task explicitly permits them.

## Railway historical path

For reproducing the historical Railway shape:

1. Connect Railway to the repository root.
2. Select the intended historical or rollback branch explicitly.
3. Build the root Dockerfile or use `railway.json`.
4. configure variables in the Railway dashboard without committing values.
5. deploy and verify the generated HTTPS domain.
6. check the homepage, `/api/health`, and safe diagnostics.

The committed Railway configuration is retained, but ordinary V3 domestic deployment work should not modify Railway.

## Other compatible hosting paths

The Docker image can also run on Render, Fly.io, or the prepared VPS setup. Those are compatibility options, not the current V3 Beta release target.

VPS support files remain under:

```text
deploy/vps/docker-compose.yml
deploy/vps/Caddyfile
deploy/vps/.env.example
deploy/vps/README.md
```

Before using another platform, review domestic accessibility, HTTPS, filing and domain requirements, provider egress, privacy, cost, and rollback using current official sources.

## Phone verification order

Use the maintained [V3 Manual Test Checklist](../docs/V3_MANUAL_TEST_CHECKLIST.md). A minimal controlled sequence is:

1. Open the HTTPS page and run System check.
2. Confirm secure context, storage, microphone availability, recording, and local playback.
3. Test written interaction without provider calls when possible.
4. With explicit authorization, record one short answer and confirm transcription.
5. Confirm written feedback and the next question remain visible.
6. Test TTS playback from a user gesture on iOS or WeChat.
7. Confirm a TTS failure degrades to text without a cold-start error.
8. Recheck health and non-sensitive runtime diagnostics.

Do not generalize a successful iPhone or WeChat check to all Android devices, carriers, 5G networks, or concurrency levels.

## Rollback

- CloudBase: select a previously verified version or traffic target through the console.
- Git: revert the faulty change; do not rewrite history.
- V2 baseline: preserve `main`, tag `v2.0.0`, and the frozen V2 Railway service.
- V3 transition: keep `v3/domestic-public-beta` until the main-based deployment is verified.

A repository rename, remote change, V3 tag, or CloudBase source-branch switch is part of the explicit promotion workflow, not a routine deployment step.
