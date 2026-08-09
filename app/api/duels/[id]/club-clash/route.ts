import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    /* =====================================================
       1. AUTH
    ===================================================== */

    const authSupabase =
      await createAuthServerClient();

    const {
      data: { user },
      error: userError,
    } = await authSupabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: "Giriş yapmalısın.",
        },
        {
          status: 401,
        },
      );
    }

    const currentUserId =
      user.id;

    /* =====================================================
       2. DUEL ID
    ===================================================== */

    const { id } =
      await context.params;

    const duelId =
      Number(id);

    if (
      !Number.isInteger(duelId) ||
      duelId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Geçerli düello seçilmedi.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       3. DÜELLOYU OKU
    ===================================================== */

    const {
      data: duel,
      error: duelError,
    } = await supabaseAdmin
      .from("duels")
      .select(`
        id,
        challenger_id,
        opponent_id,
        game_code,
        status,
        challenger_score,
        opponent_score,
        winner_id,
        created_at,
        accepted_at,
        started_at,
        completed_at,
        updated_at
      `)
      .eq("id", duelId)
      .maybeSingle();

    if (duelError) {
      console.error(
        "Club Clash duel sorgu hatası:",
        duelError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Düello okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    if (!duel) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Düello bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================================
       4. YETKİ
    ===================================================== */

    const belongsToDuel =
      duel.challenger_id ===
        currentUserId ||
      duel.opponent_id ===
        currentUserId;

    if (!belongsToDuel) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu düelloya erişim yetkin yok.",
        },
        {
          status: 403,
        },
      );
    }

    /* =====================================================
       5. OYUN KONTROLÜ
    ===================================================== */

    if (
      duel.game_code !==
      "club_clash"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu düello 2 Takım 1 Oyuncu oyunu değil.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       6. ROUNDLARI OKU
    ===================================================== */

    const {
      data: rounds,
      error: roundsError,
    } = await supabaseAdmin
      .from(
        "duel_club_clash_rounds",
      )
      .select(`
        id,
        duel_id,
        round_no,
        club_a,
        club_b,
        winner_user_id,
        challenger_answer,
        opponent_answer,
        challenger_answer_player_id,
        opponent_answer_player_id,
        challenger_answered_at,
        opponent_answered_at,
        completed_at,
        created_at
      `)
      .eq(
        "duel_id",
        duelId,
      )
      .order(
        "round_no",
        {
          ascending: true,
        },
      );

    if (roundsError) {
      console.error(
        "Club Clash round sorgu hatası:",
        roundsError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Round bilgileri okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    const roundList =
      rounds ?? [];

    /* =====================================================
       7. CURRENT ROUND
    ===================================================== */

    const currentRound =
      roundList.find(
        (round) =>
          round.completed_at ===
          null,
      ) ?? null;

    /* =====================================================
       8. RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      duel: {
        id:
          duel.id,

        gameCode:
          duel.game_code,

        gameLabel:
          "2 Takım 1 Oyuncu",

        status:
          duel.status,

        challengerScore:
          duel.challenger_score,

        opponentScore:
          duel.opponent_score,

        winnerId:
          duel.winner_id,

        startedAt:
          duel.started_at,

        completedAt:
          duel.completed_at,
      },

      roundCount:
        roundList.length,

      currentRound,

      rounds:
        roundList,
    });
  } catch (error) {
    console.error(
      "Club Clash GET endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Club Clash bilgileri okunamadı.",
      },
      {
        status: 500,
      },
    );
  }
}