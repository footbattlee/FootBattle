import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

type RangeKey = "today" | "7d" | "30d" | "all";

type Touch = {
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  content?: string | null;
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

function getLastTouch(metadata: unknown): Touch | null {
  if (!metadata || typeof metadata !== "object") return null;
  const root = metadata as Record<string, unknown>;
  const attribution = root.attribution;
  if (!attribution || typeof attribution !== "object") return null;
  const value = attribution as Record<string, unknown>;
  const candidate = value.lastTouch && typeof value.lastTouch === "object"
    ? (value.lastTouch as Record<string, unknown>)
    : value;
  return {
    source: typeof candidate.source === "string" ? candidate.source : null,
    medium: typeof candidate.medium === "string" ? candidate.medium : null,
    campaign: typeof candidate.campaign === "string" ? candidate.campaign : null,
    content: typeof candidate.content === "string" ? candidate.content : null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const range = (request.nextUrl.searchParams.get("range") as RangeKey) ?? "7d";
    const startDate = getStartDate(range);

    let query = supabaseAdmin
      .from("analytics_events")
      .select("event_name, game_name, metadata, created_at");

    if (startDate) query = query.gte("created_at", startDate);

    const { data, error } = await query;
    if (error) throw error;

    const map = new Map<string, {
      source: string;
      medium: string;
      campaign: string;
      started: number;
      completed: number;
      shared: number;
      events: number;
    }>();

    for (const row of data ?? []) {
      const touch = getLastTouch(row.metadata);
      if (!touch?.source) continue;
      const source = touch.source.toLowerCase();
      const medium = touch.medium || "unknown";
      const campaign = touch.campaign || "unassigned";
      const key = `${source}|${medium}|${campaign}`;
      const current = map.get(key) ?? { source, medium, campaign, started: 0, completed: 0, shared: 0, events: 0 };
      current.events += 1;
      if (row.event_name === "game_started") current.started += 1;
      if (row.event_name === "game_completed") current.completed += 1;
      if (row.event_name === "shared") current.shared += 1;
      map.set(key, current);
    }

    const channels = Array.from(map.values())
      .map((row) => ({
        ...row,
        completionRate: row.started > 0 ? Number(((row.completed / row.started) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.started - a.started || b.events - a.events);

    return NextResponse.json({ ok: true, range, channels });
  } catch (error) {
    console.error("Traffic analytics API error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Trafik verileri alınamadı." },
      { status: 500 },
    );
  }
}
