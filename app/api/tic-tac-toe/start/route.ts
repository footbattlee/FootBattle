import { NextResponse } from "next/server";

import {
  generateTicTacToeGrid,
  type TicTacToeAxisItem,
} from "@/lib/tic-tac-toe/grid-generator";

import { supabaseAdmin } from "@/lib/supabase/server";

const GAME_DURATION_SECONDS =
  120;

type AxisResponseItem = {
  index: number;
  type:
    | "club"
    | "nationality";
  value: string;
};

function mapAxis(
  values:
    TicTacToeAxisItem[],
): AxisResponseItem[] {
  return values.map(
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
}

export async function POST() {
  try {
    /* =====================================================
       1. GRID ÜRET
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
            "Geçerli TicTacToe grid'i oluşturulamadı.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       2. SESSION
    ===================================================== */

    const {
      data:
        session,

      error:
        sessionError,
    } =
      await supabaseAdmin
        .from(
          "tic_tac_toe_sessions",
        )
        .insert({
          mode:
            "solo",

          score:
            0,

          correct_count:
            0,

          wrong_count:
            0,

          duration_seconds:
            GAME_DURATION_SECONDS,

          completed:
            false,
        })
        .select(`
          id,
          mode,
          score,
          correct_count,
          wrong_count,
          duration_seconds,
          completed,
          created_at
        `)
        .single();

    if (
      sessionError ||
      !session
    ) {
      console.error(
        "TicTacToe session oluşturma hatası:",
        sessionError,
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            "TicTacToe oturumu oluşturulamadı.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       3. HÜCRELERİ KAYDET
    ===================================================== */

    const cellRows =
      grid.cells.map(
        (
          cell,
        ) => ({
          session_id:
            session.id,

          row_index:
            cell.rowIndex,

          column_index:
            cell.columnIndex,

          row_type:
            cell.row.type,

          row_value:
            cell.row.value,

          column_type:
            cell.column.type,

          column_value:
            cell.column.value,

          valid_player_ids:
            cell.validPlayerIds,

          answered:
            false,

          correct:
            false,

          player_id:
            null,
        }),
      );

    const {
      error:
        cellsError,
    } =
      await supabaseAdmin
        .from(
          "tic_tac_toe_cells",
        )
        .insert(
          cellRows,
        );

    if (
      cellsError
    ) {
      console.error(
        "TicTacToe hücre insert hatası:",
        cellsError,
      );

      /*
       * Yarım session bırakmayalım.
       */
      await supabaseAdmin
        .from(
          "tic_tac_toe_sessions",
        )
        .delete()
        .eq(
          "id",
          session.id,
        );

      return NextResponse.json(
        {
          ok: false,

          error:
            "TicTacToe hücreleri oluşturulamadı.",
        },
        {
          status: 500,
        },
      );
    }

    /* =====================================================
       4. EXPIRES AT
    ===================================================== */

    const createdAtMs =
      new Date(
        session.created_at,
      ).getTime();

    const expiresAt =
      new Date(
        createdAtMs +
          GAME_DURATION_SECONDS *
            1000,
      ).toISOString();

    /* =====================================================
       5. RESPONSE

       KRİTİK:
       validPlayerIds client'a gönderilmiyor.
    ===================================================== */

    return NextResponse.json({
      ok: true,

      game: {
        code:
          "tic_tac_toe",

        label:
          "Futbol Tic Tac Toe",

        mode:
          "solo",

        durationSeconds:
          GAME_DURATION_SECONDS,

        scorePerCorrect:
          10,

        fullGridBonus:
          50,
      },

      session: {
        id:
          session.id,

        startedAt:
          session.created_at,

        expiresAt,

        score:
          0,

        correctCount:
          0,

        wrongCount:
          0,
      },

      grid: {
        type:
          grid.mode,

        rows:
          mapAxis(
            grid.rows,
          ),

        columns:
          mapAxis(
            grid.columns,
          ),

        cells:
          grid.cells.map(
            (
              cell,
            ) => ({
              rowIndex:
                cell.rowIndex,

              columnIndex:
                cell.columnIndex,

              answered:
                false,

              correct:
                false,

              player:
                null,
            }),
          ),

        qualityScore:
          grid.qualityScore,
      },
    });
  } catch (
    error
  ) {
    console.error(
      "TicTacToe solo start endpoint hatası:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "TicTacToe hazırlanırken hata oluştu.",
      },
      {
        status: 500,
      },
    );
  }
}