export const TOUR_STAGES = [
  "mode", "mode-choice", "mode-info", "flow", "flow-choice", "flow-info",
  "selection", "sound", "sound-info", "answer",
];

export function getTourSelectionKind(sessionView) {
  if (!sessionView.shouldShowStageCard) return null;
  if (sessionView.showPart1TopicSelect) return "topic";
  if (sessionView.showCueCardSelect) return "cue-card";
  return null;
}

export function getTourTarget(stage, selectionKind) {
  if (stage.startsWith("mode")) return "mode";
  if (stage.startsWith("flow")) return "flow";
  if (stage === "selection") return selectionKind;
  if (stage.startsWith("sound")) return "sound";
  return "answer";
}

export function nextTourStep(step, selectionKind) {
  return TOUR_STAGES[step] === "flow-info" && !selectionKind ? step + 2 : step + 1;
}

export function previousTourStep(step, selectionKind) {
  return TOUR_STAGES[step] === "sound" && !selectionKind ? step - 2 : step - 1;
}
