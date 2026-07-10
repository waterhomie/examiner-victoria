"""Lightweight sanity checks for the IELTS Victoria question bank.

Run with:
    python validate_question_bank.py
"""

from collections import Counter

from question_bank import (
    EXTRA_CUE_CARDS,
    PART1_SECONDARY_TOPICS,
    PART1_STUDY_QUESTIONS,
    PART1_WORK_QUESTIONS,
)

APP_BUILT_IN_CUE_CARD_COUNT = 3
APP_BUILT_IN_PART3_REFERENCE_COUNT = 12


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    part1_secondary_count = sum(
        len(topic.get("questions", [])) for topic in PART1_SECONDARY_TOPICS
    )
    part1_total_count = (
        part1_secondary_count
        + len(PART1_STUDY_QUESTIONS)
        + len(PART1_WORK_QUESTIONS)
    )

    require(PART1_SECONDARY_TOPICS, "Part 1 secondary topics are empty.")
    require(EXTRA_CUE_CARDS, "Part 2 cue cards are empty.")

    for topic in PART1_SECONDARY_TOPICS:
        require(topic.get("name"), "A Part 1 topic is missing its name.")
        require(topic.get("questions"), f"Part 1 topic {topic.get('name')} has no questions.")

    titles = [card.get("title") for card in EXTRA_CUE_CARDS]
    duplicate_titles = [
        title for title, count in Counter(titles).items() if title and count > 1
    ]
    require(not duplicate_titles, f"Duplicate cue-card titles found: {duplicate_titles}")

    for index, card in enumerate(EXTRA_CUE_CARDS, start=1):
        label = card.get("title") or f"card #{index}"
        require(card.get("title"), f"{label} is missing title.")
        require(card.get("prompt"), f"{label} is missing prompt.")
        require(card.get("follow_up"), f"{label} is missing follow_up.")
        require(card.get("part3"), f"{label} has no Part 3 questions.")
        require(
            len(card.get("part3", [])) >= 4,
            f"{label} should have at least 4 Part 3 questions.",
        )

    print("Question bank sanity check passed.")
    print(f"Part 1 topics: {len(PART1_SECONDARY_TOPICS) + 2}")
    print(f"Part 1 questions: {part1_total_count}")
    print(f"Part 2 bank cue cards: {len(EXTRA_CUE_CARDS)}")
    print(
        "Part 2 app total cue cards: "
        f"{len(EXTRA_CUE_CARDS) + APP_BUILT_IN_CUE_CARD_COUNT}"
    )
    print(
        "Part 3 reference questions: "
        f"{sum(len(card['part3']) for card in EXTRA_CUE_CARDS) + APP_BUILT_IN_PART3_REFERENCE_COUNT}"
    )


if __name__ == "__main__":
    main()
