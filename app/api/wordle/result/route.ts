import { NextResponse } from "next/server";

import { getGameSecurityEvents } from "@/lib/game-security/server";
import { getGameSecurityStatus } from "@/lib/game-security/status";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 5;
const SCORE_TABLE = [250, 200, 150, 100, 50];

type ResultRequest = {
  sessionId?: string;
  guesses?: string[];
  durationSeconds?: number;
};

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

export async function POST(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    const body = (await request.json()) as ResultRequest;
    const sessionId = body.sessionId?.trim();
    if (!sessionId) return NextResponse.json({ ok: false, error: "Oyun oturumu bulunamadı." }, { status: 400 });

    const guesses = Array.isArray(body.guesses) ? body.guesses.map(normalizeGuess) : [];
    if (guesses.length < 1 || guesses.length > MAX_ATTEMPTS) {
      return NextResponse.json({ ok: false, error: "Tahmin sayısı geçersiz." }, { status: 400 });
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("wordle_sessions")
      .select("id, player_id, answer_normalized, letter_count, max_attempts, completed, result_applied, won, score, attempt_count, user_id")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessionError || !session) return NextResponse.json({ ok: false, error: "Wordle oyunu bulunamadı." }, { status: 404 });

    if (session.user_id && session.user_id !== user?.id) {
      return NextResponse.json({ ok: false, error: "Bu oyun oturumu başka bir kullanıcıya ait." }, { status: 403 });
    }

    const { data: answerPlayer } = await supabaseAdmin
      .from("guess_players")
      .select("player_id, name")
      .eq("player_id", session.player_id)
      .maybeSingle();
    const answerPlayerName = answerPlayer?.name ?? null;

    if (session.result_applied) {
      const security = await getGameSecurityStatus("wordle", sessionId).catch(() => null);
      return NextResponse.json({
        ok: true,
        alreadyRecorded: true,
        won: session.won,
        score: session.score ?? 0,
        attemptCount: session.attempt_count ?? guesses.length,
        answerPlayerName,
        scoreEligible: !security?.scoreBlocked,
        security,
      });
    }

    const answer = String(session.answer_normalized ?? "");
    if (!answer) return NextResponse.json({ ok: false, error: "Wordle cevabı bulunamadı." }, { status: 500 });
    if (guesses.some((guess) => guess.length !== answer.length)) {
      return NextResponse.json({ ok: false, error: "Tahminlerden birinin harf sayısı geçersiz." }, { status: 400 });
    }

    const { events } = await getGameSecurityEvents("wordle", sessionId, "guess");
    const recordedGuesses = events.map((event) => normalizeGuess(String(event.payload?.guess ?? "")));
    if (recordedGuesses.length !== guesses.length || recordedGuesses.some((guess, index) => guess !== guesses[index])) {
      return NextResponse.json({ ok: false, error: "Gönderilen tahmin geçmişi sunucu kayıtlarıyla eşleşmiyor." }, { status: 409 });
    }

    const won = guesses[guesses.length - 1] === answer;
    if (!won && guesses.length < Number(session.max_attempts ?? MAX_ATTEMPTS)) {
      return NextResponse.json({ ok: false, error: "Oyun henüz tamamlanmadı." }, { status: 400 });
    }

    const score = won ? SCORE_TABLE[guesses.length - 1] ?? 0 : 0;
    const now = new Date().toISOString();
    const { data: completedSession, error: completeError } = await supabaseAdmin
      .from("wordle_sessions")
      .update({
        completed: true,
        result_applied: true,
        won,
        score,
        attempt_count: guesses.length,
        user_id: user?.id ?? session.user_id ?? null,
        completed_at: now,
      })
      .eq("id", sessionId)
      .eq("result_applied", false)
      .select("id")
      .maybeSingle();
    if (completeError) return NextResponse.json({ ok: false, error: "Oyun sonucu kaydedilemedi." }, { status: 500 });

    const security = await getGameSecurityStatus("wordle", sessionId).catch(() => null);

    if (!completedSession) {
      return NextResponse.json({
        ok: true,
        alreadyRecorded: true,
        won,
        score,
        attemptCount: guesses.length,
        answerPlayerName,
        scoreEligible: !security?.scoreBlocked,
        security,
      });
    }

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error: "Puanını kaydetmek için giriş yapmalısın.",
          completed: true,
          won,
          score,
          attemptCount: guesses.length,
          answerPlayerName,
        },
        { status: 401 },
      );
    }

    const awardedScore = security?.scoreBlocked ? 0 : score;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, total_score, games_played, games_won, current_streak, best_streak")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || !profile) return NextResponse.json({ ok: false, error: "Kullanıcı profili okunamadı." }, { status: 500 });

    const nextTotalScore = Number(profile.total_score ?? 0) + awardedScore;
    const nextGamesPlayed = Number(profile.games_played ?? 0) + 1;
    const nextGamesWon = Number(profile.games_won ?? 0) + (won ? 1 : 0);
    const { error: profileUpdateError } = await supabaseAdmin
      .from("profiles")
      .update({ total_score: nextTotalScore, games_played: nextGamesPlayed, games_won: nextGamesWon })
      .eq("id", user.id);
    if (profileUpdateError) return NextResponse.json({ ok: false, error: "Kullanıcı istatistikleri güncellenemedi." }, { status: 500 });

    return NextResponse.json({
      ok: true,
      won,
      score,
      awardedScore,
      scoreEligible: !security?.scoreBlocked,
      attemptCount: guesses.length,
      alreadyRecorded: false,
      answerPlayerName,
      currentStreak: profile.current_streak ?? 0,
      bestStreak: profile.best_streak ?? 0,
      totalScore: nextTotalScore,
      gamesPlayed: nextGamesPlayed,
      gamesWon: nextGamesWon,
      durationSeconds: typeof body.durationSeconds === "number" ? Math.max(0, Math.floor(body.durationSeconds)) : null,
      security,
    });
  } catch (error) {
    console.error("Wordle result endpoint error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu." }, { status: 500 });
  }
}
