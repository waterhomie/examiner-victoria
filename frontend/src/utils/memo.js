// "From last time" memo shown on the home screen. Device-local only; it holds
// one short coaching sentence, never the learner's answers.

const MAX_MEMO_CHARS = 160;

export function loadMemo(key) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const memo = JSON.parse(raw);
    return memo?.text ? memo : null;
  } catch (_) {
    return null;
  }
}

export function saveMemo(key, text) {
  const clean = String(text || "").trim();
  if (!clean) return;
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({ text: clean.slice(0, MAX_MEMO_CHARS), savedAt: new Date().toISOString() }),
    );
  } catch (_) {
    // Storage may be blocked (private mode / WebView). Not critical.
  }
}
