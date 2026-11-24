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
