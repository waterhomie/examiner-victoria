import { useCallback, useEffect, useRef, useState } from "react";
import { sendTelemetryEvent, transcribeAudio } from "../api.js";
import { createBrowserSpeechTranscriber } from "../browserSpeechTranscriber.js";
import { createAnswerRecorder, WavRecorder } from "../recorder.js";
import { recordingIsClearlySilent } from "../utils/audioSilence.js";
import { transcriptionRecovery } from "../utils/errors.js";
import { usePagehideCleanup, useRecordingTimer } from "./useBrowserEffects.js";

// Recording pipeline (kept from V3, proven on iOS / Android / WeChat):
//   recorder (MediaRecorder → WAV fallback)
//   + browser SpeechRecognition fast path (not on iOS)
//   → silence check → trust check → server transcription fallback.
// V4 changes: no "review before send" step, live caption callback,
// auto-stop at `maxSeconds`, and the last recording can be played back.

function recordTranscriptionDiagnostic(details) {
  if (typeof window === "undefined") return;
  const diagnostic = { at: new Date().toISOString(), ...details };
  window.__victoriaLastTranscription = diagnostic;
  window.__victoriaTranscriptionHistory = [...(window.__victoriaTranscriptionHistory || []), diagnostic].slice(-10);
  sendTelemetryEvent("transcription", diagnostic);
}

