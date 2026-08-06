import { NextResponse } from "next/server";

import { getActiveGameDateKey } from "@/lib/game-day";
import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 8;
const MINIMUM_SEARCH_LENGTH = 2;

export async function GET() {
  try {
    /*
     * İstanbul saatine göre:
     * 00.00–01.59 → önceki günün oyunu
     * 02.00 sonrası → bugünün oyunu
     */
    const playDate = getActiveGameDateKey();

    const { data: dailyGame, error: dailyGameError } =
      await supabaseAdmin
        .from("daily_guess_player")
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
        "Guess the Player günlük oyun sorgusu başarısız:",
        dailyGameError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Aktif Guess the Player oyunu kontrol edilemedi.",
        },
        { status: 500 },
      );
    }

    if (!dailyGame) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Aktif Guess the Player oyunu henüz yayınlanmadı.",
          dateKey: playDate,
        },
        { status: 404 },
      );
    }

    /*
     * Hedef oyuncunun gerçekten geçerli ve oynanabilir
     * olduğunu sunucu tarafında kontrol ediyoruz.
     *
     * Oyuncunun adını veya cevabı istemciye göndermiyoruz.
     */
    const { data: player, error: playerError } =
      await supabaseAdmin
        .from("guess_players")
        .select(`
          player_id,
          nationality,
          position,
          sub_position,
          age,
          current_club_name,
          current_competition_id,
          preferred_foot
        `)
        .eq("player_id", dailyGame.player_id)
        .eq("is_playable", 1)
        .maybeSingle();

    if (playerError) {
      console.error(
        "Guess the Player hedef oyuncusu okunamadı:",
        playerError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Günün oyuncusu okunamadı.",
        },
        { status: 500 },
      );
    }

    if (!player) {
      return NextResponse.json(
        {
          ok: false,
          error: "Günün oyuncusu bulunamadı.",
        },
        { status: 404 },
      );
    }

    /*
     * Oyun için gerekli temel özelliklerin dolu olduğunu
     * kontrol ediyoruz.
     */
    const playerDataIsComplete =
      player.nationality &&
      player.position &&
      player.age !== null &&
      player.current_club_name &&
      player.current_competition_id &&
      player.preferred_foot;

    if (!playerDataIsComplete) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Seçilen oyuncunun Guess the Player bilgileri eksik.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      ok: true,
      dateKey: dailyGame.play_date,
      maxAttempts: MAX_ATTEMPTS,
      minimumSearchLength: MINIMUM_SEARCH_LENGTH,

      /*
       * Hedef oyuncu bilgileri burada özellikle gönderilmiyor.
       * Tahminlerin doğrulanması guess endpoint'inde yapılmalı.
       */
      board: {
        columns: [
          "nationality",
          "club",
          "competition",
          "position",
          "age",
          "preferredFoot",
        ],
      },
    });
  } catch (error) {
    console.error(
      "Guess the Player today endpoint hatası:",
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