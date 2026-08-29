"use client";

import { PointerEvent, useEffect, useRef, useState } from "react";

const TOTAL_SHOTS = 10;
type Point = { x: number; y: number };
type Result = "goal" | "saved" | null;

const BALL_START: Point = { x: 50, y: 70 };
const GOAL = { left: 21, right: 79, top: 20.5, bottom: 34 };
const AIM = { left: 23, right: 77, top: 22.5, bottom: 32.5 };

export default function PenaltyPage() {
  const pitchRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [aim, setAim] = useState<Point>({ x: 50, y: 28 });
  const [dragging, setDragging] = useState(false);
  const [shot, setShot] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [result, setResult] = useState<Result>(null);
  const [keeper, setKeeper] = useState<Point>({ x: 50, y: 27 });
  const [ball, setBall] = useState<Point>(BALL_START);

  useEffect(() => {
    const bodyOverscroll = document.body.style.overscrollBehaviorY;
    const htmlOverscroll = document.documentElement.style.overscrollBehaviorY;
    document.body.style.overscrollBehaviorY = "none";
    document.documentElement.style.overscrollBehaviorY = "none";

    const node = pitchRef.current;
    const stopRefresh = (event: TouchEvent) => {
      if (dragging) event.preventDefault();
    };
    node?.addEventListener("touchmove", stopRefresh, { passive: false });

    return () => {
      node?.removeEventListener("touchmove", stopRefresh);
      document.body.style.overscrollBehaviorY = bodyOverscroll;
      document.documentElement.style.overscrollBehaviorY = htmlOverscroll;
    };
  }, [dragging]);

  const finished = shot >= TOTAL_SHOTS;
  const power = Math.round(Math.min(1, Math.hypot(dragOffset.x, dragOffset.y) / 27) * 100);

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

  function move(event: PointerEvent<HTMLDivElement>) {
    if (!dragging || result || finished) return;
    event.preventDefault();
    updateAim(event.clientX, event.clientY);
  }

  function shoot() {
    if (!dragging || result || finished) return;
    setDragging(false);
    dragStartRef.current = null;

    const keeperX = 35 + Math.random() * 30;
    const keeperY = 26 + Math.random() * 3;
    setKeeper({ x: keeperX, y: keeperY });
    setBall(aim);

    const saved = Math.hypot(aim.x - keeperX, (aim.y - keeperY) * 1.85) < 10;
    setResult(saved ? "saved" : "goal");

    if (saved) {
      setStreak(0);
    } else {
      const corner = Math.abs(aim.x - 50) > 20 || aim.y < 24.5;
      setScore((value) => value + 100 + (corner ? 50 : 0) + Math.min(streak, 4) * 20);
      setStreak((value) => value + 1);
    }
  }

  function resetShot() {
    setResult(null);
    setBall(BALL_START);
    setAim({ x: 50, y: 28 });
    setKeeper({ x: 50, y: 27 });
    setDragOffset({ x: 0, y: 0 });
  }

  function next() {
    setShot((value) => value + 1);
    resetShot();
  }

  function restart() {
    setShot(0);
    setScore(0);
    setStreak(0);
    resetShot();
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#06152b] text-white select-none">
      <div className="mx-auto max-w-md pb-[max(18px,env(safe-area-inset-bottom))]">
        <header className="flex items-center justify-between bg-[#071d3c] px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl">⚽</span>
            <span className="text-[22px] font-black italic">FOOT<span className="text-emerald-400">BATTLE</span></span>
          </div>
          <div className="flex gap-2 text-lg">
            <span className="rounded-xl border border-cyan-300/20 bg-[#061a34] px-3 py-2">🔊</span>
            <span className="rounded-xl border border-cyan-300/20 bg-[#061a34] px-3 py-2">Ⅱ</span>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-2 bg-[#071d3c] px-3 pb-4">
          <Stat label="ŞUT" value={`⚽ ${Math.min(shot + 1, TOTAL_SHOTS)}/${TOTAL_SHOTS}`} />
          <Stat label="SERİ" value={`🔥 x${streak}`} />
          <Stat label="SKOR" value={`🏆 ${score.toLocaleString("tr-TR")}`} />
        </div>

        {!finished ? (
          <div
            ref={pitchRef}
            onPointerMove={move}
            onPointerUp={shoot}
            onPointerCancel={() => {
              setDragging(false);
              dragStartRef.current = null;
              setDragOffset({ x: 0, y: 0 });
            }}
            className="relative aspect-[9/12.3] overflow-hidden touch-none"
            style={{
              overscrollBehavior: "none",
              WebkitUserSelect: "none",
              background: "repeating-linear-gradient(0deg,#269b43 0 54px,#2eaa49 54px 108px)",
            }}
          >
            <div className="absolute inset-x-0 top-0 h-[20.5%] bg-gradient-to-b from-[#06132a] via-[#0b2744] to-[#163d55]" />
            <div
              className="absolute inset-x-0 top-[2%] h-[15%] opacity-85"
              style={{
                backgroundImage:
                  "radial-gradient(circle,#d99b56 1.1px,transparent 1.4px),radial-gradient(circle,#b5cadf 1.1px,transparent 1.4px),radial-gradient(circle,#587ba1 1.1px,transparent 1.4px)",
                backgroundPosition: "0 0,6px 5px,11px 2px",
                backgroundSize: "13px 11px",
              }}
            />
            <div className="absolute inset-x-0 top-[17.5%] h-[3%] border-y border-white/15 bg-[#12364b]">
              <div className="flex h-full items-center justify-around text-[9px] font-black italic text-emerald-300/85">
                <span>FOOTBATTLE</span><span>FOOTBATTLE</span><span>FOOTBATTLE</span>
              </div>
            </div>

            <div
              className="absolute z-10"
              style={{ left: `${GOAL.left}%`, right: `${100 - GOAL.right}%`, top: `${GOAL.top}%`, height: `${GOAL.bottom - GOAL.top}%` }}
            >
              <div className="absolute inset-0 border-[4px] border-white bg-[#218f46] shadow-[0_5px_0_rgba(0,0,0,.28)]" />
              <div
                className="absolute inset-[4px] opacity-45"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,.72) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.72) 1px,transparent 1px)",
                  backgroundSize: "15px 15px",
                }}
              />
            </div>

            <div className="absolute left-[7%] right-[7%] top-[34%] h-[25%] border-2 border-t-0 border-white/90" />
            <div className="absolute left-[7%] right-[7%] top-[34%] h-[2px] bg-white/90" />
            <div className="absolute left-1/2 top-[58.8%] h-[11%] w-[38%] -translate-x-1/2 rounded-b-full border-x-2 border-b-2 border-white/85" />
            <div className="absolute left-1/2 top-[50.5%] h-2 w-2 -translate-x-1/2 rounded-full bg-white/95" />

            <div
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
              style={{ left: `${keeper.x}%`, top: `${keeper.y}%` }}
            >
              <Keeper />
            </div>

            {!result && dragging && (
              <svg className="pointer-events-none absolute inset-0 z-30 h-full w-full">
                <defs>
                  <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="#ffd93d" />
                  </marker>
                </defs>
                <line
                  x1={`${ball.x}%`}
                  y1={`${ball.y}%`}
                  x2={`${aim.x}%`}
                  y2={`${aim.y}%`}
                  stroke="#ffd93d"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  markerEnd="url(#arrow)"
                />
                <circle cx={`${aim.x}%`} cy={`${aim.y}%`} r="6.5" fill="rgba(255,217,61,.06)" stroke="#ffd93d" strokeWidth="1.8" />
              </svg>
            )}

            <button
              aria-label="Topu geriye çekip bırak"
              onPointerDown={(event) => {
                if (result) return;
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                dragStartRef.current = { clientX: event.clientX, clientY: event.clientY };
                setDragging(true);
              }}
              className="absolute z-40 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 active:scale-110"
              style={{ left: `${ball.x}%`, top: `${ball.y}%`, touchAction: "none" }}
            >
              <Football />
            </button>

            <div className="absolute left-1/2 top-[80%] z-30 flex -translate-x-1/2 gap-1.5 rounded-full border border-cyan-300/20 bg-[#061f36]/92 px-3 py-2 shadow-lg">
              {Array.from({ length: 10 }).map((_, index) => (
                <span key={index} className={`text-[12px] ${index < shot ? "opacity-100" : "opacity-30"}`}>⚽</span>
              ))}
            </div>

            {result ? (
              <button
                onClick={next}
                className="absolute bottom-[5%] left-[5%] right-[5%] z-50 rounded-2xl border-2 border-[#0d3154] bg-gradient-to-b from-[#ffd642] to-[#ffb51e] py-4 text-[15px] font-black text-[#06152b] shadow-[0_5px_0_#0a2744] active:translate-y-0.5"
              >
                {shot + 1 >= TOTAL_SHOTS ? "SONUCU GÖR →" : "SIRADAKİ PENALTI →"}
              </button>
            ) : (
              <div className="absolute bottom-[5%] left-[5%] right-[5%] z-40 rounded-2xl border border-cyan-300/20 bg-[#061f36]/95 px-3 py-3 text-center text-[11px] font-black shadow-xl">
                {dragging ? `GÜÇ %${power} • BIRAK VE ŞUT ÇEK` : "✋ TOPA BAS • GERİYE / YANA ÇEK • BIRAK"}
              </div>
            )}
          </div>
        ) : (
          <div className="m-4 rounded-3xl border border-cyan-300/20 bg-[#07264d] p-8 text-center">
            <div className="text-6xl">🏆</div>
            <h2 className="mt-4 text-3xl font-black">Seri Bitti</h2>
            <p className="mt-2 text-slate-300">10 penaltı sonunda skorun</p>
            <p className="mt-5 text-5xl font-black text-yellow-300">{score.toLocaleString("tr-TR")}</p>
            <button onClick={restart} className="mt-8 w-full rounded-2xl bg-emerald-400 py-4 font-black text-[#05294a]">TEKRAR OYNA</button>
          </div>
        )}
      </div>
    </main>
  );
}

