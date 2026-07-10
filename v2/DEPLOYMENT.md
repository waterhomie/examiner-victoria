# Examiner Victoria V2 Public Deployment

This V2 deployment path is intentionally simple: deploy **one FastAPI web
service** that serves both the React app and `/api`.

Use this for the first public mobile-speed test. Do not split Netlify frontend
and backend yet; the current bottleneck is the phone-to-backend voice loop, so a
single HTTPS service is easier to test and debug.

## Recommended first deployment

Use one of these managed web-service platforms:

- Railway: easiest first try if you want a quick public URL.
- Render: also works well with the included Dockerfile.
- Fly.io: good later if you are comfortable with a slightly more technical CLI.

The committed deployment files are:

```text
Dockerfile
.dockerignore
railway.json
render.yaml
v2/scripts/check_deploy_config.ps1
```

The Dockerfile builds `v2/frontend` with pnpm, copies the React `dist` into the
Python image, installs `v2/backend/requirements.txt`, and starts:

```bash
python -m uvicorn v2.backend.app:app --host 0.0.0.0 --port $PORT
```

FastAPI then serves:

```text
https://your-public-domain/
https://your-public-domain/api/health
```

## Environment variables

Set these in the hosting provider's dashboard. Never put real secrets in GitHub
or chat.

```text
API_KEY=sk-your-real-provider-key
BASE_URL=https://api.gptsapi.net/v1
MODEL=gpt-5.4-mini
TRANSCRIPTION_MODEL=whisper-1
CORS_ORIGINS=*
MAX_AUDIO_UPLOAD_MB=12
RATE_LIMIT_PER_MINUTE=120
MAX_ANSWER_CHARS=4000
MAX_SESSION_MESSAGES=120
MAX_TTS_CHARS=1200
TTS_CACHE_MAX_ITEMS=64
ADMIN_TOKEN=replace-with-a-long-random-token
TELEMETRY_MAX_EVENTS=500
```

To generate a strong `ADMIN_TOKEN` locally:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\generate_admin_token.ps1
```

For the first one-service test, `CORS_ORIGINS=*` is acceptable because the
frontend and backend are on the same domain. Before wider public sharing, replace
it with the real public domain.

## Railway path

1. Put this project into a private GitHub repository.
2. In Railway, create a new project from that repository.
3. Choose Dockerfile build if Railway asks for the builder.
4. Add the environment variables above.
5. Deploy and open the generated Railway domain.
6. Test:

```text
https://your-railway-domain/api/health
https://your-railway-domain/
```

## Render path

1. Put this project into a private GitHub repository.
2. In Render, create a new Blueprint or Web Service from the repository.
3. Use `render.yaml` or choose Docker manually.
4. Add `API_KEY` as a secret value if Render does not import it automatically.
5. Deploy and open the generated Render domain.

## Local deployment-config check

Run this before pushing to a hosting provider:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_deploy_config.ps1
```

If this folder is not a valid Git repository yet, create a clean deployment zip
first:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\prepare_public_deploy_bundle.ps1
```

The zip is written to:

```text
tmp/examiner-victoria-v2-deploy-bundle.zip
```

Use that zip as the source for a new private GitHub repository, or keep it as a
sanitized handoff package. It excludes `.env`, `node_modules`, local build
outputs, and temporary logs.

If Docker Desktop is installed and running, you can also build the production
image locally:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_deploy_config.ps1 -BuildDockerImage
```

## Public smoke check

For this one-service deployment, use the same URL for backend and frontend:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_deployed_v2.ps1 `
  -BackendUrl "https://your-public-domain" `
  -FrontendUrl "https://your-public-domain"
```

This checks health, API-key presence, CORS, question-bank counts, practice
options, telemetry summary protection, a core session/answer API flow, and
frontend HTML.

To also verify the protected telemetry summary payload, pass your private admin
token:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_deployed_v2.ps1 `
  -BackendUrl "https://your-public-domain" `
  -FrontendUrl "https://your-public-domain" `
  -AdminToken "your-admin-token"
```

For GitHub-to-Railway sync, use the dry-run first:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\sync_public_deploy_github.ps1
```

Only push after the dry-run looks right:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\sync_public_deploy_github.ps1 -Push
```

## Phone test order

Use this exact order so slow parts are easy to identify:

1. Desktop browser: open the public URL and send one typed answer.
2. iPhone Safari: open the public HTTPS URL.
3. Turn Victoria sound off first.
4. Record a short answer for 3-4 seconds.
5. Confirm the transcription appears and Victoria responds in text.
6. Turn Victoria sound on and test the tap-to-play fallback.
7. If the public version is still slow, inspect `window.__victoriaLastTranscription`
   from a remote Safari console and compare `serverElapsedMs` with `serverTotalMs`.

## Why not Netlify-only

Netlify is good for a static React/Vite frontend, but this project needs a live
FastAPI backend for transcription, GPTsAPI feedback, TTS, rate limits, and secret
API keys. Deploying only the frontend would still leave the important voice loop
dependent on another backend.

After this one-service public test proves the mobile loop, a later production
setup can split frontend/backend or move to a Hong Kong/Singapore VPS with Docker
and Caddy automatic HTTPS.

## Phase 2: Hong Kong/Singapore VPS

If Railway/Render proves the product works but the China-facing mobile latency is
still not good enough, move the same app image to a Hong Kong or Singapore VPS.
The prepared files are:

```text
deploy/vps/docker-compose.yml
deploy/vps/Caddyfile
deploy/vps/.env.example
deploy/vps/README.md
```

On the VPS, copy `.env.example` to `.env`, fill in your domain, email, and
backend secrets, then run:

```bash
cd deploy/vps
docker compose up -d --build
```

Caddy will request and renew HTTPS certificates automatically for `DOMAIN`.
The app still uses the same root Dockerfile, so Railway/Render and VPS deploy
the same product build.
