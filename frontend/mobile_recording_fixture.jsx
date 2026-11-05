import React from "react";
import { createRoot } from "react-dom/client";
import { AnswerComposer } from "./src/components/layout/AnswerComposer.jsx";
import { ChatPanel } from "./src/components/layout/ChatPanel.jsx";
import { ExamHeader } from "./src/components/layout/ExamHeader.jsx";
import "./src/styles.css";
import "./src/styles/mobile.css";

const opening = { role: "assistant", phase: "part1", content: "**Part 1 Practice**\n\nLet's talk about headphones.\n\nAre headphones comfortable to wear?" };
const focused = new URLSearchParams(location.search).get("part") !== "full";

createRoot(document.getElementById("root")).render(
  <div className="app-shell">
    <ExamHeader trainingMode="practice" trainingModes={[{ value: "practice", label: "Practice" }]}
      practiceType={focused ? "part1" : "full"}
      practiceTypes={[{ value: "full", label: "Full" }, { value: "part1", label: "Part 1" }]}
      currentPhase="Part 1" isPracticeMode session={{ phase: "part1", test_active: true }}
      sessionStats={{ answered: 0, averageWpm: "-", totalDuration: "00:00" }} stageProgress={20} />
    <ChatPanel messages={[opening]} focusedPart={focused} />
    <AnswerComposer mode="voice" recording recordButtonText="Tap to send" formatDuration={() => "00:06"}
      session={{ test_active: true }} />
  </div>,
);
