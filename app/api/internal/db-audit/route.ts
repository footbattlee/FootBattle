import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

const TURKISH_COMPETITION_ID = "TR1";
const TURKISH_CLUB_PATTERNS = [
  "Galatasaray", "Fenerbahce", "Fenerbahçe", "Besiktas", "Beşiktaş", "Trabzonspor",
  "Basaksehir", "Başakşehir", "Bursaspor", "Goztepe", "Göztepe", "Samsunspor",
  "Konyaspor", "Sivasspor", "Kayserispor", "Antalyaspor", "Alanyaspor", "Kasimpasa",
  "Kasımpaşa", "Gaziantep", "Genclerbirligi", "Gençlerbirliği", "Ankaragucu", "Ankaragücü",
  "Adana Demirspor", "Rizespor", "Çaykur Rizespor", "Karagumruk", "Karagümrük",
  "Istanbulspor", "İstanbulspor", "Hatayspor", "Kocaelispor", "Sakaryaspor", "Altay",
];

async function countRows(
  table: string,
  apply?: (query: any) => any,
) {
  let query = supabaseAdmin.from(table).select("*", { count: "exact", head: true });
  if (apply) query = apply(query);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

function normalizeName(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/đ/g, "d")
    .replace(/ð/g, "d")
    .replace(/ł/g, "l")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9\s'-]/g, "")
    .replace(/\s+/g, " ");
}

