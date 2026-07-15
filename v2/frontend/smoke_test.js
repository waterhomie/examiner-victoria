import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { fetchRuntimeDiagnostics, healthCheck, sendTelemetryEvent, synthesizeSpeech, TTS_TIMEOUT_MS } from "./src/api.js";
import { browserSpeechTranscriptionIsSupported } from "./src/browserSpeechTranscriber.js";
import { appReducer } from "./src/state/appReducer.js";
import {
  answerRequested,
  answerSucceeded,
  errorSet,
  practiceOptionsLoaded,
  sessionStartRequested,
  sessionStartSucceeded,
} from "./src/state/actions.js";
import { createInitialAppState } from "./src/state/initialState.js";
import { selectCapabilities, selectMessages, selectSessionView } from "./src/state/selectors.js";
import {
  analyzeUserAgent,
  buildDiagnosticCopyText,
  checkLocalStorage,
  getPageEnvironment,
  getRecordingSupport,
} from "./src/utils/runtimeDiagnostics.js";
import { VOICE_UNAVAILABLE_MESSAGE, friendlyError } from "./src/utils/errors.js";

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

function assertProductMetadata() {
  const indexHtml = readFileSync("./index.html", "utf8");
  const manifestSource = readFileSync("./public/manifest.webmanifest", "utf8");
  const manifest = JSON.parse(manifestSource);

  assert.match(indexHtml, /<title>Examiner Victoria<\/title>/);
  assert.doesNotMatch(indexHtml, /<title>Examiner Victoria V2<\/title>/);
  assert.equal(manifest.name, "Examiner Victoria");
  assert.equal(manifest.short_name, "Victoria");
  assert.doesNotMatch(manifestSource, /Examiner Victoria V2|Examiner Victoria V3(?: Beta)?/);
}

