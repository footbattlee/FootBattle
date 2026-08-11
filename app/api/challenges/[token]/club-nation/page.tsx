"use client";

import Link from "next/link";

import {
  FormEvent,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/* =========================================================
   TYPES
========================================================= */

type Role =
  | "challenger"
  | "opponent";

type PlayerItem = {
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

type RoundSide = {
  type: string;

  value: string;
};

type RoundAnswer = {
  answer:
    | string
    | null;

  playerId:
    | number
    | null;

  answeredAt:
    | string
    | null;
};

type RoundState = {
  id: number;

  roundNo: number;

  left: RoundSide;

  right: RoundSide;

  winnerSide:
    | "challenger"
    | "opponent"
    | null;

  completed: boolean;

  completedAt:
    | string
    | null;

  challenger: RoundAnswer;

  opponent: RoundAnswer;
};

type StateResponse = {
  ok: boolean;

  error?: string;

  role?: Role;

  game?: {
    code: string;

    label: string;

    roundCount: number;

    winScore: number;
  };

  challenge?: {
    id: number;

    status: string;

    prepared: boolean;

    readyToPlay: boolean;

    completed: boolean;

    winnerSide:
      | "challenger"
      | "opponent"
      | null;

    createdAt:
      | string
      | null;

    updatedAt:
      | string
      | null;

    completedAt:
      | string
      | null;
  };

  score?: {
    challenger: number;

    opponent: number;
  };

  progress?: {
    completedRounds: number;

    totalRounds: number;

    remainingRounds: number;
  };

  currentRound:
    | RoundState
    | null;

  myCurrentAnswer?:
    | RoundAnswer
    | null;

  opponentCurrentAnswer?:
    | RoundAnswer
    | null;

  rounds?: RoundState[];
};

type PrepareResponse = {
  ok: boolean;

  error?: string;

  role?: Role;

  alreadyPrepared?: boolean;

  roundCount?: number;
};

type AnswerResponse = {
  ok: boolean;

  error?: string;

  ambiguous?: boolean;

  players?: PlayerItem[];

  correct?: boolean;

  wonRound?: boolean;

  roundCompleted?: boolean;

  challengeCompleted?: boolean;

  winnerSide?:
    | "challenger"
    | "opponent"
    | null;

  score?: {
    challenger: number;

    opponent: number;
  };

  message?: string;
};

type SearchResponse = {
  ok: boolean;

  error?: string;

  players?: PlayerItem[];
};

type ForfeitResponse = {
  ok: boolean;

  error?: string;

  forfeited?: boolean;

  alreadyCompleted?: boolean;

  winnerSide?:
    | "challenger"
    | "opponent"
    | null;

  result?:
    | "won"
    | "lost";

  score?: {
    challenger: number;

    opponent: number;
  };

  message?: string;
};

/* =========================================================
   SETTINGS
========================================================= */

const POLL_INTERVAL_MS =
  1000;

const MINIMUM_SEARCH_LENGTH =
  3;

/* =========================================================
   PAGE
========================================================= */

export default function ClubNationDuelPage({
  params,
}: {
  params: Promise<{
    token: string;
  }>;
}) {
  const {
    token,
  } =
    use(params);

  /* =======================================================
     GAME STATE
  ======================================================= */

  const [
    state,
    setState,
  ] =
    useState<StateResponse | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    preparing,
    setPreparing,
  ] =
    useState(false);

  const [
    pageError,
    setPageError,
  ] =
    useState("");

  const prepareCalledRef =
    useRef(false);

  /* =======================================================
     ANSWER
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
    useState<PlayerItem | null>(
      null,
    );

  const [
    searchResults,
    setSearchResults,
  ] =
    useState<PlayerItem[]>(
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

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState(
      "Rakibinden önce doğru oyuncuyu bul.",
    );

  const [
    messageType,
    setMessageType,
  ] =
    useState<
      | "neutral"
      | "correct"
      | "wrong"
    >(
      "neutral",
    );

  const inputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const previousRoundIdRef =
    useRef<number | null>(
      null,
    );

  /* =======================================================
     FORFEIT
  ======================================================= */

  const [
    forfeiting,
    setForfeiting,
  ] =
    useState(false);

  /* =======================================================
     LOAD STATE
  ======================================================= */

  const loadState =
    useCallback(
      async (
        silent =
          false,
      ) => {
        try {
          if (
            !silent
          ) {
            setLoading(
              true,
            );
          }

          const response =
            await fetch(
              `/api/challenges/${encodeURIComponent(
                token,
              )}/club-nation/state`,
              {
                cache:
                  "no-store",
              },
            );

          const result =
            (await response.json()) as StateResponse;

          if (
            !response.ok ||
            !result.ok
          ) {
            throw new Error(
              result.error ??
                "Maç durumu okunamadı.",
            );
          }

          setState(
            result,
          );

          setPageError(
            "",
          );

          const currentRoundId =
            result.currentRound
              ?.id ??
            null;

          if (
            previousRoundIdRef
              .current !==
            currentRoundId
          ) {
            previousRoundIdRef.current =
              currentRoundId;

            setInput(
              "",
            );

            setSelectedPlayer(
              null,
            );

            setSearchResults(
              [],
            );

            setSearchOpen(
              false,
            );

            setMessageType(
              "neutral",
            );

            if (
              currentRoundId
            ) {
              setMessage(
                `Round ${result.currentRound?.roundNo ?? ""} başladı.`,
              );

              window.setTimeout(
                () => {
                  inputRef.current
                    ?.focus();
                },
                50,
              );
            }
          }
        } catch (
          error
        ) {
          if (
            !silent
          ) {
            setPageError(
              error instanceof Error
                ? error.message
                : "Maç durumu okunamadı.",
            );
          }
        } finally {
          if (
            !silent
          ) {
            setLoading(
              false,
            );
          }
        }
      },
      [
        token,
      ],
    );

  /* =======================================================
     PREPARE
  ======================================================= */

  const prepareGame =
    useCallback(
      async () => {
        if (
          prepareCalledRef
            .current
        ) {
          return;
        }

        prepareCalledRef.current =
          true;

        try {
          setPreparing(
            true,
          );

          const response =
            await fetch(
              `/api/challenges/${encodeURIComponent(
                token,
              )}/club-nation/prepare`,
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },
              },
            );

          const result =
            (await response.json()) as PrepareResponse;

          if (
            !response.ok ||
            !result.ok
          ) {
            throw new Error(
              result.error ??
                "Maç hazırlanamadı.",
            );
          }

          await loadState(
            true,
          );
        } catch (
          error
        ) {
          prepareCalledRef.current =
            false;

          setPageError(
            error instanceof Error
              ? error.message
              : "Maç hazırlanamadı.",
          );
        } finally {
          setPreparing(
            false,
          );
        }
      },
      [
        loadState,
        token,
      ],
    );

  /* =======================================================
     INITIAL
  ======================================================= */

  useEffect(() => {
    void loadState();
  }, [
    loadState,
  ]);

  useEffect(() => {
    if (
      !state?.ok ||
      state.challenge
        ?.completed
    ) {
      return;
    }

    if (
      !state.challenge
        ?.prepared
    ) {
      void prepareGame();
    }
  }, [
    prepareGame,
    state,
  ]);

  /* =======================================================
     POLLING
  ======================================================= */

  useEffect(() => {
    if (
      !state?.ok ||
      state.challenge
        ?.completed
    ) {
      return;
    }

    const interval =
      window.setInterval(
        () => {
          void loadState(
            true,
          );
        },
        POLL_INTERVAL_MS,
      );

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [
    loadState,
    state?.challenge
      ?.completed,
    state?.ok,
  ]);

  /* =======================================================
     SEARCH
  ======================================================= */

  useEffect(() => {
    if (
      state?.challenge
        ?.completed ||
      !state
        ?.currentRound ||
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

    const query =
      input.trim();

    if (
      query.length <
      MINIMUM_SEARCH_LENGTH
    ) {
      setSearchResults(
        [],
      );

      setSearchOpen(
        false,
      );

      return;
    }

    const controller =
      new AbortController();

    const timeout =
      window.setTimeout(
        async () => {
          try {
            setSearchLoading(
              true,
            );

            const response =
              await fetch(
                `/api/games/club-nation/search-player?q=${encodeURIComponent(
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
        250,
      );

    return () => {
      window.clearTimeout(
        timeout,
      );

      controller.abort();
    };
  }, [
    input,
    selectedPlayer,
    state?.challenge
      ?.completed,
    state?.currentRound,
  ]);

  /* =======================================================
     SELECT PLAYER
  ======================================================= */

  function choosePlayer(
    player: PlayerItem,
  ) {
    setSelectedPlayer(
      player,
    );

    setInput(
      player.name,
    );

    setSearchResults(
      [],
    );

    setSearchOpen(
      false,
    );
  }

  /* =======================================================
     SUBMIT
  ======================================================= */

  async function submitAnswer(
    event: FormEvent,
  ) {
    event.preventDefault();

    const currentRound =
      state?.currentRound;

    if (
      !currentRound ||
      state?.challenge
        ?.completed ||
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
      setMessageType(
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
          `/api/challenges/${encodeURIComponent(
            token,
          )}/club-nation/answer`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                roundId:
                  currentRound.id,

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
        setSearchResults(
          result.players,
        );

        setSearchOpen(
          true,
        );

        setMessageType(
          "neutral",
        );

        setMessage(
          result.error ??
            "Oyuncuyu listeden seç.",
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
        result.correct
      ) {
        setMessageType(
          "correct",
        );

        setMessage(
          result.message ??
            "Doğru!",
        );
      } else {
        setMessageType(
          "wrong",
        );

        setMessage(
          result.message ??
            "Yanlış cevap.",
        );
      }

      setInput(
        "",
      );

      setSelectedPlayer(
        null,
      );

      setSearchResults(
        [],
      );

      setSearchOpen(
        false,
      );

      await loadState(
        true,
      );

      window.setTimeout(
        () => {
          inputRef.current
            ?.focus();
        },
        50,
      );
    } catch (
      error
    ) {
      setMessageType(
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
     FORFEIT
  ======================================================= */

  async function forfeitGame() {
    if (
      forfeiting ||
      state?.challenge
        ?.completed
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Pes etmek istediğine emin misin? Rakibin maçı kazanacak.",
      );

    if (
      !confirmed
    ) {
      return;
    }

    try {
      setForfeiting(
        true,
      );

      const response =
        await fetch(
          `/api/challenges/${encodeURIComponent(
            token,
          )}/club-nation/forfeit`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },
          },
        );

      const result =
        (await response.json()) as ForfeitResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
            "Pes etme işlemi yapılamadı.",
        );
      }

      setMessageType(
        "wrong",
      );

      setMessage(
        result.message ??
          "Pes ettin.",
      );

      await loadState(
        true,
      );
    } catch (
      error
    ) {
      setMessageType(
        "wrong",
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Pes etme işlemi yapılamadı.",
      );
    } finally {
      setForfeiting(
        false,
      );
    }
  }

  /* =======================================================
     DERIVED
  ======================================================= */

  const role =
    state?.role;

  const score =
    state?.score ?? {
      challenger:
        0,

      opponent:
        0,
    };

  const myScore =
    role ===
    "opponent"
      ? score.opponent
      : score.challenger;

  const opponentScore =
    role ===
    "opponent"
      ? score.challenger
      : score.opponent;

  const winnerSide =
    state?.challenge
      ?.winnerSide ??
    null;

  const didWin =
    Boolean(
      role &&
        winnerSide ===
          role,
    );

  const currentRound =
    state?.currentRound;

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading &&
    !state
  ) {
    return (
      <main className="min-h-screen bg-[#07111f] px-4 py-10 text-white">
        <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
          <p className="text-slate-400">
            Düello hazırlanıyor...
          </p>
        </div>
      </main>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (
    pageError &&
    !state
  ) {
    return (
      <main className="min-h-screen bg-[#07111f] px-4 py-10 text-white">
        <div className="mx-auto max-w-xl rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <div className="text-5xl">
            ⚠️
          </div>

          <h1 className="mt-4 text-2xl font-black">
            Düello açılamadı
          </h1>

          <p className="mt-3 text-sm text-slate-400">
            {pageError}
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-green-500 px-5 py-3 font-black text-[#07111f]"
          >
            Ana Sayfa
          </Link>
        </div>
      </main>
    );
  }

  /* =======================================================
     COMPLETED
  ======================================================= */

  if (
    state?.challenge
      ?.completed
  ) {
    return (
      <main className="min-h-screen bg-[#07111f] px-4 py-10 text-white">
        <div className="mx-auto flex min-h-[75vh] max-w-3xl items-center justify-center">
          <div className="w-full rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center sm:p-10">
            <div className="text-6xl">
              {didWin
                ? "🏆"
                : "😵"}
            </div>

            <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-purple-400">
              1 Takım 1 Millet VS
            </p>

            <h1 className="mt-3 text-4xl font-black">
              {didWin
                ? "Kazandın!"
                : "Rakibin kazandı"}
            </h1>

            <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <ScoreBox
                label="Sen"
                score={
                  myScore
                }
                winner={
                  didWin
                }
              />

              <div className="font-black text-purple-400">
                VS
              </div>

              <ScoreBox
                label="Rakip"
                score={
                  opponentScore
                }
                winner={
                  !didWin
                }
              />
            </div>

            <p className="mt-6 text-sm text-slate-400">
              {message}
            </p>

            <Link
              href="/"
              className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-green-500 px-6 py-4 font-black text-[#07111f]"
            >
              FootBattle&apos;a Dön
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     PREPARING
  ======================================================= */

  if (
    preparing ||
    !currentRound
  ) {
    return (
      <main className="min-h-screen bg-[#07111f] px-4 py-10 text-white">
        <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
          <div className="text-center">
            <div className="text-5xl">
              ⚔️
            </div>

            <p className="mt-4 font-black">
              Roundlar hazırlanıyor...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* =======================================================
     GAME
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-6 text-white sm:py-10">
      <div className="mx-auto max-w-3xl">
        {/* HEADER */}

        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">
              ⚔️ 1 Takım 1 Millet VS
            </p>

            <p className="mt-1 text-sm text-slate-500">
              İlk 3 roundu alan kazanır
            </p>
          </div>

          <button
            type="button"
            disabled={
              forfeiting
            }
            onClick={() =>
              void forfeitGame()
            }
            className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-black text-red-300 transition hover:bg-red-500/20 disabled:opacity-40"
          >
            {forfeiting
              ? "..."
              : "Pes Et"}
          </button>
        </div>

        {/* SCORE */}

        <div className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <ScoreBox
            label="Sen"
            score={
              myScore
            }
            winner={
              false
            }
          />

          <div className="text-xl font-black text-purple-400">
            VS
          </div>

          <ScoreBox
            label="Rakip"
            score={
              opponentScore
            }
            winner={
              false
            }
          />
        </div>

        {/* ROUND PROGRESS */}

        <div className="mb-5 flex justify-center gap-2">
          {Array.from({
            length:
              5,
          }).map(
            (
              _,
              index,
            ) => {
              const round =
                state?.rounds?.find(
                  (
                    item,
                  ) =>
                    item.roundNo ===
                    index + 1,
                );

              const myWin =
                round?.winnerSide ===
                role;

              const opponentWin =
                Boolean(
                  round
                    ?.winnerSide &&
                    round.winnerSide !==
                      role,
                );

              return (
                <div
                  key={
                    index
                  }
                  className={`h-2 flex-1 rounded-full ${
                    myWin
                      ? "bg-green-400"
                      : opponentWin
                        ? "bg-red-400"
                        : round?.roundNo ===
                            currentRound.roundNo
                          ? "bg-purple-400"
                          : "bg-white/10"
                  }`}
                />
              );
            },
          )}
        </div>

        {/* QUESTION */}

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl sm:p-8">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              Round{" "}
              {
                currentRound.roundNo
              }{" "}
              / 5
            </p>

            <h1 className="mt-2 text-2xl font-black sm:text-3xl">
              Bu iki koşulu sağlayan futbolcuyu bul
            </h1>
          </div>

          <div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <QuestionBox
              label="TAKIM"
              value={
                currentRound
                  .left
                  .value
              }
            />

            <div className="text-2xl font-black text-slate-600">
              +
            </div>

            <QuestionBox
              label="MİLLET"
              value={
                currentRound
                  .right
                  .value
              }
            />
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
                ref={
                  inputRef
                }
                value={
                  input
                }
                autoComplete="off"
                disabled={
                  submitting
                }
                placeholder="Futbolcu yaz..."
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
                    searchResults.length >
                    0
                  ) {
                    setSearchOpen(
                      true,
                    );
                  }
                }}
                className="w-full rounded-2xl border border-white/10 bg-[#07111f] px-5 py-4 text-base font-semibold outline-none transition placeholder:text-slate-600 focus:border-purple-400/40"
              />

              {searchLoading && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                  ...
                </span>
              )}

              {searchOpen &&
                searchResults.length >
                  0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1726] p-2 shadow-2xl">
                    {searchResults.map(
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
                              "⚽"
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-black">
                              {
                                player.name
                              }
                            </p>

                            <p className="truncate text-xs text-slate-500">
                              {player.nationality ??
                                "Milliyet yok"}

                              {player.currentClubName
                                ? ` • ${player.currentClubName}`
                                : ""}
                            </p>
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                )}
            </div>

            <button
              type="submit"
              disabled={
                submitting ||
                input.trim()
                  .length <
                  MINIMUM_SEARCH_LENGTH
              }
              className="mt-4 w-full rounded-2xl bg-green-500 px-5 py-4 font-black text-[#07111f] transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting
                ? "Kontrol ediliyor..."
                : "Cevapla"}
            </button>
          </form>

          {/* FEEDBACK */}

          <div
            className={`mt-5 rounded-2xl border px-4 py-3 text-center text-sm font-bold ${
              messageType ===
              "correct"
                ? "border-green-500/30 bg-green-500/10 text-green-300"
                : messageType ===
                    "wrong"
                  ? "border-red-500/30 bg-red-500/10 text-red-300"
                  : "border-white/10 bg-white/[0.03] text-slate-400"
            }`}
          >
            {message}
          </div>

          {/* OPPONENT STATUS */}

          <div className="mt-4 text-center text-xs text-slate-600">
            {state
              ?.opponentCurrentAnswer
              ?.answeredAt
              ? "Rakip bu roundda cevap verdi."
              : "Rakibin cevabı bekleniyor..."}
          </div>
        </section>
      </div>
    </main>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function ScoreBox({
  label,
  score,
  winner,
}: {
  label: string;

  score: number;

  winner: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 text-center ${
        winner
          ? "border-green-400/30 bg-green-400/10"
          : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <p className="text-xs font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-3xl font-black">
        {score}
      </p>
    </div>
  );
}

function QuestionBox({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-[#07111f] px-3 py-6 text-center sm:px-5">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-lg font-black sm:text-2xl">
        {value}
      </p>
    </div>
  );
}