"use client";

import Link from "next/link";
import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";

type Mode = "menu" | "shooter" | "keeper" | "friend";
type Side = -1 | 0 | 1;
type Point = { x: number; y: number };
type Result = "goal" | "saved" | null;
type Phase = "ready" | "aiming" | "flight" | "result";

const TOTAL = 10;
const BALL_START: Point = { x: 50, y: 78 };
const GOAL_Y = 31;
const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const otherSide = (s: Side): Side => ([-1, 0, 1] as Side[]).filter((x) => x !== s)[Math.floor(Math.random() * 2)];

export default function PenaltyPage() {
  const [mode, setMode] = useState<Mode>("menu");

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#061628] text-white">
      <div className="mx-auto min-h-screen max-w-[720px] bg-[#071d36] shadow-2xl shadow-black/40">
        <header className="flex items-center justify-between border-b border-white/10 bg-[#061a31] px-4 py-3">
          <Link href="/tr" className="flex items-center gap-2 active:scale-95">
            <span className="text-xl">←</span>
            <img src="/footbattle-logo.png" alt="FootBattle" className="h-10 w-auto" />
          </Link>
          {mode !== "menu" && (
            <button onClick={() => setMode("menu")} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black tracking-wide">
              MODLAR
            </button>
          )}
        </header>
        {mode === "menu" ? <ModeMenu onSelect={setMode} /> : null}
        {mode === "shooter" ? <ShooterMode /> : null}
        {mode === "keeper" ? <KeeperMode /> : null}
        {mode === "friend" ? <FriendMode /> : null}
      </div>
    </main>
  );
}

function ModeMenu({ onSelect }: { onSelect: (m: Mode) => void }) {
  return (
    <section className="px-4 py-6 sm:px-6">
      <div className="text-center">
        <div className="text-[10px] font-black tracking-[.28em] text-cyan-200/70">FOOTBATTLE ARCADE</div>
        <h1 className="mt-2 text-4xl font-black">PENALTI</h1>
        <p className="mt-2 text-sm text-slate-400">Modunu seç, direkt maça gir.</p>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <ModeCard emoji="⚽" title="Penaltı At" text="Gücü ve köşeyi ayarla." onClick={() => onSelect("shooter")} />
        <ModeCard emoji="🧤" title="Kaleci Ol" text="Şutu oku, doğru anda uç." onClick={() => onSelect("keeper")} />
        <ModeCard emoji="👥" title="Arkadaşınla" text="Aynı cihazda karşılıklı." onClick={() => onSelect("friend")} />
      </div>
    </section>
  );
}

