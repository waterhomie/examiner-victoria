from __future__ import annotations

import base64
import os
import threading
import sys
import time
import types

from fastapi.testclient import TestClient

import v2.backend.core.config as config
import v2.backend.core.rate_limit as rate_limit
import v2.backend.audio_services as audio_services
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



def assert_part3_hybrid_strategy(client: TestClient, chosen_card: str) -> None:
    part3_session = start_api_session(
        client,
        practice_type="part3",
        cue_card_title=chosen_card,
    )
    first_bank_question = part3_session["cue_card"]["part3"][0]
    assert part3_session["part3_questions"] == [first_bank_question], part3_session
    assert part3_session["part3_question_sources"] == ["bank"], part3_session
    assert part3_session["part3_consecutive_dynamic"] == 0, part3_session

    meaningful_answer = (
        "I think this issue matters because people's choices are shaped by their routines, "
        "their family habits, and the places where they spend most of their time."
    )
    dynamic_payload = answer_api(client, part3_session, meaningful_answer)
    dynamic_session = dynamic_payload["session"]
    assert dynamic_session["part3_question_sources"][-1] == "dynamic", dynamic_session
    assert dynamic_session["part3_consecutive_dynamic"] == 1, dynamic_session

    bank_payload = answer_api(client, dynamic_session, meaningful_answer)
    bank_session = bank_payload["session"]
    assert bank_session["part3_question_sources"][-1] in {"bank", "fallback"}, bank_session
    assert bank_session["part3_question_sources"][-1] != "dynamic", bank_session
    assert bank_session["part3_consecutive_dynamic"] == 0, bank_session

    short_session = start_api_session(
        client,
        practice_type="part3",
        cue_card_title=chosen_card,
    )
    short_payload = answer_api(client, short_session, "Yes.")
    short_session = short_payload["session"]
    assert short_session["part3_question_sources"][-1] in {"bank", "fallback"}, short_session
    assert short_session["part3_question_sources"][-1] != "dynamic", short_session

    original_part3_call_model = part3_service.call_model
    try:
        def broken_part3_call_model(_messages: list[dict[str, str]], *_args, **_kwargs) -> str:
            raise RuntimeError("part 3 provider unavailable")

        part3_service.call_model = broken_part3_call_model
        fallback_session = start_api_session(
            client,
            practice_type="part3",
            cue_card_title=chosen_card,
        )
        fallback_payload = answer_api(client, fallback_session, meaningful_answer)
        fallback_session = fallback_payload["session"]
        assert fallback_session["part3_question_sources"][-1] == "fallback", fallback_session
        assert fallback_session["part3_consecutive_dynamic"] == 0, fallback_session

        def empty_part3_call_model(_messages: list[dict[str, str]], *_args, **_kwargs) -> str:
            return ""

        part3_service.call_model = empty_part3_call_model
        empty_session = start_api_session(
            client,
            practice_type="part3",
            cue_card_title=chosen_card,
        )
        empty_payload = answer_api(client, empty_session, meaningful_answer)
        empty_session = empty_payload["session"]
        assert empty_session["part3_question_sources"][-1] == "fallback", empty_session

        def duplicate_part3_call_model(_messages: list[dict[str, str]], *_args, **_kwargs) -> str:
            return fallback_session["part3_questions"][0]

        part3_service.call_model = duplicate_part3_call_model
        duplicate_session = start_api_session(
            client,
            practice_type="part3",
            cue_card_title=chosen_card,
        )
        duplicate_payload = answer_api(client, duplicate_session, meaningful_answer)
        duplicate_session = duplicate_payload["session"]
        assert duplicate_session["part3_question_sources"][-1] == "fallback", duplicate_session
    finally:
        part3_service.call_model = original_part3_call_model


