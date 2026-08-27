"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GAME_NAMES, trackGameCompleted, trackGameStarted, trackPlayAgain } from "@/lib/analytics/game-analytics";

type Difficulty = "easy" | "medium" | "hard";
type Question = { transferId: number; fromClubName: string; toClubName: string; transferFee: number; transferSeason: string | null; difficulty: Difficulty };
type SearchPlayer = { id: number; name: string; imageUrl: string | null };
type StartResponse = { ok?: boolean; error?: string; sessionId?: string; startedAt?: string; durationSeconds?: number; maxPasses?: number; pointsPerCorrect?: number; minimumSearchLength?: number; score?: number; correctCount?: number; passesUsed?: number; question?: Question };
type ActionResponse = { ok?: boolean; error?: string; expired?: boolean; correct?: boolean; awardedPoints?: number; score?: number; correctCount?: number; passesUsed?: number; question?: Question | null };

const DEFAULT_DURATION = 120;
const DEFAULT_MAX_PASSES = 5;
const DEFAULT_POINTS = 20;
const DEFAULT_MIN_SEARCH = 3;

function formatFee(value: number) {
  const millions = value / 1_000_000;
  return `${Number.isInteger(millions) ? millions.toFixed(0) : millions.toFixed(1)} M€`;
}

function difficultyMeta(difficulty: Difficulty) {
  if (difficulty === "easy") return { label: "KOLAY", cls: "border-emerald-400/30 bg-emerald-500/15 text-emerald-300" };
  if (difficulty === "medium") return { label: "ORTA", cls: "border-amber-400/30 bg-amber-500/15 text-amber-300" };
  return { label: "ZOR", cls: "border-rose-400/30 bg-rose-500/15 text-rose-300" };
}

