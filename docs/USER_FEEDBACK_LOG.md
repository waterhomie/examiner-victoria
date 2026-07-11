# Examiner Victoria V2 User Feedback And Product Decisions

## 1. Record Notes

- Test period: 2026-07
- Product version: Examiner Victoria V2
- Test surface: mobile Web App
- Testers: 2 anonymized testers
- Method: open feedback after real product use
- Privacy: this document stores anonymized product feedback only. Original chats, identities, answers, audio, screenshots, and contact details are kept outside the Git repository.

## 2. Core Findings

- Users need direct, actionable next-step guidance, not only error identification.
- Practice Mode and Mock / Exam Mode have different user expectations.
- Voice playback alone does not create a realistic exam experience; exam immersion depends on reducing chat bubbles, live transcript display, and per-turn feedback during the test.
- Part 3 needs both stable IELTS-style question-bank structure and answer-driven follow-up.
- A tester's intuitive ratio request should not become a fixed algorithmic ratio; quality, relevance, and fallback stability matter more.
- Pronunciation scoring must be stated as a product boundary because transcription text is not acoustic scoring.
- Practice history is a valid need, but cloud accounts and databases can remain Roadmap for V2.

## 3. Feedback Table

| ID | Tester | User feedback | Product issue | Current capability | Product decision | Priority | Status |
|---|---|---|---|---|---|---|---|
| F-001 | T001 | Wants mock tests to rely mainly on examiner voice and candidate voice, rather than a text-chat interface. | The chat interface is useful for coaching, but can weaken exam immersion and make users rely on text and live transcript. | V2 has TTS, recording, transcription, continuous flow, Part 2 Cue Card, prep timer, and a minimal voice-first Mock view. | Keep Practice Mode. In Mock / Exam Mode, hide the main chat stream and live transcript, keep Part 2 Cue Card, and show feedback after the test. | P1 | Minimal version implemented, needs validation |
| F-002 | T001 | For long answers with many mistakes, wants the system to cover the main issues. | Balance correction coverage with cognitive load. | Current feedback gives quick correction, expression tip, and natural version. | Do not list every mistake mechanically; validate a strategy that catches the most important issues and gives a next action. | P1 | Needs validation |
| F-003 | T002 | Suggestions can be too indirect; wants more specific, actionable advice. | Feedback must tell users what to change next. | Current structure exists but does not always explain why or how to practice next. | Build test samples for a clearer issue / reason / fix / example / next-task structure before rewriting scoring. | P1 | Needs validation |
| F-004 | T001 | Wants Part 3 to include stable bank questions and targeted follow-up based on Part 2 or later answers. | Pure bank questions are stable but less conversational; fully dynamic questions can repeat, drift, or vary in difficulty. | Backend now supports bank backbone, answer-driven follow-up, fallback, short-answer guard, and no consecutive dynamic follow-up. | Use question-bank backbone + answer-driven follow-up + question-bank fallback. Do not set a fixed ratio. | P1 | Strategy implemented, quality needs validation |
| F-005 | T001 | Current product cannot truly evaluate pronunciation or fully cover all IELTS scoring criteria. | Product boundary must be clear. | Current system uses transcript text, duration, and WPM; it does not perform acoustic pronunciation scoring. | Do not claim full pronunciation scoring or full official IELTS scoring. Acoustic pronunciation scoring remains Roadmap. | P0 | Product boundary |
| F-006 | T001 | Wants to choose specific practice topics, such as a Part 1 flowers topic. | Users need targeted practice. | V2 has practice options, Part 1 topic selection, and Part 2 / Part 3 cue-card selection. | Keep the selection flow and validate discoverability; content coverage can be expanded later if demand repeats. | P1 | Partially solved |
| F-007 | T001 | Wants personal practice records to be saved. | Need to distinguish local export, local recovery, and cloud history. | V2 has report, transcript, practice-record export, and local session recovery. | Keep local export/recovery in V2. Accounts, database history, and cross-device records are Roadmap. | Roadmap | Partially solved |
| F-008 | T002 | Wants a more live, human-like conversation experience. | This is interaction rhythm, not just a voice button. | React + FastAPI supports continuous turns and TTS, but not full-duplex live voice. | Improve low-cost rhythm first; full-duplex live voice remains Roadmap. | P2 / Roadmap | Roadmap |

## 4. Detailed Decisions

### F-001 | Voice-first realistic mock exam

The user is not mainly asking for a clearer Play button. The request is for a distinct exam experience where the examiner asks mainly by voice, the candidate answers mainly by voice, and the interface does not center full chat history, live transcript, or immediate per-turn coaching.

Current V2 supports the technical base: TTS, user recording, transcription, continuous flow, Part 2 Cue Card, prep timer, final report, and transcript. The current implementation adds a minimal Mock / Exam view: Practice Mode still shows the learning chat, while Mock Mode hides the main chat stream during Part 1 and Part 3, keeps Part 2 Cue Card visible, and leaves feedback for the end.

Product decision:

- Keep the current Practice Mode for learning and revision.
- Keep Mock / Exam Mode as a separate voice-first experience.
- Part 1: voice-first question and answer, with optional text fallback.
- Part 2: still show Cue Card, prompts, and preparation timer.
- Part 2 answer stage: mainly continuous voice answer.
- Part 3: voice-first discussion.
- During the mock, do not show per-turn correction, expression coaching, or full transcript as the main UI.
- After the mock, show transcript, score/report, and downloads.

