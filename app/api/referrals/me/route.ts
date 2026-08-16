import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join("");
}

export async function GET() {
  const auth = await createAuthServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Giriş yapmalısın." }, { status: 401 });

  let { data: codeRow } = await supabaseAdmin
    .from("referral_codes")
    .select("code, click_count")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!codeRow) {
    for (let attempt = 0; attempt < 5 && !codeRow; attempt += 1) {
      const code = makeCode();
      const { data, error } = await supabaseAdmin
        .from("referral_codes")
        .insert({ user_id: user.id, code })
        .select("code, click_count")
        .single();
      if (!error) codeRow = data;
      else if (error.code !== "23505") throw error;
    }
  }

  if (!codeRow) return NextResponse.json({ ok: false, error: "Davet kodu üretilemedi." }, { status: 500 });

  const { count } = await supabaseAdmin
    .from("referral_conversions")
    .select("id", { count: "exact", head: true })
    .eq("inviter_id", user.id);

  const successfulInvites = count ?? 0;
  return NextResponse.json({
    ok: true,
    referral: {
      code: codeRow.code,
      clicks: codeRow.click_count ?? 0,
      successfulInvites,
      earnedXp: successfulInvites * 250,
      inviteeBonusXp: 100,
      inviterBonusXp: 250,
      shareUrl: `/r/${codeRow.code}`,
    },
  });
}
