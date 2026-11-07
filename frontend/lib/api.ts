export type VoiceTurn = { transcript: string; detected_language: string; answer: string; response_engine: string; audio_base64: string; audio_mime_type: string; request_id?: string };
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export async function sendVoiceTurn(audio: Blob, sessionId: string, languageCode: string): Promise<VoiceTurn> {
  const form = new FormData();
  form.append("audio", audio, "saarthi-recording.wav");
  form.append("session_id", sessionId);
  form.append("language_code", languageCode);
  const response = await fetch(`${BASE_URL}/api/v1/voice-turn`, { method: "POST", body: form });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.detail || "The assistant could not process that recording."); }
  return response.json();
}
