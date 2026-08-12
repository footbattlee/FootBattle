import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 5;

const SCORE_TABLE = [
  250,
  200,
  150,
  100,
  50,
];

type ResultRequest = {
  sessionId?: string;

  guesses?: string[];

  durationSeconds?: number;
};

function normalizeGuess(
  value: string,
) {
  return value
    .trim()
    .toLocaleUpperCase(
      "tr-TR",
    )
    .replace(/İ/g, "I")
    .replace(/Ç/g, "C")
    .replace(/Ğ/g, "G")
    .replace(/Ö/g, "O")
    .replace(/Ş/g, "S")
    .replace(/Ü/g, "U");
}

export async function POST(
  request: Request,
) {
  try {
    /* =====================================================
       1. AUTH

       Misafir kullanıcıyı burada durdurmuyoruz.
       Önce session ve doğru oyuncu okunacak; böylece
       kaybeden misafir de doğru cevabı görebilecek.
    ===================================================== */

    const authClient =
      await createAuthServerClient();

    const {
      data: { user },
      error: userError,
    } =
      await authClient.auth.getUser();

    /* =====================================================
       2. BODY
    ===================================================== */

    const body =
      (await request.json()) as ResultRequest;

    const sessionId =
      body.sessionId?.trim();

    if (!sessionId) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Oyun oturumu bulunamadı.",
        },
        {
          status: 400,
        },
      );
    }

    const guesses =
      Array.isArray(
        body.guesses,
      )
        ? body.guesses.map(
            normalizeGuess,
          )
        : [];

    if (
      guesses.length < 1 ||
      guesses.length >
        MAX_ATTEMPTS
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Tahmin sayısı geçersiz.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       3. SESSION
    ===================================================== */

    const {
      data: session,
      error: sessionError,
    } = await supabaseAdmin
      .from(
        "wordle_sessions",
      )
      .select(`
        id,
        player_id,
        answer_normalized,
        letter_count,
        max_attempts,
        completed,
        result_applied,
        won,
        score,
        attempt_count,
        user_id
      `)
      .eq(
        "id",
        sessionId,
      )
      .maybeSingle();

    if (sessionError) {
      console.error(
        "Wordle session sorgu hatası:",
        sessionError,
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "Wordle oyunu okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    if (!session) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Wordle oyunu bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    /* =====================================================
       4. CEVAP OYUNCUSU
    ===================================================== */

    const {
      data: answerPlayer,
      error: answerPlayerError,
    } = await supabaseAdmin
      .from(
        "guess_players",
      )
      .select(`
        player_id,
        name
      `)
      .eq(
        "player_id",
        session.player_id,
      )
      .maybeSingle();

    if (answerPlayerError) {
      console.error(
        "Wordle cevap oyuncusu okunamadı:",
        answerPlayerError,
      );
    }

    const answerPlayerName =
      answerPlayer?.name ??
      null;

    /* =====================================================
       5. MISAFIR KULLANICI

       Puan/istatistik kaydı için giriş gerekli; ancak doğru
       cevap gizlenmemeli. Frontend 401 cevabındaki
       answerPlayerName alanını okuyup sonuç kartında gösterir.
    ===================================================== */

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Puanını kaydetmek için giriş yapmalısın.",

          answerPlayerName,
        },
        {
          status: 401,
        },
      );
    }

    /* =====================================================
       6. ZATEN KAYDEDİLDİ
    ===================================================== */

    if (
      session.result_applied
    ) {
      return NextResponse.json({
        ok: true,

        alreadyRecorded:
          true,

        won:
          session.won,

        score:
          session.score ??
          0,

        attemptCount:
          session.attempt_count ??
          guesses.length,

        answerPlayerName,
      });
    }

    /* =====================================================
       7. TAHMİNLERİ DOĞRULA
    ===================================================== */

    const answer =
      session.answer_normalized;

    if (!answer) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Wordle cevabı bulunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    const invalidGuess =
      guesses.some(
        (guess) =>
          guess.length !==
          answer.length,
      );

    if (invalidGuess) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Tahminlerden birinin harf sayısı geçersiz.",
        },
        {
          status: 400,
        },
      );
    }

    const lastGuess =
      guesses[
        guesses.length - 1
      ];

    const won =
      lastGuess ===
      answer;

    /*
     * Kaybedilmiş sonuç ancak bütün
     * haklar kullanıldıysa kaydedilebilir.
     */
    if (
      !won &&
      guesses.length <
        session.max_attempts
    ) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Oyun henüz tamamlanmadı.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       8. SCORE
    ===================================================== */

    const score =
      won
        ? SCORE_TABLE[
            guesses.length -
              1
          ] ?? 0
        : 0;

    const durationSeconds =
      typeof body.durationSeconds ===
        "number" &&
      Number.isFinite(
        body.durationSeconds,
      ) &&
      body.durationSeconds >=
        0
        ? Math.floor(
            body.durationSeconds,
          )
        : null;

    const now =
      new Date().toISOString();

    /* =====================================================
       9. SESSION'I TAMAMLA

       result_applied=false kontrolü aynı session'ın
       iki kere puan yazmasını engeller.
    ===================================================== */

    const {
      data: completedSession,
      error: completeError,
    } = await supabaseAdmin
      .from(
        "wordle_sessions",
      )
      .update({
        completed:
          true,

        result_applied:
          true,

        won,

        score,

        attempt_count:
          guesses.length,

        user_id:
          user.id,

        completed_at:
          now,
      })
      .eq(
        "id",
        sessionId,
      )
      .eq(
        "result_applied",
        false,
      )
      .select(`
        id
      `)
      .maybeSingle();

    if (completeError) {
      console.error(
        "Wordle session tamamlama hatası:",
        completeError,
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "Oyun sonucu kaydedilemedi.",
        },
        {
          status: 500,
        },
      );
    }

    /*
     * Aynı anda iki result isteği geldiyse
     * ikinci istek tekrar puan yazmasın.
     */
    if (!completedSession) {
      return NextResponse.json({
        ok: true,

        alreadyRecorded:
          true,

        won,

        score,

        attemptCount:
          guesses.length,

        answerPlayerName,
      });
    }

    /* =====================================================
       10. PROFILE
    ===================================================== */

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select(`
        id,
        total_score,
        games_played,
        games_won,
        current_streak,
        best_streak
      `)
      .eq(
        "id",
        user.id,
      )
      .maybeSingle();

    if (profileError) {
      console.error(
        "Wordle profil sorgu hatası:",
        profileError,
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "Kullanıcı profili okunamadı.",
        },
        {
          status: 500,
        },
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          ok: false,

          error:
            "Kullanıcı profili bulunamadı.",
        },
        {
          status: 404,
        },
      );
    }

    const nextTotalScore =
      (profile.total_score ??
        0) +
      score;

    const nextGamesPlayed =
      (profile.games_played ??
        0) +
      1;

    const nextGamesWon =
      (profile.games_won ??
        0) +
      (won ? 1 : 0);

    /*
     * Sınırsız oyun olduğu için günlük streak'e
     * burada dokunmuyoruz.
     */
    const {
      error: profileUpdateError,
    } = await supabaseAdmin
      .from("profiles")
      .update({
        total_score:
          nextTotalScore,

        games_played:
          nextGamesPlayed,

        games_won:
          nextGamesWon,
      })
      .eq(
        "id",
        user.id,
      );

    if (profileUpdateError) {
      console.error(
        "Wordle profil güncelleme hatası:",
        profileUpdateError,
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "Kullanıcı istatistikleri güncellenemedi.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       11. RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      won,

      score,

      attemptCount:
        guesses.length,

      alreadyRecorded:
        false,

      answerPlayerName,

      currentStreak:
        profile.current_streak ??
        0,

      bestStreak:
        profile.best_streak ??
        0,

      totalScore:
        nextTotalScore,

      gamesPlayed:
        nextGamesPlayed,

      gamesWon:
        nextGamesWon,

      durationSeconds,
    });
  } catch (error) {
    console.error(
      "Wordle result endpoint error:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Beklenmeyen bir hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}