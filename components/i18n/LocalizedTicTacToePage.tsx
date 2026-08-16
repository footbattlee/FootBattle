"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { GAME_NAMES, trackGameStarted, trackGameCompleted, trackPlayAgain } from "@/lib/analytics/game-analytics";

type AxisType = "club" | "nationality";
type AxisItem = { index: number; type: AxisType; value: string };
type Player = { id: number; name: string; nationality: string | null; currentClubName: string | null; imageUrl: string | null };
type Cell = { rowIndex: number; columnIndex: number; answered: boolean; correct: boolean; player: Player | null };
type StartResponse = {
  ok?: boolean; error?: string;
  session?: { id: string; expiresAt: string; score: number; correctCount: number; wrongCount: number };
  game?: { scorePerCorrect: number; fullGridBonus: number };
  grid?: { rows: AxisItem[]; columns: AxisItem[]; cells: Cell[] };
};
type SearchResponse = { ok?: boolean; error?: string; players?: Player[] };
type AnswerResponse = { ok?: boolean; error?: string; correct?: boolean; completed?: boolean; reason?: string | null; score?: number; correctCount?: number; wrongCount?: number; remainingSeconds?: number; cell?: Cell; message?: string };
type FinishResponse = { ok?: boolean; error?: string; completed?: boolean; alreadyCompleted?: boolean; reason?: string; score?: number; correctCount?: number; wrongCount?: number; remainingSeconds?: number; message?: string };

const copy = {
  tr: {
    home: "← Ana Sayfa", eyebrow: "FootBattle Grid", title: "Futbol Tic Tac Toe", intro: "Satır ve sütundaki iki koşulu da sağlayan futbolcuları bul. 120 saniyede 3x3 grid'i doldur.",
    seconds: "saniye", correctCell: "doğru hücre", bonus: "tam grid bonus", start: "Oyunu Başlat", loading: "Grid hazırlanıyor...", failed: "Oyun hazırlanamadı.",
    pickCell: "Bir hücre seç ve uygun futbolcuyu bul.", twoRules: "Bu iki koşulu sağlayan futbolcuyu bul.", already: "Bu hücre zaten dolduruldu.", search: "Futbolcu ara...", searching: "Aranıyor...", choose: "Seç", submit: "Cevabı Gönder", cancel: "Kapat",
    checking: "Cevap kontrol ediliyor...", wrong: "Yanlış oyuncu. Başka bir oyuncu dene.", right: (n: number) => `Doğru! +${n} puan.`,
    score: "Skor", correct: "Doğru", wrongCount: "Yanlış", time: "Süre", finished: "Oyun Bitti", again: "🔄 Yeniden Oyna", path: "Dolu hücreler",
    club: "Kulüp", nationality: "Ülke",
  },
  en: {
    home: "← Home", eyebrow: "FootBattle Grid", title: "Football Tic Tac Toe", intro: "Find footballers who match both the row and column clues. Fill the 3x3 grid in 120 seconds.",
    seconds: "seconds", correctCell: "correct cell", bonus: "full grid bonus", start: "Start Game", loading: "Preparing grid...", failed: "Game could not be prepared.",
    pickCell: "Choose a cell and find the right footballer.", twoRules: "Find a footballer who matches both clues.", already: "This cell is already filled.", search: "Search footballer...", searching: "Searching...", choose: "Choose", submit: "Submit Answer", cancel: "Close",
    checking: "Checking answer...", wrong: "Wrong player. Try another one.", right: (n: number) => `Correct! +${n} points.`,
    score: "Score", correct: "Correct", wrongCount: "Wrong", time: "Time", finished: "Game Over", again: "🔄 Play Again", path: "Filled cells",
    club: "Club", nationality: "Country",
  },
} as const;

function key(row: number, col: number) { return `${row}-${col}`; }
function icon(type: AxisType) { return type === "club" ? "🏟️" : "🌍"; }
function timeText(seconds: number) { return `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.max(0, seconds) % 60).padStart(2, "0")}`; }

