from __future__ import annotations

import random
import re
import uuid

from .ai_provider import call_model
from .part3_service import (
    MOCK_PART3_QUESTION_COUNT,
    PRACTICE_PART3_QUESTION_COUNT,
    extract_single_question,
    fallback_part3_question,
    generate_next_part3_question,
    get_part3_question_count,
)
from .question_bank_service import (
    PART1_GENERAL_FOLLOWUPS,
    PART1_STUDY_QUESTIONS,
    PART1_WORK_QUESTIONS,
    choose_cue_card,
    choose_part1_topic,
)
from .schemas import ChatMessage, ExamSession


PART1_FIRST_QUESTION = "Do you work, or are you a student?"
FIRST_MESSAGE = (
    "**Part 1 - Introduction and Interview**\n\n"
    "Good afternoon. My name is Victoria, and I will be your examiner today. "
    "Could you tell me your full name, please?"
)


def choose_part1_followups(session: ExamSession, answer: str) -> list[str]:
    normalized = answer.lower()
    if re.search(r"\b(student|study|studying|university|college|school)\b", normalized):
        personal_pool = PART1_STUDY_QUESTIONS
    elif re.search(r"\b(work|working|job|employed|employee)\b", normalized):
        personal_pool = PART1_WORK_QUESTIONS
    else:
        personal_pool = PART1_GENERAL_FOLLOWUPS
    personal_questions = random.sample(personal_pool, k=min(2, len(personal_pool)))
    secondary_questions = list(session.part1_secondary_questions)
    if secondary_questions:
        topic_name = session.part1_topic or "another topic"
        secondary_questions[0] = f"Let's talk about {topic_name}. {secondary_questions[0]}"
    return personal_questions + secondary_questions


def is_clarification_request(answer: str) -> bool:
    normalized = answer.lower()
    patterns = [
        r"\bi don't understand\b",
        r"\bi do not understand\b",
        r"\bwhat do you mean\b",
        r"\bcould you (repeat|rephrase|explain)\b",
        r"\bcan you (repeat|rephrase|explain)\b",
        r"\bplease (repeat|rephrase|explain)\b",
    ]
    return any(re.search(pattern, normalized) for pattern in patterns)


def rephrase_question(question: str) -> str:
    fallback = f"No problem. Let me ask it more simply: {question.strip()}"
    try:
        simplified = extract_single_question(
            call_model(
                [
                    {
                        "role": "system",
                        "content": "Rephrase the IELTS question in simpler natural English.",
                    },
                    {"role": "user", "content": question},
                ]
            )
        )
    except Exception:
        return fallback
    return f"No problem. Let me ask it more simply: {simplified}" if simplified else fallback


def start_session(
    practice_mode: bool = True,
    practice_type: str = "full",
    part1_topic: str | None = None,
    cue_card_title: str | None = None,
    answer_expansion_mode: bool = True,
    voice_playback_enabled: bool = True,
) -> ExamSession:
    selected_topic = choose_part1_topic(part1_topic)
    cue_card = choose_cue_card(cue_card_title)
    session = ExamSession(
        session_id=str(uuid.uuid4()),
        messages=[ChatMessage(role="assistant", content=FIRST_MESSAGE, phase="identity")],
        current_question=FIRST_MESSAGE,
        practice_mode=practice_mode,
        practice_type=practice_type,
        answer_expansion_mode=answer_expansion_mode,
        voice_playback_enabled=voice_playback_enabled,
        part1_topic=selected_topic["name"],
        part1_secondary_questions=random.sample(
            selected_topic["questions"],
            k=min(3, len(selected_topic["questions"])),
        ),
        part3_target_count=PRACTICE_PART3_QUESTION_COUNT if practice_mode else MOCK_PART3_QUESTION_COUNT,
        cue_card=cue_card,
    )
    if practice_type == "part2":
        session.phase = "part2_long"
        session.messages = [
            ChatMessage(
                role="assistant",
                content=(
                    "**Part 2 - Long Turn**\n\n"
                    f"{cue_card['prompt']}\n\n"
                    "You have one minute to prepare. Then speak for one to two minutes."
                ),
                phase="part2_long",
            )
        ]
        session.current_question = cue_card["prompt"]
    elif practice_type == "part3":
        first_part3 = fallback_part3_question(session)
        session.phase = "part3"
        session.part3_questions = [first_part3]
        session.part3_index = 0
        session.messages = [
            ChatMessage(
                role="assistant",
                content=(
                    "**Part 3 - Discussion Practice**\n\n"
                    f"Topic: {cue_card.get('title', 'IELTS discussion')}\n\n"
                    f"{first_part3}"
                ),
                phase="part3",
            )
        ]
        session.current_question = first_part3
    return session


