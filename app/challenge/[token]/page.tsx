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

const CLUB_CLASH_WIN_SCORE =
  3;

const CLUB_CLASH_ROUND_COUNT =
  5;

/* =========================================================
   COMMON TYPES
========================================================= */

type ChallengeRole =
  | "challenger"
  | "opponent"
  | "visitor";

type ChallengeSide =
  | "challenger"
  | "opponent";

type WinnerSide =
  | "challenger"
  | "opponent"
  | "draw"
  | null;

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
    WinnerSide;

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

/* =========================================================
   PLAYER QUIZ TYPES
========================================================= */

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
    WinnerSide;

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
    WinnerSide;

  result?:
    | "win"
    | "loss"
    | "draw"
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
   CLUB CLASH TYPES
========================================================= */

type ClubClashConstraint = {
  type: string;
  value: string;
};

type ClubClashRound = {
  id: number;
  roundNo: number;

  left: ClubClashConstraint;
  right: ClubClashConstraint;

  winnerSide:
    WinnerSide;

  challengerAnswer?:
    | string
    | null;

  opponentAnswer?:
    | string
    | null;

  challengerAnswerPlayerId?:
    | number
    | null;

  opponentAnswerPlayerId?:
    | number
    | null;

  challengerAnsweredAt?:
    | string
    | null;

  opponentAnsweredAt?:
    | string
    | null;

  completedAt:
    | string
    | null;

  createdAt?:
    string;
};

type ClubClashStateResponse = {
  ok?: boolean;

  role?:
    ChallengeSide;

  game?: {
    code: string;
    label: string;
    roundCount: number;
    winScore: number;
  };

  challenge?: {
    id: number;
    token: string;
    status: string;

    startedAt:
      | string
      | null;

    completedAt:
      | string
      | null;

    createdAt: string;
    updatedAt: string;
  };

  players?: {
    challenger: {
      name:
        | string
        | null;

      score: number;
    };

    opponent: {
      name:
        | string
        | null;

      score: number;
    };
  };

  me?: {
    side:
      ChallengeSide;

    name:
      | string
      | null;

    score: number;
  };

  opponent?: {
    side:
      ChallengeSide;

    name:
      | string
      | null;

    score: number;
  };

  score?: {
    challenger: number;
    opponent: number;
  };

  roundCount?: number;

  completedRoundCount?: number;

  currentRound?:
    | ClubClashRound
    | null;

  rounds?:
    ClubClashRound[];

  winnerSide?:
    WinnerSide;

  completed?: boolean;

  result?:
    | "win"
    | "loss"
    | "draw"
    | null;

  error?: string;
};

type ClubClashPrepareResponse = {
  ok?: boolean;

  role?:
    ChallengeSide;

  alreadyPrepared?: boolean;

  roundCount?: number;

  game?: {
    code: string;
    label: string;
    roundCount: number;
    winScore: number;
  };

  rounds?: ClubClashRound[];

  error?: string;
};

type ClubClashPlayerSuggestion = {
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

  popularityScore:
    | number
    | null;
};

type ClubClashSearchResponse = {
  ok?: boolean;

  role?:
    ChallengeSide;

  query?: string;

  normalizedQuery?: string;

  minimumSearchLength?: number;

  players?:
    ClubClashPlayerSuggestion[];

  error?: string;
};

