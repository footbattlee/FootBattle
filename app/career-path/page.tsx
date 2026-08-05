"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const DEFAULT_MAX_WRONG_GUESSES = 5;
const DEFAULT_MINIMUM_SEARCH_LENGTH = 3;

type GameStatus = "playing" | "won" | "lost";

type PublicPlayer = {
  id: number;
  fullName: string;
  imageUrl: string | null;
};

type BoardConfig = {
  clubSlots: number;
};

type ScoringConfig = {
  zeroWrong: number;
  oneWrong: number;
  twoWrong: number;
  threeWrong: number;
  fourWrong: number;
  fiveWrong: number;
};

type DailyGame = {
  dateKey: string;
  player: PublicPlayer;
  board: BoardConfig;
  maxWrongGuesses: number;
  minimumSearchLength: number;
  scoring: ScoringConfig;
};

type SolvedClub = {
  id: number;
  name: string;
  careerOrder: number;
};

type TodayResponse = {
  ok?: boolean;
  error?: string;
  dateKey?: string;
  player?: PublicPlayer;
  board?: BoardConfig;
  maxWrongGuesses?: number;
  minimumSearchLength?: number;
  scoring?: ScoringConfig;
};

type ClubSearchResponse = {
  ok?: boolean;
  error?: string;
  clubs?: string[];
};

type GuessResponse = {
  ok?: boolean;
  error?: string;
  correct?: boolean;
  duplicate?: boolean;
  matchedClub?: SolvedClub | null;
};

type ResultResponse = {
  ok?: boolean;
  error?: string;
  won?: boolean;
  score?: number;
  alreadyRecorded?: boolean;
  currentStreak?: number | null;
  bestStreak?: number | null;
};

type SavedGame = {
  dateKey: string;
  wrongCount: number;
  attemptCount: number;
  gameStatus: GameStatus;
  solvedClubs: SolvedClub[];
  message: string;
  resultSaved: boolean;
  resultSaveMessage: string;
};

const DEFAULT_SCORING: ScoringConfig = {
  zeroWrong: 250,
  oneWrong: 200,
  twoWrong: 150,
  threeWrong: 100,
  fourWrong: 50,
  fiveWrong: 0,
};

function getStorageKey(dateKey: string) {
  return `footbattle-career-path-${dateKey}`;
}

function getScore(wrongCount: number, scoring: ScoringConfig) {
  if (wrongCount <= 0) return scoring.zeroWrong;
  if (wrongCount === 1) return scoring.oneWrong;
  if (wrongCount === 2) return scoring.twoWrong;
  if (wrongCount === 3) return scoring.threeWrong;
  if (wrongCount === 4) return scoring.fourWrong;
  return scoring.fiveWrong;
}