function ModeCard({ emoji, title, text, onClick }: { emoji: string; title: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group overflow-hidden rounded-3xl border border-cyan-300/15 bg-gradient-to-b from-[#0a2b50] to-[#071b32] p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/35 active:scale-[.99]">
      <div className="flex h-28 items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_50%_20%,rgba(34,211,238,.22),transparent_60%)] text-6xl">{emoji}</div>
      <h2 className="mt-4 text-lg font-black">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-slate-400">{text}</p>
      <div className="mt-4 text-xs font-black text-lime-300">OYNA →</div>
    </button>
  );
}

function ShooterMode() {
  const pitchRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [shot, setShot] = useState(0);
  const [goals, setGoals] = useState(0);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [aim, setAim] = useState<Point>({ x: 50, y: 24 });
  const [ball, setBall] = useState<Point>(BALL_START);
  const [power, setPower] = useState(0);
  const [keeperSide, setKeeperSide] = useState<Side>(0);
  const [result, setResult] = useState<Result>(null);

  const finished = shot >= TOTAL;

  function onBallDown(e: PointerEvent<HTMLButtonElement>) {
    if (phase !== "ready") return;
    dragRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    setPhase("aiming");
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (phase !== "aiming" || !dragRef.current || !pitchRef.current) return;
    const rect = pitchRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragRef.current.x) / rect.width) * 100;
    const dy = ((e.clientY - dragRef.current.y) / rect.height) * 100;
    const dragPower = clamp(Math.hypot(dx, dy) * 4.2, 18, 100);
    setPower(Math.round(dragPower));
    setAim({ x: clamp(50 - dx * 1.28, 20, 80), y: clamp(31 + dy * .55, 17, 31) });
  }

  async function fire() {
    if (phase !== "aiming") return;
    dragRef.current = null;
    setPhase("flight");
    const targetSide: Side = aim.x < 43 ? -1 : aim.x > 57 ? 1 : 0;
    const read = Math.random() < .64;
    const dive = read ? targetSide : otherSide(targetSide);
    setKeeperSide(dive);
    setBall({ x: aim.x, y: aim.y });
    await sleep(500);

    const placement = Math.min(1, Math.abs(aim.x - 50) / 30) * .62 + Math.min(1, (31 - aim.y) / 14) * .38;
    const sameSide = dive === targetSide;
    const saveChance = clamp(.77 - placement * .32 - (power / 100) * .12, .18, .78);
    const saved = sameSide && Math.random() < saveChance;
    const next: Result = saved ? "saved" : "goal";
    setResult(next);
    setPhase("result");
    if (saved) setStreak(0);
    else {
      const gain = 100 + Math.round(placement * 80) + Math.min(streak, 4) * 20;
      setGoals((v) => v + 1);
      setStreak((v) => v + 1);
      setScore((v) => v + gain);
    }
    await sleep(1150);
    setShot((v) => v + 1);
    setBall(BALL_START);
    setAim({ x: 50, y: 24 });
    setPower(0);
    setKeeperSide(0);
    setResult(null);
    setPhase("ready");
  }

  if (finished) return <Finish title="SERİ TAMAMLANDI" value={`${goals}/10 GOL`} sub={`${score.toLocaleString("tr-TR")} PUAN`} />;

  return (
    <>
      <ScoreBar mode="PENALTI AT" left={`ŞUT ${shot + 1}/${TOTAL}`} middle={`GOL ${goals}`} right={`🔥 ${streak}`} />
      <Arena ref={pitchRef} onPointerMove={onMove} onPointerUp={fire}>
        <GoalScene />
        <Goalkeeper side={keeperSide} active={phase === "flight" || phase === "result"} saved={result === "saved"} />
        <Shooter />
        <Ball point={ball} flying={phase === "flight" || phase === "result"} saved={result === "saved"} />
        {phase === "aiming" ? <AimMarker point={aim} /> : null}
        <button aria-label="Şut çek" onPointerDown={onBallDown} className="absolute left-1/2 top-[77%] z-40 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent" />
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
  const [phase, setPhase] = useState<"waiting" | "windup" | "flight" | "result">("waiting");
  const [keeperSide, setKeeperSide] = useState<Side>(0);
  const [target, setTarget] = useState<Point>({ x: 50, y: 24 });
  const [ball, setBall] = useState<Point>(BALL_START);
  const [result, setResult] = useState<Result>(null);
  const [tell, setTell] = useState<Side>(0);
  const targetSideRef = useRef<Side>(0);

  const finished = shot >= TOTAL;

  useEffect(() => {
    if (finished || phase !== "waiting") return;
    const id = window.setTimeout(() => void startAiShot(), 650);
    return () => window.clearTimeout(id);
  }, [phase, shot, finished]);

  async function startAiShot() {
    const r = Math.random();
    const side: Side = r < .38 ? -1 : r > .62 ? 1 : 0;
    targetSideRef.current = side;
    const x = side === -1 ? 27 + Math.random() * 12 : side === 1 ? 61 + Math.random() * 12 : 45 + Math.random() * 10;
    const y = 18 + Math.random() * 12;
    setTarget({ x, y });
    setTell(Math.random() < .72 ? side : otherSide(side));
    setPhase("windup");
    await sleep(700 + Math.random() * 380);
    setBall({ x, y });
    setPhase("flight");
    await sleep(470);
    resolveShot(side);
  }

  async function resolveShot(side: Side) {
    const saved = keeperSide === side && Math.random() < .82;
    setResult(saved ? "saved" : "goal");
    setPhase("result");
    if (saved) {
      setSaves((v) => v + 1);
      setStreak((v) => v + 1);
    } else setStreak(0);
    await sleep(1100);
    setShot((v) => v + 1);
    setBall(BALL_START);
    setKeeperSide(0);
    setTell(0);
    setResult(null);
    setPhase("waiting");
  }

  function dive(side: Side) {
    if (phase !== "windup" && phase !== "flight") return;
    if (keeperSide !== 0) return;
    setKeeperSide(side);
  }

  if (finished) return <Finish title="KALECİ SERİSİ BİTTİ" value={`${saves}/10 KURTARIŞ`} sub={`EN İYİ SERİ: ${streak}`} />;

  return (
    <>
      <ScoreBar mode="KALECİ OL" left={`ŞUT ${shot + 1}/${TOTAL}`} middle={`KURTARIŞ ${saves}`} right={`🔥 ${streak}`} />
      <Arena>
        <GoalScene />
        <AiShooter tell={tell} kicking={phase === "flight" || phase === "result"} />
        <Goalkeeper side={keeperSide} active={keeperSide !== 0 || phase === "result"} saved={result === "saved"} />
        <Ball point={ball} flying={phase === "flight" || phase === "result"} saved={result === "saved"} />
        <ResultFlash result={result} />
        <div className="absolute bottom-4 left-3 right-3 z-50 grid grid-cols-3 gap-2">
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
  const [result, setResult] = useState<Result>(null);
  const shooter = turn % 2 === 0 ? "A" : "B";
  const keeper = shooter === "A" ? "B" : "A";
  const finished = turn >= 10;

  async function resolve() {
    if (shotChoice === null || keeperChoice === null) return;
    const saved = shotChoice === keeperChoice && Math.random() < .8;
    const r: Result = saved ? "saved" : "goal";
    setResult(r);
    if (!saved) shooter === "A" ? setA((v) => v + 1) : setB((v) => v + 1);
    await sleep(1200);
    setTurn((v) => v + 1);
    setShotChoice(null);
    setKeeperChoice(null);
    setHidden(false);
    setResult(null);
  }

  if (finished) return <Finish title={a === b ? "BERABERE" : a > b ? "OYUNCU A KAZANDI" : "OYUNCU B KAZANDI"} value={`${a} - ${b}`} sub="ARKADAŞ DÜELLOSU" />;

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
            <button disabled={keeperChoice === null} onClick={() => void resolve()} className="mt-4 w-full rounded-2xl bg-lime-400 py-4 text-sm font-black text-[#06152b] disabled:opacity-30">PENALTIYI OYNA</button>
          </>
        )}
        {result ? <div className={`mt-4 rounded-2xl py-4 text-center text-2xl font-black ${result === "goal" ? "bg-emerald-500" : "bg-sky-500"}`}>{result === "goal" ? "GOOOL!" : "KURTARIŞ!"}</div> : null}
      </div>
    </section>
  );
}

