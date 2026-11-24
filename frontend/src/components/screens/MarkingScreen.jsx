import { Icon } from "../ui.jsx";
import { TranscriptSheet } from "../TranscriptSheet.jsx";

const STEPS = [
  { key: "transcribed", label: "Transcribed" },
  { key: "marking", label: "Marking" },
  { key: "audio", label: "Audio" },
];

function stepState(step, key) {
  const order = { marking: 1, audio: 2, ready: 3 };
  const index = STEPS.findIndex((item) => item.key === key);
  const current = order[step] ?? 1;
  if (index < current) return "done";
  if (index === current) return "now";
  return "todo";
}

export function MarkingScreen({ marking, turn }) {
  if (!marking) return null;
  const ready = marking.step === "ready";
  const feedback = marking.step === "marking" ? null : turn?.feedback;
  return (
    <main className="screen paper marking" data-testid="marking-screen">
      <header className="bar">
        <span className="pill">Checking your answer</span>
      </header>
      <div className="paper-scroll">
        <p className="kicker">QUESTION</p>
        <h2 className="serif review-question">{marking.question}</h2>

        <ol className="steps" aria-label="Progress">
          {STEPS.map((item) => {
            const st = stepState(marking.step, item.key);
            return (
              <li key={item.key} className={`step step-${st}`}>
                <span className="step-dot" aria-hidden="true">
                  {st === "done" ? <Icon name="check" size={12} strokeWidth={3} /> : null}
                </span>
                {item.label}
              </li>
            );
          })}
        </ol>

        <TranscriptSheet answer={marking.transcript} feedback={feedback} source={marking.source} pending={!feedback} />

        {ready ? <p className="ready-note" role="status">Your next question is ready to go</p> : null}

      </div>
    </main>
  );
}
