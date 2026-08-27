import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import { supabaseAdmin } from "@/lib/supabase/server";

type RangeKey = "today" | "7d" | "30d" | "all";
type EventRow = {
  game_name: string | null;
  user_id: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

const PAGE_SIZE = 1000;

function startDate(range: RangeKey) {
  if (range === "all") return null;
  const now = new Date();
  if (range === "today") {
    const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const y = p.find((x) => x.type === "year")?.value;
    const m = p.find((x) => x.type === "month")?.value;
    const d = p.find((x) => x.type === "day")?.value;
    return y && m && d ? new Date(`${y}-${m}-${d}T00:00:00+03:00`).toISOString() : null;
  }
  now.setDate(now.getDate() - (range === "30d" ? 30 : 7));
  return now.toISOString();
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status });

  try {
    const raw = request.nextUrl.searchParams.get("range");
    const range: RangeKey = raw === "today" || raw === "30d" || raw === "all" ? raw : "7d";
    const since = startDate(range);
    const rows: EventRow[] = [];

    for (let from = 0; ; from += PAGE_SIZE) {
      let q = supabaseAdmin
        .from("analytics_events")
        .select("game_name,user_id,created_at,metadata")
        .eq("event_name", "game_started")
        .order("created_at", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (since) q = q.gte("created_at", since);
      const { data, error } = await q;
      if (error) throw error;
      const batch = (data ?? []) as EventRow[];
      rows.push(...batch);
      if (batch.length < PAGE_SIZE) break;
    }

    const games = new Map<string, { loggedIn: Set<string>; anonymous: Set<string>; anonymousUntrackedStarts: number; starts: number }>();
    const totalLoggedIn = new Set<string>();
    const totalAnonymous = new Set<string>();
    let totalUntrackedAnonymousStarts = 0;

    for (const row of rows) {
      const game = row.game_name ?? "unknown";
      if (!games.has(game)) games.set(game, { loggedIn: new Set(), anonymous: new Set(), anonymousUntrackedStarts: 0, starts: 0 });
      const item = games.get(game)!;
      item.starts += 1;
      const visitorId = typeof row.metadata?.visitor_id === "string" ? row.metadata.visitor_id : null;

      if (row.user_id) {
        item.loggedIn.add(row.user_id);
        totalLoggedIn.add(row.user_id);
      } else if (visitorId) {
        item.anonymous.add(visitorId);
        totalAnonymous.add(visitorId);
      } else {
        item.anonymousUntrackedStarts += 1;
        totalUntrackedAnonymousStarts += 1;
      }
    }

    const byGame = Array.from(games.entries())
      .map(([gameName, value]) => ({
        gameName,
        loggedInUnique: value.loggedIn.size,
        anonymousUnique: value.anonymous.size,
        totalUniqueKnown: value.loggedIn.size + value.anonymous.size,
        anonymousUntrackedStarts: value.anonymousUntrackedStarts,
        starts: value.starts,
      }))
      .sort((a, b) => b.starts - a.starts);

    return NextResponse.json({
      ok: true,
      range,
      trackingSince: "2026-08-27",
      summary: {
        loggedInUnique: totalLoggedIn.size,
        anonymousUnique: totalAnonymous.size,
        totalUniqueKnown: totalLoggedIn.size + totalAnonymous.size,
        anonymousUntrackedStarts: totalUntrackedAnonymousStarts,
        starts: rows.length,
      },
      games: byGame,
    });
  } catch (error) {
    console.error("Visitor analytics error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Ziyaretçi analitiği alınamadı." }, { status: 500 });
  }
}
