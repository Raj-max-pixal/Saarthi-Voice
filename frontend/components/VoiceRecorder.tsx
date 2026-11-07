"use client";

import { useEffect, useRef, useState } from "react";

type Props = { disabled: boolean; onRecording: (audio: Blob) => void };

const MAX_RECORDING_SECONDS = 30;
const MIN_AUDIO_PEAK = 0.001;

export function VoiceRecorder({ disabled, onRecording }: Props) {
  const stream = useRef<MediaStream | null>(null);
  const context = useRef<AudioContext | null>(null);
  const processor = useRef<ScriptProcessorNode | null>(null);
  const source = useRef<MediaStreamAudioSourceNode | null>(null);
  const silentOutput = useRef<GainNode | null>(null);
  const chunks = useRef<Float32Array[]>([]);
  const sampleRate = useRef(16_000);
  const recordingRef = useRef(false);
  const stopTimer = useRef<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!recording) return;

    const timer = window.setInterval(() => {
      setSeconds((value) => Math.min(value + 1, MAX_RECORDING_SECONDS));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => () => {
    recordingRef.current = false;
    releaseAudio();
  }, []);

  async function toggle() {
    setError("");
    if (recordingRef.current) {
      await stopRecording();
      return;
    }

    await startRecording();
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Voice recording needs a modern browser and a secure HTTPS connection.");
      return;
    }

    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      stream.current = nextStream;
      const nextContext = new AudioContext();
      context.current = nextContext;
      await nextContext.resume();

      const nextSource = nextContext.createMediaStreamSource(nextStream);
      const nextProcessor = nextContext.createScriptProcessor(4096, 1, 1);
      const nextSilentOutput = nextContext.createGain();
      nextSilentOutput.gain.value = 0;

      chunks.current = [];
      sampleRate.current = nextContext.sampleRate;
      nextProcessor.onaudioprocess = (event) => {
        if (!recordingRef.current) return;
        chunks.current.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      };

      nextSource.connect(nextProcessor);
      nextProcessor.connect(nextSilentOutput);
      nextSilentOutput.connect(nextContext.destination);

      processor.current = nextProcessor;
      source.current = nextSource;
      silentOutput.current = nextSilentOutput;
      recordingRef.current = true;
      stopTimer.current = window.setTimeout(() => void stopRecording(true), MAX_RECORDING_SECONDS * 1000);
      setSeconds(0);
      setRecording(true);
    } catch (caught) {
      releaseAudio();
      const name = caught instanceof DOMException ? caught.name : "";
      setError(
        name === "NotAllowedError"
          ? "Microphone permission was blocked. Allow it in your browser settings and try again."
          : "The microphone could not start. Check that another app is not using it.",
      );
    }
  }

  async function stopRecording(automatic = false) {
    if (!recordingRef.current) return;

    recordingRef.current = false;
    setRecording(false);
    processor.current?.disconnect();
    source.current?.disconnect();
    silentOutput.current?.disconnect();
    stream.current?.getTracks().forEach((track) => track.stop());
    await context.current?.close().catch(() => undefined);

    const recordedChunks = chunks.current;
    const recordedRate = sampleRate.current;
    releaseAudio();

    if (!recordedChunks.length || peakLevel(recordedChunks) < MIN_AUDIO_PEAK) {
      setError("No voice was captured. Check the selected microphone and try again.");
      return;
    }

    if (automatic) setSeconds(MAX_RECORDING_SECONDS);
    onRecording(toWav(recordedChunks, recordedRate));
  }

  function releaseAudio() {
    if (stopTimer.current !== null) window.clearTimeout(stopTimer.current);
    stopTimer.current = null;
    processor.current?.disconnect();
    source.current?.disconnect();
    silentOutput.current?.disconnect();
    stream.current?.getTracks().forEach((track) => track.stop());
    if (context.current && context.current.state !== "closed") {
      void context.current.close().catch(() => undefined);
    }
    processor.current = null;
    source.current = null;
    silentOutput.current = null;
    stream.current = null;
    context.current = null;
  }

  return (
    <div className="text-center">
      <div className="relative mx-auto h-40 w-40">
        <div className={`absolute inset-0 rounded-full ${recording ? "recording-ring" : "bg-[#d8cbf9]"}`} />
        <button
          onClick={toggle}
          disabled={disabled}
          className={`relative mx-auto flex h-40 w-40 items-center justify-center rounded-full border-8 border-white text-4xl shadow-xl transition ${recording ? "bg-[#ed4d54]" : "bg-gradient-to-br from-[#9a76f0] to-[#6d37d5] hover:scale-105"} disabled:cursor-not-allowed disabled:opacity-50`}
          aria-label={recording ? "Stop recording" : "Start recording"}
        >
          {recording ? "■" : "🎙"}
        </button>
      </div>
      <div className="mt-6 flex justify-center gap-1" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, index) => (
          <span key={index} className={`wave-bar ${recording ? "is-active" : ""}`} style={{ animationDelay: `${index * 90}ms` }} />
        ))}
      </div>
      <p className="mt-4 text-lg font-bold text-[#2a2038]">
        {recording ? `Listening · 00:${seconds.toString().padStart(2, "0")}` : disabled ? "Saarthi is preparing your response…" : "Tap once to speak"}
      </p>
      {recording && <p className="mt-1 text-sm text-[#d3444e]">Tap again when you are finished</p>}
      {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
      <p className="mt-3 text-sm text-slate-500">Clear speech works best · maximum 30 seconds</p>
    </div>
  );
}

function peakLevel(chunks: Float32Array[]) {
  let peak = 0;
  for (const chunk of chunks) {
    for (const sample of chunk) peak = Math.max(peak, Math.abs(sample));
  }
  return peak;
}

function toWav(chunks: Float32Array[], sampleRate: number) {
  const size = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const output = new Int16Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    for (let index = 0; index < chunk.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, chunk[index]));
      output[offset++] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }
  }

  const buffer = new ArrayBuffer(44 + output.byteLength);
  const view = new DataView(buffer);
  const write = (position: number, value: string) => {
    [...value].forEach((character, index) => view.setUint8(position + index, character.charCodeAt(0)));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + output.byteLength, true);
  write(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, output.byteLength, true);
  new Int16Array(buffer, 44).set(output);
  return new Blob([buffer], { type: "audio/wav" });
}
