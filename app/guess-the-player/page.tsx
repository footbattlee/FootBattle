"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   SETTINGS
========================================================= */

const DEFAULT_MAX_ATTEMPTS = 7;
const DEFAULT_MINIMUM_SEARCH_LENGTH = 3;

/* =========================================================
   TYPES
========================================================= */

type ComparisonStatus =
  | "correct"
  | "wrong"
  | "higher"
  | "lower";

type GameStatus =
  | "playing"
  | "won"
  | "lost";

type Player = {
  id: number;
  fullName: string;
  nationality: string;
  position: string;
  club: string;
  league: string;
  age: number;
  preferredFoot: string;
  imageUrl: string | null;
};

type GuessComparison = {
  nationality: ComparisonStatus;
  position: ComparisonStatus;
  club: ComparisonStatus;
  league: ComparisonStatus;
  age: ComparisonStatus;
  preferredFoot: ComparisonStatus;
};

type GuessRow = {
  player: Player;
  comparison: GuessComparison;
};

type GameSession = {
  sessionId: string;
  maxAttempts: number;
  minimumSearchLength: number;
};

type TodayResponse = {
  ok?: boolean;
  error?: string;
  sessionId?: string;
  maxAttempts?: number;
  minimumSearchLength?: number;
};

type SearchResponse = {
  ok?: boolean;
  error?: string;
  players?: Player[];
};

type GuessResponse = {
  ok?: boolean;
  error?: string;
  won?: boolean;
  player?: Player;
  comparison?: GuessComparison;
  targetPlayer?: Player | null;
};

type ResultResponse = {
  ok?: boolean;
  error?: string;
  won?: boolean;
  score?: number;
  attemptCount?: number;
  alreadyRecorded?: boolean;
  authenticated?: boolean;
  targetPlayer?: Player | null;
  currentStreak?: number | null;
  bestStreak?: number | null;
  totalScore?: number;
  gamesPlayed?: number;
  gamesWon?: number;
  durationSeconds?: number | null;
};

/* =========================================================
   HELPERS
========================================================= */

function getComparisonClasses(
  status: ComparisonStatus,
) {
  if (status === "correct") {
    return "border-green-400/40 bg-green-500/20 text-green-200";
  }

  if (
    status === "higher" ||
    status === "lower"
  ) {
    return "border-amber-400/40 bg-amber-400/15 text-amber-200";
  }

  return "border-red-500/30 bg-red-500/15 text-red-200";
}

function getAgeDirection(
  status: ComparisonStatus,
) {
  if (status === "higher") {
    return "↑";
  }

  if (status === "lower") {
    return "↓";
  }

  return "";
}

