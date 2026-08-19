import { NextResponse } from "next/server";

import { matchesBothConstraints } from "@/lib/challenges/player-matcher";
import { recordGameSecurityEvent } from "@/lib/game-security/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const SCORE_PER_CORRECT = 20;

type AnswerBody = { sessionId?: string; playerId?: number | string };
type SessionRow = {
  id: string;
  score: number;
  pass_count: number;
  max_passes: number;
  duration_seconds: number;
  completed: boolean;
  created_at: string;
  completed_at: string | null;
};
type RoundRow = {
  id: number;
  session_id: string;
  round_no: number;
  left_club: string;
  right_club: string;
  answer_player_ids: number[] | string[] | null;
  attempt_count: number;
  completed: boolean;
  passed: boolean;
};

function remainingSeconds(createdAt: string, durationSeconds: number) {
  return Math.max(0, durationSeconds - Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnswerBody;
    const sessionId = String(body.sessionId ?? "").trim();
    const playerId = Number(body.playerId);
    if (!sessionId) return NextResponse.json({ ok: false, error: "Session bulunamadı." }, { status: 400 });
    if (!Number.isInteger(playerId) || playerId <= 0) return NextResponse.json({ ok: false, error: "Geçerli oyuncu seçmelisin." }, { status: 400 });

    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from("club_clash_sessions")
      .select("id, score, pass_count, max_passes, duration_seconds, completed, created_at, completed_at")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!sessionData) return NextResponse.json({ ok: false, error: "Oyun bulunamadı." }, { status: 404 });
    const session = sessionData as SessionRow;
    if (session.completed) return NextResponse.json({ ok: true, completed: true, score: Number(session.score ?? 0), remainingSeconds: 0, error: "Bu oyun zaten tamamlandı." });

    const secondsLeft = remainingSeconds(session.created_at, Number(session.duration_seconds ?? 120));
    if (secondsLeft <= 0) {
      await supabaseAdmin.from("club_clash_sessions").update({ completed: true, completed_at: new Date().toISOString() }).eq("id", sessionId).eq("completed", false);
      return NextResponse.json({ ok: true, correct: false, completed: true, reason: "timeout", score: Number(session.score ?? 0), remainingSeconds: 0, remainingPasses: Math.max(0, Number(session.max_passes ?? 3) - Number(session.pass_count ?? 0)) });
    }

    const event = await recordGameSecurityEvent({
      request,
      gameCode: "club_clash",
      sourceSessionId: sessionId,
      eventType: "answer",
      payload: { playerId },
      maxPerMinute: 55,
    });
    if (!event.allowed) return NextResponse.json({ ok: false, error: "Çok hızlı cevap gönderiyorsun." }, { status: 429 });

    const { data: roundData, error: roundError } = await supabaseAdmin
      .from("club_clash_rounds")
      .select("id, session_id, round_no, left_club, right_club, answer_player_ids, attempt_count, completed, passed")
      .eq("session_id", sessionId)
      .eq("completed", false)
      .order("round_no", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (roundError) throw roundError;
    if (!roundData) {
      await supabaseAdmin.from("club_clash_sessions").update({ completed: true, completed_at: new Date().toISOString() }).eq("id", sessionId).eq("completed", false);
      return NextResponse.json({ ok: true, completed: true, reason: "rounds_finished", score: Number(session.score ?? 0), remainingSeconds: secondsLeft, remainingPasses: Math.max(0, Number(session.max_passes ?? 3) - Number(session.pass_count ?? 0)) });
    }

    const round = roundData as RoundRow;
    const nextAttemptCount = Number(round.attempt_count ?? 0) + 1;

    // answer_player_ids yalnızca soru üretimindeki 85+ kalite havuzudur.
    // Cevap kontrolü ise iki kulüpte gerçekten oynamış HER playable oyuncuyu kabul eder.
    const match = await matchesBothConstraints(
      playerId,
      { type: "club", value: round.left_club },
      { type: "club", value: round.right_club },
    );
    const correct = match.matches;

    if (!correct) {
      const { data: updated, error } = await supabaseAdmin
        .from("club_clash_rounds")
        .update({ attempt_count: nextAttemptCount })
        .eq("id", round.id)
        .eq("completed", false)
        .eq("attempt_count", Number(round.attempt_count ?? 0))
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!updated) return NextResponse.json({ ok: false, error: "Bu round için başka bir cevap az önce işlendi." }, { status: 409 });
      return NextResponse.json({
        ok: true,
        correct: false,
        completed: false,
        score: Number(session.score ?? 0),
        scoreDelta: 0,
        remainingSeconds: secondsLeft,
        remainingPasses: Math.max(0, Number(session.max_passes ?? 3) - Number(session.pass_count ?? 0)),
        attemptCount: nextAttemptCount,
        round: { id: Number(round.id), roundNo: Number(round.round_no), leftClub: round.left_club, rightClub: round.right_club },
      });
    }

    const now = new Date().toISOString();
    const { data: lockedRound, error: roundUpdateError } = await supabaseAdmin
      .from("club_clash_rounds")
      .update({ attempt_count: nextAttemptCount, completed: true, passed: false, correct_player_id: playerId, completed_at: now })
      .eq("id", round.id)
      .eq("completed", false)
      .select("id")
      .maybeSingle();
    if (roundUpdateError) throw roundUpdateError;
    if (!lockedRound) return NextResponse.json({ ok: false, error: "Bu round zaten tamamlandı." }, { status: 409 });

    const newScore = Number(session.score ?? 0) + SCORE_PER_CORRECT;
    const { error: scoreUpdateError } = await supabaseAdmin
      .from("club_clash_sessions")
      .update({ score: newScore })
      .eq("id", sessionId)
      .eq("completed", false)
      .eq("score", Number(session.score ?? 0));
    if (scoreUpdateError) throw scoreUpdateError;

    const { data: playerData } = await supabaseAdmin.from("guess_players").select("player_id, name").eq("player_id", playerId).maybeSingle();
    const { data: nextRoundData, error: nextRoundError } = await supabaseAdmin
      .from("club_clash_rounds")
      .select("id, round_no, left_club, right_club")
      .eq("session_id", sessionId)
      .eq("completed", false)
      .order("round_no", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (nextRoundError) throw nextRoundError;

    if (!nextRoundData) {
      await supabaseAdmin.from("club_clash_sessions").update({ score: newScore, completed: true, completed_at: now }).eq("id", sessionId).eq("completed", false);
    }

    return NextResponse.json({
      ok: true,
      correct: true,
      score: newScore,
      scoreDelta: SCORE_PER_CORRECT,
      correctPlayerId: playerId,
      correctPlayerName: playerData?.name ?? null,
      completed: !nextRoundData,
      reason: nextRoundData ? null : "rounds_finished",
      remainingSeconds: secondsLeft,
      remainingPasses: Math.max(0, Number(session.max_passes ?? 3) - Number(session.pass_count ?? 0)),
      attemptCount: nextAttemptCount,
      nextRound: nextRoundData ? { id: Number(nextRoundData.id), roundNo: Number(nextRoundData.round_no), leftClub: nextRoundData.left_club, rightClub: nextRoundData.right_club } : null,
    });
  } catch (error) {
    console.error("Club Clash solo answer endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Cevap kontrol edilirken hata oluştu." }, { status: 500 });
  }
}
