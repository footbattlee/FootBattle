import { NextResponse } from "next/server";

import { createClient as createAuthClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const COMPLETION_SCORE = 500;

type FinishReason = "won" | "lost";

type ResultRequest = {
  finishReason?: FinishReason;
  birthYear?: string | number;
  nationality?: string;
  trophy?: string;
  solvedClubIds?: number[];
  attemptCount?: number;
};

type RpcResult = {
  already_recorded?: boolean;
  current_streak?: number | null;
  best_streak?: number | null;
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

function normalizeRpcResult(value: unknown): RpcResult {
  if (Array.isArray(value)) {
    const firstItem = value[0];

    return firstItem &&
      typeof firstItem === "object"
      ? (firstItem as RpcResult)
      : {};
  }

  return value && typeof value === "object"
    ? (value as RpcResult)
    : {};
}

export async function POST(request: Request) {
  try {
    /*
     * Giriş yapan kullanıcıyı sunucuda doğrula.
     */
    const authClient = await createAuthClient();

    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Sonucu kaydetmek için giriş yapmalısın.",
        },
        { status: 401 },
      );
    }

    const body =
      (await request.json()) as ResultRequest;

    if (
      body.finishReason !== "won" &&
      body.finishReason !== "lost"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Oyun bitiş bilgisi geçersiz.",
        },
        { status: 400 },
      );
    }

    const playDate = getTurkeyDateKey();

    /*
     * Bugünün hedef oyuncusunu bul.
     */
    const { data: dailyGame, error: dailyGameError } =
      await supabaseAdmin
        .from("daily_player_quiz")
        .select("player_id")
        .eq("play_date", playDate)
        .eq("is_published", true)
        .maybeSingle();

    if (dailyGameError) {
      console.error(
        "Player Quiz günlük oyun okunamadı:",
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
          error:
            "Bugünün Player Quiz oyunu bulunamadı.",
        },
        { status: 404 },
      );
    }

    const playerId = Number(dailyGame.player_id);

    /*
     * Doğum yılı
     */
    const { data: details, error: detailsError } =
      await supabaseAdmin
        .from("player_quiz_details")
        .select("birth_year")
        .eq("player_id", playerId)
        .maybeSingle();

    if (detailsError || !details) {
      console.error(
        "Player Quiz detayları okunamadı:",
        detailsError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyuncunun quiz detayları okunamadı.",
        },
        { status: 500 },
      );
    }

    /*
     * Milliyet
     */
    const { data: player, error: playerError } =
      await supabaseAdmin
        .from("guess_players")
        .select("nationality")
        .eq("player_id", playerId)
        .maybeSingle();

    if (playerError || !player) {
      console.error(
        "Player Quiz oyuncusu okunamadı:",
        playerError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Oyuncu bilgileri okunamadı.",
        },
        { status: 500 },
      );
    }

    /*
     * Oyuncunun kupaları
     */
    const { data: trophies, error: trophiesError } =
      await supabaseAdmin
        .from("player_quiz_trophies")
        .select("id, trophy_name")
        .eq("player_id", playerId);

    if (trophiesError) {
      console.error(
        "Player Quiz kupaları okunamadı:",
        trophiesError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Kupa bilgileri okunamadı.",
        },
        { status: 500 },
      );
    }

    /*
     * Oyuncunun kariyer kulüpleri
     */
    const { data: clubs, error: clubsError } =
      await supabaseAdmin
        .from("player_quiz_clubs")
        .select("id, club_name, career_order")
        .eq("player_id", playerId)
        .order("career_order", {
          ascending: true,
        });

    if (clubsError) {
      console.error(
        "Player Quiz kulüpleri okunamadı:",
        clubsError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Kulüp bilgileri okunamadı.",
        },
        { status: 500 },
      );
    }

    const solvedClubIds = Array.isArray(
      body.solvedClubIds,
    )
      ? Array.from(
          new Set(
            body.solvedClubIds
              .map(Number)
              .filter(
                (id) =>
                  Number.isInteger(id) && id > 0,
              ),
          ),
        )
      : [];

    const targetClubIds = new Set(
      (clubs ?? []).map((club) => Number(club.id)),
    );

    const allSubmittedClubsBelongToPlayer =
      solvedClubIds.every((id) =>
        targetClubIds.has(id),
      );

    const allClubsSolved =
      targetClubIds.size > 0 &&
      solvedClubIds.length === targetClubIds.size &&
      allSubmittedClubsBelongToPlayer;

    const birthYearCorrect =
      Number(body.birthYear) ===
      Number(details.birth_year);

    const nationalityCorrect =
      normalizeText(body.nationality) ===
      normalizeText(player.nationality);

    const trophyCorrect = (trophies ?? []).some(
      (trophy) =>
        normalizeText(trophy.trophy_name) ===
        normalizeText(body.trophy),
    );

    /*
     * Kazanma bilgisine istemciden güvenmiyoruz.
     * Gerçek cevapları sunucuda tekrar doğruluyoruz.
     */
    const won =
      birthYearCorrect &&
      nationalityCorrect &&
      trophyCorrect &&
      allClubsSolved;

    if (body.finishReason === "won" && !won) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyun tamamlanmış görünmüyor. Eksik veya geçersiz cevap var.",
        },
        { status: 400 },
      );
    }

    const score = won ? COMPLETION_SCORE : 0;

    const attemptCount =
      typeof body.attemptCount === "number" &&
      Number.isInteger(body.attemptCount) &&
      body.attemptCount >= 0
        ? body.attemptCount
        : 0;

    /*
     * Ortak kayıt fonksiyonumuz:
     *
     * game_results
     * game_stats
     * profiles
     *
     * tablolarını tek işlemde günceller.
     */
    const { data: rpcData, error: recordError } =
      await supabaseAdmin.rpc(
        "record_game_result",
        {
          p_user_id: user.id,
          p_game_code: "player_quiz",
          p_play_date: playDate,
          p_score: score,
          p_attempt_count: attemptCount,
          p_won: won,
          p_duration_seconds: null,
          p_game_data: {
            target_player_id: playerId,
            birth_year: body.birthYear ?? null,
            nationality: body.nationality ?? null,
            trophy: body.trophy ?? null,
            solved_club_ids: solvedClubIds,
            finish_reason: body.finishReason,
          },
        },
      );

    if (recordError) {
      console.error(
        "Player Quiz sonucu kaydedilemedi:",
        recordError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Oyun sonucu kaydedilemedi.",
        },
        { status: 500 },
      );
    }

    const result = normalizeRpcResult(rpcData);

    return NextResponse.json({
      ok: true,
      won,
      score,
      alreadyRecorded: Boolean(
        result.already_recorded,
      ),
      currentStreak:
        result.current_streak ?? null,
      bestStreak: result.best_streak ?? null,
    });
  } catch (error) {
    console.error(
      "Player Quiz result endpoint hatası:",
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