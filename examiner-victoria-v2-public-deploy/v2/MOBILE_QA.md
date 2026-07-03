# Examiner Victoria V2 Mobile QA

Use this file when testing the phone-first experience. The goal is to verify the
same product loop a learner would actually use: open the app, hear Victoria,
answer by voice or text, receive feedback, and continue to the next question.

## 1. Start local fullstack preview

From the project root:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\run_local_stack.ps1 -BackendPort 8010 -FrontendPort 5174 -SkipInstall
```

Desktop check:

```text
http://127.0.0.1:5174
```

## 2. Start HTTPS phone link

iPhone Safari and WeChat need HTTPS for microphone access. After the local app
is running:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\start_https_tunnel.ps1 -Port 5174 -Restart -Protocol http2
```

Open the printed `https://...trycloudflare.com` URL on the phone. If the script
does not print clearly, read:

```text
tmp/v2_tunnel_url.txt
```

Before opening it on the phone, preflight the local and HTTPS URLs from the
computer:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_local_preview.ps1 -Port 5174 -UseSavedTunnel
```

## 3. Required phone checks

### Layout

- Header is compact enough for one-handed phone use.
- Practice / Mock selector is visible.
- Full / Part 1 / Part 2 / Part 3 selector is visible.
- Sound, Score, Export, and Restart controls do not overlap.
- Current stage, answer count, WPM, and timer are readable.
- Chat bubbles stay inside the screen width.
- Bottom composer stays fixed and does not cover the latest prompt.

### Text loop

- Tap `Text`.
- Type an answer.
- Send it.
- The user answer appears as a red/right-side bubble.
- Victoria responds with the next IELTS question.
- The composer is ready for the next turn.

### Voice loop

- Tap once to start recording.
- Browser asks for microphone permission if it has not already been granted.
- Tap again to stop and send.
- Transcription appears as the user answer.
- The composer resets for the next question.
- If transcription fails, the app shows a user-safe message and text mode still works.
- For speed diagnosis, inspect `window.__victoriaLastTranscription` from a
  remote browser console. `source: "browser"` means native browser speech
  recognition was used. `source: "server"` means the app fell back to uploaded
  audio plus Whisper/GPTsAPI. Compare `serverElapsedMs` with `serverTotalMs` to
  separate provider time from upload/tunnel time.

### Victoria voice

- On iPhone Safari, first playback may need one explicit tap because of Apple
  autoplay rules.
- After that, Victoria's voice should be reusable without repeatedly confusing
  the user.
- If sound is off, no voice playback should start.

### IELTS flow

- Part 1 starts clearly.
- Practice mode gives feedback and then continues.
- Mock mode should feel more exam-like and less interruptive.
- Part 2 shows one cue card.
- Part 3 asks one follow-up at a time and uses the previous answer when possible.
- Score produces a report.
- Export downloads transcript/report/practice record when available.

## 4. Pass/fail rule

V2 can replace the Streamlit link only after:

- desktop check passes,
- iPhone Safari voice loop passes,
- WeChat in-app browser opens the app and at least text mode works,
- one full IELTS flow reaches Score,
- and the backend is deployed with API keys kept server-side only.

Until then, keep Streamlit as the public stable fallback.

After a real-device test, copy the result template and fill it in:

```powershell
Copy-Item .\v2\MOBILE_QA_RESULT.template.md .\v2\MOBILE_QA_RESULT.md
```

Use the filled `v2/MOBILE_QA_RESULT.md` as the release-readiness evidence.

Then validate the filled result:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_mobile_qa_result.ps1
```

If you intentionally accept a text-only/private test where voice still needs
work, use:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_mobile_qa_result.ps1 -AllowPartial
```

## 5. Automation note

For browser-level checks, prefer stable `data-testid` anchors over visible text.
Key anchors include:

- `training-mode-select`
- `practice-type-select`
- `answer-composer`
- `composer-mode-toggle`
- `answer-textarea`
- `send-answer-button`
- `record-button`
- `chat-panel`
- `message-user`
- `message-assistant`
