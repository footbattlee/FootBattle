import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type Body = { token?: string; platform?: string };

export async function POST(request: Request) {
  try {
    const auth = await createAuthServerClient();
    const { data: { user }, error: userError } = await auth.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Giriş yapmalısın." }, { status: 401 });
    }

    const body = (await request.json()) as Body;
    const token = String(body.token ?? "").trim();
    const platform = String(body.platform ?? "android").trim().slice(0, 20) || "android";
    if (token.length < 20) {
      return NextResponse.json({ ok: false, error: "Geçersiz push token." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("push_tokens")
      .upsert({
        user_id: user.id,
        token,
        platform,
        updated_at: new Date().toISOString(),
      }, { onConflict: "token" });

    if (error) {
      console.error("Push token register failed", error);
      return NextResponse.json({ ok: false, error: "Bildirim cihazı kaydedilemedi." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Push register endpoint failed", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Bildirim kaydı yapılamadı." }, { status: 500 });
  }
}
