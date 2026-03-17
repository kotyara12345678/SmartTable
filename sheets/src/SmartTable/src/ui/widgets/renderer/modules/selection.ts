/**
 * Selection Module - Выделение и навигация по ячейкам
 */

export interface CellPosition {
  row: number;
  col: number;
}

export interface SelectionState {
  start: CellPosition | null;
  end: CellPosition | null;
  isSelecting: boolean;
}

/**
 * Проверить является ли ячейка заголовком строки
 */
export function isRowHeader(col: number): boolean {
  return col === -1;
}

/**
 * Проверить является ли ячейка заголовком колонки
 */
export function isColumnHeader(row: number): boolean {
  return row === -1;
}

/**
 * Получить границы выделенного диапазона
 */
export function getSelectionBounds(
  start: CellPosition | null,
  end: CellPosition | null
): {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
} | null {
  if (!start || !end) return null;

  return {
    minRow: Math.min(start.row, end.row),
    maxRow: Math.max(start.row, end.row),
    minCol: Math.min(start.col, end.col),
    maxCol: Math.max(start.col, end.col),
  };
}

/**
 * Получить все ячейки в выделенном диапазоне
 */
export function getSelectedCells(
  start: CellPosition | null,
  end: CellPosition | null
): CellPosition[] {
  const bounds = getSelectionBounds(start, end);
  if (!bounds) return [];

  const cells: CellPosition[] = [];
  for (let r = bounds.minRow; r <= bounds.maxRow; r++) {
    for (let c = bounds.minCol; c <= bounds.maxCol; c++) {
      cells.push({ row: r, col: c });
    }
  }
  return cells;
}

/**
 * Переместить выделение на следующую ячейку
 */
export function moveSelection(
  current: CellPosition,
  direction: 'up' | 'down' | 'left' | 'right',
  maxRows: number,
  maxCols: number
): CellPosition {
  const { row, col } = current;

  switch (direction) {
    case 'up':
      return { row: Math.max(0, row - 1), col };
    case 'down':
      return { row: Math.min(maxRows - 1, row + 1), col };
    case 'left':
      return { row, col: Math.max(0, col - 1) };
    case 'right':
      return { row, col: Math.min(maxCols - 1, col + 1) };
  }
}

/**
 * Выделить всю строку
 */
export function selectRow(row: number, totalCols: number): CellPosition[] {
  const cells: CellPosition[] = [];
  for (let c = 0; c < totalCols; c++) {
    cells.push({ row, col: c });
  }
  return cells;
}

/**
 * Выделить весь столбец
 */
export function selectColumn(col: number, totalRows: number): CellPosition[] {
  const cells: CellPosition[] = [];
  for (let r = 0; r < totalRows; r++) {
    cells.push({ row: r, col });
  }
  return cells;
}

/**
 * Выделить всю таблицу
 */
export function selectAll(totalRows: number, totalCols: number): CellPosition[] {
  const cells: CellPosition[] = [];
  for (let r = 0; r < totalRows; r++) {
    for (let c = 0; c < totalCols; c++) {
      cells.push({ row: r, col: c });
    }
  }
  return cells;
}

/**
 * Проверить находится ли ячейка в диапазоне
 */
export function isCellInRange(
  cell: CellPosition,
  start: CellPosition | null,
  end: CellPosition | null
): boolean {
  if (!start || !end) return false;

  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);

  return (
    cell.row >= minRow &&
    cell.row <= maxRow &&
    cell.col >= minCol &&
    cell.col <= maxCol
  );
}
