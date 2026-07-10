from __future__ import annotations

from fastapi.testclient import TestClient

import v2.backend.core.config as config
import v2.backend.core.rate_limit as rate_limit
import v2.backend.exam_flow_service as exam_flow_service
import v2.backend.feedback_service as feedback_service
import v2.backend.part3_service as part3_service
import v2.backend.report_service as report_service
import v2.backend.routes.audio as audio_routes
from v2.backend.app import app
from v2.backend.engine import build_fallback_report, build_session_learning_summary
from v2.backend.schemas import ExamSession


DETERMINISTIC_REPORT = """# IELTS Speaking Report

## Overall band estimate
Band 6.5

## Skill breakdown
- Fluency and coherence: stable.
- Lexical resource: adequate.
- Grammar: understandable.
- Pronunciation: not assessed in this smoke test.

## Corrected examples
No correction needed in the deterministic smoke test.

## Next-session practice tasks
Give one reason and one example.

## Session learning summary
Evidence used: deterministic smoke-test answers.
Next-session focus: answer extension.
"""


def deterministic_call_model(messages: list[dict[str, str]], *_args, **_kwargs) -> str:
    joined = "\n".join(item.get("content", "") for item in messages)
    if "exact labels requested" in joined:
        return (
            "Correction: None\n"
            "Better expression: None\n"
            "Natural answer: I would give a clear answer with one reason and one example."
        )
    if "choosing the next IELTS Speaking Part 3 question" in joined:
        return "How might this issue influence people's choices in the future?"
    if "Rephrase the IELTS question" in joined:
        return "Could you explain that in a simpler way?"
    if "Final IELTS Speaking Report" in joined or "IELTS Speaking test report" in joined:
        return DETERMINISTIC_REPORT
    return "How might this topic change in the future?"


def install_deterministic_ai_stubs() -> dict[str, object]:
    originals = {
        "feedback_call_model": feedback_service.call_model,
        "part3_call_model": part3_service.call_model,
        "report_call_model": report_service.call_model,
        "exam_flow_call_model": exam_flow_service.call_model,
        "rate_limit": config.RATE_LIMIT_PER_MINUTE,
    }
    feedback_service.call_model = deterministic_call_model
    part3_service.call_model = deterministic_call_model
    report_service.call_model = deterministic_call_model
    exam_flow_service.call_model = deterministic_call_model
    config.RATE_LIMIT_PER_MINUTE = 0
    rate_limit.clear_rate_limit_log()
    return originals


def restore_deterministic_ai_stubs(originals: dict[str, object]) -> None:
    feedback_service.call_model = originals["feedback_call_model"]
    part3_service.call_model = originals["part3_call_model"]
    report_service.call_model = originals["report_call_model"]
    exam_flow_service.call_model = originals["exam_flow_call_model"]
    config.RATE_LIMIT_PER_MINUTE = originals["rate_limit"]
    rate_limit.clear_rate_limit_log()


def start_api_session(client: TestClient, **overrides) -> dict:
    payload = {
        "practice_mode": True,
        "practice_type": "full",
        "answer_expansion_mode": True,
        "voice_playback_enabled": False,
    }
    payload.update(overrides)
    response = client.post("/api/sessions", json=payload)
    assert response.status_code == 200, response.text
    return response.json()["session"]


