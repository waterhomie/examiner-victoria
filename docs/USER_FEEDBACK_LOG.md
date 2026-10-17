# Examiner Victoria User Feedback And Product Decisions

## 1. Record Notes

- Test period: 2026-07
- Product versions: Examiner Victoria V2 and V3 Beta
- Total anonymized testers: 5
- Initial V2 testers: 2
- Additional V3 Beta testers in this round: 3
- Test surface: mobile Web App
- Method: open feedback after real product use
- Privacy: this document stores anonymized product feedback only. Original chats, identities, answers, audio, screenshots, contact details, account identifiers, and other identifying information are kept outside the Git repository.
- Milestone: the small-scale invitation target of 3-5 testers has been reached. The next phase is feedback classification and targeted directional validation, not immediate feature expansion.

## 2. Core Findings

- Users need direct, actionable next-step guidance, not only error identification.
- Practice Mode and Mock / Exam Mode have different user expectations.
- Voice playback alone does not create a realistic exam experience; exam immersion depends on reducing chat bubbles, live transcript display, and per-turn feedback during the test.
- Part 3 needs both stable IELTS-style question-bank structure and answer-driven follow-up.
- A tester's intuitive ratio request should not become a fixed algorithmic ratio; quality, relevance, and fallback stability matter more.
- Pronunciation scoring must be stated as a product boundary because transcription text is not acoustic scoring.
- Practice history is a valid need, but cloud accounts and databases can remain Roadmap for V2.
- Users need traceability from the original answer to the key issue, correction, example, and next practice action.
- Pronunciation scoring and reference-audio playback are separate product problems and must not be presented as the same capability.
- Local recovery and file export do not fully solve record discoverability when users cannot find previous work.
- Optional Chinese support may help lower-level Practice users, but it should remain separate from Mock authenticity.
- Demand has emerged for lightweight playback of correction and natural-version text.
- Users need help deciding what to say as well as help correcting how they say it.
- Personalized answer inspiration must use facts voluntarily supplied by the user and must never invent personal experiences.
- V3 Beta should now classify feedback and run targeted validation rather than immediately implementing every request.
- Product quality needs an explicit evaluation set covering response speed, feedback accuracy, scoring consistency, user-level differentiation, and failure recovery.
- The product should not claim superiority over general AI or mature IELTS tools before same-task benchmarking and user validation.
- Recall-based question banks require source metadata, versioning, quality checks, and a visible non-official content boundary.

### V3 Beta Round 1 tester signals

