"use client";

import { PointerEvent, useMemo, useRef, useState } from "react";

const TOTAL_SHOTS = 10;
type Point = { x: number; y: number };
type Result = "goal" | "saved" | null;

export default function PenaltyPage() {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [aim, setAim] = useState<Point>({ x: 50, y: 34 });
  const [dragging, setDragging] = useState(false);
  const [shot, setShot] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [result, setResult] = useState<Result>(null);
  const [keeper, setKeeper] = useState<Point>({ x: 50, y: 42 });
  const [ball, setBall] = useState<Point>({ x: 50, y: 84 });

  const finished = shot >= TOTAL_SHOTS;
  const hint = useMemo(() => ["Kaleci sola ağırlık veriyor", "Kaleci ortada bekliyor", "Kaleci sağı kolluyor"][shot % 3], [shot]);

  function pointFromEvent(event: PointerEvent<HTMLDivElement>) {
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return aim;
    const x = Math.max(15, Math.min(85, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(14, Math.min(54, ((event.clientY - rect.top) / rect.height) * 100));
    return { x, y };
  }

  function onMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragging || result || finished) return;
    setAim(pointFromEvent(event));
  }

  function shoot() {
    if (result || finished) return;
    setDragging(false);
    const keeperX = 22 + Math.random() * 56;
    const keeperY = 27 + Math.random() * 18;
    const nextKeeper = { x: keeperX, y: keeperY };
    setKeeper(nextKeeper);
    setBall(aim);
    const distance = Math.hypot(aim.x - keeperX, (aim.y - keeperY) * 1.25);
    const saved = distance < 17;
    setResult(saved ? "saved" : "goal");
    if (!saved) {
      const corner = Math.abs(aim.x - 50) > 27 || aim.y < 22;
      const gained = 100 + (corner ? 50 : 0) + Math.min(streak, 4) * 20;
      setScore((v) => v + gained);
      setStreak((v) => v + 1);
    } else setStreak(0);
  }

  function next() {
    setShot((v) => v + 1);
    setResult(null);
    setBall({ x: 50, y: 84 });
    setAim({ x: 50, y: 34 });
    setKeeper({ x: 50, y: 42 });
  }

  function restart() {
    setShot(0); setScore(0); setStreak(0); setResult(null); setAim({ x: 50, y: 34 }); setBall({ x: 50, y: 84 }); setKeeper({ x: 50, y: 42 });
  }

  return <main className="min-h-screen bg-[#06111e] px-3 py-5 text-white select-none">
    <div className="mx-auto max-w-md">
      <div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-400">FootBattle</p><h1 className="text-3xl font-black">Penaltı</h1></div><div className="text-right"><p className="text-xs text-slate-400">SKOR</p><p className="text-2xl font-black text-yellow-300">{score}</p></div></div>
      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs font-bold"><Stat label="ŞUT" value={`${Math.min(shot + 1, TOTAL_SHOTS)}/${TOTAL_SHOTS}`} /><Stat label="SERİ" value={`x${streak}`} /><Stat label="İPUCU" value={hint.replace("Kaleci ", "")} /></div>

      {!finished ? <>
        <div ref={pitchRef} onPointerMove={onMove} onPointerUp={shoot} onPointerCancel={() => setDragging(false)} className="relative aspect-[3/4] overflow-hidden rounded-[28px] border border-emerald-300/20 bg-gradient-to-b from-[#17344a] via-[#14763e] to-[#0a572e] shadow-2xl touch-none">
          <div className="absolute left-[10%] right-[10%] top-[11%] h-[44%] border-4 border-white/90 border-b-white/70 bg-black/5 shadow-[inset_0_0_30px_rgba(255,255,255,.08)]" />
          <div className="absolute left-[10%] right-[10%] top-[11%] h-[44%] opacity-20" style={{backgroundImage:"linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",backgroundSize:"28px 28px"}} />
          <div className="absolute -translate-x-1/2 -translate-y-1/2 text-6xl transition-all duration-500" style={{left:`${keeper.x}%`,top:`${keeper.y}%`}}>🧤</div>
          {!result && <div className="absolute left-1/2 top-[58%] -translate-x-1/2 rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-black backdrop-blur">👀 {hint}</div>}

          {!result && <svg className="pointer-events-none absolute inset-0 h-full w-full"><line x1="50%" y1="84%" x2={`${aim.x}%`} y2={`${aim.y}%`} stroke="rgba(253,224,71,.9)" strokeWidth="3" strokeDasharray="7 6"/><circle cx={`${aim.x}%`} cy={`${aim.y}%`} r="12" fill="none" stroke="rgba(253,224,71,.9)" strokeWidth="3"/></svg>}
          <button aria-label="Topu sürükleyerek nişan al" onPointerDown={(e) => { if(result)return; e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); }} className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-6xl drop-shadow-xl transition-all duration-500 active:scale-110" style={{left:`${ball.x}%`,top:`${ball.y}%`}}>⚽</button>
          <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-[#06111e]/80 p-3 text-center backdrop-blur"><p className="text-xs font-black text-yellow-300">{result ? (result === "goal" ? "⚽ GOL!" : "🧤 KURTARDI!") : "TOPA BASILI TUT • OKU HEDEFLE • BIRAK"}</p></div>
        </div>
        {result && <button onClick={next} className="mt-3 w-full rounded-2xl bg-emerald-400 py-4 text-sm font-black text-[#06111e]">{shot + 1 >= TOTAL_SHOTS ? "SONUCU GÖR" : "SIRADAKİ PENALTI →"}</button>}
      </> : <div className="rounded-[28px] border border-white/10 bg-white/[.04] p-8 text-center"><div className="text-6xl">🏆</div><h2 className="mt-4 text-3xl font-black">Seri Bitti</h2><p className="mt-2 text-slate-400">10 penaltı sonunda skorun</p><p className="mt-5 text-5xl font-black text-yellow-300">{score}</p><button onClick={restart} className="mt-8 w-full rounded-2xl bg-emerald-400 py-4 font-black text-[#06111e]">TEKRAR OYNA</button></div>}
    </div>
  </main>;
}

function Stat({label,value}:{label:string;value:string}) { return <div className="rounded-xl border border-white/10 bg-white/[.04] p-2"><p className="text-[9px] text-slate-500">{label}</p><p className="mt-1 truncate font-black">{value}</p></div> }
