from pydantic import BaseModel

class TurnResponse(BaseModel):
    transcript: str
    detected_language: str
    answer: str
    response_engine: str
    audio_base64: str
    audio_mime_type: str = "audio/wav"
    request_id: str | None = None
