"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  GAME_NAMES,
  trackGameCompleted,
  trackGameStarted,
  trackPlayAgain,
} from "@/lib/analytics/game-analytics";

type Difficulty = "easy" | "medium" | "hard";

type Question = {
  transferId: number;
  fromClubName: string;
  toClubName: string;
  transferFee: number;
  transferSeason: string | null;
  difficulty: Difficulty;
};

type SearchPlayer = {
  id: number;
  name: string;
  imageUrl: string | null;
};

type StartResponse = {
  ok?: boolean;
  error?: string;
  sessionId?: string;
  startedAt?: string;
  durationSeconds?: number;
  maxPasses?: number;
  pointsPerCorrect?: number;
  minimumSearchLength?: number;
  score?: number;
  correctCount?: number;
  passesUsed?: number;
  question?: Question;
};

type ActionResponse = {
  ok?: boolean;
  error?: string;
  expired?: boolean;
  correct?: boolean;
  awardedPoints?: number;
  score?: number;
  correctCount?: number;
  passesUsed?: number;
  question?: Question | null;
};

const DEFAULT_DURATION = 120;
const DEFAULT_MAX_PASSES = 5;
const DEFAULT_POINTS = 20;
const DEFAULT_MIN_SEARCH = 3;

function formatFee(value: number) {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${Number.isInteger(millions) ? millions.toFixed(0) : millions.toFixed(1)} M€`;
  }
  return `${Math.round(value).toLocaleString("tr-TR")} €`;
}

function difficultyMeta(difficulty: Difficulty) {
  if (difficulty === "easy") return { label: "KOLAY", className: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30" };
  if (difficulty === "medium") return { label: "ORTA", className: "bg-amber-500/15 text-amber-300 border-amber-400/30" };
  return { label: "ZOR", className: "bg-rose-500/15 text-rose-300 border-rose-400/30" };
}

export default function TransferQuizPage() {
  const [sessionId, setSessionId] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(DEFAULT_DURATION);
  const [maxPasses, setMaxPasses] = useState(DEFAULT_MAX_PASSES);
  const [pointsPerCorrect, setPointsPerCorrect] = useState(DEFAULT_POINTS);
  const [minimumSearchLength, setMinimumSearchLength] = useState(DEFAULT_MIN_SEARCH);
  const [question, setQuestion] = useState<Question | null>(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [passesUsed, setPassesUsed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATION);
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<SearchPlayer[]>([]);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [finished, setFinished] = useState(false);
  const [resultSaving, setResultSaving] = useState(false);
  const [resultSaved, setResultSaved] = useState(false);
  const resultRequestedRef = useRef(false);

  const passesLeft = Math.max(0, maxPasses - passesUsed);
  const difficultyInfo = difficultyMeta(question?.difficulty ?? "easy");

  const progress = useMemo(() => {
    const elapsed = durationSeconds - timeLeft;
    return Math.min(100, Math.max(0, (elapsed / durationSeconds) * 100));
  }, [durationSeconds, timeLeft]);

  const finishGame = useCallback(async () => {
    if (!sessionId || resultRequestedRef.current) return;
    resultRequestedRef.current = true;
    setFinished(true);
    setPlayers([]);
    setQuery("");
    setResultSaving(true);

    try {
      const response = await fetch("/api/transfer-quiz/result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const result = await response.json();
      if (response.ok && result.ok) {
        setScore(Number(result.score ?? score));
        setCorrectCount(Number(result.correctCount ?? correctCount));
        setPassesUsed(Number(result.passesUsed ?? passesUsed));
        setResultSaved(true);
        void trackGameCompleted(GAME_NAMES.TRANSFER_QUIZ, sessionId, Number(result.score ?? score), true);
      }
    } catch (finishError) {
      console.error("Transferi Bil sonuç kaydetme hatası:", finishError);
    } finally {
      setResultSaving(false);
    }
  }, [correctCount, passesUsed, score, sessionId]);

  const startGame = useCallback(async (playAgain = false) => {
    setLoading(true);
    setError("");
    setFeedback("");
    setFinished(false);
    setResultSaved(false);
    setResultSaving(false);
    resultRequestedRef.current = false;
    setQuery("");
    setPlayers([]);

    try {
      const response = await fetch("/api/transfer-quiz/today", { cache: "no-store" });
      const result = (await response.json()) as StartResponse;
      if (!response.ok || !result.ok || !result.sessionId || !result.startedAt || !result.question) {
        throw new Error(result.error ?? "Transferi Bil başlatılamadı.");
      }

      setSessionId(result.sessionId);
      setStartedAt(result.startedAt);
      setDurationSeconds(result.durationSeconds ?? DEFAULT_DURATION);
      setMaxPasses(result.maxPasses ?? DEFAULT_MAX_PASSES);
      setPointsPerCorrect(result.pointsPerCorrect ?? DEFAULT_POINTS);
      setMinimumSearchLength(result.minimumSearchLength ?? DEFAULT_MIN_SEARCH);
      setScore(result.score ?? 0);
      setCorrectCount(result.correctCount ?? 0);
      setPassesUsed(result.passesUsed ?? 0);
      setQuestion(result.question);
      setTimeLeft(result.durationSeconds ?? DEFAULT_DURATION);

      if (playAgain) void trackPlayAgain(GAME_NAMES.TRANSFER_QUIZ);
      void trackGameStarted(GAME_NAMES.TRANSFER_QUIZ, result.sessionId);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Transferi Bil başlatılamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void startGame(false);
  }, [startGame]);

  useEffect(() => {
    if (!startedAt || finished || loading) return;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      const next = Math.max(0, durationSeconds - elapsed);
      setTimeLeft(next);
      if (next <= 0) void finishGame();
    };

    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [durationSeconds, finishGame, finished, loading, startedAt]);

  useEffect(() => {
    const trimmed = query.trim();
    if (finished || trimmed.length < minimumSearchLength) {
      setPlayers([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setSearching(true);
        const response = await fetch(`/api/transfer-quiz/search-player?q=${encodeURIComponent(trimmed)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error ?? "Oyuncular aranamadı.");
        setPlayers(result.players ?? []);
      } catch (searchError) {
        if (searchError instanceof DOMException && searchError.name === "AbortError") return;
        console.error("Transferi Bil arama hatası:", searchError);
        setPlayers([]);
      } finally {
        setSearching(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [finished, minimumSearchLength, query]);

  const choosePlayer = useCallback(async (player: SearchPlayer) => {
    if (!sessionId || submitting || finished) return;
    setSubmitting(true);
    setFeedback("");
    setPlayers([]);

    try {
      const response = await fetch("/api/transfer-quiz/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, playerId: player.id }),
      });
      const result = (await response.json()) as ActionResponse;
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Cevap kontrol edilemedi.");
      if (result.expired) {
        void finishGame();
        return;
      }

      if (result.correct) {
        setScore(result.score ?? score + pointsPerCorrect);
        setCorrectCount(result.correctCount ?? correctCount + 1);
        setPassesUsed(result.passesUsed ?? passesUsed);
        if (result.question) setQuestion(result.question);
        setFeedback(`✅ Doğru! +${result.awardedPoints ?? pointsPerCorrect} puan`);
        setQuery("");
      } else {
        setFeedback(`❌ ${player.name} değil. Tekrar dene veya pas geç.`);
        setQuery("");
      }
    } catch (guessError) {
      setFeedback(guessError instanceof Error ? guessError.message : "Cevap kontrol edilemedi.");
    } finally {
      setSubmitting(false);
    }
  }, [correctCount, finishGame, finished, passesUsed, pointsPerCorrect, score, sessionId, submitting]);

  const usePass = useCallback(async () => {
    if (!sessionId || submitting || finished || passesLeft <= 0) return;
    setSubmitting(true);
    setFeedback("");
    setPlayers([]);

    try {
      const response = await fetch("/api/transfer-quiz/pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const result = (await response.json()) as ActionResponse;
      if (!response.ok || !result.ok) throw new Error(result.error ?? "Pas kullanılamadı.");
      if (result.expired) {
        void finishGame();
        return;
      }
      setPassesUsed(result.passesUsed ?? passesUsed + 1);
      if (result.question) setQuestion(result.question);
      setQuery("");
      setFeedback("⏭️ Pas geçildi. Yeni transfer geldi.");
    } catch (passError) {
      setFeedback(passError instanceof Error ? passError.message : "Pas kullanılamadı.");
    } finally {
      setSubmitting(false);
    }
  }, [finishGame, finished, passesLeft, passesUsed, sessionId, submitting]);

  if (loading) {
    return <main className="min-h-screen bg-[#07111f] px-4 py-10 text-white"><div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center">Transferler hazırlanıyor...</div></main>;
  }

  if (error || !question) {
    return (
      <main className="min-h-screen bg-[#07111f] px-4 py-10 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-rose-400/20 bg-white/5 p-8 text-center">
          <p className="text-lg font-bold">{error || "Transfer sorusu hazırlanamadı."}</p>
          <button onClick={() => void startGame(false)} className="mt-5 rounded-xl bg-white px-5 py-3 font-bold text-slate-950">Tekrar Dene</button>
        </div>
      </main>
    );
  }

  if (finished) {
    return (
      <main className="min-h-screen bg-[#07111f] px-4 py-8 text-white">
        <div className="mx-auto max-w-xl rounded-[28px] border border-white/10 bg-white/[0.06] p-6 text-center shadow-2xl">
          <div className="text-5xl">🏁</div>
          <h1 className="mt-3 text-3xl font-black">Süre Doldu!</h1>
          <p className="mt-2 text-white/60">2 dakikalık Transferi Bil turun tamamlandı.</p>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Stat label="PUAN" value={score} />
            <Stat label="DOĞRU" value={correctCount} />
            <Stat label="PAS" value={`${passesUsed}/${maxPasses}`} />
          </div>
          <p className="mt-4 text-sm text-white/45">{resultSaving ? "Skor kaydediliyor..." : resultSaved ? "Skor kaydedildi ✓" : "Tur tamamlandı."}</p>
          <button onClick={() => void startGame(true)} className="mt-6 w-full rounded-2xl bg-emerald-400 px-5 py-4 text-lg font-black text-slate-950">Tekrar Oyna</button>
          <Link href="/tr" className="mt-3 block rounded-2xl border border-white/10 px-5 py-4 font-bold text-white/70">Ana Sayfa</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07111f] px-3 py-4 text-white sm:px-4 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link href="/tr" className="text-sm font-bold text-white/55 hover:text-white">← Ana Sayfa</Link>
          <div className="text-sm font-extrabold tracking-wide text-emerald-300">TRANSFERİ BİL</div>
        </div>

        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.055] shadow-2xl">
          <div className="h-1.5 bg-white/10"><div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${progress}%` }} /></div>

          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="SÜRE" value={`${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`} emphasis={timeLeft <= 20} />
              <Stat label="PUAN" value={score} />
              <Stat label="PAS" value={`${passesLeft}/${maxPasses}`} />
            </div>

            <div className="mt-5 text-center">
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black tracking-[0.18em] ${difficultyInfo.className}`}>{difficultyInfo.label}</span>
              <p className="mt-3 text-sm font-semibold text-white/45">BU TRANSFERİ KİM YAPTI?</p>

              <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-6">
                <ClubCard name={question.fromClubName} label="ESKİ KULÜP" />
                <div className="text-2xl text-emerald-300">→</div>
                <ClubCard name={question.toClubName} label="YENİ KULÜP" />
              </div>

              <div className="mt-4 flex items-center justify-center gap-3 text-sm">
                <span className="rounded-xl bg-emerald-400/10 px-3 py-2 font-black text-emerald-300">{formatFee(question.transferFee)}</span>
                {question.transferSeason ? <span className="rounded-xl bg-white/5 px-3 py-2 font-bold text-white/60">{question.transferSeason}</span> : null}
              </div>
            </div>

            <div className="relative mt-6">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                disabled={submitting}
                autoComplete="off"
                placeholder="Oyuncu ara... En az 3 harf"
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-4 text-base font-semibold outline-none placeholder:text-white/30 focus:border-emerald-400/60"
              />
              {searching ? <span className="absolute right-4 top-4 text-sm text-white/40">Aranıyor...</span> : null}

              {players.length > 0 ? (
                <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1727] p-1 shadow-2xl">
                  {players.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => void choosePlayer(player)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/10"
                    >
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white/10 text-xs font-black text-white/50">
                        {player.imageUrl ? <img src={player.imageUrl} alt="" className="h-full w-full object-cover" /> : player.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold">{player.name}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-3 min-h-6 text-center text-sm font-bold text-white/65">{feedback}</div>

            <button
              type="button"
              onClick={() => void usePass()}
              disabled={submitting || passesLeft <= 0}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 font-black text-white/75 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
            >
              PAS GEÇ · {passesLeft} HAK
            </button>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px] font-bold text-white/35">
              <div>0–80 sn<br/><span className="text-emerald-300/70">Kolay</span></div>
              <div>80–100 sn<br/><span className="text-amber-300/70">Orta</span></div>
              <div>100–120 sn<br/><span className="text-rose-300/70">Zor</span></div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value, emphasis = false }: { label: string; value: string | number; emphasis?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 text-center ${emphasis ? "border-rose-400/30 bg-rose-400/10" : "border-white/10 bg-black/15"}`}>
      <div className="text-[10px] font-black tracking-[0.14em] text-white/35">{label}</div>
      <div className={`mt-1 text-xl font-black sm:text-2xl ${emphasis ? "text-rose-300" : "text-white"}`}>{value}</div>
    </div>
  );
}

function ClubCard({ name, label }: { name: string; label: string }) {
  return (
    <div className="min-w-0 text-center">
      <div className="text-[9px] font-black tracking-[0.12em] text-white/30">{label}</div>
      <div className="mt-2 break-words text-base font-black leading-tight sm:text-xl">{name}</div>
    </div>
  );
}
