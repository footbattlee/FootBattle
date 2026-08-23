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

type DuelRow = {
  id: number;
  challenger_id: string;
  opponent_id: string;
  game_code: string;
  status: string;
  created_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string | null;
};

const ABANDON_AFTER_MS = 15 * 60 * 1000;
const PAGE_SIZE = 1000;

function getStartDate(range: RangeKey) {
  const now = new Date();

  if (range === "today") {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (year && month && day) return new Date(`${year}-${month}-${day}T00:00:00+03:00`).toISOString();
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

function inRange(value: string | null | undefined, startDate: string | null) {
  if (!value) return false;
  if (!startDate) return true;
  return new Date(value).getTime() >= new Date(startDate).getTime();
}

async function fetchAllAnalyticsRows(startDate: string | null) {
  const rows: AnalyticsRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabaseAdmin
      .from("analytics_events")
      .select("event_name, game_name, session_id, created_at")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (startDate) query = query.gte("created_at", startDate);
    const { data, error } = await query;
    if (error) throw error;
    const batch = (data ?? []) as AnalyticsRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
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

    const rows = await fetchAllAnalyticsRows(startDate);
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

    const cutoff = Date.now() - ABANDON_AFTER_MS;
    const abandonedByGame = new Map<string, number>();
    for (const [sessionKey, starts] of unmatchedStarts.entries()) {
      const separatorIndex = sessionKey.lastIndexOf("::");
      const gameName = separatorIndex >= 0 ? sessionKey.slice(separatorIndex + 2) : "unknown";
      const staleCount = starts.filter((startedAt) => startedAt <= cutoff).length;
      if (staleCount > 0) {
        abandonedByGame.set(gameName, (abandonedByGame.get(gameName) ?? 0) + staleCount);
      }
    }

    const games = Array.from(gameMap.values())
      .map((game) => {
        const abandoned = abandonedByGame.get(game.gameName) ?? 0;
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
      .filter((game) => game.started > 0 || game.completed > 0 || game.playAgain > 0 || game.shared > 0)
      .sort((a, b) => b.started - a.started);

    summary.totalAbandoned = Array.from(abandonedByGame.values()).reduce((sum, value) => sum + value, 0);
    summary.averageDurationSeconds = average(allDurations);

    const { data: duelData, error: duelError } = await supabaseAdmin
      .from("duels")
      .select("id,challenger_id,opponent_id,game_code,status,created_at,accepted_at,started_at,completed_at,updated_at");
    if (duelError) throw duelError;

    const duelRows = (duelData ?? []) as DuelRow[];
    const duelParticipants = new Set<string>();
    const duelGameMap = new Map<string, { gameCode: string; created: number; accepted: number; started: number; completed: number; rejected: number; cancelled: number }>();
    const duelSummary = {
      created: 0,
      accepted: 0,
      started: 0,
      completed: 0,
      rejected: 0,
      cancelled: 0,
      uniquePlayers: 0,
    };

    for (const duel of duelRows) {
      if (!duelGameMap.has(duel.game_code)) {
        duelGameMap.set(duel.game_code, {
          gameCode: duel.game_code,
          created: 0,
          accepted: 0,
          started: 0,
          completed: 0,
          rejected: 0,
          cancelled: 0,
        });
      }
      const game = duelGameMap.get(duel.game_code)!;
      const touchedInRange =
        inRange(duel.created_at, startDate) ||
        inRange(duel.accepted_at, startDate) ||
        inRange(duel.started_at, startDate) ||
        inRange(duel.completed_at, startDate) ||
        ((duel.status === "rejected" || duel.status === "cancelled") && inRange(duel.updated_at, startDate));

      if (touchedInRange) {
        duelParticipants.add(duel.challenger_id);
        duelParticipants.add(duel.opponent_id);
      }
      if (inRange(duel.created_at, startDate)) {
        duelSummary.created += 1;
        game.created += 1;
      }
      if (inRange(duel.accepted_at, startDate)) {
        duelSummary.accepted += 1;
        game.accepted += 1;
      }
      if (inRange(duel.started_at, startDate)) {
        duelSummary.started += 1;
        game.started += 1;
      }
      if (inRange(duel.completed_at, startDate)) {
        duelSummary.completed += 1;
        game.completed += 1;
      }
      if (duel.status === "rejected" && inRange(duel.updated_at, startDate)) {
        duelSummary.rejected += 1;
        game.rejected += 1;
      }
      if (duel.status === "cancelled" && inRange(duel.updated_at, startDate)) {
        duelSummary.cancelled += 1;
        game.cancelled += 1;
      }
    }
    duelSummary.uniquePlayers = duelParticipants.size;
    const duelGames = Array.from(duelGameMap.values())
      .filter((game) => game.created || game.accepted || game.started || game.completed || game.rejected || game.cancelled)
      .sort((a, b) => b.created - a.created);

    const { data: sets, error: setsError } = await supabaseAdmin
      .from("survivor_sets")
      .select("id, slug, title, title_tr, is_active")
      .order("created_at", { ascending: false });
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

    return NextResponse.json({ ok: true, range, summary, games, duelSummary, duelGames, survivors });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Analytics verileri alınamadı." },
      { status: 500 },
    );
  }
}
