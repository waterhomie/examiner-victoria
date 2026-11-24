import { PART2_PREP_SECONDS, SAVED_TURNS_LIMIT } from "../config/appConfig.js";
import { isSessionComplete } from "../utils/sessionView.js";
import { ACTIONS } from "./actions.js";
import { initialState, SCREENS } from "./initialState.js";

const SESSION_RESET = {
  session: null,
  turns: [],
  activeTurnId: null,
  marking: null,
  retake: null,
  pendingAnswer: null,
  nextSpeech: "",
  report: "",
  reportStatus: "idle",
  prepEndsAt: null,
  part2Started: false,
  busy: "",
  error: null,
  voiceIssue: "",
  sheet: "",
};

function prepFor(session, now) {
  return session?.phase === "part2_long" ? now + PART2_PREP_SECONDS * 1000 : null;
}

export function appReducer(state = initialState, action) {
  switch (action.type) {
    case ACTIONS.PATCH:
      return { ...state, ...action.values };

    case ACTIONS.RESTORED: {
      const snapshot = action.snapshot || {};
      if (!snapshot.session) return state;
      const screen = isSessionComplete(snapshot.session) ? SCREENS.RECAP : SCREENS.EXAM;
      return {
        ...state,
        ...SESSION_RESET,
        trainingMode: snapshot.trainingMode || state.trainingMode,
        practiceType: snapshot.practiceType || state.practiceType,
        session: snapshot.session,
        turns: Array.isArray(snapshot.turns) ? snapshot.turns : [],
        report: snapshot.report || "",
        reportStatus: snapshot.report ? "ready" : "idle",
        screen,
      };
    }

    case ACTIONS.HOME:
      return { ...state, ...SESSION_RESET, screen: SCREENS.HOME };

    case ACTIONS.SESSION_STARTING:
      return { ...state, ...SESSION_RESET, busy: "starting" };

    case ACTIONS.SESSION_STARTED:
      return {
        ...state,
        busy: "",
        session: action.session,
        screen: SCREENS.EXAM,
        prepEndsAt: prepFor(action.session, action.now),
        part2Started: false,
      };

    case ACTIONS.SESSION_FAILED:
      return { ...state, busy: "", error: action.error };

    case ACTIONS.ANSWER_SENDING:
      return {
        ...state,
        busy: "sending",
        error: null,
        pendingAnswer: null,
        marking: { ...action.marking, step: "marking" },
        screen: state.trainingMode === "practice" ? SCREENS.MARKING : state.screen,
      };

    case ACTIONS.ANSWER_SUCCEEDED: {
      const { data, turn } = action;
      const turns = [...state.turns, turn].slice(-SAVED_TURNS_LIMIT);
      const coaching = Boolean(turn.feedback?.coaching);
      const startPrep = Boolean(data.start_prep_timer) || (data.session?.phase === "part2_long" && state.session?.phase !== "part2_long");
      const complete = isSessionComplete(data.session);
      let screen = state.screen;
      if (coaching) screen = SCREENS.MARKING;
      else if (complete) screen = SCREENS.RECAP;
      else screen = SCREENS.EXAM;
      return {
        ...state,
        busy: "",
        session: data.session,
        turns,
        activeTurnId: turn.id,
        nextSpeech: data.spoken_text || "",
        marking: coaching ? { ...state.marking, step: "audio" } : null,
        prepEndsAt: startPrep ? action.now + PART2_PREP_SECONDS * 1000 : state.prepEndsAt,
        part2Started: startPrep ? false : state.part2Started,
        screen,
      };
    }

    case ACTIONS.ANSWER_FAILED:
      return {
        ...state,
        busy: "",
        error: action.error,
        pendingAnswer: action.pendingAnswer,
        marking: action.pendingAnswer ? state.marking : null,
        screen: action.pendingAnswer && state.screen === SCREENS.MARKING ? SCREENS.MARKING : SCREENS.EXAM,
      };

    case ACTIONS.MARKING_STEP:
      if (!state.marking) return state;
      if (action.step === "done") return { ...state, marking: null, screen: SCREENS.REVIEW };
      return { ...state, marking: { ...state.marking, step: action.step } };

    case ACTIONS.NEXT_QUESTION:
      return {
        ...state,
        retake: null,
        marking: null,
        error: null,
        screen: isSessionComplete(state.session) ? SCREENS.RECAP : SCREENS.EXAM,
      };

    case ACTIONS.RETAKE_STARTED:
      return { ...state, retake: { turnId: action.turnId, text: "", duration: null }, screen: SCREENS.EXAM, error: null };

    case ACTIONS.RETAKE_DONE: {
      const turns = state.turns.map((turn) => (turn.id === action.turnId
        ? { ...turn, retakes: [...(turn.retakes || []), { text: action.text, duration: action.duration }].slice(-3) }
        : turn));
      return {
        ...state,
        turns,
        retake: { turnId: action.turnId, text: action.text, duration: action.duration },
        screen: SCREENS.RETAKE,
      };
    }

    case ACTIONS.REPORT_REQUESTED:
      return { ...state, busy: "report", reportStatus: "loading", screen: SCREENS.RECAP };

    case ACTIONS.REPORT_SUCCEEDED:
      return { ...state, busy: "", report: action.report, reportStatus: "ready" };

    case ACTIONS.REPORT_FAILED:
      return { ...state, busy: "", reportStatus: "failed", error: action.error };

    case ACTIONS.ERROR:
      return { ...state, error: action.error };

    default:
      return state;
  }
}
