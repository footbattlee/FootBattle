"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { GAME_NAMES, trackGameCompleted, trackGameStarted } from "@/lib/analytics/game-analytics";
import {
  leagueToDisplayName,
  nationalityToDisplayName,
  positionToDisplayName,
  preferredFootToDisplayName,
} from "@/lib/football/localization";
import type { Locale } from "@/lib/i18n/config";
import { gameCopy } from "@/lib/i18n/game-copy";

type Status = "correct" | "wrong" | "higher" | "lower";
type Player = { id: number; fullName: string; nationality: string; position: string; club: string; league: string; age: number; preferredFoot: string; imageUrl: string | null };
type Comparison = { nationality: Status; position: Status; club: Status; league: Status; age: Status; preferredFoot: Status };
type Guess = { player: Player; comparison: Comparison };
type Session = { sessionId: string; maxAttempts: number; minimumSearchLength: number };

function tone(status: Status) {
  if (status === "correct") return "border-green-400/35 bg-green-500/15 text-green-200";
  if (status === "higher" || status === "lower") return "border-yellow-400/35 bg-yellow-400/10 text-yellow-100";
  return "border-red-400/25 bg-red-500/10 text-red-200";
}

function arrow(status: Status) {
  if (status === "higher") return "↑";
  if (status === "lower") return "↓";
  return "";
}

