"use client";

import Link from "next/link";
import { PointerEvent, useMemo, useRef, useState } from "react";

type Mode = "menu" | "shooter" | "keeper" | "friend";
type Point = { x: number; y: number };
type Dive = -1 | 0 | 1;
type Result = "goal" | "saved" | null;

const TOTAL_SHOTS = 10;
const BALL_START: Point = { x: 50, y: 72 };
const KEEPER_START: Point = { x: 50, y: 28 };
const AIM = { left: 23, right: 77, top: 22.5, bottom: 32.5 };

export default function PenaltyPage() {
  const [mode, setMode] = useState<Mode>("menu");

  return (
    <main className="min-h-screen bg-[#06152b] text-white select-none">
      <div className="mx-auto max-w-md pb-[max(18px,env(safe-area-inset-bottom))]">
        <header className="flex items-center justify-between bg-[#071d3c] px-3 py-3">
          <Link href="/tr" className="flex items-center gap-2 rounded-xl px-1 py-1 active:scale-95">
            <span className="text-xl">←</span>
            <img src="/footbattle-logo.png" alt="FootBattle" className="h-11 w-auto object-contain" />
          </Link>
          {mode !== "menu" && (
            <button onClick={() => setMode("menu")} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black">
              MODLAR
            </button>
          )}
        </header>

        {mode === "menu" && <ModeMenu onSelect={setMode} />}
        {mode === "shooter" && <ShooterMode />}
        {mode === "keeper" && <KeeperMode />}
        {mode === "friend" && <FriendMode />}
      </div>
    </main>
  );
}

function ModeMenu({ onSelect }: { onSelect: (mode: Mode) => void }) {
  return (
    <section className="px-4 pb-10 pt-5">
      <div className="text-center">
        <div className="text-[10px] font-black tracking-[0.24em] text-cyan-200/70">FOOTBATTLE</div>
        <h1 className="mt-2 text-3xl font-black">PENALTI</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Nasıl oynamak istiyorsun?</p>
      </div>

      <div className="mt-6 space-y-3">
        <ModeCard icon="⚽" title="Penaltı At" text="Kaleciyi geç. 10 şutta en yüksek skoru yap." action="ŞUTÖR OL" onClick={() => onSelect("shooter")} />
        <ModeCard icon="🧤" title="Kaleci Ol" text="AI sana penaltı atsın. Kaleciyi sürükleyip doğru anda bırak." action="KALEYE GEÇ" onClick={() => onSelect("keeper")} />
        <ModeCard icon="👥" title="Arkadaşınla Oyna" text="Aynı cihazda sırayla penaltı atın ve kaleye geçin." action="2 KİŞİ OYNA" onClick={() => onSelect("friend")} />
      </div>

      <div className="mt-5 rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.04] p-4 text-xs leading-5 text-slate-400">
        <b className="text-cyan-200">Kaleci kontrolü:</b> Kalecinin üzerine bas, istediğin yöne sürükle ve bırak. Çok erken hareket edersen şutör seni okuyabilir.
      </div>
    </section>
  );
}

