// V4 app state. Screens: home → call → exam → marking → review → (retake) → … → recap.
// The exam session itself is still client-held and sent with every request.

export const SCREENS = {
  HOME: "home",
  CALL: "call",
  EXAM: "exam",
  MARKING: "marking",
  REVIEW: "review",
  RETAKE: "retake",
  RECAP: "recap",
};

export const initialState = {
  screen: SCREENS.HOME,

  // Home choices
  trainingMode: "practice",
  practiceType: "part1",
  part1Topic: "",
  cueCardTitle: "",
  feedbackAdaptation: "standard",

  // Settings
  audioEnabled: true,
  captions: null, // null = default for the mode (Practice on, Mock off)
  sheet: "", // "" | "settings" | "type" | "end"

  // Backend data
  health: null,
  practiceOptions: { part1_topics: [], cue_cards: [], question_bank_label: "" },
  session: null,

  // Per-answer history kept on this device for review, retake and recap.
  // { id, question, phase, answer, source, duration, feedback, retakes: [] }
  turns: [],
  activeTurnId: null,

  // Marking screen: transcript first, marks added when the answer returns.
  marking: null, // { question, phase, transcript, source, duration, step }
  retake: null, // { turnId, text, duration }
  pendingAnswer: null, // offline: { answer, source, duration }
  nextSpeech: "",

  report: "",
  reportStatus: "idle", // idle | loading | ready | failed

  prepEndsAt: null,
  part2Started: false,
  clockTick: 0,
  busy: "", // "" | "starting" | "sending" | "report"
  error: null, // { kind, message, canRetry }
  voiceIssue: "",
};
