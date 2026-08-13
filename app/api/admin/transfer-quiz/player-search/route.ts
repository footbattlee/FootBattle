import { NextResponse } from "next/server";

import {
  supabaseAdmin,
} from "@/lib/supabase/server";

const MINIMUM_SEARCH_LENGTH =
  2;

const MAX_RESULTS =
  15;

function normalizeSearch(
  value: string,
) {
  return value
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
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /[^a-z0-9\s]/g,
      "",
    )
    .replace(
      /\s+/g,
      " ",
    );
}

export async function GET(
  request: Request,
) {
  try {
    const url =
      new URL(
        request.url,
      );

    const rawQuery =
      url.searchParams.get(
        "q",
      ) ?? "";

    const query =
      rawQuery.trim();

    if (
      query.length <
      MINIMUM_SEARCH_LENGTH
    ) {
      return NextResponse.json({
        ok: true,
        players: [],
        minimumSearchLength:
          MINIMUM_SEARCH_LENGTH,
      });
    }

    const normalizedQuery =
      normalizeSearch(
        query,
      );

    const {
      data,
      error,
    } =
      await supabaseAdmin
        .from(
          "guess_players",
        )
        .select(`
          player_id,
          name,
          image_url,
          nationality,
          current_club_name,
          popularity_score
        `)
        .eq(
          "is_playable",
          1,
        )
        .or(
          `name.ilike.%${query}%,name_normalized.ilike.%${normalizedQuery}%`,
        )
        .order(
          "popularity_score",
          {
            ascending:
              false,
            nullsFirst:
              false,
          },
        )
        .limit(
          MAX_RESULTS,
        );

    if (error) {
      console.error(
        "Transfer Quiz admin player search error:",
        error,
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

    const players =
      (
        data ??
        []
      ).map(
        (
          player,
        ) => ({
          id:
            Number(
              player.player_id,
            ),

          name:
            player.name,

          imageUrl:
            player.image_url ??
            null,

          nationality:
            player.nationality ??
            null,

          currentClubName:
            player.current_club_name ??
            null,

          popularityScore:
            player.popularity_score ===
            null
              ? null
              : Number(
                  player.popularity_score,
                ),
        }),
      );

    return NextResponse.json({
      ok: true,
      players,
      minimumSearchLength:
        MINIMUM_SEARCH_LENGTH,
    });
  } catch (error) {
    console.error(
      "Transfer Quiz admin player-search endpoint error:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Beklenmeyen bir hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}