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
  const audioRef = useRef(null);
  const audioUrlRef = useRef("");
  const audioUnlockedRef = useRef(false);
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

  const stopCurrentAudio = useCallback(() => {
    if (audioRef.current) {
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

  const unlockAudio = useCallback(() => {
    if (!audioEnabled || audioUnlockedRef.current || !isLikelyIOSDevice()) return;
    const audio = getAudioElement();
    const previousMuted = audio.muted;
    const previousVolume = audio.volume;
    audio.muted = true;
    audio.volume = 0;
    audio.src = SILENT_WAV_DATA_URI;
    const unlockAttempt = audio.play();
    Promise.resolve(unlockAttempt)
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
      });
  }, [audioEnabled, getAudioElement]);

  const playAudioUrl = useCallback(async (url) => {
    const audio = getAudioElement();
    audio.pause();
    audio.src = url;
    audioUrlRef.current = url;
    audio.onended = () => {
      if (audioUrlRef.current === url) {
        URL.revokeObjectURL(url);
        audioUrlRef.current = "";
        audio.removeAttribute("src");
        audio.load();
      }
    };
    await audio.play();
    audioUnlockedRef.current = true;
  }, [getAudioElement]);

  const getSpeechBlob = useCallback(async (text) => {
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
      blob = await synthesizeSpeech(text);
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
    async (text) => {
      if (!audioEnabled || !text) return;
      stopCurrentAudio();
      clearPendingSpeech();
      let url = "";
      try {
        const blob = await getSpeechBlob(text);
        url = URL.createObjectURL(blob);
        await playAudioUrl(url);
      } catch (err) {
        if (!url) {
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

        if (!/play|autoplay|notallowed/i.test(err?.message || "")) {
          onErrorChange("Victoria's voice is ready, but the browser needs a tap before it can play.");
        }
      }
    },
    [audioEnabled, clearPendingSpeech, getSpeechBlob, onErrorChange, playAudioUrl, stopCurrentAudio],
  );

  const playPendingSpeech = useCallback(async () => {
    if (!pendingSpeechUrl) return;
    onErrorChange("");
    stopCurrentAudio();
    const url = pendingSpeechUrl;
    const text = pendingSpeechText;
    pendingSpeechUrlRef.current = "";
    setPendingSpeechUrl("");
    setPendingSpeechText("");
    try {
      await playAudioUrl(url);
    } catch (_) {
      pendingSpeechUrlRef.current = url;
      setPendingSpeechUrl(url);
      setPendingSpeechText(text);
      onErrorChange("Audio still could not play. Please check Safari's sound mode and tap Play Victoria again.");
    }
  }, [onErrorChange, pendingSpeechText, pendingSpeechUrl, playAudioUrl, stopCurrentAudio]);

  return {
    clearPendingSpeech,
    pendingSpeechUrl,
    playPendingSpeech,
    playSpeech,
    unlockAudio,
    stopCurrentAudio,
  };
}
