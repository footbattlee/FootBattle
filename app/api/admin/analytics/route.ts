import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/server";

type RangeKey =
  | "today"
  | "7d"
  | "30d"
  | "all";

function getStartDate(
  range: RangeKey,
) {
  const now = new Date();

  switch (range) {
    case "today": {
      const start =
        new Date();

      start.setHours(
        0,
        0,
        0,
        0,
      );

      return start.toISOString();
    }

    case "7d": {
      const start =
        new Date(
          now,
        );

      start.setDate(
        start.getDate() -
          7,
      );

      return start.toISOString();
    }

    case "30d": {
      const start =
        new Date(
          now,
        );

      start.setDate(
        start.getDate() -
          30,
      );

      return start.toISOString();
    }

    default:
      return null;
  }
}

export async function GET(
  request: NextRequest,
) {
  try {
    const range =
      (request.nextUrl.searchParams.get(
        "range",
      ) as RangeKey) ??
      "7d";

    const startDate =
      getStartDate(
        range,
      );

    let query =
      supabaseAdmin
        .from(
          "analytics_events",
        )
        .select(`
          event_name,
          game_name,
          created_at
        `);

    if (startDate) {
      query = query.gte(
        "created_at",
        startDate,
      );
    }

    const {
      data,
      error,
    } = await query;

    if (error) {
      throw error;
    }

    const rows =
      data ?? [];

    const summary = {
      totalStarted: 0,
      totalCompleted: 0,
      totalPlayAgain: 0,
      totalShared: 0,
    };

    const gameMap =
      new Map<
        string,
        {
          gameName: string;
          started: number;
          completed: number;
          playAgain: number;
          shared: number;
        }
      >();

    for (const row of rows) {
      const gameName =
        row.game_name ??
        "unknown";

      if (
        !gameMap.has(
          gameName,
        )
      ) {
        gameMap.set(
          gameName,
          {
            gameName,
            started: 0,
            completed: 0,
            playAgain: 0,
            shared: 0,
          },
        );
      }

      const game =
        gameMap.get(
          gameName,
        )!;

      switch (
        row.event_name
      ) {
        case "game_started":
          game.started++;
          summary.totalStarted++;
          break;

        case "game_completed":
          game.completed++;
          summary.totalCompleted++;
          break;

        case "play_again":
          game.playAgain++;
          summary.totalPlayAgain++;
          break;

        case "shared":
          game.shared++;
          summary.totalShared++;
          break;
      }
    }

    const games =
      Array.from(
        gameMap.values(),
      )
        .map(
          (
            game,
          ) => ({
            ...game,

            completionRate:
              game.started >
              0
                ? Number(
                    (
                      (game.completed /
                        game.started) *
                      100
                    ).toFixed(
                      1,
                    ),
                  )
                : 0,
          }),
        )
        .sort(
          (
            a,
            b,
          ) =>
            b.started -
            a.started,
        );

    return NextResponse.json(
      {
        ok: true,
        range,
        summary,
        games,
      },
    );
  } catch (error) {
    console.error(
      "Analytics API error:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof
          Error
            ? error.message
            : "Analytics verileri alınamadı.",
      },
      {
        status: 500,
      },
    );
  }
}