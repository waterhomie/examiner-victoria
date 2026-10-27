import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom",
  optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const { ExamHeader } = await server.ssrLoadModule("/src/components/layout/ExamHeader.jsx");
  const { ChatPanel } = await server.ssrLoadModule("/src/components/layout/ChatPanel.jsx");
  const base = { trainingModes: [], practiceTypes: [], session: { phase: "part1" },
    sessionStats: { answers: 0 }, stageProgress: 0, isPracticeMode: true, practiceType: "part1",
    feedbackAdaptation: "adaptive", changePracticeType() {}, changeTrainingMode() {}, changeFeedbackAdaptation() {} };
  const header = renderToStaticMarkup(React.createElement(ExamHeader, base));
  assert.match(header, /data-testid="adaptive-feedback-toggle"[^>]*checked/);
  assert.match(header, /Adapt feedback to my answers/);
  assert.match(header, /adaptive-settings-menu/);
  for (const overrides of [{ isPracticeMode: false }, { practiceType: "full" }, { practiceType: "part2" }, { practiceType: "part3" }]) {
    assert.doesNotMatch(renderToStaticMarkup(React.createElement(ExamHeader, { ...base, ...overrides })), /adaptive-feedback-toggle/);
  }
  const disabled = renderToStaticMarkup(React.createElement(ExamHeader, { ...base, recording: true }));
  assert.match(disabled, /data-testid="adaptive-feedback-toggle"[^>]*disabled/);
  const content = "**Natural version:** I enjoy jazz because it helps me relax.\n\nWhen do you listen?";
  const html = renderToStaticMarkup(React.createElement(ChatPanel, {
    messages: [{ role: "assistant", content, adaptation_notice: true }, { role: "assistant", content }],
    feedbackPlayback: { text: "", status: "", onPlay() {} },
  }));
  assert.equal((html.match(/This is not an IELTS level assessment/g) || []).length, 1);
  assert.equal((html.match(/aria-label="Play Natural version"/g) || []).length, 2);
  assert.match(html, /tap a correction or improved answer to hear Victoria/);
  assert.doesNotMatch(html, /learner_support_profile|SUPPORT:|EVIDENCE:/);
  console.log("Adaptive feedback rendered settings, notice and F-015 controls passed.");
} finally {
  await server.close();
}