function ScoreBar({ mode, left, middle, right }: { mode: string; left: string; middle: string; right: string }) {
  return <div className="border-b border-white/10 bg-[#071d36] px-3 pb-3 pt-2"><div className="mb-2 text-center text-[10px] font-black tracking-[.22em] text-cyan-200">{mode}</div><div className="grid grid-cols-3 gap-2">{[left,middle,right].map((v)=><div key={v} className="rounded-xl border border-cyan-300/15 bg-[#06172b] px-2 py-2.5 text-center text-[10px] font-black">{v}</div>)}</div></div>;
}

function Arena({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`relative aspect-[9/11] overflow-hidden touch-none bg-[#168d49] sm:aspect-[10/9] ${props.className ?? ""}`} style={{ overscrollBehavior: "none", ...props.style }}>{children}</div>;
}

function GoalScene() {
  return (
    <>
      <div className="absolute inset-x-0 top-0 h-[27%] overflow-hidden bg-[radial-gradient(circle_at_50%_100%,#244e6a_0%,#0b2742_55%,#061628_100%)]">
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle,#8ea8b6 1.3px,transparent 1.6px)", backgroundSize: "15px 13px" }} />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/35 to-transparent" />
      </div>
      <div className="absolute inset-x-0 top-[23%] h-5 border-y border-white/10 bg-[#0c3852] text-center text-[8px] font-black italic tracking-[.3em] text-lime-300/80">FOOTBATTLE • FOOTBATTLE • FOOTBATTLE</div>
      <div className="absolute left-[9%] right-[9%] top-[27%] z-10 h-[27%] [perspective:700px]">
        <div className="absolute inset-0 origin-top border-x-[5px] border-t-[5px] border-white bg-[#1e9a52]/35 shadow-[0_8px_18px_rgba(0,0,0,.28)] [transform:rotateX(4deg)]" />
        <div className="absolute inset-[5px] opacity-40" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.45) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.45) 1px,transparent 1px)", backgroundSize: "18px 18px" }} />
      </div>
      <div className="absolute left-[7%] right-[7%] top-[53%] h-[29%] rounded-b-[42%] border border-t-0 border-white/60" />
      <div className="absolute inset-x-0 top-[54%] bottom-0 bg-[linear-gradient(#1ea652,#1a974b_44%,#168c46)]" />
      <div className="absolute left-1/2 top-[70%] h-20 w-44 -translate-x-1/2 rounded-t-full border border-b-0 border-white/45" />
      <div className="absolute left-1/2 top-[71%] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white/55" />
    </>
  );
}