function calculateScore(
  attemptCount: number,
  won: boolean,
) {
  if (!won) {
    return 0;
  }

  const scores = [
    350,
    300,
    250,
    200,
    150,
    100,
    50,
  ];

  return (
    scores[
      attemptCount - 1
    ] ?? 0
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function GuessThePlayerPage() {
  const [
    gameSession,
    setGameSession,
  ] =
    useState<GameSession | null>(
      null,
    );

  const [
    loadingGame,
    setLoadingGame,
  ] =
    useState(true);

  const [
    loadingError,
    setLoadingError,
  ] =
    useState("");

  const [
    searchText,
    setSearchText,
  ] =
    useState("");

  const [
    searchResults,
    setSearchResults,
  ] =
    useState<Player[]>([]);

  const [
    selectedPlayer,
    setSelectedPlayer,
  ] =
    useState<Player | null>(
      null,
    );

  const [
    searchLoading,
    setSearchLoading,
  ] =
    useState(false);

  const [
    searchError,
    setSearchError,
  ] =
    useState("");

  const [
    guesses,
    setGuesses,
  ] =
    useState<GuessRow[]>([]);

  const [
    gameStatus,
    setGameStatus,
  ] =
    useState<GameStatus>(
      "playing",
    );

  const [
    message,
    setMessage,
  ] =
    useState(
      "😏 Footy: Üç harf yaz da kimi düşündüğünü görelim.",
    );

  const [
    revealedPlayer,
    setRevealedPlayer,
  ] =
    useState<Player | null>(
      null,
    );

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    resultSaved,
    setResultSaved,
  ] =
    useState(false);

  const [
    resultLoading,
    setResultLoading,
  ] =
    useState(false);

  const [
    resultSaveMessage,
    setResultSaveMessage,
  ] =
    useState("");

  const [
    newGameLoading,
    setNewGameLoading,
  ] =
    useState(false);

  /* =======================================================
     COMPUTED
  ======================================================= */

  const maxAttempts =
    gameSession?.maxAttempts ??
    DEFAULT_MAX_ATTEMPTS;

  const minimumSearchLength =
    gameSession
      ?.minimumSearchLength ??
    DEFAULT_MINIMUM_SEARCH_LENGTH;

  const score =
    calculateScore(
      guesses.length,
      gameStatus === "won",
    );

  const guessedPlayerIds =
    useMemo(
      () =>
        new Set(
          guesses.map(
            (guess) =>
              guess.player.id,
          ),
        ),
      [guesses],
    );

  const visibleSearchResults =
    useMemo(
      () =>
        searchResults.filter(
          (player) =>
            !guessedPlayerIds.has(
              player.id,
            ),
        ),
      [
        guessedPlayerIds,
        searchResults,
      ],
    );

  /* =======================================================
     SCROLL TO GUESS
  ======================================================= */

  function scrollToGuess(
    guessNumber: number,
  ) {
    const element =
      document.getElementById(
        `mobile-guess-${guessNumber}`,
      );

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    element.classList.add(
      "ring-2",
      "ring-purple-400/70",
    );

    window.setTimeout(
      () => {
        element.classList.remove(
          "ring-2",
          "ring-purple-400/70",
        );
      },
      900,
    );
  }

  function scrollToLatestGuess() {
    if (
      guesses.length ===
      0
    ) {
      return;
    }

    scrollToGuess(
      guesses.length,
    );
  }

  /* =======================================================
     RESET
  ======================================================= */

  const resetGameState =
    useCallback(() => {
      setSearchText("");
      setSearchResults([]);
      setSelectedPlayer(null);
      setSearchLoading(false);
      setSearchError("");

      setGuesses([]);
      setGameStatus("playing");
      setRevealedPlayer(null);
      setSubmitting(false);

      setResultSaved(false);
      setResultLoading(false);
      setResultSaveMessage("");

      setMessage(
        "😏 Footy: Üç harf yaz da kimi düşündüğünü görelim.",
      );
    }, []);

  /* =======================================================
     CREATE NEW SESSION
  ======================================================= */

  const startNewGame =
    useCallback(
      async (
        initial =
          false,
      ) => {
        try {
          if (initial) {
            setLoadingGame(
              true,
            );
          } else {
            setNewGameLoading(
              true,
            );
          }

          setLoadingError("");

          resetGameState();

          const response =
            await fetch(
              "/api/guess-the-player/today",
              {
                method: "GET",
                cache: "no-store",
              },
            );

          const result =
            (await response.json()) as TodayResponse;

          if (
            !response.ok ||
            !result.ok
          ) {
            throw new Error(
              result.error ??
                "Yeni oyun hazırlanamadı.",
            );
          }

          if (
            !result.sessionId
          ) {
            throw new Error(
              "Oyun oturum numarası alınamadı.",
            );
          }

          setGameSession({
            sessionId:
              result.sessionId,

            maxAttempts:
              result.maxAttempts ??
              DEFAULT_MAX_ATTEMPTS,

            minimumSearchLength:
              result.minimumSearchLength ??
              DEFAULT_MINIMUM_SEARCH_LENGTH,
          });

          setMessage(
            initial
              ? "😏 Footy: Üç harf yaz da kimi düşündüğünü görelim."
              : "⚽ Footy: Yeni gizli oyuncu hazır. Hadi bakalım.",
          );
        } catch (error) {
          console.error(
            "Guess the Player yükleme hatası:",
            error,
          );

          setGameSession(
            null,
          );

          setLoadingError(
            error instanceof Error
              ? error.message
              : "Yeni oyun hazırlanamadı.",
          );
        } finally {
          setLoadingGame(false);
          setNewGameLoading(false);
        }
      },
      [resetGameState],
    );

  /* =======================================================
     INITIAL GAME
  ======================================================= */

  useEffect(() => {
    void startNewGame(
      true,
    );
  }, [
    startNewGame,
  ]);

  /* =======================================================
     SEARCH
  ======================================================= */

  useEffect(() => {
    const query =
      searchText.trim();

    if (
      query.length <
        minimumSearchLength ||
      selectedPlayer ||
      gameStatus !==
        "playing"
    ) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError("");

      return;
    }

    const abortController =
      new AbortController();

    const timer =
      window.setTimeout(
        async () => {
          try {
            setSearchLoading(true);
            setSearchError("");

            const response =
              await fetch(
                `/api/guess-the-player/search?q=${encodeURIComponent(
                  query,
                )}`,
                {
                  signal:
                    abortController.signal,

                  cache:
                    "no-store",
                },
              );

            const result =
              (await response.json()) as SearchResponse;

            if (
              !response.ok ||
              !result.ok
            ) {
              throw new Error(
                result.error ??
                  "Oyuncular aranamadı.",
              );
            }

            setSearchResults(
              result.players ?? [],
            );
          } catch (error) {
            if (
              error instanceof DOMException &&
              error.name === "AbortError"
            ) {
              return;
            }

            console.error(
              "Oyuncu arama hatası:",
              error,
            );

            setSearchResults([]);

            setSearchError(
              error instanceof Error
                ? error.message
                : "Oyuncular aranamadı.",
            );
          } finally {
            setSearchLoading(false);
          }
        },
        250,
      );

    return () => {
      window.clearTimeout(
        timer,
      );

      abortController.abort();
    };
  }, [
    gameStatus,
    minimumSearchLength,
    searchText,
    selectedPlayer,
  ]);

  /* =======================================================
     SELECT PLAYER
  ======================================================= */

  function selectPlayer(
    player: Player,
  ) {
    setSelectedPlayer(
      player,
    );

    setSearchText(
      player.fullName,
    );

    setSearchResults([]);
    setSearchError("");

    setMessage(
      `👀 Footy: ${player.fullName} diyorsun. Eminsen tahmini gönder.`,
    );
  }

  /* =======================================================
     SAVE RESULT
  ======================================================= */

  async function saveGameResult(
    completedGuesses:
      GuessRow[],
  ) {
    if (
      resultSaved ||
      resultLoading ||
      !gameSession
    ) {
      return;
    }

    try {
      setResultLoading(true);

      setResultSaveMessage(
        "Sonuç hazırlanıyor...",
      );

      const response =
        await fetch(
          "/api/guess-the-player/result",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                sessionId:
                  gameSession.sessionId,

                playerIds:
                  completedGuesses.map(
                    (guess) =>
                      guess.player.id,
                  ),
              }),
          },
        );

      const result =
        (await response.json()) as ResultResponse;

      if (
        response.status ===
        401
      ) {
        setResultSaveMessage(
          "Puanını kaydetmek için giriş yapmalısın.",
        );

        return;
      }

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
            "Oyun sonucu alınamadı.",
        );
      }

      setResultSaved(true);

      if (
        result.targetPlayer
      ) {
        setRevealedPlayer(
          result.targetPlayer,
        );
      }

      if (
        result.alreadyRecorded
      ) {
        if (
          result.authenticated
        ) {
          setResultSaveMessage(
            "Bu oyunun sonucu daha önce kaydedilmiş.",
          );
        } else {
          setResultSaveMessage(
            "Gizli oyuncu açıklandı.",
          );
        }

        return;
      }

      if (
        result.authenticated
      ) {
        if (
          result.won
        ) {
          setResultSaveMessage(
            `${result.score ?? 0} puan hesabına eklendi. 🔥`,
          );
        } else {
          setResultSaveMessage(
            "Oyun sonucun kaydedildi.",
          );
        }

        return;
      }

      setResultSaveMessage(
        result.won
          ? "Kazandın! Puanını hesabına kaydetmek için giriş yapabilirsin."
          : "Gizli oyuncu açıklandı. Skorunu kaydetmek için giriş yapabilirsin.",
      );
    } catch (error) {
      console.error(
        "Guess the Player sonuç kayıt hatası:",
        error,
      );

      setResultSaveMessage(
        error instanceof Error
          ? error.message
          : "Sonuç alınırken hata oluştu.",
      );
    } finally {
      setResultLoading(false);
    }
  }

  /* =======================================================
     SUBMIT GUESS
  ======================================================= */

  async function submitGuess() {
    if (
      gameStatus !==
        "playing" ||
      submitting ||
      !gameSession
    ) {
      return;
    }

    if (
      !selectedPlayer
    ) {
      if (
        visibleSearchResults.length ===
        1
      ) {
        const onlyPlayer =
          visibleSearchResults[0];

        setSelectedPlayer(
          onlyPlayer,
        );

        setSearchText(
          onlyPlayer.fullName,
        );

        await submitSelectedPlayer(
          onlyPlayer,
        );

        return;
      }

      setMessage(
        "😏 Footy: Oyuncuyu listeden seçmeden tahmin olmaz.",
      );

      return;
    }

    await submitSelectedPlayer(
      selectedPlayer,
    );
  }

  /* =======================================================
     ACTUAL GUESS
  ======================================================= */

  async function submitSelectedPlayer(
    player: Player,
  ) {
    if (
      !gameSession ||
      submitting ||
      gameStatus !==
        "playing"
    ) {
      return;
    }

    if (
      guessedPlayerIds.has(
        player.id,
      )
    ) {
      setMessage(
        "😏 Footy: Bu oyuncuyu zaten tahmin ettin.",
      );

      setSelectedPlayer(null);
      setSearchText("");

      return;
    }

    try {
      setSubmitting(true);

      setMessage(
        "👀 Footy: Tahminin kontrol ediliyor...",
      );

      const response =
        await fetch(
          "/api/guess-the-player/guess",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                sessionId:
                  gameSession.sessionId,

                playerId:
                  player.id,
              }),
          },
        );

      const result =
        (await response.json()) as GuessResponse;

      if (
        !response.ok ||
        !result.ok ||
        !result.player ||
        !result.comparison
      ) {
        throw new Error(
          result.error ??
            "Tahmin kontrol edilemedi.",
        );
      }

      const nextGuesses:
        GuessRow[] = [
          ...guesses,
          {
            player:
              result.player,

            comparison:
              result.comparison,
          },
        ];

      setGuesses(
        nextGuesses,
      );

      setSelectedPlayer(null);
      setSearchText("");
      setSearchResults([]);

      /* =================================================
         WON
      ================================================= */

      if (
        result.won
      ) {
        setGameStatus(
          "won",
        );

        setRevealedPlayer(
          result.targetPlayer ??
            result.player,
        );

        if (
          nextGuesses.length ===
          1
        ) {
          setMessage(
            `🤯 Footy: İlk tahminde ${result.player.fullName}! Buna lafım yok.`,
          );
        } else {
          setMessage(
            `🎉 Footy: Bildin! ${result.player.fullName} doğru cevap.`,
          );
        }

        void saveGameResult(
          nextGuesses,
        );

        return;
      }

      /* =================================================
         LOST
      ================================================= */

      if (
        nextGuesses.length >=
        maxAttempts
      ) {
        setGameStatus(
          "lost",
        );

        if (
          result.targetPlayer
        ) {
          setRevealedPlayer(
            result.targetPlayer,
          );
        }

        setMessage(
          `😂 Footy: ${maxAttempts} hakkı da kullandın. Bugün olmadı.`,
        );

        void saveGameResult(
          nextGuesses,
        );

        return;
      }

      /* =================================================
         CONTINUE
      ================================================= */

      const remainingAttempts =
        maxAttempts -
        nextGuesses.length;

      setMessage(
        `👀 Footy: Olmadı. ${remainingAttempts} hakkın kaldı.`,
      );
    } catch (error) {
      console.error(
        "Tahmin gönderme hatası:",
        error,
      );

      setMessage(
        error instanceof Error
          ? `⚠️ Footy: ${error.message}`
          : "⚠️ Footy: Tahmin kontrol edilemedi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /* =======================================================
     NEW GAME
  ======================================================= */

  async function handleNewGame() {
    if (
      newGameLoading ||
      submitting ||
      resultLoading
    ) {
      return;
    }

    await startNewGame(
      false,
    );
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loadingGame &&
    !gameSession
  ) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#07111f] text-white">

        <div className="text-center">

          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-purple-500" />

          <p className="mt-4 text-sm text-slate-400">
            Yeni gizli oyuncu seçiliyor...
          </p>

        </div>

      </main>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (
    loadingError ||
    !gameSession
  ) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#07111f] px-4 text-white">

        <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-red-500/10 p-7 text-center">

          <p className="text-xl font-black">
            Oyun yüklenemedi
          </p>

          <p className="mt-3 text-sm text-red-200">
            {loadingError ||
              "Yeni oyun hazırlanamadı."}
          </p>

          <button
            type="button"
            onClick={() =>
              void startNewGame(
                true,
              )
            }
            className="mt-5 rounded-xl bg-white px-5 py-3 font-black text-[#07111f]"
          >
            Tekrar Dene
          </button>

        </div>

      </main>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className="min-h-[100dvh] bg-[#07111f] px-3 pb-[calc(24px+env(safe-area-inset-bottom))] pt-4 text-white sm:px-6 sm:py-6">

      <div className="mx-auto max-w-6xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-white/10 pb-3 sm:pb-5">

          <div className="flex justify-start">

            <Link
              href="/"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:border-purple-400/40 hover:text-purple-300 sm:px-4 sm:text-sm"
            >
              ← Ana Sayfa
            </Link>

          </div>

          <div className="text-center">

            <p className="text-sm font-black sm:text-base">
              FootBattle
            </p>

            <p className="text-[10px] text-slate-500 sm:text-xs">
              Guess the Player
            </p>

          </div>

          <div className="flex justify-end">

            <button
              type="button"
              disabled={
                guesses.length ===
                0
              }
              onClick={
                scrollToLatestGuess
              }
              title={
                guesses.length > 0
                  ? "Son tahmine git"
                  : "Henüz tahmin yok"
              }
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black transition hover:border-purple-400/40 hover:bg-purple-500/10 hover:text-purple-300 disabled:cursor-default disabled:hover:border-white/10 disabled:hover:bg-transparent disabled:hover:text-white sm:px-4 sm:text-sm"
            >

              {guesses.length}
              /
              {maxAttempts}

            </button>

          </div>

        </header>

        {/* =================================================
            GAME CARD
        ================================================= */}

        <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-2xl shadow-black/30 sm:mt-7 sm:rounded-3xl sm:p-7">

          {/* TITLE */}

          <div className="text-center">

            <span className="inline-block rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-purple-300 sm:px-4 sm:py-2 sm:text-xs">
              SINIRSIZ MOD
            </span>

            <h1 className="mt-3 text-2xl font-black sm:mt-5 sm:text-4xl">
              Gizli Oyuncuyu Bul
            </h1>

            <p className="mt-1.5 text-xs leading-5 text-slate-400 sm:mt-2 sm:text-base">

              Oyuncuları karşılaştır ve gizli futbolcuyu{" "}

              <strong className="text-white">
                {maxAttempts} tahminde
              </strong>{" "}

              bul.

            </p>

            <p className="mt-1 hidden text-xs font-semibold text-purple-300/70 sm:block">
              Her yeni oyunda otomatik olarak farklı bir oyuncu seçilir.
            </p>

          </div>

          {/* ===============================================
              SEARCH
          =============================================== */}

          <div className="mx-auto mt-4 max-w-2xl sm:mt-8">

            <div className="relative">

              <input
                type="text"
                value={
                  searchText
                }
                disabled={
                  gameStatus !==
                    "playing" ||
                  submitting
                }
                onChange={(
                  event,
                ) => {
                  setSearchText(
                    event.target.value,
                  );

                  setSelectedPlayer(null);
                  setSearchError("");
                }}
                onKeyDown={(
                  event,
                ) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    event.preventDefault();

                    void submitGuess();
                  }
                }}
                placeholder={`Oyuncu ara... En az ${minimumSearchLength} harf`}
                autoComplete="off"
                className="w-full rounded-xl border border-white/10 bg-[#0c1929] px-4 py-3.5 pr-[108px] text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-purple-400/60 disabled:cursor-not-allowed disabled:opacity-60 sm:rounded-2xl sm:px-5 sm:py-4 sm:pr-28 sm:text-base"
              />

              <button
                type="button"
                onClick={() =>
                  void submitGuess()
                }
                disabled={
                  (
                    !selectedPlayer &&
                    visibleSearchResults.length !==
                      1
                  ) ||
                  gameStatus !==
                    "playing" ||
                  submitting
                }
                className="absolute bottom-1.5 right-1.5 top-1.5 rounded-lg bg-purple-500 px-3 text-xs font-black text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-40 sm:bottom-2 sm:right-2 sm:top-2 sm:rounded-xl sm:px-5 sm:text-sm"
              >

                {submitting
                  ? "Kontrol..."
                  : "Tahmin Et"}

              </button>

              {/* SEARCH RESULTS */}

              {searchText.trim()
                .length >=
                minimumSearchLength &&
                !selectedPlayer &&
                gameStatus ===
                  "playing" && (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-[55dvh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0c1929] shadow-2xl shadow-black/50">

                    {searchLoading ? (
                      <p className="px-4 py-4 text-sm text-slate-500 sm:px-5">
                        Oyuncular aranıyor...
                      </p>
                    ) : searchError ? (
                      <p className="px-4 py-4 text-sm text-red-300 sm:px-5">
                        {searchError}
                      </p>
                    ) : visibleSearchResults.length >
                      0 ? (
                      visibleSearchResults.map(
                        (
                          player,
                        ) => (
                          <button
                            key={
                              player.id
                            }
                            type="button"
                            onClick={() =>
                              selectPlayer(
                                player,
                              )
                            }
                            className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition last:border-b-0 hover:bg-white/5 sm:gap-4 sm:px-5 sm:py-4"
                          >

                            {player.imageUrl ? (
                              <img
                                src={
                                  player.imageUrl
                                }
                                alt={
                                  player.fullName
                                }
                                className="h-10 w-10 shrink-0 rounded-xl bg-white/5 object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 font-black text-purple-300">
                                ?
                              </div>
                            )}

                            <div className="min-w-0 flex-1">

                              <p className="truncate text-sm font-bold sm:text-base">
                                {player.fullName}
                              </p>

                              <p className="mt-0.5 truncate text-[11px] text-slate-500 sm:mt-1 sm:text-xs">
                                {player.club}
                                {" · "}
                                {player.nationality}
                              </p>

                            </div>

                            <span className="shrink-0 text-xs font-semibold text-purple-300 sm:text-sm">
                              Seç
                            </span>

                          </button>
                        ),
                      )
                    ) : (
                      <p className="px-4 py-4 text-sm text-slate-500 sm:px-5">
                        Bu aramayla eşleşen oyuncu bulunamadı.
                      </p>
                    )}

                  </div>
                )}

            </div>

            {/* SELECTED PLAYER */}

            {selectedPlayer && (
              <div className="mt-2.5 flex items-center justify-between rounded-xl border border-purple-500/20 bg-purple-500/10 px-3 py-2.5 sm:mt-3 sm:px-4 sm:py-3">

                <div className="min-w-0">

                  <p className="text-[9px] font-black uppercase tracking-wider text-purple-300 sm:text-xs">
                    Seçilen Oyuncu
                  </p>

                  <p className="mt-0.5 truncate text-sm font-black sm:mt-1 sm:text-base">
                    {selectedPlayer.fullName}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlayer(null);
                    setSearchText("");
                  }}
                  className="ml-3 shrink-0 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-black text-slate-400 transition hover:text-white sm:text-xs"
                >
                  Değiştir
                </button>

              </div>
            )}

            <p className="mt-2 text-center text-[10px] leading-4 text-slate-600 sm:mt-3 sm:text-xs">
              İsmin herhangi bir yerinden 3 harf yazabilirsin.
              <span className="hidden sm:inline">
                {" "}
                Örn.{" "}
                <strong className="text-slate-500">
                  nei
                </strong>{" "}
                → Wesley Sneijder.
              </span>
            </p>

          </div>

          {/* ===============================================
              FOOTY
          =============================================== */}

          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-center sm:mt-7 sm:rounded-2xl sm:p-4">

            <p className="text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6">
              {message}
            </p>

          </div>

          {/* ===============================================
              MOBILE
          =============================================== */}

          <div className="mt-4 md:hidden">

            {/* =============================================
                PROGRESS
            ============================================= */}

            <div className="mb-3">

              <div className="flex items-end justify-between gap-3">

                <div>

                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">
                    Tahminler
                  </p>

                  <p className="mt-0.5 text-xs font-black text-slate-300">
                    {guesses.length}/{maxAttempts} kullanıldı
                  </p>

                </div>

                {guesses.length >
                  0 && (
                  <p className="text-[9px] text-slate-600">
                    Numaraya dokun → tahmine git
                  </p>
                )}

              </div>

              <div className="mt-2.5 grid grid-cols-7 gap-1.5">

                {Array.from({
                  length:
                    maxAttempts,
                }).map(
                  (
                    _,
                    index,
                  ) => {
                    const guessNumber =
                      index + 1;

                    const completed =
                      guessNumber <=
                      guesses.length;

                    const latest =
                      guessNumber ===
                        guesses.length &&
                      guesses.length >
                        0;

                    return (
                      <button
                        key={
                          guessNumber
                        }
                        type="button"
                        disabled={
                          !completed
                        }
                        onClick={() =>
                          scrollToGuess(
                            guessNumber,
                          )
                        }
                        className={`flex h-8 items-center justify-center rounded-lg border text-[10px] font-black transition ${
                          latest
                            ? "border-purple-400 bg-purple-500 text-white shadow-lg shadow-purple-500/15"
                            : completed
                              ? "border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
                              : "cursor-default border-white/[0.06] bg-white/[0.02] text-slate-700"
                        }`}
                      >
                        {guessNumber}
                      </button>
                    );
                  },
                )}

              </div>

            </div>

            {/* =============================================
                LOST - TARGET PLAYER

                BURASI YENİ:
                Progress ile son tahmin arasına taşındı.
            ============================================= */}

            {gameStatus ===
              "lost" &&
              resultLoading &&
              !revealedPlayer && (
                <div className="mb-3 rounded-2xl border border-red-500/15 bg-red-500/[0.05] px-4 py-4 text-center">

                  <p className="text-xs font-semibold text-slate-400">
                    Gizli oyuncu açıklanıyor...
                  </p>

                </div>
              )}

            {gameStatus ===
              "lost" &&
              revealedPlayer && (
                <div className="mb-3 overflow-hidden rounded-2xl border border-red-500/25 bg-red-500/[0.07]">

                  <div className="border-b border-white/[0.06] px-4 py-2.5">

                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-red-300">
                      😤 Doğru Cevap
                    </p>

                  </div>

                  <div className="flex items-center gap-3 p-3.5">

                    {revealedPlayer.imageUrl ? (
                      <img
                        src={
                          revealedPlayer.imageUrl
                        }
                        alt={
                          revealedPlayer.fullName
                        }
                        className="h-14 w-14 shrink-0 rounded-xl border border-white/10 bg-white/5 object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xl">
                        ⚽
                      </div>
                    )}

                    <div className="min-w-0 flex-1">

                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                        Gizli Oyuncu
                      </p>

                      <p className="mt-1 truncate text-lg font-black text-white">
                        {revealedPlayer.fullName}
                      </p>

                      <p className="mt-1 truncate text-xs font-semibold text-slate-400">
                        {revealedPlayer.club}
                      </p>

                      <p className="mt-0.5 truncate text-[10px] text-slate-600">
                        {revealedPlayer.nationality}
                        {" · "}
                        {revealedPlayer.position}
                      </p>

                    </div>

                  </div>

                </div>
              )}

            {/* =============================================
                NO GUESS
            ============================================= */}

            {guesses.length ===
              0 && (
              <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-center">

                <p className="text-xl">
                  👀
                </p>

                <p className="mt-2 text-xs font-black text-slate-300">
                  İlk tahminini bekliyoruz
                </p>

                <p className="mt-1 text-[10px] leading-4 text-slate-600">
                  Tahmin yaptıktan sonra ipuçları burada görünecek.
                </p>

              </div>
            )}

            {/* =============================================
                GUESS CARDS
                EN SON TAHMİN EN ÜSTTE
            ============================================= */}

            <div className="space-y-3">

              {[...guesses]
                .reverse()
                .map(
                  (
                    guess,
                    reversedIndex,
                  ) => {
                    const originalIndex =
                      guesses.length -
                      1 -
                      reversedIndex;

                    const guessNumber =
                      originalIndex +
                      1;

                    const playerIsCorrect =
                      Object.values(
                        guess.comparison,
                      ).every(
                        (
                          status,
                        ) =>
                          status ===
                          "correct",
                      );

                    return (
                      <article
                        id={`mobile-guess-${guessNumber}`}
                        key={`${guess.player.id}-${originalIndex}`}
                        className={`scroll-mt-24 overflow-hidden rounded-2xl border transition-all duration-300 ${
                          playerIsCorrect
                            ? "border-green-400/30 bg-green-500/[0.07]"
                            : "border-white/10 bg-white/[0.035]"
                        }`}
                      >

                        <div className="flex items-center gap-3 border-b border-white/[0.07] p-3">

                          {guess.player.imageUrl ? (
                            <img
                              src={
                                guess.player.imageUrl
                              }
                              alt={
                                guess.player.fullName
                              }
                              className="h-11 w-11 shrink-0 rounded-xl border border-white/10 bg-white/5 object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-lg">
                              ⚽
                            </div>
                          )}

                          <div className="min-w-0 flex-1">

                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-600">
                              Tahmin {guessNumber}
                            </p>

                            <p className="mt-0.5 truncate text-sm font-black text-white">
                              {guess.player.fullName}
                            </p>

                          </div>

                          {playerIsCorrect ? (
                            <span className="shrink-0 rounded-full bg-green-500/15 px-2.5 py-1 text-[9px] font-black text-green-300">
                              ✓ DOĞRU
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-red-500/10 px-2.5 py-1 text-[9px] font-black text-red-300">
                              YANLIŞ
                            </span>
                          )}

                        </div>

                        <div className="grid grid-cols-2 gap-2 p-2.5">

                          <MobileComparisonItem
                            icon="🌍"
                            label="Milliyet"
                            value={
                              guess.player.nationality
                            }
                            status={
                              guess.comparison.nationality
                            }
                          />

                          <MobileComparisonItem
                            icon="🎯"
                            label="Pozisyon"
                            value={
                              guess.player.position
                            }
                            status={
                              guess.comparison.position
                            }
                          />

                          <MobileComparisonItem
                            icon="🏟️"
                            label="Kulüp"
                            value={
                              guess.player.club
                            }
                            status={
                              guess.comparison.club
                            }
                          />

                          <MobileComparisonItem
                            icon="🏆"
                            label="Lig"
                            value={
                              guess.player.league
                            }
                            status={
                              guess.comparison.league
                            }
                          />

                          <MobileComparisonItem
                            icon="🎂"
                            label="Yaş"
                            value={`${guess.player.age}`}
                            status={
                              guess.comparison.age
                            }
                            suffix={
                              getAgeDirection(
                                guess.comparison.age,
                              )
                            }
                          />

                          <MobileComparisonItem
                            icon="🦶"
                            label="Ayak"
                            value={
                              guess.player.preferredFoot
                            }
                            status={
                              guess.comparison.preferredFoot
                            }
                          />

                        </div>

                      </article>
                    );
                  },
                )}

            </div>

          </div>

          {/* ===============================================
              DESKTOP COMPARISON TABLE
          =============================================== */}

          <div className="mt-8 hidden overflow-x-auto md:block">

            <div className="min-w-[900px]">

              <div className="grid grid-cols-[1.4fr_repeat(6,1fr)] gap-2 text-center text-xs font-bold uppercase tracking-wider text-slate-500">

                {[
                  "Oyuncu",
                  "Milliyet",
                  "Pozisyon",
                  "Kulüp",
                  "Lig",
                  "Yaş",
                  "Ayak",
                ].map(
                  (
                    title,
                  ) => (
                    <div
                      key={
                        title
                      }
                      className="rounded-xl bg-white/[0.03] p-3"
                    >
                      {title}
                    </div>
                  ),
                )}

              </div>

              <div className="mt-2 space-y-2">

                {Array.from({
                  length:
                    maxAttempts,
                }).map(
                  (
                    _,
                    rowIndex,
                  ) => {
                    const guess =
                      guesses[
                        rowIndex
                      ];

                    if (!guess) {
                      return (
                        <div
                          key={
                            rowIndex
                          }
                          className="grid grid-cols-[1.4fr_repeat(6,1fr)] gap-2"
                        >

                          {Array.from({
                            length:
                              7,
                          }).map(
                            (
                              _,
                              columnIndex,
                            ) => (
                              <div
                                key={
                                  columnIndex
                                }
                                className="h-[70px] rounded-xl border border-white/10 bg-white/[0.02]"
                              />
                            ),
                          )}

                        </div>
                      );
                    }

                    const playerIsCorrect =
                      Object.values(
                        guess.comparison,
                      ).every(
                        (
                          status,
                        ) =>
                          status ===
                          "correct",
                      );

                    return (
                      <div
                        key={
                          rowIndex
                        }
                        className="grid grid-cols-[1.4fr_repeat(6,1fr)] gap-2"
                      >

                        <div
                          className={`flex min-h-[70px] items-center rounded-xl border px-4 font-bold ${
                            playerIsCorrect
                              ? getComparisonClasses(
                                  "correct",
                                )
                              : getComparisonClasses(
                                  "wrong",
                                )
                          }`}
                        >
                          {guess.player.fullName}
                        </div>

                        <div
                          className={`flex min-h-[70px] items-center justify-center rounded-xl border px-2 text-center text-sm font-semibold ${getComparisonClasses(
                            guess.comparison.nationality,
                          )}`}
                        >
                          {guess.player.nationality}
                        </div>

                        <div
                          className={`flex min-h-[70px] items-center justify-center rounded-xl border px-2 text-center text-sm font-semibold ${getComparisonClasses(
                            guess.comparison.position,
                          )}`}
                        >
                          {guess.player.position}
                        </div>

                        <div
                          className={`flex min-h-[70px] items-center justify-center rounded-xl border px-2 text-center text-sm font-semibold ${getComparisonClasses(
                            guess.comparison.club,
                          )}`}
                        >
                          {guess.player.club}
                        </div>

                        <div
                          className={`flex min-h-[70px] items-center justify-center rounded-xl border px-2 text-center text-sm font-semibold ${getComparisonClasses(
                            guess.comparison.league,
                          )}`}
                        >
                          {guess.player.league}
                        </div>

                        <div
                          className={`flex min-h-[70px] items-center justify-center rounded-xl border px-2 text-center text-sm font-semibold ${getComparisonClasses(
                            guess.comparison.age,
                          )}`}
                        >

                          <span>

                            {guess.player.age}
                            {" "}

                            <strong className="text-lg">
                              {getAgeDirection(
                                guess.comparison.age,
                              )}
                            </strong>

                          </span>

                        </div>

                        <div
                          className={`flex min-h-[70px] items-center justify-center rounded-xl border px-2 text-center text-sm font-semibold ${getComparisonClasses(
                            guess.comparison.preferredFoot,
                          )}`}
                        >
                          {guess.player.preferredFoot}
                        </div>

                      </div>
                    );
                  },
                )}

              </div>

            </div>

          </div>

          {/* ===============================================
              RESULT
          =============================================== */}

          {gameStatus !==
            "playing" && (
            <div
              className={`mt-5 rounded-2xl border p-4 text-center sm:mt-7 sm:p-6 ${
                gameStatus ===
                "won"
                  ? "border-green-500/20 bg-green-500/10"
                  : "border-red-500/20 bg-red-500/10"
              }`}
            >

              <p className="text-3xl sm:text-4xl">

                {gameStatus ===
                "won"
                  ? "🏆"
                  : "😤"}

              </p>

              <p className="mt-2 text-lg font-black sm:mt-3 sm:text-xl">

                {gameStatus ===
                "won"
                  ? "Tebrikler!"
                  : "Oyuncuyu bulamadın!"}

              </p>

              {/* ===========================================
                  DESKTOP TARGET PLAYER

                  Mobilde yukarı taşıdık.
              =========================================== */}

              {gameStatus ===
                "lost" &&
                resultLoading &&
                !revealedPlayer && (
                  <p className="mt-4 hidden text-sm text-slate-400 md:block">
                    Gizli oyuncu açıklanıyor...
                  </p>
                )}

              {revealedPlayer && (
                <div className="mx-auto mt-5 hidden max-w-sm rounded-2xl border border-white/10 bg-black/20 p-5 md:block">

                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Gizli Oyuncu
                  </p>

                  <div className="mt-4 flex items-center justify-center gap-4">

                    {revealedPlayer.imageUrl ? (
                      <img
                        src={
                          revealedPlayer.imageUrl
                        }
                        alt={
                          revealedPlayer.fullName
                        }
                        className="h-16 w-16 rounded-2xl border border-white/10 object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-2xl">
                        ⚽
                      </div>
                    )}

                    <div className="min-w-0 text-left">

                      <p className="truncate text-xl font-black text-white">
                        {revealedPlayer.fullName}
                      </p>

                      <p className="mt-1 truncate text-sm font-semibold text-slate-400">
                        {revealedPlayer.club}
                      </p>

                      <p className="mt-1 truncate text-xs text-slate-600">
                        {revealedPlayer.nationality}
                        {" · "}
                        {revealedPlayer.position}
                      </p>

                    </div>

                  </div>

                </div>
              )}

              <p
                className={`mt-4 text-2xl font-black sm:mt-5 sm:text-3xl ${
                  gameStatus ===
                  "won"
                    ? "text-green-400"
                    : "text-slate-400"
                }`}
              >
                {score} puan
              </p>

              {resultSaveMessage && (
                <p
                  className={`mt-2 text-xs font-semibold sm:mt-3 sm:text-sm ${
                    resultSaveMessage.includes(
                      "giriş",
                    ) ||
                    resultSaveMessage.includes(
                      "hata",
                    ) ||
                    resultSaveMessage.includes(
                      "kaydedilemedi",
                    )
                      ? "text-amber-300"
                      : "text-purple-200"
                  }`}
                >
                  {resultSaveMessage}
                </p>
              )}

              <div className="mt-4 flex flex-col justify-center gap-2 sm:mt-6 sm:flex-row">

                <button
                  type="button"
                  disabled={
                    newGameLoading ||
                    resultLoading
                  }
                  onClick={() =>
                    void handleNewGame()
                  }
                  className="rounded-xl bg-purple-500 px-5 py-3 text-xs font-black text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6 sm:text-sm"
                >

                  {newGameLoading
                    ? "Yeni oyuncu seçiliyor..."
                    : "⚽ Yeni Oyuncuyla Tekrar Oyna"}

                </button>

                <Link
                  href="/"
                  className="rounded-xl border border-white/15 px-5 py-3 text-xs font-black transition hover:bg-white/5 sm:px-6 sm:text-sm"
                >
                  Ana Sayfa
                </Link>

              </div>

            </div>
          )}

          {/* ===============================================
              LEGEND
          =============================================== */}

          <div className="mt-4 grid grid-cols-3 gap-1.5 text-center text-[10px] sm:mt-7 sm:gap-2 sm:text-xs">

            <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-2.5 sm:p-3">

              <div className="mx-auto mb-1.5 h-3 w-3 rounded bg-green-500 sm:mb-2 sm:h-4 sm:w-4" />

              <p className="text-slate-400">
                Doğru
              </p>

            </div>

            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-2.5 sm:p-3">

              <div className="mx-auto mb-1.5 h-3 w-3 rounded bg-red-500 sm:mb-2 sm:h-4 sm:w-4" />

              <p className="text-slate-400">
                Yanlış
              </p>

            </div>

            <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-2.5 sm:p-3">

              <p className="mb-0.5 text-base font-black text-amber-300 sm:mb-1 sm:text-lg">
                ↑ ↓
              </p>

              <p className="text-slate-400">
                Yaş yönü
              </p>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}

/* =========================================================
   MOBILE COMPARISON ITEM
========================================================= */

function MobileComparisonItem({
  icon,
  label,
  value,
  status,
  suffix = "",
}: {
  icon: string;
  label: string;
  value: string;
  status: ComparisonStatus;
  suffix?: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl border p-2.5 ${getComparisonClasses(
        status,
      )}`}
    >

      <div className="flex items-center gap-1.5">

        <span className="shrink-0 text-[11px]">
          {icon}
        </span>

        <span className="truncate text-[8px] font-black uppercase tracking-[0.1em] opacity-60">
          {label}
        </span>

      </div>

      <div className="mt-1.5 flex min-h-[22px] items-center gap-1">

        <p className="min-w-0 flex-1 truncate text-[11px] font-black leading-4">
          {value}
        </p>

        {suffix && (
          <span className="shrink-0 text-base font-black">
            {suffix}
          </span>
        )}

        {status ===
          "correct" && (
          <span className="shrink-0 text-[10px] font-black">
            ✓
          </span>
        )}

      </div>

    </div>
  );
}