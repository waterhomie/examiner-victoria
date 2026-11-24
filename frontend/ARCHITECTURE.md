# Examiner Victoria Frontend Architecture (V4 · coach UI)

V4 replaces the V3 chat-stream layout with a **screen-based coach flow**.
`App.jsx` stays a coordinator: it picks the current screen from reducer
state, wires controller actions, and owns no UI detail.

```text
home ──► call ──► exam ──► marking ──► review ──► (retake ──► review) ──► exam … ──► recap
                    │                                                         ▲
                    └──────────── Mock: exam ──► exam ──► … ──────────────────┘
```

- **Practice**: every answer goes through `marking` → `review` (Top fix,
  marked transcript, natural version, optional retake).
- **Mock**: answers go straight to the next question; no coaching until the
  `recap` screen (report).
- Error states render as cards on top of the current screen (`mic`,
  `silent`, `offline`) or as a non-blocking banner (`voice`).
- Desktop (≥1024px, `DESKTOP_QUERY`) renders a split view: exam on the left,
  review on the right; hold **Space** to talk.

## Directory map

```text
frontend/src/
  App.jsx                 Screen coordinator, desktop split, offline auto-retry,
                          snapshot persistence/resume. Keep under 360 lines.
  main.jsx                Imports styles/tokens.css then styles/app.css.
  api.js                  The only place that calls fetch().
  recorder.js             MediaRecorder / 16 kHz WAV fallback (unchanged from V3).
  browserSpeechTranscriber.js
                          Browser SpeechRecognition fast path, `onUpdate` feeds
                          live captions. Always falls back to server Whisper.

  config/appConfig.js     Storage keys, training modes, practice types,
                          Part 2 timings, DESKTOP_QUERY.

  state/
    initialState.js       SCREENS + defaults (turns, marking, retake,
                          pendingAnswer, nextSpeech …).
    actions.js            ACTIONS + action creators.
    appReducer.js         All screen transitions. Practice → marking, Mock →
                          next exam question, completed → recap, offline keeps
                          pendingAnswer, retake never advances the session.

  hooks/
    useExamController.js  startCall, submitAnswer (prefetches next TTS),
                          retryPending/discardPending, goNext, replay, listen,
                          start/finish/cancelRetake, requestReport, endSession,
                          downloads.
    useAnswerRecording.js start/stop/toggle/retryLast, liveCaption, auto-stop
                          at maxSeconds, transcription fallback.
    useSpeechPlayback.js  TTS playback, cache, prefetchSpeech, iOS tap fallback.
    useBrowserEffects.js  Timers, prep countdown, pagehide, error telemetry,
                          useMediaQuery, useOnlineStatus, useHoldToTalk.

  components/
    ui.jsx                Small primitives (buttons, chips, avatar, dots…).
    ErrorCard.jsx         mic / silent / offline cards + VoiceBanner.
    Sheets.jsx            TypeSheet (typed answer), SettingsSheet.
    SystemCheck.jsx       Mic + speaker check.
    TranscriptSheet.jsx   Full transcript.
    screens/
      HomeScreen.jsx      Mode/type/topic pick, "From last time" memo, resume.
      CallScreen.jsx      Incoming-call style start (user gesture for audio).
      ExamScreen.jsx      Ink "speaking moment": question, mic, live captions,
                          Part 2 cue card + prep timer.
      MarkingScreen.jsx   Short marking steps while /answer resolves.
      ReviewScreen.jsx    Paper "review moment": Top fix, marked transcript,
                          natural version. Exports FixCard and ReviewBody.
      RetakeScreen.jsx    One retake of the same question + comparison.
      RecapScreen.jsx     Report: one thing to fix, criteria, tasks.

  utils/
    sessionView.js        Question display, speakable text (fitForSpeech 280),
                          cue card parsing, progress, clock, greeting.
    feedbackView.js       Verdict chips, transcript segments from `feedback.edits`
                          and `feedback.hesitations`, topFix, compareRetake.
    reportView.js         parseReport (band, oneThing, criteria, tasks…).
    memo.js               "From last time" memo in localStorage.
    errors.js             ERROR_KINDS + V4 copy + transcriptionRecovery.
    downloads.js, format.js, browser.js, labels.js, sessionStorage.js,
    runtimeDiagnostics.js, audioSilence.js
                          Kept from V3.

  styles/
    tokens.css            V2.2 colour tokens (--ev-*), type, radius, safe area.
    app.css               All V4 layout. Honours prefers-reduced-motion.
```

## Colour rules (V2.2)

| Token | Meaning — use for nothing else |
| --- | --- |
| `--ev-ink` / `--ev-paper` | speaking moment / review moment surfaces |
| `--ev-ember-1→2` | the mic button and "current" only |
| `--ev-rose` | deletion / issue |
| `--ev-mint` | insertion (always with a "+") / correct |
| `--ev-amber` | uncertain / not heard |
| `--ev-indigo` | listen / expandable |
| `--ev-neutral`, `--ev-filler` | descriptive, no judgement; fillers in italic |

Content text (questions, transcripts) uses `--ev-serif`. UI copy is English,
B1-level, British spelling.

## Backend contract used by the review screen

`POST /api/answer` now returns `feedback` (see `backend/schemas.py`
`AnswerFeedback`). The review screen only renders from this structured
object; it does **not** parse Markdown from `assistant_message` anymore.
`assistant_message` and `spoken_text` are still returned and used for Mock
mode and for the next question audio.

## Guardrails

- No `fetch()` outside `api.js` (checked by `scripts/check_project.ps1`).
- No V3 chat-layout paths (`components/layout`, `components/messages`,
  `styles.css`, `styles/mobile.css`, `state/selectors.js`).
- New transitions go through `actions.js` + `appReducer.js`.
- `useAnswerRecording` / `useSpeechPlayback` report via callbacks.

## Browser-test anchors

`home-screen`, `start-button`, `call-screen`, `call-button`, `exam-screen`,
`question-text`, `mic-button`, `live-captions`, `marking-screen`,
`review-screen`, `top-fix`, `retake-button`, `retake-screen`, `recap-screen`,
`type-input`, `type-send`, `voice-banner`, `next-button`, `memo`,
`resume-session`, `open-settings`, `system-check`.
The production bundle is checked for the core subset.

## Mobile audio note

iPhone Safari needs HTTPS for the mic (except `localhost`) and a user gesture
before audio. The call screen's "Answer" button is that gesture; the iOS
tap-to-play fallback in `useSpeechPlayback` is kept.
