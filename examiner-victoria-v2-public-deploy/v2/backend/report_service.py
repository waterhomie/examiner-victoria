from __future__ import annotations

from collections import Counter
import re

from .ai_provider import call_model
from .schemas import ExamSession


def export_candidate_answer_log(session: ExamSession) -> str:
    lines = []
    for index, item in enumerate(session.candidate_answers, start=1):
        timing = f", duration={item.duration:.1f}s" if item.duration else ""
        lines.append(
            f"{index}. [{item.phase}] Q: {item.question}\n"
            f"   A ({item.source}{timing}): {item.answer}"
        )
    return "\n".join(lines) or "No candidate answers recorded."


def build_session_learning_summary(session: ExamSession) -> str:
    answers = [item for item in session.candidate_answers if item.phase != "identity"]
    stats = [item for item in session.answer_stats if item.phase != "identity"]
    phases = {item.phase for item in answers}
    answer_words = [
        re.findall(r"[A-Za-z']+", item.answer.lower())
        for item in answers
    ]
    flat_words = [word for words in answer_words for word in words]
    total_words = len(flat_words)
    average_words = round(total_words / len(answers), 1) if answers else 0
    short_answers = sum(1 for words in answer_words if len(words) < 12)
    wpm_values = [item.words_per_minute for item in stats if item.words_per_minute]
    average_wpm = round(sum(wpm_values) / len(wpm_values), 1) if wpm_values else None

    vague_terms = {
        "good",
        "nice",
        "interesting",
        "beautiful",
        "thing",
        "things",
        "stuff",
        "very",
        "really",
        "many",
    }
    vague_counter = Counter(word for word in flat_words if word in vague_terms)
    repeated_vague = [word for word, count in vague_counter.most_common(5) if count >= 2]

    grammar_watchlist = []
    transcript = "\n".join(item.answer.lower() for item in answers)
    grammar_patterns = [
        (r"\bi am student\b|\bi'm student\b", "Use articles with singular countable nouns, e.g. 'I'm a student.'"),
        (r"\bhave a work\b|\ba work\b", "Use 'a job' for one position; 'work' is usually uncountable."),
        (r"\bmore better\b", "Avoid double comparatives such as 'more better'."),
        (r"\bpeople is\b|\bthey is\b", "Watch subject-verb agreement with plural subjects."),
        (r"\bmany thing\b|\bmany stuffs\b", "Use plural countable forms naturally, e.g. 'many things'."),
    ]
    for pattern, note in grammar_patterns:
        if re.search(pattern, transcript) and note not in grammar_watchlist:
            grammar_watchlist.append(note)

    weaknesses = []
    if answers and short_answers / len(answers) >= 0.4:
        weaknesses.append(
            "Answer development: many answers are under 12 words, so they need one reason, example, or contrast."
        )
    if repeated_vague:
        weaknesses.append(
            "Lexical precision: repeated broad words such as "
            + ", ".join(repeated_vague)
            + " should be replaced with more specific topic vocabulary."
        )
    if "part2_long" in phases and session.part2_audio_used and session.part2_duration < 60:
        weaknesses.append("Part 2 stamina: the long turn is still short; aim for 90-120 seconds.")
    elif "part2_long" not in phases:
        weaknesses.append("Part 2 evidence is missing, so long-turn fluency is not fully tested yet.")
    if "part3" not in phases:
        weaknesses.append("Part 3 reasoning is under-tested; practise opinion + reason + example answers.")
    if average_wpm and average_wpm < 90:
        weaknesses.append(f"Fluency pace: average speed is about {average_wpm} WPM, which may sound hesitant.")
    elif average_wpm and average_wpm > 180:
        weaknesses.append(f"Fluency pace: average speed is about {average_wpm} WPM, which may sound rushed.")
    if grammar_watchlist:
        weaknesses.append("Grammar watchlist: " + grammar_watchlist[0])
    if not weaknesses:
        weaknesses.append(
            "No dominant pattern was detected from the saved answers; keep focusing on fuller, more specific responses."
        )

    if answers and short_answers / len(answers) >= 0.4:
        next_focus = "Extend short answers with a clear reason and one concrete example."
    elif repeated_vague:
        next_focus = "Replace vague adjectives with precise topic vocabulary and short examples."
    elif "part3" not in phases:
        next_focus = "Complete a Part 3 set and practise abstract comparisons."
    elif "part2_long" in phases and session.part2_duration and session.part2_duration < 60:
        next_focus = "Build one Part 2 answer to at least 90 seconds without stopping."
    else:
        next_focus = "Maintain the full test flow and collect more audio-timed answers."

    evidence = (
        f"{len(answers)} scored answers, {total_words} words, "
        f"average {average_words} words per answer"
    )
    if average_wpm:
        evidence += f", average {average_wpm} WPM"

    return "\n\n".join(
        [
            "## Session learning summary",
            f"**Evidence used:** {evidence}.",
            "**Recurring weaknesses:**\n" + "\n".join(f"- {item}" for item in weaknesses[:4]),
            "**Grammar watchlist:**\n"
            + (
                "\n".join(f"- {item}" for item in grammar_watchlist[:3])
                if grammar_watchlist
                else "- No repeated grammar pattern was confidently detected."
            ),
            f"**Next-session focus:** {next_focus}",
        ]
    )