Status: P1, minimal version implemented, needs 3-5 tester validation.

### F-002 | Long-answer correction coverage

Do not mechanically list every error. That would make feedback too long, harder to remember, and slower to generate. The better strategy is:

1. Identify the issue that most affects accuracy or understanding.
2. Give one expression improvement.
3. Provide one natural answer version.
4. Add one next practice action when needed.
5. Mention that minor issues may remain when the answer is very long.

Status: P1, needs validation before prompt changes.

### F-003 | More direct feedback

A stronger feedback structure should answer:

- What is the problem?
- Why does it matter?
- How should the user fix it?
- What is one rewritten example?
- What should the user practice next?

Status: P1, needs test samples before scoring or prompt rewrite.

### F-004 | Part 3 question-bank backbone and answer-driven follow-up

The user's ratio wording is best understood as a request for mixed questioning, not as a strict algorithm. The goal is stable IELTS-style structure plus natural follow-up when the answer gives enough substance.

Current implementation:

- The first Part 3 question comes from the selected cue-card question bank.
- Meaningful answers can trigger an answer-driven dynamic follow-up.
- Dynamic follow-up is limited so it does not appear twice in a row.
- After one dynamic follow-up, the flow returns to bank backbone or fallback.
- Short answers, missing context, provider failure, empty output, duplicate output, invalid output, or over-specific output fall back safely.
- Source tracking can mark questions as `bank`, `dynamic`, or `fallback`.

Product decision:

```text
question-bank backbone + answer-driven follow-up + question-bank fallback
```

Do not set a fixed ratio. Dynamic follow-up should depend on answer substance, repeat risk, Part 3 abstractness, and generation quality.

Validation focus:

1. Does the dynamic question connect to the user's answer?
2. Does it avoid repetition?
3. Does it stay analytical rather than personal?
4. Does short-answer fallback feel stable?
5. Does the mix feel more like a real examiner?

Status: P1, strategy implemented, quality needs validation.

### F-005 | Pronunciation scoring boundary

Current V2 can assess content, relevance, some grammar and vocabulary issues, duration, and WPM. It cannot formally assess phonemes, stress, connected speech, rhythm, intonation, or acoustic pronunciation quality.

Decision: do not claim full pronunciation scoring in V2. Formal acoustic pronunciation scoring remains Roadmap.

### F-006 | Topic selection

V2 supports selectable Part 1 topics and selectable Part 2 / Part 3 cue cards. The next question is discoverability and content coverage, not whether the selection mechanism exists.

### F-007 | Practice records

V2 supports local report, transcript, practice-record export, and local session recovery. It does not yet support accounts, cloud history, cross-device history, or long-term learning profiles.

### F-008 | Human-like live conversation

This is about rhythm and presence, not only a voice feature. Full-duplex live voice requires streaming STT, streaming TTS, interruption handling, and higher cost. V2 should first validate lower-cost improvements: clearer listening/thinking/speaking states, better examiner wording, controllable replay, and lower perceived waiting time.

## 5. Priority Summary

### P0 | Clarify immediately

- Pronunciation scoring boundary.
- No exaggerated claim of full official IELTS scoring.
- Feedback remains anonymized.

### P1 | Next product validation

- Is feedback direct and actionable enough?
- Does long-answer feedback catch the most important issues?
- Does Part 3 dynamic follow-up connect naturally to the previous answer?
- Does Part 3 fallback work when answers are short or generation fails?
- Does the voice-first Mock / Exam Mode feel closer to a real exam?
- Do users prefer per-turn feedback or final-only feedback in mock tests?
- Is topic/cue-card selection easy to find?

### P2 | Low-cost experience improvements

- Waiting and feedback state clarity.
- Conversation rhythm.
- More natural examiner wording.
- Playback and replay experience.

### Roadmap

- Full-duplex live voice.
- Formal acoustic pronunciation scoring.
- User accounts.
- Database-backed practice history.
- Cross-device records.

## 6. Next User Test Plan

- Testers: 3-5 people.
- Devices: iPhone and Android.
- Scenarios:
  1. Part 1 with a selected topic.
  2. A long answer with many issues.
  3. Full Part 2 into Part 3 flow.
  4. Part 3 comparison: mainly bank questions vs bank backbone with answer-driven follow-up.
  5. Practice Mode vs minimal voice-first Mock Mode.
  6. Report, transcript, and practice-record export.
- Observe:
  - Can testers find topic selection?
  - Which mode is better for daily practice?
  - Which mode feels closer to a real exam?
  - Does hiding text feel immersive or stressful?
  - Does Part 2 need Cue Card, prep timer, and notes?
  - Are feedback suggestions actionable?
  - Do Part 3 follow-ups use the user's answer?
  - Does fallback feel abrupt?
  - Do testers understand pronunciation-scoring limits?
  - Would they use the product again?

## 7. Portfolio Statement

Invited 2 real users to test the mobile IELTS speaking practice product, converted open feedback into product problems across voice-first mock exams, correction quality, Part 3 follow-up, scoring boundaries, topic selection, practice records, and live conversation feel, then prioritized implemented, validation, and Roadmap items based on user impact, implementation cost, and current technical capability.

## 8. Open Questions

- What exact devices and browsers did testers use?
- Did each tester complete full Part 1 / Part 2 / Part 3?
- Did testers find replay controls without help?
- What concrete examples made feedback feel indirect?
- Which live AI product did testers compare against?
- Would testers want local-only records or cloud records?