def handle_identity_phase(session: ExamSession) -> tuple[str, bool]:
    session.phase = "part1"
    session.part1_index = 0
    return PART1_FIRST_QUESTION, False


def handle_part1_phase(session: ExamSession, answer: str) -> tuple[str, bool]:
    if not session.part1_queue:
        session.part1_queue = choose_part1_followups(session, answer)
    index = session.part1_index
    if index < len(session.part1_queue):
        next_content = session.part1_queue[index]
        session.part1_index += 1
        return next_content, False

    if session.practice_type == "part1":
        session.phase = "complete"
        session.test_active = False
        return "Thank you. That is the end of Part 1 practice. Tap **Score** to view your report.", False

    session.phase = "part2_long"
    session.part2_words = 0
    session.part2_duration = 0.0
    session.part2_audio_used = False
    session.part2_extension_used = False
    session.part2_answers = []
    session.part3_questions = []
    session.part3_history = []
    card = session.cue_card
    next_content = (
        "**Part 2 - Long Turn**\n\n"
        f"{card['prompt']}\n\n"
        "You have one minute to prepare. Then speak for one to two minutes."
    )
    return next_content, True


def handle_part2_long_phase(
    session: ExamSession,
    answer: str,
    duration: float | None,
) -> tuple[str, bool]:
    session.part2_answers.append(answer)
    session.part2_words += len(re.findall(r"[A-Za-z']+", answer))
    if duration:
        session.part2_duration += duration
        session.part2_audio_used = True
    needs_more = (
        session.part2_duration < 50
        if session.part2_audio_used
        else session.part2_words < 80
    )
    if needs_more and not session.part2_extension_used:
        session.part2_extension_used = True
        return "Please continue - you still have time. Add more detail or give an example.", False

    session.phase = "part2_followup"
    return session.cue_card["follow_up"], False


def handle_part2_followup_phase(session: ExamSession, answer: str) -> tuple[str, bool]:
    session.part2_answers.append(answer)
    if session.practice_type == "part2":
        session.phase = "complete"
        session.test_active = False
        return "Thank you. That is the end of Part 2 practice. Tap **Score** to view your report.", False

    session.part3_target_count = get_part3_question_count(session)
    session.part3_questions = []
    session.part3_history = []
    first_part3 = generate_next_part3_question(session)
    session.part3_questions.append(first_part3)
    session.phase = "part3"
    session.part3_index = 0
    return f"**Part 3 - Discussion**\n\n{first_part3}", False


def handle_part3_phase(
    session: ExamSession,
    answer: str,
    previous_question: str,
) -> tuple[str, bool]:
    current_question = session.part3_questions[-1] if session.part3_questions else previous_question
    if is_clarification_request(answer):
        return rephrase_question(current_question), False

    session.part3_history.append({"question": current_question, "answer": answer})
    session.part3_index = len(session.part3_history)
    if session.part3_index < session.part3_target_count:
        next_question = generate_next_part3_question(session)
        session.part3_questions.append(next_question)
        return next_question, False

    session.phase = "complete"
    session.test_active = False
    return (
        "Thank you. That is the end of the speaking test. "
        "Tap **Get Score** to view your report."
    ), False