def build_fallback_report(session: ExamSession) -> str:
    answers = [item for item in session.candidate_answers if item.phase != "identity"]
    stats = [item for item in session.answer_stats if item.phase != "identity"]
    total_words = sum(len(re.findall(r"[A-Za-z']+", item.answer)) for item in answers)
    average_words = round(total_words / len(answers), 1) if answers else 0
    phases = {item.phase for item in answers}
    wpm_values = [item.words_per_minute for item in stats if item.words_per_minute]
    average_wpm = round(sum(wpm_values) / len(wpm_values), 1) if wpm_values else None

    if not answers:
        band_range = "not enough evidence"
    elif {"part2_long", "part3"}.issubset(phases) and average_words >= 35:
        band_range = "around 6.0-6.5, pending human/model review"
    elif average_words >= 18:
        band_range = "around 5.5-6.0, pending human/model review"
    else:
        band_range = "around 5.0-5.5, pending human/model review"

    problems = []
    if average_words and average_words < 18:
        problems.append("Many answers are very short, so they leave little room to show fluency and range.")
    if "part2_long" not in phases:
        problems.append("There is not enough Part 2 evidence yet; the long-turn answer is essential for scoring.")
    elif session.part2_audio_used and session.part2_duration < 60:
        problems.append("The Part 2 long turn appears short; aim closer to 90-120 seconds in mock mode.")
    if "part3" not in phases:
        problems.append("There is not enough Part 3 evidence yet, so abstract discussion ability is under-tested.")
    if average_wpm and (average_wpm < 90 or average_wpm > 180):
        problems.append(f"The average speaking pace is about {average_wpm} WPM, which may need adjustment.")
    if not problems:
        problems.append("No single issue dominates the rule-based summary; review the transcript for repeated language patterns.")

    tasks = [
        "Give every Part 1 answer a direct answer plus one reason or example.",
        "Practise one complete Part 2 answer for 90-120 seconds before requesting a score.",
        "For Part 3, answer with a clear opinion, one reason, and one real-world example.",
    ]
    skill_breakdown = [
        f"**Fluency and Coherence:** average answer length is {average_words} words; fuller answers make scoring more reliable.",
        "**Lexical Resource:** the fallback report cannot judge fine word choice, so review repeated broad words in the transcript.",
        "**Grammar:** the fallback report checks only a small set of repeated spoken grammar patterns.",
    ]

    return "\n\n".join(
        [
            "## Overall band estimate",
            "The AI scoring model was temporarily unavailable, so this rule-based fallback uses the saved raw answers and timing data only.",
            f"**Estimated band range:** {band_range}",
            f"**Evidence used:** {len(answers)} candidate answers, {total_words} spoken words, average answer length {average_words} words.",
            f"**Speaking pace:** {average_wpm} WPM." if average_wpm else "**Speaking pace:** not enough audio timing evidence.",
            "## Skill breakdown",
            "\n".join(f"- {item}" for item in skill_breakdown),
            "## Three recurring spoken-language problems",
            "\n".join(f"{index}. {problem}" for index, problem in enumerate(problems[:3], start=1)),
            "## Corrected examples",
            "> Original: not available in rule-based fallback.\n> Better: generate a model report for sentence-level rewrites.",
            "## Next-session practice tasks",
            "\n".join(f"{index}. {task}" for index, task in enumerate(tasks, start=1)),
            build_session_learning_summary(session),
        ]
    )


def build_report(session: ExamSession) -> str:
    prompt = f"""
Create a clear IELTS Speaking practice report based only on the candidate answers below.

Use this Markdown structure exactly:

## Overall band estimate
Give one cautious estimated overall band score or band range, with one sentence explaining the evidence.

## Skill breakdown
- **Fluency and Coherence:** comment on answer length, flow, and development.
- **Lexical Resource:** comment on word choice and naturalness.
- **Grammar:** comment on spoken grammar patterns.

## Three recurring spoken-language problems
1. Name the problem and cite the relevant answer.
2. Name the problem and cite the relevant answer.
3. Name the problem and cite the relevant answer.

## Corrected examples
For each example, quote the candidate's original meaning and then provide a natural spoken version:

> Original: ...
> Better: ...

> Original: ...
> Better: ...

> Original: ...
> Better: ...

## Next-session practice tasks
1. Give one concrete task.
2. Give one concrete task.
3. Give one concrete task.

Do not include a generic seven-day plan.
Do not assess pronunciation unless audio timing alone supports a cautious observation.
Do not invent answers or score pronunciation from text-only evidence.

Raw answer log:
{export_candidate_answer_log(session)}
"""
    try:
        model_report = call_model(
            [
                {
                    "role": "system",
                    "content": "You are a strict but helpful IELTS Speaking examiner.",
                },
                {"role": "user", "content": prompt},
            ]
        )
        return f"{model_report.strip()}\n\n---\n\n{build_session_learning_summary(session)}"
    except Exception:
        return build_fallback_report(session)

