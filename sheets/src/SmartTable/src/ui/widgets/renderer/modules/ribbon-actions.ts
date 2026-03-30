/**
 * Ribbon Actions Module - Действия ribbon панели
 */

export interface RibbonContext {
  state: any;
  CONFIG: any;
  getCellKey: (row: number, col: number) => string;
  getCellElement: (row: number, col: number) => HTMLElement | null;
  getCurrentData: () => Map<string, any>;
  updateAIDataCache: () => void;
  renderCells: () => void;
  selectCell: (row: number, col: number) => void;
}

/**
 * Автосумма
 */
export function autoSum(context: RibbonContext): void {
  const { state, getCellKey, getCurrentData } = context;
  const data = getCurrentData();
  const { row, col } = state.selectedCell;

  let sum = 0;
  let count = 0;

  // Суммируем значения выше
  for (let r = row - 1; r >= 0; r--) {
    const key = getCellKey(r, col);
    const cellData = data.get(key);
    if (cellData?.value) {
      const num = parseFloat(cellData.value);
      if (!isNaN(num)) {
        sum += num;
        count++;
      } else {
        break;
      }
    }
  }

  if (count === 0) {
    // Суммируем значения слева
    for (let c = col - 1; c >= 0; c--) {
      const key = getCellKey(row, c);
      const cellData = data.get(key);
      if (cellData?.value) {
        const num = parseFloat(cellData.value);
        if (!isNaN(num)) {
          sum += num;
          count++;
        } else {
          break;
        }
      }
    }
  }

  if (count > 0) {
    const key = getCellKey(row, col);
    data.set(key, { value: sum.toString() });
    context.renderCells();
    context.updateAIDataCache();
  }
}

/**
 * Вставить в ячейку
 */
export function pasteToCell(text: string, context: RibbonContext): void {
  const { state, getCellKey, getCurrentData } = context;
  const data = getCurrentData();
  const { row, col } = state.selectedCell;
  const key = getCellKey(row, col);

  data.set(key, { value: text });
  context.renderCells();
  context.updateAIDataCache();
}

/**
 * Очистить ячейку
 */
export function clearCell(row: number, col: number, context: RibbonContext): void {
  const { getCellKey, getCurrentData, getCellElement } = context;
  const data = getCurrentData();
  const key = getCellKey(row, col);

  data.delete(key);

  const cell = getCellElement(row, col);
  if (cell) {
    cell.textContent = '';
    cell.style.backgroundColor = '';
    cell.style.color = '';
  }

  context.renderCells();
  context.updateAIDataCache();
}

/**
 * Получить данные выделенного диапазона
 */
export function getSelectedRangeData(context: RibbonContext): { labels: string[]; datasets: { label: string; data: number[] }[] } {
  const { state, getCellKey, getCurrentData } = context;
  const data = getCurrentData();

  if (!state.selectionStart || !state.selectionEnd) {
    return { labels: [], datasets: [] };
  }

  const minRow = Math.min(state.selectionStart.row, state.selectionEnd.row);
  const maxRow = Math.max(state.selectionStart.row, state.selectionEnd.row);
  const minCol = Math.min(state.selectionStart.col, state.selectionEnd.col);
  const maxCol = Math.max(state.selectionStart.col, state.selectionEnd.col);

  const labels: string[] = [];
  const values: number[] = [];

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const key = getCellKey(r, c);
      const cellData = data.get(key);
      if (cellData?.value) {
        labels.push(cellData.value);
        const numValue = parseFloat(cellData.value);
        values.push(isNaN(numValue) ? 0 : numValue);
      }
    }
  }

  return {
    labels,
    datasets: [{ label: 'Данные', data: values }]
  };
}