export default function CareerPathPage() {
  const [dailyGame, setDailyGame] = useState<DailyGame | null>(null);
  const [loadingGame, setLoadingGame] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const [clubInput, setClubInput] = useState("");
  const [clubSelected, setClubSelected] = useState(false);
  const [clubResults, setClubResults] = useState<string[]>([]);
  const [clubSearchLoading, setClubSearchLoading] = useState(false);
  const [clubSearchError, setClubSearchError] = useState("");

  const [solvedClubs, setSolvedClubs] = useState<SolvedClub[]>([]);
  const [wrongCount, setWrongCount] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>("playing");
  const [submitting, setSubmitting] = useState(false);

  const [resultSaved, setResultSaved] = useState(false);
  const [resultSaving, setResultSaving] = useState(false);
  const [resultSaveMessage, setResultSaveMessage] = useState("");

  const [message, setMessage] = useState(
    "😏 Footy: Oyuncunun kariyerindeki kulüpleri bul.",
  );

  const maxWrongGuesses =
    dailyGame?.maxWrongGuesses ?? DEFAULT_MAX_WRONG_GUESSES;

  const minimumSearchLength =
    dailyGame?.minimumSearchLength ?? DEFAULT_MINIMUM_SEARCH_LENGTH;

  const scoring = dailyGame?.scoring ?? DEFAULT_SCORING;
  const clubSlotCount = dailyGame?.board.clubSlots ?? 0;

  const currentScore = useMemo(
    () => getScore(wrongCount, scoring),
    [scoring, wrongCount],
  );

  const completedCount = solvedClubs.length;

  const progressPercentage =
    clubSlotCount > 0 ? (completedCount / clubSlotCount) * 100 : 0;

  const remainingWrongGuesses = Math.max(
    maxWrongGuesses - wrongCount,
    0,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadDailyGame() {
      try {
        setLoadingGame(true);
        setLoadingError("");

        const response = await fetch("/api/career-path/today", {
          cache: "no-store",
        });

        const result = (await response.json()) as TodayResponse;

        if (!response.ok || !result.ok) {
          throw new Error(
            result.error ?? "Günün Career Path oyunu yüklenemedi.",
          );
        }

        if (!result.dateKey || !result.player || !result.board) {
          throw new Error("Günün oyun bilgileri eksik geldi.");
        }

        const game: DailyGame = {
          dateKey: result.dateKey,
          player: result.player,
          board: result.board,
          maxWrongGuesses:
            result.maxWrongGuesses ?? DEFAULT_MAX_WRONG_GUESSES,
          minimumSearchLength:
            result.minimumSearchLength ?? DEFAULT_MINIMUM_SEARCH_LENGTH,
          scoring: result.scoring ?? DEFAULT_SCORING,
        };

        if (cancelled) return;

        setDailyGame(game);

        const savedValue = localStorage.getItem(getStorageKey(game.dateKey));

        if (savedValue) {
          try {
            const savedGame = JSON.parse(savedValue) as SavedGame;

            if (savedGame.dateKey === game.dateKey) {
              setWrongCount(savedGame.wrongCount ?? 0);
              setAttemptCount(savedGame.attemptCount ?? 0);
              setGameStatus(savedGame.gameStatus ?? "playing");
              setSolvedClubs(savedGame.solvedClubs ?? []);
              setMessage(
                savedGame.message ?? "😏 Footy: Kaldığın yerden devam et.",
              );
              setResultSaved(savedGame.resultSaved ?? false);
              setResultSaveMessage(savedGame.resultSaveMessage ?? "");
            }
          } catch {
            localStorage.removeItem(getStorageKey(game.dateKey));
          }
        }

        setHydrated(true);
      } catch (error) {
        if (cancelled) return;

        console.error("Career Path yükleme hatası:", error);

        setLoadingError(
          error instanceof Error
            ? error.message
            : "Günün oyunu yüklenemedi.",
        );
      } finally {
        if (!cancelled) setLoadingGame(false);
      }
    }

    void loadDailyGame();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!dailyGame || !hydrated) return;

    const savedGame: SavedGame = {
      dateKey: dailyGame.dateKey,
      wrongCount,
      attemptCount,
      gameStatus,
      solvedClubs,
      message,
      resultSaved,
      resultSaveMessage,
    };

    localStorage.setItem(
      getStorageKey(dailyGame.dateKey),
      JSON.stringify(savedGame),
    );
  }, [
    attemptCount,
    dailyGame,
    gameStatus,
    hydrated,
    message,
    resultSaved,
    resultSaveMessage,
    solvedClubs,
    wrongCount,
  ]);

  useEffect(() => {
    const query = clubInput.trim();

    if (
      query.length < minimumSearchLength ||
      clubSelected ||
      gameStatus !== "playing" ||
      solvedClubs.length >= clubSlotCount
    ) {
      setClubResults([]);
      setClubSearchLoading(false);
      setClubSearchError("");
      return;
    }

    const abortController = new AbortController();

    const timer = window.setTimeout(async () => {
      try {
        setClubSearchLoading(true);
        setClubSearchError("");

        const response = await fetch(
          `/api/player-quiz/search-club?q=${encodeURIComponent(query)}`,
          {
            cache: "no-store",
            signal: abortController.signal,
          },
        );

        const result = (await response.json()) as ClubSearchResponse;

        if (!response.ok || !result.ok) {
          throw new Error(result.error ?? "Kulüpler aranamadı.");
        }

        setClubResults(result.clubs ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Career Path kulüp arama hatası:", error);
        setClubResults([]);
        setClubSearchError(
          error instanceof Error ? error.message : "Kulüpler aranamadı.",
        );
      } finally {
        setClubSearchLoading(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      abortController.abort();
    };
  }, [
    clubInput,
    clubSelected,
    clubSlotCount,
    gameStatus,
    minimumSearchLength,
    solvedClubs.length,
  ]);

  function selectClub(club: string) {
    setClubInput(club);
    setClubSelected(true);
    setClubResults([]);
  }

  async function saveGameResult(
    finishReason: "won" | "lost",
    nextSolvedClubs: SolvedClub[],
    nextWrongCount: number,
    nextAttemptCount: number,
  ) {
    if (resultSaved || resultSaving) return;

    try {
      setResultSaving(true);
      setResultSaveMessage("Sonuç kaydediliyor...");

      const response = await fetch("/api/career-path/result", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          finishReason,
          solvedClubIds: nextSolvedClubs.map((club) => club.id),
          wrongCount: nextWrongCount,
          attemptCount: nextAttemptCount,
        }),
      });

      const result = (await response.json()) as ResultResponse;

      if (response.status === 401) {
        setResultSaveMessage("Puanını kaydetmek için giriş yapmalısın.");
        return;
      }

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ?? "Career Path sonucu kaydedilemedi.",
        );
      }

      setResultSaved(true);

      if (result.alreadyRecorded) {
        setResultSaveMessage(
          "Bugünkü Career Path sonucun daha önce kaydedilmiş.",
        );
        return;
      }

      if (result.won) {
        setResultSaveMessage(
          `${result.score ?? 0} puan hesabına eklendi. 🔥 Career Path serisi: ${
            result.currentStreak ?? 1
          }`,
        );
      } else {
        setResultSaveMessage("Career Path sonucun kaydedildi.");
      }
    } catch (error) {
      console.error("Career Path sonuç kayıt hatası:", error);
      setResultSaveMessage(
        error instanceof Error
          ? error.message
          : "Sonuç kaydedilirken hata oluştu.",
      );
    } finally {
      setResultSaving(false);
    }
  }

  async function submitClub() {
    if (
      !dailyGame ||
      submitting ||
      resultSaving ||
      gameStatus !== "playing"
    ) {
      return;
    }

    const clubName = clubInput.trim();

    if (!clubName || !clubSelected) {
      setMessage("😏 Footy: Kulübü arama listesinden seç.");
      return;
    }

    try {
      setSubmitting(true);
      setMessage("👀 Footy: Kulüp kontrol ediliyor...");

      const response = await fetch("/api/career-path/guess", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clubName,
          solvedClubIds: solvedClubs.map((club) => club.id),
        }),
      });

      const result = (await response.json()) as GuessResponse;

      if (!response.ok || !result.ok) {
        throw new Error(result.error ?? "Kulüp kontrol edilemedi.");
      }

      const nextAttemptCount = attemptCount + 1;
      setAttemptCount(nextAttemptCount);

      if (result.duplicate) {
        setClubInput("");
        setClubSelected(false);
        setMessage(
          "😏 Footy: Bu kulübü zaten buldun. Başka bir kulüp dene.",
        );
        return;
      }

      if (!result.correct || !result.matchedClub) {
        const nextWrongCount = wrongCount + 1;

        setWrongCount(nextWrongCount);
        setClubInput("");
        setClubSelected(false);

        if (nextWrongCount >= maxWrongGuesses) {
          setGameStatus("lost");
          setMessage(
            "😂 Footy: Beş yanlış yaptın. Career Path burada bitti.",
          );

          void saveGameResult(
            "lost",
            solvedClubs,
            nextWrongCount,
            nextAttemptCount,
          );

          return;
        }

        setMessage(
          `❌ Footy: Bu kulüp kariyerinde yok. ${
            maxWrongGuesses - nextWrongCount
          } hata hakkın kaldı.`,
        );

        return;
      }

      const nextSolvedClubs = [...solvedClubs, result.matchedClub].sort(
        (firstClub, secondClub) =>
          firstClub.careerOrder - secondClub.careerOrder,
      );

      setSolvedClubs(nextSolvedClubs);
      setClubInput("");
      setClubSelected(false);

      if (nextSolvedClubs.length >= clubSlotCount) {
        setGameStatus("won");
        setMessage(
          `🎉 Footy: ${dailyGame.player.fullName} kariyerini tamamen bildin!`,
        );

        void saveGameResult(
          "won",
          nextSolvedClubs,
          wrongCount,
          nextAttemptCount,
        );

        return;
      }

      setMessage(
        `✅ Footy: ${result.matchedClub.name} doğru kulüplerden biri!`,
      );
    } catch (error) {
      console.error("Career Path tahmin hatası:", error);
      setMessage(
        error instanceof Error
          ? `⚠️ Footy: ${error.message}`
          : "⚠️ Footy: Kulüp kontrol edilemedi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetGameForTesting() {
    if (!dailyGame) return;

    localStorage.removeItem(getStorageKey(dailyGame.dateKey));

    setWrongCount(0);
    setAttemptCount(0);
    setGameStatus("playing");
    setSolvedClubs([]);
    setClubInput("");
    setClubSelected(false);
    setClubResults([]);
    setClubSearchError("");
    setSubmitting(false);
    setResultSaved(false);
    setResultSaving(false);
    setResultSaveMessage("");
    setMessage(
      "😏 Footy: Oyun sıfırlandı. Kariyer kulüplerini yeniden bul.",
    );
  }

  if (loadingGame) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07111f] text-white">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-white/10 border-t-amber-400" />
          <p className="mt-4 text-sm text-slate-400">
            Career Path hazırlanıyor...
          </p>
        </div>
      </main>
    );
  }

  if (loadingError || !dailyGame) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07111f] px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-red-500/10 p-7 text-center">
          <p className="text-xl font-black">Oyun yüklenemedi</p>
          <p className="mt-3 text-sm text-red-200">{loadingError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-white px-5 py-3 font-black text-[#07111f]"
          >
            Tekrar Dene
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <Link
            href="/"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:border-amber-400/40 hover:text-amber-300"
          >
            ← Ana Sayfa
          </Link>

          <div className="text-center">
            <p className="font-black">FootBattle</p>
            <p className="text-xs text-slate-500">Career Path</p>
          </div>

          <div className="text-right">
            <p className="text-sm font-black text-amber-300">
              {currentScore} puan
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {attemptCount} tahmin
            </p>
          </div>
        </header>

        <section className="mt-7 overflow-hidden rounded-3xl border border-amber-400/20 bg-[#111b2a] shadow-2xl shadow-black/40">
          <div className="border-b border-white/10 bg-gradient-to-r from-amber-500 to-yellow-400 px-5 py-5 text-center text-[#111827]">
            <p className="text-xs font-black uppercase tracking-[0.25em]">
              Günün Career Path&apos;i
            </p>
            <h1 className="mt-1 text-2xl font-black">
              Kariyerindeki kulüpleri bul
            </h1>
          </div>

          <div className="p-5 sm:p-8">
            <div className="grid gap-7 lg:grid-cols-[0.7fr_1.3fr]">
              <div>
                <div className="rounded-3xl border border-amber-400/20 bg-amber-400/5 p-5 text-center">
                  <span className="inline-block rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-black text-amber-300">
                    {dailyGame.dateKey}
                  </span>

                  <div className="mx-auto mt-5 flex h-60 w-60 items-end justify-center overflow-hidden rounded-3xl border border-white/10 bg-[#07111f]">
                    {dailyGame.player.imageUrl ? (
                      <img
                        src={dailyGame.player.imageUrl}
                        alt={dailyGame.player.fullName}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="text-6xl">⚽</div>
                    )}
                  </div>

                  <h2 className="mt-5 text-2xl font-black">
                    {dailyGame.player.fullName}
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Oynadığı kulüpleri kariyer sırasına göre tamamla.
                  </p>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Tamamlanan
                      </p>
                      <p className="mt-2 text-3xl font-black text-green-400">
                        {completedCount}/{clubSlotCount}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Yanlış
                      </p>
                      <p className="mt-2 text-3xl font-black text-red-400">
                        {wrongCount}/{maxWrongGuesses}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                        Kalan
                      </p>
                      <p className="mt-2 text-3xl font-black text-amber-300">
                        {remainingWrongGuesses}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Güncel puan
                  </p>
                  <p className="mt-2 text-4xl font-black text-amber-300">
                    {currentScore}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    {[
                      ["0 yanlış", 250, "text-green-300"],
                      ["1 yanlış", 200, "text-green-300"],
                      ["2 yanlış", 150, "text-yellow-300"],
                      ["3 yanlış", 100, "text-yellow-300"],
                      ["4 yanlış", 50, "text-orange-300"],
                      ["5 yanlış", 0, "text-red-300"],
                    ].map(([label, score, color]) => (
                      <div
                        key={String(label)}
                        className="rounded-lg bg-white/5 p-2"
                      >
                        {label}
                        <strong className={`mt-1 block ${color}`}>
                          {score}
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                  <p className="text-sm leading-6 text-slate-300">{message}</p>
                </div>

                <div className="relative mt-5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={clubInput}
                      disabled={
                        gameStatus !== "playing" || submitting || resultSaving
                      }
                      onChange={(event) => {
                        setClubInput(event.target.value);
                        setClubSelected(false);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void submitClub();
                      }}
                      placeholder={`Kulüp ara... En az ${minimumSearchLength} harf`}
                      className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#07111f] px-5 py-4 outline-none placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                    />

                    <button
                      type="button"
                      disabled={
                        gameStatus !== "playing" || submitting || resultSaving
                      }
                      onClick={() => void submitClub()}
                      className="shrink-0 rounded-2xl bg-amber-400 px-5 py-4 font-black text-[#111827] transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {submitting ? "..." : "Kontrol"}
                    </button>
                  </div>

                  {!clubSelected &&
                    clubInput.trim().length >= minimumSearchLength &&
                    gameStatus === "playing" && (
                      <SearchDropdown
                        loading={clubSearchLoading}
                        error={clubSearchError}
                        emptyText="Kulüp bulunamadı."
                        items={clubResults}
                        onSelect={selectClub}
                      />
                    )}
                </div>

                <div className="mt-6">
                  <p className="mb-3 text-sm font-black uppercase tracking-widest text-amber-200">
                    Kariyer Yolu
                  </p>

                  <div className="space-y-3">
                    {Array.from({ length: clubSlotCount }).map((_, index) => {
                      const club = solvedClubs.find(
                        (solvedClub) => solvedClub.careerOrder === index + 1,
                      );

                      return (
                        <div
                          key={index}
                          className={`flex min-h-20 items-center gap-4 rounded-2xl border px-5 transition ${
                            club
                              ? "border-green-400/40 bg-green-500/15"
                              : "border-white/10 bg-[#0c1929]"
                          }`}
                        >
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black ${
                              club
                                ? "bg-green-500 text-[#07111f]"
                                : "bg-white/5 text-slate-500"
                            }`}
                          >
                            {index + 1}
                          </div>

                          <div className="flex-1">
                            {club ? (
                              <>
                                <p className="text-lg font-black text-green-200">
                                  {club.name}
                                </p>
                                <p className="mt-1 text-xs text-green-400/70">
                                  Kariyer sırası: {club.careerOrder}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-lg font-black text-slate-600">
                                  ?
                                </p>
                                <p className="mt-1 text-xs text-slate-600">
                                  Bu sıradaki kulüp henüz bulunamadı.
                                </p>
                              </>
                            )}
                          </div>

                          {club && (
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 font-black text-[#07111f]">
                              ✓
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {gameStatus !== "playing" && (
                  <div
                    className={`mt-6 rounded-2xl border p-6 text-center ${
                      gameStatus === "won"
                        ? "border-green-500/30 bg-green-500/10"
                        : "border-red-500/30 bg-red-500/10"
                    }`}
                  >
                    <p className="text-2xl font-black">
                      {gameStatus === "won"
                        ? "Career Path tamamlandı! 🎉"
                        : "Career Path sona erdi 😏"}
                    </p>

                    <p className="mt-2 text-sm text-slate-300">
                      {dailyGame.player.fullName}
                    </p>

                    <p
                      className={`mt-4 text-5xl font-black ${
                        gameStatus === "won"
                          ? "text-green-400"
                          : "text-slate-500"
                      }`}
                    >
                      {gameStatus === "won" ? `${currentScore} puan` : "0 puan"}
                    </p>

                    {gameStatus === "won" && (
                      <p className="mt-3 text-sm text-amber-200">
                        {wrongCount === 0
                          ? "Hatasız tamamladın. Kusursuz kariyer bilgisi! 🔥"
                          : `${wrongCount} yanlışla tamamladın.`}
                      </p>
                    )}

                    {resultSaveMessage && (
                      <p
                        className={`mt-4 text-sm font-semibold ${
                          resultSaveMessage.includes("giriş") ||
                          resultSaveMessage.includes("hata") ||
                          resultSaveMessage.includes("kaydedilemedi")
                            ? "text-amber-300"
                            : "text-yellow-200"
                        }`}
                      >
                        {resultSaveMessage}
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={resetGameForTesting}
                  className="mx-auto mt-5 block rounded-xl border border-red-400/20 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
                >
                  Test için oyunu sıfırla
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

type SearchDropdownProps = {
  loading: boolean;
  error: string;
  emptyText: string;
  items: string[];
  onSelect: (item: string) => void;
};

function SearchDropdown({
  loading,
  error,
  emptyText,
  items,
  onSelect,
}: SearchDropdownProps) {
  return (
    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-[#0c1929] shadow-2xl shadow-black/60">
      {loading ? (
        <p className="px-4 py-3 text-sm text-slate-500">
          Kulüpler aranıyor...
        </p>
      ) : error ? (
        <p className="px-4 py-3 text-sm text-red-300">{error}</p>
      ) : items.length > 0 ? (
        items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onSelect(item)}
            className="block w-full border-b border-white/5 px-4 py-3 text-left text-sm font-semibold transition last:border-b-0 hover:bg-white/5"
          >
            {item}
          </button>
        ))
      ) : (
        <p className="px-4 py-3 text-sm text-slate-500">{emptyText}</p>
      )}
    </div>
  );
}