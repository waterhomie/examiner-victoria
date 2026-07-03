import { formatSecondsForRecord } from "./format.js";
import { phaseNameForRecord } from "./labels.js";

export function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function buildTranscriptText(session) {
  const lines = [
    "Examiner Victoria V2 - IELTS Speaking Transcript",
    `Session ID: ${session?.session_id || "unknown"}`,
    "",
  ];

  (session?.messages || []).forEach((message, index) => {
    const speaker = message.role === "assistant" ? "Victoria" : "Candidate";
    const phase = message.phase ? ` [${message.phase}]` : "";
    lines.push(`${index + 1}. ${speaker}${phase}`);
    lines.push(String(message.content || "").replace(/\n{3,}/g, "\n\n"));
    lines.push("");
  });

  return `${lines.join("\n").trim()}\n`;
}

export function buildPracticeRecordText(session, report) {
  const answers = session?.candidate_answers || [];
  const stats = session?.answer_stats || [];
  const answeredStats = stats.filter((item) => item.phase !== "identity");
  const totalWords = answeredStats.reduce((sum, item) => sum + (item.word_count || 0), 0);
  const totalSeconds = answeredStats.reduce((sum, item) => sum + (Number(item.duration) || 0), 0);
  const audioCount = answeredStats.filter((item) => item.source === "audio").length;
  const textCount = answeredStats.filter((item) => item.source === "text").length;
  const wpmValues = answeredStats
    .map((item) => Number(item.words_per_minute))
    .filter((value) => Number.isFinite(value) && value > 0);
  const averageWpm = wpmValues.length
    ? `${Math.round(wpmValues.reduce((sum, value) => sum + value, 0) / wpmValues.length)} WPM`
    : "N/A";
  const cueCard = session?.cue_card || {};

  const lines = [
    "Examiner Victoria V2 - Practice Record",
    `Generated at: ${new Date().toLocaleString()}`,
    `Session ID: ${session?.session_id || "unknown"}`,
    "",
    "## Session summary",
    `Practice type: ${session?.practice_type || "full"}`,
    `Current phase: ${phaseNameForRecord(session?.phase)}`,
    `Part 1 topic: ${session?.part1_topic || "Random / not selected"}`,
    `Cue card: ${cueCard.title || "Random / not reached yet"}`,
    `Candidate answers: ${answers.length}`,
    `Audio answers: ${audioCount}`,
    `Text answers: ${textCount}`,
    `Total spoken/recorded duration: ${formatSecondsForRecord(totalSeconds)}`,
    `Total words: ${totalWords}`,
    `Average WPM: ${averageWpm}`,
  ];

  if (cueCard.prompt) {
    lines.push("", "## Part 2 cue card", cueCard.prompt);
  }

  lines.push("", "## Timing and fluency stats");
  if (stats.length) {
    stats.forEach((item, index) => {
      lines.push(
        `${index + 1}. ${phaseNameForRecord(item.phase)} | ${item.source} | duration ${formatSecondsForRecord(item.duration)} | ${item.word_count || 0} words | ${item.words_per_minute ? `${Math.round(item.words_per_minute)} WPM` : "WPM N/A"}`,
      );
    });
  } else {
    lines.push("No timing stats saved yet.");
  }

  lines.push("", "## Question-by-question answers");
  if (answers.length) {
    answers.forEach((item, index) => {
      const stat = stats[index] || {};
      lines.push(
        `${index + 1}. ${phaseNameForRecord(item.phase)} (${item.source || stat.source || "text"}, ${formatSecondsForRecord(item.duration ?? stat.duration)})`,
        `Q: ${item.question || "N/A"}`,
        `A: ${item.answer || ""}`,
        "",
      );
    });
  } else {
    lines.push("No candidate answers saved yet.");
  }

  lines.push(
    "",
    "## Full transcript",
    buildTranscriptText(session).trim(),
    "",
    "## Report",
    report?.trim() || "No score report generated yet. Tap Score when you want Victoria to create one.",
  );

  return `${lines.join("\n").replace(/\n{4,}/g, "\n\n\n").trim()}\n`;
}
