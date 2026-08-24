import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type DuelStatus = "pending" | "accepted" | "active" | "completed" | "rejected" | "cancelled";
type DuelRow = {
  id: number;
  challenger_id: string;
  opponent_id: string;
  game_code: string;
  status: DuelStatus;
  challenger_score: number;
  opponent_score: number;
  winner_id: string | null;
  challenge_token: string | null;
  created_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};
type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  total_score: number | null;
  current_streak: number | null;
  games_played: number | null;
  games_won: number | null;
  last_seen_at: string | null;
};
type ChallengeRow = {
  invite_token: string;
  status: string;
  winner_side: "challenger" | "opponent" | "draw" | null;
  challenger_score: number | null;
  opponent_score: number | null;
  completed_at: string | null;
};

const GAME_LABELS: Record<string, string> = {
  club_clash: "2 Takım 1 Oyuncu",
  club_nation: "1 Takım 1 Millet",
  tic_tac_toe: "Football Tic Tac Toe",
  country_club: "Ülke + Takım",
  player_duel: "Test Düellosu",
};
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

function presence(lastSeenAt: string | null) {
  if (!lastSeenAt) return { online: false, lastSeenAt: null, lastSeenText: "Henüz görülmedi" };
  const difference = Date.now() - new Date(lastSeenAt).getTime();
  const online = difference >= 0 && difference <= ONLINE_THRESHOLD_MS;
  if (online) return { online: true, lastSeenAt, lastSeenText: "Çevrimiçi" };
  const minutes = Math.floor(difference / 60_000);
  if (minutes < 1) return { online: false, lastSeenAt, lastSeenText: "Az önce aktifti" };
  if (minutes < 60) return { online: false, lastSeenAt, lastSeenText: `${minutes} dk önce aktifti` };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { online: false, lastSeenAt, lastSeenText: `${hours} sa önce aktifti` };
  return { online: false, lastSeenAt, lastSeenText: `${Math.floor(hours / 24)} gün önce aktifti` };
}

function canonicalGameUrl(duel: DuelRow) {
  if (duel.game_code === "tic_tac_toe" && duel.challenge_token) return `/tic-tac-toe/duel/${duel.challenge_token}`;
  if (duel.game_code === "club_nation" && duel.challenge_token) return `/challenge/${duel.challenge_token}`;
  return `/duels/${duel.id}`;
}

async function reconcileChallengeBackedDuels(duels: DuelRow[]) {
  const candidates = duels.filter(
    (duel) =>
      (duel.status === "accepted" || duel.status === "active") &&
      Boolean(duel.challenge_token) &&
      (duel.game_code === "tic_tac_toe" || duel.game_code === "club_nation"),
  );
  const tokens = Array.from(new Set(candidates.map((duel) => duel.challenge_token).filter((value): value is string => Boolean(value))));
  if (!tokens.length) return;

  const { data, error } = await supabaseAdmin
    .from("guest_challenges")
    .select("invite_token,status,winner_side,challenger_score,opponent_score,completed_at")
    .in("invite_token", tokens);
  if (error) {
    console.error("Duel completion reconcile challenge read failed", error);
    return;
  }

  const challengeByToken = new Map((data ?? []).map((row) => [String(row.invite_token), row as ChallengeRow]));
  const now = new Date().toISOString();

  await Promise.all(
    candidates.map(async (duel) => {
      const token = duel.challenge_token;
      if (!token) return;
      const challenge = challengeByToken.get(token);
      if (!challenge || challenge.status !== "completed") return;

      const winnerId =
        challenge.winner_side === "challenger"
          ? duel.challenger_id
          : challenge.winner_side === "opponent"
            ? duel.opponent_id
            : null;
      const completedAt = challenge.completed_at ?? now;
      const challengerScore = Number(challenge.challenger_score ?? duel.challenger_score ?? 0);
      const opponentScore = Number(challenge.opponent_score ?? duel.opponent_score ?? 0);

      const { error: updateError } = await supabaseAdmin
        .from("duels")
        .update({
          status: "completed",
          winner_id: winnerId,
          challenger_score: challengerScore,
          opponent_score: opponentScore,
          completed_at: completedAt,
          updated_at: now,
        })
        .eq("id", duel.id)
        .in("status", ["accepted", "active"]);

      if (updateError) {
        console.error("Duel completion reconcile update failed", duel.id, updateError);
        return;
      }

      duel.status = "completed";
      duel.winner_id = winnerId;
      duel.challenger_score = challengerScore;
      duel.opponent_score = opponentScore;
      duel.completed_at = completedAt;
      duel.updated_at = now;
    }),
  );
}

