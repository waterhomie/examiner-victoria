export function ExamStageCard({
  busy,
  changeCueCardTitle,
  changePart1Topic,
  formatDuration,
  hasStageControls,
  practiceOptions,
  prepRemaining,
  recording,
  selectedCueCardTitle,
  selectedPart1Topic,
  showCueCardSelect,
  showPart1TopicSelect,
  stageProgress,
}) {
  const controlsDisabled = Boolean(busy) || recording;

  return (
    <aside className={`stage-card ${hasStageControls ? "has-stage-controls" : ""}`}>
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
