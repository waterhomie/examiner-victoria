import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom",
  optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const { ExamHeader } = await server.ssrLoadModule("/src/components/layout/ExamHeader.jsx");
  const { ExamStageCard } = await server.ssrLoadModule("/src/components/layout/ExamStageCard.jsx");
  const { AnswerComposer } = await server.ssrLoadModule("/src/components/layout/AnswerComposer.jsx");
  const { ChatPanel } = await server.ssrLoadModule("/src/components/layout/ChatPanel.jsx");
  const base = { trainingModes: [], practiceTypes: [], session: { phase: "part1" },
    sessionStats: { answers: 0 }, stageProgress: 0, isPracticeMode: true, practiceType: "part1",
    feedbackAdaptation: "adaptive", changePracticeType() {}, changeTrainingMode() {}, changeFeedbackAdaptation() {} };
  const header = renderToStaticMarkup(React.createElement(ExamHeader, base));
  assert.match(header, /data-tour-target="flow"[^>]*><select[^>]*aria-label="Choose speaking part"/);
  assert.doesNotMatch(header, /data-tour-target="flow"[^>]*><span>Part<\/span>/);
  const stage = renderToStaticMarkup(React.createElement(ExamStageCard, {
    practiceOptions: { part1_topics: [], cue_cards: [] }, showCueCardSelect: true, stageProgress: 0,
  }));
  assert.match(stage, /data-tour-target="cue-card"[^>]*><span>Topic<\/span>/);
  assert.match(stage, /Random topic/);
  const composer = renderToStaticMarkup(React.createElement(AnswerComposer, {
    mode: "text", draft: "First take", reviewedRecording: true, replacementDraft: "Second take",
    session: { test_active: true },
  }));
  assert.match(composer, /Keep previous/);
  assert.match(composer, /Use new take/);
  assert.match(composer, /<button type="submit" disabled="" data-testid="send-answer-button"/);
  const recordingComposer = renderToStaticMarkup(React.createElement(AnswerComposer, {
    mode: "voice", recording: true, session: { test_active: true }, formatDuration: () => "00:01",
  }));
  assert.match(recordingComposer, /data-testid="cancel-recording-button"/);
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
  assert.equal((html.match(/Tap Quick correction or Natural version to hear it/g) || []).length, 1);
  const firstHtml = renderToStaticMarkup(React.createElement(ChatPanel, {
    messages: [{ role: "assistant", content: "First question?" }],
    feedbackPlayback: { text: "", status: "", onPlay() {} },
  }));
  assert.doesNotMatch(firstHtml, /Quick guide/);
  assert.doesNotMatch(firstHtml, /Tap Quick correction or Natural version to hear it/);
  const standardHtml = renderToStaticMarkup(React.createElement(ChatPanel, {
    messages: [{ role: "assistant", content: "First question?" },
      { role: "user", content: "I agree." },
      { role: "assistant", content: "**Quick correction:** Say 'I agree'.\n\nNext question?" }],
    feedbackPlayback: { text: "", status: "", onPlay() {} },
  }));
  assert.equal((standardHtml.match(/Tap Quick correction or Natural version to hear it/g) || []).length, 1);
  assert.ok(standardHtml.indexOf("First question?") < standardHtml.indexOf("Tap Quick correction"));
  assert.ok(standardHtml.indexOf("Tap Quick correction") < standardHtml.indexOf("Play Quick correction"));
  assert.doesNotMatch(html, /learner_support_profile|SUPPORT:|EVIDENCE:/);
  console.log("Adaptive feedback rendered settings, notice and F-015 controls passed.");
} finally {
  await server.close();
}