- T003 reported a smooth overall flow and good product completeness, then requested clearer report structure, pronunciation support, easier access to practice records, and optional Chinese learning assistance.
- T004 valued the core combination of text input, voice input, grammar correction, and natural-expression improvement, and requested playback for corrected or improved text.
- T005 requested answer inspiration grounded in the user's own topics and real experiences, highlighting that some learners need help with what to say, not only how to phrase it.
- The feedback focus has shifted from basic access and runtime viability toward learning outcomes, report traceability, record management, language assistance, and personalized content. This is a positive signal that the core path is usable, not proof of broad market validation.

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
| F-009 | T003 | Wants the complete original transcript before issue-by-issue report analysis, with an additional example where useful. | Report, transcript, and per-answer feedback need clearer traceability without mechanically listing every error. | Report, transcript, and practice-record export exist, but the report does not yet use one consistent original / issue / reason / correction / example / action structure. | Validate a transcript-first report sample and one additional example for key issues; do not promise exhaustive correction. | P1 | Needs validation |
| F-010 | T003 | Wants pronunciation correction and a pronunciation score in Practice. | Transcription, language feedback, reference playback, and acoustic pronunciation scoring are distinct capabilities. | The product uses transcript, answer content, duration, and WPM; it does not formally score phonemes, stress, connected speech, rhythm, or intonation. | Keep the F-005 boundary, do not infer pronunciation from transcript text, and retain formal acoustic scoring on the Roadmap. | P0 | Confirmed repeated demand |
| F-011 | T003 | Wants more accurate reference pronunciation or IPA for important content. | Reference audio and IPA can support learning but do not evaluate the user's pronunciation. | TTS exists; word-level dictionary audio, IPA, pronunciation comparison, and acoustic scoring are not implemented. | Research reference-sentence playback, optional key-word audio, and IPA while labeling them clearly as learning aids. | P2 | New request, needs research |
| F-012 | T003 | Could not find a previous Practice or Mock record after completing a session. | Storage, retention, restart behavior, discoverability, export, and long-term history are different concerns. | Local session recovery plus report, transcript, and practice-record export exist; accounts, cloud history, cross-device records, and a history list do not. | Treat this as partially solved but a confirmed usability issue; audit recovery, restart, and export discoverability before adding a database. | P1 | Partially solved, usability issue confirmed |
| F-013 | T003 | Wants optional Chinese translation of Victoria's English content in Practice. | Translation may reduce comprehension barriers but can increase visual load and dependence. | The interface primarily provides English prompts and English text fallback; optional Chinese translation is not implemented. | Validate collapsed, on-demand Chinese translation in Practice only; do not enable it by default in Mock. | P2 | New request, needs validation |
| F-014 | T003 | Wants a Chinese-to-English drill in which the system supplies Chinese ideas and then corrects the user's English. | This is a distinct training mode rather than an extension of the current IELTS Part 1/2/3 flow. | No dedicated Chinese-to-English drill exists, and acoustic pronunciation scoring remains outside current capability. | Record as a separate mode exploration and wait for repeated demand; do not add it to the stable V3 Beta flow now. | Roadmap | New mode idea |
| F-015 | T004 | Wants corrected or improved wording to play directly as audio. | Learners want to hear natural delivery without extra permanent playback buttons. | Practice feedback text supports tap-to-play using existing TTS, with loading, stop, cache and browser playback fallback. | Tap correction, better expression or natural-version text; show a first-use tip and validate mobile discoverability. | P1 | Implemented locally; device validation pending |
| F-016 | T005 | Wants answer ideas and material based on the user's own topics and personal experiences. | The product must distinguish correction, generic examples, idea prompts, personalized material, and complete ghostwritten answers. | Topic and cue-card selection plus answer-level language feedback exist; structured profiles, personalized-material flow, accounts, and long-term personal data storage do not. | Explore an optional Practice-only, session-level idea flow based only on facts the user voluntarily provides; never invent experiences or default to complete scripts. | P2 | New request, needs validation |

## 3A. External Review Signals

| ID | External review signal | Product issue | Product decision | Priority | Status |
|---|---|---|---|---|---|
| ER-001 | 不能只凭开发者主观感觉判断产品“好用”，需要建立测试集和评价标准。 | 当前缺少统一质量基准，无法证明反馈准确性、评分合理性和异常场景稳定性。 | 建立覆盖不同用户水平、正常流程和异常输入的最小测试集，并记录响应时间、流程完成率、反馈准确性、评分一致性和异常恢复结果。 | P0 | Needs implementation |
| ER-002 | 应使用初学者、中等水平、高水平、偏题和无效回答测试同一道题。 | 当前测试不足以证明系统能够合理区分不同能力水平。 | 建立分层回答样本，对同题反馈和评分进行横向比较；后续考虑加入人工教师或可信评分样例作为参考。 | P0 | Needs validation |
| ER-003 | “比 ChatGPT Live 或大而泛的产品更好”目前缺少证据。 | 当前差异化主要依赖“更垂直、更方便”的主观判断，缺少同题对比和用户完成数据。 | 暂不宣称效果优于成熟产品；使用统一任务比较通用语音 AI、雅思垂直产品和 Examiner Victoria，重点验证零配置入口、流程稳定性、反馈结构和复盘效率。 | P0 | Needs benchmark |
| ER-004 | 不能默认“小而垂直”自然成立，需要研究大厂或成熟产品为什么没有重点覆盖同样需求。 | 当前尚未区分真实需求缺口、商业优先级、技术成本和已有竞品覆盖程度。 | 增加竞品与市场假设研究，验证目标用户是否持续需要该能力、是否愿意使用或付费，以及现有产品已经覆盖到什么程度。 | P1 | Needs research |
| ER-005 | 回忆版雅思题库可能存在错误、不准确或版本冲突。 | 当前题库导入前缺少来源记录、去重、校验和异常标记。 | 增加来源、日期、版本、非官方标记、格式检查、去重、人工抽查和错误反馈机制。 | P1 | Needs design |
| ER-006 | Practice 与 Mock 的区别容易被理解为单纯的界面差异。 | 两种模式的学习目标、反馈时机和使用体验尚未被足够清晰地表达和验证。 | 保留共享考试流程，但明确：<br>Practice 面向过程学习，显示记录和即时反馈<br>Mock 面向考试状态，纯语音、不显示逐轮反馈，结束后统一评分和复盘<br>继续验证用户能否准确理解模式差异。 | P1 | Cross-reference F-001 |

