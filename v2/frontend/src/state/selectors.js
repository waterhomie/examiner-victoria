import {
  getSessionStats,
  getStageDescription,
  getStageProgress,
  hasStageControls,
  shouldShowCueCardSelect,
  shouldShowPart1TopicSelect,
} from "../utils/sessionView.js";

export function selectMessages(state) {
  return state.session?.messages || [];
}

export function selectIsPracticeMode(state) {
  return state.trainingMode === "practice";
}

export function selectPrepRemaining(state) {
  return state.prepEndsAt ? Math.max(0, Math.ceil((state.prepEndsAt - state.clockTick) / 1000)) : 0;
}

export function selectConfigWarning(state) {
  return state.healthInfo?.config?.api_key_configured === false
    ? "Preview mode: the backend is running, but API_KEY is not configured. You can inspect the interface and type answers, but AI replies, transcription, TTS, and scoring need the backend API key."
    : "";
}

export function selectSessionView(state) {
  const prepRemaining = selectPrepRemaining(state);
  const isPracticeMode = selectIsPracticeMode(state);
  const sessionStats = getSessionStats(state.session);
  const stageProgress = getStageProgress(state.session?.phase);
  const showPart1TopicSelect = shouldShowPart1TopicSelect(state.practiceType, state.practiceOptions);
  const showCueCardSelect = shouldShowCueCardSelect(state.practiceType, state.practiceOptions);
  const hasVisibleStageControls = hasStageControls({
    prepRemaining,
    showPart1TopicSelect,
    showCueCardSelect,
  });
  const hasStartedAnswering = Boolean(state.session?.candidate_answers?.length);
  const stageSelectionIsSettled =
    (showPart1TopicSelect && (Boolean(state.selectedPart1Topic) || hasStartedAnswering)) ||
    (showCueCardSelect && (Boolean(state.selectedCueCardTitle) || hasStartedAnswering));

  return {
    configWarning: selectConfigWarning(state),
    isPracticeMode,
    prepRemaining,
    sessionStats,
    shouldShowStageCard: hasVisibleStageControls && (prepRemaining > 0 || !stageSelectionIsSettled),
    showCueCardSelect,
    showPart1TopicSelect,
    stageDescription: getStageDescription(isPracticeMode),
    stageProgress,
    hasVisibleStageControls,
  };
}

export function selectCapabilities(state, recording) {
  return {
    canAnswer: Boolean(state.session?.test_active) && !state.busy && !recording,
    canExportRecord: Boolean(state.session?.candidate_answers?.length) && !state.busy,
    canScoreNow: Boolean(state.session?.candidate_answers?.some((item) => item.phase !== "identity")) && !state.busy,
    canStartRecording: Boolean(state.session?.test_active) && !state.busy,
  };
}
