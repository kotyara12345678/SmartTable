/**
 * Formulas Module - Формулы и реактивность
 */

import { getCellKey, letterToCol, parseCellKey } from './utils';
import { CellData, TableState } from './state';

/**
 * Результат вычисления формулы
 */
export interface FormulaResult {
  value: any;
  colorName?: string;
  range?: string;
  rangeType?: 'cell' | 'column' | 'row' | 'range';
}

/**
 * Функция для получения значения ячейки по ссылке
 */
export type CellRefGetter = (cellRef: string) => string;

/**
 * Вычислить значение формулы
 * Эта функция делегирует вычисление внешнему previewFormula
 */
export function calculateFormula(
  formula: string,
  getCellValue: CellRefGetter,
  previewFormula?: (formula: string, getter: CellRefGetter) => FormulaResult
): FormulaResult {
  if (!formula.startsWith('=')) {
    return { value: formula };
  }

  if (previewFormula) {
    return previewFormula(formula, getCellValue);
  }

  // Базовая реализация если previewFormula не предоставлен
  return { value: formula.substring(1) };
}

/**
 * Зарегистрировать формулу в системе зависимостей
 */
export function registerFormula(
  key: string,
  formula: string,
  cellFormulas: Map<string, string>,
  registerDependency?: (ref: string, formula: string) => void
): void {
  if (!formula.startsWith('=')) {
    cellFormulas.delete(key);
    return;
  }

  cellFormulas.set(key, formula);
  
  if (registerDependency) {
    // Регистрируем формулу в системе зависимостей
    registerDependency(key, formula);
  }
  
  console.log(`[Formulas] Registered: ${key} = ${formula}`);
}

/**
 * Удалить формулу
 */
export function removeFormula(
  key: string,
  cellFormulas: Map<string, string>,
  removeDependency?: (key: string) => void
): void {
  cellFormulas.delete(key);
  
  if (removeDependency) {
    removeDependency(key);
  }
}

/**
 * Получить зависимые ячейки
 */
export function getDependentCells(
  key: string,
  getDependents?: (key: string) => string[]
): string[] {
  if (getDependents) {
    return getDependents(key);
  }
  return [];
}

/**
 * Извлечь ссылки на ячейки из формулы
 */
export function extractCellReferences(formula: string): string[] {
  const refs: string[] = [];
  const regex = /([A-Z]+)(\d+)/gi;
  let match;
  
  while ((match = regex.exec(formula)) !== null) {
    refs.push(match[0]);
  }
  
  return refs;
}

/**
 * Разобрать ссылку на ячейку (A1 → {row: 0, col: 0})
 */
export function parseCellReference(cellRef: string): { row: number; col: number } {
  const match = cellRef.match(/^([A-Z]+)(\d+)$/i);
  if (!match) {
    return { row: -1, col: -1 };
  }
  
  const col = match[1].toUpperCase().charCodeAt(0) - 65;
  const row = parseInt(match[2]) - 1;
  return { row, col };
}

/**
 * Получить hex цвета по имени
 */
export function getHexColorByName(colorName: string): string | null {
  if (!colorName) return null;

  const color = colorName.toLowerCase().trim();

  // 16 базовых цветов
  const colors: Record<string, string> = {
    'black': '#000000',
    'white': '#FFFFFF',
    'red': '#FF0000',
    'green': '#008000',
    'blue': '#0000FF',
    'yellow': '#FFFF00',
    'cyan': '#00FFFF',
    'aqua': '#00FFFF',
    'magenta': '#FF00FF',
    'fuchsia': '#FF00FF',
    'gray': '#808080',
    'grey': '#808080',
    'silver': '#C0C0C0',
    'maroon': '#800000',
    'olive': '#808000',
    'lime': '#00FF00',
    'teal': '#008080',
    'navy': '#000080',
    'purple': '#800080',
    'orange': '#FFA500',
  };

  return colors[color] || colorName;
}

/**
 * Применить цвет к ячейке
 */
export function applyCellColor(
  row: number,
  col: number,
  hexColor: string,
  data: Map<string, CellData>
): void {
  const key = getCellKey(row, col);
  const cellData = data.get(key) || { value: '' };
  const newStyle = { ...cellData.style, backgroundColor: hexColor };
  data.set(key, { ...cellData, style: newStyle });
}

