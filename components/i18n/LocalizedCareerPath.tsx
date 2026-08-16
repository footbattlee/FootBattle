"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { GAME_NAMES, trackGameCompleted, trackGameStarted } from "@/lib/analytics/game-analytics";
import type { Locale } from "@/lib/i18n/config";
import { gameCopy } from "@/lib/i18n/game-copy";

type Player = { id: number; fullName: string; imageUrl: string | null };
type Club = { id: number; name: string; careerOrder: number };
type Session = { sessionId: string; player: Player; clubSlots: number; maxWrongGuesses: number; minimumSearchLength: number };

type GuessResponse = { ok?: boolean; error?: string; correct?: boolean; duplicate?: boolean; matchedClub?: Club | null };

export default function LocalizedCareerPath({ locale }: { locale: Locale }) {
  const t = gameCopy[locale];
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [selected, setSelected] = useState(false);
  const [solved, setSolved] = useState<Club[]>([]);
  const [revealed, setRevealed] = useState<Club[]>([]);
  const [wrong, setWrong] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [message, setMessage] = useState(t.career.firstMessage);
  const [busy, setBusy] = useState(false);
  const [resultMessage, setResultMessage] = useState("");

  const progress = useMemo(() => session?.clubSlots ? Math.round((solved.length / session.clubSlots) * 100) : 0, [session, solved.length]);

  const start = useCallback(async () => {
    setLoading(true); setError(""); setQuery(""); setResults([]); setSelected(false); setSolved([]); setRevealed([]); setWrong(0); setAttempts(0); setStatus("playing"); setResultMessage(""); setMessage(t.career.firstMessage);
    try {
      const response = await fetch("/api/career-path/today", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.sessionId || !data.player || !data.board) throw new Error(data.error ?? "Career Path could not be prepared.");
      const next = { sessionId: data.sessionId as string, player: data.player as Player, clubSlots: Number(data.board.clubSlots ?? 0), maxWrongGuesses: Number(data.maxWrongGuesses ?? 5), minimumSearchLength: Number(data.minimumSearchLength ?? 3) };
      setSession(next);
      void trackGameStarted(GAME_NAMES.CAREER_PATH, next.sessionId);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Career Path could not be prepared."); }
    finally { setLoading(false); }
  }, [t.career.firstMessage]);

  useEffect(() => { void start(); }, [start]);

  useEffect(() => {
    if (!session || selected || status !== "playing" || query.trim().length < session.minimumSearchLength) { setResults([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/player-quiz/search-club?q=${encodeURIComponent(query.trim())}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (response.ok && data.ok) setResults((data.clubs ?? []) as string[]);
      } catch { /* expected while typing */ }
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, selected, session, status]);

  async function saveResult(reason: "won" | "lost", nextSolved: Club[], nextWrong: number, nextAttempts: number) {
    if (!session) return;
    try {
      const response = await fetch("/api/career-path/result", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: session.sessionId, finishReason: reason, solvedClubIds: nextSolved.map((club) => club.id), wrongCount: nextWrong, attemptCount: nextAttempts }) });
      const data = await response.json();
      if (response.status === 401) { setResultMessage(t.common.loginSave); return; }
      if (!response.ok || !data.ok) return;
      if (Array.isArray(data.allClubs)) setRevealed(data.allClubs as Club[]);
      setResultMessage(data.won ? `${Number(data.score ?? 0)} ${locale === "en" ? "points added to your account" : "puan hesabına eklendi"}. 🔥` : locale === "en" ? "Result saved." : "Sonucun kaydedildi.");
      void trackGameCompleted(GAME_NAMES.CAREER_PATH, session.sessionId, { won: Boolean(data.won), score: Number(data.score ?? 0), wrongCount: Number(data.wrongCount ?? nextWrong), attemptCount: Number(data.attemptCount ?? nextAttempts), finishReason: reason });
    } catch { /* persistence should not block the board */ }
  }

  async function submitClub() {
    if (!session || busy || status !== "playing") return;
    const clubName = query.trim();
    if (!clubName || !selected) { setMessage(locale === "en" ? "Choose a club from the search list." : "Kulübü arama listesinden seç."); return; }
    setBusy(true); setMessage(t.career.checking);
    try {
      const response = await fetch("/api/career-path/guess", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: session.sessionId, clubName, solvedClubIds: solved.map((club) => club.id) }) });
      const data = (await response.json()) as GuessResponse;
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Club check failed.");
      const nextAttempts = attempts + 1; setAttempts(nextAttempts); setQuery(""); setSelected(false); setResults([]);
      if (data.duplicate) { setMessage(t.career.duplicate); return; }
      if (!data.correct || !data.matchedClub) {
        const nextWrong = wrong + 1; setWrong(nextWrong);
        if (nextWrong >= session.maxWrongGuesses) { setStatus("lost"); setMessage(t.career.lost); void saveResult("lost", solved, nextWrong, nextAttempts); }
        else setMessage(`${t.career.wrongClub} ${session.maxWrongGuesses - nextWrong} ${locale === "en" ? "mistakes left." : "hata hakkın kaldı."}`);
        return;
      }
      const nextSolved = [...solved, data.matchedClub].sort((a, b) => a.careerOrder - b.careerOrder); setSolved(nextSolved);
      if (nextSolved.length >= session.clubSlots) { setStatus("won"); setRevealed(nextSolved); setMessage(t.career.won); void saveResult("won", nextSolved, wrong, nextAttempts); }
      else setMessage(t.career.rightClub);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Club check failed."); }
    finally { setBusy(false); }
  }

  if (loading) return <main className="min-h-screen bg-[#07111f] p-8 text-white">{t.common.loading}</main>;

  const board = revealed.length > 0 ? revealed : solved;

  return <main className="min-h-screen bg-[#07111f] text-white"><div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-9">
    <div className="flex items-center justify-between gap-3"><Link href={`/${locale}`} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black text-slate-300">← {t.common.home}</Link><div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1 text-xs font-black"><Link href="/tr/career-path" className={`rounded-lg px-3 py-2 ${locale === "tr" ? "bg-green-500 text-[#07111f]" : "text-slate-400"}`}>TR</Link><Link href="/en/career-path" className={`rounded-lg px-3 py-2 ${locale === "en" ? "bg-green-500 text-[#07111f]" : "text-slate-400"}`}>EN</Link></div></div>
    <header className="mt-7 text-center"><p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">FootBattle</p><h1 className="mt-2 text-4xl font-black sm:text-6xl">{t.career.title}</h1><p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">{t.career.subtitle}</p></header>

    {error ? <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-red-400/20 bg-red-500/10 p-5 text-center text-red-200">{error}<button onClick={() => void start()} className="mt-4 block w-full rounded-xl bg-white px-4 py-3 font-black text-[#07111f]">{t.common.playAgain}</button></div> : session && <>
      <section className="mx-auto mt-8 max-w-2xl rounded-3xl border border-white/10 bg-[#0c1929] p-5 sm:p-6">
        <div className="flex flex-col items-center text-center">{session.player.imageUrl ? <img src={session.player.imageUrl} alt={session.player.fullName} className="h-28 w-28 rounded-2xl object-cover object-top" /> : null}<h2 className="mt-3 text-2xl font-black">{session.player.fullName}</h2></div>
        <div className="mt-5 flex items-center justify-between text-xs font-black text-slate-500"><span>{t.career.remainingMistakes}: {Math.max(0, session.maxWrongGuesses - wrong)}</span><span>{t.career.progress}: {solved.length}/{session.clubSlots}</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${progress}%` }} /></div>
        <p className="mt-4 rounded-xl border border-white/[0.07] bg-[#07111f] px-4 py-3 text-sm font-bold text-slate-300">{message}</p>
        {status === "playing" && <div className="relative mt-4"><input value={query} onChange={(e) => { setQuery(e.target.value); setSelected(false); }} placeholder={t.career.placeholder} className="h-13 w-full rounded-xl border border-white/10 bg-[#07111f] px-4 font-bold outline-none focus:border-blue-400/50" />{results.length > 0 && <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-white/10 bg-[#0b1726] p-1 shadow-2xl">{results.slice(0, 12).map((club) => <button key={club} onClick={() => { setQuery(club); setSelected(true); setResults([]); }} className="block w-full rounded-lg px-3 py-3 text-left text-sm font-bold hover:bg-white/[0.06]">{club}</button>)}</div>}</div>}
        {status === "playing" ? <button disabled={!selected || busy} onClick={() => void submitClub()} className="mt-3 min-h-12 w-full rounded-xl bg-blue-400 px-5 font-black text-[#07111f] disabled:opacity-40">{busy ? t.career.checking : t.common.submit}</button> : <button onClick={() => void start()} className="mt-4 min-h-12 w-full rounded-xl bg-green-500 px-5 font-black text-[#07111f]">{t.common.playAgain}</button>}
        {resultMessage && <p className="mt-3 text-center text-xs font-bold text-green-300">{resultMessage}</p>}
      </section>

      <section className="mt-7 rounded-3xl border border-white/10 bg-[#0d1828] p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-black">{t.career.career}</h2><span className="text-xs font-black text-slate-500">{t.common.attempts}: {attempts}</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2 md:grid-cols-3">{Array.from({ length: session.clubSlots }).map((_, index) => { const club = board.find((item) => item.careerOrder === index + 1) ?? board[index]; return <div key={index} className={`min-h-14 rounded-xl border px-4 py-3 ${club ? "border-green-400/25 bg-green-500/10" : "border-white/[0.07] bg-[#07111f]"}`}><p className="text-[10px] font-black uppercase text-slate-600">#{index + 1}</p><p className={`mt-1 font-black ${club ? "text-green-200" : "text-slate-700"}`}>{club?.name ?? "???"}</p></div>; })}</div></section>
    </>}
  </div></main>;
}
