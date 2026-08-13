import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";

import {
  DAILY_GAME_LABELS,
  DAILY_GAME_TABLES,
  type DailyGameCode,
} from "@/lib/admin/daily-games";

import { supabaseAdmin } from "@/lib/supabase/server";

/* =========================================================
   DATE
========================================================= */

function getTurkeyDateKey() {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "Europe/Istanbul",

      year:
        "numeric",

      month:
        "2-digit",

      day:
        "2-digit",
    },
  ).format(
    new Date(),
  );
}

/* =========================================================
   TYPES
========================================================= */

type DailyPlayerRow = {
  play_date: string;

  player_id: number;

  is_published: boolean;

  created_at: string;

  created_by:
    | string
    | null;
};

type TicTacToeAxisItem = {
  index: number;

  type:
    | "club"
    | "nationality";

  value: string;
};

type TicTacToeCell = {
  rowIndex: number;

  columnIndex: number;

  rowType:
    | "club"
    | "nationality";

  rowValue: string;

  columnType:
    | "club"
    | "nationality";

  columnValue: string;

  validPlayerIds:
    number[];
};

type DailyTicTacToeRow = {
  id: string;

  play_date: string;

  rows:
    TicTacToeAxisItem[];

  columns:
    TicTacToeAxisItem[];

  cells:
    TicTacToeCell[];

  quality_score:
    number
    | null;

  is_published:
    boolean;

  created_at:
    string;

  created_by:
    string
    | null;
};

/* =========================================================
   GET
========================================================= */

