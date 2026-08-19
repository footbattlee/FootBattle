import { NextResponse } from "next/server";

import {
  leagueToDisplayName,
  nationalityToDisplayName,
  positionToDisplayName,
  preferredFootToDisplayName,
} from "@/lib/football/localization";
import {
  filterSuperLigPlayerIdsByDifficulty,
  getSuperLigCareerPlayerIds,
  getSuperLigDifficulty,
  isSuperLigGuessRequest,
} from "@/lib/guess-the-player/super-lig";
import { supabaseAdmin } from "@/lib/supabase/server";

const MINIMUM_SEARCH_LENGTH = 3;
const MAXIMUM_RESULTS = 10;

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
    const rawQuery = requestUrl.searchParams.get("q") ?? "";
    const query = normalizeSearchText(rawQuery);

    if (query.length < MINIMUM_SEARCH_LENGTH) {
      return NextResponse.json({ ok: true, players: [], minimumSearchLength: MINIMUM_SEARCH_LENGTH });
    }

    const safeQuery = query.replace(/%/g, "").replace(/_/g, "");
    const superLigMode = isSuperLigGuessRequest(request);

    let allowedIds: number[] | null = null;
    if (superLigMode) {
      const careerIds = await getSuperLigCareerPlayerIds();
      allowedIds = await filterSuperLigPlayerIdsByDifficulty(careerIds, getSuperLigDifficulty(request));
      if (allowedIds.length === 0) {
        return NextResponse.json({ ok: true, players: [], minimumSearchLength: MINIMUM_SEARCH_LENGTH });
      }
    }

    let queryBuilder = supabaseAdmin
      .from("guess_players")
      .select(`
        player_id,
        name,
        nationality,
        position,
        sub_position,
        age,
        current_club_name,
        current_competition_id,
        preferred_foot,
        image_url,
        popularity_score
      `)
      .eq("is_playable", 1)
      .ilike("name_normalized", `%${safeQuery}%`);

    if (allowedIds) {
      // Search candidates first, then keep only the Süper Lig alumni pool.
      queryBuilder = queryBuilder.in("player_id", allowedIds.slice(0, 1500));
    }

    const { data, error } = await queryBuilder
      .order("popularity_score", { ascending: false, nullsFirst: false })
      .limit(MAXIMUM_RESULTS);

    if (error) {
      console.error("Guess the Player oyuncu araması başarısız:", error);
      return NextResponse.json({ ok: false, error: "Oyuncular aranırken bir hata oluştu." }, { status: 500 });
    }

    const players = (data ?? []).map((player) => ({
      id: player.player_id,
      fullName: player.name,
      nationality: nationalityToDisplayName(player.nationality),
      position: positionToDisplayName(player.sub_position ?? player.position),
      club: player.current_club_name ?? "Kulüpsüz",
      league: leagueToDisplayName(player.current_competition_id),
      age: typeof player.age === "number" ? player.age : Number(player.age ?? 0),
      preferredFoot: preferredFootToDisplayName(player.preferred_foot),
      imageUrl: player.image_url ?? null,
    }));

    return NextResponse.json({ ok: true, players, minimumSearchLength: MINIMUM_SEARCH_LENGTH, mode: superLigMode ? "super_lig" : "standard" });
  } catch (error) {
    console.error("Guess the Player search endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
