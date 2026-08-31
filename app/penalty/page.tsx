"use client";

import Link from "next/link";
import {
  forwardRef,
  PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type Mode = "menu" | "shooter" | "keeper" | "friend";
type Side = -1 | 0 | 1;
type Point = { x: number; y: number };
type Result = "goal" | "saved" | null;
type KeeperAnim =
  | "idle"
  | "anticipation"
  | "dive-left"
  | "dive-right"
  | "save-left"
  | "save-right"
  | "save-center"
  | "miss-left"
  | "miss-right"
  | "recover";
type ShooterAnim = "idle" | "runup" | "kick";
type ShooterPhase = "ready" | "aiming" | "runup" | "flight" | "result" | "reset";
type KeeperPhase = "waiting" | "windup" | "flight" | "result" | "reset";

const TOTAL = 10;
const BALL_START: Point = { x: 50, y: 78 };
const DEFAULT_TARGET: Point = { x: 50, y: 30 };
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const sideFromX = (x: number): Side => (x < 43 ? -1 : x > 57 ? 1 : 0);
const otherSide = (s: Side): Side => {
  const pool = ([-1, 0, 1] as Side[]).filter((v) => v !== s);
  return pool[Math.floor(Math.random() * pool.length)];
};

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
          {mode !== "menu" ? (
            <button
              onClick={() => setMode("menu")}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black tracking-wide"
            >
              MODLAR
            </button>
          ) : null}
        </header>

        {mode === "menu" ? <ModeMenu onSelect={setMode} /> : null}
        {mode === "shooter" ? <ShooterMode /> : null}
        {mode === "keeper" ? <KeeperMode /> : null}
        {mode === "friend" ? <FriendMode /> : null}
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
        <p className="mt-2 text-sm text-slate-400">Rolünü seç ve direkt maça gir.</p>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <ModeCard emoji="⚽" title="Penaltı At" text="Köşeyi ve gücü ayarla." onClick={() => onSelect("shooter")} />
        <ModeCard emoji="🧤" title="Kaleci Ol" text="Şutörü oku, doğru anda uç." onClick={() => onSelect("keeper")} />
        <ModeCard emoji="👥" title="Arkadaşınla" text="Aynı cihazda düello." onClick={() => onSelect("friend")} />
      </div>
    </section>
  );
}

function ModeCard({ emoji, title, text, onClick }: { emoji: string; title: string; text: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="overflow-hidden rounded-3xl border border-cyan-300/15 bg-gradient-to-b from-[#0a2d52] to-[#071a31] p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/35 active:scale-[.99]"
    >
      <div className="flex h-28 items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_50%_25%,rgba(34,211,238,.22),transparent_60%)] text-6xl">{emoji}</div>
      <h2 className="mt-4 text-lg font-black">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-slate-400">{text}</p>
      <div className="mt-4 text-xs font-black text-lime-300">OYNA →</div>
    </button>
  );
}

