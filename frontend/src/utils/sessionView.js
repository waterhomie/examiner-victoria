// Pure view helpers for the V4 screens. No React, no network.

const PART_HEADING = /^\s*\*\*Part\s+\d[^*]*\*\*\s*/i;

export function stripMarkdown(text) {
  return String(text || "")
    .replace(PART_HEADING, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .trim();
}

// The backend completion copy ends with "Tap **Score** ..." from the old chat
// UI. V4 has its own button, so the sentence is hidden and not spoken.
export function withoutTapHint(text) {
  return String(text || "").replace(/\s*Tap \*\*[^*]+\*\*[^.]*\.?\s*$/i, "").trim();
}

export function displayQuestion(session) {
  if (!session) return "";
  if (session.phase === "part2_long" && session.cue_card?.prompt) {
    const question = stripMarkdown(session.current_question);
    if (/^please continue/i.test(question)) return question;
    return parseCueCard(session.cue_card.prompt).title;
  }
  return stripMarkdown(withoutTapHint(session.current_question));
}

export function speakableText(text) {
  return stripMarkdown(withoutTapHint(text))
    .replace(/\n+-\s*/g, ". ")
    .replace(/\s*\n+\s*/g, " ")
    .trim();
}

// The backend rejects TTS text over TTS_MAX_TEXT_CHARS (default 300). Long
// Part 2 prompts are cut at a sentence end; the full card is on screen anyway.
export const MAX_SPOKEN_CHARS = 280;

export function fitForSpeech(text, limit = MAX_SPOKEN_CHARS) {
  const clean = String(text || "").trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  return end > 40 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, "");
}

export function parseCueCard(prompt) {
  const lines = String(prompt || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const title = lines[0] || "";
  const bullets = lines.filter((line) => line.startsWith("-")).map((line) => line.replace(/^-\s*/, ""));
  return { title, bullets };
}

export function isPart2LongTurn(session) {
  return session?.phase === "part2_long";
}

export function isSessionComplete(session) {
  return Boolean(session) && (session.phase === "complete" || session.test_active === false);
}

export function partLabel(phase) {
  if (phase === "part2_long" || phase === "part2_followup") return "Part 2";
  if (phase === "part3") return "Part 3";
  if (phase === "complete") return "Done";
  return "Part 1";
}

// Progress dots for the current part only. Counts are derived from fields the
// backend already sends; when a count is unknown we fall back to a short bar.
export function progressFor(session) {
  if (!session) return { label: "", total: 0, current: 0 };
  const phase = session.phase;
  if (phase === "identity") return { label: "Part 1", total: 1, current: 1 };
  if (phase === "part1") {
    const total = Math.max(1, session.part1_queue?.length || 4);
    const current = Math.min(total, Math.max(1, session.part1_index || 1));
    return { label: "Part 1", total, current };
  }
  if (phase === "part2_long") return { label: "Part 2", total: 2, current: 1 };
  if (phase === "part2_followup") return { label: "Part 2", total: 2, current: 2 };
  if (phase === "part3") {
    const total = Math.max(1, session.part3_target_count || 4);
    const current = Math.min(total, (session.part3_index || 0) + 1);
    return { label: "Part 3", total, current };
  }
  return { label: "Done", total: 1, current: 1 };
}

export function countWords(text) {
  return (String(text || "").match(/[A-Za-z']+/g) || []).length;
}

export function formatClock(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
