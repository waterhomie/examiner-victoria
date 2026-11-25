import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { DESKTOP_QUERY, MEMO_KEY, PART2_MAX_SECONDS, STORAGE_KEY } from "./config/appConfig.js";
import { useAnswerRecording } from "./hooks/useAnswerRecording.js";
import {
  useFrontendErrorTelemetry,
  useHoldToTalk,
  useMediaQuery,
  useOnlineStatus,
  usePrepCountdown,
} from "./hooks/useBrowserEffects.js";
import { useExamController } from "./hooks/useExamController.js";
import { useSpeechPlayback } from "./hooks/useSpeechPlayback.js";
import { patch, restored, setError } from "./state/actions.js";
import { appReducer } from "./state/appReducer.js";
import { initialState, SCREENS } from "./state/initialState.js";
import { ErrorCard, VoiceBanner } from "./components/ErrorCard.jsx";
import { EndSheet, SettingsSheet, TypeSheet } from "./components/Sheets.jsx";
import { CallScreen } from "./components/screens/CallScreen.jsx";
import { ExamScreen } from "./components/screens/ExamScreen.jsx";
import { HomeScreen } from "./components/screens/HomeScreen.jsx";
import { MarkingScreen } from "./components/screens/MarkingScreen.jsx";
import { RecapScreen } from "./components/screens/RecapScreen.jsx";
import { RetakeScreen } from "./components/screens/RetakeScreen.jsx";
import { ReadOnlyReviewSheet, ReviewScreen } from "./components/screens/ReviewScreen.jsx";
import { loadMemo } from "./utils/memo.js";
import { getPageEnvironment } from "./utils/runtimeDiagnostics.js";
import { clearSavedSession, loadSavedSession, saveSessionSnapshot } from "./utils/sessionStorage.js";
import { displayQuestion, isSessionComplete, progressReviewDisabled, reviewableTurnsForProgress } from "./utils/sessionView.js";
import { endSessionPlan } from "./utils/endSession.js";

