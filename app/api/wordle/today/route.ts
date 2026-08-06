import { NextResponse } from "next/server";

import { getActiveGameDateKey } from "@/lib/game-day";
import { supabaseAdmin } from "@/lib/supabase/server";

function getLastName(nameNormalized: string) {
  const parts = nameNormalized
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return parts.at(-1) ?? "";
}

export async function GET() {
  try {
    /*
     * İstanbul saatine göre:
     * 00.00–11.59 → önceki günün oyunu
     * 12.00 sonrası → bugünün oyunu
     */
    const playDate = getActiveGameDateKey();

    /*
     * Önce günlük Wordle kaydını buluyoruz.
     */
    const { data: dailyGame, error: dailyGameError } =
      await supabaseAdmin
        .from("daily_wordle")
        .select(`
          play_date,
          player_id,
          is_published
        `)
        .eq("play_date", playDate)
        .eq("is_published", true)
        .maybeSingle();

    if (dailyGameError) {
      console.error(
        "Günün Wordle kaydı okunamadı:",
        dailyGameError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Günün Wordle kaydı okunamadı.",
        },
        { status: 500 },
      );
    }

    if (!dailyGame) {
      return NextResponse.json(
        {
          ok: false,
          error: "Aktif Wordle oyunu henüz yayınlanmadı.",
          dateKey: playDate,
        },
        { status: 404 },
      );
    }

    /*
     * Oyuncuyu ortak guess_players havuzundan okuyoruz.
     */
    const { data: player, error: playerError } =
      await supabaseAdmin
        .from("guess_players")
        .select(`
          player_id,
          name,
          name_normalized
        `)
        .eq("player_id", dailyGame.player_id)
        .maybeSingle();

    if (playerError) {
      console.error(
        "Wordle oyuncusu okunamadı:",
        playerError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Wordle oyuncusu okunamadı.",
        },
        { status: 500 },
      );
    }

    if (!player) {
      return NextResponse.json(
        {
          ok: false,
          error: "Wordle oyuncusu bulunamadı.",
        },
        { status: 404 },
      );
    }

    const normalizedLastName = getLastName(
      player.name_normalized,
    );

    if (!normalizedLastName) {
      return NextResponse.json(
        {
          ok: false,
          error: "Oyuncunun Wordle cevabı oluşturulamadı.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      dateKey: dailyGame.play_date,
      letterCount: normalizedLastName.length,
      maxAttempts: 5,
    });
  } catch (error) {
    console.error(
      "Wordle today endpoint beklenmeyen hata:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Beklenmeyen bir hata oluştu.",
      },
      { status: 500 },
    );
  }
}