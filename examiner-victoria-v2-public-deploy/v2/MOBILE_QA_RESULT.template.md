# Examiner Victoria V2 Mobile QA Result

Copy this file to `v2/MOBILE_QA_RESULT.md` after a real-device test, then fill
in the result. Do not mark V2 ready to replace Streamlit until this file shows a
passing phone loop.

## Test metadata

- Date:
- Tester:
- Device:
- OS version:
- Browser:
- Test URL:
- Network:

## Preflight

- [ ] Local preview passes:

  ```powershell
  powershell.exe -ExecutionPolicy Bypass -File .\v2\scripts\check_local_preview.ps1 -Port 5174 -UseSavedTunnel
  ```

- [ ] HTTPS URL opens on phone.
- [ ] API key is configured in backend health output.

## Layout

- [ ] Header is compact enough.
- [ ] Practice / Mock selector is visible.
- [ ] Full / Part 1 / Part 2 / Part 3 selector is visible.
- [ ] Sound / Score / Export / Restart controls do not overlap.
- [ ] Current stage, answer count, WPM, and timer are readable.
- [ ] Chat bubbles fit within the screen width.
- [ ] Bottom composer stays fixed and does not cover the latest prompt.

Notes:

```text

```

## Text loop

- [ ] Tap Text.
- [ ] Type an answer.
- [ ] Send answer.
- [ ] User answer appears.
- [ ] Victoria asks the next question.
- [ ] Composer is ready for the next turn.

Notes:

```text

```

## Voice loop

- [ ] Tap once to start recording.
- [ ] Microphone permission appears when needed.
- [ ] Tap again to stop and send.
- [ ] Transcription appears as user answer.
- [ ] Victoria asks the next question.
- [ ] Composer resets for the next turn.
- [ ] If transcription fails, text fallback still works.

Notes:

```text

```

## Victoria voice

- [ ] First iPhone/Safari tap-to-play prompt is understandable.
- [ ] Victoria voice plays after user gesture.
- [ ] Repeated prompts do not require confusing repeated permission steps.
- [ ] Sound off prevents playback.

Notes:

```text

```

## IELTS flow

- [ ] Part 1 starts clearly.
- [ ] Practice mode continues after feedback.
- [ ] Mock mode is available.
- [ ] Part 2 shows one cue card.
- [ ] Part 3 asks one follow-up at a time.
- [ ] Score produces a report.
- [ ] Export works or fails with an understandable browser limitation.

Notes:

```text

```

## Final decision

Choose one:

- [ ] Pass: V2 mobile loop is acceptable for private beta.
- [ ] Partial pass: text loop is acceptable, voice loop needs more work.
- [ ] Fail: do not share V2 yet.

Summary:

```text

```

