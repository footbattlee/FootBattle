import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

type FieldType =
  | "birthYear"
  | "nationality"
  | "trophy"
  | "club";

type GuessRequest = {
  field?: FieldType;
  value?: string | number;
  solvedClubIds?: number[];
};

const ALLOWED_FIELDS: FieldType[] = [
  "birthYear",
  "nationality",
  "trophy",
  "club",
];

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

    const field = body.field;
    const rawValue = body.value;

    if (!field || !ALLOWED_FIELDS.includes(field)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Kontrol edilecek alan geçersiz.",
        },
        { status: 400 },
      );
    }

    if (
      rawValue === undefined ||
      rawValue === null ||
      String(rawValue).trim() === ""
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Kontrol edilecek değer boş olamaz.",
        },
        { status: 400 },
      );
    }

    const playDate = getTurkeyDateKey();

    const { data: dailyGame, error: dailyGameError } =
      await supabaseAdmin
        .from("daily_player_quiz")
        .select("player_id")
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
          error: "Bugünün oyunu kontrol edilemedi.",
        },
        { status: 500 },
      );
    }

    if (!dailyGame) {
      return NextResponse.json(
        {
          ok: false,
          error: "Bugünün Player Quiz oyunu bulunamadı.",
        },
        { status: 404 },
      );
    }

    const playerId = Number(dailyGame.player_id);

    if (field === "birthYear") {
      const guessedBirthYear = Number(rawValue);

      if (
        !Number.isInteger(guessedBirthYear) ||
        guessedBirthYear < 1900 ||
        guessedBirthYear > 2100
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "Geçerli bir doğum yılı gir.",
          },
          { status: 400 },
        );
      }

      const { data, error } = await supabaseAdmin
        .from("player_quiz_details")
        .select("birth_year")
        .eq("player_id", playerId)
        .maybeSingle();

      if (error) {
        console.error(
          "Player Quiz doğum yılı okunamadı:",
          error,
        );

        return NextResponse.json(
          {
            ok: false,
            error: "Doğum yılı kontrol edilemedi.",
          },
          { status: 500 },
        );
      }

      if (!data) {
        return NextResponse.json(
          {
            ok: false,
            error: "Oyuncunun doğum yılı hazırlanmamış.",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        ok: true,
        field,
        correct: guessedBirthYear === data.birth_year,
      });
    }

    if (field === "nationality") {
      const { data, error } = await supabaseAdmin
        .from("guess_players")
        .select("nationality")
        .eq("player_id", playerId)
        .maybeSingle();

      if (error) {
        console.error(
          "Player Quiz milliyet bilgisi okunamadı:",
          error,
        );

        return NextResponse.json(
          {
            ok: false,
            error: "Milliyet kontrol edilemedi.",
          },
          { status: 500 },
        );
      }

      if (!data?.nationality) {
        return NextResponse.json(
          {
            ok: false,
            error: "Oyuncunun milliyet bilgisi bulunamadı.",
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        ok: true,
        field,
        correct:
          normalizeText(rawValue) ===
          normalizeText(data.nationality),
      });
    }

    if (field === "trophy") {
      const { data, error } = await supabaseAdmin
        .from("player_quiz_trophies")
        .select("id, trophy_name")
        .eq("player_id", playerId);

      if (error) {
        console.error(
          "Player Quiz kupa bilgileri okunamadı:",
          error,
        );

        return NextResponse.json(
          {
            ok: false,
            error: "Kupa kontrol edilemedi.",
          },
          { status: 500 },
        );
      }

      const matchedTrophy = (data ?? []).find(
        (trophy) =>
          normalizeText(trophy.trophy_name) ===
          normalizeText(rawValue),
      );

      return NextResponse.json({
        ok: true,
        field,
        correct: Boolean(matchedTrophy),
        matchedId: matchedTrophy?.id ?? null,
      });
    }

    const solvedClubIds = Array.isArray(body.solvedClubIds)
      ? body.solvedClubIds
          .map(Number)
          .filter(
            (id) => Number.isInteger(id) && id > 0,
          )
      : [];

    const { data: clubs, error: clubsError } =
      await supabaseAdmin
        .from("player_quiz_clubs")
        .select(`
          id,
          club_name,
          career_order
        `)
        .eq("player_id", playerId)
        .order("career_order", {
          ascending: true,
        });

    if (clubsError) {
      console.error(
        "Player Quiz kulüp bilgileri okunamadı:",
        clubsError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Kulüp kontrol edilemedi.",
        },
        { status: 500 },
      );
    }

    const matchedClub = (clubs ?? []).find(
      (club) =>
        normalizeText(club.club_name) ===
        normalizeText(rawValue),
    );

    if (!matchedClub) {
      return NextResponse.json({
        ok: true,
        field,
        correct: false,
        duplicate: false,
        matchedClub: null,
      });
    }

    if (solvedClubIds.includes(matchedClub.id)) {
      return NextResponse.json({
        ok: true,
        field,
        correct: false,
        duplicate: true,
        matchedClub: null,
      });
    }

    return NextResponse.json({
      ok: true,
      field,
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
      "Player Quiz guess endpoint hatası:",
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