function Goalkeeper({ side, active, saved }: { side: Side; active: boolean; saved: boolean }) {
  const pose = side === -1 ? "translate(-46%,-50%) translateX(-115px) rotate(-32deg)" : side === 1 ? "translate(-54%,-50%) translateX(115px) rotate(32deg)" : active ? "translate(-50%,-50%) translateY(-8px) scale(1.04)" : "translate(-50%,-50%)";
  return (
    <div className="absolute left-1/2 top-[41%] z-30 h-[150px] w-[150px] transition-[transform] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]" style={{ transform: pose }}>
      <svg viewBox="0 0 180 180" className="h-full w-full drop-shadow-[0_9px_7px_rgba(0,0,0,.3)]">
        <g style={{ transformOrigin: "90px 90px" }}>
          <circle cx="90" cy="34" r="17" fill="#9d5b32" />
          <path d="M74 26 Q90 10 106 26 L103 19 Q88 7 77 18Z" fill="#2a1c18" />
          <rect x="68" y="49" width="44" height="61" rx="17" fill="#f36b22" />
          <rect x="74" y="101" width="32" height="24" rx="7" fill="#17263b" />
          <g style={{ transformOrigin: "72px 62px", transform: side === -1 ? "rotate(-34deg)" : side === 1 ? "rotate(18deg)" : "rotate(-10deg)" }}>
            <rect x="37" y="58" width="42" height="13" rx="7" fill="#f36b22" /><rect x="25" y="55" width="20" height="19" rx="7" fill="#d7ff55" />
          </g>
          <g style={{ transformOrigin: "108px 62px", transform: side === 1 ? "rotate(34deg)" : side === -1 ? "rotate(-18deg)" : "rotate(10deg)" }}>
            <rect x="101" y="58" width="42" height="13" rx="7" fill="#f36b22" /><rect x="135" y="55" width="20" height="19" rx="7" fill="#d7ff55" />
          </g>
          <g style={{ transformOrigin: "82px 118px", transform: active ? "rotate(20deg)" : "rotate(4deg)" }}><rect x="76" y="117" width="13" height="43" rx="7" fill="#17263b" /><rect x="72" y="153" width="22" height="9" rx="5" fill="#ecf2f8" /></g>
          <g style={{ transformOrigin: "98px 118px", transform: active ? "rotate(-20deg)" : "rotate(-4deg)" }}><rect x="91" y="117" width="13" height="43" rx="7" fill="#17263b" /><rect x="88" y="153" width="22" height="9" rx="5" fill="#ecf2f8" /></g>
          <text x="90" y="84" textAnchor="middle" fill="white" fontWeight="900" fontSize="24">1</text>
          {saved ? <circle cx={side === -1 ? 28 : side === 1 ? 152 : 90} cy="62" r="8" fill="#8cf7ff" opacity=".75" /> : null}
        </g>
      </svg>
    </div>
  );
}

function Shooter() {
  return <div className="absolute left-[50%] top-[68%] z-20 h-[150px] w-[120px] -translate-x-1/2"><svg viewBox="0 0 120 170" className="h-full w-full drop-shadow-[0_9px_8px_rgba(0,0,0,.28)]"><circle cx="61" cy="31" r="16" fill="#a66239"/><path d="M44 24 Q61 8 77 24 L74 16 Q59 7 48 14Z" fill="#201712"/><path d="M38 50 Q61 39 83 50 L79 110 H43Z" fill="#123f8f"/><text x="61" y="84" textAnchor="middle" fill="white" fontSize="29" fontWeight="900">10</text><rect x="26" y="54" width="17" height="59" rx="9" fill="#a66239" transform="rotate(16 34 54)"/><rect x="78" y="54" width="17" height="59" rx="9" fill="#a66239" transform="rotate(-16 86 54)"/><rect x="44" y="103" width="18" height="59" rx="8" fill="#102b67" transform="rotate(10 53 103)"/><rect x="64" y="103" width="18" height="59" rx="8" fill="#102b67" transform="rotate(-24 73 103)"/><rect x="74" y="150" width="31" height="10" rx="5" fill="#d7ff55" transform="rotate(-8 74 150)"/></svg></div>;
}

function AiShooter({ tell, kicking }: { tell: Side; kicking: boolean }) {
  const left = tell === -1 ? "45%" : tell === 1 ? "55%" : "50%";
  return <div className="absolute top-[67%] z-20 h-[120px] w-[90px] -translate-x-1/2 transition-all duration-300" style={{ left, transform: `translateX(-50%) rotate(${kicking ? (tell || 1) * 10 : 0}deg)` }}><svg viewBox="0 0 100 150" className="h-full w-full"><circle cx="50" cy="23" r="14" fill="#a66239"/><rect x="32" y="38" width="36" height="58" rx="12" fill="#e9eef5"/><rect x="34" y="88" width="14" height="50" rx="7" fill="#132c58"/><rect x="52" y="88" width="14" height="50" rx="7" fill="#132c58"/></svg></div>;
}

