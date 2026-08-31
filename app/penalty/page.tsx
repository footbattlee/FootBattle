"use client";

import Link from "next/link";
import { PointerEvent, useEffect, useRef, useState } from "react";

type Mode = "menu" | "shooter" | "keeper" | "friend";
type Dive = -1 | 0 | 1;
type Result = "goal" | "saved" | null;
type Point = { x: number; y: number };
type Motion = "idle" | "anticipate" | "left" | "center" | "right" | "recover";

const TOTAL_SHOTS = 10;
const BALL_START: Point = { x: 50, y: 77 };
const AIM = { left: 24, right: 76, top: 21.5, bottom: 37 };

export default function PenaltyPage() {
  const [mode, setMode] = useState<Mode>("menu");

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#06162c] text-white select-none">
      <div className="mx-auto min-h-screen w-full max-w-[560px] bg-[#071d3c] shadow-2xl">
        <header className="flex h-[74px] items-center justify-between border-b border-cyan-200/10 px-4">
          <Link href="/tr" className="flex items-center gap-2 active:scale-95">
            <span className="text-xl">←</span>
            <img src="/footbattle-logo.png" alt="FootBattle" className="h-11 w-auto" />
          </Link>
          {mode !== "menu" && (
            <button onClick={() => setMode("menu")} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black tracking-wide">
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
    <section className="px-4 pb-10 pt-6">
      <div className="text-center">
        <div className="text-[10px] font-black tracking-[0.3em] text-cyan-200/60">FOOTBATTLE ARCADE</div>
        <h1 className="mt-2 text-4xl font-black tracking-tight">PENALTI</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">Şut çek, kaleye geç veya aynı cihazda arkadaşınla kapış.</p>
      </div>
      <div className="mt-7 space-y-3">
        <ModeCard icon="⚽" title="Penaltı At" text="Hedefle, gücü ayarla ve kaleciyi geç." action="ŞUT ÇEK" onClick={() => onSelect("shooter")} />
        <ModeCard icon="🧤" title="Kaleci Ol" text="Şutörü oku. Doğru anda doğru köşeye uç." action="KALEYE GEÇ" onClick={() => onSelect("keeper")} />
        <ModeCard icon="👥" title="Arkadaşınla" text="Sırayla şutör ve kaleci olun. En çok gol atan kazansın." action="2 KİŞİ OYNA" onClick={() => onSelect("friend")} />
      </div>
    </section>
  );
}

function ModeCard({ icon, title, text, action, onClick }: { icon: string; title: string; text: string; action: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group w-full overflow-hidden rounded-3xl border border-cyan-200/10 bg-gradient-to-br from-[#0a3158] to-[#082341] p-5 text-left shadow-lg transition active:scale-[0.99]">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-3xl">{icon}</div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">{text}</p>
          <div className="mt-3 inline-flex rounded-xl bg-yellow-300 px-3 py-2 text-[10px] font-black text-[#06213c]">{action} →</div>
        </div>
      </div>
    </button>
  );
}

function ShooterMode() {
  const pitchRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const timerRef = useRef<number | null>(null);
  const [aiming, setAiming] = useState(false);
  const [aim, setAim] = useState<Point>({ x: 50, y: 29 });
  const [ball, setBall] = useState<Point>(BALL_START);
  const [motion, setMotion] = useState<Motion>("idle");
  const [shot, setShot] = useState(0);
  const [goals, setGoals] = useState(0);
  const [result, setResult] = useState<Result>(null);
  const [power, setPower] = useState(0);

  const finished = shot >= TOTAL_SHOTS;

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

  function onBallDown(event: PointerEvent<HTMLButtonElement>) {
    if (result || finished || motion !== "idle") return;
    startRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    setAiming(true);
  }

  function onMove(event: PointerEvent<HTMLDivElement>) {
    if (!aiming || !startRef.current || !pitchRef.current) return;
    const rect = pitchRef.current.getBoundingClientRect();
    const dx = clamp(((event.clientX - startRef.current.x) / rect.width) * 100, -25, 25);
    const dy = clamp(((event.clientY - startRef.current.y) / rect.height) * 100, 0, 25);
    setAim({ x: clamp(50 - dx * 1.12, AIM.left, AIM.right), y: clamp(AIM.bottom - dy * 0.62, AIM.top, AIM.bottom) });
    setPower(Math.round(clamp(Math.hypot(dx, dy) / 31, 0, 1) * 100));
  }

  function release() {
    if (!aiming || result) return;
    setAiming(false);
    startRef.current = null;
    const target = aim;
    const direction: Dive = target.x < 43 ? -1 : target.x > 57 ? 1 : 0;
    const reads = Math.random() < 0.62;
    const keeperDive: Dive = reads ? direction : pickOther(direction);

    setMotion("anticipate");
    timerRef.current = window.setTimeout(() => {
      setMotion(keeperDive === -1 ? "left" : keeperDive === 1 ? "right" : "center");
      setBall(target);
    }, 120);

    window.setTimeout(() => {
      const keeperX = keeperDive === -1 ? 34 : keeperDive === 1 ? 66 : 50;
      const horizontal = Math.abs(target.x - keeperX);
      const highShot = target.y < 27;
      const reach = keeperDive === 0 ? 10 : highShot ? 15 : 17;
      const placement = Math.min(1, Math.abs(target.x - 50) / 26) * 0.62 + Math.min(1, (AIM.bottom - target.y) / (AIM.bottom - AIM.top)) * 0.38;
      let saveChance = 0.82 - placement * 0.34 - (power / 100) * 0.1;
      if (Math.abs(target.x - 50) > 21 && target.y < 25.5) saveChance = Math.min(saveChance, 0.34);
      const saved = horizontal <= reach && Math.random() < clamp(saveChance, 0.2, 0.82);
      setResult(saved ? "saved" : "goal");
      if (!saved) setGoals((v) => v + 1);
      window.setTimeout(() => advanceShooter(), 1150);
    }, 500);
  }

  function advanceShooter() {
    setShot((v) => v + 1);
    setResult(null);
    setAim({ x: 50, y: 29 });
    setBall(BALL_START);
    setMotion("recover");
    setPower(0);
    window.setTimeout(() => setMotion("idle"), 260);
  }

  if (finished) return <Finish title="Penaltı serisi bitti" value={`${goals}/10 GOL`} onRestart={() => window.location.reload()} />;

  return (
    <GameShell title="PENALTI AT" left={`${shot + 1}/10 ŞUT`} middle={`${goals} GOL`} right={`${power}% GÜÇ`}>
      <ArcadePitch ref={pitchRef} onPointerMove={onMove} onPointerUp={release}>
        <Stadium />
        <GoalFrame />
        <Keeper motion={motion} />
        {aiming && <AimReticle point={aim} />}
        <button onPointerDown={onBallDown} className="absolute z-30 -translate-x-1/2 -translate-y-1/2 text-[44px] drop-shadow-[0_8px_6px_rgba(0,0,0,.35)] transition-all duration-[480ms] ease-out" style={{ left: `${ball.x}%`, top: `${ball.y}%` }}>⚽</button>
        <PowerBar power={power} visible={aiming} />
        <ResultFlash result={result} />
        {!result && <Hint>{aiming ? "HEDEFİ BELİRLE • BIRAK VE VUR" : "TOPA BAS • GERİ VE YANA ÇEK"}</Hint>}
      </ArcadePitch>
    </GameShell>
  );
}

function KeeperMode() {
  const timerRef = useRef<number | null>(null);
  const [shot, setShot] = useState(0);
  const [saves, setSaves] = useState(0);
  const [result, setResult] = useState<Result>(null);
  const [ball, setBall] = useState<Point>(BALL_START);
  const [target, setTarget] = useState<Point>({ x: 50, y: 28 });
  const [motion, setMotion] = useState<Motion>("idle");
  const [armed, setArmed] = useState(false);
  const [cue, setCue] = useState<Dive | null>(null);
  const chosenRef = useRef<Dive | null>(null);

  const finished = shot >= TOTAL_SHOTS;

  useEffect(() => {
    if (!armed || result) return;
    const direction = pickWeightedDirection();
    const nextTarget = direction === -1 ? { x: random(25, 40), y: random(23, 34) } : direction === 1 ? { x: random(60, 75), y: random(23, 34) } : { x: random(45, 55), y: random(23, 34) };
    setTarget(nextTarget);
    setCue(Math.random() < 0.68 ? direction : pickOther(direction));
    setMotion("anticipate");

    timerRef.current = window.setTimeout(() => {
      setBall(nextTarget);
      const choice = chosenRef.current;
      const aligned = choice === direction;
      const centerTolerance = direction === 0 && choice === 0;
      const saved = (aligned || centerTolerance) && Math.random() < (direction === 0 ? 0.82 : 0.76);
      setResult(saved ? "saved" : "goal");
      if (saved) setSaves((v) => v + 1);
      window.setTimeout(() => advanceKeeper(), 1100);
    }, random(900, 1350));

    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [armed]);

  function chooseDive(direction: Dive) {
    if (!armed || result || chosenRef.current !== null) return;
    chosenRef.current = direction;
    setMotion(direction === -1 ? "left" : direction === 1 ? "right" : "center");
  }

  function startShot() {
    if (armed || result) return;
    chosenRef.current = null;
    setCue(null);
    setArmed(true);
  }

  function advanceKeeper() {
    setShot((v) => v + 1);
    setResult(null);
    setArmed(false);
    setBall(BALL_START);
    setCue(null);
    chosenRef.current = null;
    setMotion("recover");
    window.setTimeout(() => setMotion("idle"), 240);
  }

  if (finished) return <Finish title="Kaleci serisi bitti" value={`${saves}/10 KURTARIŞ`} onRestart={() => window.location.reload()} />;

  return (
    <GameShell title="KALECİ OL" left={`${shot + 1}/10 ŞUT`} middle={`${saves} KURTARIŞ`} right="AI ŞUTÖR">
      <ArcadePitch>
        <Stadium />
        <GoalFrame />
        <Keeper motion={motion} />
        <div className="absolute z-30 -translate-x-1/2 -translate-y-1/2 text-[44px] drop-shadow-[0_8px_6px_rgba(0,0,0,.35)] transition-all duration-[520ms] ease-in" style={{ left: `${ball.x}%`, top: `${ball.y}%` }}>⚽</div>
        {armed && !result && <ShooterCue direction={cue} />}
        {!armed && !result && <button onClick={startShot} className="absolute bottom-[9%] left-[16%] right-[16%] z-40 rounded-2xl bg-yellow-300 py-4 text-sm font-black text-[#06213c] shadow-lg active:scale-95">HAZIRIM • BAŞLAT</button>}
        {armed && !result && <DiveControls onChoose={chooseDive} disabled={chosenRef.current !== null} />}
        <ResultFlash result={result} />
      </ArcadePitch>
    </GameShell>
  );
}

function FriendMode() {
  const timerRef = useRef<number | null>(null);
  const [round, setRound] = useState(1);
  const [turn, setTurn] = useState<"A" | "B">("A");
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [shotChoice, setShotChoice] = useState<Dive | null>(null);
  const [keeperChoice, setKeeperChoice] = useState<Dive | null>(null);
  const [phase, setPhase] = useState<"shooter" | "handoff" | "keeper" | "play">("shooter");
  const [result, setResult] = useState<Result>(null);
  const [ball, setBall] = useState<Point>(BALL_START);
  const [motion, setMotion] = useState<Motion>("idle");

  const finished = round > 10;
  const shooter = turn;
  const keeper = turn === "A" ? "B" : "A";

  function lockShot(direction: Dive) {
    setShotChoice(direction);
    setPhase("handoff");
  }

  function handoffDone() { setPhase("keeper"); }

  function lockKeeper(direction: Dive) {
    if (shotChoice === null) return;
    setKeeperChoice(direction);
    setPhase("play");
    setMotion(direction === -1 ? "left" : direction === 1 ? "right" : "center");
    const target = shotChoice === -1 ? { x: 30, y: 27 } : shotChoice === 1 ? { x: 70, y: 27 } : { x: 50, y: 25.5 };
    window.setTimeout(() => setBall(target), 120);
    window.setTimeout(() => {
      const saved = direction === shotChoice && Math.random() < 0.78;
      setResult(saved ? "saved" : "goal");
      if (!saved) shooter === "A" ? setA((v) => v + 1) : setB((v) => v + 1);
      timerRef.current = window.setTimeout(nextTurn, 1150);
    }, 560);
  }

  function nextTurn() {
    setRound((v) => v + 1);
    setTurn((v) => v === "A" ? "B" : "A");
    setShotChoice(null);
    setKeeperChoice(null);
    setPhase("shooter");
    setResult(null);
    setBall(BALL_START);
    setMotion("recover");
    window.setTimeout(() => setMotion("idle"), 220);
  }

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

  if (finished) {
    const title = a === b ? "BERABERE" : a > b ? "OYUNCU A KAZANDI" : "OYUNCU B KAZANDI";
    return <Finish title={title} value={`${a} - ${b}`} onRestart={() => window.location.reload()} />;
  }

  return (
    <GameShell title="ARKADAŞINLA" left={`TUR ${round}/10`} middle={`A ${a} - ${b} B`} right={`ŞUTÖR ${shooter}`}>
      <ArcadePitch>
        <Stadium />
        <GoalFrame />
        <Keeper motion={motion} />
        <div className="absolute z-30 -translate-x-1/2 -translate-y-1/2 text-[44px] transition-all duration-[500ms]" style={{ left: `${ball.x}%`, top: `${ball.y}%` }}>⚽</div>

        {phase === "shooter" && <ChoicePanel title={`Oyuncu ${shooter} • Şutunu gizlice seç`} onChoose={lockShot} />}
        {phase === "handoff" && <Handoff shooter={shooter} keeper={keeper} onReady={handoffDone} />}
        {phase === "keeper" && <ChoicePanel title={`Oyuncu ${keeper} • Köşeyi seç`} onChoose={lockKeeper} />}
        {phase === "play" && !result && <Hint>ŞUT!</Hint>}
        <ResultFlash result={result} />
      </ArcadePitch>
    </GameShell>
  );
}

function GameShell({ title, left, middle, right, children }: { title: string; left: string; middle: string; right: string; children: React.ReactNode }) {
  return (
    <>
      <div className="bg-[#071d3c] px-4 pb-2 pt-3 text-center text-[11px] font-black tracking-[0.22em] text-cyan-200/75">{title}</div>
      <div className="grid grid-cols-3 gap-2 bg-[#071d3c] px-3 pb-3">
        {[left, middle, right].map((v) => <div key={v} className="rounded-xl border border-cyan-300/15 bg-[#061a34] px-2 py-3 text-center text-[10px] font-black">{v}</div>)}
      </div>
      {children}
    </>
  );
}

const ArcadePitch = ReactForwardPitch();
function ReactForwardPitch() {
  const React = require("react") as typeof import("react");
  return React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function PitchInner(props, ref) {
    return (
      <div ref={ref} {...props} className={`relative aspect-[9/11.6] overflow-hidden touch-none bg-[#23a957] ${props.className ?? ""}`} style={{ overscrollBehavior: "none", ...props.style }}>
        {props.children}
      </div>
    );
  });
}

function Stadium() {
  return (
    <>
      <div className="absolute inset-x-0 top-0 h-[22%] bg-gradient-to-b from-[#07152d] via-[#103a59] to-[#17627a]">
        <div className="absolute inset-x-0 bottom-0 h-8 bg-black/15" />
        <div className="absolute inset-x-0 bottom-2 flex justify-around text-[10px] font-black italic tracking-wider text-emerald-200/80"><span>FOOTBATTLE</span><span>FOOTBATTLE</span><span>FOOTBATTLE</span></div>
      </div>
      <div className="absolute inset-x-0 top-[22%] bottom-0 bg-[repeating-linear-gradient(0deg,#24a957_0_58px,#2bb660_58px_116px)]" />
      <div className="absolute left-[8%] right-[8%] top-[49%] h-[27%] rounded-b-[48%] border border-t-0 border-white/55" />
      <div className="absolute left-1/2 top-[75%] h-2 w-2 -translate-x-1/2 rounded-full bg-white/75" />
    </>
  );
}

function GoalFrame() {
  return (
    <div className="absolute left-[11%] right-[11%] top-[19%] z-10 h-[29%]">
      <div className="absolute inset-0 overflow-hidden border-x-[5px] border-t-[5px] border-white bg-white/[0.025] shadow-[0_5px_0_rgba(0,0,0,.18)]">
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.7) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.7) 1px,transparent 1px)", backgroundSize: "24px 22px" }} />
      </div>
      <div className="absolute -left-[5px] -top-[4px] h-[103%] w-[5px] rounded-full bg-white" />
      <div className="absolute -right-[5px] -top-[4px] h-[103%] w-[5px] rounded-full bg-white" />
    </div>
  );
}

