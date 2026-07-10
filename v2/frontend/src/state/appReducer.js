import { ACTIONS } from "./actions.js";

function normalizePracticeOptions(options) {
  return {
    part1_topics: options?.part1_topics || [],
    cue_cards: options?.cue_cards || [],
  };
}

function restoreFromSnapshot(state, snapshot) {
  const session = snapshot?.session || null;
  return {
    ...state,
    session,
    report: snapshot?.report || "",
    audioEnabled: snapshot?.audioEnabled ?? true,
    trainingMode: snapshot?.trainingMode || (session?.practice_mode ? "practice" : "mock"),
    practiceType: snapshot?.practiceType || session?.practice_type || "full",
    selectedPart1Topic: snapshot?.selectedPart1Topic || "",
    selectedCueCardTitle: snapshot?.selectedCueCardTitle || "",
    reviewBeforeSend: Boolean(snapshot?.reviewBeforeSend),
    prepEndsAt: snapshot?.prepEndsAt && snapshot.prepEndsAt > Date.now() ? snapshot.prepEndsAt : null,
    busy: "",
  };
}

export function appReducer(state, action) {
  switch (action.type) {
    case ACTIONS.ANSWER_FAILED:
      return { ...state, busy: "", error: action.message };
    case ACTIONS.ANSWER_REQUESTED:
      return {
        ...state,
        busy: "thinking",
        draft: "",
        error: "",
        prepEndsAt: null,
        report: "",
      };
    case ACTIONS.ANSWER_SUCCEEDED:
      return { ...state, busy: "", session: action.session };
    case ACTIONS.AUDIO_TOGGLED:
      return { ...state, audioEnabled: !state.audioEnabled };
    case ACTIONS.BUSY_SET:
      return { ...state, busy: action.busy };
    case ACTIONS.CLOCK_TICK_SET:
      return { ...state, clockTick: action.clockTick };
    case ACTIONS.DRAFT_CLEARED:
      return { ...state, draft: "" };
    case ACTIONS.DRAFT_SET:
      return { ...state, draft: action.draft };
    case ACTIONS.ERROR_SET:
      return { ...state, error: action.error };
    case ACTIONS.HEALTH_LOADED:
      return { ...state, healthInfo: action.healthInfo };
    case ACTIONS.MODE_SET:
      return { ...state, mode: action.mode };
    case ACTIONS.MODE_TOGGLED:
      return { ...state, mode: state.mode === "voice" ? "text" : "voice" };
    case ACTIONS.PRACTICE_OPTIONS_LOADED:
      return { ...state, practiceOptions: normalizePracticeOptions(action.practiceOptions) };
    case ACTIONS.PREP_TIMER_SET:
      return { ...state, prepEndsAt: action.prepEndsAt, clockTick: action.clockTick };
    case ACTIONS.REPORT_FAILED:
      return { ...state, busy: "", error: action.message };
    case ACTIONS.REPORT_REQUESTED:
      return { ...state, busy: "report", error: "" };
    case ACTIONS.REPORT_SUCCEEDED:
      return { ...state, busy: "", report: action.report };
    case ACTIONS.REVIEW_BEFORE_SEND_SET:
      return { ...state, reviewBeforeSend: Boolean(action.reviewBeforeSend) };
    case ACTIONS.SESSION_RESTORED:
      return restoreFromSnapshot(state, action.snapshot);
    case ACTIONS.SESSION_START_FAILED:
      return { ...state, busy: "", error: action.message };
    case ACTIONS.SESSION_START_REQUESTED:
      return {
        ...state,
        busy: "starting",
        draft: "",
        error: "",
        practiceType: action.practiceType,
        report: "",
        selectedCueCardTitle: action.selectedCueCardTitle,
        selectedPart1Topic: action.selectedPart1Topic,
        session: null,
        trainingMode: action.trainingMode,
        prepEndsAt: null,
      };
    case ACTIONS.SESSION_START_SUCCEEDED:
      return {
        ...state,
        busy: "",
        session: action.session,
        audioEnabled: action.session?.voice_playback_enabled ?? state.audioEnabled,
      };
    case ACTIONS.STORAGE_READY_SET:
      return { ...state, storageReady: Boolean(action.storageReady) };
    default:
      return state;
  }
}
