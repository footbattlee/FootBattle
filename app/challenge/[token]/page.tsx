"use client";

import Link from "next/link";

import {
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/* =========================================================
   CONSTANTS
========================================================= */

const PLAYER_QUIZ_VS_DURATION_SECONDS =
  250;

/* =========================================================
   TYPES
========================================================= */

type ChallengeRole =
  | "challenger"
  | "opponent"
  | "visitor";

type ChallengePlayer = {
  name: string | null;
  score: number;
  isRegistered: boolean;
};

type ChallengeData = {
  id: number;
  token: string;
  gameCode: string;
  status: string;

  challenger: ChallengePlayer;

  opponent:
    | ChallengePlayer
    | null;

  winnerSide:
    | "challenger"
    | "opponent"
    | "draw"
    | null;

  createdAt: string;

  joinedAt:
    | string
    | null;

  startedAt:
    | string
    | null;

  completedAt:
    | string
    | null;

  expiresAt: string;
  updatedAt: string;
};

type ChallengeResponse = {
  ok?: boolean;
  found?: boolean;

  role?: ChallengeRole;

  canJoin?: boolean;
  canPlay?: boolean;

  waitingForOpponent?: boolean;

  completed?: boolean;
  expired?: boolean;

  result?:
    | "win"
    | "loss"
    | "draw"
    | null;

  challenge?: ChallengeData;

  error?: string;
};

type PrepareProgress = {
  birthYearCorrect: boolean;

  nationalityCorrect: boolean;

  solvedClubIds: number[];

  solvedClubs: {
    id: number;
    name: string;
    careerOrder: number;
  }[];

  correctCount: number;
  totalCount: number;

  attemptCount: number;
  wrongAttemptCount: number;

  finalized: boolean;
  forfeited: boolean;

  durationSeconds:
    | number
    | null;
};

type PrepareResponse = {
  ok?: boolean;

  role?:
    | "challenger"
    | "opponent";

  challenge?: {
    id: number;
    token: string;
    gameCode: string;
    status: string;
  };

  player?: {
    id: number;

    /*
     * Backend gönderiyor fakat oyun sırasında
     * spoiler olmaması için göstermiyoruz.
     */
    fullName: string;
    imageUrl: string | null;
  };

  board?: {
    birthYearSlots: number;
    nationalitySlots: number;
    clubSlots: number;
    totalSlots: number;
  };

  progress?: PrepareProgress;

  minimumSearchLength?: number;

  guessTimeSeconds?: number;

  error?: string;
};

type AnswerProgress = {
  birthYearCorrect: boolean;

  nationalityCorrect: boolean;

  solvedClubIds: number[];

  correctCount: number;

  totalCount: number;

  attemptCount: number;
};

type AnswerResponse = {
  ok?: boolean;

  role?:
    | "challenger"
    | "opponent";

  field?:
    | "birthYear"
    | "nationality"
    | "club";

  correct?: boolean;

  duplicate?: boolean;

  alreadySolved?: boolean;

  matchedClub?: {
    id: number;
    name: string;
    careerOrder: number;
  } | null;

  progress?: AnswerProgress;

  error?: string;
};

type ResultResponse = {
  ok?: boolean;

  finalized?: boolean;
  alreadyFinalized?: boolean;

  role?:
    | "challenger"
    | "opponent";

  reason?:
    | "completed"
    | "timeout"
    | "forfeit";

  score?: number;

  correctCount?: number;
  totalCount?: number;

  durationSeconds?: number;

  attemptCount?: number;

  wrongAttemptCount?: number;

  challengeCompleted?: boolean;

  waitingForOpponent?: boolean;

  winnerSide?:
    | "challenger"
    | "opponent"
    | "draw"
    | null;

  result?:
    | "win"
    | "loss"
    | "draw"
    | "waiting";

  scores?: {
    challenger: number;
    opponent: number;
  };

  durations?: {
    challenger: number;
    opponent: number;
  };

  wrongAttempts?: {
    challenger: number;
    opponent: number;
  };

  remainingSeconds?: number;

  error?: string;
};

type ForfeitResponse = {
  ok?: boolean;

  alreadyCompleted?: boolean;
  alreadyForfeited?: boolean;

  role?:
    | "challenger"
    | "opponent";

  forfeited?: boolean;

  winnerSide?:
    | "challenger"
    | "opponent"
    | null;

  result?:
    | "loss"
    | null;

  message?: string;

  error?: string;
};

type CountrySearchResponse = {
  ok?: boolean;

  countries?: string[];

  error?: string;
};

type ClubSuggestion = {
  name: string;
};

type ClubSearchResponse = {
  ok?: boolean;

  clubs?: unknown[];

  error?: string;
};

type SolvedClub = {
  id: number;
  name: string;
  careerOrder: number;
};

/* =========================================================
   GAME LABELS
========================================================= */

const GAME_LABELS: Record<
  string,
  string
> = {
  club_clash:
    "2 Takım 1 Oyuncu",

  player_quiz:
    "Player Quiz",

  career_path:
    "Career Path",

  guess_the_player:
    "Guess The Player",
};

/* =========================================================
   HELPERS
========================================================= */

function normalizeClubSuggestions(
  values: unknown[],
): ClubSuggestion[] {
  const names =
    values
      .map((value) => {
        if (
          typeof value ===
          "string"
        ) {
          return value;
        }

        if (
          value &&
          typeof value ===
            "object"
        ) {
          const item =
            value as Record<
              string,
              unknown
            >;

          const candidate =
            item.name ??
            item.clubName ??
            item.club_name;

          if (
            typeof candidate ===
            "string"
          ) {
            return candidate;
          }
        }

        return null;
      })
      .filter(
        (
          value,
        ): value is string =>
          Boolean(
            value?.trim(),
          ),
      );

  return Array.from(
    new Set(names),
  ).map((name) => ({
    name,
  }));
}

function formatScore(
  value:
    | number
    | null
    | undefined,
) {
  return Number(
    value ?? 0,
  ).toLocaleString(
    "tr-TR",
  );
}

function getRemainingSeconds(
  startedAt:
    | string
    | null
    | undefined,
) {
  if (!startedAt) {
    return PLAYER_QUIZ_VS_DURATION_SECONDS;
  }

  const start =
    new Date(
      startedAt,
    ).getTime();

  if (
    Number.isNaN(start)
  ) {
    return PLAYER_QUIZ_VS_DURATION_SECONDS;
  }

  const elapsed =
    Math.floor(
      (
        Date.now() -
        start
      ) /
        1000,
    );

  return Math.max(
    0,

    PLAYER_QUIZ_VS_DURATION_SECONDS -
      elapsed,
  );
}

function formatTimer(
  totalSeconds: number,
) {
  const minutes =
    Math.floor(
      totalSeconds /
        60,
    );

  const seconds =
    totalSeconds %
    60;

  return `${minutes}:${String(
    seconds,
  ).padStart(
    2,
    "0",
  )}`;
}

/* =========================================================
   PAGE
========================================================= */

export default function ChallengePage({
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
     CHALLENGE
  ======================================================= */

  const [
    challengeData,
    setChallengeData,
  ] =
    useState<ChallengeResponse | null>(
      null,
    );

  const [
    challengeLoading,
    setChallengeLoading,
  ] =
    useState(true);

  const [
    pageError,
    setPageError,
  ] =
    useState("");

  /* =======================================================
     JOIN
  ======================================================= */

  const [
    opponentName,
    setOpponentName,
  ] =
    useState("");

  const [
    joinLoading,
    setJoinLoading,
  ] =
    useState(false);

  /* =======================================================
     START
  ======================================================= */

  const [
    startLoading,
    setStartLoading,
  ] =
    useState(false);

  /* =======================================================
     PLAYER QUIZ
  ======================================================= */

  const [
    game,
    setGame,
  ] =
    useState<PrepareResponse | null>(
      null,
    );

  const [
    gameLoading,
    setGameLoading,
  ] =
    useState(false);

  const [
    gameError,
    setGameError,
  ] =
    useState("");

  /* =======================================================
     ANSWERS
  ======================================================= */

  const [
    birthYear,
    setBirthYear,
  ] =
    useState("");

  const [
    birthYearSolved,
    setBirthYearSolved,
  ] =
    useState(false);

  const [
    nationality,
    setNationality,
  ] =
    useState("");

  const [
    nationalitySolved,
    setNationalitySolved,
  ] =
    useState(false);

  const [
    countrySuggestions,
    setCountrySuggestions,
  ] =
    useState<
      string[]
    >([]);

  const [
    clubQuery,
    setClubQuery,
  ] =
    useState("");

  const [
    clubSuggestions,
    setClubSuggestions,
  ] =
    useState<
      ClubSuggestion[]
    >([]);

  const [
    solvedClubs,
    setSolvedClubs,
  ] =
    useState<
      SolvedClub[]
    >([]);

  const [
    answerLoading,
    setAnswerLoading,
  ] =
    useState<
      | "birthYear"
      | "nationality"
      | "club"
      | null
    >(null);

  const [
    attemptCount,
    setAttemptCount,
  ] =
    useState(0);

  /* =======================================================
     TIMER
  ======================================================= */

  const [
    remainingSeconds,
    setRemainingSeconds,
  ] =
    useState(
      PLAYER_QUIZ_VS_DURATION_SECONDS,
    );

  /* =======================================================
     RESULT
  ======================================================= */

  const [
    result,
    setResult,
  ] =
    useState<ResultResponse | null>(
      null,
    );

  const [
    resultLoading,
    setResultLoading,
  ] =
    useState(false);

  const resultSentRef =
    useRef(false);

  const timeoutSentRef =
    useRef(false);

  /* =======================================================
     FORFEIT
  ======================================================= */

  const [
    forfeitLoading,
    setForfeitLoading,
  ] =
    useState(false);

  /* =======================================================
     LOAD CHALLENGE
  ======================================================= */

  const loadChallenge =
    useCallback(
      async (
        silent = false,
      ) => {
        try {
          if (!silent) {
            setChallengeLoading(
              true,
            );
          }

          const response =
            await fetch(
              `/api/challenges/${encodeURIComponent(
                token,
              )}`,
              {
                cache:
                  "no-store",
              },
            );

          const json =
            (await response.json()) as ChallengeResponse;

          if (
            !response.ok ||
            !json.ok
          ) {
            if (!silent) {
              setPageError(
                json.error ??
                  "Meydan okuma okunamadı.",
              );
            }

            setChallengeData(
              json,
            );

            return;
          }

          setChallengeData(
            json,
          );

          setPageError(
            "",
          );
        } catch (error) {
          if (!silent) {
            setPageError(
              error instanceof Error
                ? error.message
                : "Meydan okuma okunamadı.",
            );
          }
        } finally {
          if (!silent) {
            setChallengeLoading(
              false,
            );
          }
        }
      },
      [
        token,
      ],
    );

  useEffect(() => {
    void loadChallenge();

    const interval =
      window.setInterval(
        () => {
          void loadChallenge(
            true,
          );
        },
        2500,
      );

    return () =>
      window.clearInterval(
        interval,
      );
  }, [
    loadChallenge,
  ]);

  /* =======================================================
     JOIN
  ======================================================= */

  async function joinChallenge() {
    const cleanName =
      opponentName
        .trim()
        .replace(
          /\s+/g,
          " ",
        );

    if (!cleanName) {
      setPageError(
        "Düelloda görünecek ismini yaz.",
      );

      return;
    }

    try {
      setJoinLoading(
        true,
      );

      setPageError(
        "",
      );

      const response =
        await fetch(
          "/api/challenges/join",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                token,

                opponentName:
                  cleanName,
              }),
          },
        );

      const json =
        (await response.json()) as {
          ok?: boolean;
          error?: string;
        };

      if (
        !response.ok ||
        !json.ok
      ) {
        throw new Error(
          json.error ??
            "Meydan okumaya katılınamadı.",
        );
      }

      await loadChallenge();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Meydan okumaya katılınamadı.",
      );
    } finally {
      setJoinLoading(
        false,
      );
    }
  }

  /* =======================================================
     START
  ======================================================= */

  async function startChallenge() {
    try {
      setStartLoading(
        true,
      );

      setPageError(
        "",
      );

      const response =
        await fetch(
          "/api/challenges/start",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                token,
              }),
          },
        );

      const json =
        (await response.json()) as {
          ok?: boolean;
          error?: string;
        };

      if (
        !response.ok ||
        !json.ok
      ) {
        throw new Error(
          json.error ??
            "Düello başlatılamadı.",
        );
      }

      resultSentRef.current =
        false;

      timeoutSentRef.current =
        false;

      await loadChallenge();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Düello başlatılamadı.",
      );
    } finally {
      setStartLoading(
        false,
      );
    }
  }

  /* =======================================================
     PREPARE
  ======================================================= */

  const prepareGame =
    useCallback(
      async () => {
        if (
          gameLoading ||
          game?.ok
        ) {
          return;
        }

        try {
          setGameLoading(
            true,
          );

          setGameError(
            "",
          );

          const response =
            await fetch(
              `/api/challenges/${encodeURIComponent(
                token,
              )}/player-quiz/prepare`,
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
                "Player Quiz hazırlanamadı.",
            );
          }

          setGame(
            json,
          );

          /*
           * Refresh sonrası DB progress'ini UI'a geri yükle.
           */
          if (
            json.progress
          ) {
            setBirthYearSolved(
              json.progress
                .birthYearCorrect,
            );

            setNationalitySolved(
              json.progress
                .nationalityCorrect,
            );

            setSolvedClubs(
              json.progress
                .solvedClubs ??
                [],
            );

            setAttemptCount(
              json.progress
                .attemptCount ??
                0,
            );

            /*
             * Oyuncu daha önce finalize olduysa
             * tekrar timeout/completed göndermeyelim.
             */
            if (
              json.progress
                .finalized
            ) {
              resultSentRef.current =
                true;
            }
          }
        } catch (error) {
          setGameError(
            error instanceof Error
              ? error.message
              : "Player Quiz hazırlanamadı.",
          );
        } finally {
          setGameLoading(
            false,
          );
        }
      },
      [
        game?.ok,
        gameLoading,
        token,
      ],
    );

  useEffect(() => {
    if (
      challengeData
        ?.challenge
        ?.status ===
        "playing" &&
      challengeData
        .challenge
        .gameCode ===
        "player_quiz"
    ) {
      void prepareGame();
    }
  }, [
    challengeData
      ?.challenge
      ?.gameCode,
    challengeData
      ?.challenge
      ?.status,
    prepareGame,
  ]);

  /* =======================================================
     COUNTDOWN
  ======================================================= */

