import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import { supabaseAdmin } from "@/lib/supabase/server";

type RangeKey = "today" | "7d" | "30d" | "all";
type AnalyticsRow = {
  event_name: string;
  game_name: string | null;
  user_id: string | null;
  session_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};
type SoloSessionRow = {
  id: string;
  source_session_id: string | null;
  user_id: string | null;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
};
type ProfileRow = { id: string; created_at: string };

const PAGE_SIZE = 1000;
const ABANDON_AFTER_MS = 30 * 60 * 1000;
const SOLO_GAME_NAMES = new Set([
  "wordle",
  "guess_the_player",
  "super_lig_guess_the_player",
  "player_quiz",
  "transfer_quiz",
  "tic_tac_toe",
  "club_nation",
  "club_clash",
  "career_path",
  "shooter",
]);

function getStartDate(range: RangeKey) {
  const now = new Date();
  if (range === "today") {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Istanbul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
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
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}
function dayKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
function visitorIdOf(metadata: Record<string, unknown> | null) {
  const value = metadata?.visitor_id;
  return typeof value === "string" && value.length >= 8 ? value : null;
}
function platformOf(metadata: Record<string, unknown> | null) {
  const value = metadata?.platform;
  return value === "android" ? "android" : value === "web" ? "web" : "unknown";
}
function durationMsOf(metadata: Record<string, unknown> | null) {
  const value = metadata?.duration_ms;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

async function fetchAll(table: string, select: string, startDate?: string | null, dateColumn = "created_at") {
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabaseAdmin.from(table).select(select).order(dateColumn, { ascending: true }).range(from, from + PAGE_SIZE - 1);
    if (startDate) query = query.gte(dateColumn, startDate);
    const { data, error } = await query;
    if (error) throw error;
    const batch = (data ?? []) as unknown[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status });

  try {
    const rawRange = request.nextUrl.searchParams.get("range");
    const range: RangeKey = rawRange === "today" || rawRange === "30d" || rawRange === "all" ? rawRange : "7d";
    const startDate = getStartDate(range);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const { error: reconcileError } = await supabaseAdmin.rpc("reconcile_solo_session_lifecycle");
    if (reconcileError) console.error("Solo lifecycle reconcile failed:", reconcileError);

    const [analyticsRows, soloRows] = await Promise.all([
      fetchAll("analytics_events", "event_name,game_name,user_id,session_id,created_at,metadata", startDate) as Promise<AnalyticsRow[]>,
      fetchAll("game_sessions", "id,source_session_id,user_id,status,started_at,finished_at,duration_ms", startDate, "started_at") as Promise<SoloSessionRow[]>,
    ]);

    const nativeBySession = new Map<string, SoloSessionRow>();
    for (const row of soloRows) {
      nativeBySession.set(row.id, row);
      if (row.source_session_id) nativeBySession.set(row.source_session_id, row);
    }

    const starts = new Map<string, AnalyticsRow>();
    const completions = new Map<string, AnalyticsRow>();
    const replayKeys = new Set<string>();
    const replayByGame = new Map<string, number>();
    const sharedByGame = new Map<string, number>();
    const selectedUsers = new Set<string>();
    const selectedAnonymousVisitors = new Set<string>();
    const dailyUsers = new Map<string, Set<string>>();
    const platforms = { web: 0, android: 0, unknown: 0 };

    for (const row of analyticsRows) {
      const gameName = row.game_name ?? "unknown";
      if (!SOLO_GAME_NAMES.has(gameName)) continue;

      if (row.user_id) {
        selectedUsers.add(row.user_id);
        const key = dayKey(row.created_at);
        const daily = dailyUsers.get(key) ?? new Set<string>();
        daily.add(row.user_id);
        dailyUsers.set(key, daily);
      }

      const visitorId = visitorIdOf(row.metadata);
      if (!row.user_id && visitorId) selectedAnonymousVisitors.add(visitorId);

      if (row.event_name === "game_started" && row.session_id) {
        const key = `${gameName}:${row.session_id}`;
        if (!starts.has(key)) {
          starts.set(key, row);
          platforms[platformOf(row.metadata)] += 1;
        }
      } else if (row.event_name === "game_completed" && row.session_id) {
        completions.set(`${gameName}:${row.session_id}`, row);
      } else if (row.event_name === "play_again" && row.session_id) {
        const key = `${gameName}:${row.session_id}`;
        if (!replayKeys.has(key)) {
          replayKeys.add(key);
          replayByGame.set(gameName, (replayByGame.get(gameName) ?? 0) + 1);
        }
      } else if (row.event_name === "shared" || row.event_name === "game_shared") {
        sharedByGame.set(gameName, (sharedByGame.get(gameName) ?? 0) + 1);
      }
    }

    type GameBucket = {
      gameName: string;
      started: number;
      completed: number;
      abandoned: number;
      inProgress: number;
      durations: number[];
      users: Set<string>;
      anonymousVisitors: Set<string>;
    };
    const gameMap = new Map<string, GameBucket>();
    const ensureGame = (gameName: string) => {
      if (!gameMap.has(gameName)) {
        gameMap.set(gameName, {
          gameName,
          started: 0,
          completed: 0,
          abandoned: 0,
          inProgress: 0,
          durations: [],
          users: new Set<string>(),
          anonymousVisitors: new Set<string>(),
        });
      }
      return gameMap.get(gameName)!;
    };

    const nowMs = Date.now();
    for (const [key, startRow] of starts) {
      const gameName = startRow.game_name!;
      const sessionId = startRow.session_id!;
      const game = ensureGame(gameName);
      game.started += 1;

      const visitorId = visitorIdOf(startRow.metadata);
      if (startRow.user_id) game.users.add(startRow.user_id);
      else if (visitorId) game.anonymousVisitors.add(visitorId);

      const completion = completions.get(key);
      const native = nativeBySession.get(sessionId);
      const nativeCompleted = native?.status === "finished" || native?.status === "rejected";
      const completed = Boolean(completion) || nativeCompleted;

      if (completed) {
        game.completed += 1;
        const explicitDuration = completion ? durationMsOf(completion.metadata) : null;
        const nativeDuration = Number(native?.duration_ms ?? 0);
        const measuredDuration = completion
          ? new Date(completion.created_at).getTime() - new Date(startRow.created_at).getTime()
          : native?.finished_at
            ? new Date(native.finished_at).getTime() - new Date(startRow.created_at).getTime()
            : 0;
        const durationMs = explicitDuration ?? (nativeDuration > 0 ? nativeDuration : measuredDuration);
        const seconds = Math.round(durationMs / 1000);
        if (seconds >= 1 && seconds <= 3600) game.durations.push(seconds);
        continue;
      }

      const oldEnough = nowMs - new Date(startRow.created_at).getTime() >= ABANDON_AFTER_MS;
      if (native?.status === "abandoned" || oldEnough) game.abandoned += 1;
      else game.inProgress += 1;
    }

    for (const gameName of new Set([...replayByGame.keys(), ...sharedByGame.keys()])) ensureGame(gameName);

    const games = Array.from(gameMap.values())
      .map((game) => ({
        gameName: game.gameName,
        started: game.started,
        completed: game.completed,
        abandoned: game.abandoned,
        inProgress: game.inProgress,
        playAgain: replayByGame.get(game.gameName) ?? 0,
        shared: sharedByGame.get(game.gameName) ?? 0,
        uniqueUsers: game.users.size,
        loggedInUsers: game.users.size,
        anonymousVisitors: game.anonymousVisitors.size,
        completionRate: game.started ? Number(((game.completed / game.started) * 100).toFixed(1)) : 0,
        averageDurationSeconds: average(game.durations),
      }))
      .filter((game) => game.started || game.playAgain || game.shared)
      .sort((a, b) => b.started - a.started);

    const summary = {
      totalStarted: games.reduce((sum, game) => sum + game.started, 0),
      totalCompleted: games.reduce((sum, game) => sum + game.completed, 0),
      totalAbandoned: games.reduce((sum, game) => sum + game.abandoned, 0),
      totalInProgress: games.reduce((sum, game) => sum + game.inProgress, 0),
      totalPlayAgain: games.reduce((sum, game) => sum + game.playAgain, 0),
      totalShared: games.reduce((sum, game) => sum + game.shared, 0),
      averageDurationSeconds: average(games.flatMap((game) => gameMap.get(game.gameName)?.durations ?? [])),
    };

    const wauRows = (await fetchAll("analytics_events", "user_id,created_at", sevenDaysAgo)) as Array<{ user_id: string | null; created_at: string }>;
    const wau = new Set(wauRows.map((row) => row.user_id).filter(Boolean)).size;
    const today = dayKey(new Date().toISOString());
    const dau = dailyUsers.get(today)?.size ?? new Set(wauRows.filter((row) => dayKey(row.created_at) === today).map((row) => row.user_id).filter(Boolean)).size;
    const profileRows = (await fetchAll("profiles", "id,created_at", startDate)) as ProfileRow[];

    return NextResponse.json({
      ok: true,
      source: "event_based_game_started",
      range,
      summary,
      audience: {
        dau,
        wau,
        uniquePlayers: selectedUsers.size,
        anonymousPlayers: selectedAnonymousVisitors.size,
        newUsers: profileRows.length,
        platforms,
      },
      games,
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    return NextResponse.json({ ok: false, error: "Analytics verileri hazırlanamadı." }, { status: 500 });
  }
}