function ShooterMode() {
  const arenaRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [phase, setPhase] = useState<ShooterPhase>("ready");
  const [shot, setShot] = useState(0);
  const [goals, setGoals] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [aim, setAim] = useState<Point>(DEFAULT_TARGET);
  const [ball, setBall] = useState<Point>(BALL_START);
  const [ballScale, setBallScale] = useState(1);
  const [power, setPower] = useState(0);
  const [keeperSide, setKeeperSide] = useState<Side>(0);
  const [keeperAnim, setKeeperAnim] = useState<KeeperAnim>("idle");
  const [shooterAnim, setShooterAnim] = useState<ShooterAnim>("idle");
  const [result, setResult] = useState<Result>(null);
  const finished = shot >= TOTAL;

  function onBallDown(e: PointerEvent<HTMLButtonElement>) {
    if (phase !== "ready") return;
    dragRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    setPhase("aiming");
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (phase !== "aiming" || !dragRef.current || !arenaRef.current) return;
    const rect = arenaRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragRef.current.x) / rect.width) * 100;
    const dy = ((e.clientY - dragRef.current.y) / rect.height) * 100;
    const nextPower = clamp(Math.hypot(dx, dy) * 4.5, 20, 100);
    setPower(Math.round(nextPower));
    setAim({
      x: clamp(50 - dx * 1.34, 19, 81),
      y: clamp(31 + dy * .6, 15.5, 31),
    });
  }

  async function onRelease() {
    if (phase !== "aiming") return;
    dragRef.current = null;
    const target = aim;
    const targetSide = sideFromX(target.x);
    const reads = Math.random() < .64;
    const diveSide = reads ? targetSide : otherSide(targetSide);
    setKeeperSide(diveSide);

    setPhase("runup");
    setShooterAnim("runup");
    setKeeperAnim("anticipation");
    await sleep(240);
    setShooterAnim("kick");
    await sleep(150);

    setPhase("flight");
    setKeeperAnim(diveSide === -1 ? "dive-left" : diveSide === 1 ? "dive-right" : "anticipation");
    await animateBall(BALL_START, target, 520, setBall, setBallScale);

    const placement = Math.min(1, Math.abs(target.x - 50) / 31) * .62 + Math.min(1, (31 - target.y) / 15.5) * .38;
    const sameSide = diveSide === targetSide;
    const saveChance = clamp(.77 - placement * .33 - (power / 100) * .12, .17, .78);
    const saved = sameSide && Math.random() < saveChance;
    setResult(saved ? "saved" : "goal");
    setPhase("result");

    if (saved) {
      setKeeperAnim(diveSide === -1 ? "save-left" : diveSide === 1 ? "save-right" : "save-center");
      setStreak(0);
      const contact = diveSide === -1 ? { x: 29, y: 27 } : diveSide === 1 ? { x: 71, y: 27 } : { x: 50, y: 25 };
      await animateBall(target, contact, 180, setBall, setBallScale, .25);
      await animateBall(contact, { x: contact.x + (diveSide || 1) * 7, y: 42 }, 330, setBall, setBallScale, .45);
    } else {
      setKeeperAnim(diveSide === -1 ? "miss-left" : diveSide === 1 ? "miss-right" : "recover");
      setGoals((v) => v + 1);
      setStreak((v) => v + 1);
      setScore((v) => v + 100 + Math.round(placement * 90) + Math.min(streak, 4) * 20);
      await sleep(250);
      setBallScale(.54);
    }

    await sleep(820);
    setPhase("reset");
    setKeeperAnim("recover");
    setShooterAnim("idle");
    await sleep(260);
    setShot((v) => v + 1);
    setBall(BALL_START);
    setBallScale(1);
    setAim(DEFAULT_TARGET);
    setPower(0);
    setKeeperSide(0);
    setKeeperAnim("idle");
    setResult(null);
    setPhase("ready");
  }

  if (finished) return <Finish title="SERİ TAMAMLANDI" value={`${goals}/10 GOL`} sub={`${score.toLocaleString("tr-TR")} PUAN`} />;

  return (
    <>
      <ScoreBar mode="PENALTI AT" left={`ŞUT ${shot + 1}/${TOTAL}`} middle={`GOL ${goals}`} right={`🔥 ${streak}`} />
      <Arena ref={arenaRef} onPointerMove={onMove} onPointerUp={() => void onRelease()}>
        <GoalScene />
        <KeeperSprite anim={keeperAnim} side={keeperSide} />
        <ShooterSprite anim={shooterAnim} />
        <Ball point={ball} scale={ballScale} />
        {phase === "aiming" ? <AimMarker point={aim} /> : null}
        <button
          aria-label="Şut çek"
          onPointerDown={onBallDown}
          className="absolute left-1/2 top-[78%] z-50 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent"
        />
        <PowerMeter value={power} />
        <Hint>{phase === "ready" ? "TOPA BAS • GERİ VE YANA ÇEK" : phase === "aiming" ? "HEDEFİ VE GÜCÜ AYARLA • BIRAK" : ""}</Hint>
        <ResultFlash result={result} />
      </Arena>
    </>
  );
}

