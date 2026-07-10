from __future__ import annotations

import re

from .ai_provider import call_model
from .schemas import ExamSession


MOCK_PART3_QUESTION_COUNT = 4
PRACTICE_PART3_QUESTION_COUNT = 6
PART3_MAX_QUESTION_COUNT = 6


def extract_single_question(text: str) -> str | None:
    cleaned = re.sub(r"^\s*[-*\d.)]+\s*", "", text.strip())
    candidates = re.findall(r"[^?\n]+\?", cleaned)
    if not candidates:
        return None
    return re.sub(r"\s+", " ", candidates[0]).strip()


def fallback_part3_question(session: ExamSession) -> str:
    asked = {q.lower().strip() for q in session.part3_questions}
    pool = list(session.cue_card.get("part3", []))
    for question in pool:
        if question.lower().strip() not in asked:
            return question
    generic = [
        "Why do people's opinions on this topic often differ?",
        "What changes might happen in this area in the future?",
        "Do you think this issue affects young and older people differently?",
        "What are the advantages and disadvantages of this trend?",
    ]
    for question in generic:
        if question.lower().strip() not in asked:
            return question
    return "What is the most important thing people should consider about this issue?"


def generate_next_part3_question(session: ExamSession) -> str:
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
        question = extract_single_question(
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
        question = None
    if not question or question.lower() in {q.lower() for q in session.part3_questions}:
        return fallback_part3_question(session)
    return question


def get_part3_question_count(session: ExamSession) -> int:
    if session.practice_mode:
        return min(PRACTICE_PART3_QUESTION_COUNT, PART3_MAX_QUESTION_COUNT)
    return min(MOCK_PART3_QUESTION_COUNT, PART3_MAX_QUESTION_COUNT)