- Full review record: [`docs/research/2026-07-16_interview_product_feedback.md`](research/2026-07-16_interview_product_feedback.md)
- This section records only actionable product signals and product decisions.
- Career advice, corrections of technical concepts, and interview questions are not counted as product feedback.
- The reviewer is not an additional tester, and this review does not change the anonymized tester count.

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

Status: P1, minimal version implemented, needs targeted follow-up validation.

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

### F-009 | Transcript-first report traceability

T003 wants the complete original conversation or transcript to remain visible before issue-by-issue analysis. The underlying need is traceability: a learner should be able to move from an original answer to the key issue, why it matters, a corrected version, one additional example, and a next practice action.

Current capability:

- Report generation exists.
- Full transcript and practice-record downloads exist.
- Per-turn Practice feedback can include a quick correction, expression tip, and natural version.
- The report does not yet guarantee one unified transcript-first structure.

Proposed validation structure:

1. Original answer or transcript
2. Key issue
3. Why it matters
4. Corrected version
5. One additional example
6. Next practice action

Do not promise word-by-word analysis or mechanically enumerate every error.

Status: P1, needs validation. This task does not change the report implementation or Prompt.

### F-010 | Practice pronunciation correction and scoring

T003's request confirms that pronunciation support is repeated demand, but it does not change the current product boundary. Speech-to-text output cannot establish phoneme accuracy, stress, connected speech, rhythm, intonation, or overall acoustic quality.

Product decision:

- Keep F-005 unchanged.
- Do not present transcription as pronunciation scoring.
- Do not claim complete official IELTS scoring coverage.
- Keep formal acoustic pronunciation assessment on the Roadmap.
- Treat reference audio, IPA, and user pronunciation scoring as separate capabilities.

Status: P0 Product Boundary / Roadmap, confirmed repeated demand.

### F-011 | Reference audio and IPA assistance

T003 also wants more accurate reference pronunciation or IPA for important content. Reference support can be useful before formal pronunciation scoring exists, but the interface must state what it does and does not prove.

Current capability:

- TTS can synthesize Victoria's questions and system speech.
- Word-level dictionary pronunciation is not implemented.
- IPA display is not implemented.
- User-audio comparison and acoustic scoring are not implemented.

Proposed direction for later research:

- reference-sentence playback;
- optional playback for selected key words;
- IPA only where it adds clear learning value;
- explicit labeling that these aids do not score the learner's pronunciation.

Status: P2, new request and needs research. Not implemented.

### F-012 | Practice and Mock record discoverability

T003 could not find a previous result after completing a Practice or Mock session. This can remain a real usability problem even when some data is technically recoverable or downloadable.

Current capability:

- Local `localStorage` session recovery exists when browser storage is available.
- Report, transcript, and practice-record text downloads exist.
- There is no account, cloud database, cross-device history, long-term profile, or explicit recent-sessions list.

Product decision: classify this as **Partially solved, usability issue confirmed**. Before adding a database, audit:

1. whether completed sessions remain recoverable;
2. what Restart clears;
3. whether download actions are discoverable;
4. whether a lightweight Recent Sessions / Records entry is needed.

Status: P1. This round does not add storage or a database.