function createSession(overrides = {}) {
  return {
    messages: [],
    candidate_answers: [],
    answer_stats: [],
    phase: "identity",
    practice_type: "full",
    test_active: true,
    practice_mode: true,
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
  assert.equal(state.selectedPart1Topic, "work or studies");

  let randomTopicState = createInitialAppState();
  randomTopicState = appReducer(
    randomTopicState,
    sessionStartRequested({
      practiceType: "part1",
      selectedCueCardTitle: "",
      selectedPart1Topic: "",
      trainingMode: "practice",
    }),
  );
  randomTopicState = appReducer(
    randomTopicState,
    sessionStartSucceeded(createSession({ part1_topic: "music" })),
  );
  assert.equal(randomTopicState.selectedPart1Topic, "");

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


function assertMockModeSelectors() {
  const baseMessages = [
    { role: "assistant", phase: "identity", content: "Could you tell me your name?" },
    { role: "user", phase: "identity", content: "My name is Water." },
    { role: "assistant", phase: "part1", content: "Do you work, or are you a student?" },
  ];
  const practiceState = {
    ...createInitialAppState(),
    trainingMode: "practice",
    session: createSession({ messages: baseMessages, practice_mode: true }),
  };
  assert.equal(selectMessages(practiceState).length, 3);
  assert.equal(selectSessionView(practiceState).mockExam, null);

  const mockPart1State = {
    ...createInitialAppState(),
    trainingMode: "mock",
    session: createSession({
      current_question: "Do you work, or are you a student?",
      messages: baseMessages,
      phase: "part1",
      practice_mode: false,
    }),
  };
  assert.equal(selectMessages(mockPart1State).length, 0);
  assert.equal(selectSessionView(mockPart1State).mockExam.title, "Voice-first mock exam");
  assert.equal(selectSessionView(mockPart1State).mockExam.showQuestionFallback, true);

  const mockPart2State = {
    ...createInitialAppState(),
    trainingMode: "mock",
    session: createSession({
      messages: [
        { role: "assistant", phase: "part2_long", content: "Part 2 cue card" },
        { role: "user", phase: "part2_long", content: "Hidden transcript" },
      ],
      phase: "part2_long",
      practice_mode: false,
    }),
  };
  const visiblePart2Messages = selectMessages(mockPart2State);
  assert.equal(visiblePart2Messages.length, 1);
  assert.equal(visiblePart2Messages[0].content, "Part 2 cue card");
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

async function assertTtsFailureMapping() {
  installWindow();
  setNavigator({ maxTouchPoints: 0, onLine: true, platform: "Win32", userAgent: "Node" });
  assert.equal(TTS_TIMEOUT_MS, 12000);

  globalThis.fetch = async (url, options) => {
    assert.match(String(url), /\/api\/tts$/);
    assert.equal(options?.method, "POST");
    const payload = JSON.parse(String(options?.body || "{}"));
    assert.equal(payload.text, "Hello");
    assert.equal(payload.session_id, "session-1");
    const error = new Error("aborted");
    error.name = "AbortError";
    throw error;
  };
  await assert.rejects(synthesizeSpeech("Hello", "session-1"), new RegExp(VOICE_UNAVAILABLE_MESSAGE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(
    friendlyError(new Error(VOICE_UNAVAILABLE_MESSAGE), "fallback"),
    VOICE_UNAVAILABLE_MESSAGE,
  );

  globalThis.fetch = async () => ({
    ok: false,
    status: 504,
    statusText: "Gateway Timeout",
    json: async () => ({ detail: VOICE_UNAVAILABLE_MESSAGE }),
  });
  await assert.rejects(synthesizeSpeech("Hello", "session-1"), new RegExp(VOICE_UNAVAILABLE_MESSAGE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(
    friendlyError(new Error("Request timed out. Victoria's server may be waking up; please try again."), "fallback"),
    "Victoria's server is taking too long to respond. It may be waking up, so please try again in a moment.",
  );
}

function assertTtsFailurePreservesAnswerState() {
  const previousSession = createSession({
    phase: "part1",
    current_question: "Do you work, or are you a student?",
    candidate_answers: [{ phase: "identity", answer: "My name is Water." }],
  });
  const nextSession = createSession({
    phase: "part1",
    current_question: "What do you like about your studies?",
    candidate_answers: [
      { phase: "identity", answer: "My name is Water." },
      { phase: "part1", answer: "I study architecture." },
    ],
    messages: [
      { role: "user", phase: "part1", content: "I study architecture." },
      { role: "assistant", phase: "part1", content: "What do you like about your studies?" },
    ],
  });
  let state = { ...createInitialAppState(), session: previousSession, busy: "thinking" };
  state = appReducer(state, answerSucceeded(nextSession));
  state = appReducer(state, errorSet(VOICE_UNAVAILABLE_MESSAGE));
  assert.equal(state.error, VOICE_UNAVAILABLE_MESSAGE);
  assert.equal(state.busy, "");
  assert.equal(state.session.current_question, "What do you like about your studies?");
  assert.equal(state.session.candidate_answers.length, 2);
  assert.equal(state.session.messages.at(-1).content, "What do you like about your studies?");
}


function assertRuntimeDiagnosticsUtilities() {
  const wechat = analyzeUserAgent(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) MicroMessenger/8.0",
    "iPhone",
    5,
  );
  assert.equal(wechat.isWeChat, true);
  assert.equal(wechat.isIOS, true);
  assert.equal(wechat.deviceType, "mobile");

  const android = analyzeUserAgent("Mozilla/5.0 (Linux; Android 14) Chrome/120", "Linux armv8", 5);
  assert.equal(android.isAndroid, true);

  const page = getPageEnvironment({
    location: { protocol: "http:", hostname: "example.test" },
    navigator: { userAgent: "Desktop", platform: "Win32", maxTouchPoints: 0 },
    secureContext: false,
  });
  assert.equal(page.https, false);
  assert.equal(page.secureContext, false);

  const noRecording = getRecordingSupport({ navigator: {}, window: {} });
  assert.equal(noRecording.mediaDevices, false);
  assert.equal(noRecording.getUserMedia, false);
  assert.equal(noRecording.mediaRecorder, false);

  const withRecording = getRecordingSupport({
    navigator: { mediaDevices: { getUserMedia() {} } },
    window: { MediaRecorder: { isTypeSupported: (type) => type === "audio/webm" } },
  });
  assert.equal(withRecording.mediaDevices, true);
  assert.equal(withRecording.getUserMedia, true);
  assert.equal(withRecording.mediaRecorder, true);
  assert.equal(withRecording.mimeSupport["audio/webm"], true);

  const unavailableStorage = checkLocalStorage({
    setItem() {
      throw new Error("blocked");
    },
    removeItem() {},
  });
  assert.equal(unavailableStorage.available, false);

  const copyText = buildDiagnosticCopyText({
    time: "2026-07-12T00:00:00.000Z",
    environment: { userAgent: "UA", deviceType: "desktop", isWeChat: false, isIOS: false, isAndroid: false, https: true, secureContext: true },
    recording: { mediaDevices: false, getUserMedia: false, mediaRecorder: false, mimeSupport: {} },
    api: { status: "failed", elapsedMs: 12, token: "redacted-token", api_key: "redacted-api-key" },
    playback: { status: "not tested" },
    storage: { available: true },
  });
  assert.doesNotMatch(copyText, /redacted-token|redacted-api-key|api_key|cookie/i);
}

async function assertRuntimeDiagnosticsApiMapping() {
  installWindow();
  setNavigator({ maxTouchPoints: 0, onLine: true, platform: "Win32", userAgent: "Node" });
  globalThis.fetch = async (url) => {
    assert.match(String(url), /\/api\/diagnostics\/runtime$/);
    return {
      ok: true,
      json: async () => ({ status: "ok", llm_configured: false, stt_configured: false }),
    };
  };
  const payload = await fetchRuntimeDiagnostics();
  assert.equal(payload.status, "ok");
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

function assertChatBottomAnchorContracts() {
  const chatPanel = readFileSync("./src/components/layout/ChatPanel.jsx", "utf8");
  const mobileCss = readFileSync("./src/styles/mobile.css", "utf8");
  const browserEffects = readFileSync("./src/hooks/useBrowserEffects.js", "utf8");

  assert.match(chatPanel, /className="chat-bottom-anchor"/);
  assert.match(chatPanel, /data-testid="chat-bottom-anchor"/);
  assert.match(chatPanel, /ref=\{bottomRef\}/);
  assert.match(chatPanel, /className="chat-scroll-slack"/);
  assert.match(chatPanel, /data-testid="mock-exam-card"/);
  assert.match(chatPanel, /data-testid="replay-question-button"/);
  const app = readFileSync("./src/App.jsx", "utf8");
  const header = readFileSync("./src/components/layout/ExamHeader.jsx", "utf8");
  const diagnosticsPanel = readFileSync("./src/components/layout/RuntimeDiagnosticsPanel.jsx", "utf8");
  assert.match(app, /RuntimeDiagnosticsPanel/);
  assert.doesNotMatch(header, /data-testid="runtime-diagnostics-button"/);
  assert.equal(
    (header.match(/data-testid="mobile-runtime-diagnostics-button"/g) || []).length,
    1,
  );
  assert.match(header, /onClick=\{openRuntimeDiagnostics\} data-testid="mobile-runtime-diagnostics-button"/);
  assert.match(header, /<summary>More<\/summary>/);
  assert.match(header, /data-testid="mobile-sound-toggle"/);
  assert.match(header, /data-testid="mobile-score-button"/);
  assert.match(header, /data-testid="mobile-export-button"/);
  assert.match(header, /data-testid="mobile-restart-button"/);
  assert.match(diagnosticsPanel, /data-testid="copy-diagnostics-button"/);
  assert.match(diagnosticsPanel, /请使用 Safari 或 Chrome 打开/);
  assert.match(chatPanel, /data-testid="mock-question-fallback"/);
  assert.match(chatPanel, /data-testid="chat-scroll-slack"/);
  assert.doesNotMatch(mobileCss, /\.chat-panel\s*>\s*\.message-row:first-child\s*\{[^}]*margin-top:\s*auto/s);
  assert.match(mobileCss, /padding-top:\s*clamp\(16px,\s*3vh,\s*32px\)/);
  assert.match(mobileCss, /\.chat-bottom-anchor\s*\{[^}]*flex-basis:\s*calc\(124px \+ env\(safe-area-inset-bottom\)\)/s);
  assert.match(browserEffects, /useLayoutEffect/);
  assert.match(browserEffects, /SHORT_SCROLL_SLACK_PX\s*=\s*48/);
  assert.match(browserEffects, /updateShortScrollSlack/);
  assert.match(browserEffects, /answerCount\s*===\s*0/);
  assert.match(browserEffects, /contentBottomBeforeAnchor/);
  assert.match(browserEffects, /visibleSafeHeight/);
  assert.match(browserEffects, /shouldFollowBottom/);
  assert.match(browserEffects, /shortScrollSlackHeight/);
  assert.match(browserEffects, /scrollIntoView\(\{\s*behavior,\s*block:\s*"end"/s);
  assert.match(browserEffects, /distanceFromBottom/);
}

await assertApiErrorMapping();
await assertTtsFailureMapping();
assertProductMetadata();
assertBrowserSpeechIOSGuard();
assertCapabilities();
assertMockModeSelectors();
assertChatBottomAnchorContracts();
assertReducerFlow();
assertTtsFailurePreservesAnswerState();
assertStageCardSelector();
assertTelemetryFailureIsNonBlocking();
assertRuntimeDiagnosticsUtilities();
await assertRuntimeDiagnosticsApiMapping();

console.log("V2 frontend smoke test passed");