type ClubClashAnswerResponse = {
  ok?: boolean;

  correct?: boolean;

  won?: boolean;

  roundCompleted?: boolean;

  gameFinished?: boolean;

  role?:
    ChallengeSide;

  winScore?: number;

  message?: string;

  player?: {
    playerId: number;
    name: string;
  };

  score?: {
    challenger: number;
    opponent: number;
  };

  round?: {
    id: number;
    roundNo: number;

    winnerSide:
      WinnerSide;

    completedAt:
      | string
      | null;
  };

  nextRound?:
    | {
        id: number;
        roundNo: number;

        left: ClubClashConstraint;
        right: ClubClashConstraint;
      }
    | null;

  winnerSide?:
    WinnerSide;

  error?: string;
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

  club_country:
    "1 Takım 1 Millet",
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
     SHARE
  ======================================================= */

  const [
    linkCopied,
    setLinkCopied,
  ] =
    useState(false);

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
     PLAYER QUIZ ANSWERS
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
    useState<string[]>([]);

  const [
    clubQuery,
    setClubQuery,
  ] =
    useState("");

  const [
    clubSuggestions,
    setClubSuggestions,
  ] =
    useState<ClubSuggestion[]>([]);

  const [
    solvedClubs,
    setSolvedClubs,
  ] =
    useState<SolvedClub[]>([]);

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
     PLAYER QUIZ TIMER
  ======================================================= */

  const [
    remainingSeconds,
    setRemainingSeconds,
  ] =
    useState(
      PLAYER_QUIZ_VS_DURATION_SECONDS,
    );

  /* =======================================================
     PLAYER QUIZ RESULT
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
     COMMON FORFEIT
  ======================================================= */

  const [
    forfeitLoading,
    setForfeitLoading,
  ] =
    useState(false);

  /* =======================================================
     CLUB CLASH
  ======================================================= */

  const [
    clubClash,
    setClubClash,
  ] =
    useState<ClubClashStateResponse | null>(
      null,
    );

  const [
    clubClashPreparing,
    setClubClashPreparing,
  ] =
    useState(false);

  const [
    clubClashPrepared,
    setClubClashPrepared,
  ] =
    useState(false);

  const [
    clubClashError,
    setClubClashError,
  ] =
    useState("");

  const clubClashPrepareRef =
    useRef(false);

  /* =======================================================
     CLUB CLASH SEARCH
  ======================================================= */

  const [
    clashQuery,
    setClashQuery,
  ] =
    useState("");

  const [
    clashSuggestions,
    setClashSuggestions,
  ] =
    useState<
      ClubClashPlayerSuggestion[]
    >([]);

  const [
    clashSearchLoading,
    setClashSearchLoading,
  ] =
    useState(false);

  const [
    clashAnswerLoading,
    setClashAnswerLoading,
  ] =
    useState(false);

  const [
    clashMessage,
    setClashMessage,
  ] =
    useState("");

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
     SHARE CHALLENGE
  ======================================================= */

  function getChallengeUrl() {
    if (
      typeof window ===
      "undefined"
    ) {
      return "";
    }

    return `${window.location.origin}/challenge/${token}`;
  }

  async function copyChallengeLink() {
    try {
      const url =
        getChallengeUrl();

      await navigator.clipboard.writeText(
        url,
      );

      setLinkCopied(
        true,
      );

      window.setTimeout(
        () => {
          setLinkCopied(
            false,
          );
        },
        2000,
      );
    } catch {
      setPageError(
        "Davet linki kopyalanamadı.",
      );
    }
  }

  function shareChallengeWhatsApp() {
    const url =
      getChallengeUrl();

    const challengerName =
      challengeData
        ?.challenge
        ?.challenger
        ?.name ??
      "Bir arkadaşın";

    const gameCode =
      challengeData
        ?.challenge
        ?.gameCode;

    const label =
      gameCode
        ? GAME_LABELS[
            gameCode
          ] ??
          gameCode
        : "FootBattle";

    const ruleText =
      gameCode ===
      "club_clash"
        ? "🎯 5 round · İlk 3 roundu alan kazanır"
        : "⏱ 250 saniye · En çok doğru bilgiyi bulan kazanır";

    const message =
      `⚔️ ${challengerName} sana FootBattle'da meydan okuyor!\n\n` +
      `🎮 ${label}\n` +
      `${ruleText}\n\n` +
      `Hesap açmana gerek yok. Linke gir ve kapışmaya başla 👇\n` +
      `${url}`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        message,
      )}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

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

      clubClashPrepareRef.current =
        false;

      setClubClashPrepared(
        false,
      );

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
     PLAYER QUIZ PREPARE
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
     CLUB CLASH GET
  ======================================================= */

  const loadClubClash =
    useCallback(
      async (
        silent = false,
      ) => {
        try {
          if (!silent) {
            setClubClashError(
              "",
            );
          }

          const response =
            await fetch(
              `/api/challenges/${encodeURIComponent(
                token,
              )}/club-clash`,
              {
                cache:
                  "no-store",
              },
            );

          const json =
            (await response.json()) as ClubClashStateResponse;

          if (
            !response.ok ||
            !json.ok
          ) {
            if (!silent) {
              throw new Error(
                json.error ??
                  "2 Takım 1 Oyuncu bilgileri okunamadı.",
              );
            }

            return;
          }

          setClubClash(
            json,
          );

          setClubClashError(
            "",
          );
        } catch (error) {
          if (!silent) {
            setClubClashError(
              error instanceof Error
                ? error.message
                : "2 Takım 1 Oyuncu bilgileri okunamadı.",
            );
          }
        }
      },
      [
        token,
      ],
    );

  /* =======================================================
     CLUB CLASH PREPARE
  ======================================================= */

  const prepareClubClash =
    useCallback(
      async () => {
        if (
          clubClashPrepareRef.current
        ) {
          return;
        }

        clubClashPrepareRef.current =
          true;

        try {
          setClubClashPreparing(
            true,
          );

          setClubClashError(
            "",
          );

          const response =
            await fetch(
              `/api/challenges/${encodeURIComponent(
                token,
              )}/club-clash/prepare`,
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
            (await response.json()) as ClubClashPrepareResponse;

          if (
            !response.ok ||
            !json.ok
          ) {
            throw new Error(
              json.error ??
                "2 Takım 1 Oyuncu hazırlanamadı.",
            );
          }

          setClubClashPrepared(
            true,
          );

          await loadClubClash();
        } catch (error) {
          clubClashPrepareRef.current =
            false;

          setClubClashError(
            error instanceof Error
              ? error.message
              : "2 Takım 1 Oyuncu hazırlanamadı.",
          );
        } finally {
          setClubClashPreparing(
            false,
          );
        }
      },
      [
        loadClubClash,
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
        "club_clash"
    ) {
      void prepareClubClash();
    }
  }, [
    challengeData
      ?.challenge
      ?.gameCode,
    challengeData
      ?.challenge
      ?.status,
    prepareClubClash,
  ]);

  /* =======================================================
     CLUB CLASH LIVE POLLING
  ======================================================= */

  useEffect(() => {
    if (
      challengeData
        ?.challenge
        ?.gameCode !==
        "club_clash" ||
      challengeData
        ?.challenge
        ?.status !==
        "playing" ||
      !clubClashPrepared
    ) {
      return;
    }

    const interval =
      window.setInterval(
        () => {
          void loadClubClash(
            true,
          );
        },
        1200,
      );

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [
    challengeData
      ?.challenge
      ?.gameCode,
    challengeData
      ?.challenge
      ?.status,
    clubClashPrepared,
    loadClubClash,
  ]);

  /* =======================================================
     PLAYER QUIZ COUNTDOWN
  ======================================================= */

  useEffect(() => {
    const challenge =
      challengeData?.challenge;

    const startedAt =
      challenge?.startedAt;

    if (
      challenge?.gameCode !==
        "player_quiz" ||
      challenge.status !==
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
      ?.gameCode,
    challengeData
      ?.challenge
      ?.startedAt,
    challengeData
      ?.challenge
      ?.status,
  ]);

  /* =======================================================
     PLAYER QUIZ COUNTRY SEARCH
  ======================================================= */

  useEffect(() => {
    if (
      challengeData
        ?.challenge
        ?.gameCode !==
        "player_quiz" ||
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
    challengeData
      ?.challenge
      ?.gameCode,
    nationality,
    nationalitySolved,
    remainingSeconds,
  ]);

  /* =======================================================
     PLAYER QUIZ CLUB SEARCH
  ======================================================= */

  useEffect(() => {
    if (
      challengeData
        ?.challenge
        ?.gameCode !==
        "player_quiz" ||
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
    challengeData
      ?.challenge
      ?.gameCode,
    clubQuery,
    remainingSeconds,
  ]);

  /* =======================================================
     CLUB CLASH PLAYER SEARCH
  ======================================================= */

  useEffect(() => {
    if (
      challengeData
        ?.challenge
        ?.gameCode !==
        "club_clash" ||
      challengeData
        ?.challenge
        ?.status !==
        "playing" ||
      !clubClash
        ?.currentRound
    ) {
      setClashSuggestions(
        [],
      );

      return;
    }

    const query =
      clashQuery.trim();

    if (
      query.length <
      3
    ) {
      setClashSuggestions(
        [],
      );

      return;
    }

    let cancelled =
      false;

    const timeout =
      window.setTimeout(
        async () => {
          try {
            setClashSearchLoading(
              true,
            );

            const response =
              await fetch(
                `/api/challenges/${encodeURIComponent(
                  token,
                )}/club-clash/search-player?q=${encodeURIComponent(
                  query,
                )}`,
                {
                  cache:
                    "no-store",
                },
              );

            const json =
              (await response.json()) as ClubClashSearchResponse;

            if (
              cancelled
            ) {
              return;
            }

            if (
              !response.ok ||
              !json.ok
            ) {
              setClashSuggestions(
                [],
              );

              return;
            }

            setClashSuggestions(
              json.players ??
                [],
            );
          } catch {
            if (
              !cancelled
            ) {
              setClashSuggestions(
                [],
              );
            }
          } finally {
            if (
              !cancelled
            ) {
              setClashSearchLoading(
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

      window.clearTimeout(
        timeout,
      );
    };
  }, [
    challengeData
      ?.challenge
      ?.gameCode,
    challengeData
      ?.challenge
      ?.status,
    clashQuery,
    clubClash
      ?.currentRound
      ?.id,
    token,
  ]);

  /* =======================================================
     PLAYER QUIZ APPLY PROGRESS
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
     PLAYER QUIZ SUBMIT ANSWER
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
     CLUB CLASH SUBMIT ANSWER
  ======================================================= */

  async function submitClubClashAnswer(
    player:
      ClubClashPlayerSuggestion,
  ) {
    if (
      clashAnswerLoading ||
      !clubClash
        ?.currentRound
    ) {
      return;
    }

    try {
      setClashAnswerLoading(
        true,
      );

      setClubClashError(
        "",
      );

      setClashMessage(
        "",
      );

      setClashSuggestions(
        [],
      );

      const response =
        await fetch(
          `/api/challenges/${encodeURIComponent(
            token,
          )}/club-clash/answer`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                playerId:
                  player.playerId,

                answer:
                  player.name,
              }),
          },
        );

      const json =
        (await response.json()) as ClubClashAnswerResponse;

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
        !json.correct
      ) {
        setClashMessage(
          `❌ ${player.name} bu iki takımda da oynamadı.`,
        );

        return;
      }

      if (
        json.won
      ) {
        setClashMessage(
          json.gameFinished
            ? "🏆 Doğru! Düelloyu kazandın!"
            : `⚡ Doğru! ${json.round?.roundNo ?? ""}. round senin!`,
        );
      } else {
        setClashMessage(
          "✅ Cevap doğruydu fakat rakibin senden önce davrandı.",
        );
      }

      setClashQuery(
        "",
      );

      await Promise.all([
        loadClubClash(),
        loadChallenge(
          true,
        ),
      ]);
    } catch (error) {
      setClubClashError(
        error instanceof Error
          ? error.message
          : "Cevap kontrol edilemedi.",
      );
    } finally {
      setClashAnswerLoading(
        false,
      );
    }
  }

  /* =======================================================
     PLAYER QUIZ COUNTS
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
     PLAYER QUIZ FINALIZE
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
     PLAYER QUIZ EARLY COMPLETION
  ======================================================= */

  useEffect(() => {
    if (
      challengeData
        ?.challenge
        ?.gameCode ===
        "player_quiz" &&
      puzzleCompleted &&
      challengeData
        .challenge
        .status ===
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
      ?.gameCode,
    challengeData
      ?.challenge
      ?.status,
    finalizeResult,
    puzzleCompleted,
  ]);

  /* =======================================================
     PLAYER QUIZ TIMEOUT
  ======================================================= */

  useEffect(() => {
    if (
      challengeData
        ?.challenge
        ?.gameCode !==
        "player_quiz" ||
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
      ?.gameCode,
    challengeData
      ?.challenge
      ?.status,
    finalizeResult,
    game?.ok,
    remainingSeconds,
  ]);

  /* =======================================================
     COMMON FORFEIT
  ======================================================= */

  async function forfeitChallenge() {
    if (
      forfeitLoading
    ) {
      return;
    }

    const currentGameCode =
      challengeData
        ?.challenge
        ?.gameCode;

    if (
      currentGameCode !==
        "player_quiz" &&
      currentGameCode !==
        "club_clash"
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

      setClubClashError(
        "",
      );

      const endpoint =
        currentGameCode ===
        "club_clash"
          ? `/api/challenges/${encodeURIComponent(
              token,
            )}/club-clash/forfeit`
          : `/api/challenges/${encodeURIComponent(
              token,
            )}/player-quiz/forfeit`;

      const response =
        await fetch(
          endpoint,
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

      if (
        currentGameCode ===
        "player_quiz"
      ) {
        resultSentRef.current =
          true;
      }

      if (
        currentGameCode ===
        "club_clash"
      ) {
        await loadClubClash(
          true,
        );
      }

      await loadChallenge();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Pes etme işlemi başarısız oldu.";

      if (
        currentGameCode ===
        "club_clash"
      ) {
        setClubClashError(
          message,
        );
      } else {
        setGameError(
          message,
        );
      }
    } finally {
      setForfeitLoading(
        false,
      );
    }
  }

  /* =======================================================
     PLAYER QUIZ FINISHED POLLING
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

  const isPlayerQuiz =
    challenge
      ?.gameCode ===
    "player_quiz";

  const isClubClash =
    challenge
      ?.gameCode ===
    "club_clash";

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

            {isClubClash ? (
              <p className="mt-2 text-xs text-slate-500">
                ⚡ 5 round · İlk 3 roundu alan düelloyu kazanır.
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                ⏱ 250 saniye · En çok doğru bilgiyi bulan kazanır.
              </p>
            )}

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
          description="Davet linkini arkadaşına gönder. Katıldığı anda bu ekran otomatik güncellenecek."
        >

          <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.03] p-5">

            <p className="text-sm font-black text-purple-300">
              {gameLabel}
            </p>

            {isClubClash ? (
              <p className="mt-2 text-xs text-slate-500">
                ⚡ 5 round · İlk 3 alan kazanır
              </p>
            ) : (
              <p className="mt-2 text-xs text-slate-500">
                ⏱ 250 saniye
              </p>
            )}

            <div className="mt-5 flex items-center justify-center gap-2 text-sm font-bold text-green-400">

              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-400" />

              Rakip bekleniyor...

            </div>

          </div>

          {/* ===============================================
              LINK / WHATSAPP
          =============================================== */}

          <div className="mt-5">

            <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
              Rakibini davet et
            </p>

            <button
              type="button"
              onClick={
                shareChallengeWhatsApp
              }
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-4 font-black text-[#07111f] transition hover:brightness-110"
            >
              <span className="text-lg">
                💬
              </span>

              WhatsApp&apos;tan Davet Et
            </button>

            <button
              type="button"
              onClick={() =>
                void copyChallengeLink()
              }
              className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-4 font-black transition ${
                linkCopied
                  ? "border-green-500/30 bg-green-500/10 text-green-400"
                  : "border-white/10 bg-[#07111f] text-white hover:bg-white/[0.05]"
              }`}
            >

              <span>
                {linkCopied
                  ? "✓"
                  : "🔗"}
              </span>

              {linkCopied
                ? "Link Kopyalandı"
                : "Davet Linkini Kopyala"}

            </button>

          </div>

          <p className="mt-4 text-xs leading-5 text-slate-600">
            Arkadaşının FootBattle hesabı olmasına gerek yok.
            Linke tıklayıp ismini yazması yeterli.
          </p>

          {pageError && (
            <ErrorBox
              text={
                pageError
              }
            />
          )}

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

          {isClubClash ? (
            <>
              <p className="mt-3 text-sm text-slate-400">
                Her roundda iki takımda da forma giymiş futbolcuyu rakibinden önce bul.
              </p>

              <div className="mt-4 flex flex-wrap justify-center gap-2">

                <RuleBadge>
                  ⚡ 5 Round
                </RuleBadge>

                <RuleBadge>
                  🏆 İlk 3
                </RuleBadge>

                <RuleBadge>
                  🚀 En hızlı cevap
                </RuleBadge>

              </div>
            </>
          ) : (
            <>
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
            </>
          )}

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
     CLUB CLASH LOADING
  ======================================================= */

  if (
    isClubClash &&
    challenge.status ===
      "playing" &&
    (
      clubClashPreparing ||
      (
        !clubClash &&
        !clubClashError
      )
    )
  ) {
    return (
      <ChallengeShell>

        <LoadingState
          text="5 roundluk 2 Takım 1 Oyuncu düellosu hazırlanıyor..."
        />

      </ChallengeShell>
    );
  }

  /* =======================================================
     CLUB CLASH ERROR
  ======================================================= */

  if (
    isClubClash &&
    challenge.status ===
      "playing" &&
    clubClashError &&
    !clubClash
  ) {
    return (
      <ChallengeShell>

        <CenteredState
          emoji="⚠️"
          title="2 Takım 1 Oyuncu hazırlanamadı"
          description={
            clubClashError
          }
        />

        <button
          type="button"
          onClick={() => {
            clubClashPrepareRef.current =
              false;

            void prepareClubClash();
          }}
          className="mt-6 w-full rounded-xl bg-purple-500 px-5 py-4 font-black"
        >
          Tekrar Dene
        </button>

      </ChallengeShell>
    );
  }

  /* =======================================================
     PLAYER QUIZ LOADING
  ======================================================= */

  if (
    isPlayerQuiz &&
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
     PLAYER QUIZ ERROR
  ======================================================= */

  if (
    isPlayerQuiz &&
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
     PLAYER QUIZ WAITING AFTER FINALIZE
  ======================================================= */

  if (
    isPlayerQuiz &&
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
      challengeData.result ??
      (
        clubClash
          ?.result ??
        null
      );

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
            {gameLabel}
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
            label={
              isClubClash
                ? "round"
                : "doğru bilgi"
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
            label={
              isClubClash
                ? "round"
                : "doğru bilgi"
            }
          />

        </div>

        {isPlayerQuiz &&
          game?.player && (
            <div className="mt-7 rounded-2xl border border-white/10 bg-[#07111f] p-5 text-center">

              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Futbolcu
              </p>

              <p className="mt-2 text-xl font-black">
                {game.player
                  .fullName}
              </p>

            </div>
          )}

        {isClubClash &&
          clubClash
            ?.rounds &&
          clubClash.rounds
            .length >
            0 && (
            <div className="mt-7 rounded-2xl border border-white/10 bg-[#07111f] p-5">

              <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
                Round Sonuçları
              </p>

              <div className="mt-4 space-y-2">

                {clubClash.rounds.map(
                  (
                    round,
                  ) => (
                    <ClubClashRoundHistory
                      key={
                        round.id
                      }
                      round={
                        round
                      }
                      challengerName={
                        challenge
                          .challenger
                          .name
                      }
                      opponentName={
  challenge
    .opponent
    ?.name ?? null
}
                    />
                  ),
                )}

              </div>

            </div>
          )}

        <div className="mt-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.05] p-5 text-center">

          <p className="font-black">
            ⚔️ Rövanş?
          </p>

          <p className="mt-2 text-sm text-slate-400">
            Rövanş akışını bir sonraki aşamada aynı challenge sistemi üzerinden bağlayacağız.
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
     CLUB CLASH GAME
  ======================================================= */

  if (
    isClubClash &&
    challenge.status ===
      "playing" &&
    clubClash?.ok
  ) {
    const currentRound =
      clubClash.currentRound ??
      null;

    const challengerScore =
      clubClash.score
        ?.challenger ??
      challenge.challenger
        .score ??
      0;

    const opponentScore =
      clubClash.score
        ?.opponent ??
      challenge.opponent
        ?.score ??
      0;

    return (
      <ChallengeShell
        wide
      >

        {/* ===============================================
            HEADER
        =============================================== */}

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-400">
              ⚔️ 2 TAKIM 1 OYUNCU
            </p>

            <p className="mt-1 text-sm font-bold text-slate-400">
              İlk 3 roundu alan kazanır
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              void forfeitChallenge()
            }
            disabled={
              forfeitLoading
            }
            className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-xs font-black text-red-300 transition hover:bg-red-500/10 disabled:opacity-40"
          >
            {forfeitLoading
              ? "Pes ediliyor..."
              : "🏳 Pes Et"}
          </button>

        </div>

        {/* ===============================================
            SCORE
        =============================================== */}

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">

          <ClubClashScorePlayer
            name={
              challenge
                .challenger
                .name ??
              "Oyuncu 1"
            }
            score={
              challengerScore
            }
            active={
              currentRole ===
              "challenger"
            }
          />

          <div className="text-center">

            <p className="text-xs font-black uppercase text-slate-600">
              SKOR
            </p>

            <p className="mt-1 text-xl font-black text-purple-400">
              VS
            </p>

          </div>

          <ClubClashScorePlayer
            name={
              challenge
                .opponent
                ?.name ??
              "Oyuncu 2"
            }
            score={
              opponentScore
            }
            active={
              currentRole ===
              "opponent"
            }
          />

        </div>

        {/* ===============================================
            ROUND PROGRESS
        =============================================== */}

        <div className="mt-5">

          <div className="mb-2 flex items-center justify-between">

            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-600">
              Roundlar
            </p>

            <p className="text-xs font-black text-slate-400">
              {clubClash.completedRoundCount ??
                0}
              /
              {CLUB_CLASH_ROUND_COUNT}
            </p>

          </div>

          <div className="grid grid-cols-5 gap-2">

            {Array.from(
              {
                length:
                  CLUB_CLASH_ROUND_COUNT,
              },
              (
                _,
                index,
              ) => {
                const round =
                  clubClash.rounds?.find(
                    (
                      item,
                    ) =>
                      item.roundNo ===
                      index +
                        1,
                  );

                const isCurrent =
                  currentRound
                    ?.roundNo ===
                  index +
                    1;

                return (
                  <RoundProgressBox
                    key={
                      index
                    }
                    roundNo={
                      index +
                      1
                    }
                    winnerSide={
                      round
                        ?.winnerSide ??
                      null
                    }
                    currentRole={
                      currentRole
                    }
                    isCurrent={
                      isCurrent
                    }
                  />
                );
              },
            )}

          </div>

        </div>

        {clubClashError && (
          <ErrorBox
            text={
              clubClashError
            }
          />
        )}

        {clashMessage && (
          <div className="mt-4 rounded-xl border border-purple-500/20 bg-purple-500/[0.08] px-4 py-3 text-center text-sm font-black text-purple-200">
            {clashMessage}
          </div>
        )}

        {/* ===============================================
            CURRENT ROUND
        =============================================== */}

        {currentRound ? (
          <>

            <div className="mt-7 text-center">

              <p className="text-xs font-black uppercase tracking-[0.2em] text-green-400">
                ROUND{" "}
                {currentRound.roundNo}
              </p>

              <h1 className="mt-2 text-2xl font-black sm:text-3xl">
                İki takımda da oynayan futbolcuyu bul
              </h1>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Rakibinden önce doğru futbolcuyu seç ve roundu kap.
              </p>

            </div>

            {/* =============================================
                CLUB VS CLUB
            ============================================= */}

            <div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">

              <ConstraintCard
                type={
                  currentRound
                    .left
                    .type
                }
                value={
                  currentRound
                    .left
                    .value
                }
              />

              <div className="flex items-center justify-center">

                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-purple-500/30 bg-purple-500/10 text-sm font-black text-purple-300">
                  ×
                </div>

              </div>

              <ConstraintCard
                type={
                  currentRound
                    .right
                    .type
                }
                value={
                  currentRound
                    .right
                    .value
                }
              />

            </div>

            {/* =============================================
                SEARCH
            ============================================= */}

            <div className="relative mt-7">

              <label className="block">

                <span className="text-sm font-black text-slate-300">
                  Futbolcu Ara
                </span>

                <div className="relative mt-2">

                  <input
                    value={
                      clashQuery
                    }
                    onChange={(
                      event,
                    ) => {
                      setClashQuery(
                        event.target
                          .value,
                      );

                      setClashMessage(
                        "",
                      );
                    }}
                    disabled={
                      clashAnswerLoading
                    }
                    placeholder="En az 3 harf yaz... Örn. Sneijder"
                    autoComplete="off"
                    className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-4 pr-12 font-bold outline-none transition focus:border-purple-400/50 disabled:opacity-50"
                  />

                  {clashSearchLoading && (
                    <div className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin rounded-full border-2 border-white/10 border-t-purple-400" />
                  )}

                </div>

              </label>

              {clashQuery
                .trim()
                .length >
                0 &&
                clashQuery
                  .trim()
                  .length <
                  3 && (
                  <p className="mt-2 text-xs font-bold text-slate-600">
                    Oyuncu aramak için en az 3 harf yaz.
                  </p>
                )}

              {clashSuggestions.length >
                0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[330px] overflow-y-auto rounded-2xl border border-white/10 bg-[#07111f] p-1.5 shadow-2xl shadow-black/50">

                  {clashSuggestions.map(
                    (
                      player,
                    ) => (
                      <button
                        key={
                          player.playerId
                        }
                        type="button"
                        disabled={
                          clashAnswerLoading
                        }
                        onClick={() =>
                          void submitClubClashAnswer(
                            player,
                          )
                        }
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.06] disabled:opacity-50"
                      >

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]">

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

                          <p className="truncate text-sm font-black text-white">
                            {player.name}
                          </p>

                          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[10px] font-bold text-slate-500">

                            {player.nationality && (
                              <span>
                                🌍{" "}
                                {player.nationality}
                              </span>
                            )}

                            {player.currentClubName && (
                              <span>
                                ⚽{" "}
                                {player.currentClubName}
                              </span>
                            )}

                          </div>

                        </div>

                        <span className="shrink-0 text-purple-400">
                          →
                        </span>

                      </button>
                    ),
                  )}

                </div>
              )}

            </div>

            {clashAnswerLoading && (
              <div className="mt-4 rounded-xl border border-purple-500/20 bg-purple-500/[0.06] px-4 py-3 text-center text-sm font-bold text-purple-300">
                ⚡ Cevabın kontrol ediliyor...
              </div>
            )}

            {/* =============================================
                INFO
            ============================================= */}

            <div className="mt-6 rounded-2xl border border-yellow-400/15 bg-yellow-400/[0.04] p-4">

              <p className="text-sm font-black text-yellow-300">
                ⚡ Hız önemli
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                İkiniz de aynı roundu görüyorsunuz. Doğru futbolcuyu ilk seçen kişi roundu kazanır.
              </p>

            </div>

          </>
        ) : (
          <div className="mt-8 rounded-2xl border border-green-500/20 bg-green-500/[0.06] p-8 text-center">

            <div className="text-4xl">
              🏁
            </div>

            <p className="mt-4 text-xl font-black">
              Roundlar tamamlandı
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Sonuç hesaplanıyor...
            </p>

          </div>
        )}

        {/* ===============================================
            HISTORY
        =============================================== */}

        {clubClash.rounds &&
          clubClash.rounds.some(
            (
              round,
            ) =>
              Boolean(
                round.completedAt,
              ),
          ) && (
            <div className="mt-7 border-t border-white/10 pt-6">

              <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-600">
                Tamamlanan Roundlar
              </p>

              <div className="mt-3 space-y-2">

                {clubClash.rounds
                  .filter(
                    (
                      round,
                    ) =>
                      Boolean(
                        round.completedAt,
                      ),
                  )
                  .map(
                    (
                      round,
                    ) => (
                      <ClubClashRoundHistory
                        key={
                          round.id
                        }
                        round={
                          round
                        }
                        challengerName={
                          challenge
                            .challenger
                            .name
                        }
                        opponentName={
  challenge
    .opponent
    ?.name ?? null

                        }
                      />
                    ),
                  )}

              </div>

            </div>
          )}

      </ChallengeShell>
    );
  }

  /* =======================================================
     PLAYER QUIZ GAME
  ======================================================= */

  if (
    isPlayerQuiz &&
    challenge.status ===
      "playing" &&
    game?.ok &&
    game.player &&
    game.board
  ) {
    const timerCritical =
      remainingSeconds <=
      30;

    const wrongCount =
      Math.max(
        0,
        attemptCount -
          correctCount,
      );

    const progressPercentage =
      totalCount > 0
        ? Math.min(
            100,
            Math.max(
              0,
              (
                correctCount /
                totalCount
              ) * 100,
            ),
          )
        : 0;

    return (
      <ChallengeShell
        wide
      >

        {/* ===============================================
            COMPACT DUEL HEADER
        =============================================== */}

        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 sm:pb-5">

          <div className="min-w-0">

            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-purple-400 sm:text-xs sm:tracking-[0.18em]">
              ⚔️ PLAYER QUIZ VS
            </p>

            <p className="mt-1 truncate text-xs font-bold text-slate-400 sm:text-sm">
              {currentPlayerName ??
                "Sen"}
              {"  vs  "}
              {opponentPlayerName ??
                "Rakip"}
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
            className="shrink-0 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2.5 text-[10px] font-black text-red-300 transition hover:bg-red-500/10 disabled:opacity-40 sm:px-4 sm:py-3 sm:text-xs"
          >
            {forfeitLoading
              ? "..."
              : "🏳 Pes Et"}
          </button>

        </div>

        {/* ===============================================
            PLAYER HERO
        =============================================== */}

        <div className="mt-4 grid grid-cols-[96px_1fr] items-center gap-4 rounded-2xl border border-purple-500/15 bg-gradient-to-r from-purple-500/[0.08] to-transparent p-3 sm:mt-6 sm:grid-cols-[140px_1fr] sm:gap-6 sm:p-5">

          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-purple-500/20 bg-[#07111f] sm:h-36 sm:w-36 sm:rounded-3xl">

            {game.player.imageUrl ? (
              <img
                src={
                  game.player.imageUrl
                }
                alt={
                  game.player.fullName
                }
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-3xl sm:text-4xl">
                ⚽
              </span>
            )}

          </div>

          <div className="min-w-0">

            <p className="text-[9px] font-black uppercase tracking-[0.17em] text-purple-400 sm:text-[10px]">
              AYNI OYUNCU · AYNI SÜRE
            </p>

            <h1 className="mt-1.5 truncate text-xl font-black sm:mt-2 sm:text-3xl">
              {game.player.fullName}
            </h1>

            <p className="mt-1.5 text-[10px] leading-4 text-slate-500 sm:mt-2 sm:max-w-xl sm:text-sm sm:leading-6">
              Doğum yılı, milliyet ve kariyer kulüplerini rakibinden daha iyi doldur.
            </p>

          </div>

        </div>

        {/* ===============================================
            MOBILE / COMPACT LIVE STATUS
        =============================================== */}

        <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4">

          <DuelCompactStat
            label="Kalan Süre"
            value={
              formatTimer(
                remainingSeconds,
              )
            }
            tone={
              timerCritical
                ? "danger"
                : "warning"
            }
          />

          <DuelCompactStat
            label="Doğru"
            value={`${correctCount}/${totalCount}`}
            tone="success"
          />

          <DuelCompactStat
            label="Yanlış"
            value={`${wrongCount}`}
            tone={
              wrongCount > 0
                ? "danger"
                : "default"
            }
          />

        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">

          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500"
            style={{
              width:
                `${progressPercentage}%`,
            }}
          />

        </div>

        {/* ===============================================
            FIELD PROGRESS
        =============================================== */}

        <div className="mt-3 grid grid-cols-3 gap-1.5 sm:mt-4 sm:gap-2">

          <PlayerQuizMiniProgress
            label="Doğum"
            value={
              birthYearSolved
                ? "1/1"
                : "0/1"
            }
            solved={
              birthYearSolved
            }
          />

          <PlayerQuizMiniProgress
            label="Milliyet"
            value={
              nationalitySolved
                ? "1/1"
                : "0/1"
            }
            solved={
              nationalitySolved
            }
          />

          <PlayerQuizMiniProgress
            label="Kulüpler"
            value={`${solvedClubs.length}/${requiredClubCount}`}
            solved={
              allClubsSolved
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

        {/* ===============================================
            QUIZ FIELDS
        =============================================== */}

        <div className="mt-4 grid gap-3 sm:mt-5 sm:grid-cols-2 sm:gap-4">

          {/* =============================================
              BIRTH YEAR
          ============================================= */}

          <QuizSection
            title="🎂 Doğum Yılı"
            solved={
              birthYearSolved
            }
            progress={
              birthYearSolved
                ? "1/1"
                : "0/1"
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
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-sm font-bold outline-none focus:border-purple-400/50 disabled:opacity-50 sm:px-4 sm:text-base"
                onKeyDown={(
                  event,
                ) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    void submitAnswer(
                      "birthYear",
                      Number(
                        birthYear,
                      ),
                    );
                  }
                }}
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
                className="shrink-0 rounded-xl bg-purple-500 px-3 text-xs font-black transition hover:bg-purple-400 disabled:opacity-40 sm:px-5 sm:text-sm"
              >
                {answerLoading ===
                "birthYear"
                  ? "..."
                  : birthYearSolved
                    ? "✓"
                    : "Kontrol"}
              </button>

            </div>

          </QuizSection>

          {/* =============================================
              NATIONALITY
          ============================================= */}

          <QuizSection
            title="🌍 Milliyet"
            solved={
              nationalitySolved
            }
            progress={
              nationalitySolved
                ? "1/1"
                : "0/1"
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
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-sm font-bold outline-none focus:border-purple-400/50 disabled:opacity-50 sm:px-4 sm:text-base"
                  onKeyDown={(
                    event,
                  ) => {
                    if (
                      event.key ===
                      "Enter" &&
                      nationality.trim()
                    ) {
                      void submitAnswer(
                        "nationality",
                        nationality,
                      );
                    }
                  }}
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
                  className="shrink-0 rounded-xl bg-purple-500 px-3 text-xs font-black transition hover:bg-purple-400 disabled:opacity-40 sm:px-5 sm:text-sm"
                >
                  {answerLoading ===
                  "nationality"
                    ? "..."
                    : nationalitySolved
                      ? "✓"
                      : "Kontrol"}
                </button>

              </div>

              {!nationalitySolved &&
                countrySuggestions.length >
                  0 &&
                remainingSeconds >
                  0 && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[45dvh] overflow-y-auto rounded-xl border border-white/10 bg-[#07111f] shadow-2xl">

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

          {/* =============================================
              CLUBS
          ============================================= */}

          <QuizSection
            title="🏟️ Kariyer Kulüpleri"
            solved={
              allClubsSolved
            }
            progress={`${solvedClubs.length}/${requiredClubCount}`}
            wide
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
                    className="w-full rounded-xl border border-white/10 bg-[#07111f] px-3 py-3 text-sm font-bold outline-none focus:border-purple-400/50 sm:px-4 sm:text-base"
                  />

                  {clubSuggestions.length >
                    0 && (
                    <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[45dvh] overflow-y-auto rounded-xl border border-white/10 bg-[#07111f] shadow-2xl">

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

            <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-3">

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
                      className={`rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 ${
                        club
                          ? "border-green-500/20 bg-green-500/[0.07]"
                          : "border-white/10 bg-black/10"
                      }`}
                    >

                      <p className="text-[8px] font-black uppercase tracking-wider text-slate-600 sm:text-[10px]">
                        Kulüp{" "}
                        {index +
                          1}
                      </p>

                      <p
                        className={`mt-1 truncate text-xs font-black sm:text-sm ${
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

        </div>

        {/* ===============================================
            BOTTOM INFO
        =============================================== */}

        <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#07111f] px-3 py-2.5 sm:mt-6 sm:rounded-2xl sm:px-4 sm:py-3">

          <div>

            <p className="text-[8px] font-black uppercase text-slate-600 sm:text-[10px]">
              Toplam Deneme
            </p>

            <p className="text-sm font-black sm:text-base">
              {attemptCount}
            </p>

          </div>

          <div className="text-right">

            <p className="text-[8px] font-black uppercase text-slate-600 sm:text-[10px]">
              Bulunan Bilgi
            </p>

            <p className="text-sm font-black text-green-400 sm:text-base">
              {correctCount}
              /
              {totalCount}
            </p>

          </div>

        </div>

        {resultLoading && (
          <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/[0.06] px-4 py-3 text-center text-xs font-bold text-green-400 sm:mt-5 sm:py-4 sm:text-sm">
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

/* =========================================================
   CLUB CLASH COMPONENTS
========================================================= */

function ClubClashScorePlayer({
  name,
  score,
  active,
}: {
  name: string;
  score: number;
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

      <p className="truncate text-sm font-black">
        {name}
      </p>

      {active && (
        <p className="mt-1 text-[9px] font-black uppercase text-green-400">
          SEN
        </p>
      )}

      <p className="mt-3 text-4xl font-black text-white">
        {score}
      </p>

      <div className="mt-3 flex justify-center gap-1.5">

        {Array.from(
          {
            length:
              CLUB_CLASH_WIN_SCORE,
          },
          (
            _,
            index,
          ) => (
            <span
              key={
                index
              }
              className={`h-2.5 w-6 rounded-full ${
                index <
                score
                  ? "bg-green-400"
                  : "bg-white/10"
              }`}
            />
          ),
        )}

      </div>

    </div>
  );
}

function ConstraintCard({
  type,
  value,
}: {
  type: string;
  value: string;
}) {
  const isCountry =
    type ===
    "country";

  return (
    <div className="flex min-h-[150px] min-w-0 flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#07111f] p-4 text-center">

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-3xl">
        {isCountry
          ? "🌍"
          : "⚽"}
      </div>

      <p className="mt-3 text-[9px] font-black uppercase tracking-[0.15em] text-slate-600">
        {isCountry
          ? "MİLLET"
          : "TAKIM"}
      </p>

      <p className="mt-1 break-words text-base font-black text-white sm:text-lg">
        {value}
      </p>

    </div>
  );
}

function RoundProgressBox({
  roundNo,
  winnerSide,
  currentRole,
  isCurrent,
}: {
  roundNo: number;

  winnerSide:
    WinnerSide;

  currentRole:
    ChallengeRole
    | undefined;

  isCurrent: boolean;
}) {
  const mine =
    winnerSide &&
    winnerSide ===
      currentRole;

  const lost =
    winnerSide &&
    winnerSide !==
      "draw" &&
    winnerSide !==
      currentRole;

  return (
    <div
      className={`rounded-xl border py-3 text-center transition ${
        mine
          ? "border-green-500/25 bg-green-500/[0.08]"
          : lost
            ? "border-red-500/20 bg-red-500/[0.06]"
            : isCurrent
              ? "border-purple-500/40 bg-purple-500/[0.10]"
              : "border-white/10 bg-black/10"
      }`}
    >

      <p className="text-[9px] font-black uppercase text-slate-600">
        R{roundNo}
      </p>

      <p className="mt-1 text-lg font-black">
        {mine
          ? "✓"
          : lost
            ? "×"
            : isCurrent
              ? "⚡"
              : "·"}
      </p>

    </div>
  );
}

function ClubClashRoundHistory({
  round,
  challengerName,
  opponentName,
}: {
  round:
    ClubClashRound;

  challengerName:
    | string
    | null;

  opponentName:
    | string
    | null;
}) {
  const winnerName =
    round.winnerSide ===
    "challenger"
      ? challengerName ??
        "Oyuncu 1"
      : round.winnerSide ===
          "opponent"
        ? opponentName ??
          "Oyuncu 2"
        : "Berabere";

  const answer =
    round.winnerSide ===
    "challenger"
      ? round
          .challengerAnswer
      : round.winnerSide ===
          "opponent"
        ? round
            .opponentAnswer
        : null;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">

      <div className="flex items-center justify-between gap-3">

        <p className="text-xs font-black text-slate-400">
          Round{" "}
          {round.roundNo}
        </p>

        <p className="text-xs font-black text-green-400">
          {winnerName}
        </p>

      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">

        <span>
          {round.left.value}
        </span>

        <span className="text-purple-400">
          ×
        </span>

        <span>
          {round.right.value}
        </span>

      </div>

      {answer && (
        <p className="mt-2 text-sm font-black text-white">
          ⚽ {answer}
        </p>
      )}

    </div>
  );
}

/* =========================================================
   PLAYER QUIZ COMPONENTS
========================================================= */

function QuizSection({
  title,
  solved,
  progress,
  wide = false,
  children,
}: {
  title: string;
  solved: boolean;
  progress?: string;
  wide?: boolean;

  children:
    React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border p-3 transition sm:p-5 ${
        solved
          ? "border-green-500/20 bg-green-500/[0.04]"
          : "border-white/10 bg-white/[0.02]"
      } ${
        wide
          ? "sm:col-span-2"
          : ""
      }`}
    >

      <div className="mb-2.5 flex items-center justify-between gap-3 sm:mb-4">

        <h2 className="min-w-0 truncate text-xs font-black sm:text-base">
          {title}
        </h2>

        <div className="flex shrink-0 items-center gap-2">

          {progress && (
            <span className="text-[9px] font-black text-slate-500 sm:text-xs">
              {progress}
            </span>
          )}

          {solved && (
            <span className="rounded-full bg-green-500/15 px-2 py-1 text-[8px] font-black uppercase text-green-400 sm:px-3 sm:text-[10px]">
              ✓ Doğru
            </span>
          )}

        </div>

      </div>

      {children}

    </section>
  );
}

function DuelCompactStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?:
    | "default"
    | "success"
    | "warning"
    | "danger";
}) {
  const classes =
    tone ===
    "success"
      ? "border-green-500/20 bg-green-500/[0.06] text-green-300"
      : tone ===
          "warning"
        ? "border-yellow-400/20 bg-yellow-400/[0.06] text-yellow-300"
        : tone ===
            "danger"
          ? "border-red-500/20 bg-red-500/[0.06] text-red-300"
          : "border-white/10 bg-black/10 text-white";

  return (
    <div
      className={`rounded-xl border px-2 py-2.5 text-center ${classes}`}
    >

      <p className="text-[8px] font-black uppercase tracking-[0.1em] opacity-60 sm:text-[9px]">
        {label}
      </p>

      <p className="mt-1 font-mono text-sm font-black sm:text-lg">
        {value}
      </p>

    </div>
  );
}

function PlayerQuizMiniProgress({
  label,
  value,
  solved,
}: {
  label: string;
  value: string;
  solved: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-2 py-2 text-center sm:rounded-xl sm:p-3 ${
        solved
          ? "border-green-500/20 bg-green-500/[0.06]"
          : "border-white/[0.07] bg-black/10"
      }`}
    >

      <p className="truncate text-[8px] font-black uppercase tracking-wider text-slate-600 sm:text-[9px]">
        {label}
      </p>

      <p
        className={`mt-0.5 text-xs font-black sm:mt-1 sm:text-lg ${
          solved
            ? "text-green-400"
            : "text-white"
        }`}
      >
        {value}
      </p>

    </div>
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
  label = "puan",
}: {
  name: string;
  score: number;
  winner: boolean;
  label?: string;
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
        {label}
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