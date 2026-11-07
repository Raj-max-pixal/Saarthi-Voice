import httpx
from app.config import Settings

SYSTEM_PROMPT = """You are Saarthi, a patient voice-first digital guide for people in India.
Reply in the user's language (Hindi, Hinglish, or English) in at most 120 words.
Use short, practical, jargon-free steps. Never ask for or repeat passwords, OTPs, Aadhaar, PAN,
bank details, or other sensitive data. Do not give medical, legal, or financial advice; when relevant,
direct the user to an official helpdesk or qualified professional."""

class EvonError(RuntimeError):
    pass

class EvonClient:
    """Adapter for the official Evon model when served through an OpenAI-compatible host."""
    def __init__(self, settings: Settings):
        self.settings = settings

    async def respond(self, transcript: str, history: list[dict[str, str]]) -> str:
        headers = {"Content-Type": "application/json"}
        if self.settings.evon_api_key:
            headers["Authorization"] = f"Bearer {self.settings.evon_api_key}"
        payload = {"model": self.settings.evon_model, "messages": [{"role": "system", "content": SYSTEM_PROMPT}, *history[-6:], {"role": "user", "content": transcript}], "temperature": 0.25, "max_tokens": 220}
        url = f"{self.settings.evon_base_url.rstrip('/')}/chat/completions"
        async with httpx.AsyncClient(timeout=75) as client:
            response = await client.post(url, headers=headers, json=payload)
        if response.is_error:
            raise EvonError("Evon is unavailable. Confirm EVON_BASE_URL and that its model server is running.")
        try:
            return response.json()["choices"][0]["message"]["content"].strip()
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise EvonError("Evon returned an unexpected response.") from exc