export async function GET(
  request: Request,
) {
  /* =====================================================
     1. ADMIN
  ===================================================== */

  const admin =
    await requireAdmin();

  if (!admin.ok) {
    return NextResponse.json(
      {
        ok: false,

        error:
          admin.error,
      },
      {
        status:
          admin.status,
      },
    );
  }

  try {
    /* =====================================================
       2. DATE
    ===================================================== */

    const requestUrl =
      new URL(
        request.url,
      );

    const playDate =
      requestUrl
        .searchParams
        .get(
          "date",
        )
        ?.trim() ||
      getTurkeyDateKey();

    /* =====================================================
       3. PLAYER BASED DAILY GAMES

       Guess The Player
       Player Quiz
       Wordle
    ===================================================== */

    const playerGames =
      await Promise.all(
        Object.entries(
          DAILY_GAME_TABLES,
        ).map(
          async (
            [
              gameCode,
              tableName,
            ],
          ) => {
            const {
              data:
                dailyRow,

              error:
                dailyError,
            } =
              await supabaseAdmin
                .from(
                  tableName,
                )
                .select(`
                  play_date,
                  player_id,
                  is_published,
                  created_at,
                  created_by
                `)
                .eq(
                  "play_date",
                  playDate,
                )
                .maybeSingle<DailyPlayerRow>();

            if (
              dailyError
            ) {
              throw new Error(
                `${tableName} okunamadı: ${dailyError.message}`,
              );
            }

            /* ---------------------------------------------
               Bu tarih için aday yok
            --------------------------------------------- */

            if (
              !dailyRow
            ) {
              return {
                gameCode:
                  gameCode as DailyGameCode,

                label:
                  DAILY_GAME_LABELS[
                    gameCode as DailyGameCode
                  ],

                type:
                  "player" as const,

                record:
                  null,
              };
            }

            /* ---------------------------------------------
               Oyuncu bilgisi
            --------------------------------------------- */

            const {
              data:
                player,

              error:
                playerError,
            } =
              await supabaseAdmin
                .from(
                  "guess_players",
                )
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
                .eq(
                  "player_id",
                  dailyRow.player_id,
                )
                .maybeSingle();

            if (
              playerError
            ) {
              throw new Error(
                `Oyuncu bilgisi okunamadı: ${playerError.message}`,
              );
            }

            return {
              gameCode:
                gameCode as DailyGameCode,

              label:
                DAILY_GAME_LABELS[
                  gameCode as DailyGameCode
                ],

              type:
                "player" as const,

              record: {
                playDate:
                  dailyRow.play_date,

                playerId:
                  Number(
                    dailyRow.player_id,
                  ),

                isPublished:
                  Boolean(
                    dailyRow.is_published,
                  ),

                createdAt:
                  dailyRow.created_at,

                createdBy:
                  dailyRow.created_by,

                player:
                  player
                    ? {
                        id:
                          Number(
                            player.player_id,
                          ),

                        fullName:
                          player.name,

                        imageUrl:
                          player.image_url ??
                          null,

                        nationality:
                          player.nationality ??
                          null,

                        position:
                          player.position ??
                          null,

                        subPosition:
                          player.sub_position ??
                          null,

                        club:
                          player.current_club_name ??
                          null,

                        popularityScore:
                          player.popularity_score ===
                          null
                            ? null
                            : Number(
                                player.popularity_score,
                              ),
                      }
                    : null,
              },
            };
          },
        ),
      );

    /* =====================================================
       4. TIC TAC TOE DAILY GRID
    ===================================================== */

    const {
      data:
        ticTacToeRow,

      error:
        ticTacToeError,
    } =
      await supabaseAdmin
        .from(
          "daily_tic_tac_toe",
        )
        .select(`
          id,
          play_date,
          rows,
          columns,
          cells,
          quality_score,
          is_published,
          created_at,
          created_by
        `)
        .eq(
          "play_date",
          playDate,
        )
        .maybeSingle<DailyTicTacToeRow>();

    if (
      ticTacToeError
    ) {
      throw new Error(
        `daily_tic_tac_toe okunamadı: ${ticTacToeError.message}`,
      );
    }

    /* =====================================================
       5. TIC TAC TOE RESPONSE
    ===================================================== */

    const ticTacToeGame = {
      gameCode:
        "tic_tac_toe" as const,

      label:
        DAILY_GAME_LABELS
          .tic_tac_toe,

      type:
        "grid" as const,

      record:
        ticTacToeRow
          ? {
              playDate:
                ticTacToeRow.play_date,

              isPublished:
                Boolean(
                  ticTacToeRow.is_published,
                ),

              createdAt:
                ticTacToeRow.created_at,

              createdBy:
                ticTacToeRow.created_by,

              grid: {
                rows:
                  ticTacToeRow.rows ??
                  [],

                columns:
                  ticTacToeRow.columns ??
                  [],

                /*
                 * Admin endpoint olduğu için cells
                 * burada dönebilir.
                 *
                 * Public endpoint'te validPlayerIds
                 * kesinlikle göndermeyeceğiz.
                 */
                cells:
                  ticTacToeRow.cells ??
                  [],

                qualityScore:
                  ticTacToeRow.quality_score ===
                  null
                    ? null
                    : Number(
                        ticTacToeRow.quality_score,
                      ),
              },
            }
          : null,
    };

    /* =====================================================
       6. RESPONSE ORDER

       İstediğimiz günlük görev sırası:
       1 Guess The Player
       2 Player Quiz
       3 Tic Tac Toe
       4 Wordle
    ===================================================== */

    const gameMap =
      new Map(
        playerGames.map(
          (
            game,
          ) => [
            game.gameCode,
            game,
          ],
        ),
      );

    const games = [
      gameMap.get(
        "guess_the_player",
      ),

      gameMap.get(
        "player_quiz",
      ),

      ticTacToeGame,

      gameMap.get(
        "wordle",
      ),
    ].filter(
      Boolean,
    );

    /* =====================================================
       7. RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      playDate,

      games,
    });
  } catch (
    error
  ) {
    console.error(
      "Admin daily-games GET hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof
          Error
            ? error.message
            : "Günlük oyunlar okunamadı.",
      },
      {
        status: 500,
      },
    );
  }
}