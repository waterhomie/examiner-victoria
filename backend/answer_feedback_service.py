"""V4 structured answer feedback.

This module does NOT call the model and does NOT change any prompt, scoring or
flow rule. It only re-shapes the feedback that the existing coaching services
already produced (correction / tip / natural version) into a structured payload
that the V4 review screen can render (diff marks, top fix, verdict chips).

Everything here is deterministic and local:
- correction anchors reuse ``correction_text_anchors`` from the Part 1 service;
- edits are a word-level difflib diff between the transcript and the natural
  version (only when a natural version was already produced);
- hesitations are counted from a fixed filler list + immediate word repeats;
- pace is a label derived from words per minute (audio answers only).
"""

from __future__ import annotations

from difflib import SequenceMatcher
import re

from .part1_feedback_service import correction_text_anchors
from .schemas import AnswerCorrection, AnswerEdit, AnswerFeedback, AnswerHesitation


FILLER_WORDS = {"um", "umm", "uh", "uhh", "er", "erm", "hmm", "ah", "eh"}
PACE_SLOW_WPM = 90
PACE_FAST_WPM = 180
MAX_EDIT_TOKENS = 600
TOKEN_PATTERN = re.compile(r"[A-Za-z0-9']+|[^\sA-Za-z0-9']")


def tokenize(text: str) -> list[str]:
    return TOKEN_PATTERN.findall(text or "")


def normalize_token(token: str) -> str:
    return token.lower().strip("'")


def is_word(token: str) -> bool:
    return bool(re.match(r"[A-Za-z0-9']", token))


def build_edits(answer: str, natural_version: str | None) -> list[AnswerEdit]:
    """Word-level diff from the transcript to the natural version.

    Returns an ordered list of operations. ``equal`` keeps the original text,
    ``delete`` is text only in the transcript, ``insert`` is text only in the
    natural version, ``replace`` carries both.
    """
    if not natural_version:
        return []
    source = tokenize(answer)
    target = tokenize(natural_version)
    if not source or not target or len(source) + len(target) > MAX_EDIT_TOKENS:
        return []
    matcher = SequenceMatcher(
        a=[normalize_token(token) for token in source],
        b=[normalize_token(token) for token in target],
        autojunk=False,
    )
    edits: list[AnswerEdit] = []
    for op, a0, a1, b0, b1 in matcher.get_opcodes():
        before = " ".join(source[a0:a1])
        after = " ".join(target[b0:b1])
        if op == "equal":
            # Keep the candidate's own spelling for unchanged words.
            edits.append(AnswerEdit(op="equal", text=before))
        elif op == "delete":
            edits.append(AnswerEdit(op="delete", text=before))
        elif op == "insert":
            edits.append(AnswerEdit(op="insert", text=after))
        else:
            edits.append(AnswerEdit(op="replace", text=before, replacement=after))
    return edits


def find_hesitations(answer: str) -> list[AnswerHesitation]:
    words = re.findall(r"[A-Za-z']+", answer or "")
    found: list[AnswerHesitation] = []
    previous = None
    for index, word in enumerate(words):
        lowered = word.lower()
        if lowered in FILLER_WORDS:
            found.append(AnswerHesitation(kind="filler", text=word, word_index=index))
        elif previous is not None and lowered == previous and lowered not in {"very", "really", "so"}:
            found.append(AnswerHesitation(kind="repeat", text=word, word_index=index))
        previous = lowered
    return found


def pace_label(words_per_minute: float | None) -> str | None:
    if words_per_minute is None:
        return None
    if words_per_minute < PACE_SLOW_WPM:
        return "slow"
    if words_per_minute > PACE_FAST_WPM:
        return "fast"
    return "good"


def build_correction(correction: str | None, answer: str) -> AnswerCorrection | None:
    if not correction:
        return None
    anchors = correction_text_anchors(correction)
    if not anchors:
        return AnswerCorrection(sentence=correction)
    quote, replacement = anchors
    found = re.search(rf"(?<!\w){re.escape(quote)}(?!\w)", answer or "", re.I) is not None
    return AnswerCorrection(
        sentence=correction,
        quote=quote,
        replacement=replacement,
        quote_in_answer=found,
    )


def build_answer_feedback(
    *,
    answer: str,
    phase: str,
    source: str,
    duration: float | None,
    words_per_minute: float | None,
    word_count: int,
    practice_mode: bool,
    correction: str | None,
    tip: str | None,
    natural_version: str | None,
    feedback_available: bool,
    kind: str | None = None,
) -> AnswerFeedback:
    """Shape existing feedback into the V4 payload.

    Mock mode and the identity phase never include coaching content, matching
    the existing Practice/Mock rules; only neutral delivery stats are returned.
    """
    coaching = practice_mode and phase != "identity"
    hesitations = find_hesitations(answer) if source == "audio" else []
    return AnswerFeedback(
        mode="practice" if practice_mode else "mock",
        coaching=coaching,
        available=feedback_available if coaching else False,
        kind=kind if coaching else None,
        correction=build_correction(correction, answer) if coaching else None,
        tip=tip if coaching else None,
        natural_version=natural_version if coaching else None,
        edits=build_edits(answer, natural_version) if coaching else [],
        hesitations=hesitations,
        hesitation_count=len(hesitations),
        word_count=word_count,
        duration=duration,
        words_per_minute=words_per_minute,
        pace=pace_label(words_per_minute) if source == "audio" else None,
    )
