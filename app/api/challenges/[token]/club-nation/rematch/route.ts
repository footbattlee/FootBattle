import { NextResponse } from "next/server";

import {
  loadTicTacToeChallenge,
  resolveDuelRole,
  sanitizeDuelToken,
} from "@/lib/tic-tac-toe/duel-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const START_DELAY_MS = 3000;

function inviteToken() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

async function requireParticipant(tokenValue: unknown) {
  const token = sanitizeDuelToken(tokenValue);
  if (!token) return { ok: false as const, status: 400, error: "Geçerli düello bulunamadı." };

  const challenge = await loadTicTacToeChallenge(token);
  if (!challenge) return { ok: false as const, status: 404, error: "Düello bulunamadı." };
  if (challenge.game_code !== "club_nation") {
    return { ok: false as const, status: 409, error: "Bu bağlantı 1 Takım 1 Millet düellosu değil." };
  }

  const identity = await resolveDuelRole(challenge);
  if (identity.role !== "challenger" && identity.role !== "opponent") {
    return { ok: false as const, status: 403, error: "Bu düelloya erişim yetkin yok." };
  }

  return { ok: true as const, token, challenge, role: identity.role };
}

async function readRematch(sourceId: number) {
  const { data, error } = await supabaseAdmin
    .from("club_nation_rematches")
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

async function sourceRankedMatch(challengeToken: string) {
  const { data, error } = await supabaseAdmin
    .from("ranked_matches")
    .select("id,player_a_id,player_b_id,opponent_kind,bot_name")
    .eq("challenge_token", challengeToken)
    .eq("game_code", "club_nation")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const access = await requireParticipant(token);
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
    console.error("Club Nation rematch read error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Rövanş okunamadı." }, { status: 500 });
  }
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const access = await requireParticipant(token);
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

    const rankedSource = await sourceRankedMatch(source.invite_token);
    const isBot = rankedSource?.opponent_kind === "bot";
    const now = new Date();
    const nowIso = now.toISOString();
    const startsAt = new Date(now.getTime() + START_DELAY_MS).toISOString();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
    const newToken = inviteToken();

    const { data: created, error: createError } = await supabaseAdmin
      .from("guest_challenges")
      .insert({
        invite_token: newToken,
        game_code: "club_nation",
        status: isBot ? "playing" : "waiting",
        challenger_user_id: source.challenger_user_id,
        challenger_guest_id: source.challenger_guest_id,
        challenger_name: source.challenger_name,
        opponent_user_id: source.opponent_user_id,
        opponent_guest_id: source.opponent_guest_id,
        opponent_name: source.opponent_name,
        challenger_score: 0,
        opponent_score: 0,
        winner_side: isBot ? null : access.role,
        joined_at: isBot ? nowIso : null,
        started_at: isBot ? startsAt : null,
        completed_at: null,
        expires_at: expiresAt,
        updated_at: nowIso,
      })
      .select("id,invite_token,started_at")
      .single();
    if (createError || !created) throw createError ?? new Error("Rövanş isteği oluşturulamadı.");

    const { error: mapError } = await supabaseAdmin
      .from("club_nation_rematches")
      .insert({ source_challenge_id: source.id, rematch_challenge_id: created.id });
    if (mapError) {
      await supabaseAdmin.from("guest_challenges").delete().eq("id", created.id);
      if ((mapError as { code?: string }).code === "23505") {
        return NextResponse.json({ ok: true, state: "pending", token: null, existing: true });
      }
      throw mapError;
    }

    if (isBot && rankedSource) {
      const { error: rankedError } = await supabaseAdmin.from("ranked_matches").insert({
        game_code: "club_nation",
        status: "active",
        player_a_id: rankedSource.player_a_id,
        player_b_id: null,
        opponent_kind: "bot",
        bot_name: rankedSource.bot_name ?? "Bot Eren :)",
        challenge_token: newToken,
        started_at: startsAt,
        updated_at: nowIso,
      });
      if (rankedError) {
        await supabaseAdmin.from("club_nation_rematches").delete().eq("source_challenge_id", source.id);
        await supabaseAdmin.from("guest_challenges").delete().eq("id", created.id);
        throw rankedError;
      }

      return NextResponse.json({ ok: true, state: "accepted", token: newToken, startsAt, bot: true });
    }

    return NextResponse.json({ ok: true, state: "pending", token: null, requestedBy: access.role, bot: false });
  } catch (error) {
    console.error("Club Nation rematch create error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Rövanş isteği oluşturulamadı." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const access = await requireParticipant(token);
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
      await supabaseAdmin.from("club_nation_rematches").delete().eq("source_challenge_id", access.challenge.id);
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
    console.error("Club Nation rematch response error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Rövanş yanıtlanamadı." }, { status: 500 });
  }
}
