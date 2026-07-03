import { useEffect, useRef, useState } from "react";
import {
  buildReport,
  fetchPracticeOptions,
  healthCheck,
  sendAnswer,
  startSession,
} from "./api.js";
import { DEFAULT_SETTINGS, PRACTICE_TYPES, STORAGE_KEY, TRAINING_MODES } from "./config/appConfig.js";
import { AnswerComposer } from "./components/layout/AnswerComposer.jsx";
import { ChatPanel } from "./components/layout/ChatPanel.jsx";
import { ExamHeader } from "./components/layout/ExamHeader.jsx";
import { ExamStageCard } from "./components/layout/ExamStageCard.jsx";
import { MobileToasts } from "./components/layout/MobileToasts.jsx";
import { buildPracticeRecordText, buildTranscriptText, downloadTextFile } from "./utils/downloads.js";
import { friendlyError } from "./utils/errors.js";
import { formatDuration, safeDateStamp } from "./utils/format.js";
import { busyLabel, phaseLabel } from "./utils/labels.js";
import { loadSavedSession, saveSessionSnapshot } from "./utils/sessionStorage.js";
import {
  getSessionStats,
  getStageDescription,
  getStageProgress,
  hasStageControls,
  shouldShowCueCardSelect,
  shouldShowPart1TopicSelect,
} from "./utils/sessionView.js";
import {
  useAutoScrollToLatest,
  usePagehideCleanup,
  usePrepCountdown,
} from "./hooks/useBrowserEffects.js";
import { useAnswerRecording } from "./hooks/useAnswerRecording.js";
import { useSpeechPlayback } from "./hooks/useSpeechPlayback.js";

