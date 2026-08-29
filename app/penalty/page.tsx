"use client";

import { PointerEvent, useMemo, useRef, useState } from "react";

const TOTAL_SHOTS = 10;
const BALL_START = { x: 50, y: 82 };
type Point = { x: number; y: number };
type Result = "goal" | "saved" | null;

export default function PenaltyPage() {
  const pitchRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [dragPoint, setDragPoint] = useState<Point>(BALL_START);
  const [aim, setAim] = useState<Point>({ x: 50, y: 30 });
  const [shot, setShot] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [result, setResult] = useState<Result>(null);
  const [keeper, setKeeper] = useState<Point>({ x: 50, y: 32 });
  const [ball, setBall] = useState<Point>(BALL_START);

  const finished = shot >= TOTAL_SHOTS;
  const hint = useMemo(() => ["sola yükleniyor", "ortada bekliyor", "sağı kolluyor"][shot % 3], [shot]);

  function localPoint(event: PointerEvent<HTMLButtonElement>) {
    const rect = pitchRef.current?.getBoundingClientRect();
    if (!rect) return BALL_START;
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    };
  }

  function calculateAim(pull: Point) {
    const dx = BALL_START.x - pull.x;
    const dy = BALL_START.y - pull.y;
    const power = Math.min(1, Math.max(0.2, Math.hypot(dx, dy) / 34));
    return {
      x: Math.max(14, Math.min(86, 50 + dx * 1.75)),
      y: Math.max(15, Math.min(49, 48 - power * 31 - dy * 0.08)),
    };
  }

  function onBallMove(event: PointerEvent<HTMLButtonElement>) {
    if (!dragging || result || finished) return;
    const p = localPoint(event);
    const clamped = {
      x: Math.max(20, Math.min(80, p.x)),
      y: Math.max(78, Math.min(96, p.y)),
    };
    setDragPoint(clamped);
    setBall(clamped);
    setAim(calculateAim(clamped));
  }

  function shoot() {
    if (!dragging || result || finished) return;
    setDragging(false);
    const pullDistance = Math.hypot(BALL_START.x - dragPoint.x, BALL_START.y - dragPoint.y);
    if (pullDistance < 4) {
      setBall(BALL_START);
      setDragPoint(BALL_START);
      return;
    }

    const keeperX = 22 + Math.random() * 56;
    const keeperY = 25 + Math.random() * 14;
    const nextKeeper = { x: keeperX, y: keeperY };
    setKeeper(nextKeeper);
    setBall(aim);

    const distance = Math.hypot(aim.x - keeperX, (aim.y - keeperY) * 1.35);
    const saved = distance < 15;
    setResult(saved ? "saved" : "goal");

    if (!saved) {
      const corner = Math.abs(aim.x - 50) > 25 || aim.y < 22;
      const gained = 100 + (corner ? 50 : 0) + Math.min(streak, 4) * 20;
      setScore((v) => v + gained);
      setStreak((v) => v + 1);
    } else {
      setStreak(0);
    }
  }

  function next() {
    setShot((v) => v + 1);
    setResult(null);
    setBall(BALL_START);
    setDragPoint(BALL_START);
    setAim({ x: 50, y: 30 });
    setKeeper({ x: 50, y: 32 });
  }

  function restart() {
    setShot(0);
    setScore(0);
    setStreak(0);
    setResult(null);
    setBall(BALL_START);
    setDragPoint(BALL_START);
    setAim({ x: 50, y: 30 });
    setKeeper({ x: 50, y: 32 });
  }

  return (
    <main className="min-h-screen select-none bg-[#06111e] px-3 py-5 text-white">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-400">FootBattle</p>
            <h1 className="text-3xl font-black">Penaltı</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">SKOR</p>
            <p className="text-2xl font-black text-yellow-300">{score}</p>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs font-bold">
          <Stat label="ŞUT" value={`${Math.min(shot + 1, TOTAL_SHOTS)}/${TOTAL_SHOTS}`} />
          <Stat label="SERİ" value={`x${streak}`} />
          <Stat label="KALECİ" value={hint} />
        </div>

        {!finished ? (
          <>
            <div ref={pitchRef} className="relative aspect-[9/13] overflow-hidden rounded-[30px] border border-emerald-300/20 bg-[#159447] shadow-2xl touch-none">
              <div className="absolute inset-x-0 top-0 h-[20%] bg-gradient-to-b from-[#112b38] via-[#0f4e43] to-transparent" />
              <div className="absolute left-[-12%] right-[-12%] top-[5%] h-[15%] rounded-[50%] bg-[#1c2930]/70" />
              <div className="absolute left-[7%] right-[7%] top-[11%] h-[38%] border-[5px] border-white/95 bg-[#0d7438] shadow-[0_8px_25px_rgba(0,0,0,.25)]" />
              <div className="absolute left-[7%] right-[7%] top-[11%] h-[38%] opacity-25" style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "31px 31px" }} />
              <div className="absolute left-1/2 top-[49%] h-[18%] w-[68%] -translate-x-1/2 border-x-2 border-b-2 border-white/55" />
              <div className="absolute left-1/2 top-[61%] h-16 w-32 -translate-x-1/2 rounded-t-full border-2 border-b-0 border-white/45" />
              <div className="absolute left-1/2 top-[67%] h-2 w-2 -translate-x-1/2 rounded-full bg-white/80" />

              <div className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500" style={{ left: `${keeper.x}%`, top: `${keeper.y}%` }}>
                <div className="relative h-20 w-20">
                  <div className="absolute left-1/2 top-1/2 h-12 w-8 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-orange-500 shadow-lg" />
                  <div className="absolute left-1/2 top-0 h-8 w-8 -translate-x-1/2 rounded-full bg-amber-700" />
                  <div className="absolute left-0 top-8 h-3 w-7 -rotate-12 rounded-full bg-orange-400" />
                  <div className="absolute right-0 top-8 h-3 w-7 rotate-12 rounded-full bg-orange-400" />
                  <div className="absolute left-[-5px] top-6 text-2xl">🧤</div>
                  <div className="absolute right-[-5px] top-6 text-2xl">🧤</div>
                </div>
              </div>

              {!result && (
                <div className="absolute left-1/2 top-[53%] -translate-x-1/2 rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-black backdrop-blur">
                  👀 Kaleci {hint}
                </div>
              )}

              {!result && dragging && (
                <svg className="pointer-events-none absolute inset-0 h-full w-full">
                  <defs>
                    <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L6,3 z" fill="rgba(253,224,71,.95)" />
                    </marker>
                  </defs>
                  <line x1="50%" y1="82%" x2={`${aim.x}%`} y2={`${aim.y}%`} stroke="rgba(253,224,71,.95)" strokeWidth="3.5" strokeLinecap="round" markerEnd="url(#arrowhead)" />
                  <circle cx={`${aim.x}%`} cy={`${aim.y}%`} r="11" fill="rgba(253,224,71,.12)" stroke="rgba(253,224,71,.95)" strokeWidth="2.5" />
                  <line x1="50%" y1="82%" x2={`${dragPoint.x}%`} y2={`${dragPoint.y}%`} stroke="rgba(255,255,255,.5)" strokeWidth="2" strokeDasharray="5 5" />
                </svg>
              )}

              <button
                aria-label="Topu geriye çekip bırak"
                onPointerDown={(event) => {
                  if (result) return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setDragging(true);
                  setDragPoint(BALL_START);
                }}
                onPointerMove={onBallMove}
                onPointerUp={shoot}
                onPointerCancel={() => {
                  setDragging(false);
                  setBall(BALL_START);
                  setDragPoint(BALL_START);
                }}
                className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 text-6xl drop-shadow-xl ${result ? "transition-all duration-500" : ""}`}
                style={{ left: `${ball.x}%`, top: `${ball.y}%` }}
              >
                ⚽
              </button>

              {!result && !dragging && (
                <div className="pointer-events-none absolute bottom-[7%] left-1/2 w-[86%] -translate-x-1/2 text-center">
                  <div className="mx-auto mb-2 h-10 w-[2px] bg-white/25" />
                  <p className="rounded-full bg-[#06111e]/80 px-4 py-2 text-[11px] font-black text-yellow-300 backdrop-blur">
                    TOPA BAS • GERİYE / YANA ÇEK • BIRAK
                  </p>
                </div>
              )}

              {result && (
                <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-[#06111e]/90 p-3 text-center backdrop-blur">
                  <p className="text-sm font-black text-yellow-300">{result === "goal" ? "⚽ GOL!" : "🧤 KURTARDI!"}</p>
                </div>
              )}
            </div>

            {result && (
              <button onClick={next} className="mt-3 w-full rounded-2xl bg-emerald-400 py-4 text-sm font-black text-[#06111e]">
                {shot + 1 >= TOTAL_SHOTS ? "SONUCU GÖR" : "SIRADAKİ PENALTI →"}
              </button>
            )}
          </>
        ) : (
          <div className="rounded-[28px] border border-white/10 bg-white/[.04] p-8 text-center">
            <div className="text-6xl">🏆</div>
            <h2 className="mt-4 text-3xl font-black">Seri Bitti</h2>
            <p className="mt-2 text-slate-400">10 penaltı sonunda skorun</p>
            <p className="mt-5 text-5xl font-black text-yellow-300">{score}</p>
            <button onClick={restart} className="mt-8 w-full rounded-2xl bg-emerald-400 py-4 font-black text-[#06111e]">TEKRAR OYNA</button>
          </div>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[.04] p-2">
      <p className="text-[9px] text-slate-500">{label}</p>
      <p className="mt-1 truncate font-black">{value}</p>
    </div>
  );
}
