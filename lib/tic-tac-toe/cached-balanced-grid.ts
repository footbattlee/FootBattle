import { unstable_cache } from "next/cache";

import { generateBalancedTicTacToeGrid } from "@/lib/tic-tac-toe/balanced-grid-generator";
import type { TicTacToeGrid } from "@/lib/tic-tac-toe/grid-generator";

const getCachedBaseGrid = unstable_cache(
  async () => generateBalancedTicTacToeGrid(),
  ["tic-tac-toe-balanced-base-grid-v1"],
  { revalidate: 300 },
);

function shuffledIndexes() {
  const values = [0, 1, 2];
  for (let index = values.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [values[index], values[randomIndex]] = [values[randomIndex], values[index]];
  }
  return values;
}

function reshuffleGrid(base: TicTacToeGrid): TicTacToeGrid {
  const rowOrder = shuffledIndexes();
  const columnOrder = shuffledIndexes();
  const rowMap = new Map(rowOrder.map((oldIndex, newIndex) => [oldIndex, newIndex]));
  const columnMap = new Map(columnOrder.map((oldIndex, newIndex) => [oldIndex, newIndex]));

  const rows = rowOrder.map((index) => ({ ...base.rows[index] }));
  const columns = columnOrder.map((index) => ({ ...base.columns[index] }));
  const cells = base.cells.map((cell) => {
    const rowIndex = rowMap.get(cell.rowIndex) ?? cell.rowIndex;
    const columnIndex = columnMap.get(cell.columnIndex) ?? cell.columnIndex;
    return {
      ...cell,
      rowIndex,
      columnIndex,
      row: rows[rowIndex],
      column: columns[columnIndex],
      validPlayerIds: [...cell.validPlayerIds],
    };
  });

  return {
    ...base,
    rows,
    columns,
    cells,
  };
}

export async function generateCachedBalancedTicTacToeGrid() {
  const base = await getCachedBaseGrid();
  return reshuffleGrid(base);
}
