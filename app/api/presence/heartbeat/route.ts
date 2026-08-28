import { NextRequest, NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

type HeartbeatBody = { visitorId?: string | null };

export async function POST(request: NextRequest) {
  try {
    let body: HeartbeatBody = {};
    try {
      body = (await request.json()) as HeartbeatBody;
    } catch {
      body = {};
    }

    const visitorId = typeof body.visitorId === "string" && body.visitorId.length >= 8 && body.visitorId.length <= 200
      ? body.visitorId
      : null;

    const authSupabase = await createAuthServerClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    const now = new Date().toISOString();

    if (user) {
      const { error: presenceError } = await supabaseAdmin
        .from("site_presence")
        .upsert({
          actor_key: `user:${user.id}`,
          user_id: user.id,
          visitor_id: null,
          last_seen_at: now,
          updated_at: now,
        }, { onConflict: "actor_key" });

      if (presenceError) throw presenceError;

      if (visitorId) {
        await supabaseAdmin.from("site_presence").delete().eq("actor_key", `guest:${visitorId}`);
      }

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ last_seen_at: now })
        .eq("id", user.id);

      if (profileError) console.error("Profile last_seen update hatası:", profileError);

      return NextResponse.json({ ok: true, kind: "authenticated", lastSeenAt: now });
    }

    if (!visitorId) {
      return NextResponse.json({ ok: false, error: "Guest kimliği oluşturulamadı." }, { status: 400 });
    }

    const { error: presenceError } = await supabaseAdmin
      .from("site_presence")
      .upsert({
        actor_key: `guest:${visitorId}`,
        user_id: null,
        visitor_id: visitorId,
        last_seen_at: now,
        updated_at: now,
      }, { onConflict: "actor_key" });

    if (presenceError) throw presenceError;

    return NextResponse.json({ ok: true, kind: "guest", lastSeenAt: now });
  } catch (error) {
    console.error("Presence heartbeat endpoint hatası:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Çevrimiçi durumu güncellenemedi." },
      { status: 500 },
    );
  }
}
