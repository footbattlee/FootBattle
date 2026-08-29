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

export default function PenaltyPage() {
  const pitchRef = useRef<HTMLDivElement>(null);
  const ballRef = useRef<HTMLButtonElement>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [aim, setAim] = useState<Point>({ x: 50, y: 28 });
  const [ball, setBall] = useState<Point>(BALL_START);
  const [arrowStart, setArrowStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [keeper, setKeeper] = useState<Point>(KEEPER_START);
  const [keeperDive, setKeeperDive] = useState<-1 | 0 | 1>(0);
  const [shot, setShot] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [marks, setMarks] = useState<ShotMark[]>(Array(TOTAL_SHOTS).fill(null));

  useEffect(() => {
    const b = document.body.style.overscrollBehaviorY;
    const h = document.documentElement.style.overscrollBehaviorY;
    document.body.style.overscrollBehaviorY = "none";
    document.documentElement.style.overscrollBehaviorY = "none";
    const node = pitchRef.current;
    const stop = (e: TouchEvent) => { if (phase === "aiming") e.preventDefault(); };
    node?.addEventListener("touchmove", stop, { passive: false });
    return () => {
      node?.removeEventListener("touchmove", stop);
      document.body.style.overscrollBehaviorY = b;
      document.documentElement.style.overscrollBehaviorY = h;
    };
  }, [phase]);

  const finished = shot >= TOTAL_SHOTS;
  const power = Math.round(Math.min(1, Math.hypot(dragOffset.x, dragOffset.y) / 27) * 100);

  function measureBallCenter() {
    const pitch = pitchRef.current?.getBoundingClientRect();
    const ballBox = ballRef.current?.getBoundingClientRect();
    if (!pitch || !ballBox) return;
    setArrowStart({
      x: ballBox.left + ballBox.width / 2 - pitch.left,
      y: ballBox.top + ballBox.height / 2 - pitch.top,
    });
  }

  function updateAim(clientX: number, clientY: number) {
    const start = dragStartRef.current;
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!start || !rect) return;
    const dx = Math.max(-22, Math.min(22, ((clientX - start.clientX) / rect.width) * 100));
    const dy = Math.max(0, Math.min(18, ((clientY - start.clientY) / rect.height) * 100));
    setDragOffset({ x: dx, y: dy });
    setAim({
      x: Math.max(AIM.left, Math.min(AIM.right, 50 - dx * 1.22)),
      y: Math.max(AIM.top, Math.min(AIM.bottom, AIM.bottom - dy * 0.55)),
    });
  }

  function onMove(event: PointerEvent<HTMLDivElement>) {
    if (phase !== "aiming") return;
    event.preventDefault();
    measureBallCenter();
    updateAim(event.clientX, event.clientY);
  }

  function onBallDown(event: PointerEvent<HTMLButtonElement>) {
    if (phase !== "ready") return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = { clientX: event.clientX, clientY: event.clientY };
    measureBallCenter();
    setPhase("aiming");
  }

  function releaseShot() {
    if (phase !== "aiming") return;
    setPhase("shooting");
    dragStartRef.current = null;

    const target = aim;
    const reads = Math.random() < 0.7;
    const dive: -1 | 0 | 1 = reads
      ? target.x < 44 ? -1 : target.x > 56 ? 1 : 0
      : ([-1, 0, 1][Math.floor(Math.random() * 3)] as -1 | 0 | 1);
    const keeperTarget: Point = {
      x: dive === -1 ? 37 : dive === 1 ? 63 : 50,
      y: target.y < 26 ? 25.5 : 28,
    };

    setKeeperDive(dive);
    setKeeper(keeperTarget);
    setBall(target);

    window.setTimeout(() => {
      const horizontal = Math.abs(target.x - keeperTarget.x);
      const vertical = Math.abs(target.y - keeperTarget.y);
      const saved = horizontal <= (dive === 0 ? 10.5 : 13) && vertical <= 7.2;
      const nextResult: Result = saved ? "saved" : "goal";

      if (saved) {
        setBall({ x: keeperTarget.x + dive * 1.5, y: keeperTarget.y + 1.2 });
        setStreak(0);
      } else {
        const corner = Math.abs(target.x - 50) > 20 || target.y < 24.5;
        setScore((v) => v + 100 + (corner ? 50 : 0) + Math.min(streak, 4) * 20);
        setStreak((v) => v + 1);
      }

      setMarks((old) => old.map((m, i) => i === shot ? nextResult : m));
      setResult(nextResult);
      setPhase("resolved");
    }, 460);
  }

  function resetForNext() {
    setResult(null);
    setBall(BALL_START);
    setAim({ x: 50, y: 28 });
    setKeeper(KEEPER_START);
    setKeeperDive(0);
    setDragOffset({ x: 0, y: 0 });
    setPhase("ready");
  }

  function next() { setShot((v) => v + 1); resetForNext(); }
  function restart() { setShot(0); setScore(0); setStreak(0); setMarks(Array(TOTAL_SHOTS).fill(null)); resetForNext(); }

  const isIdle = phase === "ready" || phase === "aiming";
  const pitchRect = pitchRef.current?.getBoundingClientRect();
  const aimPx = pitchRect ? { x: (aim.x / 100) * pitchRect.width, y: (aim.y / 100) * pitchRect.height } : { x: 0, y: 0 };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#06152b] text-white select-none">
      <div className="mx-auto max-w-md pb-[max(18px,env(safe-area-inset-bottom))]">
        <header className="flex items-center justify-between bg-[#071d3c] px-3 py-3">
          <Link href="/tr" className="flex items-center gap-2 rounded-xl px-1 py-1 active:scale-95">
            <span className="text-xl">←</span><span className="text-2xl">⚽</span>
            <span className="text-[20px] font-black italic">FOOT<span className="text-emerald-400">BATTLE</span></span>
          </Link>
          <div className="flex gap-2 text-lg"><span className="rounded-xl border border-cyan-300/20 bg-[#061a34] px-3 py-2">🔊</span><span className="rounded-xl border border-cyan-300/20 bg-[#061a34] px-3 py-2">Ⅱ</span></div>
        </header>

        <div className="grid grid-cols-3 gap-2 bg-[#071d3c] px-3 pb-3">
          <Stat label="ŞUT" value={`⚽ ${Math.min(shot + 1, TOTAL_SHOTS)}/${TOTAL_SHOTS}`} />
          <Stat label="SERİ" value={`🔥 x${streak}`} />
          <Stat label="SKOR" value={`🏆 ${score.toLocaleString("tr-TR")}`} />
        </div>

        {!finished ? (
          <div
            ref={pitchRef}
            onPointerMove={onMove}
            onPointerUp={releaseShot}
            onPointerCancel={() => { if (phase === "aiming") { setPhase("ready"); setDragOffset({ x: 0, y: 0 }); } }}
            className="relative aspect-[9/12.3] overflow-hidden touch-none"
            style={{ overscrollBehavior: "none", WebkitUserSelect: "none", background: "repeating-linear-gradient(0deg,#269b43 0 54px,#2eaa49 54px 108px)" }}
          >
            <div className="absolute inset-x-0 top-0 h-[20.5%] bg-gradient-to-b from-[#06132a] via-[#0b2744] to-[#163d55]" />
            <div className="absolute inset-x-0 top-[2%] h-[15%] opacity-85" style={{ backgroundImage: "radial-gradient(circle,#d99b56 1.1px,transparent 1.4px),radial-gradient(circle,#b5cadf 1.1px,transparent 1.4px),radial-gradient(circle,#587ba1 1.1px,transparent 1.4px)", backgroundPosition: "0 0,6px 5px,11px 2px", backgroundSize: "13px 11px" }} />
            <div className="absolute inset-x-0 top-[17.5%] h-[3%] border-y border-white/15 bg-[#12364b]"><div className="flex h-full items-center justify-around text-[9px] font-black italic text-emerald-300/85"><span>FOOTBATTLE</span><span>FOOTBATTLE</span><span>FOOTBATTLE</span></div></div>

            <div className="absolute left-[21%] right-[21%] top-[20.5%] z-10 h-[13.5%]">
              <div className="absolute inset-0 border-x-[3px] border-t-[3px] border-white bg-[#218f46] shadow-[0_4px_0_rgba(0,0,0,.22)]" />
              <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white" />
              <div className="absolute inset-[3px] opacity-45" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.72) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.72) 1px,transparent 1px)", backgroundSize: "15px 15px" }} />
            </div>

            <div className="absolute left-[7%] right-[7%] top-[34%] h-[25%] border-2 border-t-0 border-white/90" />
            <div className="absolute left-[7%] right-[7%] top-[34%] h-[1.5px] bg-white/90" />
            <div className="absolute left-1/2 top-[58.8%] h-[11%] w-[38%] -translate-x-1/2 rounded-b-full border-x-2 border-b-2 border-white/85" />
            <div className="absolute left-1/2 top-[50.5%] h-2 w-2 -translate-x-1/2 rounded-full bg-white/95" />

            <div
              className="absolute z-20 transition-[left,top,transform] duration-[420ms] ease-out"
              style={{
                left: `${keeper.x}%`,
                top: `${keeper.y}%`,
                transform: `translate(-50%,-50%) rotate(${keeperDive * 24}deg)`,
                animation: isIdle ? "keeperIdle 1.15s ease-in-out infinite" : "none",
              }}
            >
              <Keeper />
            </div>

            {phase === "aiming" && (
              <svg className="pointer-events-none absolute inset-0 z-30 h-full w-full">
                <defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#ffd93d" /></marker></defs>
                <line x1={arrowStart.x} y1={arrowStart.y} x2={aimPx.x} y2={aimPx.y} stroke="#ffd93d" strokeWidth="2.4" strokeLinecap="round" markerEnd="url(#arrow)" />
                <circle cx={aimPx.x} cy={aimPx.y} r="6.5" fill="rgba(255,217,61,.06)" stroke="#ffd93d" strokeWidth="1.8" />
              </svg>
            )}

            <button
              ref={ballRef}
              aria-label="Topu nişanla ve bırak"
              onPointerDown={onBallDown}
              disabled={phase !== "ready"}
              className="absolute z-40 -translate-x-1/2 -translate-y-1/2 transition-all duration-[440ms] ease-out disabled:pointer-events-none"
              style={{ left: `${ball.x}%`, top: `${ball.y}%`, touchAction: "none" }}
            >
              <Football />
            </button>

            <div className="absolute left-1/2 top-[80%] z-30 flex -translate-x-1/2 gap-1.5 rounded-full border border-cyan-300/20 bg-[#061f36]/92 px-3 py-2 shadow-lg">
              {marks.map((mark, index) => <span key={index} className="text-[12px]">{mark === "goal" ? "⚽" : mark === "saved" ? "🧤" : "⚪"}</span>)}
            </div>

            {phase === "resolved" ? (
              <div className="absolute bottom-[4%] left-[10%] right-[10%] z-50 flex items-center gap-2">
                <div className={`flex-1 rounded-xl px-3 py-3 text-center text-xs font-black ${result === "goal" ? "bg-emerald-500" : "bg-sky-500"}`}>{result === "goal" ? "⚽ GOL" : "🧤 KURTARIŞ"}</div>
                <button onClick={next} className="rounded-xl bg-yellow-400 px-4 py-3 text-xs font-black text-[#06152b]">{shot + 1 >= TOTAL_SHOTS ? "SONUÇ →" : "SIRADAKİ →"}</button>
              </div>
            ) : (
              <div className="absolute bottom-[4%] left-[8%] right-[8%] z-40 rounded-xl border border-cyan-300/20 bg-[#061f36]/95 px-3 py-3 text-center text-[11px] font-black shadow-xl">
                {phase === "shooting" ? "ŞUT..." : phase === "aiming" ? `GÜÇ %${power} • BIRAK VE ŞUT ÇEK` : "✋ TOPA BAS • GERİ/YANA ÇEK • BIRAK"}
              </div>
            )}

            <style jsx>{`
              @keyframes keeperIdle {
                0%,100% { transform: translate(-50%,-50%) translateY(0) scaleY(1); }
                50% { transform: translate(-50%,-50%) translateY(-2px) scaleY(.985); }
              }
            `}</style>
          </div>
        ) : (
          <div className="m-4 rounded-3xl border border-cyan-300/20 bg-[#07264d] p-8 text-center">
            <div className="text-6xl">🏆</div><h2 className="mt-4 text-3xl font-black">Seri Bitti</h2><p className="mt-2 text-slate-300">10 penaltı sonunda skorun</p><p className="mt-5 text-5xl font-black text-yellow-300">{score.toLocaleString("tr-TR")}</p>
            <button onClick={restart} className="mt-8 w-full rounded-2xl bg-emerald-400 py-4 font-black text-[#05294a]">TEKRAR OYNA</button>
            <Link href="/tr" className="mt-3 block w-full rounded-2xl border border-white/15 bg-white/5 py-3 text-sm font-black text-white">ANA SAYFAYA DÖN</Link>
          </div>
        )}
      </div>
    </main>
  );
}

