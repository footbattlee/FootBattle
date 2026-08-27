import { NextResponse } from "next/server";

import { finishGameSecuritySession } from "@/lib/game-security/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  TRANSFER_QUIZ_DURATION_SECONDS,
  TRANSFER_QUIZ_POINTS_PER_CORRECT,
  elapsedSecondsFromStartedAt,
} from "@/lib/transfer-quiz/game";

type ResultRequest = { sessionId?: string };

export async function POST(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    const body = (await request.json()) as ResultRequest;
    const sessionId = body.sessionId?.trim();

    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "Oyun oturumu bulunamadı." }, { status: 400 });
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("transfer_quiz_sessions_v2")
      .select("id, user_id, started_at, score, correct_count, passes_used, completed, result_applied")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json({ ok: false, error: "Transferi Bil oturumu bulunamadı." }, { status: 404 });
    }
    if (session.user_id && user?.id && session.user_id !== user.id) {
      return NextResponse.json({ ok: false, error: "Bu oyun oturumu başka bir kullanıcıya ait." }, { status: 403 });
    }

    const elapsed = elapsedSecondsFromStartedAt(session.started_at);
    if (!session.completed && elapsed < TRANSFER_QUIZ_DURATION_SECONDS) {
      return NextResponse.json({ ok: false, error: "Oyun süresi henüz dolmadı." }, { status: 409 });
    }

    const score = Number(session.score ?? 0);
    const correctCount = Number(session.correct_count ?? 0);
    const passesUsed = Number(session.passes_used ?? 0);
    const won = correctCount > 0;

    const security = await finishGameSecuritySession({
      request,
      gameCode: "transfer_quiz",
      sourceSessionId: sessionId,
      userId: user?.id ?? null,
      score,
      won,
      metadata: { correctCount, passesUsed, format: "transferi_bil_v1" },
      rules: {
        minScore: 0,
        maxScore: 3000,
        expectedScore: correctCount * TRANSFER_QUIZ_POINTS_PER_CORRECT,
        requireEvents: correctCount > 0 || passesUsed > 0,
      },
    });

    if (session.result_applied) {
      return NextResponse.json({
        ok: true,
        alreadyRecorded: true,
        score,
        correctCount,
        passesUsed,
        awardedScore: security.scoreBlocked ? 0 : score,
        scoreEligible: !security.scoreBlocked,
      });
    }

    const { data: completed, error: completeError } = await supabaseAdmin
      .from("transfer_quiz_sessions_v2")
      .update({
        completed: true,
        result_applied: true,
        completed_at: new Date().toISOString(),
        user_id: user?.id ?? session.user_id ?? null,
      })
      .eq("id", sessionId)
      .eq("result_applied", false)
      .select("id")
      .maybeSingle();

    if (completeError) {
      return NextResponse.json({ ok: false, error: "Transferi Bil sonucu kaydedilemedi." }, { status: 500 });
    }

    if (!completed || !user || security.scoreBlocked) {
      return NextResponse.json({
        ok: true,
        alreadyRecorded: !completed,
        score,
        correctCount,
        passesUsed,
        awardedScore: 0,
        scoreEligible: false,
      });
    }

    const { data: soloProgress, error: soloError } = await supabaseAdmin
      .from("solo_rating_progress")
      .select("rating, games_played, wins")
      .eq("user_id", user.id)
      .maybeSingle();

    if (soloError) {
      return NextResponse.json({
        ok: true,
        score,
        correctCount,
        passesUsed,
        awardedScore: score,
        scoreEligible: true,
        totalScore: null,
        gamesPlayed: null,
        gamesWon: null,
      });
    }

    return NextResponse.json({
      ok: true,
      score,
      correctCount,
      passesUsed,
      awardedScore: score,
      scoreEligible: true,
      totalScore: Number(soloProgress?.rating ?? 0),
      gamesPlayed: Number(soloProgress?.games_played ?? 0),
      gamesWon: Number(soloProgress?.wins ?? 0),
    });
  } catch (error) {
    console.error("Transferi Bil result endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: "Transferi Bil sonucu kaydedilemedi." }, { status: 500 });
  }
}
