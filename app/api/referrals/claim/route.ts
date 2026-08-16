import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

const COOKIE_NAME = "footbattle_referral";

export async function POST() {
  const auth = await createAuthServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });

  const store = await cookies();
  const code = store.get(COOKIE_NAME)?.value?.trim().toUpperCase();
  if (!code) return NextResponse.json({ ok: true, claimed: false, reason: "no_referral" });

  const { data, error } = await supabaseAdmin.rpc("footbattle_claim_referral", {
    p_code: code,
    p_invitee: user.id,
  });
  if (error) {
    console.error("Referral claim error:", error);
    return NextResponse.json({ ok: false, error: "Davet kaydedilemedi." }, { status: 500 });
  }

  const result = (data ?? {}) as { ok?: boolean; reason?: string; already_claimed?: boolean; invitee_xp?: number };
  const response = NextResponse.json({
    ok: true,
    claimed: Boolean(result.ok && !result.already_claimed && !result.reason),
    alreadyClaimed: Boolean(result.already_claimed),
    reason: result.reason ?? null,
    bonusXp: result.invitee_xp ?? 0,
  });
  response.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}
