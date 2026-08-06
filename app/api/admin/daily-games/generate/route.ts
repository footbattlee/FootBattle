import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import { supabaseAdmin } from "@/lib/supabase/server";

type GenerateRequest = {
  playDate?: string;
  force?: boolean;
};

export async function POST(request: Request) {
  const admin = await requireAdmin();

  if (!admin.ok) {
    return NextResponse.json(
      { ok: false, error: admin.error },
      { status: admin.status },
    );
  }

  try {
    const body = (await request.json()) as GenerateRequest;
    const playDate = body.playDate?.trim();

    if (!playDate) {
      return NextResponse.json(
        { ok: false, error: "Oyun tarihi zorunludur." },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin.rpc(
      "generate_daily_game_candidates",
      {
        p_play_date: playDate,
        p_force: Boolean(body.force),
        p_created_by: admin.user.id,
      },
    );

    if (error) {
      console.error("Günlük oyun üretimi başarısız:", error);

      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      generated: data ?? [],
    });
  } catch (error) {
    console.error("Generate endpoint hatası:", error);

    return NextResponse.json(
      { ok: false, error: "Günlük oyun adayları üretilemedi." },
      { status: 500 },
    );
  }
}
