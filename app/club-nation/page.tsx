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
  useRef,
  useState,
} from "react";

/* =========================================================
   TYPES
========================================================= */

type PlayerSearchItem = {
  playerId: number;

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
};

type Question = {
  club: string;

  nationality: string;
};

type GameSession = {
  id: string;

  startedAt: string;

  expiresAt: string;

  score: number;

  correctCount: number;

  wrongCount: number;

  passesLeft: number;

  questionNo: number;
};

type StartResponse = {
  ok: boolean;

  error?: string;

  game?: {
    code: string;

    label: string;

    durationSeconds: number;

    scorePerCorrect: number;

    maxPasses: number;
  };

  session?: GameSession;

  question?: Question;
};

type AnswerResponse = {
  ok: boolean;

  error?: string;

  ambiguous?: boolean;

  players?: PlayerSearchItem[];

  correct?: boolean;

  completed?: boolean;

  reason?: string;

  pointsEarned?: number;

  score?: number;

  correctCount?: number;

  wrongCount?: number;

  attemptCount?: number;

  passesLeft?: number;

  questionNo?: number;

  secondsLeft?: number;

  question?: Question;

  message?: string;
};

type PassResponse = {
  ok: boolean;

  error?: string;

  passed?: boolean;

  completed?: boolean;

  score?: number;

  correctCount?: number;

  wrongCount?: number;

  passesLeft?: number;

  questionNo?: number;

  secondsLeft?: number;

  question?: Question;

  message?: string;
};

type FinishResponse = {
  ok: boolean;

  error?: string;

  completed?: boolean;

  alreadyCompleted?: boolean;

  score?: number;

  correctCount?: number;

  wrongCount?: number;

  attemptCount?: number;

  passesLeft?: number;

  questionNo?: number;

  message?: string;
};

type SearchResponse = {
  ok: boolean;

  error?: string;

  minimumSearchLength?: number;

  players?: PlayerSearchItem[];
};

/* =========================================================
   SETTINGS
========================================================= */

const GAME_DURATION_SECONDS =
  120;

const MINIMUM_SEARCH_LENGTH =
  3;

/* =========================================================
   PAGE
========================================================= */

