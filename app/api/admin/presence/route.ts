import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import { supabaseAdmin } from "@/lib/supabase/server";

type PresenceRow = {
  active_users: number;
  authenticated_users: number;
  guest_users: number;
  unidentifiable_guest_sessions: number;
  window_minutes: number;
  measured_at: string;
};

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.error }, { status: admin.status });
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("get_active_user_presence", {
      p_window_minutes: 2,
    });

    if (error) throw error;
    const row = ((data ?? [])[0] ?? null) as PresenceRow | null;

    return NextResponse.json({
      ok: true,
      presence: {
        activeUsers: row?.active_users ?? 0,
        authenticatedUsers: row?.authenticated_users ?? 0,
        guestUsers: row?.guest_users ?? 0,
        windowMinutes: row?.window_minutes ?? 2,
        measuredAt: row?.measured_at ?? new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Admin presence API error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Aktif kullanıcı verisi alınamadı." },
      { status: 500 },
    );
  }
}
