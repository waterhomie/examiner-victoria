# Examiner Victoria V2 Change Checklist

Use this checklist after every meaningful V2 change. The goal is to avoid the
old pattern where one side of the app works while another side quietly breaks.

## 1. Automated checks

Run from the repository root:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_v2.ps1 -SkipInstall
```

This checks:

- V2 structure guardrails: required modules exist, `App.jsx` and `engine.py`
  stay coordinator-sized, mobile breakpoint CSS stays in `styles/mobile.css`,
  and style import order is correct.
- Python compile for backend modules.
- PowerShell parse for helper scripts.
- Question-bank counts.
- FastAPI smoke test, including Full flow progression, focused Part 1/2/3
  practice starts and completion, Mock-mode start, provider-error fallback,
  report generation, and rate limiting.
- Frontend production build.
- Production `dist/index.html` uses bundled assets, not Vite dev files.
- Source files do not contain long `sk-...` style API keys.

Expected final line:

```text
All V2 checks passed.
```

The smoke test intentionally simulates transcription/TTS provider failures, so
you may see provider-failure log lines. That is acceptable if the final check
still passes.

## 2. Local desktop check

Start the local fullstack preview:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\run_local_stack.ps1 -BackendPort 8010 -FrontendPort 5174 -SkipInstall
```

Open:

```text
http://127.0.0.1:5174
```

Check:

- Page loads without a blank screen.
- Practice and Mock modes are both visible.
- Full, Part 1, Part 2, and Part 3 practice types are selectable.
- Text input can send an answer.
- Score, Export, Restart still appear when expected.
- `/api/health` returns `ok`.

You can also run the local preview preflight:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_local_preview.ps1 -Port 5174
```

If you want the script to also send one text answer through the API, add
`-CoreApiFlow`. That may call the configured model provider.

## 3. Phone layout check

Use the LAN URL printed by the start script, for example:

```text
http://192.168.x.x:5174
```

Check:

- Top card is compact and buttons do not overlap.
- Current stage and WPM/timer stats are readable.
- Chat bubbles fit within the screen width.
- Bottom composer stays fixed and does not cover the current answer.
- Text mode works.

For microphone testing on iPhone Safari or WeChat, use an HTTPS tunnel or a
public deployment. iPhone Safari does not reliably allow microphone access from
plain LAN HTTP pages.

After starting the tunnel, check both local and HTTPS preview URLs:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_local_preview.ps1 -Port 5174 -UseSavedTunnel
```

## 4. Voice-flow check

When HTTPS or public deployment is available:

- Tap once to start recording.
- Tap again to stop and send.
- The composer resets for the next question.
- Transcription errors fall back to text mode without exposing provider details.
- Victoria's voice uses the iPhone tap-to-play fallback when needed.

## 5. IELTS-flow check

Run at least one short flow:

```text
Identity -> Part 1 -> Part 2 cue card -> Part 2 follow-up -> Part 3 -> Score
```

Check:

- Part 1 starts clearly.
- Part 2 shows one cue card.
- Part 3 asks one dynamic follow-up at a time.
- Part 3 stops at the configured maximum.
- The final report does not include a generic seven-day plan.
- The report uses only evidence from saved answers and timing data.
