"use client";

import { PointerEvent, useEffect, useRef, useState } from "react";

const TOTAL_SHOTS = 10;
type Point = { x: number; y: number };
type Result = "goal" | "saved" | null;
const BALL_START: Point = { x: 50, y: 78 };

export default function PenaltyPage() {
  const pitchRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [aim, setAim] = useState<Point>({ x: 50, y: 24 });
  const [dragging, setDragging] = useState(false);
  const [shot, setShot] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [result, setResult] = useState<Result>(null);
  const [keeper, setKeeper] = useState<Point>({ x: 50, y: 25 });
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
      x: Math.max(20, Math.min(80, 50 - dx * 1.35)),
      y: Math.max(17, Math.min(32, 27 - dy * 0.55)),
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

    const keeperX = 31 + Math.random() * 38;
    const keeperY = 23 + Math.random() * 5;
    setKeeper({ x: keeperX, y: keeperY });
    setBall(aim);

    const saved = Math.hypot(aim.x - keeperX, (aim.y - keeperY) * 1.8) < 11;
    setResult(saved ? "saved" : "goal");

    if (saved) {
      setStreak(0);
    } else {
      const corner = Math.abs(aim.x - 50) > 23 || aim.y < 21;
      setScore((value) => value + 100 + (corner ? 50 : 0) + Math.min(streak, 4) * 20);
      setStreak((value) => value + 1);
    }
  }

  function resetShot() {
    setResult(null);
    setBall(BALL_START);
    setAim({ x: 50, y: 24 });
    setKeeper({ x: 50, y: 25 });
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
      <div className="mx-auto max-w-md pb-6">
        <header className="flex items-center justify-between border-b border-cyan-400/20 bg-[#07264d] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-3xl">⚽</span>
            <span className="text-xl font-black italic tracking-tight">FOOT<span className="text-emerald-400">BATTLE</span></span>
          </div>
          <div className="flex gap-2 text-lg">
            <span className="rounded-xl border border-cyan-300/20 bg-[#061c3c] px-3 py-2">🔊</span>
            <span className="rounded-xl border border-cyan-300/20 bg-[#061c3c] px-3 py-2">Ⅱ</span>
          </div>
        </header>

        <div className="grid grid-cols-3 gap-2 bg-[#07264d] p-3">
          <Stat label="ŞUT" value={`⚽ ${Math.min(shot + 1, TOTAL_SHOTS)}/${TOTAL_SHOTS}`} />
          <Stat label="SERİ" value={`🔥 x${streak}`} />
          <Stat label="SKOR" value={`🏆 ${score.toLocaleString("tr-TR")}`} />
        </div>

        {!finished ? (
          <>
            <div
              ref={pitchRef}
              onPointerMove={move}
              onPointerUp={shoot}
              onPointerCancel={() => {
                setDragging(false);
                dragStartRef.current = null;
                setDragOffset({ x: 0, y: 0 });
              }}
              className="relative aspect-[9/13.8] overflow-hidden bg-[#24b957] touch-none"
              style={{ overscrollBehavior: "none", WebkitUserSelect: "none" }}
            >
              <div className="absolute inset-x-0 top-0 h-[17%] bg-gradient-to-b from-[#061f45] via-[#0b3560] to-[#0b4a65]" />
              <div
                className="absolute inset-x-0 top-[3%] h-[11%] opacity-75"
                style={{
                  backgroundImage: "radial-gradient(circle,#e9b06d 1.4px,transparent 1.7px),radial-gradient(circle,#6e9ec9 1.4px,transparent 1.7px)",
                  backgroundPosition: "0 0,8px 6px",
                  backgroundSize: "16px 13px",
                }}
              />
              <div className="absolute inset-x-0 top-[14%] h-[3%] border-y border-cyan-200/20 bg-[#073b5e]" />

              <div className="absolute left-[18%] right-[18%] top-[16.5%] z-10 h-[17%]">
                <div className="absolute inset-0 border-[4px] border-white bg-[#168f4c] shadow-[0_5px_0_rgba(2,25,42,.4)]" />
                <div
                  className="absolute inset-[4px] opacity-38"
                  style={{
                    backgroundImage: "linear-gradient(rgba(255,255,255,.75) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.75) 1px,transparent 1px)",
                    backgroundSize: "18px 18px",
                  }}
                />
              </div>

              <div
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
                style={{ left: `${keeper.x}%`, top: `${keeper.y}%` }}
              >
                <Keeper />
              </div>

              <div className="absolute left-[17%] right-[17%] top-[33%] h-[29%] border-x-2 border-b-2 border-white/75" />
              <div className="absolute left-1/2 top-[61.5%] h-24 w-40 -translate-x-1/2 rounded-b-full border-x-2 border-b-2 border-white/65" />
              <div className="absolute left-1/2 top-[57%] h-2 w-2 -translate-x-1/2 rounded-full bg-white/90" />

              {!result && dragging && (
                <svg className="pointer-events-none absolute inset-0 z-30 h-full w-full">
                  <defs>
                    <marker id="arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L6,3 z" fill="#ffd93d" />
                    </marker>
                  </defs>
                  <line
                    x1="50%"
                    y1="78%"
                    x2={`${aim.x}%`}
                    y2={`${aim.y}%`}
                    stroke="#ffd93d"
                    strokeWidth="3"
                    strokeLinecap="round"
                    markerEnd="url(#arrow)"
                  />
                  <circle cx={`${aim.x}%`} cy={`${aim.y}%`} r="9" fill="rgba(255,217,61,.12)" stroke="#ffd93d" strokeWidth="2" />
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
                className="absolute z-40 -translate-x-1/2 -translate-y-1/2 text-[44px] drop-shadow-[0_4px_5px_rgba(0,0,0,.45)] transition-all duration-300 active:scale-110"
                style={{ left: `${ball.x}%`, top: `${ball.y}%`, touchAction: "none" }}
              >
                ⚽
              </button>

              <div className="absolute left-1/2 top-[88%] z-30 flex -translate-x-1/2 gap-1.5 rounded-full border border-cyan-300/20 bg-[#062a58]/90 px-3 py-1.5">
                {Array.from({ length: 10 }).map((_, index) => (
                  <span key={index} className={`text-[12px] ${index < shot ? "opacity-100" : "opacity-25"}`}>⚽</span>
                ))}
              </div>

              <div className="absolute bottom-3 left-4 right-4 z-40 rounded-2xl border border-cyan-300/25 bg-[#05294a]/95 px-3 py-3 text-center text-[11px] font-black shadow-xl">
                {result
                  ? result === "goal"
                    ? "⚽ GOL!"
                    : "🧤 KURTARDI!"
                  : dragging
                    ? `GÜÇ %${power} • BIRAK VE ŞUT ÇEK`
                    : "✋ TOPA BAS • GERİYE / YANA ÇEK • BIRAK"}
              </div>
            </div>

            {result && (
              <button onClick={next} className="mx-3 mt-3 w-[calc(100%-1.5rem)] rounded-2xl bg-yellow-400 py-4 text-sm font-black text-[#05294a]">
                {shot + 1 >= TOTAL_SHOTS ? "SONUCU GÖR" : "SIRADAKİ PENALTI →"}
              </button>
            )}
          </>
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
    <div className="relative h-[54px] w-[66px]">
      <div className="absolute left-1/2 top-0 h-5 w-5 -translate-x-1/2 rounded-full border border-[#321b13] bg-[#a95b31]" />
      <div className="absolute left-1/2 top-[18px] h-7 w-8 -translate-x-1/2 rounded-t-lg bg-[#ff7136]">
        <span className="absolute left-1/2 top-1.5 -translate-x-1/2 text-[8px] font-black">1</span>
      </div>
      <div className="absolute left-[5px] top-[20px] h-2.5 w-6 origin-right -rotate-[16deg] rounded-full bg-[#ff7136]" />
      <div className="absolute right-[5px] top-[20px] h-2.5 w-6 origin-left rotate-[16deg] rounded-full bg-[#ff7136]" />
      <div className="absolute left-0 top-[15px] text-base">🟨</div>
      <div className="absolute right-0 top-[15px] text-base">🟨</div>
      <div className="absolute bottom-1 left-[21px] h-4 w-2 rotate-[7deg] rounded bg-[#13243a]" />
      <div className="absolute bottom-1 right-[21px] h-4 w-2 -rotate-[7deg] rounded bg-[#13243a]" />
      <div className="absolute bottom-0 left-[14px] h-1.5 w-5 rounded bg-white" />
      <div className="absolute bottom-0 right-[14px] h-1.5 w-5 rounded bg-white" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-cyan-300/15 bg-[#061c3c] px-2 py-2.5 text-center">
      <p className="text-[9px] font-black text-slate-400">{label}</p>
      <p className="mt-1 text-[14px] font-black text-white">{value}</p>
    </div>
  );
}