def set_tts_config(
    *,
    provider: str = "disabled",
    secret_id: str = "",
    secret_key: str = "",
    voice_type: str = "",
    max_concurrency: int = 3,
    per_session_concurrency: int = 1,
    rate_limit_per_minute: int = 60,
    queue_timeout_seconds: int = 1,
    max_text_chars: int = 300,
) -> dict[str, object]:
    originals = {
        "provider": config.TTS_PROVIDER,
        "secret_id": config.TENCENTCLOUD_SECRET_ID,
        "secret_key": config.TENCENTCLOUD_SECRET_KEY,
        "voice_type": config.TENCENT_TTS_VOICE_TYPE,
        "codec": config.TENCENT_TTS_CODEC,
        "region": config.TENCENT_TTS_REGION,
        "sample_rate": config.TENCENT_TTS_SAMPLE_RATE,
        "speed": config.TENCENT_TTS_SPEED,
        "volume": config.TENCENT_TTS_VOLUME,
        "tts_max_concurrency": config.TTS_MAX_CONCURRENCY,
        "tts_max_concurrency_per_session": config.TTS_MAX_CONCURRENCY_PER_SESSION,
        "tts_rate_limit_per_minute": config.TTS_RATE_LIMIT_PER_MINUTE,
        "tts_queue_timeout_seconds": config.TTS_QUEUE_TIMEOUT_SECONDS,
        "tts_max_text_chars": config.TTS_MAX_TEXT_CHARS,
    }
    config.TTS_PROVIDER = provider
    config.TENCENTCLOUD_SECRET_ID = secret_id
    config.TENCENTCLOUD_SECRET_KEY = secret_key
    config.TENCENT_TTS_VOICE_TYPE = voice_type
    config.TENCENT_TTS_CODEC = "mp3"
    config.TENCENT_TTS_REGION = "ap-shanghai"
    config.TENCENT_TTS_SAMPLE_RATE = 16000
    config.TENCENT_TTS_SPEED = 0
    config.TENCENT_TTS_VOLUME = 0
    config.TTS_MAX_CONCURRENCY = max_concurrency
    config.TTS_MAX_CONCURRENCY_PER_SESSION = per_session_concurrency
    config.TTS_RATE_LIMIT_PER_MINUTE = rate_limit_per_minute
    config.TTS_QUEUE_TIMEOUT_SECONDS = queue_timeout_seconds
    config.TTS_MAX_TEXT_CHARS = max_text_chars
    audio_routes._reset_tts_admission_state_for_tests()
    audio_services.TTS_CACHE.clear()
    return originals


def restore_tts_config(originals: dict[str, object]) -> None:
    config.TTS_PROVIDER = originals["provider"]
    config.TENCENTCLOUD_SECRET_ID = originals["secret_id"]
    config.TENCENTCLOUD_SECRET_KEY = originals["secret_key"]
    config.TENCENT_TTS_VOICE_TYPE = originals["voice_type"]
    config.TENCENT_TTS_CODEC = originals["codec"]
    config.TENCENT_TTS_REGION = originals["region"]
    config.TENCENT_TTS_SAMPLE_RATE = originals["sample_rate"]
    config.TENCENT_TTS_SPEED = originals["speed"]
    config.TENCENT_TTS_VOLUME = originals["volume"]
    config.TTS_MAX_CONCURRENCY = originals["tts_max_concurrency"]
    config.TTS_MAX_CONCURRENCY_PER_SESSION = originals["tts_max_concurrency_per_session"]
    config.TTS_RATE_LIMIT_PER_MINUTE = originals["tts_rate_limit_per_minute"]
    config.TTS_QUEUE_TIMEOUT_SECONDS = originals["tts_queue_timeout_seconds"]
    config.TTS_MAX_TEXT_CHARS = originals["tts_max_text_chars"]
    audio_routes._reset_tts_admission_state_for_tests()
    audio_services.TTS_CACHE.clear()


