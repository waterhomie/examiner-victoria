import { isLikelyIOSDevice } from "./utils/browser.js";

const DEFAULT_LANGUAGE = "en-US";

function getSpeechRecognitionClass() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function normalizeTranscript(text) {
  return (text || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

export function browserSpeechTranscriptionIsSupported() {
  if (isLikelyIOSDevice()) return false;
  return Boolean(getSpeechRecognitionClass());
}

export function createBrowserSpeechTranscriber({ language = DEFAULT_LANGUAGE } = {}) {
  if (!browserSpeechTranscriptionIsSupported()) return null;
  const SpeechRecognitionClass = getSpeechRecognitionClass();
  if (!SpeechRecognitionClass) return null;

  let recognition = null;
  let started = false;
  let finalTranscript = "";
  let interimTranscript = "";
  let stopResolver = null;
  let fallbackTimer = null;

  function bestTranscript() {
    return normalizeTranscript(finalTranscript || interimTranscript);
  }

  function resolveStop() {
    if (fallbackTimer) {
      window.clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    if (stopResolver) {
      const resolve = stopResolver;
      stopResolver = null;
      resolve(bestTranscript());
    }
  }

  return {
    async start() {
      finalTranscript = "";
      interimTranscript = "";
      recognition = new SpeechRecognitionClass();
      recognition.lang = language;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        let latestInterim = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const transcript = event.results[index]?.[0]?.transcript || "";
          if (event.results[index]?.isFinal) {
            finalTranscript = `${finalTranscript} ${transcript}`.trim();
          } else {
            latestInterim = `${latestInterim} ${transcript}`.trim();
          }
        }
        if (latestInterim) {
          interimTranscript = latestInterim;
        }
      };

      recognition.onerror = () => {
        // Browser speech recognition is an acceleration path, not the source of truth.
        // Whisper/server transcription remains the fallback.
      };

      recognition.onend = () => {
        started = false;
        resolveStop();
      };

      recognition.start();
      started = true;
    },

    stop({ graceMs = 700 } = {}) {
      if (!recognition || !started) {
        return Promise.resolve(bestTranscript());
      }
      return new Promise((resolve) => {
        stopResolver = resolve;
        fallbackTimer = window.setTimeout(resolveStop, graceMs);
        try {
          recognition.stop();
        } catch (_) {
          resolveStop();
        }
      });
    },

    cancel() {
      if (fallbackTimer) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      stopResolver = null;
      if (recognition && started) {
        try {
          recognition.abort();
        } catch (_) {
          // Ignore cleanup errors.
        }
      }
      started = false;
      recognition = null;
    },
  };
}
