import { StageSummary } from "./StageSummary.jsx";

export function ExamHeader({
  audioEnabled,
  busy,
  canExportRecord,
  canScoreNow,
  changePracticeType,
  changeTrainingMode,
  createFreshSession,
  currentPhase,
  downloadPracticeRecord,
  isPracticeMode,
  practiceType,
  practiceTypes,
  recording,
  requestReport,
  session,
  sessionStats,
  stageProgress,
  toggleAudioEnabled,
  trainingMode,
  trainingModes,
}) {
  const controlsDisabled = Boolean(busy) || recording;

  return (
    <header className="topbar" data-testid="exam-header">
      <div className="brand-block">
        <div className="eyebrow">IELTS Speaking Coach</div>
        <h1>Examiner Victoria</h1>
        <StageSummary
          currentPhase={currentPhase}
          isPracticeMode={isPracticeMode}
          session={session}
          sessionStats={sessionStats}
          stageProgress={stageProgress}
        />
      </div>
      <div className="top-actions">
        <label className="practice-select">
          <span>Training</span>
          <select
            data-testid="training-mode-select"
            value={trainingMode}
            onChange={changeTrainingMode}
            disabled={controlsDisabled}
          >
            {trainingModes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="practice-select">
          <span>Flow</span>
          <select
            data-testid="practice-type-select"
            value={practiceType}
            onChange={changePracticeType}
            disabled={controlsDisabled}
          >
            {practiceTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="ghost-button sound-toggle"
          type="button"
          onClick={toggleAudioEnabled}
          data-testid="sound-toggle"
        >
          {audioEnabled ? "Sound on" : "Sound off"}
        </button>
        <div className="desktop-action-buttons">
          {canScoreNow ? (
            <button className="ghost-button" type="button" onClick={requestReport} data-testid="score-button">
              Score
            </button>
          ) : null}
          {canExportRecord ? (
            <button
              className="ghost-button"
              type="button"
              onClick={downloadPracticeRecord}
              data-testid="export-button"
            >
              Export
            </button>
          ) : null}
          <button className="ghost-button" type="button" onClick={() => createFreshSession()} data-testid="restart-button">
            Restart
          </button>
        </div>
        <details className="mobile-more-menu">
          <summary>More</summary>
          <div className="mobile-more-panel">
            <button type="button" onClick={toggleAudioEnabled} data-testid="mobile-sound-toggle">
              {audioEnabled ? "Sound on" : "Sound off"}
            </button>
            {canScoreNow ? (
              <button type="button" onClick={requestReport} data-testid="mobile-score-button">
                Score
              </button>
            ) : null}
            {canExportRecord ? (
              <button type="button" onClick={downloadPracticeRecord} data-testid="mobile-export-button">
                Export
              </button>
            ) : null}
            <button type="button" onClick={() => createFreshSession()} data-testid="mobile-restart-button">
              Restart
            </button>
          </div>
        </details>
      </div>
      <StageSummary
        currentPhase={currentPhase}
        isPracticeMode={isPracticeMode}
        session={session}
        sessionStats={sessionStats}
        stageProgress={stageProgress}
        wide
      />
    </header>
  );
}
