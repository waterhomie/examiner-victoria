# Practice UI hierarchy

## Changes

- Reduce the desktop brand size and keep its title on one line; allow controls to wrap on narrower desktop widths.
- Keep export and restart in More. Keep mid-session score access in More and expose the desktop score action after completion.
- Separate the next question from playable feedback using spacing, a divider and modest font weight.
- Add a microphone icon and an enabled-state color to the Voice input-mode switch. It still selects voice input rather than immediately starting a recording.
- Leave feedback generation, scoring, provider behavior and Practice/Mock flow unchanged.
- Soften candidate-answer bubbles to a light coral surface with dark text while retaining the existing avatar and primary-action colors.
- Give both feedback playback rows consistent hover, keyboard-focus and loading/playing states, with matching accessible pressed labels.
- Explain the available feedback labels once, beside the first playable Practice feedback. The note also explains that both are not required every time and that tapping the text plays or stops audio. Practice tour copy previews this without making a user finish a sample answer under the tour overlay.

## Validation

- Automated rendered-component coverage: secondary actions remain accessible, score is promoted after completion, Voice has an icon, and only questions following feedback receive a divider.
- Playback render checks cover the loading and playing labels and visual-state classes.
- Run frontend smoke tests, production build and git diff check.
- Real browser checks remain pending: desktop and phone layout, long questions, More actions, keyboard focus, guide positioning, recording and feedback playback.
- No new first-time-user validation is claimed. No deployment is included.
