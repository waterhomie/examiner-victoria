import assert from "node:assert/strict";

import { healthCheck, sendTelemetryEvent } from "./src/api.js";
import { browserSpeechTranscriptionIsSupported } from "./src/browserSpeechTranscriber.js";
import { appReducer } from "./src/state/appReducer.js";
import {
  answerRequested,
  answerSucceeded,
  practiceOptionsLoaded,
  sessionStartRequested,
  sessionStartSucceeded,
} from "./src/state/actions.js";
import { createInitialAppState } from "./src/state/initialState.js";
import { selectCapabilities, selectSessionView } from "./src/state/selectors.js";

function setNavigator(value) {
  Object.defineProperty(globalThis, "navigator", {
    value,
    configurable: true,
  });
}

function installWindow() {
  globalThis.window = {
    clearTimeout,
    innerHeight: 667,
    innerWidth: 375,
    setTimeout,
    SpeechRecognition: function SpeechRecognition() {},
  };
}

function createSession(overrides = {}) {
  return {
    messages: [],
    candidate_answers: [],
    answer_stats: [],
    phase: "identity",
    practice_type: "full",
    test_active: true,
    voice_playback_enabled: true,
    ...overrides,
  };
}

function assertReducerFlow() {
  let state = createInitialAppState();
  state = appReducer(
    state,
    sessionStartRequested({
      practiceType: "part1",
      selectedCueCardTitle: "",
      selectedPart1Topic: "work or studies",
      trainingMode: "practice",
    }),
  );
  assert.equal(state.busy, "starting");
  assert.equal(state.practiceType, "part1");
  assert.equal(state.selectedPart1Topic, "work or studies");

  state = appReducer(state, sessionStartSucceeded(createSession({ voice_playback_enabled: false })));
  assert.equal(state.busy, "");
  assert.equal(state.audioEnabled, false);

  state = appReducer(state, answerRequested());
  assert.equal(state.busy, "thinking");
  assert.equal(state.draft, "");

  state = appReducer(state, answerSucceeded(createSession({ phase: "part1" })));
  assert.equal(state.busy, "");
  assert.equal(state.session.phase, "part1");
}

function assertStageCardSelector() {
  let state = createInitialAppState();
  state = appReducer(state, practiceOptionsLoaded({ part1_topics: ["work"], cue_cards: [] }));
  state = { ...state, practiceType: "part1", session: createSession({ phase: "identity" }) };
  assert.equal(selectSessionView(state).shouldShowStageCard, true);

  state = {
    ...state,
    session: createSession({
      phase: "part1",
      messages: [
        { role: "assistant", phase: "identity", content: "Could you tell me your full name?" },
        { role: "user", phase: "identity", content: "My name is Water." },
        { role: "assistant", phase: "part1", content: "Do you work, or are you a student?" },
      ],
      candidate_answers: [{ phase: "identity", answer: "My name is Water." }],
    }),
  };
  assert.equal(selectSessionView(state).shouldShowStageCard, false);

  state = {
    ...state,
    session: createSession({
      phase: "part1",
      candidate_answers: [{ phase: "part1", answer: "I study architecture." }],
    }),
  };
  assert.equal(selectSessionView(state).shouldShowStageCard, false);

  state = { ...state, prepEndsAt: Date.now() + 30000, clockTick: Date.now() };
  assert.equal(selectSessionView(state).shouldShowStageCard, true);
}

function assertCapabilities() {
  const state = { ...createInitialAppState(), busy: "", session: createSession() };
  assert.equal(selectCapabilities(state, false).canAnswer, true);
  assert.equal(selectCapabilities(state, true).canAnswer, false);
}

function assertBrowserSpeechIOSGuard() {
  installWindow();
  setNavigator({
    maxTouchPoints: 5,
    platform: "iPhone",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
  });
  assert.equal(browserSpeechTranscriptionIsSupported(), false);
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
}

function assertTelemetryFailureIsNonBlocking() {
  installWindow();
  setNavigator({
    maxTouchPoints: 1,
    onLine: true,
    platform: "iPhone",
    sendBeacon: () => false,
    userAgent: "Node",
  });
  globalThis.fetch = () => Promise.reject(new Error("telemetry down"));
  assert.doesNotThrow(() => sendTelemetryEvent("smoke-test", { durationMs: 1, text: "redacted upstream" }));
}

await assertApiErrorMapping();
assertBrowserSpeechIOSGuard();
assertCapabilities();
assertReducerFlow();
assertStageCardSelector();
assertTelemetryFailureIsNonBlocking();

console.log("V2 frontend smoke test passed");