function Keeper({ motion }: { motion: Motion }) {
  const pose = motion === "left" ? "-translate-x-[92%] -translate-y-[42%] -rotate-[36deg]" : motion === "right" ? "translate-x-[-8%] -translate-y-[42%] rotate-[36deg]" : motion === "center" ? "-translate-x-1/2 -translate-y-[66%] scale-105" : "-translate-x-1/2 -translate-y-1/2";
  const leftArm = motion === "left" ? "-rotate-[78deg] -translate-y-2" : motion === "right" ? "rotate-[48deg]" : "-rotate-[36deg]";
  const rightArm = motion === "right" ? "rotate-[78deg] -translate-y-2" : motion === "left" ? "-rotate-[48deg]" : "rotate-[36deg]";
  const crouch = motion === "anticipate" ? "scale-y-[0.92] translate-y-1" : "";

  return (
    <div className={`absolute left-1/2 top-[36%] z-20 h-[118px] w-[118px] origin-center transition-all duration-[420ms] ease-out ${pose} ${crouch}`}>
      <div className="absolute left-1/2 top-0 h-8 w-8 -translate-x-1/2 rounded-full bg-[#8b552f] shadow-inner" />
      <div className="absolute left-1/2 top-7 h-[50px] w-[44px] -translate-x-1/2 rounded-[14px_14px_18px_18px] border-b-4 border-orange-700 bg-orange-500 shadow-lg">
        <div className="absolute left-1/2 top-3 -translate-x-1/2 text-base font-black text-white">1</div>
      </div>
      <div className={`absolute left-[13px] top-[34px] h-4 w-[49px] origin-right rounded-full bg-orange-500 transition-transform duration-[360ms] ${leftArm}`}><div className="absolute -left-3 -top-2 h-8 w-8 rounded-lg border-2 border-lime-100 bg-lime-300" /></div>
      <div className={`absolute right-[13px] top-[34px] h-4 w-[49px] origin-left rounded-full bg-orange-500 transition-transform duration-[360ms] ${rightArm}`}><div className="absolute -right-3 -top-2 h-8 w-8 rounded-lg border-2 border-lime-100 bg-lime-300" /></div>
      <div className="absolute left-[36px] top-[70px] h-6 w-5 rounded-b-lg bg-slate-900" />
      <div className="absolute right-[36px] top-[70px] h-6 w-5 rounded-b-lg bg-slate-900" />
      <div className={`absolute left-[29px] top-[88px] h-8 w-4 origin-top rounded-full bg-[#e8bb8a] transition-transform duration-[360ms] ${motion === "left" ? "rotate-[30deg]" : motion === "right" ? "-rotate-[18deg]" : "rotate-[8deg]"}`}><div className="absolute -bottom-2 -left-1 h-4 w-7 rounded-full bg-slate-950" /></div>
      <div className={`absolute right-[29px] top-[88px] h-8 w-4 origin-top rounded-full bg-[#e8bb8a] transition-transform duration-[360ms] ${motion === "right" ? "-rotate-[30deg]" : motion === "left" ? "rotate-[18deg]" : "-rotate-[8deg]"}`}><div className="absolute -bottom-2 -right-1 h-4 w-7 rounded-full bg-slate-950" /></div>
    </div>
  );
}

