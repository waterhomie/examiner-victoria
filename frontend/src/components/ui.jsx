// Small shared UI pieces for the V4 screens.

const PATHS = {
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  replay: <><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4h4" /></>,
  keyboard: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  speaker: <><path d="M11 5 6 9H3v6h3l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m5 12 5 5 9-10" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  back: <path d="m15 6-6 6 6 6" />,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  offline: <><path d="M2 8.8a15 15 0 0 1 4.2-2.6M10.7 5.1A15 15 0 0 1 22 8.8M5 12.5a10 10 0 0 1 5.2-2.4M16.9 10.8a10 10 0 0 1 2.1 1.7M8.5 16a5 5 0 0 1 7 0M12 20h.01" /><path d="m2 2 20 20" /></>,
  play: <path d="M7 5v14l11-7z" />,
  download: <><path d="M12 4v11M7 10l5 5 5-5" /><path d="M5 20h14" /></>,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
};

export function Icon({ name, size = 18, strokeWidth = 2, className = "" }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={name === "play" || name === "star" ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

export function Monogram({ size = "md", speaking = false }) {
  return (
    <div className={`monogram monogram-${size}${speaking ? " is-speaking" : ""}`} aria-hidden="true">
      V
    </div>
  );
}

export function ProgressDots({ total, current, tone = "ink" }) {
  if (!total) return null;
  return (
    <div className={`dots dots-${tone}`} role="img" aria-label={`Question ${current} of ${total}`}>
      {Array.from({ length: total }, (_, index) => {
        const position = index + 1;
        const cls = position < current ? "on" : position === current ? "now" : "";
        return <i key={position} className={cls} />;
      })}
    </div>
  );
}

// Decorative only: shows that the mic is live. It does not measure volume.
export function Waveform({ active }) {
  const bars = [6, 12, 18, 10, 22, 14, 8, 16, 24, 12, 18, 9, 14, 20, 7];
  return (
    <div className={`wave${active ? " is-active" : ""}`} aria-hidden="true">
      {bars.map((height, index) => (
        <i key={index} style={{ height: `${height}px`, animationDelay: `${(index % 5) * 0.12}s` }} />
      ))}
    </div>
  );
}

export function Chip({ tone = "neutral", children }) {
  return <span className={`chip chip-${tone}`}>{children}</span>;
}

export function Toggle({ checked, onChange, label, hint, testId }) {
  return (
    <label className="toggle-row">
      <span>
        <b>{label}</b>
        {hint ? <small>{hint}</small> : null}
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} data-testid={testId} />
      <i className="toggle-track" aria-hidden="true" />
    </label>
  );
}
