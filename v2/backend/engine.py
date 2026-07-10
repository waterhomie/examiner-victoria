from __future__ import annotations

import re

from .ai_provider import get_runtime_config_summary
from .audio_services import synthesize_speech, transcribe_audio
from .exam_flow_service import (
    handle_identity_phase,
    handle_part1_phase,
    handle_part2_followup_phase,
    handle_part2_long_phase,
    handle_part3_phase,
    start_session,
)
from .feedback_service import build_reply, coach_spoken_answer
from .question_bank_service import (
    get_practice_options,
    get_question_bank_summary,
)
from .report_service import build_fallback_report, build_report, build_session_learning_summary
from .schemas import AnswerStats, CandidateAnswer, ChatMessage, ExamSession


def save_answer_stats(
    session: ExamSession,
    answer: str,
    source: str,
    duration: float | None,
    phase: str,
) -> None:
    word_count = len(re.findall(r"[A-Za-z']+", answer))
    words_per_minute = None
    if duration and duration >= 2:
        words_per_minute = round(word_count / (duration / 60), 1)
    session.answer_stats.append(
        AnswerStats(
            phase=phase,
            source=source,
            duration=duration,
            word_count=word_count,
            words_per_minute=words_per_minute,
        )
    )
    session.candidate_answers.append(
        CandidateAnswer(
            phase=phase,
            question=session.current_question,
            answer=answer,
            source=source,
            duration=duration,
        )
    )


def process_answer(
    session: ExamSession,
    answer: str,
    source: str = "text",
    duration: float | None = None,
) -> tuple[ExamSession, ChatMessage, str, bool]:
    phase = session.phase
    previous_question = session.current_question
    save_answer_stats(session, answer, source, duration, phase)
    session.messages.append(ChatMessage(role="user", content=answer, phase=phase))

    correction = None
    expression_tip = None
    upgraded_answer = None
    include_upgrade = (
        session.practice_mode
        and session.answer_expansion_mode
        and phase in {"part1", "part2_followup", "part3"}
    )
    if session.practice_mode and phase != "identity":
        correction, expression_tip, upgraded_answer = coach_spoken_answer(
            previous_question,
            answer,
            include_upgrade,
        )

    if phase == "identity":
        next_content, start_prep_timer = handle_identity_phase(session)

    elif phase == "part1":
        next_content, start_prep_timer = handle_part1_phase(session, answer)

    elif phase == "part2_long":
        next_content, start_prep_timer = handle_part2_long_phase(session, answer, duration)

    elif phase == "part2_followup":
        next_content, start_prep_timer = handle_part2_followup_phase(session, answer)

    elif phase == "part3":
        next_content, start_prep_timer = handle_part3_phase(session, answer, previous_question)
    else:
        next_content = "The test is complete. Tap **Get Score**."
        start_prep_timer = False

    if session.phase == "part2_long" and next_content.startswith("Please continue"):
        session.current_question = session.cue_card["prompt"]
    elif session.phase == "part3" and session.part3_questions:
        session.current_question = session.part3_questions[-1]
    else:
        session.current_question = next_content

    reply = build_reply(correction, expression_tip, upgraded_answer, next_content)
    assistant_message = ChatMessage(role="assistant", content=reply, phase=session.phase)
    session.messages.append(assistant_message)
    return session, assistant_message, next_content, start_prep_timer
