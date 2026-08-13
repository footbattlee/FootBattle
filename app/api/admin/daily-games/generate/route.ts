import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";

import {
  generateTicTacToeGrid,
} from "@/lib/tic-tac-toe/grid-generator";

import { supabaseAdmin } from "@/lib/supabase/server";

type GenerateRequest = {
  playDate?: string;
  force?: boolean;
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
        error: admin.error,
      },
      {
        status: admin.status,
      },
    );
  }

  try {
    const body =
      (await request.json()) as GenerateRequest;

    const playDate =
      body.playDate?.trim();

    const force =
      Boolean(
        body.force,
      );

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

    /* =====================================================
       1. PLAYER BASED DAILY GAMES
    ===================================================== */

    const {
      data,
      error,
    } =
      await supabaseAdmin.rpc(
        "generate_daily_game_candidates",
        {
          p_play_date:
            playDate,

          p_force:
            force,

          p_created_by:
            admin.user.id,
        },
      );

    if (error) {
      console.error(
        "Günlük oyuncu üretimi başarısız:",
        error,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            error.message,
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       2. TIC TAC TOE MEVCUT MU?
    ===================================================== */

    const {
      data:
        existingTicTacToe,
      error:
        existingError,
    } =
      await supabaseAdmin
        .from(
          "daily_tic_tac_toe",
        )
        .select(
          "id, play_date",
        )
        .eq(
          "play_date",
          playDate,
        )
        .maybeSingle();

    if (
      existingError
    ) {
      throw new Error(
        existingError.message,
      );
    }

    /* =====================================================
       3. GEREKİYORSA GRID ÜRET
    ===================================================== */

    let generatedGrid =
      null;

    if (
      force ||
      !existingTicTacToe
    ) {
      const grid =
        await generateTicTacToeGrid();

      if (
        !grid ||
        grid.rows.length !==
          3 ||
        grid.columns.length !==
          3 ||
        grid.cells.length !==
          9
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Tic Tac Toe günlük grid üretilemedi.",
          },
          {
            status: 500,
          },
        );
      }

      const rows =
        grid.rows.map(
          (
            item,
            index,
          ) => ({
            index,

            type:
              item.type,

            value:
              item.value,
          }),
        );

      const columns =
        grid.columns.map(
          (
            item,
            index,
          ) => ({
            index,

            type:
              item.type,

            value:
              item.value,
          }),
        );

      const cells =
        grid.cells.map(
          (
            cell,
          ) => ({
            rowIndex:
              cell.rowIndex,

            columnIndex:
              cell.columnIndex,

            rowType:
              cell.row.type,

            rowValue:
              cell.row.value,

            columnType:
              cell.column.type,

            columnValue:
              cell.column.value,

            validPlayerIds:
              cell.validPlayerIds,
          }),
        );

      const {
        error:
          upsertError,
      } =
        await supabaseAdmin
          .from(
            "daily_tic_tac_toe",
          )
          .upsert(
            {
              play_date:
                playDate,

              rows,

              columns,

              cells,

              quality_score:
                grid.qualityScore,

              is_published:
                false,

              created_by:
                admin.user.id,
            },
            {
              onConflict:
                "play_date",
            },
          );

      if (
        upsertError
      ) {
        throw new Error(
          upsertError.message,
        );
      }

      generatedGrid = {
        rows,
        columns,
        cells,
        qualityScore:
          grid.qualityScore,
      };
    }

    /* =====================================================
       4. RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      generated:
        data ?? [],

      ticTacToe:
        generatedGrid,

      ticTacToeGenerated:
        Boolean(
          generatedGrid,
        ),
    });
  } catch (error) {
    console.error(
      "Generate endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Günlük oyun adayları üretilemedi.",
      },
      {
        status: 500,
      },
    );
  }
}