function KeeperMode() {
  const [shot, setShot] = useState(0);
  const [saves, setSaves] = useState(0);
  const [streak, setStreak] = useState(0);
  const [phase, setPhase] = useState<KeeperPhase>("waiting");
  const [keeperSide, setKeeperSide] = useState<Side>(0);
  const [keeperAnim, setKeeperAnim] = useState<KeeperAnim>("idle");
  const [shooterAnim, setShooterAnim] = useState<ShooterAnim>("idle");
  const [ball, setBall] = useState<Point>(BALL_START);
  const [ballScale, setBallScale] = useState(1);
  const [target, setTarget] = useState<Point>(DEFAULT_TARGET);
  const [tell, setTell] = useState<Side>(0);
  const [result, setResult] = useState<Result>(null);
  const lockedDive = useRef(false);
  const finished = shot >= TOTAL;

  useEffect(() => {
    if (finished || phase !== "waiting") return;
    const id = window.setTimeout(() => void startShot(), 700);
    return () => window.clearTimeout(id);
  }, [phase, shot, finished]);

  async function startShot() {
    const r = Math.random();
    const side: Side = r < .38 ? -1 : r > .62 ? 1 : 0;
    const x = side === -1 ? 24 + Math.random() * 14 : side === 1 ? 62 + Math.random() * 14 : 45 + Math.random() * 10;
    const y = 17 + Math.random() * 13;
    setTarget({ x, y });
    setTell(Math.random() < .72 ? side : otherSide(side));
    lockedDive.current = false;
    setKeeperAnim("anticipation");
    setShooterAnim("runup");
    setPhase("windup");
    await sleep(620 + Math.random() * 300);
    setShooterAnim("kick");
    setPhase("flight");
    await animateBall(BALL_START, { x, y }, 520, setBall, setBallScale);

    const saved = lockedDive.current && keeperSide === side && Math.random() < .84;
    setResult(saved ? "saved" : "goal");
    setPhase("result");
    if (saved) {
      setSaves((v) => v + 1);
      setStreak((v) => v + 1);
      setKeeperAnim(side === -1 ? "save-left" : side === 1 ? "save-right" : "save-center");
      const contact = side === -1 ? { x: 29, y: 27 } : side === 1 ? { x: 71, y: 27 } : { x: 50, y: 25 };
      await animateBall({ x, y }, contact, 170, setBall, setBallScale, .2);
      await animateBall(contact, { x: contact.x + (side || 1) * 7, y: 43 }, 320, setBall, setBallScale, .4);
    } else {
      setStreak(0);
      setKeeperAnim(keeperSide === -1 ? "miss-left" : keeperSide === 1 ? "miss-right" : "recover");
    }

    await sleep(820);
    setPhase("reset");
    setKeeperAnim("recover");
    setShooterAnim("idle");
    await sleep(260);
    setShot((v) => v + 1);
    setBall(BALL_START);
    setBallScale(1);
    setKeeperSide(0);
    setKeeperAnim("idle");
    setResult(null);
    setTell(0);
    setPhase("waiting");
  }

  function dive(side: Side) {
    if (phase !== "windup" && phase !== "flight") return;
    if (lockedDive.current) return;
    lockedDive.current = true;
    setKeeperSide(side);
    setKeeperAnim(side === -1 ? "dive-left" : side === 1 ? "dive-right" : "save-center");
  }

  if (finished) return <Finish title="KALECİ SERİSİ BİTTİ" value={`${saves}/10 KURTARIŞ`} sub={`SON SERİ: ${streak}`} />;

  return (
    <>
      <ScoreBar mode="KALECİ OL" left={`ŞUT ${shot + 1}/${TOTAL}`} middle={`KURTARIŞ ${saves}`} right={`🔥 ${streak}`} />
      <Arena>
        <GoalScene />
        <KeeperSprite anim={keeperAnim} side={keeperSide} />
        <ShooterSprite anim={shooterAnim} tell={tell} />
        <Ball point={ball} scale={ballScale} />
        <ResultFlash result={result} />
        <div className="absolute bottom-4 left-3 right-3 z-[70] grid grid-cols-3 gap-2">
          <DiveButton label="↖ SOL" onClick={() => dive(-1)} />
          <DiveButton label="↑ ORTA" onClick={() => dive(0)} />
          <DiveButton label="SAĞ ↗" onClick={() => dive(1)} />
        </div>
        <Hint>{phase === "waiting" ? "HAZIR OL" : phase === "windup" ? "ŞUTÖRÜ OKU • KÖŞEYİ SEÇ" : ""}</Hint>
      </Arena>
    </>
  );
}

