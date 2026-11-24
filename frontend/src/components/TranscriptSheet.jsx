import { transcriptSegments } from "../utils/feedbackView.js";

export function MarkedText({ answer, feedback }) {
  const segments = transcriptSegments(answer, feedback);
  return segments.map((segment, index) => {
    if (segment.type === "del") return <del key={index} className="mark-del">{segment.text}</del>;
    if (segment.type === "ins") return <ins key={index} className="mark-ins">{segment.text}</ins>;
    if (segment.type === "filler") return <em key={index} className="mark-filler">{segment.text}</em>;
    return <span key={index}>{segment.text}</span>;
  });
}

export function TranscriptSheet({ answer, feedback, label = "Your answer", source, pending = false }) {
  return (
    <section className={`sheet${pending ? " is-pending" : ""}`} aria-label={label} data-testid="transcript-sheet">
      <div className="sheet-head">
        <span>{label.toUpperCase()}</span>
        <span>{source === "audio" ? "Spoken" : source === "text" ? "Typed" : ""}</span>
      </div>
      <p className="serif sheet-text">
        {feedback ? <MarkedText answer={answer} feedback={feedback} /> : answer}
      </p>
    </section>
  );
}

export function MarkLegend() {
  return (
    <p className="legend" aria-label="Key">
      <span><del className="mark-del">word</del> remove</span>
      <span><ins className="mark-ins">word</ins> add</span>
      <span><em className="mark-filler">um</em> filler</span>
    </p>
  );
}
