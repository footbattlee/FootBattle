import { NextResponse } from "next/server";

import { getActiveGameDateKey } from "@/lib/game-day";
import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_LIVES = 5;
const GUESS_TIME_SECONDS = 20;
const MINIMUM_SEARCH_LENGTH = 3;

export async function GET() {
  try {
    const playDate = getActiveGameDateKey();

    const { data: dailyGame, error: dailyError } =
      await supabaseAdmin
        .from("daily_player_quiz")
        .select(`
          play_date,
          player_id,
          is_published
        `)
        .eq("play_date", playDate)
        .eq("is_published", true)
        .maybeSingle();

    if (dailyError) {
      console.error(
        "Player Quiz günlük oyun sorgusu başarısız:",
        dailyError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Player Quiz okunamadı.",
        },
        { status: 500 },
      );
    }

    if (!dailyGame) {
      return NextResponse.json(
        {
          ok: false,
          error: "Aktif Player Quiz oyunu henüz yayınlanmadı.",
          dateKey: playDate,
        },
        { status: 404 },
      );
    }

    const playerId = Number(dailyGame.player_id);

    const [
      playerResult,
      detailResult,
      clubsResult,
      trophiesResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("guess_players")
        .select(`
          player_id,
          name,
          image_url,
          nationality
        `)
        .eq("player_id", playerId)
        .eq("is_playable", 1)
        .maybeSingle(),

      supabaseAdmin
        .from("player_quiz_details")
        .select("birth_year")
        .eq("player_id", playerId)
        .maybeSingle(),

      supabaseAdmin
        .from("player_quiz_clubs")
        .select("id, club_name, career_order")
        .eq("player_id", playerId)
        .order("career_order", {
          ascending: true,
        }),

      supabaseAdmin
        .from("player_quiz_trophies")
        .select("id, trophy_name")
        .eq("player_id", playerId),
    ]);

    if (playerResult.error) {
      console.error(
        "Player Quiz oyuncusu okunamadı:",
        playerResult.error,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Oyuncu bilgisi okunamadı.",
        },
        { status: 500 },
      );
    }

    if (!playerResult.data) {
      return NextResponse.json(
        {
          ok: false,
          error: "Oyuncu bulunamadı.",
        },
        { status: 404 },
      );
    }

    if (detailResult.error) {
      console.error(
        "Player Quiz doğum yılı okunamadı:",
        detailResult.error,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Oyuncunun doğum yılı okunamadı.",
        },
        { status: 500 },
      );
    }

    if (clubsResult.error) {
      console.error(
        "Player Quiz kulüpleri okunamadı:",
        clubsResult.error,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Oyuncunun kulüpleri okunamadı.",
        },
        { status: 500 },
      );
    }

    if (trophiesResult.error) {
      console.error(
        "Player Quiz kupaları okunamadı:",
        trophiesResult.error,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Oyuncunun kupaları okunamadı.",
        },
        { status: 500 },
      );
    }

    const player = playerResult.data;
    const clubs = clubsResult.data ?? [];
    const trophies = trophiesResult.data ?? [];

    if (!detailResult.data?.birth_year) {
      return NextResponse.json(
        {
          ok: false,
          error: "Oyuncunun doğum yılı hazırlanmamış.",
        },
        { status: 422 },
      );
    }

    if (!player.nationality?.trim()) {
      return NextResponse.json(
        {
          ok: false,
          error: "Oyuncunun milliyeti hazırlanmamış.",
        },
        { status: 422 },
      );
    }

    if (clubs.length < 1) {
      return NextResponse.json(
        {
          ok: false,
          error: "Oyuncunun kariyer kulüpleri hazırlanmamış.",
        },
        { status: 422 },
      );
    }

    if (trophies.length < 1) {
      return NextResponse.json(
        {
          ok: false,
          error: "Oyuncunun kupa bilgileri hazırlanmamış.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      ok: true,
      dateKey: dailyGame.play_date,

      player: {
        id: Number(player.player_id),
        fullName: player.name,
        imageUrl: player.image_url ?? null,
      },

      maxLives: MAX_LIVES,
      guessTimeSeconds: GUESS_TIME_SECONDS,
      minimumSearchLength: MINIMUM_SEARCH_LENGTH,

      board: {
        birthYearSlots: 1,
        nationalitySlots: 1,
        trophySlots: 1,
        clubSlots: clubs.length,
        totalSlots: clubs.length + 3,
      },

      scoring: {
        completionScore: 500,
      },
    });
  } catch (error) {
    console.error(
      "Player Quiz today endpoint hatası:",
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
