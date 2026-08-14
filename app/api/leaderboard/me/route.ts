import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
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
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month, day] = dateKey.split("-").map(Number);
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
    const auth = await createAuthServerClient();
    const {
      data: { user },
    } = await auth.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: true, authenticated: false, me: null });
    }

    const url = new URL(request.url);
    const game = url.searchParams.get("game")?.trim() || "overall";
    const period = url.searchParams.get("period")?.trim() || "week";

    if (game !== "overall" && !VALID_GAME_CODES.has(game)) {
      return NextResponse.json({ ok: false, error: "Geçersiz oyun." }, { status: 400 });
    }
    if (period !== "week" && period !== "all") {
      return NextResponse.json({ ok: false, error: "Geçersiz periyot." }, { status: 400 });
    }

    let query = supabaseAdmin
      .from("game_results")
      .select("user_id, score, won, created_at")
      .not("user_id", "is", null);

    if (game !== "overall") query = query.eq("game_code", game);
    if (period === "week") query = query.gte("created_at", getTurkeyWeekStart());

    const { data, error } = await query;
    if (error) throw error;

    const totals = new Map<string, { score: number; games: number; wins: number }>();
    for (const row of data ?? []) {
      if (!row.user_id) continue;
      const current = totals.get(row.user_id) ?? { score: 0, games: 0, wins: 0 };
      current.score += Number(row.score ?? 0);
      current.games += 1;
      if (row.won) current.wins += 1;
      totals.set(row.user_id, current);
    }

    const ranked = [...totals.entries()].sort((a, b) => {
      if (b[1].score !== a[1].score) return b[1].score - a[1].score;
      if (b[1].wins !== a[1].wins) return b[1].wins - a[1].wins;
      return a[1].games - b[1].games;
    });

    const index = ranked.findIndex(([id]) => id === user.id);
    const stats = index >= 0 ? ranked[index][1] : { score: 0, games: 0, wins: 0 };

    const [{ data: profile }, { data: progress }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("user_progress")
        .select("xp, level, current_streak")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      ok: true,
      authenticated: true,
      me: {
        rank: index >= 0 ? index + 1 : null,
        totalPlayers: ranked.length,
        score: stats.score,
        gamesPlayed: stats.games,
        gamesWon: stats.wins,
        username: profile?.username ?? null,
        displayName: profile?.display_name ?? profile?.username ?? "Sen",
        avatarUrl: profile?.avatar_url ?? null,
        xp: Number(progress?.xp ?? 0),
        level: Number(progress?.level ?? 1),
        currentStreak: Number(progress?.current_streak ?? 0),
      },
    });
  } catch (error) {
    console.error("Leaderboard me endpoint hatası:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Sıralaman yüklenemedi." },
      { status: 500 },
    );
  }
}
