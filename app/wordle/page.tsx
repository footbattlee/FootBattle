"use client";

import {
  GAME_NAMES,
  trackGameStarted,
  trackGameCompleted,
  trackPlayAgain,
  trackShared,
} from "@/lib/analytics/game-analytics";


import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const DEFAULT_MAX_ATTEMPTS = 5;

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  [
    "ENTER",
    "Z",
    "X",
    "C",
    "V",
    "B",
    "N",
    "M",
    "DELETE",
  ],
];

/* =========================================================
   TYPES
========================================================= */

type LetterStatus =
  | "correct"
  | "present"
  | "absent"
  | "empty";

type GameStatus =
  | "playing"
  | "won"
  | "lost";

type EvaluatedLetter = {
  letter: string;

  status: Exclude<
    LetterStatus,
    "empty"
  >;
};

type EvaluatedGuess = {
  guess: string;

  evaluation:
    EvaluatedLetter[];
};

type WordleGame = {
  sessionId: string;

  letterCount: number;

  maxAttempts: number;

  daily: boolean;
};

type NewGameResponse = {
  ok?: boolean;

  error?: string;

  mode?:
    | "daily"
    | "random";

  daily?: boolean;

  sessionId?: string;

  letterCount?: number;

  maxAttempts?: number;
};

type GuessResponse = {
  ok?: boolean;

  error?: string;

  guess?: string;

  evaluation?: EvaluatedLetter[];

  won?: boolean;
};


type DailyChallengeNextGame = {
  code: string;
  label: string;
  href: string;
};

type DailyChallengeUpdateResponse = {
  ok?: boolean;
  error?: string;

  started?: boolean;
  alreadyAttempted?: boolean;
  alreadyCompleted?: boolean;

  nextGame?:
    | DailyChallengeNextGame
    | null;

  challengeCompleted?: boolean;
  perfectCompleted?: boolean;
  rewardAdded?: number;
};

type SaveResultResponse = {
  ok?: boolean;

  error?: string;

  won?: boolean;

  score?: number;

  attemptCount?: number;

  alreadyRecorded?: boolean;

  answerPlayerName?:
    | string
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
   SCORE
========================================================= */

function calculateScore(
  attemptCount: number,
  won: boolean,
) {
  if (!won) {
    return 0;
  }

  const scoreTable = [
    250,
    200,
    150,
    100,
    50,
  ];

  return (
    scoreTable[
      attemptCount - 1
    ] ?? 0
  );
}

/* =========================================================
   TILE CLASSES
========================================================= */

function getTileClasses(
  status: LetterStatus,
) {
  if (
    status === "correct"
  ) {
    return "border-green-400 bg-green-500 text-[#07111f]";
  }

  if (
    status === "present"
  ) {
    return "border-amber-400 bg-amber-400 text-[#07111f]";
  }

  if (
    status === "absent"
  ) {
    return "border-slate-600 bg-slate-700 text-white";
  }

  return "border-white/15 bg-[#0c1929] text-white";
}

/* =========================================================
   KEYBOARD CLASSES
========================================================= */

function getKeyboardClasses(
  status?: LetterStatus,
) {
  if (
    status === "correct"
  ) {
    return "border-green-400 bg-green-500 text-[#07111f]";
  }

  if (
    status === "present"
  ) {
    return "border-amber-400 bg-amber-400 text-[#07111f]";
  }

  if (
    status === "absent"
  ) {
    return "border-slate-700 bg-slate-800 text-slate-500";
  }

  return "border-white/10 bg-white/10 text-white hover:bg-white/20";
}

/* =========================================================
   SHARE SYMBOL
========================================================= */

function getShareSymbol(
  status: LetterStatus,
) {
  if (
    status === "correct"
  ) {
    return "🟩";
  }

  if (
    status === "present"
  ) {
    return "🟨";
  }

  return "⬛";
}

/* =========================================================
   NORMALIZE KEYBOARD
========================================================= */

function normalizeKeyboardLetter(
  value: string,
) {
  return value
    .toLocaleUpperCase(
      "tr-TR",
    )
    .replace(/İ/g, "I")
    .replace(/Ç/g, "C")
    .replace(/Ğ/g, "G")
    .replace(/Ö/g, "O")
    .replace(/Ş/g, "S")
    .replace(/Ü/g, "U");
}

async function markWordleDailyChallenge(): Promise<
  DailyChallengeUpdateResponse | null
> {
  try {
    const response =
      await fetch(
        "/api/daily-challenge",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              game:
                "wordle",
            }),
        },
      );

    if (
      response.status ===
      401
    ) {
      return null;
    }

    const result =
      (await response
        .json()
        .catch(
          () =>
            null,
        )) as DailyChallengeUpdateResponse | null;

    if (
      !response.ok ||
      !result?.ok
    ) {
      console.error(
        "Wordle daily challenge update error:",
        result,
      );

      return null;
    }

    return result;
  } catch (error) {
    console.error(
      "Wordle daily challenge request error:",
      error,
    );

    return null;
  }
}


