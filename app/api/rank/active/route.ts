import { NextResponse } from "next/server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const ABANDON_IDLE_MS = 5 * 60 * 1000;

async function userId() {
  const auth = await createAuthServerClient();
  const { data: { user } } = await auth.auth.getUser();
  return user?.id ?? null;
}

async function closeMatch(match: { id: string; challenge_token: string | null }) {
  const now = new Date().toISOString();
  await supabaseAdmin.from("ranked_matches").update({ status: "abandoned", winner_user_id: null, completed_at: now, updated_at: now }).eq("id", match.id).in("status", ["ready", "active"]);
  if (match.challenge_token) {
    await supabaseAdmin.from("guest_challenges").update({ status: "completed", winner_side: "draw", completed_at: now, updated_at: now }).eq("invite_token", match.challenge_token).neq("status", "completed");
  }
}

export async function GET() {
  try {
    const uid = await userId();
    if (!uid) return NextResponse.json({ ok: false, error: "Giriş yapmalısın." }, { status: 401 });

    const { data } = await supabaseAdmin
      .from("ranked_matches")
      .select("id,game_code,status,player_a_id,player_b_id,opponent_kind,bot_name,challenge_token,updated_at,created_at")
      .in("status", ["ready", "active"])
      .or(`player_a_id.eq.${uid},player_b_id.eq.${uid}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return NextResponse.json({ ok: true, match: null });

    const last = new Date(data.updated_at ?? data.created_at).getTime();
    if (Number.isFinite(last) && Date.now() - last > ABANDON_IDLE_MS) {
      await closeMatch({ id: String(data.id), challenge_token: data.challenge_token ? String(data.challenge_token) : null });
      return NextResponse.json({ ok: true, match: null, abandoned: true });
    }

    return NextResponse.json({
      ok: true,
      match: {
        id: String(data.id),
        gameCode: String(data.game_code),
        opponentKind: data.opponent_kind,
        botName: data.bot_name,
        updatedAt: data.updated_at,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Aktif maç okunamadı." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const uid = await userId();
    if (!uid) return NextResponse.json({ ok: false, error: "Giriş yapmalısın." }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const matchId = String(body?.matchId ?? "").trim();
    if (!matchId) return NextResponse.json({ ok: false, error: "Maç bulunamadı." }, { status: 400 });

    const now = new Date().toISOString();
    const { data } = await supabaseAdmin
      .from("ranked_matches")
      .update({ updated_at: now })
      .eq("id", matchId)
      .in("status", ["ready", "active"])
      .or(`player_a_id.eq.${uid},player_b_id.eq.${uid}`)
      .select("id")
      .maybeSingle();

    return NextResponse.json({ ok: true, active: Boolean(data), updatedAt: now });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Maç heartbeat gönderilemedi." }, { status: 500 });
  }
}
