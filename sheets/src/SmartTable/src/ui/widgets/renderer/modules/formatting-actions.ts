/**
 * Formatting Actions Module - Действия форматирования
 */

export interface FormattingContext {
  state: any;
  getCellKey: (row: number, col: number) => string;
  getCellElement: (row: number, col: number) => HTMLElement | null;
  getCurrentData: () => Map<string, any>;
  updateAIDataCache: () => void;
  pushUndo: (key: string, oldValue: any) => void;
  autoSave: () => void;
}

/**
 * Применить цвет к выделению
 */
export function applyColorToSelection(
  type: 'text' | 'fill',
  color: string,
  context: FormattingContext
): void {
  const { state, getCurrentData, getCellElement, getCellKey } = context;
  const data = getCurrentData();
  const cellsToColor: Array<{ row: number; col: number }> = [];

  if (state.selectionStart && state.selectionEnd) {
    const minRow = Math.min(state.selectionStart.row, state.selectionEnd.row);
    const maxRow = Math.max(state.selectionStart.row, state.selectionEnd.row);
    const minCol = Math.min(state.selectionStart.col, state.selectionEnd.col);
    const maxCol = Math.max(state.selectionStart.col, state.selectionEnd.col);

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        cellsToColor.push({ row: r, col: c });
      }
    }
  } else {
    cellsToColor.push({ ...state.selectedCell });
  }

  for (const cellRef of cellsToColor) {
    const key = getCellKey(cellRef.row, cellRef.col);
    const cellData = data.get(key);
    const cellElement = getCellElement(cellRef.row, cellRef.col);

    if (cellData) {
      const newStyle = { ...cellData.style };
      if (type === 'text') {
        newStyle.color = color;
        if (cellElement) cellElement.style.color = color;
      } else {
        newStyle.backgroundColor = color;
        if (cellElement) cellElement.style.backgroundColor = color;
      }
      data.set(key, { ...cellData, style: newStyle });
    } else {
      const newStyle: any = {};
      if (type === 'text') {
        newStyle.color = color;
        if (cellElement) cellElement.style.color = color;
      } else {
        newStyle.backgroundColor = color;
        if (cellElement) cellElement.style.backgroundColor = color;
      }
      data.set(key, { value: '', style: newStyle });
    }
  }

  context.updateAIDataCache();
  context.pushUndo('format', type);
  context.autoSave();
}

/**
 * Применить выравнивание
 */
export function applyTextAlign(align: string, context: FormattingContext): void {
  const { state, getCurrentData, getCellElement, getCellKey } = context;
  const data = getCurrentData();
  const cellsToAlign: Array<{ row: number; col: number }> = [];

  if (state.selectionStart && state.selectionEnd) {
    const minRow = Math.min(state.selectionStart.row, state.selectionEnd.row);
    const maxRow = Math.max(state.selectionStart.row, state.selectionEnd.row);
    const minCol = Math.min(state.selectionStart.col, state.selectionEnd.col);
    const maxCol = Math.max(state.selectionStart.col, state.selectionEnd.col);

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        cellsToAlign.push({ row: r, col: c });
      }
    }
  } else {
    cellsToAlign.push({ ...state.selectedCell });
  }

  for (const cellRef of cellsToAlign) {
    const key = getCellKey(cellRef.row, cellRef.col);
    const cellData = data.get(key);
    const cellElement = getCellElement(cellRef.row, cellRef.col);

    if (cellData) {
      const newStyle = { ...cellData.style };
      newStyle.textAlign = align;
      if (cellElement) cellElement.style.textAlign = align;
      data.set(key, { ...cellData, style: newStyle });
    } else {
      const newStyle: any = { textAlign: align };
      if (cellElement) cellElement.style.textAlign = align;
      data.set(key, { value: '', style: newStyle });
    }
  }

  context.updateAIDataCache();
  context.autoSave();
}

/**
 * Изменить разрядность чисел
 */
export function changeDecimalPlaces(delta: number, context: FormattingContext): void {
  const { state, getCurrentData, getCellElement, getCellKey } = context;
  const data = getCurrentData();
  const cellsToFormat: Array<{ row: number; col: number }> = [];

  if (state.selectionStart && state.selectionEnd) {
    const minRow = Math.min(state.selectionStart.row, state.selectionEnd.row);
    const maxRow = Math.max(state.selectionStart.row, state.selectionEnd.row);
    const minCol = Math.min(state.selectionStart.col, state.selectionEnd.col);
    const maxCol = Math.max(state.selectionStart.col, state.selectionEnd.col);

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        cellsToFormat.push({ row: r, col: c });
      }
    }
  } else {
    cellsToFormat.push({ ...state.selectedCell });
  }

  for (const cellRef of cellsToFormat) {
    const key = getCellKey(cellRef.row, cellRef.col);
    const cellData = data.get(key);
    const cellElement = getCellElement(cellRef.row, cellRef.col);

    if (cellData && cellData.value) {
      const numValue = parseFloat(cellData.value);
      if (!isNaN(numValue)) {
        const currentDecimals = cellData.style?.decimals ?? 2;
        const newDecimals = Math.max(0, Math.min(10, currentDecimals + delta));
        const formattedValue = numValue.toFixed(newDecimals);

        const newStyle = { ...cellData.style };
        newStyle.decimals = newDecimals;
        data.set(key, { value: formattedValue, style: newStyle });

        if (cellElement) {
          cellElement.textContent = formattedValue;
        }
      }
    }
  }

  context.updateAIDataCache();
  context.autoSave();
}
