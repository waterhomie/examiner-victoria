import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { splitFeedbackPlayback } from "./src/utils/feedbackPlayback.js";

// Exercise the real hook with deterministic hooks and a delayed browser play().
// A synchronous Audio mock would miss cancellation of Safari's unlock promise.
const source = readFileSync(new URL("./src/hooks/useSpeechPlayback.js", import.meta.url), "utf8")
  .replace(/^import .*;\r?\n/gm, "")
  .replace("export function useSpeechPlayback", "function useSpeechPlayback");

function createPlaybackHarness() {
  const slots = [];
  const requests = [];
  const errors = [];
  let cursor = 0;
  let pendingUnlock;
  let unlocked = false;
  let blobCount = 0;
  let blocked = false;
  const played = [];
  const audio = {
    src: "", muted: false, volume: 1,
    pause() {
      if (pendingUnlock) {
        const reject = pendingUnlock.reject;
        pendingUnlock = null;
        reject(new Error("AbortError: play interrupted by pause"));
      }
    },
    removeAttribute() { this.src = ""; },
    load() {},
    play() {
      if (this.src.startsWith("data:")) {
        return new Promise((resolve, reject) => { pendingUnlock = { resolve, reject }; });
      }
      if (!unlocked || blocked) return Promise.reject(new Error("NotAllowedError: autoplay blocked"));
      played.push(this.src);
      return Promise.resolve();
    },
  };
  const hook = runInNewContext(`${source}\nuseSpeechPlayback;`, {
    useCallback: (callback) => callback,
    useRef: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useState: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value) => { slots[index] = value; }];
    },
    Audio: function () { return audio; },
    URL: { createObjectURL: () => `blob:test-${++blobCount}`, revokeObjectURL() {} },
    isLikelyIOSDevice: () => true,
    speechCacheKey: (text) => text,
    sendTelemetryEvent() {},
    synthesizeSpeech: async (text) => { requests.push(text); return { size: 10 }; },
    VOICE_UNAVAILABLE_MESSAGE: "Voice unavailable",
  });
  return {
    requests, played, errors,
    render() { cursor = 0; return hook({ audioEnabled: false, onErrorChange: (error) => errors.push(error) }); },
    resolveUnlock() {
      assert.ok(pendingUnlock, "the silent unlock must not be interrupted by playback cleanup");
      const resolve = pendingUnlock.resolve;
      pendingUnlock = null;
      unlocked = true;
      resolve();
    },
    setBlocked(value) { blocked = value; },
    finish() { audio.onended(); },
  };
}

const feedback = '**A natural version of your answer:**\n\n> I enjoy walking in the park.\n> It helps me relax.\n\nWhat do you study?';
const naturalText = splitFeedbackPlayback(feedback).find((section) => section.label === "Natural version").text;

// Sound off still permits an explicit Natural version tap, with no next question.
{
  const h = createPlaybackHarness();
  const play = h.render().playSpeech(naturalText, "synthetic-session", { manual: true });
  assert.equal(h.requests.length, 0, "TTS must wait for the user-gesture unlock");
  assert.equal(h.render().speechState.status, "loading");
  h.resolveUnlock();
  await play;
  assert.deepEqual(h.requests, ["I enjoy walking in the park.\nIt helps me relax."]);
  assert.equal(h.played.length, 1);
  assert.equal(h.render().speechState.status, "playing");
  h.finish();
  assert.equal(h.render().speechState.status, "");
  await h.render().playSpeech(naturalText, "synthetic-session", { manual: true });
  assert.equal(h.requests.length, 1, "replay should reuse the TTS cache");
}

// A second tap/recording stop during unlock must cancel the future continuation.
{
  const h = createPlaybackHarness();
  const play = h.render().playSpeech(naturalText, "", { manual: true });
  h.render().stopCurrentAudio();
  await play;
  assert.equal(h.requests.length, 0);
  assert.equal(h.played.length, 0);
  assert.equal(h.render().speechState.status, "");
}

// Rapidly switching blocks keeps the in-flight unlock but only plays the latest.
{
  const h = createPlaybackHarness();
  const first = h.render().playSpeech("Earlier feedback", "", { manual: true });
  const latest = h.render().playSpeech(naturalText, "", { manual: true });
  h.resolveUnlock();
  await Promise.all([first, latest]);
  assert.deepEqual(h.requests, [naturalText]);
  assert.equal(h.played.length, 1);
}

// An existing gesture unlock is preserved; blocked playback can be tapped again.
{
  const h = createPlaybackHarness();
  h.render().unlockAudio(true);
  const play = h.render().playSpeech(naturalText, "", { manual: true });
  h.setBlocked(true);
  h.resolveUnlock();
  await play;
  assert.equal(h.render().speechState.status, "pending");
  h.setBlocked(false);
  await h.render().playPendingSpeech();
  assert.equal(h.render().speechState.status, "playing");
  assert.equal(h.requests.length, 1);
}

console.log("Speech playback unlock and Natural version regression checks passed.");
