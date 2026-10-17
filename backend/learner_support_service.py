from __future__ import annotations

from collections import Counter
import hashlib
import re

from .schemas import ExamSession, LearnerSupportProfile, SupportObservation, SUPPORT_WINDOW

MIN_SUPPORT_EVIDENCE = 3
SWITCH_CONFIRMATIONS = 2
SUPPORT_GUIDANCE = {
    "unknown": "Use only this answer to choose one important issue and necessary support; do not infer a level.",
    "guided": "Explain one meaning-blocking basic issue in simple English with one short usable example or action.",
    "balanced": "Prioritize one key language or coherence issue; at most one distinct useful expression refinement.",
    "refinement": "Only suggest a specific evidenced improvement in naturalness or precision; NONE is welcome.",
}


def is_focused_part1(session: ExamSession) -> bool:
    return session.practice_mode and session.practice_type == "part1" and session.phase == "part1"


def answer_fingerprint(question: str, answer: str) -> str:
    normalized = re.sub(r"\s+", " ", f"{question.strip().lower()}\n{answer.strip().lower()}")
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def merge_observation(
    profile: LearnerSupportProfile,
    observation: tuple[str, str] | None,
    question: str,
    answer: str,
    answer_index: int,
) -> None:
    """Merge once into a client-held, non-authoritative session profile."""
    if answer_index <= profile.last_processed_answer_index or answer_index > 10000:
        return
    profile.last_processed_answer_index = answer_index
    fingerprint = answer_fingerprint(question, answer)
    if observation is None or any(item.fingerprint == fingerprint for item in profile.observations):
        return
    state, reason = observation
    profile.observations = (profile.observations + [SupportObservation(
        state=state, reason=reason, answer_index=answer_index, fingerprint=fingerprint,
    )])[-SUPPORT_WINDOW:]
    if len(profile.observations) < MIN_SUPPORT_EVIDENCE:
        profile.state = "unknown"
        return
    counts = Counter(item.state for item in profile.observations)
    target, count = counts.most_common(1)[0]
    if count <= len(profile.observations) / 2 or target == profile.state:
        profile.pending_state, profile.pending_count = None, 0
    elif profile.state == "unknown":
        profile.state = target
        profile.pending_state, profile.pending_count = None, 0
    else:
        profile.pending_count = profile.pending_count + 1 if target == profile.pending_state else 1
        profile.pending_state = target
        if profile.pending_count >= SWITCH_CONFIRMATIONS:
            profile.state = target
            profile.pending_state, profile.pending_count = None, 0


def is_system_rewrite(session: ExamSession, answer: str) -> bool:
    normalized = re.sub(r"\W+", " ", answer.lower()).strip()
    for message in session.messages:
        if message.role != "assistant":
            continue
        match = re.search(r"\*\*A natural version of your answer:\*\*\s*\n> ([^\n]+)", message.content)
        if match and normalized == re.sub(r"\W+", " ", match[1].lower()).strip():
            return True
    return False
