import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type Body = { token?: string; platform?: string };

async function requireUser(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (bearer) {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(bearer);
    if (!error && user) return user;
  }

  const auth = await createAuthServerClient();
  const { data: { user }, error } = await auth.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) {
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

export async function DELETE(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Giriş yapmalısın." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Body;
    const token = String(body.token ?? "").trim();
    if (token.length < 20) {
      return NextResponse.json({ ok: false, error: "Geçersiz push token." }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("push_tokens")
      .delete()
      .eq("user_id", user.id)
      .eq("token", token);

    if (error) {
      console.error("Push token unregister failed", error);
      return NextResponse.json({ ok: false, error: "Bildirim cihazı kaldırılamadı." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Push unregister endpoint failed", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Bildirim kaydı kaldırılamadı." }, { status: 500 });
  }
}
