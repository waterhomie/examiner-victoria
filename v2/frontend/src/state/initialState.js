export function createInitialAppState() {
  return {
    session: null,
    draft: "",
    mode: "voice",
    reviewBeforeSend: false,
    busy: "starting",
    error: "",
    report: "",
    audioEnabled: true,
    trainingMode: "practice",
    practiceType: "full",
    practiceOptions: { part1_topics: [], cue_cards: [] },
    selectedPart1Topic: "",
    selectedCueCardTitle: "",
    healthInfo: null,
    storageReady: false,
    prepEndsAt: null,
    clockTick: Date.now(),
  };
}
