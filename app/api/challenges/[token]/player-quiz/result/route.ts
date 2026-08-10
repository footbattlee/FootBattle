import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  buildPlayerQuizSeniorCareer,
  type RawPlayerQuizClub,
} from "@/lib/player-quiz/clubs";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const GUEST_COOKIE_NAME =
  "footbattle_guest";

const PLAYER_QUIZ_VS_DURATION_SECONDS =
  250;

type ResultBody = {
  reason?:
    | "completed"
    | "timeout";
};

type ChallengeRow = {
  id: number | string;
  invite_token: string;
  game_code: string;
  status: string;

  challenger_user_id:
    | string
    | null;

  challenger_guest_id:
    | string
    | null;

  opponent_user_id:
    | string
    | null;

  opponent_guest_id:
    | string
    | null;

  challenger_score: number;
  opponent_score: number;

  winner_side:
    | "challenger"
    | "opponent"
    | "draw"
    | null;

  started_at:
    | string
    | null;

  completed_at:
    | string
    | null;
};

type GameRow = {
  challenge_id:
    | number
    | string;

  player_id:
    | number
    | string;

  challenger_birth_year_correct: boolean;
  opponent_birth_year_correct: boolean;

  challenger_nationality_correct: boolean;
  opponent_nationality_correct: boolean;

  challenger_solved_club_ids:
    | number[]
    | string[]
    | null;

  opponent_solved_club_ids:
    | number[]
    | string[]
    | null;

  challenger_attempt_count: number;
  opponent_attempt_count: number;

  challenger_finalized: boolean;
  opponent_finalized: boolean;

  challenger_duration_seconds:
    | number
    | null;

  opponent_duration_seconds:
    | number
    | null;

  challenger_forfeited: boolean;
  opponent_forfeited: boolean;

  challenger_completed: boolean;
  opponent_completed: boolean;

  challenger_score: number;
  opponent_score: number;

  challenger_completed_at:
    | string
    | null;

  opponent_completed_at:
    | string
    | null;
};

/* =========================================================
   HELPERS
========================================================= */

function sanitizeToken(
  value: unknown,
) {
  return String(value ?? "")
    .trim()
    .replace(
      /[^a-zA-Z0-9]/g,
      "",
    )
    .slice(0, 64);
}

function parseStoredClubIds(
  value:
    | number[]
    | string[]
    | null
    | undefined,
) {
  if (!Array.isArray(value)) {
    return [] as number[];
  }

  return Array.from(
    new Set(
      value
        .map(Number)
        .filter(
          (id) =>
            Number.isInteger(id) &&
            id > 0,
        ),
    ),
  );
}

function getCorrectCount({
  birthYearCorrect,
  nationalityCorrect,
  solvedClubIds,
}: {
  birthYearCorrect: boolean;
  nationalityCorrect: boolean;
  solvedClubIds: number[];
}) {
  return (
    (birthYearCorrect ? 1 : 0) +
    (nationalityCorrect ? 1 : 0) +
    solvedClubIds.length
  );
}

function getElapsedSeconds(
  startedAt:
    | string
    | null,
) {
  if (!startedAt) {
    return 0;
  }

  const start =
    new Date(
      startedAt,
    ).getTime();

  if (
    Number.isNaN(start)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(
      (
        Date.now() -
        start
      ) /
        1000,
    ),
  );
}

