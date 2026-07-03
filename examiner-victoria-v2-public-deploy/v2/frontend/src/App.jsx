import { useCallback, useEffect, useReducer, useRef } from "react";
import { AnswerComposer } from "./components/layout/AnswerComposer.jsx";
import { ChatPanel } from "./components/layout/ChatPanel.jsx";
import { ExamHeader } from "./components/layout/ExamHeader.jsx";
import { ExamStageCard } from "./components/layout/ExamStageCard.jsx";
import { MobileToasts } from "./components/layout/MobileToasts.jsx";
import { PRACTICE_TYPES, STORAGE_KEY, TRAINING_MODES } from "./config/appConfig.js";
import {
  useAutoScrollToLatest,
  useFrontendErrorTelemetry,
  usePagehideCleanup,
  usePrepCountdown,
  useScrollStateTelemetry,
} from "./hooks/useBrowserEffects.js";
import { useAnswerRecording } from "./hooks/useAnswerRecording.js";
import { useExamController } from "./hooks/useExamController.js";
import { useSpeechPlayback } from "./hooks/useSpeechPlayback.js";
import { appReducer } from "./state/appReducer.js";
import { busySet, draftSet, errorSet, modeSet, sessionRestored, storageReadySet } from "./state/actions.js";
import { createInitialAppState } from "./state/initialState.js";
import { selectCapabilities, selectMessages, selectSessionView } from "./state/selectors.js";
import { formatDuration } from "./utils/format.js";
import { busyLabel, phaseLabel } from "./utils/labels.js";
import { saveSessionSnapshot } from "./utils/sessionStorage.js";

