import { NextResponse } from "next/server";

import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST() {
  try {
    const authSupabase =
      await createAuthServerClient();

    const {
      data: { user },
      error: userError,
    } = await authSupabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: "Giriş yapmalısın.",
        },
        { status: 401 },
      );
    }

    const now =
      new Date().toISOString();

    const {
      error: updateError,
    } = await supabaseAdmin
      .from("profiles")
      .update({
        last_seen_at: now,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error(
        "Presence heartbeat update hatası:",
        updateError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "Çevrimiçi durumu güncellenemedi.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      lastSeenAt: now,
    });
  } catch (error) {
    console.error(
      "Presence heartbeat endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Çevrimiçi durumu güncellenemedi.",
      },
      { status: 500 },
    );
  }
}