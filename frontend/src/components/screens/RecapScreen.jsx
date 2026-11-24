import { useMemo } from "react";
import { topFix } from "../../utils/feedbackView.js";
import { parseReport } from "../../utils/reportView.js";
import { countWords } from "../../utils/sessionView.js";
import { Icon } from "../ui.jsx";

function SessionTrend({ turns }) {
  const scored = turns.filter((turn) => turn.phase !== "identity");
  if (scored.length < 2) return null;
  const words = scored.map((turn) => turn.feedback?.word_count ?? countWords(turn.answer));
  const max = Math.max(...words, 1);
  return (
    <section className="recap-block" aria-label="This session">
      <p className="kicker">THIS SESSION</p>
      <div className="trend">
        {scored.map((turn, index) => (
          <div className="trend-col" key={turn.id}>
            <span className="trend-bar" style={{ height: `${Math.max(8, (words[index] / max) * 64)}px` }} />
            <b>Q{index + 1}</b>
            <small>{words[index]}w</small>
          </div>
        ))}
      </div>
      <p className="hint">Words per answer. Longer answers give more to mark.</p>
    </section>
  );
}

export function RecapScreen({ state, onRetry, onHome, onDownload, onListen }) {
  const { report, reportStatus, turns } = state;
  const parsed = useMemo(() => parseReport(report), [report]);
  const phrases = useMemo(() => {
    const fromTurns = turns.map((turn) => topFix(turn.feedback)).filter((fix) => fix?.to).map((fix) => fix.to);
    const fromReport = parsed.examples.map((example) => example.better);
    return [...new Set([...fromTurns, ...fromReport])].slice(0, 6);
  }, [parsed.examples, turns]);

  if (reportStatus === "loading" || (reportStatus === "idle" && !report)) {
    return (
      <main className="screen ink recap-loading" data-testid="recap-loading">
        <div className="call-body">
          <div className="spinner" aria-hidden="true" />
          <h1 className="serif call-name">Writing your recap…</h1>
          <p className="call-sub">This takes about 20 seconds.</p>
        </div>
      </main>
    );
  }

  if (reportStatus === "failed" && !report) {
    return (
      <main className="screen paper recap" data-testid="recap-failed">
        <div className="paper-scroll">
          <h2 className="serif review-question">We couldn't make your recap.</h2>
          <p className="hint">Your answers are still saved on this device.</p>
        </div>
        <footer className="cta">
          <button className="btn ghost" type="button" onClick={onHome}>Home</button>
          <button className="btn main" type="button" onClick={onRetry}>Try again</button>
        </footer>
      </main>
    );
  }

  return (
    <main className="screen paper recap" data-testid="recap-screen">
      <div className="paper-scroll recap-scroll">
        <section className="recap-hero ink">
          <p className="kicker">ONE THING TO FIX TODAY</p>
          <h1 className="serif">{parsed.oneThing || "Keep practising full answers with a reason and an example."}</h1>
        </section>

        {parsed.ok ? (
          <>
            <section className="criteria" aria-label="Four criteria">
              {parsed.criteria.map((criterion) => (
                <article key={criterion.key} className={`criterion${criterion.muted ? " is-muted" : ""}`}>
                  <b>{criterion.title}</b>
                  <p>{criterion.comment || "Not enough evidence yet."}</p>
                </article>
              ))}
            </section>

            <SessionTrend turns={turns} />

            {phrases.length ? (
              <section className="recap-block" aria-label="Phrases to keep">
                <p className="kicker">PHRASES TO KEEP</p>
                <ul className="phrases">
                  {phrases.map((phrase) => (
                    <li key={phrase}>
                      <span className="serif">{phrase}</span>
                      <button className="spk" type="button" onClick={() => onListen(phrase)} aria-label={`Listen: ${phrase}`}>
                        <Icon name="speaker" size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {parsed.tasks.length ? (
              <section className="recap-block" aria-label="Next time">
                <p className="kicker">NEXT TIME</p>
                <ol className="tasks">
                  {parsed.tasks.map((task) => <li key={task}>{task}</li>)}
                </ol>
              </section>
            ) : null}

            {parsed.band ? (
              <section className="recap-block band" aria-label="Band estimate">
                <p className="kicker">ROUGH BAND ESTIMATE</p>
                <p>{parsed.band}</p>
              </section>
            ) : null}
          </>
        ) : (
          <pre className="raw-report">{report}</pre>
        )}

        <p className="disclaimer">Practice feedback only. Not an official IELTS score.</p>
      </div>

      <footer className="cta">
        <button className="btn ghost" type="button" onClick={onDownload} aria-label="Download record">
          <Icon name="download" size={16} />
          Save
        </button>
        <button className="btn main" type="button" onClick={onHome} data-testid="practise-again">
          Practise again
        </button>
      </footer>
    </main>
  );
}
