import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

type ComparisonStatus =
  | "correct"
  | "wrong"
  | "higher"
  | "lower";

type PlayerRecord = {
  player_id: number;
  name: string;
  nationality: string | null;
  position: string | null;
  sub_position: string | null;
  age: number | string | null;
  current_club_name: string | null;
  current_competition_id: string | null;
  preferred_foot: string | null;
  image_url: string | null;
};

type GuessRequest = {
  playerId?: number;
};

function getTurkeyDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function normalizeValue(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLocaleUpperCase("tr-TR")
    .replace(/İ/g, "I")
    .replace(/Ç/g, "C")
    .replace(/Ğ/g, "G")
    .replace(/Ö/g, "O")
    .replace(/Ş/g, "S")
    .replace(/Ü/g, "U");
}

function compareText(
  guessedValue: string | null,
  targetValue: string | null,
): ComparisonStatus {
  return normalizeValue(guessedValue) ===
    normalizeValue(targetValue)
    ? "correct"
    : "wrong";
}

function compareAge(
  guessedAgeValue: number | string | null,
  targetAgeValue: number | string | null,
): ComparisonStatus {
  const guessedAge = Number(guessedAgeValue ?? 0);
  const targetAge = Number(targetAgeValue ?? 0);

  if (!guessedAge || !targetAge) {
    return "wrong";
  }

  if (guessedAge === targetAge) {
    return "correct";
  }

  /*
   * Tahmin edilen oyuncu hedef oyuncudan gençse:
   * Daha yüksek yaşa çıkılması gerektiğini belirtir.
   */
  if (guessedAge < targetAge) {
    return "higher";
  }

  return "lower";
}

function mapPlayer(player: PlayerRecord) {
  return {
    id: player.player_id,
    fullName: player.name,
    nationality: player.nationality ?? "Bilinmiyor",
    position:
      player.sub_position ??
      player.position ??
      "Bilinmiyor",
    club: player.current_club_name ?? "Kulüpsüz",
    league:
      player.current_competition_id ?? "Bilinmiyor",
    age: Number(player.age ?? 0),
    preferredFoot:
      player.preferred_foot ?? "Bilinmiyor",
    imageUrl: player.image_url ?? null,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GuessRequest;
    const playerId = Number(body.playerId);

    if (!Number.isInteger(playerId) || playerId <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Geçerli bir oyuncu seçmelisin.",
        },
        { status: 400 },
      );
    }

    const playDate = getTurkeyDateKey();

    const { data: dailyGame, error: dailyGameError } =
      await supabaseAdmin
        .from("daily_guess_player")
        .select("player_id")
        .eq("play_date", playDate)
        .eq("is_published", true)
        .maybeSingle();

    if (dailyGameError) {
      console.error(
        "Günlük Guess the Player kaydı okunamadı:",
        dailyGameError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Günün oyunu kontrol edilemedi.",
        },
        { status: 500 },
      );
    }

    if (!dailyGame) {
      return NextResponse.json(
        {
          ok: false,
          error: "Bugünün oyunu henüz hazırlanmadı.",
        },
        { status: 404 },
      );
    }

    const { data: guessedPlayer, error: guessedPlayerError } =
      await supabaseAdmin
        .from("guess_players")
        .select(`
          player_id,
          name,
          nationality,
          position,
          sub_position,
          age,
          current_club_name,
          current_competition_id,
          preferred_foot,
          image_url
        `)
        .eq("player_id", playerId)
        .eq("is_playable", 1)
        .maybeSingle();

    if (guessedPlayerError) {
      console.error(
        "Tahmin edilen oyuncu okunamadı:",
        guessedPlayerError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Oyuncu bilgileri okunamadı.",
        },
        { status: 500 },
      );
    }

    if (!guessedPlayer) {
      return NextResponse.json(
        {
          ok: false,
          error: "Seçilen oyuncu bulunamadı.",
        },
        { status: 404 },
      );
    }

    const { data: targetPlayer, error: targetPlayerError } =
      await supabaseAdmin
        .from("guess_players")
        .select(`
          player_id,
          name,
          nationality,
          position,
          sub_position,
          age,
          current_club_name,
          current_competition_id,
          preferred_foot,
          image_url
        `)
        .eq("player_id", dailyGame.player_id)
        .maybeSingle();

    if (targetPlayerError || !targetPlayer) {
      console.error(
        "Hedef oyuncu okunamadı:",
        targetPlayerError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Hedef oyuncu bilgileri okunamadı.",
        },
        { status: 500 },
      );
    }

    const guessedPosition =
      guessedPlayer.sub_position ??
      guessedPlayer.position;

    const targetPosition =
      targetPlayer.sub_position ??
      targetPlayer.position;

    const won =
      guessedPlayer.player_id === targetPlayer.player_id;

    return NextResponse.json({
      ok: true,
      won,
      player: mapPlayer(guessedPlayer),
      comparison: {
        nationality: compareText(
          guessedPlayer.nationality,
          targetPlayer.nationality,
        ),
        position: compareText(
          guessedPosition,
          targetPosition,
        ),
        club: compareText(
          guessedPlayer.current_club_name,
          targetPlayer.current_club_name,
        ),
        league: compareText(
          guessedPlayer.current_competition_id,
          targetPlayer.current_competition_id,
        ),
        age: compareAge(
          guessedPlayer.age,
          targetPlayer.age,
        ),
        preferredFoot: compareText(
          guessedPlayer.preferred_foot,
          targetPlayer.preferred_foot,
        ),
      },
      /*
       * Hedef oyuncu yalnız doğru tahminde açıklanır.
       */
      targetPlayer: won
        ? mapPlayer(targetPlayer)
        : null,
    });
  } catch (error) {
    console.error(
      "Guess the Player guess endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Tahmin kontrol edilirken hata oluştu.",
      },
      { status: 500 },
    );
  }
}