function ModeCard({ icon, title, text, action, onClick }: { icon: string; title: string; text: string; action: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full rounded-3xl border border-white/10 bg-[#082342] p-5 text-left active:scale-[0.99]">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-3xl">{icon}</div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-black">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">{text}</p>
          <div className="mt-3 inline-flex rounded-xl bg-emerald-400 px-3 py-2 text-[10px] font-black text-[#06213c]">{action} →</div>
        </div>
      </div>
    </button>
  );
}

function ShooterMode() {
  const pitchRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [aiming, setAiming] = useState(false);
  const [aim, setAim] = useState<Point>({ x: 50, y: 28 });
  const [ball, setBall] = useState<Point>(BALL_START);
  const [keeper, setKeeper] = useState<Point>(KEEPER_START);
  const [dive, setDive] = useState<Dive>(0);
  const [shot, setShot] = useState(0);
  const [goals, setGoals] = useState(0);
  const [result, setResult] = useState<Result>(null);

  const finished = shot >= TOTAL_SHOTS;

  function onBallDown(event: PointerEvent<HTMLButtonElement>) {
    if (result || finished) return;
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    setAiming(true);
  }

  function onMove(event: PointerEvent<HTMLDivElement>) {
    if (!aiming || !dragStartRef.current || !pitchRef.current) return;
    const rect = pitchRef.current.getBoundingClientRect();
    const dx = Math.max(-22, Math.min(22, ((event.clientX - dragStartRef.current.x) / rect.width) * 100));
    const dy = Math.max(0, Math.min(18, ((event.clientY - dragStartRef.current.y) / rect.height) * 100));
    setAim({ x: clamp(50 - dx * 1.22, AIM.left, AIM.right), y: clamp(AIM.bottom - dy * 0.55, AIM.top, AIM.bottom) });
  }

  function release() {
    if (!aiming) return;
    setAiming(false);
    const direction: Dive = aim.x < 44 ? -1 : aim.x > 56 ? 1 : 0;
    const reads = Math.random() < 0.65;
    const nextDive: Dive = reads ? direction : pickOther(direction);
    const keeperTarget = { x: nextDive === -1 ? 37 : nextDive === 1 ? 63 : 50, y: Math.random() < 0.5 ? 25.5 : 28 };
    setDive(nextDive);
    setKeeper(keeperTarget);
    setBall(aim);

    window.setTimeout(() => {
      const horizontal = Math.abs(aim.x - keeperTarget.x);
      const vertical = Math.abs(aim.y - keeperTarget.y);
      const inReach = horizontal <= (nextDive === 0 ? 10.5 : 13) && vertical <= 7.2;
      const horizontalPlacement = Math.min(1, Math.abs(aim.x - 50) / 27);
      const verticalPlacement = Math.min(1, Math.max(0, (AIM.bottom - aim.y) / (AIM.bottom - AIM.top)));
      const placement = horizontalPlacement * 0.6 + verticalPlacement * 0.4;
      const topCorner = horizontalPlacement >= 0.82 && verticalPlacement >= 0.72;
      let saveChance = 0.82 - placement * 0.25 - 0.08;
      if (topCorner) saveChance = Math.min(saveChance, 0.4);
      saveChance = clamp(saveChance, 0.25, 0.82);
      const saved = inReach && Math.random() < saveChance;
      setResult(saved ? "saved" : "goal");
      if (!saved) setGoals((v) => v + 1);
    }, 420);
  }

  function next() {
    setShot((v) => v + 1);
    setResult(null);
    setAim({ x: 50, y: 28 });
    setBall(BALL_START);
    setKeeper(KEEPER_START);
    setDive(0);
  }

  if (finished) return <Finish title="Penaltı serisi bitti" value={`${goals}/10 GOL`} onRestart={() => window.location.reload()} />;

  return (
    <GameShell title="⚽ PENALTI AT" left={`ŞUT ${shot + 1}/10`} middle={`GOL ${goals}`} right="AI KALECİ">
      <Pitch ref={pitchRef} onPointerMove={onMove} onPointerUp={release}>
        <Goal />
        <KeeperSprite point={keeper} dive={dive} />
        {aiming && <AimDot point={aim} />}
        <button onPointerDown={onBallDown} className="absolute z-30 -translate-x-1/2 -translate-y-1/2 text-[30px] transition-all duration-[420ms]" style={{ left: `${ball.x}%`, top: `${ball.y}%` }}>⚽</button>
        <BottomMessage result={result} idle={aiming ? "HEDEFİ BELİRLE • BIRAK VE ŞUT ÇEK" : "TOPA BAS • GERİ/YANA ÇEK"} onNext={next} />
      </Pitch>
    </GameShell>
  );
}

function KeeperMode() {
  const pitchRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const [keeper, setKeeper] = useState<Point>(KEEPER_START);
  const [ball, setBall] = useState<Point>(BALL_START);
  const [shot, setShot] = useState(0);
  const [saves, setSaves] = useState(0);
  const [result, setResult] = useState<Result>(null);
  const [armed, setArmed] = useState(false);
  const targetRef = useRef<Point>({ x: 50, y: 28 });
  const firedAtRef = useRef<number | null>(null);

  const finished = shot >= TOTAL_SHOTS;

  function armShot() {
    if (armed || result) return;
    const side = Math.random();
    const x = side < 0.42 ? random(24, 42) : side > 0.58 ? random(58, 76) : random(44, 56);
    const y = random(23, 31.5);
    targetRef.current = { x, y };
    setArmed(true);
    window.setTimeout(() => {
      firedAtRef.current = performance.now();
      setBall(targetRef.current);
      window.setTimeout(resolveKeeperShot, 500);
    }, random(650, 1300));
  }

  function onKeeperDown(event: PointerEvent<HTMLButtonElement>) {
    if (!armed || result) return;
    dragStart.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onKeeperMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragStart.current || !pitchRef.current || result) return;
    const rect = pitchRef.current.getBoundingClientRect();
    const dx = ((event.clientX - dragStart.current.x) / rect.width) * 100;
    const dy = ((event.clientY - dragStart.current.y) / rect.height) * 100;
    setKeeper({ x: clamp(50 + dx * 1.35, 33, 67), y: clamp(28 + dy * 0.65, 23.5, 31) });
  }

  function resolveKeeperShot() {
    const target = targetRef.current;
    setKeeper((currentKeeper) => {
      const reaction = firedAtRef.current ? performance.now() - firedAtRef.current : 9999;
      const distance = Math.hypot(target.x - currentKeeper.x, (target.y - currentKeeper.y) * 1.7);
      const reactionBonus = reaction <= 560 ? 2.2 : 0;
      const saved = distance <= 12.5 + reactionBonus;
      setResult(saved ? "saved" : "goal");
      if (saved) setSaves((v) => v + 1);
      return currentKeeper;
    });
  }

  function next() {
    setShot((v) => v + 1);
    setResult(null);
    setArmed(false);
    setKeeper(KEEPER_START);
    setBall(BALL_START);
    firedAtRef.current = null;
    dragStart.current = null;
  }

  if (finished) return <Finish title="Kaleci serisi bitti" value={`${saves}/10 KURTARIŞ`} onRestart={() => window.location.reload()} />;

  return (
    <GameShell title="🧤 KALECİ OL" left={`ŞUT ${shot + 1}/10`} middle={`KURTARIŞ ${saves}`} right="AI ŞUTÖR">
      <Pitch ref={pitchRef} onPointerMove={onKeeperMove} onPointerUp={() => { dragStart.current = null; }}>
        <Goal />
        <button onPointerDown={onKeeperDown} className="absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-75" style={{ left: `${keeper.x}%`, top: `${keeper.y}%` }}>
          <KeeperFigure />
        </button>
        <div className="absolute z-30 -translate-x-1/2 -translate-y-1/2 text-[30px] transition-all duration-[480ms] ease-out" style={{ left: `${ball.x}%`, top: `${ball.y}%` }}>⚽</div>
        {!armed && !result && <button onClick={armShot} className="absolute bottom-[7%] left-[14%] right-[14%] z-40 rounded-2xl bg-yellow-400 py-4 text-sm font-black text-[#06152b]">HAZIRIM • ŞUTU BAŞLAT</button>}
        {armed && !result && <div className="absolute bottom-[7%] left-[10%] right-[10%] z-40 rounded-xl border border-cyan-300/20 bg-[#061f36]/95 px-3 py-3 text-center text-xs font-black">🧤 KALECİYİ SÜRÜKLE • ŞUT HER AN GELEBİLİR</div>}
        {result && <BottomMessage result={result} idle="" onNext={next} />}
      </Pitch>
    </GameShell>
  );
}

