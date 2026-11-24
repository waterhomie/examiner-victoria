import { useCallback, useEffect, useRef } from "react";
import {
  buildReport,
  fetchPracticeOptions,
  healthCheck,
  sendAnswer,
  sendTelemetryEvent,
  startSession,
} from "../api.js";
import { DEFAULT_SETTINGS, MEMO_KEY } from "../config/appConfig.js";
import {
  answerFailed,
  answerSending,
  answerSucceeded,
  goHome,
  markingStep,
  nextQuestion,
  patch,
  reportFailed,
  reportRequested,
  reportSucceeded,
  retakeDone,
  retakeStarted,
  sessionFailed,
  sessionStarted,
  sessionStarting,
} from "../state/actions.js";
import { SCREENS } from "../state/initialState.js";
import { buildPracticeRecordText, buildTranscriptText, downloadTextFile } from "../utils/downloads.js";
import { ERROR_KINDS, friendlyError, isNetworkError } from "../utils/errors.js";
import { safeDateStamp } from "../utils/format.js";
import { saveMemo } from "../utils/memo.js";
import { parseReport } from "../utils/reportView.js";
import { displayQuestion, fitForSpeech, isSessionComplete, speakableText } from "../utils/sessionView.js";

const READY_HOLD_MS = 700;

function lastAssistantText(session) {
  const messages = session?.messages || [];
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "assistant") return messages[index].content;
  }
  return session?.current_question || "";
}