function Ball({ point, flying, saved }: { point: Point; flying: boolean; saved: boolean }) {
  return <div className="absolute z-40 -translate-x-1/2 -translate-y-1/2 transition-[left,top,transform] duration-500 ease-[cubic-bezier(.2,.75,.2,1)]" style={{ left: `${point.x}%`, top: `${point.y}%`, transform: `translate(-50%,-50%) scale(${flying ? .67 : 1}) ${saved ? "rotate(180deg)" : ""}` }}><div className="text-[44px] drop-shadow-[0_6px_5px_rgba(0,0,0,.35)] sm:text-[52px]">⚽</div></div>;
}

function AimMarker({ point }: { point: Point }) {
  return <div className="pointer-events-none absolute z-50 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-300 shadow-[0_0_20px_rgba(34,211,238,.65)]" style={{ left: `${point.x}%`, top: `${point.y}%` }}><div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200"/></div>;
}

function PowerMeter({ value }: { value: number }) {
  return <div className="absolute left-3 top-[33%] z-50 h-[33%] w-9 overflow-hidden rounded-2xl border-2 border-[#06203a] bg-[#06162a]/90 p-1 shadow-lg"><div className="relative h-full overflow-hidden rounded-xl bg-gradient-to-t from-emerald-400 via-yellow-300 to-red-500"><div className="absolute inset-x-0 top-0 bg-black/70 transition-all" style={{ height: `${100-value}%` }}/></div><div className="absolute -right-10 top-1/2 -translate-y-1/2 rotate-90 text-[9px] font-black tracking-widest">GÜÇ</div></div>;
}

function Hint({ children }: { children: React.ReactNode }) { if (!children) return null; return <div className="absolute bottom-4 left-[18%] right-[18%] z-50 rounded-xl border border-white/10 bg-[#06182d]/90 px-3 py-2.5 text-center text-[10px] font-black tracking-wide text-yellow-200">{children}</div>; }

function ResultFlash({ result }: { result: Result }) {
  if (!result) return null;
  return <div className={`absolute left-1/2 top-[47%] z-[60] -translate-x-1/2 -translate-y-1/2 rounded-3xl border-4 border-[#06152b] px-8 py-4 text-4xl font-black italic shadow-2xl ${result === "goal" ? "bg-yellow-300 text-[#0b3154]" : "bg-cyan-300 text-[#08314c]"}`}>{result === "goal" ? "GOOOL!" : "KURTARIŞ!"}</div>;
}

function DiveButton({ label, onClick }: { label: string; onClick: () => void }) { return <button onPointerDown={onClick} className="rounded-2xl border-2 border-[#062542] bg-yellow-300 py-3 text-xs font-black text-[#0a3151] shadow-[0_4px_0_#062542] active:translate-y-1 active:shadow-none">{label}</button>; }

function MiniScore({ name, score }: { name: string; score: number }) { return <div className="rounded-2xl bg-[#06182d] p-4 text-center"><div className="text-[10px] font-black text-slate-400">{name}</div><div className="mt-1 text-3xl font-black">{score}</div></div>; }

function DirectionRow({ value, onChange, label }: { value: Side | null; onChange: (v: Side) => void; label: string }) { return <div className="mt-5"><div className="mb-2 text-xs font-black text-slate-300">{label}</div><div className="grid grid-cols-3 gap-2">{([[-1,"← SOL"],[0,"↑ ORTA"],[1,"SAĞ →"]] as const).map(([v,t])=><button key={v} onClick={()=>onChange(v)} className={`rounded-xl border px-2 py-3 text-xs font-black ${value===v?"border-lime-300 bg-lime-400 text-[#06152b]":"border-white/10 bg-white/5"}`}>{t}</button>)}</div></div>; }

function Finish({ title, value, sub }: { title: string; value: string; sub: string }) {
  return <section className="px-4 py-10"><div className="rounded-3xl border border-cyan-300/20 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,.16),transparent_50%),#082642] p-8 text-center"><div className="text-6xl">🏆</div><h2 className="mt-4 text-2xl font-black">{title}</h2><div className="mt-4 text-5xl font-black text-yellow-300">{value}</div><div className="mt-2 text-xs font-black tracking-widest text-cyan-200">{sub}</div><button onClick={()=>window.location.reload()} className="mt-8 w-full rounded-2xl bg-lime-400 py-4 font-black text-[#06152b]">TEKRAR OYNA</button></div></section>;
}
