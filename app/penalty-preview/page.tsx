"use client";

import Link from "next/link";
import { PointerEvent, useEffect, useRef, useState } from "react";

const TOTAL_SHOTS = 10;
type Point = { x: number; y: number };
type Result = "goal" | "saved";
type Phase = "ready" | "aiming" | "shooting" | "resolved";
type ShotMark = "goal" | "saved" | null;

const BALL_START: Point = { x: 50, y: 70 };
const KEEPER_START: Point = { x: 50, y: 28 };
const AIM = { left: 23, right: 77, top: 22.5, bottom: 32.5 };

export default function PenaltyPreviewPage() {
  const pitchRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const scrollLockRef = useRef<{ y: number; body: string; html: string } | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [aim, setAim] = useState<Point>({ x: 50, y: 28 });
  const [ball, setBall] = useState<Point>(BALL_START);
  const [keeper, setKeeper] = useState<Point>(KEEPER_START);
  const [keeperDive, setKeeperDive] = useState<-1 | 0 | 1>(0);
  const [shot, setShot] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [marks, setMarks] = useState<ShotMark[]>(Array(TOTAL_SHOTS).fill(null));

  const finished = shot >= TOTAL_SHOTS;
  const power = Math.round(Math.min(1, Math.hypot(dragOffset.x, dragOffset.y) / 27) * 100);

  useEffect(() => () => unlockPage(), []);

  function lockPage() {
    if (scrollLockRef.current) return;
    const y = window.scrollY;
    scrollLockRef.current = {
      y,
      body: document.body.style.cssText,
      html: document.documentElement.style.cssText,
    };
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.position = "fixed";
    document.body.style.top = `-${y}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
  }

  function unlockPage() {
    const previous = scrollLockRef.current;
    if (!previous) return;
    document.body.style.cssText = previous.body;
    document.documentElement.style.cssText = previous.html;
    window.scrollTo(0, previous.y);
    scrollLockRef.current = null;
  }

  function updateAim(clientX: number, clientY: number) {
    const start = dragStartRef.current;
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!start || !rect) return;

    // Güç hesabı için mevcut drag aralığını koruyoruz.
    const dx = Math.max(-22, Math.min(22, ((clientX - start.clientX) / rect.width) * 100));
    const dy = Math.max(0, Math.min(18, ((clientY - start.clientY) / rect.height) * 100));
    setDragOffset({ x: dx, y: dy });

    // Sadece aim hassasiyeti yükseltildi: daha kısa hareketle kalenin tamamına erişilir.
    setAim({
      x: Math.max(AIM.left, Math.min(AIM.right, 50 - dx * 1.7)),
      y: Math.max(AIM.top, Math.min(AIM.bottom, AIM.bottom - dy * 0.9)),
    });
  }

  function onBallDown(event: PointerEvent<HTMLButtonElement>) {
    if (phase !== "ready") return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    lockPage();
    dragStartRef.current = { clientX: event.clientX, clientY: event.clientY };
    setPhase("aiming");
  }

  function onMove(event: PointerEvent<HTMLDivElement>) {
    if (phase !== "aiming") return;
    event.preventDefault();
    updateAim(event.clientX, event.clientY);
  }

  function cancelAim() {
    if (phase !== "aiming") return;
    dragStartRef.current = null;
    unlockPage();
    setDragOffset({ x: 0, y: 0 });
    setAim({ x: 50, y: 28 });
    setPhase("ready");
  }

  function releaseShot() {
    if (phase !== "aiming") return;
    unlockPage();
    setPhase("shooting");
    dragStartRef.current = null;

    const target = aim;
    const targetDirection: -1 | 0 | 1 = target.x < 44 ? -1 : target.x > 56 ? 1 : 0;
    const readsShot = Math.random() < 0.65;
    let dive: -1 | 0 | 1;

    if (readsShot) dive = targetDirection;
    else {
      const alternatives = ([-1, 0, 1] as const).filter((direction) => direction !== targetDirection);
      dive = alternatives[Math.floor(Math.random() * alternatives.length)];
    }

    const keeperTarget: Point = {
      x: dive === -1 ? 37 : dive === 1 ? 63 : 50,
      y: Math.random() < 0.5 ? 25.5 : 28,
    };

    setKeeperDive(dive);
    setKeeper(keeperTarget);
    setBall(target);

    window.setTimeout(() => {
      // Canlıdaki kurtarış hesabı aynen korunuyor.
      const horizontal = Math.abs(target.x - keeperTarget.x);
      const vertical = Math.abs(target.y - keeperTarget.y);
      const inReach = horizontal <= (dive === 0 ? 10.5 : 13) && vertical <= 7.2;
      const horizontalPlacement = Math.min(1, Math.abs(target.x - 50) / 27);
      const verticalPlacement = Math.min(1, Math.max(0, (AIM.bottom - target.y) / (AIM.bottom - AIM.top)));
      const placementQuality = horizontalPlacement * 0.6 + verticalPlacement * 0.4;
      const powerQuality = power / 100;
      const isTopCorner = horizontalPlacement >= 0.82 && verticalPlacement >= 0.72;
      let saveChance = 0.82 - placementQuality * 0.25 - powerQuality * 0.1;
      if (isTopCorner) saveChance = Math.min(saveChance, 0.4);
      saveChance = Math.max(0.25, Math.min(0.82, saveChance));
      const saved = inReach && Math.random() < saveChance;
      const nextResult: Result = saved ? "saved" : "goal";

      if (saved) {
        const side = dive !== 0 ? dive : target.x < keeperTarget.x ? -1 : 1;
        setBall({ x: keeperTarget.x + side * (dive === 0 ? 4.2 : 5.6), y: keeperTarget.y - 1.2 });
        setStreak(0);
      } else {
        const corner = Math.abs(target.x - 50) > 20 || target.y < 24.5;
        const scoreGain = 100 + (corner ? 50 : 0) + Math.min(streak, 4) * 20;
        setScore((v) => v + scoreGain);
        setStreak((v) => v + 1);
      }

      setMarks((old) => old.map((m, i) => i === shot ? nextResult : m));
      setResult(nextResult);
      setPhase("resolved");
    }, 460);
  }

  function next() {
    setShot((v) => v + 1);
    setResult(null);
    setBall(BALL_START);
    setAim({ x: 50, y: 28 });
    setKeeper(KEEPER_START);
    setKeeperDive(0);
    setDragOffset({ x: 0, y: 0 });
    setPhase("ready");
  }

  function restart() {
    setShot(0);
    setScore(0);
    setStreak(0);
    setMarks(Array(TOTAL_SHOTS).fill(null));
    setResult(null);
    setBall(BALL_START);
    setAim({ x: 50, y: 28 });
    setKeeper(KEEPER_START);
    setKeeperDive(0);
    setDragOffset({ x: 0, y: 0 });
    setPhase("ready");
  }

  const keeperPose = phase === "shooting"
    ? keeperDive < 0 ? "keeperDiveLeft" : keeperDive > 0 ? "keeperDiveRight" : "keeperCenterSave"
    : phase === "resolved" && keeperDive !== 0
      ? "keeperHold"
      : "keeperIdle";

  return <main className="min-h-[100svh] overflow-x-hidden bg-[#06152b] text-white select-none">
    <div className="mx-auto max-w-md">
      <header className="flex items-center justify-between bg-[#071d3c] px-3 py-3">
        <Link href="/tr" className="flex items-center gap-2 rounded-xl px-1 py-1"><span className="text-xl">←</span><img src="/footbattle-logo.png" alt="FootBattle" className="h-10 w-auto" /></Link>
        <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-black tracking-wider text-emerald-200">PREVIEW</span>
      </header>
      <div className="grid grid-cols-3 gap-2 bg-[#071d3c] px-3 pb-3">
        <Stat label="ŞUT" value={`⚽ ${Math.min(shot + 1, TOTAL_SHOTS)}/${TOTAL_SHOTS}`} />
        <Stat label="SERİ" value={`🔥 x${streak}`} />
        <Stat label="SKOR" value={`🏆 ${score.toLocaleString("tr-TR")}`} />
      </div>

      {!finished ? <div
        ref={pitchRef}
        onPointerMove={onMove}
        onPointerUp={releaseShot}
        onPointerCancel={cancelAim}
        className="relative aspect-[9/12.3] overflow-hidden"
        style={{ touchAction: "none", overscrollBehavior: "none", WebkitUserSelect: "none", background: "repeating-linear-gradient(0deg,#269b43 0 54px,#2eaa49 54px 108px)" }}
      >
        <div className="absolute inset-x-0 top-0 h-[20.5%] bg-gradient-to-b from-[#07142b] via-[#0d2945] to-[#173d54]" />
        <div className="absolute inset-x-0 top-[17.5%] h-[3%] border-y border-white/15 bg-[#12364b] text-center text-[9px] font-black italic leading-[18px] text-emerald-300/85">FOOTBATTLE · FOOTBATTLE · FOOTBATTLE</div>
        <div className="absolute left-[21%] right-[21%] top-[20.5%] z-10 h-[13.5%]">
          <div className="absolute inset-0 border-x-[3px] border-t-[3px] border-white bg-[#218f46] shadow-[0_4px_0_rgba(0,0,0,.22)]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-white/90" />
          <div className="absolute inset-[3px] opacity-45" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.72) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.72) 1px,transparent 1px)", backgroundSize: "15px 15px" }} />
        </div>
        <div className="absolute left-[7%] right-[7%] top-[34%] h-[25%] border border-t-0 border-white/80" />
        <div className="absolute left-1/2 top-[50.5%] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/90" />

        <div className="absolute z-20 transition-[left,top] duration-[420ms] ease-out" style={{ left: `${keeper.x}%`, top: `${keeper.y}%`, transform: "translate(-50%,-50%)" }}>
          <div
            className="origin-[50%_62%]"
            style={{
              animation: keeperPose === "keeperHold" ? "none" : `${keeperPose} ${keeperPose === "keeperIdle" ? "1.15s" : "460ms"} ${keeperPose === "keeperIdle" ? "ease-in-out infinite" : "cubic-bezier(.2,.72,.26,1) both"}`,
              transform: keeperPose === "keeperHold" ? `translateY(-3px) rotate(${keeperDive * 12}deg)` : undefined,
            }}
          ><Keeper /></div>
        </div>

        {phase === "aiming" && <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-30 h-full w-full">
          <defs><marker id="preview-arrow" markerWidth="4" markerHeight="4" refX="3.5" refY="2" orient="auto"><path d="M0,0 L0,4 L4,2 z" fill="#ffd93d" /></marker></defs>
          <line x1="50" y1="70" x2={aim.x} y2={aim.y} stroke="#ffd93d" strokeWidth="0.55" vectorEffect="non-scaling-stroke" strokeLinecap="round" markerEnd="url(#preview-arrow)" />
          <circle cx={aim.x} cy={aim.y} r="1.7" fill="rgba(255,217,61,.06)" stroke="#ffd93d" strokeWidth="0.45" vectorEffect="non-scaling-stroke" />
        </svg>}

        <button ref={undefined} aria-label="Topu nişanla ve bırak" onPointerDown={onBallDown} disabled={phase !== "ready"} className="absolute z-40 -translate-x-1/2 -translate-y-1/2 transition-all duration-[440ms] ease-out disabled:pointer-events-none" style={{ left: `${ball.x}%`, top: `${ball.y}%`, touchAction: "none" }}><Football /></button>

        <div className="absolute left-1/2 top-[80%] z-30 flex -translate-x-1/2 gap-1.5 rounded-full border border-cyan-300/20 bg-[#061f36]/92 px-3 py-2 shadow-lg">{marks.map((mark, index) => <span key={index} className="text-[12px]">{mark === "goal" ? "⚽" : mark === "saved" ? "🧤" : "⚪"}</span>)}</div>
        {phase === "resolved" ? <div className="absolute bottom-[4%] left-[10%] right-[10%] z-50 flex items-center gap-2"><div className={`flex-1 rounded-xl px-3 py-3 text-center text-xs font-black ${result === "goal" ? "bg-emerald-500" : "bg-sky-500"}`}>{result === "goal" ? "⚽ GOL" : "🧤 KURTARIŞ"}</div><button onClick={next} className="rounded-xl bg-yellow-400 px-4 py-3 text-xs font-black text-[#06152b]">{shot + 1 >= TOTAL_SHOTS ? "SONUÇ →" : "SIRADAKİ →"}</button></div> : <div className="absolute bottom-[4%] left-[8%] right-[8%] z-40 rounded-xl border border-cyan-300/20 bg-[#061f36]/95 px-3 py-3 text-center text-[11px] font-black shadow-xl">{phase === "shooting" ? "ŞUT..." : phase === "aiming" ? `GÜÇ %${power} • BIRAK VE ŞUT ÇEK` : "✋ TOPA BAS • KISA GERİ/YANA ÇEK • BIRAK"}</div>}

        <style jsx>{`
          @keyframes keeperIdle { 0%,100% { transform: translateY(0) rotate(-1deg); } 50% { transform: translateY(-2px) rotate(1deg); } }
          @keyframes keeperDiveLeft { 0% { transform: translateY(0) scaleY(1) rotate(0deg); } 14% { transform: translateY(2px) scaleY(.96) rotate(-2deg); } 42% { transform: translateY(-8px) scaleY(1.01) rotate(-8deg); } 76% { transform: translateY(-10px) scaleY(1) rotate(-14deg); } 100% { transform: translateY(-3px) scaleY(1) rotate(-12deg); } }
          @keyframes keeperDiveRight { 0% { transform: translateY(0) scaleY(1) rotate(0deg); } 14% { transform: translateY(2px) scaleY(.96) rotate(2deg); } 42% { transform: translateY(-8px) scaleY(1.01) rotate(8deg); } 76% { transform: translateY(-10px) scaleY(1) rotate(14deg); } 100% { transform: translateY(-3px) scaleY(1) rotate(12deg); } }
          @keyframes keeperCenterSave { 0% { transform: translateY(0) scaleY(1); } 20% { transform: translateY(2px) scaleY(.95); } 55% { transform: translateY(-8px) scaleY(1.03); } 100% { transform: translateY(-2px) scaleY(1); } }
        `}</style>
      </div> : <div className="m-4 rounded-3xl border border-cyan-300/20 bg-[#07264d] p-8 text-center"><div className="text-6xl">🏆</div><h2 className="mt-4 text-3xl font-black">Seri Bitti</h2><p className="mt-2 text-slate-300">10 şut sonunda skorun</p><p className="mt-5 text-5xl font-black text-yellow-300">{score.toLocaleString("tr-TR")}</p><button onClick={restart} className="mt-8 w-full rounded-2xl bg-emerald-400 py-4 font-black text-[#05294a]">TEKRAR OYNA</button></div>}
    </div>
  </main>;
}

function Keeper() {
  return <svg width="68" height="80" viewBox="0 0 68 80" aria-hidden="true" className="drop-shadow-[0_3px_3px_rgba(0,0,0,.32)]">
    <ellipse cx="34" cy="78" rx="20" ry="1.6" fill="rgba(0,0,0,.20)" />
    <circle cx="34" cy="10" r="7.5" fill="#b9784b" stroke="#2c211b" strokeWidth="1" />
    <path d="M27 8 Q29 1 34 1 Q40 1 42 7 Q37 5 28 7 Z" fill="#201a18" />
    <path d="M23 23 Q34 17 45 23 L43 46 Q34 50 25 46 Z" fill="#e96936" stroke="#b94724" strokeWidth="1.1" />
    <text x="34" y="39" textAnchor="middle" fontSize="12" fontWeight="900" fill="#733018">1</text>
    <path d="M24 25 Q18 29 15 37 Q12 42 8 43" fill="none" stroke="#e96936" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M44 25 Q50 29 53 37 Q56 42 60 43" fill="none" stroke="#e96936" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 39 Q4 34 9 34 L13 38 L11 45 Q6 47 3 44 Z" fill="#c9f53d" stroke="#76951e" strokeWidth="1" />
    <path d="M65 39 Q64 34 59 34 L55 38 L57 45 Q62 47 65 44 Z" fill="#c9f53d" stroke="#76951e" strokeWidth="1" />
    <path d="M25 45 Q34 49 43 45 L42 53 Q34 56 26 53 Z" fill="#17283b" />
    <path d="M27 52 L22 64 L23 72" fill="none" stroke="#17283b" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M41 52 L46 64 L45 72" fill="none" stroke="#17283b" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 71 Q20 69 26 71 L29 75 Q27 78 22 77 L14 76 Q12 73 15 71 Z" fill="#111827" stroke="#05080d" strokeWidth="1" />
    <path d="M42 71 Q48 69 53 72 Q56 75 53 77 L45 77 Q40 77 42 71 Z" fill="#111827" stroke="#05080d" strokeWidth="1" />
  </svg>;
}

function Football() { return <span className="block text-[28px] leading-none drop-shadow-[0_5px_5px_rgba(0,0,0,.32)]">⚽</span>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-cyan-300/15 bg-[#061a34] px-2 py-2.5 text-center"><p className="text-[9px] font-black text-slate-400">{label}</p><p className="mt-1 text-[14px] font-black text-white">{value}</p></div>; }
