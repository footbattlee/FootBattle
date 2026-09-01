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
        <ShooterCharacter anim={shooterAnim} />
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
        <ShooterCharacter anim={shooterAnim} tell={tell ?? 0} />
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
        <Arena><GoalScene /><KeeperCharacter anim={keeperAnim} /><ShooterCharacter anim={shooterAnim} /><Ball point={ball} scale={ballScale} /><ResultFlash result={result} /></Arena>
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
  const x = side * (diving ? 92 : telling ? 14 : 0);
  const y = diving ? 9 : 0;
  const rotate = diving ? side * 48 : telling ? side * 4 : 0;
  const leftUpper = diving ? (side === -1 ? -74 : -20) : telling && side === -1 ? -28 : -12;
  const rightUpper = diving ? (side === 1 ? 74 : 20) : telling && side === 1 ? 28 : 12;
  const leftFore = diving ? (side === -1 ? -20 : -8) : -8;
  const rightFore = diving ? (side === 1 ? 20 : 8) : 8;
  const leftLeg = diving ? (side === -1 ? 24 : -12) : 4;
  const rightLeg = diving ? (side === 1 ? -24 : 12) : -4;

  return (
    <div
      className="absolute left-1/2 top-[43.5%] z-30 h-[158px] w-[138px] transition-[transform] duration-300 ease-out will-change-transform"
      style={{ transform: `translate(-50%,-50%) translate(${x}px,${y}px) rotate(${rotate}deg)` }}
      aria-label="Kaleci"
    >
      <div className="absolute left-1/2 top-[145px] h-3 w-[92px] -translate-x-1/2 rounded-full bg-black/20 blur-[1px]" />

      <div className="absolute left-1/2 top-[3px] z-20 h-[39px] w-[39px] -translate-x-1/2 rounded-[46%_46%_48%_48%] bg-[#a96540] shadow-[inset_0_-4px_0_rgba(0,0,0,.08)]">
        <span className="absolute -left-[3px] top-[15px] h-3 w-2 rounded-full bg-[#9a5d39]" />
        <span className="absolute -right-[3px] top-[15px] h-3 w-2 rounded-full bg-[#9a5d39]" />
        <span className="absolute left-[4px] right-[4px] top-[-1px] h-[13px] rounded-[12px_12px_5px_5px] bg-[#23180f]" />
        <span className="absolute left-[9px] top-[17px] h-[3px] w-[4px] rounded-full bg-[#26170f]" />
        <span className="absolute right-[9px] top-[17px] h-[3px] w-[4px] rounded-full bg-[#26170f]" />
        <span className="absolute left-1/2 top-[27px] h-[3px] w-[10px] -translate-x-1/2 rounded-full bg-[#6f3d2a]/70" />
      </div>
      <div className="absolute left-1/2 top-[38px] z-[8] h-[12px] w-[15px] -translate-x-1/2 rounded-b-lg bg-[#985b37]" />

      <div className="absolute left-1/2 top-[44px] z-10 h-[58px] w-[65px] -translate-x-1/2 rounded-[19px_19px_12px_12px] bg-gradient-to-b from-[#ff771d] to-[#e9530a] shadow-[inset_0_3px_0_rgba(255,255,255,.2),0_5px_8px_rgba(0,0,0,.18)]">
        <span className="absolute left-1/2 top-[12px] -translate-x-1/2 text-[24px] font-black leading-none text-white">1</span>
        <span className="absolute bottom-0 left-[8px] right-[8px] h-[6px] rounded-t-full bg-[#c83d06]/45" />
      </div>
      <div className="absolute left-1/2 top-[97px] z-10 h-[24px] w-[55px] -translate-x-1/2 rounded-[7px_7px_11px_11px] bg-[#14233f]">
        <span className="absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2 bg-white/10" />
      </div>

      <div className="absolute left-[34px] top-[50px] z-[9] h-[18px] w-[43px] origin-right rounded-full bg-[#ef6414] transition-transform duration-200" style={{ transform: `rotate(${leftUpper}deg)` }}>
        <span className="absolute -left-[29px] top-[2px] h-[14px] w-[34px] origin-right rounded-full bg-[#b96b3e] transition-transform duration-200" style={{ transform: `rotate(${leftFore}deg)` }}>
          <b className="absolute -left-[13px] -top-[4px] h-[22px] w-[18px] rounded-[8px_8px_9px_9px] bg-[#ffd829] shadow-[inset_0_-3px_0_rgba(0,0,0,.12)]" />
        </span>
      </div>
      <div className="absolute right-[34px] top-[50px] z-[9] h-[18px] w-[43px] origin-left rounded-full bg-[#ef6414] transition-transform duration-200" style={{ transform: `rotate(${rightUpper}deg)` }}>
        <span className="absolute -right-[29px] top-[2px] h-[14px] w-[34px] origin-left rounded-full bg-[#b96b3e] transition-transform duration-200" style={{ transform: `rotate(${rightFore}deg)` }}>
          <b className="absolute -right-[13px] -top-[4px] h-[22px] w-[18px] rounded-[8px_8px_9px_9px] bg-[#ffd829] shadow-[inset_0_-3px_0_rgba(0,0,0,.12)]" />
        </span>
      </div>

      <div className="absolute left-[45px] top-[116px] z-[8] h-[34px] w-[15px] origin-top rounded-full bg-[#17243c] transition-transform duration-200" style={{ transform: `rotate(${leftLeg}deg)` }}>
        <span className="absolute bottom-[-2px] left-[-3px] h-[10px] w-[18px] rounded-b-md bg-white" />
        <b className="absolute bottom-[-7px] left-[-8px] h-[10px] w-[28px] rounded-[8px_8px_5px_5px] bg-[#07101a]" />
      </div>
      <div className="absolute right-[45px] top-[116px] z-[8] h-[34px] w-[15px] origin-top rounded-full bg-[#17243c] transition-transform duration-200" style={{ transform: `rotate(${rightLeg}deg)` }}>
        <span className="absolute bottom-[-2px] left-[-3px] h-[10px] w-[18px] rounded-b-md bg-white" />
        <b className="absolute bottom-[-7px] right-[-8px] h-[10px] w-[28px] rounded-[8px_8px_5px_5px] bg-[#07101a]" />
      </div>
    </div>
  );
}

