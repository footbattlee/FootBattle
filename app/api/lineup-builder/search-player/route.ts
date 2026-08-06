import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

const MINIMUM_SEARCH_LENGTH = 3;
const MAXIMUM_RESULTS = 15;

function normalizeSearchText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9\s'-]/g, "")
    .replace(/\s+/g, " ");
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);

    const rawQuery =
      requestUrl.searchParams.get("q") ?? "";

    const query = normalizeSearchText(
      rawQuery,
    );

    const teamIdValue =
      requestUrl.searchParams.get("teamId");

    const teamId = teamIdValue
      ? Number(teamIdValue)
      : null;

    if (query.length < MINIMUM_SEARCH_LENGTH) {
      return NextResponse.json({
        ok: true,
        players: [],
        minimumSearchLength:
          MINIMUM_SEARCH_LENGTH,
      });
    }

    const safeQuery = query
      .replace(/%/g, "")
      .replace(/_/g, "");

    const { data, error } = await supabaseAdmin
      .from("guess_players")
      .select(`
        player_id,
        name,
        nationality,
        age,
        position,
        sub_position,
        current_club_name,
        current_competition_id,
        preferred_foot,
        image_url,
        popularity_score
      `)
      .eq("is_playable", 1)
      .ilike(
        "name_normalized",
        `${safeQuery}%`,
      )
      .order("popularity_score", {
        ascending: false,
        nullsFirst: false,
      })
      .limit(MAXIMUM_RESULTS);

    if (error) {
      console.error(
        "Lineup oyuncu araması başarısız:",
        error,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyuncular aranırken hata oluştu.",
        },
        { status: 500 },
      );
    }

    let currentTeamPlayerIds =
      new Set<number>();

    if (
      teamId &&
      Number.isInteger(teamId) &&
      teamId > 0
    ) {
      const { data: squadPlayers } =
        await supabaseAdmin
          .from("team_squads")
          .select("player_id")
          .eq("team_id", teamId)
          .eq("is_active", true);

      currentTeamPlayerIds = new Set(
        (squadPlayers ?? []).map((row) =>
          Number(row.player_id),
        ),
      );
    }

    const players = (data ?? []).map(
      (player) => {
        const playerId = Number(
          player.player_id,
        );

        return {
          id: playerId,
          fullName: player.name,
          nationality:
            player.nationality ?? null,
          age:
            player.age === null
              ? null
              : Number(player.age),
          position:
            player.position ?? null,
          subPosition:
            player.sub_position ?? null,
          club:
            player.current_club_name ??
            null,
          competitionId:
            player.current_competition_id ??
            null,
          preferredFoot:
            player.preferred_foot ?? null,
          imageUrl:
            player.image_url ?? null,
          popularityScore:
            player.popularity_score ===
            null
              ? null
              : Number(
                  player.popularity_score,
                ),

          isCurrentTeamPlayer:
            currentTeamPlayerIds.has(
              playerId,
            ),

          isPotentialTransfer:
            teamId
              ? !currentTeamPlayerIds.has(
                  playerId,
                )
              : false,
        };
      },
    );

    return NextResponse.json({
      ok: true,
      players,
      minimumSearchLength:
        MINIMUM_SEARCH_LENGTH,
    });
  } catch (error) {
    console.error(
      "Search-player endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          "Beklenmeyen bir hata oluştu.",
      },
      { status: 500 },
    );
  }
}