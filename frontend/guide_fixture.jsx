import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ExamHeader } from './src/components/layout/ExamHeader.jsx';
import { GuidedTour } from './src/components/layout/GuidedTour.jsx';
import { AnswerComposer } from './src/components/layout/AnswerComposer.jsx';
import { ExamStageCard } from './src/components/layout/ExamStageCard.jsx';
import './src/styles.css';
import './src/styles/mobile.css';

function Fixture() {
  const [trainingMode, setMode] = useState('practice');
  const [practiceType, setPart] = useState('part1');
  const [audioEnabled, setAudio] = useState(true);
  const [replayRequest, setReplay] = useState(0);
  const [ready, setReady] = useState(true);
  const trainingModes = ['practice', 'mock'].map(value => ({value, label: value === 'practice' ? 'Practice' : 'Mock'}));
  const practiceTypes = ['full', 'part1', 'part2', 'part3'].map((value, i) => ({value, label: i ? `Part ${i}` : 'Full'}));
  const change = (setter, value) => { setReady(false); setter(value); setTimeout(() => setReady(true), 100); };
  const selectionKind = practiceType === 'part1' ? 'topic' : practiceType === 'full' ? null : 'cue-card';
  return <div className="app-shell">
    <ExamHeader {...{audioEnabled, trainingMode, practiceType, trainingModes, practiceTypes}}
      session={{phase:'part1', test_active:true}} currentPhase="Part 1" sessionStats={{answered:0, averageWpm:'-', totalDuration:'00:00'}} stageProgress={20}
      isPracticeMode={trainingMode === 'practice'} toggleAudioEnabled={() => setAudio(value => !value)}
      changeTrainingMode={event => change(setMode,event.target.value)} changePracticeType={event => change(setPart,event.target.value)}
      replayGuide={() => setReplay(value => value+1)} />
    {selectionKind ? <ExamStageCard hasStageControls showPart1TopicSelect={selectionKind === 'topic'} showCueCardSelect={selectionKind === 'cue-card'} practiceOptions={{part1_topics:['Parks'],cue_cards:[]}} stageProgress={20} /> : null}
    <main className="chat-panel">Practice question</main>
    <AnswerComposer mode="text" draft="" session={{test_active:true}} canAnswer />
    <GuidedTour {...{ready,replayRequest,trainingMode,practiceType,trainingModes,practiceTypes,selectionKind}}
      chooseTrainingMode={value => change(setMode,value)} choosePracticeType={value => change(setPart,value)} />
  </div>;
}
createRoot(document.getElementById('root')).render(<Fixture />);