const SESSION_SCREENS = new Set([SCREENS.EXAM, SCREENS.MARKING, SCREENS.REVIEW, SCREENS.RETAKE]);

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [memo, setMemo] = useState(() => loadMemo(MEMO_KEY));
  const [reviewSelection, setReviewSelection] = useState(null);
  const [resume, setResume] = useState(() => {
    const saved = loadSavedSession(STORAGE_KEY);
    return saved?.session && !isSessionComplete(saved.session) ? saved : null;
  });
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const online = useOnlineStatus();
  const environment = useMemo(() => getPageEnvironment(), []);
  const captionsOn = state.captions ?? state.trainingMode === "practice";
  const controllerRef = useRef(null);

  useFrontendErrorTelemetry();

  const speech = useSpeechPlayback({
    audioEnabled: state.audioEnabled,
    onErrorChange: useCallback((message) => dispatch(patch({ voiceIssue: message || "" })), []),
  });

  const onTranscribed = useCallback(async (text, duration) => {
    if (state.retake && !state.retake.text) {
      controllerRef.current?.finishRetake(text, duration);
      return;
    }
    await controllerRef.current?.submitAnswer(text, "audio", duration);
  }, [state.retake]);

  const onRecordingError = useCallback((recovery) => {
    dispatch(setError({ kind: recovery.kind, message: recovery.message, canRetry: recovery.canRetry }));
  }, []);

  const recorder = useAnswerRecording({
    onTranscribed,
    onError: onRecordingError,
    maxSeconds: state.session?.phase === "part2_long" ? PART2_MAX_SECONDS : 0,
  });

  const controller = useExamController({ state, dispatch, speech, recordingReset: recorder.resetRecording });
  controllerRef.current = controller;

  usePrepCountdown(
    state.prepEndsAt,
    useCallback((value) => dispatch(patch({ prepEndsAt: value })), []),
    useCallback((value) => dispatch(patch({ clockTick: value })), []),
  );

  // Refresh the "From last time" memo whenever we land on Home.
  useEffect(() => {
    if (state.screen === SCREENS.HOME) setMemo(loadMemo(MEMO_KEY));
  }, [state.screen]);

  useEffect(() => {
    setReviewSelection(null);
  }, [state.screen, state.session?.phase, state.session?.session_id]);

  // Load health + practice options once.
  useEffect(() => {
    void controller.loadBackendStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep a device-local snapshot so a refresh can resume the session.
  useEffect(() => {
    if (!state.session) return;
    saveSessionSnapshot(STORAGE_KEY, {
      session: state.session,
      turns: state.turns,
      trainingMode: state.trainingMode,
      practiceType: state.practiceType,
      report: state.report,
    });
  }, [state.practiceType, state.report, state.session, state.trainingMode, state.turns]);

  // Offline: auto-retry the saved answer when the connection comes back.
  useEffect(() => {
    if (!online) return;
    if (state.pendingAnswer && state.busy !== "sending") controller.retryPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // Desktop: the review lives in the right pane, so move on at once.
  useEffect(() => {
    if (desktop && state.screen === SCREENS.REVIEW) controller.goNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktop, state.screen]);

  const clearError = useCallback(() => dispatch(setError(null)), []);
  const openSheet = useCallback((sheet) => dispatch(patch({ sheet })), []);
  const closeSheet = useCallback(() => dispatch(patch({ sheet: "" })), []);

  const startMic = useCallback(async () => {
    speech.stopCurrentAudio();
    dispatch(patch({ voiceIssue: "" }));
    clearError();
    await recorder.start();
  }, [clearError, recorder, speech]);

  const toggleMic = useCallback(() => {
    if (recorder.recording) void recorder.stop();
    else void startMic();
  }, [recorder, startMic]);

  const startPart2 = useCallback(() => {
    dispatch(patch({ part2Started: true, prepEndsAt: null }));
    void startMic();
  }, [startMic]);

  const sendTyped = useCallback((text) => {
    closeSheet();
    if (state.retake && !state.retake.text) controller.finishRetake(text, null);
    else void controller.submitAnswer(text, "text", null);
  }, [closeSheet, controller, state.retake]);

  const inExam = SESSION_SCREENS.has(state.screen) && Boolean(state.session);
  useHoldToTalk({
    enabled: desktop && inExam && !state.sheet && !state.error && !reviewSelection && state.busy !== "sending",
    onPress: () => {
      if (!recorder.recording && !recorder.transcribing) {
        if (state.session?.phase === "part2_long") dispatch(patch({ part2Started: true, prepEndsAt: null }));
        void startMic();
      }
    },
    onRelease: () => {
      if (recorder.recording) void recorder.stop();
    },
  });

  const activeTurn = state.turns.find((turn) => turn.id === state.activeTurnId) || null;
  const activeIndex = activeTurn ? state.turns.indexOf(activeTurn) + 1 : 0;
  const retakeTurn = state.retake ? state.turns.find((turn) => turn.id === state.retake.turnId) : null;
  const complete = isSessionComplete(state.session);
  const endPlan = endSessionPlan(state.trainingMode, state.session);
  const reviewableTurns = reviewableTurnsForProgress({ session: state.session, turns: state.turns, trainingMode: state.trainingMode });
  const reviewDisabled = progressReviewDisabled({ recording: recorder.recording, transcribing: recorder.transcribing, busy: state.busy, retake: state.retake, marking: state.marking });
  const reviewedTurn = state.turns.find((turn) => turn.id === reviewSelection?.turnId) || null;

  const goHome = useCallback(() => {
    controller.resetSession();
    clearSavedSession(STORAGE_KEY);
    setResume(null);
  }, [controller]);

  const confirmEnd = useCallback(() => {
    if (controller.endSession() === "home") {
      clearSavedSession(STORAGE_KEY);
      setResume(null);
    }
  }, [controller]);

  const exam = (
    <ExamScreen
      state={{ ...state, retake: state.retake && !state.retake.text ? state.retake : null }}
      recorder={recorder}
      speechState={speech.speechState}
      captionsOn={captionsOn}
      desktop={desktop}
      onToggleMic={toggleMic}
      onReplay={controller.replayQuestion}
      onType={() => openSheet("type")}
      onOpenSettings={() => openSheet("settings")}
      onStartPart2={startPart2}
      onCancelRetake={controller.cancelRetake}
      reviewableTurns={reviewableTurns}
      reviewDisabled={reviewDisabled}
      onSelectTurn={(position) => {
        const turn = reviewableTurns[position];
        if (!reviewDisabled && turn) setReviewSelection({ turnId: turn.id, position });
      }}
    />
  );

  let content;
  if (state.screen === SCREENS.HOME || (!state.session && state.screen !== SCREENS.CALL)) {
    content = (
      <HomeScreen
        state={state}
        memo={memo}
        resume={resume}
        onChange={(values) => dispatch(patch(values))}
        onStart={() => dispatch(patch({ screen: SCREENS.CALL, error: null }))}
        onResume={() => {
          dispatch(restored(resume));
          setResume(null);
        }}
        onOpenSettings={() => openSheet("settings")}
      />
    );
  } else if (state.screen === SCREENS.CALL) {
    content = <CallScreen state={state} onCall={controller.startCall} onBack={() => dispatch(patch({ screen: SCREENS.HOME, error: null }))} />;
  } else if (state.screen === SCREENS.RECAP) {
    content = (
      <RecapScreen
        state={state}
        onRetry={controller.requestReport}
        onHome={goHome}
        onDownload={controller.downloadRecord}
        onListen={controller.listen}
      />
    );
  } else if (desktop) {
    let right;
    if (state.marking) right = <MarkingScreen marking={state.marking} turn={activeTurn} />;
    else if (state.retake?.text && retakeTurn) {
      right = <RetakeScreen turn={retakeTurn} retake={state.retake} complete={complete} embedded onTryAgain={() => controller.startRetake(retakeTurn.id)} onNext={controller.goNext} />;
    } else if (activeTurn?.feedback?.coaching) {
      right = <ReviewScreen turn={activeTurn} index={activeIndex} complete={complete} embedded onRetake={() => controller.startRetake(activeTurn.id)} onListen={controller.listen} onEnd={() => openSheet("end")} busy={state.busy} />;
    } else {
      right = (
        <main className="screen paper desk-empty">
          <p className="kicker">REVIEW</p>
          <p className="serif">{state.trainingMode === "mock" ? "Mock test: feedback comes at the end." : "Your feedback will appear here after each answer."}</p>
        </main>
      );
    }
    content = <div className="desk">{exam}{right}</div>;
  } else if (state.screen === SCREENS.MARKING) {
    content = <MarkingScreen marking={state.marking} turn={activeTurn} />;
  } else if (state.screen === SCREENS.REVIEW) {
    content = (
      <ReviewScreen
        turn={activeTurn}
        index={activeIndex}
        complete={complete}
        onRetake={() => controller.startRetake(activeTurn.id)}
        onNext={controller.goNext}
        onListen={controller.listen}
        onEnd={() => openSheet("end")}
        busy={state.busy}
      />
    );
  } else if (state.screen === SCREENS.RETAKE) {
    content = (
      <RetakeScreen
        turn={retakeTurn}
        retake={state.retake}
        complete={complete}
        onTryAgain={() => controller.startRetake(retakeTurn.id)}
        onNext={controller.goNext}
      />
    );
  } else {
    content = exam;
  }

  const showErrorCard = Boolean(state.error) && state.screen !== SCREENS.CALL && state.screen !== SCREENS.RECAP;

  return (
    <div className={`app${desktop ? " is-desktop" : ""}`}>
      {content}

      {state.screen === SCREENS.EXAM && reviewedTurn ? (
        <ReadOnlyReviewSheet turn={reviewedTurn} index={reviewSelection.position} onClose={() => setReviewSelection(null)} />
      ) : null}

      {inExam ? (
        <VoiceBanner
          message={state.voiceIssue}
          onRetry={() => {
            dispatch(patch({ voiceIssue: "" }));
            controller.replayQuestion();
          }}
          onDismiss={() => dispatch(patch({ voiceIssue: "" }))}
        />
      ) : null}

      {showErrorCard ? (
        <ErrorCard
          error={state.error}
          isWeChat={environment.isWeChat}
          playbackUrl={recorder.lastRecordingUrl}
          canRetryAudio={recorder.canRetry}
          hasPending={Boolean(state.pendingAnswer)}
          onRecordAgain={() => void startMic()}
          onType={() => {
            clearError();
            openSheet("type");
          }}
          onRetryAudio={() => {
            clearError();
            void recorder.retryLast();
          }}
          onRetryPending={controller.retryPending}
          onDiscard={() => {
            controller.discardPending();
            recorder.resetRecording();
          }}
          onDismiss={clearError}
        />
      ) : null}

      {state.sheet === "type" ? (
        <TypeSheet question={retakeTurn && !state.retake?.text ? retakeTurn.question : displayQuestion(state.session)} onSend={sendTyped} onClose={closeSheet} />
      ) : null}
      {state.sheet === "settings" ? (
        <SettingsSheet
          state={state}
          captionsOn={captionsOn}
          inSession={Boolean(state.session)}
          onChange={(values) => dispatch(patch(values))}
          onClose={closeSheet}
          onEnd={() => openSheet("end")}
          onDownload={controller.downloadTranscript}
        />
      ) : null}
      {state.sheet === "end" ? (
        <EndSheet
          trainingMode={state.trainingMode}
          answerCount={endPlan.answerCount}
          totalQuestions={endPlan.totalQuestions}
          onConfirm={confirmEnd}
          onClose={closeSheet}
        />
      ) : null}
    </div>
  );
}