### F-013 | Optional Chinese translation in Practice

Optional Chinese assistance may reduce the comprehension barrier for lower-level learners, but Practice and Mock have different goals.

Proposed direction:

- Consider Chinese translation only in Practice.
- Keep Mock English-first and do not show Chinese by default.
- Validate a collapsed, on-demand translation interaction.
- Avoid permanently displaying long bilingual blocks.

Status: P2, new request and needs validation. No interface or Prompt change has been implemented.

### F-014 | Chinese-to-English drill mode

This request describes a separate loop:

```text
Chinese prompt or idea material -> learner's English output -> language correction
```

It is not a small extension of the current IELTS Part 1, Part 2, or Part 3 flow. The stable V3 Beta should not absorb it without repeated demand and a clear learning objective.

Product decision: retain as a standalone mode exploration. Pronunciation correction within such a mode would still require the acoustic capability described in F-005 and F-010.

Status: Roadmap / Product exploration. Not implemented.

### F-015 | Playback for corrected or improved text

T004 valued text input, voice input, grammar correction, and natural-expression improvement, then requested direct audio playback for the corrected result. The learning need is to hear natural delivery after seeing a better version.

Current capability:

- TTS is implemented.
- The answer response speaks Victoria's next question or system speech.
- Practice correction, expression-tip and natural-version text now support direct tap-to-play in the local F-015 implementation, using the same TTS endpoint and cache.

Interaction implemented locally on 2026-10-17:

- tap the feedback text block itself to play it; tap the active block again to stop or cancel;
- no separate permanent audio button or idle playback label beside each block;
- show one first-use tip, dismissed after the first feedback tap and remembered locally;
- cover Quick correction, Better expression and Natural version, excluding the next examiner question;
- reuse speech cache, browser playback fallback and TTS failure messaging;
- disable feedback taps during recording or answer processing, and discard superseded speech results;
- mobile discoverability and iPhone/WeChat audio acceptance still require device validation.

Status: P1, implemented locally; deployment and real-device follow-up validation pending. Backend Prompt, scoring and TTS provider are unchanged.

### F-016 | Personalized answer inspiration from real experiences

T005 wants the product to help generate relevant answer material from topics and personal experiences. This is not only a language-correction problem: some learners do not know what to say.

Current capability verified from the repository:

- Users can select Part 1 topics and Part 2 / Part 3 cue cards.
- Practice can provide language feedback on an answer.
- There is no structured user profile or dedicated personalized-material flow.
- There is no account or long-term cloud storage for personal context.

Product definition: **Optional personalized answer-inspiration flow**, not automatic generation of complete scripts.

A later low-cost experiment may:

1. appear only in Practice after the user chooses **Help me find ideas**;
2. ask two or three optional questions relevant to the current topic;
3. allow every question to be skipped;
4. use only facts the user voluntarily supplies;
5. return keywords, answer angles, short experience cues, and useful English expressions;
6. never invent a life event, relationship, place, or identity for the user;
7. avoid long-term storage by default;
8. use session-level context before considering accounts or a database;
9. avoid describing the repository question bank as an official or complete current IELTS bank without evidence.

Do not default to a complete memorization-ready sample. The purpose is to help the learner form a truthful answer, not replace the learner with a fabricated biography.

Status: P2 / Product exploration, new request and needs validation. Not implemented.

## 5. Priority Summary

### P0 | Product Boundary

- Do not exaggerate pronunciation-scoring capability.
- Reference-audio playback is not user pronunciation scoring.
- Do not claim complete official IELTS scoring coverage.
- Do not describe a general question bank as an official, complete, current IELTS question bank without evidence.
- Do not invent personal experiences for the user.
- Keep all feedback anonymous.

### P1 | Next Validation

