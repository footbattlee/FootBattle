import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import { supabaseAdmin } from "@/lib/supabase/server";

type RangeKey = "today" | "7d" | "30d" | "all";

type AnalyticsRow = {
  event_name: string;
  game_name: string | null;
  session_id: string | null;
  created_at: string;
};

function getStartDate(range: RangeKey) {
  const now = new Date();

  if (range === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  }

  if (range === "7d" || range === "30d") {
    const start = new Date(now);
    start.setDate(start.getDate() - (range === "7d" ? 7 : 30));
    return start.toISOString();
  }

  return null;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status });
  }

  try {
    const rawRange = request.nextUrl.searchParams.get("range");
    const range: RangeKey = rawRange === "today" || rawRange === "30d" || rawRange === "all" ? rawRange : "7d";
    const startDate = getStartDate(range);

    let query = supabaseAdmin
      .from("analytics_events")
      .select("event_name, game_name, session_id, created_at")
      .order("created_at", { ascending: true });

    if (startDate) query = query.gte("created_at", startDate);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as AnalyticsRow[];
    const summary = {
      totalStarted: 0,
      totalCompleted: 0,
      totalPlayAgain: 0,
      totalShared: 0,
      totalAbandoned: 0,
      averageDurationSeconds: 0,
    };

    const gameMap = new Map<
      string,
      {
        gameName: string;
        started: number;
        completed: number;
        playAgain: number;
        shared: number;
        durations: number[];
      }
    >();

    // A session can play the same game multiple times. Keep unmatched starts in FIFO order.
    const unmatchedStarts = new Map<string, number[]>();
    const allDurations: number[] = [];

    for (const row of rows) {
      const gameName = row.game_name ?? "unknown";
      if (!gameMap.has(gameName)) {
        gameMap.set(gameName, {
          gameName,
          started: 0,
          completed: 0,
          playAgain: 0,
          shared: 0,
          durations: [],
        });
      }

      const game = gameMap.get(gameName)!;
      const eventTime = new Date(row.created_at).getTime();
      const sessionKey = `${row.session_id ?? "anonymous"}::${gameName}`;

      switch (row.event_name) {
        case "game_started": {
          game.started += 1;
          summary.totalStarted += 1;
          const queue = unmatchedStarts.get(sessionKey) ?? [];
          queue.push(eventTime);
          unmatchedStarts.set(sessionKey, queue);
          break;
        }
        case "game_completed": {
          game.completed += 1;
          summary.totalCompleted += 1;
          const queue = unmatchedStarts.get(sessionKey) ?? [];
          const startedAt = queue.shift();
          unmatchedStarts.set(sessionKey, queue);
          if (startedAt) {
            const durationSeconds = Math.round((eventTime - startedAt) / 1000);
            // Ignore stale/background-session pairings.
            if (durationSeconds >= 1 && durationSeconds <= 3600) {
              game.durations.push(durationSeconds);
              allDurations.push(durationSeconds);
            }
          }
          break;
        }
        case "play_again":
          game.playAgain += 1;
          summary.totalPlayAgain += 1;
          break;
        case "shared":
        case "game_shared":
          game.shared += 1;
          summary.totalShared += 1;
          break;
      }
    }

    const games = Array.from(gameMap.values())
      .map((game) => {
        const abandoned = Math.max(0, game.started - game.completed);
        return {
          gameName: game.gameName,
          started: game.started,
          completed: game.completed,
          abandoned,
          playAgain: game.playAgain,
          shared: game.shared,
          completionRate: game.started > 0 ? Number(((game.completed / game.started) * 100).toFixed(1)) : 0,
          averageDurationSeconds: average(game.durations),
        };
      })
      .sort((a, b) => b.started - a.started);

    summary.totalAbandoned = Math.max(0, summary.totalStarted - summary.totalCompleted);
    summary.averageDurationSeconds = average(allDurations);

    let setsQuery = supabaseAdmin
      .from("survivor_sets")
      .select("id, slug, title, title_tr, is_active")
      .order("created_at", { ascending: false });
    const { data: sets, error: setsError } = await setsQuery;
    if (setsError) throw setsError;

    const setIds = (sets ?? []).map((set) => set.id);
    let resultsQuery = supabaseAdmin
      .from("survivor_results")
      .select("set_id, created_at")
      .in("set_id", setIds.length ? setIds : ["00000000-0000-0000-0000-000000000000"]);
    if (startDate) resultsQuery = resultsQuery.gte("created_at", startDate);
    const { data: survivorResults, error: survivorError } = await resultsQuery;
    if (survivorError) throw survivorError;

    const survivorCounts = new Map<string, number>();
    for (const result of survivorResults ?? []) {
      survivorCounts.set(result.set_id, (survivorCounts.get(result.set_id) ?? 0) + 1);
    }

    const survivors = (sets ?? [])
      .map((set) => ({
        id: set.id,
        slug: set.slug,
        title: set.title_tr || set.title,
        isActive: set.is_active,
        completions: survivorCounts.get(set.id) ?? 0,
      }))
      .sort((a, b) => b.completions - a.completions);

    return NextResponse.json({ ok: true, range, summary, games, survivors });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Analytics verileri alınamadı." },
      { status: 500 },
    );
  }
}
