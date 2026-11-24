// V4 frontend smoke test: pure logic only (reducer, view helpers, API error
// mapping). Run with `pnpm test:smoke`. No browser and no network needed.
import assert from "node:assert/strict";
import "./speech_playback_test.js";
import "./audio_silence_test.js";
import { readFileSync } from "node:fs";

import { fetchRuntimeDiagnostics, healthCheck, sendAnswer, sendTelemetryEvent, synthesizeSpeech, TTS_TIMEOUT_MS } from "./src/api.js";
import { browserSpeechTranscriptionIsSupported } from "./src/browserSpeechTranscriber.js";
import { STORAGE_KEY } from "./src/config/appConfig.js";
import {
  answerFailed,
  answerSending,
  answerSucceeded,
  goHome,
  markingStep,
  nextQuestion,
  patch,
  restored,
  retakeDone,
  retakeStarted,
  sessionStarted,
  sessionStarting,
} from "./src/state/actions.js";
import { appReducer } from "./src/state/appReducer.js";
import { initialState, SCREENS } from "./src/state/initialState.js";
import { ERROR_KINDS, friendlyError, INVALID_ANSWER_MESSAGE, transcriptionRecovery, VOICE_UNAVAILABLE_MESSAGE } from "./src/utils/errors.js";
import { compareRetake, hasMarks, retakeHeadline, topFix, transcriptSegments, verdictChips } from "./src/utils/feedbackView.js";
import { parseReport } from "./src/utils/reportView.js";
import { analyzeUserAgent, buildDiagnosticCopyText } from "./src/utils/runtimeDiagnostics.js";
import { displayQuestion, parseCueCard, progressFor, speakableText, stripMarkdown } from "./src/utils/sessionView.js";

function setNavigator(value) {
  Object.defineProperty(globalThis, "navigator", { value, configurable: true });
}

function installWindow() {
  globalThis.window = { clearTimeout, setTimeout, innerHeight: 667, innerWidth: 375, SpeechRecognition: function SpeechRecognition() {} };
}

function session(overrides = {}) {
  return {
    session_id: "s-1",
    phase: "part1",
    practice_mode: true,
    practice_type: "part1",
    test_active: true,
    current_question: "Do you like music?",
    part1_queue: ["Do you like music?", "When do you listen?", "Who taught you?", "Do you sing?"],
    part1_index: 1,
    messages: [{ role: "assistant", content: "Do you like music?", phase: "part1" }],
    candidate_answers: [],
    answer_stats: [],
    ...overrides,
  };
}

const PRACTICE_FEEDBACK = {
  mode: "practice",
  coaching: true,
  available: true,
  kind: "relevant",
  correction: { sentence: 'Say "I really like" instead of "I very like".', quote: "I very like", replacement: "I really like", quote_in_answer: true },
  tip: null,
  natural_version: null,
  edits: [],
  hesitations: [{ kind: "filler", text: "um", word_index: 0 }],
  hesitation_count: 1,
  word_count: 6,
  duration: 4,
  words_per_minute: 90,
  pace: "good",
};

function assertProductMetadata() {
  const indexHtml = readFileSync("./index.html", "utf8");
  const manifest = JSON.parse(readFileSync("./public/manifest.webmanifest", "utf8"));
  assert.match(indexHtml, /<title>Examiner Victoria<\/title>/);
  assert.equal(manifest.name, "Examiner Victoria");
  assert.equal(STORAGE_KEY, "examiner-victoria-v4-state");
  // The V4 UI is English only; no Chinese UI copy except WeChat menu names.
  const app = readFileSync("./src/App.jsx", "utf8");
  assert.doesNotMatch(app, /[一-鿿]/);
  const tokens = readFileSync("./src/styles/tokens.css", "utf8");
  for (const color of ["#0E1424", "#F7F5F0", "#E8663A", "#D63F27", "#B42328", "#0A7552", "#8A5600", "#4B4BD8"]) {
    assert.ok(tokens.includes(color), `token ${color} must stay in the palette`);
  }
}

