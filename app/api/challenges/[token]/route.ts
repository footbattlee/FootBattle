import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const GUEST_COOKIE_NAME = "footbattle_guest";

type WinnerSide = "challenger" | "opponent" | "draw" | null;
type ChallengeRow = {
  id: number | string;
  invite_token: string;
  game_code: string;
  status: string;
  challenger_user_id: string | null;
  challenger_guest_id: string | null;
  challenger_name: string | null;
  opponent_user_id: string | null;
  opponent_guest_id: string | null;
  opponent_name: string | null;
  challenger_score: number;
  opponent_score: number;
  winner_side: WinnerSide;
  created_at: string;
  joined_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  expires_at: string;
  updated_at: string;
};

function sanitizeToken(value: unknown) {
  return String(value ?? "").trim().replace(/[^a-zA-Z0-9]/g, "").slice(0, 64);
}

function timestampExpired(expiresAt: string) {
  const timestamp = new Date(expiresAt).getTime();
  return Number.isNaN(timestamp) ? false : timestamp <= Date.now();
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token: rawToken } = await context.params;
    const token = sanitizeToken(rawToken);
    if (!token) {
      return NextResponse.json({ ok: false, error: "Geçerli bir meydan okuma bağlantısı bulunamadı." }, { status: 400 });
    }

    const authClient = await createAuthServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    const cookieStore = await cookies();
    const guestId = cookieStore.get(GUEST_COOKIE_NAME)?.value ?? null;

    const { data, error } = await supabaseAdmin
      .from("guest_challenges")
      .select(`
        id, invite_token, game_code, status,
        challenger_user_id, challenger_guest_id, challenger_name,
        opponent_user_id, opponent_guest_id, opponent_name,
        challenger_score, opponent_score, winner_side,
        created_at, joined_at, started_at, completed_at, expires_at, updated_at
      `)
      .eq("invite_token", token)
      .maybeSingle();

    if (error) {
      console.error("Challenge GET sorgu hatası:", error);
      return NextResponse.json({ ok: false, error: "Meydan okuma okunamadı." }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ ok: false, found: false, error: "Bu meydan okuma bulunamadı." }, { status: 404 });
    }

    const challenge = data as ChallengeRow;

    // expires_at davetin kabul edilme süresidir. Maç başladıktan sonra bu timestamp
    // oyun durumunu kapatmamalı; oynanan maç kendi turn/game kurallarıyla tamamlanır.
    const inviteExpired = challenge.status === "waiting" && timestampExpired(challenge.expires_at);

    if (inviteExpired) {
      const now = new Date().toISOString();
      const { error: expireError } = await supabaseAdmin
        .from("guest_challenges")
        .update({ status: "expired", updated_at: now })
        .eq("id", challenge.id)
        .eq("status", "waiting");
      if (expireError) {
        console.error("Challenge expire update hatası:", expireError);
      } else {
        challenge.status = "expired";
        challenge.updated_at = now;
      }
    }

    let role: "challenger" | "opponent" | "visitor" = "visitor";
    if (user) {
      if (challenge.challenger_user_id === user.id) role = "challenger";
      else if (challenge.opponent_user_id === user.id) role = "opponent";
    } else if (guestId) {
      if (challenge.challenger_guest_id === guestId) role = "challenger";
      else if (challenge.opponent_guest_id === guestId) role = "opponent";
    }

    const hasOpponent = Boolean(challenge.opponent_user_id || challenge.opponent_guest_id);
    const effectiveExpired = challenge.status === "expired";
    const canJoin = role === "visitor" && challenge.status === "waiting" && !hasOpponent && !effectiveExpired;
    const canPlay = (role === "challenger" || role === "opponent") && (challenge.status === "ready" || challenge.status === "playing");
    const waitingForOpponent = role === "challenger" && challenge.status === "waiting" && !hasOpponent && !effectiveExpired;
    const completed = challenge.status === "completed";

    let result: "win" | "loss" | "draw" | null = null;
    if (completed && challenge.winner_side) {
      if (challenge.winner_side === "draw") result = "draw";
      else if (role === challenge.winner_side) result = "win";
      else if (role === "challenger" || role === "opponent") result = "loss";
    }

    const challengerName = challenge.challenger_name ?? (challenge.challenger_user_id ? "FootBattle Oyuncusu" : "Misafir");
    const opponentName = hasOpponent
      ? challenge.opponent_name ?? (challenge.opponent_user_id ? "FootBattle Oyuncusu" : "Misafir")
      : null;

    return NextResponse.json({
      ok: true,
      found: true,
      role,
      canJoin,
      canPlay,
      waitingForOpponent,
      completed,
      expired: effectiveExpired,
      result,
      challenge: {
        id: Number(challenge.id),
        token: challenge.invite_token,
        gameCode: challenge.game_code,
        status: challenge.status,
        challenger: {
          name: challengerName,
          score: Number(challenge.challenger_score),
          isRegistered: Boolean(challenge.challenger_user_id),
        },
        opponent: hasOpponent
          ? {
              name: opponentName,
              score: Number(challenge.opponent_score),
              isRegistered: Boolean(challenge.opponent_user_id),
            }
          : null,
        winnerSide: challenge.winner_side,
        createdAt: challenge.created_at,
        joinedAt: challenge.joined_at,
        startedAt: challenge.started_at,
        completedAt: challenge.completed_at,
        expiresAt: challenge.expires_at,
        updatedAt: challenge.updated_at,
      },
    });
  } catch (error) {
    console.error("Challenge GET endpoint hatası:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Meydan okuma okunurken beklenmeyen bir hata oluştu." },
      { status: 500 },
    );
  }
}