export async function GET() {
  try {
    const [
      totalPlayers,
      playablePlayers,
      tr1Players,
      quizClubRows,
      missingCurrentClub,
      missingCompetition,
      missingNationality,
      missingPosition,
      missingAge,
      missingFoot,
      missingPopularity,
      missingImage,
      tr1MissingClub,
      tr1MissingNationality,
      tr1MissingPosition,
      tr1MissingAge,
      tr1MissingFoot,
    ] = await Promise.all([
      countRows("guess_players"),
      countRows("guess_players", (q) => q.eq("is_playable", 1)),
      countRows("guess_players", (q) => q.eq("is_playable", 1).eq("current_competition_id", TURKISH_COMPETITION_ID)),
      countRows("player_quiz_clubs"),
      countRows("guess_players", (q) => q.eq("is_playable", 1).is("current_club_name", null)),
      countRows("guess_players", (q) => q.eq("is_playable", 1).is("current_competition_id", null)),
      countRows("guess_players", (q) => q.eq("is_playable", 1).is("nationality", null)),
      countRows("guess_players", (q) => q.eq("is_playable", 1).is("position", null)),
      countRows("guess_players", (q) => q.eq("is_playable", 1).is("age", null)),
      countRows("guess_players", (q) => q.eq("is_playable", 1).is("preferred_foot", null)),
      countRows("guess_players", (q) => q.eq("is_playable", 1).is("popularity_score", null)),
      countRows("guess_players", (q) => q.eq("is_playable", 1).is("image_url", null)),
      countRows("guess_players", (q) => q.eq("is_playable", 1).eq("current_competition_id", TURKISH_COMPETITION_ID).is("current_club_name", null)),
      countRows("guess_players", (q) => q.eq("is_playable", 1).eq("current_competition_id", TURKISH_COMPETITION_ID).is("nationality", null)),
      countRows("guess_players", (q) => q.eq("is_playable", 1).eq("current_competition_id", TURKISH_COMPETITION_ID).is("position", null)),
      countRows("guess_players", (q) => q.eq("is_playable", 1).eq("current_competition_id", TURKISH_COMPETITION_ID).is("age", null)),
      countRows("guess_players", (q) => q.eq("is_playable", 1).eq("current_competition_id", TURKISH_COMPETITION_ID).is("preferred_foot", null)),
    ]);

    const { data: playerRows, error: playerError } = await supabaseAdmin
      .from("guess_players")
      .select("player_id, name, name_normalized, current_club_name, current_competition_id, nationality, position, age, preferred_foot, popularity_score, is_playable")
      .eq("is_playable", 1)
      .limit(10000);
    if (playerError) throw playerError;

    const { data: clubRows, error: clubError } = await supabaseAdmin
      .from("player_quiz_clubs")
      .select("player_id, club_name, career_order")
      .limit(20000);
    if (clubError) throw clubError;

    const byNormalizedName = new Map<string, Array<{ player_id: number; name: string }>>();
    const normalizedMismatch: Array<{ player_id: number; name: string; stored: string | null; calculated: string }> = [];

    for (const player of playerRows ?? []) {
      const normalized = normalizeName(player.name);
      const group = byNormalizedName.get(normalized) ?? [];
      group.push({ player_id: Number(player.player_id), name: String(player.name ?? "") });
      byNormalizedName.set(normalized, group);

      const stored = String(player.name_normalized ?? "");
      if (stored && stored !== normalized) {
        normalizedMismatch.push({
          player_id: Number(player.player_id),
          name: String(player.name ?? ""),
          stored: player.name_normalized,
          calculated: normalized,
        });
      }
    }

    const duplicateNames = Array.from(byNormalizedName.entries())
      .filter(([name, rows]) => name && rows.length > 1)
      .map(([normalized, rows]) => ({ normalized, count: rows.length, players: rows.slice(0, 6) }))
      .sort((a, b) => b.count - a.count);

    const playerIds = new Set((playerRows ?? []).map((row) => Number(row.player_id)));
    const orphanClubRows = (clubRows ?? []).filter((row) => !playerIds.has(Number(row.player_id)));

    const careerKeyCounts = new Map<string, number>();
    for (const row of clubRows ?? []) {
      const key = `${row.player_id}::${normalizeName(row.club_name)}::${row.career_order ?? ""}`;
      careerKeyCounts.set(key, (careerKeyCounts.get(key) ?? 0) + 1);
    }
    const duplicateCareerRows = Array.from(careerKeyCounts.entries()).filter(([, count]) => count > 1).length;

    const turkishClubRegex = new RegExp(TURKISH_CLUB_PATTERNS.map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i");
    const possibleCompetitionMismatch = (playerRows ?? [])
      .filter((row) => row.current_club_name && turkishClubRegex.test(String(row.current_club_name)) && row.current_competition_id !== TURKISH_COMPETITION_ID)
      .slice(0, 100)
      .map((row) => ({
        player_id: row.player_id,
        name: row.name,
        club: row.current_club_name,
        competition: row.current_competition_id,
      }));

    const tr1LowPopularity = (playerRows ?? [])
      .filter((row) => row.current_competition_id === TURKISH_COMPETITION_ID && Number(row.popularity_score ?? 0) < 50)
      .sort((a, b) => Number(a.popularity_score ?? 0) - Number(b.popularity_score ?? 0))
      .slice(0, 100)
      .map((row) => ({ player_id: row.player_id, name: row.name, club: row.current_club_name, popularity: row.popularity_score }));

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      counts: {
        totalPlayers,
        playablePlayers,
        currentSuperLigPlayers: tr1Players,
        playerQuizCareerRows: quizClubRows,
      },
      playableMissingFields: {
        currentClub: missingCurrentClub,
        competition: missingCompetition,
        nationality: missingNationality,
        position: missingPosition,
        age: missingAge,
        preferredFoot: missingFoot,
        popularity: missingPopularity,
        image: missingImage,
      },
      currentSuperLigMissingFields: {
        currentClub: tr1MissingClub,
        nationality: tr1MissingNationality,
        position: tr1MissingPosition,
        age: tr1MissingAge,
        preferredFoot: tr1MissingFoot,
      },
      integrity: {
        duplicateNormalizedNames: duplicateNames.length,
        duplicateNameSamples: duplicateNames.slice(0, 30),
        nameNormalizedMismatchCount: normalizedMismatch.length,
        nameNormalizedMismatchSamples: normalizedMismatch.slice(0, 30),
        orphanCareerRows: orphanClubRows.length,
        orphanCareerSamples: orphanClubRows.slice(0, 30),
        duplicateCareerRows,
        possibleCurrentCompetitionMismatchCount: possibleCompetitionMismatch.length,
        possibleCurrentCompetitionMismatchSamples: possibleCompetitionMismatch.slice(0, 30),
        currentSuperLigPopularityBelow50Count: tr1LowPopularity.length,
        currentSuperLigPopularityBelow50Samples: tr1LowPopularity.slice(0, 30),
      },
    });
  } catch (error) {
    console.error("Database audit error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Database audit failed." },
      { status: 500 },
    );
  }
}