function Keeper() {
  return (
    <div className="relative h-[60px] w-[78px] drop-shadow-[0_3px_3px_rgba(0,0,0,.35)]">
      <div className="absolute left-1/2 top-0 h-[18px] w-[18px] -translate-x-1/2 rounded-full border border-[#2e231c] bg-[#b9784b]" />
      <div className="absolute left-1/2 top-[15px] h-[29px] w-[31px] -translate-x-1/2 rounded-t-[9px] bg-[#176b38]">
        <span className="absolute left-1/2 top-[5px] -translate-x-1/2 text-[9px] font-black text-white">1</span>
      </div>
      <div className="absolute left-[4px] top-[19px] h-[7px] w-[28px] origin-right -rotate-[12deg] rounded-full bg-[#176b38]" />
      <div className="absolute right-[4px] top-[19px] h-[7px] w-[28px] origin-left rotate-[12deg] rounded-full bg-[#176b38]" />
      <div className="absolute left-0 top-[15px] h-[12px] w-[10px] rounded bg-[#f4c430]" />
      <div className="absolute right-0 top-[15px] h-[12px] w-[10px] rounded bg-[#f4c430]" />
      <div className="absolute bottom-[4px] left-[23px] h-[18px] w-[8px] rounded bg-[#121b2c]" />
      <div className="absolute bottom-[4px] right-[23px] h-[18px] w-[8px] rounded bg-[#121b2c]" />
      <div className="absolute bottom-0 left-[16px] h-[5px] w-[21px] rounded-full bg-white" />
      <div className="absolute bottom-0 right-[16px] h-[5px] w-[21px] rounded-full bg-white" />
    </div>
  );
}

function Football() {
  return <span className="block text-[44px] leading-none drop-shadow-[0_7px_7px_rgba(0,0,0,.36)]">⚽</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-cyan-300/15 bg-[#061a34] px-2 py-2.5 text-center">
      <p className="text-[9px] font-black text-slate-400">{label}</p>
      <p className="mt-1 text-[14px] font-black text-white">{value}</p>
    </div>
  );
}
