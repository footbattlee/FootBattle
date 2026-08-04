import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const { count, error } = await supabaseAdmin
    .from("players")
    .select("*", {
      count: "exact",
      head: true,
    });

  if (error) {
    console.error("Supabase test error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Veritabanı bağlantısı başarısız.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    playerCount: count ?? 0,
  });
}