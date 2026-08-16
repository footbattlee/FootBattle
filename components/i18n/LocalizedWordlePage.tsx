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
    home: "← Ana Sayfa", eyebrow: "FootBattle Wordle", title: "Futbolcu Wordle", description: "Gizli futbolcunun soyadını harf ipuçlarıyla bul.",
    loading: "Yeni Wordle hazırlanıyor...", failed: "Wordle hazırlanamadı.", first: "😏 Footy: İlk tahminini görelim bakalım.",
    newGame: "Yeni Oyun", submit: "Gönder", enter: "GİR", del: "SİL", attempts: "Tahmin", score: "Skor",
    need: (n: number) => `Footy: ${n} harf girmelisin.`, checking: "👀 Footy: Tahminin kontrol ediliyor...",
    win: "🎉 Footy: Bildin!", lose: "Bu oyuncu seni ters köşe yaptı.", remaining: (n: number) => `${n} hakkın kaldı.`,
    answer: "Doğru cevap", save: "Sonuç kaydediliyor...", login: "Puanını kaydetmek için giriş yapmalısın.", saved: (s: number) => `${s} puan hesabına eklendi. 🔥`, recorded: "Bu oyunun sonucu zaten kaydedilmiş.",
    share: "📱 Sonucu Paylaş", copied: "Sonuç kopyalandı ✓", again: "🔄 Yeniden Oyna",
  },
  en: {
    home: "← Home", eyebrow: "FootBattle Wordle", title: "Footballer Wordle", description: "Guess the hidden footballer's surname using letter clues.",
    loading: "Preparing a new Wordle...", failed: "Wordle could not be prepared.", first: "😏 Footy: Let's see your first guess.",
    newGame: "New Game", submit: "Submit", enter: "ENTER", del: "DEL", attempts: "Guesses", score: "Score",
    need: (n: number) => `Footy: You need ${n} letters.`, checking: "👀 Footy: Checking your guess...",
    win: "🎉 Footy: You got it!", lose: "That player caught you out.", remaining: (n: number) => `${n} guesses left.`,
    answer: "Correct answer", save: "Saving result...", login: "Sign in to save your score.", saved: (s: number) => `${s} points added to your account. 🔥`, recorded: "This game result was already saved.",
    share: "📱 Share Result", copied: "Result copied ✓", again: "🔄 Play Again",
  },
} as const;

function tile(status: LetterStatus) {
  if (status === "correct") return "border-green-400 bg-green-500 text-[#07111f]";
  if (status === "present") return "border-amber-400 bg-amber-400 text-[#07111f]";
  if (status === "absent") return "border-slate-600 bg-slate-700 text-white";
  return "border-white/15 bg-[#0c1929] text-white";
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
  const [message, setMessage] = useState(t.first);
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

  if (loading) return <main className="min-h-screen bg-[#07111f] p-8 text-white"><p className="text-slate-400">{t.loading}</p></main>;
  if (error || !game) return <main className="min-h-screen bg-[#07111f] p-8 text-white"><p className="text-red-300">{error || t.failed}</p></main>;

  const rows = Array.from({ length: game.maxAttempts }, (_, rowIndex) => {
    const saved = guesses[rowIndex];
    const letters = saved ? saved.evaluation : rowIndex === guesses.length ? Array.from({ length: game.letterCount }, (_, i) => ({ letter: current[i] ?? "", status: "empty" as const })) : Array.from({ length: game.letterCount }, () => ({ letter: "", status: "empty" as const }));
    return letters;
  });

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-6 text-white sm:py-10">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-3"><Link href={`/${locale}`} className="text-sm font-black text-slate-400">{t.home}</Link><button onClick={() => { void trackPlayAgain(GAME_NAMES.WORDLE, game.sessionId); void start(false); }} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-black text-green-300">{t.newGame}</button></div>
        <header className="mt-7 text-center"><p className="text-xs font-black uppercase tracking-[0.24em] text-green-300">{t.eyebrow}</p><h1 className="mt-2 text-4xl font-black sm:text-5xl">{t.title}</h1><p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">{t.description}</p></header>
        <section className="mt-7 rounded-3xl border border-white/10 bg-[#0d1828] p-4 sm:p-6">
          <div className="space-y-2">{rows.map((row, ri) => <div key={ri} className="flex justify-center gap-2">{row.map((cell, ci) => <div key={ci} className={`flex h-14 w-14 items-center justify-center rounded-xl border text-xl font-black sm:h-16 sm:w-16 ${tile(cell.status)}`}>{cell.letter}</div>)}</div>)}</div>
          <p className="mt-5 text-center text-sm font-bold text-slate-300">{message}</p>
          {answer && <p className="mt-2 text-center text-sm font-black text-yellow-300">{t.answer}: {answer}</p>}
          {resultMessage && <p className="mt-2 text-center text-xs font-bold text-green-300">{resultMessage}</p>}
          <div className="mt-5 space-y-2">{ROWS.map((row, ri) => <div key={ri} className="flex justify-center gap-1.5">{row.map((k) => <button key={k} onClick={() => key(k)} className={`min-h-11 rounded-lg border px-2 text-xs font-black sm:px-3 ${k === "ENTER" || k === "DELETE" ? "bg-white/10" : tile(keyboardStatuses[k] ?? "empty")}`}>{k === "ENTER" ? t.enter : k === "DELETE" ? t.del : k}</button>)}</div>)}</div>
          {status === "playing" && <button onClick={() => void submit()} disabled={submitting} className="mt-5 min-h-12 w-full rounded-xl bg-green-500 font-black text-[#07111f] disabled:opacity-50">{t.submit}</button>}
          {status !== "playing" && <div className="mt-5 grid gap-2 sm:grid-cols-2"><button onClick={() => void share()} className="min-h-12 rounded-xl bg-green-500 font-black text-[#07111f]">{t.share}</button><button onClick={() => { void trackPlayAgain(GAME_NAMES.WORDLE, game.sessionId); void start(false); }} className="min-h-12 rounded-xl border border-white/10 font-black">{t.again}</button></div>}
          {shareMessage && <p className="mt-3 text-center text-xs font-bold text-green-300">{shareMessage}</p>}
        </section>
      </div>
    </main>
  );
}
