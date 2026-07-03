import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeAudio } from "../api.js";
import { createBrowserSpeechTranscriber } from "../browserSpeechTranscriber.js";
import { createAnswerRecorder, WavRecorder } from "../recorder.js";
import { friendlyError } from "../utils/errors.js";
import { usePagehideCleanup, useRecordingTimer } from "./useBrowserEffects.js";

function recordTranscriptionDiagnostic(details) {
  if (typeof window === "undefined") return;
  const diagnostic = {
    at: new Date().toISOString(),
    ...details,
  };
  window.__victoriaLastTranscription = diagnostic;
  window.__victoriaTranscriptionHistory = [
    ...(window.__victoriaTranscriptionHistory || []),
    diagnostic,
  ].slice(-10);
  console.info("[Victoria transcription]", diagnostic);
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
    recordTranscriptionDiagnostic({
      stage: "recorder-fallback",
      from: "media",
      to: "wav",
      reason: error.message,
    });
    return wavRecorder;
  }
}

export function useAnswerRecording({
  busy,
  reviewBeforeSend,
  setBusy,
  setDraft,
  setError,
  setMode,
  submitAnswer,
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [canRetryRecording, setCanRetryRecording] = useState(false);
  const recorderRef = useRef(null);
  const browserSpeechRef = useRef(null);
  const lastRecordingRef = useRef(null);
  const startedAtRef = useRef(0);

  useRecordingTimer(recording, startedAtRef, setElapsed);

  const cleanupRecording = useCallback(() => {
    browserSpeechRef.current?.cancel?.();
    browserSpeechRef.current = null;
    recorderRef.current?.cleanup?.();
    recorderRef.current = null;
  }, []);

  const resetRecording = useCallback(() => {
    cleanupRecording();
    lastRecordingRef.current = null;
    setCanRetryRecording(false);
    setRecording(false);
    setElapsed(0);
  }, [cleanupRecording]);

  useEffect(() => cleanupRecording, [cleanupRecording]);
  usePagehideCleanup(cleanupRecording);

  const handleTranscribedAudio = useCallback(
    async (text, duration) => {
      if (reviewBeforeSend) {
        setDraft(text);
        setMode("text");
        setBusy("");
      } else {
        await submitAnswer(text, "audio", duration);
      }
      lastRecordingRef.current = null;
      setCanRetryRecording(false);
    },
    [reviewBeforeSend, setBusy, setDraft, setMode, submitAnswer],
  );

  const toggleRecording = useCallback(async () => {
    if (busy) return;
    setError("");

    if (!recording) {
      try {
        cleanupRecording();
        recorderRef.current = await startPreferredRecorder();
        const browserSpeech = createBrowserSpeechTranscriber({ language: "en-US" });
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
        setElapsed(0);
        setRecording(true);
        setCanRetryRecording(false);
        lastRecordingRef.current = null;
        recordTranscriptionDiagnostic({
          stage: "recording-started",
          recorderType: recorderRef.current?.kind || "unknown",
          recorderMimeType: recorderRef.current?.mimeType || "",
          browserSpeech: browserSpeechStatus,
        });
      } catch (err) {
        cleanupRecording();
        setMode("text");
        setError(friendlyError(err, "Microphone permission was blocked."));
      }
      return;
    }

    setRecording(false);
    setBusy("transcribing");
    const transcriptionStartedAt = Date.now();
    try {
      const browserSpeech = browserSpeechRef.current;
      browserSpeechRef.current = null;
      const browserTranscriptPromise = browserSpeech
        ? browserSpeech.stop({ graceMs: 900 })
        : Promise.resolve("");
      const result = await recorderRef.current.stop();
      recorderRef.current = null;
      setElapsed(0);
      if (!result) return;
      if (!result.blob || result.blob.size < 1024 || !Number.isFinite(result.duration)) {
        throw new Error("Recording is too short.");
      }
      lastRecordingRef.current = result;
      const fastText = (await browserTranscriptPromise).trim();
      if (fastText) {
        recordTranscriptionDiagnostic({
          stage: "transcription-completed",
          source: "browser",
          totalMs: Date.now() - transcriptionStartedAt,
          recorderType: result.recorderType || "unknown",
          blobType: result.blob.type || result.mimeType || "",
          blobSize: result.blob.size,
          duration: result.duration,
        });
        await handleTranscribedAudio(fastText, result.duration);
        return;
      }
      const serverStartedAt = Date.now();
      const transcription = await transcribeAudio(result.blob);
      const text = transcription.text || "";
      if (!text.trim()) {
        throw new Error("No clear speech was detected.");
      }
      recordTranscriptionDiagnostic({
        stage: "transcription-completed",
        source: "server",
        totalMs: Date.now() - transcriptionStartedAt,
        serverTotalMs: Date.now() - serverStartedAt,
        serverElapsedMs: transcription.elapsed_ms,
        recorderType: result.recorderType || "unknown",
        blobType: result.blob.type || result.mimeType || "",
        blobSize: result.blob.size,
        duration: result.duration,
      });
      await handleTranscribedAudio(text, result.duration);
    } catch (err) {
      recordTranscriptionDiagnostic({
        stage: "transcription-failed",
        totalMs: Date.now() - transcriptionStartedAt,
        error: String(err?.message || err),
      });
      cleanupRecording();
      setElapsed(0);
      setMode("text");
      setCanRetryRecording(Boolean(lastRecordingRef.current?.blob));
      setError(friendlyError(err, "Recording could not be sent."));
      setBusy("");
    }
  }, [busy, cleanupRecording, handleTranscribedAudio, recording, setBusy, setError, setMode]);

  const retryLastRecording = useCallback(async () => {
    const result = lastRecordingRef.current;
    if (!result?.blob || busy) return;
    setError("");
    setBusy("transcribing");
    const serverStartedAt = Date.now();
    try {
      const transcription = await transcribeAudio(result.blob);
      const text = transcription.text || "";
      if (!text.trim()) {
        throw new Error("No clear speech was detected.");
      }
      recordTranscriptionDiagnostic({
        stage: "transcription-completed",
        source: "server-retry",
        serverTotalMs: Date.now() - serverStartedAt,
        serverElapsedMs: transcription.elapsed_ms,
        recorderType: result.recorderType || "unknown",
        blobType: result.blob.type || result.mimeType || "",
        blobSize: result.blob.size,
        duration: result.duration,
      });
      await handleTranscribedAudio(text, result.duration);
    } catch (err) {
      recordTranscriptionDiagnostic({
        stage: "transcription-failed",
        source: "server-retry",
        serverTotalMs: Date.now() - serverStartedAt,
        error: String(err?.message || err),
      });
      setCanRetryRecording(true);
      setError(friendlyError(err, "Recording could not be sent."));
      setBusy("");
    }
  }, [busy, handleTranscribedAudio, setBusy, setError]);

  return {
    canRetryRecording,
    cleanupRecording,
    elapsed,
    recording,
    resetRecording,
    retryLastRecording,
    toggleRecording,
  };
}