export default function LocalizedTicTacToePage({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const [sessionId, setSessionId] = useState("");
  const [rows, setRows] = useState<AxisItem[]>([]);
  const [columns, setColumns] = useState<AxisItem[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [scorePerCorrect, setScorePerCorrect] = useState(10);
  const [timeLeft, setTimeLeft] = useState(120);
  const [selected, setSelected] = useState<{ rowIndex: number; columnIndex: number } | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string>(t.pickCell);
  const expiresAt = useRef<number | null>(null);
  const finishCalled = useRef(false);

  const map = useMemo(() => new Map(cells.map((cell) => [key(cell.rowIndex, cell.columnIndex), cell])), [cells]);
  const selectedRow = selected ? rows[selected.rowIndex] : null;
  const selectedCol = selected ? columns[selected.columnIndex] : null;

  const finish = useCallback(async () => {
    if (!sessionId || finishCalled.current) return;
    finishCalled.current = true;
    try {
      const response = await fetch("/api/tic-tac-toe/finish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) });
      const data = (await response.json()) as FinishResponse;
      if (!response.ok || !data.ok) {
        if (response.status === 409) { finishCalled.current = false; if (typeof data.remainingSeconds === "number") setTimeLeft(data.remainingSeconds); return; }
        throw new Error(data.error ?? t.failed);
      }
      setScore(Number(data.score ?? 0)); setCorrectCount(Number(data.correctCount ?? 0)); setWrongCount(Number(data.wrongCount ?? 0)); setTimeLeft(0); setStarted(false); setFinished(true); setSelected(null);
      setMessage(data.message ?? t.finished);
      if (!data.alreadyCompleted) void trackGameCompleted(GAME_NAMES.TIC_TAC_TOE, sessionId, { score: Number(data.score ?? 0), correctCount: Number(data.correctCount ?? 0), wrongCount: Number(data.wrongCount ?? 0), reason: data.reason ?? "finished" });
    } catch (reason) { finishCalled.current = false; setMessage(reason instanceof Error ? reason.message : t.failed); }
  }, [sessionId, t.failed, t.finished]);

  const start = useCallback(async () => {
    try {
      setLoading(true); setError(""); setFinished(false); finishCalled.current = false; setSelected(null); setQuery(""); setResults([]); setSelectedPlayer(null); setMessage(t.loading);
      const daily = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("daily") === "1";
      const response = await fetch(daily ? "/api/tic-tac-toe/start?daily=1" : "/api/tic-tac-toe/start", { method: "POST", cache: "no-store" });
      const data = (await response.json()) as StartResponse;
      if (!response.ok || !data.ok || !data.session || !data.grid || !data.game) throw new Error(data.error ?? t.failed);
      setSessionId(data.session.id); setRows(data.grid.rows); setColumns(data.grid.columns); setCells(data.grid.cells); setScore(Number(data.session.score ?? 0)); setCorrectCount(Number(data.session.correctCount ?? 0)); setWrongCount(Number(data.session.wrongCount ?? 0)); setScorePerCorrect(Number(data.game.scorePerCorrect ?? 10));
      const end = new Date(data.session.expiresAt).getTime(); expiresAt.current = end; setTimeLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000))); setStarted(true); setMessage(t.pickCell);
      void trackGameStarted(GAME_NAMES.TIC_TAC_TOE, data.session.id);
    } catch (reason) { setStarted(false); setError(reason instanceof Error ? reason.message : t.failed); }
    finally { setLoading(false); }
  }, [t.failed, t.loading, t.pickCell]);

  useEffect(() => {
    if (!started || finished || !expiresAt.current) return;
    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil(((expiresAt.current ?? Date.now()) - Date.now()) / 1000));
      setTimeLeft(left);
      if (left <= 0) void finish();
    }, 500);
    return () => window.clearInterval(timer);
  }, [finish, finished, started]);

  useEffect(() => {
    const clean = query.trim();
    if (!selected || selectedPlayer || clean.length < 2 || !started || finished) { setResults([]); setSearching(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setSearching(true);
        const response = await fetch(`/api/tic-tac-toe/search-player?q=${encodeURIComponent(clean)}`, { cache: "no-store", signal: controller.signal });
        const data = (await response.json()) as SearchResponse;
        if (!response.ok || !data.ok) throw new Error(data.error ?? t.failed);
        setResults(data.players ?? []);
      } catch (reason) { if (!(reason instanceof DOMException && reason.name === "AbortError")) setMessage(reason instanceof Error ? reason.message : t.failed); }
      finally { setSearching(false); }
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [finished, query, selected, selectedPlayer, started, t.failed]);

  function chooseCell(rowIndex: number, columnIndex: number) {
    if (!started || finished || submitting) return;
    const cell = map.get(key(rowIndex, columnIndex));
    if (cell?.answered) { setMessage(t.already); return; }
    setSelected({ rowIndex, columnIndex }); setQuery(""); setResults([]); setSelectedPlayer(null); setMessage(t.twoRules);
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!sessionId || !selected || !selectedPlayer || submitting || !started || finished) return;
    try {
      setSubmitting(true); setMessage(t.checking);
      const response = await fetch("/api/tic-tac-toe/answer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId, rowIndex: selected.rowIndex, columnIndex: selected.columnIndex, playerId: selectedPlayer.id }) });
      const data = (await response.json()) as AnswerResponse;
      if (!response.ok || !data.ok) throw new Error(data.error ?? t.failed);
      if (typeof data.score === "number") setScore(data.score); if (typeof data.correctCount === "number") setCorrectCount(data.correctCount); if (typeof data.wrongCount === "number") setWrongCount(data.wrongCount); if (typeof data.remainingSeconds === "number") setTimeLeft(data.remainingSeconds);
      if (!data.correct) { setMessage(data.message ?? t.wrong); setQuery(""); setResults([]); setSelectedPlayer(null); return; }
      if (data.cell) setCells((current) => current.map((cell) => cell.rowIndex === data.cell?.rowIndex && cell.columnIndex === data.cell?.columnIndex ? data.cell : cell));
      setMessage(data.message ?? t.right(scorePerCorrect)); setSelected(null); setQuery(""); setResults([]); setSelectedPlayer(null);
      if (data.completed) {
        finishCalled.current = true; setStarted(false); setFinished(true);
        void trackGameCompleted(GAME_NAMES.TIC_TAC_TOE, sessionId, { score: Number(data.score ?? score), correctCount: Number(data.correctCount ?? correctCount), wrongCount: Number(data.wrongCount ?? wrongCount), reason: data.reason ?? "completed" });
      }
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : t.failed); }
    finally { setSubmitting(false); }
  }

  if (!started && !finished) {
    return <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white"><div className="mx-auto max-w-3xl"><Link href={`/${locale}`} className="text-sm font-black text-slate-400">{t.home}</Link><section className="mt-8 rounded-[32px] border border-white/10 bg-[#0d1828] p-7 text-center sm:p-10"><p className="text-6xl">⭕</p><p className="mt-5 text-xs font-black uppercase tracking-[0.24em] text-green-300">{t.eyebrow}</p><h1 className="mt-2 text-4xl font-black sm:text-5xl">{t.title}</h1><p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-400">{t.intro}</p><div className="mt-7 grid grid-cols-3 gap-3"><Stat label={t.seconds} value="120"/><Stat label={t.correctCell} value="+10"/><Stat label={t.bonus} value="+50"/></div>{error && <p className="mt-4 text-sm font-bold text-red-300">{error}</p>}<button onClick={() => void start()} disabled={loading} className="mt-7 min-h-12 w-full rounded-xl bg-green-500 font-black text-[#07111f] disabled:opacity-50">{loading ? t.loading : t.start}</button></section></div></main>;
  }

  return (
    <main className="min-h-screen bg-[#07111f] px-3 py-5 text-white sm:px-6 sm:py-8"><div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between gap-3"><Link href={`/${locale}`} className="text-sm font-black text-slate-400">{t.home}</Link><button onClick={() => { void trackPlayAgain(GAME_NAMES.TIC_TAC_TOE, sessionId); void start(); }} className="rounded-xl border border-white/10 px-4 py-2 text-xs font-black text-green-300">{t.again}</button></div>
      <header className="mt-5 text-center"><p className="text-xs font-black uppercase tracking-[0.22em] text-green-300">{t.eyebrow}</p><h1 className="mt-2 text-3xl font-black sm:text-5xl">{t.title}</h1></header>
      <div className="mt-5 grid grid-cols-4 gap-2"><Stat label={t.score} value={String(score)}/><Stat label={t.correct} value={String(correctCount)}/><Stat label={t.wrongCount} value={String(wrongCount)}/><Stat label={t.time} value={timeText(timeLeft)}/></div>
      <section className="mt-5 overflow-x-auto rounded-3xl border border-white/10 bg-[#0d1828] p-3 sm:p-5"><div className="min-w-[620px] grid grid-cols-4 gap-2"><div/><>{columns.map((col) => <Axis key={`c-${col.index}`} item={col} label={col.type === "club" ? t.club : t.nationality}/>)}</>{rows.map((row) => <div key={`r-${row.index}`} className="contents"><Axis item={row} label={row.type === "club" ? t.club : t.nationality}/>{columns.map((col) => { const cell = map.get(key(row.index, col.index)); return <button key={`${row.index}-${col.index}`} disabled={Boolean(cell?.answered) || finished} onClick={() => chooseCell(row.index, col.index)} className={`min-h-28 rounded-2xl border p-2 transition ${cell?.answered ? "border-green-400/30 bg-green-400/10" : "border-white/10 bg-[#07111f] hover:border-green-400/30"}`}>{cell?.player ? <><p className="text-sm font-black text-green-200">{cell.player.name}</p><p className="mt-1 text-[10px] text-slate-500">✓</p></> : <span className="text-2xl text-slate-700">+</span>}</button>; })}</div>)}</div></section>
      <p className="mt-4 text-center text-sm font-bold text-slate-300">{message}</p>
      {finished && <section className="mt-5 rounded-3xl border border-yellow-300/20 bg-yellow-300/[0.05] p-6 text-center"><h2 className="text-2xl font-black text-yellow-200">{t.finished}</h2><p className="mt-2 text-sm text-slate-400">{t.score}: {score} · {t.correct}: {correctCount} · {t.wrongCount}: {wrongCount}</p><button onClick={() => { void trackPlayAgain(GAME_NAMES.TIC_TAC_TOE, sessionId); void start(); }} className="mt-5 min-h-12 w-full rounded-xl bg-green-500 font-black text-[#07111f]">{t.again}</button></section>}
      {selected && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 sm:items-center"><form onSubmit={(e) => void submit(e)} className="w-full max-w-xl rounded-[28px] border border-white/10 bg-[#0d1828] p-5 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-green-300">{selectedRow ? `${icon(selectedRow.type)} ${selectedRow.value}` : ""} × {selectedCol ? `${icon(selectedCol.type)} ${selectedCol.value}` : ""}</p><h2 className="mt-2 text-xl font-black">{t.twoRules}</h2></div><button type="button" onClick={() => { if (!submitting) setSelected(null); }} className="text-sm font-black text-slate-500">✕</button></div><input value={query} onChange={(e) => { setQuery(e.target.value); setSelectedPlayer(null); }} placeholder={t.search} className="mt-5 min-h-12 w-full rounded-xl border border-white/10 bg-[#07111f] px-4 outline-none focus:border-green-400/40"/>{searching && <p className="mt-2 text-xs text-slate-500">{t.searching}</p>}<div className="mt-2 max-h-52 space-y-2 overflow-auto">{results.map((player) => <button type="button" key={player.id} onClick={() => { setSelectedPlayer(player); setQuery(player.name); setResults([]); }} className="flex w-full items-center justify-between rounded-xl border border-white/[0.07] bg-[#07111f] px-4 py-3 text-left"><span className="font-black">{player.name}</span><span className="text-xs text-green-300">{t.choose}</span></button>)}</div>{selectedPlayer && <p className="mt-3 rounded-xl border border-green-400/20 bg-green-400/[0.06] px-4 py-3 text-sm font-black text-green-200">✓ {selectedPlayer.name}</p>}<div className="mt-5 grid grid-cols-2 gap-2"><button type="button" onClick={() => setSelected(null)} disabled={submitting} className="min-h-12 rounded-xl border border-white/10 font-black">{t.cancel}</button><button type="submit" disabled={!selectedPlayer || submitting} className="min-h-12 rounded-xl bg-green-500 font-black text-[#07111f] disabled:opacity-40">{submitting ? t.checking : t.submit}</button></div></form></div>}
    </div></main>
  );
}

function Axis({ item, label }: { item: AxisItem; label: string }) { return <div className="flex min-h-24 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] p-2 text-center"><span className="text-xl">{icon(item.type)}</span><p className="mt-1 text-xs font-black">{item.value}</p><p className="mt-1 text-[9px] uppercase tracking-wider text-slate-600">{label}</p></div>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-center"><p className="text-lg font-black sm:text-2xl">{value}</p><p className="mt-1 text-[10px] font-bold text-slate-500">{label}</p></div>; }
