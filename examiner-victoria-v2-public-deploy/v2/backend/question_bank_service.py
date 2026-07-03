from __future__ import annotations

from pathlib import Path
import random
import sys


ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from question_bank import (  # noqa: E402
    EXTRA_CUE_CARDS,
    PART1_SECONDARY_TOPICS,
    PART1_STUDY_QUESTIONS,
    PART1_WORK_QUESTIONS,
)


PART1_GENERAL_FOLLOWUPS = [
    "What do you usually do during a typical weekday?",
    "What part of your daily routine do you enjoy most?",
]


APP_BASE_CUE_CARDS = [
    {
        "title": "an interesting building",
        "prompt": (
            "Describe a building that you think is interesting.\n\n"
            "You should say:\n"
            "- what the building is\n"
            "- where it is\n"
            "- what it looks like\n"
            "- and explain why you find it interesting"
        ),
        "follow_up": "Would you like to visit this building again? Why or why not?",
        "part3": [
            "What makes a building attractive to the public?",
            "Should architects give more importance to beauty or function?",
            "Why is it important to preserve some old buildings?",
            "How might public buildings change in the future?",
        ],
    },
    {
        "title": "a useful skill",
        "prompt": (
            "Describe a useful skill that you learned.\n\n"
            "You should say:\n"
            "- what the skill is\n"
            "- when and where you learned it\n"
            "- how you learned it\n"
            "- and explain why this skill is useful to you"
        ),
        "follow_up": "Would you like to become even better at this skill?",
        "part3": [
            "What skills are most important for young people today?",
            "Is it easier to learn practical skills online or face to face?",
            "Should schools spend more time teaching practical skills?",
            "How will the skills needed for work change in the future?",
        ],
    },
    {
        "title": "an inspiring person",
        "prompt": (
            "Describe a person who has inspired you.\n\n"
            "You should say:\n"
            "- who this person is\n"
            "- how you know this person\n"
            "- what qualities this person has\n"
            "- and explain how this person inspired you"
        ),
        "follow_up": "Would you like to be more like this person in the future?",
        "part3": [
            "What qualities make someone a good role model?",
            "Are famous people always suitable role models for young people?",
            "How can teachers motivate their students?",
            "Do people become less easily influenced as they get older?",
        ],
    },
]


ALL_CUE_CARDS = APP_BASE_CUE_CARDS + list(EXTRA_CUE_CARDS)
EXPECTED_CUE_CARD_COUNT = 73


def get_question_bank_summary() -> dict[str, int]:
    part1_secondary_question_count = sum(
        len(topic["questions"]) for topic in PART1_SECONDARY_TOPICS
    )
    part1_identity_followup_count = len(PART1_STUDY_QUESTIONS) + len(PART1_WORK_QUESTIONS)
    return {
        "part1_topics": len(PART1_SECONDARY_TOPICS) + 2,
        "part1_secondary_topics": len(PART1_SECONDARY_TOPICS),
        "part1_total_questions": part1_secondary_question_count + part1_identity_followup_count,
        "part1_secondary_questions": part1_secondary_question_count,
        "part1_identity_followup_questions": part1_identity_followup_count,
        "part2_base_cards": len(APP_BASE_CUE_CARDS),
        "part2_extra_cards": len(EXTRA_CUE_CARDS),
        "part2_total_cards": len(ALL_CUE_CARDS),
        "part2_expected_cards": EXPECTED_CUE_CARD_COUNT,
        "part3_reference_questions": sum(len(card.get("part3", [])) for card in ALL_CUE_CARDS),
    }


def get_practice_options() -> dict[str, list]:
    return {
        "part1_topics": [topic["name"] for topic in PART1_SECONDARY_TOPICS],
        "cue_cards": [{"title": card["title"]} for card in ALL_CUE_CARDS],
    }


def choose_part1_topic(topic_name: str | None = None) -> dict:
    if topic_name:
        normalized = topic_name.strip().lower()
        for topic in PART1_SECONDARY_TOPICS:
            if topic["name"].lower() == normalized:
                return topic
    return random.choice(PART1_SECONDARY_TOPICS)


def choose_cue_card(cue_card_title: str | None = None) -> dict:
    if cue_card_title:
        normalized = cue_card_title.strip().lower()
        for card in ALL_CUE_CARDS:
            if card["title"].lower() == normalized:
                return card
    return random.choice(ALL_CUE_CARDS)

