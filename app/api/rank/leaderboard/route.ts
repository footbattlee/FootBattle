import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getRankForLp } from "@/lib/rank-system";

export async function GET() {
  try {
    const { data: season, error: seasonError } = await supabaseAdmin
      .from("rank_seasons").select("id, code, title, starts_at, ends_at")
      .eq("is_active", true).order("starts_at", { ascending: false }).limit(1).maybeSingle();
    if (seasonError) throw seasonError;
    if (!season) return NextResponse.json({ ok: true, season: null, leaderboard: [], me: null });

    const { data: rows, error } = await supabaseAdmin
      .from("user_rank_progress")
      .select("user_id, elo, peak_elo, rank_code, wins, losses, games_played")
      .eq("season_id", season.id).order("elo", { ascending: false }).order("wins", { ascending: false }).limit(100);
    if (error) throw error;

    const ids = (rows ?? []).map((r) => r.user_id);
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, username, display_name, avatar_url").in("id", ids)
      : { data: [] as Array<{ id: string; username: string | null; display_name: string | null; avatar_url: string | null }> };
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

    const leaderboard = (rows ?? []).map((row, index) => {
      const rank = getRankForLp(Number(row.elo ?? 1000));
      const profile = profileMap.get(row.user_id);
      return {
        position: index + 1, userId: row.user_id,
        username: profile?.username ?? null,
        displayName: profile?.display_name ?? profile?.username ?? "FootBattle Oyuncusu",
        avatarUrl: profile?.avatar_url ?? null,
        lp: rank.lp, elo: rank.lp, peakLp: Number(row.peak_elo ?? 1000), peakElo: Number(row.peak_elo ?? 1000), rankCode: rank.code, rankName: rank.name, rankIcon: rank.icon,
        wins: Number(row.wins ?? 0), losses: Number(row.losses ?? 0), gamesPlayed: Number(row.games_played ?? 0),
        progressPercent: rank.progressPercent, nextRankName: rank.next?.name ?? null, nextRankLp: rank.next?.minLp ?? null,
      };
    });

    const auth = await createAuthServerClient();
    const { data: { user } } = await auth.auth.getUser();
    let me = null;
    if (user) {
      const found = leaderboard.find((item) => item.userId === user.id);
      if (found) me = found;
      else {
        const { data: mine } = await supabaseAdmin.from("user_rank_progress")
          .select("elo, peak_elo, rank_code, wins, losses, games_played")
          .eq("user_id", user.id).eq("season_id", season.id).maybeSingle();
        if (mine) {
          const rank = getRankForLp(Number(mine.elo ?? 1000));
          me = { position: null, userId: user.id, lp: rank.lp, elo: rank.lp, peakLp: Number(mine.peak_elo ?? 1000), peakElo: Number(mine.peak_elo ?? 1000), rankCode: rank.code, rankName: rank.name, rankIcon: rank.icon, wins: Number(mine.wins ?? 0), losses: Number(mine.losses ?? 0), gamesPlayed: Number(mine.games_played ?? 0), progressPercent: rank.progressPercent, nextRankName: rank.next?.name ?? null, nextRankLp: rank.next?.minLp ?? null };
        }
      }
    }

    return NextResponse.json({ ok: true, season, leaderboard, me });
  } catch (error) {
    console.error("Rank leaderboard hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Rank sıralaması yüklenemedi." }, { status: 500 });
  }
}
