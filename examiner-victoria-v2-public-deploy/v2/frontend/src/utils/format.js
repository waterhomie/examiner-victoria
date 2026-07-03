export function formatDuration(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const minutes = String(Math.floor(safe / 60)).padStart(2, "0");
  const rest = String(safe % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

export function formatSecondsForRecord(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) return "N/A";
  return `${Number(seconds).toFixed(1)}s`;
}

export function safeDateStamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

export function speechCacheKey(text) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, 1200);
}
