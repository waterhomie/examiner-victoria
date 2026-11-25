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
from dataclasses import dataclass

from .answer_feedback_service import build_answer_feedback
from .feedback_service import build_reply, coach_spoken_answer
from .part1_feedback_service import coach_part1_answer
from .learner_support_service import is_focused_part1, is_system_rewrite, merge_observation
from .question_bank_service import (
    get_practice_options,
    get_question_bank_summary,
)
from .report_service import build_fallback_report, build_report, build_session_learning_summary
from .schemas import AnswerFeedback, AnswerStats, CandidateAnswer, ChatMessage, ExamSession


@dataclass
class ProcessedAnswer:
    session: ExamSession
    assistant_message: ChatMessage
    spoken_text: str
    start_prep_timer: bool
    feedback: AnswerFeedback
    answered_question: str
    answered_phase: str


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
    """Backward-compatible wrapper kept for existing tests and callers."""
    result = process_answer_detailed(session, answer, source=source, duration=duration)
    return result.session, result.assistant_message, result.spoken_text, result.start_prep_timer


def process_answer_detailed(
    session: ExamSession,
    answer: str,
    source: str = "text",
    duration: float | None = None,
) -> ProcessedAnswer:
    phase = session.phase
    previous_question = session.current_question
    save_answer_stats(session, answer, source, duration, phase)
    session.messages.append(ChatMessage(role="user", content=answer, phase=phase))

    correction = None
    expression_tip = None
    upgraded_answer = None
    feedback_available = True
    adaptation_notice = False
    answer_kind = None
    include_upgrade = (
        session.practice_mode
        and session.answer_expansion_mode
        and phase in {"part1", "part2_long", "part2_followup", "part3"}
    )
    focused_part1 = is_focused_part1(session)
    if focused_part1:
        adaptive = session.feedback_adaptation == "adaptive"
        profile = session.learner_support_profile
        result = coach_part1_answer(previous_question, answer, include_upgrade,
                                    profile if adaptive else None, is_system_rewrite(session, answer), source)
        correction, expression_tip, upgraded_answer, feedback_available = result.feedback
        answer_kind = result.kind
        if adaptive:
            repeated = any(item.question == previous_question and item.answer.strip() == answer.strip()
                           for item in session.candidate_answers[:-1])
            merge_observation(profile, None if repeated else result.observation,
                              previous_question, answer, len(session.candidate_answers))
            adaptation_notice = feedback_available and not profile.notice_shown
            profile.notice_shown = profile.notice_shown or adaptation_notice
    elif session.practice_mode and phase != "identity":
        correction, expression_tip, upgraded_answer, feedback_available = coach_spoken_answer(
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

    reply = build_reply(correction, expression_tip, upgraded_answer, next_content,
                        feedback_available, merge_natural_version=session.practice_mode)
    assistant_message = ChatMessage(role="assistant", content=reply, phase=session.phase,
                                    adaptation_notice=adaptation_notice)
    session.messages.append(assistant_message)
    stats = session.answer_stats[-1]
    feedback = build_answer_feedback(
        answer=answer,
        phase=phase,
        source=source,
        duration=duration,
        words_per_minute=stats.words_per_minute,
        word_count=stats.word_count,
        practice_mode=session.practice_mode,
        correction=correction,
        tip=expression_tip,
        natural_version=upgraded_answer,
        feedback_available=feedback_available,
        kind=answer_kind,
    )
    return ProcessedAnswer(
        session=session,
        assistant_message=assistant_message,
        spoken_text=next_content,
        start_prep_timer=start_prep_timer,
        feedback=feedback,
        answered_question=previous_question,
        answered_phase=phase,
    )
