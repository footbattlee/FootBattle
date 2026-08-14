import { NextResponse } from "next/server";

import { nationalityToDisplayName } from "@/lib/football/localization";
import { supabaseAdmin } from "@/lib/supabase/server";

const MINIMUM_POPULARITY_SCORE = 85;
const MINIMUM_SEARCH_LENGTH = 2;
const SEARCH_LIMIT = 20;

function normalizeSearch(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR").replace(/ı/g, "i").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
}

export async function GET(request: Request) {
  try {
    const rawQuery = new URL(request.url).searchParams.get("q") ?? "";
    const query = rawQuery.trim();
    if (query.length < MINIMUM_SEARCH_LENGTH) return NextResponse.json({ ok: true, players: [], minimumSearchLength: MINIMUM_SEARCH_LENGTH });
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return NextResponse.json({ ok: true, players: [] });

    const { data: playersData, error: playersError } = await supabaseAdmin
      .from("guess_players")
      .select("player_id, name, name_normalized, nationality, current_club_name, image_url, popularity_score")
      .eq("is_playable", 1)
      .gte("popularity_score", MINIMUM_POPULARITY_SCORE)
      .ilike("name_normalized", `%${normalizedQuery}%`)
      .order("popularity_score", { ascending: false, nullsFirst: false })
      .limit(SEARCH_LIMIT);
    if (playersError) return NextResponse.json({ ok: false, error: "Oyuncular aranamadı." }, { status: 500 });

    const players = (playersData ?? [])
      .map((player) => ({
        id: Number(player.player_id),
        name: player.name,
        nationality: nationalityToDisplayName(player.nationality),
        currentClubName: player.current_club_name ?? null,
        imageUrl: player.image_url ?? null,
        popularityScore: player.popularity_score === null ? null : Number(player.popularity_score),
      }))
      .filter((player) => Number.isInteger(player.id) && player.id > 0 && Boolean(player.name));

    return NextResponse.json({ ok: true, minimumSearchLength: MINIMUM_SEARCH_LENGTH, players });
  } catch (error) {
    console.error("Club Clash solo search-player endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Oyuncu aranırken hata oluştu." }, { status: 500 });
  }
}
