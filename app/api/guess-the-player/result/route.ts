import { NextResponse } from "next/server";

import { createClient as createAuthClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 5;
const SCORE_TABLE = [250, 200, 150, 100, 50];

type ResultRequest = {
  playerIds?: number[];
  durationSeconds?: number;
};

function getTurkeyDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function POST(request: Request) {
  try {
    /*
     * Giriş yapan kullanıcıyı cookie üzerinden doğrula.
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

    const playerIds = Array.isArray(body.playerIds)
      ? body.playerIds.map(Number)
      : [];

    if (
      playerIds.length < 1 ||
      playerIds.length > MAX_ATTEMPTS ||
      playerIds.some(
        (id) => !Number.isInteger(id) || id <= 0,
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Tahmin bilgileri geçersiz.",
        },
        { status: 400 },
      );
    }

    /*
     * Aynı oyuncunun birden fazla kez gönderilmesini engelle.
     */
    if (new Set(playerIds).size !== playerIds.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "Aynı oyuncu birden fazla kez tahmin edilemez.",
        },
        { status: 400 },
      );
    }

    const playDate = getTurkeyDateKey();

    /*
     * Bugünün gerçek hedef oyuncusunu yalnızca sunucuda oku.
     */
    const { data: dailyGame, error: dailyGameError } =
      await supabaseAdmin
        .from("daily_guess_player")
        .select("player_id")
        .eq("play_date", playDate)
        .eq("is_published", true)
        .maybeSingle();

    if (dailyGameError) {
      console.error(
        "Günlük Guess the Player sonucu okunamadı:",
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
          error: "Bugünün oyunu bulunamadı.",
        },
        { status: 404 },
      );
    }

    /*
     * Oyunun sonucu son tahmine göre doğrulanır.
     */
    const lastPlayerId =
      playerIds[playerIds.length - 1];

    const won =
      lastPlayerId === Number(dailyGame.player_id);

    /*
     * Kaybedilen oyun yalnızca beş tahmin tamamlandıysa kaydedilir.
     */
    if (!won && playerIds.length < MAX_ATTEMPTS) {
      return NextResponse.json(
        {
          ok: false,
          error: "Oyun henüz tamamlanmadı.",
        },
        { status: 400 },
      );
    }

    const score = won
      ? SCORE_TABLE[playerIds.length - 1] ?? 0
      : 0;

    const durationSeconds =
      typeof body.durationSeconds === "number" &&
      Number.isFinite(body.durationSeconds) &&
      body.durationSeconds >= 0
        ? Math.floor(body.durationSeconds)
        : null;

    /*
     * Ortak fonksiyon şunları aynı işlemde günceller:
     *
     * game_results  → günlük sonuç
     * game_stats    → Guess the Player özel istatistik
     * profiles      → bütün oyunların genel toplamı
     */
    const { data: result, error: recordError } =
      await supabaseAdmin.rpc("record_game_result", {
        p_user_id: user.id,
        p_game_code: "guess_the_player",
        p_play_date: playDate,
        p_score: score,
        p_attempt_count: playerIds.length,
        p_won: won,
        p_duration_seconds: durationSeconds,
        p_game_data: {
          player_ids: playerIds,
          target_player_id: dailyGame.player_id,
        },
      });

    if (recordError) {
      console.error(
        "Guess the Player sonucu kaydedilemedi:",
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

    return NextResponse.json({
      ok: true,
      won,
      score,
      attemptCount: playerIds.length,
      alreadyRecorded: Boolean(
        result?.already_recorded,
      ),
      currentStreak:
        result?.current_streak ?? null,
      bestStreak:
        result?.best_streak ?? null,
    });
  } catch (error) {
    console.error(
      "Guess the Player result endpoint hatası:",
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