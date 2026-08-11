import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

/* =========================================================
   TYPES
========================================================= */

type RouteContext = {
  params: Promise<{
    token: string;
  }>;
};

type ChallengeRow = {
  id: number;

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

  challenger_score:
    | number
    | null;

  opponent_score:
    | number
    | null;

  winner_side:
    | string
    | null;

  completed_at:
    | string
    | null;
};

/* =========================================================
   SETTINGS
========================================================= */

const GUEST_COOKIE_NAME =
  "footbattle_guest";

/* =========================================================
   HELPERS
========================================================= */

function sanitizeToken(
  value: unknown,
) {
  return String(
    value ?? "",
  )
    .trim()
    .replace(
      /[^a-zA-Z0-9]/g,
      "",
    )
    .slice(
      0,
      64,
    );
}

/* =========================================================
   SCORE FROM ROUNDS
========================================================= */

async function calculateScore(
  challengeId: number,
) {
  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from(
        "challenge_rounds",
      )
      .select(`
        winner_side
      `)
      .eq(
        "challenge_id",
        challengeId,
      )
      .eq(
        "game_code",
        "club_nation",
      )
      .not(
        "completed_at",
        "is",
        null,
      );

  if (error) {
    throw error;
  }

  const rounds =
    data ?? [];

  const challenger =
    rounds.filter(
      (
        round,
      ) =>
        round.winner_side ===
        "challenger",
    ).length;

  const opponent =
    rounds.filter(
      (
        round,
      ) =>
        round.winner_side ===
        "opponent",
    ).length;

  return {
    challenger,

    opponent,
  };
}

/* =========================================================
   POST
========================================================= */

export async function POST(
  _request: Request,
  context: RouteContext,
) {
  try {
    /* =====================================================
       TOKEN
    ===================================================== */

    const {
      token:
        rawToken,
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
       AUTH / GUEST
    ===================================================== */

    const authSupabase =
      await createAuthServerClient();

    const {
      data: {
        user,
      },
    } =
      await authSupabase
        .auth
        .getUser();

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
          completed_at
        `)
        .eq(
          "invite_token",
          token,
        )
        .maybeSingle();

    if (
      challengeError
    ) {
      throw challengeError;
    }

    if (
      !challengeData
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Challenge bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    const challenge =
      challengeData as ChallengeRow;

    /* =====================================================
       ACCESS
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
            "Bu challenge'a erişim yetkin yok.",
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
       GAME CONTROL
    ===================================================== */

    if (
      challenge.game_code !==
      "club_nation"
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Bu challenge 1 Takım 1 Millet değil.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       ALREADY COMPLETED
    ===================================================== */

    if (
      challenge.status ===
        "completed" ||
      challenge.completed_at
    ) {
      const score =
        await calculateScore(
          challenge.id,
        );

      return NextResponse.json({
        ok: true,

        alreadyCompleted:
          true,

        forfeited:
          false,

        role,

        winnerSide:
          challenge.winner_side,

        result:
          challenge.winner_side ===
          role
            ? "won"
            : "lost",

        score: {
          challenger:
            Math.max(
              Number(
                challenge
                  .challenger_score ??
                  0,
              ),
              score.challenger,
            ),

          opponent:
            Math.max(
              Number(
                challenge
                  .opponent_score ??
                  0,
              ),
              score.opponent,
            ),
        },

        completedAt:
          challenge.completed_at,
      });
    }

    /* =====================================================
       STATUS CONTROL
    ===================================================== */

    if (
      challenge.status !==
      "playing"
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Bu challenge şu anda pes edilebilir durumda değil.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       CURRENT SCORE
    ===================================================== */

    const calculatedScore =
      await calculateScore(
        challenge.id,
      );

    const challengerScore =
      Math.max(
        Number(
          challenge
            .challenger_score ??
            0,
        ),

        calculatedScore
          .challenger,
      );

    const opponentScore =
      Math.max(
        Number(
          challenge
            .opponent_score ??
            0,
        ),

        calculatedScore
          .opponent,
      );

    /* =====================================================
       WINNER

       Pes edenin karşı tarafı kazanır.
    ===================================================== */

    const winnerSide:
      | "challenger"
      | "opponent" =
      role ===
      "challenger"
        ? "opponent"
        : "challenger";

    const now =
      new Date()
        .toISOString();

    /* =====================================================
       COMPLETE CHALLENGE
    ===================================================== */

    const {
      data:
        completedChallenge,
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
            now,

          updated_at:
            now,
        })
        .eq(
          "id",
          challenge.id,
        )
        .eq(
          "status",
          "playing",
        )
        .select(`
          id,
          status,

          challenger_score,
          opponent_score,

          winner_side,
          completed_at
        `)
        .maybeSingle();

    if (
      completeError
    ) {
      throw completeError;
    }

    /* =====================================================
       RACE CONDITION

       Aynı anda answer veya başka forfeit geldiyse
       challenge zaten kapanmış olabilir.
    ===================================================== */

    if (
      !completedChallenge
    ) {
      const {
        data:
          latestChallenge,
        error:
          latestError,
      } =
        await supabaseAdmin
          .from(
            "guest_challenges",
          )
          .select(`
            id,
            status,

            challenger_score,
            opponent_score,

            winner_side,
            completed_at
          `)
          .eq(
            "id",
            challenge.id,
          )
          .maybeSingle();

      if (
        latestError
      ) {
        throw latestError;
      }

      if (
        !latestChallenge
      ) {
        throw new Error(
          "Challenge sonucu tekrar okunamadı.",
        );
      }

      return NextResponse.json({
        ok: true,

        alreadyCompleted:
          true,

        forfeited:
          false,

        role,

        winnerSide:
          latestChallenge
            .winner_side,

        result:
          latestChallenge
            .winner_side ===
          role
            ? "won"
            : "lost",

        score: {
          challenger:
            Number(
              latestChallenge
                .challenger_score ??
                0,
            ),

          opponent:
            Number(
              latestChallenge
                .opponent_score ??
                0,
            ),
        },

        completedAt:
          latestChallenge
            .completed_at,
      });
    }

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      alreadyCompleted:
        false,

      forfeited:
        true,

      forfeitedBy:
        role,

      role,

      winnerSide:
        winnerSide,

      result:
        "lost",

      score: {
        challenger:
          Number(
            completedChallenge
              .challenger_score ??
              challengerScore,
          ),

        opponent:
          Number(
            completedChallenge
              .opponent_score ??
              opponentScore,
          ),
      },

      completedAt:
        completedChallenge
          .completed_at,

      message:
        "Pes ettin. Rakibin maçı kazandı.",
    });
  } catch (
    error
  ) {
    console.error(
      "Guest Club Nation forfeit endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Pes etme işlemi tamamlanamadı.",
      },
      {
        status: 500,
      },
    );
  }
}