function AimReticle({ point }: { point: Point }) {
  return <div className="pointer-events-none absolute z-40 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-yellow-200 shadow-[0_0_16px_rgba(254,240,138,.65)]" style={{ left: `${point.x}%`, top: `${point.y}%` }}><div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-200" /></div>;
}

function PowerBar({ power, visible }: { power: number; visible: boolean }) {
  if (!visible) return null;
  return <div className="absolute bottom-[18%] left-[10%] right-[10%] z-40 h-3 overflow-hidden rounded-full border border-white/15 bg-black/35"><div className="h-full bg-gradient-to-r from-emerald-300 via-yellow-300 to-orange-400 transition-[width]" style={{ width: `${power}%` }} /></div>;
}

function ShooterCue({ direction }: { direction: Dive | null }) {
  const text = direction === -1 ? "SOL OMUZ AÇILDI" : direction === 1 ? "SAĞ OMUZ AÇILDI" : direction === 0 ? "GÖVDE ORTADA" : "ŞUTÖR HAZIRLANIYOR";
  return <div className="absolute left-1/2 top-[63%] z-40 -translate-x-1/2 rounded-xl border border-yellow-200/20 bg-[#071d3c]/90 px-4 py-2 text-center text-[10px] font-black tracking-wide text-yellow-200">İPUCU • {text}</div>;
}

