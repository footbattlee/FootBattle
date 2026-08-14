import { NextResponse } from "next/server";

import type { MatchRow, MatchRsvpRow } from "@/lib/halisaha/match";
import { supabaseAdmin } from "@/lib/supabase/server";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, props: RouteProps) {
  const { id } = await props.params;

  const [{ data: match, error: matchError }, { data: rsvps, error: rsvpError }] =
    await Promise.all([
      supabaseAdmin
        .from("halisaha_matches")
        .select("id,title,match_date,match_time,location,target_players,note,created_at")
        .eq("id", id)
        .maybeSingle(),
      supabaseAdmin
        .from("halisaha_match_rsvps")
        .select("id,match_id,participant_token,player_name,status,updated_at,created_at")
        .eq("match_id", id)
        .order("created_at", { ascending: true }),
    ]);

  if (matchError || rsvpError) {
    console.error("Halısaha maçı okunamadı:", matchError ?? rsvpError);
    return NextResponse.json(
      { ok: false, error: "Maç bilgileri okunamadı." },
      { status: 500 },
    );
  }

  if (!match) {
    return NextResponse.json(
      { ok: false, error: "Maç bulunamadı." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    match: match as MatchRow,
    rsvps: (rsvps ?? []) as MatchRsvpRow[],
  });
}