useEffect(() => {
  const challenge =
    challengeData?.challenge;

  const startedAt =
    challenge?.startedAt;

  if (
    challenge?.status !==
      "playing" ||
    !startedAt ||
    resultSentRef.current
  ) {
    return;
  }

  function updateTimer() {
    const remaining =
      getRemainingSeconds(
        startedAt,
      );

    setRemainingSeconds(
      remaining,
    );
  }

  updateTimer();

  const interval =
    window.setInterval(
      updateTimer,
      500,
    );

  return () => {
    window.clearInterval(
      interval,
    );
  };
}, [
  challengeData
    ?.challenge
    ?.startedAt,
  challengeData
    ?.challenge
    ?.status,
]);

  /* =======================================================
     COUNTRY SEARCH
  ======================================================= */

  useEffect(() => {
    if (
      nationalitySolved ||
      remainingSeconds <=
        0
    ) {
      setCountrySuggestions(
        [],
      );

      return;
    }

    const query =
      nationality.trim();

    if (
      query.length <
      3
    ) {
      setCountrySuggestions(
        [],
      );

      return;
    }

    const timeout =
      window.setTimeout(
        async () => {
          try {
            const response =
              await fetch(
                `/api/player-quiz/search-country?q=${encodeURIComponent(
                  query,
                )}`,
                {
                  cache:
                    "no-store",
                },
              );

            const json =
              (await response.json()) as CountrySearchResponse;

            if (
              response.ok &&
              json.ok
            ) {
              setCountrySuggestions(
                json.countries ??
                  [],
              );
            }
          } catch {
            // autocomplete
          }
        },
        250,
      );

    return () =>
      window.clearTimeout(
        timeout,
      );
  }, [
    nationality,
    nationalitySolved,
    remainingSeconds,
  ]);

  /* =======================================================
     CLUB SEARCH
  ======================================================= */

  useEffect(() => {
    if (
      remainingSeconds <=
      0
    ) {
      setClubSuggestions(
        [],
      );

      return;
    }

    const query =
      clubQuery.trim();

    if (
      query.length <
      3
    ) {
      setClubSuggestions(
        [],
      );

      return;
    }

    const timeout =
      window.setTimeout(
        async () => {
          try {
            const response =
              await fetch(
                `/api/player-quiz/search-club?q=${encodeURIComponent(
                  query,
                )}`,
                {
                  cache:
                    "no-store",
                },
              );

            const json =
              (await response.json()) as ClubSearchResponse;

            if (
              response.ok &&
              json.ok
            ) {
              setClubSuggestions(
                normalizeClubSuggestions(
                  json.clubs ??
                    [],
                ),
              );
            }
          } catch {
            // autocomplete
          }
        },
        250,
      );

    return () =>
      window.clearTimeout(
        timeout,
      );
  }, [
    clubQuery,
    remainingSeconds,
  ]);

  /* =======================================================
     APPLY SERVER PROGRESS
  ======================================================= */

  function applyProgress(
    progress:
      | AnswerProgress
      | undefined,
  ) {
    if (!progress) {
      return;
    }

    setBirthYearSolved(
      progress.birthYearCorrect,
    );

    setNationalitySolved(
      progress.nationalityCorrect,
    );

    setAttemptCount(
      progress.attemptCount,
    );
  }

  /* =======================================================
     SUBMIT ANSWER
  ======================================================= */

  async function submitAnswer(
    field:
      | "birthYear"
      | "nationality"
      | "club",

    value:
      | string
      | number,
  ) {
    if (
      remainingSeconds <=
        0 ||
      resultSentRef.current
    ) {
      return;
    }

    try {
      setAnswerLoading(
        field,
      );

      setGameError(
        "",
      );

      const response =
        await fetch(
          `/api/challenges/${encodeURIComponent(
            token,
          )}/player-quiz/answer`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                field,
                value,
              }),
          },
        );

      const json =
        (await response.json()) as AnswerResponse;

      if (
        !response.ok ||
        !json.ok
      ) {
        throw new Error(
          json.error ??
            "Cevap kontrol edilemedi.",
        );
      }

      applyProgress(
        json.progress,
      );

      /* ===================================================
         BIRTH YEAR
      =================================================== */

      if (
        field ===
        "birthYear"
      ) {
        if (
          json.correct
        ) {
          setBirthYearSolved(
            true,
          );
        } else {
          setGameError(
            "Doğum yılı yanlış.",
          );
        }

        return;
      }

      /* ===================================================
         NATIONALITY
      =================================================== */

      if (
        field ===
        "nationality"
      ) {
        if (
          json.correct
        ) {
          setNationalitySolved(
            true,
          );

          setCountrySuggestions(
            [],
          );
        } else {
          setGameError(
            "Milliyet yanlış.",
          );
        }

        return;
      }

      /* ===================================================
         CLUB
      =================================================== */

      if (
        json.duplicate
      ) {
        setGameError(
          "Bu kulübü zaten buldun.",
        );

        return;
      }

      if (
        !json.correct ||
        !json.matchedClub
      ) {
        setGameError(
          "Bu kulüp oyuncunun kariyerinde yok.",
        );

        return;
      }

      setSolvedClubs(
        (
          current,
        ) => {
          if (
            current.some(
              (
                club,
              ) =>
                club.id ===
                json
                  .matchedClub!
                  .id,
            )
          ) {
            return current;
          }

          return [
            ...current,

            json.matchedClub!,
          ].sort(
            (
              first,
              second,
            ) =>
              first.careerOrder -
              second.careerOrder,
          );
        },
      );

      setClubQuery(
        "",
      );

      setClubSuggestions(
        [],
      );
    } catch (error) {
      setGameError(
        error instanceof Error
          ? error.message
          : "Cevap kontrol edilemedi.",
      );
    } finally {
      setAnswerLoading(
        null,
      );
    }
  }

  /* =======================================================
     COUNTS
  ======================================================= */

  const requiredClubCount =
    game?.board
      ?.clubSlots ??
    0;

  const allClubsSolved =
    requiredClubCount >
      0 &&
    solvedClubs.length >=
      requiredClubCount;

  const correctCount =
    (
      birthYearSolved
        ? 1
        : 0
    ) +
    (
      nationalitySolved
        ? 1
        : 0
    ) +
    solvedClubs.length;

  const totalCount =
    game?.board
      ?.totalSlots ??
    0;

  const puzzleCompleted =
    totalCount >
      0 &&
    correctCount >=
      totalCount;

  /* =======================================================
     FINALIZE
  ======================================================= */

  const finalizeResult =
    useCallback(
      async (
        reason:
          | "completed"
          | "timeout",
      ) => {
        if (
          resultSentRef.current
        ) {
          return;
        }

        resultSentRef.current =
          true;

        try {
          setResultLoading(
            true,
          );

          setGameError(
            "",
          );

          const response =
            await fetch(
              `/api/challenges/${encodeURIComponent(
                token,
              )}/player-quiz/result`,
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    reason,
                  }),
              },
            );

          const json =
            (await response.json()) as ResultResponse;

          if (
            !response.ok ||
            !json.ok
          ) {
            resultSentRef.current =
              false;

            throw new Error(
              json.error ??
                "Sonuç gönderilemedi.",
            );
          }

          setResult(
            json,
          );

          await loadChallenge(
            true,
          );
        } catch (error) {
          setGameError(
            error instanceof Error
              ? error.message
              : "Sonuç gönderilemedi.",
          );
        } finally {
          setResultLoading(
            false,
          );
        }
      },
      [
        loadChallenge,
        token,
      ],
    );

  /* =======================================================
     EARLY COMPLETION
  ======================================================= */

  useEffect(() => {
    if (
      puzzleCompleted &&
      challengeData
        ?.challenge
        ?.status ===
        "playing" &&
      !resultSentRef.current
    ) {
      void finalizeResult(
        "completed",
      );
    }
  }, [
    challengeData
      ?.challenge
      ?.status,
    finalizeResult,
    puzzleCompleted,
  ]);

  /* =======================================================
     TIMEOUT
  ======================================================= */

  useEffect(() => {
    if (
      remainingSeconds >
        0 ||
      challengeData
        ?.challenge
        ?.status !==
        "playing" ||
      resultSentRef.current ||
      timeoutSentRef.current ||
      !game?.ok
    ) {
      return;
    }

    timeoutSentRef.current =
      true;

    void finalizeResult(
      "timeout",
    );
  }, [
    challengeData
      ?.challenge
      ?.status,
    finalizeResult,
    game?.ok,
    remainingSeconds,
  ]);

  /* =======================================================
     FORFEIT
  ======================================================= */

  async function forfeitChallenge() {
    if (
      forfeitLoading ||
      resultSentRef.current
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Düellodan pes etmek istediğine emin misin? Rakibin maçı kazanacak.",
      );

    if (!confirmed) {
      return;
    }

    try {
      setForfeitLoading(
        true,
      );

      setGameError(
        "",
      );

      const response =
        await fetch(
          `/api/challenges/${encodeURIComponent(
            token,
          )}/player-quiz/forfeit`,
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
            "Pes etme işlemi başarısız oldu.",
        );
      }

      resultSentRef.current =
        true;

      await loadChallenge();
    } catch (error) {
      setGameError(
        error instanceof Error
          ? error.message
          : "Pes etme işlemi başarısız oldu.",
      );
    } finally {
      setForfeitLoading(
        false,
      );
    }
  }

  /* =======================================================
     FINISHED PLAYER POLLING
  ======================================================= */

  useEffect(() => {
    if (
      !result
        ?.waitingForOpponent
    ) {
      return;
    }

    const interval =
      window.setInterval(
        () => {
          void loadChallenge(
            true,
          );
        },
        1800,
      );

    return () =>
      window.clearInterval(
        interval,
      );
  }, [
    loadChallenge,
    result
      ?.waitingForOpponent,
  ]);

  /* =======================================================
     DERIVED
  ======================================================= */

  const challenge =
    challengeData
      ?.challenge;

  const gameLabel =
    challenge
      ? GAME_LABELS[
          challenge.gameCode
        ] ??
        challenge.gameCode
      : "";

  const currentRole =
    challengeData
      ?.role;

  const currentPlayerName =
    currentRole ===
    "challenger"
      ? challenge
          ?.challenger
          .name
      : challenge
          ?.opponent
          ?.name;

  const opponentPlayerName =
    currentRole ===
    "challenger"
      ? challenge
          ?.opponent
          ?.name
      : challenge
          ?.challenger
          .name;

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    challengeLoading &&
    !challengeData
  ) {
    return (
      <ChallengeShell>

        <LoadingState
          text="Meydan okuma hazırlanıyor..."
        />

      </ChallengeShell>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (
    !challengeData
      ?.ok ||
    !challenge
  ) {
    return (
      <ChallengeShell>

        <CenteredState
          emoji="⚠️"
          title="Meydan okuma açılamadı"
          description={
            pageError ||
            challengeData
              ?.error ||
            "Bu bağlantı geçerli olmayabilir."
          }
        />

        <div className="mt-6 text-center">

          <Link
            href="/"
            className="inline-flex rounded-xl bg-green-500 px-5 py-3 text-sm font-black text-[#07111f]"
          >
            Ana Sayfaya Dön
          </Link>

        </div>

      </ChallengeShell>
    );
  }

  /* =======================================================
     EXPIRED
  ======================================================= */

  if (
    challengeData.expired
  ) {
    return (
      <ChallengeShell>

        <CenteredState
          emoji="⏰"
          title="Meydan okumanın süresi dolmuş"
          description="Yeni bir challenge oluşturup tekrar kapışabilirsiniz."
        />

      </ChallengeShell>
    );
  }

  /* =======================================================
     VISITOR / JOIN
  ======================================================= */

  if (
    challengeData.role ===
      "visitor" &&
    challengeData.canJoin
  ) {
    return (
      <ChallengeShell>

        <div className="mx-auto max-w-xl">

          <div className="text-center">

            <div className="text-6xl">
              ⚔️
            </div>

            <p className="mt-5 text-xs font-black uppercase tracking-[0.25em] text-purple-400">
              FootBattle Düellosu
            </p>

            <h1 className="mt-3 text-3xl font-black sm:text-4xl">
              Sana meydan okundu!
            </h1>

            <p className="mt-4 text-sm leading-6 text-slate-400">
              Hesap açmadan direkt düelloya katılabilirsin.
            </p>

          </div>

          <div className="mt-8 rounded-2xl border border-purple-500/20 bg-purple-500/[0.06] p-5">

            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
              Rakibin
            </p>

            <p className="mt-2 text-2xl font-black">
              {challenge
                .challenger
                .name}
            </p>

            <div className="my-5 h-px bg-white/10" />

            <p className="text-xs font-black uppercase tracking-wider text-slate-500">
              Oyun
            </p>

            <p className="mt-2 font-black text-purple-300">
              {gameLabel}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              ⏱ 250 saniye · En çok doğru bilgiyi bulan kazanır.
            </p>

          </div>

          <label className="mt-7 block">

            <span className="text-sm font-black text-slate-300">
              Düelloda görünecek ismin
            </span>

            <input
              value={
                opponentName
              }
              onChange={(
                event,
              ) =>
                setOpponentName(
                  event.target
                    .value,
                )
              }
              maxLength={
                30
              }
              placeholder="Örn. Emre"
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-4 font-bold outline-none focus:border-purple-400/50"
              onKeyDown={(
                event,
              ) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  void joinChallenge();
                }
              }}
            />

          </label>

          {pageError && (
            <ErrorBox
              text={
                pageError
              }
            />
          )}

          <button
            type="button"
            onClick={() =>
              void joinChallenge()
            }
            disabled={
              joinLoading
            }
            className="mt-5 w-full rounded-xl bg-purple-500 px-5 py-4 font-black transition hover:bg-purple-400 disabled:opacity-50"
          >
            {joinLoading
              ? "Katılıyorsun..."
              : "⚔️ Meydan Okumayı Kabul Et"}
          </button>

          <p className="mt-4 text-center text-xs text-slate-600">
            Üyelik gerektirmez.
          </p>

        </div>

      </ChallengeShell>
    );
  }

  /* =======================================================
     WAITING
  ======================================================= */

  if (
    challengeData
      .waitingForOpponent
  ) {
    return (
      <ChallengeShell>

        <CenteredState
          emoji="⚔️"
          eyebrow="MEYDAN OKUMA HAZIR"
          title="Rakibini bekliyoruz"
          description="Davet linkini gönderdiğin kişi katıldığında bu ekran otomatik güncellenecek."
        >

          <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.03] p-5">

            <p className="text-sm font-black text-purple-300">
              {gameLabel}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              ⏱ 250 saniye
            </p>

            <div className="mt-5 flex items-center justify-center gap-2 text-sm font-bold text-green-400">

              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-400" />

              Rakip bekleniyor...

            </div>

          </div>

        </CenteredState>

      </ChallengeShell>
    );
  }

  /* =======================================================
     READY
  ======================================================= */

  if (
    challenge.status ===
    "ready"
  ) {
    return (
      <ChallengeShell>

        <VersusHeader
          leftName={
            challenge
              .challenger
              .name ??
            "Oyuncu 1"
          }
          rightName={
            challenge
              .opponent
              ?.name ??
            "Oyuncu 2"
          }
          currentRole={
            currentRole
          }
        />

        <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">

          <p className="text-xs font-black uppercase tracking-wider text-slate-500">
            Oyun
          </p>

          <p className="mt-2 text-xl font-black text-purple-300">
            {gameLabel}
          </p>

          <p className="mt-3 text-sm text-slate-400">
            İkinize de aynı Player Quiz gelecek.
          </p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">

            <RuleBadge>
              ⏱ 250 sn
            </RuleBadge>

            <RuleBadge>
              +1 her doğru
            </RuleBadge>

            <RuleBadge>
              Can yok
            </RuleBadge>

          </div>

        </div>

        {pageError && (
          <ErrorBox
            text={
              pageError
            }
          />
        )}

        <button
          type="button"
          onClick={() =>
            void startChallenge()
          }
          disabled={
            startLoading
          }
          className="mt-6 w-full rounded-xl bg-green-500 px-5 py-4 text-lg font-black text-[#07111f] transition hover:bg-green-400 disabled:opacity-50"
        >
          {startLoading
            ? "Başlatılıyor..."
            : "🔥 Düelloyu Başlat"}
        </button>

        <p className="mt-3 text-center text-xs text-slate-600">
          Taraflardan birinin başlatması yeterli.
        </p>

      </ChallengeShell>
    );
  }

  /* =======================================================
     GAME LOADING
  ======================================================= */

  if (
    challenge.status ===
      "playing" &&
    gameLoading &&
    !game
  ) {
    return (
      <ChallengeShell>

        <LoadingState
          text="Aynı Player Quiz iki tarafa hazırlanıyor..."
        />

      </ChallengeShell>
    );
  }

  /* =======================================================
     GAME ERROR
  ======================================================= */

  if (
    challenge.status ===
      "playing" &&
    gameError &&
    !game?.ok
  ) {
    return (
      <ChallengeShell>

        <CenteredState
          emoji="⚠️"
          title="Player Quiz hazırlanamadı"
          description={
            gameError
          }
        />

        <button
          type="button"
          onClick={() =>
            void prepareGame()
          }
          className="mt-6 w-full rounded-xl bg-purple-500 px-5 py-4 font-black"
        >
          Tekrar Dene
        </button>

      </ChallengeShell>
    );
  }

  /* =======================================================
     WAITING AFTER FINALIZE
  ======================================================= */

  if (
    result
      ?.waitingForOpponent &&
    !challengeData.completed
  ) {
    return (
      <ChallengeShell>

        <CenteredState
          emoji="✅"
          eyebrow="SENİN OYUNUN BİTTİ"
          title="Rakibini bekliyoruz"
          description="Sonucun kaydedildi. Rakibin Player Quiz'i bitirdiğinde kazanan otomatik belli olacak."
        >

          <div className="mt-7 rounded-2xl border border-green-500/20 bg-green-500/[0.06] p-6">

            <p className="text-xs font-black uppercase text-slate-500">
              Doğru Bilgi
            </p>

            <p className="mt-2 text-4xl font-black text-green-400">
              {result.correctCount ??
                result.score ??
                correctCount}
              /
              {result.totalCount ??
                totalCount}
            </p>

            <div className="mt-4 flex justify-center gap-5 text-xs text-slate-400">

              <span>
                ⏱{" "}
                {result.durationSeconds ??
                  (
                    PLAYER_QUIZ_VS_DURATION_SECONDS -
                    remainingSeconds
                  )}
                sn
              </span>

              <span>
                ❌{" "}
                {result.wrongAttemptCount ??
                  Math.max(
                    0,

                    attemptCount -
                      correctCount,
                  )}
              </span>

            </div>

          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-sm font-bold text-purple-300">

            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-purple-400" />

            {opponentPlayerName ??
              "Rakip"} oynuyor...

          </div>

        </CenteredState>

      </ChallengeShell>
    );
  }

  /* =======================================================
     COMPLETED
  ======================================================= */

  if (
    challengeData.completed ||
    challenge.status ===
      "completed"
  ) {
    const myResult =
      challengeData.result;

    return (
      <ChallengeShell>

        <div className="text-center">

          <div className="text-6xl">
            {myResult ===
            "win"
              ? "🏆"
              : myResult ===
                  "draw"
                ? "🤝"
                : "⚔️"}
          </div>

          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-purple-400">
            Player Quiz VS
          </p>

          <h1 className="mt-3 text-3xl font-black">

            {myResult ===
            "win"
              ? "Kazandın!"
              : myResult ===
                  "loss"
                ? "Rakibin kazandı"
                : "Berabere!"}

          </h1>

        </div>

        <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3">

          <ScoreCard
            name={
              challenge
                .challenger
                .name ??
              "Oyuncu 1"
            }
            score={
              challenge
                .challenger
                .score
            }
            winner={
              challenge
                .winnerSide ===
              "challenger"
            }
          />

          <div className="text-lg font-black text-purple-400">
            VS
          </div>

          <ScoreCard
            name={
              challenge
                .opponent
                ?.name ??
              "Oyuncu 2"
            }
            score={
              challenge
                .opponent
                ?.score ??
              0
            }
            winner={
              challenge
                .winnerSide ===
              "opponent"
            }
          />

        </div>

        {game?.player && (
          <div className="mt-7 rounded-2xl border border-white/10 bg-[#07111f] p-5 text-center">

            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Gizli Oyuncu
            </p>

            <p className="mt-2 text-xl font-black">
              {game.player
                .fullName}
            </p>

          </div>
        )}

        <div className="mt-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.05] p-5 text-center">

          <p className="font-black">
            ⚔️ Rövanş?
          </p>

          <p className="mt-2 text-sm text-slate-400">
            Rövanş ve sonucu hesaba bağlama sıradaki aşama.
          </p>

        </div>

        <Link
          href="/"
          className="mt-5 flex w-full items-center justify-center rounded-xl bg-green-500 px-5 py-4 font-black text-[#07111f]"
        >
          FootBattle&apos;a Dön
        </Link>

      </ChallengeShell>
    );
  }

  /* =======================================================
     PLAYER QUIZ
  ======================================================= */

  if (
    challenge.status ===
      "playing" &&
    game?.ok &&
    game.player &&
    game.board
  ) {
    const timerCritical =
      remainingSeconds <=
      30;

    return (
      <ChallengeShell
        wide
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-400">
              ⚔️ PLAYER QUIZ VS
            </p>

            <p className="mt-1 text-sm font-bold text-slate-400">
              {currentPlayerName ??
                "Sen"}
              {" vs "}
              {opponentPlayerName ??
                "Rakip"}
            </p>

          </div>

          <div className="flex items-center gap-2">

            <div
              className={`rounded-xl border px-4 py-2 text-right ${
                timerCritical
                  ? "border-red-500/30 bg-red-500/10"
                  : "border-white/10 bg-[#07111f]"
              }`}
            >

              <p className="text-[10px] font-black uppercase text-slate-500">
                Kalan Süre
              </p>

              <p
                className={`font-mono text-xl font-black ${
                  timerCritical
                    ? "text-red-300"
                    : "text-yellow-300"
                }`}
              >
                {formatTimer(
                  remainingSeconds,
                )}
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                void forfeitChallenge()
              }
              disabled={
                forfeitLoading ||
                resultLoading
              }
              className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-3 text-xs font-black text-red-300 transition hover:bg-red-500/10 disabled:opacity-40"
            >
              {forfeitLoading
                ? "..."
                : "🏳 Pes Et"}
            </button>

          </div>

        </div>

        {/* =================================================
            PLAYER HIDDEN
        ================================================= */}

        <div className="mt-6 text-center">

          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-3xl border border-purple-500/20 bg-purple-500/[0.06] sm:h-32 sm:w-32">

            <span className="text-5xl">
              ❓
            </span>

          </div>

          <h1 className="mt-4 text-2xl font-black sm:text-3xl">
            Gizli Futbolcu
          </h1>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
            250 saniye içinde doğum yılı, milliyet ve mümkün olduğunca fazla kariyer kulübünü bul.
          </p>

        </div>

        {/* =================================================
            LIVE SCORE
        ================================================= */}

        <div className="mt-6 grid grid-cols-2 gap-3">

          <div className="rounded-2xl border border-green-500/20 bg-green-500/[0.06] p-4 text-center">

            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Doğru
            </p>

            <p className="mt-1 text-3xl font-black text-green-400">
              {correctCount}
              /
              {totalCount}
            </p>

          </div>

          <div className="rounded-2xl border border-white/10 bg-[#07111f] p-4 text-center">

            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Yanlış Deneme
            </p>

            <p className="mt-1 text-3xl font-black">
              {Math.max(
                0,

                attemptCount -
                  correctCount,
              )}
            </p>

          </div>

        </div>

        {/* =================================================
            PROGRESS
        ================================================= */}

        <div className="mt-4 grid grid-cols-3 gap-2">

          <ProgressBox
            label="Doğum"
            solved={
              birthYearSolved
            }
            current={
              birthYearSolved
                ? 1
                : 0
            }
            total={
              1
            }
          />

          <ProgressBox
            label="Milliyet"
            solved={
              nationalitySolved
            }
            current={
              nationalitySolved
                ? 1
                : 0
            }
            total={
              1
            }
          />

          <ProgressBox
            label="Kulüpler"
            solved={
              allClubsSolved
            }
            current={
              solvedClubs.length
            }
            total={
              requiredClubCount
            }
          />

        </div>

        {gameError && (
          <ErrorBox
            text={
              gameError
            }
          />
        )}

        {/* =================================================
            BIRTH YEAR
        ================================================= */}

        <QuizSection
          title="🎂 Doğum Yılı"
          solved={
            birthYearSolved
          }
        >

          <div className="flex gap-2">

            <input
              type="number"
              value={
                birthYear
              }
              onChange={(
                event,
              ) =>
                setBirthYear(
                  event.target
                    .value,
                )
              }
              disabled={
                birthYearSolved ||
                remainingSeconds <=
                  0 ||
                resultLoading
              }
              placeholder="Örn. 1994"
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 font-bold outline-none focus:border-purple-400/50 disabled:opacity-50"
            />

            <button
              type="button"
              disabled={
                birthYearSolved ||
                answerLoading !==
                  null ||
                !birthYear ||
                remainingSeconds <=
                  0 ||
                resultLoading
              }
              onClick={() =>
                void submitAnswer(
                  "birthYear",

                  Number(
                    birthYear,
                  ),
                )
              }
              className="rounded-xl bg-purple-500 px-5 font-black disabled:opacity-40"
            >
              {birthYearSolved
                ? "✓"
                : "Kontrol"}
            </button>

          </div>

        </QuizSection>

        {/* =================================================
            NATIONALITY
        ================================================= */}

        <QuizSection
          title="🌍 Milliyet"
          solved={
            nationalitySolved
          }
        >

          <div className="relative">

            <div className="flex gap-2">

              <input
                value={
                  nationality
                }
                onChange={(
                  event,
                ) =>
                  setNationality(
                    event.target
                      .value,
                  )
                }
                disabled={
                  nationalitySolved ||
                  remainingSeconds <=
                    0 ||
                  resultLoading
                }
                placeholder="Ülke ara..."
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 font-bold outline-none focus:border-purple-400/50 disabled:opacity-50"
              />

              <button
                type="button"
                disabled={
                  nationalitySolved ||
                  answerLoading !==
                    null ||
                  !nationality.trim() ||
                  remainingSeconds <=
                    0 ||
                  resultLoading
                }
                onClick={() =>
                  void submitAnswer(
                    "nationality",

                    nationality,
                  )
                }
                className="rounded-xl bg-purple-500 px-5 font-black disabled:opacity-40"
              >
                {nationalitySolved
                  ? "✓"
                  : "Kontrol"}
              </button>

            </div>

            {!nationalitySolved &&
              countrySuggestions.length >
                0 &&
              remainingSeconds >
                0 && (
                <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#07111f] shadow-2xl">

                  {countrySuggestions.map(
                    (
                      country,
                    ) => (
                      <button
                        key={
                          country
                        }
                        type="button"
                        onClick={() => {
                          setNationality(
                            country,
                          );

                          setCountrySuggestions(
                            [],
                          );
                        }}
                        className="block w-full border-b border-white/[0.06] px-4 py-3 text-left text-sm font-bold transition last:border-0 hover:bg-white/[0.06]"
                      >
                        {country}
                      </button>
                    ),
                  )}

                </div>
              )}

          </div>

        </QuizSection>

        {/* =================================================
            CLUBS
        ================================================= */}

        <QuizSection
          title={`🏟️ Kariyer Kulüpleri (${solvedClubs.length}/${requiredClubCount})`}
          solved={
            allClubsSolved
          }
        >

          {!allClubsSolved &&
            remainingSeconds >
              0 &&
            !resultLoading && (
              <div className="relative">

                <input
                  value={
                    clubQuery
                  }
                  onChange={(
                    event,
                  ) =>
                    setClubQuery(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Kulüp ara..."
                  className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 font-bold outline-none focus:border-purple-400/50"
                />

                {clubSuggestions.length >
                  0 && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#07111f] shadow-2xl">

                    {clubSuggestions.map(
                      (
                        club,
                      ) => (
                        <button
                          key={
                            club.name
                          }
                          type="button"
                          disabled={
                            answerLoading !==
                            null
                          }
                          onClick={() =>
                            void submitAnswer(
                              "club",

                              club.name,
                            )
                          }
                          className="block w-full border-b border-white/[0.06] px-4 py-3 text-left text-sm font-bold transition last:border-0 hover:bg-white/[0.06]"
                        >
                          {club.name}
                        </button>
                      ),
                    )}

                  </div>
                )}

              </div>
            )}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">

            {Array.from(
              {
                length:
                  requiredClubCount,
              },
              (
                _,
                index,
              ) => {
                const club =
                  solvedClubs[
                    index
                  ];

                return (
                  <div
                    key={
                      index
                    }
                    className={`rounded-xl border px-4 py-3 ${
                      club
                        ? "border-green-500/20 bg-green-500/[0.07]"
                        : "border-white/10 bg-black/10"
                    }`}
                  >

                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                      Kulüp{" "}
                      {index +
                        1}
                    </p>

                    <p
                      className={`mt-1 truncate text-sm font-black ${
                        club
                          ? "text-green-300"
                          : "text-slate-600"
                      }`}
                    >
                      {club
                        ? club.name
                        : "???"}
                    </p>

                  </div>
                );
              },
            )}

          </div>

        </QuizSection>

        {/* =================================================
            FOOTER
        ================================================= */}

        <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#07111f] px-4 py-3">

          <div>

            <p className="text-[10px] font-black uppercase text-slate-600">
              Toplam Deneme
            </p>

            <p className="font-black">
              {attemptCount}
            </p>

          </div>

          <div className="text-right">

            <p className="text-[10px] font-black uppercase text-slate-600">
              Bulunan Bilgi
            </p>

            <p className="font-black text-green-400">
              {correctCount}
              /
              {totalCount}
            </p>

          </div>

        </div>

        {resultLoading && (
          <div className="mt-5 rounded-xl border border-green-500/20 bg-green-500/[0.06] px-4 py-4 text-center text-sm font-bold text-green-400">
            ✓ Sonucun hesaplanıyor...
          </div>
        )}

      </ChallengeShell>
    );
  }

  /* =======================================================
     FALLBACK
  ======================================================= */

  return (
    <ChallengeShell>

      <CenteredState
        emoji="⚔️"
        title="Düello hazırlanıyor"
        description={`Durum: ${challenge.status}`}
      />

    </ChallengeShell>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */

function ChallengeShell({
  children,
  wide = false,
}: {
  children:
    React.ReactNode;

  wide?: boolean;
}) {
  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-6 text-white sm:px-6">

      <div
        className={`mx-auto ${
          wide
            ? "max-w-[980px]"
            : "max-w-[820px]"
        }`}
      >

        <header className="flex items-center justify-between border-b border-white/10 pb-5">

          <Link
            href="/"
            className="flex items-center gap-3"
          >

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500 text-sm font-black text-[#07111f]">
              FB
            </div>

            <div>

              <p className="font-black">
                FootBattle
              </p>

              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Challenge
              </p>

            </div>

          </Link>

          <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-purple-300">
            ⚔️ Düello
          </span>

        </header>

        <section className="mt-7 rounded-3xl border border-white/10 bg-[#0d1828] p-5 shadow-2xl shadow-black/20 sm:p-8">
          {children}
        </section>

      </div>

    </main>
  );
}

function LoadingState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="py-20 text-center">

      <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-purple-400" />

      <p className="mt-5 text-sm font-bold text-slate-400">
        {text}
      </p>

    </div>
  );
}

