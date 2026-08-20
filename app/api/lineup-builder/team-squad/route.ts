import { NextResponse } from "next/server";

import {
  nationalityToDisplayName,
  positionToDisplayName,
  preferredFootToDisplayName,
} from "@/lib/football/localization";
import { supabaseAdmin } from "@/lib/supabase/server";

type LineupSlot = {
  slot?: number;
  playerId?: number;
  x?: number;
  y?: number;
};

type FormationCode = "4-2-3-1" | "4-3-3" | "4-4-2" | "3-5-2";

type Position = { x: number; y: number };

type SlotNeed = Position & {
  subPositions: string[];
  broadPositions: string[];
};

type CandidatePlayer = {
  id: number;
  rawPosition: string | null;
  rawSubPosition: string | null;
  popularityScore: number | null;
};

const FORMATION_NEEDS: Record<FormationCode, SlotNeed[]> = {
  "4-2-3-1": [
    { x: 50, y: 91, subPositions: ["Goalkeeper"], broadPositions: ["Goalkeeper"] },
    { x: 14, y: 73, subPositions: ["Left-Back", "Left Midfield"], broadPositions: ["Defender"] },
    { x: 38, y: 77, subPositions: ["Centre-Back"], broadPositions: ["Defender"] },
    { x: 62, y: 77, subPositions: ["Centre-Back"], broadPositions: ["Defender"] },
    { x: 86, y: 73, subPositions: ["Right-Back", "Right Midfield"], broadPositions: ["Defender"] },
    { x: 38, y: 54, subPositions: ["Defensive Midfield", "Central Midfield"], broadPositions: ["Midfield"] },
    { x: 62, y: 54, subPositions: ["Defensive Midfield", "Central Midfield"], broadPositions: ["Midfield"] },
    { x: 18, y: 31, subPositions: ["Left Winger", "Left Midfield"], broadPositions: ["Attack", "Midfield"] },
    { x: 50, y: 36, subPositions: ["Attacking Midfield", "Central Midfield", "Second Striker"], broadPositions: ["Midfield", "Attack"] },
    { x: 82, y: 31, subPositions: ["Right Winger", "Right Midfield"], broadPositions: ["Attack", "Midfield"] },
    { x: 50, y: 15, subPositions: ["Centre-Forward", "Second Striker"], broadPositions: ["Attack"] },
  ],
  "4-3-3": [
    { x: 50, y: 91, subPositions: ["Goalkeeper"], broadPositions: ["Goalkeeper"] },
    { x: 14, y: 73, subPositions: ["Left-Back", "Left Midfield"], broadPositions: ["Defender"] },
    { x: 38, y: 77, subPositions: ["Centre-Back"], broadPositions: ["Defender"] },
    { x: 62, y: 77, subPositions: ["Centre-Back"], broadPositions: ["Defender"] },
    { x: 86, y: 73, subPositions: ["Right-Back", "Right Midfield"], broadPositions: ["Defender"] },
    { x: 24, y: 50, subPositions: ["Central Midfield", "Defensive Midfield", "Attacking Midfield"], broadPositions: ["Midfield"] },
    { x: 50, y: 54, subPositions: ["Defensive Midfield", "Central Midfield"], broadPositions: ["Midfield"] },
    { x: 76, y: 50, subPositions: ["Central Midfield", "Attacking Midfield", "Defensive Midfield"], broadPositions: ["Midfield"] },
    { x: 18, y: 21, subPositions: ["Left Winger", "Left Midfield"], broadPositions: ["Attack", "Midfield"] },
    { x: 50, y: 15, subPositions: ["Centre-Forward", "Second Striker"], broadPositions: ["Attack"] },
    { x: 82, y: 21, subPositions: ["Right Winger", "Right Midfield"], broadPositions: ["Attack", "Midfield"] },
  ],
  "4-4-2": [
    { x: 50, y: 91, subPositions: ["Goalkeeper"], broadPositions: ["Goalkeeper"] },
    { x: 14, y: 73, subPositions: ["Left-Back", "Left Midfield"], broadPositions: ["Defender"] },
    { x: 38, y: 77, subPositions: ["Centre-Back"], broadPositions: ["Defender"] },
    { x: 62, y: 77, subPositions: ["Centre-Back"], broadPositions: ["Defender"] },
    { x: 86, y: 73, subPositions: ["Right-Back", "Right Midfield"], broadPositions: ["Defender"] },
    { x: 14, y: 47, subPositions: ["Left Midfield", "Left Winger"], broadPositions: ["Midfield", "Attack"] },
    { x: 38, y: 52, subPositions: ["Central Midfield", "Defensive Midfield"], broadPositions: ["Midfield"] },
    { x: 62, y: 52, subPositions: ["Central Midfield", "Defensive Midfield", "Attacking Midfield"], broadPositions: ["Midfield"] },
    { x: 86, y: 47, subPositions: ["Right Midfield", "Right Winger"], broadPositions: ["Midfield", "Attack"] },
    { x: 36, y: 18, subPositions: ["Centre-Forward", "Second Striker"], broadPositions: ["Attack"] },
    { x: 64, y: 18, subPositions: ["Centre-Forward", "Second Striker"], broadPositions: ["Attack"] },
  ],
  "3-5-2": [
    { x: 50, y: 91, subPositions: ["Goalkeeper"], broadPositions: ["Goalkeeper"] },
    { x: 24, y: 76, subPositions: ["Centre-Back", "Left-Back"], broadPositions: ["Defender"] },
    { x: 50, y: 80, subPositions: ["Centre-Back"], broadPositions: ["Defender"] },
    { x: 76, y: 76, subPositions: ["Centre-Back", "Right-Back"], broadPositions: ["Defender"] },
    { x: 12, y: 50, subPositions: ["Left Midfield", "Left-Back", "Left Winger"], broadPositions: ["Midfield", "Defender", "Attack"] },
    { x: 34, y: 56, subPositions: ["Central Midfield", "Defensive Midfield"], broadPositions: ["Midfield"] },
    { x: 50, y: 48, subPositions: ["Defensive Midfield", "Central Midfield", "Attacking Midfield"], broadPositions: ["Midfield"] },
    { x: 66, y: 56, subPositions: ["Central Midfield", "Attacking Midfield"], broadPositions: ["Midfield"] },
    { x: 88, y: 50, subPositions: ["Right Midfield", "Right-Back", "Right Winger"], broadPositions: ["Midfield", "Defender", "Attack"] },
    { x: 36, y: 18, subPositions: ["Centre-Forward", "Second Striker"], broadPositions: ["Attack"] },
    { x: 64, y: 18, subPositions: ["Centre-Forward", "Second Striker"], broadPositions: ["Attack"] },
  ],
};

