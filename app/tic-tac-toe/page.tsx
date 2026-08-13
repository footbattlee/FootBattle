"use client";

import {
  GAME_NAMES,
  trackGameStarted,
  trackGameCompleted,
  trackPlayAgain,
} from "@/lib/analytics/game-analytics";


import Link from "next/link";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/* =========================================================
   TYPES
========================================================= */

type AxisType =
  | "club"
  | "nationality";

type AxisItem = {
  index: number;
  type: AxisType;
  value: string;
};

type PlayerSearchItem = {
  id: number;
  name: string;
  nationality:
    | string
    | null;
  currentClubName:
    | string
    | null;
  imageUrl:
    | string
    | null;
  popularityScore:
    | number
    | null;
};

type GridCell = {
  rowIndex: number;
  columnIndex: number;

  answered: boolean;
  correct: boolean;

  player:
    | PlayerSearchItem
    | null;
};

type StartResponse = {
  ok?: boolean;
  error?: string;

  game?: {
    code: string;
    label: string;
    mode: string;
    durationSeconds: number;
    scorePerCorrect: number;
    fullGridBonus: number;
  };

  session?: {
    id: string;
    startedAt: string;
    expiresAt: string;
    score: number;
    correctCount: number;
    wrongCount: number;
  };

  grid?: {
    type:
      | "club_nation"
      | "nation_club"
      | "club_club";

    rows: AxisItem[];
    columns: AxisItem[];
    cells: GridCell[];
    qualityScore: number;
  };
};

type SearchResponse = {
  ok?: boolean;
  error?: string;
  minimumSearchLength?: number;
  players?: PlayerSearchItem[];
};

type AnswerResponse = {
  ok?: boolean;
  error?: string;

  correct?: boolean;
  completed?: boolean;
  reason?: string | null;

  score?: number;
  scoreDelta?: number;
  fullGridBonus?: number;

  correctCount?: number;
  wrongCount?: number;

  remainingSeconds?: number;

  cell?: GridCell;
  message?: string;
};

type FinishResponse = {
  ok?: boolean;
  error?: string;

  completed?: boolean;
  alreadyCompleted?: boolean;
  reason?: string;

  score?: number;
  correctCount?: number;
  wrongCount?: number;

  remainingSeconds?: number;
  message?: string;
};

/* =========================================================
   SETTINGS
========================================================= */

const DEFAULT_DURATION_SECONDS =
  120;

const DEFAULT_SCORE_PER_CORRECT =
  10;

const DEFAULT_FULL_GRID_BONUS =
  50;

const MINIMUM_SEARCH_LENGTH =
  2;

/* =========================================================
   HELPERS
========================================================= */

function formatTime(
  seconds: number,
) {
  const safe =
    Math.max(
      0,
      seconds,
    );

  const minutes =
    Math.floor(
      safe / 60,
    );

  const secs =
    safe %
    60;

  return `${minutes}:${String(
    secs,
  ).padStart(
    2,
    "0",
  )}`;
}

function makeCellKey(
  rowIndex: number,
  columnIndex: number,
) {
  return `${rowIndex}-${columnIndex}`;
}

function axisIcon(
  type: AxisType,
) {
  return type ===
    "club"
    ? "🏟️"
    : "🌍";
}

async function markTicTacToeDailyChallenge() {
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
                "tic_tac_toe",
            }),
        },
      );

    /*
     * Giriş yapmayan kullanıcıda günlük görev işaretlenmez.
     * Normal Tic Tac Toe akışını bozmasın.
     */
    if (
      response.status ===
      401
    ) {
      return;
    }

    if (
      !response.ok
    ) {
      const result =
        await response
          .json()
          .catch(
            () =>
              null,
          );

      console.error(
        "Tic Tac Toe daily challenge update error:",
        result,
      );
    }
  } catch (error) {
    console.error(
      "Tic Tac Toe daily challenge request error:",
      error,
    );
  }
}

/* =========================================================
   PAGE
========================================================= */

