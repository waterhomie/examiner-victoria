export function AnswerComposer({
  busy,
  canAnswer,
  draft,
  elapsed,
  formatDuration,
  handleTextComposerKeyDown,
  mode,
  recordButtonDisabled,
  recordButtonText,
  recording,
  requestReport,
  reviewBeforeSend,
  session,
  setDraft,
  setMode,
  setReviewBeforeSend,
  submitTypedAnswer,
  toggleRecording,
}) {
  return (
    <footer className="composer-wrap" data-testid="answer-composer">
      <div className="composer">
        <button
          className="mode-button"
          type="button"
          data-testid="composer-mode-toggle"
          disabled={Boolean(busy) || recording || !session?.test_active}
          onClick={() => setMode((value) => (value === "voice" ? "text" : "voice"))}
          aria-label={mode === "voice" ? "Switch to text input" : "Switch to voice input"}
        >
          {mode === "voice" ? "Text" : "Voice"}
        </button>

        {mode === "voice" ? (
          <div className="voice-composer">
            <button
              className={`record-button ${recording ? "recording" : ""}`}
              type="button"
              data-testid="record-button"
              disabled={recordButtonDisabled}
              onClick={toggleRecording}
              aria-pressed={recording}
              aria-label={recording ? "Stop recording and send" : "Start recording"}
            >
              {recordButtonText}
            </button>
            <span className="timer">{recording ? formatDuration(elapsed) : "ready"}</span>
            <label className="review-toggle">
              <input
                data-testid="review-before-send-checkbox"
                type="checkbox"
                checked={reviewBeforeSend}
                onChange={(event) => setReviewBeforeSend(event.target.checked)}
              />
              <span>review</span>
            </label>
          </div>
        ) : (
          <form className="text-composer" onSubmit={submitTypedAnswer} data-testid="text-composer">
            <textarea
              data-testid="answer-textarea"
              value={draft}
              disabled={!canAnswer && !draft}
              placeholder="Type your answer..."
              autoComplete="off"
              rows={1}
              aria-label="Type your answer. Press Enter to send, Shift Enter for a new line."
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleTextComposerKeyDown}
            />
            <button type="submit" disabled={!draft.trim() || Boolean(busy)} data-testid="send-answer-button">
              Send
            </button>
          </form>
        )}

        {session?.phase === "complete" ? (
          <button
            className="score-button"
            type="button"
            onClick={requestReport}
            disabled={Boolean(busy)}
            data-testid="complete-score-button"
          >
            Get Score
          </button>
        ) : null}
      </div>
    </footer>
  );
}
