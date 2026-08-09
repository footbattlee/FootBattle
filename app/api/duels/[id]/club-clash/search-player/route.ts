import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ");
}

export async function GET(
  request: Request,
  context: RouteContext,
) {
  try {
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

    const requestUrl =
      new URL(request.url);

    const rawQuery =
      requestUrl.searchParams
        .get("q")
        ?.trim() ?? "";

    if (rawQuery.length < 3) {
      return NextResponse.json({
        ok: true,
        users: [],
      });
    }

    /* =====================================================
       DUEL ACCESS
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
        status
      `)
      .eq("id", duelId)
      .maybeSingle();

    if (duelError) {
      throw duelError;
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

    const belongsToDuel =
      duel.challenger_id ===
        user.id ||
      duel.opponent_id ===
        user.id;

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

    if (
      duel.game_code !==
      "club_clash"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Bu düello 2 Takım 1 Oyuncu değil.",
        },
        {
          status: 409,
        },
      );
    }

    /* =====================================================
       SEARCH
    ===================================================== */

    const normalizedQuery =
      normalizeText(rawQuery);

    /*
     * İlk etapta name_normalized içinde arıyoruz.
     * Örn:
     * sne -> Wesley Sneijder
     * snej -> Sneijder
     */
    const {
      data: players,
      error: searchError,
    } = await supabaseAdmin
      .from("guess_players")
      .select(`
        player_id,
        name,
        name_normalized,
        current_club_name
      `)
      .ilike(
        "name_normalized",
        `%${normalizedQuery}%`,
      )
      .order("name", {
        ascending: true,
      })
      .limit(10);

    if (searchError) {
      console.error(
        "Club Clash player search hatası:",
        searchError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyuncular aranamadı.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      ok: true,

      query:
        rawQuery,

      normalizedQuery,

      players:
        (players ?? []).map(
          (player) => ({
            playerId:
              player.player_id,

            name:
              player.name,

            currentClubName:
              player.current_club_name ??
              null,
          }),
        ),
    });
  } catch (error) {
    console.error(
      "Club Clash search-player endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Oyuncular aranamadı.",
      },
      {
        status: 500,
      },
    );
  }
}