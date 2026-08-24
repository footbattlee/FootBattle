import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

function cleanToken(value: unknown) {
  return String(value ?? "").trim().replace(/[^a-zA-Z0-9]/g, "").slice(0, 64);
}

export async function POST(request: Request) {
  try {
    const auth = await createAuthServerClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Giriş yapmalısın." }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const token = cleanToken(body?.token);
    if (!token) return NextResponse.json({ ok: false, error: "Challenge token eksik." }, { status: 400 });

    const { data: match, error: matchError } = await supabaseAdmin
      .from("ranked_matches")
      .select("id,game_code,status,player_a_id,player_b_id,opponent_kind,winner_user_id,challenge_token")
      .eq("challenge_token", token)
      .maybeSingle();
    if (matchError) throw matchError;
    if (!match) return NextResponse.json({ ok: true, ranked: false, skipped: true });
    if (match.player_a_id !== user.id && match.player_b_id !== user.id) {
      return NextResponse.json({ ok: false, error: "Bu Ranked maça erişim yetkin yok." }, { status: 403 });
    }
    if (match.status === "completed") {
      return NextResponse.json({ ok: true, ranked: true, completed: true, matchId: match.id, winnerUserId: match.winner_user_id ?? null });
    }

    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from("guest_challenges")
      .select("status,winner_side,completed_at")
      .eq("invite_token", token)
      .maybeSingle();
    if (challengeError) throw challengeError;
    if (!challenge) return NextResponse.json({ ok: false, error: "Challenge bulunamadı." }, { status: 404 });

    const challengeCompleted = challenge.status === "completed" || Boolean(challenge.completed_at);
    if (!challengeCompleted) return NextResponse.json({ ok: true, ranked: true, completed: false });

    const winnerUserId = challenge.winner_side === "challenger"
      ? match.player_a_id
      : challenge.winner_side === "opponent"
        ? match.player_b_id
        : null;
    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("ranked_matches")
      .update({
        status: "completed",
        winner_user_id: winnerUserId,
        completed_at: now,
        updated_at: now,
      })
      .eq("id", match.id)
      .neq("status", "completed")
      .select("id,status,winner_user_id,rating_processed")
      .maybeSingle();
    if (updateError) throw updateError;

    if (!updated) {
      const { data: latest, error: latestError } = await supabaseAdmin
        .from("ranked_matches")
        .select("id,status,winner_user_id,rating_processed")
        .eq("id", match.id)
        .maybeSingle();
      if (latestError) throw latestError;
      return NextResponse.json({ ok: true, ranked: true, completed: latest?.status === "completed", match: latest ?? null });
    }

    return NextResponse.json({ ok: true, ranked: true, completed: true, match: updated });
  } catch (error) {
    console.error("Ranked challenge sync error", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Ranked maç sonucu senkronlanamadı." }, { status: 500 });
  }
}
