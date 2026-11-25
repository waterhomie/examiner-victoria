"""V4 structured feedback checks (deterministic, no provider calls)."""

from __future__ import annotations

import os
import unittest
from unittest.mock import patch

os.environ.setdefault("API_KEY", "")

from fastapi.testclient import TestClient

from backend.answer_feedback_service import (
    build_answer_feedback,
    build_edits,
    find_hesitations,
    pace_label,
)
from backend.app import app
from backend.core import config
from backend.core.rate_limit import clear_rate_limit_log, client_key
from backend.engine import process_answer, process_answer_detailed, start_session
from backend.question_bank_service import get_practice_options


class FakeRequest:
    def __init__(self, host: str, headers: dict[str, str]):
        self.client = type("Client", (), {"host": host})()
        self.headers = headers


class AnswerFeedbackTests(unittest.TestCase):
    def test_edits_cover_both_texts(self):
        answer = "I am work in a bank since two years."
        natural = "I have worked in a bank for two years."
        edits = build_edits(answer, natural)
        ops = {edit.op for edit in edits}
        self.assertIn("equal", ops)
        self.assertTrue(ops & {"replace", "insert", "delete"})
        rebuilt_source = " ".join(
            edit.text for edit in edits if edit.op in {"equal", "delete", "replace"} and edit.text
        )
        self.assertEqual(rebuilt_source.replace(" .", "."), answer)
        rebuilt_target = " ".join(
            (edit.replacement if edit.op == "replace" else edit.text)
            for edit in edits if edit.op != "delete"
        )
        self.assertEqual(rebuilt_target.replace(" .", "."), natural)

    def test_no_natural_version_means_no_edits(self):
        self.assertEqual(build_edits("Hello there.", None), [])

    def test_hesitations_and_pace(self):
        found = find_hesitations("Um I I think, er, it is really really nice")
        kinds = [item.kind for item in found]
        self.assertEqual(kinds.count("filler"), 2)
        self.assertEqual(kinds.count("repeat"), 1)
        self.assertEqual(pace_label(None), None)
        self.assertEqual(pace_label(60), "slow")
        self.assertEqual(pace_label(130), "good")
        self.assertEqual(pace_label(200), "fast")

    def test_mock_mode_has_no_coaching(self):
        feedback = build_answer_feedback(
            answer="Um I like it.", phase="part1", source="audio", duration=10,
            words_per_minute=24, word_count=4, practice_mode=False,
            correction='Say "a" instead of "b".', tip="tip", natural_version="I like it a lot.",
            feedback_available=True,
        )
        self.assertFalse(feedback.coaching)
        self.assertIsNone(feedback.correction)
        self.assertIsNone(feedback.tip)
        self.assertEqual(feedback.edits, [])
        self.assertEqual(feedback.hesitation_count, 1)
        self.assertEqual(feedback.pace, "slow")

    def test_correction_anchor_parsing(self):
        feedback = build_answer_feedback(
            answer="I am work in a bank.", phase="part1", source="text", duration=None,
            words_per_minute=None, word_count=6, practice_mode=True,
            correction='Say "I work" instead of "I am work".', tip=None, natural_version=None,
            feedback_available=True, kind="relevant",
        )
        self.assertEqual(feedback.correction.quote, "I am work")
        self.assertEqual(feedback.correction.replacement, "I work")
        self.assertTrue(feedback.correction.quote_in_answer)
        self.assertIsNone(feedback.pace)

    def test_part2_long_upgrade_produces_word_edits(self):
        answer = (
            "I am work in a small shop near my house. I meet many people there. "
            "The shop is busy in the morning, and I enjoy talking with customers. "
            "I started this job last year because it is close to my family. "
            "On weekends I clean the shelves and help people find what they need."
        )
        upgraded = (
            "I work at a small shop near my house. It gets busy in the morning, "
            "but I enjoy speaking with customers. I started last year because "
            "it is close to my family. At weekends I tidy the shelves and help "
            "people find what they need."
        )
        reply = (
            'CORRECTION: Say "I work" instead of "I am work".\n'
            'EXPRESSION_TIP: NONE\n'
            f'UPGRADED_ANSWER: {upgraded}'
        )
        with patch("backend.feedback_service.call_model", return_value=reply) as model:
            result = process_answer_detailed(start_session(practice_type="part2"), answer, source="audio", duration=65)
        self.assertIn("ENABLE_UPGRADE: YES", model.call_args.args[0][1]["content"])
        self.assertEqual(result.answered_phase, "part2_long")
        self.assertEqual(result.feedback.natural_version, upgraded)
        self.assertTrue(any(edit.op in {"delete", "insert", "replace"} for edit in result.feedback.edits))
        self.assertIsNone(result.feedback.kind)  # General Part 2 coaching has no answer-kind verdict.
        self.assertEqual(result.session.phase, "part2_followup")  # Existing long-turn transition is unchanged.

    def test_part2_long_sentence_correction_fallback(self):
        answer = "I am work in a small shop near my house. I meet many people there."
        correction = 'Replace "I am work in a small shop near my house" with "I work in a small shop near my house".'
        reply = f"CORRECTION: {correction}\nEXPRESSION_TIP: NONE\nUPGRADED_ANSWER: NONE"
        with patch("backend.feedback_service.call_model", return_value=reply):
            result = process_answer_detailed(start_session(practice_type="part2"), answer)
        self.assertIsNone(result.feedback.natural_version)
        self.assertEqual(result.feedback.edits, [])
        self.assertEqual(result.feedback.correction.quote, "I am work in a small shop near my house")
        self.assertEqual(result.feedback.correction.replacement, "I work in a small shop near my house")
        self.assertTrue(result.feedback.correction.quote_in_answer)

        unparsed = build_answer_feedback(
            answer=answer, phase="part2_long", source="text", duration=None,
            words_per_minute=None, word_count=15, practice_mode=True,
            correction="Make the first sentence more natural.", tip=None, natural_version=None,
            feedback_available=True,
        )
        self.assertEqual(unparsed.correction.sentence, "Make the first sentence more natural.")
        self.assertIsNone(unparsed.correction.quote)
        self.assertEqual(unparsed.edits, [])

    def test_process_answer_wrapper_and_detailed(self):
        reply = "CORRECTION: NONE\nEXPRESSION_TIP: NONE\nUPGRADED_ANSWER: NONE"
        with patch("backend.feedback_service.call_model", return_value=reply):
            session = start_session(practice_type="full")
            legacy = process_answer(session, "I work in a bank in the city.")
            self.assertEqual(len(legacy), 4)
            practice = start_session(practice_type="full")
            question = practice.current_question
            detailed = process_answer_detailed(practice, "I work in a bank in the city.", source="audio", duration=4)
            self.assertEqual(detailed.answered_phase, "part1")
            self.assertEqual(detailed.answered_question, question)
            self.assertTrue(detailed.feedback.coaching)
            self.assertEqual(detailed.feedback.word_count, 8)
            mock = start_session(practice_mode=False, practice_type="full")
            mock_result = process_answer_detailed(mock, "My full name is Alex Chen.", source="audio", duration=4)
        self.assertEqual(mock_result.answered_phase, "identity")
        self.assertFalse(mock_result.feedback.coaching)
        self.assertEqual(mock_result.feedback.mode, "mock")

    def test_answer_route_returns_feedback(self):
        clear_rate_limit_log()
        client = TestClient(app)
        session = start_session(practice_mode=False, practice_type="full")
        response = client.post("/api/answer", json={"session": session.model_dump(), "answer": "My name is Alex."})
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertIn("feedback", data)
        self.assertIn("assistant_message", data)
        self.assertEqual(data["answered_phase"], "identity")

    def test_practice_options_label(self):
        options = get_practice_options()
        self.assertIn("question_bank_label", options)
        self.assertNotIn("new", options["question_bank_label"].lower())

    def test_proxy_headers_only_when_trusted(self):
        request = FakeRequest("10.0.0.1", {"x-forwarded-for": "1.2.3.4, 10.0.0.1"})
        with patch.object(config, "TRUST_PROXY_HEADERS", False):
            self.assertEqual(client_key(request), "10.0.0.1")
        with patch.object(config, "TRUST_PROXY_HEADERS", True):
            self.assertEqual(client_key(request), "1.2.3.4")


def run_answer_feedback_checks() -> None:
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(AnswerFeedbackTests)
    result = unittest.TextTestRunner(verbosity=0).run(suite)
    if not result.wasSuccessful():
        raise AssertionError("V4 answer feedback checks failed")


if __name__ == "__main__":
    unittest.main()
