import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getTourPosition } from "./tourPosition.js";
import { getTourTarget, nextTourStep, previousTourStep, TOUR_STAGES } from "./tourSteps.js";

const KEY = "victoria-ui-tour-v2";

export function GuidedTour({ ready, replayRequest, trainingMode, practiceType, trainingModes, practiceTypes, selectionKind, chooseTrainingMode, choosePracticeType }) {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(() => {
    try { return localStorage.getItem(KEY) === "done" ? TOUR_STAGES.length : 0; }
    catch { return 0; }
  });
  const [rect, setRect] = useState(null);
  const [position, setPosition] = useState(null);
  const popoverRef = useRef(null);
  const stage = TOUR_STAGES[step];
  const finish = () => {
    try { localStorage.setItem(KEY, "done"); } catch { /* Tour can still close. */ }
    setStep(TOUR_STAGES.length);
  };
  useEffect(() => { if (ready) setStarted(true); }, [ready]);
  useEffect(() => {
    if (replayRequest === 0) return;
    setStarted(true);
    setRect(null);
    setPosition(null);
    setStep(0);
  }, [replayRequest]);
  useEffect(() => {
    if (!started || !ready || !stage) return;
    const onKeyDown = (event) => { if (event.key === "Escape") finish(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [started, ready, stage]);

  useLayoutEffect(() => {
    if (!started || !ready || !stage) return;
    const targetName = getTourTarget(stage, selectionKind);
    const target = targetName && document.querySelector(`[data-tour-target="${targetName}"]`);
    if (!target) {
      setRect(null);
      if (stage === "selection") setStep((current) => nextTourStep(current, selectionKind));
      return;
    }
    target.classList.add("tour-target-active");
    const update = () => setRect(target.getBoundingClientRect());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const observer = new ResizeObserver(update);
    observer.observe(target);
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
    if (stage === "selection") target.addEventListener("change", advance, true);
    return () => {
      target.removeEventListener("pointerdown", openChoices, true);
      target.removeEventListener("pointerdown", blockNativeSelect, true);
      target.removeEventListener("click", advance);
      target.removeEventListener("change", advance, true);
      target.classList.remove("tour-target-active");
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [stage, step, started, ready, selectionKind]);

  useLayoutEffect(() => {
    if (!started || !ready || !stage || !rect || !popoverRef.current) return;
    const popover = popoverRef.current;
    const update = () => {
      const next = getTourPosition(
        rect,
        { width: popover.offsetWidth, height: popover.scrollHeight },
        { width: window.innerWidth, height: window.innerHeight },
      );
      setPosition((previous) => previous?.top === next.top && previous?.left === next.left
        && previous?.maxHeight === next.maxHeight ? previous : next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(popover);
    window.addEventListener("resize", update);
    return () => { observer.disconnect(); window.removeEventListener("resize", update); };
  }, [started, ready, stage, rect, trainingMode, practiceType]);

  if (!started || !ready || !stage || !rect) return null;
  const content = {
    mode: "Tap Mode to choose Practice or Mock.",
    "mode-choice": "Choose a mode to see what it does.",
    "mode-info": trainingMode === "practice"
      ? "Practice: get a correction and a natural version after each answer."
      : "Mock: follow the speaking test without feedback after every answer. Review your performance at the end.",
    flow: "Tap Part to choose what you want to practise.",
    "flow-choice": "Choose one part or the full speaking test.",
    "flow-info": practiceType === "full" ? "Full takes you through Parts 1, 2 and 3."
      : `${practiceTypes.find((item) => item.value === practiceType)?.label || "This part"} lets you focus on one section.${selectionKind ? " Next, choose a Topic or keep it random." : ""}`,
    selection: selectionKind === "topic"
      ? "Choose a Topic or keep Random topic. Changing it starts a new session. This selector disappears after your first Part 1 answer."
      : "Choose a Topic (IELTS cue card) or keep Random topic. Changing it starts a new session.",
    sound: "Tap Sound to turn Victoria's voice on or off.",
    "sound-info": "You can listen to Victoria's questions or read them on screen.",
    answer: "You're ready. Tap Text to type, or tap the recording area to speak. You can cancel a recording or review and retake it before sending. Find this guide again under More → Show guide.",
  };
  const options = stage === "mode-choice" || stage === "mode-info" ? trainingModes : practiceTypes;
  const choose = (value) => {
    if (stage.startsWith("mode")) chooseTrainingMode(value);
    else choosePracticeType(value);
    if (stage.endsWith("choice")) setStep(step + 1);
  };
  return createPortal(
    <>
      <div className="tour-scrim" aria-hidden="true" />
      <div className="tour-popover" role="dialog" aria-modal="true" aria-label="Quick guide" ref={popoverRef} style={position || { top: 12, left: 12, visibility: "hidden" }}>
        <strong>Quick guide · {step < 3 ? 1 : step < 7 ? 2 : step < 9 ? 3 : 4} / 4</strong>
        <p>{content[stage]}</p>
        {(stage.includes("choice") || stage === "mode-info" || stage === "flow-info") ? (
          <div className="tour-choices">{options.map((item) => (
            <button key={item.value} type="button" onClick={() => choose(item.value)}>{item.label}</button>
          ))}</div>
        ) : null}
        <div className="tour-navigation">
          {step > 0 ? <button className="tour-back" type="button" onClick={() => setStep(previousTourStep(step, selectionKind))}>Back</button> : null}
          {(stage === "mode-info" || stage === "flow-info" || stage === "selection" || stage === "sound-info") ? (
            <button type="button" onClick={() => setStep(nextTourStep(step, selectionKind))}>Next</button>
          ) : null}
          {stage === "answer" ? <button type="button" onClick={finish}>Finish guide</button>
            : <button className="tour-skip" type="button" onClick={finish}>Skip guide</button>}
        </div>
      </div>
    </>,
    document.body,
  );
}