function FriendMode() {
  const [round, setRound] = useState(1);
  const [playerAScore, setPlayerAScore] = useState(0);
  const [playerBScore, setPlayerBScore] = useState(0);
  const [turn, setTurn] = useState<"A" | "B">("A");
  const [resolved, setResolved] = useState<Result>(null);
  const [choice, setChoice] = useState<Dive | null>(null);
  const [keeperChoice, setKeeperChoice] = useState<Dive | null>(null);
  const finished = round > 10;
  const shooter = turn;
  const keeper = turn === "A" ? "B" : "A";

  function resolveFriend() {
    if (choice === null || keeperChoice === null) return;
    const saved = choice === keeperChoice && Math.random() < 0.72;
    setResolved(saved ? "saved" : "goal");
    if (!saved) {
      if (shooter === "A") setPlayerAScore((v) => v + 1);
      else setPlayerBScore((v) => v + 1);
    }
  }

  function nextTurn() {
    setRound((v) => v + 1);
    setTurn((v) => (v === "A" ? "B" : "A"));
    setChoice(null);
    setKeeperChoice(null);
    setResolved(null);
  }

  if (finished) {
    const text = playerAScore === playerBScore ? "BERABERE" : playerAScore > playerBScore ? "OYUNCU A KAZANDI" : "OYUNCU B KAZANDI";
    return <Finish title={text} value={`${playerAScore} - ${playerBScore}`} onRestart={() => window.location.reload()} />;
  }

  return (
    <section className="px-4 pb-10 pt-4">
      <div className="rounded-3xl border border-white/10 bg-[#082342] p-5">
        <div className="text-center text-xs font-black text-cyan-200">👥 ARKADAŞINLA • TUR {round}/10</div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-2xl bg-white/5 p-4"><div className="text-xs text-slate-400">OYUNCU A</div><div className="mt-1 text-3xl font-black">{playerAScore}</div></div>
          <div className="rounded-2xl bg-white/5 p-4"><div className="text-xs text-slate-400">OYUNCU B</div><div className="mt-1 text-3xl font-black">{playerBScore}</div></div>
        </div>

        <div className="mt-5 rounded-2xl bg-[#06152b] p-4 text-center">
          <div className="text-sm font-black">⚽ Oyuncu {shooter} şutör • 🧤 Oyuncu {keeper} kaleci</div>
          <p className="mt-2 text-xs text-slate-400">Şutör yönünü seçsin. Sonra telefonu kaleciye verin; kaleci kendi yönünü seçsin.</p>
        </div>

        <DirectionPicker label={`Oyuncu ${shooter} • Şut yönü`} value={choice} onChange={setChoice} />
        {choice !== null && <DirectionPicker label={`Oyuncu ${keeper} • Kaleci yönü`} value={keeperChoice} onChange={setKeeperChoice} />}

        {!resolved ? (
          <button disabled={choice === null || keeperChoice === null} onClick={resolveFriend} className="mt-5 w-full rounded-2xl bg-yellow-400 py-4 text-sm font-black text-[#06152b] disabled:opacity-30">PENALTIYI OYNA</button>
        ) : (
          <div className="mt-5">
            <div className={`rounded-2xl py-4 text-center text-xl font-black ${resolved === "goal" ? "bg-emerald-500" : "bg-sky-500"}`}>{resolved === "goal" ? "⚽ GOL" : "🧤 KURTARIŞ"}</div>
            <button onClick={nextTurn} className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-black">SIRADAKİ TUR →</button>
          </div>
        )}
      </div>
    </section>
  );
}

