import { NextRequest, NextResponse } from "next/server";

import { COMPETITIONS, getCompetitionSnapshot, type CompetitionKey } from "@/lib/football/competition-hubs";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type PredictionRow = {
  id: string;
  user_id: string;
  competition: string;
  match_id: string;
  kickoff_at: string;
  home_team: string;
  away_team: string;
  predicted_home: number;
  predicted_away: number;
  actual_home: number | null;
  actual_away: number | null;
  xp_awarded: number;
  status: "pending" | "settled" | "void";
  created_at: string;
  updated_at: string;
  settled_at: string | null;
};

function isCompetition(value: string): value is CompetitionKey {
  return value in COMPETITIONS;
}

function parseScore(value: unknown) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 20) return null;
  return n;
}

async function getUser() {
  const authSupabase = await createAuthServerClient();
  const { data: { user }, error } = await authSupabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

async function settleRows(rows: PredictionRow[]) {
  const pending = rows.filter((row) => row.status === "pending" && new Date(row.kickoff_at).getTime() <= Date.now());
  if (!pending.length) return false;

  const byCompetition = new Map<CompetitionKey, PredictionRow[]>();
  for (const row of pending) {
    if (!isCompetition(row.competition)) continue;
    const list = byCompetition.get(row.competition) ?? [];
    list.push(row);
    byCompetition.set(row.competition, list);
  }

  let changed = false;
  for (const [competition, predictionRows] of byCompetition) {
    const snapshot = await getCompetitionSnapshot(competition);
    const matchById = new Map(snapshot.matches.map((match) => [match.id, match]));
    for (const row of predictionRows) {
      const match = matchById.get(row.match_id);
      if (!match || match.state !== "post") continue;
      const home = Number(match.home.score);
      const away = Number(match.away.score);
      if (!Number.isInteger(home) || !Number.isInteger(away)) continue;
      const { error } = await supabaseAdmin.rpc("footbattle_settle_match_prediction", {
        p_prediction_id: row.id,
        p_actual_home: home,
        p_actual_away: away,
      });
      if (!error) changed = true;
    }
  }
  return changed;
}

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const competition = request.nextUrl.searchParams.get("competition");
  const history = request.nextUrl.searchParams.get("history") === "1";
  if (competition && !isCompetition(competition)) {
    return NextResponse.json({ ok: false, error: "INVALID_COMPETITION" }, { status: 400 });
  }

  let query = supabaseAdmin
    .from("match_predictions")
    .select("id,user_id,competition,match_id,kickoff_at,home_team,away_team,predicted_home,predicted_away,actual_home,actual_away,xp_awarded,status,created_at,updated_at,settled_at")
    .eq("user_id", user.id)
    .order("kickoff_at", { ascending: false })
    .limit(history ? 100 : 500);

  if (competition) query = query.eq("competition", competition);
  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });

  const rows = (data ?? []) as PredictionRow[];
  const changed = await settleRows(rows);

  if (changed) {
    let refresh = supabaseAdmin
      .from("match_predictions")
      .select("id,user_id,competition,match_id,kickoff_at,home_team,away_team,predicted_home,predicted_away,actual_home,actual_away,xp_awarded,status,created_at,updated_at,settled_at")
      .eq("user_id", user.id)
      .order("kickoff_at", { ascending: false })
      .limit(history ? 100 : 500);
    if (competition) refresh = refresh.eq("competition", competition);
    const { data: refreshed } = await refresh;
    return NextResponse.json({ ok: true, predictions: refreshed ?? [] });
  }

  return NextResponse.json({ ok: true, predictions: rows });
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json().catch(() => null) as { competition?: unknown; matchId?: unknown; homeScore?: unknown; awayScore?: unknown } | null;
  const competition = typeof body?.competition === "string" ? body.competition : "";
  const matchId = typeof body?.matchId === "string" ? body.matchId : "";
  const homeScore = parseScore(body?.homeScore);
  const awayScore = parseScore(body?.awayScore);

  if (!isCompetition(competition) || !matchId || homeScore === null || awayScore === null) {
    return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
  }

  const snapshot = await getCompetitionSnapshot(competition);
  const match = snapshot.matches.find((item) => item.id === matchId);
  if (!match) return NextResponse.json({ ok: false, error: "MATCH_NOT_FOUND" }, { status: 404 });

  const kickoff = new Date(match.date).getTime();
  if (match.state !== "pre" || !Number.isFinite(kickoff) || kickoff <= Date.now()) {
    return NextResponse.json({ ok: false, error: "PREDICTION_LOCKED" }, { status: 409 });
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("match_predictions")
    .select("id,status")
    .eq("user_id", user.id)
    .eq("competition", competition)
    .eq("match_id", matchId)
    .maybeSingle();

  if (existingError) return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  if (existing && existing.status !== "pending") {
    return NextResponse.json({ ok: false, error: "PREDICTION_LOCKED" }, { status: 409 });
  }

  const payload = {
    user_id: user.id,
    competition,
    match_id: match.id,
    kickoff_at: match.date,
    home_team: match.home.name,
    away_team: match.away.name,
    predicted_home: homeScore,
    predicted_away: awayScore,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("match_predictions")
    .upsert(payload, { onConflict: "user_id,competition,match_id" })
    .select("id,user_id,competition,match_id,kickoff_at,home_team,away_team,predicted_home,predicted_away,actual_home,actual_away,xp_awarded,status,created_at,updated_at,settled_at")
    .single();

  if (error) return NextResponse.json({ ok: false, error: "DB_ERROR" }, { status: 500 });
  return NextResponse.json({ ok: true, prediction: data });
}
