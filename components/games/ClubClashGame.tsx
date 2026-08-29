"use client";

import Link from "next/link";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/* =========================================================
   TYPES
========================================================= */

type Round = {
  id?: number;

  roundNo: number;

  leftClub: string;
  rightClub: string;
};

type StartResponse = {
  ok?: boolean;

  sessionId?: string;

  score?: number;

  scorePerCorrect?: number;

  durationSeconds?: number;

  maxPasses?: number;

  usedPasses?: number;

  remainingPasses?: number;

  totalPreparedRounds?: number;

  round?: Round;

  error?: string;
};

type SearchPlayer = {
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

type SearchResponse = {
  ok?: boolean;

  minimumSearchLength?: number;

  players?: SearchPlayer[];

  error?: string;
};

type AnswerResponse = {
  ok?: boolean;

  correct?: boolean;

  completed?: boolean;

  reason?: string;

  score?: number;

  scoreDelta?: number;

  remainingSeconds?: number;

  remainingPasses?: number;

  attemptCount?: number;

  correctPlayerId?: number;

  correctPlayerName?:
    | string
    | null;

  round?: Round;

  nextRound?:
    | Round
    | null;

  error?: string;
};

type PassResponse = {
  ok?: boolean;

  passed?: boolean;

  completed?: boolean;

  reason?: string;

  score?: number;

  remainingSeconds?: number;

  usedPasses?: number;

  remainingPasses?: number;

  nextRound?:
    | Round
    | null;

  error?: string;
};

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
    safe % 60;

  return `${minutes}:${String(
    secs,
  ).padStart(
    2,
    "0",
  )}`;
}

/* =========================================================
   PAGE
========================================================= */