def install_fake_tencent_sdk(
    *,
    sdk_error_code: str | None = None,
    error_message: str = "mock Tencent SDK failure",
    raised_error: Exception | None = None,
) -> dict[str, object | None]:
    module_names = [
        "tencentcloud",
        "tencentcloud.common",
        "tencentcloud.common.credential",
        "tencentcloud.common.exception",
        "tencentcloud.common.exception.tencent_cloud_sdk_exception",
        "tencentcloud.tts",
        "tencentcloud.tts.v20190823",
        "tencentcloud.tts.v20190823.models",
        "tencentcloud.tts.v20190823.tts_client",
    ]
    originals = {name: sys.modules.get(name) for name in module_names}

    tencentcloud_mod = types.ModuleType("tencentcloud")
    common_mod = types.ModuleType("tencentcloud.common")
    credential_mod = types.ModuleType("tencentcloud.common.credential")
    exception_mod = types.ModuleType("tencentcloud.common.exception")
    sdk_exception_mod = types.ModuleType("tencentcloud.common.exception.tencent_cloud_sdk_exception")
    tts_mod = types.ModuleType("tencentcloud.tts")
    version_mod = types.ModuleType("tencentcloud.tts.v20190823")
    models_mod = types.ModuleType("tencentcloud.tts.v20190823.models")
    client_mod = types.ModuleType("tencentcloud.tts.v20190823.tts_client")

    class FakeTencentCloudSDKException(Exception):
        def __init__(self, code: str, message: str, request_id: str) -> None:
            super().__init__(message)
            self.code = code
            self.message = message
            self.requestId = request_id

        def get_code(self) -> str:
            return self.code

        def get_message(self) -> str:
            return self.message

        def get_request_id(self) -> str:
            return self.requestId

    class FakeCredential:
        def __init__(self, secret_id: str, secret_key: str) -> None:
            assert secret_id == "mock-secret-id"
            assert secret_key == "mock-secret-key"

    class FakeTextToVoiceRequest:
        pass

    class FakeTtsClient:
        def __init__(self, _credential: object, region: str) -> None:
            assert region == "ap-shanghai"

        def TextToVoice(self, request: object) -> object:
            assert request.Text
            assert request.PrimaryLanguage == 2
            assert request.ModelType == 1
            assert request.VoiceType == 501009
            assert request.Codec == "mp3"
            assert request.SampleRate == 16000
            assert request.Speed == 0
            assert request.Volume == 0
            assert request.SessionId
            if raised_error is not None:
                raise raised_error
            if sdk_error_code is not None:
                raise FakeTencentCloudSDKException(
                    sdk_error_code,
                    error_message,
                    "mock-error-request-id",
                )
            return types.SimpleNamespace(
                Audio=base64.b64encode(b"mock-mp3-audio").decode("ascii"),
                RequestId="mock-request-id",
            )

    credential_mod.Credential = FakeCredential
    sdk_exception_mod.TencentCloudSDKException = FakeTencentCloudSDKException
    models_mod.TextToVoiceRequest = FakeTextToVoiceRequest
    client_mod.TtsClient = FakeTtsClient
    common_mod.credential = credential_mod
    common_mod.exception = exception_mod
    exception_mod.tencent_cloud_sdk_exception = sdk_exception_mod
    version_mod.models = models_mod
    version_mod.tts_client = client_mod
    sys.modules.update({
        "tencentcloud": tencentcloud_mod,
        "tencentcloud.common": common_mod,
        "tencentcloud.common.credential": credential_mod,
        "tencentcloud.common.exception": exception_mod,
        "tencentcloud.common.exception.tencent_cloud_sdk_exception": sdk_exception_mod,
        "tencentcloud.tts": tts_mod,
        "tencentcloud.tts.v20190823": version_mod,
        "tencentcloud.tts.v20190823.models": models_mod,
        "tencentcloud.tts.v20190823.tts_client": client_mod,
    })
    return originals


def capture_tts_logs(client: TestClient, *, text: str, session_id: str) -> tuple[object, str]:
    import io
    import logging

    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    audio_routes.logger.addHandler(handler)
    previous_level = audio_routes.logger.level
    audio_routes.logger.setLevel(logging.INFO)
    try:
        response = client.post(
            "/api/tts",
            json={"text": text, "session_id": session_id},
        )
    finally:
        audio_routes.logger.removeHandler(handler)
        audio_routes.logger.setLevel(previous_level)
    return response, stream.getvalue()


def restore_fake_tencent_sdk(originals: dict[str, object | None]) -> None:
    for name, module in originals.items():
        if module is None:
            sys.modules.pop(name, None)
        else:
            sys.modules[name] = module

