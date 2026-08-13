import { NextResponse } from "next/server";

import {
  DAILY_GAME_TABLES,
  isAdminDailyGameCode,
} from "@/lib/admin/daily-games";

import { requireAdmin } from "@/lib/admin/require-admin";

import { supabaseAdmin } from "@/lib/supabase/server";

type PublishRequest = {
  playDate?: string;

  gameCode?:
    | string
    | "all";

  isPublished?: boolean;
};

export async function POST(
  request: Request,
) {
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
       1. BODY
    ===================================================== */

    const body =
      (await request.json()) as PublishRequest;

    const playDate =
      body.playDate?.trim();

    if (!playDate) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyun tarihi zorunludur.",
        },
        {
          status: 400,
        },
      );
    }

    const isPublished =
      body.isPublished !==
      false;

    /* =====================================================
       2. GAME CODES
    ===================================================== */

    const allGameCodes = [
      "guess_the_player",
      "player_quiz",
      "tic_tac_toe",
      "wordle",
    ] as const;

    const gameCodes =
      body.gameCode ===
      "all"
        ? [
            ...allGameCodes,
          ]
        : isAdminDailyGameCode(
              body.gameCode,
            )
          ? [
              body.gameCode,
            ]
          : [];

    if (
      gameCodes.length ===
      0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Oyun kodu geçersiz.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       3. PUBLISH
    ===================================================== */

    for (
      const gameCode of
        gameCodes
    ) {
      /* ===================================================
         TIC TAC TOE
      =================================================== */

      if (
        gameCode ===
        "tic_tac_toe"
      ) {
        const {
          data:
            ticTacToeRow,

          error:
            ticTacToeFindError,
        } =
          await supabaseAdmin
            .from(
              "daily_tic_tac_toe",
            )
            .select(
              "id",
            )
            .eq(
              "play_date",
              playDate,
            )
            .maybeSingle();

        if (
          ticTacToeFindError
        ) {
          throw new Error(
            ticTacToeFindError.message,
          );
        }

        if (
          !ticTacToeRow
        ) {
          return NextResponse.json(
            {
              ok: false,

              error:
                `tic_tac_toe için ${playDate} tarihinde aday bulunamadı.`,
            },
            {
              status: 404,
            },
          );
        }

        const {
          error:
            ticTacToeUpdateError,
        } =
          await supabaseAdmin
            .from(
              "daily_tic_tac_toe",
            )
            .update({
              is_published:
                isPublished,
            })
            .eq(
              "play_date",
              playDate,
            );

        if (
          ticTacToeUpdateError
        ) {
          throw new Error(
            ticTacToeUpdateError.message,
          );
        }

        continue;
      }

      /* ===================================================
         PLAYER BASED GAMES
      =================================================== */

      const tableName =
        DAILY_GAME_TABLES[
          gameCode as keyof typeof DAILY_GAME_TABLES
        ];

      if (!tableName) {
        return NextResponse.json(
          {
            ok: false,

            error:
              `${gameCode} için günlük oyun tablosu bulunamadı.`,
          },
          {
            status: 400,
          },
        );
      }

      const {
        data:
          row,

        error:
          findError,
      } =
        await supabaseAdmin
          .from(
            tableName,
          )
          .select(
            "player_id",
          )
          .eq(
            "play_date",
            playDate,
          )
          .maybeSingle();

      if (
        findError
      ) {
        throw new Error(
          findError.message,
        );
      }

      if (!row) {
        return NextResponse.json(
          {
            ok: false,

            error:
              `${gameCode} için ${playDate} tarihinde aday bulunamadı.`,
          },
          {
            status: 404,
          },
        );
      }

      const {
        error:
          updateError,
      } =
        await supabaseAdmin
          .from(
            tableName,
          )
          .update({
            is_published:
              isPublished,
          })
          .eq(
            "play_date",
            playDate,
          );

      if (
        updateError
      ) {
        throw new Error(
          updateError.message,
        );
      }
    }

    /* =====================================================
       4. RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      gameCode:
        body.gameCode,

      isPublished,

      updatedGames:
        gameCodes,
    });
  } catch (
    error
  ) {
    console.error(
      "Publish endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Yayın durumu güncellenemedi.",
      },
      {
        status: 500,
      },
    );
  }
}