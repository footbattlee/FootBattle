import { NextResponse } from "next/server";

import { startGameSecuritySession } from "@/lib/game-security/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  TRANSFER_QUIZ_DURATION_SECONDS,
  TRANSFER_QUIZ_MAX_PASSES,
  TRANSFER_QUIZ_MIN_SEARCH_LENGTH,
  TRANSFER_QUIZ_POINTS_PER_CORRECT,
  pickNextTransferQuestion,
} from "@/lib/transfer-quiz/game";

export async function GET(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const { data: { user } } = await authClient.auth.getUser();

    const picked = await pickNextTransferQuestion("easy", []);
    if (!picked) {
      return NextResponse.json({ ok: false, error: "Kolay transfer sorusu bulunamadı." }, { status: 404 });
    }

    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + TRANSFER_QUIZ_DURATION_SECONDS * 1000);

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("transfer_quiz_sessions_v2")
      .insert({
        user_id: user?.id ?? null,
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        current_transfer_id: picked.question.transferId,
        used_source_player_ids: [picked.sourcePlayerId],
      })
      .select("id, started_at, score, correct_count, passes_used")
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ ok: false, error: "Transferi Bil oturumu oluşturulamadı." }, { status: 500 });
    }

    await startGameSecuritySession({
      request,
      gameCode: "transfer_quiz",
      sourceSessionId: String(session.id),
      userId: user?.id ?? null,
      mode: "solo",
      metadata: { format: "transferi_bil_v1", durationSeconds: TRANSFER_QUIZ_DURATION_SECONDS },
    });

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      startedAt: session.started_at,
      durationSeconds: TRANSFER_QUIZ_DURATION_SECONDS,
      maxPasses: TRANSFER_QUIZ_MAX_PASSES,
      pointsPerCorrect: TRANSFER_QUIZ_POINTS_PER_CORRECT,
      minimumSearchLength: TRANSFER_QUIZ_MIN_SEARCH_LENGTH,
      score: Number(session.score ?? 0),
      correctCount: Number(session.correct_count ?? 0),
      passesUsed: Number(session.passes_used ?? 0),
      question: picked.question,
    });
  } catch (error) {
    console.error("Transferi Bil start endpoint hatası:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Transferi Bil başlatılamadı." },
      { status: 500 },
    );
  }
}