function newTurnId() {
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useExamController({ state, dispatch, speech, recordingReset }) {
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const { playSpeech, prefetchSpeech, stopCurrentAudio, clearPendingSpeech, unlockAudio } = speech;

  // Pass the session id explicitly right after a dispatch: stateRef is only
  // updated on the next render, and the backend TTS limiter is per session.
  const speak = useCallback((text, options = {}) => {
    const { sessionId, ...playOptions } = options;
    const clean = fitForSpeech(speakableText(text));
    if (!clean) return;
    void playSpeech(clean, sessionId || stateRef.current.session?.session_id, playOptions);
  }, [playSpeech]);

  const loadBackendStatus = useCallback(async () => {
    const [health, options] = await Promise.allSettled([healthCheck(), fetchPracticeOptions()]);
    dispatch(patch({
      ...(health.status === "fulfilled" ? { health: health.value } : { health: { status: "unreachable" } }),
      ...(options.status === "fulfilled" ? { practiceOptions: { ...stateRef.current.practiceOptions, ...options.value } } : {}),
    }));
  }, [dispatch]);

  // Called from the "Call Victoria" tap, so the iOS audio unlock runs inside
  // the user gesture before any await.
  const startCall = useCallback(async () => {
    const current = stateRef.current;
    unlockAudio(true);
    stopCurrentAudio();
    clearPendingSpeech();
    recordingReset?.();
    dispatch(sessionStarting());
    const practice = current.trainingMode === "practice";
    try {
      const data = await startSession({
        ...DEFAULT_SETTINGS,
        voice_playback_enabled: current.audioEnabled,
        practice_mode: practice,
        answer_expansion_mode: practice,
        practice_type: current.practiceType,
        part1_topic: current.practiceType === "part1" ? current.part1Topic || null : null,
        cue_card_title: ["part2", "part3"].includes(current.practiceType) ? current.cueCardTitle || null : null,
        feedback_adaptation: practice && current.practiceType === "part1" ? current.feedbackAdaptation : "standard",
      });
      const spoken = lastAssistantText(data.session);
      dispatch(sessionStarted(data.session));
      dispatch(patch({ nextSpeech: spoken }));
      speak(spoken, { sessionId: data.session.session_id });
    } catch (err) {
      dispatch(sessionFailed({
        kind: isNetworkError(err) ? ERROR_KINDS.OFFLINE : ERROR_KINDS.GENERIC,
        message: friendlyError(err, "We couldn't start the call."),
      }));
    }
  }, [clearPendingSpeech, dispatch, recordingReset, speak, stopCurrentAudio, unlockAudio]);

  const submitAnswer = useCallback(async (answer, source = "text", duration = null) => {
    const current = stateRef.current;
    const session = current.session;
    const cleaned = String(answer || "").trim();
    if (!cleaned || !session || current.busy === "sending") return;
    const question = displayQuestion(session);
    const startedAt = Date.now();
    stopCurrentAudio();
    clearPendingSpeech();
    dispatch(answerSending({ question, phase: session.phase, transcript: cleaned, source, duration }));
    try {
      const data = await sendAnswer({ session, answer: cleaned, source, duration });
      sendTelemetryEvent("answer", {
        source,
        phase: session.phase,
        answerDuration: duration || 0,
        llm_duration_ms: data.llm_duration_ms || null,
        total_duration_ms: Date.now() - startedAt,
      });
      const turn = {
        id: newTurnId(),
        question: data.answered_question ? displayQuestion({ ...session, current_question: data.answered_question }) : question,
        phase: data.answered_phase || session.phase,
        answer: cleaned,
        source,
        duration,
        feedback: data.feedback || null,
        retakes: [],
      };
      dispatch(answerSucceeded(data, turn));
      const coaching = Boolean(data.feedback?.coaching);
      const complete = isSessionComplete(data.session);
      if (coaching) {
        if (!complete && stateRef.current.audioEnabled) {
          await prefetchSpeech(fitForSpeech(speakableText(data.spoken_text)), data.session?.session_id);
        }
        dispatch(markingStep("ready"));
        window.setTimeout(() => dispatch(markingStep("done")), READY_HOLD_MS);
      } else if (complete) {
        void requestReportFor(data.session);
      } else {
        speak(data.spoken_text, { sessionId: data.session?.session_id });
      }
    } catch (err) {
      sendTelemetryEvent("answer-error", { source, phase: session.phase, message: String(err?.message || err) });
      const offline = isNetworkError(err);
      dispatch(answerFailed(
        {
          kind: offline ? ERROR_KINDS.OFFLINE : ERROR_KINDS.GENERIC,
          message: friendlyError(err, "Victoria couldn't reply."),
        },
        offline ? { answer: cleaned, source, duration } : null,
      ));
    }
    // requestReportFor is defined below and stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearPendingSpeech, dispatch, prefetchSpeech, speak, stopCurrentAudio]);

  const retryPending = useCallback(() => {
    const pending = stateRef.current.pendingAnswer;
    if (pending) void submitAnswer(pending.answer, pending.source, pending.duration);
  }, [submitAnswer]);

  const discardPending = useCallback(() => {
    dispatch(patch({ pendingAnswer: null, error: null, marking: null, screen: SCREENS.EXAM }));
  }, [dispatch]);

  const goNext = useCallback(() => {
    const current = stateRef.current;
    unlockAudio(true);
    dispatch(nextQuestion());
    if (isSessionComplete(current.session)) {
      if (!current.report && current.reportStatus !== "loading") void requestReportFor(current.session);
      return;
    }
    speak(current.nextSpeech);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, speak, unlockAudio]);

  const replayQuestion = useCallback(() => {
    const current = stateRef.current;
    speak(current.nextSpeech || lastAssistantText(current.session), { manual: true });
  }, [speak]);

  const listen = useCallback((text) => speak(text, { manual: true }), [speak]);

  const startRetake = useCallback((turnId) => {
    stopCurrentAudio();
    dispatch(retakeStarted(turnId));
  }, [dispatch, stopCurrentAudio]);

  const finishRetake = useCallback((text, duration) => {
    const retake = stateRef.current.retake;
    if (retake) dispatch(retakeDone(retake.turnId, text, duration));
  }, [dispatch]);

  const cancelRetake = useCallback(() => {
    dispatch(patch({ retake: null, screen: SCREENS.REVIEW }));
  }, [dispatch]);

  async function requestReportFor(session) {
    if (!session) return;
    stopCurrentAudio();
    dispatch(reportRequested());
    try {
      const data = await buildReport(session);
      dispatch(reportSucceeded(data.report));
      const parsed = parseReport(data.report);
      if (parsed.oneThing) saveMemo(MEMO_KEY, parsed.oneThing);
    } catch (err) {
      dispatch(reportFailed({
        kind: isNetworkError(err) ? ERROR_KINDS.OFFLINE : ERROR_KINDS.GENERIC,
        message: friendlyError(err, "We couldn't make your recap."),
      }));
    }
  }

  const requestReport = useCallback(() => requestReportFor(stateRef.current.session), []); // eslint-disable-line react-hooks/exhaustive-deps

  const endSession = useCallback(() => {
    stopCurrentAudio();
    clearPendingSpeech();
    recordingReset?.();
    dispatch(goHome());
  }, [clearPendingSpeech, dispatch, recordingReset, stopCurrentAudio]);

  const downloadTranscript = useCallback(() => {
    const session = stateRef.current.session;
    if (session) downloadTextFile(`examiner-victoria-transcript-${safeDateStamp()}.txt`, buildTranscriptText(session));
  }, []);

  const downloadRecord = useCallback(() => {
    const { session, report } = stateRef.current;
    if (session) {
      downloadTextFile(`examiner-victoria-practice-record-${safeDateStamp()}.txt`, buildPracticeRecordText(session, report));
    }
  }, []);

  return {
    cancelRetake,
    discardPending,
    downloadRecord,
    downloadTranscript,
    endSession,
    finishRetake,
    goNext,
    listen,
    loadBackendStatus,
    replayQuestion,
    requestReport,
    retryPending,
    startCall,
    startRetake,
    submitAnswer,
  };
}
