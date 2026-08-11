"use client";

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

type ChallengeSide =
  | "challenger"
  | "opponent";

type PlayerSuggestion = {
  playerId: number;

  name: string;

  nationality?:
    | string
    | null;

  currentClubName?:
    | string
    | null;

  imageUrl?:
    | string
    | null;
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

type DuelRound = {
  id: number;

  roundNo: number;

  left: {
    type: string;

    value: string;
  };

  right: {
    type: string;

    value: string;
  };

  winnerSide:
    | ChallengeSide
    | null;

  completed: boolean;

  completedAt:
    | string
    | null;

  challenger:
    RoundAnswer;

  opponent:
    RoundAnswer;
};

type StateResponse = {
  ok: boolean;

  error?: string;

  role?: ChallengeSide;

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
      | ChallengeSide
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
    | DuelRound
    | null;

  myCurrentAnswer?:
    | RoundAnswer
    | null;

  opponentCurrentAnswer?:
    | RoundAnswer
    | null;

  rounds?: DuelRound[];
};

type PrepareResponse = {
  ok: boolean;

  error?: string;

  role?:
    | ChallengeSide;

  alreadyPrepared?: boolean;

  roundCount?: number;
};

type SearchResponse = {
  ok: boolean;

  error?: string;

  minimumSearchLength?: number;

  players?: PlayerSuggestion[];
};

type AnswerResponse = {
  ok: boolean;

  error?: string;

  ambiguous?: boolean;

  players?: PlayerSuggestion[];

  correct?: boolean;

  wonRound?: boolean;

  roundCompleted?: boolean;

  challengeCompleted?: boolean;

  role?: ChallengeSide;

  winnerSide?:
    | ChallengeSide
    | null;

  score?: {
    challenger: number;

    opponent: number;
  };

  answer?: {
    playerId: number;

    name: string;
  };

  message?: string;
};

type ForfeitResponse = {
  ok: boolean;

  error?: string;

  alreadyCompleted?: boolean;

  forfeited?: boolean;

  forfeitedBy?:
    | ChallengeSide;

  role?: ChallengeSide;

  winnerSide?:
    | ChallengeSide
    | null;

  result?:
    | "won"
    | "lost";

  score?: {
    challenger: number;

    opponent: number;
  };

  completedAt?:
    | string
    | null;

  message?: string;
};

type ClubNationDuelProps = {
  token: string;

  challengerName?:
    | string
    | null;

  opponentName?:
    | string
    | null;
};

/* =========================================================
   SETTINGS
========================================================= */

const MINIMUM_SEARCH_LENGTH =
  3;

const POLL_INTERVAL_MS =
  900;

/* =========================================================
   PAGE COMPONENT
========================================================= */

export default function ClubNationDuel({
  token,
  challengerName,
  opponentName,
}: ClubNationDuelProps) {
  /* =======================================================
     SERVER STATE
  ======================================================= */

  const [
    state,
    setState,
  ] =
    useState<StateResponse | null>(
      null,
    );

  const [
    preparing,
    setPreparing,
  ] =
    useState(true);

  const [
    loadingState,
    setLoadingState,
  ] =
    useState(true);

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
    query,
    setQuery,
  ] =
    useState("");

  const [
    selectedPlayer,
    setSelectedPlayer,
  ] =
    useState<PlayerSuggestion | null>(
      null,
    );

  const [
    suggestions,
    setSuggestions,
  ] =
    useState<PlayerSuggestion[]>(
      [],
    );

  const [
    searchLoading,
    setSearchLoading,
  ] =
    useState(false);

  const [
    suggestionsOpen,
    setSuggestionsOpen,
  ] =
    useState(false);

  const [
    answerLoading,
    setAnswerLoading,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState(
      "Rakibinden önce doğru futbolcuyu bul.",
    );

  const [
    feedback,
    setFeedback,
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
    useRef<
      number
      | null
    >(
      null,
    );

  /* =======================================================
     FORFEIT
  ======================================================= */

  const [
    forfeitLoading,
    setForfeitLoading,
  ] =
    useState(false);

  /* =======================================================
     RESET ANSWER
  ======================================================= */

  const resetAnswer =
    useCallback(
      () => {
        setQuery(
          "",
        );

        setSelectedPlayer(
          null,
        );

        setSuggestions(
          [],
        );

        setSuggestionsOpen(
          false,
        );

        window.setTimeout(
          () => {
            inputRef.current
              ?.focus();
          },
          50,
        );
      },
      [],
    );

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
          if (!silent) {
            setLoadingState(
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

          const json =
            (await response.json()) as StateResponse;

          if (
            !response.ok ||
            !json.ok
          ) {
            throw new Error(
              json.error ??
                "Maç durumu okunamadı.",
            );
          }

          setState(
            json,
          );

          setPageError(
            "",
          );

          const newRoundId =
            json.currentRound
              ?.id ??
            null;

          if (
            previousRoundIdRef
              .current !==
              null &&
            newRoundId !==
              previousRoundIdRef
                .current
          ) {
            resetAnswer();

            setFeedback(
              "neutral",
            );

            setMessage(
              "Yeni round başladı. İlk doğru cevabı ver!",
            );
          }

          previousRoundIdRef.current =
            newRoundId;
        } catch (
          error
        ) {
          if (!silent) {
            setPageError(
              error instanceof Error
                ? error.message
                : "Maç durumu okunamadı.",
            );
          }
        } finally {
          if (!silent) {
            setLoadingState(
              false,
            );
          }
        }
      },
      [
        resetAnswer,
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
          prepareCalledRef.current
        ) {
          return;
        }

        prepareCalledRef.current =
          true;

        try {
          setPreparing(
            true,
          );

          setPageError(
            "",
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

          const json =
            (await response.json()) as PrepareResponse;

          if (
            !response.ok ||
            !json.ok
          ) {
            throw new Error(
              json.error ??
                "1 Takım 1 Millet hazırlanamadı.",
            );
          }

          await loadState();
        } catch (
          error
        ) {
          prepareCalledRef.current =
            false;

          setPageError(
            error instanceof Error
              ? error.message
              : "1 Takım 1 Millet hazırlanamadı.",
          );
        } finally {
          setPreparing(
            false,
          );

          setLoadingState(
            false,
          );
        }
      },
      [
        loadState,
        token,
      ],
    );

  useEffect(() => {
    void prepareGame();
  }, [
    prepareGame,
  ]);

  /* =======================================================
     LIVE POLLING
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
      !state?.currentRound ||
      state.challenge
        ?.completed ||
      selectedPlayer
    ) {
      setSuggestions(
        [],
      );

      setSuggestionsOpen(
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
      setSuggestions(
        [],
      );

      setSuggestionsOpen(
        false,
      );

      setSearchLoading(
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
                `/api/club-nation/search-player?q=${encodeURIComponent(
                  trimmed,
                )}`,
                {
                  cache:
                    "no-store",

                  signal:
                    controller.signal,
                },
              );

            const json =
              (await response.json()) as SearchResponse;

            if (
              !response.ok ||
              !json.ok
            ) {
              throw new Error(
                json.error ??
                  "Oyuncular aranamadı.",
              );
            }

            const players =
              json.players ??
              [];

            setSuggestions(
              players,
            );

            setSuggestionsOpen(
              players.length >
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

            setSuggestions(
              [],
            );

            setSuggestionsOpen(
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
    query,
    selectedPlayer,
    state?.challenge
      ?.completed,
    state?.currentRound,
  ]);

  /* =======================================================
     CHOOSE PLAYER
  ======================================================= */

  function choosePlayer(
    player: PlayerSuggestion,
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

    setSuggestionsOpen(
      false,
    );

    inputRef.current
      ?.focus();
  }

  /* =======================================================
     SUBMIT
  ======================================================= */

  async function submitAnswer(
    event:
      FormEvent,
  ) {
    event.preventDefault();

    const currentRound =
      state?.currentRound;

    if (
      !currentRound ||
      state?.challenge
        ?.completed ||
      answerLoading
    ) {
      return;
    }

    const answer =
      query.trim();

    if (
      !selectedPlayer &&
      answer.length <
        MINIMUM_SEARCH_LENGTH
    ) {
      setFeedback(
        "wrong",
      );

      setMessage(
        "En az 3 harf yaz.",
      );

      return;
    }

    try {
      setAnswerLoading(
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

      const json =
        (await response.json()) as AnswerResponse;

      if (
        json.ambiguous &&
        json.players
      ) {
        setSuggestions(
          json.players,
        );

        setSuggestionsOpen(
          true,
        );

        setFeedback(
          "neutral",
        );

        setMessage(
          json.error ??
            "Birden fazla oyuncu bulundu. Listeden seç.",
        );

        return;
      }

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
        json.correct &&
        json.wonRound
      ) {
        setFeedback(
          "correct",
        );

        setMessage(
          json.message ??
            "Doğru! Round senin.",
        );

        resetAnswer();

        await loadState(
          true,
        );

        return;
      }

      if (
        json.correct &&
        json.roundCompleted
      ) {
        setFeedback(
          "wrong",
        );

        setMessage(
          json.message ??
            "Rakibin senden önce doğru cevapladı.",
        );

        resetAnswer();

        await loadState(
          true,
        );

        return;
      }

      setFeedback(
        "wrong",
      );

      setMessage(
        json.message ??
          "Yanlış cevap. Round devam ediyor.",
      );

      resetAnswer();

      await loadState(
        true,
      );
    } catch (
      error
    ) {
      setFeedback(
        "wrong",
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Cevap gönderilemedi.",
      );
    } finally {
      setAnswerLoading(
        false,
      );
    }
  }

  /* =======================================================
     FORFEIT
  ======================================================= */

  async function forfeitGame() {
    if (
      state?.challenge
        ?.completed ||
      forfeitLoading
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Maçtan çıkıp pes etmek istediğine emin misin? Rakibin maçı kazanacak.",
      );

    if (
      !confirmed
    ) {
      return;
    }

    try {
      setForfeitLoading(
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

      const json =
        (await response.json()) as ForfeitResponse;

      if (
        !response.ok ||
        !json.ok
      ) {
        throw new Error(
          json.error ??
            "Pes etme işlemi tamamlanamadı.",
        );
      }

      setMessage(
        json.message ??
          "Maç tamamlandı.",
      );

      await loadState(
        true,
      );
    } catch (
      error
    ) {
      setFeedback(
        "wrong",
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Pes etme işlemi tamamlanamadı.",
      );
    } finally {
      setForfeitLoading(
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

  const myName =
    role ===
    "opponent"
      ? opponentName ??
        "Sen"
      : challengerName ??
        "Sen";

  const rivalName =
    role ===
    "opponent"
      ? challengerName ??
        "Rakip"
      : opponentName ??
        "Rakip";

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
    preparing ||
    (
      loadingState &&
      !state
    )
  ) {
    return (
      <DuelShell>
        <CenteredState
          emoji="🌍"
          title="1 Takım 1 Millet hazırlanıyor"
          description="5 roundluk eşleşmeler oluşturuluyor..."
        />
      </DuelShell>
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
      <DuelShell>
        <CenteredState
          emoji="⚠️"
          title="Düello açılamadı"
          description={
            pageError
          }
        />

        <button
          type="button"
          onClick={() => {
            prepareCalledRef.current =
              false;

            void prepareGame();
          }}
          className="mx-auto mt-6 flex rounded-xl bg-green-500 px-5 py-3 text-sm font-black text-[#07111f]"
        >
          Tekrar Dene
        </button>
      </DuelShell>
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
      <DuelShell>
        <div className="text-center">
          <div className="text-6xl">
            {didWin
              ? "🏆"
              : "😤"}
          </div>

          <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-purple-400">
            1 Takım 1 Millet VS
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-4xl">
            {didWin
              ? "Kazandın!"
              : "Rakibin kazandı"}
          </h1>

          <p className="mt-3 text-sm text-slate-400">
            İlk 3 roundu alan düelloyu kazandı.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <ScoreCard
            label="Sen"
            name={
              myName
            }
            score={
              myScore
            }
            winner={
              didWin
            }
          />

          <div className="text-lg font-black text-purple-400">
            VS
          </div>

          <ScoreCard
            label="Rakip"
            name={
              rivalName
            }
            score={
              opponentScore
            }
            winner={
              !didWin
            }
          />
        </div>

        {state.rounds &&
          state.rounds
            .length >
            0 && (
            <div className="mt-7 grid grid-cols-5 gap-2">
              {state.rounds.map(
                (
                  round,
                ) => {
                  const mine =
                    round.winnerSide ===
                    role;

                  return (
                    <div
                      key={
                        round.id
                      }
                      className={`rounded-xl border px-2 py-3 text-center ${
                        !round.completed
                          ? "border-white/10 bg-white/[0.03]"
                          : mine
                            ? "border-green-500/30 bg-green-500/10"
                            : "border-red-500/30 bg-red-500/10"
                      }`}
                    >
                      <div className="text-[10px] text-slate-500">
                        R
                        {
                          round.roundNo
                        }
                      </div>

                      <div className="mt-1 text-base">
                        {!round.completed
                          ? "•"
                          : mine
                            ? "✓"
                            : "✕"}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}

        <Link
          href="/"
          className="mt-8 flex w-full items-center justify-center rounded-xl bg-green-500 px-5 py-4 font-black text-[#07111f] transition hover:bg-green-400"
        >
          FootBattle&apos;a Dön
        </Link>
      </DuelShell>
    );
  }

  /* =======================================================
     NO ROUND
  ======================================================= */

  if (
    !currentRound
  ) {
    return (
      <DuelShell>
        <CenteredState
          emoji="⚽"
          title="Round bekleniyor"
          description="Maç durumu güncelleniyor..."
        />
      </DuelShell>
    );
  }

  /* =======================================================
     GAME
  ======================================================= */

  return (
    <DuelShell
      wide
    >
      {/* HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">
            ⚔️ 1 TAKIM 1 MİLLET VS
          </p>

          <p className="mt-1 text-sm text-slate-400">
            İlk 3 roundu alan kazanır.
          </p>
        </div>

        <button
          type="button"
          disabled={
            forfeitLoading
          }
          onClick={() =>
            void forfeitGame()
          }
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-black text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
        >
          {forfeitLoading
            ? "..."
            : "🏳️ Pes Et"}
        </button>
      </div>

      {/* SCORE */}

      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <ScoreCard
          label="Sen"
          name={
            myName
          }
          score={
            myScore
          }
        />

        <div className="text-xl font-black text-purple-400">
          VS
        </div>

        <ScoreCard
          label="Rakip"
          name={
            rivalName
          }
          score={
            opponentScore
          }
        />
      </div>

      {/* ROUND PROGRESS */}

      <div className="mt-5 grid grid-cols-5 gap-2">
        {(state?.rounds ??
          []).map(
          (
            round,
          ) => {
            const mine =
              round.winnerSide ===
              role;

            const active =
              round.id ===
              currentRound.id;

            return (
              <div
                key={
                  round.id
                }
                className={`rounded-xl border px-2 py-3 text-center transition ${
                  active
                    ? "border-purple-400/50 bg-purple-500/15"
                    : !round.completed
                      ? "border-white/10 bg-white/[0.03]"
                      : mine
                        ? "border-green-500/30 bg-green-500/10"
                        : "border-red-500/30 bg-red-500/10"
                }`}
              >
                <div className="text-[10px] font-black text-slate-500">
                  R
                  {
                    round.roundNo
                  }
                </div>

                <div className="mt-1 text-base font-black">
                  {active
                    ? "⚡"
                    : !round.completed
                      ? "•"
                      : mine
                        ? "✓"
                        : "✕"}
                </div>
              </div>
            );
          },
        )}
      </div>

      {/* QUESTION */}

      <div className="mt-6 rounded-3xl border border-white/10 bg-[#07111f] p-5 sm:p-7">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            ROUND{" "}
            {
              currentRound.roundNo
            }{" "}
            / 5
          </p>

          <h2 className="mt-2 text-xl font-black">
            Bu iki koşulu sağlayan futbolcuyu bul
          </h2>
        </div>

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <QuestionCard
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

          <QuestionCard
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
                query
              }
              autoComplete="off"
              disabled={
                answerLoading
              }
              placeholder="Futbolcu yaz... en az 3 harf"
              onChange={(
                event,
              ) => {
                setQuery(
                  event.target
                    .value,
                );

                setSelectedPlayer(
                  null,
                );
              }}
              onFocus={() => {
                if (
                  suggestions.length >
                  0
                ) {
                  setSuggestionsOpen(
                    true,
                  );
                }
              }}
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-5 py-4 pr-14 font-semibold outline-none transition placeholder:text-slate-600 focus:border-purple-400/40"
            />

            {searchLoading && (
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                ...
              </div>
            )}

            {suggestionsOpen &&
              suggestions.length >
                0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1726] p-2 shadow-2xl">
                  {suggestions.map(
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
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.06]"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.05]">
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
                          <p className="truncate text-sm font-black">
                            {
                              player.name
                            }
                          </p>

                          <p className="mt-0.5 truncate text-[11px] text-slate-500">
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
              answerLoading ||
              (
                !selectedPlayer &&
                query.trim()
                  .length <
                  MINIMUM_SEARCH_LENGTH
              )
            }
            className="mt-4 w-full rounded-2xl bg-green-500 px-5 py-4 font-black text-[#07111f] transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {answerLoading
              ? "Kontrol ediliyor..."
              : "Cevapla"}
          </button>
        </form>

        {/* FEEDBACK */}

        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-center text-sm font-bold ${
            feedback ===
            "correct"
              ? "border-green-500/30 bg-green-500/10 text-green-300"
              : feedback ===
                  "wrong"
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-white/10 bg-white/[0.025] text-slate-400"
          }`}
        >
          {message}
        </div>
      </div>

      {/* LIVE STATUS */}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <AnswerStatus
          title="Sen"
          answer={
            state
              ?.myCurrentAnswer
              ?.answer
          }
        />

        <AnswerStatus
          title="Rakip"
          answer={
            state
              ?.opponentCurrentAnswer
              ?.answer
          }
        />
      </div>
    </DuelShell>
  );
}

/* =========================================================
   SHELL
========================================================= */

function DuelShell({
  children,
  wide =
    false,
}: {
  children:
    React.ReactNode;

  wide?:
    boolean;
}) {
  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-6 text-white sm:py-10">
      <div
        className={`mx-auto ${
          wide
            ? "max-w-4xl"
            : "max-w-2xl"
        }`}
      >
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-white"
        >
          ← Ana Sayfa
        </Link>

        <div className="rounded-3xl border border-white/10 bg-[#101c2c] p-5 shadow-2xl sm:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}

/* =========================================================
   CENTERED STATE
========================================================= */

function CenteredState({
  emoji,
  title,
  description,
}: {
  emoji: string;

  title: string;

  description: string;
}) {
  return (
    <div className="py-10 text-center">
      <div className="text-6xl">
        {emoji}
      </div>

      <h1 className="mt-5 text-2xl font-black sm:text-3xl">
        {title}
      </h1>

      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}

/* =========================================================
   SCORE CARD
========================================================= */

function ScoreCard({
  label,
  name,
  score,
  winner =
    false,
}: {
  label: string;

  name: string;

  score: number;

  winner?:
    boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl border p-4 text-center ${
        winner
          ? "border-green-500/35 bg-green-500/10"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-black sm:text-base">
        {name}
      </p>

      <div className="mt-2 text-3xl font-black text-green-400">
        {score}
      </div>
    </div>
  );
}

/* =========================================================
   QUESTION CARD
========================================================= */

function QuestionCard({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-6 text-center sm:px-5">
      <p className="text-[10px] font-black tracking-wider text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-lg font-black sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   ANSWER STATUS
========================================================= */

function AnswerStatus({
  title,
  answer,
}: {
  title: string;

  answer?:
    | string
    | null;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
        {title}
      </p>

      <p className="mt-1 truncate text-sm font-bold text-slate-300">
        {answer
          ? `Son cevap: ${answer}`
          : "Henüz cevap yok"}
      </p>
    </div>
  );
}