function DiveControls({ onChoose, disabled }: { onChoose: (d: Dive) => void; disabled: boolean }) {
  return <div className="absolute bottom-[5%] left-[3%] right-[3%] z-50 grid grid-cols-3 gap-2">{([[-1, "↖", "SOL"], [0, "↑", "ORTA"], [1, "↗", "SAĞ"]] as const).map(([d, icon, label]) => <button key={d} disabled={disabled} onClick={() => onChoose(d)} className="rounded-2xl border-2 border-[#082c50] bg-yellow-300 py-3 text-[#07315a] shadow-[0_4px_0_#082c50] active:translate-y-1 active:shadow-none disabled:opacity-45"><div className="text-2xl font-black">{icon}</div><div className="text-[10px] font-black">{label}</div></button>)}</div>;
}

function ChoicePanel({ title, onChoose }: { title: string; onChoose: (d: Dive) => void }) {
  return <div className="absolute bottom-[5%] left-[4%] right-[4%] z-50 rounded-2xl border border-white/10 bg-[#061a34]/95 p-3 shadow-xl"><div className="mb-3 text-center text-xs font-black">{title}</div><div className="grid grid-cols-3 gap-2">{([[-1,"← SOL"],[0,"↑ ORTA"],[1,"SAĞ →"]] as const).map(([d,t]) => <button key={d} onClick={() => onChoose(d)} className="rounded-xl bg-yellow-300 py-3 text-[10px] font-black text-[#06213c] active:scale-95">{t}</button>)}</div></div>;
}