def assert_tts_concurrency_controls(client: TestClient, original_transcribe_audio) -> None:
    original_synthesize_speech = audio_routes.synthesize_speech
    tts_originals = set_tts_config(
        provider="gtts",
        max_concurrency=3,
        per_session_concurrency=1,
        rate_limit_per_minute=60,
        queue_timeout_seconds=1,
        max_text_chars=300,
    )
    original_tts_timeout = config.TTS_TIMEOUT_SECONDS
    try:
        config.TTS_TIMEOUT_SECONDS = 5
        active = 0
        max_active = 0
        active_lock = threading.Lock()
        all_three_active = threading.Event()
        release_tts = threading.Event()
        responses: dict[str, object] = {}
        errors: dict[str, str] = {}

        def slow_synthesize_speech(text: str) -> audio_services.TTSResult:
            nonlocal active, max_active
            with active_lock:
                active += 1
                max_active = max(max_active, active)
                if active == 3:
                    all_three_active.set()
            try:
                release_tts.wait(3)
                return audio_services.TTSResult(
                    audio=f"audio:{text}".encode("utf-8"),
                    content_type="audio/mpeg",
                    provider="mock",
                )
            finally:
                with active_lock:
                    active -= 1

        def post_tts(name: str, session_id: str) -> None:
            try:
                responses[name] = client.post(
                    "/api/tts",
                    json={"text": f"Hello {name}", "session_id": session_id},
                )
            except Exception as error:  # pragma: no cover - kept for thread diagnostics
                errors[name] = str(error)

        audio_routes.synthesize_speech = slow_synthesize_speech
        threads = [
            threading.Thread(target=post_tts, args=(name, f"session-{name}"), daemon=True)
            for name in ("one", "two", "three")
        ]
        for thread in threads:
            thread.start()
        assert all_three_active.wait(2), "expected three different sessions to run concurrently"

        queued_out = client.post("/api/tts", json={"text": "Hello four", "session_id": "session-four"})
        assert queued_out.status_code == 503, queued_out.text
        assert queued_out.json()["detail"] == "Voice is temporarily unavailable. Continue with the text shown above."

        def successful_transcribe_audio(_audio_bytes: bytes, _mime_type: str) -> str:
            return "STT is still available while TTS is congested."

        audio_routes.transcribe_audio = successful_transcribe_audio
        post_tts_transcribe = client.post(
            "/api/transcribe",
            files={"file": ("answer.wav", b"0" * 4096, "audio/wav")},
        )
        assert post_tts_transcribe.status_code == 200, post_tts_transcribe.text
        assert "still available" in post_tts_transcribe.json()["text"], post_tts_transcribe.text
        audio_routes.transcribe_audio = original_transcribe_audio

        release_tts.set()
        for thread in threads:
            thread.join(2)
        assert not errors, errors
        assert max_active == 3, max_active
        for name in ("one", "two", "three"):
            response = responses[name]
            assert response.status_code == 200, response.text

        audio_routes._reset_tts_admission_state_for_tests()
        first_started = threading.Event()
        release_same_session = threading.Event()
        first_response: dict[str, object] = {}

        def one_session_slow_synthesize(_text: str) -> audio_services.TTSResult:
            first_started.set()
            release_same_session.wait(3)
            return audio_services.TTSResult(audio=b"same-session-audio", content_type="audio/mpeg", provider="mock")

        audio_routes.synthesize_speech = one_session_slow_synthesize
        first_thread = threading.Thread(target=lambda: first_response.setdefault("response", client.post(
            "/api/tts",
            json={"text": "Hello same", "session_id": "same-session"},
        )), daemon=True)
        first_thread.start()
        assert first_started.wait(2), "expected first same-session request to start"
        duplicate = client.post("/api/tts", json={"text": "Hello duplicate", "session_id": "same-session"})
        assert duplicate.status_code == 429, duplicate.text
        assert duplicate.json()["detail"] == "Voice is temporarily unavailable. Continue with the text shown above."
        release_same_session.set()
        first_thread.join(2)
        assert first_response["response"].status_code == 200, first_response["response"].text

        audio_routes._reset_tts_admission_state_for_tests()
        config.TTS_RATE_LIMIT_PER_MINUTE = 2

        def fast_synthesize_speech(_text: str) -> audio_services.TTSResult:
            return audio_services.TTSResult(audio=b"fast-audio", content_type="audio/mpeg", provider="mock")

        audio_routes.synthesize_speech = fast_synthesize_speech
        first_limited = client.post("/api/tts", json={"text": "Rate one", "session_id": "rate-session"})
        second_limited = client.post("/api/tts", json={"text": "Rate two", "session_id": "rate-session"})
        third_limited = client.post("/api/tts", json={"text": "Rate three", "session_id": "rate-session"})
        assert first_limited.status_code == 200, first_limited.text
        assert second_limited.status_code == 200, second_limited.text
        assert third_limited.status_code == 429, third_limited.text
    finally:
        release_tts.set()
        if "release_same_session" in locals():
            release_same_session.set()
        config.TTS_TIMEOUT_SECONDS = original_tts_timeout
        audio_routes.synthesize_speech = original_synthesize_speech
        audio_routes.transcribe_audio = original_transcribe_audio
        restore_tts_config(tts_originals)

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
    assert health_payload == {
        "status": "ok",
        "app": "examiner-victoria-v2",
    }, health_payload
    assert "config" not in health_payload, health_payload
    assert "limits" not in health_payload, health_payload
    assert "cors_origins" not in health_payload, health_payload
    assert "base_url" not in str(health_payload).lower(), health_payload
    assert "model" not in str(health_payload).lower(), health_payload


    runtime_diagnostics = client.get("/api/diagnostics/runtime")
    assert runtime_diagnostics.status_code == 200, runtime_diagnostics.text
    diagnostics_payload = runtime_diagnostics.json()
    original_diagnostics_fields = {
        "status",
        "app",
        "app_version",
        "environment",
        "frontend_available",
        "llm_configured",
        "stt_configured",
        "provider_base_configured",
        "transcription_model_configured",
        "tts_enabled",
        "tts_provider",
        "tts_configured",
        "tts_region",
        "tts_voice_type",
        "tts_codec",
        "tts_sample_rate",
        "tts_model_type",
        "tts_max_concurrency",
        "tts_rate_limit_per_minute",
        "server_timestamp",
    }
    assert original_diagnostics_fields.issubset(diagnostics_payload), diagnostics_payload
    assert diagnostics_payload["status"] == "ok", diagnostics_payload
    assert "server_timestamp" in diagnostics_payload, diagnostics_payload
    assert isinstance(diagnostics_payload["llm_configured"], bool), diagnostics_payload
    assert isinstance(diagnostics_payload["stt_configured"], bool), diagnostics_payload
    assert "api_key" not in str(diagnostics_payload).lower(), diagnostics_payload
    assert "sk-" not in str(diagnostics_payload), diagnostics_payload
    assert "base_url" not in diagnostics_payload, diagnostics_payload
    assert diagnostics_payload["tts_provider"] in {"disabled", "gtts", "tencent"}, diagnostics_payload
    assert isinstance(diagnostics_payload["tts_configured"], bool), diagnostics_payload
    assert diagnostics_payload["tts_region"] == "ap-shanghai", diagnostics_payload
    assert diagnostics_payload["tts_voice_type"] in {"unknown", str(config.TENCENT_TTS_VOICE_TYPE).strip()}, diagnostics_payload
    assert diagnostics_payload["tts_codec"] == "mp3", diagnostics_payload
    assert diagnostics_payload["tts_sample_rate"] == config.TENCENT_TTS_SAMPLE_RATE, diagnostics_payload
    assert diagnostics_payload["tts_model_type"] == 1, diagnostics_payload
    assert diagnostics_payload["tts_max_concurrency"] == config.TTS_MAX_CONCURRENCY, diagnostics_payload
    assert diagnostics_payload["tts_rate_limit_per_minute"] == config.TTS_RATE_LIMIT_PER_MINUTE, diagnostics_payload
    assert "secret" not in str(diagnostics_payload).lower(), diagnostics_payload
    build_environment_names = {
        "APP_GIT_SHA": "0123456789abcdef0123456789abcdef01234567",
        "APP_BUILD_TIME": "2026-07-13T08:30:00Z",
        "APP_DEPLOY_TARGET": "cloudbase",
        "APP_SOURCE_BRANCH": "v3/domestic-public-beta",
        "APP_VERSION": "v3-beta",
    }
    original_build_environment = {name: os.environ.get(name) for name in build_environment_names}
    try:
        os.environ.update(build_environment_names)
        configured_payload = client.get("/api/diagnostics/runtime").json()
        assert configured_payload["git_sha"] == build_environment_names["APP_GIT_SHA"], configured_payload
        assert configured_payload["git_sha_short"] == "0123456", configured_payload
        assert configured_payload["build_time"] == build_environment_names["APP_BUILD_TIME"], configured_payload
        assert configured_payload["deploy_target"] == "cloudbase", configured_payload
        assert configured_payload["source_branch"] == "v3/domestic-public-beta", configured_payload
        assert configured_payload["app_version"] == "v3-beta", configured_payload
        assert original_diagnostics_fields.issubset(configured_payload), configured_payload

        for name in build_environment_names:
            os.environ.pop(name, None)
        missing_payload = client.get("/api/diagnostics/runtime").json()
        for field in ("git_sha", "git_sha_short", "build_time", "deploy_target", "source_branch", "app_version"):
            assert missing_payload[field] == "unknown", missing_payload
        assert original_diagnostics_fields.issubset(missing_payload), missing_payload

        serialized_payload = str(configured_payload).lower()
        for forbidden_name in ("api_key", "token", "cookie", "secret", "environment_variables"):
            assert forbidden_name not in serialized_payload, configured_payload
    finally:
        for name, value in original_build_environment.items():
            if value is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = value

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

    too_long_tts = client.post("/api/tts", json={"text": "a" * (config.TTS_MAX_TEXT_CHARS + 1)})
    assert too_long_tts.status_code == 413, too_long_tts.text

    original_synthesize_speech = audio_routes.synthesize_speech
    tts_originals = set_tts_config(provider="disabled")
    try:
        assert audio_services.normalize_tts_provider_name() == "disabled"
        assert audio_services.tts_provider_is_configured() is False
        disabled_tts = client.post("/api/tts", json={"text": "Hello"})
        assert disabled_tts.status_code == 502, disabled_tts.text
        assert disabled_tts.json()["detail"] == "Voice is temporarily unavailable. Continue with the text shown above."

        config.TTS_PROVIDER = "gtts"
        assert audio_services.normalize_tts_provider_name() == "gtts"
        assert audio_services.get_tts_provider().name == "gtts"

        def successful_synthesize_speech(_text: str) -> audio_services.TTSResult:
            return audio_services.TTSResult(
                audio=b"fake-mp3-audio",
                content_type="audio/mpeg",
                provider="mock",
                request_id="mock-request",
            )

        audio_routes.synthesize_speech = successful_synthesize_speech
        successful_tts = client.post("/api/tts", json={"text": "Hello"})
        assert successful_tts.status_code == 200, successful_tts.text
        assert successful_tts.headers["content-type"].startswith("audio/mpeg"), successful_tts.headers
        assert successful_tts.headers.get("x-tts-duration-ms") is not None, successful_tts.headers
        assert successful_tts.content == b"fake-mp3-audio", successful_tts.content

        config.TTS_PROVIDER = "tencent"
        audio_routes.synthesize_speech = audio_services.synthesize_speech
        config.TENCENTCLOUD_SECRET_ID = ""
        config.TENCENTCLOUD_SECRET_KEY = "mock-secret-key"
        config.TENCENT_TTS_VOICE_TYPE = "101001"
        assert audio_services.tts_provider_is_configured() is False
        missing_secret_tts = client.post("/api/tts", json={"text": "Hello"})
        assert missing_secret_tts.status_code == 502, missing_secret_tts.text

        audio_routes.synthesize_speech = audio_services.synthesize_speech
        config.TENCENTCLOUD_SECRET_ID = "mock-secret-id"
        config.TENCENT_TTS_VOICE_TYPE = ""
        assert audio_services.tts_provider_is_configured() is False
        missing_voice_tts = client.post("/api/tts", json={"text": "Hello"})
        assert missing_voice_tts.status_code == 502, missing_voice_tts.text
        config.TENCENTCLOUD_SECRET_ID = "mock-secret-id"
        config.TENCENTCLOUD_SECRET_KEY = "mock-secret-key"
        config.TENCENT_TTS_REGION = "ap-shanghai"
        config.TENCENT_TTS_VOICE_TYPE = "501009"
        config.TENCENT_TTS_CODEC = "mp3"
        invalid_tencent_values = (
            ("TENCENTCLOUD_SECRET_ID", "mock-secret-id\nunsafe"),
            ("TENCENTCLOUD_SECRET_KEY", "mock-secret-key\nunsafe"),
            ("TENCENT_TTS_REGION", "ap-shanghai/unsafe"),
            ("TENCENT_TTS_VOICE_TYPE", "501009x"),
            ("TENCENT_TTS_CODEC", "mp3;unsafe"),
        )
        for config_name, invalid_value in invalid_tencent_values:
            original_value = getattr(config, config_name)
            setattr(config, config_name, invalid_value)
            assert audio_services.tts_provider_is_configured() is False, config_name
            setattr(config, config_name, original_value)


        config.TENCENTCLOUD_SECRET_ID = "  mock-secret-id  "
        config.TENCENTCLOUD_SECRET_KEY = "  mock-secret-key  "
        config.TENCENT_TTS_REGION = "  ap-shanghai  "
        config.TENCENT_TTS_VOICE_TYPE = "  501009  "
        config.TENCENT_TTS_CODEC = "  MP3  "
        fake_sdk = install_fake_tencent_sdk()
        try:
            tencent_tts = client.post("/api/tts", json={"text": "Hello Victoria"})
            assert tencent_tts.status_code == 200, tencent_tts.text
            assert tencent_tts.headers["content-type"].startswith("audio/mpeg"), tencent_tts.headers
            assert tencent_tts.content == b"mock-mp3-audio", tencent_tts.content
        finally:
            restore_fake_tencent_sdk(fake_sdk)

        diagnostic_tts_fields = client.get("/api/diagnostics/runtime").json()
        assert {
            "tts_region": "ap-shanghai",
            "tts_voice_type": "501009",
            "tts_codec": "mp3",
            "tts_sample_rate": 16000,
            "tts_model_type": 1,
        }.items() <= diagnostic_tts_fields.items(), diagnostic_tts_fields
        assert "mock-secret-id" not in str(diagnostic_tts_fields), diagnostic_tts_fields
        assert "mock-secret-key" not in str(diagnostic_tts_fields), diagnostic_tts_fields

        sdk_error_codes = [
            "ClientNetworkError",
            "AuthFailure",
            "UnauthorizedOperation",
            "InvalidParameterValue.VoiceType",
            "NoFreeAccount",
            "PkgExhausted",
        ]
        for index, error_code in enumerate(sdk_error_codes):
            audio_services.TTS_CACHE.clear()
            sensitive_text = f"Sensitive user text {index}"
            fake_sdk = install_fake_tencent_sdk(
                sdk_error_code=error_code,
                error_message=(
                    f"Safe Tencent message for {sensitive_text}, "
                    "SecretId=mock-secret-id, SecretKey=mock-secret-key, "
                    "Authorization=Bearer mock-authorization, "
                    "Audio=QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=, "
                    + ("Z" * 400)
                ),
            )
            try:
                failed_tencent_tts, tts_logs = capture_tts_logs(
                    client,
                    text=sensitive_text,
                    session_id=f"sdk-error-{index}",
                )
                assert failed_tencent_tts.status_code == 502, failed_tencent_tts.text
                assert failed_tencent_tts.json()["detail"] == (
                    "Voice is temporarily unavailable. Continue with the text shown above."
                ), failed_tencent_tts.text
                assert f"error_code={error_code}" in tts_logs, tts_logs
                logged_message = tts_logs.split("error_message=", 1)[1].split(" request_id=", 1)[0]
                assert len(logged_message) <= audio_services.TTS_ERROR_MESSAGE_LIMIT, logged_message
                assert "Z" * 241 not in logged_message, logged_message
                assert "request_id=mock-error-request-id" in tts_logs, tts_logs
                assert "provider=tencent" in tts_logs, tts_logs
                assert "voice_type=501009" in tts_logs, tts_logs
                assert "region=ap-shanghai" in tts_logs, tts_logs
                assert "codec=mp3" in tts_logs, tts_logs
                assert "sample_rate=16000" in tts_logs, tts_logs
                for forbidden_value in (
                    "mock-secret-id",
                    "SecretId",
                    "SecretKey",
                    "Authorization",
                    "mock-secret-key",
                    "mock-authorization",
                    sensitive_text,
                    "QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=",
                ):
                    assert forbidden_value not in tts_logs, tts_logs
            finally:
                restore_fake_tencent_sdk(fake_sdk)

        for index, raised_error in enumerate(
            (
                ConnectionError("SecretKey=mock-secret-key network failure"),
                RuntimeError("SecretId=mock-secret-id unknown failure"),
            )
        ):
            audio_services.TTS_CACHE.clear()
            fake_sdk = install_fake_tencent_sdk(raised_error=raised_error)
            try:
                failed_tencent_tts, tts_logs = capture_tts_logs(
                    client,
                    text=f"Non-SDK failure text {index}",
                    session_id=f"non-sdk-error-{index}",
                )
                assert failed_tencent_tts.status_code == 502, failed_tencent_tts.text
                expected_code = "TTS_NETWORK_ERROR" if isinstance(raised_error, ConnectionError) else "TTS_UNKNOWN_ERROR"
                assert f"error_code={expected_code}" in tts_logs, tts_logs
                assert "mock-secret-id" not in tts_logs, tts_logs
                assert "mock-secret-key" not in tts_logs, tts_logs
                assert failed_tencent_tts.json()["detail"] == (
                    "Voice is temporarily unavailable. Continue with the text shown above."
                ), failed_tencent_tts.text
            finally:
                restore_fake_tencent_sdk(fake_sdk)

        text_flow_session = start_api_session(
            client,
            practice_type="part3",
            cue_card_title=chosen_card,
            voice_playback_enabled=True,
        )
        text_flow_payload = answer_api(
            client,
            text_flow_session,
            "I think this matters because it affects people's everyday choices.",
        )
        assert text_flow_payload["assistant_message"]["content"], text_flow_payload
        assert text_flow_payload["session"]["candidate_answers"], text_flow_payload
        assert text_flow_payload["session"]["current_question"], text_flow_payload


        def slow_synthesize_speech(_text: str) -> audio_services.TTSResult:
            import time

            time.sleep(1.2)
            return audio_services.TTSResult(audio=b"late-audio", content_type="audio/mpeg", provider="mock")

        original_tts_timeout = config.TTS_TIMEOUT_SECONDS
        config.TTS_TIMEOUT_SECONDS = 1
        audio_routes.synthesize_speech = slow_synthesize_speech
        timed_out_tts = client.post("/api/tts", json={"text": "Hello"})
        assert timed_out_tts.status_code == 504, timed_out_tts.text
        timed_out_detail = timed_out_tts.json()["detail"]
        assert timed_out_detail == "Voice is temporarily unavailable. Continue with the text shown above.", timed_out_detail

        audio_routes.synthesize_speech = audio_services.synthesize_speech
        config.TTS_PROVIDER = "disabled"
        def successful_transcribe_audio(_audio_bytes: bytes, _mime_type: str) -> str:
            return "I can still speak after a TTS failure."

        audio_routes.transcribe_audio = successful_transcribe_audio
        post_tts_transcribe = client.post(
            "/api/transcribe",
            files={"file": ("answer.wav", b"0" * 4096, "audio/wav")},
        )
        assert post_tts_transcribe.status_code == 200, post_tts_transcribe.text
        assert "still speak" in post_tts_transcribe.json()["text"], post_tts_transcribe.text
        audio_routes.transcribe_audio = original_transcribe_audio
    finally:
        config.TTS_TIMEOUT_SECONDS = locals().get("original_tts_timeout", config.TTS_TIMEOUT_SECONDS)
        audio_routes.synthesize_speech = original_synthesize_speech
        audio_routes.transcribe_audio = original_transcribe_audio
        restore_tts_config(tts_originals)

    assert_tts_concurrency_controls(client, original_transcribe_audio)

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
    assert_part3_hybrid_strategy(client, chosen_card)

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
    answer1_payload = answer1.json()
    assert isinstance(answer1_payload["llm_duration_ms"], int), answer1_payload
    assert isinstance(answer1_payload["total_duration_ms"], int), answer1_payload
    session = answer1_payload["session"]
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