function normalizeFormation(value: unknown): FormationCode {
  return value === "4-3-3" || value === "4-4-2" || value === "3-5-2"
    ? value
    : "4-2-3-1";
}

function normalizePosition(value: string | null | undefined) {
  return String(value ?? "").trim().toLocaleLowerCase("en-US");
}

function compatibilityScore(player: CandidatePlayer, need: SlotNeed) {
  const rawPosition = normalizePosition(player.rawPosition);
  const rawSubPosition = normalizePosition(player.rawSubPosition);
  const isGoalkeeper = rawPosition === "goalkeeper" || rawSubPosition === "goalkeeper";
  const slotIsGoalkeeper = need.broadPositions.includes("Goalkeeper");

  if (slotIsGoalkeeper && !isGoalkeeper) return -10_000;
  if (!slotIsGoalkeeper && isGoalkeeper) return -10_000;

  const exactIndex = need.subPositions.findIndex(
    (value) => normalizePosition(value) === rawSubPosition,
  );

  let score = 0;

  if (exactIndex >= 0) {
    score += 1_000 - exactIndex * 40;
  } else if (
    need.broadPositions.some(
      (value) => normalizePosition(value) === rawPosition,
    )
  ) {
    score += 350;
  }

  score += Math.min(100, Math.max(0, player.popularityScore ?? 0));
  return score;
}

