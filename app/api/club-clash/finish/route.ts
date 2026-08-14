import { NextResponse } from "next/server";

import { finishGameSecuritySession } from "@/lib/game-security/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { sessionId?: string };
    const sessionId = String(body.sessionId ?? "").trim();
    if (!sessionId) return NextResponse.json({ ok: false, error: "Session bulunamadı." }, { status: 400 });

    const { data: session, error } = await supabaseAdmin
      .from("club_clash_sessions")
      .select("id, score, pass_count, max_passes, duration_seconds, completed, created_at, completed_at")
      .eq("id", sessionId)
      .maybeSingle();
    if (error) throw error;
    if (!session) return NextResponse.json({ ok: false, error: "Oyun bulunamadı." }, { status: 404 });

    const startedMs = new Date(session.created_at).getTime();
    const durationSeconds = Number(session.duration_seconds ?? 120);
    const timeExpired = Date.now() >= startedMs + durationSeconds * 1000;

    if (!session.completed && !timeExpired) {
      return NextResponse.json({ ok: false, error: "Oyun süresi henüz dolmadı." }, { status: 409 });
    }

    if (!session.completed) {
      const { error: completeError } = await supabaseAdmin
        .from("club_clash_sessions")
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq("id", sessionId)
        .eq("completed", false);
      if (completeError) throw completeError;
    }

    const security = await finishGameSecuritySession({
      request,
      gameCode: "club_clash",
      sourceSessionId: sessionId,
      score: Number(session.score ?? 0),
      won: null,
      metadata: {
        passCount: Number(session.pass_count ?? 0),
        maxPasses: Number(session.max_passes ?? 3),
      },
      rules: {
        minScore: 0,
        maxScore: 800,
        maxDurationMs: (durationSeconds + 30) * 1000,
      },
    });

    return NextResponse.json({
      ok: true,
      completed: true,
      alreadyCompleted: Boolean(session.completed),
      score: Number(session.score ?? 0),
      remainingPasses: Math.max(0, Number(session.max_passes ?? 3) - Number(session.pass_count ?? 0)),
      scoreEligible: !security.scoreBlocked,
      security,
    });
  } catch (error) {
    console.error("Club Clash finish endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Oyun bitirilirken hata oluştu." }, { status: 500 });
  }
}
