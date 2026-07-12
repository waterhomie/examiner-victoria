from __future__ import annotations

import base64
from collections import OrderedDict
from dataclasses import dataclass
import io
import re
from threading import Lock
from uuid import uuid4

from .ai_provider import TRANSCRIPTION_MODEL, TTS_CACHE_MAX_ITEMS, get_client
from .core import config


@dataclass(frozen=True)
class TTSResult:
    audio: bytes
    content_type: str
    provider: str
    request_id: str | None = None


TTS_ERROR_MESSAGE_LIMIT = 240


def _safe_tts_error_code(value: object, default: str = "TTS_PROVIDER_ERROR") -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]", "_", str(value or "").strip())[:80]
    return cleaned or default


def _safe_tts_request_id(value: object) -> str | None:
    cleaned = re.sub(r"[^A-Za-z0-9._:-]", "_", str(value or "").strip())[:128]
    return cleaned or None


def _safe_tts_error_message(message: object, *, secrets: tuple[str, ...] = ()) -> str:
    cleaned = re.sub(r"\s+", " ", str(message or "")).strip()
    for secret in secrets:
        if secret:
            cleaned = cleaned.replace(secret, "[redacted]")
    cleaned = re.sub(
        r"(?i)\baudio\b\s*[:=]\s*[A-Za-z0-9+/=]{16,}",
        "Audio=[redacted]",
        cleaned,
    )
    cleaned = re.sub(
        r"(?i)\b(secret(?:id|key)?|token|api[_ -]?key)\b\s*[:=]\s*[^\s,;]+",
        "[redacted credential]",
        cleaned,
    )
    cleaned = re.sub(
        r"(?i)\bauthorization\b\s*[:=]\s*[^,;]+",
        "[redacted credential]",
        cleaned,
    )
    return cleaned[:TTS_ERROR_MESSAGE_LIMIT] or "Tencent Cloud TTS request failed"


def _exception_detail(error: Exception, method_name: str, attribute_names: tuple[str, ...]) -> object | None:
    method = getattr(error, method_name, None)
    if callable(method):
        try:
            value = method()
            if value:
                return value
        except Exception:
            pass
    for attribute_name in attribute_names:
        value = getattr(error, attribute_name, None)
        if value:
            return value
    return None


class TTSProviderError(RuntimeError):
    """Raised when a TTS provider cannot synthesize audio safely."""

    def __init__(
        self,
        safe_message: str,
        *,
        error_code: str = "TTS_PROVIDER_ERROR",
        request_id: str | None = None,
    ) -> None:
        self.error_code = _safe_tts_error_code(error_code)
        self.safe_message = _safe_tts_error_message(safe_message)
        self.request_id = _safe_tts_request_id(request_id)
        super().__init__(self.safe_message)

    @classmethod
    def from_tencent_sdk_exception(
        cls,
        error: Exception,
        *,
        secrets: tuple[str, ...],
    ) -> "TTSProviderError":
        code = _exception_detail(error, "get_code", ("code", "Code"))
        message = _exception_detail(error, "get_message", ("message", "Message"))
        request_id = _exception_detail(
            error,
            "get_request_id",
            ("request_id", "requestId", "RequestId"),
        )
        return cls(
            _safe_tts_error_message(message or "Tencent Cloud TTS request failed", secrets=secrets),
            error_code=_safe_tts_error_code(code, "TENCENT_SDK_ERROR"),
            request_id=_safe_tts_request_id(request_id),
        )


def get_safe_tts_error_log_fields(error: Exception) -> dict[str, str]:
    if isinstance(error, TTSProviderError):
        error_code = error.error_code
        safe_message = _safe_tts_error_message(
            error.safe_message,
            secrets=(
                str(config.TENCENTCLOUD_SECRET_ID or "").strip(),
                str(config.TENCENTCLOUD_SECRET_KEY or "").strip(),
            ),
        )
        request_id = error.request_id or ""
    else:
        error_code = "TTS_UNKNOWN_ERROR"
        safe_message = type(error).__name__
        request_id = ""
    return {
        "error_code": _safe_tts_error_code(error_code),
        "error_message": safe_message,
        "request_id": _safe_tts_request_id(request_id) or "",
    }


class BaseTTSProvider:
    name = "base"
    content_type = "audio/mpeg"

    @property
    def configured(self) -> bool:
        return True

    def synthesize(self, text: str) -> TTSResult:
        raise NotImplementedError


