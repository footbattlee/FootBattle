import { NextResponse } from "next/server";

import {
  leagueToDisplayName,
  nationalityToDisplayName,
  positionToDisplayName,
  preferredFootToDisplayName,
} from "@/lib/football/localization";
import {
  getSuperLigCareerPlayerIds,
  isSuperLigGuessRequest,
} from "@/lib/guess-the-player/super-lig";
import { supabaseAdmin } from "@/lib/supabase/server";

const MINIMUM_SEARCH_LENGTH = 3;
const MAXIMUM_RESULTS = 10;
const CANDIDATE_LIMIT = 100;

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

function nameRank(name: string, query: string) {
  const normalized = normalizeSearchText(name);
  const tokens = normalized.split(" ").filter(Boolean);

  if (normalized === query) return 0;
  if (tokens.includes(query)) return 1;
  if (tokens.some((token) => token.startsWith(query))) return 2;
  if (normalized.startsWith(query)) return 3;
  return 4;
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

    const { data: candidateRows, error: candidateError } = await supabaseAdmin
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
      .ilike("name_normalized", `%${safeQuery}%`)
      .order("popularity_score", { ascending: false, nullsFirst: false })
      .limit(CANDIDATE_LIMIT);

    if (candidateError) {
      console.error("Guess the Player oyuncu araması başarısız:", candidateError);
      return NextResponse.json({ ok: false, error: "Oyuncular aranırken bir hata oluştu." }, { status: 500 });
    }

    let rows = candidateRows ?? [];

    if (superLigMode && rows.length > 0) {
      // Zorluk yalnızca gizli futbolcunun seçimini belirler. Kullanıcı tahmin ederken
      // Süper Lig geçmişi olan tüm oyuncular arasından arama yapabilmeli.
      const careerIds = await getSuperLigCareerPlayerIds();
      const allowed = new Set(careerIds);
      rows = rows.filter((player) => allowed.has(Number(player.player_id)));
    }

    rows = rows
      .sort((a, b) => {
        const rankDiff = nameRank(a.name ?? "", query) - nameRank(b.name ?? "", query);
        if (rankDiff !== 0) return rankDiff;
        return Number(b.popularity_score ?? 0) - Number(a.popularity_score ?? 0);
      })
      .slice(0, MAXIMUM_RESULTS);

    const players = rows.map((player) => ({
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

    return NextResponse.json({
      ok: true,
      players,
      minimumSearchLength: MINIMUM_SEARCH_LENGTH,
      mode: superLigMode ? "super_lig" : "standard",
    });
  } catch (error) {
    console.error("Guess the Player search endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
