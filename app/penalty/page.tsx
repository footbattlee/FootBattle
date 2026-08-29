"use client";

import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";

const TOTAL_SHOTS = 10;
type Point = { x: number; y: number };
type Result = "goal" | "saved" | null;

const BALL_START: Point = { x: 50, y: 79 };

export default function PenaltyPage() {
  const pitchRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });
  const [aim, setAim] = useState<Point>({ x: 50, y: 30 });
  const [dragging, setDragging] = useState(false);
  const [shot, setShot] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [result, setResult] = useState<Result>(null);
  const [keeper, setKeeper] = useState<Point>({ x: 50, y: 28 });
  const [ball, setBall] = useState<Point>(BALL_START);

  useEffect(() => {
    const previousBody = document.body.style.overscrollBehaviorY;
    const previousHtml = document.documentElement.style.overscrollBehaviorY;
    document.body.style.overscrollBehaviorY = "none";
    document.documentElement.style.overscrollBehaviorY = "none";

    const node = pitchRef.current;
    const blockRefresh = (event: TouchEvent) => {
      if (dragging) event.preventDefault();
    };
    node?.addEventListener("touchmove", blockRefresh, { passive: false });

    return () => {
      node?.removeEventListener("touchmove", blockRefresh);
      document.body.style.overscrollBehaviorY = previousBody;
      document.documentElement.style.overscrollBehaviorY = previousHtml;
    };
  }, [dragging]);

  const finished = shot >= TOTAL_SHOTS;
  const hint = useMemo(() => ["Kaleci sola bakıyor", "Kaleci ortada sabit", "Kaleci sağa bakıyor"][shot % 3], [shot]);
  const dragLength = Math.min(95, Math.hypot(dragOffset.x, dragOffset.y));
  const power = Math.round((dragLength / 95) * 100);

  function updateAimFromDrag(clientX: number, clientY: number) {
    const start = dragStartRef.current;
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!start || !rect) return;

    const dxPx = clientX - start.clientX;
    const dyPx = clientY - start.clientY;
    const dx = (dxPx / rect.width) * 100;
    const dy = (dyPx / rect.height) * 100;

    const limitedX = Math.max(-22, Math.min(22, dx));
    const limitedY = Math.max(0, Math.min(15, dy));
    setDragOffset({ x: limitedX, y: limitedY });

    const targetX = Math.max(17, Math.min(83, 50 - limitedX * 1.55));
    const targetY = Math.max(17, Math.min(43, 31 - limitedY * 0.95));
    setAim({ x: targetX, y: targetY });
  }

  function onMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragging || result || finished) return;
    event.preventDefault();
    updateAimFromDrag(event.clientX, event.clientY);
  }

  function shoot() {
    if (!dragging || result || finished) return;
    setDragging(false);
    dragStartRef.current = null;

    const keeperX = 26 + Math.random() * 48;
    const keeperY = 25 + Math.random() * 7;
    setKeeper({ x: keeperX, y: keeperY });
    setBall(aim);

    const distance = Math.hypot(aim.x - keeperX, (aim.y - keeperY) * 1.6);
    const saved = distance < 14;
    setResult(saved ? "saved" : "goal");

    if (!saved) {
      const corner = Math.abs(aim.x - 50) > 24 || aim.y < 22;
      const gained = 100 + (corner ? 50 : 0) + Math.min(streak, 4) * 20;
      setScore((value) => value + gained);
      setStreak((value) => value + 1);
    } else {
      setStreak(0);
    }
  }

  function next() {
    setShot((value) => value + 1);
    setResult(null);
    setBall(BALL_START);
    setAim({ x: 50, y: 30 });
    setKeeper({ x: 50, y: 28 });
    setDragOffset({ x: 0, y: 0 });
  }

  function restart() {
    setShot(0);
    setScore(0);
    setStreak(0);
    setResult(null);
    setBall(BALL_START);
    setAim({ x: 50, y: 30 });
    setKeeper({ x: 50, y: 28 });
    setDragOffset({ x: 0, y: 0 });
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#07111f] px-3 py-4 text-white select-none">
      <div className="mx-auto max-w-md">
        <header className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[.24em] text-emerald-400">FootBattle</p>
            <h1 className="text-[34px] font-black leading-none">Penaltı</h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-500">SKOR</p>
            <p className="text-3xl font-black text-yellow-300">{score}</p>
          </div>
        </header>

        <div className="mb-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="ŞUT" value={`${Math.min(shot + 1, TOTAL_SHOTS)}/${TOTAL_SHOTS}`} />
          <Stat label="SERİ" value={`x${streak}`} />
          <Stat label="GÜÇ" value={dragging ? `%${power}` : "Hazır"} />
        </div>

        {!finished ? (
          <>
            <div
              ref={pitchRef}
              onPointerMove={onMove}
              onPointerUp={shoot}
              onPointerCancel={() => { setDragging(false); dragStartRef.current = null; setDragOffset({ x: 0, y: 0 }); }}
              className="relative aspect-[9/12] overflow-hidden rounded-[26px] border border-[#37d687]/50 bg-[#159447] shadow-[0_22px_55px_rgba(0,0,0,.38)] touch-none"
              style={{ overscrollBehavior: "none", WebkitUserSelect: "none" }}
            >
              <div className="absolute inset-x-0 top-0 h-[18%] bg-[#075a84]" />
              <div className="absolute inset-x-0 top-[12%] h-[12%] bg-[#0f7048] opacity-90" />

              <div className="absolute left-[15%] right-[15%] top-[15%] h-[28%]">
                <div className="absolute inset-0 border-[4px] border-white/95 bg-[#16894a] shadow-[0_6px_0_rgba(0,0,0,.18)]" />
                <div className="absolute inset-[4px] opacity-25" style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "22px 22px" }} />
              </div>

              <div className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300" style={{ left: `${keeper.x}%`, top: `${keeper.y}%` }}>
                <div className="relative h-20 w-20">
                  <div className="absolute left-1/2 top-0 h-7 w-7 -translate-x-1/2 rounded-full bg-[#9b5a2d]" />
                  <div className="absolute left-1/2 top-6 h-10 w-10 -translate-x-1/2 rounded-[12px] bg-[#ff7a1a]" />
                  <div className="absolute left-[3px] top-7 h-4 w-8 -rotate-[22deg] rounded-full bg-[#ff9a39]" />
                  <div className="absolute right-[3px] top-7 h-4 w-8 rotate-[22deg] rounded-full bg-[#ff9a39]" />
                  <div className="absolute left-0 top-7 text-2xl">🧤</div>
                  <div className="absolute right-0 top-7 text-2xl">🧤</div>
                  <div className="absolute bottom-0 left-[20px] h-5 w-3 rounded bg-[#202934]" />
                  <div className="absolute bottom-0 right-[20px] h-5 w-3 rounded bg-[#202934]" />
                </div>
              </div>

              <div className="absolute left-[16%] right-[16%] top-[43%] h-[32%] border-x-2 border-t-2 border-white/55" />
              <div className="absolute left-1/2 top-[70%] h-24 w-40 -translate-x-1/2 rounded-t-full border-x-2 border-t-2 border-white/45" />
              <div className="absolute left-1/2 top-[68%] h-2 w-2 -translate-x-1/2 rounded-full bg-white/80" />

              {!result && (
                <div className="absolute left-1/2 top-[48%] -translate-x-1/2 rounded-full bg-[#082d28]/90 px-4 py-2 text-[11px] font-black shadow-lg">
                  👀 {hint}
                </div>
              )}

              {!result && dragging && (
                <svg className="pointer-events-none absolute inset-0 h-full w-full">
                  <defs>
                    <marker id="arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#ffe14a" /></marker>
                  </defs>
                  <line x1="50%" y1="79%" x2={`${aim.x}%`} y2={`${aim.y}%`} stroke="#ffe14a" strokeWidth="4" strokeLinecap="round" markerEnd="url(#arrow)" />
                  <circle cx={`${aim.x}%`} cy={`${aim.y}%`} r="10" fill="rgba(255,225,74,.12)" stroke="#ffe14a" strokeWidth="3" />
                </svg>
              )}

              {!result && dragging && (
                <div className="absolute left-1/2 top-[79%] h-[2px] bg-white/45" style={{ width: `${Math.min(68, Math.abs(dragOffset.x) * 2.5 + dragOffset.y * 1.8)}px`, transform: `translateX(${dragOffset.x < 0 ? "0" : "-100%"}) rotate(${dragOffset.x * .7}deg)`, transformOrigin: "left center" }} />
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
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 text-[46px] drop-shadow-xl transition-all duration-300 active:scale-110"
                style={{ left: `${ball.x}%`, top: `${ball.y}%`, touchAction: "none" }}
              >
                ⚽
              </button>

              <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-[#08222a]/95 px-4 py-3 text-center shadow-lg">
                <p className="text-[11px] font-black text-yellow-300">
                  {result ? (result === "goal" ? "⚽ GOL!" : "🧤 KURTARDI!") : "TOPA BAS • GERİYE/YANA ÇEK • BIRAK"}
                </p>
              </div>
            </div>

            {result && (
              <button onClick={next} className="mt-3 w-full rounded-2xl bg-[#38d67a] py-4 text-sm font-black text-[#07111f] shadow-lg">
                {shot + 1 >= TOTAL_SHOTS ? "SONUCU GÖR" : "SIRADAKİ PENALTI →"}
              </button>
            )}
          </>
        ) : (
          <div className="rounded-[26px] border border-white/10 bg-white/[.04] p-8 text-center">
            <div className="text-6xl">🏆</div>
            <h2 className="mt-4 text-3xl font-black">Seri Bitti</h2>
            <p className="mt-2 text-slate-400">10 penaltı sonunda skorun</p>
            <p className="mt-5 text-5xl font-black text-yellow-300">{score}</p>
            <button onClick={restart} className="mt-8 w-full rounded-2xl bg-[#38d67a] py-4 font-black text-[#07111f]">TEKRAR OYNA</button>
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[.04] p-2.5">
      <p className="text-[9px] font-black text-slate-500">{label}</p>
      <p className="mt-1 truncate text-[13px] font-black">{value}</p>
    </div>
  );
}
