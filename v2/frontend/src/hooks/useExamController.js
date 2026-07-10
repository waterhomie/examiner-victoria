import { useCallback } from "react";
import {
  buildReport,
  fetchPracticeOptions,
  healthCheck,
  sendTelemetryEvent,
  sendAnswer,
  startSession,
} from "../api.js";
import { DEFAULT_SETTINGS, STORAGE_KEY } from "../config/appConfig.js";
import {
  answerFailed,
  answerRequested,
  answerSucceeded,
  audioToggled,
  busySet,
  clockTickSet,
  draftSet,
  errorSet,
  healthLoaded,
  modeSet,
  modeToggled,
  practiceOptionsLoaded,
  prepTimerSet,
  reportFailed,
  reportRequested,
  reportSucceeded,
  reviewBeforeSendSet,
  sessionStartFailed,
  sessionStartRequested,
  sessionStartSucceeded,
} from "../state/actions.js";
import { buildPracticeRecordText, buildTranscriptText, downloadTextFile } from "../utils/downloads.js";
import { friendlyError } from "../utils/errors.js";
import { safeDateStamp } from "../utils/format.js";
import { loadSavedSession } from "../utils/sessionStorage.js";

function part2PrepEndsAt() {
  return Date.now() + 60_000;
}

export function useExamController({
  canAnswer,
  clearPendingSpeech,
  dispatch,
  playSpeech,
  resetRecording,
  state,
  stopCurrentAudio,
  unlockAudio,
}) {
  const {
    draft,
    practiceType,
    report,
    selectedCueCardTitle,
    selectedPart1Topic,
    session,
    trainingMode,
  } = state;

  const setBusy = useCallback((busy) => dispatch(busySet(busy)), [dispatch]);
  const setClockTick = useCallback((clockTick) => dispatch(clockTickSet(clockTick)), [dispatch]);
  const setDraft = useCallback((nextDraft) => dispatch(draftSet(nextDraft)), [dispatch]);
  const setError = useCallback((error) => dispatch(errorSet(error)), [dispatch]);
  const setMode = useCallback((mode) => dispatch(modeSet(mode)), [dispatch]);
  const setPrepEndsAt = useCallback((endsAt) => dispatch(prepTimerSet(endsAt, Date.now())), [dispatch]);
  const setReviewBeforeSend = useCallback(
    (reviewBeforeSend) => dispatch(reviewBeforeSendSet(reviewBeforeSend)),
    [dispatch],
  );
  const toggleInputMode = useCallback(() => dispatch(modeToggled()), [dispatch]);

  const restoreSavedSession = useCallback(() => loadSavedSession(STORAGE_KEY), []);

  const loadBackendStatus = useCallback(async () => {
    const [health, options] = await Promise.allSettled([healthCheck(), fetchPracticeOptions()]);
    if (health.status === "fulfilled") {
      dispatch(healthLoaded(health.value));
    }
    if (options.status === "fulfilled") {
      dispatch(practiceOptionsLoaded(options.value));
    }
  }, [dispatch]);

  const createFreshSession = useCallback(
    async (
      nextPracticeType = practiceType,
      nextPart1Topic = selectedPart1Topic,
      nextCueCardTitle = selectedCueCardTitle,
      nextTrainingMode = trainingMode,
    ) => {
      stopCurrentAudio();
      clearPendingSpeech();
      resetRecording?.();
      const nextIsPracticeMode = nextTrainingMode === "practice";
      dispatch(
        sessionStartRequested({
          practiceType: nextPracticeType,
          selectedCueCardTitle: nextCueCardTitle,
          selectedPart1Topic: nextPart1Topic,
          trainingMode: nextTrainingMode,
        }),
      );
      try {
        const health = await healthCheck();
        dispatch(healthLoaded(health));
        const data = await startSession({
          ...DEFAULT_SETTINGS,
          practice_mode: nextIsPracticeMode,
          answer_expansion_mode: nextIsPracticeMode,
          practice_type: nextPracticeType,
          part1_topic: nextPart1Topic || null,
          cue_card_title: nextCueCardTitle || null,
        });
        dispatch(sessionStartSucceeded(data.session));
        if (data.session.phase === "part2_long") {
          dispatch(prepTimerSet(part2PrepEndsAt(), Date.now()));
        }
      } catch (err) {
        dispatch(sessionStartFailed(friendlyError(err, "Failed to start session.")));
      }
    },
    [
      clearPendingSpeech,
      dispatch,
      practiceType,
      resetRecording,
      selectedCueCardTitle,
      selectedPart1Topic,
      stopCurrentAudio,
      trainingMode,
    ],
  );

  const toggleAudioEnabled = useCallback(() => {
    if (state.audioEnabled) {
      stopCurrentAudio();
      clearPendingSpeech();
    }
    dispatch(audioToggled());
  }, [clearPendingSpeech, dispatch, state.audioEnabled, stopCurrentAudio]);

  const changePracticeType = useCallback(
    (event) => {
      const nextPracticeType = event.target.value;
      if (nextPracticeType === practiceType && session) return;
      void createFreshSession(nextPracticeType, selectedPart1Topic, selectedCueCardTitle, trainingMode);
    },
    [createFreshSession, practiceType, selectedCueCardTitle, selectedPart1Topic, session, trainingMode],
  );

  const changeTrainingMode = useCallback(
    (event) => {
      const nextTrainingMode = event.target.value;
      if (nextTrainingMode === trainingMode && session) return;
      void createFreshSession(practiceType, selectedPart1Topic, selectedCueCardTitle, nextTrainingMode);
    },
    [createFreshSession, practiceType, selectedCueCardTitle, selectedPart1Topic, session, trainingMode],
  );

  const changePart1Topic = useCallback(
    (event) => {
      void createFreshSession(practiceType, event.target.value, selectedCueCardTitle, trainingMode);
    },
    [createFreshSession, practiceType, selectedCueCardTitle, trainingMode],
  );

  const changeCueCardTitle = useCallback(
    (event) => {
      void createFreshSession(practiceType, selectedPart1Topic, event.target.value, trainingMode);
    },
    [createFreshSession, practiceType, selectedPart1Topic, trainingMode],
  );

  const submitAnswer = useCallback(
    async (answer, source = "text", duration = null, options = {}) => {
      const cleaned = answer.trim();
      if (!cleaned || !session) return;
      const answerStartedAt = Date.now();
      const answerPhase = session.phase;
      dispatch(answerRequested());
      resetRecording?.();
      if (!options.audioPrepared) {
        stopCurrentAudio();
      }
      clearPendingSpeech();
      try {
        const data = await sendAnswer({
          session,
          answer: cleaned,
          source,
          duration,
        });
        sendTelemetryEvent("answer", {
          durationMs: Date.now() - answerStartedAt,
          source,
          answerDuration: duration || 0,
          phase: answerPhase,
          messageCount: session.messages?.length || 0,
        });
        dispatch(answerSucceeded(data.session));
        if (data.start_prep_timer) {
          dispatch(prepTimerSet(part2PrepEndsAt(), Date.now()));
        }
        void playSpeech(data.spoken_text);
      } catch (err) {
        sendTelemetryEvent("answer-error", {
          durationMs: Date.now() - answerStartedAt,
          source,
          answerDuration: duration || 0,
          phase: answerPhase,
          message: String(err?.message || err),
        });
        dispatch(answerFailed(friendlyError(err, "Victoria could not respond.")));
      }
    },
    [clearPendingSpeech, dispatch, playSpeech, resetRecording, session, stopCurrentAudio],
  );

  const submitTypedAnswer = useCallback(
    async (event) => {
      event?.preventDefault();
      stopCurrentAudio();
      unlockAudio();
      await submitAnswer(draft, "text", null, { audioPrepared: true });
    },
    [draft, stopCurrentAudio, submitAnswer, unlockAudio],
  );

  const handleTextComposerKeyDown = useCallback(
    (event) => {
      if (event.key !== "Enter" || event.shiftKey || event.nativeEvent?.isComposing) return;
      event.preventDefault();
      if (draft.trim() && canAnswer) {
        stopCurrentAudio();
        unlockAudio();
        void submitAnswer(draft, "text", null, { audioPrepared: true });
      }
    },
    [canAnswer, draft, stopCurrentAudio, submitAnswer, unlockAudio],
  );

  const requestReport = useCallback(async () => {
    if (!session) return;
    stopCurrentAudio();
    dispatch(reportRequested());
    try {
      const data = await buildReport(session);
      dispatch(reportSucceeded(data.report));
    } catch (err) {
      dispatch(reportFailed(friendlyError(err, "Report could not be generated.")));
    }
  }, [dispatch, session, stopCurrentAudio]);

  const downloadReport = useCallback(() => {
    if (!report) return;
    downloadTextFile(`examiner-victoria-report-${safeDateStamp()}.txt`, report);
  }, [report]);

  const downloadTranscript = useCallback(() => {
    if (!session) return;
    downloadTextFile(`examiner-victoria-transcript-${safeDateStamp()}.txt`, buildTranscriptText(session));
  }, [session]);

  const downloadPracticeRecord = useCallback(() => {
    if (!session) return;
    downloadTextFile(
      `examiner-victoria-practice-record-${safeDateStamp()}.txt`,
      buildPracticeRecordText(session, report),
    );
  }, [report, session]);

  return {
    changeCueCardTitle,
    changePart1Topic,
    changePracticeType,
    changeTrainingMode,
    createFreshSession,
    downloadPracticeRecord,
    downloadReport,
    downloadTranscript,
    handleTextComposerKeyDown,
    loadBackendStatus,
    requestReport,
    restoreSavedSession,
    setBusy,
    setClockTick,
    setDraft,
    setError,
    setMode,
    setPrepEndsAt,
    setReviewBeforeSend,
    submitAnswer,
    submitTypedAnswer,
    toggleAudioEnabled,
    toggleInputMode,
  };
}
