export function StageSummary({
  currentPhase,
  isPracticeMode,
  session,
  sessionStats,
  stageProgress,
  wide = false,
}) {
  return (
    <div
      className={`mobile-stage-summary${wide ? " mobile-stage-summary-wide" : ""}`}
      aria-label="Current IELTS practice status"
    >
      <div className="mobile-stage-row">
        <div className="stage-line">
          <span className="stage-pill">{currentPhase}</span>
          <span className={`training-pill ${isPracticeMode ? "practice" : "mock"}`}>
            {isPracticeMode ? "Practice" : "Mock"}
          </span>
        </div>
        {session ? (
          <div className="mobile-stats" aria-label="Current practice summary">
            <strong>{sessionStats.answered}</strong> ans
            <span>&middot;</span>
            <strong>{sessionStats.averageWpm}</strong> WPM
            <span>&middot;</span>
            <strong>{sessionStats.totalDuration}</strong>
          </div>
        ) : null}
      </div>
      <div className="progress-track">
        <div style={{ width: `${stageProgress}%` }} />
      </div>
    </div>
  );
}
