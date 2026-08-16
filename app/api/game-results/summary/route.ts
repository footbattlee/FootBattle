import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getRankByCode, getRankForLp } from "@/lib/rank-system";

const VALID_GAMES = new Set([
  "wordle", "guess_the_player", "player_quiz", "transfer_quiz",
  "tic_tac_toe", "club_nation", "club_clash", "career_path",
]);

function levelFloorXp(level: number) { return 250 * Math.pow(Math.max(0, level - 1), 2); }
function nextLevelXp(level: number) { return 250 * Math.pow(Math.max(1, level), 2); }
function xpForResult(score: number, won: boolean) {
  return 40 + (Math.min(160, Math.max(0, Math.floor(score)) / 3) | 0) + (won ? 60 : 0);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const game = url.searchParams.get("game")?.trim() ?? "";
    const sourceSessionId = url.searchParams.get("session")?.trim() ?? "";
    if (!VALID_GAMES.has(game) || !sourceSessionId) {
      return NextResponse.json({ ok: false, error: "Geçersiz oyun sonucu isteği." }, { status: 400 });
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("game_sessions")
      .select("id, game_code, source_session_id, user_id, status, server_score, won, duration_ms, finished_at, score_blocked")
      .eq("game_code", game).eq("source_session_id", sourceSessionId)
      .eq("status", "finished").eq("score_blocked", false).maybeSingle();
    if (sessionError) throw sessionError;
    if (!session) return NextResponse.json({ ok: true, ready: false });

    const finishedAt = session.finished_at ? new Date(session.finished_at) : new Date();
    const since = new Date(finishedAt.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: peerRows, error: peerError } = await supabaseAdmin
      .from("game_sessions").select("server_score").eq("game_code", game)
      .eq("status", "finished").eq("score_blocked", false)
      .not("server_score", "is", null).gte("finished_at", since).limit(1000);
    if (peerError) throw peerError;

    const peerScores = (peerRows ?? []).map((row) => Number(row.server_score ?? 0)).filter(Number.isFinite);
    const score = Math.max(0, Number(session.server_score ?? 0));
    const averageScore = peerScores.length ? Math.round(peerScores.reduce((a, b) => a + b, 0) / peerScores.length) : score;
    const percentile = peerScores.length ? Math.round((peerScores.filter((v) => v <= score).length / peerScores.length) * 100) : 100;
    const topPercent = Math.max(1, Math.min(100, 101 - percentile));

    const auth = await createAuthServerClient();
    const { data: { user } } = await auth.auth.getUser();
    let profile: { display_name?: string | null; username?: string | null } | null = null;
    let progression: Record<string, unknown> | null = null;
    let rank: Record<string, unknown> | null = null;
    let recentAchievements: Array<Record<string, unknown>> = [];

    if (user) {
      const [{ data: profileRow }, { data: progressRow }, { data: unlockedRows }, { data: season }, { data: history }] = await Promise.all([
        supabaseAdmin.from("profiles").select("display_name, username").eq("id", user.id).maybeSingle(),
        supabaseAdmin.from("user_progress").select("xp, level, current_streak, best_streak").eq("user_id", user.id).maybeSingle(),
        supabaseAdmin.from("user_achievements").select("achievement_code, unlocked_at").eq("user_id", user.id)
          .gte("unlocked_at", new Date(finishedAt.getTime() - 10_000).toISOString()).order("unlocked_at", { ascending: false }).limit(3),
        supabaseAdmin.from("rank_seasons").select("id, title").eq("is_active", true).order("starts_at", { ascending: false }).limit(1).maybeSingle(),
        supabaseAdmin.from("rank_history").select("lp_before, lp_change, lp_after, rank_before, rank_after")
          .eq("user_id", user.id).eq("game_session_id", session.id).maybeSingle(),
      ]);
      profile = profileRow;

      if (progressRow) {
        const level = Math.max(1, Number(progressRow.level ?? 1));
        const xp = Math.max(0, Number(progressRow.xp ?? 0));
        const floor = levelFloorXp(level);
        const next = nextLevelXp(level);
        progression = {
          xp, level, xpIntoLevel: Math.max(0, xp - floor), xpNeededForLevel: Math.max(1, next - floor),
          currentStreak: Number(progressRow.current_streak ?? 0), bestStreak: Number(progressRow.best_streak ?? 0),
          xpEarned: xpForResult(score, Boolean(session.won)),
        };
      }

      if (season) {
        const { data: rankRow } = await supabaseAdmin.from("user_rank_progress")
          .select("lp, peak_lp, rank_code, wins, losses, games_played")
          .eq("user_id", user.id).eq("season_id", season.id).maybeSingle();
        if (rankRow) {
          const current = getRankForLp(Number(rankRow.lp ?? 0));
          const before = history ? getRankByCode(history.rank_before) : current;
          const after = history ? getRankByCode(history.rank_after) : current;
          rank = {
            seasonTitle: season.title, lp: current.lp, peakLp: Number(rankRow.peak_lp ?? 0), rankCode: current.code,
            rankName: current.name, icon: current.icon, progressPercent: current.progressPercent,
            nextRankName: current.next?.name ?? null, nextRankLp: current.next?.minLp ?? null,
            lpChange: Number(history?.lp_change ?? 0), rankBefore: before.name, rankAfter: after.name,
            promoted: Boolean(history && history.rank_before !== history.rank_after && Number(history.lp_change) > 0),
            demoted: Boolean(history && history.rank_before !== history.rank_after && Number(history.lp_change) < 0),
          };
        }
      }

      const achievementCodes = (unlockedRows ?? []).map((row) => row.achievement_code);
      if (achievementCodes.length) {
        const { data: definitions } = await supabaseAdmin.from("achievement_definitions").select("code, title, icon").in("code", achievementCodes);
        recentAchievements = definitions ?? [];
      }
    }

    return NextResponse.json({
      ok: true, ready: true,
      result: { game, sourceSessionId, score, won: Boolean(session.won), durationMs: Number(session.duration_ms ?? 0), finishedAt: session.finished_at, averageScore, percentile, topPercent, sampleSize: peerScores.length },
      authenticated: Boolean(user), playerName: profile?.display_name ?? profile?.username ?? null,
      progression, rank, recentAchievements,
    });
  } catch (error) {
    console.error("Game result summary endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Oyun sonucu hazırlanamadı." }, { status: 500 });
  }
}