function countTranscriptWords(text) {
  return (text.match(/[A-Za-z']+/g) || []).length;
}

export function shouldTrustBrowserTranscript(text, duration) {
  const words = countTranscriptWords(text);
  if (!text.trim() || words === 0) return false;
  if (duration >= 2.5 && words < 3) return false;
  if (duration >= 5 && words < 5) return false;
  return true;
}

async function startPreferredRecorder() {
  const recorder = createAnswerRecorder({ targetSampleRate: 16000 });
  try {
    await recorder.start();
    return recorder;
  } catch (error) {
    recorder.cleanup?.();
    if (recorder.kind !== "media" || !String(error?.message || "").includes("compressed audio")) {
      throw error;
    }
    const wavRecorder = new WavRecorder({ targetSampleRate: 16000 });
    await wavRecorder.start();
    recordTranscriptionDiagnostic({ stage: "recorder-fallback", from: "media", to: "wav", reason: error.message });
    return wavRecorder;
  }
}

export function useAnswerRecording({ onTranscribed, onError, maxSeconds = 0, enabled = true }) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [liveCaption, setLiveCaption] = useState("");
  const [canRetry, setCanRetry] = useState(false);
  const [lastRecordingUrl, setLastRecordingUrl] = useState("");
  const recorderRef = useRef(null);
  const browserSpeechRef = useRef(null);
  const lastRecordingRef = useRef(null);
  const startedAtRef = useRef(0);
  const stoppingRef = useRef(false);
  const onTranscribedRef = useRef(onTranscribed);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTranscribedRef.current = onTranscribed;
    onErrorRef.current = onError;
  }, [onError, onTranscribed]);

  useRecordingTimer(recording, startedAtRef, setElapsed);

  const revokePlayback = useCallback(() => {
    setLastRecordingUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return "";
    });
  }, []);

  const cleanupRecording = useCallback(() => {
    browserSpeechRef.current?.cancel?.();
    browserSpeechRef.current = null;
    recorderRef.current?.cleanup?.();
    recorderRef.current = null;
  }, []);

  const resetRecording = useCallback(() => {
    cleanupRecording();
    lastRecordingRef.current = null;
    stoppingRef.current = false;
    setCanRetry(false);
    setRecording(false);
    setTranscribing(false);
    setElapsed(0);
    setLiveCaption("");
    revokePlayback();
  }, [cleanupRecording, revokePlayback]);

  const cancelRecording = useCallback(() => {
    cleanupRecording();
    setRecording(false);
    setElapsed(0);
    setLiveCaption("");
  }, [cleanupRecording]);

  useEffect(() => cleanupRecording, [cleanupRecording]);
  usePagehideCleanup(cleanupRecording);

  const fail = useCallback((err, stage) => {
    recordTranscriptionDiagnostic({ stage: "transcription-failed", source: stage, error: String(err?.message || err) });
    const recovery = transcriptionRecovery(err);
    const retry = Boolean(lastRecordingRef.current?.blob) && recovery.retryAudio;
    setCanRetry(retry);
    setTranscribing(false);
    onErrorRef.current?.({ ...recovery, canRetry: retry });
  }, []);

  const finish = useCallback(async (text, result, source) => {
    setTranscribing(false);
    setCanRetry(false);
    await onTranscribedRef.current?.(text, result.duration, { source });
  }, []);

  const serverTranscribe = useCallback(async (result, stage) => {
    const startedAt = Date.now();
    const transcription = await transcribeAudio(result.blob);
    const text = (transcription.text || "").trim();
    if (!text) throw new Error("No clear speech was detected.");
    recordTranscriptionDiagnostic({
      stage: "transcription-completed",
      source: stage,
      serverTotalMs: Date.now() - startedAt,
      stt_duration_ms: transcription.stt_duration_ms || transcription.elapsed_ms || null,
      recorderType: result.recorderType || "unknown",
      blobSize: result.blob.size,
      duration: result.duration,
    });
    return text;
  }, []);

  const start = useCallback(async () => {
    if (!enabled || recording || transcribing) return false;
    try {
      cleanupRecording();
      revokePlayback();
      setLiveCaption("");
      recorderRef.current = await startPreferredRecorder();
      const browserSpeech = createBrowserSpeechTranscriber({ language: "en-US", onUpdate: setLiveCaption });
      let browserSpeechStatus = browserSpeech ? "available" : "unsupported";
      if (browserSpeech) {
        try {
          await browserSpeech.start();
          browserSpeechRef.current = browserSpeech;
          browserSpeechStatus = "started";
        } catch (_) {
          browserSpeech.cancel?.();
          browserSpeechRef.current = null;
          browserSpeechStatus = "start-failed";
        }
      }
      startedAtRef.current = Date.now();
      stoppingRef.current = false;
      setElapsed(0);
      setRecording(true);
      setCanRetry(false);
      lastRecordingRef.current = null;
      recordTranscriptionDiagnostic({
        stage: "recording-started",
        recorderType: recorderRef.current?.kind || "unknown",
        browserSpeech: browserSpeechStatus,
      });
      return true;
    } catch (err) {
      cleanupRecording();
      fail(err, "start");
      return false;
    }
  }, [cleanupRecording, enabled, fail, recording, revokePlayback, transcribing]);

  const stop = useCallback(async () => {
    if (!recording || stoppingRef.current || !recorderRef.current) return;
    stoppingRef.current = true;
    setRecording(false);
    setTranscribing(true);
    const startedAt = Date.now();
    try {
      const browserSpeech = browserSpeechRef.current;
      browserSpeechRef.current = null;
      const browserTranscriptPromise = browserSpeech ? browserSpeech.stop({ graceMs: 900 }) : Promise.resolve("");
      const result = await recorderRef.current.stop();
      recorderRef.current = null;
      setElapsed(0);
      if (!result) {
        setTranscribing(false);
        return;
      }
      if (!result.blob || result.blob.size < 1024 || !Number.isFinite(result.duration)) {
        throw new Error("Recording is too short.");
      }
      lastRecordingRef.current = result;
      setLastRecordingUrl(URL.createObjectURL(result.blob));
      const fastText = (await browserTranscriptPromise).trim();
      if (await recordingIsClearlySilent(result.blob)) {
        recordTranscriptionDiagnostic({ stage: "recording-clearly-silent", duration: result.duration });
        throw new Error("Clearly silent recording.");
      }
      if (fastText && shouldTrustBrowserTranscript(fastText, result.duration)) {
        recordTranscriptionDiagnostic({
          stage: "transcription-completed",
          source: "browser",
          stt_duration_ms: Date.now() - startedAt,
          duration: result.duration,
        });
        await finish(fastText, result, "browser");
        return;
      }
      if (fastText) {
        recordTranscriptionDiagnostic({
          stage: "browser-transcript-rejected",
          browserWords: countTranscriptWords(fastText),
          duration: result.duration,
        });
      }
      const text = await serverTranscribe(result, "server");
      await finish(text, result, "server");
    } catch (err) {
      cleanupRecording();
      setElapsed(0);
      fail(err, "server");
    } finally {
      stoppingRef.current = false;
    }
  }, [cleanupRecording, fail, finish, recording, serverTranscribe]);

  const toggle = useCallback(() => (recording ? stop() : start()), [recording, start, stop]);

  const retryLast = useCallback(async () => {
    const result = lastRecordingRef.current;
    if (!result?.blob || transcribing) return;
    setTranscribing(true);
    try {
      const text = await serverTranscribe(result, "server-retry");
      await finish(text, result, "server");
    } catch (err) {
      fail(err, "server-retry");
    }
  }, [fail, finish, serverTranscribe, transcribing]);

  // Part 2: the examiner stops you at two minutes.
  useEffect(() => {
    if (recording && maxSeconds > 0 && elapsed >= maxSeconds) void stop();
  }, [elapsed, maxSeconds, recording, stop]);

  return {
    cancelRecording,
    canRetry,
    cleanupRecording,
    elapsed,
    lastRecordingUrl,
    liveCaption,
    recording,
    resetRecording,
    retryLast,
    start,
    stop,
    toggle,
    transcribing,
  };
}