function FriendMode() {
  const [turn, setTurn] = useState(0);
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  const [shotChoice, setShotChoice] = useState<Side | null>(null);
  const [keeperChoice, setKeeperChoice] = useState<Side | null>(null);
  const [hidden, setHidden] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [keeperAnim, setKeeperAnim] = useState<KeeperAnim>("idle");
  const [shooterAnim, setShooterAnim] = useState<ShooterAnim>("idle");
  const [ball, setBall] = useState<Point>(BALL_START);
  const [ballScale, setBallScale] = useState(1);
  const shooter = turn % 2 === 0 ? "A" : "B";
  const keeper = shooter === "A" ? "B" : "A";
  const finished = turn >= 10;

  async function play() {
    if (shotChoice === null || keeperChoice === null || playing) return;
    setPlaying(true);
    setShooterAnim("runup");
    setKeeperAnim("anticipation");
    await sleep(300);
    setShooterAnim("kick");
    setKeeperAnim(keeperChoice === -1 ? "dive-left" : keeperChoice === 1 ? "dive-right" : "save-center");
    const target: Point = { x: shotChoice === -1 ? 28 : shotChoice === 1 ? 72 : 50, y: 23 };
    await animateBall(BALL_START, target, 520, setBall, setBallScale);
    const saved = shotChoice === keeperChoice && Math.random() < .82;
    setResult(saved ? "saved" : "goal");
    if (saved) {
      setKeeperAnim(keeperChoice === -1 ? "save-left" : keeperChoice === 1 ? "save-right" : "save-center");
    } else {
      shooter === "A" ? setA((v) => v + 1) : setB((v) => v + 1);
      setKeeperAnim(keeperChoice === -1 ? "miss-left" : keeperChoice === 1 ? "miss-right" : "recover");
    }
    await sleep(1000);
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

  if (playing || result) {
    return (
      <>
        <ScoreBar mode="ARKADAŞINLA" left={`A ${a}`} middle={`TUR ${turn + 1}/10`} right={`${b} B`} />
        <Arena>
          <GoalScene />
          <KeeperSprite anim={keeperAnim} side={keeperChoice ?? 0} />
          <ShooterSprite anim={shooterAnim} />
          <Ball point={ball} scale={ballScale} />
          <ResultFlash result={result} />
        </Arena>
      </>
    );
  }

  return (
    <section className="px-4 py-5">
      <div className="rounded-3xl border border-white/10 bg-[#082642] p-4">
        <div className="text-center text-xs font-black text-cyan-200">ARKADAŞINLA • TUR {turn + 1}/10</div>
        <div className="mt-4 grid grid-cols-2 gap-3"><MiniScore name="OYUNCU A" score={a} /><MiniScore name="OYUNCU B" score={b} /></div>
        <div className="mt-5 rounded-2xl bg-[#05192c] p-4 text-center text-sm font-black">⚽ Oyuncu {shooter} şutör • 🧤 Oyuncu {keeper} kaleci</div>
        {!hidden ? (
          <>
            <DirectionRow value={shotChoice} onChange={setShotChoice} label={`Oyuncu ${shooter}: ŞUT KÖŞESİ`} />
            <button disabled={shotChoice === null} onClick={() => setHidden(true)} className="mt-4 w-full rounded-2xl bg-yellow-400 py-4 text-sm font-black text-[#06152b] disabled:opacity-30">SEÇİMİ GİZLE • TELEFONU VER</button>
          </>
        ) : (
          <>
            <DirectionRow value={keeperChoice} onChange={setKeeperChoice} label={`Oyuncu ${keeper}: KALECİ KÖŞESİ`} />
            <button disabled={keeperChoice === null} onClick={() => void play()} className="mt-4 w-full rounded-2xl bg-lime-400 py-4 text-sm font-black text-[#06152b] disabled:opacity-30">PENALTIYI OYNA</button>
          </>
        )}
      </div>
    </section>
  );
}

const Arena = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(function Arena({ children, className = "", style, ...props }, ref) {
  return (
    <div
      ref={ref}
      {...props}
      className={`relative aspect-[9/11] overflow-hidden touch-none bg-[#168d49] sm:aspect-[10/9] ${className}`}
      style={{ overscrollBehavior: "none", ...style }}
    >
      {children}
    </div>
  );
});

function GoalScene() {
  return (
    <>
      <div className="absolute inset-x-0 top-0 h-[29%] overflow-hidden bg-[radial-gradient(circle_at_50%_100%,#295b77_0%,#0c2b47_54%,#04131f_100%)]">
        <div className="absolute inset-0 opacity-55" style={{ backgroundImage: "radial-gradient(circle,#b1c1c9 1.3px,transparent 1.6px)", backgroundSize: "14px 12px" }} />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent" />
      </div>
      <div className="absolute inset-x-0 top-[24%] h-5 border-y border-white/10 bg-[#0b3650] text-center text-[8px] font-black italic tracking-[.3em] text-lime-300/80">FOOTBATTLE • FOOTBATTLE • FOOTBATTLE</div>
      <div className="absolute left-[8%] right-[8%] top-[28%] z-10 h-[28%] [perspective:800px]">
        <div className="absolute inset-0 origin-top border-x-[5px] border-t-[5px] border-white bg-[#1d9c52]/30 shadow-[0_8px_18px_rgba(0,0,0,.3)] [transform:rotateX(4deg)]" />
        <div className="absolute inset-[5px] opacity-48" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)", backgroundSize: "18px 18px" }} />
      </div>
      <div className="absolute inset-x-0 top-[56%] bottom-0 bg-[linear-gradient(#21a956,#19984c_44%,#148942)]" />
      <div className="absolute left-[6%] right-[6%] top-[56%] h-[28%] rounded-b-[42%] border border-t-0 border-white/55" />
      <div className="absolute left-1/2 top-[71%] h-20 w-48 -translate-x-1/2 rounded-t-full border border-b-0 border-white/45" />
      <div className="absolute left-1/2 top-[72%] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white/60" />
    </>
  );
}

