import React from "react";
import { createRoot } from "react-dom/client";
import { AnswerComposer } from "./src/components/layout/AnswerComposer.jsx";
import { ChatPanel } from "./src/components/layout/ChatPanel.jsx";
import "./src/styles.css";
import "./src/styles/mobile.css";

const opening = { role: "assistant", phase: "part1", content: "**Part 1 Practice**\n\nLet's talk about headphones.\n\nAre headphones comfortable to wear?" };
const focused = new URLSearchParams(location.search).get("part") !== "full";

createRoot(document.getElementById("root")).render(
  <div className="app-shell">
    <header className="topbar"><strong>Examiner Victoria</strong><span>Part 1 · Practice</span></header>
    <ChatPanel messages={[opening]} focusedPart1Practice={focused} />
    <AnswerComposer mode="voice" recording recordButtonText="Tap to send" formatDuration={() => "00:06"}
      session={{ test_active: true }} />
  </div>,
);
