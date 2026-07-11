from __future__ import annotations

import re
from .ai_provider import call_model
from .schemas import ExamSession, QuestionSource


MOCK_PART3_QUESTION_COUNT = 4
PRACTICE_PART3_QUESTION_COUNT = 6
PART3_MAX_QUESTION_COUNT = 6
MIN_DYNAMIC_ANSWER_WORDS = 8
MAX_CONSECUTIVE_DYNAMIC_PART3 = 1


QuestionWithSource = tuple[str, QuestionSource]


def normalize_question(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower().strip().rstrip("?"))


def extract_single_question(text: str) -> str | None:
    cleaned = re.sub(r"^\s*[-*\d.)]+\s*", "", text.strip())
    candidates = re.findall(r"[^?\n]+\?", cleaned)
    if not candidates:
        return None
    return re.sub(r"\s+", " ", candidates[0]).strip()


def select_bank_part3_question(session: ExamSession) -> str | None:
    asked = {normalize_question(q) for q in session.part3_questions}
    for question in session.cue_card.get("part3", []):
        if normalize_question(question) not in asked:
            return question
    return None


def fallback_part3_question(session: ExamSession) -> str:
    bank_question = select_bank_part3_question(session)
    if bank_question:
        return bank_question
    generic = [
        "Why do people's opinions on this topic often differ?",
        "What changes might happen in this area in the future?",
        "Do you think this issue affects young and older people differently?",
        "What are the advantages and disadvantages of this trend?",
    ]
    asked = {normalize_question(q) for q in session.part3_questions}
    for question in generic:
        if normalize_question(question) not in asked:
            return question
    return "What is the most important thing people should consider about this issue?"


def fallback_part3_question_with_source(session: ExamSession, source: QuestionSource = "fallback") -> QuestionWithSource:
    return fallback_part3_question(session), source


def latest_part3_answer(session: ExamSession) -> str:
    if not session.part3_history:
        return ""
    return session.part3_history[-1].get("answer", "")


def answer_has_followup_potential(answer: str) -> bool:
    words = re.findall(r"[A-Za-z']+", answer)
    if len(words) < MIN_DYNAMIC_ANSWER_WORDS:
        return False
    normalized = answer.lower()
    weak_answers = {
        "i don't know",
        "i do not know",
        "not sure",
        "yes",
        "no",
        "maybe",
    }
    return normalize_question(normalized) not in weak_answers


def dynamic_question_is_valid(question: str | None, session: ExamSession) -> bool:
    if not question:
        return False
    normalized = normalize_question(question)
    if normalized in {normalize_question(q) for q in session.part3_questions}:
        return False
    words = re.findall(r"[A-Za-z']+", question)
    if len(words) < 5:
        return False
    lowered = question.lower()
    banned_fragments = [
        "your answer",
        "you said",
        "what did you do",
        "when did you",
        "where did you",
        "who did you",
        "tell me about your",
    ]
    if any(fragment in lowered for fragment in banned_fragments):
        return False
    if not question.strip().endswith("?"):
        return False
    return True


def generate_dynamic_part3_question(session: ExamSession) -> str | None:
    reference_questions = "\n".join(f"- {q}" for q in session.cue_card.get("part3", [])[:8])
    history = "\n".join(
        f"Q: {item['question']}\nA: {item['answer']}" for item in session.part3_history[-3:]
    )
    prompt = f"""
You are choosing the next IELTS Speaking Part 3 question.

Part 2 cue card:
{session.cue_card.get("prompt", "")}

Candidate Part 2 answer summary:
{" ".join(session.part2_answers[-2:])}

Reference Part 3 question bank:
{reference_questions}

Recent Part 3 exchange:
{history or "No Part 3 answer yet."}

Task:
- Ask exactly ONE Part 3 question.
- It must be analytical, not personal.
- If the latest answer gives a concrete detail, visibly connect the next question to it.
- Do not repeat already asked questions.
- Return only the question.
"""
    try:
        return extract_single_question(
            call_model(
                [
                    {
                        "role": "system",
                        "content": "You are a concise IELTS examiner. Return one question only.",
                    },
                    {"role": "user", "content": prompt},
                ]
            )
        )
    except Exception:
        return None


def generate_next_part3_question_with_source(session: ExamSession) -> QuestionWithSource:
    if not session.part3_history:
        bank_question = select_bank_part3_question(session)
        if bank_question:
            return bank_question, "bank"
        return fallback_part3_question_with_source(session)

    if session.part3_consecutive_dynamic >= MAX_CONSECUTIVE_DYNAMIC_PART3:
        bank_question = select_bank_part3_question(session)
        if bank_question:
            return bank_question, "bank"
        return fallback_part3_question_with_source(session)

    if not answer_has_followup_potential(latest_part3_answer(session)):
        bank_question = select_bank_part3_question(session)
        if bank_question:
            return bank_question, "bank"
        return fallback_part3_question_with_source(session)

    dynamic_question = generate_dynamic_part3_question(session)
    if dynamic_question_is_valid(dynamic_question, session):
        return dynamic_question, "dynamic"

    return fallback_part3_question_with_source(session)


def append_part3_question(session: ExamSession, question: str, source: QuestionSource) -> None:
    session.part3_questions.append(question)
    session.part3_question_sources.append(source)
    session.part3_consecutive_dynamic = (
        session.part3_consecutive_dynamic + 1 if source == "dynamic" else 0
    )


def generate_next_part3_question(session: ExamSession) -> str:
    question, _source = generate_next_part3_question_with_source(session)
    return question


def get_part3_question_count(session: ExamSession) -> int:
    if session.practice_mode:
        return min(PRACTICE_PART3_QUESTION_COUNT, PART3_MAX_QUESTION_COUNT)
    return min(MOCK_PART3_QUESTION_COUNT, PART3_MAX_QUESTION_COUNT)
