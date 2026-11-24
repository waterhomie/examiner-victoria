"""Local UI demo backend with a deterministic fake provider.

LOCAL ONLY. Never deploy this. It does not read any API key and makes no
network calls. It exists so the V4 screens can be clicked through (and
screenshotted) without real LLM / STT / TTS credentials.

    python scripts/run_fake_backend.py            # http://127.0.0.1:8010
    FAKE_BACKEND_PORT=8020 python scripts/run_fake_backend.py

The real FastAPI app, routes, exam flow and feedback guards all run as-is;
only ``call_model``, transcription and speech synthesis are replaced.
"""

from __future__ import annotations

import io
import os
import re
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.environ["API_KEY"] = ""
os.environ.setdefault("APP_ENV", "local-fake")

from backend import ai_provider, exam_flow_service, feedback_service, part3_service, report_service  # noqa: E402
from backend.audio_services import TTSResult  # noqa: E402
from backend.routes import audio as audio_routes  # noqa: E402

FAKE_FIXES = [
    ("I very like", "I really like"),
    ("I am work", "I work"),
    ("more better", "much better"),
    ("go there yesterday", "went there yesterday"),
    ("people is", "people are"),
]

FAKE_REPORT = """## Overall band estimate
Around 6.0 (practice estimate) based on short but relevant answers.

## Skill breakdown
- **Fluency and Coherence:** answers are relevant but often stop after one sentence.
- **Lexical Resource:** everyday words are used correctly; a few broad words repeat.
- **Grammar:** mostly accurate simple sentences; some verb-form slips.

## Three recurring spoken-language problems
1. Short answers with no reason or example.
2. Repeating broad words such as "good" and "nice".
3. Verb forms after "I" (for example "I very like").

## Corrected examples
> Original: I very like music.
> Better: I really like music.

## Next-session practice tasks
1. Add one reason and one example to every Part 1 answer.
2. Replace "good" with a more exact adjective.
3. Record one Part 2 answer for a full two minutes.
"""


def fake_call_model(messages, *_args, **_kwargs) -> str:
    joined = "\n".join(item.get("content", "") for item in messages)
    answer_match = re.search(r'"answer":\s*"((?:[^"\\]|\\.)*)"', joined)
    if "ANSWER_KIND" in joined and answer_match:
        answer = answer_match.group(1)
        for quote, replacement in FAKE_FIXES:
            if quote.lower() in answer.lower():
                original = re.search(re.escape(quote), answer, re.I).group(0)
                return (
                    f'CORRECTION: Say "{replacement}" instead of "{original}".\n'
                    f"CORRECTION_QUOTE: {original}\nCORRECTION_REPLACEMENT: {replacement}\n"
                    "EXPRESSION_TIP: NONE\nUPGRADED_ANSWER: NONE\nANSWER_KIND: relevant\nGROUNDED: YES\n"
                    "SUPPORT: balanced\nREASON: clear_language\nEVIDENCE: NONE"
                )
        return (
            "CORRECTION: NONE\nCORRECTION_QUOTE: NONE\nCORRECTION_REPLACEMENT: NONE\n"
            "EXPRESSION_TIP: Add one reason that is true for you.\nUPGRADED_ANSWER: NONE\n"
            "ANSWER_KIND: relevant\nGROUNDED: YES\nSUPPORT: unknown\nREASON: none\nEVIDENCE: NONE"
        )
    if "exact labels requested" in joined:
        return "CORRECTION: NONE\nEXPRESSION_TIP: Give one example from your own life.\nUPGRADED_ANSWER: NONE"
    if "IELTS Speaking practice report" in joined:
        return FAKE_REPORT
    if "Rephrase" in joined:
        return "Could you say that in a simpler way?"
    return "How might this change in the future?"


def silent_wav(seconds: float = 0.4) -> bytes:
    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(16000)
        handle.writeframes(b"\x00\x00" * int(16000 * seconds))
    return buffer.getvalue()


def fake_synthesize(_text: str) -> TTSResult:
    return TTSResult(audio=silent_wav(), content_type="audio/wav", provider="fake")


def fake_transcribe(*_args, **_kwargs):
    return "Um I very like pop music because it helps me relax after work."


for module in (ai_provider, exam_flow_service, feedback_service, part3_service, report_service):
    module.call_model = fake_call_model
audio_routes.synthesize_speech = fake_synthesize
audio_routes.transcribe_audio = fake_transcribe

if __name__ == "__main__":
    import uvicorn

    from backend.app import app

    uvicorn.run(app, host="127.0.0.1", port=int(os.environ.get("FAKE_BACKEND_PORT", "8010")), log_level="warning")
