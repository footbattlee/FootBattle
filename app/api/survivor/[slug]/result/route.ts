import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type MatchEntry = { id: string; name: string; imageUrl?: string | null };
type Match = { left: MatchEntry; right: MatchEntry; winner: MatchEntry };
type Round = { name: string; matches: Match[] };

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const payload = (await request.json().catch(() => null)) as { championId?: string; championName?: string; bracket?: Round[] } | null;
  if (!payload?.championId || !payload.championName || !Array.isArray(payload.bracket)) {
    return NextResponse.json({ ok: false, error: "Sonuç verisi eksik." }, { status: 400 });
  }

  const { data: set, error: setError } = await supabaseAdmin
    .from("survivor_sets")
    .select("id, title")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (setError) return NextResponse.json({ ok: false, error: setError.message }, { status: 500 });
  if (!set) return NextResponse.json({ ok: false, error: "Survivor bulunamadı." }, { status: 404 });

  const { data: champion, error: championError } = await supabaseAdmin
    .from("survivor_entries")
    .select("id, name")
    .eq("id", payload.championId)
    .eq("set_id", set.id)
    .maybeSingle();
  if (championError) return NextResponse.json({ ok: false, error: championError.message }, { status: 500 });
  if (!champion) return NextResponse.json({ ok: false, error: "Şampiyon bu Survivor'a ait değil." }, { status: 400 });

  const shareToken = randomBytes(12).toString("base64url");
  const { error } = await supabaseAdmin.from("survivor_results").insert({
    share_token: shareToken,
    set_id: set.id,
    champion_entry_id: champion.id,
    champion_name: champion.name,
    bracket: payload.bracket,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  let rankReward: Record<string, unknown> | null = null;
  try {
    const auth = await createAuthServerClient();
    const { data: { user } } = await auth.auth.getUser();
    if (user) {
      const { data } = await supabaseAdmin.rpc("footbattle_apply_rank_event", {
        p_user_id: user.id,
        p_event_key: `survivor:${set.id}:${user.id}`,
        p_game_code: "survivor",
        p_lp_change: 10,
      });
      rankReward = (data as Record<string, unknown> | null) ?? null;
    }
  } catch (rankError) {
    console.error("Survivor LP award error:", rankError);
  }

  return NextResponse.json({
    ok: true,
    result: {
      token: shareToken,
      championName: champion.name,
      shareUrl: `/survivor/result/${shareToken}`,
      title: set.title,
    },
    rankReward,
  });
}