export default function ClubClashPage() {
  /* =======================================================
     GAME STATE
  ======================================================= */

  const [
    sessionId,
    setSessionId,
  ] =
    useState("");

  const [
    round,
    setRound,
  ] =
    useState<
      Round | null
    >(null);

  const [
    score,
    setScore,
  ] =
    useState(0);

  const [
    scorePerCorrect,
    setScorePerCorrect,
  ] =
    useState(20);

  const [
    remainingSeconds,
    setRemainingSeconds,
  ] =
    useState(120);

  const [
    remainingPasses,
    setRemainingPasses,
  ] =
    useState(3);

  const [
    maxPasses,
    setMaxPasses,
  ] =
    useState(3);

  const [
    completed,
    setCompleted,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState("");

  /* =======================================================
     SEARCH
  ======================================================= */

  const [
    query,
    setQuery,
  ] =
    useState("");

  const [
    suggestions,
    setSuggestions,
  ] =
    useState<
      SearchPlayer[]
    >([]);

  const [
    searchLoading,
    setSearchLoading,
  ] =
    useState(false);

  const [
    selectedPlayer,
    setSelectedPlayer,
  ] =
    useState<
      SearchPlayer | null
    >(null);

  /* =======================================================
     RESULT
  ======================================================= */

  const [
    correctCount,
    setCorrectCount,
  ] =
    useState(0);

  const [
    lastCorrectPlayer,
    setLastCorrectPlayer,
  ] =
    useState<
      string | null
    >(null);

  const [
    gameStartedAt,
    setGameStartedAt,
  ] =
    useState<
      number | null
    >(null);

  const timerRef =
    useRef<
      ReturnType<
        typeof setInterval
      > | null
    >(null);

  /* =======================================================
     DERIVED
  ======================================================= */

  const usedPasses =
    Math.max(
      0,
      maxPasses -
        remainingPasses,
    );

  const passDots =
    useMemo(
      () =>
        Array.from(
          {
            length:
              maxPasses,
          },
          (
            _,
            index,
          ) =>
            index <
            remainingPasses,
        ),
      [
        maxPasses,
        remainingPasses,
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

          setError(
            "",
          );

          setMessage(
            "",
          );

          setCompleted(
            false,
          );

          setSelectedPlayer(
            null,
          );

          setSuggestions(
            [],
          );

          setQuery(
            "",
          );

          setCorrectCount(
            0,
          );

          setLastCorrectPlayer(
            null,
          );

          const response =
            await fetch(
              "/api/club-clash/start",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },
              },
            );

          const json =
            (
              await response.json()
            ) as StartResponse;

          if (
            !response.ok ||
            !json.ok ||
            !json.sessionId ||
            !json.round
          ) {
            throw new Error(
              json.error ??
                "Oyun hazırlanamadı.",
            );
          }

          setSessionId(
            json.sessionId,
          );

          setRound(
            json.round,
          );

          setScore(
            Number(
              json.score ??
                0,
            ),
          );

          setScorePerCorrect(
            Number(
              json.scorePerCorrect ??
                20,
            ),
          );

          setRemainingSeconds(
            Number(
              json.durationSeconds ??
                120,
            ),
          );

          setMaxPasses(
            Number(
              json.maxPasses ??
                3,
            ),
          );

          setRemainingPasses(
            Number(
              json.remainingPasses ??
                3,
            ),
          );

          setGameStartedAt(
            Date.now(),
          );
        } catch (
          startError
        ) {
          setError(
            startError instanceof Error
              ? startError.message
              : "Oyun hazırlanamadı.",
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [],
    );

  useEffect(
    () => {
      void startGame();
    },
    [
      startGame,
    ],
  );

  /* =======================================================
     TIMER
  ======================================================= */

  useEffect(
    () => {
      if (
        loading ||
        completed ||
        !sessionId ||
        !gameStartedAt
      ) {
        return;
      }

      timerRef.current =
        setInterval(
          () => {
            setRemainingSeconds(
              (
                current,
              ) => {
                if (
                  current <=
                  1
                ) {
                  if (
                    timerRef.current
                  ) {
                    clearInterval(
                      timerRef.current,
                    );

                    timerRef.current =
                      null;
                  }

                  setCompleted(
                    true,
                  );

                  setMessage(
                    "Süre doldu!",
                  );

                  return 0;
                }

                return (
                  current -
                  1
                );
              },
            );
          },
          1000,
        );

      return () => {
        if (
          timerRef.current
        ) {
          clearInterval(
            timerRef.current,
          );

          timerRef.current =
            null;
        }
      };
    },
    [
      loading,
      completed,
      sessionId,
      gameStartedAt,
    ],
  );

  /* =======================================================
     SEARCH
  ======================================================= */

  useEffect(
    () => {
      if (
        completed ||
        actionLoading
      ) {
        setSuggestions(
          [],
        );

        return;
      }

      const trimmed =
        query.trim();

      if (
        trimmed.length <
        2
      ) {
        setSuggestions(
          [],
        );

        return;
      }

      let cancelled =
        false;

      const timeout =
        setTimeout(
          async () => {
            try {
              setSearchLoading(
                true,
              );

              const response =
                await fetch(
                  `/api/club-clash/search-player?q=${encodeURIComponent(
                    trimmed,
                  )}`,
                  {
                    cache:
                      "no-store",
                  },
                );

              const json =
                (
                  await response.json()
                ) as SearchResponse;

              if (
                cancelled
              ) {
                return;
              }

              if (
                !response.ok ||
                !json.ok
              ) {
                setSuggestions(
                  [],
                );

                return;
              }

              setSuggestions(
                json.players ??
                  [],
              );
            } catch {
              if (
                !cancelled
              ) {
                setSuggestions(
                  [],
                );
              }
            } finally {
              if (
                !cancelled
              ) {
                setSearchLoading(
                  false,
                );
              }
            }
          },
          220,
        );

      return () => {
        cancelled =
          true;

        clearTimeout(
          timeout,
        );
      };
    },
    [
      query,
      completed,
      actionLoading,
    ],
  );

  /* =======================================================
     SELECT PLAYER
  ======================================================= */

  function choosePlayer(
    player: SearchPlayer,
  ) {
    setSelectedPlayer(
      player,
    );

    setQuery(
      player.name,
    );

    setSuggestions(
      [],
    );

    setMessage(
      "",
    );

    setError(
      "",
    );
  }

  /* =======================================================
     ANSWER
  ======================================================= */

  async function submitAnswer() {
    if (
      actionLoading ||
      completed ||
      !sessionId ||
      !selectedPlayer
    ) {
      return;
    }

    try {
      setActionLoading(
        true,
      );

      setError(
        "",
      );

      setMessage(
        "",
      );

      const response =
        await fetch(
          "/api/club-clash/answer",
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

                playerId:
                  selectedPlayer.id,
              }),
          },
        );

      const json =
        (
          await response.json()
        ) as AnswerResponse;

      if (
        !response.ok ||
        !json.ok
      ) {
        throw new Error(
          json.error ??
            "Cevap kontrol edilemedi.",
        );
      }

      if (
        typeof json.score ===
        "number"
      ) {
        setScore(
          json.score,
        );
      }

      if (
        typeof json.remainingSeconds ===
        "number"
      ) {
        setRemainingSeconds(
          json.remainingSeconds,
        );
      }

      if (
        typeof json.remainingPasses ===
        "number"
      ) {
        setRemainingPasses(
          json.remainingPasses,
        );
      }

      if (
        json.correct
      ) {
        setCorrectCount(
          (
            current,
          ) =>
            current +
            1,
        );

        setLastCorrectPlayer(
          json.correctPlayerName ??
            selectedPlayer.name,
        );

        setMessage(
          `Doğru! +${json.scoreDelta ?? scorePerCorrect} puan`,
        );

        setSelectedPlayer(
          null,
        );

        setQuery(
          "",
        );

        setSuggestions(
          [],
        );

        if (
          json.completed
        ) {
          setCompleted(
            true,
          );

          return;
        }

        if (
          json.nextRound
        ) {
          setRound(
            json.nextRound,
          );
        }

        return;
      }

      setMessage(
        "Olmadı, başka bir oyuncu dene.",
      );

      setSelectedPlayer(
        null,
      );

      setQuery(
        "",
      );

      setSuggestions(
        [],
      );
    } catch (
      answerError
    ) {
      setError(
        answerError instanceof Error
          ? answerError.message
          : "Cevap kontrol edilemedi.",
      );
    } finally {
      setActionLoading(
        false,
      );
    }
  }

  /* =======================================================
     PASS
  ======================================================= */

  async function passRound() {
    if (
      actionLoading ||
      completed ||
      !sessionId ||
      remainingPasses <=
        0
    ) {
      return;
    }

    try {
      setActionLoading(
        true,
      );

      setError(
        "",
      );

      setMessage(
        "",
      );

      const response =
        await fetch(
          "/api/club-clash/pass",
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

      const json =
        (
          await response.json()
        ) as PassResponse;

      if (
        !response.ok ||
        !json.ok
      ) {
        throw new Error(
          json.error ??
            "Pas kullanılamadı.",
        );
      }

      if (
        typeof json.score ===
        "number"
      ) {
        setScore(
          json.score,
        );
      }

      if (
        typeof json.remainingSeconds ===
        "number"
      ) {
        setRemainingSeconds(
          json.remainingSeconds,
        );
      }

      if (
        typeof json.remainingPasses ===
        "number"
      ) {
        setRemainingPasses(
          json.remainingPasses,
        );
      }

      setSelectedPlayer(
        null,
      );

      setQuery(
        "",
      );

      setSuggestions(
        [],
      );

      setMessage(
        "Pas geçildi.",
      );

      if (
        json.completed
      ) {
        setCompleted(
          true,
        );

        return;
      }

      if (
        json.nextRound
      ) {
        setRound(
          json.nextRound,
        );
      }
    } catch (
      passError
    ) {
      setError(
        passError instanceof Error
          ? passError.message
          : "Pas kullanılamadı.",
      );
    } finally {
      setActionLoading(
        false,
      );
    }
  }

  /* =======================================================
     KEYBOARD ENTER
  ======================================================= */

  function handleKeyDown(
    event:
      React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (
      event.key ===
        "Enter" &&
      selectedPlayer
    ) {
      event.preventDefault();

      void submitAnswer();
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading
  ) {
    return (
      <main className="min-h-screen bg-[#070b14] px-4 py-8 text-white">
        <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-emerald-400" />

            <h1 className="text-2xl font-black">
              2 Takım 1 Oyuncu
            </h1>

            <p className="mt-2 text-sm text-white/55">
              Oyuncular ve takım eşleşmeleri hazırlanıyor...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     START ERROR
  ======================================================= */

  if (
    !sessionId ||
    !round
  ) {
    return (
      <main className="min-h-screen bg-[#070b14] px-4 py-8 text-white">
        <div className="mx-auto max-w-xl">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <h1 className="text-2xl font-black">
              Oyun hazırlanamadı
            </h1>

            <p className="mt-3 text-sm text-red-100/80">
              {error ||
                "Beklenmeyen bir hata oluştu."}
            </p>

            <button
              type="button"
              onClick={() =>
                void startGame()
              }
              className="mt-5 rounded-xl bg-white px-5 py-3 font-black text-black transition hover:scale-[1.02]"
            >
              Tekrar Dene
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <div className="mx-auto w-full max-w-5xl px-4 pb-12 pt-5 sm:px-6">
        {/* =================================================
            TOP BAR
        ================================================= */}

        <div className="mb-5 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold text-white/70 transition hover:bg-white/[0.08] hover:text-white"
          >
            ← Ana Sayfa
          </Link>

          <div className="text-right">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">
              FootBattle
            </div>

            <div className="text-xs text-white/40">
              Solo Challenge
            </div>
          </div>
        </div>

        {/* =================================================
            TITLE
        ================================================= */}

        <div className="mb-6 text-center">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            2 Takım 1 Oyuncu
          </h1>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/55">
            İki takımda da forma giymiş oyuncuyu bul.
            Her doğru cevap{" "}
            <span className="font-black text-emerald-400">
              +{scorePerCorrect}
            </span>{" "}
            puan.
          </p>
        </div>

        {/* =================================================
            STATS
        ================================================= */}

        <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
              Süre
            </div>

            <div
              className={`mt-1 text-xl font-black sm:text-2xl ${
                remainingSeconds <=
                20
                  ? "text-red-400"
                  : "text-white"
              }`}
            >
              {formatTime(
                remainingSeconds,
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3 text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300/60">
              Skor
            </div>

            <div className="mt-1 text-xl font-black text-emerald-400 sm:text-2xl">
              {score}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/40">
              Doğru
            </div>

            <div className="mt-1 text-xl font-black sm:text-2xl">
              {correctCount}
            </div>
          </div>
        </div>

        {/* =================================================
            GAME CARD
        ================================================= */}

        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/30">
          <div className="border-b border-white/10 px-4 py-4 text-center sm:px-6">
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-black text-white/50">
              ROUND {round.roundNo}
            </span>
          </div>

          {/* ===============================================
              CLUBS
          =============================================== */}

          <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-4 sm:p-6">
            <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-5 text-center">
              <div>
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                  Takım 1
                </div>

                <div className="text-xl font-black leading-tight sm:text-2xl">
                  {round.leftClub}
                </div>
              </div>
            </div>

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10 text-lg font-black text-emerald-400">
              +
            </div>

            <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-5 text-center">
              <div>
                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
                  Takım 2
                </div>

                <div className="text-xl font-black leading-tight sm:text-2xl">
                  {round.rightClub}
                </div>
              </div>
            </div>
          </div>

          {/* ===============================================
              PASSES
          =============================================== */}

          <div className="border-t border-white/10 px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/45">
                Pas Hakkı
              </span>

              <div className="flex gap-2">
                {passDots.map(
                  (
                    active,
                    index,
                  ) => (
                    <span
                      key={index}
                      className={`h-2.5 w-2.5 rounded-full ${
                        active
                          ? "bg-amber-400"
                          : "bg-white/10"
                      }`}
                    />
                  ),
                )}
              </div>
            </div>
          </div>

          {/* ===============================================
              SEARCH
          =============================================== */}

          <div className="border-t border-white/10 p-4 sm:p-6">
            <div className="mx-auto max-w-xl">
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-white/45">
                Oyuncuyu bul
              </label>

              <div className="relative">
                <input
                  value={
                    query
                  }
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
                  onKeyDown={
                    handleKeyDown
                  }
                  disabled={
                    completed ||
                    actionLoading
                  }
                  placeholder="Oyuncu adı yaz..."
                  autoComplete="off"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-4 pr-12 text-base font-bold text-white outline-none transition placeholder:text-white/25 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10 disabled:opacity-50"
                />

                {searchLoading && (
                  <div className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
                )}

                {/* =========================================
                    AUTOCOMPLETE
                ========================================= */}

                {suggestions.length >
                  0 && (
                  <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#111827] p-2 shadow-2xl shadow-black/60">
                    {suggestions.map(
                      (
                        player,
                      ) => (
                        <button
                          key={
                            player.id
                          }
                          type="button"
                          onClick={() =>
                            choosePlayer(
                              player,
                            )
                          }
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.07]"
                        >
                          {player.imageUrl ? (
                            <img
                              src={
                                player.imageUrl
                              }
                              alt=""
                              className="h-10 w-10 rounded-full bg-white/5 object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-sm font-black text-white/40">
                              ⚽
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-black">
                              {
                                player.name
                              }
                            </div>

                            <div className="mt-0.5 truncate text-xs text-white/40">
                              {[
                                player.nationality,
                                player.currentClubName,
                              ]
                                .filter(
                                  Boolean,
                                )
                                .join(
                                  " · ",
                                )}
                            </div>
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>

              {/* ===========================================
                  SELECTED
              =========================================== */}

              {selectedPlayer && (
                <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                  <div className="text-xs font-bold text-emerald-300/60">
                    Seçilen oyuncu
                  </div>

                  <div className="mt-1 font-black text-emerald-300">
                    {
                      selectedPlayer.name
                    }
                  </div>
                </div>
              )}

              {/* ===========================================
                  MESSAGE
              =========================================== */}

              {message && (
                <div
                  className={`mt-3 rounded-xl px-4 py-3 text-center text-sm font-black ${
                    message.startsWith(
                      "Doğru",
                    )
                      ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                      : "border border-white/10 bg-white/[0.04] text-white/70"
                  }`}
                >
                  {message}
                </div>
              )}

              {error && (
                <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm font-bold text-red-300">
                  {error}
                </div>
              )}

              {/* ===========================================
                  ACTIONS
              =========================================== */}

              <div className="mt-4 grid grid-cols-[1fr_auto] gap-3">
                <button
                  type="button"
                  onClick={() =>
                    void submitAnswer()
                  }
                  disabled={
                    completed ||
                    actionLoading ||
                    !selectedPlayer
                  }
                  className="rounded-2xl bg-emerald-400 px-4 py-4 text-base font-black text-black transition hover:scale-[1.01] hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
                >
                  {actionLoading
                    ? "Kontrol ediliyor..."
                    : "Kontrol Et"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void passRound()
                  }
                  disabled={
                    completed ||
                    actionLoading ||
                    remainingPasses <=
                      0
                  }
                  className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-5 py-4 font-black text-amber-300 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Pas (
                  {
                    remainingPasses
                  }
                  )
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            LAST CORRECT
        ================================================= */}

        {lastCorrectPlayer &&
          !completed && (
            <div className="mt-4 text-center text-xs text-white/35">
              Son doğru:{" "}
              <span className="font-bold text-white/60">
                {
                  lastCorrectPlayer
                }
              </span>
            </div>
          )}

        {/* =================================================
            RESULT OVERLAY / CARD
        ================================================= */}

        {completed && (
          <div className="mt-6 rounded-[28px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/15 to-white/[0.03] p-6 text-center sm:p-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400 text-3xl text-black">
              ⚽
            </div>

            <div className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
              Maç Bitti
            </div>

            <h2 className="mt-2 text-3xl font-black">
              {score} Puan
            </h2>

            <p className="mt-2 text-sm text-white/50">
              {
                correctCount
              }{" "}
              oyuncu bildin ·{" "}
              {
                usedPasses
              }{" "}
              pas kullandın
            </p>

            <div className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  void startGame()
                }
                className="rounded-2xl bg-emerald-400 px-4 py-4 font-black text-black transition hover:bg-emerald-300"
              >
                Tekrar Oyna
              </button>

              <Link
                href="/"
                className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 font-black text-white transition hover:bg-white/[0.1]"
              >
                Ana Sayfa
              </Link>
            </div>
          </div>
        )}

        {/* =================================================
            FOOTER NOTE
        ================================================= */}

        {!completed && (
          <div className="mt-6 text-center text-xs leading-5 text-white/30">
            120 saniyede mümkün olduğunca çok ortak oyuncu bul.
            <br />
            Yanlış cevap puan götürmez.
          </div>
        )}
      </div>
    </main>
  );
}