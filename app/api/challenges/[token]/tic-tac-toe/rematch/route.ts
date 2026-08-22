import { NextResponse } from "next/server";

import { requireTicTacToeParticipant } from "@/lib/tic-tac-toe/duel-server";
import { supabaseAdmin } from "@/lib/supabase/server";

function inviteToken() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const access = await requireTicTacToeParticipant(token);
    if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: access.status });

    const { data, error } = await supabaseAdmin
      .from("tic_tac_toe_rematches")
      .select("rematch_challenge_id, guest_challenges!tic_tac_toe_rematches_rematch_challenge_id_fkey(invite_token)")
      .eq("source_challenge_id", access.challenge.id)
      .maybeSingle();

    if (error) throw error;
    const relation = data?.guest_challenges as unknown as { invite_token?: string } | null;
    return NextResponse.json({ ok: true, token: relation?.invite_token ?? null });
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
      return NextResponse.json({ ok: false, error: "Rövanş yalnızca biten maçtan sonra başlatılabilir." }, { status: 409 });
    }

    const existing = await supabaseAdmin
      .from("tic_tac_toe_rematches")
      .select("rematch_challenge_id")
      .eq("source_challenge_id", source.id)
      .maybeSingle();
    if (existing.error) throw existing.error;

    if (existing.data?.rematch_challenge_id) {
      const found = await supabaseAdmin
        .from("guest_challenges")
        .select("invite_token")
        .eq("id", existing.data.rematch_challenge_id)
        .single();
      if (found.error) throw found.error;
      return NextResponse.json({ ok: true, token: found.data.invite_token, existing: true });
    }

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    const newToken = inviteToken();

    const { data: created, error: createError } = await supabaseAdmin
      .from("guest_challenges")
      .insert({
        invite_token: newToken,
        game_code: "tic_tac_toe",
        status: "playing",
        challenger_user_id: source.challenger_user_id,
        challenger_guest_id: source.challenger_guest_id,
        challenger_name: source.challenger_name,
        opponent_user_id: source.opponent_user_id,
        opponent_guest_id: source.opponent_guest_id,
        opponent_name: source.opponent_name,
        challenger_score: 0,
        opponent_score: 0,
        winner_side: null,
        joined_at: now,
        started_at: now,
        completed_at: null,
        expires_at: expiresAt,
        updated_at: now,
      })
      .select("id, invite_token")
      .single();
    if (createError || !created) throw createError ?? new Error("Rövanş oluşturulamadı.");

    const { error: mapError } = await supabaseAdmin
      .from("tic_tac_toe_rematches")
      .insert({ source_challenge_id: source.id, rematch_challenge_id: created.id });
    if (mapError) {
      if ((mapError as { code?: string }).code === "23505") {
        const retry = await supabaseAdmin
          .from("tic_tac_toe_rematches")
          .select("rematch_challenge_id")
          .eq("source_challenge_id", source.id)
          .single();
        if (retry.error) throw retry.error;
        const found = await supabaseAdmin
          .from("guest_challenges")
          .select("invite_token")
          .eq("id", retry.data.rematch_challenge_id)
          .single();
        if (found.error) throw found.error;
        return NextResponse.json({ ok: true, token: found.data.invite_token, existing: true });
      }
      throw mapError;
    }

    return NextResponse.json({ ok: true, token: created.invite_token, existing: false });
  } catch (error) {
    console.error("Tic Tac Toe rematch create error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Rövanş oluşturulamadı." }, { status: 500 });
  }
}
