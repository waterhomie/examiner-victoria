import { useCallback, useRef, useState } from "react";
import { sendTelemetryEvent, synthesizeSpeech } from "../api.js";
import { isLikelyIOSDevice } from "../utils/browser.js";
import { VOICE_UNAVAILABLE_MESSAGE } from "../utils/errors.js";
import { speechCacheKey } from "../utils/format.js";

const MAX_SPEECH_CACHE_ITEMS = 24;
const SILENT_WAV_DATA_URI =
  "data:audio/wav;base64,UklGRiQCAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

export function useSpeechPlayback({ audioEnabled, onErrorChange }) {
  const [pendingSpeechUrl, setPendingSpeechUrl] = useState("");
  const [pendingSpeechText, setPendingSpeechText] = useState("");
  const [speechState, setSpeechState] = useState({ text: "", status: "" });
  const speechRequestRef = useRef(0);
  const audioRef = useRef(null);
  const audioUrlRef = useRef("");
  const audioUnlockedRef = useRef(false);
  const unlockPromiseRef = useRef(null);
  const speechBlobCacheRef = useRef(new Map());
  const pendingSpeechUrlRef = useRef("");

  const getAudioElement = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.playsInline = true;
      audio.preload = "auto";
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  const stopCurrentAudio = useCallback(({ preserveUnlock = false } = {}) => {
    speechRequestRef.current += 1;
    setSpeechState({ text: "", status: "" });
    if (audioRef.current && !(preserveUnlock && unlockPromiseRef.current)) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
    }
    audioUrlRef.current = "";
  }, []);

  const clearPendingSpeech = useCallback(() => {
    if (pendingSpeechUrlRef.current) {
      URL.revokeObjectURL(pendingSpeechUrlRef.current);
    }
    pendingSpeechUrlRef.current = "";
    setPendingSpeechUrl("");
    setPendingSpeechText("");
  }, []);

  const unlockAudio = useCallback((manual = false) => {
    if ((!audioEnabled && !manual) || audioUnlockedRef.current || !isLikelyIOSDevice()) return;
    if (unlockPromiseRef.current) return unlockPromiseRef.current;
    const audio = getAudioElement();
    const previousMuted = audio.muted;
    const previousVolume = audio.volume;
    audio.muted = true;
    audio.volume = 0;
    audio.src = SILENT_WAV_DATA_URI;
    const unlockAttempt = audio.play();
    unlockPromiseRef.current = Promise.resolve(unlockAttempt)
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.removeAttribute("src");
        audio.load();
        audio.muted = previousMuted;
        audio.volume = previousVolume;
        audioUnlockedRef.current = true;
      })
      .catch(() => {
        audio.muted = previousMuted;
        audio.volume = previousVolume;
      }).finally(() => { unlockPromiseRef.current = null; });
    return unlockPromiseRef.current;
  }, [audioEnabled, getAudioElement]);

  const playAudioUrl = useCallback(async (url) => {
    const audio = getAudioElement();
    audio.pause();
    audio.src = url;
    audioUrlRef.current = url;
    audio.onended = () => {
      if (audioUrlRef.current === url) {
        setSpeechState({ text: "", status: "" });
        URL.revokeObjectURL(url);
        audioUrlRef.current = "";
        audio.removeAttribute("src");
        audio.load();
      }
    };
    audio.onerror = () => {
      if (audioUrlRef.current !== url) return;
      URL.revokeObjectURL(url);
      audioUrlRef.current = "";
      setSpeechState({ text: "", status: "" });
      onErrorChange(VOICE_UNAVAILABLE_MESSAGE);
    };
    await audio.play();
    audioUnlockedRef.current = true;
  }, [getAudioElement, onErrorChange]);

  const getSpeechBlob = useCallback(async (text, sessionId = "") => {
    const key = speechCacheKey(text);
    const cache = speechBlobCacheRef.current;
    if (key && cache.has(key)) {
      sendTelemetryEvent("tts", {
        source: "cache",
        chars: text.length,
        durationMs: 0,
      });
      return cache.get(key);
    }
    const startedAt = Date.now();
    let blob;
    try {
      blob = await synthesizeSpeech(text, sessionId);
      sendTelemetryEvent("tts", {
        source: "server",
        chars: text.length,
        durationMs: Date.now() - startedAt,
        tts_duration_ms: Date.now() - startedAt,
        bytes: blob.size || 0,
      });
    } catch (err) {
      sendTelemetryEvent("tts-error", {
        source: "server",
        chars: text.length,
        durationMs: Date.now() - startedAt,
        tts_duration_ms: Date.now() - startedAt,
        message: String(err?.message || err),
      });
      throw err;
    }
    if (key) {
      cache.set(key, blob);
      while (cache.size > MAX_SPEECH_CACHE_ITEMS) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
      }
    }
    return blob;
  }, []);

  const playSpeech = useCallback(
    async (text, sessionId = "", options = {}) => {
      if ((!audioEnabled && !options.manual) || !text) return;
      // Keep a user-gesture unlock alive until its play() promise settles.
      // Explicit stop/recording actions still cancel it and invalidate this request.
      stopCurrentAudio({ preserveUnlock: true });
      clearPendingSpeech();
      const requestId = speechRequestRef.current;
      setSpeechState({ text, status: "loading" });
      let url = "";
      try {
        // Start manual unlock synchronously in the tap handler, after cleanup.
        // Waiting in App would leave a continuation that a later stop cannot cancel.
        await (options.manual ? unlockAudio(true) : unlockPromiseRef.current);
        if (requestId !== speechRequestRef.current) return;
        const blob = await getSpeechBlob(text, sessionId);
        if (requestId !== speechRequestRef.current) return;
        url = URL.createObjectURL(blob);
        await playAudioUrl(url);
        if (requestId === speechRequestRef.current && audioUrlRef.current === url) {
          setSpeechState({ text, status: "playing" });
        }
      } catch (err) {
        if (requestId !== speechRequestRef.current) return;
        if (!url) {
          setSpeechState({ text: "", status: "" });
          onErrorChange(VOICE_UNAVAILABLE_MESSAGE);
          return;
        }

        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.removeAttribute("src");
          audioRef.current.load();
        }
        if (audioUrlRef.current === url) {
          audioUrlRef.current = "";
        }
        pendingSpeechUrlRef.current = url;
        setPendingSpeechUrl(url);
        setPendingSpeechText(text);
        setSpeechState({ text, status: "pending" });

        if (!/play|autoplay|notallowed/i.test(err?.message || "")) {
          onErrorChange("Victoria's voice is ready, but the browser needs a tap before it can play.");
        }
      }
    },
    [audioEnabled, clearPendingSpeech, getSpeechBlob, onErrorChange, playAudioUrl, stopCurrentAudio, unlockAudio],
  );

  const playPendingSpeech = useCallback(async () => {
    if (!pendingSpeechUrl) return;
    onErrorChange("");
    stopCurrentAudio();
    const url = pendingSpeechUrl;
    const text = pendingSpeechText;
    const requestId = speechRequestRef.current;
    pendingSpeechUrlRef.current = "";
    setPendingSpeechUrl("");
    setPendingSpeechText("");
    try {
      await playAudioUrl(url);
      if (requestId === speechRequestRef.current && audioUrlRef.current === url) {
        setSpeechState({ text, status: "playing" });
      }
    } catch (_) {
      if (requestId !== speechRequestRef.current) return;
      pendingSpeechUrlRef.current = url;
      setPendingSpeechUrl(url);
      setPendingSpeechText(text);
      setSpeechState({ text, status: "pending" });
      onErrorChange("Audio still could not play. Please check Safari's sound mode and tap Play Victoria again.");
    }
  }, [onErrorChange, pendingSpeechText, pendingSpeechUrl, playAudioUrl, stopCurrentAudio]);

  return {
    speechState,
    clearPendingSpeech,
    pendingSpeechUrl,
    playPendingSpeech,
    playSpeech,
    unlockAudio,
    stopCurrentAudio,
  };
}
