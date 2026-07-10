export function ExamStageCard({
  busy,
  changeCueCardTitle,
  changePart1Topic,
  currentPhase,
  formatDuration,
  hasStageControls,
  isPracticeMode,
  practiceOptions,
  prepRemaining,
  recording,
  selectedCueCardTitle,
  selectedPart1Topic,
  session,
  sessionStats,
  showCueCardSelect,
  showPart1TopicSelect,
  stageDescription,
  stageProgress,
}) {
  const controlsDisabled = Boolean(busy) || recording;

  return (
    <aside className={`stage-card ${hasStageControls ? "has-stage-controls" : ""}`}>
      <div className="stage-main">
        <div className="stage-copy">
          <div className="stage-line">
            <span className="stage-pill">{currentPhase}</span>
            <span className={`training-pill ${isPracticeMode ? "practice" : "mock"}`}>
              {isPracticeMode ? "Practice" : "Mock"}
            </span>
          </div>
          <p>{session?.phase === "part3" ? "Dynamic follow-up loop" : stageDescription}</p>
        </div>
        {session ? (
          <div className="session-mini" aria-label="Current practice summary">
            <span><strong>{sessionStats.answered}</strong> answers</span>
            <span><strong>{sessionStats.averageWpm}</strong> WPM</span>
            <span><strong>{sessionStats.totalDuration}</strong></span>
          </div>
        ) : null}
      </div>
      {prepRemaining > 0 ? (
        <div className="prep-timer" aria-live="polite">
          Part 2 prep time <strong>{formatDuration(prepRemaining)}</strong>
        </div>
      ) : null}
      {showPart1TopicSelect ? (
        <label className="topic-select">
          <span>Topic</span>
          <select
            value={selectedPart1Topic}
            onChange={changePart1Topic}
            disabled={controlsDisabled}
          >
            <option value="">Random topic</option>
            {practiceOptions.part1_topics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {showCueCardSelect ? (
        <label className="topic-select">
          <span>Cue card</span>
          <select
            value={selectedCueCardTitle}
            onChange={changeCueCardTitle}
            disabled={controlsDisabled}
          >
            <option value="">Random cue card</option>
            {practiceOptions.cue_cards.map((card) => (
              <option key={card.title} value={card.title}>
                {card.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="progress-track">
        <div style={{ width: `${stageProgress}%` }} />
      </div>
    </aside>
  );
}