function assertSessionView() {
  assert.equal(stripMarkdown("**Part 1 - Introduction and Interview**\n\nGood afternoon."), "Good afternoon.");
  assert.equal(speakableText("Thank you. That is the end of Part 1 practice. Tap **Score** to view your report."), "Thank you. That is the end of Part 1 practice.");
  const card = parseCueCard("Describe a building.\n\nYou should say:\n- what it is\n- where it is");
  assert.equal(card.title, "Describe a building.");
  assert.deepEqual(card.bullets, ["what it is", "where it is"]);
  assert.deepEqual(progressFor(session()), { label: "Part 1", total: 4, current: 1 });
  assert.equal(progressFor(session({ phase: "part3", part3_target_count: 4, part3_index: 2 })).current, 3);
  const longTurn = session({ phase: "part2_long", current_question: "**Part 2 - Long Turn**\n\nDescribe a building.", cue_card: { prompt: "Describe a building.\n\nYou should say:\n- what it is" } });
  assert.equal(displayQuestion(longTurn), "Describe a building.");
  assert.match(displayQuestion({ ...longTurn, current_question: "Please continue - you still have time." }), /^Please continue/);
}

function assertFeedbackView() {
  const answer = "Um I very like pop music.";
  const segments = transcriptSegments(answer, PRACTICE_FEEDBACK);
  assert.ok(segments.some((s) => s.type === "del" && s.text === "I very like"));
  assert.ok(segments.some((s) => s.type === "ins" && s.text === "I really like"));
  assert.ok(segments.some((s) => s.type === "filler"));
  assert.equal(hasMarks(PRACTICE_FEEDBACK), true);
  const fix = topFix(PRACTICE_FEEDBACK);
  assert.equal(fix.label, "Top fix");
  assert.equal(fix.to, "I really like");
  const tipOnly = topFix({ ...PRACTICE_FEEDBACK, correction: null, tip: "Give one reason." });
  assert.equal(tipOnly.label, "Next step");
  assert.equal(topFix({ ...PRACTICE_FEEDBACK, coaching: false }), null, "mock answers never show a fix");
  const chips = verdictChips(PRACTICE_FEEDBACK).map((chip) => chip.text);
  assert.ok(chips.includes("On topic"));
  assert.ok(chips.some((text) => text.startsWith("Pace")));
  assert.ok(chips.includes("1 hesitation"));
  // Diff edits from the backend render in order.
  const diff = transcriptSegments("I go there yesterday.", { edits: [
    { op: "equal", text: "I" }, { op: "replace", text: "go", replacement: "went" }, { op: "equal", text: "there yesterday ." },
  ] });
  assert.deepEqual(diff.filter((s) => s.type !== "text").map((s) => `${s.type}:${s.text}`), ["del:go", "ins:went"]);
  // Retake compares locally and never invents improvements.
  const turn = { answer, duration: 4, feedback: PRACTICE_FEEDBACK };
  const better = compareRetake(turn, { text: "I really like pop music because it is fun.", duration: 6 });
  assert.equal(better.improvedCount, 3);
  assert.match(retakeHeadline(better), /everything right/);
  const same = compareRetake(turn, { text: "Um I very like pop.", duration: 3 });
  assert.equal(same.improvedCount, 0);
}

function assertReportParsing() {
  const report = [
    "## Overall band estimate", "Around 6.0 based on short answers.",
    "## Skill breakdown",
    "- **Fluency and Coherence:** answers are short.",
    "- **Lexical Resource:** some repetition.",
    "- **Grammar:** mostly accurate.",
    "## Three recurring spoken-language problems", "1. Short answers.", "2. Vague words.", "3. Tense slips.",
    "## Corrected examples", "> Original: I very like it.", "> Better: I really like it.",
    "## Next-session practice tasks", "1. Add one reason.", "2. Add an example.",
    "---", "## Session learning summary", "**Next-session focus:** Extend short answers with a clear reason.",
  ].join("\n");
  const parsed = parseReport(report);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.oneThing, "Extend short answers with a clear reason.");
  assert.deepEqual(parsed.criteria.map((c) => c.title), ["Fluency", "Vocabulary", "Grammar", "Pronunciation"]);
  assert.equal(parsed.criteria[3].comment, "Can't be judged from text.");
  assert.equal(parsed.examples[0].better, "I really like it.");
  assert.equal(parsed.tasks.length, 2);
  assert.equal(parseReport("plain text").ok, false);
}

