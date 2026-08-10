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

type ResultBody = {
  birthYear?: string | number;
  nationality?: string;
  solvedClubIds?: number[];
  attemptCount?: number;
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

  winner_side:
    | "challenger"
    | "opponent"
    | "draw"
    | null;

  started_at:
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

  challenger_completed: boolean;
  opponent_completed: boolean;

  challenger_score: number;
  opponent_score: number;

  challenger_attempt_count: number;
  opponent_attempt_count: number;

  challenger_completed_at:
    | string
    | null;

  opponent_completed_at:
    | string
    | null;
};

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

function normalizeText(
  value: unknown,
) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase(
      "tr-TR",
    )
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(
      /[.\-_/]/g,
      " ",
    )
    .replace(
      /\s+/g,
      " ",
    );
}

function parseAttemptCount(
  value: unknown,
) {
  const parsed =
    Number(
      value,
    );

  if (
    !Number.isInteger(
      parsed,
    ) ||
    parsed < 0 ||
    parsed > 500
  ) {
    return 0;
  }

  return parsed;
}

function calculateScore({
  attemptCount,
  completedAt,
  startedAt,
}: {
  attemptCount: number;
  completedAt: string;
  startedAt:
    | string
    | null;
}) {
  let durationSeconds =
    0;

  if (
    startedAt
  ) {
    const startTime =
      new Date(
        startedAt,
      ).getTime();

    const finishTime =
      new Date(
        completedAt,
      ).getTime();

    if (
      !Number.isNaN(
        startTime,
      ) &&
      !Number.isNaN(
        finishTime,
      ) &&
      finishTime >=
        startTime
    ) {
      durationSeconds =
        Math.floor(
          (
            finishTime -
            startTime
          ) /
            1000,
        );
    }
  }

  /*
   * Şimdilik:
   *
   * 1000 temel puan
   * her deneme -20
   * her saniye -2
   * minimum 100
   */
  const score =
    Math.max(
      100,

      1000 -
        attemptCount *
          20 -
        durationSeconds *
          2,
    );

  return {
    score,
    durationSeconds,
  };
}

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

    const body =
      (await request.json()) as ResultBody;

    const attemptCount =
      parseAttemptCount(
        body.attemptCount,
      );

    const solvedClubIds =
      Array.isArray(
        body.solvedClubIds,
      )
        ? Array.from(
            new Set(
              body.solvedClubIds
                .map(
                  Number,
                )
                .filter(
                  (
                    id,
                  ) =>
                    Number.isInteger(
                      id,
                    ) &&
                    id > 0,
                ),
            ),
          )
        : [];

    /* =====================================================
       AUTH
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

          winner_side,
          started_at
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
            "Düello sonuç gönderilebilir durumda değil.",
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

    const role =
      isChallenger
        ? "challenger"
        : "opponent";

    /* =====================================================
       GAME
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

          challenger_completed,
          opponent_completed,

          challenger_score,
          opponent_score,

          challenger_attempt_count,
          opponent_attempt_count,

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
       ALREADY COMPLETED
    ===================================================== */

    const alreadyCompleted =
      role ===
      "challenger"
        ? game
            .challenger_completed
        : game
            .opponent_completed;

    if (
      alreadyCompleted
    ) {
      return NextResponse.json({
        ok: true,

        completed:
          true,

        alreadyCompleted:
          true,

        role,

        score:
          role ===
          "challenger"
            ? Number(
                game.challenger_score,
              )
            : Number(
                game.opponent_score,
              ),

        challengeCompleted:
          challenge.status ===
          "completed",

        winnerSide:
          challenge.winner_side,
      });
    }

    /* =====================================================
       REAL ANSWERS
    ===================================================== */

    const [
      detailsResult,
      playerResult,
      clubsResult,
    ] =
      await Promise.all([
        supabaseAdmin
          .from(
            "player_quiz_details",
          )
          .select(
            "birth_year",
          )
          .eq(
            "player_id",
            playerId,
          )
          .maybeSingle(),

        supabaseAdmin
          .from(
            "guess_players",
          )
          .select(
            "nationality",
          )
          .eq(
            "player_id",
            playerId,
          )
          .maybeSingle(),

        supabaseAdmin
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
          ),
      ]);

    if (
      detailsResult.error ||
      !detailsResult.data
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Doğum yılı doğrulanamadı.",
        },
        {
          status: 500,
        },
      );
    }

    if (
      playerResult.error ||
      !playerResult.data
        ?.nationality
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Milliyet doğrulanamadı.",
        },
        {
          status: 500,
        },
      );
    }

    if (
      clubsResult.error
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Kulüp bilgileri doğrulanamadı.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       SENIOR CAREER
    ===================================================== */

    const seniorCareer =
      buildPlayerQuizSeniorCareer(
        (
          clubsResult.data ??
          []
        ) as RawPlayerQuizClub[],
      );

    if (
      seniorCareer.length <
      1
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

    /* =====================================================
       VERIFY ANSWERS
    ===================================================== */

    const birthYearCorrect =
      Number(
        body.birthYear,
      ) ===
      Number(
        detailsResult.data
          .birth_year,
      );

    const nationalityCorrect =
      normalizeText(
        body.nationality,
      ) ===
      normalizeText(
        playerResult.data
          .nationality,
      );

    const targetClubIds =
      new Set(
        seniorCareer.map(
          (
            club,
          ) =>
            Number(
              club.id,
            ),
        ),
      );

    const submittedClubsValid =
      solvedClubIds.every(
        (
          clubId,
        ) =>
          targetClubIds.has(
            clubId,
          ),
      );

    const allClubsSolved =
      targetClubIds.size >
        0 &&
      submittedClubsValid &&
      solvedClubIds.length ===
        targetClubIds.size;

    const completed =
      birthYearCorrect &&
      nationalityCorrect &&
      allClubsSolved;

    if (!completed) {
      return NextResponse.json(
        {
          ok: false,

          completed:
            false,

          error:
            "Player Quiz henüz tamamlanmış görünmüyor.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       SCORE
    ===================================================== */

    const completedAt =
      new Date().toISOString();

    const {
      score,
      durationSeconds,
    } =
      calculateScore({
        attemptCount,

        completedAt,

        startedAt:
          challenge.started_at,
      });

    /* =====================================================
       SAVE OWN RESULT
    ===================================================== */

    const ownUpdate =
      role ===
      "challenger"
        ? {
            challenger_completed:
              true,

            challenger_score:
              score,

            challenger_attempt_count:
              attemptCount,

            challenger_completed_at:
              completedAt,

            updated_at:
              completedAt,
          }
        : {
            opponent_completed:
              true,

            opponent_score:
              score,

            opponent_attempt_count:
              attemptCount,

            opponent_completed_at:
              completedAt,

            updated_at:
              completedAt,
          };

    const {
      data:
        updatedGameData,

      error:
        updateGameError,
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
        )
        .select(`
          challenge_id,
          player_id,

          challenger_completed,
          opponent_completed,

          challenger_score,
          opponent_score,

          challenger_attempt_count,
          opponent_attempt_count,

          challenger_completed_at,
          opponent_completed_at
        `)
        .maybeSingle();

    if (
      updateGameError ||
      !updatedGameData
    ) {
      console.error(
        "Player Quiz VS result kaydedilemedi:",
        updateGameError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Düello sonucu kaydedilemedi.",
        },
        {
          status: 500,
        },
      );
    }

    const updatedGame =
      updatedGameData as GameRow;

    /* =====================================================
       UPDATE MAIN SCORE
    ===================================================== */

    const challengeScoreUpdate =
      role ===
      "challenger"
        ? {
            challenger_score:
              score,

            updated_at:
              completedAt,
          }
        : {
            opponent_score:
              score,

            updated_at:
              completedAt,
          };

    const {
      error:
        scoreUpdateError,
    } =
      await supabaseAdmin
        .from(
          "guest_challenges",
        )
        .update(
          challengeScoreUpdate,
        )
        .eq(
          "id",
          challenge.id,
        );

    if (
      scoreUpdateError
    ) {
      console.error(
        "Challenge ana skor update hatası:",
        scoreUpdateError,
      );
    }

    /* =====================================================
       BOTH COMPLETED?
    ===================================================== */

    const bothCompleted =
      updatedGame
        .challenger_completed &&
      updatedGame
        .opponent_completed;

    let winnerSide:
      | "challenger"
      | "opponent"
      | "draw"
      | null =
      null;

    let challengeCompleted =
      false;

    if (
      bothCompleted
    ) {
      const challengerScore =
        Number(
          updatedGame
            .challenger_score,
        );

      const opponentScore =
        Number(
          updatedGame
            .opponent_score,
        );

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
      } else {
        /*
         * Puan aynıysa önce bitiren kazanır.
         */
        const challengerFinishedAt =
          updatedGame
            .challenger_completed_at
            ? new Date(
                updatedGame
                  .challenger_completed_at,
              ).getTime()
            : null;

        const opponentFinishedAt =
          updatedGame
            .opponent_completed_at
            ? new Date(
                updatedGame
                  .opponent_completed_at,
              ).getTime()
            : null;

        if (
          challengerFinishedAt !==
            null &&
          opponentFinishedAt !==
            null
        ) {
          if (
            challengerFinishedAt <
            opponentFinishedAt
          ) {
            winnerSide =
              "challenger";
          } else if (
            opponentFinishedAt <
            challengerFinishedAt
          ) {
            winnerSide =
              "opponent";
          } else {
            winnerSide =
              "draw";
          }
        } else {
          winnerSide =
            "draw";
        }
      }

      const now =
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
              Number(
                updatedGame
                  .challenger_score,
              ),

            opponent_score:
              Number(
                updatedGame
                  .opponent_score,
              ),

            winner_side:
              winnerSide,

            completed_at:
              now,

            updated_at:
              now,
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
          "Challenge tamamlanamadı:",
          completeError,
        );
      } else {
        challengeCompleted =
          true;
      }
    }

    /* =====================================================
       RESULT FOR CURRENT PLAYER
    ===================================================== */

    let currentResult:
      | "win"
      | "loss"
      | "draw"
      | "waiting" =
      "waiting";

    if (
      challengeCompleted &&
      winnerSide
    ) {
      if (
        winnerSide ===
        "draw"
      ) {
        currentResult =
          "draw";
      } else if (
        winnerSide ===
        role
      ) {
        currentResult =
          "win";
      } else {
        currentResult =
          "loss";
      }
    }

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      completed:
        true,

      alreadyCompleted:
        false,

      role,

      score,

      durationSeconds,

      challengeCompleted,

      waitingForOpponent:
        !challengeCompleted,

      winnerSide,

      result:
        currentResult,

      scores: {
        challenger:
          Number(
            updatedGame
              .challenger_score,
          ),

        opponent:
          Number(
            updatedGame
              .opponent_score,
          ),
      },

      attempts: {
        challenger:
          Number(
            updatedGame
              .challenger_attempt_count,
          ),

        opponent:
          Number(
            updatedGame
              .opponent_attempt_count,
          ),
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