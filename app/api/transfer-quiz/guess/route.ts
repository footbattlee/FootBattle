import { NextResponse } from "next/server";

import { recordGameSecurityEvent } from "@/lib/game-security/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  TRANSFER_QUIZ_DURATION_SECONDS,
  TRANSFER_QUIZ_POINTS_PER_CORRECT,
  difficultyForElapsedSeconds,
  elapsedSecondsFromStartedAt,
  pickNextTransferQuestion,
} from "@/lib/transfer-quiz/game";

type GuessRequest = {
  sessionId?: string;
  playerId?: number;
};

export async function POST(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    const body = (await request.json()) as GuessRequest;
    const sessionId = body.sessionId?.trim();
    const guessedPlayerId = Number(body.playerId);

    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "Oyun oturumu bulunamadı." }, { status: 400 });
    }
    if (!Number.isInteger(guessedPlayerId) || guessedPlayerId <= 0) {
      return NextResponse.json({ ok: false, error: "Geçerli bir oyuncu seçmelisin." }, { status: 400 });
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("transfer_quiz_sessions_v2")
      .select("id, user_id, started_at, current_transfer_id, used_source_player_ids, score, correct_count, passes_used, completed")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json({ ok: false, error: "Transferi Bil oturumu bulunamadı." }, { status: 404 });
    }
    if (session.user_id && session.user_id !== user?.id) {
      return NextResponse.json({ ok: false, error: "Bu oyun oturumu başka bir kullanıcıya ait." }, { status: 403 });
    }
    if (session.completed) {
      return NextResponse.json({ ok: false, expired: true, error: "Bu oyun tamamlandı." }, { status: 409 });
    }

    const eventResult = await recordGameSecurityEvent({
      request,
      gameCode: "transfer_quiz",
      sourceSessionId: sessionId,
      eventType: "guess",
      payload: { playerId: guessedPlayerId },
      maxPerMinute: 90,
    });
    if (!eventResult.allowed) {
      return NextResponse.json({ ok: false, error: "Çok hızlı cevap gönderiyorsun." }, { status: 429 });
    }

    const elapsed = elapsedSecondsFromStartedAt(session.started_at);
    if (elapsed >= TRANSFER_QUIZ_DURATION_SECONDS) {
      return NextResponse.json({
        ok: true,
        expired: true,
        correct: false,
        score: Number(session.score ?? 0),
        correctCount: Number(session.correct_count ?? 0),
        passesUsed: Number(session.passes_used ?? 0),
      });
    }

    const { data: transfer, error: transferError } = await supabaseAdmin
      .from("player_transfers")
      .select("id, source_player_id")
      .eq("id", session.current_transfer_id)
      .maybeSingle();

    if (transferError || !transfer) {
      return NextResponse.json({ ok: false, error: "Aktif transfer sorusu bulunamadı." }, { status: 404 });
    }

    const correct = Number(transfer.source_player_id) === guessedPlayerId;
    if (!correct) {
      return NextResponse.json({
        ok: true,
        correct: false,
        score: Number(session.score ?? 0),
        correctCount: Number(session.correct_count ?? 0),
        passesUsed: Number(session.passes_used ?? 0),
      });
    }

    const usedPlayerIds = Array.isArray(session.used_source_player_ids)
      ? session.used_source_player_ids.map(Number).filter(Number.isFinite)
      : [];
    const difficulty = difficultyForElapsedSeconds(elapsed);
    const next = await pickNextTransferQuestion(difficulty, usedPlayerIds);

    const nextScore = Number(session.score ?? 0) + TRANSFER_QUIZ_POINTS_PER_CORRECT;
    const nextCorrectCount = Number(session.correct_count ?? 0) + 1;

    const updatePayload: Record<string, unknown> = {
      score: nextScore,
      correct_count: nextCorrectCount,
    };

    if (next) {
      updatePayload.current_transfer_id = next.question.transferId;
      updatePayload.used_source_player_ids = [...usedPlayerIds, next.sourcePlayerId];
    }

    const { error: updateError } = await supabaseAdmin
      .from("transfer_quiz_sessions_v2")
      .update(updatePayload)
      .eq("id", sessionId)
      .eq("current_transfer_id", session.current_transfer_id);

    if (updateError) {
      return NextResponse.json({ ok: false, error: "Oyun ilerletilemedi." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      correct: true,
      awardedPoints: TRANSFER_QUIZ_POINTS_PER_CORRECT,
      score: nextScore,
      correctCount: nextCorrectCount,
      passesUsed: Number(session.passes_used ?? 0),
      question: next?.question ?? null,
    });
  } catch (error) {
    console.error("Transferi Bil cevap kontrol hatası:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Cevap kontrol edilemedi." },
      { status: 500 },
    );
  }
}
