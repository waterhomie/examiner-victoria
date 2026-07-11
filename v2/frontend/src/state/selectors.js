import {
  getSessionStats,
  getStageDescription,
  getStageProgress,
  hasStageControls,
  shouldShowCueCardSelect,
  shouldShowPart1TopicSelect,
} from "../utils/sessionView.js";

export function selectIsPracticeMode(state) {
  if (state.session?.practice_mode === true) return true;
  if (state.session?.practice_mode === false) return false;
  return state.trainingMode === "practice";
}

export function selectMessages(state) {
  const messages = state.session?.messages || [];
  if (selectIsPracticeMode(state)) return messages;

  const phase = state.session?.phase;
  if (phase === "part2_long") {
    return messages.filter((message) => message.role === "assistant" && message.phase === "part2_long").slice(-1);
  }
  if (phase === "complete") {
    return messages.filter((message) => message.role === "assistant" && message.phase === "complete").slice(-1);
  }
  return [];
}

export function selectPrepRemaining(state) {
  return state.prepEndsAt ? Math.max(0, Math.ceil((state.prepEndsAt - state.clockTick) / 1000)) : 0;
}

export function selectConfigWarning(state) {
  return state.healthInfo?.config?.api_key_configured === false
    ? "Preview mode: the backend is running, but API_KEY is not configured. You can inspect the interface and type answers, but AI replies, transcription, TTS, and scoring need the backend API key."
    : "";
}

function getMockExamInstruction(phase) {
  if (phase === "identity") return "Listen to Victoria, then answer aloud when you are ready.";
  if (phase === "part1") return "Answer each question aloud. The transcript and corrections will appear after the mock test.";
  if (phase === "part2_long") return "Use the cue card and preparation timer, then give one continuous answer.";
  if (phase === "part2_followup") return "Answer the short follow-up aloud before moving into Part 3.";
  if (phase === "part3") return "Discuss the question aloud. Victoria may use bank questions or follow up on your ideas.";
  if (phase === "complete") return "The mock test is complete. View your report and transcript when ready.";
  return "Use voice as the main exam interaction.";
}

function getMockExamTitle(phase) {
  if (phase === "part2_long") return "Part 2 cue card";
  if (phase === "part3") return "Part 3 discussion";
  if (phase === "complete") return "Mock exam complete";
  return "Voice-first mock exam";
}

export function selectMockExamView(state) {
  const session = state.session;
  if (!session || selectIsPracticeMode(state)) return null;
  const phase = session.phase;
  return {
    active: Boolean(session.test_active),
    currentQuestion: session.current_question || "",
    instruction: getMockExamInstruction(phase),
    phase,
    showQuestionFallback: phase !== "part2_long" && phase !== "complete" && Boolean(session.current_question),
    title: getMockExamTitle(phase),
  };
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
    mockExam: selectMockExamView(state),
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
