from __future__ import annotations

from difflib import SequenceMatcher
import re

from .ai_provider import call_model


LONG_ANSWER_WORD_THRESHOLD = 45


def clean_none(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned or cleaned.upper() == "NONE":
        return None
    return cleaned


def extract_feedback_field(text: str, label_pattern: str) -> str | None:
    pattern = rf"{label_pattern}\s*:\s*(.*?)(?=\n[A-Z_ ]+\s*:|\Z)"
    match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        return None
    return clean_none(match.group(1))


def normalize_spoken_text_for_similarity(text: str) -> str:
    text = text.lower()
    replacements = {
        "i'm": "i am",
        "i\u2019m": "i am",
        "don't": "do not",
        "don\u2019t": "do not",
        "can't": "cannot",
        "can\u2019t": "cannot",
        "it's": "it is",
        "it\u2019s": "it is",
        "that's": "that is",
        "that\u2019s": "that is",
        "you're": "you are",
        "you\u2019re": "you are",
        "i've": "i have",
        "i\u2019ve": "i have",
        "i'd": "i would",
        "i\u2019d": "i would",
        "i'll": "i will",
        "i\u2019ll": "i will",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def should_show_upgraded_answer(
    original_answer: str,
    upgraded_answer: str | None,
    correction: str | None,
    expression_tip: str | None,
) -> bool:
    if not upgraded_answer:
        return False
    original = normalize_spoken_text_for_similarity(original_answer)
    upgraded = normalize_spoken_text_for_similarity(upgraded_answer)
    if not original or not upgraded:
        return False

    original_words = original.split()
    upgraded_words = upgraded.split()
    similarity = SequenceMatcher(None, original, upgraded).ratio()
    if original == upgraded or similarity >= 0.9:
        return False
    if not correction and not expression_tip:
        if len(upgraded_words) <= len(original_words) + 2 and similarity >= 0.78:
            return False
        if len(original_words) <= 5 and upgraded.startswith(original):
            return False
    return True


def coach_spoken_answer(
    question: str,
    answer: str,
    include_upgrade: bool,
) -> tuple[str | None, str | None, str | None]:
    spoken_words = re.findall(r"[A-Za-z']+", answer)
    if not spoken_words:
        return None, None, None

    answer_length = "LONG" if len(spoken_words) >= LONG_ANSWER_WORD_THRESHOLD else "SHORT"
    prompt = f"""
You are Victoria, an IELTS Speaking coach.

Return exactly three labelled lines:
CORRECTION: NONE
EXPRESSION_TIP: NONE
UPGRADED_ANSWER: NONE

Rules:
- The answer is a speech-to-text transcript. Never correct capitalization,
  punctuation, spelling, obvious transcript mistakes, or proper-name casing.
- Correct only genuine spoken grammar, vocabulary choice, sentence structure,
  coherence, or fluency issues that would be heard in speech.
- If the answer is already natural and appropriate, return NONE for correction
  and UPGRADED_ANSWER.
- Only give an upgraded answer when ENABLE_UPGRADE is YES and the rewritten
  version is meaningfully more natural or better developed.
- Preserve the candidate's meaning. Do not invent a new personal story.
- Keep correction and expression tip to one short sentence each.

ENABLE_UPGRADE: {"YES" if include_upgrade else "NO"}
ANSWER_LENGTH: {answer_length}
Question: {question}
Answer: {answer}
"""
    try:
        result = call_model(
            [
                {
                    "role": "system",
                    "content": (
                        "You give concise IELTS spoken-language feedback. "
                        "Use the exact labels requested and no extra prose."
                    ),
                },
                {"role": "user", "content": prompt},
            ]
        )
    except Exception:
        return None, None, None

    correction = extract_feedback_field(result, "CORRECTION")
    expression_tip = extract_feedback_field(result, "EXPRESSION_TIP")
    upgraded_answer = extract_feedback_field(result, "UPGRADED[_ ]ANSWER")
    if expression_tip and correction and expression_tip.lower() == correction.lower():
        expression_tip = None
    if not should_show_upgraded_answer(answer, upgraded_answer, correction, expression_tip):
        upgraded_answer = None
    return correction, expression_tip, upgraded_answer


def build_reply(
    correction: str | None,
    expression_tip: str | None,
    upgraded_answer: str | None,
    next_content: str,
) -> str:
    sections = []
    if correction:
        sections.append(f"**Quick correction:** {correction}")
    if expression_tip:
        sections.append(f"**Better expression:** {expression_tip}")
    if upgraded_answer:
        sections.append(f"**A natural version of your answer:**\n\n> {upgraded_answer}")
    sections.append(next_content)
    return "\n\n".join(sections)

