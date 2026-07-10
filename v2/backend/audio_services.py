from __future__ import annotations

from collections import OrderedDict
import io
import re
from threading import Lock

from .ai_provider import TRANSCRIPTION_MODEL, TTS_CACHE_MAX_ITEMS, get_client


TTS_CACHE: OrderedDict[str, bytes] = OrderedDict()
TTS_CACHE_LOCK = Lock()


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
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned or text.strip()


def synthesize_speech(text: str) -> bytes:
    from gtts import gTTS

    clean_text = clean_tts_text(text)
    with TTS_CACHE_LOCK:
        cached_audio = TTS_CACHE.get(clean_text)
        if cached_audio is not None:
            TTS_CACHE.move_to_end(clean_text)
            return cached_audio

    audio_buffer = io.BytesIO()
    gTTS(text=clean_text, lang="en", tld="co.uk").write_to_fp(audio_buffer)
    audio = audio_buffer.getvalue()
    with TTS_CACHE_LOCK:
        TTS_CACHE[clean_text] = audio
        TTS_CACHE.move_to_end(clean_text)
        while len(TTS_CACHE) > TTS_CACHE_MAX_ITEMS:
            TTS_CACHE.popitem(last=False)
    return audio