export default function App() {
  const [session, setSession] = useState(null);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState("voice");
  const [reviewBeforeSend, setReviewBeforeSend] = useState(false);
  const [busy, setBusy] = useState("starting");
  const [error, setError] = useState("");
  const [report, setReport] = useState("");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [trainingMode, setTrainingMode] = useState("practice");
  const [practiceType, setPracticeType] = useState("full");
  const [practiceOptions, setPracticeOptions] = useState({ part1_topics: [], cue_cards: [] });
  const [selectedPart1Topic, setSelectedPart1Topic] = useState("");
  const [selectedCueCardTitle, setSelectedCueCardTitle] = useState("");
  const [healthInfo, setHealthInfo] = useState(null);
  const [storageReady, setStorageReady] = useState(false);
  const [prepEndsAt, setPrepEndsAt] = useState(null);
  const [clockTick, setClockTick] = useState(Date.now());
  const chatPanelRef = useRef(null);
  const bottomRef = useRef(null);
  const startupRecoveryAttemptedRef = useRef(false);

  const {
    clearPendingSpeech,
    pendingSpeechUrl,
    playPendingSpeech,
    playSpeech,
    stopCurrentAudio,
  } = useSpeechPlayback({ audioEnabled, setError });
  const {
    canRetryRecording,
    cleanupRecording,
    elapsed,
    recording,
    resetRecording,
    retryLastRecording,
    toggleRecording,
  } = useAnswerRecording({
    busy,
    reviewBeforeSend,
    setBusy,
    setDraft,
    setError,
    setMode,
    submitAnswer,
  });

  const messages = session?.messages || [];
  const currentPhase = phaseLabel(session?.phase);
  const isPracticeMode = trainingMode === "practice";
  const canAnswer = Boolean(session?.test_active) && !busy && !recording;
  const canStartRecording = Boolean(session?.test_active) && !busy;
  const canScoreNow = Boolean(session?.candidate_answers?.some((item) => item.phase !== "identity")) && !busy;
  const canExportRecord = Boolean(session?.candidate_answers?.length) && !busy;
  const recordButtonDisabled = recording ? false : !canStartRecording;
  const recordButtonText = !session
    ? "Starting..."
    : session.test_active
      ? recording
        ? "Tap to send"
        : "Tap to record"
      : "Test complete";
  const prepRemaining = prepEndsAt
    ? Math.max(0, Math.ceil((prepEndsAt - clockTick) / 1000))
    : 0;

  const stageProgress = getStageProgress(session?.phase);
  const sessionStats = getSessionStats(session);

  const configWarning = healthInfo?.config?.api_key_configured === false
    ? "Preview mode: the backend is running, but API_KEY is not configured. You can inspect the interface and type answers, but AI replies, transcription, TTS, and scoring need the backend API key."
    : "";
  const stageDescription = getStageDescription(isPracticeMode);
  const showPart1TopicSelect = shouldShowPart1TopicSelect(practiceType, practiceOptions);
  const showCueCardSelect = shouldShowCueCardSelect(practiceType, practiceOptions);
  const hasVisibleStageControls = hasStageControls({
    prepRemaining,
    showPart1TopicSelect,
    showCueCardSelect,
  });

  useEffect(() => {
    let restored = false;
    const saved = loadSavedSession(STORAGE_KEY);
    if (saved?.session?.messages?.length) {
      setSession(saved.session);
      setReport(saved.report || "");
      setAudioEnabled(saved.audioEnabled ?? true);
      setTrainingMode(saved.trainingMode || (saved.session.practice_mode ? "practice" : "mock"));
      setPracticeType(saved.practiceType || saved.session.practice_type || "full");
      setSelectedPart1Topic(saved.selectedPart1Topic || "");
      setSelectedCueCardTitle(saved.selectedCueCardTitle || "");
      setReviewBeforeSend(Boolean(saved.reviewBeforeSend));
      if (saved.prepEndsAt && saved.prepEndsAt > Date.now()) {
        setPrepEndsAt(saved.prepEndsAt);
      }
      restored = true;
    }
    setStorageReady(true);
    if (!restored) {
      createFreshSession();
    } else {
      setBusy("");
    }
    return () => {
      cleanupRecording();
      stopCurrentAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    healthCheck()
      .then((health) => {
        if (!cancelled) {
          setHealthInfo(health);
        }
      })
      .catch(() => {
        // createFreshSession also performs a health check; this is only for restored sessions.
      });
    fetchPracticeOptions()
      .then((options) => {
        if (!cancelled) {
          setPracticeOptions({
            part1_topics: options.part1_topics || [],
            cue_cards: options.cue_cards || [],
          });
        }
      })
      .catch(() => {
        // Practice can still start with random topics if the option endpoint is unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!storageReady || session || busy || startupRecoveryAttemptedRef.current) return;
    startupRecoveryAttemptedRef.current = true;
    createFreshSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, session, storageReady]);

  useEffect(() => {
    if (!storageReady) return;
    saveSessionSnapshot(
      STORAGE_KEY,
      session
        ? {
            session,
            report,
            audioEnabled,
            trainingMode,
            practiceType,
            selectedPart1Topic,
            selectedCueCardTitle,
            reviewBeforeSend,
            prepEndsAt,
          }
        : null,
    );
  }, [
    audioEnabled,
    trainingMode,
    practiceType,
    prepEndsAt,
    report,
    reviewBeforeSend,
    selectedCueCardTitle,
    selectedPart1Topic,
    session,
    storageReady,
  ]);

  useAutoScrollToLatest(chatPanelRef, bottomRef, [messages.length, busy, report]);
  usePrepCountdown(prepEndsAt, setPrepEndsAt, setClockTick);
  usePagehideCleanup(() => {
    stopCurrentAudio();
  });

  async function createFreshSession(
    nextPracticeType = practiceType,
    nextPart1Topic = selectedPart1Topic,
    nextCueCardTitle = selectedCueCardTitle,
    nextTrainingMode = trainingMode,
  ) {
    stopCurrentAudio();
    clearPendingSpeech();
    resetRecording();
    const nextIsPracticeMode = nextTrainingMode === "practice";
    setTrainingMode(nextTrainingMode);
    setPracticeType(nextPracticeType);
    setSelectedPart1Topic(nextPart1Topic);
    setSelectedCueCardTitle(nextCueCardTitle);
    setSession(null);
    setError("");
    setReport("");
    setDraft("");
    setPrepEndsAt(null);
    setBusy("starting");
    try {
      const health = await healthCheck();
      setHealthInfo(health);
      const data = await startSession({
        ...DEFAULT_SETTINGS,
        practice_mode: nextIsPracticeMode,
        answer_expansion_mode: nextIsPracticeMode,
        practice_type: nextPracticeType,
        part1_topic: nextPart1Topic || null,
        cue_card_title: nextCueCardTitle || null,
      });
      setSession(data.session);
      setAudioEnabled(data.session.voice_playback_enabled);
      if (data.session.phase === "part2_long") {
        const endsAt = Date.now() + 60_000;
        setClockTick(Date.now());
        setPrepEndsAt(endsAt);
      }
    } catch (err) {
      setError(friendlyError(err, "Failed to start session."));
    } finally {
      setBusy("");
    }
  }

  function toggleAudioEnabled() {
    setAudioEnabled((value) => {
      if (value) {
        stopCurrentAudio();
        clearPendingSpeech();
      }
      return !value;
    });
  }

  function changePracticeType(event) {
    const nextPracticeType = event.target.value;
    if (nextPracticeType === practiceType && session) return;
    createFreshSession(nextPracticeType, selectedPart1Topic, selectedCueCardTitle, trainingMode);
  }

  function changeTrainingMode(event) {
    const nextTrainingMode = event.target.value;
    if (nextTrainingMode === trainingMode && session) return;
    createFreshSession(practiceType, selectedPart1Topic, selectedCueCardTitle, nextTrainingMode);
  }

  function changePart1Topic(event) {
    const nextTopic = event.target.value;
    setSelectedPart1Topic(nextTopic);
    createFreshSession(practiceType, nextTopic, selectedCueCardTitle, trainingMode);
  }

  function changeCueCardTitle(event) {
    const nextTitle = event.target.value;
    setSelectedCueCardTitle(nextTitle);
    createFreshSession(practiceType, selectedPart1Topic, nextTitle, trainingMode);
  }

  function resetComposerAfterAnswer() {
    setDraft("");
    resetRecording();
  }

  async function submitAnswer(answer, source = "text", duration = null) {
    const cleaned = answer.trim();
    if (!cleaned || !session) return;
    setError("");
    setBusy("thinking");
    setReport("");
    setPrepEndsAt(null);
    stopCurrentAudio();
    clearPendingSpeech();
    resetComposerAfterAnswer();
    try {
      const data = await sendAnswer({
        session,
        answer: cleaned,
        source,
        duration,
      });
      setSession(data.session);
      if (data.start_prep_timer) {
        const endsAt = Date.now() + 60_000;
        setClockTick(Date.now());
        setPrepEndsAt(endsAt);
      }
      setBusy("");
      void playSpeech(data.spoken_text);
    } catch (err) {
      setError(friendlyError(err, "Victoria could not respond."));
    } finally {
      setBusy("");
    }
  }

  async function submitTypedAnswer(event) {
    event?.preventDefault();
    await submitAnswer(draft, "text", null);
  }

  function handleTextComposerKeyDown(event) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent?.isComposing) return;
    event.preventDefault();
    if (draft.trim() && canAnswer) {
      void submitAnswer(draft, "text", null);
    }
  }

  async function requestReport() {
    if (!session) return;
    setError("");
    stopCurrentAudio();
    setBusy("report");
    try {
      const data = await buildReport(session);
      setReport(data.report);
    } catch (err) {
      setError(friendlyError(err, "Report could not be generated."));
    } finally {
      setBusy("");
    }
  }

  function downloadReport() {
    if (!report) return;
    downloadTextFile(`examiner-victoria-report-${safeDateStamp()}.txt`, report);
  }

  function downloadTranscript() {
    if (!session) return;
    downloadTextFile(`examiner-victoria-transcript-${safeDateStamp()}.txt`, buildTranscriptText(session));
  }

  function downloadPracticeRecord() {
    if (!session) return;
    downloadTextFile(
      `examiner-victoria-practice-record-${safeDateStamp()}.txt`,
      buildPracticeRecordText(session, report),
    );
  }

  return (
    <div className="app-shell">
      <ExamHeader
        audioEnabled={audioEnabled}
        busy={busy}
        canExportRecord={canExportRecord}
        canScoreNow={canScoreNow}
        changePracticeType={changePracticeType}
        changeTrainingMode={changeTrainingMode}
        createFreshSession={createFreshSession}
        currentPhase={currentPhase}
        downloadPracticeRecord={downloadPracticeRecord}
        isPracticeMode={isPracticeMode}
        practiceType={practiceType}
        practiceTypes={PRACTICE_TYPES}
        recording={recording}
        requestReport={requestReport}
        session={session}
        sessionStats={sessionStats}
        stageProgress={stageProgress}
        toggleAudioEnabled={toggleAudioEnabled}
        trainingMode={trainingMode}
        trainingModes={TRAINING_MODES}
      />
      <ExamStageCard
        busy={busy}
        changeCueCardTitle={changeCueCardTitle}
        changePart1Topic={changePart1Topic}
        currentPhase={currentPhase}
        formatDuration={formatDuration}
        hasStageControls={hasVisibleStageControls}
        isPracticeMode={isPracticeMode}
        practiceOptions={practiceOptions}
        prepRemaining={prepRemaining}
        recording={recording}
        selectedCueCardTitle={selectedCueCardTitle}
        selectedPart1Topic={selectedPart1Topic}
        session={session}
        sessionStats={sessionStats}
        showCueCardSelect={showCueCardSelect}
        showPart1TopicSelect={showPart1TopicSelect}
        stageDescription={stageDescription}
        stageProgress={stageProgress}
      />

      <ChatPanel
        bottomRef={bottomRef}
        busy={busy}
        busyLabel={busyLabel}
        canRetryRecording={canRetryRecording}
        chatPanelRef={chatPanelRef}
        configWarning={configWarning}
        downloadPracticeRecord={downloadPracticeRecord}
        downloadReport={downloadReport}
        downloadTranscript={downloadTranscript}
        error={error}
        messages={messages}
        pendingSpeechUrl={pendingSpeechUrl}
        playPendingSpeech={playPendingSpeech}
        report={report}
        retryLastRecording={retryLastRecording}
      />

      <MobileToasts
        busy={busy}
        busyLabel={busyLabel}
        canRetryRecording={canRetryRecording}
        error={error}
        pendingSpeechUrl={pendingSpeechUrl}
        playPendingSpeech={playPendingSpeech}
        retryLastRecording={retryLastRecording}
      />

      <AnswerComposer
        busy={busy}
        canAnswer={canAnswer}
        draft={draft}
        elapsed={elapsed}
        formatDuration={formatDuration}
        handleTextComposerKeyDown={handleTextComposerKeyDown}
        mode={mode}
        recordButtonDisabled={recordButtonDisabled}
        recordButtonText={recordButtonText}
        recording={recording}
        requestReport={requestReport}
        reviewBeforeSend={reviewBeforeSend}
        session={session}
        setDraft={setDraft}
        setMode={setMode}
        setReviewBeforeSend={setReviewBeforeSend}
        submitTypedAnswer={submitTypedAnswer}
        toggleRecording={toggleRecording}
      />
    </div>
  );
}


