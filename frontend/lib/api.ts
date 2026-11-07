export type VoiceTurn = { transcript: string; detected_language: string; answer: string; response_engine: string; audio_base64: string; audio_mime_type: string; request_id?: string };
// Same-origin is the production default. NEXT_PUBLIC_API_URL is only needed
// when a separately deployed FastAPI backend is intentionally being used.
const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
export async function sendVoiceTurn(audio: Blob, sessionId: string, languageCode: string): Promise<VoiceTurn> {
  const form = new FormData();
  form.append("audio", audio, "saarthi-recording.wav");
  form.append("session_id", sessionId);
  form.append("language_code", languageCode);
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/v1/voice-turn`, { method: "POST", body: form });
  } catch {
    throw new Error("The voice service is unreachable. Please try again in a moment.");
  }
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.detail || "The assistant could not process that recording."); }
  return response.json();
}
