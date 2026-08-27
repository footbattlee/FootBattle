import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";
import { TRANSFER_QUIZ_MIN_SEARCH_LENGTH } from "@/lib/transfer-quiz/game";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("q") ?? "").trim();

    if (query.length < TRANSFER_QUIZ_MIN_SEARCH_LENGTH) {
      return NextResponse.json({ ok: true, players: [] });
    }

    const escaped = query.replace(/[%_]/g, "");
    const { data, error } = await supabaseAdmin
      .from("guess_players")
      .select("player_id, name, image_url, popularity_score")
      .ilike("name", `%${escaped}%`)
      .eq("is_playable", 1)
      .order("popularity_score", { ascending: false })
      .limit(12);

    if (error) {
      return NextResponse.json({ ok: false, error: "Oyuncular aranamadı." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      players: (data ?? []).map((player) => ({
        id: Number(player.player_id),
        name: String(player.name),
        imageUrl: player.image_url ?? null,
      })),
    });
  } catch (error) {
    console.error("Transferi Bil oyuncu arama hatası:", error);
    return NextResponse.json({ ok: false, error: "Oyuncular aranamadı." }, { status: 500 });
  }
}
