import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

const COOKIE_NAME = "footbattle_referral";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

type Params = Promise<{ code: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const { code: rawCode } = await params;
  const code = rawCode.trim().toUpperCase();
  const url = new URL(request.url);

  const { data } = await supabaseAdmin
    .from("referral_codes")
    .select("user_id")
    .eq("code", code)
    .maybeSingle();

  if (!data) return NextResponse.redirect(new URL("/?ref=invalid", url.origin));

  await supabaseAdmin
    .from("referral_codes")
    .update({ click_count: supabaseAdmin.rpc ? undefined : undefined })
    .eq("code", code);

  const { data: current } = await supabaseAdmin
    .from("referral_codes")
    .select("click_count")
    .eq("code", code)
    .single();
  await supabaseAdmin
    .from("referral_codes")
    .update({ click_count: (current?.click_count ?? 0) + 1, updated_at: new Date().toISOString() })
    .eq("code", code);

  const response = NextResponse.redirect(new URL("/?ref=invite", url.origin));
  response.cookies.set(COOKIE_NAME, code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return response;
}