export default function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialAppState);
  const chatPanelRef = useRef(null);
  const bottomRef = useRef(null);
  const startupRecoveryAttemptedRef = useRef(false);
  const submitAnswerRef = useRef(null);

  const setBusy = useCallback((busy) => dispatch(busySet(busy)), []);
  const setDraft = useCallback((draft) => dispatch(draftSet(draft)), []);
  const setError = useCallback((error) => dispatch(errorSet(error)), []);
  const setMode = useCallback((mode) => dispatch(modeSet(mode)), []);
  const submitAnswerFromRecording = useCallback(
    (...args) => submitAnswerRef.current?.(...args),
    [],
  );

  const {
    clearPendingSpeech,
    pendingSpeechUrl,
    playPendingSpeech,
    playSpeech,
    unlockAudio,
    stopCurrentAudio,
  } = useSpeechPlayback({
    audioEnabled: state.audioEnabled,
    onErrorChange: setError,
  });

  const {
    canRetryRecording,
    cleanupRecording,
    elapsed,
    recording,
    resetRecording,
    retryLastRecording,
    toggleRecording,
  } = useAnswerRecording({
    busy: state.busy,
    onBusyChange: setBusy,
    onDraftChange: setDraft,
    onErrorChange: setError,
    onModeChange: setMode,
    reviewBeforeSend: state.reviewBeforeSend,
    submitAnswer: submitAnswerFromRecording,
  });

  const capabilities = selectCapabilities(state, recording);
  const controller = useExamController({
    canAnswer: capabilities.canAnswer,
    clearPendingSpeech,
    dispatch,
    playSpeech,
    resetRecording,
    state,
    stopCurrentAudio,
    unlockAudio,
  });
  submitAnswerRef.current = controller.submitAnswer;

  const messages = selectMessages(state);
  const lastMessage = messages[messages.length - 1] || null;
  const currentPhase = phaseLabel(state.session?.phase);
  const sessionView = selectSessionView(state);
  const recordButtonDisabled = recording ? false : !capabilities.canStartRecording;
  const recordButtonText = !state.session
    ? "Starting..."
    : state.session.test_active
      ? recording
        ? "Tap to send"
        : "Tap to record"
      : "Test complete";

  useEffect(() => {
    let restored = false;
    const saved = controller.restoreSavedSession();
    if (saved?.session?.messages?.length) {
      dispatch(sessionRestored(saved));
      restored = true;
    }
    dispatch(storageReadySet(true));
    if (!restored) {
      void controller.createFreshSession();
    }
    return () => {
      cleanupRecording();
      stopCurrentAudio();
    };
    // Run once for startup wiring; the controller uses the initial settings here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void controller.loadBackendStatus();
  }, [controller.loadBackendStatus]);

  useEffect(() => {
    if (!state.storageReady || state.session || state.busy || startupRecoveryAttemptedRef.current) return;
    startupRecoveryAttemptedRef.current = true;
    void controller.createFreshSession();
  }, [controller.createFreshSession, state.busy, state.session, state.storageReady]);

  useEffect(() => {
    if (!state.storageReady) return;
    saveSessionSnapshot(
      STORAGE_KEY,
      state.session
        ? {
            session: state.session,
            report: state.report,
            audioEnabled: state.audioEnabled,
            trainingMode: state.trainingMode,
            practiceType: state.practiceType,
            selectedPart1Topic: state.selectedPart1Topic,
            selectedCueCardTitle: state.selectedCueCardTitle,
            reviewBeforeSend: state.reviewBeforeSend,
            prepEndsAt: state.prepEndsAt,
          }
        : null,
    );
  }, [
    state.audioEnabled,
    state.practiceType,
    state.prepEndsAt,
    state.report,
    state.reviewBeforeSend,
    state.selectedCueCardTitle,
    state.selectedPart1Topic,
    state.session,
    state.storageReady,
    state.trainingMode,
  ]);

  useAutoScrollToLatest(chatPanelRef, bottomRef, [
    messages.length,
    state.busy,
    state.report,
    sessionView.shouldShowStageCard,
    lastMessage?.phase,
    pendingSpeechUrl,
  ]);
  useScrollStateTelemetry(chatPanelRef, {
    answerCount: sessionView.sessionStats.answered,
    messageCount: messages.length,
    phase: state.session?.phase,
    practiceType: state.practiceType,
    stageVisible: sessionView.shouldShowStageCard,
  });
  usePrepCountdown(state.prepEndsAt, controller.setPrepEndsAt, controller.setClockTick);
  usePagehideCleanup(stopCurrentAudio);
  useFrontendErrorTelemetry();

  const handleToggleRecording = useCallback(() => {
    if (!recording) {
      stopCurrentAudio();
    }
    unlockAudio();
    void toggleRecording();
  }, [recording, stopCurrentAudio, toggleRecording, unlockAudio]);

  return (
    <div className="app-shell">
      <ExamHeader
        audioEnabled={state.audioEnabled}
        busy={state.busy}
        canExportRecord={capabilities.canExportRecord}
        canScoreNow={capabilities.canScoreNow}
        changePracticeType={controller.changePracticeType}
        changeTrainingMode={controller.changeTrainingMode}
        createFreshSession={controller.createFreshSession}
        currentPhase={currentPhase}
        downloadPracticeRecord={controller.downloadPracticeRecord}
        isPracticeMode={sessionView.isPracticeMode}
        practiceType={state.practiceType}
        practiceTypes={PRACTICE_TYPES}
        recording={recording}
        requestReport={controller.requestReport}
        session={state.session}
        sessionStats={sessionView.sessionStats}
        stageProgress={sessionView.stageProgress}
        toggleAudioEnabled={controller.toggleAudioEnabled}
        trainingMode={state.trainingMode}
        trainingModes={TRAINING_MODES}
      />
      {sessionView.shouldShowStageCard ? (
        <ExamStageCard
          busy={state.busy}
          changeCueCardTitle={controller.changeCueCardTitle}
          changePart1Topic={controller.changePart1Topic}
          currentPhase={currentPhase}
          formatDuration={formatDuration}
          hasStageControls={sessionView.hasVisibleStageControls}
          isPracticeMode={sessionView.isPracticeMode}
          practiceOptions={state.practiceOptions}
          prepRemaining={sessionView.prepRemaining}
          recording={recording}
          selectedCueCardTitle={state.selectedCueCardTitle}
          selectedPart1Topic={state.selectedPart1Topic}
          session={state.session}
          sessionStats={sessionView.sessionStats}
          showCueCardSelect={sessionView.showCueCardSelect}
          showPart1TopicSelect={sessionView.showPart1TopicSelect}
          stageDescription={sessionView.stageDescription}
          stageProgress={sessionView.stageProgress}
        />
      ) : null}

      <ChatPanel
        bottomRef={bottomRef}
        busy={state.busy}
        busyLabel={busyLabel}
        canRetryRecording={canRetryRecording}
        chatPanelRef={chatPanelRef}
        configWarning={sessionView.configWarning}
        downloadPracticeRecord={controller.downloadPracticeRecord}
        downloadReport={controller.downloadReport}
        downloadTranscript={controller.downloadTranscript}
        error={state.error}
        messages={messages}
        pendingSpeechUrl={pendingSpeechUrl}
        playPendingSpeech={playPendingSpeech}
        report={state.report}
        retryLastRecording={retryLastRecording}
      />

      <MobileToasts
        busy={state.busy}
        busyLabel={busyLabel}
        canRetryRecording={canRetryRecording}
        error={state.error}
        pendingSpeechUrl={pendingSpeechUrl}
        playPendingSpeech={playPendingSpeech}
        retryLastRecording={retryLastRecording}
      />

      <AnswerComposer
        busy={state.busy}
        canAnswer={capabilities.canAnswer}
        draft={state.draft}
        elapsed={elapsed}
        formatDuration={formatDuration}
        handleTextComposerKeyDown={controller.handleTextComposerKeyDown}
        mode={state.mode}
        onDraftChange={controller.setDraft}
        onModeToggle={controller.toggleInputMode}
        onReviewBeforeSendChange={controller.setReviewBeforeSend}
        recordButtonDisabled={recordButtonDisabled}
        recordButtonText={recordButtonText}
        recording={recording}
        requestReport={controller.requestReport}
        reviewBeforeSend={state.reviewBeforeSend}
        session={state.session}
        submitTypedAnswer={controller.submitTypedAnswer}
        toggleRecording={handleToggleRecording}
      />
    </div>
  );
}
