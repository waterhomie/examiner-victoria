import assert from "node:assert/strict";
import { isClearlySilentAudio, recordingIsClearlySilent } from "./src/utils/audioSilence.js";

function buffer(samples) {
  return { numberOfChannels: 1, length: samples.length, getChannelData: () => samples };
}

assert.equal(isClearlySilentAudio(buffer(new Float32Array(16000))), true);
assert.equal(isClearlySilentAudio(buffer(new Float32Array(16000).fill(0.0001))), true);
assert.equal(isClearlySilentAudio(buffer(new Float32Array(16000).fill(0.004))), false);
assert.equal(isClearlySilentAudio(buffer(Float32Array.from([0, Number.NaN]))), false);
assert.equal(isClearlySilentAudio(null), false);

globalThis.window = {};
assert.equal(await recordingIsClearlySilent({ arrayBuffer: async () => new ArrayBuffer(1) }), false);
let closed = 0;
window.AudioContext = class {
  state = "running";
  async decodeAudioData() { return buffer(new Float32Array(16000)); }
  async close() { closed += 1; }
};
assert.equal(await recordingIsClearlySilent({ arrayBuffer: async () => new ArrayBuffer(1) }), true);
assert.equal(closed, 1);
window.AudioContext = class {
  state = "running";
  async decodeAudioData() { throw new Error("unsupported codec"); }
  async close() { closed += 1; }
};
assert.equal(await recordingIsClearlySilent({ arrayBuffer: async () => new ArrayBuffer(1) }), false);
assert.equal(closed, 2);

console.log("Conservative audio silence checks passed.");
