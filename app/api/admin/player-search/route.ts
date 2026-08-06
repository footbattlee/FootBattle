import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const admin = await requireAdmin();

  if (!admin.ok) {
    return NextResponse.json(
      { ok: false, error: admin.error },
      { status: admin.status },
    );
  }

  try {
    const requestUrl = new URL(request.url);
    const query = requestUrl.searchParams.get("q")?.trim() ?? "";

    if (query.length < 2) {
      return NextResponse.json({
        ok: true,
        players: [],
      });
    }

    const normalized = query
      .toLocaleLowerCase("tr-TR")
      .replace(/ı/g, "i")
      .replace(/ç/g, "c")
      .replace(/ğ/g, "g")
      .replace(/ö/g, "o")
      .replace(/ş/g, "s")
      .replace(/ü/g, "u")
      .replace(/%/g, "")
      .replace(/_/g, "");

    const { data, error } = await supabaseAdmin
      .from("guess_players")
      .select(`
        player_id,
        name,
        image_url,
        nationality,
        position,
        sub_position,
        current_club_name,
        popularity_score
      `)
      .eq("is_playable", 1)
      .ilike("name_normalized", `%${normalized}%`)
      .order("popularity_score", {
        ascending: false,
        nullsFirst: false,
      })
      .limit(20);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
      players: (data ?? []).map((player) => ({
        id: Number(player.player_id),
        fullName: player.name,
        imageUrl: player.image_url ?? null,
        nationality: player.nationality ?? null,
        position: player.position ?? null,
        subPosition: player.sub_position ?? null,
        club: player.current_club_name ?? null,
        popularityScore:
          player.popularity_score === null
            ? null
            : Number(player.popularity_score),
      })),
    });
  } catch (error) {
    console.error("Admin player search hatası:", error);

    return NextResponse.json(
      { ok: false, error: "Oyuncular aranamadı." },
      { status: 500 },
    );
  }
}