export default function TransferQuizPage() {
  const [sessionId, setSessionId] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [maxPasses, setMaxPasses] = useState(DEFAULT_MAX_PASSES);
  const [points, setPoints] = useState(DEFAULT_POINTS);
  const [minSearch, setMinSearch] = useState(DEFAULT_MIN_SEARCH);
  const [question, setQuestion] = useState<Question | null>(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [passesUsed, setPassesUsed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION);
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<SearchPlayer[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [finished, setFinished] = useState(false);
  const [surrendered, setSurrendered] = useState(false);
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
  const [resultState, setResultState] = useState<"idle" | "saving" | "saved">("idle");
  const resultRequested = useRef(false);

  const passesLeft = Math.max(0, maxPasses - passesUsed);
  const progress = useMemo(() => Math.min(100, Math.max(0, ((duration - timeLeft) / duration) * 100)), [duration, timeLeft]);
  const diff = difficultyMeta(question?.difficulty ?? "easy");

  const finishGame = useCallback(async (reason: "timeout" | "surrender" = "timeout") => {
    if (!sessionId || resultRequested.current) return;
    resultRequested.current = true;
    setFinished(true);
    setSurrendered(reason === "surrender");
    setShowSurrenderConfirm(false);
    setPlayers([]);
    setQuery("");
    setResultState("saving");
    try {
      const response = await fetch("/api/transfer-quiz/result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, finishReason: reason }),
      });
      const result = await response.json();
      if (response.ok && result.ok) {
        const finalScore = Number(result.score ?? score);
        const finalCorrect = Number(result.correctCount ?? correctCount);
        const finalPasses = Number(result.passesUsed ?? passesUsed);
        setScore(finalScore);
        setCorrectCount(finalCorrect);
        setPassesUsed(finalPasses);
        setResultState("saved");
        void trackGameCompleted(GAME_NAMES.TRANSFER_QUIZ, sessionId, { score: finalScore, correctCount: finalCorrect, passesUsed: finalPasses, finishReason: reason, format: "transferi_bil_v1" });
      } else setResultState("idle");
    } catch {
      setResultState("idle");
    }
  }, [correctCount, passesUsed, score, sessionId]);

  const startGame = useCallback(async (again = false) => {
    setLoading(true); setError(""); setFeedback(""); setFinished(false); setSurrendered(false); setShowSurrenderConfirm(false); setResultState("idle");
    resultRequested.current = false; setQuery(""); setPlayers([]);
    try {
      const response = await fetch("/api/transfer-quiz/today", { cache: "no-store" });
      const result = (await response.json()) as StartResponse;
      if (!response.ok || !result.ok || !result.sessionId || !result.startedAt || !result.question) throw new Error(result.error ?? "Transferi Bil başlatılamadı.");
      const d = result.durationSeconds ?? DEFAULT_DURATION;
      setSessionId(result.sessionId); setStartedAt(result.startedAt); setDuration(d); setTimeLeft(d);
      setMaxPasses(result.maxPasses ?? DEFAULT_MAX_PASSES); setPoints(result.pointsPerCorrect ?? DEFAULT_POINTS); setMinSearch(result.minimumSearchLength ?? DEFAULT_MIN_SEARCH);
      setScore(result.score ?? 0); setCorrectCount(result.correctCount ?? 0); setPassesUsed(result.passesUsed ?? 0); setQuestion(result.question);
      if (again) void trackPlayAgain(GAME_NAMES.TRANSFER_QUIZ, result.sessionId);
      void trackGameStarted(GAME_NAMES.TRANSFER_QUIZ, result.sessionId);
    } catch (e) { setError(e instanceof Error ? e.message : "Transferi Bil başlatılamadı."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void startGame(false); }, [startGame]);

  useEffect(() => {
    if (!startedAt || finished || loading) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      const left = Math.max(0, duration - elapsed);
      setTimeLeft(left);
      if (left === 0) void finishGame("timeout");
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [duration, finishGame, finished, loading, startedAt]);

  useEffect(() => {
    const q = query.trim();
    if (finished || q.length < minSearch) { setPlayers([]); setSearching(false); return; }
    const controller = new AbortController();
    const id = window.setTimeout(async () => {
      try {
        setSearching(true);
        const response = await fetch(`/api/transfer-quiz/search-player?q=${encodeURIComponent(q)}`, { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (response.ok && result.ok) setPlayers(result.players ?? []); else setPlayers([]);
      } catch (e) { if (!(e instanceof DOMException && e.name === "AbortError")) setPlayers([]); }
      finally { setSearching(false); }
    }, 180);
    return () => { window.clearTimeout(id); controller.abort(); };
  }, [finished, minSearch, query]);

  const choosePlayer = useCallback(async (player: SearchPlayer) => {
    if (!sessionId || busy || finished) return;
    setBusy(true); setFeedback(""); setPlayers([]);
    try {
      const response = await fetch("/api/transfer-quiz/guess", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, playerId: player.id }) });
      const result = (await response.json()) as ActionResponse;
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Cevap kontrol edilemedi.");
      if (result.expired) { void finishGame("timeout"); return; }
      if (result.correct) {
        setScore(result.score ?? score + points); setCorrectCount(result.correctCount ?? correctCount + 1); setPassesUsed(result.passesUsed ?? passesUsed);
        if (result.question) setQuestion(result.question);
        setFeedback(`✅ Doğru! +${result.awardedPoints ?? points} puan`);
      } else setFeedback(`❌ ${player.name} değil. Tekrar dene veya pas geç.`);
      setQuery("");
    } catch (e) { setFeedback(e instanceof Error ? e.message : "Cevap kontrol edilemedi."); }
    finally { setBusy(false); }
  }, [busy, correctCount, finishGame, finished, passesUsed, points, score, sessionId]);

  const usePass = useCallback(async () => {
    if (!sessionId || busy || finished || passesLeft <= 0) return;
    setBusy(true); setFeedback(""); setPlayers([]);
    try {
      const response = await fetch("/api/transfer-quiz/pass", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) });
      const result = (await response.json()) as ActionResponse;
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Pas kullanılamadı.");
      if (result.expired) { void finishGame("timeout"); return; }
      setPassesUsed(result.passesUsed ?? passesUsed + 1); if (result.question) setQuestion(result.question);
      setQuery(""); setFeedback("⏭️ Pas geçildi. Yeni transfer geldi.");
    } catch (e) { setFeedback(e instanceof Error ? e.message : "Pas kullanılamadı."); }
    finally { setBusy(false); }
  }, [busy, finishGame, finished, passesLeft, passesUsed, sessionId]);

  if (loading) return <Shell><Card>Transferler hazırlanıyor...</Card></Shell>;
  if (error || !question) return <Shell><Card><p className="font-bold">{error || "Transfer sorusu hazırlanamadı."}</p><button onClick={() => void startGame(false)} className="mt-5 rounded-xl bg-white px-5 py-3 font-black text-slate-950">Tekrar Dene</button></Card></Shell>;

  if (finished) return (
    <Shell>
      <div className="mx-auto max-w-xl rounded-[28px] border border-white/10 bg-white/[0.06] p-6 text-center shadow-2xl">
        <div className="text-5xl">{surrendered ? "🏳️" : "🏁"}</div><h1 className="mt-3 text-3xl font-black">{surrendered ? "Tur Sona Erdi" : "Süre Doldu!"}</h1><p className="mt-2 text-white/60">{surrendered ? "Turu erken bitirdin. O ana kadarki skorun kaydedildi." : "2 dakikalık Transferi Bil turun tamamlandı."}</p>
        <div className="mt-6 grid grid-cols-3 gap-3"><Stat label="PUAN" value={score}/><Stat label="DOĞRU" value={correctCount}/><Stat label="PAS" value={`${passesUsed}/${maxPasses}`}/></div>
        <p className="mt-4 text-sm text-white/45">{resultState === "saving" ? "Skor kaydediliyor..." : resultState === "saved" ? "Skor kaydedildi ✓" : "Tur tamamlandı."}</p>
        <button onClick={() => void startGame(true)} className="mt-6 w-full rounded-2xl bg-emerald-400 px-5 py-4 text-lg font-black text-slate-950">Tekrar Oyna</button>
        <Link href="/tr" className="mt-3 block rounded-2xl border border-white/10 px-5 py-4 font-bold text-white/70">Ana Sayfa</Link>
      </div>
    </Shell>
  );

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <div className="mb-3 flex items-center justify-between"><Link href="/tr" className="text-sm font-bold text-white/55">← Ana Sayfa</Link><span className="text-sm font-black tracking-wide text-emerald-300">TRANSFERİ BİL</span></div>
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.055] shadow-2xl">
          <div className="h-1.5 bg-white/10"><div className="h-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }}/></div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-3 gap-2"><Stat label="SÜRE" value={`${Math.floor(timeLeft/60)}:${String(timeLeft%60).padStart(2,"0")}`} emphasis={timeLeft<=20}/><Stat label="PUAN" value={score}/><Stat label="PAS" value={`${passesLeft}/${maxPasses}`}/></div>
            <div className="mt-5 text-center">
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black tracking-[0.18em] ${diff.cls}`}>{diff.label}</span>
              <p className="mt-3 text-sm font-semibold text-white/45">BU TRANSFERİ KİM YAPTI?</p>
              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-6"><Club name={question.fromClubName} label="ESKİ KULÜP"/><div className="text-2xl text-emerald-300">→</div><Club name={question.toClubName} label="YENİ KULÜP"/></div>
              <div className="mt-4 flex justify-center gap-3 text-sm"><span className="rounded-xl bg-emerald-400/10 px-3 py-2 font-black text-emerald-300">{formatFee(question.transferFee)}</span>{question.transferSeason && <span className="rounded-xl bg-white/5 px-3 py-2 font-bold text-white/60">{question.transferSeason}</span>}</div>
            </div>
            <div className="relative mt-6">
              <input value={query} onChange={e=>setQuery(e.target.value)} disabled={busy} autoComplete="off" placeholder="Oyuncu ara... En az 3 harf" className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-4 font-semibold outline-none placeholder:text-white/30 focus:border-emerald-400/60"/>
              {searching && <span className="absolute right-4 top-4 text-sm text-white/40">Aranıyor...</span>}
              {players.length>0 && <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1727] p-1 shadow-2xl">{players.map(p=><button key={p.id} onClick={()=>void choosePlayer(p)} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/10"><div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/10 text-xs font-black text-white/50">{p.imageUrl?<img src={p.imageUrl} alt="" className="h-full w-full object-cover"/>:p.name.slice(0,2).toUpperCase()}</div><span className="font-bold">{p.name}</span></button>)}</div>}
            </div>
            <div className="mt-3 min-h-6 text-center text-sm font-bold text-white/65">{feedback}</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button onClick={()=>void usePass()} disabled={busy||passesLeft<=0} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 font-black text-white/75 disabled:opacity-35">PAS GEÇ · {passesLeft}</button>
              <button onClick={()=>setShowSurrenderConfirm(true)} disabled={busy} className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3.5 font-black text-rose-300 disabled:opacity-35">PES ET</button>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] font-bold text-white/35"><div>0–80 sn<br/><span className="text-emerald-300/70">Kolay</span></div><div>80–100 sn<br/><span className="text-amber-300/70">Orta</span></div><div>100–120 sn<br/><span className="text-rose-300/70">Zor</span></div></div>
          </div>
        </section>
      </div>

      {showSurrenderConfirm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"><div className="w-full max-w-sm rounded-[28px] border border-white/10 bg-[#0b1727] p-6 text-center shadow-2xl"><div className="text-4xl">🏳️</div><h2 className="mt-3 text-2xl font-black">Turu bitirelim mi?</h2><p className="mt-2 text-sm text-white/55">Şu ana kadarki puanın kaydedilecek. Bu işlem geri alınamaz.</p><div className="mt-6 grid grid-cols-2 gap-3"><button onClick={()=>setShowSurrenderConfirm(false)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-black text-white/75">VAZGEÇ</button><button onClick={()=>void finishGame("surrender")} className="rounded-2xl bg-rose-500 px-4 py-3 font-black text-white">PES ET</button></div></div></div>}
    </Shell>
  );
}

function Shell({children}:{children:React.ReactNode}) { return <main className="min-h-screen bg-[#07111f] px-3 py-4 text-white sm:px-4 sm:py-8">{children}</main>; }
function Card({children}:{children:React.ReactNode}) { return <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center">{children}</div>; }
function Stat({label,value,emphasis=false}:{label:string;value:string|number;emphasis?:boolean}) { return <div className={`rounded-2xl border p-3 text-center ${emphasis?"border-rose-400/30 bg-rose-400/10":"border-white/10 bg-black/15"}`}><div className="text-[10px] font-black tracking-[0.14em] text-white/35">{label}</div><div className={`mt-1 text-xl font-black sm:text-2xl ${emphasis?"text-rose-300":"text-white"}`}>{value}</div></div>; }
function Club({name,label}:{name:string;label:string}) { return <div className="min-w-0 text-center"><div className="text-[9px] font-black tracking-[0.12em] text-white/30">{label}</div><div className="mt-2 break-words text-base font-black leading-tight sm:text-xl">{name}</div></div>; }