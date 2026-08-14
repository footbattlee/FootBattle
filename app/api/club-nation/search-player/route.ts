import { NextResponse } from "next/server";

import { nationalityToDisplayName } from "@/lib/football/localization";
import { supabaseAdmin } from "@/lib/supabase/server";

const MINIMUM_SEARCH_LENGTH = 3;
const RESULT_LIMIT = 10;

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, " ");
}

export async function GET(request: Request) {
  try {
    const rawQuery = new URL(request.url).searchParams.get("q") ?? "";
    const normalizedQuery = normalizeText(rawQuery);
    if (normalizedQuery.length < MINIMUM_SEARCH_LENGTH) return NextResponse.json({ ok: true, players: [], minimumSearchLength: MINIMUM_SEARCH_LENGTH });

    const { data, error } = await supabaseAdmin
      .from("guess_players")
      .select("player_id, name, name_normalized, nationality, current_club_name, image_url")
      .ilike("name_normalized", `%${normalizedQuery}%`)
      .limit(50);
    if (error) throw error;

    const rankedPlayers = (data ?? [])
      .map((player) => {
        const normalizedName = normalizeText(player.name_normalized ?? player.name ?? "");
        const nameParts = normalizedName.split(" ").filter(Boolean);
        let rank = 4;
        if (normalizedName === normalizedQuery) rank = 1;
        else if (normalizedName.startsWith(normalizedQuery)) rank = 2;
        else if (nameParts.some((part) => part.startsWith(normalizedQuery))) rank = 3;
        return { ...player, rank };
      })
      .sort((first, second) => first.rank !== second.rank ? first.rank - second.rank : (first.name ?? "").localeCompare(second.name ?? "", "tr"))
      .slice(0, RESULT_LIMIT);

    return NextResponse.json({
      ok: true,
      minimumSearchLength: MINIMUM_SEARCH_LENGTH,
      players: rankedPlayers.map((player) => ({
        playerId: Number(player.player_id),
        name: player.name,
        nationality: nationalityToDisplayName(player.nationality),
        currentClubName: player.current_club_name ?? null,
        imageUrl: player.image_url ?? null,
      })),
    });
  } catch (error) {
    console.error("1 Takım 1 Millet search-player endpoint hatası:", error);
    return NextResponse.json({ ok: false, players: [], error: error instanceof Error ? error.message : "Oyuncular aranamadı." }, { status: 500 });
  }
}
