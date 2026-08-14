import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";

export async function GET() {
  const admin = await requireAdmin();

  if (!admin.ok) {
    if (admin.status === 401 || admin.status === 403) {
      return NextResponse.json({ ok: true, authorized: false });
    }

    return NextResponse.json(
      { ok: false, authorized: false, error: admin.error },
      { status: admin.status },
    );
  }

  return NextResponse.json({
    ok: true,
    authorized: true,
    admin: {
      id: admin.user.id,
      username: admin.profile.username ?? null,
      displayName: admin.profile.display_name ?? admin.profile.username ?? "Admin",
    },
  });
}
