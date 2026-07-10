# Examiner Victoria V2 Frontend Architecture

This frontend is organized by responsibility. The goal is to keep `App.jsx`
as the screen coordinator instead of a file that owns every UI detail,
session calculation, browser workaround, and export format.

## Directory map

```text
src/
  App.jsx
    Main screen assembly. It wires reducer state, controller actions, browser
    effects, recording/playback hooks, and layout components.

  api.js
    All backend API requests.

  recorder.js
    Browser recording. Uses MediaRecorder compressed audio when available and
    falls back to 16 kHz WAV generation when needed.

  browserSpeechTranscriber.js
    Optional browser-native speech recognition path. It is used as a fast
    transcription accelerator and must always fall back to server Whisper when
    unsupported or unreliable.

  styles.css
    Shared CSS entrypoint. It imports base, header, stage, chat, report, and
    composer partials from styles/.

  styles/
    base.css
      Root variables, page shell, reset rules, and global element defaults.

    header.css
      Brand/header controls, mode selectors, menu controls, and stage summary.

    stage.css
      Stage card, topic/cue-card selectors, prep timer, and progress bar.

    chat.css
      Conversation panel, bubbles, status/error/audio cards, and mobile toast
      base styles.

    report.css
      Final report card, report navigation, section layout, and report actions.

    composer.css
      Fixed bottom composer, text mode, voice mode, timer, and review toggle.

    mobile.css
    Phone responsive layer for compact header, mobile chat spacing,
    fixed composer behavior, narrow-screen adjustments, and iOS-style polish.
    Mobile-only CSS should go here instead of being mixed into styles.css.

  config/
    appConfig.js
      Training modes, practice types, default settings, and storage keys.

  utils/
    browser.js
      Browser and device checks such as iOS Safari detection.

    downloads.js
      Transcript, report, and practice-record export text builders.

    errors.js
      User-friendly error messages.

    format.js
      Time, date, filename, and speech-cache formatting helpers.

    labels.js
      Phase names and busy-state labels.

    sessionView.js
      UI-facing session calculations: stage progress, answer stats,
      stage descriptions, and stage-control visibility.

    sessionStorage.js
      Best-effort localStorage load/save helpers for refresh recovery.

  state/
    initialState.js
      One place for top-level UI/session defaults.

    actions.js
      Named reducer actions and action creators. New state transitions should
      be added here instead of scattered as one-off setters.

    appReducer.js
      Top-level reducer for session, UI, practice/stage, report, health, and
      prep-timer state.

    selectors.js
      Derived view state such as capabilities, stage-card visibility, config
      warning, prep countdown, and message lists.

  hooks/
    useBrowserEffects.js
      Browser-side effects such as auto-scroll, recording timer, prep countdown,
      pagehide cleanup, and frontend-error telemetry.

    useExamController.js
      Session lifecycle, answer submission, scoring/report requests, training
      mode changes, practice-type changes, downloads, and restart actions.

    useAnswerRecording.js
      Microphone recording lifecycle, WAV recorder cleanup, browser-fast
      transcription, server speech-to-text fallback, review-before-send
      behavior, and transcription retry state.

    useSpeechPlayback.js
      TTS playback, speech-blob caching, current-audio cleanup, and the
      iPhone/Safari tap-to-play fallback.

  components/
    layout/
      AnswerComposer.jsx
        Fixed bottom answer input: text mode, voice mode, recording state,
        review toggle, and send controls.

      ChatPanel.jsx
        Main conversation area: messages, busy state, transcription errors,
        pending iOS audio playback, and final report actions.

      ExamHeader.jsx
        Product title, mode selectors, score/export/restart controls,
        and compact session stats.

      ExamStageCard.jsx
        Current stage summary, progress bar, prep timer, and optional
        practice selectors.

      MobileToasts.jsx
        Mobile-friendly floating feedback for errors, busy states, retry,
        and pending iOS audio playback.

      PendingSpeechCard.jsx
        Desktop/tablet tap-to-play fallback when Safari blocks Victoria's
        generated voice from autoplaying.

      StageSummary.jsx
        Compact mobile stage-stat display.

    messages/
      MessageViews.jsx
        Chat bubbles, lightweight Markdown rendering, and report rendering.
```

## Local preview architecture

The local stack is intentionally close to production:

```text
build React frontend -> FastAPI serves frontend dist and /api on one port
```

Use the script in `v2/scripts/run_local_stack.ps1`. The main local URL is:

```text
http://127.0.0.1:5174
```

For same-Wi-Fi phone testing, use the LAN URL printed by the script, for
example:

```text
http://192.168.x.x:5174
```

This avoids running one Vite development server plus one Python API server
for normal testing. It also avoids path-resolution problems caused by Chinese
workspace paths or Windows junctions.

## Where to change common features

- Top-level state defaults: `state/initialState.js`.
- State transitions: `state/actions.js` and `state/appReducer.js`.
- Derived UI decisions: `state/selectors.js`.
- Session lifecycle, answer submission, report generation, restart, and
  downloads: `hooks/useExamController.js`.
- Mobile layout or iOS-style visual polish: `styles/mobile.css`.
- Shared/global layout rules: the focused partials imported by `styles.css`.
- Bottom text or voice input behavior: `components/layout/AnswerComposer.jsx`.
- Conversation rendering, error cards, report card, or chat scroll target: `components/layout/ChatPanel.jsx`.
- Recording, transcription, review-before-send, retry behavior, or transcription
  diagnostics: `hooks/useAnswerRecording.js`.
- Audio container/encoding choice for server fallback uploads: `recorder.js`.
- Browser-native fast transcription behavior: `browserSpeechTranscriber.js`.
- Header buttons, mode selectors, and compact stats: `components/layout/ExamHeader.jsx`.
- Stage card, progress, and practice selectors: `components/layout/ExamStageCard.jsx`.
- Session stats, progress values, and stage visibility rules: `utils/sessionView.js`.
- Error wording: `utils/errors.js`.
- Exported report or transcript format: `utils/downloads.js`.
- Victoria voice playback, TTS cache, or iPhone autoplay fallback: `hooks/useSpeechPlayback.js`.
- Chat bubble or report rendering: `components/messages/MessageViews.jsx`.
- API request paths and payload shapes: `api.js`.

## Guardrails

- `App.jsx` should stay a composition layer. If logic needs branching,
  async work, or repeated state updates, move it into a hook, reducer action,
  selector, or component.
- Components and hooks should not call `fetch()` directly. Add or reuse a
  helper in `api.js` instead.
- Mobile breakpoint CSS belongs in `styles/mobile.css`.
- Keep `useAnswerRecording` and `useSpeechPlayback` reporting changes through
  named callbacks rather than owning broad app state.

## Browser-test anchors

Core interactive elements expose stable `data-testid` attributes such as
`training-mode-select`, `practice-type-select`, `answer-composer`,
`composer-mode-toggle`, `answer-textarea`, `send-answer-button`,
`record-button`, `chat-panel`, `message-user`, and `message-assistant`.
Use these anchors for future browser-level checks instead of relying on visible
button text, which may change as the product copy becomes more polished.

## Mobile audio note

iPhone Safari requires HTTPS for microphone access except on `localhost`.
It also requires a user gesture before audio can autoplay. The frontend should
therefore keep an explicit tap-to-play fallback for Victoria's voice.
