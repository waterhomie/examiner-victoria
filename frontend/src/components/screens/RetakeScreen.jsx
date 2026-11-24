import { compareRetake, retakeHeadline } from "../../utils/feedbackView.js";
import { TranscriptSheet } from "../TranscriptSheet.jsx";
import { Icon } from "../ui.jsx";

export function RetakeScreen({ turn, retake, complete, onNext, onTryAgain, embedded = false }) {
  if (!turn || !retake) return null;
  const comparison = compareRetake(turn, retake);
  return (
    <main className={`screen paper retake${embedded ? " is-embedded" : ""}`} data-testid="retake-screen">
      <header className="bar">
        <span className="pill">Try 2 result</span>
      </header>
      <div className="paper-scroll">
        <p className="kicker">SAY IT AGAIN</p>
        <h2 className="serif retake-title">{retakeHeadline(comparison)}</h2>
        <p className="hint">This try is only for you. It doesn't change your session.</p>

        <table className="compare">
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">Check</span></th>
              <th scope="col">TRY 1</th>
              <th scope="col">TRY 2</th>
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => (
              <tr key={row.key} className={row.improved ? "is-better" : ""}>
                <th scope="row">{row.label}</th>
                <td>{row.first}</td>
                <td>
                  {row.second}
                  {row.improved ? <Icon name="check" size={14} strokeWidth={3} className="better-tick" /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <TranscriptSheet answer={retake.text} label="Try 2" source="audio" />
      </div>
      <footer className="cta">
        <button className="btn ghost" type="button" onClick={onTryAgain} data-testid="try-again-button">
          Try again
        </button>
        {embedded ? null : (
          <button className="btn main" type="button" onClick={onNext} data-testid="retake-next-button">
            {complete ? "See my recap" : "Next question"}
            <Icon name="chevron" size={16} />
          </button>
        )}
      </footer>
    </main>
  );
}
