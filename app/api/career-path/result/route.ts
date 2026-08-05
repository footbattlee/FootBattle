import { NextResponse } from "next/server";

import { createClient as createAuthClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_WRONG_GUESSES = 5;
const SCORE_TABLE = [250, 200, 150, 100, 50, 0];

type FinishReason = "won" | "lost";

type ResultRequest = {
  finishReason?: FinishReason;
  solvedClubIds?: number[];
  wrongCount?: number;
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

function normalizeRpcResult(value: unknown): RpcResult {
  if (Array.isArray(value)) {
    const firstItem = value[0];

    return firstItem && typeof firstItem === "object"
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
     * Kullanıcıyı cookie üzerinden doğrula.
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
          error: "Sonucu kaydetmek için giriş yapmalısın.",
        },
        { status: 401 },
      );
    }

    const body = (await request.json()) as ResultRequest;

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

    const wrongCount = Number(body.wrongCount);

    if (
      !Number.isInteger(wrongCount) ||
      wrongCount < 0 ||
      wrongCount > MAX_WRONG_GUESSES
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Yanlış tahmin sayısı geçersiz.",
        },
        { status: 400 },
      );
    }

    const attemptCount =
      typeof body.attemptCount === "number" &&
      Number.isInteger(body.attemptCount) &&
      body.attemptCount >= 0
        ? body.attemptCount
        : 0;

    const solvedClubIds = Array.isArray(body.solvedClubIds)
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

    const playDate = getTurkeyDateKey();

    /*
     * Bugünün oyuncusunu bul.
     */
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

    const playerId = Number(dailyGame.player_id);

    /*
     * Oyuncunun gerçek kariyer kulüplerini sunucuda getir.
     */
    const { data: targetClubs, error: clubsError } =
      await supabaseAdmin
        .from("player_quiz_clubs")
        .select("id")
        .eq("player_id", playerId);

    if (clubsError) {
      console.error(
        "Career Path kulüpleri okunamadı:",
        clubsError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Kariyer bilgileri doğrulanamadı.",
        },
        { status: 500 },
      );
    }

    const targetClubIds = new Set(
      (targetClubs ?? []).map((club) =>
        Number(club.id),
      ),
    );

    if (targetClubIds.size < 1) {
      return NextResponse.json(
        {
          ok: false,
          error: "Oyuncunun kariyer kulüpleri bulunamadı.",
        },
        { status: 404 },
      );
    }

    const submittedClubsAreValid =
      solvedClubIds.every((clubId) =>
        targetClubIds.has(clubId),
      );

    const allClubsSolved =
      submittedClubsAreValid &&
      solvedClubIds.length === targetClubIds.size;

    /*
     * İstemciden gelen "kazandım" bilgisine güvenmiyoruz.
     */
    const won = allClubsSolved && wrongCount < 5;

    if (body.finishReason === "won" && !won) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Career Path tamamlanmış görünmüyor. Eksik kulüp var.",
        },
        { status: 400 },
      );
    }

    if (
      body.finishReason === "lost" &&
      wrongCount < MAX_WRONG_GUESSES
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Oyun henüz kaybedilmiş görünmüyor.",
        },
        { status: 400 },
      );
    }

    const score = won
      ? SCORE_TABLE[Math.min(wrongCount, 5)] ?? 0
      : 0;

    /*
     * Ortak fonksiyon:
     *
     * game_results
     * game_stats
     * profiles
     *
     * tablolarını tek işlemde günceller.
     */
    const { data: rpcData, error: recordError } =
      await supabaseAdmin.rpc("record_game_result", {
        p_user_id: user.id,
        p_game_code: "career_path",
        p_play_date: playDate,
        p_score: score,
        p_attempt_count: attemptCount,
        p_won: won,
        p_duration_seconds: null,
        p_game_data: {
          target_player_id: playerId,
          solved_club_ids: solvedClubIds,
          wrong_count: wrongCount,
          finish_reason: body.finishReason,
        },
      });

    if (recordError) {
      console.error(
        "Career Path sonucu kaydedilemedi:",
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
      bestStreak:
        result.best_streak ?? null,
    });
  } catch (error) {
    console.error(
      "Career Path result endpoint hatası:",
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