import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const BOT_FALLBACK_MS = 7000;
const CHALLENGE_LIFETIME_HOURS = 6;
const VALID_GAMES = new Set(["tic_tac_toe", "club_clash"]);

type MatchRow = {
  id: string;
  game_code: string;
  status: string;
  player_a_id: string;
  player_b_id: string | null;
  opponent_kind: "human" | "bot";
  bot_name: string | null;
  challenge_token: string | null;
  created_at: string;
};

async function getUserId() {
  const auth = await createAuthServerClient();
  const { data: { user } } = await auth.auth.getUser();
  return user?.id ?? null;
}

function generateInviteToken() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

async function getDisplayName(userId: string) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("display_name,username")
    .eq("id", userId)
    .maybeSingle();
  return String(data?.display_name ?? data?.username ?? "FootBattle Oyuncusu").trim().slice(0, 30);
}

async function createSharedChallenge(input: {
  gameCode: string;
  playerAId: string;
  playerBId: string | null;
  opponentKind: "human" | "bot";
  botName: string | null;
}) {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + CHALLENGE_LIFETIME_HOURS * 60 * 60 * 1000).toISOString();
  const challengerName = await getDisplayName(input.playerAId);
  const opponentName = input.opponentKind === "bot"
    ? (input.botName ?? "Mehmet")
    : input.playerBId
      ? await getDisplayName(input.playerBId)
      : "Rakip";
  const token = generateInviteToken();

  const { data, error } = await supabaseAdmin
    .from("guest_challenges")
    .insert({
      invite_token: token,
      game_code: input.gameCode,
      status: "playing",
      challenger_user_id: input.playerAId,
      challenger_guest_id: null,
      challenger_name: challengerName,
      opponent_user_id: input.opponentKind === "human" ? input.playerBId : null,
      opponent_guest_id: input.opponentKind === "bot" ? crypto.randomUUID() : null,
      opponent_name: opponentName,
      challenger_score: 0,
      opponent_score: 0,
      winner_side: null,
      joined_at: now,
      started_at: now,
      expires_at: expiresAt,
      updated_at: now,
    })
    .select("invite_token")
    .single();
  if (error || !data) throw error ?? new Error("Ranked oyun challenge kaydı oluşturulamadı.");
  return String(data.invite_token);
}

async function ensureChallenge(match: MatchRow) {
  if (match.challenge_token) return match;
  const challengeToken = await createSharedChallenge({
    gameCode: match.game_code,
    playerAId: match.player_a_id,
    playerBId: match.player_b_id,
    opponentKind: match.opponent_kind,
    botName: match.bot_name,
  });
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("ranked_matches")
    .update({ challenge_token: challengeToken, status: "active", started_at: now, updated_at: now })
    .eq("id", match.id)
    .is("challenge_token", null)
    .select("id,game_code,status,player_a_id,player_b_id,opponent_kind,bot_name,challenge_token,created_at")
    .maybeSingle();
  if (error) throw error;
  if (data) return data as MatchRow;

  const { data: latest, error: latestError } = await supabaseAdmin
    .from("ranked_matches")
    .select("id,game_code,status,player_a_id,player_b_id,opponent_kind,bot_name,challenge_token,created_at")
    .eq("id", match.id)
    .single();
  if (latestError) throw latestError;
  return latest as MatchRow;
}

async function getExistingMatch(userId: string, gameCode: string) {
  const { data } = await supabaseAdmin
    .from("ranked_matches")
    .select("id,game_code,status,player_a_id,player_b_id,opponent_kind,bot_name,challenge_token,created_at")
    .eq("game_code", gameCode)
    .in("status", ["ready", "active"])
    .or(`player_a_id.eq.${userId},player_b_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? (data as MatchRow) : null;
}

async function createRankedMatch(input: {
  gameCode: string;
  playerAId: string;
  playerBId: string | null;
  opponentKind: "human" | "bot";
  botName?: string | null;
}) {
  const challengeToken = await createSharedChallenge({
    gameCode: input.gameCode,
    playerAId: input.playerAId,
    playerBId: input.playerBId,
    opponentKind: input.opponentKind,
    botName: input.botName ?? null,
  });
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("ranked_matches")
    .insert({
      game_code: input.gameCode,
      status: "active",
      player_a_id: input.playerAId,
      player_b_id: input.playerBId,
      opponent_kind: input.opponentKind,
      bot_name: input.opponentKind === "bot" ? (input.botName ?? "Mehmet") : null,
      challenge_token: challengeToken,
      started_at: now,
      updated_at: now,
    })
    .select("id,game_code,status,player_a_id,player_b_id,opponent_kind,bot_name,challenge_token,created_at")
    .single();
  if (error) {
    await supabaseAdmin.from("guest_challenges").delete().eq("invite_token", challengeToken);
    throw error;
  }
  return data as MatchRow;
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ ok: false, error: "Giriş yapmalısın." }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const gameCode = typeof body?.gameCode === "string" ? body.gameCode : "";
    if (!VALID_GAMES.has(gameCode)) {
      return NextResponse.json({ ok: false, error: "Geçersiz ranked oyunu." }, { status: 400 });
    }

    const existing = await getExistingMatch(userId, gameCode);
    if (existing) {
      const bridged = await ensureChallenge(existing);
      return NextResponse.json({ ok: true, state: "matched", match: bridged });
    }

    const { data: mine } = await supabaseAdmin
      .from("ranked_match_queue")
      .select("user_id,game_code,created_at")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: candidate } = await supabaseAdmin
      .from("ranked_match_queue")
      .select("user_id,game_code,created_at")
      .eq("game_code", gameCode)
      .neq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (candidate?.user_id) {
      const match = await createRankedMatch({
        gameCode,
        playerAId: candidate.user_id,
        playerBId: userId,
        opponentKind: "human",
      });
      await supabaseAdmin.from("ranked_match_queue").delete().in("user_id", [candidate.user_id, userId]);
      return NextResponse.json({ ok: true, state: "matched", match });
    }

    if (!mine) {
      const { error } = await supabaseAdmin.from("ranked_match_queue").insert({ user_id: userId, game_code: gameCode });
      if (error) throw error;
      return NextResponse.json({ ok: true, state: "searching", elapsedMs: 0, botInMs: BOT_FALLBACK_MS });
    }

    if (mine.game_code !== gameCode) {
      const { error } = await supabaseAdmin
        .from("ranked_match_queue")
        .update({ game_code: gameCode, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (error) throw error;
      return NextResponse.json({ ok: true, state: "searching", elapsedMs: 0, botInMs: BOT_FALLBACK_MS });
    }

    const elapsedMs = Math.max(0, Date.now() - new Date(mine.created_at).getTime());
    if (elapsedMs >= BOT_FALLBACK_MS) {
      const match = await createRankedMatch({
        gameCode,
        playerAId: userId,
        playerBId: null,
        opponentKind: "bot",
        botName: "Mehmet",
      });
      await supabaseAdmin.from("ranked_match_queue").delete().eq("user_id", userId);
      return NextResponse.json({ ok: true, state: "matched", match });
    }

    return NextResponse.json({
      ok: true,
      state: "searching",
      elapsedMs,
      botInMs: Math.max(0, BOT_FALLBACK_MS - elapsedMs),
    });
  } catch (error) {
    console.error("Ranked matchmaking error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Rakip aranamadı." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const userId = await getUserId();
    if (!userId) return NextResponse.json({ ok: false, error: "Giriş yapmalısın." }, { status: 401 });
    await supabaseAdmin.from("ranked_match_queue").delete().eq("user_id", userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Arama iptal edilemedi." }, { status: 500 });
  }
}
