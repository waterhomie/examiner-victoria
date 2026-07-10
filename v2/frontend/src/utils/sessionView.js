import { formatDuration } from "./format.js";

const STAGE_PROGRESS = {
  identity: 8,
  part1: 28,
  part2_long: 52,
  part2_followup: 68,
  part3: 84,
  complete: 100,
};

export function getStageProgress(phase) {
  return STAGE_PROGRESS[phase] || STAGE_PROGRESS.identity;
}

export function getSessionStats(session) {
  const answers = (session?.candidate_answers || []).filter((item) => item.phase !== "identity");
  const stats = (session?.answer_stats || []).filter((item) => item.phase !== "identity");
  const totalSeconds = stats.reduce((sum, item) => sum + (Number(item.duration) || 0), 0);
  const wpmValues = stats
    .map((item) => Number(item.words_per_minute))
    .filter((value) => Number.isFinite(value) && value > 0);
  const averageWpm = wpmValues.length
    ? Math.round(wpmValues.reduce((sum, value) => sum + value, 0) / wpmValues.length)
    : null;

  return {
    answered: answers.length,
    audio: stats.filter((item) => item.source === "audio").length,
    text: stats.filter((item) => item.source === "text").length,
    totalDuration: formatDuration(totalSeconds),
    averageWpm: averageWpm ? `${averageWpm}` : "-",
  };
}

export function getStageDescription(isPracticeMode) {
  return isPracticeMode
    ? "Practice mode: instant spoken feedback and natural answer upgrades."
    : "Mock mode: fewer interruptions, final score after the test.";
}

export function shouldShowPart1TopicSelect(practiceType, practiceOptions) {
  return practiceType === "part1" && Boolean(practiceOptions.part1_topics?.length);
}

export function shouldShowCueCardSelect(practiceType, practiceOptions) {
  return (practiceType === "part2" || practiceType === "part3") && Boolean(practiceOptions.cue_cards?.length);
}

export function hasStageControls({ prepRemaining, showPart1TopicSelect, showCueCardSelect }) {
  return Boolean(prepRemaining > 0 || showPart1TopicSelect || showCueCardSelect);
}
