import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

const VALID_GAME_CODES = new Set([
  "wordle",
  "guess_the_player",
  "player_quiz",
  "career_path",
]);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const game =
      url.searchParams.get("game")?.trim() || "overall";

    const limitParam = Number(
      url.searchParams.get("limit") ?? "10",
    );

    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 100)
      : 10;

    if (
      game !== "overall" &&
      !VALID_GAME_CODES.has(game)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Geçersiz leaderboard türü.",
        },
        { status: 400 },
      );
    }

    if (game === "overall") {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select(`
          id,
          username,
          display_name,
          avatar_url,
          total_score,
          games_played,
          games_won,
          current_streak,
          best_streak
        `)
        .not("username", "is", null)
        .order("total_score", {
          ascending: false,
        })
        .order("games_won", {
          ascending: false,
        })
        .limit(limit);

      if (error) {
        throw error;
      }

      const leaderboard = (data ?? []).map(
        (profile, index) => ({
          rank: index + 1,
          userId: profile.id,
          username: profile.username,
          displayName:
            profile.display_name ??
            profile.username ??
            "FootBattle Oyuncusu",
          avatarUrl: profile.avatar_url ?? null,
          score: Number(profile.total_score ?? 0),
          gamesPlayed: Number(
            profile.games_played ?? 0,
          ),
          gamesWon: Number(
            profile.games_won ?? 0,
          ),
          currentStreak: Number(
            profile.current_streak ?? 0,
          ),
          bestStreak: Number(
            profile.best_streak ?? 0,
          ),
        }),
      );

      return NextResponse.json({
        ok: true,
        type: "overall",
        leaderboard,
      });
    }

    const { data: results, error: resultsError } =
      await supabaseAdmin
        .from("game_results")
        .select(`
          user_id,
          score,
          won
        `)
        .eq("game_code", game);

    if (resultsError) {
      throw resultsError;
    }

    const totals = new Map<
      string,
      {
        score: number;
        gamesPlayed: number;
        gamesWon: number;
      }
    >();

    for (const result of results ?? []) {
      const userId = result.user_id;

      if (!userId) {
        continue;
      }

      const current = totals.get(userId) ?? {
        score: 0,
        gamesPlayed: 0,
        gamesWon: 0,
      };

      current.score += Number(result.score ?? 0);
      current.gamesPlayed += 1;

      if (result.won) {
        current.gamesWon += 1;
      }

      totals.set(userId, current);
    }

    const rankedUserIds = [...totals.entries()]
      .sort((a, b) => {
        if (b[1].score !== a[1].score) {
          return b[1].score - a[1].score;
        }

        if (
          b[1].gamesWon !== a[1].gamesWon
        ) {
          return (
            b[1].gamesWon -
            a[1].gamesWon
          );
        }

        return (
          a[1].gamesPlayed -
          b[1].gamesPlayed
        );
      })
      .slice(0, limit);

    const userIds = rankedUserIds.map(
      ([userId]) => userId,
    );

    if (userIds.length === 0) {
      return NextResponse.json({
        ok: true,
        type: game,
        leaderboard: [],
      });
    }

    const { data: profiles, error: profilesError } =
      await supabaseAdmin
        .from("profiles")
        .select(`
          id,
          username,
          display_name,
          avatar_url
        `)
        .in("id", userIds);

    if (profilesError) {
      throw profilesError;
    }

    const profileMap = new Map(
      (profiles ?? []).map((profile) => [
        profile.id,
        profile,
      ]),
    );

    const leaderboard = rankedUserIds.map(
      ([userId, stats], index) => {
        const profile =
          profileMap.get(userId);

        return {
          rank: index + 1,
          userId,
          username:
            profile?.username ?? null,
          displayName:
            profile?.display_name ??
            profile?.username ??
            "FootBattle Oyuncusu",
          avatarUrl:
            profile?.avatar_url ?? null,
          score: stats.score,
          gamesPlayed:
            stats.gamesPlayed,
          gamesWon:
            stats.gamesWon,
        };
      },
    );

    return NextResponse.json({
      ok: true,
      type: game,
      leaderboard,
    });
  } catch (error) {
    console.error(
      "Leaderboard endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Leaderboard yüklenemedi.",
      },
      { status: 500 },
    );
  }
}