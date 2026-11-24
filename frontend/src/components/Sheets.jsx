import { useEffect, useRef, useState } from "react";
import { Icon, Toggle } from "./ui.jsx";
import { SystemCheck } from "./SystemCheck.jsx";

function Sheet({ title, onClose, children, testId }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="overlay sheet-overlay" onClick={onClose} role="presentation">
      <section className="bottom-sheet" role="dialog" aria-label={title} onClick={(event) => event.stopPropagation()} data-testid={testId}>
        <header className="sheet-bar">
          <h2>{title}</h2>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function TypeSheet({ question, onSend, onClose }) {
  const [text, setText] = useState("");
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const send = (event) => {
    event?.preventDefault();
    if (text.trim()) onSend(text.trim());
  };
  return (
    <Sheet title="Type your answer" onClose={onClose} testId="type-sheet">
      <form onSubmit={send} className="type-form">
        <p className="hint serif">{question}</p>
        <textarea
          ref={inputRef}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent?.isComposing) send(event);
          }}
          rows={5}
          placeholder="Write what you would say…"
          aria-label="Your answer"
          data-testid="type-input"
        />
        <p className="hint">Typed answers can't be checked for pace or hesitations.</p>
        <button className="btn main" type="submit" disabled={!text.trim()} data-testid="type-send">Send</button>
      </form>
    </Sheet>
  );
}

export function EndSheet({ trainingMode, answerCount, totalQuestions, onConfirm, onClose }) {
  const mock = trainingMode === "mock";
  return (
    <Sheet title={mock ? "End the mock early?" : "Finish for today?"} onClose={onClose} testId="end-sheet">
      <div className="end-sheet-body">
        <p className="hint">{mock
          ? `You've done ${answerCount} of ${totalQuestions} questions. A band score needs the full set — this attempt won't get one.`
          : `I'll write your recap from your ${answerCount} answer(s) so far.`}</p>
        <div className="end-sheet-actions">
          <button className="btn main" type="button" onClick={onConfirm} data-testid="end-confirm">
            {mock ? "End without a score" : "End and see recap"}
          </button>
          <button className="btn ghost" type="button" onClick={onClose} data-testid="end-cancel">Keep going</button>
        </div>
      </div>
    </Sheet>
  );
}

export function SettingsSheet({ state, captionsOn, inSession, onChange, onClose, onEnd, onDownload }) {
  const [showCheck, setShowCheck] = useState(false);
  return (
    <Sheet title="Settings" onClose={onClose} testId="settings-sheet">
      {showCheck ? (
        <SystemCheck onBack={() => setShowCheck(false)} />
      ) : (
        <div className="settings">
          <Toggle
            label="Victoria's voice"
            hint="She reads each question out loud"
            checked={state.audioEnabled}
            onChange={(value) => onChange({ audioEnabled: value })}
            testId="toggle-sound"
          />
          <Toggle
            label="Live captions"
            hint={state.trainingMode === "mock" ? "Off in Mock, like the real test" : "Show your words as you speak"}
            checked={captionsOn}
            onChange={(value) => onChange({ captions: value })}
            testId="toggle-captions"
          />
          {state.practiceType === "part1" && state.trainingMode === "practice" ? (
            <Toggle
              label="Adaptive Part 1 (beta)"
              hint={inSession ? "Starts with your next session" : "Feedback adjusts to your level"}
              checked={state.feedbackAdaptation === "adaptive"}
              onChange={(value) => onChange({ feedbackAdaptation: value ? "adaptive" : "standard" })}
              testId="toggle-adaptive"
            />
          ) : null}
          <button className="settings-link" type="button" onClick={() => setShowCheck(true)} data-testid="open-system-check">
            System check <Icon name="chevron" size={16} />
          </button>
          {inSession ? (
            <>
              <button className="settings-link" type="button" onClick={onDownload}>
                Download transcript <Icon name="download" size={16} />
              </button>
              <button className="settings-link danger" type="button" onClick={onEnd} disabled={state.busy === "sending" || state.busy === "marking" || state.busy === "report" || Boolean(state.marking)} data-testid="end-session">
                End session
              </button>
            </>
          ) : null}
        </div>
      )}
    </Sheet>
  );
}
