import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_WRONG_GUESSES = 5;
const MINIMUM_SEARCH_LENGTH = 3;

function getTurkeyDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function GET() {
  try {
    const playDate = getTurkeyDateKey();

    const { data: dailyGame, error: dailyGameError } =
      await supabaseAdmin
        .from("daily_career_path")
        .select("play_date, player_id")
        .eq("play_date", playDate)
        .eq("is_published", true)
        .maybeSingle();

    if (dailyGameError) {
      console.error(
        "Career Path günlük oyun sorgusu başarısız:",
        dailyGameError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Bugünün Career Path oyunu kontrol edilemedi.",
        },
        { status: 500 },
      );
    }

    if (!dailyGame) {
      return NextResponse.json(
        {
          ok: false,
          error: "Bugünün Career Path oyunu henüz hazırlanmadı.",
        },
        { status: 404 },
      );
    }

    const { data: player, error: playerError } =
      await supabaseAdmin
        .from("guess_players")
        .select(`
          player_id,
          name,
          image_url
        `)
        .eq("player_id", dailyGame.player_id)
        .eq("is_playable", 1)
        .maybeSingle();

    if (playerError) {
      console.error(
        "Career Path oyuncusu okunamadı:",
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

    const { count: clubCount, error: clubCountError } =
      await supabaseAdmin
        .from("player_quiz_clubs")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("player_id", dailyGame.player_id);

    if (clubCountError) {
      console.error(
        "Career Path kulüp sayısı okunamadı:",
        clubCountError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Oyuncunun kariyer bilgileri okunamadı.",
        },
        { status: 500 },
      );
    }

    if (!clubCount || clubCount < 1) {
      return NextResponse.json(
        {
          ok: false,
          error: "Oyuncunun kariyer kulüpleri hazırlanmamış.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      dateKey: dailyGame.play_date,

      player: {
        id: player.player_id,
        fullName: player.name,
        imageUrl: player.image_url ?? null,
      },

      board: {
        clubSlots: clubCount,
      },

      maxWrongGuesses: MAX_WRONG_GUESSES,
      minimumSearchLength: MINIMUM_SEARCH_LENGTH,

      scoring: {
        zeroWrong: 250,
        oneWrong: 200,
        twoWrong: 150,
        threeWrong: 100,
        fourWrong: 50,
        fiveWrong: 0,
      },
    });
  } catch (error) {
    console.error(
      "Career Path today endpoint hatası:",
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