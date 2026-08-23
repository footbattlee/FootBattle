import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import { supabaseAdmin } from "@/lib/supabase/server";

type RangeKey = "today" | "7d" | "30d" | "all";
type RankedRow = {
  id: string;
  game_code: string;
  status: string;
  player_a_id: string;
  player_b_id: string | null;
  opponent_kind: "human" | "bot";
  winner_user_id: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

const PAGE_SIZE = 1000;

function getStartDate(range: RangeKey) {
  const now = new Date();
  if (range === "today") {
    // Admin ekranı Türkiye operasyonuna göre gün değiştirir; Vercel UTC olduğu için
    // Europe/Istanbul gece yarısını UTC'ye çeviriyoruz (UTC+3, DST yok).
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

async function fetchAllRanked(startDate: string | null) {
  const rows: RankedRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    let query = supabaseAdmin
      .from("ranked_matches")
      .select("id,game_code,status,player_a_id,player_b_id,opponent_kind,winner_user_id,created_at,started_at,completed_at")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (startDate) query = query.gte("created_at", startDate);
    const { data, error } = await query;
    if (error) throw error;
    const batch = (data ?? []) as RankedRow[];
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
    const rows = await fetchAllRanked(getStartDate(range));

    const players = new Set<string>();
    const gameMap = new Map<string, {
      gameCode: string;
      total: number;
      human: number;
      bot: number;
      completed: number;
      active: number;
      draws: number;
    }>();

    let humanMatches = 0;
    let botMatches = 0;
    let completed = 0;
    let active = 0;

    for (const row of rows) {
      if (!gameMap.has(row.game_code)) {
        gameMap.set(row.game_code, { gameCode: row.game_code, total: 0, human: 0, bot: 0, completed: 0, active: 0, draws: 0 });
      }
      const game = gameMap.get(row.game_code)!;
      game.total += 1;
      players.add(row.player_a_id);
      if (row.player_b_id) players.add(row.player_b_id);

      if (row.opponent_kind === "bot") {
        botMatches += 1;
        game.bot += 1;
      } else {
        humanMatches += 1;
        game.human += 1;
      }

      if (row.status === "completed" || row.completed_at) {
        completed += 1;
        game.completed += 1;
        if (!row.winner_user_id) game.draws += 1;
      } else if (row.status === "active" || row.status === "ready") {
        active += 1;
        game.active += 1;
      }
    }

    const totalMatches = rows.length;
    const games = Array.from(gameMap.values())
      .map((game) => ({
        ...game,
        botRate: game.total ? Number(((game.bot / game.total) * 100).toFixed(1)) : 0,
        completionRate: game.total ? Number(((game.completed / game.total) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      ok: true,
      range,
      summary: {
        totalMatches,
        humanMatches,
        botMatches,
        completed,
        active,
        uniquePlayers: players.size,
        botRate: totalMatches ? Number(((botMatches / totalMatches) * 100).toFixed(1)) : 0,
        completionRate: totalMatches ? Number(((completed / totalMatches) * 100).toFixed(1)) : 0,
      },
      games,
    });
  } catch (error) {
    console.error("Ranked analytics API error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Ranked raporu alınamadı." }, { status: 500 });
  }
}
