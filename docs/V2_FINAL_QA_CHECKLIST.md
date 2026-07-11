# Examiner Victoria V2 Final QA Checklist

This checklist is for the final V2 manual regression pass after the Mock Mode and Part 3 hybrid-questioning work. Do not record private user answers, audio, screenshots with names, or secrets in this file.

## 1. Setup

- [ ] Confirm the tested build is from the expected Git commit.
- [ ] Confirm `.env` files are local only and not committed.
- [ ] Confirm Railway, GitHub, and local URLs are not mixed during one test pass.
- [ ] Run the deterministic local checks before manual mobile testing.

## 2. Practice Mode Regression

- [ ] Practice Mode still shows the full chat stream.
- [ ] Practice Mode still shows user transcripts after audio transcription.
- [ ] Practice Mode still shows per-turn quick correction, better expression, and natural answer.
- [ ] Practice Mode still supports text answers.
- [ ] Practice Mode still supports tap-to-record voice answers.
- [ ] Victoria voice playback still works after the first user unlock tap.
- [ ] Final report, transcript download, and practice record download still work.

## 3. Mock / Exam Mode

- [ ] Mock Mode starts without showing the full chat stream as the main interface.
- [ ] Part 1 uses a voice-first exam card, replay control, stage/progress, and recording state.
- [ ] Part 1 does not show full user transcript or immediate per-turn correction during the mock.
- [ ] Part 2 still shows the Cue Card / task text.
- [ ] Part 2 still shows the preparation timer.
- [ ] Part 2 answer stage supports continuous voice recording.
- [ ] Part 3 returns to voice-first discussion rather than the full Practice chat stream.
- [ ] Mock completion still allows report and transcript review after the test.

## 4. Part 3 Hybrid Questioning

- [ ] The first Part 3 question comes from the selected cue-card question bank.
- [ ] A meaningful answer can trigger one answer-driven follow-up.
- [ ] Dynamic follow-ups do not appear twice in a row.
- [ ] After one dynamic follow-up, the next question returns to the question-bank backbone or fallback.
- [ ] Short or empty answers fall back to the question bank or a safe generic question.
- [ ] Provider failure, empty output, duplicate output, or invalid output falls back safely.
- [ ] Part 3 questions stay analytical and suitable for IELTS Part 3.

## 5. Mobile Regression

- [ ] iPhone Safari: chat and mock cards scroll naturally.
- [ ] iPhone Safari: latest visible content is not hidden behind the composer.
- [ ] WeChat in-app browser: Part 1 Mock Mode remains usable.
- [ ] WeChat in-app browser: Part 3 follow-ups do not lock the scroll container.
- [ ] Android browser: recording, transcription, and replay controls remain usable.

## 6. Product Boundary Checks

- [ ] The UI and report do not claim formal acoustic pronunciation scoring.
- [ ] Mock Mode does not claim to be full-duplex live voice.
- [ ] User answers, transcripts, audio, and feedback remain private unless explicitly exported by the user.

## 7. Known Manual Observations

Record only anonymous, non-sensitive notes here during a QA pass.

- Observation 1:
- Observation 2:
- Observation 3:
