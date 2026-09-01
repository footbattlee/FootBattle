"use client";

import Link from "next/link";
import { forwardRef, useEffect, useRef, useState } from "react";
import {
  BALL_START,
  TOTAL_SHOTS,
  chooseKeeperDive,
  chooseKeeperTell,
  clamp,
  keeperSaved,
  scoreForGoal,
  shooterSaved,
  shotTarget,
  sideLabel,
  streakHeat,
  type Point,
  type Side,
} from "./game-logic";

type Mode = "menu" | "shooter" | "keeper" | "friend";
type Result = "goal" | "saved" | null;
type KeeperAnim = "idle" | "tell-left" | "tell-center" | "tell-right" | "dive-left" | "dive-center" | "dive-right" | "recover";
type ShooterAnim = "idle" | "windup" | "kick" | "follow";
type Phase = "ready" | "tell" | "shooting" | "result" | "reset";

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export default function PenaltyPage() {
  const [mode, setMode] = useState<Mode>("menu");
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#041322] text-white">
      <div className="mx-auto min-h-screen max-w-[760px] bg-[#061b32] shadow-[0_0_55px_rgba(0,0,0,.45)]">
        <header className="flex items-center justify-between border-b border-white/10 bg-[#05172b] px-4 py-3">
          <Link href="/tr" className="flex items-center gap-2 active:scale-95">
            <span className="text-xl">←</span>
            <img src="/footbattle-logo.png" alt="FootBattle" className="h-10 w-auto" />
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
    <section className="px-4 py-6 sm:px-6">
      <div className="text-center">
        <div className="text-[10px] font-black tracking-[.28em] text-cyan-200/65">FOOTBATTLE ARCADE</div>
        <h1 className="mt-2 text-4xl font-black">PENALTI</h1>
        <p className="mt-2 text-sm text-slate-400">Hızlı karar ver, köşeyi seç, seri yap.</p>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <ModeCard emoji="⚽" title="Penaltı At" text="Kaleciyi oku, köşeyi seç." onClick={() => onSelect("shooter")} />
        <ModeCard emoji="🧤" title="Kaleci Ol" text="Şutörü oku, doğru köşeye uç." onClick={() => onSelect("keeper")} />
        <ModeCard emoji="👥" title="Arkadaşınla" text="Aynı cihazda hızlı düello." onClick={() => onSelect("friend")} />
      </div>
    </section>
  );
}

function ModeCard({ emoji, title, text, onClick }: { emoji: string; title: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="overflow-hidden rounded-3xl border border-cyan-300/15 bg-gradient-to-b from-[#0a2d52] to-[#071a31] p-4 text-left active:scale-[.99]">
      <div className="flex h-28 items-center justify-center rounded-2xl bg-white/[.03] text-6xl">{emoji}</div>
      <h2 className="mt-4 text-lg font-black">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-slate-400">{text}</p>
      <div className="mt-4 text-xs font-black text-lime-300">OYNA →</div>
    </button>
  );
}

function ShooterMode() {
  const [shot, setShot] = useState(0);
  const [goals, setGoals] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [keeperAnim, setKeeperAnim] = useState<KeeperAnim>("idle");
  const [shooterAnim, setShooterAnim] = useState<ShooterAnim>("idle");
  const [ball, setBall] = useState<Point>(BALL_START);
  const [ballScale, setBallScale] = useState(1);
  const [result, setResult] = useState<Result>(null);
  const busy = phase !== "ready";
  const finished = shot >= TOTAL_SHOTS;
  const heat = streakHeat(streak);

  async function shoot(side: Side) {
    if (busy) return;
    const keeperSide = chooseKeeperDive(side);
    const target = shotTarget(side);
    setPhase("tell");
    setKeeperAnim(keeperSide === -1 ? "tell-left" : keeperSide === 1 ? "tell-right" : "tell-center");
    await sleep(360);

    setPhase("shooting");
    setShooterAnim("windup");
    await sleep(150);
    setShooterAnim("kick");
    setKeeperAnim(keeperSide === -1 ? "dive-left" : keeperSide === 1 ? "dive-right" : "dive-center");
    await sleep(70);
    setShooterAnim("follow");
    await animateBall(BALL_START, target, 420, setBall, setBallScale);

    const saved = shooterSaved(side, keeperSide, streak);
    setResult(saved ? "saved" : "goal");
    setPhase("result");
    if (saved) {
      setStreak(0);
      await deflectBall(target, keeperSide, setBall, setBallScale);
    } else {
      setGoals((v) => v + 1);
      setScore((v) => v + scoreForGoal(streak));
      setStreak((v) => v + 1);
      await sleep(420);
    }

    await sleep(520);
    setPhase("reset");
    setKeeperAnim("recover");
    await sleep(180);
    setShot((v) => v + 1);
    setKeeperAnim("idle");
    setShooterAnim("idle");
    setBall(BALL_START);
    setBallScale(1);
    setResult(null);
    setPhase("ready");
  }

  if (finished) return <Finish title="SERİ TAMAMLANDI" value={`${goals}/${TOTAL_SHOTS} GOL`} sub={`${score.toLocaleString("tr-TR")} PUAN`} />;

  return (
    <>
      <ScoreBar mode="PENALTI AT" left={`ŞUT ${shot + 1}/${TOTAL_SHOTS}`} middle={`GOL ${goals}`} right={`🔥 ${streak}`} heat={heat} />
      <Arena>
        <GoalScene />
        <KeeperCharacter anim={keeperAnim} />
        <ShooterSprite anim={shooterAnim} />
        <Ball point={ball} scale={ballScale} />
        <ResultFlash result={result} />
        <GameMessage>{phase === "ready" ? "KALECİYİ İZLE • KÖŞEYİ SEÇ" : phase === "tell" ? "KARARINI VER" : phase === "shooting" ? "ŞUT GİDİYOR…" : ""}</GameMessage>
        <DirectionControls disabled={busy} onPick={(side) => void shoot(side)} />
      </Arena>
    </>
  );
}

function KeeperMode() {
  const [shot, setShot] = useState(0);
  const [saves, setSaves] = useState(0);
  const [streak, setStreak] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [keeperAnim, setKeeperAnim] = useState<KeeperAnim>("idle");
  const [shooterAnim, setShooterAnim] = useState<ShooterAnim>("idle");
  const [ball, setBall] = useState<Point>(BALL_START);
  const [ballScale, setBallScale] = useState(1);
  const [result, setResult] = useState<Result>(null);
  const [tell, setTell] = useState<Side | null>(null);
  const keeperSideRef = useRef<Side>(0);
  const reactedRef = useRef(false);
  const finished = shot >= TOTAL_SHOTS;
  const heat = streakHeat(streak);

  useEffect(() => {
    if (finished || phase !== "ready") return;
    const id = window.setTimeout(() => void runShot(), 650);
    return () => window.clearTimeout(id);
  }, [finished, phase, shot]);

  async function runShot() {
    const realSide = ([-1, 0, 1] as Side[])[Math.floor(Math.random() * 3)];
    const hintSide = chooseKeeperTell(realSide);
    const target = shotTarget(realSide);
    keeperSideRef.current = 0;
    reactedRef.current = false;
    setTell(hintSide);
    setPhase("tell");
    setShooterAnim("windup");
    await sleep(650);
    setShooterAnim("kick");
    setPhase("shooting");
    await sleep(70);
    setShooterAnim("follow");
    await animateBall(BALL_START, target, 430, setBall, setBallScale);

    const saved = keeperSaved(realSide, keeperSideRef.current, reactedRef.current);
    setResult(saved ? "saved" : "goal");
    setPhase("result");
    if (saved) {
      setSaves((v) => v + 1);
      setStreak((v) => v + 1);
      await deflectBall(target, keeperSideRef.current, setBall, setBallScale);
    } else {
      setStreak(0);
      await sleep(420);
    }

    await sleep(520);
    setPhase("reset");
    setKeeperAnim("recover");
    await sleep(180);
    setShot((v) => v + 1);
    setKeeperAnim("idle");
    setShooterAnim("idle");
    setBall(BALL_START);
    setBallScale(1);
    setResult(null);
    setTell(null);
    setPhase("ready");
  }

  function dive(side: Side) {
    if (phase !== "tell" && phase !== "shooting") return;
    if (reactedRef.current) return;
    reactedRef.current = true;
    keeperSideRef.current = side;
    setKeeperAnim(side === -1 ? "dive-left" : side === 1 ? "dive-right" : "dive-center");
  }

  if (finished) return <Finish title="KALECİ SERİSİ BİTTİ" value={`${saves}/${TOTAL_SHOTS} KURTARIŞ`} sub={`EN SON SERİ ${streak}`} />;

  return (
    <>
      <ScoreBar mode="KALECİ OL" left={`ŞUT ${shot + 1}/${TOTAL_SHOTS}`} middle={`KURTARIŞ ${saves}`} right={`🔥 ${streak}`} heat={heat} />
      <Arena>
        <GoalScene />
        <KeeperCharacter anim={keeperAnim} />
        <ShooterSprite anim={shooterAnim} tell={tell ?? 0} />
        <Ball point={ball} scale={ballScale} />
        <ResultFlash result={result} />
        <GameMessage>{phase === "ready" ? "HAZIR OL" : phase === "tell" ? `ŞUTÖRÜ OKU${tell !== null ? ` • ${sideLabel(tell)} İPUCU` : ""}` : phase === "shooting" ? "ŞİMDİ!" : ""}</GameMessage>
        <DirectionControls disabled={phase !== "tell" && phase !== "shooting"} onPick={dive} />
      </Arena>
    </>
  );
}

function FriendMode() {
  const [turn, setTurn] = useState(0);
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [shotChoice, setShotChoice] = useState<Side | null>(null);
  const [hidden, setHidden] = useState(false);
  const [keeperChoice, setKeeperChoice] = useState<Side | null>(null);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [ball, setBall] = useState<Point>(BALL_START);
  const [ballScale, setBallScale] = useState(1);
  const [keeperAnim, setKeeperAnim] = useState<KeeperAnim>("idle");
  const [shooterAnim, setShooterAnim] = useState<ShooterAnim>("idle");
  const shooter = turn % 2 === 0 ? "A" : "B";
  const keeper = shooter === "A" ? "B" : "A";
  const finished = turn >= TOTAL_SHOTS;

  async function play() {
    if (shotChoice === null || keeperChoice === null || playing) return;
    setPlaying(true);
    setShooterAnim("windup");
    await sleep(180);
    setShooterAnim("kick");
    setKeeperAnim(keeperChoice === -1 ? "dive-left" : keeperChoice === 1 ? "dive-right" : "dive-center");
    await sleep(70);
    setShooterAnim("follow");
    const target = shotTarget(shotChoice);
    await animateBall(BALL_START, target, 420, setBall, setBallScale);
    const saved = shotChoice === keeperChoice && Math.random() < 0.86;
    setResult(saved ? "saved" : "goal");
    if (!saved) shooter === "A" ? setA((v) => v + 1) : setB((v) => v + 1);
    if (saved) await deflectBall(target, keeperChoice, setBall, setBallScale);
    else await sleep(420);
    await sleep(520);
    setTurn((v) => v + 1);
    setShotChoice(null);
    setKeeperChoice(null);
    setHidden(false);
    setPlaying(false);
    setResult(null);
    setKeeperAnim("idle");
    setShooterAnim("idle");
    setBall(BALL_START);
    setBallScale(1);
  }

  if (finished) return <Finish title={a === b ? "BERABERE" : a > b ? "OYUNCU A KAZANDI" : "OYUNCU B KAZANDI"} value={`${a} - ${b}`} sub="ARKADAŞ DÜELLOSU" />;

  if (playing) {
    return (
      <>
        <ScoreBar mode="ARKADAŞINLA" left={`A ${a}`} middle={`TUR ${turn + 1}/${TOTAL_SHOTS}`} right={`${b} B`} heat="normal" />
        <Arena><GoalScene /><KeeperCharacter anim={keeperAnim} /><ShooterSprite anim={shooterAnim} /><Ball point={ball} scale={ballScale} /><ResultFlash result={result} /></Arena>
      </>
    );
  }

  return (
    <section className="px-4 py-5">
      <div className="rounded-3xl border border-white/10 bg-[#082642] p-4">
        <div className="text-center text-xs font-black text-cyan-200">ARKADAŞINLA • TUR {turn + 1}/{TOTAL_SHOTS}</div>
        <div className="mt-4 grid grid-cols-2 gap-3"><MiniScore name="OYUNCU A" score={a} /><MiniScore name="OYUNCU B" score={b} /></div>
        <div className="mt-5 rounded-2xl bg-[#05192c] p-4 text-center text-sm font-black">⚽ Oyuncu {shooter} şutör • 🧤 Oyuncu {keeper} kaleci</div>
        {!hidden ? (
          <><DirectionRow value={shotChoice} onChange={setShotChoice} label={`Oyuncu ${shooter}: ŞUT KÖŞESİ`} /><button disabled={shotChoice === null} onClick={() => setHidden(true)} className="mt-4 w-full rounded-2xl bg-yellow-400 py-4 text-sm font-black text-[#06152b] disabled:opacity-30">SEÇİMİ GİZLE • TELEFONU VER</button></>
        ) : (
          <><DirectionRow value={keeperChoice} onChange={setKeeperChoice} label={`Oyuncu ${keeper}: KALECİ KÖŞESİ`} /><button disabled={keeperChoice === null} onClick={() => void play()} className="mt-4 w-full rounded-2xl bg-lime-400 py-4 text-sm font-black text-[#06152b] disabled:opacity-30">PENALTIYI OYNA</button></>
        )}
      </div>
    </section>
  );
}

const Arena = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function Arena({ children, className = "", ...props }, ref) {
  return <div ref={ref} {...props} className={`relative aspect-[9/11] overflow-hidden touch-none bg-[#168d49] sm:aspect-[10/9] ${className}`}>{children}</div>;
});

function GoalScene() {
  return (
    <>
      <div className="absolute inset-x-0 top-0 h-[28%] bg-[radial-gradient(circle_at_50%_100%,#2d6681_0%,#0b2b45_56%,#04131f_100%)]" />
      <div className="absolute inset-x-0 top-[23%] h-5 border-y border-white/10 bg-[#0b3650] text-center text-[8px] font-black italic tracking-[.3em] text-lime-300/80">FOOTBATTLE • FOOTBATTLE • FOOTBATTLE</div>
      <div className="absolute left-[7%] right-[7%] top-[27%] z-10 h-[30%]">
        <div className="absolute inset-0 border-x-[5px] border-t-[5px] border-white bg-[#1d9c52]/30" />
        <div className="absolute inset-[5px] opacity-50" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.52) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.52) 1px,transparent 1px)", backgroundSize: "18px 18px" }} />
      </div>
      <div className="absolute inset-x-0 top-[57%] bottom-0 bg-[linear-gradient(#23aa57,#188f48)]" />
      <div className="absolute left-[6%] right-[6%] top-[57%] h-[27%] rounded-b-[42%] border border-t-0 border-white/55" />
    </>
  );
}

function KeeperCharacter({ anim }: { anim: KeeperAnim }) {
  const side = anim.includes("left") ? -1 : anim.includes("right") ? 1 : 0;
  const diving = anim.startsWith("dive");
  const telling = anim.startsWith("tell");
  const x = side * (diving ? 82 : telling ? 16 : 0);
  const rotate = diving ? side * 30 : telling ? side * 5 : 0;
  const scaleX = diving ? 1.08 : 1;
  return (
    <div className="absolute left-1/2 top-[43%] z-30 h-[152px] w-[118px] transition-[transform] duration-300 ease-out" style={{ transform: `translate(-50%,-50%) translateX(${x}px) rotate(${rotate}deg) scaleX(${scaleX})` }}>
      <div className="absolute left-1/2 top-1 h-8 w-8 -translate-x-1/2 rounded-full bg-[#9c6038] shadow-inner" />
      <div className="absolute left-1/2 top-8 h-[66px] w-[54px] -translate-x-1/2 rounded-[20px_20px_14px_14px] bg-orange-500 shadow-lg"><div className="pt-5 text-center text-xl font-black text-orange-100">1</div></div>
      <div className="absolute left-[4px] top-[48px] h-4 w-[48px] origin-right rounded-full bg-orange-500" style={{ transform: `rotate(${diving ? -side * 28 - 12 : -14}deg)` }} />
      <div className="absolute right-[4px] top-[48px] h-4 w-[48px] origin-left rounded-full bg-orange-500" style={{ transform: `rotate(${diving ? -side * 28 + 12 : 14}deg)` }} />
      <div className="absolute left-0 top-[45px] h-5 w-5 rounded-md bg-yellow-300" />
      <div className="absolute right-0 top-[45px] h-5 w-5 rounded-md bg-yellow-300" />
      <div className="absolute left-[35px] top-[91px] h-[48px] w-4 rounded-full bg-slate-900" style={{ transform: `rotate(${diving ? side * 16 : 3}deg)` }} />
      <div className="absolute right-[35px] top-[91px] h-[48px] w-4 rounded-full bg-slate-900" style={{ transform: `rotate(${diving ? side * 16 : -3}deg)` }} />
      <div className="absolute left-[27px] top-[132px] h-3 w-8 rounded-full bg-black" /><div className="absolute right-[27px] top-[132px] h-3 w-8 rounded-full bg-black" />
    </div>
  );
}

function ShooterSprite({ anim, tell = 0 }: { anim: ShooterAnim; tell?: Side }) {
  const frame = anim === "idle" ? 0 : anim === "windup" ? 1 : anim === "kick" ? 3 : 4;
  const shift = anim === "windup" ? -18 + tell * 12 : tell * 10;
  return (
    <div className="absolute left-1/2 top-[68%] z-20 h-[168px] w-[168px] sm:h-[190px] sm:w-[190px]" style={{ transform: `translateX(calc(-50% + ${shift}px))` }}>
      <div className="h-full w-full bg-no-repeat drop-shadow-[0_10px_8px_rgba(0,0,0,.3)]" style={{ backgroundImage: "url('/penalty/shooter-sprite.svg')", backgroundSize: "500% 100%", backgroundPosition: `${frame * 25}% 0%` }} />
    </div>
  );
}

function Ball({ point, scale }: { point: Point; scale: number }) {
  return <div className="absolute z-50 text-[44px] drop-shadow-[0_7px_6px_rgba(0,0,0,.38)]" style={{ left: `${point.x}%`, top: `${point.y}%`, transform: `translate(-50%,-50%) scale(${scale})` }}>⚽</div>;
}

function DirectionControls({ disabled, onPick }: { disabled: boolean; onPick: (side: Side) => void }) {
  return (
    <div className="absolute bottom-3 left-3 right-3 z-[70] grid grid-cols-3 gap-2">
      <ArcadeButton disabled={disabled} label="↖ SOL" onClick={() => onPick(-1)} />
      <ArcadeButton disabled={disabled} label="↑ ORTA" onClick={() => onPick(0)} />
      <ArcadeButton disabled={disabled} label="SAĞ ↗" onClick={() => onPick(1)} />
    </div>
  );
}

function ArcadeButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return <button disabled={disabled} onPointerDown={onClick} className="rounded-2xl border-2 border-[#072b48] bg-yellow-300 py-3.5 text-xs font-black text-[#0a3151] shadow-[0_4px_0_#072b48] active:translate-y-1 active:shadow-none disabled:opacity-35">{label}</button>;
}

function GameMessage({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <div className="absolute bottom-[72px] left-[15%] right-[15%] z-[66] rounded-xl bg-[#05233a]/92 px-3 py-2.5 text-center text-[10px] font-black tracking-wide text-yellow-200">{children}</div>;
}

function ResultFlash({ result }: { result: Result }) {
  if (!result) return null;
  return <div className={`absolute left-1/2 top-[60%] z-[80] -translate-x-1/2 rounded-2xl border-2 border-[#041727] px-5 py-2 text-xl font-black italic shadow-xl ${result === "goal" ? "bg-yellow-300 text-[#0b3154]" : "bg-cyan-300 text-[#08314c]"}`}>{result === "goal" ? "GOOOL!" : "KURTARIŞ!"}</div>;
}

function ScoreBar({ mode, left, middle, right, heat }: { mode: string; left: string; middle: string; right: string; heat: ReturnType<typeof streakHeat> }) {
  const heatLabel = heat === "unstoppable" ? "DURDURULAMAZ" : heat === "on-fire" ? "ALEVDE" : heat === "hot" ? "SICAK" : "SERİ";
  return <div className="border-b border-white/10 bg-[#071d36] px-3 pb-3 pt-2"><div className="mb-2 text-center text-[10px] font-black tracking-[.22em] text-cyan-200">{mode} • {heatLabel}</div><div className="grid grid-cols-3 gap-2">{[left, middle, right].map((v) => <div key={v} className="rounded-xl border border-cyan-300/15 bg-[#06172b] px-2 py-2.5 text-center text-[10px] font-black">{v}</div>)}</div></div>;
}

function MiniScore({ name, score }: { name: string; score: number }) { return <div className="rounded-2xl bg-[#06182d] p-4 text-center"><div className="text-[10px] font-black text-slate-400">{name}</div><div className="mt-1 text-3xl font-black">{score}</div></div>; }
function DirectionRow({ value, onChange, label }: { value: Side | null; onChange: (v: Side) => void; label: string }) { return <div className="mt-5"><div className="mb-2 text-xs font-black text-slate-300">{label}</div><div className="grid grid-cols-3 gap-2">{([[-1, "← SOL"], [0, "↑ ORTA"], [1, "SAĞ →"]] as const).map(([v, text]) => <button key={v} onClick={() => onChange(v)} className={`rounded-xl border px-2 py-3 text-xs font-black ${value === v ? "border-lime-300 bg-lime-400 text-[#06152b]" : "border-white/10 bg-white/5"}`}>{text}</button>)}</div></div>; }
function Finish({ title, value, sub }: { title: string; value: string; sub: string }) { return <section className="px-4 py-10"><div className="rounded-3xl border border-cyan-300/20 bg-[#082642] p-8 text-center"><div className="text-6xl">🏆</div><h2 className="mt-4 text-2xl font-black">{title}</h2><div className="mt-4 text-5xl font-black text-yellow-300">{value}</div><div className="mt-2 text-xs font-black text-cyan-200">{sub}</div><button onClick={() => window.location.reload()} className="mt-8 w-full rounded-2xl bg-lime-400 py-4 font-black text-[#06152b]">TEKRAR OYNA</button></div></section>; }

async function animateBall(from: Point, to: Point, duration: number, setPoint: (p: Point) => void, setScale: (n: number) => void) {
  await new Promise<void>((resolve) => {
    const started = performance.now();
    const tick = (now: number) => {
      const raw = clamp((now - started) / duration, 0, 1);
      const t = 1 - Math.pow(1 - raw, 3);
      const arc = Math.sin(Math.PI * raw) * 5.5;
      setPoint({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t - arc });
      setScale(1 - 0.44 * t);
      if (raw < 1) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  });
}

async function deflectBall(target: Point, side: Side, setPoint: (p: Point) => void, setScale: (n: number) => void) {
  const out = { x: clamp(target.x + (side === 0 ? 8 : side * 13), 8, 92), y: 46 };
  await animateBall(target, out, 290, setPoint, setScale);
}
