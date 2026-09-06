import { NextResponse } from "next/server";

import { startGameSecuritySession } from "@/lib/game-security/server";
import { getSharedSoloChallengeId } from "@/lib/shared-solo-challenge";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  TRANSFER_QUIZ_DURATION_SECONDS,
  TRANSFER_QUIZ_MAX_PASSES,
  TRANSFER_QUIZ_MIN_SEARCH_LENGTH,
  TRANSFER_QUIZ_POINTS_PER_CORRECT,
  type TransferQuestion,
  pickNextTransferQuestion,
} from "@/lib/transfer-quiz/game";

type PickedQuestion = { question: TransferQuestion; sourcePlayerId: number };

async function loadSharedQuestion(challengeId: string): Promise<PickedQuestion | null> {
  const { data: source, error: sourceError } = await supabaseAdmin
    .from("transfer_quiz_sessions_v2")
    .select("current_transfer_id")
    .eq("id", challengeId)
    .maybeSingle();
  if (sourceError) throw sourceError;
  if (!source?.current_transfer_id) return null;

  const { data: transfer, error } = await supabaseAdmin
    .from("player_transfers")
    .select("id, source_player_id, from_club_name, to_club_name, transfer_fee, transfer_season")
    .eq("id", source.current_transfer_id)
    .maybeSingle();
  if (error) throw error;
  if (!transfer?.id || !transfer.source_player_id || !transfer.from_club_name || !transfer.to_club_name) return null;

  return {
    sourcePlayerId: Number(transfer.source_player_id),
    question: {
      transferId: Number(transfer.id),
      fromClubName: String(transfer.from_club_name),
      toClubName: String(transfer.to_club_name),
      transferFee: Number(transfer.transfer_fee ?? 0),
      transferSeason: transfer.transfer_season ? String(transfer.transfer_season) : null,
      difficulty: "easy",
    },
  };
}

export async function GET(request: Request) {
  try {
    const authClient = await createAuthServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    const challengeId = getSharedSoloChallengeId(request);

    const picked = challengeId
      ? await loadSharedQuestion(challengeId)
      : await pickNextTransferQuestion("easy", []);

    if (!picked) {
      return NextResponse.json(
        { ok: false, error: challengeId ? "Paylaşılan Transfer Quiz sorusu bulunamadı." : "Kolay transfer sorusu bulunamadı." },
        { status: 404 },
      );
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
      mode: challengeId ? "challenge" : "solo",
      metadata: { format: "transferi_bil_v1", durationSeconds: TRANSFER_QUIZ_DURATION_SECONDS, sharedChallenge: Boolean(challengeId) },
    });

    return NextResponse.json({
      ok: true,
      mode: challengeId ? "challenge" : "random",
      challenge: Boolean(challengeId),
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
