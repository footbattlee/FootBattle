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
const SUPER_LIG_CANDIDATE_LIMIT = 100;

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

    // Önce isimle eşleşen küçük aday havuzunu çekiyoruz. Eski yaklaşımda
    // Süper Lig oyuncu ID'lerinin ilk 1500 kaydıyla `.in(...)` yapıldığı için
    // Osimhen gibi geç sıradaki oyuncular mobil/desktop aramasında görünmeyebiliyordu.
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
      .limit(superLigMode ? SUPER_LIG_CANDIDATE_LIMIT : MAXIMUM_RESULTS);

    if (candidateError) {
      console.error("Guess the Player oyuncu araması başarısız:", candidateError);
      return NextResponse.json({ ok: false, error: "Oyuncular aranırken bir hata oluştu." }, { status: 500 });
    }

    let rows = candidateRows ?? [];

    if (superLigMode && rows.length > 0) {
      const careerIds = await getSuperLigCareerPlayerIds();
      const eligibleIds = await filterSuperLigPlayerIdsByDifficulty(careerIds, getSuperLigDifficulty(request));
      const allowed = new Set(eligibleIds);
      rows = rows.filter((player) => allowed.has(Number(player.player_id))).slice(0, MAXIMUM_RESULTS);
    } else {
      rows = rows.slice(0, MAXIMUM_RESULTS);
    }

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