function Keeper() {
  return (
    <div className="relative h-[64px] w-[58px] drop-shadow-[0_3px_3px_rgba(0,0,0,.35)]">
      <div className="absolute left-1/2 top-0 h-[15px] w-[15px] -translate-x-1/2 rounded-full border border-[#2e231c] bg-[#b9784b]" />
      <div className="absolute left-1/2 top-[13px] h-[27px] w-[24px] -translate-x-1/2 rounded-t-[8px] bg-[#176b38]"><span className="absolute left-1/2 top-[5px] -translate-x-1/2 text-[8px] font-black text-white">1</span></div>
      <div className="absolute left-[1px] top-[17px] h-[6px] w-[22px] origin-right -rotate-[17deg] rounded-full bg-[#176b38]" />
      <div className="absolute right-[1px] top-[17px] h-[6px] w-[22px] origin-left rotate-[17deg] rounded-full bg-[#176b38]" />
      <div className="absolute left-0 top-[13px] h-[10px] w-[8px] rounded bg-[#f4c430]" />
      <div className="absolute right-0 top-[13px] h-[10px] w-[8px] rounded bg-[#f4c430]" />
      <div className="absolute bottom-[3px] left-[19px] h-[23px] w-[7px] rounded bg-[#121b2c]" />
      <div className="absolute bottom-[3px] right-[19px] h-[23px] w-[7px] rounded bg-[#121b2c]" />
      <div className="absolute bottom-0 left-[13px] h-[5px] w-[18px] rounded-full bg-white" />
      <div className="absolute bottom-0 right-[13px] h-[5px] w-[18px] rounded-full bg-white" />
    </div>
  );
}

function Football() {
  return <span className="block text-[28px] leading-none drop-shadow-[0_5px_5px_rgba(0,0,0,.32)]">⚽</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-cyan-300/15 bg-[#061a34] px-2 py-2.5 text-center"><p className="text-[9px] font-black text-slate-400">{label}</p><p className="mt-1 text-[14px] font-black text-white">{value}</p></div>;
}