function assertReducerFlow() {
  let state = appReducer(initialState, patch({ trainingMode: "practice", practiceType: "part1" }));
  state = appReducer(state, sessionStarting());
  assert.equal(state.busy, "starting");
  state = appReducer(state, sessionStarted(session()));
  assert.equal(state.screen, SCREENS.EXAM);
  state = appReducer(state, answerSending({ question: "Do you like music?", phase: "part1", transcript: "I very like it.", source: "audio", duration: 4 }));
  assert.equal(state.screen, SCREENS.MARKING);
  assert.equal(state.marking.step, "marking");
  const next = session({ part1_index: 2, current_question: "When do you listen?" });
  const turn = { id: "t1", question: "Do you like music?", phase: "part1", answer: "I very like it.", source: "audio", duration: 4, feedback: PRACTICE_FEEDBACK, retakes: [] };
  state = appReducer(state, answerSucceeded({ session: next, spoken_text: "When do you listen?", feedback: PRACTICE_FEEDBACK }, turn));
  assert.equal(state.marking.step, "audio");
  assert.equal(state.nextSpeech, "When do you listen?");
  state = appReducer(state, markingStep("ready"));
  state = appReducer(state, markingStep("done"));
  assert.equal(state.screen, SCREENS.REVIEW);
  state = appReducer(state, retakeStarted("t1"));
  assert.equal(state.screen, SCREENS.EXAM);
  state = appReducer(state, retakeDone("t1", "I really like it.", 3));
  assert.equal(state.screen, SCREENS.RETAKE);
  assert.equal(state.session.part1_index, 2, "retake must not advance the session");
  assert.equal(state.turns[0].retakes.length, 1);
  state = appReducer(state, nextQuestion());
  assert.equal(state.screen, SCREENS.EXAM);

  // Offline: the answer is kept for retry and the session is unchanged.
  const before = state.session;
  state = appReducer(state, answerSending({ question: "q", phase: "part1", transcript: "Hello there", source: "text", duration: null }));
  state = appReducer(state, answerFailed({ kind: ERROR_KINDS.OFFLINE, message: "offline" }, { answer: "Hello there", source: "text", duration: null }));
  assert.equal(state.session, before);
  assert.equal(state.pendingAnswer.answer, "Hello there");

  // Mock: no marking screen, straight to the next question.
  let mock = appReducer({ ...initialState, trainingMode: "mock" }, sessionStarted(session({ practice_mode: false, phase: "identity" })));
  mock = appReducer(mock, answerSending({ question: "q", phase: "identity", transcript: "Alex", source: "text", duration: null }));
  assert.equal(mock.screen, SCREENS.EXAM);
  mock = appReducer(mock, answerSucceeded({ session: session({ practice_mode: false }), spoken_text: "Do you work?" }, { id: "m1", feedback: { coaching: false } }));
  assert.equal(mock.screen, SCREENS.EXAM);
  mock = appReducer(mock, answerSucceeded({ session: session({ phase: "complete", test_active: false }), spoken_text: "Thank you." }, { id: "m2", feedback: { coaching: false } }));
  assert.equal(mock.screen, SCREENS.RECAP);

  // Part 2 prep starts when the long turn begins.
  const p2 = appReducer(initialState, sessionStarted(session({ phase: "part2_long" })));
  assert.ok(p2.prepEndsAt > Date.now());

  // Restore keeps the client-held session (incl. adaptive profile) untouched.
  const profile = { version: 1, state: "guided", observations: [], last_processed_answer_index: 3 };
  const saved = session({ learner_support_profile: profile });
  const restoredState = appReducer(initialState, restored({ session: saved, turns: [turn], trainingMode: "practice" }));
  assert.equal(restoredState.session.learner_support_profile, profile);
  assert.equal(restoredState.screen, SCREENS.EXAM);
  assert.equal(appReducer(restoredState, goHome()).session, null);
}