- Should a report show the complete original transcript before issue cards?
- Is one additional example more useful than correction alone?
- Can users find Report, Transcript, and Practice Record actions?
- Do completed-session recovery and Restart behavior match user expectations?
- Is tap-to-play correction or natural-version text understandable?
- Is a first-use playback hint sufficient, or is a persistent icon needed?
- Does Part 3 dynamic follow-up connect naturally and fall back safely?
- Does voice-first Mock Mode feel closer to a real exam?
- Is feedback direct and actionable enough, especially for long answers?
- Do users prefer per-turn feedback or final-only feedback in Mock?
- Is topic and cue-card selection easy to find?

### P2 | Product Exploration

- Optional, collapsed Chinese translation in Practice.
- Reference sentences, selected key-word audio, and IPA assistance.
- Personalized answer ideas based only on user-provided facts.
- Session-level personal context before any account or database work.
- A lightweight interaction that avoids excessive buttons and setup burden.
- Continued low-cost improvements to conversation rhythm and waiting-state clarity.
- More natural examiner wording.
- General playback and replay discoverability.

### Roadmap

- Full-duplex live voice.
- Formal acoustic pronunciation scoring.
- A standalone Chinese-to-English drill mode.
- Cloud-backed history and recent-session management.
- User accounts and cross-device records.
- Long-term user profiles and controlled memory, only after privacy and value validation.

## 6. Next User Test Plan

Current cumulative participation:

- Initial V2 testers: 2
- Additional V3 Beta testers: 3
- Total anonymized testers: 5

The small-scale invitation target of 3-5 people has been reached. The next phase is **Targeted Follow-up Validation**, not broad invitation volume or immediate implementation of every request.

Validation questions:

1. Can users find Report, Transcript, and Practice Record without help?
2. Do users want the complete transcript before issue cards?
3. Is a key issue + correction + example more useful than correction alone?
4. Will users tap correction or natural-version text to hear it?
5. Does tap-to-play need an icon, a first-use hint, or both?
6. Would lower-level Practice users use collapsed Chinese translation without becoming dependent on it?
7. Is a Chinese-to-English drill a repeated need or a one-off request?
8. Which answer support is most useful: keywords, idea prompts, personal-experience cues, a partial outline, or a complete sample?
9. How many optional personalization questions will users tolerate before answering?
10. Is session-level personalization sufficient without accounts or long-term storage?
11. Do users understand that personalized material will not invent experiences for them?
12. Do users understand that the current product does not provide formal acoustic pronunciation scoring?

Continue to record device and browser context, whether Practice, Mock, or both were completed, and whether a tester was trying to recover the same session or find a history list. Do not infer answers that testers have not provided.

## 7. Portfolio Statement

Invited 5 anonymized real users across V2 and V3 Beta to test the mobile IELTS speaking product, captured both positive signals and improvement requests, and translated open feedback into product decisions covering report traceability, actionable correction, pronunciation boundaries, reference audio, practice-history discoverability, optional translation support, lightweight correction playback, and personalized answer inspiration based on user-provided experiences.

This was a small invited-user feedback round, not large-scale user research, formal market validation, commercialization validation, or proof of product-market fit.

## 8. Open Questions

- What exact devices and browsers did testers use?
- Did each tester complete full Part 1 / Part 2 / Part 3?
- Did T003 complete Practice, Mock, or both?
- Did T003 try to recover the same session or look for a history list?
- Should reports show the full transcript first or issue cards first?
- Should playback cover correction, natural version, examples, or all three?
- Is tap-to-play discoverable without a permanent icon?
- Would optional Chinese translation help without creating dependence?
- How many users would repeatedly use a Chinese-to-English drill mode?
- What pronunciation support do users expect: reference audio, IPA, comparison, or formal scoring?
- Does T005 want idea prompts, answer outlines, or complete sample answers?
- How many personal questions would users tolerate before practice begins?
- Which personal facts are most useful for IELTS speaking personalization?
- Should personal context last only for one session?
- Would users accept optional local storage of non-sensitive preferences?
- How can the product prevent personalized material from becoming memorized templates?
- What concrete examples made earlier feedback feel indirect?
- Did testers find existing replay controls without help?
- Which live AI product, if any, did testers compare against?
- Would users want local-only records or cloud-backed records?

Do not fabricate answers. Resolve these questions only through targeted follow-up or observed product use.
