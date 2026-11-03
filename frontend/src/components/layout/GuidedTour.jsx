import { useEffect, useState } from "react";

const KEY = "victoria-ui-tour-v2";
const stages = ["mode", "mode-choice", "mode-info", "flow", "flow-choice", "flow-info", "sound", "sound-info", "answer"];
const targetName = (stage) => stage.startsWith("mode") ? "mode" : stage.startsWith("flow") ? "flow" : stage.startsWith("sound") ? "sound" : "answer";

export function GuidedTour({ ready, trainingMode, practiceType, trainingModes, practiceTypes, chooseTrainingMode, choosePracticeType }) {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(() => {
    try { return localStorage.getItem(KEY) === "done" ? stages.length : 0; }
    catch { return 0; }
  });
  const [rect, setRect] = useState(null);
  const stage = stages[step];
  const finish = () => {
    try { localStorage.setItem(KEY, "done"); } catch { /* Tour can still close. */ }
    setStep(stages.length);
  };
  useEffect(() => { if (ready) setStarted(true); }, [ready]);
  useEffect(() => {
    if (!started || !stage) return;
    const onKeyDown = (event) => { if (event.key === "Escape") finish(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [started, stage]);

  useEffect(() => {
    if (!started || !stage) return;
    const target = document.querySelector(`[data-tour-target="${targetName(stage)}"]`);
    if (!target) return;
    target.classList.add("tour-target-active");
    const update = () => setRect(target.getBoundingClientRect());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const openChoices = (event) => { event.preventDefault(); setStep(step + 1); };
    const blockNativeSelect = (event) => event.preventDefault();
    const advance = () => {
      if (stage === "answer") {
        try { localStorage.setItem(KEY, "done"); } catch { /* Tour can still close. */ }
      }
      setStep(step + 1);
    };
    if (stage === "mode" || stage === "flow") target.addEventListener("pointerdown", openChoices, true);
    if (stage === "mode-choice" || stage === "mode-info" || stage === "flow-choice" || stage === "flow-info") {
      target.addEventListener("pointerdown", blockNativeSelect, true);
    }
    if (stage === "sound" || stage === "answer") target.addEventListener("click", advance, { once: true });
    return () => {
      target.removeEventListener("pointerdown", openChoices, true);
      target.removeEventListener("pointerdown", blockNativeSelect, true);
      target.removeEventListener("click", advance);
      target.classList.remove("tour-target-active");
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [stage, step, started]);

  if (!started || !stage || !rect) return null;
  const content = {
    mode: "Tap Mode to choose Practice or Mock.",
    "mode-choice": "Choose a mode to see what it does.",
    "mode-info": trainingMode === "practice"
      ? "Practice: get a correction and a natural version after each answer."
      : "Mock: follow the speaking test without feedback after every answer. Review your performance at the end.",
    flow: "Tap Flow to choose what you want to practise.",
    "flow-choice": "Choose one part or the full speaking test.",
    "flow-info": practiceType === "full" ? "Full takes you through Parts 1, 2 and 3."
      : `${practiceTypes.find((item) => item.value === practiceType)?.label || "This part"} lets you focus on one section.`,
    sound: "Tap Sound to turn Victoria's voice on or off.",
    "sound-info": "You can listen to Victoria's questions or read them on screen.",
    answer: "Tap Text to type, or tap the recording area to speak your answer.",
  };
  const top = rect.bottom + 170 < window.innerHeight ? rect.bottom + 14 : Math.max(12, rect.top - 170);
  const left = Math.max(12, Math.min(rect.left, window.innerWidth - 312));
  const options = stage === "mode-choice" || stage === "mode-info" ? trainingModes : practiceTypes;
  const choose = (value) => {
    if (stage.startsWith("mode")) chooseTrainingMode(value);
    else choosePracticeType(value);
    if (stage.endsWith("choice")) setStep(step + 1);
  };
  return (
    <div className="tour-layer" role="dialog" aria-modal="true" aria-label="Quick guide">
      <div className="tour-scrim" />
      <div className="tour-popover" style={{ top, left }}>
        <strong>Quick guide · {step < 3 ? 1 : step < 6 ? 2 : step < 8 ? 3 : 4} / 4</strong>
        <p>{content[stage]}</p>
        {(stage.includes("choice") || stage === "mode-info" || stage === "flow-info") ? (
          <div className="tour-choices">{options.map((item) => (
            <button key={item.value} type="button" onClick={() => choose(item.value)}>{item.label}</button>
          ))}</div>
        ) : null}
        {(stage === "mode-info" || stage === "flow-info" || stage === "sound-info") ? (
          <button type="button" onClick={() => setStep(step + 1)}>Next</button>
        ) : null}
        <button className="tour-skip" type="button" onClick={finish}>Skip guide</button>
      </div>
    </div>
  );
}
