import { useRef } from "react";
import { ERROR_KINDS } from "../utils/errors.js";
import { Icon } from "./ui.jsx";

// The four V2.2 error cards (+ a generic one). Each has one main action and
// one way out; none of them lose the learner's answer.
export function ErrorCard({ error, isWeChat, playbackUrl, canRetryAudio, hasPending, onRetryAudio, onRecordAgain, onType, onRetryPending, onDiscard, onDismiss }) {
  const audioRef = useRef(null);
  if (!error) return null;

  const playBack = () => {
    if (!playbackUrl) return;
    if (!audioRef.current) audioRef.current = new Audio();
    audioRef.current.src = playbackUrl;
    void audioRef.current.play().catch(() => {});
  };

  let tone = "rose";
  let title = "Something went wrong";
  let body = error.message;
  let actions = [];

  if (error.kind === ERROR_KINDS.MIC) {
    title = "Microphone access needed";
    body = isWeChat
      ? null
      : "Allow the microphone for this site in your browser settings, then try again.";
    actions = [
      { label: "Retry", main: true, onClick: onRecordAgain },
      { label: "Type instead", onClick: onType },
    ];
  } else if (error.kind === ERROR_KINDS.SILENT) {
    tone = "amber";
    title = "We couldn't hear anything";
    body = "Check that your microphone isn't muted, and speak a little closer.";
    actions = [
      { label: "Record again", main: true, onClick: onRecordAgain },
      playbackUrl ? { label: "Play it back", onClick: playBack } : { label: "Type instead", onClick: onType },
    ];
  } else if (error.kind === ERROR_KINDS.OFFLINE) {
    tone = "neutral";
    title = "You're offline";
    body = hasPending || canRetryAudio
      ? "Your answer is saved on this device. We'll send it when you're back online."
      : "Check your connection, then try again.";
    actions = hasPending
      ? [{ label: "Retry now", main: true, onClick: onRetryPending }, { label: "Discard", onClick: onDiscard }]
      : canRetryAudio
        ? [{ label: "Retry now", main: true, onClick: onRetryAudio }, { label: "Record again", onClick: onRecordAgain }]
        : [{ label: "OK", main: true, onClick: onDismiss }];
  } else {
    actions = canRetryAudio
      ? [{ label: "Retry", main: true, onClick: onRetryAudio }, { label: "Record again", onClick: onRecordAgain }]
      : [{ label: "OK", main: true, onClick: onDismiss }, { label: "Type instead", onClick: onType }];
  }

  return (
    <div className="overlay" role="presentation">
      <section className={`error-card tone-${tone}`} role="alertdialog" aria-labelledby="error-title" data-testid={`error-${error.kind || "generic"}`}>
        <span className="error-icon" aria-hidden="true">
          <Icon name={error.kind === ERROR_KINDS.OFFLINE ? "offline" : error.kind === ERROR_KINDS.MIC ? "mic" : "close"} size={20} />
        </span>
        <h2 id="error-title">{title}</h2>
        {body ? <p>{body}</p> : null}
        {error.kind === ERROR_KINDS.MIC && isWeChat ? (
          <ol className="wechat-steps">
            <li>Tap <b>···</b> at the top right</li>
            <li>Open <b>设置</b> (Settings)</li>
            <li>Turn on <b>麦克风</b> (Microphone)</li>
          </ol>
        ) : null}
        <div className="error-actions">
          {actions.map((action) => (
            <button key={action.label} type="button" className={`btn ${action.main ? "main" : "ghost"}`} onClick={action.onClick}>
              {action.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

// Non-blocking: Victoria's voice failed but the question is on screen.
export function VoiceBanner({ message, onRetry, onDismiss }) {
  if (!message) return null;
  return (
    <div className="voice-banner" role="status" data-testid="voice-banner">
      <Icon name="speaker" size={16} />
      <span>
        <b>Victoria can't speak right now</b>
        <small>The question is shown as text.</small>
      </span>
      <button type="button" onClick={onRetry}>Try again</button>
      <button type="button" onClick={onDismiss} aria-label="Dismiss"><Icon name="close" size={14} /></button>
    </div>
  );
}
