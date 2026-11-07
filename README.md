# 🎙️ Saarthi Voice: Intelligent Multilingual Voice Assistant

**Saarthi Voice** is a state-of-the-art, production-ready multilingual voice assistant designed to bridge communication and accessibility barriers. Built specifically for **The Great Indian AI Internship Challenge by Gnani.ai**, the platform provides real-time speech translation, code-mixed language support, and intelligent conversational responses powered entirely by Gnani AI's proprietary speech models.

---

## 🚀 Built for The Great Indian AI Internship Challenge
This project leverages **Gnani AI's Developer Platform** APIs to build a seamless voice-first pipeline:
- **Prisma (Speech-to-Text / STT):** Accurately transcribes spoken user audio across 10 Indian languages plus English, handling noisy channel conditions, regional accents, and code-mixed (Hinglish/Tanglish) speech seamlessly.
- **Evon (LLM / Reasoning Core):** Processes conversational intent and formulates intelligent, context-aware responses.
- **Timbre (Text-to-Speech / TTS):** Synthesizes the AI's response into high-quality, natural human-like voice outputs with multiple expressive voices.

---

## 🛠️ Tech Stack

### **Frontend**
* **React / Next.js:** Modern, component-driven user interface.
* **Tailwind CSS:** Fully responsive, accessible styling optimized for desktop and mobile web views.
* **Web Audio API:** Real-time microphone recording and audio stream handling.

### **Backend**
* **Python & FastAPI:** High-performance asynchronous backend framework.
* **Uvicorn:** Lightning-fast ASGI server.
* **Gnani AI REST & WebSocket APIs:** Secure bearer-token-authenticated calls to Prisma STT and Timbre TTS pipelines.

---

## 📂 Project Directory Structure

```text
Saarthi-Voice/
│
├── backend/                  # FastAPI Application Core
│   ├── main.py               # API Endpoints & Gnani AI Pipeline Integration
│   ├── requirements.txt      # Python dependencies (FastAPI, Uvicorn, Requests)
│   └── .env.example          # Sample environment variables configuration
│
├── frontend/                 # React UI Client
│   ├── public/               # Static assets & icons
│   ├── src/
│   │   ├── components/       # UI Elements (Mic Button, Audio Visualizer, Chat Box)
│   │   ├── App.jsx           # Main application layout & state logic
│   │   └── index.css         # Tailwind styles
│   ├── package.json          # Node dependencies and scripts
│   └── vite.config.js        # Vite build configuration
│
├── LICENSE                   # MIT License
└── README.md                 # Project Documentation
