# F-015: tap feedback text to listen

Local implementation date: 2026-10-17. Branch: `feat/feedback-text-playback`.

## Interaction

- Practice mode: tap the Quick correction, Better expression or Natural version text block to listen.
- No permanent audio button or idle playback label next to feedback text.
- A first-use tip disappears after the first tap; dismissal is remembered in local storage.
- Tap the active text again to stop or cancel. If browser playback permission is needed, tap the same text again to start the ready audio.
- Feedback playback remains available when automatic examiner voice is switched off.
- Recording or pending answer processing disables feedback taps.
- Requests use the existing TTS endpoint/cache. A stopped or superseded request cannot start playback after its response arrives.
- The next examiner question is excluded from feedback text extraction. Mock presentation, Prompt and backend providers are unchanged.

## Local verification

- Project checks: Python compilation, question-bank validation, FastAPI smoke tests, deployment configuration, frontend smoke tests and production build passed using the project `.venv` Python.
- Added feedback parsing checks for correction, expression, multiline quoted natural version, CRLF, missing quote and exclusion of the next question. Included in the existing frontend smoke test.
- Added deterministic audio-hook regression checks with a delayed iOS-style unlock promise. Manual playback starts the unlock after cleanup and waits for it without interrupting it; stopping or switching blocks invalidates stale continuations. Tests cover Natural version body-only speech, automatic sound disabled, cache reuse, completion cleanup and blocked-playback retry.
- Browser regression ran against the local frontend with synthetic session data, intercepted API responses and a mocked Audio element. Verified tap, stop, manual playback with automatic audio disabled, cache reuse, superseded-request cancellation, end-state cleanup, browser-blocked playback recovery, hint persistence and provider failure recovery.
- Inspected a 390 x 844 mobile layout before playback and during playback.
- Browser simulation does not establish real audio quality or iPhone/WeChat acceptance. Real-device validation and production deployment remain pending.

## Device follow-up

1. On iPhone Safari and WeChat, tap correction/expression/natural text and verify audible output matches the selected block.
2. Stop while loading, switch between blocks and start recording; verify no delayed audio interrupts recording.
3. Disable automatic examiner voice and verify explicit feedback taps still work.
4. Refresh after the first tap and verify the tip remains dismissed.

## Later hosting review

The owner reports long waits when opening the CloudBase deployment and wants to consider another host later. No hosting settings were changed in this task. A follow-up should measure initial document/static-resource load, health/session startup, STT, LLM and TTS timings separately before selecting a replacement. The current observation alone does not identify the bottleneck.

## 2026-10-27 focused Part 1 follow-up

The historical notes above describe F-015 at its initial implementation. Focused Practice Part 1 now uses only **Quick correction** and **Natural version** as visible feedback labels. A safe full rewrite appears under Natural version; without a safe rewrite, no separate expression tip is shown. Legacy Better expression and Natural version content in older sessions and other Practice parts remains playable. The playback hint stays visible when playable feedback is present, instead of being dismissed permanently after one tap. This follow-up changes neither automatic speech nor Mock presentation.