class DisabledTTSProvider(BaseTTSProvider):
    name = "disabled"

    @property
    def configured(self) -> bool:
        return False

    def synthesize(self, text: str) -> TTSResult:
        raise TTSProviderError("tts disabled")


class GttsTTSProvider(BaseTTSProvider):
    name = "gtts"
    content_type = "audio/mpeg"

    def synthesize(self, text: str) -> TTSResult:
        from gtts import gTTS

        audio_buffer = io.BytesIO()
        gTTS(text=text, lang="en", tld="co.uk").write_to_fp(audio_buffer)
        return TTSResult(
            audio=audio_buffer.getvalue(),
            content_type=self.content_type,
            provider=self.name,
        )


@dataclass(frozen=True)
class TencentTTSRuntimeConfig:
    secret_id: str
    secret_key: str
    region: str
    voice_type: int
    codec: str
    sample_rate: int
    speed: int
    volume: int


def _validated_tencent_tts_config() -> TencentTTSRuntimeConfig:
    secret_id = str(config.TENCENTCLOUD_SECRET_ID or "").strip()
    secret_key = str(config.TENCENTCLOUD_SECRET_KEY or "").strip()
    region = str(config.TENCENT_TTS_REGION or "").strip().lower()
    voice_type_raw = str(config.TENCENT_TTS_VOICE_TYPE or "").strip()
    codec = str(config.TENCENT_TTS_CODEC or "").strip().lower()

    if (
        not secret_id
        or not secret_key
        or len(secret_id) > 256
        or len(secret_key) > 256
        or any(ord(character) < 32 for character in secret_id + secret_key)
    ):
        raise TTSProviderError(
            "Tencent Cloud TTS credentials are missing or invalid",
            error_code="TTS_CONFIG_ERROR",
        )
    if not re.fullmatch(r"[a-z0-9-]{3,40}", region):
        raise TTSProviderError("Tencent Cloud TTS region is invalid", error_code="TTS_CONFIG_ERROR")
    if not voice_type_raw.isdigit() or int(voice_type_raw) <= 0:
        raise TTSProviderError("Tencent Cloud TTS voice type is invalid", error_code="TTS_CONFIG_ERROR")
    if codec not in {"mp3", "wav", "pcm"}:
        raise TTSProviderError("Tencent Cloud TTS codec is invalid", error_code="TTS_CONFIG_ERROR")

    return TencentTTSRuntimeConfig(
        secret_id=secret_id,
        secret_key=secret_key,
        region=region,
        voice_type=int(voice_type_raw),
        codec=codec,
        sample_rate=int(config.TENCENT_TTS_SAMPLE_RATE),
        speed=int(config.TENCENT_TTS_SPEED),
        volume=int(config.TENCENT_TTS_VOLUME),
    )


def get_tencent_tts_public_diagnostics() -> dict[str, str | int]:
    region = str(config.TENCENT_TTS_REGION or "").strip().lower()
    voice_type = str(config.TENCENT_TTS_VOICE_TYPE or "").strip()
    codec = str(config.TENCENT_TTS_CODEC or "").strip().lower()
    return {
        "tts_region": region if re.fullmatch(r"[a-z0-9-]{3,40}", region) else "unknown",
        "tts_voice_type": voice_type if voice_type.isdigit() and int(voice_type) > 0 else "unknown",
        "tts_codec": codec if codec in {"mp3", "wav", "pcm"} else "unknown",
        "tts_sample_rate": int(config.TENCENT_TTS_SAMPLE_RATE),
        "tts_model_type": 1,
    }


