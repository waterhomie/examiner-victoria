export const ACTIONS = {
  ANSWER_FAILED: "answer/failed",
  ANSWER_REQUESTED: "answer/requested",
  ANSWER_SUCCEEDED: "answer/succeeded",
  AUDIO_TOGGLED: "audio/toggled",
  BUSY_SET: "ui/busy-set",
  CLOCK_TICK_SET: "timer/clock-tick-set",
  DRAFT_CLEARED: "composer/draft-cleared",
  DRAFT_SET: "composer/draft-set",
  ERROR_SET: "ui/error-set",
  HEALTH_LOADED: "health/loaded",
  MODE_SET: "composer/mode-set",
  MODE_TOGGLED: "composer/mode-toggled",
  PRACTICE_OPTIONS_LOADED: "practice/options-loaded",
  PREP_TIMER_SET: "timer/prep-timer-set",
  REPORT_FAILED: "report/failed",
  REPORT_REQUESTED: "report/requested",
  REPORT_SUCCEEDED: "report/succeeded",
  REVIEW_BEFORE_SEND_SET: "composer/review-before-send-set",
  SESSION_RESTORED: "session/restored",
  SESSION_START_FAILED: "session/start-failed",
  SESSION_START_REQUESTED: "session/start-requested",
  SESSION_START_SUCCEEDED: "session/start-succeeded",
  STORAGE_READY_SET: "storage/ready-set",
};

export const answerFailed = (message) => ({ type: ACTIONS.ANSWER_FAILED, message });
export const answerRequested = () => ({ type: ACTIONS.ANSWER_REQUESTED });
export const answerSucceeded = (session) => ({ type: ACTIONS.ANSWER_SUCCEEDED, session });
export const audioToggled = () => ({ type: ACTIONS.AUDIO_TOGGLED });
export const busySet = (busy) => ({ type: ACTIONS.BUSY_SET, busy });
export const clockTickSet = (clockTick) => ({ type: ACTIONS.CLOCK_TICK_SET, clockTick });
export const draftCleared = () => ({ type: ACTIONS.DRAFT_CLEARED });
export const draftSet = (draft) => ({ type: ACTIONS.DRAFT_SET, draft });
export const errorSet = (error) => ({ type: ACTIONS.ERROR_SET, error });
export const healthLoaded = (healthInfo) => ({ type: ACTIONS.HEALTH_LOADED, healthInfo });
export const modeSet = (mode) => ({ type: ACTIONS.MODE_SET, mode });
export const modeToggled = () => ({ type: ACTIONS.MODE_TOGGLED });
export const practiceOptionsLoaded = (practiceOptions) => ({
  type: ACTIONS.PRACTICE_OPTIONS_LOADED,
  practiceOptions,
});
export const prepTimerSet = (prepEndsAt, clockTick = Date.now()) => ({
  type: ACTIONS.PREP_TIMER_SET,
  prepEndsAt,
  clockTick,
});
export const reportFailed = (message) => ({ type: ACTIONS.REPORT_FAILED, message });
export const reportRequested = () => ({ type: ACTIONS.REPORT_REQUESTED });
export const reportSucceeded = (report) => ({ type: ACTIONS.REPORT_SUCCEEDED, report });
export const reviewBeforeSendSet = (reviewBeforeSend) => ({
  type: ACTIONS.REVIEW_BEFORE_SEND_SET,
  reviewBeforeSend,
});
export const sessionRestored = (snapshot) => ({ type: ACTIONS.SESSION_RESTORED, snapshot });
export const sessionStartFailed = (message) => ({ type: ACTIONS.SESSION_START_FAILED, message });
export const sessionStartRequested = ({
  practiceType,
  selectedCueCardTitle,
  selectedPart1Topic,
  trainingMode,
}) => ({
  type: ACTIONS.SESSION_START_REQUESTED,
  practiceType,
  selectedCueCardTitle,
  selectedPart1Topic,
  trainingMode,
});
export const sessionStartSucceeded = (session) => ({ type: ACTIONS.SESSION_START_SUCCEEDED, session });
export const storageReadySet = (storageReady) => ({ type: ACTIONS.STORAGE_READY_SET, storageReady });