export default function LocalizedGuessThePlayer({ locale }: { locale: Locale }) {
  const t = gameCopy[locale];
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [selected, setSelected] = useState<Player | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [message, setMessage] = useState(t.guess.firstMessage);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [answer, setAnswer] = useState<Player | null>(null);
  const [busy, setBusy] = useState(false);
  const [resultMessage, setResultMessage] = useState("");

  const guessedIds = useMemo(() => new Set(guesses.map((item) => item.player.id)), [guesses]);

  const display = useCallback((player: Player) => ({
    ...player,
    nationality: nationalityToDisplayName(player.nationality, locale),
    position: positionToDisplayName(player.position, locale),
    league: leagueToDisplayName(player.league, locale),
    preferredFoot: preferredFootToDisplayName(player.preferredFoot, locale),
  }), [locale]);

  const start = useCallback(async () => {
    setLoading(true); setError(""); setQuery(""); setResults([]); setSelected(null); setGuesses([]); setStatus("playing"); setAnswer(null); setResultMessage(""); setMessage(t.guess.firstMessage);
    try {
      const response = await fetch("/api/guess-the-player/today", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.sessionId) throw new Error(data.error ?? "Game could not be prepared.");
      const next = { sessionId: data.sessionId as string, maxAttempts: Number(data.maxAttempts ?? 7), minimumSearchLength: Number(data.minimumSearchLength ?? 3) };
      setSession(next);
      void trackGameStarted(GAME_NAMES.GUESS_THE_PLAYER, next.sessionId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Game could not be prepared.");
    } finally { setLoading(false); }
  }, [t.guess.firstMessage]);

  useEffect(() => { void start(); }, [start]);

  useEffect(() => {
    if (!session || status !== "playing" || selected || query.trim().length < session.minimumSearchLength) { setResults([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/guess-the-player/search?q=${encodeURIComponent(query.trim())}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok || !data.ok) return;
        setResults(((data.players ?? []) as Player[]).filter((player) => !guessedIds.has(player.id)));
      } catch { /* aborted searches are expected */ }
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [guessedIds, query, selected, session, status]);

  function scrollToGuess(guessNumber: number) {
    const element = document.getElementById(`mobile-guess-${guessNumber}`);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    element.classList.add("ring-2", "ring-green-400/70");
    window.setTimeout(() => element.classList.remove("ring-2", "ring-green-400/70"), 900);
  }

  async function saveResult(completed: Guess[]) {
    if (!session) return;
    try {
      const response = await fetch("/api/guess-the-player/result", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: session.sessionId, playerIds: completed.map((item) => item.player.id) }) });
      const data = await response.json();
      if (response.status === 401) { setResultMessage(t.common.loginSave); return; }
      if (!response.ok || !data.ok) return;
      if (data.targetPlayer) setAnswer(data.targetPlayer as Player);
      setResultMessage(data.authenticated ? (data.won ? `${Number(data.score ?? 0)} ${locale === "en" ? "points added to your account" : "puan hesabına eklendi"}. 🔥` : locale === "en" ? "Result saved." : "Sonucun kaydedildi.") : t.common.loginSave);
      void trackGameCompleted(GAME_NAMES.GUESS_THE_PLAYER, session.sessionId, { won: Boolean(data.won), score: Number(data.score ?? 0), attemptCount: Number(data.attemptCount ?? completed.length), durationSeconds: data.durationSeconds ?? null });
    } catch { /* persistence must not block gameplay */ }
  }

  async function submit() {
    if (!session || !selected || busy || status !== "playing") { if (!selected) setMessage(t.guess.choose); return; }
    setBusy(true); setMessage(t.guess.checking);
    try {
      const response = await fetch("/api/guess-the-player/guess", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: session.sessionId, playerId: selected.id }) });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.player || !data.comparison) throw new Error(data.error ?? "Guess failed.");
      const next = [...guesses, { player: data.player as Player, comparison: data.comparison as Comparison }];
      setGuesses(next); setSelected(null); setQuery(""); setResults([]);
      if (data.won) { setStatus("won"); setAnswer((data.targetPlayer ?? data.player) as Player); setMessage(t.guess.won); void saveResult(next); }
      else if (next.length >= session.maxAttempts) { setStatus("lost"); if (data.targetPlayer) setAnswer(data.targetPlayer as Player); setMessage(t.guess.lost); void saveResult(next); }
      else setMessage(locale === "en" ? `Not quite. ${session.maxAttempts - next.length} guesses left.` : `Olmadı. ${session.maxAttempts - next.length} tahmin hakkın kaldı.`);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Guess failed."); }
    finally { setBusy(false); }
  }

  if (loading) return <main className="min-h-screen bg-[#07111f] p-8 text-white">{t.common.loading}</main>;

  return <main className="min-h-screen bg-[#07111f] text-white">
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-9">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/${locale}`} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black text-slate-300">← {t.common.home}</Link>
        <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1 text-xs font-black"><Link href="/tr/guess-the-player" className={`rounded-lg px-3 py-2 ${locale === "tr" ? "bg-green-500 text-[#07111f]" : "text-slate-400"}`}>TR</Link><Link href="/en/guess-the-player" className={`rounded-lg px-3 py-2 ${locale === "en" ? "bg-green-500 text-[#07111f]" : "text-slate-400"}`}>EN</Link></div>
      </div>

      <header className="mt-7 text-center"><p className="text-xs font-black uppercase tracking-[0.24em] text-green-300">FootBattle</p><h1 className="mt-2 text-4xl font-black sm:text-6xl">{t.guess.title}</h1><p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">{t.guess.subtitle}</p></header>

      {error ? <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-red-400/20 bg-red-500/10 p-5 text-center text-red-200">{error}<button onClick={() => void start()} className="mt-4 block w-full rounded-xl bg-white px-4 py-3 font-black text-[#07111f]">{t.common.playAgain}</button></div> : <>
        <section className="mx-auto mt-8 max-w-2xl rounded-3xl border border-white/10 bg-[#0c1929] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3 text-xs font-black text-slate-500"><span>{t.guess.remaining}: {Math.max(0, (session?.maxAttempts ?? 7) - guesses.length)}</span><span>{t.common.attempts}: {guesses.length}</span></div>
          <p className="mt-4 rounded-xl border border-white/[0.07] bg-[#07111f] px-4 py-3 text-sm font-bold text-slate-300">{message}</p>
          {status === "playing" && <div className="relative mt-4"><input value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null); }} placeholder={t.guess.placeholder} className="h-13 w-full rounded-xl border border-white/10 bg-[#07111f] px-4 font-bold outline-none focus:border-green-400/50" />{results.length > 0 && <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-white/10 bg-[#0b1726] p-1 shadow-2xl">{results.slice(0, 10).map((player) => <button key={player.id} onClick={() => { setSelected(player); setQuery(player.fullName); setResults([]); }} className="block w-full rounded-lg px-3 py-3 text-left text-sm font-bold hover:bg-white/[0.06]">{player.fullName}</button>)}</div>}</div>}
          {status === "playing" && <button disabled={!selected || busy} onClick={() => void submit()} className="mt-3 min-h-12 w-full rounded-xl bg-green-500 px-5 font-black text-[#07111f] disabled:opacity-40">{busy ? t.guess.checking : selected ? t.guess.selected : t.guess.choose}</button>}
          {status !== "playing" && <button onClick={() => void start()} className="mt-4 min-h-12 w-full rounded-xl bg-green-500 px-5 font-black text-[#07111f]">{t.common.playAgain}</button>}
          {resultMessage && <p className="mt-3 text-center text-xs font-bold text-green-300">{resultMessage}</p>}
        </section>

        {answer && <section className="mx-auto mt-5 max-w-2xl rounded-2xl border border-yellow-300/20 bg-yellow-300/[0.05] p-4 text-center"><p className="text-xs font-black uppercase tracking-wider text-yellow-300">{t.guess.answer}</p><p className="mt-1 text-2xl font-black">{answer.fullName}</p></section>}

        <section className="mt-5 md:hidden">
          <div className="flex items-end justify-between gap-3">
            <div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">{locale === "en" ? "Guesses" : "Tahminler"}</p><p className="mt-0.5 text-xs font-black text-slate-300">{guesses.length}/{session?.maxAttempts ?? 7} {locale === "en" ? "used" : "kullanıldı"}</p></div>
            {guesses.length > 0 && <p className="text-[9px] text-slate-600">{locale === "en" ? "Tap a number to jump" : "Numaraya dokun → tahmine git"}</p>}
          </div>
          <div className="mt-2.5 grid grid-cols-7 gap-1.5">
            {Array.from({ length: session?.maxAttempts ?? 7 }).map((_, index) => {
              const guessNumber = index + 1;
              const completed = guessNumber <= guesses.length;
              const latest = guessNumber === guesses.length && guesses.length > 0;
              return <button key={guessNumber} type="button" disabled={!completed} onClick={() => scrollToGuess(guessNumber)} className={`flex h-8 items-center justify-center rounded-lg border text-[10px] font-black transition ${latest ? "border-green-400 bg-green-500 text-[#07111f]" : completed ? "border-green-500/30 bg-green-500/10 text-green-300" : "cursor-default border-white/[0.06] bg-white/[0.02] text-slate-700"}`}>{guessNumber}</button>;
            })}
          </div>

          {guesses.length === 0 && <div className="mt-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-center"><p className="text-xl">👀</p><p className="mt-2 text-xs font-black text-slate-300">{locale === "en" ? "Waiting for your first guess" : "İlk tahminini bekliyoruz"}</p></div>}

          <div className="mt-3 space-y-3">
            {[...guesses].reverse().map((guess, reversedIndex) => {
              const originalIndex = guesses.length - 1 - reversedIndex;
              const guessNumber = originalIndex + 1;
              const player = display(guess.player);
              const playerIsCorrect = Object.values(guess.comparison).every((value) => value === "correct");
              return <article id={`mobile-guess-${guessNumber}`} key={`${guess.player.id}-${originalIndex}`} className={`scroll-mt-24 overflow-hidden rounded-2xl border transition-all duration-300 ${playerIsCorrect ? "border-green-400/30 bg-green-500/[0.07]" : "border-white/10 bg-white/[0.035]"}`}>
                <div className="flex items-center gap-3 border-b border-white/[0.07] p-3">
                  {player.imageUrl ? <img src={player.imageUrl} alt={player.fullName} className="h-11 w-11 shrink-0 rounded-xl border border-white/10 bg-white/5 object-cover" /> : <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-lg">⚽</div>}
                  <div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-600">{locale === "en" ? `Guess ${guessNumber}` : `Tahmin ${guessNumber}`}</p><p className="mt-0.5 truncate text-sm font-black text-white">{player.fullName}</p></div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black ${playerIsCorrect ? "bg-green-500/15 text-green-300" : "bg-red-500/10 text-red-300"}`}>{playerIsCorrect ? (locale === "en" ? "✓ RIGHT" : "✓ DOĞRU") : (locale === "en" ? "WRONG" : "YANLIŞ")}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 p-2.5">
                  <MobileCell icon="🌍" label={t.guess.nationality} value={player.nationality} status={guess.comparison.nationality}/>
                  <MobileCell icon="🎯" label={t.guess.position} value={player.position} status={guess.comparison.position}/>
                  <MobileCell icon="🏟️" label={t.guess.club} value={player.club} status={guess.comparison.club}/>
                  <MobileCell icon="🏆" label={t.guess.league} value={player.league} status={guess.comparison.league}/>
                  <MobileCell icon="🎂" label={t.guess.age} value={String(player.age)} suffix={arrow(guess.comparison.age)} status={guess.comparison.age}/>
                  <MobileCell icon="🦶" label={t.guess.foot} value={player.preferredFoot} status={guess.comparison.preferredFoot}/>
                </div>
              </article>;
            })}
          </div>
        </section>

        {guesses.length > 0 && <section className="mt-7 hidden overflow-x-auto md:block"><div className="min-w-[850px] space-y-2">{guesses.map((guess, index) => { const player = display(guess.player); return <div key={`${guess.player.id}-${index}`} className="grid grid-cols-[180px_repeat(6,1fr)] gap-2"><div className="rounded-xl border border-white/10 bg-[#0d1828] px-3 py-3 text-sm font-black">{player.fullName}</div><Cell label={t.guess.nationality} value={player.nationality} status={guess.comparison.nationality}/><Cell label={t.guess.position} value={player.position} status={guess.comparison.position}/><Cell label={t.guess.club} value={player.club} status={guess.comparison.club}/><Cell label={t.guess.league} value={player.league} status={guess.comparison.league}/><Cell label={t.guess.age} value={`${player.age} ${arrow(guess.comparison.age)}`} status={guess.comparison.age}/><Cell label={t.guess.foot} value={player.preferredFoot} status={guess.comparison.preferredFoot}/></div>; })}</div></section>}
      </>}
    </div>
  </main>;
}

function Cell({ label, value, status }: { label: string; value: string; status: Status }) {
  return <div className={`rounded-xl border px-2 py-2 text-center ${tone(status)}`}><p className="text-[9px] font-black uppercase opacity-60">{label}</p><p className="mt-1 truncate text-xs font-black">{value || "-"}</p></div>;
}

function MobileCell({ icon, label, value, status, suffix = "" }: { icon: string; label: string; value: string; status: Status; suffix?: string }) {
  return <div className={`rounded-xl border p-2.5 ${tone(status)}`}><p className="text-[9px] font-black uppercase tracking-[0.08em] opacity-60">{icon} {label}</p><p className="mt-1 text-xs font-black leading-4">{value || "-"} {suffix}</p></div>;
}
