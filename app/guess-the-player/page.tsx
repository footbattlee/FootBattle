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

  imageUrl:
    | string
    | null;
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

  targetPlayer?:
    | Player
    | null;
};

type ResultResponse = {
  ok?: boolean;

  error?: string;

  won?: boolean;

  score?: number;

  attemptCount?: number;

  alreadyRecorded?: boolean;

  targetPlayer?:
    | Player
    | null;

  currentStreak?:
    | number
    | null;

  bestStreak?:
    | number
    | null;

  totalScore?: number;

  gamesPlayed?: number;

  gamesWon?: number;
};

/* =========================================================
   HELPERS
========================================================= */

function getComparisonClasses(
  status: ComparisonStatus,
) {
  if (
    status ===
    "correct"
  ) {
    return "border-green-400/40 bg-green-500/20 text-green-200";
  }

  if (
    status ===
      "higher" ||
    status ===
      "lower"
  ) {
    return "border-amber-400/40 bg-amber-400/15 text-amber-200";
  }

  return "border-red-500/30 bg-red-500/15 text-red-200";
}

function getAgeDirection(
  status: ComparisonStatus,
) {
  if (
    status ===
    "higher"
  ) {
    return "↑";
  }

  if (
    status ===
    "lower"
  ) {
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
  /* =======================================================
     SESSION
  ======================================================= */

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

  /* =======================================================
     SEARCH
  ======================================================= */

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

  /* =======================================================
     GAME
  ======================================================= */

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

  /* =======================================================
     RESULT
  ======================================================= */

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

  /* =======================================================
     NEW GAME
  ======================================================= */

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
      gameStatus ===
        "won",
    );

  const guessedPlayerIds =
    useMemo(
      () =>
        new Set(
          guesses.map(
            (
              guess,
            ) =>
              guess.player.id,
          ),
        ),
      [
        guesses,
      ],
    );

  const visibleSearchResults =
    useMemo(
      () =>
        searchResults.filter(
          (
            player,
          ) =>
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
     RESET LOCAL STATE
  ======================================================= */

  const resetGameState =
    useCallback(() => {
      setSearchText("");

      setSearchResults(
        [],
      );

      setSelectedPlayer(
        null,
      );

      setSearchLoading(
        false,
      );

      setSearchError(
        "",
      );

      setGuesses(
        [],
      );

      setGameStatus(
        "playing",
      );

      setRevealedPlayer(
        null,
      );

      setSubmitting(
        false,
      );

      setResultSaved(
        false,
      );

      setResultLoading(
        false,
      );

      setResultSaveMessage(
        "",
      );

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

          setLoadingError(
            "",
          );

          resetGameState();

          const response =
            await fetch(
              "/api/guess-the-player/today",
              {
                method:
                  "GET",

                cache:
                  "no-store",
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
          setLoadingGame(
            false,
          );

          setNewGameLoading(
            false,
          );
        }
      },
      [
        resetGameState,
      ],
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
     SEARCH PLAYER

     3 HARFTEN SONRA
     API ARTIK %QUERY% ARIYOR.
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
      setSearchResults(
        [],
      );

      setSearchLoading(
        false,
      );

      setSearchError(
        "",
      );

      return;
    }

    const abortController =
      new AbortController();

    const timer =
      window.setTimeout(
        async () => {
          try {
            setSearchLoading(
              true,
            );

            setSearchError(
              "",
            );

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
              result.players ??
                [],
            );
          } catch (error) {
            if (
              error instanceof
                DOMException &&
              error.name ===
                "AbortError"
            ) {
              return;
            }

            console.error(
              "Oyuncu arama hatası:",
              error,
            );

            setSearchResults(
              [],
            );

            setSearchError(
              error instanceof Error
                ? error.message
                : "Oyuncular aranamadı.",
            );
          } finally {
            setSearchLoading(
              false,
            );
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

    setSearchResults(
      [],
    );

    setSearchError(
      "",
    );

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
      setResultLoading(
        true,
      );

      setResultSaveMessage(
        "Sonuç kaydediliyor...",
      );

      const response =
        await fetch(
          "/api/guess-the-player/result",
          {
            method:
              "POST",

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
                    (
                      guess,
                    ) =>
                      guess.player.id,
                  ),
              }),
          },
        );

      const result =
        (await response.json()) as ResultResponse;

      /* =================================================
         LOGIN YOK
      ================================================= */

      if (
        response.status ===
        401
      ) {
        setResultSaveMessage(
          "Puanını kaydetmek için giriş yapmalısın.",
        );

        return;
      }

      /* =================================================
         ERROR
      ================================================= */

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
            "Oyun sonucu kaydedilemedi.",
        );
      }

      setResultSaved(
        true,
      );

      /*
       * Kaybedince gizli oyuncu result
       * endpointinden geliyor.
       */
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
        setResultSaveMessage(
          "Bu oyunun sonucu daha önce kaydedilmiş.",
        );

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
} else {
  setResultSaveMessage(
    "Puanını kaydetmek için giriş yapabilirsin.",
  );
}
    } catch (error) {
      console.error(
        "Guess the Player sonuç kayıt hatası:",
        error,
      );

      setResultSaveMessage(
        error instanceof Error
          ? error.message
          : "Sonuç kaydedilirken hata oluştu.",
      );
    } finally {
      setResultLoading(
        false,
      );
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
      /*
       * Enter'a basılmış ve listede
       * tek sonuç varsa onu seçip
       * tahmine gönderebiliriz.
       */
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

      setSelectedPlayer(
        null,
      );

      setSearchText(
        "",
      );

      return;
    }

    try {
      setSubmitting(
        true,
      );

      setMessage(
        "👀 Footy: Tahminin kontrol ediliyor...",
      );

      const response =
        await fetch(
          "/api/guess-the-player/guess",
          {
            method:
              "POST",

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

      setSelectedPlayer(
        null,
      );

      setSearchText(
        "",
      );

      setSearchResults(
        [],
      );

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
  setGameStatus("lost");

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
      setSubmitting(
        false,
      );
    }
  }

  /* =======================================================
     NEW GAME BUTTON
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
      <main className="flex min-h-screen items-center justify-center bg-[#07111f] text-white">

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
      <main className="flex min-h-screen items-center justify-center bg-[#07111f] px-4 text-white">

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
    <main className="min-h-screen bg-[#07111f] px-4 py-6 text-white sm:px-6">

      <div className="mx-auto max-w-6xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="flex items-center justify-between border-b border-white/10 pb-5">

          <Link
            href="/"
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-400 transition hover:border-purple-400/40 hover:text-purple-300"
          >
            ← Ana Sayfa
          </Link>

          <div className="text-center">

            <p className="font-black">
              FootBattle
            </p>

            <p className="text-xs text-slate-500">
              Guess the Player
            </p>

          </div>

          <div className="rounded-xl border border-white/10 px-4 py-2 text-sm font-black">

            {guesses.length}
            /
            {maxAttempts}

          </div>

        </header>

        {/* =================================================
            GAME CARD
        ================================================= */}

        <section className="mt-7 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/30 sm:p-7">

          {/* ===============================================
              TITLE
          =============================================== */}

          <div className="text-center">

            <span className="inline-block rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-purple-300">
              SINIRSIZ MOD
            </span>

            <h1 className="mt-5 text-3xl font-black sm:text-4xl">
              Gizli Oyuncuyu Bul
            </h1>

            <p className="mt-2 text-sm text-slate-400 sm:text-base">
              Oyuncuları karşılaştır ve gizli futbolcuyu{" "}
              {maxAttempts} tahminde bul.
            </p>

            <p className="mt-2 text-xs font-semibold text-purple-300/70">
              Her yeni oyunda otomatik olarak farklı bir oyuncu seçilir.
            </p>

          </div>

          {/* ===============================================
              SEARCH
          =============================================== */}

          <div className="mx-auto mt-8 max-w-2xl">

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

                  setSelectedPlayer(
                    null,
                  );

                  setSearchError(
                    "",
                  );
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
                className="w-full rounded-2xl border border-white/10 bg-[#0c1929] px-5 py-4 pr-28 text-white outline-none transition placeholder:text-slate-600 focus:border-purple-400/60 disabled:cursor-not-allowed disabled:opacity-60"
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
                className="absolute bottom-2 right-2 top-2 rounded-xl bg-purple-500 px-5 text-sm font-black text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting
                  ? "Kontrol..."
                  : "Tahmin Et"}
              </button>

              {/* =============================================
                  SEARCH RESULTS
              ============================================= */}

              {searchText.trim()
                .length >=
                minimumSearchLength &&
                !selectedPlayer &&
                gameStatus ===
                  "playing" && (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-96 overflow-y-auto rounded-2xl border border-white/10 bg-[#0c1929] shadow-2xl shadow-black/50">

                    {searchLoading ? (
                      <p className="px-5 py-4 text-sm text-slate-500">
                        Oyuncular aranıyor...
                      </p>
                    ) : searchError ? (
                      <p className="px-5 py-4 text-sm text-red-300">
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
                            className="flex w-full items-center gap-4 border-b border-white/5 px-5 py-4 text-left transition last:border-b-0 hover:bg-white/5"
                          >

                            {player.imageUrl ? (
                              <img
                                src={
                                  player.imageUrl
                                }
                                alt={
                                  player.fullName
                                }
                                className="h-10 w-10 rounded-full bg-white/5 object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 font-black text-purple-300">
                                ?
                              </div>
                            )}

                            <div className="min-w-0 flex-1">

                              <p className="truncate font-bold">
                                {player.fullName}
                              </p>

                              <p className="mt-1 truncate text-xs text-slate-500">
                                {player.club}
                                {" · "}
                                {player.nationality}
                              </p>

                            </div>

                            <span className="text-sm font-semibold text-purple-300">
                              Seç
                            </span>

                          </button>
                        ),
                      )
                    ) : (
                      <p className="px-5 py-4 text-sm text-slate-500">
                        Bu aramayla eşleşen oyuncu bulunamadı.
                      </p>
                    )}

                  </div>
                )}

            </div>

            {/* SELECTED PLAYER */}

            {selectedPlayer && (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 py-3">

                <div>

                  <p className="text-xs font-black uppercase tracking-wider text-purple-300">
                    Seçilen Oyuncu
                  </p>

                  <p className="mt-1 font-black">
                    {selectedPlayer.fullName}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlayer(
                      null,
                    );

                    setSearchText(
                      "",
                    );
                  }}
                  className="rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-slate-400 transition hover:text-white"
                >
                  Değiştir
                </button>

              </div>
            )}

            <p className="mt-3 text-center text-xs text-slate-600">
              Adın veya soyadın herhangi bir yerinden 3 harf yazabilirsin.
              Örneğin{" "}
              <strong className="text-slate-500">
                nei
              </strong>{" "}
              → Wesley Sneijder.
            </p>

          </div>

          {/* ===============================================
              FOOTY
          =============================================== */}

          <div className="mt-7 rounded-2xl border border-white/10 bg-black/20 p-4 text-center">

            <p className="text-sm leading-6 text-slate-300">
              {message}
            </p>

          </div>

          {/* ===============================================
              COMPARISON TABLE
          =============================================== */}

          <div className="mt-8 overflow-x-auto">

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

                    /* =======================================
                       EMPTY ROW
                    ======================================= */

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

                        {/* PLAYER */}

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

                        {/* NATIONALITY */}

                        <div
                          className={`flex min-h-[70px] items-center justify-center rounded-xl border px-2 text-center text-sm font-semibold ${getComparisonClasses(
                            guess.comparison
                              .nationality,
                          )}`}
                        >
                          {guess.player.nationality}
                        </div>

                        {/* POSITION */}

                        <div
                          className={`flex min-h-[70px] items-center justify-center rounded-xl border px-2 text-center text-sm font-semibold ${getComparisonClasses(
                            guess.comparison
                              .position,
                          )}`}
                        >
                          {guess.player.position}
                        </div>

                        {/* CLUB */}

                        <div
                          className={`flex min-h-[70px] items-center justify-center rounded-xl border px-2 text-center text-sm font-semibold ${getComparisonClasses(
                            guess.comparison
                              .club,
                          )}`}
                        >
                          {guess.player.club}
                        </div>

                        {/* LEAGUE */}

                        <div
                          className={`flex min-h-[70px] items-center justify-center rounded-xl border px-2 text-center text-sm font-semibold ${getComparisonClasses(
                            guess.comparison
                              .league,
                          )}`}
                        >
                          {guess.player.league}
                        </div>

                        {/* AGE */}

                        <div
                          className={`flex min-h-[70px] items-center justify-center rounded-xl border px-2 text-center text-sm font-semibold ${getComparisonClasses(
                            guess.comparison
                              .age,
                          )}`}
                        >
                          <span>
                            {guess.player.age}
                            {" "}

                            <strong className="text-lg">
                              {getAgeDirection(
                                guess.comparison
                                  .age,
                              )}
                            </strong>
                          </span>
                        </div>

                        {/* FOOT */}

                        <div
                          className={`flex min-h-[70px] items-center justify-center rounded-xl border px-2 text-center text-sm font-semibold ${getComparisonClasses(
                            guess.comparison
                              .preferredFoot,
                          )}`}
                        >
                          {
                            guess.player
                              .preferredFoot
                          }
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
              className={`mt-7 rounded-2xl border p-6 text-center ${
                gameStatus ===
                "won"
                  ? "border-green-500/20 bg-green-500/10"
                  : "border-red-500/20 bg-red-500/10"
              }`}
            >

              <p className="text-4xl">
                {gameStatus ===
                "won"
                  ? "🏆"
                  : "😤"}
              </p>

              <p className="mt-3 text-xl font-black">
                {gameStatus ===
                "won"
                  ? "Tebrikler!"
                  : "Oyuncuyu bulamadın!"}
              </p>

              {/* TARGET PLAYER */}

              {gameStatus ===
                "lost" &&
                resultLoading && (
                  <p className="mt-4 text-sm text-slate-400">
                    Gizli oyuncu yükleniyor...
                  </p>
                )}

              {revealedPlayer && (
                <div className="mx-auto mt-4 max-w-sm rounded-xl border border-white/10 bg-black/20 p-4">

                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Gizli Oyuncu
                  </p>

                  <div className="mt-3 flex items-center justify-center gap-3">

                    {revealedPlayer.imageUrl && (
                      <img
                        src={
                          revealedPlayer.imageUrl
                        }
                        alt={
                          revealedPlayer.fullName
                        }
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    )}

                    <div className="text-left">

                      <p className="text-lg font-black text-white">
                        {revealedPlayer.fullName}
                      </p>

                      <p className="text-xs text-slate-500">
                        {revealedPlayer.club}
                      </p>

                    </div>

                  </div>

                </div>
              )}

              <p
                className={`mt-4 text-3xl font-black ${
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
                  className={`mt-3 text-sm font-semibold ${
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

              {/* ACTIONS */}

              <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">

                <button
                  type="button"
                  disabled={
                    newGameLoading ||
                    resultLoading
                  }
                  onClick={() =>
                    void handleNewGame()
                  }
                  className="rounded-xl bg-purple-500 px-6 py-3 text-sm font-black text-white transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {newGameLoading
                    ? "Yeni oyuncu seçiliyor..."
                    : "⚽ Yeni Oyuncuyla Tekrar Oyna"}
                </button>

                <Link
                  href="/"
                  className="rounded-xl border border-white/15 px-6 py-3 text-sm font-black transition hover:bg-white/5"
                >
                  Ana Sayfa
                </Link>

              </div>

            </div>
          )}

          {/* ===============================================
              LEGEND
          =============================================== */}

          <div className="mt-7 grid grid-cols-3 gap-2 text-center text-xs">

            <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3">

              <div className="mx-auto mb-2 h-4 w-4 rounded bg-green-500" />

              <p className="text-slate-400">
                Doğru
              </p>

            </div>

            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3">

              <div className="mx-auto mb-2 h-4 w-4 rounded bg-red-500" />

              <p className="text-slate-400">
                Yanlış
              </p>

            </div>

            <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">

              <p className="mb-1 text-lg font-black text-amber-300">
                ↑ ↓
              </p>

              <p className="text-slate-400">
                Hedef yaş yönü
              </p>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}