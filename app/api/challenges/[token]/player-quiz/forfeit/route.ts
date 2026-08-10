import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const GUEST_COOKIE_NAME =
  "footbattle_guest";

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
};

type GameRow = {
  challenge_id:
    | number
    | string;

  challenger_finalized: boolean;
  opponent_finalized: boolean;

  challenger_forfeited: boolean;
  opponent_forfeited: boolean;

  challenger_score: number;
  opponent_score: number;

  challenger_completed: boolean;
  opponent_completed: boolean;

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

          winner_side
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
        "Player Quiz VS forfeit challenge okunamadı:",
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
      challenge.status ===
      "completed"
    ) {
      return NextResponse.json({
        ok: true,

        alreadyCompleted:
          true,

        winnerSide:
          challenge.winner_side,
      });
    }

    if (
      challenge.status !==
      "playing"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Düello pes edilebilir durumda değil.",
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
            "Bu düellodan pes edemezsin.",
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

    const winnerSide:
      | "challenger"
      | "opponent" =
      role ===
      "challenger"
        ? "opponent"
        : "challenger";

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

          challenger_finalized,
          opponent_finalized,

          challenger_forfeited,
          opponent_forfeited,

          challenger_score,
          opponent_score,

          challenger_completed,
          opponent_completed,

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
        "Player Quiz VS forfeit game okunamadı:",
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

    const alreadyForfeited =
      role ===
      "challenger"
        ? Boolean(
            game
              .challenger_forfeited,
          )
        : Boolean(
            game
              .opponent_forfeited,
          );

    if (
      alreadyForfeited
    ) {
      return NextResponse.json({
        ok: true,

        alreadyForfeited:
          true,

        role,

        winnerSide,

        result:
          "loss",
      });
    }

    /* =====================================================
       SAVE FORFEIT
    ===================================================== */

    const now =
      new Date().toISOString();

    const gameUpdate =
      role ===
      "challenger"
        ? {
            challenger_forfeited:
              true,

            challenger_finalized:
              true,

            challenger_completed:
              true,

            challenger_completed_at:
              now,

            updated_at:
              now,
          }
        : {
            opponent_forfeited:
              true,

            opponent_finalized:
              true,

            opponent_completed:
              true,

            opponent_completed_at:
              now,

            updated_at:
              now,
          };

    const {
      error:
        gameUpdateError,
    } =
      await supabaseAdmin
        .from(
          "guest_challenge_player_quiz",
        )
        .update(
          gameUpdate,
        )
        .eq(
          "challenge_id",
          challenge.id,
        );

    if (
      gameUpdateError
    ) {
      console.error(
        "Player Quiz VS forfeit kaydedilemedi:",
        gameUpdateError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Pes etme işlemi kaydedilemedi.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       COMPLETE CHALLENGE
    ===================================================== */

    const challengerScore =
      Number(
        game
          .challenger_score ??
          challenge
            .challenger_score ??
          0,
      );

    const opponentScore =
      Number(
        game
          .opponent_score ??
          challenge
            .opponent_score ??
          0,
      );

    const {
      error:
        challengeUpdateError,
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
        );

    if (
      challengeUpdateError
    ) {
      console.error(
        "Player Quiz VS challenge forfeit tamamlanamadı:",
        challengeUpdateError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Düello tamamlanamadı.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      alreadyForfeited:
        false,

      role,

      forfeited:
        true,

      winnerSide,

      result:
        "loss",

      message:
        "Düellodan pes ettin. Rakibin kazandı.",
    });
  } catch (error) {
    console.error(
      "Player Quiz VS forfeit endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Pes etme işlemi sırasında beklenmeyen bir hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}