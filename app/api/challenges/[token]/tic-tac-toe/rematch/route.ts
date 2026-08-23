import { NextResponse } from "next/server";

import { requireTicTacToeParticipant } from "@/lib/tic-tac-toe/duel-server";
import { supabaseAdmin } from "@/lib/supabase/server";

// Polling runs roughly every 1.1s on both phones. A 5s gate gives the requester
// enough time to observe the accepted state before either client navigates.
const START_DELAY_MS = 5000;

function inviteToken() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

async function readRematch(sourceId: number) {
  const { data, error } = await supabaseAdmin
    .from("tic_tac_toe_rematches")
    .select("rematch_challenge_id")
    .eq("source_challenge_id", sourceId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.rematch_challenge_id) return null;

  const { data: challenge, error: challengeError } = await supabaseAdmin
    .from("guest_challenges")
    .select("id,invite_token,status,winner_side,started_at")
    .eq("id", data.rematch_challenge_id)
    .maybeSingle();
  if (challengeError) throw challengeError;
  return challenge ?? null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const access = await requireTicTacToeParticipant(token);
    if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: access.status });

    const rematch = await readRematch(access.challenge.id);
    if (!rematch) return NextResponse.json({ ok: true, state: "none", token: null, role: access.role });

    const requestedBy = rematch.status === "waiting" && (rematch.winner_side === "challenger" || rematch.winner_side === "opponent")
      ? rematch.winner_side
      : null;
    const accepted = rematch.status === "playing";

    return NextResponse.json({
      ok: true,
      state: accepted ? "accepted" : rematch.status === "waiting" ? "pending" : rematch.status,
      role: access.role,
      requestedBy,
      token: accepted ? rematch.invite_token : null,
      startsAt: accepted ? rematch.started_at : null,
    });
  } catch (error) {
    console.error("Tic Tac Toe rematch read error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Rövanş okunamadı." }, { status: 500 });
  }
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const access = await requireTicTacToeParticipant(token);
    if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: access.status });

    const source = access.challenge;
    if (source.status !== "completed") {
      return NextResponse.json({ ok: false, error: "Rövanş yalnızca biten maçtan sonra istenebilir." }, { status: 409 });
    }

    const existing = await readRematch(source.id);
    if (existing) {
      if (existing.status === "playing") {
        return NextResponse.json({ ok: true, state: "accepted", token: existing.invite_token, startsAt: existing.started_at, existing: true });
      }
      return NextResponse.json({ ok: true, state: "pending", token: null, requestedBy: existing.winner_side, existing: true });
    }

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const newToken = inviteToken();

    const { data: created, error: createError } = await supabaseAdmin
      .from("guest_challenges")
      .insert({
        invite_token: newToken,
        game_code: "tic_tac_toe",
        status: "waiting",
        challenger_user_id: source.challenger_user_id,
        challenger_guest_id: source.challenger_guest_id,
        challenger_name: source.challenger_name,
        opponent_user_id: source.opponent_user_id,
        opponent_guest_id: source.opponent_guest_id,
        opponent_name: source.opponent_name,
        challenger_score: 0,
        opponent_score: 0,
        winner_side: access.role,
        joined_at: null,
        started_at: null,
        completed_at: null,
        expires_at: expiresAt,
        updated_at: now,
      })
      .select("id")
      .single();
    if (createError || !created) throw createError ?? new Error("Rövanş isteği oluşturulamadı.");

    const { error: mapError } = await supabaseAdmin
      .from("tic_tac_toe_rematches")
      .insert({ source_challenge_id: source.id, rematch_challenge_id: created.id });
    if (mapError) {
      await supabaseAdmin.from("guest_challenges").delete().eq("id", created.id);
      if ((mapError as { code?: string }).code === "23505") {
        return NextResponse.json({ ok: true, state: "pending", token: null, existing: true });
      }
      throw mapError;
    }

    const requesterUserId = access.role === "challenger" ? source.challenger_user_id : source.opponent_user_id;
    await supabaseAdmin.from("analytics_events").insert({
      event_name: "play_again",
      game_name: "tic_tac_toe",
      user_id: requesterUserId ?? null,
      session_id: String(source.id),
      page_path: `/tic-tac-toe/duel/${token}`,
      metadata: {
        mode: "duel",
        action: "rematch_requested",
        rematchChallengeId: created.id,
      },
    });

    return NextResponse.json({ ok: true, state: "pending", token: null, requestedBy: access.role });
  } catch (error) {
    console.error("Tic Tac Toe rematch create error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Rövanş isteği oluşturulamadı." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const access = await requireTicTacToeParticipant(token);
    if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: access.status });

    const body = await request.json().catch(() => ({}));
    const action = body?.action === "accept" ? "accept" : body?.action === "decline" ? "decline" : null;
    if (!action) return NextResponse.json({ ok: false, error: "Geçersiz rövanş işlemi." }, { status: 400 });

    const rematch = await readRematch(access.challenge.id);
    if (!rematch || rematch.status !== "waiting") {
      return NextResponse.json({ ok: false, error: "Bekleyen rövanş isteği bulunamadı." }, { status: 409 });
    }
    if (rematch.winner_side === access.role) {
      return NextResponse.json({ ok: false, error: "Kendi rövanş isteğini onaylayamazsın." }, { status: 409 });
    }

    if (action === "decline") {
      await supabaseAdmin.from("tic_tac_toe_rematches").delete().eq("source_challenge_id", access.challenge.id);
      await supabaseAdmin.from("guest_challenges").delete().eq("id", rematch.id);
      return NextResponse.json({ ok: true, state: "declined" });
    }

    const now = new Date();
    const startsAt = new Date(now.getTime() + START_DELAY_MS).toISOString();
    const { data: started, error } = await supabaseAdmin
      .from("guest_challenges")
      .update({
        status: "playing",
        winner_side: null,
        joined_at: now.toISOString(),
        started_at: startsAt,
        updated_at: now.toISOString(),
      })
      .eq("id", rematch.id)
      .eq("status", "waiting")
      .select("invite_token,started_at")
      .single();
    if (error) throw error;

    return NextResponse.json({ ok: true, state: "accepted", token: started.invite_token, startsAt: started.started_at });
  } catch (error) {
    console.error("Tic Tac Toe rematch response error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Rövanş yanıtlanamadı." }, { status: 500 });
  }
}
