import assert from "node:assert/strict";
import { appReducer } from "./src/state/appReducer.js";
import { createInitialAppState } from "./src/state/initialState.js";
import { feedbackAdaptationSet, sessionRestored, sessionStartSucceeded } from "./src/state/actions.js";
import { loadSavedSession, saveSessionSnapshot } from "./src/utils/sessionStorage.js";
import { buildPracticeRecordText, buildTranscriptText } from "./src/utils/downloads.js";
import { splitFeedbackPlayback } from "./src/utils/feedbackPlayback.js";

const profile = { version: 1, state: "guided", observations: [{ state: "guided", reason: "basic_language" }],
  last_processed_answer_index: 3, pending_state: null, pending_count: 0, notice_shown: true };
const session = { session_id: "synthetic-adaptive", phase: "part1", practice_mode: true,
  practice_type: "part1", current_question: "When do you listen?", feedback_adaptation: "adaptive",
  learner_support_profile: profile, candidate_answers: [{ phase: "part1", question: "Do you like music?", answer: "Yes, I like jazz." }],
  messages: [{ role: "assistant", adaptation_notice: true,
    content: "**A natural version of your answer:**\n\n> Jazz is my favourite kind of music.\n\nWhen do you listen?" }] };
const original = JSON.stringify(session);
let state = appReducer(createInitialAppState(), sessionRestored({ session }));
assert.equal(state.feedbackAdaptation, "adaptive");
state = appReducer(state, feedbackAdaptationSet("standard"));
assert.equal(state.session.feedback_adaptation, "standard");
assert.equal(state.session.current_question, session.current_question);
assert.equal(state.session.session_id, session.session_id);
assert.equal(state.session.messages, session.messages);
assert.equal(state.session.candidate_answers, session.candidate_answers);
assert.equal(state.session.learner_support_profile, profile);
state = appReducer(state, feedbackAdaptationSet("adaptive"));
assert.equal(state.session.learner_support_profile.last_processed_answer_index, 3);
assert.equal(JSON.stringify(session), original, "toggling must not mutate the previous session");

// Refresh keeps the exact bounded profile through the existing snapshot path.
const previousWindow = globalThis.window;
const storage = new Map();
globalThis.window = { localStorage: {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key),
} };
try {
  saveSessionSnapshot("adaptive-test", { session: state.session });
  const restored = appReducer(createInitialAppState(), sessionRestored(loadSavedSession("adaptive-test")));
  assert.deepEqual(restored.session, state.session);
  const old = appReducer(createInitialAppState(), sessionRestored({ session: { ...session,
    feedback_adaptation: undefined, learner_support_profile: undefined } }));
  assert.equal(old.feedbackAdaptation, "standard");
  assert.equal(old.session.current_question, session.current_question);
} finally { globalThis.window = previousWindow; }

for (const overrides of [{ trainingMode: "mock" }, { practiceType: "full" }, { practiceType: "part2" },
  { practiceType: "part3" }, { busy: "thinking" }]) {
  const isolated = { ...state, ...overrides };
  assert.equal(appReducer(isolated, feedbackAdaptationSet("standard")), isolated);
}
const fresh = { ...session, learner_support_profile: { version: 1, state: "unknown", observations: [] },
  feedback_adaptation: "standard", candidate_answers: [], messages: [] };
assert.deepEqual(appReducer(state, sessionStartSucceeded(fresh)).session.learner_support_profile.observations, []);

// F-015 still extracts only the Natural version body; metadata never enters exports.
const sections = splitFeedbackPlayback(session.messages[0].content);
assert.deepEqual(sections.filter((item) => item.text).map((item) => item.text), ["Jazz is my favourite kind of music."]);
for (const exported of [buildTranscriptText(session), buildPracticeRecordText(session, "")]) {
  assert.doesNotMatch(exported, /learner_support_profile|basic_language|last_processed_answer_index|adaptation_notice/);
}
console.log("Adaptive feedback toggle, snapshot, isolation and F-015 checks passed.");