function ShooterCharacter({ anim, tell = 0 }: { anim: ShooterAnim; tell?: Side }) {
  const windup = anim === "windup";
  const kick = anim === "kick";
  const follow = anim === "follow";
  const x = tell * 9 + (windup ? -15 : kick ? 5 : follow ? 11 : 0);
  const bodyRotate = windup ? -7 : kick ? 7 : follow ? 10 : 0;
  const leftArm = windup ? 22 : kick ? -18 : follow ? -24 : 8;
  const rightArm = windup ? -26 : kick ? 24 : follow ? 28 : -8;
  const supportLeg = windup ? -8 : kick ? -4 : follow ? 7 : 1;
  const strikingLeg = windup ? 34 : kick ? -62 : follow ? -34 : -2;
  const kneeBend = windup ? 36 : kick ? 7 : follow ? -4 : 2;

  return (
    <div
      className="absolute left-1/2 top-[67%] z-20 h-[166px] w-[126px] transition-[transform] duration-150 ease-out will-change-transform"
      style={{ transform: `translateX(calc(-50% + ${x}px)) rotate(${bodyRotate}deg)` }}
      aria-label="Şutör"
    >
      <div className="absolute left-1/2 top-[153px] h-3 w-[78px] -translate-x-1/2 rounded-full bg-black/20 blur-[1px]" />

      <div className="absolute left-1/2 top-[3px] z-20 h-[37px] w-[37px] -translate-x-1/2 rounded-[47%] bg-[#a96540] shadow-[inset_0_-4px_0_rgba(0,0,0,.08)]">
        <span className="absolute left-[2px] right-[2px] top-[-2px] h-[14px] rounded-[13px_13px_5px_5px] bg-[#18120e]" />
        <span className="absolute left-[5px] top-[7px] h-[10px] w-[8px] rotate-[-18deg] rounded-full bg-[#21160e]" />
        <span className="absolute right-[5px] top-[7px] h-[10px] w-[8px] rotate-[18deg] rounded-full bg-[#21160e]" />
      </div>
      <div className="absolute left-1/2 top-[37px] z-[8] h-[11px] w-[14px] -translate-x-1/2 rounded-b-lg bg-[#985b37]" />

      <div className="absolute left-1/2 top-[43px] z-10 h-[62px] w-[58px] -translate-x-1/2 rounded-[17px_17px_10px_10px] bg-gradient-to-b from-[#17b99a] to-[#087b74] shadow-[inset_0_3px_0_rgba(255,255,255,.18),0_5px_8px_rgba(0,0,0,.16)]">
        <span className="absolute left-1/2 top-[17px] -translate-x-1/2 text-[23px] font-black leading-none text-white">10</span>
        <span className="absolute bottom-[5px] left-1/2 h-[4px] w-[32px] -translate-x-1/2 rounded-full bg-white/18" />
      </div>
      <div className="absolute left-1/2 top-[99px] z-10 h-[24px] w-[53px] -translate-x-1/2 rounded-[7px_7px_11px_11px] bg-[#172c61]">
        <span className="absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2 bg-white/10" />
      </div>

      <div className="absolute left-[35px] top-[49px] z-[7] h-[15px] w-[38px] origin-right rounded-full bg-[#0a8f7f] transition-transform duration-150" style={{ transform: `rotate(${leftArm}deg)` }}>
        <span className="absolute -left-[27px] top-[1px] h-[13px] w-[31px] rounded-full bg-[#b96b3e]" />
      </div>
      <div className="absolute right-[35px] top-[49px] z-[7] h-[15px] w-[38px] origin-left rounded-full bg-[#0a8f7f] transition-transform duration-150" style={{ transform: `rotate(${rightArm}deg)` }}>
        <span className="absolute -right-[27px] top-[1px] h-[13px] w-[31px] rounded-full bg-[#b96b3e]" />
      </div>

      <div className="absolute left-[42px] top-[118px] z-[8] h-[39px] w-[15px] origin-top rounded-full bg-[#203b80] transition-transform duration-150" style={{ transform: `rotate(${supportLeg}deg)` }}>
        <span className="absolute bottom-[-2px] left-[-2px] h-[10px] w-[18px] rounded-b-md bg-[#f4f7fb]" />
        <b className="absolute bottom-[-8px] left-[-7px] h-[10px] w-[29px] rounded-[8px_8px_4px_4px] bg-[#b8ee35]" />
      </div>
      <div className="absolute right-[42px] top-[118px] z-[9] h-[34px] w-[15px] origin-top rounded-full bg-[#203b80] transition-transform duration-150" style={{ transform: `rotate(${strikingLeg}deg)` }}>
        <span className="absolute bottom-[-22px] left-[1px] h-[29px] w-[13px] origin-top rounded-full bg-[#a96540] transition-transform duration-150" style={{ transform: `rotate(${kneeBend}deg)` }}>
          <i className="absolute bottom-[-3px] left-[-2px] h-[10px] w-[17px] rounded-b-md bg-[#f4f7fb]" />
          <b className="absolute bottom-[-8px] left-[-4px] h-[10px] w-[30px] rounded-[8px_8px_4px_4px] bg-[#b8ee35]" />
        </span>
      </div>
    </div>
  );
}

