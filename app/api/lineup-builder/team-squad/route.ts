import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

type LineupSlot = {
  slot?: number;
  playerId?: number;
  x?: number;
  y?: number;
};

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);

    const teamId = Number(
      requestUrl.searchParams.get("teamId"),
    );

    if (
      !Number.isInteger(teamId) ||
      teamId <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Takım bilgisi geçersiz.",
        },
        { status: 400 },
      );
    }

    const { data: team, error: teamError } =
      await supabaseAdmin
        .from("football_teams")
        .select(`
          id,
          name,
          logo_url,
          country,
          competition_id
        `)
        .eq("id", teamId)
        .eq("is_active", true)
        .maybeSingle();

    if (teamError) {
      console.error(
        "Takım bilgisi okunamadı:",
        teamError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Takım bilgisi okunamadı.",
        },
        { status: 500 },
      );
    }

    if (!team) {
      return NextResponse.json(
        {
          ok: false,
          error: "Takım bulunamadı.",
        },
        { status: 404 },
      );
    }

    const { data: squadRows, error: squadError } =
      await supabaseAdmin
        .from("team_squads")
        .select(`
          id,
          player_id,
          squad_number,
          position,
          sub_position,
          guess_players!inner (
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
          )
        `)
        .eq("team_id", teamId)
        .eq("is_active", true);

    if (squadError) {
      console.error(
        "Takım kadrosu okunamadı:",
        squadError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Takım kadrosu okunamadı.",
        },
        { status: 500 },
      );
    }

    const { data: defaultLineup } =
      await supabaseAdmin
        .from("team_default_lineups")
        .select(`
          formation_code,
          lineup_data
        `)
        .eq("team_id", teamId)
        .maybeSingle();

    const players = (squadRows ?? [])
      .map((row) => {
        const rawPlayer =
          Array.isArray(row.guess_players)
            ? row.guess_players[0]
            : row.guess_players;

        if (!rawPlayer) {
          return null;
        }

        return {
          id: Number(rawPlayer.player_id),
          squadId: Number(row.id),
          fullName: rawPlayer.name,
          squadNumber:
            row.squad_number ?? null,
          nationality:
            rawPlayer.nationality ?? null,
          age:
            rawPlayer.age === null
              ? null
              : Number(rawPlayer.age),
          position:
            row.position ??
            rawPlayer.position ??
            null,
          subPosition:
            row.sub_position ??
            rawPlayer.sub_position ??
            null,
          club:
            rawPlayer.current_club_name ??
            null,
          competitionId:
            rawPlayer.current_competition_id ??
            null,
          preferredFoot:
            rawPlayer.preferred_foot ?? null,
          imageUrl:
            rawPlayer.image_url ?? null,
          popularityScore:
            rawPlayer.popularity_score ===
            null
              ? null
              : Number(
                  rawPlayer.popularity_score,
                ),
        };
      })
      .filter(
        (
          player,
        ): player is NonNullable<
          typeof player
        > => player !== null,
      )
      .sort((first, second) => {
        const positionOrder: Record<
          string,
          number
        > = {
          Goalkeeper: 1,
          Defender: 2,
          Midfield: 3,
          Attack: 4,
        };

        const firstOrder =
          positionOrder[
            first.position ?? ""
          ] ?? 5;

        const secondOrder =
          positionOrder[
            second.position ?? ""
          ] ?? 5;

        if (firstOrder !== secondOrder) {
          return firstOrder - secondOrder;
        }

        return (
          (second.popularityScore ?? 0) -
          (first.popularityScore ?? 0)
        );
      });

    const lineupData = Array.isArray(
      defaultLineup?.lineup_data,
    )
      ? (
          defaultLineup.lineup_data as LineupSlot[]
        ).map((slot) => ({
          slot: Number(slot.slot ?? 0),
          playerId: Number(
            slot.playerId ?? 0,
          ),
          x: Number(slot.x ?? 50),
          y: Number(slot.y ?? 50),
        }))
      : [];

    return NextResponse.json({
      ok: true,

      team: {
        id: Number(team.id),
        name: team.name,
        logoUrl: team.logo_url ?? null,
        country: team.country ?? null,
        competitionId:
          team.competition_id ?? null,
      },

      players,

      defaultLineup: {
        formationCode:
          defaultLineup?.formation_code ??
          "4-2-3-1",
        slots: lineupData,
      },
    });
  } catch (error) {
    console.error(
      "Team-squad endpoint hatası:",
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