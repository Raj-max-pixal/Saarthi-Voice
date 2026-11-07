from collections import defaultdict
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.schemas import TurnResponse
from app.services.evon import EvonClient, EvonError
from app.services.guidance import respond as guided_response
from app.services.gnani import GnaniClient, GnaniError

settings = get_settings()
app = FastAPI(title="Saarthi Voice API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_methods=["*"], allow_headers=["*"])
histories: dict[str, list[dict[str, str]]] = defaultdict(list)
MAX_AUDIO_BYTES = 8 * 1024 * 1024
ALLOWED_TYPES = {"audio/webm", "audio/wav", "audio/mpeg", "audio/mp4", "audio/ogg", "audio/x-m4a"}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/api/v1/voice-turn", response_model=TurnResponse)
async def voice_turn(audio: UploadFile = File(...), session_id: str = Form(..., min_length=8, max_length=128), language_code: str = Form("indic-auto")):
    if audio.content_type not in ALLOWED_TYPES:
        raise HTTPException(415, "Use WAV, MP3, M4A, OGG, or WebM audio.")
    audio_bytes = await audio.read()
    if not audio_bytes or len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(413, "Audio must be under 8 MB. Keep it below 30 seconds.")
    try:
        gnani = GnaniClient(settings)
        transcript, detected_language, request_id = await gnani.transcribe(audio_bytes, audio.filename or "recording.webm", audio.content_type, language_code)
        if settings.evon_base_url:
            answer = await EvonClient(settings).respond(transcript, histories[session_id])
            response_engine = "Evon 30B"
        else:
            answer = guided_response(transcript, detected_language)
            response_engine = "Saarthi guided response"
        audio_base64 = await gnani.synthesize(answer, detected_language if detected_language != "indic-auto" else "hi-IN")
    except (GnaniError, EvonError) as exc:
        raise HTTPException(502, str(exc)) from exc
    histories[session_id].extend([{"role": "user", "content": transcript}, {"role": "assistant", "content": answer}])
    return TurnResponse(transcript=transcript, detected_language=detected_language, answer=answer, response_engine=response_engine, audio_base64=audio_base64, request_id=request_id)
