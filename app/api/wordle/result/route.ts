import { NextResponse } from "next/server";

import { createClient as createAuthClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 5;
const SCORE_TABLE = [250, 200, 150, 100, 50];

function getTurkeyDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function normalizeGuess(value: string) {
  return value
    .trim()
    .toLocaleUpperCase("tr-TR")
    .replace(/İ/g, "I")
    .replace(/Ç/g, "C")
    .replace(/Ğ/g, "G")
    .replace(/Ö/g, "O")
    .replace(/Ş/g, "S")
    .replace(/Ü/g, "U");
}

type ResultRequest = {
  guesses?: string[];
  durationSeconds?: number;
};

export async function POST(request: Request) {
  try {
    /*
     * Cookie üzerinden giriş yapan kullanıcıyı doğrula.
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

    const guesses = Array.isArray(body.guesses)
      ? body.guesses.map(normalizeGuess)
      : [];

    if (guesses.length < 1 || guesses.length > MAX_ATTEMPTS) {
      return NextResponse.json(
        {
          ok: false,
          error: "Tahmin sayısı geçersiz.",
        },
        { status: 400 },
      );
    }

    const playDate = getTurkeyDateKey();

    /*
     * Günün gerçek cevabını yalnızca sunucu tarafında oku.
     */
    const { data: dailyGame, error: dailyGameError } =
      await supabaseAdmin
        .from("daily_wordle")
        .select(`
          play_date,
          players!inner (
            normalized_last_name
          )
        `)
        .eq("play_date", playDate)
        .eq("is_published", true)
        .single();

    if (dailyGameError || !dailyGame) {
      console.error(
        "Günün Wordle kaydı okunamadı:",
        dailyGameError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "Bugünün oyunu bulunamadı.",
        },
        { status: 404 },
      );
    }

    const player = Array.isArray(dailyGame.players)
      ? dailyGame.players[0]
      : dailyGame.players;

    const answer = player?.normalized_last_name;

    if (!answer) {
      return NextResponse.json(
        {
          ok: false,
          error: "Bugünün oyuncu bilgisi bulunamadı.",
        },
        { status: 500 },
      );
    }

    const invalidGuess = guesses.some(
      (guess) => guess.length !== answer.length,
    );

    if (invalidGuess) {
      return NextResponse.json(
        {
          ok: false,
          error: "Tahminlerden birinin harf sayısı geçersiz.",
        },
        { status: 400 },
      );
    }

    const lastGuess = guesses[guesses.length - 1];
    const won = lastGuess === answer;

    /*
     * Kaybedilen oyun yalnızca 5 tahmin tamamlandıysa kaydedilir.
     */
    if (!won && guesses.length < MAX_ATTEMPTS) {
      return NextResponse.json(
        {
          ok: false,
          error: "Oyun henüz tamamlanmadı.",
        },
        { status: 400 },
      );
    }

    const score = won
      ? SCORE_TABLE[guesses.length - 1] ?? 0
      : 0;

    const durationSeconds =
      typeof body.durationSeconds === "number" &&
      Number.isFinite(body.durationSeconds) &&
      body.durationSeconds >= 0
        ? Math.floor(body.durationSeconds)
        : null;

    /*
     * Ortak veritabanı fonksiyonunu çağır:
     * - game_results kaydı
     * - toplam puan
     * - oynanan/kazanılan oyun
     * - günlük seri
     */
    const { data: result, error: recordError } =
      await supabaseAdmin.rpc("record_game_result", {
        p_user_id: user.id,
        p_game_code: "wordle",
        p_play_date: playDate,
        p_score: score,
        p_attempt_count: guesses.length,
        p_won: won,
        p_duration_seconds: durationSeconds,
        p_game_data: {
          guesses,
          answer_length: answer.length,
        },
      });

    if (recordError) {
      console.error(
        "Wordle sonucu kaydedilemedi:",
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
      attemptCount: guesses.length,
      alreadyRecorded: Boolean(result?.already_recorded),
      currentStreak: result?.current_streak ?? null,
      bestStreak: result?.best_streak ?? null,
    });
  } catch (error) {
    console.error("Wordle result endpoint error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Beklenmeyen bir hata oluştu.",
      },
      { status: 500 },
    );
  }
}