export async function GET() {
  try {
    const auth = await createAuthServerClient();
    const { data: { user }, error: userError } = await auth.auth.getUser();
    if (userError || !user) return NextResponse.json({ ok: false, error: "Giriş yapmalısın." }, { status: 401 });
    const currentUserId = user.id;

    const { data: rows, error: duelError } = await supabaseAdmin
      .from("duels")
      .select("id,challenger_id,opponent_id,game_code,status,challenger_score,opponent_score,winner_id,challenge_token,created_at,accepted_at,started_at,completed_at,updated_at")
      .or(`challenger_id.eq.${currentUserId},opponent_id.eq.${currentUserId}`)
      .order("created_at", { ascending: false });
    if (duelError) return NextResponse.json({ ok: false, error: "Düellolar okunamadı." }, { status: 500 });
    const duels = (rows ?? []) as DuelRow[];

    await reconcileChallengeBackedDuels(duels);

    const profileIds = Array.from(new Set(duels.flatMap((duel) => [duel.challenger_id, duel.opponent_id])));
    let profiles: ProfileRow[] = [];
    if (profileIds.length) {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id,username,display_name,avatar_url,total_score,current_streak,games_played,games_won,last_seen_at")
        .in("id", profileIds);
      if (error) return NextResponse.json({ ok: false, error: "Oyuncu profilleri okunamadı." }, { status: 500 });
      profiles = (data ?? []) as ProfileRow[];
    }

    function profile(id: string) {
      const row = profiles.find((item) => item.id === id);
      if (!row) return null;
      const p = presence(row.last_seen_at);
      return {
        id: row.id,
        username: row.username,
        displayName: row.display_name ?? row.username ?? "FootBattle Oyuncusu",
        avatarUrl: row.avatar_url,
        totalScore: Number(row.total_score ?? 0),
        currentStreak: Number(row.current_streak ?? 0),
        gamesPlayed: Number(row.games_played ?? 0),
        gamesWon: Number(row.games_won ?? 0),
        ...p,
      };
    }

    function format(duel: DuelRow) {
      const viewerRole = duel.challenger_id === currentUserId ? "challenger" as const : "opponent" as const;
      const challenger = profile(duel.challenger_id);
      const opponent = profile(duel.opponent_id);
      const otherPlayer = viewerRole === "challenger" ? opponent : challenger;
      const myScore = viewerRole === "challenger" ? duel.challenger_score : duel.opponent_score;
      const opponentScore = viewerRole === "challenger" ? duel.opponent_score : duel.challenger_score;
      let result: "won" | "lost" | "draw" | null = null;
      if (duel.status === "completed") result = duel.winner_id === currentUserId ? "won" : duel.winner_id ? "lost" : "draw";
      return {
        id: duel.id,
        gameCode: duel.game_code,
        gameLabel: GAME_LABELS[duel.game_code] ?? duel.game_code,
        status: duel.status,
        viewerRole,
        challenger,
        opponent,
        otherPlayer,
        myScore,
        opponentScore,
        result,
        winnerId: duel.winner_id,
        challengeToken: duel.challenge_token,
        gameUrl: canonicalGameUrl(duel),
        createdAt: duel.created_at,
        acceptedAt: duel.accepted_at,
        startedAt: duel.started_at,
        completedAt: duel.completed_at,
        updatedAt: duel.updated_at,
      };
    }

    const incoming = duels.filter((d) => d.status === "pending" && d.opponent_id === currentUserId).map(format);
    const outgoing = duels.filter((d) => d.status === "pending" && d.challenger_id === currentUserId).map(format);
    const active = duels.filter((d) => d.status === "accepted" || d.status === "active").map(format);
    const history = duels.filter((d) => ["completed", "rejected", "cancelled"].includes(d.status)).map(format).slice(0, 20);
    const completed = duels.filter((d) => d.status === "completed");
    const wins = completed.filter((d) => d.winner_id === currentUserId).length;
    const losses = completed.filter((d) => d.winner_id && d.winner_id !== currentUserId).length;
    const draws = completed.filter((d) => !d.winner_id).length;

    return NextResponse.json({
      ok: true,
      summary: {
        incomingCount: incoming.length,
        outgoingCount: outgoing.length,
        activeCount: active.length,
        historyCount: history.length,
        completedCount: completed.length,
        wins,
        losses,
        draws,
      },
      incoming,
      outgoing,
      active,
      history,
    });
  } catch (error) {
    console.error("Duels GET endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Düellolar okunamadı." }, { status: 500 });
  }
}
