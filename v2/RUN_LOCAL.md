# Local Run Guide

## Start

From the project root:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\run_local_stack.ps1 -BackendPort 8010 -FrontendPort 5174 -SkipInstall
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
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\stop_local_stack.ps1 -Ports "8010,5174"
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

## iPhone microphone note

The local LAN URL is useful for layout and text testing. iPhone Safari still requires HTTPS before it can reliably request microphone access, so voice recording on phone needs an HTTPS tunnel or public deployment.

## Temporary HTTPS phone testing

When the local app is already running, start a temporary Cloudflare HTTPS tunnel:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\start_https_tunnel.ps1 -Port 5174 -Restart
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
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\stop_local_stack.ps1 -Ports "8010,5174"
```