def answer_api(
    client: TestClient,
    session: dict,
    answer: str,
    source: str = "text",
    duration: float | None = None,
) -> dict:
    response = client.post(
        "/api/answer",
        json={
            "session": session,
            "answer": answer,
            "source": source,
            "duration": duration,
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def assert_focused_practice_flows(client: TestClient, chosen_topic: str, chosen_card: str) -> None:
    part1_session = start_api_session(
        client,
        practice_type="part1",
        part1_topic=chosen_topic,
    )
    assert part1_session["phase"] == "identity", part1_session
    assert part1_session["part1_topic"] == chosen_topic, part1_session
    part1_session = answer_api(client, part1_session, "You can call me Water.")["session"]
    assert part1_session["phase"] == "part1", part1_session
    for _ in range(8):
        part1_payload = answer_api(
            client,
            part1_session,
            "I am a student, and I study architecture because I like designing useful spaces.",
        )
        part1_session = part1_payload["session"]
        if part1_session["phase"] == "complete":
            break
    assert part1_session["phase"] == "complete", part1_session
    assert part1_session["test_active"] is False, part1_session

    part2_session = start_api_session(
        client,
        practice_type="part2",
        cue_card_title=chosen_card,
    )
    assert part2_session["phase"] == "part2_long", part2_session
    assert part2_session["cue_card"]["title"] == chosen_card, part2_session
    long_answer = " ".join(
        [
            "I",
            "would",
            "like",
            "to",
            "describe",
            "a",
            "small",
            "public",
            "building",
            "project",
        ]
        * 10
    )
    part2_payload = answer_api(client, part2_session, long_answer)
    part2_session = part2_payload["session"]
    assert part2_payload["start_prep_timer"] is False, part2_payload
    assert part2_session["phase"] == "part2_followup", part2_session
    part2_session = answer_api(
        client,
        part2_session,
        "Yes, I would like to improve the layout because it could be more comfortable.",
    )["session"]
    assert part2_session["phase"] == "complete", part2_session
    assert part2_session["test_active"] is False, part2_session

    part3_session = start_api_session(
        client,
        practice_type="part3",
        cue_card_title=chosen_card,
    )
    assert part3_session["phase"] == "part3", part3_session
    assert part3_session["part3_questions"], part3_session
    target_count = part3_session["part3_target_count"]
    for _ in range(target_count + 1):
        part3_session = answer_api(
            client,
            part3_session,
            "I think this depends on people's daily habits and the design of their environment.",
        )["session"]
        if part3_session["phase"] == "complete":
            break
    assert part3_session["phase"] == "complete", part3_session
    assert part3_session["test_active"] is False, part3_session
    assert len(part3_session["part3_history"]) <= 6, part3_session


def assert_mock_mode_starts_cleanly(client: TestClient) -> None:
    mock_session = start_api_session(
        client,
        practice_mode=False,
        practice_type="full",
        answer_expansion_mode=False,
    )
    assert mock_session["practice_mode"] is False, mock_session
    assert mock_session["part3_target_count"] == 4, mock_session
    mock_payload = answer_api(client, mock_session, "You can call me Water.")
    mock_session = mock_payload["session"]
    assert mock_session["phase"] == "part1", mock_session
    assert "natural version" not in mock_payload["assistant_message"]["content"].lower(), mock_payload


def main() -> None:
    client = TestClient(app)
    originals = install_deterministic_ai_stubs()

    health = client.get("/api/health")
    assert health.status_code == 200, health.text
    health_payload = health.json()
    assert health_payload["config"]["model"], health_payload
    assert "api_key_configured" in health_payload["config"], health_payload
    assert health_payload["limits"]["max_audio_upload_mb"] >= 1, health_payload
    assert health_payload["cors_origins"], health_payload

    question_bank = client.get("/api/question-bank")
    assert question_bank.status_code == 200, question_bank.text
    bank = question_bank.json()
    assert bank["part2_total_cards"] == 73, bank
    assert bank["part2_total_cards"] == bank["part2_expected_cards"], bank

    practice_options = client.get("/api/practice-options")
    assert practice_options.status_code == 200, practice_options.text
    options = practice_options.json()
    assert len(options["part1_topics"]) >= 30, options
    assert len(options["cue_cards"]) == 73, options
    chosen_topic = options["part1_topics"][0]
    chosen_card = options["cue_cards"][0]["title"]

    telemetry_event = client.post(
        "/api/telemetry",
        json={
            "event": "answer_flow",
            "details": {
                "durationMs": 123,
                "answer": "Sensitive spoken answer should not be stored.",
                "text": "Sensitive transcript should not be stored.",
                "surface": "mobile",
            },
        },
    )
    assert telemetry_event.status_code == 204, telemetry_event.text

    original_admin_token = config.ADMIN_TOKEN
    try:
        config.ADMIN_TOKEN = "smoke-admin-token"
        blocked_summary = client.get("/api/telemetry/summary")
        assert blocked_summary.status_code == 403, blocked_summary.text
        telemetry_summary = client.get("/api/telemetry/summary?token=smoke-admin-token")
        assert telemetry_summary.status_code == 200, telemetry_summary.text
        summary_payload = telemetry_summary.json()
        assert summary_payload["total_events"] >= 1, summary_payload
        assert summary_payload["by_event"]["answer_flow"]["count"] >= 1, summary_payload
        recent_details = summary_payload["recent"][-1]["details"]
        assert recent_details["durationMs"] == 123, recent_details
        assert recent_details["surface"] == "mobile", recent_details
        assert "answer" not in recent_details, recent_details
        assert "text" not in recent_details, recent_details
    finally:
        config.ADMIN_TOKEN = original_admin_token

    oversized_audio = client.post(
        "/api/transcribe",
        files={"file": ("answer.wav", b"0" * (13 * 1024 * 1024), "audio/wav")},
    )
    assert oversized_audio.status_code == 413, oversized_audio.text

    tiny_audio = client.post(
        "/api/transcribe",
        files={"file": ("answer.wav", b"RIFF", "audio/wav")},
    )
    assert tiny_audio.status_code == 400, tiny_audio.text

    original_transcribe_audio = audio_routes.transcribe_audio
    try:
        def broken_transcribe_audio(_audio_bytes: bytes, _mime_type: str) -> str:
            raise RuntimeError("provider duration parse failed: internal detail")

        audio_routes.transcribe_audio = broken_transcribe_audio
        failed_audio = client.post(
            "/api/transcribe",
            files={"file": ("answer.wav", b"0" * 4096, "audio/wav")},
        )
        assert failed_audio.status_code == 502, failed_audio.text
        failed_detail = failed_audio.json()["detail"]
        assert "internal detail" not in failed_detail, failed_detail
        assert "temporarily unavailable" in failed_detail, failed_detail
    finally:
        audio_routes.transcribe_audio = original_transcribe_audio

    too_long_tts = client.post("/api/tts", json={"text": "a" * (config.MAX_TTS_CHARS + 1)})
    assert too_long_tts.status_code == 413, too_long_tts.text

    original_synthesize_speech = audio_routes.synthesize_speech
    try:
        def broken_synthesize_speech(_text: str) -> bytes:
            raise RuntimeError("provider voice error: internal detail")

        audio_routes.synthesize_speech = broken_synthesize_speech
        failed_tts = client.post("/api/tts", json={"text": "Hello"})
        assert failed_tts.status_code == 502, failed_tts.text
        failed_tts_detail = failed_tts.json()["detail"]
        assert "internal detail" not in failed_tts_detail, failed_tts_detail
        assert "temporarily unavailable" in failed_tts_detail, failed_tts_detail
    finally:
        audio_routes.synthesize_speech = original_synthesize_speech

    start = client.post(
        "/api/sessions",
        json={
            "practice_mode": True,
            "practice_type": "full",
            "answer_expansion_mode": True,
            "voice_playback_enabled": False,
        },
    )
    assert start.status_code == 200, start.text
    session = start.json()["session"]
    assert session["phase"] == "identity"

    part2_start = client.post(
        "/api/sessions",
        json={
            "practice_mode": True,
            "practice_type": "part2",
            "cue_card_title": chosen_card,
            "answer_expansion_mode": True,
            "voice_playback_enabled": False,
        },
    )
    assert part2_start.status_code == 200, part2_start.text
    part2_session = part2_start.json()["session"]
    assert part2_session["phase"] == "part2_long", part2_start.text
    assert part2_session["cue_card"]["title"] == chosen_card, part2_session

    part3_start = client.post(
        "/api/sessions",
        json={
            "practice_mode": True,
            "practice_type": "part3",
            "cue_card_title": chosen_card,
            "answer_expansion_mode": True,
            "voice_playback_enabled": False,
        },
    )
    assert part3_start.status_code == 200, part3_start.text
    part3_session = part3_start.json()["session"]
    assert part3_session["phase"] == "part3", part3_session
    assert part3_session["part3_questions"], part3_session
    assert part3_session["cue_card"]["title"] == chosen_card, part3_session

    topic_start = client.post(
        "/api/sessions",
        json={
            "practice_mode": True,
            "practice_type": "part1",
            "part1_topic": chosen_topic,
            "answer_expansion_mode": True,
            "voice_playback_enabled": False,
        },
    )
    assert topic_start.status_code == 200, topic_start.text
    assert topic_start.json()["session"]["part1_topic"] == chosen_topic, topic_start.text

    assert_focused_practice_flows(client, chosen_topic, chosen_card)
    assert_mock_mode_starts_cleanly(client)

    too_long_answer = client.post(
        "/api/answer",
        json={
            "session": session,
            "answer": "a" * (config.MAX_ANSWER_CHARS + 1),
            "source": "text",
            "duration": None,
        },
    )
    assert too_long_answer.status_code == 413, too_long_answer.text

    too_large_session = dict(session)
    too_large_session["messages"] = session["messages"] * (config.MAX_SESSION_MESSAGES + 1)
    too_large_report = client.post("/api/report", json={"session": too_large_session})
    assert too_large_report.status_code == 413, too_large_report.text

    answer1 = client.post(
        "/api/answer",
        json={
            "session": session,
            "answer": "You can call me Water.",
            "source": "text",
            "duration": None,
        },
    )
    assert answer1.status_code == 200, answer1.text
    session = answer1.json()["session"]
    assert session["phase"] == "part1"

    answer2 = client.post(
        "/api/answer",
        json={
            "session": session,
            "answer": "I'm a student.",
            "source": "text",
            "duration": None,
        },
    )
    assert answer2.status_code == 200, answer2.text
    session = answer2.json()["session"]
    assert session["messages"][-1]["role"] == "assistant"

    prep_signal_seen = False
    for _ in range(8):
        next_part1 = client.post(
            "/api/answer",
            json={
                "session": session,
                "answer": "I usually give a short answer with one reason.",
                "source": "text",
                "duration": None,
            },
        )
        assert next_part1.status_code == 200, next_part1.text
        next_payload = next_part1.json()
        session = next_payload["session"]
        if next_payload["start_prep_timer"]:
            prep_signal_seen = True
            break

    assert prep_signal_seen, session
    assert session["phase"] == "part2_long", session

    report = client.post("/api/report", json={"session": session})
    assert report.status_code == 200, report.text
    report_text = report.json()["report"]
    assert "Report generation failed" not in report_text, report_text
    assert len(report_text) > 80, report_text
    assert "Session learning summary" in report_text, report_text

    fallback_text = build_fallback_report(ExamSession.model_validate(session))
    assert "rule-based fallback" in fallback_text, fallback_text
    assert "## Overall band estimate" in fallback_text, fallback_text
    assert "## Skill breakdown" in fallback_text, fallback_text
    assert "## Corrected examples" in fallback_text, fallback_text
    assert "Next-session practice tasks" in fallback_text, fallback_text
    assert "Session learning summary" in fallback_text, fallback_text

    summary_text = build_session_learning_summary(ExamSession.model_validate(session))
    assert "Evidence used" in summary_text, summary_text
    assert "Next-session focus" in summary_text, summary_text

    restore_deterministic_ai_stubs(originals)
    rate_limit.clear_rate_limit_log()
    original_rate_limit = config.RATE_LIMIT_PER_MINUTE
    try:
        config.RATE_LIMIT_PER_MINUTE = 1
        first_limited = client.post(
            "/api/sessions",
            json={
                "practice_mode": True,
                "answer_expansion_mode": True,
                "voice_playback_enabled": False,
            },
        )
        assert first_limited.status_code == 200, first_limited.text
        second_limited = client.post(
            "/api/sessions",
            json={
                "practice_mode": True,
                "answer_expansion_mode": True,
                "voice_playback_enabled": False,
            },
        )
        assert second_limited.status_code == 429, second_limited.text
    finally:
        config.RATE_LIMIT_PER_MINUTE = original_rate_limit
        rate_limit.clear_rate_limit_log()

    print("V2 FastAPI smoke test passed")
    print(f"phase: {session['phase']}")
    print(f"messages: {len(session['messages'])}")


if __name__ == "__main__":
    main()
