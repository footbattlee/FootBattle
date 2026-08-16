"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { GAME_NAMES, trackGameStarted, trackGameCompleted, trackPlayAgain, trackShared } from "@/lib/analytics/game-analytics";

type LetterStatus = "correct" | "present" | "absent" | "empty";
type EvaluatedLetter = { letter: string; status: Exclude<LetterStatus, "empty"> };
type EvaluatedGuess = { guess: string; evaluation: EvaluatedLetter[] };
type WordleGame = { sessionId: string; letterCount: number; maxAttempts: number; daily: boolean };

type NewGameResponse = { ok?: boolean; error?: string; sessionId?: string; letterCount?: number; maxAttempts?: number; daily?: boolean };
type GuessResponse = { ok?: boolean; error?: string; guess?: string; evaluation?: EvaluatedLetter[]; won?: boolean };
type ResultResponse = { ok?: boolean; error?: string; won?: boolean; score?: number; attemptCount?: number; alreadyRecorded?: boolean; answerPlayerName?: string | null };

const ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "DELETE"],
];

const copy = {
  tr: {
    home: "← Ana Sayfa", brand: "FootBattle", eyebrow: "Wordle", title: "Oyuncuyu Bul", description: (n: number) => `Oyuncunun soyadını ${n} tahminde bul.`,
    unlimited: "SINIRSIZ MOD", unlimitedGame: "Sınırsız oyun", daily: "GÜNLÜK GÖREV", letters: (n: number) => `${n} harf`,
    loading: "Yeni Wordle hazırlanıyor...", failed: "Wordle hazırlanamadı.", first: "😏 Footy: İlk tahminini görelim bakalım.",
    newGame: "Yeni Oyun", submit: "Gönder", enter: "✓", del: "⌫", attempts: "Tahmin", score: "Skor",
    need: (n: number) => `😏 Footy: ${n} harf lazım.`, checking: "👀 Footy: Tahminin kontrol ediliyor...",
    win: "🎉 Footy: Bildin!", lose: "Bu oyuncu seni ters köşe yaptı.", remaining: (n: number) => `👀 Footy: Olmadı. ${n} hakkın kaldı, toparlan.`,
    answer: "Doğru cevap", save: "Sonuç kaydediliyor...", login: "Puanını kaydetmek için giriş yapmalısın.", saved: (s: number) => `${s} puan hesabına eklendi. 🔥`, recorded: "Bu oyunun sonucu zaten kaydedilmiş.",
    share: "📱 Sonucu Paylaş", copied: "Sonuç kopyalandı ✓", again: "🔄 Yeniden Oyna", checkingButton: "Kontrol Ediliyor...", ready: "KONTROL ET", char: "HARF",
  },
  en: {
    home: "← Home", brand: "FootBattle", eyebrow: "Wordle", title: "Find the Player", description: (n: number) => `Guess the player's surname in ${n} attempts.`,
    unlimited: "UNLIMITED MODE", unlimitedGame: "Unlimited games", daily: "DAILY CHALLENGE", letters: (n: number) => `${n} letters`,
    loading: "Preparing a new Wordle...", failed: "Wordle could not be prepared.", first: "😏 Footy: Let's see your first guess.",
    newGame: "New Game", submit: "Submit", enter: "✓", del: "⌫", attempts: "Guesses", score: "Score",
    need: (n: number) => `😏 Footy: You need ${n} letters.`, checking: "👀 Footy: Checking your guess...",
    win: "🎉 Footy: You got it!", lose: "That player caught you out.", remaining: (n: number) => `👀 Footy: Not quite. ${n} guesses left.`,
    answer: "Correct answer", save: "Saving result...", login: "Sign in to save your score.", saved: (s: number) => `${s} points added to your account. 🔥`, recorded: "This game result was already saved.",
    share: "📱 Share Result", copied: "Result copied ✓", again: "🔄 Play Again", checkingButton: "Checking...", ready: "CHECK", char: "LETTERS",
  },
} as const;

