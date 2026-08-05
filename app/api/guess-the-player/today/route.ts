import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 5;

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

    const { data, error } = await supabaseAdmin
      .from("daily_guess_player")
      .select("play_date")
      .eq("play_date", playDate)
      .eq("is_published", true)
      .maybeSingle();

    if (error) {
      console.error(
        "Guess the Player günlük oyun sorgusu başarısız:",
        error,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Günün oyunu kontrol edilemedi.",
        },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          error: "Bugünün Guess the Player oyunu henüz hazırlanmadı.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      dateKey: data.play_date,
      maxAttempts: MAX_ATTEMPTS,
      minimumSearchLength: 3,
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