function KeeperSprite({ anim, side }: { anim: KeeperAnim; side: Side }) {
  const frame = keeperFrame(anim);
  const xShift = side === -1 ? -76 : side === 1 ? 76 : 0;
  const yShift = anim.startsWith("save") ? -4 : anim.startsWith("dive") || anim.startsWith("miss") ? 5 : 0;
  return (
    <div
      className="absolute left-1/2 top-[43%] z-30 h-[160px] w-[160px] sm:h-[180px] sm:w-[180px] transition-[transform] duration-300 ease-out"
      style={{ transform: `translate(-50%,-50%) translate(${xShift}px,${yShift}px)` }}
    >
      <div
        className="h-full w-full bg-no-repeat drop-shadow-[0_10px_7px_rgba(0,0,0,.3)]"
        style={{
          backgroundImage: "url('/penalty/keeper-sprite.svg')",
          backgroundSize: "600% 100%",
          backgroundPosition: `${frame * 20}% 0%`,
        }}
      />
    </div>
  );
}

function keeperFrame(anim: KeeperAnim) {
  if (anim === "dive-left") return 1;
  if (anim === "dive-right") return 2;
  if (anim === "save-center" || anim === "anticipation") return 3;
  if (anim === "save-left" || anim === "miss-left") return 4;
  if (anim === "save-right" || anim === "miss-right") return 5;
  return 0;
}

function ShooterSprite({ anim, tell = 0 }: { anim: ShooterAnim; tell?: Side }) {
  const frame = anim === "idle" ? 0 : anim === "runup" ? 1 : 2;
  const tellShift = anim === "runup" ? tell * 16 : 0;
  return (
    <div className="absolute left-1/2 top-[69%] z-20 h-[150px] w-[150px] -translate-x-1/2 sm:h-[175px] sm:w-[175px]" style={{ marginLeft: `${tellShift}px` }}>
      <div
        className="h-full w-full bg-no-repeat drop-shadow-[0_10px_8px_rgba(0,0,0,.3)] transition-all duration-200"
        style={{
          backgroundImage: "url('/penalty/shooter-sprite.svg')",
          backgroundSize: "300% 100%",
          backgroundPosition: `${frame * 50}% 0%`,
        }}
      />
    </div>
  );
}

function Ball({ point, scale }: { point: Point; scale: number }) {
  return (
    <div
      className="absolute z-50 -translate-x-1/2 -translate-y-1/2 will-change-transform"
      style={{ left: `${point.x}%`, top: `${point.y}%`, transform: `translate(-50%,-50%) scale(${scale})` }}
    >
      <div className="text-[44px] drop-shadow-[0_7px_6px_rgba(0,0,0,.38)] sm:text-[52px]">⚽</div>
    </div>
  );
}

function AimMarker({ point }: { point: Point }) {
  return (
    <div className="pointer-events-none absolute z-[65] h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-300 shadow-[0_0_24px_rgba(34,211,238,.7)]" style={{ left: `${point.x}%`, top: `${point.y}%` }}>
      <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-100" />
    </div>
  );
}

