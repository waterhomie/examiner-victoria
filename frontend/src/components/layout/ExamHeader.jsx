import { StageSummary } from "./StageSummary.jsx";

export function ExamHeader({
  audioEnabled,
  busy,
  canExportRecord,
  canScoreNow,
  changePracticeType,
  changeTrainingMode,
  changeFeedbackAdaptation,
  feedbackAdaptation,
  createFreshSession,
  currentPhase,
  downloadPracticeRecord,
  isPracticeMode,
  practiceType,
  practiceTypes,
  openRuntimeDiagnostics,
  replayGuide,
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
        {session && practiceType === "full" ? <div className="header-current-stage" aria-label="Current speaking stage" data-testid="current-speaking-stage">
          {currentPhase} · {isPracticeMode ? "Practice" : "Mock"}
        </div> : null}
        <StageSummary
          currentPhase={currentPhase}
          isPracticeMode={isPracticeMode}
          session={session}
          sessionStats={sessionStats}
          stageProgress={stageProgress}
          showStageLabels={practiceType === "full"}
        />
      </div>
      <div className="top-actions">
        <label className="practice-select" data-tour-target="mode">
          <span>Mode</span>
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
        <label className="practice-select" data-tour-target="flow">
          <select
            data-testid="practice-type-select"
            aria-label="Choose speaking part"
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
          data-tour-target="sound"
          type="button"
          onClick={toggleAudioEnabled}
          data-testid="sound-toggle"
        >
          {audioEnabled ? "Sound on" : "Sound off"}
        </button>
        <div className="desktop-action-buttons">
          {canScoreNow && session?.phase === "complete" ? (
            <button className="ghost-button" type="button" onClick={requestReport} data-testid="score-button">
              Score
            </button>
          ) : null}
        </div>
        <details className={`mobile-more-menu ${isPracticeMode && practiceType === "part1" ? "adaptive-settings-menu" : ""}`}>
          <summary>More</summary>
          <div className="mobile-more-panel">
            <button type="button" onClick={(event) => {
              event.currentTarget.closest("details")?.removeAttribute("open");
              replayGuide();
            }} data-testid="replay-guide-button">
              Show guide
            </button>
            {isPracticeMode && practiceType === "part1" ? (
              <label className="adaptive-feedback-setting">
                <input type="checkbox" data-testid="adaptive-feedback-toggle"
                  checked={feedbackAdaptation === "adaptive"} disabled={controlsDisabled || !session}
                  onChange={changeFeedbackAdaptation} />
                <span>Adapt feedback to my answers <small>Experimental · this session</small></span>
              </label>
            ) : null}
            <button type="button" onClick={openRuntimeDiagnostics} data-testid="mobile-runtime-diagnostics-button">
              System check
            </button>
            <button type="button" onClick={toggleAudioEnabled} data-testid="mobile-sound-toggle" data-tour-target="mobile-sound">
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
        showStageLabels={practiceType === "full"}
        wide
      />
    </header>
  );
}
