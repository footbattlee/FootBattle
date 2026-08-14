import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

const VALID_GAME_CODES = new Set([
  "wordle",
  "guess_the_player",
  "player_quiz",
  "tic_tac_toe",
  "career_path",
  "club_clash",
  "club_nation",
  "transfer_quiz",
]);

function getTurkeyWeekStart() {
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dow = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return new Date(`${y}-${m}-${d}T00:00:00+03:00`).toISOString();
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const game = url.searchParams.get("game")?.trim() || "overall";
    const period = url.searchParams.get("period")?.trim() || "week";
    const requestedLimit = Number(url.searchParams.get("limit") ?? 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(100, Math.max(1, Math.floor(requestedLimit)))
      : 10;

    if (game !== "overall" && !VALID_GAME_CODES.has(game)) {
      return NextResponse.json({ ok: false, error: "Geçersiz leaderboard türü." }, { status: 400 });
    }
    if (period !== "week" && period !== "all") {
      return NextResponse.json({ ok: false, error: "Geçersiz leaderboard periyodu." }, { status: 400 });
    }

    let query = supabaseAdmin
      .from("game_sessions")
      .select("user_id, game_code, server_score, won, finished_at")
      .eq("status", "finished")
      .eq("score_blocked", false)
      .not("user_id", "is", null);

    if (game !== "overall") query = query.eq("game_code", game);
    const weekStart = getTurkeyWeekStart();
    if (period === "week") query = query.gte("finished_at", weekStart);

    const { data: sessions, error: sessionsError } = await query;
    if (sessionsError) throw sessionsError;

    const totals = new Map<string, { score: number; gamesPlayed: number; gamesWon: number }>();
    for (const session of sessions ?? []) {
      if (!session.user_id) continue;
      const current = totals.get(session.user_id) ?? { score: 0, gamesPlayed: 0, gamesWon: 0 };
      current.score += Math.max(0, Number(session.server_score ?? 0));
      current.gamesPlayed += 1;
      if (session.won) current.gamesWon += 1;
      totals.set(session.user_id, current);
    }

    const ranked = [...totals.entries()].sort((a, b) => {
      if (b[1].score !== a[1].score) return b[1].score - a[1].score;
      if (b[1].gamesWon !== a[1].gamesWon) return b[1].gamesWon - a[1].gamesWon;
      return a[1].gamesPlayed - b[1].gamesPlayed;
    });

    const top = ranked.slice(0, limit);
    if (!top.length) {
      return NextResponse.json({ ok: true, type: game, period, weekStart, leaderboard: [] });
    }

    const userIds = top.map(([userId]) => userId);
    const [{ data: profiles, error: profileError }, { data: progress, error: progressError }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, username, display_name, avatar_url, current_streak, best_streak")
        .in("id", userIds),
      supabaseAdmin
        .from("user_progress")
        .select("user_id, xp, level, current_streak, best_streak")
        .in("user_id", userIds),
    ]);
    if (profileError) throw profileError;
    if (progressError) throw progressError;

    const profileMap = new Map((profiles ?? []).map((item) => [item.id, item]));
    const progressMap = new Map((progress ?? []).map((item) => [item.user_id, item]));

    const leaderboard = top.map(([userId, stats], index) => {
      const profile = profileMap.get(userId);
      const userProgress = progressMap.get(userId);
      return {
        rank: index + 1,
        userId,
        username: profile?.username ?? null,
        displayName: profile?.display_name ?? profile?.username ?? "FootBattle Oyuncusu",
        avatarUrl: profile?.avatar_url ?? null,
        score: stats.score,
        gamesPlayed: stats.gamesPlayed,
        gamesWon: stats.gamesWon,
        xp: Number(userProgress?.xp ?? 0),
        level: Number(userProgress?.level ?? 1),
        currentStreak: Number(userProgress?.current_streak ?? profile?.current_streak ?? 0),
        bestStreak: Number(userProgress?.best_streak ?? profile?.best_streak ?? 0),
      };
    });

    return NextResponse.json({ ok: true, type: game, period, weekStart, leaderboard });
  } catch (error) {
    console.error("Leaderboard endpoint hatası:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Leaderboard yüklenemedi." },
      { status: 500 },
    );
  }
}