function generateAutomaticLineup(
  candidates: CandidatePlayer[],
  formation: FormationCode,
) {
  const available = [...candidates];

  return FORMATION_NEEDS[formation].map((need, index) => {
    available.sort((first, second) => {
      const scoreDifference =
        compatibilityScore(second, need) - compatibilityScore(first, need);

      if (scoreDifference !== 0) return scoreDifference;
      return (second.popularityScore ?? 0) - (first.popularityScore ?? 0);
    });

    const selected = available.shift();
    if (!selected) return null;

    return {
      slot: index + 1,
      playerId: selected.id,
      x: need.x,
      y: need.y,
    };
  }).filter((slot): slot is NonNullable<typeof slot> => slot !== null);
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const teamId = Number(requestUrl.searchParams.get("teamId"));

    if (!Number.isInteger(teamId) || teamId <= 0) {
      return NextResponse.json({ ok: false, error: "Takım bilgisi geçersiz." }, { status: 400 });
    }

    const { data: team, error: teamError } = await supabaseAdmin
      .from("football_teams")
      .select(`id, name, logo_url, country, competition_id`)
      .eq("id", teamId)
      .eq("is_active", true)
      .maybeSingle();

    if (teamError) {
      console.error("Takım bilgisi okunamadı:", teamError);
      return NextResponse.json({ ok: false, error: "Takım bilgisi okunamadı." }, { status: 500 });
    }

    if (!team) {
      return NextResponse.json({ ok: false, error: "Takım bulunamadı." }, { status: 404 });
    }

    const { data: squadRows, error: squadError } = await supabaseAdmin
      .from("team_squads")
      .select(`
        id, player_id, squad_number, position, sub_position,
        guess_players!inner (
          player_id, name, nationality, age, position, sub_position,
          current_club_name, current_competition_id, preferred_foot,
          image_url, popularity_score
        )
      `)
      .eq("team_id", teamId)
      .eq("is_active", true);

    if (squadError) {
      console.error("Takım kadrosu okunamadı:", squadError);
      return NextResponse.json({ ok: false, error: "Takım kadrosu okunamadı." }, { status: 500 });
    }

    const { data: defaultLineup } = await supabaseAdmin
      .from("team_default_lineups")
      .select(`formation_code, lineup_data`)
      .eq("team_id", teamId)
      .maybeSingle();

    const candidatePlayers: CandidatePlayer[] = [];

    const players = (squadRows ?? [])
      .map((row) => {
        const rawPlayer = Array.isArray(row.guess_players) ? row.guess_players[0] : row.guess_players;
        if (!rawPlayer) return null;

        const rawPosition = row.position ?? rawPlayer.position ?? null;
        const rawSubPosition = row.sub_position ?? rawPlayer.sub_position ?? null;
        const popularityScore = rawPlayer.popularity_score === null
          ? null
          : Number(rawPlayer.popularity_score);

        candidatePlayers.push({
          id: Number(rawPlayer.player_id),
          rawPosition,
          rawSubPosition,
          popularityScore,
        });

        return {
          id: Number(rawPlayer.player_id),
          squadId: Number(row.id),
          fullName: rawPlayer.name,
          squadNumber: row.squad_number ?? null,
          nationality: nationalityToDisplayName(rawPlayer.nationality),
          age: rawPlayer.age === null ? null : Number(rawPlayer.age),
          position: rawPosition,
          subPosition: rawSubPosition ? positionToDisplayName(rawSubPosition) : null,
          club: rawPlayer.current_club_name ?? null,
          competitionId: rawPlayer.current_competition_id ?? null,
          preferredFoot: rawPlayer.preferred_foot ? preferredFootToDisplayName(rawPlayer.preferred_foot) : null,
          imageUrl: rawPlayer.image_url ?? null,
          popularityScore,
        };
      })
      .filter((player): player is NonNullable<typeof player> => player !== null)
      .sort((first, second) => {
        const positionOrder: Record<string, number> = {
          Goalkeeper: 1,
          Defender: 2,
          Midfield: 3,
          Attack: 4,
        };

        const firstOrder = positionOrder[first.position ?? ""] ?? 5;
        const secondOrder = positionOrder[second.position ?? ""] ?? 5;

        if (firstOrder !== secondOrder) return firstOrder - secondOrder;
        return (second.popularityScore ?? 0) - (first.popularityScore ?? 0);
      });

    const formationCode = normalizeFormation(defaultLineup?.formation_code);
    const activePlayerIds = new Set(candidatePlayers.map((player) => player.id));

    const storedLineupData = Array.isArray(defaultLineup?.lineup_data)
      ? (defaultLineup.lineup_data as LineupSlot[])
          .map((slot) => ({
            slot: Number(slot.slot ?? 0),
            playerId: Number(slot.playerId ?? 0),
            x: Number(slot.x ?? 50),
            y: Number(slot.y ?? 50),
          }))
          .filter(
            (slot) =>
              slot.slot > 0 &&
              slot.playerId > 0 &&
              activePlayerIds.has(slot.playerId),
          )
      : [];

    const lineupData = storedLineupData.length === 11
      ? storedLineupData
      : generateAutomaticLineup(candidatePlayers, formationCode);

    return NextResponse.json({
      ok: true,
      team: {
        id: Number(team.id),
        name: team.name,
        logoUrl: team.logo_url ?? null,
        country: team.country ? nationalityToDisplayName(team.country) : null,
        competitionId: team.competition_id ?? null,
      },
      players,
      defaultLineup: {
        formationCode,
        slots: lineupData,
      },
    });
  } catch (error) {
    console.error("Team-squad endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
