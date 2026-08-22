import { NextResponse } from "next/server";

import {
  loadTicTacToeChallenge,
  resolveDuelRole,
  sanitizeDuelToken,
} from "@/lib/tic-tac-toe/duel-server";
import { supabaseAdmin } from "@/lib/supabase/server";

function inviteToken() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

async function requireClubClashParticipant(tokenValue: unknown) {
  const token = sanitizeDuelToken(tokenValue);
  if (!token) return { ok: false as const, status: 400, error: "Geçerli düello bulunamadı." };

  const challenge = await loadTicTacToeChallenge(token);
  if (!challenge) return { ok: false as const, status: 404, error: "Düello bulunamadı." };
  if (challenge.game_code !== "club_clash") {
    return { ok: false as const, status: 409, error: "Bu bağlantı 2 Takım 1 Oyuncu düellosu değil." };
  }

  const identity = await resolveDuelRole(challenge);
  if (identity.role !== "challenger" && identity.role !== "opponent") {
    return { ok: false as const, status: 403, error: "Bu düelloya erişim yetkin yok." };
  }

  return { ok: true as const, token, challenge, role: identity.role };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const access = await requireClubClashParticipant(token);
    if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: access.status });

    const { data, error } = await supabaseAdmin
      .from("club_clash_rematches")
      .select("rematch_challenge_id")
      .eq("source_challenge_id", access.challenge.id)
      .maybeSingle();
    if (error) throw error;
    if (!data?.rematch_challenge_id) return NextResponse.json({ ok: true, token: null });

    const found = await supabaseAdmin
      .from("guest_challenges")
      .select("invite_token")
      .eq("id", data.rematch_challenge_id)
      .single();
    if (found.error) throw found.error;

    return NextResponse.json({ ok: true, token: found.data.invite_token });
  } catch (error) {
    console.error("Club Clash rematch read error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Rövanş okunamadı." },
      { status: 500 },
    );
  }
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const access = await requireClubClashParticipant(token);
    if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: access.status });

    const source = access.challenge;
    if (source.status !== "completed") {
      return NextResponse.json({ ok: false, error: "Rövanş yalnızca biten maçtan sonra başlatılabilir." }, { status: 409 });
    }

    const existing = await supabaseAdmin
      .from("club_clash_rematches")
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
        game_code: "club_clash",
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
      .from("club_clash_rematches")
      .insert({ source_challenge_id: source.id, rematch_challenge_id: created.id });
    if (mapError) {
      if ((mapError as { code?: string }).code === "23505") {
        const retry = await supabaseAdmin
          .from("club_clash_rematches")
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
    console.error("Club Clash rematch create error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Rövanş oluşturulamadı." },
      { status: 500 },
    );
  }
}
