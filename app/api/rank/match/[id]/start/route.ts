import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const HUMAN_START_DELAY_MS = 4000;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const auth = await createAuthServerClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Giriş yapmalısın." }, { status: 401 });

    const { data: match, error } = await supabaseAdmin
      .from("ranked_matches")
      .select("id,player_a_id,player_b_id,opponent_kind,created_at")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!match || (match.player_a_id !== user.id && match.player_b_id !== user.id)) {
      return NextResponse.json({ ok: false, error: "Maç bulunamadı." }, { status: 404 });
    }

    if (match.opponent_kind !== "human") {
      return NextResponse.json({ ok: true, startsAt: null, opponentKind: match.opponent_kind });
    }

    const createdAt = new Date(match.created_at).getTime();
    const startsAt = new Date(createdAt + HUMAN_START_DELAY_MS).toISOString();
    return NextResponse.json({ ok: true, startsAt, opponentKind: "human" });
  } catch (error) {
    console.error("Ranked start sync error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Başlangıç senkronu okunamadı." }, { status: 500 });
  }
}
