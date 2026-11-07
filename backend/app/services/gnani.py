import base64
import uuid
import httpx
from app.config import Settings

class GnaniError(RuntimeError):
    pass

class GnaniClient:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.headers = {"X-API-Key-ID": settings.gnani_api_key}

    async def transcribe(self, audio: bytes, filename: str, content_type: str, language: str):
        files = {"audio_file": (filename, audio, content_type)}
        data = {"model": "prisma-v3.0", "language_code": language, "format": "transcribe"}
        headers = {**self.headers, "X-API-Request-ID": str(uuid.uuid4())}
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(f"{self.settings.gnani_base_url}/stt/v3", headers=headers, data=data, files=files)
        if response.is_error:
            raise GnaniError(self._message(response, "Prisma could not transcribe this recording."))
        body = response.json()
        transcript = body.get("transcript", "").strip()
        if not transcript:
            raise GnaniError("Prisma did not detect speech. Try again in a quieter place.")
        return transcript, body.get("detected_language_code", language), body.get("request_id")

    async def synthesize(self, text: str, language: str) -> str:
        payload = {
            "text": text, "model": "timbre-v2.5", "language": language,
            "voice": "Nalini" if language.startswith("hi") else "Pranav", "speed": 0.92,
            "audio_config": {"encoding": "linear_pcm", "container": "wav", "num_channels": 1, "sample_rate": 48000, "sample_width": 2},
        }
        headers = {**self.headers, "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(f"{self.settings.gnani_base_url}/api/v1/tts/inference", headers=headers, json=payload)
        if response.is_error:
            raise GnaniError(self._message(response, "Timbre could not generate voice right now."))
        if response.headers.get("content-type", "").startswith("application/json"):
            body = response.json()
            encoded = body.get("audio") or body.get("audio_base64") or body.get("data")
            if not encoded:
                raise GnaniError("Timbre returned an unexpected audio response.")
            return encoded
        return base64.b64encode(response.content).decode("ascii")

    @staticmethod
    def _message(response: httpx.Response, fallback: str) -> str:
        try:
            body = response.json()
            return body.get("message") or body.get("detail", {}).get("message") or fallback
        except ValueError:
            return fallback
