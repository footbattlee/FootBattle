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

type ChallengeSide =
  | "challenger"
  | "opponent";

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

  challenger_score: number;

  opponent_score: number;

  winner_side:
    | "challenger"
    | "opponent"
    | "draw"
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

    const authSupabase =
      await createAuthServerClient();

    const {
      data: {
        user,
      },
    } =
      await authSupabase.auth.getUser();

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
      console.error(
        "Guest Club Clash forfeit challenge sorgu hatası:",
        challengeError,
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "Challenge okunamadı.",
        },
        {
          status: 500,
        },
      );
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
       GAME CONTROL
    ===================================================== */

    if (
      challenge.game_code !==
      "club_clash"
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Bu challenge 2 Takım 1 Oyuncu değil.",
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
            "Bu challenge'da oyuncu değilsin.",
        },
        {
          status: 403,
        },
      );
    }

    const role:
      ChallengeSide =
      isChallenger
        ? "challenger"
        : "opponent";

    const winnerSide:
      ChallengeSide =
      role ===
      "challenger"
        ? "opponent"
        : "challenger";

    /* =====================================================
       ALREADY COMPLETED
    ===================================================== */

    if (
      challenge.status ===
      "completed"
    ) {
      let result:
        | "win"
        | "loss"
        | "draw"
        | null =
        null;

      if (
        challenge.winner_side ===
        "draw"
      ) {
        result =
          "draw";
      } else if (
        challenge.winner_side ===
        role
      ) {
        result =
          "win";
      } else if (
        challenge.winner_side
      ) {
        result =
          "loss";
      }

      return NextResponse.json({
        ok: true,

        alreadyCompleted:
          true,

        forfeited:
          false,

        role,

        winnerSide:
          challenge.winner_side,

        result,

        score: {
          challenger:
            Number(
              challenge.challenger_score ??
                0,
            ),

          opponent:
            Number(
              challenge.opponent_score ??
                0,
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

       Roundlardan tekrar hesaplıyoruz.
       Böylece guest_challenges skoru geride kaldıysa bile
       doğru skoru koruyoruz.
    ===================================================== */

    const {
      data:
        completedRounds,

      error:
        roundsError,
    } =
      await supabaseAdmin
        .from(
          "challenge_rounds",
        )
        .select(`
          id,
          winner_side
        `)
        .eq(
          "challenge_id",
          challenge.id,
        )
        .eq(
          "game_code",
          "club_clash",
        )
        .not(
          "completed_at",
          "is",
          null,
        );

    if (
      roundsError
    ) {
      console.error(
        "Guest Club Clash forfeit round sorgu hatası:",
        roundsError,
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "Düello skoru okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    const calculatedChallengerScore =
      (
        completedRounds ??
        []
      ).filter(
        (
          round,
        ) =>
          round.winner_side ===
          "challenger",
      ).length;

    const calculatedOpponentScore =
      (
        completedRounds ??
        []
      ).filter(
        (
          round,
        ) =>
          round.winner_side ===
          "opponent",
      ).length;

    const challengerScore =
      Math.max(
        Number(
          challenge
            .challenger_score ??
            0,
        ),

        calculatedChallengerScore,
      );

    const opponentScore =
      Math.max(
        Number(
          challenge
            .opponent_score ??
            0,
        ),

        calculatedOpponentScore,
      );

    /* =====================================================
       COMPLETE CHALLENGE
    ===================================================== */

    const now =
      new Date().toISOString();

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
      console.error(
        "Guest Club Clash forfeit complete hatası:",
        completeError,
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

    /*
     * Aynı anda başka işlem challenge'ı bitirmiş olabilir.
     */
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
        console.error(
          "Forfeit sonrası challenge tekrar okunamadı:",
          latestError,
        );

        return NextResponse.json(
          {
            ok: false,

            error:
              "Düello durumu okunamadı.",
          },
          {
            status: 500,
          },
        );
      }

      if (
        latestChallenge
      ) {
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
              ? "win"
              : latestChallenge
                    .winner_side ===
                  "draw"
                ? "draw"
                : "loss",

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

      role,

      winnerSide,

      result:
        "loss",

      score: {
        challenger:
          challengerScore,

        opponent:
          opponentScore,
      },

      completedAt:
        now,

      message:
        "Düellodan pes ettin. Rakibin maçı kazandı.",
    });
  } catch (error) {
    console.error(
      "Guest Club Clash forfeit endpoint hatası:",
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