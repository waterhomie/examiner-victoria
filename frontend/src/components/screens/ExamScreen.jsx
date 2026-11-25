import { browserSpeechTranscriptionIsSupported } from "../../browserSpeechTranscriber.js";
import { PART2_MAX_SECONDS, PART2_MIN_SECONDS } from "../../config/appConfig.js";
import { topFix } from "../../utils/feedbackView.js";
import { displayQuestion, formatClock, parseCueCard, progressFor } from "../../utils/sessionView.js";
import { Icon, Monogram, ProgressDots, Waveform } from "../ui.jsx";

function CueCard({ prompt }) {
  const card = parseCueCard(prompt);
  return (
    <section className="cue-card" aria-label="Cue card">
      <p className="cue-title serif">{card.title}</p>
      {card.bullets.length ? (
        <>
          <p className="cue-say">You should say:</p>
          <ul>
            {card.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function Part2Timeline({ elapsed }) {
  const percent = Math.min(100, (elapsed / PART2_MAX_SECONDS) * 100);
  const minPercent = (PART2_MIN_SECONDS / PART2_MAX_SECONDS) * 100;
  return (
    <div className="timeline" aria-label={`Speaking time ${formatClock(elapsed)}`}>
      <div className="timeline-track">
        <i className="timeline-fill" style={{ width: `${percent}%` }} />
        <i className="timeline-mark" style={{ left: `${minPercent}%` }} />
      </div>
      <div className="timeline-labels">
        <span>{formatClock(elapsed)}</span>
        <span style={{ left: `${minPercent}%` }}>1:00 minimum</span>
        <span>2:00 examiner stops you</span>
      </div>
    </div>
  );
}

export function ExamScreen({
  state,
  recorder,
  speechState,
  captionsOn,
  desktop = false,
  onToggleMic,
  onReplay,
  onType,
  onOpenSettings,
  onStartPart2,
  onCancelRetake,
  reviewableTurns = {},
  reviewDisabled = false,
  onSelectTurn,
}) {
  const { session, trainingMode, retake, busy, prepEndsAt, part2Started, clockTick } = state;
  const progress = progressFor(session);
  const longTurn = session?.phase === "part2_long";
  const now = clockTick || Date.now();
  const prepLeft = prepEndsAt ? Math.max(0, Math.ceil((prepEndsAt - now) / 1000)) : 0;
  const preparing = longTurn && prepLeft > 0 && !part2Started && !recorder.recording && !retake;
  const speaking = speechState.status === "playing" || speechState.status === "loading";
  const sending = busy === "sending";
  const retakeTurn = retake ? state.turns.find((turn) => turn.id === retake.turnId) : null;
  const fix = retakeTurn ? topFix(retakeTurn.feedback) : null;
  const question = retakeTurn ? retakeTurn.question : displayQuestion(session);
  const showCaptions = captionsOn && recorder.recording;
  const captionsSupported = browserSpeechTranscriptionIsSupported();

  let status = "Your turn";
  if (recorder.recording) status = longTurn ? "Speaking" : "Listening";
  else if (recorder.transcribing) status = "Writing it down";
  else if (sending) status = "Victoria is thinking";
  else if (preparing) status = `Prepare · ${formatClock(prepLeft)}`;
  else if (speaking) status = "Victoria is speaking";

  const pill = retake
    ? "Try 2 · Say it again"
    : `${trainingMode === "mock" ? "Mock" : "Practice"} · Captions ${captionsOn ? "on" : "off"}`;

  return (
    <main className={`screen ink exam${desktop ? " is-desktop" : ""}`} data-testid="exam-screen">
      <header className="bar">
        <span className="pill">{pill}</span>
        {retake ? <span /> : <ProgressDots total={progress.total} current={progress.current} clickable={reviewableTurns} disabled={reviewDisabled} onSelectTurn={onSelectTurn} />}
        <button className="icon-btn" type="button" onClick={onOpenSettings} aria-label="Settings">
          <Icon name="settings" />
        </button>
      </header>

      <div className="exam-body">
        <div className="exam-who">
          <Monogram size="sm" speaking={speaking} />
          <span className="exam-part">{progress.label}</span>
        </div>

        {longTurn && !retake ? <CueCard prompt={session.cue_card?.prompt} /> : null}
        {!longTurn || retake ? <h1 className="serif exam-question" data-testid="question-text">{question}</h1> : null}
        {longTurn && !retake && /^please continue/i.test(state.nextSpeech || "") ? (
          <p className="exam-nudge">{state.nextSpeech}</p>
        ) : null}

        {fix ? (
          <p className="retake-hint">
            Try to use <b>“{fix.to || fix.sentence}”</b>
          </p>
        ) : null}

        <p className={`turn-label${recorder.recording ? " is-live" : ""}`} aria-live="polite">{status}</p>

        {showCaptions ? (
          <p className="captions" aria-live="polite" data-testid="live-captions">
            {recorder.liveCaption || (captionsSupported ? "…" : "Live captions aren't available on this device.")}
          </p>
        ) : null}

      </div>

      <footer className="exam-controls">
        {longTurn && recorder.recording ? <Part2Timeline elapsed={recorder.elapsed} /> : null}
        {!longTurn ? <Waveform active={recorder.recording} /> : null}
        {!longTurn && recorder.recording ? <p className="elapsed">{formatClock(recorder.elapsed)}</p> : null}

        <div className="mic-row">
          {retake ? (
            <button className="side" type="button" onClick={onCancelRetake} aria-label="Cancel retake">
              <Icon name="close" />
              <span>Cancel</span>
            </button>
          ) : (
            <button className="side" type="button" onClick={onReplay} disabled={recorder.recording} aria-label="Replay question">
              <Icon name="replay" />
              <span>Replay</span>
            </button>
          )}

          {preparing ? (
            <button className="mic mic-start" type="button" onClick={onStartPart2} data-testid="start-part2">
              <span>Start now</span>
            </button>
          ) : (
            <button
              className={`mic${recorder.recording ? " is-recording" : ""}`}
              type="button"
              onClick={onToggleMic}
              disabled={recorder.transcribing || sending}
              aria-label={recorder.recording ? "Stop and send" : "Start answering"}
              data-testid="mic-button"
            >
              {recorder.recording ? <span className="sq" /> : <Icon name="mic" size={30} />}
            </button>
          )}

          <button className="side" type="button" onClick={onType} disabled={recorder.recording || sending} aria-label="Type your answer">
            <Icon name="keyboard" />
            <span>Type</span>
          </button>
        </div>
        {desktop ? <p className="hold-hint">Hold <kbd>Space</kbd> to talk, release to send</p> : null}
      </footer>
    </main>
  );
}
