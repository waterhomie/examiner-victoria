import { PendingSpeechCard } from "./PendingSpeechCard.jsx";
import { MessageBubble, ReportView } from "../messages/MessageViews.jsx";

function MockExamCard({ mockExam, onReplayQuestion }) {
  if (!mockExam) return null;
  return (
    <section className="mock-exam-card" data-testid="mock-exam-card">
      <div>
        <span className="mock-exam-eyebrow">Mock exam</span>
        <h2>{mockExam.title}</h2>
        <p>{mockExam.instruction}</p>
      </div>
      {mockExam.active ? (
        <div className="mock-exam-actions">
          <button type="button" className="ghost-button" onClick={onReplayQuestion} data-testid="replay-question-button">
            Replay question
          </button>
          {mockExam.showQuestionFallback ? (
            <details className="mock-question-fallback" data-testid="mock-question-fallback">
              <summary>Question text fallback</summary>
              <p>{mockExam.currentQuestion}</p>
            </details>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

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
  mockExam,
  pendingSpeechUrl,
  playPendingSpeech,
  replayCurrentQuestion,
  report,
  retryLastRecording,
  shortScrollSlackRef,
}) {
  return (
    <main className="chat-panel" ref={chatPanelRef} data-testid="chat-panel">
      <MockExamCard mockExam={mockExam} onReplayQuestion={replayCurrentQuestion} />

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

      <div className="chat-bottom-anchor" ref={bottomRef} data-testid="chat-bottom-anchor" aria-hidden="true" />
      <div className="chat-scroll-slack" ref={shortScrollSlackRef} data-testid="chat-scroll-slack" aria-hidden="true" />
    </main>
  );
}