function CenteredState({
  emoji,
  eyebrow,
  title,
  description,
  children,
}: {
  emoji: string;
  eyebrow?: string;
  title: string;
  description: string;

  children?:
    React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xl py-8 text-center">

      <div className="text-6xl">
        {emoji}
      </div>

      {eyebrow && (
        <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-purple-400">
          {eyebrow}
        </p>
      )}

      <h1 className="mt-4 text-3xl font-black">
        {title}
      </h1>

      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">
        {description}
      </p>

      {children}

    </div>
  );
}

function ErrorBox({
  text,
}: {
  text: string;
}) {
  return (
    <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
      {text}
    </div>
  );
}

function VersusHeader({
  leftName,
  rightName,
  currentRole,
}: {
  leftName: string;
  rightName: string;

  currentRole:
    | ChallengeRole
    | undefined;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">

      <MiniPlayer
        name={
          leftName
        }
        active={
          currentRole ===
          "challenger"
        }
      />

      <div className="text-2xl font-black text-purple-400">
        VS
      </div>

      <MiniPlayer
        name={
          rightName
        }
        active={
          currentRole ===
          "opponent"
        }
      />

    </div>
  );
}

function MiniPlayer({
  name,
  active,
}: {
  name: string;
  active: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl border p-4 text-center ${
        active
          ? "border-green-500/30 bg-green-500/[0.07]"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >

      <div
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-xl text-xl font-black ${
          active
            ? "bg-green-500 text-[#07111f]"
            : "bg-purple-500/15 text-purple-300"
        }`}
      >
        {name
          .slice(
            0,
            1,
          )
          .toUpperCase()}
      </div>

      <p className="mt-2 truncate font-black">
        {name}
      </p>

      {active && (
        <p className="mt-1 text-[9px] font-black uppercase text-green-400">
          Sen
        </p>
      )}

    </div>
  );
}

function QuizSection({
  title,
  solved,
  children,
}: {
  title: string;
  solved: boolean;

  children:
    React.ReactNode;
}) {
  return (
    <section
      className={`mt-5 rounded-2xl border p-5 ${
        solved
          ? "border-green-500/20 bg-green-500/[0.04]"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >

      <div className="mb-4 flex items-center justify-between">

        <h2 className="font-black">
          {title}
        </h2>

        {solved && (
          <span className="rounded-full bg-green-500/15 px-3 py-1 text-[10px] font-black uppercase text-green-400">
            ✓ Doğru
          </span>
        )}

      </div>

      {children}

    </section>
  );
}

function ProgressBox({
  label,
  solved,
  current,
  total,
}: {
  label: string;
  solved: boolean;
  current: number;
  total: number;
}) {
  return (
    <div
      className={`rounded-xl border p-3 text-center ${
        solved
          ? "border-green-500/20 bg-green-500/[0.06]"
          : "border-white/10 bg-black/10"
      }`}
    >

      <p className="text-[9px] font-black uppercase tracking-wider text-slate-600">
        {label}
      </p>

      <p
        className={`mt-1 text-lg font-black ${
          solved
            ? "text-green-400"
            : "text-white"
        }`}
      >
        {current}/{total}
      </p>

    </div>
  );
}

function ScoreCard({
  name,
  score,
  winner,
}: {
  name: string;
  score: number;
  winner: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl border p-5 text-center ${
        winner
          ? "border-yellow-400/30 bg-yellow-400/[0.08]"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >

      {winner && (
        <p className="mb-2 text-xl">
          👑
        </p>
      )}

      <p className="truncate font-black">
        {name}
      </p>

      <p
        className={`mt-3 text-3xl font-black ${
          winner
            ? "text-yellow-300"
            : "text-white"
        }`}
      >
        {formatScore(
          score,
        )}
      </p>

      <p className="mt-1 text-[10px] font-bold uppercase text-slate-600">
        doğru bilgi
      </p>

    </div>
  );
}

function RuleBadge({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <span className="rounded-full border border-white/10 bg-[#07111f] px-3 py-1.5 text-xs font-black text-slate-300">
      {children}
    </span>
  );
}