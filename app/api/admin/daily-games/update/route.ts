import { NextResponse } from "next/server";

import {
  DAILY_GAME_TABLES,
  isDailyGameCode,
} from "@/lib/admin/daily-games";
import { requireAdmin } from "@/lib/admin/require-admin";
import { supabaseAdmin } from "@/lib/supabase/server";

type UpdateRequest = {
  playDate?: string;
  gameCode?: string;
  playerId?: number;
};

export async function POST(request: Request) {
  const admin = await requireAdmin();

  if (!admin.ok) {
    return NextResponse.json(
      { ok: false, error: admin.error },
      { status: admin.status },
    );
  }

  try {
    const body = (await request.json()) as UpdateRequest;

    if (!body.playDate?.trim()) {
      return NextResponse.json(
        { ok: false, error: "Oyun tarihi zorunludur." },
        { status: 400 },
      );
    }

    if (!isDailyGameCode(body.gameCode)) {
      return NextResponse.json(
        { ok: false, error: "Oyun kodu geçersiz." },
        { status: 400 },
      );
    }

    const playerId = Number(body.playerId);

    if (!Number.isInteger(playerId) || playerId <= 0) {
      return NextResponse.json(
        { ok: false, error: "Oyuncu bilgisi geçersiz." },
        { status: 400 },
      );
    }

    const { data: player, error: playerError } =
      await supabaseAdmin
        .from("guess_players")
        .select("player_id")
        .eq("player_id", playerId)
        .eq("is_playable", 1)
        .maybeSingle();

    if (playerError || !player) {
      return NextResponse.json(
        { ok: false, error: "Oyuncu bulunamadı veya oynanabilir değil." },
        { status: 404 },
      );
    }

    const tableName = DAILY_GAME_TABLES[body.gameCode];

    const { error } = await supabaseAdmin
      .from(tableName)
      .upsert(
        {
          play_date: body.playDate,
          player_id: playerId,
          is_published: false,
          created_by: admin.user.id,
        },
        { onConflict: "play_date" },
      );

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Daily game update hatası:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Oyuncu güncellenemedi.",
      },
      { status: 500 },
    );
  }
}
