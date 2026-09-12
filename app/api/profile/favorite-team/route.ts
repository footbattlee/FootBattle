import { NextResponse } from "next/server";

import { COMPETITIONS, getCompetitionSnapshot, type CompetitionKey } from "@/lib/football/competition-hubs";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const DOMESTIC_COMPETITIONS: CompetitionKey[] = [
  "super-lig",
  "premier-league",
  "la-liga",
  "serie-a",
  "bundesliga",
  "ligue-1",
  "primeira-liga",
];

type FavoriteTeamPayload = {
  teamId?: string;
  teamName?: string;
  competition?: string;
  logo?: string | null;
};

async function getUser() {
  const auth = await createAuthServerClient();
  const { data: { user }, error } = await auth.auth.getUser();
  if (error || !user) return null;
  return user;
}

async function buildOptions() {
  const snapshots = await Promise.all(
    DOMESTIC_COMPETITIONS.map(async (key) => ({ key, snapshot: await getCompetitionSnapshot(key) })),
  );

  return snapshots.flatMap(({ key, snapshot }) => {
    const config = COMPETITIONS[key];
    return snapshot.standings.map((team) => ({
      teamId: team.teamId,
      teamName: team.teamName,
      logo: team.logo,
      competition: key,
      competitionName: config.trName,
      competitionNameEn: config.enName,
    }));
  });
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });

  const [{ data: profile }, options] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("favorite_team_id,favorite_team_name,favorite_team_competition,favorite_team_logo")
      .eq("id", user.id)
      .maybeSingle(),
    buildOptions(),
  ]);

  return NextResponse.json({
    ok: true,
    authenticated: true,
    favorite: profile?.favorite_team_id
      ? {
          teamId: profile.favorite_team_id,
          teamName: profile.favorite_team_name,
          competition: profile.favorite_team_competition,
          logo: profile.favorite_team_logo,
        }
      : null,
    options,
  });
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as FavoriteTeamPayload;
  const teamId = body.teamId?.trim();
  const competition = body.competition?.trim() as CompetitionKey | undefined;

  if (!teamId || !competition || !DOMESTIC_COMPETITIONS.includes(competition)) {
    return NextResponse.json({ ok: false, error: "INVALID_TEAM" }, { status: 400 });
  }

  const snapshot = await getCompetitionSnapshot(competition);
  const team = snapshot.standings.find((item) => item.teamId === teamId);
  if (!team) return NextResponse.json({ ok: false, error: "TEAM_NOT_FOUND" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      favorite_team_id: team.teamId,
      favorite_team_name: team.teamName,
      favorite_team_competition: competition,
      favorite_team_logo: team.logo,
      favorite_team_updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) return NextResponse.json({ ok: false, error: "SAVE_FAILED" }, { status: 500 });

  return NextResponse.json({
    ok: true,
    favorite: {
      teamId: team.teamId,
      teamName: team.teamName,
      competition,
      logo: team.logo,
    },
  });
}
