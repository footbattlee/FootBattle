import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin/require-admin";

import {
  generateTicTacToeGrid,
} from "@/lib/tic-tac-toe/grid-generator";

import { supabaseAdmin } from "@/lib/supabase/server";

type RegenerateRequest = {
  playDate?: string;
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
    /* =====================================================
       1. BODY
    ===================================================== */

    const body =
      (await request.json()) as RegenerateRequest;

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

    /* =====================================================
       2. GRID ÜRET
    ===================================================== */

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
            "Geçerli Tic Tac Toe grid'i oluşturulamadı.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       3. RESPONSE FORMAT
    ===================================================== */

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

    /* =====================================================
       4. UPSERT
    ===================================================== */

    const {
      data:
        savedGrid,

      error:
        saveError,
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

            /*
             * Yeni grid üretilince tekrar taslak olsun.
             */
            is_published:
              false,

            created_by:
              admin.user.id,

            created_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "play_date",
          },
        )
        .select(`
          id,
          play_date,
          rows,
          columns,
          quality_score,
          is_published,
          created_at
        `)
        .single();

    if (
      saveError ||
      !savedGrid
    ) {
      console.error(
        "Daily Tic Tac Toe grid save error:",
        saveError,
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            saveError?.message ??
            "Tic Tac Toe grid'i kaydedilemedi.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       5. RESPONSE
    ===================================================== */

    return NextResponse.json({
      ok: true,

      message:
        "Tic Tac Toe grid'i yeniden oluşturuldu.",

      grid: {
        playDate:
          savedGrid.play_date,

        rows:
          savedGrid.rows,

        columns:
          savedGrid.columns,

        qualityScore:
          savedGrid.quality_score ===
          null
            ? null
            : Number(
                savedGrid.quality_score,
              ),

        isPublished:
          Boolean(
            savedGrid.is_published,
          ),
      },
    });
  } catch (
    error
  ) {
    console.error(
      "Daily Tic Tac Toe regenerate error:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Tic Tac Toe grid'i yeniden oluşturulamadı.",
      },
      {
        status: 500,
      },
    );
  }
}