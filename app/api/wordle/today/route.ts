import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

function getTurkeyDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function GET() {
  const today = getTurkeyDateKey();

  const { data, error } = await supabaseAdmin
    .from("daily_wordle")
    .select(`
      play_date,
      is_published,
      players!inner (
        normalized_last_name
      )
    `)
    .eq("play_date", today)
    .eq("is_published", true)
    .single();

  if (error || !data) {
    console.error("Günün Wordle kaydı okunamadı:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Bugünün oyunu henüz hazırlanmadı.",
      },
      { status: 404 },
    );
  }

  const player = Array.isArray(data.players)
    ? data.players[0]
    : data.players;

  const answer = player?.normalized_last_name;

  if (!answer) {
    return NextResponse.json(
      {
        ok: false,
        error: "Oyuncu bilgisi bulunamadı.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    dateKey: data.play_date,
    letterCount: answer.length,
    maxAttempts: 5,
  });
}