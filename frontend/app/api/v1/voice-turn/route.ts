import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const ALLOWED_AUDIO_TYPES = new Set(["audio/wav", "audio/mpeg", "audio/mp4", "audio/ogg", "audio/x-m4a"]);
const GNANI_BASE_URL = (process.env.GNANI_BASE_URL || "https://api.vachana.ai").replace(/\/$/, "");

type JsonObject = Record<string, unknown>;

export async function POST(request: Request) {
  const apiKey = process.env.GNANI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { detail: "The voice service is not configured. Add GNANI_API_KEY to the Vercel project settings." },
      { status: 503 },
    );
  }

  try {
    const incoming = await request.formData();
    const audio = incoming.get("audio");
    const languageCode = String(incoming.get("language_code") || "indic-auto");

    if (!(audio instanceof File)) {
      return NextResponse.json({ detail: "A voice recording is required." }, { status: 400 });
    }

    const contentType = audio.type.split(";", 1)[0].toLowerCase();
    if (!ALLOWED_AUDIO_TYPES.has(contentType)) {
      return NextResponse.json({ detail: "Use WAV, MP3, M4A, or OGG audio." }, { status: 415 });
    }
    if (!audio.size || audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ detail: "Audio must be under 8 MB. Keep it below 30 seconds." }, { status: 413 });
    }

    const requestId = crypto.randomUUID();
    const transcriptionForm = new FormData();
    transcriptionForm.append("audio_file", audio, audio.name || "saarthi-recording.wav");
    transcriptionForm.append("model", "prisma-v3.0");
    transcriptionForm.append("language_code", languageCode);
    transcriptionForm.append("format", "transcribe");

    const transcriptionResponse = await fetch(`${GNANI_BASE_URL}/stt/v3`, {
      method: "POST",
      headers: {
        "X-API-Key-ID": apiKey,
        "X-API-Request-ID": requestId,
      },
      body: transcriptionForm,
      signal: AbortSignal.timeout(45_000),
    });

    if (!transcriptionResponse.ok) {
      return upstreamError(transcriptionResponse, "Prisma could not transcribe this recording.");
    }

    const transcription = await transcriptionResponse.json() as JsonObject;
    const transcript = stringValue(transcription.transcript).trim();
    if (!transcript) {
      return NextResponse.json({ detail: "No speech was detected. Try again in a quieter place." }, { status: 422 });
    }

    const detectedLanguage = stringValue(transcription.detected_language_code) || languageCode;
    const answer = guidedResponse(transcript, detectedLanguage);
    const synthesisResponse = await fetch(`${GNANI_BASE_URL}/api/v1/tts/inference`, {
      method: "POST",
      headers: {
        "X-API-Key-ID": apiKey,
        "X-API-Request-ID": crypto.randomUUID(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: answer,
        model: "timbre-v2.5",
        language: detectedLanguage === "indic-auto" ? "hi-IN" : detectedLanguage,
        voice: voiceFor(detectedLanguage),
        speed: 0.92,
        audio_config: {
          encoding: "linear_pcm",
          container: "wav",
          num_channels: 1,
          sample_rate: 48_000,
          sample_width: 2,
        },
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!synthesisResponse.ok) {
      return upstreamError(synthesisResponse, "Timbre could not generate the voice response.");
    }

    const audioBase64 = await readSynthesizedAudio(synthesisResponse);
    if (!audioBase64) {
      return NextResponse.json({ detail: "Timbre returned an unexpected audio response." }, { status: 502 });
    }

    return NextResponse.json({
      transcript,
      detected_language: detectedLanguage,
      answer,
      response_engine: "Saarthi guided response",
      audio_base64: audioBase64,
      audio_mime_type: "audio/wav",
      request_id: stringValue(transcription.request_id) || requestId,
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return NextResponse.json(
      { detail: timedOut ? "The voice service timed out. Please try again." : "The voice service could not process this recording." },
      { status: 502 },
    );
  }
}

async function upstreamError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null) as JsonObject | null;
  const detail = body?.detail;
  const nestedDetail = detail && typeof detail === "object"
    ? stringValue((detail as JsonObject).message)
    : stringValue(detail);
  const message = stringValue(body?.message) || nestedDetail || fallback;
  return NextResponse.json({ detail: message }, { status: 502 });
}

async function readSynthesizedAudio(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await response.json() as JsonObject;
    return stringValue(body.audio) || stringValue(body.audio_base64) || stringValue(body.data);
  }
  return Buffer.from(await response.arrayBuffer()).toString("base64");
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function voiceFor(language: string) {
  const voices: Record<string, string> = {
    "hi-IN": "Nalini",
    "en-IN": "Pranav",
    "ta-IN": "Asmita",
    "te-IN": "Suhana",
    "kn-IN": "Saanvi",
    "ml-IN": "Reshma",
    "mr-IN": "Zahira",
    "bn-IN": "Kirra",
    "gu-IN": "Falak",
    "pa-IN": "Mehuli",
  };
  return voices[language] || "Pranav";
}

function guidedResponse(transcript: string, language: string) {
  const text = transcript.toLowerCase();
  const hindi = language.startsWith("hi");
  if (["otp", "password", "pin"].some((word) => text.includes(word))) {
    return hindi
      ? "किसी को OTP, पासवर्ड या PIN मत बताइए। केवल आधिकारिक ऐप या हेल्पलाइन का इस्तेमाल करें।"
      : "Never share an OTP, password, or PIN. Use only an official app or helpline.";
  }
  if (["bank", "payment", "पैसा", "बैंक", "भुगतान"].some((word) => text.includes(word))) {
    return hindi
      ? "पैसे या बैंक से जुड़ी मदद के लिए केवल बैंक के आधिकारिक नंबर या ऐप का उपयोग करें।"
      : "For bank or payment help, use only your bank's official number or app.";
  }
  return hindi
    ? "मैंने आपकी बात सुनी। कृपया अपना काम, शहर या संबंधित सरकारी विभाग बताइए। कोई OTP, पासवर्ड या बैंक जानकारी साझा न करें।"
    : "I heard you. Please tell me the task, your city, or the relevant department. Do not share OTPs, passwords, or bank details.";
}