class TencentCloudTTSProvider(BaseTTSProvider):
    name = "tencent"

    @property
    def configured(self) -> bool:
        try:
            _validated_tencent_tts_config()
            return True
        except TTSProviderError:
            return False

    @property
    def content_type(self) -> str:
        codec = str(config.TENCENT_TTS_CODEC or "").strip().lower()
        if codec == "mp3":
            return "audio/mpeg"
        if codec == "wav":
            return "audio/wav"
        return "application/octet-stream"

    def synthesize(self, text: str) -> TTSResult:
        settings = _validated_tencent_tts_config()

        try:
            from tencentcloud.common import credential
            from tencentcloud.common.exception.tencent_cloud_sdk_exception import TencentCloudSDKException
            from tencentcloud.tts.v20190823 import models, tts_client
        except Exception as error:
            raise TTSProviderError(
                "Tencent Cloud TTS SDK is unavailable",
                error_code="TTS_SDK_UNAVAILABLE",
            ) from error

        try:
            cred = credential.Credential(settings.secret_id, settings.secret_key)
            client = tts_client.TtsClient(cred, settings.region)
            request = models.TextToVoiceRequest()
            request.Text = text
            request.SessionId = str(uuid4())
            request.PrimaryLanguage = 2
            request.ModelType = 1
            request.VoiceType = settings.voice_type
            request.Codec = settings.codec
            request.SampleRate = settings.sample_rate
            request.Speed = settings.speed
            request.Volume = settings.volume
            response = client.TextToVoice(request)
            request_id = _safe_tts_request_id(getattr(response, "RequestId", None))
            audio_base64 = getattr(response, "Audio", "") or ""
            audio = base64.b64decode(audio_base64, validate=True)
        except TencentCloudSDKException as error:
            raise TTSProviderError.from_tencent_sdk_exception(
                error,
                secrets=(settings.secret_id, settings.secret_key, text),
            ) from error
        except (ConnectionError, TimeoutError, OSError) as error:
            raise TTSProviderError(
                type(error).__name__,
                error_code="TTS_NETWORK_ERROR",
            ) from error
        except Exception as error:
            raise TTSProviderError(
                type(error).__name__,
                error_code="TTS_UNKNOWN_ERROR",
            ) from error

        if not audio:
            raise TTSProviderError("Tencent Cloud TTS returned empty audio", error_code="TTS_EMPTY_AUDIO")
        return TTSResult(
            audio=audio,
            content_type=self.content_type,
            provider=self.name,
            request_id=request_id,
        )


TTS_CACHE: OrderedDict[tuple[str, str], TTSResult] = OrderedDict()
TTS_CACHE_LOCK = Lock()
TTS_PROVIDERS: dict[str, BaseTTSProvider] = {
    "disabled": DisabledTTSProvider(),
    "gtts": GttsTTSProvider(),
    "tencent": TencentCloudTTSProvider(),
}


def audio_filename_from_mime(mime_type: str) -> str:
    if "wav" in mime_type:
        return "ielts_answer.wav"
    if "mp4" in mime_type or "m4a" in mime_type:
        return "ielts_answer.m4a"
    if "mpeg" in mime_type or "mp3" in mime_type:
        return "ielts_answer.mp3"
    return "ielts_answer.webm"


def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/wav") -> str:
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = audio_filename_from_mime(mime_type)
    transcription = get_client().audio.transcriptions.create(
        model=TRANSCRIPTION_MODEL,
        file=audio_file,
        language="en",
    )
    text = getattr(transcription, "text", None)
    return text.strip() if text else ""


def clean_tts_text(text: str) -> str:
    cleaned = text.replace("*", "").replace("#", "").replace("- ", "")
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned or text.strip()


def normalize_tts_provider_name(raw: str | None = None) -> str:
    value = (raw or config.TTS_PROVIDER or "disabled").strip().lower()
    if value in TTS_PROVIDERS:
        return value
    return "disabled"


def get_tts_provider() -> BaseTTSProvider:
    return TTS_PROVIDERS[normalize_tts_provider_name()]


def tts_provider_is_configured() -> bool:
    return get_tts_provider().configured


def prepare_tts_text(text: str) -> str:
    clean_text = clean_tts_text(text)
    if not clean_text:
        raise TTSProviderError("empty tts text")
    if get_tts_provider().name == "tencent" and len(clean_text) > config.TENCENT_TTS_MAX_TEXT_CHARS:
        clean_text = clean_text[: config.TENCENT_TTS_MAX_TEXT_CHARS].strip()
    if not clean_text:
        raise TTSProviderError("empty tts text")
    return clean_text


def synthesize_speech(text: str) -> TTSResult:
    provider = get_tts_provider()
    clean_text = prepare_tts_text(text)
    cache_key = (provider.name, clean_text)
    with TTS_CACHE_LOCK:
        cached_result = TTS_CACHE.get(cache_key)
        if cached_result is not None:
            TTS_CACHE.move_to_end(cache_key)
            return cached_result

    result = provider.synthesize(clean_text)
    with TTS_CACHE_LOCK:
        TTS_CACHE[cache_key] = result
        TTS_CACHE.move_to_end(cache_key)
        while len(TTS_CACHE) > TTS_CACHE_MAX_ITEMS:
            TTS_CACHE.popitem(last=False)
    return result
