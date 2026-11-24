// V4 product configuration. UI copy is English (B1 level, British spelling).

export const DEFAULT_SETTINGS = {
  voice_playback_enabled: true,
};

// V4 uses a new storage key so V2/V3 snapshots (chat layout) are never
// restored into the V4 screens.
export const STORAGE_KEY = "examiner-victoria-v4-state";
export const MEMO_KEY = "examiner-victoria-v4-memo";
export const SAVED_TURNS_LIMIT = 24;

export const TRAINING_MODES = [
  { value: "practice", label: "Practice", hint: "Feedback after each answer" },
  { value: "mock", label: "Mock", hint: "No feedback until the end" },
];

// Order and copy match the V2.2 home screen.
export const PRACTICE_TYPES = [
  { value: "part1", label: "Part 1", title: "Interview", meta: "4 short questions", minutes: "4–5 min" },
  { value: "part2", label: "Part 2", title: "Long turn", meta: "1 min prep · 2 min talk", minutes: "4 min" },
  { value: "part3", label: "Part 3", title: "Discussion", meta: "Bigger questions", minutes: "5 min" },
  { value: "full", label: "Full", title: "Full mock test", meta: "Part 1 → 2 → 3", minutes: "12–15 min" },
];

export const PART2_PREP_SECONDS = 60;
export const PART2_MIN_SECONDS = 60;
export const PART2_MAX_SECONDS = 120;
export const DESKTOP_QUERY = "(min-width: 1024px)";
