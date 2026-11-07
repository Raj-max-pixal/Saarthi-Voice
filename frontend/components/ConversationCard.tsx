"use client";
import { useEffect, useMemo, useState } from "react";
import type { VoiceTurn } from "@/lib/api";

export function ConversationCard({ turn }: { turn: VoiceTurn }) {
  const [playing, setPlaying] = useState(false);
  const src = useMemo(() => `data:${turn.audio_mime_type};base64,${turn.audio_base64}`, [turn]);
  useEffect(() => { const audio = new Audio(src); audio.onended = () => setPlaying(false); return () => audio.pause(); }, [src]);
  const play = () => { const audio = new Audio(src); audio.onended = () => setPlaying(false); setPlaying(true); audio.play(); };
  return <section className="mt-6 space-y-4 rounded-[24px] border border-[#e5dcfc] bg-[#f5f0ff] p-5 shadow-sm">
    <div><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#7650d9]">Prisma transcription · {turn.detected_language}</p><p className="text-sm font-semibold leading-relaxed text-[#241b32]">“{turn.transcript}”</p></div>
    <div className="border-t border-[#e1d7fa] pt-4"><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#7650d9]">{turn.response_engine}</p><p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{turn.answer}</p></div>
    <button onClick={play} disabled={playing} className="inline-flex items-center gap-2 rounded-full bg-[#7650d9] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#633ac6] disabled:opacity-60">{playing ? "Playing response…" : "▶ Listen to answer"}</button>
  </section>;
}
