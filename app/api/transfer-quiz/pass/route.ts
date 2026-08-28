import { NextResponse } from "next/server";

import { recordGameSecurityEvent } from "@/lib/game-security/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  TRANSFER_QUIZ_DURATION_SECONDS,
  TRANSFER_QUIZ_MAX_PASSES,
  difficultyForElapsedSeconds,
  elapsedSecondsFromStartedAt,
  pickNextTransferQuestion,
} from "@/lib/transfer-quiz/game";

type PassRequest = { sessionId?: string };

export async function POST(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    const body = (await request.json()) as PassRequest;
    const sessionId = body.sessionId?.trim();
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "Oyun oturumu bulunamadı." }, { status: 400 });
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
      eventType: "skip",
      payload: {},
      maxPerMinute: 30,
    });
    if (!eventResult.allowed) {
      return NextResponse.json({ ok: false, error: "Çok hızlı pas kullanıyorsun." }, { status: 429 });
    }

    const elapsed = elapsedSecondsFromStartedAt(session.started_at);
    if (elapsed >= TRANSFER_QUIZ_DURATION_SECONDS) {
      return NextResponse.json({ ok: true, expired: true });
    }

    const passesUsed = Number(session.passes_used ?? 0);
    if (passesUsed >= TRANSFER_QUIZ_MAX_PASSES) {
      return NextResponse.json({ ok: false, error: "Pas hakkın kalmadı." }, { status: 409 });
    }

    const usedPlayerIds = Array.isArray(session.used_source_player_ids)
      ? session.used_source_player_ids.map(Number).filter(Number.isFinite)
      : [];
    const difficulty = difficultyForElapsedSeconds(elapsed);
    const next = await pickNextTransferQuestion(difficulty, usedPlayerIds);
    if (!next) {
      return NextResponse.json({ ok: false, error: "Yeni transfer sorusu bulunamadı." }, { status: 404 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("transfer_quiz_sessions_v2")
      .update({
        current_transfer_id: next.question.transferId,
        used_source_player_ids: [...usedPlayerIds, next.sourcePlayerId],
        passes_used: passesUsed + 1,
      })
      .eq("id", sessionId)
      .eq("current_transfer_id", session.current_transfer_id);

    if (updateError) {
      return NextResponse.json({ ok: false, error: "Pas kullanılamadı." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      score: Number(session.score ?? 0),
      correctCount: Number(session.correct_count ?? 0),
      passesUsed: passesUsed + 1,
      question: next.question,
    });
  } catch (error) {
    console.error("Transferi Bil pas hatası:", error);
    return NextResponse.json({ ok: false, error: "Pas kullanılamadı." }, { status: 500 });
  }
}
