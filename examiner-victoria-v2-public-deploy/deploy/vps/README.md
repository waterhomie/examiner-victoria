# VPS Deployment With Docker + Caddy

Use this after the Railway/Render public test if mobile latency still looks bad
or if you want a more stable Hong Kong/Singapore deployment.

## Server Requirements

- A Hong Kong or Singapore VPS.
- Docker and Docker Compose installed.
- A domain name pointing to the VPS public IP.
- Ports `80` and `443` open in the server firewall.

## Files

```text
deploy/vps/docker-compose.yml
deploy/vps/Caddyfile
deploy/vps/.env.example
```

The app container is built from the root `Dockerfile`. Caddy terminates HTTPS
and reverse-proxies traffic to the app on port `8080`.

## Setup

From the project root on the VPS:

```bash
cp deploy/vps/.env.example deploy/vps/.env
nano deploy/vps/.env
```

Fill in:

```text
DOMAIN=your-domain.com
ACME_EMAIL=your-email@example.com
API_KEY=your-real-provider-key
CORS_ORIGINS=https://your-domain.com
```

Start the service:

```bash
cd deploy/vps
docker compose up -d --build
```

Check logs:

```bash
docker compose logs -f app
docker compose logs -f caddy
```

Test:

```text
https://your-domain.com/
https://your-domain.com/api/health
```

Then run the public smoke check from your Windows project folder:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_deployed_v2.ps1 `
  -BackendUrl "https://your-domain.com" `
  -FrontendUrl "https://your-domain.com"
```
