import { NextResponse } from "next/server";

import {
  leagueToDisplayName,
  nationalityToDisplayName,
} from "@/lib/football/localization";
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
    const { data, error } = await supabaseAdmin
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
      .limit(MAXIMUM_RESULTS);

    if (error) {
      console.error("Guess the Player oyuncu araması başarısız:", error);
      return NextResponse.json({ ok: false, error: "Oyuncular aranırken bir hata oluştu." }, { status: 500 });
    }

    const players = (data ?? []).map((player) => ({
      id: player.player_id,
      fullName: player.name,
      nationality: nationalityToDisplayName(player.nationality),
      position: player.sub_position ?? player.position ?? "Bilinmiyor",
      club: player.current_club_name ?? "Kulüpsüz",
      league: leagueToDisplayName(player.current_competition_id),
      age: typeof player.age === "number" ? player.age : Number(player.age ?? 0),
      preferredFoot: player.preferred_foot ?? "Bilinmiyor",
      imageUrl: player.image_url ?? null,
    }));

    return NextResponse.json({ ok: true, players, minimumSearchLength: MINIMUM_SEARCH_LENGTH });
  } catch (error) {
    console.error("Guess the Player search endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
