/**
 * Formulas Helpers Module - Вспомогательные функции для формул
 */

export interface FormulasContext {
  state: any;
  getCellKey: (row: number, col: number) => string;
  getCurrentData: () => Map<string, any>;
  getCellElement: (row: number, col: number) => HTMLElement | null;
  getDependentCells: (key: string) => string[];
  previewFormula: (formula: string, getter: (ref: string) => string) => any;
  letterToCol: (letter: string) => number;
  colToLetter: (col: number) => string;
  updateSingleCell: (row: number, col: number) => void;
}

/**
 * Реактивное пересчитывание зависимых ячеек
 */
export function recalculateDependentCells(
  changedCellKey: string,
  data: Map<string, any>,
  context: FormulasContext
): void {
  const dependents = context.getDependentCells(changedCellKey);

  console.log(`[Formulas] Recalculating dependents of ${changedCellKey}:`, dependents);

  for (const depKey of dependents) {
    const depCellData = data.get(depKey);
    const formula = depCellData?.formula || depCellData?.value;

    if (!formula || !formula.startsWith('=')) {
      continue;
    }

    const [row, col] = depKey.split('-').map(Number);

    console.log(`[Formulas] Recalculating ${depKey} (${context.colToLetter(col)}${row + 1}): ${formula}`);

    const result = context.previewFormula(formula, (cellRef: string) => {
      const match = cellRef.match(/^([A-Z]+)(\d+)$/i);
      if (!match) return '';
      const refCol = context.letterToCol(match[1]);
      const refRow = parseInt(match[2]) - 1;
      const refKey = context.getCellKey(refRow, refCol);
      const cellData = data.get(refKey);
      return cellData?.value || '';
    });

    const finalValue = String(result.value);

    if (finalValue || formula) {
      const updatedData = {
        value: finalValue,
        formula: formula,
        ...(depCellData?.style && { style: depCellData.style })
      };
      data.set(depKey, updatedData);
    } else {
      data.delete(depKey);
    }

    context.updateSingleCell(row, col);
    console.log(`[Formulas] Updated ${depKey} = ${finalValue}`);

    recalculateDependentCells(depKey, data, context);
  }
}

/**
 * Применить цвет из формулы COLOR
 */
export function applyColorFromFormula(
  result: any,
  data: Map<string, any>,
  context: any
): void {
  const colorName = result.colorName;
  const range = result.range;
  const rangeType = result.rangeType || 'cell';

  const hexColor = context.getHexColorByName(colorName);
  if (!hexColor) {
    console.warn('[COLOR] Invalid color name:', colorName);
    return;
  }

  console.log('[COLOR] Applying color:', { colorName, hexColor, range, rangeType });

  const CONFIG = context.CONFIG;

  if (rangeType === 'column') {
    const columnRangeMatch = range.match(/^([A-Z]):([A-Z])$/i);
    if (columnRangeMatch) {
      const startCol = columnRangeMatch[1].toUpperCase().charCodeAt(0) - 65;
      const endCol = columnRangeMatch[2].toUpperCase().charCodeAt(0) - 65;
      for (let c = startCol; c <= endCol; c++) {
        for (let r = 0; r < CONFIG.ROWS; r++) {
          context.applyCellColor(r, c, hexColor, data);
        }
      }
    } else {
      const col = range.toUpperCase().charCodeAt(0) - 65;
      for (let r = 0; r < CONFIG.ROWS; r++) {
        context.applyCellColor(r, col, hexColor, data);
      }
    }
  } else if (rangeType === 'row') {
    const rowRangeMatch = range.match(/^(\d+):(\d+)$/);
    if (rowRangeMatch) {
      const startRow = parseInt(rowRangeMatch[1]) - 1;
      const endRow = parseInt(rowRangeMatch[2]) - 1;
      for (let r = startRow; r <= endRow; r++) {
        for (let c = 0; c < CONFIG.COLS; c++) {
          context.applyCellColor(r, c, hexColor, data);
        }
      }
    } else {
      const row = parseInt(range) - 1;
      for (let c = 0; c < CONFIG.COLS; c++) {
        context.applyCellColor(row, c, hexColor, data);
      }
    }
  } else if (rangeType === 'range') {
    const cellRangeMatch = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
    if (cellRangeMatch) {
      const startCol = cellRangeMatch[1].toUpperCase().charCodeAt(0) - 65;
      const startRow = parseInt(cellRangeMatch[2]) - 1;
      const endCol = cellRangeMatch[3].toUpperCase().charCodeAt(0) - 65;
      const endRow = parseInt(cellRangeMatch[4]) - 1;
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          context.applyCellColor(r, c, hexColor, data);
        }
      }
    }
  } else {
    const cellMatch = range.match(/^([A-Z]+)(\d+)$/i);
    if (cellMatch) {
      const col = cellMatch[1].toUpperCase().charCodeAt(0) - 65;
      const row = parseInt(cellMatch[2]) - 1;
      context.applyCellColor(row, col, hexColor, data);
    }
  }

  context.updateAIDataCache();
}

/**
 * Применить цвет к ячейке
 */
export function applyCellColor(
  row: number,
  col: number,
  hexColor: string,
  data: Map<string, any>,
  getCellKey: (row: number, col: number) => string,
  getCellElement: (row: number, col: number) => HTMLElement | null
): void {
  const key = getCellKey(row, col);
  const cellData = data.get(key) || { value: '' };
  const newStyle = { ...cellData.style, backgroundColor: hexColor };
  data.set(key, { ...cellData, style: newStyle });

  const cell = getCellElement(row, col);
  if (cell) {
    cell.style.backgroundColor = hexColor;
  }
}

/**
 * Обновить одну ячейку
 */
export function updateSingleCell(
  row: number,
  col: number,
  context: any
): void {
  const cell = context.getCellElement(row, col);
  if (!cell) return;

  const key = context.getCellKey(row, col);
  const cellData = context.getCurrentData().get(key);

  if (cellData) {
    cell.textContent = cellData.value;
    cell.classList.add('has-content');

    if (cellData.style) {
      Object.entries(cellData.style).forEach(([prop, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          (cell.style as any)[prop] = value;
        }
      });
    }

    if (context.state.searchHighlight && context.state.searchResults.has(key)) {
      cell.style.backgroundColor = '#FFEB3B';
      cell.style.fontWeight = 'bold';
    }
  } else {
    cell.textContent = '';
    cell.classList.remove('has-content');

    if (context.state.searchHighlight && context.state.searchResults.has(key)) {
      cell.style.backgroundColor = '#FFEB3B';
      cell.style.fontWeight = 'bold';
    }
  }

  const filter = context.state.activeFilters.get(col);
  if (filter && cellData && cellData.value) {
    const value = String(cellData.value);
    const isIncluded = filter.values.includes(value);
    if ((filter.type === 'include' && !isIncluded) || (filter.type === 'exclude' && isIncluded)) {
      cell.style.display = 'none';
    } else {
      cell.style.display = '';
    }
  }
}
