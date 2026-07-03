export function MobileToasts({
  busy,
  busyLabel,
  canRetryRecording,
  error,
  pendingSpeechUrl,
  playPendingSpeech,
  retryLastRecording,
}) {
  if (!busy && !error && !pendingSpeechUrl) return null;

  return (
    <div className="mobile-toast-stack" aria-live="polite">
      {busy ? (
        <div className="mobile-toast mobile-toast-info">
          <span className="spinner" />
          <span>{busyLabel(busy)}</span>
        </div>
      ) : null}

      {error ? (
        <div className="mobile-toast mobile-toast-error">
          <span>{error}</span>
          {canRetryRecording ? (
            <button type="button" onClick={retryLastRecording} disabled={Boolean(busy)}>
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      {pendingSpeechUrl ? (
        <div className="mobile-toast mobile-toast-audio">
          <div>
            <strong>Victoria's voice is ready</strong>
            <span>Tap once to play.</span>
          </div>
          <button type="button" onClick={playPendingSpeech}>
            Play
          </button>
        </div>
      ) : null}
    </div>
  );
}
