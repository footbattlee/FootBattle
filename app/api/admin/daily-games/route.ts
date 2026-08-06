import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";
import {
  DAILY_GAME_LABELS,
  DAILY_GAME_TABLES,
  type DailyGameCode,
} from "@/lib/admin/daily-games";
import { supabaseAdmin } from "@/lib/supabase/server";

function getTurkeyDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

type DailyRow = {
  play_date: string;
  player_id: number;
  is_published: boolean;
  created_at: string;
  created_by: string | null;
};

export async function GET(request: Request) {
  const admin = await requireAdmin();

  if (!admin.ok) {
    return NextResponse.json(
      { ok: false, error: admin.error },
      { status: admin.status },
    );
  }

  try {
    const requestUrl = new URL(request.url);
    const playDate =
      requestUrl.searchParams.get("date")?.trim() || getTurkeyDateKey();

    const entries = await Promise.all(
      Object.entries(DAILY_GAME_TABLES).map(
        async ([gameCode, tableName]) => {
          const { data: dailyRow, error: dailyError } =
            await supabaseAdmin
              .from(tableName)
              .select(`
                play_date,
                player_id,
                is_published,
                created_at,
                created_by
              `)
              .eq("play_date", playDate)
              .maybeSingle<DailyRow>();

          if (dailyError) {
            throw new Error(
              `${tableName} okunamadı: ${dailyError.message}`,
            );
          }

          if (!dailyRow) {
            return {
              gameCode: gameCode as DailyGameCode,
              label: DAILY_GAME_LABELS[gameCode as DailyGameCode],
              record: null,
            };
          }

          const { data: player, error: playerError } =
            await supabaseAdmin
              .from("guess_players")
              .select(`
                player_id,
                name,
                image_url,
                nationality,
                position,
                sub_position,
                current_club_name,
                popularity_score
              `)
              .eq("player_id", dailyRow.player_id)
              .maybeSingle();

          if (playerError) {
            throw new Error(
              `Oyuncu bilgisi okunamadı: ${playerError.message}`,
            );
          }

          return {
            gameCode: gameCode as DailyGameCode,
            label: DAILY_GAME_LABELS[gameCode as DailyGameCode],
            record: {
              playDate: dailyRow.play_date,
              playerId: Number(dailyRow.player_id),
              isPublished: Boolean(dailyRow.is_published),
              createdAt: dailyRow.created_at,
              createdBy: dailyRow.created_by,
              player: player
                ? {
                    id: Number(player.player_id),
                    fullName: player.name,
                    imageUrl: player.image_url ?? null,
                    nationality: player.nationality ?? null,
                    position: player.position ?? null,
                    subPosition: player.sub_position ?? null,
                    club: player.current_club_name ?? null,
                    popularityScore:
                      player.popularity_score === null
                        ? null
                        : Number(player.popularity_score),
                  }
                : null,
            },
          };
        },
      ),
    );

    return NextResponse.json({
      ok: true,
      playDate,
      games: entries,
    });
  } catch (error) {
    console.error("Admin daily-games GET hatası:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Günlük oyunlar okunamadı.",
      },
      { status: 500 },
    );
  }
}