function DirectionPicker({ label, value, onChange }: { label: string; value: Dive | null; onChange: (v: Dive) => void }) {
  return (
    <div className="mt-5">
      <div className="mb-2 text-xs font-black text-slate-300">{label}</div>
      <div className="grid grid-cols-3 gap-2">
        {([[-1, "← SOL"], [0, "↑ ORTA"], [1, "SAĞ →"]] as const).map(([v, text]) => (
          <button key={v} onClick={() => onChange(v)} className={`rounded-xl border px-2 py-3 text-xs font-black ${value === v ? "border-emerald-300 bg-emerald-400 text-[#06152b]" : "border-white/10 bg-white/5"}`}>{text}</button>
        ))}
      </div>
    </div>
  );
}

function GameShell({ title, left, middle, right, children }: { title: string; left: string; middle: string; right: string; children: React.ReactNode }) {
  return (
    <>
      <div className="bg-[#071d3c] px-3 pb-2 text-center text-[10px] font-black tracking-[0.18em] text-cyan-200/75">{title}</div>
      <div className="grid grid-cols-3 gap-2 bg-[#071d3c] px-3 pb-3">
        {[left, middle, right].map((v) => <div key={v} className="rounded-xl border border-cyan-300/15 bg-[#061a34] px-2 py-2.5 text-center text-[10px] font-black">{v}</div>)}
      </div>
      {children}
    </>
  );
}