/**
 * Определить тип диапазона
 */
export function getRangeType(range: string): 'cell' | 'column' | 'row' | 'range' {
  if (range.match(/^([A-Z]+)(\d+)$/i)) return 'cell';
  if (range.match(/^([A-Z]):([A-Z])$/i)) return 'column';
  if (range.match(/^([A-Z]+)$/i)) return 'column';
  if (range.match(/^(\d+):(\d+)$/)) return 'row';
  if (range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i)) return 'range';
  return 'cell';
}

/**
 * Получить все ячейки в диапазоне
 */
export function getCellsInRange(range: string): Array<{ row: number; col: number }> {
  const cells: Array<{ row: number; col: number }> = [];

  // Одна ячейка (A1)
  const cellMatch = range.match(/^([A-Z]+)(\d+)$/i);
  if (cellMatch) {
    const col = cellMatch[1].toUpperCase().charCodeAt(0) - 65;
    const row = parseInt(cellMatch[2]) - 1;
    return [{ row, col }];
  }

  // Диапазон ячеек (A1:B2)
  const rangeMatch = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
  if (rangeMatch) {
    const startCol = rangeMatch[1].toUpperCase().charCodeAt(0) - 65;
    const startRow = parseInt(rangeMatch[2]) - 1;
    const endCol = rangeMatch[3].toUpperCase().charCodeAt(0) - 65;
    const endRow = parseInt(rangeMatch[4]) - 1;

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        cells.push({ row: r, col: c });
      }
    }
    return cells;
  }

  // Столбец (A) или диапазон столбцов (A:B)
  const colMatch = range.match(/^([A-Z]+)(?::([A-Z]+))?$/i);
  if (colMatch) {
    const startCol = colMatch[1].toUpperCase().charCodeAt(0) - 65;
    const endCol = colMatch[2] ? colMatch[2].toUpperCase().charCodeAt(0) - 65 : startCol;

    for (let c = startCol; c <= endCol; c++) {
      for (let r = 0; r < 100; r++) { // 100 - стандартное количество строк
        cells.push({ row: r, col: c });
      }
    }
    return cells;
  }

  // Строка (1) или диапазон строк (1:2)
  const rowMatch = range.match(/^(\d+)(?::(\d+))?$/);
  if (rowMatch) {
    const startRow = parseInt(rowMatch[1]) - 1;
    const endRow = rowMatch[2] ? parseInt(rowMatch[2]) - 1 : startRow;

    for (let r = startRow; r <= endRow; r++) {
      for (let c = 0; c < 100; c++) { // 100 - стандартное количество колонок
        cells.push({ row: r, col: c });
      }
    }
    return cells;
  }

  return cells;
}

/**
 * Реактивное пересчитывание зависимых ячеек
 */
export function recalculateDependentCells(
  changedCellKey: string,
  data: Map<string, any>,
  getDependentCells: (key: string) => string[],
  previewFormulaFn: (formula: string, getter: (ref: string) => string) => FormulaResult,
  letterToCol: (letter: string) => number,
  getCellKeyFn: (row: number, col: number) => string,
  colToLetter: (col: number) => string,
  updateSingleCell: (row: number, col: number) => void
): void {
  // Получаем все ячейки, которые зависят от только что измененной ячейки
  const dependents = getDependentCells(changedCellKey);

  console.log(`[Formulas] Recalculating dependents of ${changedCellKey}:`, dependents);

  for (const depKey of dependents) {
    // Получаем формулу из cellData (более надежно чем state.cellFormulas)
    const depCellData = data.get(depKey);
    const formula = depCellData?.formula || depCellData?.value;

    if (!formula || !formula.startsWith('=')) {
      continue; // Пропускаем, если это не формула
    }

    // Разобрать ключ на row и col
    const [row, col] = depKey.split('-').map(Number);

    console.log(`[Formulas] Recalculating ${depKey} (${colToLetter(col)}${row + 1}): ${formula}`);

    // Пересчитываем формулу
    const result = previewFormulaFn(formula, (cellRef: string) => {
      const match = cellRef.match(/^([A-Z]+)(\d+)$/i);
      if (!match) return '';
      const refCol = letterToCol(match[1]);
      const refRow = parseInt(match[2]) - 1;
      const refKey = getCellKeyFn(refRow, refCol);
      const cellData = data.get(refKey);
      return cellData?.value || '';
    });

    const finalValue = String(result.value);

    // Обновляем значение в ячейке, сохраняя формулу
    if (finalValue || formula) {
      const updatedData = {
        value: finalValue,
        formula: formula, // Сохраняем формулу
        ...(depCellData?.style && { style: depCellData.style }) // Сохраняем стили если есть
      };
      data.set(depKey, updatedData);
    } else {
      data.delete(depKey);
    }

    // Обновить ячейку на экране
    updateSingleCell(row, col);
    console.log(`[Formulas] Updated ${depKey} = ${finalValue}`);

    // Рекурсивно пересчитываем зависимые ячейки от этой ячейки
    recalculateDependentCells(depKey, data, getDependentCells, previewFormulaFn, letterToCol, getCellKeyFn, colToLetter, updateSingleCell);
  }
}

