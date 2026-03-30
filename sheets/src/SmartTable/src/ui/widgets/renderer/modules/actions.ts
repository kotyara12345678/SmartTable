/**
 * Actions Module - Действия пользователя
 */

export interface ActionContext {
  state: any;
  CONFIG: any;
  getCellKey: (row: number, col: number) => string;
  getCellElement: (row: number, col: number) => HTMLElement | null;
  getCurrentData: () => Map<string, any>;
  deleteCellValue: (row: number, col: number) => void;
  updateAIDataCache: () => void;
  renderCells: () => void;
  removeFormula: (key: string) => void;
}

/**
 * Вставить строку выше
 */
export function insertRowAboveAt(row: number, data: Map<string, any>): void {
  const rowsToMove: Array<{ oldKey: string; newKey: string; value: any }> = [];
  data.forEach((cellData, key) => {
    const [cellRow] = key.split('-').map(Number);
    if (cellRow >= row) {
      const newKey = `${cellRow + 1}-${cellRow === cellRow ? cellRow : cellRow}`;
      rowsToMove.push({ oldKey: key, newKey, value: cellData });
    }
  });
  rowsToMove.forEach(item => { data.delete(item.oldKey); data.set(item.newKey, item.value); });
}

/**
 * Вставить строку ниже
 */
export function insertRowBelowAt(row: number, data: Map<string, any>): void {
  insertRowAboveAt(row + 1, data);
}

/**
 * Удалить строку
 */
export function deleteRowAt(row: number, data: Map<string, any>): void {
  const keysToDelete: string[] = [];
  data.forEach((_, key) => {
    const [cellRow] = key.split('-').map(Number);
    if (cellRow === row) keysToDelete.push(key);
  });
  keysToDelete.forEach(key => data.delete(key));
}

/**
 * Вставить столбец слева
 */
export function insertColumnLeftAt(col: number, data: Map<string, any>): void {
  const colsToMove: Array<{ oldKey: string; newKey: string; value: any }> = [];
  data.forEach((cellData, key) => {
    const [row, cellCol] = key.split('-').map(Number);
    if (cellCol >= col) {
      const newKey = `${row}-${cellCol + 1}`;
      colsToMove.push({ oldKey: key, newKey, value: cellData });
    }
  });
  colsToMove.forEach(item => { data.delete(item.oldKey); data.set(item.newKey, item.value); });
}

/**
 * Вставить столбец справа
 */
export function insertColumnRightAt(col: number, data: Map<string, any>): void {
  insertColumnLeftAt(col + 1, data);
}

/**
 * Удалить столбец
 */
export function deleteColumnAt(col: number, data: Map<string, any>): void {
  const keysToDelete: string[] = [];
  data.forEach((_, key) => {
    const [row, cellCol] = key.split('-').map(Number);
    if (cellCol === col) keysToDelete.push(key);
  });
  keysToDelete.forEach(key => data.delete(key));
}

/**
 * Удалить выделенные ячейки
 */
export function deleteSelectedCells(context: ActionContext): void {
  const { state, getCurrentData, getCellElement, getCellKey, removeFormula, updateAIDataCache } = context;
  const data = getCurrentData();

  if (state.selectionStart && state.selectionEnd) {
    const minRow = Math.min(state.selectionStart.row, state.selectionEnd.row);
    const maxRow = Math.max(state.selectionStart.row, state.selectionEnd.row);
    const minCol = Math.min(state.selectionStart.col, state.selectionEnd.col);
    const maxCol = Math.max(state.selectionStart.col, state.selectionEnd.col);

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const key = getCellKey(r, c);
        const cell = getCellElement(r, c);
        if (cell) {
          cell.textContent = '';
          cell.style.backgroundColor = '';
        }
        data.delete(key);
        removeFormula(key);
      }
    }
  } else {
    const key = getCellKey(state.selectedCell.row, state.selectedCell.col);
    const cell = getCellElement(state.selectedCell.row, state.selectedCell.col);
    if (cell) {
      cell.textContent = '';
      cell.style.backgroundColor = '';
    }
    data.delete(key);
    removeFormula(key);
  }

  updateAIDataCache();
}

/**
 * Сохранить в историю буфера обмена
 */
export function saveToClipboardHistory(text: string): void {
  if (!text) return;

  const history = JSON.parse(localStorage.getItem('clipboardHistory') || '[]');
  const MAX_HISTORY = 50;

  history.unshift({
    text: text,
    timestamp: Date.now()
  });

  if (history.length > MAX_HISTORY) {
    history.splice(MAX_HISTORY);
  }

  localStorage.setItem('clipboardHistory', JSON.stringify(history));
}
