"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
type Phase = "ready" | "tell" | "shooting" | "result" | "reset";

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export default function PenaltyPage() {
  const [mode, setMode] = useState<Mode>("menu");
  return (
    <main className="min-h-screen bg-[#020a13] text-white">
      <div className="mx-auto min-h-screen max-w-[460px] bg-[#06172a] shadow-[0_0_80px_rgba(0,0,0,.5)]">
        <header className="flex h-[64px] items-center justify-between border-b border-white/10 bg-[#051522] px-4">
          <Link href="/tr" className="flex items-center gap-2"><span>←</span><img src="/footbattle-logo.png" alt="FootBattle" className="h-9 w-auto" /></Link>
          {mode !== "menu" && <button onClick={() => setMode("menu")} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black">MODLAR</button>}
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
  return <section className="px-4 py-6"><div className="text-center"><div className="text-[9px] font-black tracking-[.3em] text-lime-300">FOOTBATTLE ARCADE</div><h1 className="mt-2 text-4xl font-black">PENALTI</h1><p className="mt-2 text-sm text-slate-400">Hızlı karar ver, köşeyi seç, seri yap.</p></div><div className="mt-6 grid gap-3"><ModeCard emoji="⚽" title="Penaltı At" text="Kaleciyi oku ve köşeyi seç." onClick={() => onSelect("shooter")} /><ModeCard emoji="🧤" title="Kaleci Ol" text="İpucunu oku ve doğru köşeye uç." onClick={() => onSelect("keeper")} /><ModeCard emoji="👥" title="Arkadaşınla" text="Aynı cihazda penaltı düellosu." onClick={() => onSelect("friend")} /></div></section>;
}
function ModeCard({ emoji, title, text, onClick }: { emoji: string; title: string; text: string; onClick: () => void }) { return <button onClick={onClick} className="flex items-center gap-4 rounded-2xl border border-cyan-300/15 bg-[#09243c] p-4 text-left active:scale-[.99]"><div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/5 text-4xl">{emoji}</div><div><h2 className="font-black">{title}</h2><p className="mt-1 text-xs text-slate-400">{text}</p><div className="mt-2 text-[10px] font-black text-lime-300">OYNA →</div></div></button>; }

function ShooterMode() {
  const [shot, setShot] = useState(0), [goals, setGoals] = useState(0), [score, setScore] = useState(0), [streak, setStreak] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready"), [keeperAnim, setKeeperAnim] = useState<KeeperAnim>("idle"), [ball, setBall] = useState<Point>(BALL_START), [ballScale, setBallScale] = useState(1), [result, setResult] = useState<Result>(null);
  const busy = phase !== "ready", finished = shot >= TOTAL_SHOTS;
  async function shoot(side: Side) {
    if (busy) return;
    const keeperSide = chooseKeeperDive(side), target = shotTarget(side);
    setPhase("tell"); setKeeperAnim(keeperSide === -1 ? "tell-left" : keeperSide === 1 ? "tell-right" : "tell-center");
    await sleep(390);
    setPhase("shooting"); setKeeperAnim(keeperSide === -1 ? "dive-left" : keeperSide === 1 ? "dive-right" : "dive-center");
    await animateBall(BALL_START, target, 430, setBall, setBallScale);
    const saved = shooterSaved(side, keeperSide, streak);
    setResult(saved ? "saved" : "goal"); setPhase("result");
    if (saved) { setStreak(0); await deflectBall(target, keeperSide, setBall, setBallScale); }
    else { setGoals(v => v + 1); setScore(v => v + scoreForGoal(streak)); setStreak(v => v + 1); await sleep(350); }
    await sleep(480); setPhase("reset"); setKeeperAnim("recover"); await sleep(180);
    setShot(v => v + 1); setKeeperAnim("idle"); setBall(BALL_START); setBallScale(1); setResult(null); setPhase("ready");
  }
  if (finished) return <Finish title="SERİ TAMAMLANDI" value={`${goals}/${TOTAL_SHOTS} GOL`} sub={`${score.toLocaleString("tr-TR")} PUAN`} />;
  return <GameShell mode="PENALTI AT" left={`ŞUT ${shot + 1}/${TOTAL_SHOTS}`} middle={`GOL ${goals}`} right={`🔥 ${streak}`} heat={streakHeat(streak)} keeperAnim={keeperAnim} ball={ball} ballScale={ballScale} result={result} message={phase === "ready" ? "KALECİYİ İZLE • KÖŞEYİ SEÇ" : phase === "tell" ? "KARARINI VER" : phase === "shooting" ? "ŞUT GİDİYOR…" : ""} controls={<DirectionControls disabled={busy} onPick={(side) => void shoot(side)} />} />;
}

function KeeperMode() {
  const [shot, setShot] = useState(0), [saves, setSaves] = useState(0), [streak, setStreak] = useState(0), [phase, setPhase] = useState<Phase>("ready"), [keeperAnim, setKeeperAnim] = useState<KeeperAnim>("idle"), [ball, setBall] = useState<Point>(BALL_START), [ballScale, setBallScale] = useState(1), [result, setResult] = useState<Result>(null), [tell, setTell] = useState<Side | null>(null);
  const keeperSideRef = useRef<Side>(0), reactedRef = useRef(false), finished = shot >= TOTAL_SHOTS;
  useEffect(() => { if (finished || phase !== "ready") return; const id = window.setTimeout(() => void runShot(), 650); return () => window.clearTimeout(id); }, [finished, phase, shot]);
  async function runShot() {
    const realSide = ([-1,0,1] as Side[])[Math.floor(Math.random()*3)], hintSide = chooseKeeperTell(realSide), target = shotTarget(realSide);
    keeperSideRef.current = 0; reactedRef.current = false; setTell(hintSide); setPhase("tell");
    await sleep(720); setPhase("shooting"); await animateBall(BALL_START, target, 440, setBall, setBallScale);
    const saved = keeperSaved(realSide, keeperSideRef.current, reactedRef.current); setResult(saved ? "saved" : "goal"); setPhase("result");
    if (saved) { setSaves(v=>v+1); setStreak(v=>v+1); await deflectBall(target, keeperSideRef.current, setBall, setBallScale); } else { setStreak(0); await sleep(350); }
    await sleep(480); setPhase("reset"); setKeeperAnim("recover"); await sleep(180); setShot(v=>v+1); setKeeperAnim("idle"); setBall(BALL_START); setBallScale(1); setResult(null); setTell(null); setPhase("ready");
  }
  function dive(side: Side) { if ((phase !== "tell" && phase !== "shooting") || reactedRef.current) return; reactedRef.current = true; keeperSideRef.current = side; setKeeperAnim(side === -1 ? "dive-left" : side === 1 ? "dive-right" : "dive-center"); }
  if (finished) return <Finish title="KALECİ SERİSİ BİTTİ" value={`${saves}/${TOTAL_SHOTS} KURTARIŞ`} sub={`SERİ ${streak}`} />;
  return <GameShell mode="KALECİ OL" left={`ŞUT ${shot + 1}/${TOTAL_SHOTS}`} middle={`KURTARIŞ ${saves}`} right={`🔥 ${streak}`} heat={streakHeat(streak)} keeperAnim={keeperAnim} ball={ball} ballScale={ballScale} result={result} tell={tell} message={phase === "ready" ? "HAZIR OL" : phase === "tell" ? `ŞUTÖR İPUCU • ${tell !== null ? sideLabel(tell) : ""}` : phase === "shooting" ? "ŞİMDİ!" : ""} controls={<DirectionControls disabled={phase !== "tell" && phase !== "shooting"} onPick={dive} />} />;
}

function FriendMode() {
  const [turn,setTurn]=useState(0),[a,setA]=useState(0),[b,setB]=useState(0),[shotChoice,setShotChoice]=useState<Side|null>(null),[keeperChoice,setKeeperChoice]=useState<Side|null>(null),[hidden,setHidden]=useState(false),[playing,setPlaying]=useState(false),[result,setResult]=useState<Result>(null),[keeperAnim,setKeeperAnim]=useState<KeeperAnim>("idle"),[ball,setBall]=useState<Point>(BALL_START),[ballScale,setBallScale]=useState(1);
  const shooter=turn%2===0?"A":"B", keeper=shooter==="A"?"B":"A", finished=turn>=TOTAL_SHOTS;
  async function play(){ if(shotChoice===null||keeperChoice===null||playing)return; setPlaying(true); setKeeperAnim(keeperChoice===-1?"dive-left":keeperChoice===1?"dive-right":"dive-center"); const target=shotTarget(shotChoice); await animateBall(BALL_START,target,430,setBall,setBallScale); const saved=shotChoice===keeperChoice&&Math.random()<.86; setResult(saved?"saved":"goal"); if(!saved)(shooter==="A"?setA:setB)(v=>v+1); if(saved)await deflectBall(target,keeperChoice,setBall,setBallScale); else await sleep(350); await sleep(500); setTurn(v=>v+1); setShotChoice(null);setKeeperChoice(null);setHidden(false);setPlaying(false);setResult(null);setKeeperAnim("idle");setBall(BALL_START);setBallScale(1); }
  if(finished)return <Finish title={a===b?"BERABERE":a>b?"OYUNCU A KAZANDI":"OYUNCU B KAZANDI"} value={`${a} - ${b}`} sub="ARKADAŞ DÜELLOSU" />;
  if(playing)return <GameShell mode="ARKADAŞINLA" left={`A ${a}`} middle={`TUR ${turn+1}/${TOTAL_SHOTS}`} right={`${b} B`} heat="normal" keeperAnim={keeperAnim} ball={ball} ballScale={ballScale} result={result} message="" controls={null} />;
  return <section className="px-4 py-5"><div className="rounded-3xl border border-white/10 bg-[#082642] p-4"><div className="text-center text-xs font-black text-cyan-200">ARKADAŞINLA • TUR {turn+1}/{TOTAL_SHOTS}</div><div className="mt-4 grid grid-cols-2 gap-3"><MiniScore name="OYUNCU A" score={a}/><MiniScore name="OYUNCU B" score={b}/></div><div className="mt-5 rounded-2xl bg-[#05192c] p-4 text-center text-sm font-black">⚽ Oyuncu {shooter} şutör • 🧤 Oyuncu {keeper} kaleci</div>{!hidden?<><DirectionRow value={shotChoice} onChange={setShotChoice} label={`Oyuncu ${shooter}: ŞUT KÖŞESİ`}/><button disabled={shotChoice===null} onClick={()=>setHidden(true)} className="mt-4 w-full rounded-2xl bg-yellow-300 py-4 text-sm font-black text-[#06152b] disabled:opacity-30">SEÇİMİ GİZLE • TELEFONU VER</button></>:<><DirectionRow value={keeperChoice} onChange={setKeeperChoice} label={`Oyuncu ${keeper}: KALECİ KÖŞESİ`}/><button disabled={keeperChoice===null} onClick={()=>void play()} className="mt-4 w-full rounded-2xl bg-lime-400 py-4 text-sm font-black text-[#06152b] disabled:opacity-30">PENALTIYI OYNA</button></>}</div></section>;
}

function GameShell({mode,left,middle,right,heat,keeperAnim,ball,ballScale,result,tell=null,message,controls}:{mode:string;left:string;middle:string;right:string;heat:ReturnType<typeof streakHeat>;keeperAnim:KeeperAnim;ball:Point;ballScale:number;result:Result;tell?:Side|null;message:string;controls:React.ReactNode}){
  return <><ScoreBar mode={mode} left={left} middle={middle} right={right} heat={heat}/><div className="relative h-[calc(100dvh-128px)] min-h-[540px] overflow-hidden bg-[linear-gradient(#0d6d43,#0b5b38_58%,#073d27)]"><div className="absolute inset-0 opacity-40" style={{backgroundImage:"repeating-linear-gradient(#ffffff08 0 52px,transparent 52px 104px)"}}/><div className="absolute left-[8%] right-[8%] top-[44%] h-[28%] rounded-b-[50%] border border-t-0 border-white/20"/><div className="absolute left-1/2 top-[74%] h-2 w-2 -translate-x-1/2 rounded-full bg-white/60"/><Goal keeperAnim={keeperAnim}/><Ball point={ball} scale={ballScale} tell={tell}/><ResultFlash result={result}/><GameMessage>{message}</GameMessage>{controls}</div><ArcadeStyles/></>;
}

function Goal({keeperAnim}:{keeperAnim:KeeperAnim}){return <div className="fb-goal"><div className="fb-net"/><div className="fb-post fb-post-top"/><div className="fb-post fb-post-left"/><div className="fb-post fb-post-right"/><KeeperCharacter anim={keeperAnim}/></div>}
function KeeperCharacter({anim}:{anim:KeeperAnim}){const state=anim==="idle"||anim==="recover"?"ready":anim;return <div className={`fb-keeper fb-keeper-${state}`} aria-label="Kaleci"><span className="fb-k-head"><i className="fb-k-ear fb-k-ear-l"/><i className="fb-k-ear fb-k-ear-r"/><i className="fb-k-hair"/><i className="fb-k-face"/></span><span className="fb-k-neck"/><span className="fb-k-shirt"><i>1</i><b/></span><span className="fb-k-shorts"><i/></span><span className="fb-k-arm fb-k-arm-l"><span className="fb-k-forearm"><i className="fb-k-glove"/></span></span><span className="fb-k-arm fb-k-arm-r"><span className="fb-k-forearm"><i className="fb-k-glove"/></span></span><span className="fb-k-leg fb-k-leg-l"><i className="fb-k-sock"/><b className="fb-k-boot"/></span><span className="fb-k-leg fb-k-leg-r"><i className="fb-k-sock"/><b className="fb-k-boot"/></span></div>}
function Ball({point,scale,tell}:{point:Point;scale:number;tell?:Side|null}){const nudge=tell===-1?-5:tell===1?5:0;return <div className="absolute z-20" style={{left:`${point.x}%`,top:`${point.y}%`,transform:`translate(-50%,-50%) translateX(${nudge}px) scale(${scale})`}}><div className="grid h-10 w-10 place-items-center rounded-full border-2 border-[#cfd7e6] bg-white shadow-[0_6px_8px_rgba(0,0,0,.35)]"><div className="h-3 w-3 rotate-45 bg-[#143b79]"/></div></div>}
function DirectionControls({disabled,onPick}:{disabled:boolean;onPick:(side:Side)=>void}){return <div className="absolute bottom-3 left-3 right-3 z-30 grid grid-cols-3 gap-2"><ArcadeButton disabled={disabled} label="↖ SOL" onClick={()=>onPick(-1)}/><ArcadeButton disabled={disabled} label="↑ ORTA" onClick={()=>onPick(0)}/><ArcadeButton disabled={disabled} label="SAĞ ↗" onClick={()=>onPick(1)}/></div>}
function ArcadeButton({label,disabled,onClick}:{label:string;disabled:boolean;onClick:()=>void}){return <button disabled={disabled} onPointerDown={onClick} className="rounded-xl border-2 border-[#062b48] bg-yellow-300 py-4 text-xs font-black text-[#0a3151] shadow-[0_4px_0_#062b48] active:translate-y-1 active:shadow-none disabled:opacity-35">{label}</button>}
function GameMessage({children}:{children:React.ReactNode}){if(!children)return null;return <div className="absolute bottom-[76px] left-[14%] right-[14%] z-30 rounded-xl bg-[#05233a]/95 px-3 py-2 text-center text-[10px] font-black tracking-wide text-yellow-200">{children}</div>}
function ResultFlash({result}:{result:Result}){if(!result)return null;return <div className={`absolute left-1/2 top-[55%] z-40 -translate-x-1/2 -translate-y-1/2 rotate-[-3deg] rounded-lg border-[3px] border-[#061b2e] px-5 py-2 text-xl font-black shadow-[5px_5px_0_#061b2e] ${result==="goal"?"bg-lime-300 text-[#0b3154]":"bg-[#ff6a44] text-white"}`}>{result==="goal"?"GOOOL!":"KURTARIŞ!"}</div>}
function ScoreBar({mode,left,middle,right,heat}:{mode:string;left:string;middle:string;right:string;heat:ReturnType<typeof streakHeat>}){const h=heat==="unstoppable"?"DURDURULAMAZ":heat==="on-fire"?"ALEVDE":heat==="hot"?"SICAK":"SERİ";return <div className="h-[64px] border-b border-white/10 bg-[#071d36] px-3 py-2"><div className="mb-2 text-center text-[9px] font-black tracking-[.22em] text-cyan-200">{mode} • {h}</div><div className="grid grid-cols-3 gap-2">{[left,middle,right].map(v=><div key={v} className="rounded-lg bg-[#06172b] px-2 py-2 text-center text-[10px] font-black">{v}</div>)}</div></div>}
function MiniScore({name,score}:{name:string;score:number}){return <div className="rounded-2xl bg-[#06182d] p-4 text-center"><div className="text-[10px] font-black text-slate-400">{name}</div><div className="mt-1 text-3xl font-black">{score}</div></div>}
function DirectionRow({value,onChange,label}:{value:Side|null;onChange:(v:Side)=>void;label:string}){return <div className="mt-5"><div className="mb-2 text-xs font-black text-slate-300">{label}</div><div className="grid grid-cols-3 gap-2">{([[-1,"← SOL"],[0,"↑ ORTA"],[1,"SAĞ →"]] as const).map(([v,t])=><button key={v} onClick={()=>onChange(v)} className={`rounded-xl border px-2 py-3 text-xs font-black ${value===v?"border-lime-300 bg-lime-400 text-[#06152b]":"border-white/10 bg-white/5"}`}>{t}</button>)}</div></div>}
function Finish({title,value,sub}:{title:string;value:string;sub:string}){return <section className="px-4 py-10"><div className="rounded-3xl border border-cyan-300/20 bg-[#082642] p-8 text-center"><div className="text-6xl">🏆</div><h2 className="mt-4 text-2xl font-black">{title}</h2><div className="mt-4 text-5xl font-black text-yellow-300">{value}</div><div className="mt-2 text-xs font-black text-cyan-200">{sub}</div><button onClick={()=>window.location.reload()} className="mt-8 w-full rounded-2xl bg-lime-400 py-4 font-black text-[#06152b]">TEKRAR OYNA</button></div></section>}

function ArcadeStyles(){return <style jsx global>{`
.fb-goal{z-index:5;width:min(74vw,335px);height:138px;position:absolute;top:68px;left:50%;transform:translateX(-50%)}
.fb-net{opacity:.48;background-image:linear-gradient(#ffffff57 1px,transparent 1px),linear-gradient(90deg,#ffffff57 1px,transparent 1px);background-size:16px 16px;position:absolute;inset:7px 6px 3px;transform:perspective(140px) rotateX(-4deg)}
.fb-post{z-index:8;background:#f7f5e7;border-radius:10px;position:absolute;box-shadow:0 2px #aeb5a9,0 2px 12px #0006}.fb-post-top{height:7px;top:0;left:0;right:0}.fb-post-left,.fb-post-right{width:7px;top:0;bottom:0}.fb-post-left{left:0}.fb-post-right{right:0}
.fb-keeper{--ks:1;z-index:9;transform-origin:50% 96%;width:112px;height:124px;transition:transform .2s cubic-bezier(.77,0,.175,1);filter:drop-shadow(0 7px 5px #0004);margin-left:-56px;position:absolute;bottom:1px;left:50%}.fb-keeper-ready{transform:scale(var(--ks));animation:fbKeeperIdle 2.4s cubic-bezier(.77,0,.175,1) infinite}.fb-keeper-dive-left{transform:rotate(-46deg) scale(var(--ks))}.fb-keeper-dive-right{transform:rotate(46deg) scale(var(--ks))}.fb-keeper-dive-center{transform:scale(var(--ks)) scaleY(1.05)}.fb-keeper-tell-left{animation:fbTellLeft .44s cubic-bezier(.23,1,.32,1) both}.fb-keeper-tell-center{animation:fbTellCenter .44s cubic-bezier(.23,1,.32,1) both}.fb-keeper-tell-right{animation:fbTellRight .44s cubic-bezier(.23,1,.32,1) both}
.fb-k-head{z-index:8;background:#b96f45;border:1px solid #4a231659;border-radius:46% 46% 42% 42%;width:24px;height:28px;position:absolute;top:18px;left:44px;box-shadow:inset 2px 0 #ffffff1a}.fb-k-head:after{content:"";border-bottom:1px solid #411f1680;border-radius:50%;width:8px;height:3px;position:absolute;bottom:5px;left:8px}.fb-k-ear{z-index:-1;background:#ad663e;border:1px solid #4a231652;width:4px;height:9px;position:absolute;top:9px}.fb-k-ear-l{left:-4px;border-radius:5px 1px 1px 5px}.fb-k-ear-r{right:-4px;border-radius:1px 5px 5px 1px}.fb-k-hair{background:#211d18;border-radius:55% 58% 35% 30%;width:24px;height:10px;position:absolute;top:-2px;left:-1px;transform:rotate(-2deg)}.fb-k-face{background:radial-gradient(circle at 2px 2px,#2b211c 0 1px,transparent 1.4px),radial-gradient(circle at 12px 2px,#2b211c 0 1px,transparent 1.4px);width:14px;height:6px;position:absolute;top:10px;left:5px}.fb-k-neck{z-index:4;background:#9f5b36;border-radius:3px;width:12px;height:10px;position:absolute;top:41px;left:50px}
.fb-k-shirt{z-index:5;clip-path:polygon(13% 0,87% 0,100% 100%,0 100%);background:#ff6a38;border-radius:10px 10px 5px 5px;place-items:center;width:42px;height:46px;display:grid;position:absolute;top:45px;left:35px;box-shadow:inset 5px 0 #ffffff14}.fb-k-shirt i{color:#fff;font-size:18px;font-style:normal;font-weight:1000}.fb-k-shirt b{background:#ffd447;border:1px solid #4123166b;border-radius:2px;width:5px;height:6px;position:absolute;top:11px;right:7px}.fb-k-shorts{z-index:4;clip-path:polygon(0 0,100% 0,92% 100%,58% 100%,50% 52%,42% 100%,8% 100%);background:#192923;border-radius:3px 3px 7px 7px;width:38px;height:19px;position:absolute;top:87px;left:37px}.fb-k-shorts i{background:#ffffff1a;height:2px;position:absolute;top:3px;left:4px;right:4px}
.fb-k-arm,.fb-k-leg{z-index:3;transform-origin:top;display:block;position:absolute}.fb-k-arm{background:#ff6a38;border-radius:999px;width:14px;height:31px;top:50px;box-shadow:inset 3px 0 #ffffff14}.fb-k-arm-l{left:36px;transform:rotate(124deg)}.fb-k-arm-r{right:36px;transform:rotate(-124deg)}.fb-k-forearm{transform-origin:50% 4px;background:#ff7a3e;border-radius:999px;width:12px;height:30px;position:absolute;top:24px;left:1px}.fb-k-arm-l .fb-k-forearm{transform:rotate(46deg)}.fb-k-arm-r .fb-k-forearm{transform:rotate(-46deg)}.fb-k-glove{z-index:8;background:#dfff38;border:2px solid #365c15;border-radius:7px 7px 8px 8px;width:18px;height:18px;position:absolute;bottom:-14px;left:-3px}.fb-k-arm-r .fb-k-glove{transform:scaleX(-1)}
.fb-k-leg{background:#273b32;border-radius:999px;width:13px;height:22px;top:101px}.fb-k-leg-l{left:41px;transform:rotate(8deg)}.fb-k-leg-r{right:41px;transform:rotate(-8deg)}.fb-k-sock{background:#e8eee7;border-top:2px solid #ff6a38;border-radius:0 0 5px 5px;height:11px;position:absolute;bottom:2px;left:1px;right:1px}.fb-k-boot{background:#101814;border-radius:8px 8px 3px 3px;width:18px;height:7px;position:absolute;bottom:-2px;left:-2px}
@keyframes fbKeeperIdle{0%,100%{transform:translate(-2px,0) rotate(-1.2deg) scale(var(--ks))}25%{transform:translate(0,-1px) rotate(-.25deg) scale(var(--ks))}50%{transform:translate(2px,0) rotate(1.2deg) scale(var(--ks))}75%{transform:translate(0,1px) rotate(.25deg) scale(var(--ks))}}@keyframes fbTellLeft{0%{transform:translate(0) scale(var(--ks))}58%{transform:translate(-10px,-1px) rotate(-5deg) scale(var(--ks))}100%{transform:translate(-7px,0) rotate(-3.2deg) scale(var(--ks))}}@keyframes fbTellCenter{0%{transform:translate(0) scale(var(--ks))}58%{transform:translate(0,4px) scale(var(--ks)) scaleX(1.04) scaleY(.95)}100%{transform:translate(0,2px) scale(var(--ks)) scaleX(1.02) scaleY(.98)}}@keyframes fbTellRight{0%{transform:translate(0) scale(var(--ks))}58%{transform:translate(10px,-1px) rotate(5deg) scale(var(--ks))}100%{transform:translate(7px,0) rotate(3.2deg) scale(var(--ks))}}
@media(max-height:760px){.fb-goal{height:104px;top:48px}.fb-keeper{--ks:.84;bottom:-5px}}
`}</style>}

async function animateBall(from:Point,to:Point,duration:number,setPoint:(p:Point)=>void,setScale:(n:number)=>void){await new Promise<void>(resolve=>{const started=performance.now();const tick=(now:number)=>{const raw=clamp((now-started)/duration,0,1),t=1-Math.pow(1-raw,3),arc=Math.sin(Math.PI*raw)*5.5;setPoint({x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t-arc});setScale(1-.46*t);if(raw<1)requestAnimationFrame(tick);else resolve()};requestAnimationFrame(tick)})}
async function deflectBall(target:Point,side:Side,setPoint:(p:Point)=>void,setScale:(n:number)=>void){await animateBall(target,{x:clamp(target.x+(side===0?8:side*13),8,92),y:46},290,setPoint,setScale)}
