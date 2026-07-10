export function phaseLabel(phase) {
  const labels = {
    identity: "Part 1",
    part1: "Part 1",
    part2_long: "Part 2",
    part2_followup: "Part 2",
    part3: "Part 3",
    complete: "Complete",
  };
  return labels[phase] || "Part 1";
}

export function phaseNameForRecord(phase) {
  const names = {
    identity: "Identity check",
    part1: "Part 1",
    part2_long: "Part 2 long turn",
    part2_followup: "Part 2 follow-up",
    part3: "Part 3",
    complete: "Complete",
  };
  return names[phase] || phase || "Unknown";
}

export function busyLabel(busy) {
  if (busy === "starting") return "Starting Victoria...";
  if (busy === "transcribing") return "Transcribing your answer...";
  if (busy === "thinking") return "Victoria is thinking...";
  if (busy === "report") return "Preparing your report...";
  return "";
}