function PowerMeter({ value }: { value: number }) {
  return (
    <div className="absolute left-3 top-[34%] z-[65] h-[31%] w-9 overflow-hidden rounded-2xl border-2 border-[#06203a] bg-[#06162a]/90 p-1 shadow-lg">
      <div className="relative h-full overflow-hidden rounded-xl bg-gradient-to-t from-emerald-400 via-yellow-300 to-red-500">
        <div className="absolute inset-x-0 top-0 bg-black/72 transition-all" style={{ height: `${100 - value}%` }} />
      </div>
    </div>
  );
}

function ResultFlash({ result }: { result: Result }) {
  if (!result) return null;
  return (
    <div className={`absolute left-1/2 top-[48%] z-[80] -translate-x-1/2 -translate-y-1/2 rounded-3xl border-[3px] border-[#041727] px-7 py-3 text-3xl font-black italic shadow-2xl sm:text-4xl ${result === "goal" ? "bg-yellow-300 text-[#0b3154]" : "bg-cyan-300 text-[#08314c]"}`}>
      {result === "goal" ? "GOOOL!" : "KURTARIŞ!"}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <div className="absolute bottom-4 left-[18%] right-[18%] z-[65] rounded-xl border border-white/10 bg-[#05172a]/92 px-3 py-2.5 text-center text-[10px] font-black tracking-wide text-yellow-200">{children}</div>;
}

function ScoreBar({ mode, left, middle, right }: { mode: string; left: string; middle: string; right: string }) {
  return <div className="border-b border-white/10 bg-[#071d36] px-3 pb-3 pt-2"><div className="mb-2 text-center text-[10px] font-black tracking-[.22em] text-cyan-200">{mode}</div><div className="grid grid-cols-3 gap-2">{[left, middle, right].map((v) => <div key={v} className="rounded-xl border border-cyan-300/15 bg-[#06172b] px-2 py-2.5 text-center text-[10px] font-black">{v}</div>)}</div></div>;
}

function DiveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button onPointerDown={onClick} className="rounded-2xl border-2 border-[#062542] bg-yellow-300 py-3 text-xs font-black text-[#0a3151] shadow-[0_4px_0_#062542] active:translate-y-1 active:shadow-none">{label}</button>;
}

function MiniScore({ name, score }: { name: string; score: number }) {
  return <div className="rounded-2xl bg-[#06182d] p-4 text-center"><div className="text-[10px] font-black text-slate-400">{name}</div><div className="mt-1 text-3xl font-black">{score}</div></div>;
}

function DirectionRow({ value, onChange, label }: { value: Side | null; onChange: (v: Side) => void; label: string }) {
  return <div className="mt-5"><div className="mb-2 text-xs font-black text-slate-300">{label}</div><div className="grid grid-cols-3 gap-2">{([[-1, "← SOL"], [0, "↑ ORTA"], [1, "SAĞ →"]] as const).map(([v, text]) => <button key={v} onClick={() => onChange(v)} className={`rounded-xl border px-2 py-3 text-xs font-black ${value === v ? "border-lime-300 bg-lime-400 text-[#06152b]" : "border-white/10 bg-white/5"}`}>{text}</button>)}</div></div>;
}

function Finish({ title, value, sub }: { title: string; value: string; sub: string }) {
  return <section className="px-4 py-10"><div className="rounded-3xl border border-cyan-300/20 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,.16),transparent_50%),#082642] p-8 text-center"><div className="text-6xl">🏆</div><h2 className="mt-4 text-2xl font-black">{title}</h2><div className="mt-4 text-5xl font-black text-yellow-300">{value}</div><div className="mt-2 text-xs font-black tracking-widest text-cyan-200">{sub}</div><button onClick={() => window.location.reload()} className="mt-8 w-full rounded-2xl bg-lime-400 py-4 font-black text-[#06152b]">TEKRAR OYNA</button></div></section>;
}

async function animateBall(
  from: Point,
  to: Point,
  duration: number,
  setPoint: (p: Point) => void,
  setScale: (n: number) => void,
  extraArc = 1,
) {
  await new Promise<void>((resolve) => {
    const started = performance.now();
    const tick = (now: number) => {
      const raw = clamp((now - started) / duration, 0, 1);
      const t = 1 - Math.pow(1 - raw, 3);
      const arc = Math.sin(Math.PI * raw) * 4.8 * extraArc;
      setPoint({
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t - arc,
      });
      setScale(1 - .42 * t);
      if (raw < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}
