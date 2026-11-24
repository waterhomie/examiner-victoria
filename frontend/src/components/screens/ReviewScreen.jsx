import { hasMarks, topFix, verdictChips } from "../../utils/feedbackView.js";
import { MarkLegend, TranscriptSheet } from "../TranscriptSheet.jsx";
import { Chip, Icon } from "../ui.jsx";

function ListenButton({ text, onListen, label }) {
  if (!text) return null;
  return (
    <button className="spk" type="button" onClick={() => onListen(text)} aria-label={label}>
      <Icon name="speaker" size={16} />
    </button>
  );
}

export function FixCard({ fix, onListen }) {
  if (!fix) return null;
  return (
    <section className="fix-card" data-testid="top-fix">
      <div className="fix-head">
        <span className="kicker">{fix.label.toUpperCase()}</span>
        <ListenButton text={fix.listen} onListen={onListen} label="Listen to the better phrase" />
      </div>
      {fix.to ? (
        <p className="fix-pair serif">
          {fix.from ? <del className="mark-del">{fix.from}</del> : null}
          {fix.from ? <span className="fix-arrow" aria-hidden="true">→</span> : null}
          <ins className="mark-ins">{fix.to}</ins>
        </p>
      ) : (
        <p className="fix-sentence">{fix.sentence}</p>
      )}
    </section>
  );
}

export function ReviewBody({ turn, onListen }) {
  const feedback = turn.feedback;
  const chips = verdictChips(feedback);
  const fix = topFix(feedback);
  const extraTip = fix?.label === "Top fix" && feedback?.tip ? feedback.tip : "";
  return (
    <>
      <p className="kicker">QUESTION</p>
      <h2 className="serif review-question">{turn.question}</h2>

      {chips.length ? (
        <div className="chip-row verdicts">
          {chips.map((chip) => (
            <Chip key={chip.text} tone={chip.tone}>{chip.icon ? `${chip.icon} ` : ""}{chip.text}</Chip>
          ))}
        </div>
      ) : null}

      {feedback && feedback.coaching && !feedback.available ? (
        <p className="notice">Feedback isn't available for this answer. Your answer was saved.</p>
      ) : null}

      <TranscriptSheet answer={turn.answer} feedback={feedback} source={turn.source} />
      {hasMarks(feedback) ? <MarkLegend /> : null}

      <FixCard fix={fix} onListen={onListen} />
      {!fix && feedback?.available ? <p className="notice good">Nothing to fix here. Well done.</p> : null}

      {feedback?.natural_version || extraTip ? (
        <div className="more">
          {extraTip ? (
            <details>
              <summary>Next step</summary>
              <p>{extraTip}</p>
            </details>
          ) : null}
          {feedback?.natural_version ? (
            <details>
              <summary>Natural version</summary>
              <div className="more-row">
                <p className="serif">{feedback.natural_version}</p>
                <ListenButton text={feedback.natural_version} onListen={onListen} label="Listen to the natural version" />
              </div>
            </details>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

export function ReviewScreen({ turn, index, complete, onRetake, onNext, onListen, embedded = false }) {
  if (!turn) return null;
  return (
    <main className={`screen paper review${embedded ? " is-embedded" : ""}`} data-testid="review-screen">
      <header className="bar">
        <span className="pill">Review · Q{index}</span>
      </header>
      <div className="paper-scroll">
        <ReviewBody turn={turn} onListen={onListen} />
      </div>
      <footer className="cta">
        <button className="btn ghost" type="button" onClick={onRetake} data-testid="retake-button">
          <Icon name="replay" size={16} />
          Say it again
        </button>
        {embedded ? null : (
          <button className="btn main" type="button" onClick={onNext} data-testid="next-button">
            {complete ? "See my recap" : "Next"}
            <Icon name="chevron" size={16} />
          </button>
        )}
      </footer>
    </main>
  );
}