export default function TicTacToePage() {
  const [
    sessionId,
    setSessionId,
  ] =
    useState("");

  const [
    rows,
    setRows,
  ] =
    useState<
      AxisItem[]
    >([]);

  const [
    columns,
    setColumns,
  ] =
    useState<
      AxisItem[]
    >([]);

  const [
    cells,
    setCells,
  ] =
    useState<
      GridCell[]
    >([]);

  const [
    gameStarted,
    setGameStarted,
  ] =
    useState(false);

  const [
    gameFinished,
    setGameFinished,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    loadingError,
    setLoadingError,
  ] =
    useState("");

  const [
    scorePerCorrect,
    setScorePerCorrect,
  ] =
    useState(
      DEFAULT_SCORE_PER_CORRECT,
    );

  const [
    fullGridBonus,
    setFullGridBonus,
  ] =
    useState(
      DEFAULT_FULL_GRID_BONUS,
    );

  const [
    score,
    setScore,
  ] =
    useState(0);

  const [
    correctCount,
    setCorrectCount,
  ] =
    useState(0);

  const [
    wrongCount,
    setWrongCount,
  ] =
    useState(0);

  const [
    timeLeft,
    setTimeLeft,
  ] =
    useState(
      DEFAULT_DURATION_SECONDS,
    );

  const [
    selectedCell,
    setSelectedCell,
  ] =
    useState<{
      rowIndex: number;
      columnIndex: number;
    } | null>(
      null,
    );

  const [
    answerModalOpen,
    setAnswerModalOpen,
  ] =
    useState(false);

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    searchResults,
    setSearchResults,
  ] =
    useState<
      PlayerSearchItem[]
    >([]);

  const [
    selectedPlayer,
    setSelectedPlayer,
  ] =
    useState<
      PlayerSearchItem | null
    >(null);

  const [
    searchLoading,
    setSearchLoading,
  ] =
    useState(false);

  const [
    searchOpen,
    setSearchOpen,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState(
      "Bir hücre seç ve uygun futbolcuyu bul.",
    );

  const [
    feedbackType,
    setFeedbackType,
  ] =
    useState<
      | "neutral"
      | "correct"
      | "wrong"
    >(
      "neutral",
    );

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const expiresAtRef =
    useRef<
      number | null
    >(null);

  const finishCalledRef =
    useRef(false);

  const searchInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const cellMap =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            GridCell
          >();

        for (
          const cell
          of cells
        ) {
          map.set(
            makeCellKey(
              cell.rowIndex,
              cell.columnIndex,
            ),
            cell,
          );
        }

        return map;
      },
      [
        cells,
      ],
    );

  const selectedCellData =
    useMemo(
      () => {
        if (
          !selectedCell
        ) {
          return null;
        }

        return (
          cellMap.get(
            makeCellKey(
              selectedCell.rowIndex,
              selectedCell.columnIndex,
            ),
          ) ??
          null
        );
      },
      [
        cellMap,
        selectedCell,
      ],
    );

  const selectedRow =
    selectedCell
      ? rows[
          selectedCell
            .rowIndex
        ] ??
        null
      : null;

  const selectedColumn =
    selectedCell
      ? columns[
          selectedCell
            .columnIndex
        ] ??
        null
      : null;

  const resetSearch =
    useCallback(
      () => {
        setQuery(
          "",
        );

        setSearchResults(
          [],
        );

        setSelectedPlayer(
          null,
        );

        setSearchLoading(
          false,
        );

        setSearchOpen(
          false,
        );
      },
      [],
    );

  const closeAnswerModal =
    useCallback(
      () => {
        if (
          submitting
        ) {
          return;
        }

        setAnswerModalOpen(
          false,
        );

        setSelectedCell(
          null,
        );

        setFeedbackType(
          "neutral",
        );

        setMessage(
          "Bir hücre seç ve uygun futbolcuyu bul.",
        );

        resetSearch();
      },
      [
        resetSearch,
        submitting,
      ],
    );

  const startGame =
    useCallback(
      async () => {
        try {
          setLoading(
            true,
          );

          setLoadingError(
            "",
          );

          finishCalledRef.current =
            false;

          resetSearch();

          setSelectedCell(
            null,
          );

          setAnswerModalOpen(
            false,
          );

          setGameFinished(
            false,
          );

          setMessage(
            "Grid hazırlanıyor...",
          );

          setFeedbackType(
            "neutral",
          );

          const response =
            await fetch(
              "/api/tic-tac-toe/start",
              {
                method:
                  "POST",

                cache:
                  "no-store",
              },
            );

          const result =
            (
              await response.json()
            ) as StartResponse;

          if (
            !response.ok ||
            !result.ok ||
            !result.session ||
            !result.grid ||
            !result.game
          ) {
            throw new Error(
              result.error ??
                "Tic Tac Toe hazırlanamadı.",
            );
          }

          setSessionId(
            result.session.id,
          );

          void trackGameStarted(
            GAME_NAMES.TIC_TAC_TOE,
            result.session.id,
          );

          setRows(
            result.grid.rows,
          );

          setColumns(
            result.grid.columns,
          );

          setCells(
            result.grid.cells,
          );

          setScore(
            Number(
              result.session
                .score ??
                0,
            ),
          );

          setCorrectCount(
            Number(
              result.session
                .correctCount ??
                0,
            ),
          );

          setWrongCount(
            Number(
              result.session
                .wrongCount ??
                0,
            ),
          );

          setScorePerCorrect(
            Number(
              result.game
                .scorePerCorrect ??
                DEFAULT_SCORE_PER_CORRECT,
            ),
          );

          setFullGridBonus(
            Number(
              result.game
                .fullGridBonus ??
                DEFAULT_FULL_GRID_BONUS,
            ),
          );

          const expiresAt =
            new Date(
              result.session
                .expiresAt,
            ).getTime();

          expiresAtRef.current =
            expiresAt;

          const seconds =
            Math.max(
              0,
              Math.ceil(
                (
                  expiresAt -
                  Date.now()
                ) /
                  1000,
              ),
            );

          setTimeLeft(
            seconds,
          );

          setGameStarted(
            true,
          );

          setGameFinished(
            false,
          );

          setMessage(
            "Bir hücre seç ve uygun futbolcuyu bul.",
          );
        } catch (
          error
        ) {
          console.error(
            "TicTacToe start hatası:",
            error,
          );

          setSessionId(
            "",
          );

          setRows(
            [],
          );

          setColumns(
            [],
          );

          setCells(
            [],
          );

          setGameStarted(
            false,
          );

          setLoadingError(
            error instanceof Error
              ? error.message
              : "Oyun hazırlanamadı.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        resetSearch,
      ],
    );

  const finishGame =
    useCallback(
      async () => {
        if (
          !sessionId ||
          finishCalledRef.current
        ) {
          return;
        }

        finishCalledRef.current =
          true;

        try {
          const response =
            await fetch(
              "/api/tic-tac-toe/finish",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    sessionId,
                  }),
              },
            );

          const result =
            (
              await response.json()
            ) as FinishResponse;

          if (
            !response.ok ||
            !result.ok
          ) {
            if (
              response.status ===
              409
            ) {
              finishCalledRef.current =
                false;

              if (
                typeof result
                  .remainingSeconds ===
                "number"
              ) {
                setTimeLeft(
                  result.remainingSeconds,
                );
              }

              return;
            }

            throw new Error(
              result.error ??
                "Oyun tamamlanamadı.",
            );
          }

          setScore(
            Number(
              result.score ??
                0,
            ),
          );

          setCorrectCount(
            Number(
              result.correctCount ??
                0,
            ),
          );

          setWrongCount(
            Number(
              result.wrongCount ??
                0,
            ),
          );

          setTimeLeft(
            0,
          );

          setGameStarted(
            false,
          );

          setGameFinished(
            true,
          );

          if (
            !result.alreadyCompleted
          ) {
            void trackGameCompleted(
              GAME_NAMES.TIC_TAC_TOE,
              sessionId,
              {
                score:
                  Number(
                    result.score ??
                      0,
                  ),

                correctCount:
                  Number(
                    result.correctCount ??
                      0,
                  ),

                wrongCount:
                  Number(
                    result.wrongCount ??
                      0,
                  ),

                reason:
                  result.reason ??
                  "finished",
              },
            );
          }

          setSelectedCell(
            null,
          );

          setAnswerModalOpen(
            false,
          );

          resetSearch();

          setFeedbackType(
            "neutral",
          );

          setMessage(
            result.message ??
              "Süre bitti!",
          );
        } catch (
          error
        ) {
          console.error(
            "TicTacToe finish hatası:",
            error,
          );

          finishCalledRef.current =
            false;

          setMessage(
            error instanceof Error
              ? error.message
              : "Oyun tamamlanamadı.",
          );
        }
      },
      [
        resetSearch,
        sessionId,
      ],
    );

  useEffect(
    () => {
      if (
        !gameStarted ||
        gameFinished ||
        !sessionId ||
        !expiresAtRef.current
      ) {
        return;
      }

      const updateTimer =
        () => {
          const expiresAt =
            expiresAtRef.current;

          if (
            !expiresAt
          ) {
            return;
          }

          const seconds =
            Math.max(
              0,
              Math.ceil(
                (
                  expiresAt -
                  Date.now()
                ) /
                  1000,
              ),
            );

          setTimeLeft(
            seconds,
          );

          if (
            seconds <=
            0
          ) {
            void finishGame();
          }
        };

      updateTimer();

      const interval =
        window.setInterval(
          updateTimer,
          250,
        );

      return () => {
        window.clearInterval(
          interval,
        );
      };
    },
    [
      finishGame,
      gameFinished,
      gameStarted,
      sessionId,
    ],
  );

  useEffect(
    () => {
      if (
        !answerModalOpen
      ) {
        return;
      }

      const previousOverflow =
        document.body.style
          .overflow;

      document.body.style.overflow =
        "hidden";

      return () => {
        document.body.style.overflow =
          previousOverflow;
      };
    },
    [
      answerModalOpen,
    ],
  );

  useEffect(
    () => {
      if (
        !gameStarted ||
        gameFinished ||
        !answerModalOpen ||
        !selectedCell ||
        selectedCellData
          ?.answered ||
        selectedPlayer
      ) {
        setSearchResults(
          [],
        );

        setSearchOpen(
          false,
        );

        return;
      }

      const trimmed =
        query.trim();

      if (
        trimmed.length <
        MINIMUM_SEARCH_LENGTH
      ) {
        setSearchResults(
          [],
        );

        setSearchOpen(
          false,
        );

        setSearchLoading(
          false,
        );

        return;
      }

      const controller =
        new AbortController();

      const timer =
        window.setTimeout(
          async () => {
            try {
              setSearchLoading(
                true,
              );

              const response =
                await fetch(
                  `/api/tic-tac-toe/search-player?q=${encodeURIComponent(
                    trimmed,
                  )}`,
                  {
                    cache:
                      "no-store",

                    signal:
                      controller.signal,
                  },
                );

              const result =
                (
                  await response.json()
                ) as SearchResponse;

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

              setSearchOpen(
                (
                  result.players ??
                  []
                ).length >
                  0,
              );
            } catch (
              error
            ) {
              if (
                error instanceof
                  DOMException &&
                error.name ===
                  "AbortError"
              ) {
                return;
              }

              console.error(
                "TicTacToe search hatası:",
                error,
              );

              setSearchResults(
                [],
              );

              setSearchOpen(
                false,
              );
            } finally {
              setSearchLoading(
                false,
              );
            }
          },
          220,
        );

      return () => {
        window.clearTimeout(
          timer,
        );

        controller.abort();
      };
    },
    [
      answerModalOpen,
      gameFinished,
      gameStarted,
      query,
      selectedCell,
      selectedCellData,
      selectedPlayer,
    ],
  );

  function chooseCell(
    rowIndex: number,
    columnIndex: number,
  ) {
    if (
      !gameStarted ||
      gameFinished ||
      submitting
    ) {
      return;
    }

    const cell =
      cellMap.get(
        makeCellKey(
          rowIndex,
          columnIndex,
        ),
      );

    if (
      cell?.answered
    ) {
      setFeedbackType(
        "neutral",
      );

      setMessage(
        `${cell.player?.name ?? "Bu oyuncu"} ile bu hücre zaten dolduruldu.`,
      );

      return;
    }

    setSelectedCell({
      rowIndex,
      columnIndex,
    });

    resetSearch();

    setFeedbackType(
      "neutral",
    );

    setMessage(
      "Bu iki koşulu sağlayan futbolcuyu bul.",
    );

    setAnswerModalOpen(
      true,
    );

    window.setTimeout(
      () => {
        searchInputRef.current
          ?.focus();
      },
      120,
    );
  }

  function choosePlayer(
    player: PlayerSearchItem,
  ) {
    setSelectedPlayer(
      player,
    );

    setQuery(
      player.name,
    );

    setSearchResults(
      [],
    );

    setSearchOpen(
      false,
    );
  }

  async function submitAnswer(
    event?: FormEvent,
  ) {
    event?.preventDefault();

    if (
      !sessionId ||
      !gameStarted ||
      gameFinished ||
      !selectedCell ||
      !selectedPlayer ||
      submitting
    ) {
      return;
    }

    try {
      setSubmitting(
        true,
      );

      setFeedbackType(
        "neutral",
      );

      setMessage(
        "Cevap kontrol ediliyor...",
      );

      const response =
        await fetch(
          "/api/tic-tac-toe/answer",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                sessionId,

                rowIndex:
                  selectedCell.rowIndex,

                columnIndex:
                  selectedCell.columnIndex,

                playerId:
                  selectedPlayer.id,
              }),
          },
        );

      const result =
        (
          await response.json()
        ) as AnswerResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
            "Cevap kontrol edilemedi.",
        );
      }

      if (
        typeof result.score ===
        "number"
      ) {
        setScore(
          result.score,
        );
      }

      if (
        typeof result.correctCount ===
        "number"
      ) {
        setCorrectCount(
          result.correctCount,
        );
      }

      if (
        typeof result.wrongCount ===
        "number"
      ) {
        setWrongCount(
          result.wrongCount,
        );
      }

      if (
        typeof result.remainingSeconds ===
        "number"
      ) {
        setTimeLeft(
          result.remainingSeconds,
        );
      }

      if (
        !result.correct
      ) {
        setFeedbackType(
          "wrong",
        );

        setMessage(
          result.message ??
            "Yanlış oyuncu. Başka bir oyuncu dene.",
        );

        resetSearch();

        window.setTimeout(
          () => {
            searchInputRef.current
              ?.focus();
          },
          80,
        );

        return;
      }

      if (
        result.cell
      ) {
        setCells(
          (
            current,
          ) =>
            current.map(
              (
                cell,
              ) =>
                cell.rowIndex ===
                  result.cell
                    ?.rowIndex &&
                cell.columnIndex ===
                  result.cell
                    ?.columnIndex
                  ? result.cell
                  : cell,
            ),
        );
      }

      setFeedbackType(
        "correct",
      );

      setMessage(
        result.message ??
          `Doğru! +${scorePerCorrect} puan.`,
      );

      const nextCorrectCount =
        typeof result.correctCount ===
          "number"
          ? result.correctCount
          : correctCount +
            1;

      /*
       * Günlük görev kuralı:
       * Tic Tac Toe'da en az 5 doğru hücre yeterli.
       *
       * Endpoint aynı gün tekrar çağrılsa bile
       * ikinci kez ödül yazmaz.
       */
      if (
        nextCorrectCount >=
        5
      ) {
        void markTicTacToeDailyChallenge();
      }

      setSelectedCell(
        null,
      );

      setAnswerModalOpen(
        false,
      );

      resetSearch();

      if (
        result.completed
      ) {
        finishCalledRef.current =
          true;

        setGameStarted(
          false,
        );

        setGameFinished(
          true,
        );

        void trackGameCompleted(
          GAME_NAMES.TIC_TAC_TOE,
          sessionId,
          {
            score:
              Number(
                result.score ??
                  score,
              ),

            correctCount:
              Number(
                result.correctCount ??
                  correctCount,
              ),

            wrongCount:
              Number(
                result.wrongCount ??
                  wrongCount,
              ),

            reason:
              result.reason ??
              "completed",
          },
        );

        return;
      }
    } catch (
      error
    ) {
      console.error(
        "TicTacToe answer hatası:",
        error,
      );

      setFeedbackType(
        "wrong",
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Cevap kontrol edilemedi.",
      );
    } finally {
      setSubmitting(
        false,
      );
    }
  }

  if (
    !gameStarted &&
    !gameFinished
  ) {
    return (
      <main className="min-h-screen bg-[#07111f] px-4 py-6 text-white sm:py-10">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-white"
          >
            ← Ana Sayfa
          </Link>

          <div className="flex min-h-[70vh] items-center justify-center">
            <section className="w-full rounded-3xl border border-white/10 bg-[#101c2c] p-6 text-center shadow-2xl sm:p-10">
              <div className="text-6xl">
                ⭕
              </div>

              <h1 className="mt-4 text-3xl font-black sm:text-5xl">
                Futbol Tic Tac Toe
              </h1>

              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
                Satır ve sütundaki iki koşulu da sağlayan futbolcuları bul.
                120 saniye içinde 3x3 grid&apos;i doldurmaya çalış.
              </p>

              <div className="mt-8 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-white/10 bg-[#0c1828] p-4">
                  <div className="text-2xl font-black">
                    120
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    saniye
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0c1828] p-4">
                  <div className="text-2xl font-black text-green-400">
                    +10
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    doğru hücre
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0c1828] p-4">
                  <div className="text-2xl font-black text-purple-300">
                    +50
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    9/9 bonus
                  </div>
                </div>
              </div>

              {loadingError && (
                <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                  {loadingError}
                </div>
              )}

              <button
                type="button"
                disabled={
                  loading
                }
                onClick={() =>
                  void startGame()
                }
                className="mt-8 w-full rounded-2xl bg-green-500 px-6 py-4 text-base font-black text-[#07111f] transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Grid hazırlanıyor..."
                  : "Oyuna Başla"}
              </button>

              <p className="mt-4 text-xs leading-5 text-slate-500">
                Aynı futbolcuyu iki farklı hücrede kullanamazsın.
              </p>
            </section>
          </div>
        </div>
      </main>
    );
  }

  if (
    gameFinished
  ) {
    return (
      <main className="min-h-screen bg-[#07111f] px-4 py-6 text-white sm:py-10">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-white"
          >
            ← Ana Sayfa
          </Link>

          <div className="flex min-h-[68vh] items-center justify-center">
            <section className="w-full rounded-3xl border border-white/10 bg-[#101c2c] p-6 text-center shadow-2xl sm:p-10">
              <div className="text-5xl">
                {correctCount ===
                9
                  ? "🏆"
                  : "🏁"}
              </div>

              <h1 className="mt-4 text-3xl font-black sm:text-5xl">
                {correctCount ===
                9
                  ? "Grid Tamamlandı!"
                  : "Oyun Bitti"}
              </h1>

              <div className="mt-8 text-6xl font-black text-green-400">
                {score}
              </div>

              <div className="mt-1 text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                Puan
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 bg-[#0c1828] p-4">
                  <div className="text-3xl font-black text-emerald-400">
                    {correctCount}/9
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Dolu Hücre
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0c1828] p-4">
                  <div className="text-3xl font-black text-red-400">
                    {wrongCount}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    Yanlış Tahmin
                  </div>
                </div>
              </div>

              {correctCount ===
                9 && (
                <div className="mt-4 rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 py-3 text-sm font-black text-purple-300">
                  9/9 bonusu: +
                  {fullGridBonus} puan
                </div>
              )}

              <p className="mt-5 text-sm text-slate-400">
                {message}
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={
                    loading
                  }
                  onClick={() => {
                    void trackPlayAgain(
                      GAME_NAMES.TIC_TAC_TOE,
                      sessionId ||
                        null,
                    );

                    void startGame();
                  }}
                  className="rounded-2xl bg-green-500 px-6 py-4 font-black text-[#07111f] transition hover:bg-green-400 disabled:opacity-50"
                >
                  {loading
                    ? "Hazırlanıyor..."
                    : "Tekrar Oyna"}
                </button>

                <Link
                  href="/"
                  className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-black transition hover:bg-white/10"
                >
                  Ana Sayfa
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07111f] px-3 py-4 text-white sm:px-5 sm:py-6">
      <div className="mx-auto max-w-5xl">
        <div className="sticky top-0 z-20 -mx-3 mb-3 border-b border-white/5 bg-[#07111f]/95 px-3 py-2 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-400 transition hover:text-white sm:text-sm"
            >
              ← Ana Sayfa
            </Link>

            <div className="text-center">
              <div className="text-sm font-black">
                FootBattle
              </div>

              <div className="text-[10px] text-slate-500 sm:text-xs">
                Tic Tac Toe
              </div>
            </div>

            <div
              className={`rounded-xl border px-3 py-2 text-sm font-black sm:px-4 ${
                timeLeft <=
                15
                  ? "border-red-500/30 bg-red-500/10 text-red-400"
                  : "border-white/10 bg-white/5"
              }`}
            >
              {formatTime(
                timeLeft,
              )}
            </div>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2 sm:gap-3">
          <StatCard
            label="Skor"
            value={`${score}`}
            tone="green"
          />

          <StatCard
            label="Dolu"
            value={`${correctCount}/9`}
            tone="purple"
          />

          <StatCard
            label="Yanlış"
            value={`${wrongCount}`}
            tone="red"
          />
        </div>

        <section className="mx-auto max-w-[820px] rounded-3xl border border-white/10 bg-[#101c2c] p-2 shadow-2xl sm:p-4">
          <div className="grid grid-cols-[64px_repeat(3,minmax(0,1fr))] gap-1.5 sm:grid-cols-[108px_repeat(3,minmax(0,1fr))] sm:gap-2">
            <div className="flex min-h-[64px] items-center justify-center rounded-xl border border-white/[0.05] bg-black/10 p-2 text-center text-[8px] font-black uppercase tracking-wider text-slate-600 sm:min-h-[82px] sm:text-[10px]">
              Futbol
              <br />
              Grid
            </div>

            {columns.map(
              (
                column,
              ) => (
                <AxisHeader
                  key={`column-${column.index}`}
                  item={
                    column
                  }
                />
              ),
            )}

            {rows.map(
              (
                row,
              ) => (
                <div
                  key={`row-wrapper-${row.index}`}
                  className="contents"
                >
                  <AxisHeader
                    item={
                      row
                    }
                  />

                  {columns.map(
                    (
                      column,
                    ) => {
                      const key =
                        makeCellKey(
                          row.index,
                          column.index,
                        );

                      const cell =
                        cellMap.get(
                          key,
                        );

                      const selected =
                        selectedCell
                          ?.rowIndex ===
                          row.index &&
                        selectedCell
                          ?.columnIndex ===
                          column.index;

                      return (
                        <button
                          key={
                            key
                          }
                          type="button"
                          disabled={
                            Boolean(
                              cell?.answered,
                            ) ||
                            submitting
                          }
                          onClick={() =>
                            chooseCell(
                              row.index,
                              column.index,
                            )
                          }
                          className={`relative flex min-h-[78px] min-w-0 items-center justify-center overflow-hidden rounded-xl border p-1.5 text-center transition sm:min-h-[105px] sm:rounded-2xl sm:p-2 ${
                            cell
                              ?.answered
                              ? "cursor-default border-green-500/30 bg-green-500/[0.09]"
                              : selected
                                ? "border-purple-400 bg-purple-500/15 ring-2 ring-purple-400/20"
                                : "border-white/10 bg-[#0b1726] hover:border-purple-400/35 hover:bg-purple-500/[0.06]"
                          }`}
                        >
                          {cell
                            ?.answered &&
                          cell.player ? (
                            <div className="w-full min-w-0">
                              {cell
                                .player
                                .imageUrl ? (
                                <img
                                  src={
                                    cell
                                      .player
                                      .imageUrl
                                  }
                                  alt={
                                    cell
                                      .player
                                      .name
                                  }
                                  className="mx-auto h-8 w-8 rounded-full border border-white/10 object-cover sm:h-11 sm:w-11"
                                />
                              ) : (
                                <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm sm:h-11 sm:w-11 sm:text-base">
                                  ⚽
                                </div>
                              )}

                              <div className="mt-1 truncate text-[8px] font-black leading-tight text-green-300 sm:text-xs">
                                {
                                  cell
                                    .player
                                    .name
                                }
                              </div>

                              <div className="mt-0.5 text-[7px] font-black uppercase tracking-wider text-green-400/50 sm:text-[9px]">
                                ✓ DOĞRU
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="text-lg text-slate-700 sm:text-2xl">
                                +
                              </div>

                              <div className="mt-0.5 text-[7px] font-bold uppercase tracking-wider text-slate-600 sm:text-[9px]">
                                Oyuncu
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    },
                  )}
                </div>
              ),
            )}
          </div>
        </section>

        <p className="mx-auto mt-3 max-w-[820px] text-center text-[10px] leading-5 text-slate-600 sm:text-xs">
          Her doğru hücre +
          {scorePerCorrect} puan · 9/9 tamamlayınca +
          {fullGridBonus} bonus · Aynı oyuncuyu tekrar kullanamazsın.
        </p>
      </div>

      {answerModalOpen &&
        selectedCell &&
        selectedRow &&
        selectedColumn && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-4 backdrop-blur-sm"
            onMouseDown={
              closeAnswerModal
            }
          >
            <div
              className="w-full max-w-lg rounded-3xl border border-purple-400/20 bg-[#101c2c] p-5 shadow-2xl sm:p-6"
              onMouseDown={(
                event,
              ) => {
                event.stopPropagation();
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-purple-300/60">
                    Seçili Hücre
                  </p>

                  <h2 className="mt-1 text-xl font-black text-white">
                    Oyuncuyu Bul
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`rounded-xl border px-3 py-2 text-sm font-black ${
                      timeLeft <=
                      15
                        ? "border-red-500/30 bg-red-500/10 text-red-400"
                        : "border-white/10 bg-white/5 text-white"
                    }`}
                  >
                    ⏱ {formatTime(
                      timeLeft,
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={
                      submitting
                    }
                    onClick={
                      closeAnswerModal
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg font-black text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-center gap-2">
                <ConditionPill
                  item={
                    selectedRow
                  }
                />

                <span className="font-black text-slate-600">
                  +
                </span>

                <ConditionPill
                  item={
                    selectedColumn
                  }
                />
              </div>

              <form
                onSubmit={
                  submitAnswer
                }
                className="mt-6"
              >
                <div className="relative">
                  <input
                    ref={
                      searchInputRef
                    }
                    type="text"
                    value={
                      query
                    }
                    disabled={
                      submitting
                    }
                    autoComplete="off"
                    placeholder="Futbolcu ara..."
                    onChange={(
                      event,
                    ) => {
                      setQuery(
                        event.target.value,
                      );

                      setSelectedPlayer(
                        null,
                      );
                    }}
                    onFocus={() => {
                      if (
                        searchResults.length >
                        0
                      ) {
                        setSearchOpen(
                          true,
                        );
                      }
                    }}
                    className="w-full rounded-2xl border border-white/10 bg-[#07111f] px-4 py-4 pr-14 text-sm font-semibold outline-none transition placeholder:text-slate-600 focus:border-purple-400/50 sm:text-base"
                  />

                  {searchLoading && (
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                      ...
                    </div>
                  )}

                  {searchOpen &&
                    searchResults.length >
                      0 && (
                      <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-[#07111f] p-2 shadow-2xl">
                        {searchResults.map(
                          (
                            player,
                          ) => (
                            <button
                              key={
                                player.id
                              }
                              type="button"
                              onMouseDown={(
                                event,
                              ) => {
                                event.preventDefault();

                                choosePlayer(
                                  player,
                                );
                              }}
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/10"
                            >
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
                                {player.imageUrl ? (
                                  <img
                                    src={
                                      player.imageUrl
                                    }
                                    alt={
                                      player.name
                                    }
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span>
                                    ⚽
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-black text-white">
                                  {
                                    player.name
                                  }
                                </div>

                                <div className="mt-0.5 truncate text-xs text-slate-500">
                                  {[
                                    player.nationality,
                                    player.currentClubName,
                                  ]
                                    .filter(
                                      Boolean,
                                    )
                                    .join(
                                      " • ",
                                    )}
                                </div>
                              </div>

                              <span className="text-xs font-black text-purple-300">
                                Seç
                              </span>
                            </button>
                          ),
                        )}
                      </div>
                    )}
                </div>

                {selectedPlayer && (
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-[9px] font-black uppercase tracking-wider text-purple-300/60">
                        Seçilen Oyuncu
                      </div>

                      <div className="mt-1 truncate text-sm font-black text-purple-200">
                        {
                          selectedPlayer.name
                        }
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={
                        resetSearch
                      }
                      className="ml-3 rounded-lg border border-white/10 px-3 py-2 text-xs font-black text-slate-400"
                    >
                      Değiştir
                    </button>
                  </div>
                )}

                {feedbackType ===
                  "wrong" && (
                  <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm font-bold text-red-300">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !selectedPlayer
                  }
                  className="mt-4 w-full rounded-2xl bg-green-500 px-5 py-4 text-sm font-black text-[#07111f] transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting
                    ? "Kontrol Ediliyor..."
                    : `Hücreyi Doldur (+${scorePerCorrect})`}
                </button>
              </form>
            </div>
          </div>
        )}
    </main>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function AxisHeader({
  item,
}: {
  item: AxisItem;
}) {
  return (
    <div className="flex min-h-[64px] min-w-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] p-1.5 text-center sm:min-h-[82px] sm:rounded-2xl sm:p-2">
      <div className="min-w-0">
        <div className="text-xs sm:text-base">
          {axisIcon(
            item.type,
          )}
        </div>

        <div className="mt-1 break-words text-[8px] font-black leading-tight text-slate-200 sm:text-xs">
          {item.value}
        </div>
      </div>
    </div>
  );
}

function ConditionPill({
  item,
}: {
  item:
    | AxisItem
    | null;
}) {
  if (
    !item
  ) {
    return null;
  }

  return (
    <div className="min-w-0 rounded-xl border border-purple-500/20 bg-purple-500/10 px-3 py-2 sm:px-5 sm:py-3">
      <div className="text-[9px] font-black uppercase tracking-wider text-purple-300/60">
        {item.type ===
        "club"
          ? "Takım"
          : "Milliyet"}
      </div>

      <div className="mt-1 max-w-[125px] break-words text-xs font-black text-purple-200 sm:max-w-[200px] sm:text-base">
        {item.value}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone:
    | "green"
    | "purple"
    | "red";
}) {
  const valueClass =
    tone ===
    "green"
      ? "text-green-400"
      : tone ===
          "purple"
        ? "text-purple-300"
        : "text-red-400";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-center sm:p-3">
      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-600 sm:text-[10px]">
        {label}
      </div>

      <div
        className={`mt-1 text-lg font-black sm:text-xl ${valueClass}`}
      >
        {value}
      </div>
    </div>
  );
}