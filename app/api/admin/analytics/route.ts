import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import { supabaseAdmin } from "@/lib/supabase/server";

type RangeKey = "today" | "7d" | "30d" | "all";
type AnalyticsRow = { event_name: string; game_name: string | null; user_id: string | null; session_id: string | null; created_at: string; metadata: Record<string, unknown> | null };
type SoloSessionRow = { id: string; game_code: string; source_session_id: string | null; user_id: string | null; mode: string; status: string; started_at: string; finished_at: string | null; duration_ms: number | null };
type DuelRow = { id: number; challenger_id: string; opponent_id: string; game_code: string; status: string; created_at: string; accepted_at: string | null; started_at: string | null; completed_at: string | null; updated_at: string | null };
type ProfileRow = { id: string; created_at: string };

const ABANDON_AFTER_MS = 30 * 60 * 1000;
const PAGE_SIZE = 1000;
const EVENT_ONLY_GAMES = new Set(["shooter"]);
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
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
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
function average(values: number[]) { return values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0; }
function inRange(value: string | null | undefined, startDate: string | null) { return Boolean(value && (!startDate || new Date(value).getTime() >= new Date(startDate).getTime())); }
function dayKey(value: string) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value)); }
function platformOf(metadata: Record<string, unknown> | null) { const p = metadata?.platform; return p === "android" ? "android" : p === "web" ? "web" : "unknown"; }
function visitorIdOf(metadata: Record<string, unknown> | null) { const id = metadata?.visitor_id; return typeof id === "string" && id.length >= 8 ? id : null; }
function durationMsOf(metadata: Record<string, unknown> | null) { const value = metadata?.duration_ms; return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null; }

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
      fetchAll("game_sessions", "id,game_code,source_session_id,user_id,mode,status,started_at,finished_at,duration_ms", startDate, "started_at") as Promise<SoloSessionRow[]>,
    ]);

    const sessionGameName = new Map<string, string>();
    const sessionIdentity = new Map<string, { userId: string | null; visitorId: string | null }>();
    const completedEventBySession = new Map<string, AnalyticsRow>();
    const sharedByGame = new Map<string, number>();
    const playAgainRows: AnalyticsRow[] = [];
    const eventOnlyStarts: AnalyticsRow[] = [];
    const platforms = { web: 0, android: 0, unknown: 0 };
    const selectedUsers = new Set<string>();
    const selectedAnonymousVisitors = new Set<string>();
    const dailyUsers = new Map<string, Set<string>>();

    for (const row of analyticsRows) {
      const gameName = row.game_name ?? "unknown";
      const visitorId = visitorIdOf(row.metadata);
      if (row.event_name === "game_started") {
        platforms[platformOf(row.metadata)] += 1;
        if (row.session_id && SOLO_GAME_NAMES.has(gameName)) {
          sessionGameName.set(row.session_id, gameName);
          sessionIdentity.set(row.session_id, { userId: row.user_id, visitorId });
          if (EVENT_ONLY_GAMES.has(gameName)) eventOnlyStarts.push(row);
        }
        if (!row.user_id && visitorId) selectedAnonymousVisitors.add(visitorId);
      }
      if (row.event_name === "game_completed" && row.session_id && SOLO_GAME_NAMES.has(gameName)) {
        completedEventBySession.set(row.session_id, row);
      }
      if (row.user_id) {
        selectedUsers.add(row.user_id);
        const key = dayKey(row.created_at);
        const set = dailyUsers.get(key) ?? new Set<string>();
        set.add(row.user_id);
        dailyUsers.set(key, set);
      }
      if (row.event_name === "play_again") playAgainRows.push(row);
      if (row.event_name === "shared" || row.event_name === "game_shared") {
        sharedByGame.set(gameName, (sharedByGame.get(gameName) ?? 0) + 1);
      }
    }

    const nowMs = Date.now();
    const canonicalSoloSessionGame = new Map<string, string>();
    const gameMap = new Map<string, { gameName: string; started: number; completed: number; abandoned: number; inProgress: number; playAgain: number; shared: number; durations: number[]; users: Set<string>; anonymousVisitors: Set<string> }>();
    const ensureGame = (gameName: string) => {
      if (!gameMap.has(gameName)) {
        gameMap.set(gameName, { gameName, started: 0, completed: 0, abandoned: 0, inProgress: 0, playAgain: 0, shared: sharedByGame.get(gameName) ?? 0, durations: [], users: new Set<string>(), anonymousVisitors: new Set<string>() });
      }
      return gameMap.get(gameName)!;
    };

    for (const row of soloRows) {
      if (row.mode !== "solo") continue;
      const sourceId = row.source_session_id ?? row.id;
      const gameName = sessionGameName.get(sourceId) ?? row.game_code;
      if (!SOLO_GAME_NAMES.has(gameName) || EVENT_ONLY_GAMES.has(gameName)) continue;

      canonicalSoloSessionGame.set(row.id, gameName);
      canonicalSoloSessionGame.set(sourceId, gameName);

      const game = ensureGame(gameName);
      game.started += 1;
      const identity = sessionIdentity.get(sourceId) ?? sessionIdentity.get(row.id);
      const effectiveUserId = row.user_id ?? identity?.userId ?? null;
      if (effectiveUserId) {
        game.users.add(effectiveUserId);
        selectedUsers.add(effectiveUserId);
      } else if (identity?.visitorId) {
        game.anonymousVisitors.add(identity.visitorId);
        selectedAnonymousVisitors.add(identity.visitorId);
      }

      const completionEvent = completedEventBySession.get(sourceId) ?? completedEventBySession.get(row.id);
      const completed = row.status === "finished" || row.status === "rejected" || Boolean(completionEvent);
      const abandoned = !completed && (row.status === "abandoned" || (row.status === "active" && nowMs - new Date(row.started_at).getTime() >= ABANDON_AFTER_MS));
      if (completed) {
        game.completed += 1;
        const recordedDuration = Number(row.duration_ms ?? 0);
        const recoveredDuration = completionEvent ? new Date(completionEvent.created_at).getTime() - new Date(row.started_at).getTime() : 0;
        const seconds = Math.round((recordedDuration > 0 ? recordedDuration : recoveredDuration) / 1000);
        if (seconds >= 1 && seconds <= 3600) game.durations.push(seconds);
      } else if (abandoned) {
        game.abandoned += 1;
      } else {
        game.inProgress += 1;
      }
    }

    const seenEventOnlySessions = new Set<string>();
    for (const startRow of eventOnlyStarts) {
      const sessionId = startRow.session_id;
      const gameName = startRow.game_name ?? "unknown";
      if (!sessionId || seenEventOnlySessions.has(`${gameName}:${sessionId}`)) continue;
      seenEventOnlySessions.add(`${gameName}:${sessionId}`);
      canonicalSoloSessionGame.set(sessionId, gameName);

      const game = ensureGame(gameName);
      game.started += 1;
      const visitorId = visitorIdOf(startRow.metadata);
      if (startRow.user_id) game.users.add(startRow.user_id);
      else if (visitorId) game.anonymousVisitors.add(visitorId);

      const completionEvent = completedEventBySession.get(sessionId);
      if (completionEvent) {
        game.completed += 1;
        const explicitDuration = durationMsOf(completionEvent.metadata);
        const measuredDuration = new Date(completionEvent.created_at).getTime() - new Date(startRow.created_at).getTime();
        const seconds = Math.round((explicitDuration ?? measuredDuration) / 1000);
        if (seconds >= 1 && seconds <= 3600) game.durations.push(seconds);
      } else if (nowMs - new Date(startRow.created_at).getTime() >= ABANDON_AFTER_MS) {
        game.abandoned += 1;
      } else {
        game.inProgress += 1;
      }
    }

    const replaySeen = new Set<string>();
    for (const row of playAgainRows) {
      if (!row.session_id) continue;
      const gameName = canonicalSoloSessionGame.get(row.session_id);
      if (!gameName) continue;
      const replayKey = `${gameName}:${row.session_id}`;
      if (replaySeen.has(replayKey)) continue;
      replaySeen.add(replayKey);
      ensureGame(gameName).playAgain += 1;
    }

    for (const [gameName] of sharedByGame) {
      if (SOLO_GAME_NAMES.has(gameName)) ensureGame(gameName);
    }

    const games = Array.from(gameMap.values())
      .map((g) => ({
        gameName: g.gameName,
        started: g.started,
        completed: g.completed,
        abandoned: g.abandoned,
        inProgress: g.inProgress,
        playAgain: g.playAgain,
        shared: g.shared,
        uniqueUsers: g.users.size,
        loggedInUsers: g.users.size,
        anonymousVisitors: g.anonymousVisitors.size,
        completionRate: g.started ? Number(((g.completed / g.started) * 100).toFixed(1)) : 0,
        averageDurationSeconds: average(g.durations),
      }))
      .filter((g) => g.started || g.playAgain || g.shared)
      .sort((a, b) => b.started - a.started);

    const allDurations = games.flatMap((g) => gameMap.get(g.gameName)?.durations ?? []);
    const summary = {
      totalStarted: games.reduce((s, g) => s + g.started, 0),
      totalCompleted: games.reduce((s, g) => s + g.completed, 0),
      totalAbandoned: games.reduce((s, g) => s + g.abandoned, 0),
      totalInProgress: games.reduce((s, g) => s + g.inProgress, 0),
      totalPlayAgain: games.reduce((s, g) => s + g.playAgain, 0),
      totalShared: games.reduce((s, g) => s + g.shared, 0),
      averageDurationSeconds: average(allDurations),
    };

    const wauRows = (await fetchAll("analytics_events", "user_id,created_at", sevenDaysAgo)) as Array<{ user_id: string | null; created_at: string }>;
    const wau = new Set(wauRows.map((r) => r.user_id).filter(Boolean)).size;
    const today = dayKey(new Date().toISOString());
    const dau = dailyUsers.get(today)?.size ?? new Set(wauRows.filter((r) => dayKey(r.created_at) === today).map((r) => r.user_id).filter(Boolean)).size;
    const profileRows = (await fetchAll("profiles", "id,created_at", startDate)) as ProfileRow[];
    const audience = { dau, wau, uniquePlayers: selectedUsers.size, anonymousPlayers: selectedAnonymousVisitors.size, newUsers: profileRows.length, platforms };

    const duelRows = (await fetchAll("duels", "id,challenger_id,opponent_id,game_code,status,created_at,accepted_at,started_at,completed_at,updated_at")) as DuelRow[];
    const duelParticipants = new Set<string>();
    const duelGameMap = new Map<string, { gameCode: string; created: number; accepted: number; started: number; completed: number; rejected: number; cancelled: number }>();
    const duelSummary = { created: 0, accepted: 0, started: 0, completed: 0, rejected: 0, cancelled: 0, uniquePlayers: 0 };
    for (const duel of duelRows) {
      if (!duelGameMap.has(duel.game_code)) duelGameMap.set(duel.game_code, { gameCode: duel.game_code, created: 0, accepted: 0, started: 0, completed: 0, rejected: 0, cancelled: 0 });
      const game = duelGameMap.get(duel.game_code)!;
      const touched = inRange(duel.created_at, startDate) || inRange(duel.accepted_at, startDate) || inRange(duel.started_at, startDate) || inRange(duel.completed_at, startDate) || ((duel.status === "rejected" || duel.status === "cancelled") && inRange(duel.updated_at, startDate));
      if (touched) { duelParticipants.add(duel.challenger_id); duelParticipants.add(duel.opponent_id); }
      if (inRange(duel.created_at, startDate)) { duelSummary.created++; game.created++; }
      if (inRange(duel.accepted_at, startDate)) { duelSummary.accepted++; game.accepted++; }
      if (inRange(duel.started_at, startDate)) { duelSummary.started++; game.started++; }
      if (inRange(duel.completed_at, startDate)) { duelSummary.completed++; game.completed++; }
      if (duel.status === "rejected" && inRange(duel.updated_at, startDate)) { duelSummary.rejected++; game.rejected++; }
      if (duel.status === "cancelled" && inRange(duel.updated_at, startDate)) { duelSummary.cancelled++; game.cancelled++; }
    }
    duelSummary.uniquePlayers = duelParticipants.size;
    const duelGames = Array.from(duelGameMap.values()).filter((g) => g.created || g.accepted || g.started || g.completed || g.rejected || g.cancelled).sort((a, b) => b.created - a.created);

    const { data: sets, error: setsError } = await supabaseAdmin.from("survivor_sets").select("id,slug,title,title_tr,is_active").order("created_at", { ascending: false });
    if (setsError) throw setsError;
    const survivorRows = await fetchAll("survivor_results", "set_id,created_at", startDate);
    const survivorCounts = new Map<string, number>();
    for (const r of survivorRows as Array<{ set_id: string | number }>) {
      const id = String(r.set_id);
      survivorCounts.set(id, (survivorCounts.get(id) ?? 0) + 1);
    }
    const survivors = (sets ?? []).map((s) => ({ id: s.id, slug: s.slug, title: s.title_tr || s.title, isActive: s.is_active, completions: survivorCounts.get(String(s.id)) ?? 0 })).sort((a, b) => b.completions - a.completions);

    return NextResponse.json({ ok: true, range, source: "canonical_sessions_plus_completion_events", summary, audience, games, duelSummary, duelGames, survivors });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Analytics verileri alınamadı." }, { status: 500 });
  }
}
