export function PendingSpeechCard({ onPlay }) {
  return (
    <div className="audio-card">
      <div>
        <strong>Victoria's voice is ready</strong>
        <span>iPhone Safari needs a tap before playing audio.</span>
      </div>
      <button type="button" onClick={onPlay}>
        Play Victoria
      </button>
    </div>
  );
}