function getCurrentResult(
  role:
    | "challenger"
    | "opponent",
  winnerSide:
    | "challenger"
    | "opponent"
    | "draw"
    | null,
) {
  if (!winnerSide) {
    return "waiting" as const;
  }

  if (
    winnerSide ===
    "draw"
  ) {
    return "draw" as const;
  }

  if (
    winnerSide === role
  ) {
    return "win" as const;
  }

  return "loss" as const;
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  request: Request,
  context: {
    params: Promise<{
      token: string;
    }>;
  },
) {
  try {
    /* =====================================================
       TOKEN
    ===================================================== */

    const {
      token: rawToken,
    } =
      await context.params;

    const token =
      sanitizeToken(
        rawToken,
      );

    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Geçerli challenge bulunamadı.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       BODY
    ===================================================== */

    let body: ResultBody =
      {};

    try {
      body =
        (await request.json()) as ResultBody;
    } catch {
      body =
        {};
    }

    const reason =
      body.reason ??
      "completed";

    if (
      reason !==
        "completed" &&
      reason !==
        "timeout"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Geçersiz bitirme nedeni.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       AUTH / GUEST
    ===================================================== */

    const authClient =
      await createAuthServerClient();

    const {
      data: {
        user,
      },
    } =
      await authClient.auth.getUser();

    const cookieStore =
      await cookies();

    const guestId =
      cookieStore.get(
        GUEST_COOKIE_NAME,
      )?.value ??
      null;

    /* =====================================================
       CHALLENGE
    ===================================================== */

    const {
      data:
        challengeData,

      error:
        challengeError,
    } =
      await supabaseAdmin
        .from(
          "guest_challenges",
        )
        .select(`
          id,
          invite_token,
          game_code,
          status,

          challenger_user_id,
          challenger_guest_id,

          opponent_user_id,
          opponent_guest_id,

          challenger_score,
          opponent_score,

          winner_side,
          started_at,
          completed_at
        `)
        .eq(
          "invite_token",
          token,
        )
        .maybeSingle();

    if (
      challengeError ||
      !challengeData
    ) {
      console.error(
        "Player Quiz VS result challenge okunamadı:",
        challengeError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Challenge bulunamadı.",
        },
        {
          status:
            challengeError
              ? 500
              : 404,
        },
      );
    }

    const challenge =
      challengeData as ChallengeRow;

    if (
      challenge.game_code !==
      "player_quiz"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu challenge Player Quiz değil.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      challenge.status !==
        "playing" &&
      challenge.status !==
        "completed"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Düello sonuçlandırılabilir durumda değil.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       ROLE
    ===================================================== */

    const isChallenger =
      user
        ? challenge
            .challenger_user_id ===
          user.id
        : Boolean(
            guestId &&
              challenge
                .challenger_guest_id ===
                guestId,
          );

    const isOpponent =
      user
        ? challenge
            .opponent_user_id ===
          user.id
        : Boolean(
            guestId &&
              challenge
                .opponent_guest_id ===
                guestId,
          );

    if (
      !isChallenger &&
      !isOpponent
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu challenge için sonuç gönderemezsin.",
        },
        {
          status: 403,
        },
      );
    }

    const role:
      | "challenger"
      | "opponent" =
      isChallenger
        ? "challenger"
        : "opponent";

    /* =====================================================
       GAME STATE
    ===================================================== */

    const {
      data:
        gameData,

      error:
        gameError,
    } =
      await supabaseAdmin
        .from(
          "guest_challenge_player_quiz",
        )
        .select(`
          challenge_id,
          player_id,

          challenger_birth_year_correct,
          opponent_birth_year_correct,

          challenger_nationality_correct,
          opponent_nationality_correct,

          challenger_solved_club_ids,
          opponent_solved_club_ids,

          challenger_attempt_count,
          opponent_attempt_count,

          challenger_finalized,
          opponent_finalized,

          challenger_duration_seconds,
          opponent_duration_seconds,

          challenger_forfeited,
          opponent_forfeited,

          challenger_completed,
          opponent_completed,

          challenger_score,
          opponent_score,

          challenger_completed_at,
          opponent_completed_at
        `)
        .eq(
          "challenge_id",
          challenge.id,
        )
        .maybeSingle();

    if (
      gameError ||
      !gameData
    ) {
      console.error(
        "Player Quiz VS result game okunamadı:",
        gameError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Challenge oyunu bulunamadı.",
        },
        {
          status: 409,
        },
      );
    }

    const game =
      gameData as GameRow;

    const playerId =
      Number(
        game.player_id,
      );

    /* =====================================================
       SENIOR CAREER / MAXIMUM SCORE
    ===================================================== */

    const {
      data:
        rawClubs,

      error:
        clubsError,
    } =
      await supabaseAdmin
        .from(
          "player_quiz_clubs",
        )
        .select(`
          id,
          club_name,
          career_order
        `)
        .eq(
          "player_id",
          playerId,
        )
        .order(
          "career_order",
          {
            ascending:
              true,
          },
        );

    if (
      clubsError
    ) {
      console.error(
        "Player Quiz result career okunamadı:",
        clubsError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyuncunun kariyer bilgileri okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    const seniorCareer =
      buildPlayerQuizSeniorCareer(
        (
          rawClubs ??
          []
        ) as RawPlayerQuizClub[],
      );

    if (
      seniorCareer.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyuncunun kariyer kulüpleri hazırlanamadı.",
        },
        {
          status: 422,
        },
      );
    }

    const totalCount =
      seniorCareer.length +
      2;

    /* =====================================================
       CURRENT SIDE STATE
    ===================================================== */

    const ownBirthYearCorrect =
      role === "challenger"
        ? Boolean(
            game
              .challenger_birth_year_correct,
          )
        : Boolean(
            game
              .opponent_birth_year_correct,
          );

    const ownNationalityCorrect =
      role === "challenger"
        ? Boolean(
            game
              .challenger_nationality_correct,
          )
        : Boolean(
            game
              .opponent_nationality_correct,
          );

    const ownSolvedClubIds =
      role === "challenger"
        ? parseStoredClubIds(
            game
              .challenger_solved_club_ids,
          )
        : parseStoredClubIds(
            game
              .opponent_solved_club_ids,
          );

    const ownAttemptCount =
      role === "challenger"
        ? Number(
            game
              .challenger_attempt_count ??
              0,
          )
        : Number(
            game
              .opponent_attempt_count ??
              0,
          );

    const ownFinalized =
      role === "challenger"
        ? Boolean(
            game
              .challenger_finalized,
          )
        : Boolean(
            game
              .opponent_finalized,
          );

    const ownForfeited =
      role === "challenger"
        ? Boolean(
            game
              .challenger_forfeited,
          )
        : Boolean(
            game
              .opponent_forfeited,
          );

    const ownCorrectCount =
      getCorrectCount({
        birthYearCorrect:
          ownBirthYearCorrect,

        nationalityCorrect:
          ownNationalityCorrect,

        solvedClubIds:
          ownSolvedClubIds,
      });

    /* =====================================================
       ALREADY FINALIZED
    ===================================================== */

    if (
      ownFinalized
    ) {
      const ownDuration =
        role === "challenger"
          ? game
              .challenger_duration_seconds
          : game
              .opponent_duration_seconds;

      const ownScore =
        role === "challenger"
          ? Number(
              game
                .challenger_score,
            )
          : Number(
              game
                .opponent_score,
            );

      return NextResponse.json({
        ok: true,

        finalized:
          true,

        alreadyFinalized:
          true,

        role,

        reason:
          ownForfeited
            ? "forfeit"
            : reason,

        score:
          ownScore,

        correctCount:
          ownScore,

        totalCount,

        durationSeconds:
          ownDuration ??
          PLAYER_QUIZ_VS_DURATION_SECONDS,

        attemptCount:
          ownAttemptCount,

        wrongAttemptCount:
          Math.max(
            0,
            ownAttemptCount -
              ownScore,
          ),

        challengeCompleted:
          challenge.status ===
          "completed",

        waitingForOpponent:
          challenge.status !==
          "completed",

        winnerSide:
          challenge.winner_side,

        result:
          getCurrentResult(
            role,
            challenge.winner_side,
          ),
      });
    }

    if (
      ownForfeited
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu düellodan pes ettin.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       TIME
    ===================================================== */

    const elapsedSeconds =
      getElapsedSeconds(
        challenge.started_at,
      );

    const timeExpired =
      elapsedSeconds >=
      PLAYER_QUIZ_VS_DURATION_SECONDS;

    const fullyCompleted =
      ownCorrectCount ===
      totalCount;

    /*
     * Kullanıcı "completed" diye erken finalize etmeye
     * çalışıyorsa gerçekten her şeyi çözmüş olmalı.
     */
    if (
      reason ===
        "completed" &&
      !fullyCompleted
    ) {
      return NextResponse.json(
        {
          ok: false,

          finalized:
            false,

          correctCount:
            ownCorrectCount,

          totalCount,

          remainingSeconds:
            Math.max(
              0,

              PLAYER_QUIZ_VS_DURATION_SECONDS -
                elapsedSeconds,
            ),

          error:
            "Player Quiz henüz tamamen tamamlanmadı.",
        },
        {
          status: 409,
        },
      );
    }

    /*
     * Timeout client tarafından erken gönderilemez.
     */
    if (
      reason ===
        "timeout" &&
      !timeExpired
    ) {
      return NextResponse.json(
        {
          ok: false,

          finalized:
            false,

          correctCount:
            ownCorrectCount,

          totalCount,

          remainingSeconds:
            PLAYER_QUIZ_VS_DURATION_SECONDS -
            elapsedSeconds,

          error:
            "Player Quiz süresi henüz dolmadı.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       FINAL DURATION

       Full tamamladıysa gerçek süre.
       Timeout ise kesin 250.
    ===================================================== */

    const durationSeconds =
      reason ===
      "timeout"
        ? PLAYER_QUIZ_VS_DURATION_SECONDS
        : Math.min(
            elapsedSeconds,
            PLAYER_QUIZ_VS_DURATION_SECONDS,
          );

    /*
     * Ana skor = doğru bilgi sayısı.
     */
    const finalScore =
      ownCorrectCount;

    const completedAt =
      new Date().toISOString();

    /* =====================================================
       SAVE OWN FINAL RESULT
    ===================================================== */

    const ownUpdate =
      role === "challenger"
        ? {
            challenger_finalized:
              true,

            challenger_completed:
              true,

            challenger_score:
              finalScore,

            challenger_duration_seconds:
              durationSeconds,

            challenger_completed_at:
              completedAt,

            updated_at:
              completedAt,
          }
        : {
            opponent_finalized:
              true,

            opponent_completed:
              true,

            opponent_score:
              finalScore,

            opponent_duration_seconds:
              durationSeconds,

            opponent_completed_at:
              completedAt,

            updated_at:
              completedAt,
          };

    const {
      error:
        ownUpdateError,
    } =
      await supabaseAdmin
        .from(
          "guest_challenge_player_quiz",
        )
        .update(
          ownUpdate,
        )
        .eq(
          "challenge_id",
          challenge.id,
        );

    if (
      ownUpdateError
    ) {
      console.error(
        "Player Quiz VS finalize kaydedilemedi:",
        ownUpdateError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Player Quiz sonucu kaydedilemedi.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       ALSO UPDATE MAIN CHALLENGE SCORE
    ===================================================== */

    const mainScoreUpdate =
      role === "challenger"
        ? {
            challenger_score:
              finalScore,

            updated_at:
              completedAt,
          }
        : {
            opponent_score:
              finalScore,

            updated_at:
              completedAt,
          };

    const {
      error:
        mainScoreError,
    } =
      await supabaseAdmin
        .from(
          "guest_challenges",
        )
        .update(
          mainScoreUpdate,
        )
        .eq(
          "id",
          challenge.id,
        );

    if (
      mainScoreError
    ) {
      console.error(
        "Guest challenge skor update hatası:",
        mainScoreError,
      );
    }

    /* =====================================================
       RE-READ FULL GAME

       Rakip aynı anda finalize etmiş olabilir.
    ===================================================== */

    const {
      data:
        finalGameData,

      error:
        finalGameError,
    } =
      await supabaseAdmin
        .from(
          "guest_challenge_player_quiz",
        )
        .select(`
          challenge_id,
          player_id,

          challenger_birth_year_correct,
          opponent_birth_year_correct,

          challenger_nationality_correct,
          opponent_nationality_correct,

          challenger_solved_club_ids,
          opponent_solved_club_ids,

          challenger_attempt_count,
          opponent_attempt_count,

          challenger_finalized,
          opponent_finalized,

          challenger_duration_seconds,
          opponent_duration_seconds,

          challenger_forfeited,
          opponent_forfeited,

          challenger_completed,
          opponent_completed,

          challenger_score,
          opponent_score,

          challenger_completed_at,
          opponent_completed_at
        `)
        .eq(
          "challenge_id",
          challenge.id,
        )
        .maybeSingle();

    if (
      finalGameError ||
      !finalGameData
    ) {
      console.error(
        "Finalize sonrası game okunamadı:",
        finalGameError,
      );

      return NextResponse.json({
        ok: true,

        finalized:
          true,

        alreadyFinalized:
          false,

        role,

        score:
          finalScore,

        correctCount:
          finalScore,

        totalCount,

        durationSeconds,

        attemptCount:
          ownAttemptCount,

        wrongAttemptCount:
          Math.max(
            0,
            ownAttemptCount -
              finalScore,
          ),

        challengeCompleted:
          false,

        waitingForOpponent:
          true,

        winnerSide:
          null,

        result:
          "waiting",
      });
    }

    const finalGame =
      finalGameData as GameRow;

    const bothFinalized =
      Boolean(
        finalGame
          .challenger_finalized,
      ) &&
      Boolean(
        finalGame
          .opponent_finalized,
      );

    /* =====================================================
       OTHER PLAYER STILL PLAYING
    ===================================================== */

    if (
      !bothFinalized
    ) {
      return NextResponse.json({
        ok: true,

        finalized:
          true,

        alreadyFinalized:
          false,

        role,

        score:
          finalScore,

        correctCount:
          finalScore,

        totalCount,

        durationSeconds,

        attemptCount:
          ownAttemptCount,

        wrongAttemptCount:
          Math.max(
            0,
            ownAttemptCount -
              finalScore,
          ),

        challengeCompleted:
          false,

        waitingForOpponent:
          true,

        winnerSide:
          null,

        result:
          "waiting",
      });
    }

    /* =====================================================
       BOTH FINALIZED - WINNER CALCULATION
    ===================================================== */

    const challengerScore =
      Number(
        finalGame
          .challenger_score ??
          0,
      );

    const opponentScore =
      Number(
        finalGame
          .opponent_score ??
          0,
      );

    const challengerDuration =
      Number(
        finalGame
          .challenger_duration_seconds ??
          PLAYER_QUIZ_VS_DURATION_SECONDS,
      );

    const opponentDuration =
      Number(
        finalGame
          .opponent_duration_seconds ??
          PLAYER_QUIZ_VS_DURATION_SECONDS,
      );

    const challengerAttempts =
      Number(
        finalGame
          .challenger_attempt_count ??
          0,
      );

    const opponentAttempts =
      Number(
        finalGame
          .opponent_attempt_count ??
          0,
      );

    /*
     * Attempt count:
     * her yeni doğru + her yanlış denemeyi içeriyor.
     *
     * Doğru cevap sayısını çıkardığımızda
     * yanlış deneme sayısını buluyoruz.
     */
    const challengerWrongAttempts =
      Math.max(
        0,

        challengerAttempts -
          challengerScore,
      );

    const opponentWrongAttempts =
      Math.max(
        0,

        opponentAttempts -
          opponentScore,
      );

    let winnerSide:
      | "challenger"
      | "opponent"
      | "draw";

    /* =====================================================
       RULE 1 — MORE CORRECT ANSWERS
    ===================================================== */

    if (
      challengerScore >
      opponentScore
    ) {
      winnerSide =
        "challenger";
    } else if (
      opponentScore >
      challengerScore
    ) {
      winnerSide =
        "opponent";
    }

    /* =====================================================
       RULE 2 — SAME SCORE → FASTER
    ===================================================== */

    else if (
      challengerDuration <
      opponentDuration
    ) {
      winnerSide =
        "challenger";
    } else if (
      opponentDuration <
      challengerDuration
    ) {
      winnerSide =
        "opponent";
    }

    /* =====================================================
       RULE 3 — SAME TIME → FEWER WRONG ATTEMPTS
    ===================================================== */

    else if (
      challengerWrongAttempts <
      opponentWrongAttempts
    ) {
      winnerSide =
        "challenger";
    } else if (
      opponentWrongAttempts <
      challengerWrongAttempts
    ) {
      winnerSide =
        "opponent";
    }

    /* =====================================================
       RULE 4 — DRAW
    ===================================================== */

    else {
      winnerSide =
        "draw";
    }

    /* =====================================================
       COMPLETE CHALLENGE
    ===================================================== */

    const challengeCompletedAt =
      new Date().toISOString();

    const {
      error:
        completeError,
    } =
      await supabaseAdmin
        .from(
          "guest_challenges",
        )
        .update({
          status:
            "completed",

          challenger_score:
            challengerScore,

          opponent_score:
            opponentScore,

          winner_side:
            winnerSide,

          completed_at:
            challengeCompletedAt,

          updated_at:
            challengeCompletedAt,
        })
        .eq(
          "id",
          challenge.id,
        )
        .in(
          "status",
          [
            "playing",
            "completed",
          ],
        );

    if (
      completeError
    ) {
      console.error(
        "Player Quiz VS challenge tamamlanamadı:",
        completeError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Düello sonucu tamamlanamadı.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       CURRENT PLAYER RESULT
    ===================================================== */

    const currentResult =
      getCurrentResult(
        role,
        winnerSide,
      );

    return NextResponse.json({
      ok: true,

      finalized:
        true,

      alreadyFinalized:
        false,

      role,

      score:
        finalScore,

      correctCount:
        finalScore,

      totalCount,

      durationSeconds,

      attemptCount:
        ownAttemptCount,

      wrongAttemptCount:
        Math.max(
          0,

          ownAttemptCount -
            finalScore,
        ),

      challengeCompleted:
        true,

      waitingForOpponent:
        false,

      winnerSide,

      result:
        currentResult,

      scores: {
        challenger:
          challengerScore,

        opponent:
          opponentScore,
      },

      durations: {
        challenger:
          challengerDuration,

        opponent:
          opponentDuration,
      },

      wrongAttempts: {
        challenger:
          challengerWrongAttempts,

        opponent:
          opponentWrongAttempts,
      },
    });
  } catch (error) {
    console.error(
      "Player Quiz VS result endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Düello sonucu gönderilirken beklenmeyen bir hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}