async function assertApiErrorMapping() {
  installWindow();
  setNavigator({ maxTouchPoints: 0, onLine: true, platform: "Win32", userAgent: "Node" });
  globalThis.fetch = async () => {
    const error = new Error("aborted");
    error.name = "AbortError";
    throw error;
  };
  await assert.rejects(healthCheck(), /timed out/);
  globalThis.fetch = async () => {
    throw new Error("network down");
  };
  await assert.rejects(healthCheck(), /not reachable/);
  globalThis.fetch = async () => ({ ok: false, status: 422, statusText: "Unprocessable Entity", json: async () => ({ detail: INVALID_ANSWER_MESSAGE }) });
  await assert.rejects(sendAnswer({ session: session(), answer: "... 123 ...", source: "text", duration: null }), { message: INVALID_ANSWER_MESSAGE });
  assert.equal(transcriptionRecovery(new Error("Clearly silent recording.")).kind, ERROR_KINDS.SILENT);
  assert.equal(transcriptionRecovery(new Error("Microphone permission denied")).kind, ERROR_KINDS.MIC);
  assert.equal(transcriptionRecovery(Object.assign(new Error("Audio transcription is temporarily unavailable"), { status: 502 })).retryAudio, true);
  assert.equal(transcriptionRecovery(new Error("Victoria's server is not reachable")).kind, ERROR_KINDS.OFFLINE);
  assert.equal(transcriptionRecovery(Object.assign(new Error("Too many requests"), { status: 429 })).retryAudio, false);
  assert.equal(friendlyError(new Error(INVALID_ANSWER_MESSAGE), "fallback"), INVALID_ANSWER_MESSAGE);

  assert.equal(TTS_TIMEOUT_MS, 12000);
  globalThis.fetch = async () => {
    const error = new Error("aborted");
    error.name = "AbortError";
    throw error;
  };
  await assert.rejects(synthesizeSpeech("Hello", "s-1"), /can't speak right now/);
  assert.equal(friendlyError(new Error(VOICE_UNAVAILABLE_MESSAGE), "fallback"), VOICE_UNAVAILABLE_MESSAGE);

  globalThis.fetch = async (url) => {
    assert.match(String(url), /\/api\/diagnostics\/runtime$/);
    return { ok: true, json: async () => ({ status: "ok" }) };
  };
  assert.equal((await fetchRuntimeDiagnostics()).status, "ok");

  setNavigator({ maxTouchPoints: 1, onLine: true, platform: "iPhone", sendBeacon: () => false, userAgent: "Node" });
  globalThis.fetch = () => Promise.reject(new Error("telemetry down"));
  assert.doesNotThrow(() => sendTelemetryEvent("smoke-test", { durationMs: 1 }));
}

function assertBrowserGuards() {
  installWindow();
  setNavigator({ maxTouchPoints: 5, platform: "iPhone", userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" });
  assert.equal(browserSpeechTranscriptionIsSupported(), false, "iOS uses the server transcription path");
  assert.equal(analyzeUserAgent("Mozilla/5.0 MicroMessenger/8.0", "iPhone", 5).isWeChat, true);
  const copy = buildDiagnosticCopyText({ environment: {}, recording: {}, api: { status: "ok", token: "secret-token" }, playback: {}, storage: {} });
  assert.doesNotMatch(copy, /secret-token/);
}

await assertApiErrorMapping();
assertProductMetadata();
assertSessionView();
assertFeedbackView();
assertReportParsing();
assertReducerFlow();
assertBrowserGuards();

console.log("Frontend smoke test passed");
