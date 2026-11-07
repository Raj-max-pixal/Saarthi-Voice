# Saarthi Voice

Saarthi Voice is a Hindi/Hinglish voice assistant for elderly and first-time digital-service users. Hold the microphone, ask a question naturally, and receive a simple spoken response.

## Gnani AI integration

- **Prisma v3.0** transcribes Indian-language and Hinglish audio.
- **Evon 30B** is supported optionally when a GPU endpoint is available.
- **Timbre v2.5** reads the response aloud.

## Layout

```
backend/app/{main.py,config.py,schemas.py,services/{gnani.py,evon.py}}
frontend/{app,components,lib}
```

## Run locally

1. Copy `backend/.env.example` to `backend/.env`, then add your Gnani key from [Gnani Console](https://app.gnani.ai). Keep it private.
2. To use the free, low-storage edition, leave `EVON_BASE_URL` empty. Saarthi then uses transparent, built-in safety guidance while still using Prisma and Timbre. If you later have a GPU endpoint, set `EVON_BASE_URL` to enable official Evon 30B.
3. In one terminal: `cd backend`; create/activate a virtual environment; run `pip install -r requirements.txt`; then `uvicorn app.main:app --reload --port 8000`.
4. In another: `cd frontend`; run `npm install`, copy `.env.local.example` to `.env.local`, and run `npm run dev`.

Visit `http://localhost:3000` and allow microphone access. HTTPS is required for microphone access in production.

## Production notes

- Configure `ALLOWED_ORIGINS` to your real frontend domain.
- Keep secrets in a deployed secret manager; never commit `.env`.
- Audio is processed in memory only. Conversation history is ephemeral; replace it with Redis/Postgres for persistent accounts.
- Rate-limit the public API and monitor API spend.

## Demo route

Speak: “Mujhe pension status check karna hai, kaunse documents lagenge?” Show Prisma’s transcript, Evon’s concise step-by-step answer, then play Timbre’s Hindi voice.