function tile(status: LetterStatus) {
  if (status === "correct") return "border-green-400 bg-green-500 text-[#07111f]";
  if (status === "present") return "border-amber-400 bg-amber-400 text-[#07111f]";
  if (status === "absent") return "border-slate-600 bg-slate-700 text-white";
  return "border-white/15 bg-[#0c1929] text-white";
}

function keyboardTone(status: LetterStatus) {
  if (status === "correct") return "border-green-400 bg-green-500 text-[#07111f]";
  if (status === "present") return "border-amber-400 bg-amber-400 text-[#07111f]";
  if (status === "absent") return "border-slate-700 bg-slate-800 text-slate-500";
  return "border-white/10 bg-white/10 text-white";
}

function symbol(status: LetterStatus) {
  if (status === "correct") return "🟩";
  if (status === "present") return "🟨";
  return "⬛";
}

function normalize(value: string) {
  return value.toUpperCase().replace(/İ/g, "I").replace(/Ç/g, "C").replace(/Ğ/g, "G").replace(/Ö/g, "O").replace(/Ş/g, "S").replace(/Ü/g, "U");
}

export default function LocalizedWordlePage({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const [game, setGame] = useState<WordleGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [guesses, setGuesses] = useState<EvaluatedGuess[]>([]);
  const [current, setCurrent] = useState("");
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [message, setMessage] = useState<string>(t.first);
  const [submitting, setSubmitting] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState("");
  const [shareMessage, setShareMessage] = useState("");

  const keyboardStatuses = useMemo(() => {
    const map: Record<string, LetterStatus> = {};
    for (const row of guesses) {
      for (const item of row.evaluation) {
        const old = map[item.letter];
        if (item.status === "correct") map[item.letter] = "correct";
        else if (item.status === "present" && old !== "correct") map[item.letter] = "present";
        else if (!old) map[item.letter] = "absent";
      }
    }
    return map;
  }, [guesses]);

  const start = useCallback(async (initial = false) => {
    try {
      setLoading(true); setError(""); setGuesses([]); setCurrent(""); setStatus("playing"); setAnswer(null); setResultMessage(""); setShareMessage(""); setMessage(t.first);
      const daily = initial && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("daily") === "1";
      const response = await fetch(daily ? "/api/wordle/today?daily=1" : "/api/wordle/today", { cache: "no-store" });
      const data = (await response.json()) as NewGameResponse;
      if (!response.ok || !data.ok || !data.sessionId || typeof data.letterCount !== "number") throw new Error(data.error ?? t.failed);
      setGame({ sessionId: data.sessionId, letterCount: data.letterCount, maxAttempts: data.maxAttempts ?? 5, daily: Boolean(data.daily ?? daily) });
      void trackGameStarted(GAME_NAMES.WORDLE, data.sessionId);
    } catch (reason) {
      setGame(null); setError(reason instanceof Error ? reason.message : t.failed);
    } finally { setLoading(false); }
  }, [t.failed, t.first]);

  useEffect(() => { void start(true); }, [start]);

  const saveResult = useCallback(async (completed: EvaluatedGuess[], finalStatus: "won" | "lost") => {
    if (!game) return;
    try {
      setResultMessage(t.save);
      const response = await fetch("/api/wordle/result", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: game.sessionId, guesses: completed.map((item) => item.guess) }) });
      const data = (await response.json()) as ResultResponse;
      if (data.answerPlayerName) setAnswer(data.answerPlayerName);
      if (response.status === 401) { setResultMessage(t.login); return; }
      if (!response.ok || !data.ok) throw new Error(data.error ?? t.failed);
      if (data.alreadyRecorded) setResultMessage(t.recorded);
      else setResultMessage(finalStatus === "won" ? t.saved(data.score ?? 0) : t.lose);
      void trackGameCompleted(GAME_NAMES.WORDLE, game.sessionId, { won: finalStatus === "won", score: data.score ?? 0, attemptCount: data.attemptCount ?? completed.length });
    } catch (reason) { setResultMessage(reason instanceof Error ? reason.message : t.failed); }
  }, [game, t]);

  const submit = useCallback(async () => {
    if (!game || status !== "playing" || submitting) return;
    if (current.length !== game.letterCount) { setMessage(t.need(game.letterCount)); return; }
    try {
      setSubmitting(true); setMessage(t.checking);
      const response = await fetch("/api/wordle/guess", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: game.sessionId, guess: current }) });
      const data = (await response.json()) as GuessResponse;
      if (!response.ok || !data.ok || !data.guess || !Array.isArray(data.evaluation)) throw new Error(data.error ?? t.failed);
      const next = [...guesses, { guess: data.guess, evaluation: data.evaluation }];
      setGuesses(next); setCurrent("");
      if (data.won) { setStatus("won"); setMessage(t.win); void saveResult(next, "won"); return; }
      if (next.length >= game.maxAttempts) { setStatus("lost"); setMessage(t.lose); void saveResult(next, "lost"); return; }
      setMessage(t.remaining(game.maxAttempts - next.length));
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : t.failed); }
    finally { setSubmitting(false); }
  }, [current, game, guesses, saveResult, status, submitting, t]);

  function key(value: string) {
    if (!game || status !== "playing" || submitting) return;
    if (value === "ENTER") { void submit(); return; }
    if (value === "DELETE") { setCurrent((old) => old.slice(0, -1)); return; }
    if (current.length < game.letterCount) setCurrent((old) => normalize(old + value));
  }

  async function share() {
    if (!game) return;
    const rows = guesses.map((guess) => guess.evaluation.map((item) => symbol(item.status)).join("")).join("\n");
    const text = `⚽ FootBattle Wordle ${status === "won" ? `${guesses.length}/${game.maxAttempts}` : `X/${game.maxAttempts}`}\n${rows}`;
    const url = `${window.location.origin}/${locale}/wordle?utm_source=share&utm_medium=wordle`;
    try {
      if (navigator.share) await navigator.share({ title: "FootBattle Wordle", text, url });
      else { await navigator.clipboard.writeText(`${text}\n${url}`); setShareMessage(t.copied); }
      void trackShared(GAME_NAMES.WORDLE, game.sessionId);
    } catch (reason) { if (!(reason instanceof DOMException && reason.name === "AbortError")) setShareMessage(t.failed); }
  }

  if (loading) return <main className="flex min-h-[100dvh] items-center justify-center bg-[#07111f] text-white"><p className="text-sm text-slate-400">{t.loading}</p></main>;
  if (error || !game) return <main className="flex min-h-[100dvh] items-center justify-center bg-[#07111f] p-6 text-white"><p className="text-red-300">{error || t.failed}</p></main>;

  const rows = Array.from({ length: game.maxAttempts }, (_, rowIndex) => {
    const saved = guesses[rowIndex];
    return saved ? saved.evaluation : rowIndex === guesses.length ? Array.from({ length: game.letterCount }, (_, i) => ({ letter: current[i] ?? "", status: "empty" as const })) : Array.from({ length: game.letterCount }, () => ({ letter: "", status: "empty" as const }));
  });

  return (
    <main className="min-h-[100dvh] bg-[#07111f] pb-[calc(18px+env(safe-area-inset-bottom))] text-white">
      <div className="mx-auto w-full max-w-[760px] px-3 sm:px-6">
        <header className="grid min-h-[58px] grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-white/10 sm:min-h-[68px]">
          <div className="flex justify-start"><Link href={`/${locale}`} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-400">{t.home}</Link></div>
          <div className="text-center"><p className="text-sm font-black sm:text-base">{t.brand}</p><p className="text-[10px] text-slate-500 sm:text-[11px]">{t.eyebrow}</p></div>
          <div className="flex justify-end"><div className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black sm:px-4 sm:text-sm">{guesses.length}/{game.maxAttempts}</div></div>
        </header>

        <div className="py-3 sm:py-8">
          <section className="mx-auto w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4 shadow-2xl shadow-black/20 sm:rounded-[22px] sm:px-6 sm:py-6">
            <div className="text-center">
              <span className="inline-block rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-green-400 sm:px-4 sm:py-1.5 sm:text-[11px]">{game.daily ? t.daily : t.unlimited}</span>
              <h1 className="mt-2.5 text-2xl font-black leading-tight sm:mt-4 sm:text-[34px]">{t.title}</h1>
              <p className="mt-1 text-xs text-slate-400 sm:mt-1.5 sm:text-sm">{t.description(game.maxAttempts)}</p>
              <div className="mt-2 flex items-center justify-center gap-2 text-[10px] sm:text-[11px]"><span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 font-bold text-slate-400">{t.letters(game.letterCount)}</span><span className="rounded-full border border-green-500/20 bg-green-500/[0.07] px-2.5 py-1 font-bold text-green-400/80">{game.daily ? t.daily : t.unlimitedGame}</span></div>
            </div>

            <div className="mt-4 space-y-1.5 sm:mt-6 sm:space-y-2">{rows.map((row, ri) => <div key={ri} className="flex justify-center gap-1 sm:gap-1.5">{row.map((cell, ci) => <div key={ci} className={`flex ${game.letterCount >= 9 ? "h-10 w-9" : "h-[44px] w-[39px]"} items-center justify-center rounded-lg border text-base font-black transition sm:h-[52px] sm:w-[46px] sm:rounded-[10px] sm:text-xl ${tile(cell.status)}`}>{cell.letter}</div>)}</div>)}</div>

            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-center sm:mt-5 sm:px-4 sm:py-3"><p className="text-xs leading-5 text-slate-300 sm:text-sm">{message}</p>{answer && <p className="mt-1 text-xs font-black text-yellow-300">{t.answer}: {answer}</p>}{resultMessage && <p className="mt-1 text-[10px] font-bold text-green-300 sm:text-xs">{resultMessage}</p>}</div>

            <div className="mt-3 space-y-1 sm:mt-5 sm:space-y-1.5">{ROWS.map((row, ri) => <div key={ri} className="flex justify-center gap-[3px] sm:gap-1">{row.map((k) => { const special = k === "ENTER" || k === "DELETE"; return <button key={k} onClick={() => key(k)} disabled={status !== "playing" || submitting} className={`flex h-9 items-center justify-center rounded-md border text-[9px] font-black transition sm:h-11 sm:rounded-lg sm:text-xs ${special ? "min-w-[48px] px-1.5 sm:min-w-[70px] sm:px-2" : "w-[27px] sm:w-9"} ${special ? "border-white/10 bg-white/10 text-white" : keyboardTone(keyboardStatuses[k] ?? "empty")} disabled:opacity-60`}>{k === "ENTER" ? t.enter : k === "DELETE" ? t.del : k}</button>; })}</div>)}</div>

            {status === "playing" && <button onClick={() => void submit()} disabled={submitting || current.length !== game.letterCount} className="mt-3 flex h-11 w-full items-center justify-center rounded-xl border border-green-400/30 bg-green-500 text-xs font-black text-[#07111f] transition disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-slate-500 sm:mt-4 sm:h-12 sm:text-sm">{submitting ? t.checkingButton : current.length === game.letterCount ? `✓ ${t.ready}` : `${current.length}/${game.letterCount} ${t.char}`}</button>}

            {status !== "playing" && <div className="mt-4 grid gap-2 sm:grid-cols-2"><button onClick={() => void share()} className="min-h-11 rounded-xl bg-green-500 px-4 text-xs font-black text-[#07111f] sm:text-sm">{t.share}</button><button onClick={() => { void trackPlayAgain(GAME_NAMES.WORDLE, game.sessionId); void start(false); }} className="min-h-11 rounded-xl border border-white/10 px-4 text-xs font-black sm:text-sm">{t.again}</button></div>}
            {shareMessage && <p className="mt-3 text-center text-xs font-bold text-green-300">{shareMessage}</p>}
          </section>
        </div>
      </div>
    </main>
  );
}