export default function ClubNationPage() {
  /* =======================================================
     GAME
  ======================================================= */

  const [
    session,
    setSession,
  ] =
    useState<GameSession | null>(
      null,
    );

  const [
    question,
    setQuestion,
  ] =
    useState<Question | null>(
      null,
    );

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
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    passing,
    setPassing,
  ] =
    useState(false);

  /* =======================================================
     STATS
  ======================================================= */

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
    passesLeft,
    setPassesLeft,
  ] =
    useState(3);

  const [
    questionNo,
    setQuestionNo,
  ] =
    useState(1);

  const [
    timeLeft,
    setTimeLeft,
  ] =
    useState(
      GAME_DURATION_SECONDS,
    );

  /* =======================================================
     INPUT / SEARCH
  ======================================================= */

  const [
    input,
    setInput,
  ] =
    useState("");

  const [
    selectedPlayer,
    setSelectedPlayer,
  ] =
    useState<PlayerSearchItem | null>(
      null,
    );

  const [
    results,
    setResults,
  ] =
    useState<PlayerSearchItem[]>(
      [],
    );

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

  /* =======================================================
     FEEDBACK
  ======================================================= */

  const [
    message,
    setMessage,
  ] =
    useState(
      "Hazırsan başla.",
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

  /* =======================================================
     REFS
  ======================================================= */

  const inputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const finishCalledRef =
    useRef(false);

  /* =======================================================
     RESET INPUT
  ======================================================= */

  const resetAnswerInput =
    useCallback(() => {
      setInput("");

      setSelectedPlayer(
        null,
      );

      setResults([]);

      setSearchOpen(
        false,
      );

      window.setTimeout(
        () => {
          inputRef.current
            ?.focus();
        },
        50,
      );
    }, []);

  /* =======================================================
     FINISH GAME
  ======================================================= */

  const finishGame =
    useCallback(
      async (
        sessionId?: string,
      ) => {
        const id =
          sessionId ??
          session?.id;

        if (
          !id ||
          finishCalledRef.current
        ) {
          return;
        }

        finishCalledRef.current =
          true;

        try {
          const response =
            await fetch(
              "/api/club-nation/finish",
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
                      id,
                  }),
              },
            );

          const result =
            (await response.json()) as FinishResponse;

          if (
            !response.ok ||
            !result.ok
          ) {
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

          setPassesLeft(
            Number(
              result.passesLeft ??
                0,
            ),
          );

          setGameFinished(
            true,
          );

          if (
            !result.alreadyCompleted
          ) {
            void trackGameCompleted(
              GAME_NAMES.CLUB_NATION,
              id,
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
                  "finished",
              },
            );
          }

          setGameStarted(
            false,
          );

          setTimeLeft(
            0,
          );

          setFeedbackType(
            "neutral",
          );

          setMessage(
            result.message ??
              `Süre bitti! ${result.correctCount ?? 0} doğru cevapla ${result.score ?? 0} puan topladın.`,
          );

          setResults([]);

          setSearchOpen(
            false,
          );
        } catch (
          error
        ) {
          finishCalledRef.current =
            false;

          console.error(
            "1 Takım 1 Millet finish hatası:",
            error,
          );

          setMessage(
            error instanceof Error
              ? error.message
              : "Oyun tamamlanamadı.",
          );
        }
      },
      [
        session?.id,
      ],
    );

  /* =======================================================
     START GAME
  ======================================================= */

  const startGame =
    useCallback(
      async () => {
        try {
          setLoading(
            true,
          );

          setMessage(
            "Oyun hazırlanıyor...",
          );

          finishCalledRef.current =
            false;

          const response =
            await fetch(
              "/api/club-nation/start",
              {
                method:
                  "POST",

                cache:
                  "no-store",
              },
            );

          const result =
            (await response.json()) as StartResponse;

          if (
            !response.ok ||
            !result.ok
          ) {
            throw new Error(
              result.error ??
                "Oyun başlatılamadı.",
            );
          }

          if (
            !result.session ||
            !result.question
          ) {
            throw new Error(
              "Oyun bilgileri eksik geldi.",
            );
          }

          setSession(
            result.session,
          );

          void trackGameStarted(
            GAME_NAMES.CLUB_NATION,
            result.session.id,
          );

          setQuestion(
            result.question,
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

          setPassesLeft(
            Number(
              result.session
                .passesLeft ??
                3,
            ),
          );

          setQuestionNo(
            Number(
              result.session
                .questionNo ??
                1,
            ),
          );

          const expiresAt =
            new Date(
              result.session
                .expiresAt,
            ).getTime();

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

          setFeedbackType(
            "neutral",
          );

          setMessage(
            "Oyuncuyu bul! Süre başladı.",
          );

          resetAnswerInput();
        } catch (
          error
        ) {
          console.error(
            "1 Takım 1 Millet start hatası:",
            error,
          );

          setMessage(
            error instanceof Error
              ? error.message
              : "Oyun başlatılamadı.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        resetAnswerInput,
      ],
    );

  /* =======================================================
     TIMER
  ======================================================= */

  useEffect(() => {
    if (
      !gameStarted ||
      gameFinished ||
      !session
    ) {
      return;
    }

    const updateTimer =
      () => {
        const expiresAt =
          new Date(
            session.expiresAt,
          ).getTime();

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
          void finishGame(
            session.id,
          );
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
  }, [
    finishGame,
    gameFinished,
    gameStarted,
    session,
  ]);

  /* =======================================================
     PLAYER SEARCH
  ======================================================= */

  useEffect(() => {
    if (
      !gameStarted ||
      gameFinished ||
      selectedPlayer
    ) {
      setResults([]);

      setSearchOpen(
        false,
      );

      return;
    }

    const query =
      input.trim();

    if (
      query.length <
      MINIMUM_SEARCH_LENGTH
    ) {
      setResults([]);

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
                `/api/club-nation/search-player?q=${encodeURIComponent(
                  query,
                )}`,
                {
                  cache:
                    "no-store",

                  signal:
                    controller.signal,
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

            setResults(
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
              "Oyuncu arama hatası:",
              error,
            );

            setResults([]);

            setSearchOpen(
              false,
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

      controller.abort();
    };
  }, [
    gameFinished,
    gameStarted,
    input,
    selectedPlayer,
  ]);

  /* =======================================================
     SELECT PLAYER
  ======================================================= */

  function choosePlayer(
    player: PlayerSearchItem,
  ) {
    setSelectedPlayer(
      player,
    );

    setInput(
      player.name,
    );

    setResults([]);

    setSearchOpen(
      false,
    );

    inputRef.current
      ?.focus();
  }

  /* =======================================================
     ANSWER
  ======================================================= */

  async function submitAnswer(
    event?: FormEvent,
  ) {
    event?.preventDefault();

    if (
      !session ||
      !gameStarted ||
      gameFinished ||
      submitting
    ) {
      return;
    }

    const answer =
      input.trim();

    if (
      !selectedPlayer &&
      answer.length <
        MINIMUM_SEARCH_LENGTH
    ) {
      setFeedbackType(
        "wrong",
      );

      setMessage(
        "En az 3 harf yaz.",
      );

      return;
    }

    try {
      setSubmitting(
        true,
      );

      const response =
        await fetch(
          "/api/club-nation/answer",
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
                  session.id,

                playerId:
                  selectedPlayer
                    ?.playerId ??
                  null,

                answer,
              }),
          },
        );

      const result =
        (await response.json()) as AnswerResponse;

      if (
        result.ambiguous &&
        result.players
      ) {
        setResults(
          result.players,
        );

        setSearchOpen(
          true,
        );

        setFeedbackType(
          "neutral",
        );

        setMessage(
          result.error ??
            "Birden fazla oyuncu bulundu. Listeden seç.",
        );

        return;
      }

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
        result.completed
      ) {
        setScore(
          Number(
            result.score ??
              score,
          ),
        );

        setCorrectCount(
          Number(
            result.correctCount ??
              correctCount,
          ),
        );

        setWrongCount(
          Number(
            result.wrongCount ??
              wrongCount,
          ),
        );

        setPassesLeft(
          Number(
            result.passesLeft ??
              passesLeft,
          ),
        );

        setGameFinished(
          true,
        );

        setGameStarted(
          false,
        );

        setTimeLeft(
          0,
        );

        setMessage(
          result.message ??
            "Süre doldu!",
        );

        void trackGameCompleted(
          GAME_NAMES.CLUB_NATION,
          session?.id ??
            null,
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

      setScore(
        Number(
          result.score ??
            score,
        ),
      );

      setCorrectCount(
        Number(
          result.correctCount ??
            correctCount,
        ),
      );

      setWrongCount(
        Number(
          result.wrongCount ??
            wrongCount,
        ),
      );

      setPassesLeft(
        Number(
          result.passesLeft ??
            passesLeft,
        ),
      );

      if (
        result.questionNo
      ) {
        setQuestionNo(
          result.questionNo,
        );
      }

      if (
        typeof result
          .secondsLeft ===
        "number"
      ) {
        setTimeLeft(
          result.secondsLeft,
        );
      }

      if (
        result.correct
      ) {
        setFeedbackType(
          "correct",
        );

        setMessage(
          result.message ??
            "Doğru! +20 puan",
        );

        if (
          result.question
        ) {
          setQuestion(
            result.question,
          );
        }

        resetAnswerInput();
      } else {
        setFeedbackType(
          "wrong",
        );

        setMessage(
          result.message ??
            "Yanlış. Aynı soruda devam.",
        );

        setSelectedPlayer(
          null,
        );

        setInput("");

        setResults([]);

        setSearchOpen(
          false,
        );

        window.setTimeout(
          () =>
            inputRef.current
              ?.focus(),
          50,
        );
      }
    } catch (
      error
    ) {
      console.error(
        "Cevap gönderme hatası:",
        error,
      );

      setFeedbackType(
        "wrong",
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Cevap gönderilemedi.",
      );
    } finally {
      setSubmitting(
        false,
      );
    }
  }

  /* =======================================================
     PASS
  ======================================================= */

  async function passQuestion() {
    if (
      !session ||
      !gameStarted ||
      gameFinished ||
      passing ||
      passesLeft <=
        0
    ) {
      return;
    }

    try {
      setPassing(
        true,
      );

      const response =
        await fetch(
          "/api/club-nation/pass",
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
                  session.id,
              }),
          },
        );

      const result =
        (await response.json()) as PassResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
            "Pas kullanılamadı.",
        );
      }

      if (
        result.completed
      ) {
        setGameStarted(
          false,
        );

        setGameFinished(
          true,
        );

        setTimeLeft(
          0,
        );

        setScore(
          Number(
            result.score ??
              score,
          ),
        );

        setCorrectCount(
          Number(
            result.correctCount ??
              correctCount,
          ),
        );

        setWrongCount(
          Number(
            result.wrongCount ??
              wrongCount,
          ),
        );

        setPassesLeft(
          Number(
            result.passesLeft ??
              0,
          ),
        );

        setMessage(
          result.message ??
            "Süre doldu!",
        );

        return;
      }

      if (
        result.question
      ) {
        setQuestion(
          result.question,
        );
      }

      setPassesLeft(
        Number(
          result.passesLeft ??
            passesLeft,
        ),
      );

      setScore(
        Number(
          result.score ??
            score,
        ),
      );

      setCorrectCount(
        Number(
          result.correctCount ??
            correctCount,
        ),
      );

      setWrongCount(
        Number(
          result.wrongCount ??
            wrongCount,
        ),
      );

      if (
        result.questionNo
      ) {
        setQuestionNo(
          result.questionNo,
        );
      }

      if (
        typeof result
          .secondsLeft ===
        "number"
      ) {
        setTimeLeft(
          result.secondsLeft,
        );
      }

      setFeedbackType(
        "neutral",
      );

      setMessage(
        result.message ??
          "Pas geçildi.",
      );

      resetAnswerInput();
    } catch (
      error
    ) {
      console.error(
        "Pas hatası:",
        error,
      );

      setFeedbackType(
        "wrong",
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Pas kullanılamadı.",
      );
    } finally {
      setPassing(
        false,
      );
    }
  }

  /* =======================================================
     TIME DISPLAY
  ======================================================= */

  const minutes =
    Math.floor(
      timeLeft /
        60,
    );

  const seconds =
    timeLeft %
    60;

  const formattedTime =
    `${minutes}:${String(
      seconds,
    ).padStart(
      2,
      "0",
    )}`;

  /* =======================================================
     START SCREEN
  ======================================================= */

  if (
    !gameStarted &&
    !gameFinished
  ) {
    return (
      <main className="min-h-screen bg-[#07111f] px-4 py-6 text-white sm:py-10">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-white">← Ana Sayfa</Link>
          <div className="flex min-h-[68vh] items-center justify-center">
          <div className="w-full rounded-3xl border border-white/10 bg-[#101c2c] p-6 text-center shadow-2xl sm:p-10">
            <div className="mb-3 text-5xl">
              🌍
            </div>

            <h1 className="text-3xl font-black sm:text-5xl">
              1 Takım 1 Millet
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
              Verilen takım ve
              milliyete uyan
              futbolcuyu bul.
              120 saniyede
              yapabildiğin kadar
              doğru yap.
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
                <div className="text-2xl font-black">
                  +20
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  doğru başına
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0c1828] p-4">
                <div className="text-2xl font-black">
                  3
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  pas hakkı
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={() =>
                void startGame()
              }
              className="mt-8 w-full rounded-2xl bg-green-500 px-6 py-4 text-base font-black text-[#07111f] transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Hazırlanıyor..."
                : "Oyuna Başla"}
            </button>

            <p className="mt-4 text-sm text-slate-500">
              {message}
            </p>
          </div>
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     RESULT SCREEN
  ======================================================= */

  if (
    gameFinished
  ) {
    return (
      <main className="min-h-screen bg-[#07111f] px-4 py-6 text-white sm:py-10">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-white">← Ana Sayfa</Link>
          <div className="flex min-h-[68vh] items-center justify-center">
          <div className="w-full rounded-3xl border border-white/10 bg-[#101c2c] p-6 text-center shadow-2xl sm:p-10">
            <div className="text-5xl">
              🏁
            </div>

            <h1 className="mt-4 text-3xl font-black sm:text-5xl">
              Süre Bitti
            </h1>

            <div className="mt-8 text-6xl font-black">
              {score}
            </div>

            <div className="mt-1 text-sm text-slate-500">
              PUAN
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/10 bg-[#0c1828] p-4">
                <div className="text-2xl font-black text-emerald-400">
                  {correctCount}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Doğru
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0c1828] p-4">
                <div className="text-2xl font-black text-red-400">
                  {wrongCount}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Yanlış
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0c1828] p-4">
                <div className="text-2xl font-black">
                  {3 -
                    passesLeft}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Pas
                </div>
              </div>
            </div>

            <p className="mt-6 text-sm text-slate-400">
              {message}
            </p>

            <button
              type="button"
              disabled={loading}
              onClick={() =>
                void startGame()
              }
              className="mt-8 w-full rounded-2xl bg-green-500 px-6 py-4 font-black text-[#07111f] transition hover:bg-green-400 disabled:opacity-50"
            >
              Tekrar Oyna
            </button>
          </div>
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     GAME SCREEN
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-6 text-white sm:py-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-white">← Ana Sayfa</Link>

        {/* HEADER */}

        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              1 Takım 1 Millet
            </div>

            <div className="mt-1 text-sm text-slate-400">
              Soru {questionNo}
            </div>
          </div>

          <div
            className={`rounded-2xl border px-5 py-3 text-2xl font-black ${
              timeLeft <=
              15
                ? "border-red-500/40 bg-red-500/10 text-red-400"
                : "border-white/10 bg-white/5"
            }`}
          >
            {formattedTime}
          </div>
        </div>

        {/* STATS */}

        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-xs text-slate-500">
              Puan
            </div>

            <div className="mt-1 text-2xl font-black">
              {score}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-xs text-slate-500">
              Doğru
            </div>

            <div className="mt-1 text-2xl font-black text-emerald-400">
              {correctCount}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-xs text-slate-500">
              Pas
            </div>

            <div className="mt-1 text-2xl font-black">
              {passesLeft}
            </div>
          </div>
        </div>

        {/* QUESTION */}

        <div className="rounded-3xl border border-white/10 bg-[#101c2c] p-5 shadow-2xl sm:p-8">
          <div className="text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            Bu iki koşulu sağlayan
            futbolcuyu bul
          </div>

          <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="min-w-0 rounded-2xl border border-white/10 bg-[#0b1726] px-3 py-6 text-center sm:px-5">
              <div className="text-xs text-slate-500">
                TAKIM
              </div>

              <div className="mt-2 break-words text-lg font-black sm:text-2xl">
                {question
                  ?.club ??
                  "-"}
              </div>
            </div>

            <div className="text-2xl font-black text-slate-600">
              +
            </div>

            <div className="min-w-0 rounded-2xl border border-white/10 bg-[#0b1726] px-3 py-6 text-center sm:px-5">
              <div className="text-xs text-slate-500">
                MİLLET
              </div>

              <div className="mt-2 break-words text-lg font-black sm:text-2xl">
                {question
                  ?.nationality ??
                  "-"}
              </div>
            </div>
          </div>

          {/* ANSWER */}

          <form
            onSubmit={
              submitAnswer
            }
            className="mt-7"
          >
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                disabled={
                  submitting ||
                  passing
                }
                autoComplete="off"
                placeholder="Futbolcu yaz... örn: mes"
                onChange={(
                  event,
                ) => {
                  setInput(
                    event.target
                      .value,
                  );

                  setSelectedPlayer(
                    null,
                  );
                }}
                onFocus={() => {
                  if (
                    results.length >
                    0
                  ) {
                    setSearchOpen(
                      true,
                    );
                  }
                }}
                className="w-full rounded-2xl border border-white/10 bg-[#07111f] px-5 py-4 pr-14 text-base font-semibold outline-none transition placeholder:text-slate-600 focus:border-purple-400/50"
              />

              {searchLoading && (
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                  ...
                </div>
              )}

              {/* SEARCH RESULTS */}

              {searchOpen &&
                results.length >
                  0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1726] p-2 shadow-2xl">
                    {results.map(
                      (
                        player,
                      ) => (
                        <button
                          key={
                            player.playerId
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
                              // eslint-disable-next-line @next/next/no-img-element
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

                          <div className="min-w-0">
                            <div className="truncate font-bold">
                              {
                                player.name
                              }
                            </div>

                            <div className="truncate text-xs text-slate-500">
                              {player.nationality ??
                                "Milliyet yok"}

                              {player.currentClubName
                                ? ` • ${player.currentClubName}`
                                : ""}
                            </div>
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                )}
            </div>

            <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
              <button
                type="submit"
                disabled={
                  submitting ||
                  passing ||
                  input.trim()
                    .length <
                    MINIMUM_SEARCH_LENGTH
                }
                className="rounded-2xl bg-green-500 px-5 py-4 font-black text-[#07111f] transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting
                  ? "Kontrol..."
                  : "Cevapla"}
              </button>

              <button
                type="button"
                disabled={
                  passing ||
                  submitting ||
                  passesLeft <=
                    0
                }
                onClick={() =>
                  void passQuestion()
                }
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 font-black transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {passing
                  ? "..."
                  : `Pas (${passesLeft})`}
              </button>
            </div>
          </form>

          {/* MESSAGE */}

          <div
            className={`mt-5 rounded-2xl border px-4 py-3 text-center text-sm font-semibold ${
              feedbackType ===
              "correct"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : feedbackType ===
                    "wrong"
                  ? "border-red-500/30 bg-red-500/10 text-red-300"
                  : "border-white/10 bg-white/[0.03] text-slate-400"
            }`}
          >
            {message}
          </div>
        </div>

        <div className="mt-5 text-center text-xs text-slate-600">
          Her doğru cevap +20 puan.
          Süre devam ederken 3 kez
          pas geçebilirsin.
        </div>

        {/* SEO CONTENT */}

        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left">
          <h2 className="text-xl font-black text-white">
            Takım ve Milliyet Oyunu
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-300">
            FootBattle 1 Takım 1 Millet oyununda verilen takım ve
            milliyet kombinasyonuna uygun futbolcuyu bulmaya çalış.
            120 saniye içinde mümkün olduğunca çok doğru cevap ver
            ve en yüksek skoru yap.
          </p>

          <h3 className="mt-5 text-lg font-bold text-white">
            Club and Nation Football Quiz
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Find football players who match both the club and
            nationality requirements. Test your football knowledge,
            score points and try to beat your best result.
          </p>

          <h3 className="mt-5 text-lg font-bold text-white">
            Nasıl Oynanır?
          </h3>

          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-400">
            <li>Verilen takımı incele.</li>
            <li>Gösterilen milliyeti kontrol et.</li>
            <li>Her iki koşulu da sağlayan futbolcuyu bul.</li>
            <li>Her doğru cevapta +20 puan kazan.</li>
            <li>120 saniye boyunca mümkün olduğunca çok doğru yap.</li>
            <li>Toplam 3 pas hakkını gerektiğinde kullan.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}