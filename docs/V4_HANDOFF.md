# Examiner Victoria V4 · Coach UI — Handoff

Branch: `v4/coach-ui` (based on `main` @ `5af1cee`). **Nothing is committed
yet**: all changes are in the working tree so the next owner (Codex) can
review the diff, then commit and open a PR to `main` when the owner
authorises it. Nothing has been deployed; CloudBase/Railway settings were
not touched.

## 1. What V4 is

The V3 chat-stream UI is replaced by a screen-based coach flow following
the V2.2 design concept (English UI, ink/paper surfaces, ember mic):

```text
Home → Call → Question (exam) → Marking → Review → [Retake → Review] → next Question … → Recap
```

- **Practice**: each answer shows a review: verdict chips, a **Top fix**
  card, a marked transcript (deletions in rose, insertions in mint with a
  "+", fillers in italic), a natural version, a "Listen" option, and one retake
  of the same question with a before/after comparison (length, hesitations,
  fix #1).
- **Mock**: there is no coaching between questions, and answers go straight to
  the next question. The recap/report is shown at the end.
- **Part 2**: a cue card with a 60 s prep countdown, a 60 s minimum and a 120 s
  maximum, and an auto-stop. The backend's "Please continue" nudge is shown from
  `spoken_text` (`state.nextSpeech`).
- **Errors**: there are cards for mic denied (with WeChat/iOS hints), a silent
  recording and offline (the pending answer is kept and retried
  automatically when the connection returns). There is a non-blocking banner
  when TTS fails (the question is still shown as text).
- **Desktop ≥1024px**: a split view, with the exam on the left and the review
  on the right. Hold Space to talk.
- **Home memo**: "From last time" stores one fix in localStorage after a
  report.

## 2. What was kept (mature V3 mechanisms)

These are unchanged or changed only minimally:

- `recorder.js` (MediaRecorder + WAV fallback) and `audioSilence.js`.
- The browser STT fast path with server Whisper fallback. Only an `onUpdate`
  hook for live captions was added.
- TTS playback/cache and the iOS tap-to-play fallback. `prefetchSpeech` was
  added for the next question.
- The `api.js` request layer, session storage/resume, runtime diagnostics,
  telemetry, downloads, the System check and pagehide cleanup.
- Backend: the Prompt, question bank, scoring, report generation,
  Practice/Mock rules, phase flow, providers, rate limiting, payload limits
  and the Docker/CloudBase contract are **all unchanged**.

## 3. What was removed

The following were removed with `git rm` and are listed in `git status`:

- `frontend/src/components/layout/*`, `components/messages/*`
- The old `styles.css` and `styles/*.css` (base, header, stage, chat,
  report, composer, mobile, diagnostics)
- `state/selectors.js`, `utils/feedbackPlayback.js`
- The guided tour, mobile toasts, the pending-speech card and the stage
  summary
- Tests for those: `adaptive_render_test.js`, `feedback_playback_test.js`,
  the frontend `adaptive_feedback_test.js`, and the `guide_*`/`mobile_recording_*`
  fixtures and tests

## 4. Backend changes (all additive)

| File | Change |
| --- | --- |
| `answer_feedback_service.py` (new) | Deterministic structured feedback with no model call. It builds a difflib word diff between the answer and the natural version, detects hesitations (um/uh/er/erm/hmm/ah/eh plus immediate repeats, except very/really/so) and gives a pace label (<90 slow, >180 fast wpm, audio only). |
| `part1_feedback_service.py` | `Part1Feedback.kind` exposes which feedback branch was used. |
| `engine.py` | `process_answer_detailed()` returns a `ProcessedAnswer`. `process_answer()` is kept as a wrapper returning the same 4-tuple as before. |
| `routes/answer.py` | Adds `feedback`, `answered_question` and `answered_phase` to the response. |
| `schemas.py` | `AnswerCorrection`, `AnswerEdit`, `AnswerHesitation`, `AnswerFeedback`, plus the new optional `AnswerResponse` fields. |
| `ai_provider.py` | Caches one OpenAI client (behind a lock). An optional timeout is applied from `LLM_TIMEOUT_SECONDS`. |
| `core/config.py` | `LLM_TIMEOUT_SECONDS` (default `0` = SDK default, i.e. unchanged behavior) and `TRUST_PROXY_HEADERS` (default `false`). |
| `core/rate_limit.py`, `routes/audio.py` | `client_key(request)` uses X-Forwarded-For/X-Real-IP only when `TRUST_PROXY_HEADERS=true`. |
| `question_bank_service.py`, `routes/health.py` | `QUESTION_BANK_LABEL = "May–Aug candidate recall"` is exposed in practice options. |

### `/api/answer` response — new fields

```jsonc
{
  "session": { ... },              // unchanged
  "assistant_message": { ... },    // unchanged, still canonical text
  "spoken_text": "...",            // unchanged
  "answered_question": "Do you work or are you a student?",
  "answered_phase": "part1",
  "feedback": {
    "mode": "practice",            // "practice" | "mock"
    "coaching": true,              // false for mock and identity phase
    "available": true,             // a correction or tip was produced
    "kind": "correction",          // Part1Feedback.kind, null if unknown
    "correction": { "sentence": "...", "quote": "I am work",
                    "replacement": "I work", "quote_in_answer": true },
    "tip": "...",
    "natural_version": "...",
    "edits": [ { "op": "equal|delete|insert|replace", "text": "...", "replacement": null } ],
    "hesitations": [ { "kind": "filler|repeat", "text": "um", "word_index": 3 } ],
    "hesitation_count": 2,
    "word_count": 41,
    "duration": 18.2,
    "words_per_minute": 135.0,
    "pace": "good"                 // "slow" | "good" | "fast" | null (typed)
  }
}
```

When `coaching=false`, the coaching fields are empty. Old clients ignore the
new fields.

## 5. Frontend map

See `frontend/ARCHITECTURE.md`. The short version:

- `state/appReducer.js` handles all screen transitions.
- `hooks/useExamController.js` handles all async actions.
- `components/screens/*` holds one file per screen.
- `utils/feedbackView.js`, `utils/reportView.js` and `utils/sessionView.js`
  hold the pure view logic, which is unit-tested in `frontend/smoke_test.js`.
- `styles/tokens.css` holds the V2.2 tokens; `styles/app.css` holds the layout.

## 6. How to run locally

With real providers (unchanged from V3):

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\scripts\run_local_stack.ps1 -BackendPort 8010 -FrontendPort 5174 -SkipInstall
```

For UI work without keys, use the fake backend. It patches the LLM, TTS and
STT locally and is never for deployment:

```bash
python scripts/run_fake_backend.py   # :8010, serves frontend/dist too
cd frontend && pnpm dev              # or pnpm build and open :8010
```

The fake LLM returns fixed corrections such as "I very like" → "I really
like", "I am work" → "I work" and "people is" → "people are". Typing those
phrases is the easiest way to see the review screen's marks.

## 7. Test status (at handoff)

| Check | Result |
| --- | --- |
| `python -m backend.answer_feedback_test` | 9 tests OK |
| `python -m backend.smoke_test` | **1 pre-existing failure:** `adaptive_feedback_test.test_refresh_toggle_repeated_answer_and_system_copy`. It reproduces on the untouched `main` @ `5af1cee` (verified via `git archive HEAD`), so it is not caused by V4. It aborts `smoke_test.main()` before the FastAPI checks. With that adaptive block skipped, all FastAPI smoke checks plus the new V4 answer-feedback checks pass. |
| `pnpm run test:smoke` (frontend) | pass |
| `pnpm run build` | pass |
| End-to-end Playwright flow against the fake backend | pass. It covered home → call → exam → recording → marking → review → retake → recap, typed answer, Part 2 prep/speak/review, settings, offline card plus auto-retry, mic denied (WeChat UA), silent recording, desktop split and the home memo. |
| `scripts/check_project.ps1` | **Updated for V4 but not executed** (no PowerShell in the Linux build environment). Please run it on Windows first. |

## 8. Decisions for the owner / next steps for Codex

1. **Fix or re-baseline** the pre-existing adaptive test failure (section 7)
   so that `smoke_test.py` runs end to end.
2. **TTS rate limit.** V4 prefetches the next question, so a fast session can
   reach `TTS_RATE_LIMIT_PER_MINUTE=3` per session. Two 429s appeared in the
   scripted fast flow. These are handled gracefully (voice banner, text
   stays). Recommendation: raise it to about 8. This needs owner approval
   because it is a cost/config change.
3. **`TRUST_PROXY_HEADERS`.** Enable it on CloudBase only after confirming
   that the gateway overwrites X-Forwarded-For. The default stays `false`.
4. **`LLM_TIMEOUT_SECONDS`.** The default `0` keeps the SDK behavior. Consider
   20–30 s so that the marking screen fails fast instead of hanging.
5. **Marking latency.** `/api/answer` is still one blocking call. A streaming
   or split endpoint (transcript first, feedback second) would make the
   marking screen honest. This is not done because it changes the API flow.
6. **Band estimate display.** The recap shows the report's band if it is
   present. Decide whether Practice should show a band at all.
7. **Backend copy.** Some backend strings still say "Tap **Score**…" (V3 UI
   wording). They are stripped/ignored by the V4 UI. Changing them touches
   Prompt/flow copy, so it needs authorisation.
8. **Pronunciation** is shown as "Can't be judged from text." There is still
   no acoustic scoring (by design).
9. **STT-suspect marks** (amber "not heard") are styled, but the backend does
   not yet return word confidence.
10. **Season / "new" tags** for topics need data from the question bank. Only
    the `QUESTION_BANK_LABEL` is exposed for now.
11. **Visual placeholders.** The Victoria avatar is a monogram gradient and the
    waveform is decorative only (it is not driven by audio levels).
12. **TTS text** is cut at 280 characters on a sentence end (`fitForSpeech`)
    to stay under `TTS_MAX_TEXT_CHARS=300`.
13. **`render.yaml`** is kept untouched (it is referenced by
    `check_deploy_config.ps1`, `prepare_public_deploy_bundle.ps1` and
    `docs/DEPLOYMENT.md`). Remove it in a separate deploy-tooling task if it
    is no longer needed.
14. There is no lint configuration in `frontend/`. Consider adding ESLint
    before more contributors join.

## 9. Suggested commit / PR

```text
feat(v4): coach UI with structured answer feedback

- frontend: screen-based coach flow (call/exam/marking/review/retake/recap),
  V2.2 tokens, error cards, desktop split, hold-to-talk
- backend: additive `feedback` object on /api/answer (deterministic),
  cached LLM client, optional LLM timeout, opt-in proxy-aware rate-limit key
- remove V3 chat-layout components, styles and their tests
- scripts: V4 check_project rules, local fake backend for UI work
```

Open the PR against `main`. Merge only after review and explicit
authorisation (see `AGENTS.md`).
