import { NextResponse } from "next/server";

import { recordGameSecurityEvent } from "@/lib/game-security/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type PassBody = { sessionId?: string };
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
  completed: boolean;
  passed: boolean;
};

function remainingSeconds(createdAt: string, durationSeconds: number) {
  return Math.max(0, durationSeconds - Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PassBody;
    const sessionId = String(body.sessionId ?? "").trim();
    if (!sessionId) return NextResponse.json({ ok: false, error: "Session bulunamadı." }, { status: 400 });

    const { data: sessionData, error: sessionError } = await supabaseAdmin
      .from("club_clash_sessions")
      .select("id, score, pass_count, max_passes, duration_seconds, completed, created_at, completed_at")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessionError) throw sessionError;
    if (!sessionData) return NextResponse.json({ ok: false, error: "Oyun bulunamadı." }, { status: 404 });
    const session = sessionData as SessionRow;
    if (session.completed) return NextResponse.json({ ok: true, completed: true, score: Number(session.score ?? 0), remainingSeconds: 0, remainingPasses: 0, error: "Bu oyun zaten tamamlandı." });

    const secondsLeft = remainingSeconds(session.created_at, Number(session.duration_seconds ?? 120));
    if (secondsLeft <= 0) {
      await supabaseAdmin.from("club_clash_sessions").update({ completed: true, completed_at: new Date().toISOString() }).eq("id", sessionId).eq("completed", false);
      return NextResponse.json({ ok: true, completed: true, reason: "timeout", score: Number(session.score ?? 0), remainingSeconds: 0, remainingPasses: Math.max(0, Number(session.max_passes ?? 3) - Number(session.pass_count ?? 0)) });
    }

    const usedPasses = Number(session.pass_count ?? 0);
    const maxPasses = Number(session.max_passes ?? 3);
    if (usedPasses >= maxPasses) return NextResponse.json({ ok: false, error: "Pas hakkın kalmadı.", score: Number(session.score ?? 0), remainingSeconds: secondsLeft, usedPasses, remainingPasses: 0 }, { status: 409 });

    const event = await recordGameSecurityEvent({
      request,
      gameCode: "club_clash",
      sourceSessionId: sessionId,
      eventType: "pass",
      payload: { usedPasses },
      maxPerMinute: 30,
    });
    if (!event.allowed) return NextResponse.json({ ok: false, error: "Çok hızlı işlem yapıyorsun." }, { status: 429 });

    const { data: roundData, error: roundError } = await supabaseAdmin
      .from("club_clash_rounds")
      .select("id, session_id, round_no, left_club, right_club, completed, passed")
      .eq("session_id", sessionId)
      .eq("completed", false)
      .order("round_no", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (roundError) throw roundError;
    if (!roundData) {
      await supabaseAdmin.from("club_clash_sessions").update({ completed: true, completed_at: new Date().toISOString() }).eq("id", sessionId).eq("completed", false);
      return NextResponse.json({ ok: true, completed: true, reason: "rounds_finished", score: Number(session.score ?? 0), remainingSeconds: secondsLeft, usedPasses, remainingPasses: Math.max(0, maxPasses - usedPasses) });
    }

    const round = roundData as RoundRow;
    const now = new Date().toISOString();
    const { data: lockedRound, error: roundUpdateError } = await supabaseAdmin
      .from("club_clash_rounds")
      .update({ completed: true, passed: true, completed_at: now })
      .eq("id", round.id)
      .eq("completed", false)
      .select("id")
      .maybeSingle();
    if (roundUpdateError) throw roundUpdateError;
    if (!lockedRound) return NextResponse.json({ ok: false, error: "Bu round zaten işlendi." }, { status: 409 });

    const nextPassCount = usedPasses + 1;
    const { data: updatedSession, error: sessionUpdateError } = await supabaseAdmin
      .from("club_clash_sessions")
      .update({ pass_count: nextPassCount })
      .eq("id", sessionId)
      .eq("pass_count", usedPasses)
      .eq("completed", false)
      .select("id")
      .maybeSingle();
    if (sessionUpdateError) throw sessionUpdateError;
    if (!updatedSession) return NextResponse.json({ ok: false, error: "Pas isteği zaten işlendi." }, { status: 409 });

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
      await supabaseAdmin.from("club_clash_sessions").update({ completed: true, completed_at: now }).eq("id", sessionId).eq("completed", false);
    }

    return NextResponse.json({
      ok: true,
      passed: true,
      completed: !nextRoundData,
      reason: nextRoundData ? null : "rounds_finished",
      score: Number(session.score ?? 0),
      remainingSeconds: secondsLeft,
      usedPasses: nextPassCount,
      remainingPasses: Math.max(0, maxPasses - nextPassCount),
      nextRound: nextRoundData ? { id: Number(nextRoundData.id), roundNo: Number(nextRoundData.round_no), leftClub: nextRoundData.left_club, rightClub: nextRoundData.right_club } : null,
    });
  } catch (error) {
    console.error("Club Clash solo pass endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Pas işlemi sırasında hata oluştu." }, { status: 500 });
  }
}