const Pitch = ReactForwardPitch();
function ReactForwardPitch() {
  const React = require("react") as typeof import("react");
  return React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function PitchInner(props, ref) {
    return <div ref={ref} {...props} className={`relative aspect-[9/12.3] overflow-hidden touch-none ${props.className ?? ""}`} style={{ overscrollBehavior: "none", background: "repeating-linear-gradient(0deg,#269b43 0 54px,#2eaa49 54px 108px)", ...props.style }}>{props.children}</div>;
  });
}

function Goal() {
  return <><div className="absolute inset-x-0 top-0 h-[20.5%] bg-gradient-to-b from-[#07142b] via-[#0d2945] to-[#173d54]" /><div className="absolute left-[21%] right-[21%] top-[20.5%] z-10 h-[13.5%] border-x-[3px] border-t-[3px] border-white bg-[#218f46] shadow-[0_4px_0_rgba(0,0,0,.22)]" /><div className="absolute left-[7%] right-[7%] top-[34%] h-[25%] border border-t-0 border-white/80" /></>;
}

function KeeperSprite({ point, dive }: { point: Point; dive: Dive }) {
  return <div className="absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-all duration-[420ms]" style={{ left: `${point.x}%`, top: `${point.y}%`, transform: `translate(-50%,-50%) rotate(${dive * 24}deg)` }}><KeeperFigure /></div>;
}

function KeeperFigure() {
  return <div className="relative h-[74px] w-[66px]"><div className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 rounded-full bg-amber-700" /><div className="absolute left-1/2 top-4 h-9 w-8 -translate-x-1/2 rounded-xl bg-orange-500" /><div className="absolute left-0 top-7 h-2.5 w-8 rotate-[-18deg] rounded-full bg-orange-500" /><div className="absolute right-0 top-7 h-2.5 w-8 rotate-[18deg] rounded-full bg-orange-500" /><div className="absolute left-3 top-[30px] h-4 w-4 rounded-md bg-lime-300" /><div className="absolute right-3 top-[30px] h-4 w-4 rounded-md bg-lime-300" /><div className="absolute left-[22px] top-[50px] h-6 w-2.5 rotate-[8deg] rounded-full bg-slate-900" /><div className="absolute right-[22px] top-[50px] h-6 w-2.5 rotate-[-8deg] rounded-full bg-slate-900" /></div>;
}

function AimDot({ point }: { point: Point }) {
  return <div className="pointer-events-none absolute z-30 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-yellow-300 bg-yellow-300/10" style={{ left: `${point.x}%`, top: `${point.y}%` }} />;
}

function BottomMessage({ result, idle, onNext }: { result: Result; idle: string; onNext: () => void }) {
  if (result) return <div className="absolute bottom-[5%] left-[10%] right-[10%] z-40 flex gap-2"><div className={`flex-1 rounded-xl px-3 py-3 text-center text-xs font-black ${result === "goal" ? "bg-emerald-500" : "bg-sky-500"}`}>{result === "goal" ? "⚽ GOL" : "🧤 KURTARIŞ"}</div><button onClick={onNext} className="rounded-xl bg-yellow-400 px-4 py-3 text-xs font-black text-[#06152b]">DEVAM →</button></div>;
  return <div className="absolute bottom-[5%] left-[9%] right-[9%] z-40 rounded-xl border border-cyan-300/20 bg-[#061f36]/95 px-3 py-3 text-center text-[11px] font-black">{idle}</div>;
}

function Finish({ title, value, onRestart }: { title: string; value: string; onRestart: () => void }) {
  return <div className="m-4 rounded-3xl border border-cyan-300/20 bg-[#07264d] p-8 text-center"><div className="text-6xl">🏆</div><h2 className="mt-4 text-2xl font-black">{title}</h2><p className="mt-5 text-4xl font-black text-yellow-300">{value}</p><button onClick={onRestart} className="mt-8 w-full rounded-2xl bg-emerald-400 py-4 font-black text-[#05294a]">TEKRAR OYNA</button></div>;
}

function pickOther(direction: Dive): Dive {
  const pool = ([-1, 0, 1] as Dive[]).filter((v) => v !== direction);
  return pool[Math.floor(Math.random() * pool.length)];
}

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function random(min: number, max: number) { return min + Math.random() * (max - min); }
