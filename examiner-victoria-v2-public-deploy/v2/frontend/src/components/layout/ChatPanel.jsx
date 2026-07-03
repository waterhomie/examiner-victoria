import { PendingSpeechCard } from "./PendingSpeechCard.jsx";
import { MessageBubble, ReportView } from "../messages/MessageViews.jsx";

export function ChatPanel({
  bottomRef,
  busy,
  busyLabel,
  canRetryRecording,
  chatPanelRef,
  configWarning,
  downloadPracticeRecord,
  downloadReport,
  downloadTranscript,
  error,
  messages,
  pendingSpeechUrl,
  playPendingSpeech,
  report,
  retryLastRecording,
}) {
  return (
    <main className="chat-panel" ref={chatPanelRef} data-testid="chat-panel">
      {messages.map((message, index) => (
        <MessageBubble key={`${message.role}-${index}`} message={message} />
      ))}

      {busy ? (
        <div className="status-card" data-testid="busy-status-card">
          <span className="spinner" />
          {busyLabel(busy)}
        </div>
      ) : null}

      {error ? (
        <div className="error-card" data-testid="error-card">
          <span>{error}</span>
          {canRetryRecording ? (
            <button type="button" onClick={retryLastRecording} disabled={Boolean(busy)} data-testid="retry-transcription-button">
              Retry transcription
            </button>
          ) : null}
        </div>
      ) : null}

      {pendingSpeechUrl ? <PendingSpeechCard onPlay={playPendingSpeech} /> : null}

      {configWarning ? <div className="notice-card" data-testid="config-warning-card">{configWarning}</div> : null}

      {report ? (
        <section className="report-card" data-testid="report-card">
          <h2>Final report</h2>
          <ReportView report={report} />
          <div className="report-actions">
            <button type="button" className="ghost-button" onClick={downloadReport} data-testid="download-report-button">
              Download report
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={downloadTranscript}
              data-testid="download-transcript-button"
            >
              Download transcript
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={downloadPracticeRecord}
              data-testid="download-practice-record-button"
            >
              Download practice record
            </button>
          </div>
        </section>
      ) : null}

      <div ref={bottomRef} />
    </main>
  );
}
