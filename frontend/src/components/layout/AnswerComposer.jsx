export function AnswerComposer({
  beginRetake,
  busy,
  cancelRecording,
  canAnswer,
  discardReviewedDraft,
  draft,
  elapsed,
  formatDuration,
  handleTextComposerKeyDown,
  mode,
  keepPreviousDraft,
  onDraftChange,
  onModeToggle,
  onReviewBeforeSendChange,
  recordButtonDisabled,
  recordButtonText,
  recording,
  replacementDraft,
  requestReport,
  reviewBeforeSend,
  reviewedRecording,
  session,
  submitTypedAnswer,
  toggleRecording,
  useReplacementDraft,
}) {
  return (
    <footer className="composer-wrap" data-testid="answer-composer">
      {mode === "text" && reviewedRecording && draft.trim() ? (
        <div className="recording-review" data-testid="recording-review">
          {replacementDraft ? (
            <>
              <span>A new take is ready. Keep your current answer or replace it before sending.</span>
              <button type="button" onClick={keepPreviousDraft}>Keep previous</button>
              <button type="button" onClick={useReplacementDraft}>Use new take</button>
            </>
          ) : (
            <>
              <span>Review your answer before sending.</span>
              <button type="button" onClick={beginRetake}>Record again</button>
              <button type="button" onClick={discardReviewedDraft}>Discard</button>
            </>
          )}
        </div>
      ) : null}
      <div className="composer" data-tour-target="answer">
        <button
          className="mode-button"
          type="button"
          data-testid="composer-mode-toggle"
          disabled={Boolean(busy) || recording || !session?.test_active}
          onClick={onModeToggle}
          aria-label={mode === "voice" ? "Switch to text input" : "Switch to voice input"}
        >
          {mode === "voice" ? "Text" : <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" /></svg><span>Voice</span></>}
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
              aria-label={recording ? reviewBeforeSend ? "Stop recording and review" : "Stop recording and send" : "Start recording"}
            >
              {recordButtonText}
            </button>
            <span className="timer">{recording ? formatDuration(elapsed) : "ready"}</span>
            {recording ? <button className="cancel-recording" type="button" onClick={cancelRecording} data-testid="cancel-recording-button">Cancel</button> : null}
            <label className="review-toggle">
              <input
                data-testid="review-before-send-checkbox"
                type="checkbox"
                checked={reviewBeforeSend}
                onChange={(event) => onReviewBeforeSendChange(event.target.checked)}
              />
              <span>review before send</span>
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
              onChange={(event) => onDraftChange(event.target.value)}
              onKeyDown={handleTextComposerKeyDown}
            />
            <button type="submit" disabled={!draft.trim() || Boolean(busy) || Boolean(replacementDraft)} data-testid="send-answer-button">
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