function Handoff({ shooter, keeper, onReady }: { shooter: "A" | "B"; keeper: "A" | "B"; onReady: () => void }) {
  return <div className="absolute inset-0 z-[60] flex items-center justify-center bg-[#06152b]/95 p-6 text-center"><div><div className="text-5xl">🤝</div><h3 className="mt-4 text-2xl font-black">Telefonu Oyuncu {keeper}'ye ver</h3><p className="mt-2 text-sm text-slate-400">Oyuncu {shooter}'nın seçtiği köşe gizli tutuluyor.</p><button onClick={onReady} className="mt-6 rounded-2xl bg-yellow-300 px-8 py-4 text-sm font-black text-[#06213c]">KALECİ HAZIR</button></div></div>;
}

function ResultFlash({ result }: { result: Result }) {
  if (!result) return null;
  return <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-black/10"><div className={`animate-[pulse_650ms_ease-out_1] rounded-3xl border-4 border-[#082c50] px-8 py-5 text-center shadow-2xl ${result === "goal" ? "bg-yellow-300 text-[#07315a]" : "bg-cyan-300 text-[#07315a]"}`}><div className="text-4xl font-black">{result === "goal" ? "GOOOL!" : "KURTARIŞ!"}</div><div className="mt-1 text-[10px] font-black tracking-[0.2em]">{result === "goal" ? "AĞLARDA" : "KALECİ ÇIKARDI"}</div></div></div>;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <div className="absolute bottom-[6%] left-[10%] right-[10%] z-40 rounded-xl border border-cyan-200/15 bg-[#061a34]/90 px-3 py-3 text-center text-[10px] font-black tracking-wide text-yellow-200">{children}</div>;
}

function Finish({ title, value, onRestart }: { title: string; value: string; onRestart: () => void }) {
  return <div className="m-4 rounded-3xl border border-cyan-300/20 bg-[#07264d] p-8 text-center shadow-xl"><div className="text-6xl">🏆</div><h2 className="mt-4 text-2xl font-black">{title}</h2><p className="mt-5 text-4xl font-black text-yellow-300">{value}</p><button onClick={onRestart} className="mt-8 w-full rounded-2xl bg-yellow-300 py-4 font-black text-[#05294a]">TEKRAR OYNA</button></div>;
}

function pickWeightedDirection(): Dive {
  const r = Math.random();
  return r < 0.4 ? -1 : r > 0.6 ? 1 : 0;
}
function pickOther(direction: Dive): Dive { const pool = ([-1,0,1] as Dive[]).filter((v) => v !== direction); return pool[Math.floor(Math.random() * pool.length)]; }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }
function random(min: number, max: number) { return min + Math.random() * (max - min); }
