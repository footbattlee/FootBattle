import { NextResponse } from "next/server";

import {
  DAILY_GAME_TABLES,
  isDailyGameCode,
} from "@/lib/admin/daily-games";
import { requireAdmin } from "@/lib/admin/require-admin";
import { supabaseAdmin } from "@/lib/supabase/server";

type PublishRequest = {
  playDate?: string;
  gameCode?: string | "all";
  isPublished?: boolean;
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
    const body = (await request.json()) as PublishRequest;
    const playDate = body.playDate?.trim();

    if (!playDate) {
      return NextResponse.json(
        { ok: false, error: "Oyun tarihi zorunludur." },
        { status: 400 },
      );
    }

    const isPublished = body.isPublished !== false;

    const gameCodes =
      body.gameCode === "all"
        ? Object.keys(DAILY_GAME_TABLES)
        : isDailyGameCode(body.gameCode)
          ? [body.gameCode]
          : [];

    if (gameCodes.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Oyun kodu geçersiz." },
        { status: 400 },
      );
    }

    for (const gameCode of gameCodes) {
      const tableName =
        DAILY_GAME_TABLES[
          gameCode as keyof typeof DAILY_GAME_TABLES
        ];

      const { data: row, error: findError } =
        await supabaseAdmin
          .from(tableName)
          .select("player_id")
          .eq("play_date", playDate)
          .maybeSingle();

      if (findError) {
        throw new Error(findError.message);
      }

      if (!row) {
        return NextResponse.json(
          {
            ok: false,
            error: `${gameCode} için ${playDate} tarihinde aday bulunamadı.`,
          },
          { status: 404 },
        );
      }

      const { error: updateError } =
        await supabaseAdmin
          .from(tableName)
          .update({ is_published: isPublished })
          .eq("play_date", playDate);

      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    return NextResponse.json({
      ok: true,
      isPublished,
    });
  } catch (error) {
    console.error("Publish endpoint hatası:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Yayın durumu güncellenemedi.",
      },
      { status: 500 },
    );
  }
}