/**
 * Применение цвета из формулы COLOR
 */
export function applyColorFromFormula(
  result: FormulaResult,
  data: Map<string, any>,
  getHexColorByName: (colorName: string) => string | null,
  applyCellColorFn: (row: number, col: number, hexColor: string, data: Map<string, any>) => void,
  CONFIG: { ROWS: number; COLS: number }
): void {
  const colorName = result.colorName;
  const range = result.range;
  const rangeType = result.rangeType || 'cell';

  // Проверка на наличие обязательных свойств
  if (!colorName || !range) {
    console.warn('[COLOR] Missing colorName or range:', { colorName, range });
    return;
  }

  // Получаем hex цвета из имени
  const hexColor = getHexColorByName(colorName);
  if (!hexColor) {
    console.warn('[COLOR] Invalid color name:', colorName);
    return;
  }

  console.log('[COLOR] Applying color:', { colorName, hexColor, range, rangeType });

  if (rangeType === 'column') {
    // Закрасить столбец (A:B)
    const columnRangeMatch = range.match(/^([A-Z]):([A-Z])$/i);
    if (columnRangeMatch) {
      const startCol = columnRangeMatch[1].toUpperCase().charCodeAt(0) - 65;
      const endCol = columnRangeMatch[2].toUpperCase().charCodeAt(0) - 65;

      for (let c = startCol; c <= endCol; c++) {
        for (let r = 0; r < CONFIG.ROWS; r++) {
          applyCellColorFn(r, c, hexColor, data);
        }
      }
    } else {
      // Один столбец (A)
      const col = range.toUpperCase().charCodeAt(0) - 65;
      for (let r = 0; r < CONFIG.ROWS; r++) {
        applyCellColorFn(r, col, hexColor, data);
      }
    }
  } else if (rangeType === 'row') {
    // Закрасить строку (1:2)
    const rowRangeMatch = range.match(/^(\d+):(\d+)$/);
    if (rowRangeMatch) {
      const startRow = parseInt(rowRangeMatch[1]) - 1;
      const endRow = parseInt(rowRangeMatch[2]) - 1;

      for (let r = startRow; r <= endRow; r++) {
        for (let c = 0; c < CONFIG.COLS; c++) {
          applyCellColorFn(r, c, hexColor, data);
        }
      }
    } else {
      // Одна строка
      const row = parseInt(range) - 1;
      for (let c = 0; c < CONFIG.COLS; c++) {
        applyCellColorFn(row, c, hexColor, data);
      }
    }
  } else if (rangeType === 'range') {
    // Диапазон ячеек (A1:B2)
    const cellRangeMatch = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
    if (cellRangeMatch) {
      const startCol = cellRangeMatch[1].toUpperCase().charCodeAt(0) - 65;
      const startRow = parseInt(cellRangeMatch[2]) - 1;
      const endCol = cellRangeMatch[3].toUpperCase().charCodeAt(0) - 65;
      const endRow = parseInt(cellRangeMatch[4]) - 1;

      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          applyCellColorFn(r, c, hexColor, data);
        }
      }
    }
  } else {
    // Одна ячейка (A1)
    const cellMatch = range.match(/^([A-Z]+)(\d+)$/i);
    if (cellMatch) {
      const col = cellMatch[1].toUpperCase().charCodeAt(0) - 65;
      const row = parseInt(cellMatch[2]) - 1;
      applyCellColorFn(row, col, hexColor, data);
    }
  }
}
