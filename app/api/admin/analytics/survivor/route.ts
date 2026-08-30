import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import { supabaseAdmin } from "@/lib/supabase/server";

type RangeKey = "today" | "7d" | "30d" | "all";
type SurvivorResultRow = {
  id: string;
  created_at: string;
  champion_name: string;
  bracket: unknown;
};
type MatchSide = { id?: string; name?: string } | null;
type BracketMatch = { left?: MatchSide; right?: MatchSide; winner?: MatchSide };
type BracketStage = { name?: string; matches?: BracketMatch[] };

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

function normalizeStages(value: unknown): BracketStage[] {
  return Array.isArray(value) ? (value as BracketStage[]) : [];
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status });

  try {
    const rawRange = request.nextUrl.searchParams.get("range");
    const range: RangeKey = rawRange === "today" || rawRange === "30d" || rawRange === "all" ? rawRange : "7d";
    const startDate = getStartDate(range);
    const rows: SurvivorResultRow[] = [];

    for (let from = 0; ; from += PAGE_SIZE) {
      let query = supabaseAdmin
        .from("survivor_results")
        .select("id,created_at,champion_name,bracket")
        .order("created_at", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (startDate) query = query.gte("created_at", startDate);
      const { data, error } = await query;
      if (error) throw error;
      const batch = (data ?? []) as SurvivorResultRow[];
      rows.push(...batch);
      if (batch.length < PAGE_SIZE) break;
    }

    const votes = new Map<string, { name: string; votes: number; finalWins: number; appearances: number }>();
    const stageVotes = new Map<string, number>();
    let totalVotes = 0;

    for (const result of rows) {
      for (const stage of normalizeStages(result.bracket)) {
        const stageName = stage.name || "Bilinmeyen Tur";
        for (const match of stage.matches ?? []) {
          for (const side of [match.left, match.right]) {
            if (!side?.name) continue;
            const key = side.id || side.name.toLocaleLowerCase("tr-TR");
            const current = votes.get(key) ?? { name: side.name, votes: 0, finalWins: 0, appearances: 0 };
            current.appearances += 1;
            votes.set(key, current);
          }
          if (!match.winner?.name) continue;
          const key = match.winner.id || match.winner.name.toLocaleLowerCase("tr-TR");
          const current = votes.get(key) ?? { name: match.winner.name, votes: 0, finalWins: 0, appearances: 0 };
          current.votes += 1;
          if (stageName.toLocaleLowerCase("tr-TR").includes("final") && !stageName.toLocaleLowerCase("tr-TR").includes("yarı")) current.finalWins += 1;
          votes.set(key, current);
          stageVotes.set(stageName, (stageVotes.get(stageName) ?? 0) + 1);
          totalVotes += 1;
        }
      }
    }

    const selections = Array.from(votes.values())
      .filter((row) => row.votes > 0)
      .map((row) => ({ ...row, selectionRate: row.appearances ? Number(((row.votes / row.appearances) * 100).toFixed(1)) : 0 }))
      .sort((a, b) => b.votes - a.votes || b.finalWins - a.finalWins || a.name.localeCompare(b.name, "tr"));

    return NextResponse.json({
      ok: true,
      range,
      summary: {
        completedBrackets: rows.length,
        totalVotes,
        uniqueSelections: selections.length,
      },
      stageVotes: Array.from(stageVotes, ([stage, count]) => ({ stage, count })),
      selections,
    });
  } catch (error) {
    console.error("Admin survivor analytics error:", error);
    return NextResponse.json({ ok: false, error: "Survivor oy verileri hazırlanamadı." }, { status: 500 });
  }
}
