import { NextResponse } from "next/server";

import { localizeFootballAxisValue } from "@/lib/football/localization";
import { generateBalancedTicTacToeGrid } from "@/lib/tic-tac-toe/balanced-grid-generator";
import { type TicTacToeAxisItem } from "@/lib/tic-tac-toe/grid-generator";
import { supabaseAdmin } from "@/lib/supabase/server";

const GAME_DURATION_SECONDS = 120;

type AxisResponseItem = { index: number; type: "club" | "nationality"; value: string };
type DailyGridCell = {
  rowType: "club" | "nationality";
  rowIndex: number;
  rowValue: string;
  columnType: "club" | "nationality";
  columnIndex: number;
  columnValue: string;
  validPlayerIds: number[];
};
type PreparedGrid = {
  mode: string;
  rows: AxisResponseItem[];
  columns: AxisResponseItem[];
  cells: Array<{
    rowIndex: number;
    columnIndex: number;
    row: { type: "club" | "nationality"; value: string };
    column: { type: "club" | "nationality"; value: string };
    validPlayerIds: number[];
  }>;
  qualityScore: number;
};

function getTurkeyDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function mapAxis(values: TicTacToeAxisItem[]): AxisResponseItem[] {
  return values.map((item, index) => ({ index, type: item.type, value: item.value }));
}

function displayAxis(items: AxisResponseItem[]) {
  return items.map((item) => ({
    ...item,
    value: localizeFootballAxisValue(item.type, item.value),
  }));
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const dailyMode = url.searchParams.get("daily") === "1";
    let preparedGrid: PreparedGrid;

    if (dailyMode) {
      const playDate = getTurkeyDateKey();
      const { data: dailyGrid, error: dailyError } = await supabaseAdmin
        .from("daily_tic_tac_toe")
        .select("play_date, rows, columns, cells, quality_score, is_published")
        .eq("play_date", playDate)
        .eq("is_published", true)
        .maybeSingle();
      if (dailyError) return NextResponse.json({ ok: false, error: "Bugünün Tic Tac Toe grid'i okunamadı." }, { status: 500 });
      if (!dailyGrid) return NextResponse.json({ ok: false, error: "Bugünün Tic Tac Toe grid'i henüz yayınlanmadı." }, { status: 404 });

      const rows = (dailyGrid.rows ?? []) as AxisResponseItem[];
      const columns = (dailyGrid.columns ?? []) as AxisResponseItem[];
      const dailyCells = (dailyGrid.cells ?? []) as DailyGridCell[];
      if (rows.length !== 3 || columns.length !== 3 || dailyCells.length !== 9) {
        return NextResponse.json({ ok: false, error: "Yayınlanan günlük Tic Tac Toe grid'i geçersiz." }, { status: 422 });
      }

      preparedGrid = {
        mode: "daily",
        rows,
        columns,
        qualityScore: Number(dailyGrid.quality_score ?? 0),
        cells: dailyCells.map((cell) => ({
          rowIndex: Number(cell.rowIndex),
          columnIndex: Number(cell.columnIndex),
          row: { type: cell.rowType, value: cell.rowValue },
          column: { type: cell.columnType, value: cell.columnValue },
          validPlayerIds: Array.isArray(cell.validPlayerIds) ? cell.validPlayerIds.map(Number) : [],
        })),
      };
    } else {
      const grid = await generateBalancedTicTacToeGrid();
      if (!grid || grid.rows.length !== 3 || grid.columns.length !== 3 || grid.cells.length !== 9) {
        return NextResponse.json({ ok: false, error: "Geçerli TicTacToe grid'i oluşturulamadı." }, { status: 500 });
      }
      preparedGrid = {
        mode: grid.mode,
        rows: mapAxis(grid.rows),
        columns: mapAxis(grid.columns),
        cells: grid.cells.map((cell) => ({
          rowIndex: cell.rowIndex,
          columnIndex: cell.columnIndex,
          row: { type: cell.row.type, value: cell.row.value },
          column: { type: cell.column.type, value: cell.column.value },
          validPlayerIds: cell.validPlayerIds,
        })),
        qualityScore: grid.qualityScore,
      };
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("tic_tac_toe_sessions")
      .insert({ mode: "solo", score: 0, correct_count: 0, wrong_count: 0, duration_seconds: GAME_DURATION_SECONDS, completed: false })
      .select("id, mode, score, correct_count, wrong_count, duration_seconds, completed, created_at")
      .single();
    if (sessionError || !session) return NextResponse.json({ ok: false, error: "TicTacToe oturumu oluşturulamadı." }, { status: 500 });

    const cellRows = preparedGrid.cells.map((cell) => ({
      session_id: session.id,
      row_index: cell.rowIndex,
      column_index: cell.columnIndex,
      row_type: cell.row.type,
      row_value: cell.row.value,
      column_type: cell.column.type,
      column_value: cell.column.value,
      valid_player_ids: cell.validPlayerIds,
      answered: false,
      correct: false,
      player_id: null,
    }));
    const { error: cellsError } = await supabaseAdmin.from("tic_tac_toe_cells").insert(cellRows);
    if (cellsError) {
      await supabaseAdmin.from("tic_tac_toe_sessions").delete().eq("id", session.id);
      return NextResponse.json({ ok: false, error: "TicTacToe hücreleri oluşturulamadı." }, { status: 500 });
    }

    const createdAtMs = new Date(session.created_at).getTime();
    const expiresAt = new Date(createdAtMs + GAME_DURATION_SECONDS * 1000).toISOString();

    return NextResponse.json({
      ok: true,
      mode: dailyMode ? "daily" : "random",
      daily: dailyMode,
      game: { code: "tic_tac_toe", label: "Futbol Tic Tac Toe", mode: "solo", durationSeconds: GAME_DURATION_SECONDS, scorePerCorrect: 10, fullGridBonus: 50 },
      session: { id: session.id, startedAt: session.created_at, expiresAt, score: 0, correctCount: 0, wrongCount: 0 },
      grid: {
        type: preparedGrid.mode,
        rows: displayAxis(preparedGrid.rows),
        columns: displayAxis(preparedGrid.columns),
        cells: preparedGrid.cells.map((cell) => ({ rowIndex: cell.rowIndex, columnIndex: cell.columnIndex, answered: false, correct: false, player: null })),
        qualityScore: preparedGrid.qualityScore,
      },
    });
  } catch (error) {
    console.error("TicTacToe solo start endpoint hatası:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "TicTacToe hazırlanırken hata oluştu." }, { status: 500 });
  }
}