function Ball({ point, scale }: { point: Point; scale: number }) {
  return (
    <div className="absolute z-50 will-change-transform" style={{ left: `${point.x}%`, top: `${point.y}%`, transform: `translate(-50%,-50%) scale(${scale})` }}>
      <div className="relative h-11 w-11 rounded-full border-2 border-slate-200 bg-white shadow-[0_6px_8px_rgba(0,0,0,.28)] sm:h-12 sm:w-12">
        <span className="absolute left-1/2 top-1/2 h-[13px] w-[13px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[#183b8c] [clip-path:polygon(50%_0%,100%_38%,82%_100%,18%_100%,0%_38%)]" />
        <span className="absolute left-[4px] top-[8px] h-[9px] w-[9px] rotate-12 bg-[#183b8c] [clip-path:polygon(50%_0%,100%_38%,82%_100%,18%_100%,0%_38%)]" />
        <span className="absolute right-[4px] top-[9px] h-[9px] w-[9px] -rotate-12 bg-[#183b8c] [clip-path:polygon(50%_0%,100%_38%,82%_100%,18%_100%,0%_38%)]" />
        <span className="absolute bottom-[3px] left-[8px] h-[8px] w-[8px] bg-[#183b8c] [clip-path:polygon(50%_0%,100%_38%,82%_100%,18%_100%,0%_38%)]" />
      </div>
    </div>
  );
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
