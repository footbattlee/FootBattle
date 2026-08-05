import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

type GuessRequest = {
  clubName?: string;
  solvedClubIds?: number[];
};

function getTurkeyDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[.\-_/]/g, " ")
    .replace(/\s+/g, " ");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GuessRequest;

    const clubName = body.clubName?.trim() ?? "";

    if (!clubName) {
      return NextResponse.json(
        {
          ok: false,
          error: "Kulüp seçimi boş olamaz.",
        },
        { status: 400 },
      );
    }

    const solvedClubIds = Array.isArray(body.solvedClubIds)
      ? body.solvedClubIds
          .map(Number)
          .filter(
            (id) => Number.isInteger(id) && id > 0,
          )
      : [];

    const playDate = getTurkeyDateKey();

    const { data: dailyGame, error: dailyGameError } =
      await supabaseAdmin
        .from("daily_career_path")
        .select("player_id")
        .eq("play_date", playDate)
        .eq("is_published", true)
        .maybeSingle();

    if (dailyGameError) {
      console.error(
        "Career Path günlük oyun okunamadı:",
        dailyGameError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Bugünün oyunu kontrol edilemedi.",
        },
        { status: 500 },
      );
    }

    if (!dailyGame) {
      return NextResponse.json(
        {
          ok: false,
          error: "Bugünün Career Path oyunu bulunamadı.",
        },
        { status: 404 },
      );
    }

    const { data: clubs, error: clubsError } =
      await supabaseAdmin
        .from("player_quiz_clubs")
        .select(`
          id,
          club_name,
          career_order
        `)
        .eq("player_id", dailyGame.player_id)
        .order("career_order", {
          ascending: true,
        });

    if (clubsError) {
      console.error(
        "Career Path kulüpleri okunamadı:",
        clubsError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Kulüp bilgileri kontrol edilemedi.",
        },
        { status: 500 },
      );
    }

    const matchedClub = (clubs ?? []).find(
      (club) =>
        normalizeText(club.club_name) ===
        normalizeText(clubName),
    );

    if (!matchedClub) {
      return NextResponse.json({
        ok: true,
        correct: false,
        duplicate: false,
        matchedClub: null,
      });
    }

    if (solvedClubIds.includes(Number(matchedClub.id))) {
      return NextResponse.json({
        ok: true,
        correct: false,
        duplicate: true,
        matchedClub: null,
      });
    }

    return NextResponse.json({
      ok: true,
      correct: true,
      duplicate: false,
      matchedClub: {
        id: matchedClub.id,
        name: matchedClub.club_name,
        careerOrder: matchedClub.career_order,
      },
    });
  } catch (error) {
    console.error(
      "Career Path guess endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Cevap kontrol edilirken hata oluştu.",
      },
      { status: 500 },
    );
  }
}