async function startWordleDailyChallenge(): Promise<
  DailyChallengeUpdateResponse
> {
  const response =
    await fetch(
      "/api/daily-challenge",
      {
        method:
          "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            game:
              "wordle",

            action:
              "start",
          }),
      },
    );

  const result =
    (await response
      .json()
      .catch(
        () =>
          null,
      )) as DailyChallengeUpdateResponse | null;

  if (
    !response.ok ||
    !result?.ok
  ) {
    throw new Error(
      result?.error ??
        "Günlük görev hakkı başlatılamadı.",
    );
  }

  return result;
}

/* =========================================================
   PAGE
========================================================= */

export default function WordlePage() {
  /* =======================================================
     GAME
  ======================================================= */

  const [
    game,
    setGame,
  ] =
    useState<WordleGame | null>(
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
     GAME STATE
  ======================================================= */

  const [
    evaluatedGuesses,
    setEvaluatedGuesses,
  ] =
    useState<
      EvaluatedGuess[]
    >([]);

  const [
    currentGuess,
    setCurrentGuess,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState(
      "😏 Footy: İlk tahminini görelim bakalım.",
    );

  const [
    gameStatus,
    setGameStatus,
  ] =
    useState<GameStatus>(
      "playing",
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
    resultSaveMessage,
    setResultSaveMessage,
  ] =
    useState("");

  const [
    answerPlayerName,
    setAnswerPlayerName,
  ] =
    useState<string | null>(
      null,
    );

  const [
    resultLoading,
    setResultLoading,
  ] =
    useState(false);

  const [
    shareMessage,
    setShareMessage,
  ] =
    useState("");

  const [
    dailyChallengeCompleted,
    setDailyChallengeCompleted,
  ] =
    useState(false);

  /* =======================================================
     COMPUTED
  ======================================================= */

  const score =
    calculateScore(
      evaluatedGuesses.length,
      gameStatus ===
        "won",
    );

  /* =======================================================
     RESET LOCAL GAME
  ======================================================= */

  const resetLocalGame =
    useCallback(() => {
      setEvaluatedGuesses(
        [],
      );

      setCurrentGuess(
        "",
      );

      setGameStatus(
        "playing",
      );

      setMessage(
        "⚽ Footy: Yeni oyuncu hazır. Göster kendini.",
      );

      setResultSaved(
        false,
      );

      setResultSaveMessage(
        "",
      );

      setAnswerPlayerName(
        null,
      );

      setResultLoading(
        false,
      );

      setShareMessage(
        "",
      );

      setDailyChallengeCompleted(
        false,
      );
    }, []);

  /* =======================================================
     START NEW GAME
  ======================================================= */

  const startNewGame =
    useCallback(
      async (
        initial =
          false,
      ) => {
        try {
          setLoadingGame(
            true,
          );

          setLoadingError(
            "",
          );

          if (!initial) {
            resetLocalGame();
          }

          const dailyMode =
            initial &&
            typeof window !==
              "undefined" &&
            new URLSearchParams(
              window.location.search,
            ).get(
              "daily",
            ) === "1";

          const response =
            await fetch(
              dailyMode
                ? "/api/wordle/today?daily=1"
                : "/api/wordle/today",
              {
                method:
                  "GET",

                cache:
                  "no-store",
              },
            );

          const result =
            (await response.json()) as NewGameResponse;

          if (
            !response.ok ||
            !result.ok
          ) {
            throw new Error(
              result.error ??
                "Yeni Wordle oyunu hazırlanamadı.",
            );
          }

          if (
            !result.sessionId ||
            typeof result.letterCount !==
              "number"
          ) {
            throw new Error(
              "Wordle oturum bilgileri eksik geldi.",
            );
          }

          setGame({
            sessionId:
              result.sessionId,

            letterCount:
              result.letterCount,

            maxAttempts:
              result.maxAttempts ??
              DEFAULT_MAX_ATTEMPTS,

            daily:
              Boolean(
                result.daily ??
                  dailyMode,
              ),
          });

          void trackGameStarted(
            GAME_NAMES.WORDLE,
            result.sessionId,
          );

          setEvaluatedGuesses(
            [],
          );

          setCurrentGuess(
            "",
          );

          setGameStatus(
            "playing",
          );

          setMessage(
            initial
              ? "😏 Footy: İlk tahminini görelim bakalım."
              : "⚽ Footy: Yeni oyuncu hazır. Göster kendini.",
          );

          setResultSaved(
            false,
          );

          setResultSaveMessage(
            "",
          );

          setAnswerPlayerName(
            null,
          );

          setResultLoading(
            false,
          );

          setShareMessage(
            "",
          );
        } catch (error) {
          console.error(
            "Wordle yükleme hatası:",
            error,
          );

          setGame(
            null,
          );

          setLoadingError(
            error instanceof Error
              ? error.message
              : "Yeni Wordle oyunu hazırlanamadı.",
          );
        } finally {
          setLoadingGame(
            false,
          );
        }
      },
      [
        resetLocalGame,
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
     KEYBOARD STATUSES
  ======================================================= */

  const keyboardStatuses =
    useMemo(() => {
      const statusMap:
        Record<
          string,
          LetterStatus
        > = {};

      evaluatedGuesses.forEach(
        (
          evaluatedGuess,
        ) => {
          evaluatedGuess.evaluation.forEach(
            ({
              letter,
              status,
            }) => {
              const oldStatus =
                statusMap[
                  letter
                ];

              if (
                status ===
                "correct"
              ) {
                statusMap[
                  letter
                ] =
                  "correct";

                return;
              }

              if (
                status ===
                  "present" &&
                oldStatus !==
                  "correct"
              ) {
                statusMap[
                  letter
                ] =
                  "present";

                return;
              }

              if (!oldStatus) {
                statusMap[
                  letter
                ] =
                  "absent";
              }
            },
          );
        },
      );

      return statusMap;
    }, [
      evaluatedGuesses,
    ]);

  /* =======================================================
     SAVE RESULT
  ======================================================= */

  const saveGameResult =
    useCallback(
      async (
        completedGuesses:
          string[],

        status:
          | "won"
          | "lost",
      ) => {
        if (
          resultSaved ||
          !game
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
              "/api/wordle/result",
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
                      game.sessionId,

                    guesses:
                      completedGuesses,
                  }),
              },
            );

          const result =
            (await response.json()) as SaveResultResponse;

          /*
           * Doğru cevabı auth kontrolünden ÖNCE al.
           *
           * Misafir kullanıcıda /result 401 dönebilir.
           * Ancak API cevap oyuncusunu response içinde
           * gönderiyorsa kullanıcı yine de doğru cevabı
           * görebilmeli.
           */
          if (
            result.answerPlayerName
          ) {
            setAnswerPlayerName(
              result.answerPlayerName,
            );
          }

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
                "Oyun sonucu kaydedilemedi.",
            );
          }

          setAnswerPlayerName(
            result.answerPlayerName ??
              null,
          );

          setResultSaved(
            true,
          );

          if (
            result.alreadyRecorded
          ) {
            setResultSaveMessage(
              "Bu oyunun sonucu zaten kaydedilmiş.",
            );

            return;
          }

          if (
            status ===
              "won" &&
            game.daily
          ) {
            const dailyResult =
              await markWordleDailyChallenge();

            if (
              dailyResult
            ) {
              setDailyChallengeCompleted(
                true,
              );
            }
          }

          void trackGameCompleted(
            GAME_NAMES.WORDLE,
            game.sessionId,
            {
              won:
                status ===
                "won",

              score:
                result.score ??
                0,

              attemptCount:
                result.attemptCount ??
                completedGuesses.length,
            },
          );

          setResultSaveMessage(
            status ===
              "won"
              ? `${result.score ?? 0} puan hesabına eklendi. 🔥`
              : "Oyun sonucun kaydedildi.",
          );
        } catch (error) {
          console.error(
            "Sonuç kaydetme hatası:",
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
      },
      [
        game,
        resultSaved,
      ],
    );

  /* =======================================================
     SUBMIT GUESS
  ======================================================= */

  const submitGuess =
    useCallback(
      async () => {
        if (
          !game ||
          gameStatus !==
            "playing" ||
          submitting
        ) {
          return;
        }

        if (
          currentGuess.length !==
          game.letterCount
        ) {
          setMessage(
            `😏 Footy: ${game.letterCount} harf lazım. Saymayı tekrar mı çalışsak?`,
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
              "/api/wordle/guess",
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
                      game.sessionId,

                    guess:
                      currentGuess,
                  }),
              },
            );

          const result =
            (await response.json()) as GuessResponse;

          if (
            !response.ok ||
            !result.ok ||
            !result.guess ||
            !Array.isArray(
              result.evaluation,
            )
          ) {
            throw new Error(
              result.error ??
                "Tahmin kontrol edilemedi.",
            );
          }

          const evaluatedGuess:
            EvaluatedGuess =
            {
              guess:
                result.guess,

              evaluation:
                result.evaluation,
            };

          const nextEvaluatedGuesses =
            [
              ...evaluatedGuesses,
              evaluatedGuess,
            ];

          const nextGuesses =
            nextEvaluatedGuesses.map(
              (
                item,
              ) =>
                item.guess,
            );

          setEvaluatedGuesses(
            nextEvaluatedGuesses,
          );

          setCurrentGuess(
            "",
          );

          if (
            result.won
          ) {
            setGameStatus(
              "won",
            );

            if (
              nextEvaluatedGuesses.length ===
              1
            ) {
              setMessage(
                "🤯 Footy: İlk tahminde mi? Tamam, buna saygı duydum.",
              );
            } else if (
              nextEvaluatedGuesses.length <=
              3
            ) {
              setMessage(
                "😎 Footy: Fena değilsin. Çok da havaya girme.",
              );
            } else {
              setMessage(
                "😏 Footy: Son anda kurtardın. Yine de sayıyorum.",
              );
            }

            void saveGameResult(
              nextGuesses,
              "won",
            );

            return;
          }

          if (
            nextEvaluatedGuesses.length >=
            game.maxAttempts
          ) {
            setGameStatus(
              "lost",
            );

            setMessage(
              "😂 Footy: Bu oyuncu seni ters köşe yaptı. Cevabı aşağıda görelim.",
            );

            void saveGameResult(
              nextGuesses,
              "lost",
            );

            return;
          }

          const remainingAttempts =
            game.maxAttempts -
            nextEvaluatedGuesses.length;

          setMessage(
            `👀 Footy: Olmadı. ${remainingAttempts} hakkın kaldı, toparlan.`,
          );
        } catch (error) {
          console.error(
            "Tahmin gönderme hatası:",
            error,
          );

          setMessage(
            error instanceof Error
              ? `⚠️ Footy: ${error.message}`
              : "⚠️ Footy: Tahmin kontrol edilirken hata oluştu.",
          );
        } finally {
          setSubmitting(
            false,
          );
        }
      },
      [
        currentGuess,
        evaluatedGuesses,
        game,
        gameStatus,
        saveGameResult,
        submitting,
      ],
    );

  /* =======================================================
     HANDLE KEY
  ======================================================= */

  const handleKey =
    useCallback(
      (
        key: string,
      ) => {
        if (
          !game ||
          gameStatus !==
            "playing" ||
          submitting
        ) {
          return;
        }

        if (
          key ===
          "ENTER"
        ) {
          void submitGuess();

          return;
        }

        if (
          key ===
            "DELETE" ||
          key ===
            "BACKSPACE"
        ) {
          setCurrentGuess(
            (previous) =>
              previous.slice(
                0,
                -1,
              ),
          );

          return;
        }

        if (
          /^[A-Z]$/.test(
            key,
          )
        ) {
          setCurrentGuess(
            (previous) => {
              if (
                previous.length >=
                game.letterCount
              ) {
                return previous;
              }

              return (
                previous +
                key
              );
            },
          );
        }
      },
      [
        game,
        gameStatus,
        submitGuess,
        submitting,
      ],
    );

  /* =======================================================
     PHYSICAL KEYBOARD
  ======================================================= */

  useEffect(() => {
    function handlePhysicalKeyboard(
      event: KeyboardEvent,
    ) {
      const key =
        normalizeKeyboardLetter(
          event.key,
        );

      if (
        key ===
        "ENTER"
      ) {
        event.preventDefault();

        handleKey(
          "ENTER",
        );

        return;
      }

      if (
        key ===
        "BACKSPACE"
      ) {
        event.preventDefault();

        handleKey(
          "BACKSPACE",
        );

        return;
      }

      if (
        /^[A-Z]$/.test(
          key,
        )
      ) {
        handleKey(
          key,
        );
      }
    }

    window.addEventListener(
      "keydown",
      handlePhysicalKeyboard,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handlePhysicalKeyboard,
      );
    };
  }, [
    handleKey,
  ]);

  /* =======================================================
     SHARE RESULT
  ======================================================= */

  async function shareResult() {
    if (
      !game ||
      gameStatus ===
        "playing"
    ) {
      return;
    }

    const resultRows =
      evaluatedGuesses
        .map(
          (
            row,
          ) =>
            row.evaluation
              .map(
                ({
                  status,
                }) =>
                  getShareSymbol(
                    status,
                  ),
              )
              .join(
                "",
              ),
        )
        .join(
          "\n",
        );

    const resultText =
      [
        "FootBattle Wordle ⚽",

        gameStatus ===
        "won"
          ? `${evaluatedGuesses.length}/${game.maxAttempts} — ${score} puan`
          : `X/${game.maxAttempts} — 0 puan`,

        "",

        resultRows,

        "",

        "Futbol bilgini konuşma, göster.",
      ].join(
        "\n",
      );

    try {
      await navigator.clipboard.writeText(
        resultText,
      );

      void trackShared(
        GAME_NAMES.WORDLE,
        game.sessionId,
      );

      setShareMessage(
        "Sonuç panoya kopyalandı! ✅",
      );
    } catch {
      setShareMessage(
        "Sonuç kopyalanamadı. Tarayıcı iznini kontrol et.",
      );
    }

    window.setTimeout(
      () => {
        setShareMessage(
          "",
        );
      },
      3000,
    );
  }

  /* =======================================================
     NEW GAME
  ======================================================= */

  async function handleNewGame() {
    if (
      loadingGame ||
      submitting
    ) {
      return;
    }

    void trackPlayAgain(
      GAME_NAMES.WORDLE,
      game?.sessionId ??
        null,
    );

    await startNewGame(
      false,
    );
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loadingGame &&
    !game
  ) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#07111f] text-white">

        <div className="text-center">

          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-white/10 border-t-green-500" />

          <p className="mt-3 text-sm text-slate-400">
            Yeni oyuncu seçiliyor...
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
    !game
  ) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-[#07111f] px-4 text-white">

        <div className="w-full max-w-sm rounded-[22px] border border-red-500/20 bg-red-500/10 p-6 text-center">

          <p className="text-lg font-black">
            Oyun yüklenemedi
          </p>

          <p className="mt-2 text-sm text-red-200">
            {loadingError ||
              "Yeni Wordle oyunu hazırlanamadı."}
          </p>

          <button
            type="button"
            onClick={() =>
              void startNewGame(
                true,
              )
            }
            className="mt-4 rounded-xl bg-white px-5 py-2.5 text-sm font-black text-[#07111f]"
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
    <main className="min-h-[100dvh] bg-[#07111f] pb-[calc(20px+env(safe-area-inset-bottom))] text-white">

      <div className="mx-auto w-full max-w-[1120px] px-3 sm:px-6">

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="grid min-h-[58px] grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-white/10 sm:min-h-[68px] sm:gap-4">

          <div className="flex justify-start">

            <Link
              href="/"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:border-green-400/40 hover:text-green-400 sm:px-4 sm:text-sm"
            >
              ← Ana Sayfa
            </Link>

          </div>

          <div className="text-center">

            <p className="text-sm font-black sm:text-base">
              FootBattle
            </p>

            <p className="text-[10px] text-slate-500 sm:text-[11px]">
              Wordle
            </p>

          </div>

          <div className="flex justify-end">

            <div className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black sm:px-4 sm:text-sm">
              {evaluatedGuesses.length}
              /
              {game.maxAttempts}
            </div>

          </div>

        </header>

        {/* =================================================
            GAME AREA
        ================================================= */}

        <div className="py-3 sm:py-8">

          <section className="mx-auto w-full max-w-[760px] rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-4 shadow-2xl shadow-black/20 sm:rounded-[22px] sm:px-6 sm:py-6">

            {/* ===============================================
                TITLE
            =============================================== */}

            <div className="text-center">

              <span className="inline-block rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.15em] text-green-400 sm:px-4 sm:py-1.5 sm:text-[11px]">
                {game.daily
                  ? "GÜNLÜK GÖREV"
                  : "SINIRSIZ MOD"}
              </span>

              <h1 className="mt-2.5 text-2xl font-black leading-tight sm:mt-4 sm:text-[34px]">
                Oyuncuyu Bul
              </h1>

              <p className="mt-1 text-xs text-slate-400 sm:mt-1.5 sm:text-sm">
                Oyuncunun soyadını{" "}
                {game.maxAttempts} tahminde bul.
              </p>

              <div className="mt-2 flex items-center justify-center gap-2 text-[10px] sm:mt-2 sm:text-[11px]">

                <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 font-bold text-slate-400">
                  {game.letterCount} harf
                </span>

                <span className="rounded-full border border-green-500/20 bg-green-500/[0.07] px-2.5 py-1 font-bold text-green-400/80">
                  Sınırsız oyun
                </span>

              </div>

            </div>

            {/* ===============================================
                BOARD
            =============================================== */}

            <div className="mt-4 space-y-1.5 sm:mt-6 sm:space-y-2">

              {Array.from({
                length:
                  game.maxAttempts,
              }).map(
                (
                  _,
                  rowIndex,
                ) => {
                  const submittedGuess =
                    evaluatedGuesses[
                      rowIndex
                    ];

                  const activeRow =
                    rowIndex ===
                      evaluatedGuesses.length &&
                    gameStatus ===
                      "playing";

                  return (
                    <div
                      key={
                        rowIndex
                      }
                      className="flex justify-center gap-1 sm:gap-1.5"
                    >

                      {Array.from({
                        length:
                          game.letterCount,
                      }).map(
                        (
                          _,
                          letterIndex,
                        ) => {
                          const evaluatedLetter =
                            submittedGuess
                              ?.evaluation[
                              letterIndex
                            ];

                          const activeLetter =
                            activeRow
                              ? currentGuess[
                                  letterIndex
                                ] ??
                                ""
                              : "";

                          const displayedLetter =
                            evaluatedLetter
                              ?.letter ??
                            activeLetter;

                          const status:
                            LetterStatus =
                            evaluatedLetter
                              ?.status ??
                            "empty";

                          return (
                            <div
                              key={
                                letterIndex
                              }
                              className={`flex h-[44px] w-[39px] items-center justify-center rounded-lg border text-base font-black transition-all duration-300 sm:h-[52px] sm:w-[46px] sm:rounded-[10px] sm:text-xl ${getTileClasses(
                                status,
                              )} ${
                                activeLetter
                                  ? "scale-[1.04] border-green-400/50"
                                  : ""
                              }`}
                            >
                              {displayedLetter}
                            </div>
                          );
                        },
                      )}

                    </div>
                  );
                },
              )}

            </div>

            {/* ===============================================
                FOOTY MESSAGE
            =============================================== */}

            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-center sm:mt-5 sm:px-4 sm:py-3">

              <p className="text-xs leading-5 text-slate-300 sm:text-sm">
                {message}
              </p>

            </div>

            {/* ===============================================
                KEYBOARD
            =============================================== */}

            <div className="mt-3 space-y-1 sm:mt-5 sm:space-y-1.5">

              {KEYBOARD_ROWS.map(
                (
                  row,
                  rowIndex,
                ) => (
                  <div
                    key={
                      rowIndex
                    }
                    className="flex justify-center gap-[3px] sm:gap-1"
                  >

                    {row.map(
                      (
                        key,
                      ) => {
                        const isSpecialKey =
                          key ===
                            "ENTER" ||
                          key ===
                            "DELETE";

                        return (
                          <button
                            key={
                              key
                            }
                            type="button"
                            onClick={() =>
                              handleKey(
                                key,
                              )
                            }
                            disabled={
                              gameStatus !==
                                "playing" ||
                              submitting
                            }
                            className={`flex h-9 items-center justify-center rounded-md border text-[9px] font-black transition sm:h-11 sm:rounded-lg sm:text-xs ${
                              isSpecialKey
                                ? "min-w-[48px] px-1.5 sm:min-w-[70px] sm:px-2"
                                : "w-[27px] sm:w-9"
                            } ${getKeyboardClasses(
                              keyboardStatuses[
                                key
                              ],
                            )} disabled:cursor-not-allowed disabled:opacity-60`}
                          >
                            {key ===
                            "DELETE"
                              ? "⌫"
                              : key ===
                                  "ENTER"
                                ? "✓"
                                : key}
                          </button>
                        );
                      },
                    )}

                  </div>
                ),
              )}

            </div>

            {/* ===============================================
                SUBMIT BUTTON
            =============================================== */}

            {gameStatus ===
              "playing" && (
              <button
                type="button"
                onClick={() =>
                  handleKey(
                    "ENTER",
                  )
                }
                disabled={
                  submitting ||
                  currentGuess.length !==
                    game.letterCount
                }
                className="mt-3 flex h-11 w-full items-center justify-center rounded-xl border border-green-400/30 bg-green-500 text-xs font-black text-[#07111f] transition hover:bg-green-400 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-slate-500 sm:mt-4 sm:h-12 sm:text-sm"
              >
                {submitting
                  ? "Kontrol Ediliyor..."
                  : currentGuess.length ===
                      game.letterCount
                    ? "✓ KONTROL ET"
                    : `${currentGuess.length}/${game.letterCount} HARF`}
              </button>
            )}

            {/* ===============================================
                MOBILE COLOR LEGEND
            =============================================== */}

            {gameStatus ===
              "playing" && (
              <div className="mt-3 grid grid-cols-3 gap-1.5 text-center text-[9px] sm:hidden">

                <MiniLegend
                  tone="green"
                  label="Doğru"
                />

                <MiniLegend
                  tone="amber"
                  label="Yanlış yer"
                />

                <MiniLegend
                  tone="slate"
                  label="Yok"
                />

              </div>
            )}

            {/* ===============================================
                RESULT
            =============================================== */}

            {gameStatus !==
              "playing" && (
              <div
                className={`mt-4 rounded-2xl border p-4 text-center sm:mt-5 sm:p-5 ${
                  gameStatus ===
                  "won"
                    ? "border-green-500/20 bg-green-500/10"
                    : "border-red-500/20 bg-red-500/[0.07]"
                }`}
              >

                <p className="text-3xl">
                  {gameStatus ===
                  "won"
                    ? "🏆"
                    : "😤"}
                </p>

                <p className="mt-2 text-lg font-black">
                  {gameStatus ===
                  "won"
                    ? "Tebrikler!"
                    : "Oyuncuyu bulamadın!"}
                </p>

                {gameStatus ===
                  "won" && (
                  <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                    {
                      evaluatedGuesses.length
                    }{" "}
                    tahminde bildin.
                  </p>
                )}

                {gameStatus ===
                  "lost" && (
                  <div className="mt-3">

                    {resultLoading ? (
                      <p className="text-xs text-slate-500 sm:text-sm">
                        Doğru oyuncu yükleniyor...
                      </p>
                    ) : answerPlayerName ? (
                      <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">

                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:text-xs">
                          Doğru Oyuncu
                        </p>

                        <p className="mt-1 text-lg font-black text-white sm:text-xl">
                          {answerPlayerName}
                        </p>

                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 sm:text-sm">
                        Doğru oyuncu bilgisi alınamadı.
                      </p>
                    )}

                  </div>
                )}

                <p className="mt-3 text-2xl font-black text-green-400">
                  {score} puan
                </p>

                {resultSaveMessage && (
                  <p
                    className={`mt-2 text-xs font-semibold sm:text-sm ${
                      resultSaveMessage.includes(
                        "hata",
                      ) ||
                      resultSaveMessage.includes(
                        "giriş",
                      )
                        ? "text-amber-300"
                        : "text-green-400"
                    }`}
                  >
                    {resultSaveMessage}
                  </p>
                )}

                {game.daily &&
                  gameStatus ===
                    "won" &&
                  dailyChallengeCompleted && (
                    <div className="mx-auto mt-4 max-w-lg rounded-2xl border border-green-500/25 bg-green-500/[0.08] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-green-300">
                        🏆 Günlük Görev Tamamlandı
                      </p>

                      <p className="mt-2 text-sm font-bold text-slate-200">
                        Bugünün FootBattle görevlerini tamamladın.
                      </p>
                    </div>
                  )}

                <div className="mt-4 flex flex-col justify-center gap-2 sm:mt-5 sm:flex-row">

                  {!game.daily && (
                    <button
                      type="button"
                      disabled={
                        loadingGame ||
                        resultLoading
                      }
                      onClick={() =>
                        void handleNewGame()
                      }
                      className="rounded-xl bg-green-500 px-5 py-3 text-xs font-black text-[#07111f] transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                    >
                      {loadingGame
                        ? "Yeni oyuncu seçiliyor..."
                        : "⚽ Yeni Oyuncuyla Tekrar Oyna"}
                    </button>
                  )}

                  {game.daily &&
                    gameStatus ===
                      "lost" && (
                      <Link
                        href="/"
                        className="rounded-xl bg-slate-700 px-5 py-3 text-xs font-black text-white transition hover:bg-slate-600 sm:text-sm"
                      >
                        Günlük Görev Bitti → Ana Sayfa
                      </Link>
                    )}

                  <button
                    type="button"
                    onClick={
                      shareResult
                    }
                    className="rounded-xl border border-white/15 px-5 py-3 text-xs font-black transition hover:border-white/30 hover:bg-white/5 sm:text-sm"
                  >
                    Sonucu Paylaş
                  </button>

                  <Link
                    href="/"
                    className="rounded-xl border border-white/15 px-5 py-3 text-xs font-semibold transition hover:border-white/30 hover:bg-white/5 sm:text-sm"
                  >
                    {game.daily
                      ? "Ana Sayfaya Dön"
                      : "Ana Sayfa"}
                  </Link>

                </div>

                {shareMessage && (
                  <p className="mt-3 text-xs font-semibold text-green-400 sm:text-sm">
                    {shareMessage}
                  </p>
                )}

              </div>
            )}

            {/* ===============================================
                DESKTOP COLOR INFO
            =============================================== */}

            <div className="mt-5 hidden grid-cols-3 gap-2 text-center text-[11px] sm:grid">

              <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-2 py-2.5">

                <div className="mx-auto mb-1.5 h-3.5 w-3.5 rounded bg-green-500" />

                <p className="text-slate-400">
                  Doğru yer
                </p>

              </div>

              <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-2 py-2.5">

                <div className="mx-auto mb-1.5 h-3.5 w-3.5 rounded bg-amber-400" />

                <p className="text-slate-400">
                  Yanlış yer
                </p>

              </div>

              <div className="rounded-xl border border-slate-600/30 bg-slate-700/20 px-2 py-2.5">

                <div className="mx-auto mb-1.5 h-3.5 w-3.5 rounded bg-slate-700" />

                <p className="text-slate-400">
                  Yok
                </p>

              </div>

            </div>
{/* SEO CONTENT */}

<section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left">

  <h2 className="text-xl font-black text-white">
    Futbol Wordle Oyunu
  </h2>

  <p className="mt-3 text-sm text-slate-300">
    FootBattle Wordle oyununda futbolcuların soyadlarını
    tahmin etmeye çalışırsın. Her tahminden sonra doğru
    harfler ve doğru konumlar renklerle gösterilir.
  </p>

  <h3 className="mt-5 text-lg font-bold text-white">
    Football Wordle
  </h3>

  <p className="mt-2 text-sm text-slate-400">
    Football Wordle is a soccer player guessing game where
    you try to find the hidden footballer's surname using
    letter clues and color hints.
  </p>

  <h3 className="mt-5 text-lg font-bold text-white">
    Nasıl Oynanır?
  </h3>

  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-400">
    <li>Oyuncunun soyadını tahmin et.</li>
    <li>Yeşil harf doğru yerde demektir.</li>
    <li>Sarı harf kelimede vardır ama yeri yanlıştır.</li>
    <li>Gri harf cevapta bulunmaz.</li>
    <li>En az tahminle doğru cevaba ulaşmaya çalış.</li>
  </ul>

</section>
          </section>

        </div>

      </div>

    </main>
  );
}

/* =========================================================
   MINI LEGEND
========================================================= */

function MiniLegend({
  tone,
  label,
}: {
  tone:
    | "green"
    | "amber"
    | "slate";

  label: string;
}) {
  const classes =
    tone ===
    "green"
      ? "border-green-500/20 bg-green-500/[0.06] text-green-300"
      : tone ===
          "amber"
        ? "border-amber-400/20 bg-amber-400/[0.06] text-amber-300"
        : "border-slate-600/30 bg-slate-700/10 text-slate-400";

  const square =
    tone ===
    "green"
      ? "bg-green-500"
      : tone ===
          "amber"
        ? "bg-amber-400"
        : "bg-slate-700";

  return (
    <div
      className={`rounded-lg border px-1.5 py-2 ${classes}`}
    >

      <div
        className={`mx-auto mb-1 h-2.5 w-2.5 rounded ${square}`}
      />

      <p>
        {label}
      </p>

    </div>
  );
}