export const ACTIONS = {
  PATCH: "PATCH",
  RESTORED: "RESTORED",
  HOME: "HOME",
  SESSION_STARTING: "SESSION_STARTING",
  SESSION_STARTED: "SESSION_STARTED",
  SESSION_FAILED: "SESSION_FAILED",
  ANSWER_SENDING: "ANSWER_SENDING",
  ANSWER_SUCCEEDED: "ANSWER_SUCCEEDED",
  ANSWER_FAILED: "ANSWER_FAILED",
  MARKING_STEP: "MARKING_STEP",
  NEXT_QUESTION: "NEXT_QUESTION",
  RETAKE_STARTED: "RETAKE_STARTED",
  RETAKE_DONE: "RETAKE_DONE",
  REPORT_REQUESTED: "REPORT_REQUESTED",
  REPORT_SUCCEEDED: "REPORT_SUCCEEDED",
  REPORT_FAILED: "REPORT_FAILED",
  ERROR: "ERROR",
};

export const patch = (values) => ({ type: ACTIONS.PATCH, values });
export const restored = (snapshot) => ({ type: ACTIONS.RESTORED, snapshot });
export const goHome = () => ({ type: ACTIONS.HOME });
export const sessionStarting = () => ({ type: ACTIONS.SESSION_STARTING });
export const sessionStarted = (session) => ({ type: ACTIONS.SESSION_STARTED, session, now: Date.now() });
export const sessionFailed = (error) => ({ type: ACTIONS.SESSION_FAILED, error });
export const answerSending = (marking) => ({ type: ACTIONS.ANSWER_SENDING, marking });
export const answerSucceeded = (data, turn) => ({ type: ACTIONS.ANSWER_SUCCEEDED, data, turn, now: Date.now() });
export const answerFailed = (error, pendingAnswer = null) => ({ type: ACTIONS.ANSWER_FAILED, error, pendingAnswer });
export const markingStep = (step) => ({ type: ACTIONS.MARKING_STEP, step });
export const nextQuestion = () => ({ type: ACTIONS.NEXT_QUESTION });
export const retakeStarted = (turnId) => ({ type: ACTIONS.RETAKE_STARTED, turnId });
export const retakeDone = (turnId, text, duration) => ({ type: ACTIONS.RETAKE_DONE, turnId, text, duration });
export const reportRequested = () => ({ type: ACTIONS.REPORT_REQUESTED });
export const reportSucceeded = (report) => ({ type: ACTIONS.REPORT_SUCCEEDED, report });
export const reportFailed = (error, returnScreen = null) => ({ type: ACTIONS.REPORT_FAILED, error, returnScreen });
export const setError = (error) => ({ type: ACTIONS.ERROR, error });
