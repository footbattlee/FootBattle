import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_LIVES = 5;
const GUESS_TIME_SECONDS = 20;
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

    /*
     * Bugünün yayınlanmış Player Quiz oyuncusunu bul.
     */
    const { data: dailyGame, error: dailyGameError } =
      await supabaseAdmin
        .from("daily_player_quiz")
        .select("play_date, player_id")
        .eq("play_date", playDate)
        .eq("is_published", true)
        .maybeSingle();

    if (dailyGameError) {
      console.error(
        "Player Quiz günlük oyun sorgusu başarısız:",
        dailyGameError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Günün Player Quiz oyunu kontrol edilemedi.",
        },
        { status: 500 },
      );
    }

    if (!dailyGame) {
      return NextResponse.json(
        {
          ok: false,
          error: "Bugünün Player Quiz oyunu henüz hazırlanmadı.",
        },
        { status: 404 },
      );
    }

    /*
     * Oyuncunun yalnızca kullanıcıya açık bilgilerini getir.
     */
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
        "Player Quiz oyuncusu okunamadı:",
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
     * Ekranda kaç kulüp kutusu gösterileceğini hesapla.
     * Kulüp isimleri tarayıcıya gönderilmez.
     */
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
        "Player Quiz kulüp sayısı okunamadı:",
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

    /*
     * Oyuncunun Player Quiz detay kaydı mevcut mu kontrol et.
     * Doğum yılını dışarı göndermiyoruz.
     */
    const { data: quizDetails, error: detailsError } =
      await supabaseAdmin
        .from("player_quiz_details")
        .select("player_id")
        .eq("player_id", dailyGame.player_id)
        .maybeSingle();

    if (detailsError) {
      console.error(
        "Player Quiz detay kaydı okunamadı:",
        detailsError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Oyuncunun quiz bilgileri okunamadı.",
        },
        { status: 500 },
      );
    }

    if (!quizDetails) {
      return NextResponse.json(
        {
          ok: false,
          error: "Oyuncunun Player Quiz detayları hazırlanmamış.",
        },
        { status: 404 },
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

      maxLives: MAX_LIVES,
      guessTimeSeconds: GUESS_TIME_SECONDS,
      minimumSearchLength: MINIMUM_SEARCH_LENGTH,

      board: {
        birthYearSlots: 1,
        nationalitySlots: 1,
        trophySlots: 1,
        clubSlots: clubCount,
        totalSlots: clubCount + 3,
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