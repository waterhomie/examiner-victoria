import { useCallback, useRef, useState } from "react";
import { synthesizeSpeech } from "../api.js";
import { isLikelyIOSDevice } from "../utils/browser.js";
import { friendlyError } from "../utils/errors.js";
import { speechCacheKey } from "../utils/format.js";

const MAX_SPEECH_CACHE_ITEMS = 24;

export function useSpeechPlayback({ audioEnabled, setError }) {
  const [pendingSpeechUrl, setPendingSpeechUrl] = useState("");
  const [pendingSpeechText, setPendingSpeechText] = useState("");
  const audioRef = useRef(null);
  const audioUrlRef = useRef("");
  const audioUnlockedRef = useRef(false);
  const speechBlobCacheRef = useRef(new Map());
  const pendingSpeechUrlRef = useRef("");

  const stopCurrentAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
    }
    audioRef.current = null;
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

  const playAudioUrl = useCallback(async (url) => {
    const audio = new Audio(url);
    audio.playsInline = true;
    audio.preload = "auto";
    audioRef.current = audio;
    audioUrlRef.current = url;
    audio.addEventListener(
      "ended",
      () => {
        if (audioRef.current === audio) {
          URL.revokeObjectURL(url);
          audioRef.current = null;
          audioUrlRef.current = "";
        }
      },
      { once: true },
    );
    await audio.play();
    audioUnlockedRef.current = true;
  }, []);

  const getSpeechBlob = useCallback(async (text) => {
    const key = speechCacheKey(text);
    const cache = speechBlobCacheRef.current;
    if (key && cache.has(key)) {
      return cache.get(key);
    }
    const blob = await synthesizeSpeech(text);
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
        if (isLikelyIOSDevice() && !audioUnlockedRef.current) {
          pendingSpeechUrlRef.current = url;
          setPendingSpeechUrl(url);
          setPendingSpeechText(text);
          return;
        }
        await playAudioUrl(url);
      } catch (err) {
        if (!url) {
          setError(
            friendlyError(
              err,
              "Voice playback is temporarily unavailable. You can continue with the visible text.",
            ),
          );
          return;
        }

        audioRef.current = null;
        audioUrlRef.current = "";
        pendingSpeechUrlRef.current = url;
        setPendingSpeechUrl(url);
        setPendingSpeechText(text);

        if (!/play|autoplay|notallowed/i.test(err?.message || "")) {
          setError("Victoria's voice is ready, but the browser needs a tap before it can play.");
        }
      }
    },
    [audioEnabled, clearPendingSpeech, getSpeechBlob, playAudioUrl, setError, stopCurrentAudio],
  );

  const playPendingSpeech = useCallback(async () => {
    if (!pendingSpeechUrl) return;
    setError("");
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
      setError("Audio still could not play. Please check Safari's sound mode and tap Play Victoria again.");
    }
  }, [pendingSpeechText, pendingSpeechUrl, playAudioUrl, setError, stopCurrentAudio]);

  return {
    clearPendingSpeech,
    pendingSpeechUrl,
    playPendingSpeech,
    playSpeech,
    stopCurrentAudio,
  };
}
