/**
 * State Module - Управление состоянием и данными
 *
 * Этот модуль предоставляет функции для доступа к данным таблицы.
 * Само состояние (state) хранится в renderer.ts и передаётся в функции модуля.
 */

import { getCellKey } from './utils';

/**
 * Тип для данных ячейки
 */
export interface CellData {
  value: string;
  formula?: string;
  style?: any;
}

/**
 * Тип для состояния таблицы
 */
export interface TableState {
  selectedCell: { row: number; col: number };
  editingCell: { row: number; col: number };
  sheetsData: Map<number, Map<string, CellData>>;
  sheets: Array<{ id: number; name: string }>;
  currentSheet: number;
  isEditing: boolean;
  selectionStart: { row: number; col: number } | null;
  selectionEnd: { row: number; col: number } | null;
  isSelecting: boolean;
  contextMenuCell: { row: number; col: number } | null;
  contextMenuSheet: number | null;
  aiDataCache: Array<{ row: number; col: number; value: string }>;
  undoStack: Array<{ key: string; oldValue: any; newValue: any }>;
  redoStack: Array<{ key: string; oldValue: any; newValue: any }>;
  dataValidations: Map<string, { type: string; values: string[] }>;
  conditionalFormats: Array<{ range: string; rule: string; style: any }>;
  cellFormulas: Map<string, string>;
  activeFilters: Map<number, { values: string[]; type: 'include' | 'exclude' }>;
  activeSort: { column: number | null; direction: 'asc' | 'desc' | null };
  groupedColumns: Set<number>;
  searchResults: Set<string>;
  searchHighlight: boolean;
  clipboardHistory: Array<{ text: string; timestamp: number; type: string }>;
}

/**
 * Получить данные текущего листа
 */
export function getCurrentData(state: TableState): Map<string, CellData> {
  return state.sheetsData.get(state.currentSheet) || new Map();
}

/**
 * Получить данные указанного листа
 */
export function getSheetData(
  state: TableState,
  sheetId: number
): Map<string, CellData> {
  return state.sheetsData.get(sheetId) || new Map();
}

/**
 * Установить данные для текущего листа
 */
export function setCurrentData(
  state: TableState,
  data: Map<string, CellData>
): void {
  state.sheetsData.set(state.currentSheet, data);
}

/**
 * Получить значение ячейки
 */
export function getCellValue(
  state: TableState,
  row: number,
  col: number
): CellData | undefined {
  const data = getCurrentData(state);
  return data.get(getCellKey(row, col));
}

/**
 * Установить значение ячейки
 */
export function setCellValue(
  state: TableState,
  row: number,
  col: number,
  value: CellData
): void {
  const data = getCurrentData(state);
  const key = getCellKey(row, col);

  if (value.value || value.formula) {
    data.set(key, value);
  } else {
    data.delete(key);
  }
}

/**
 * Удалить значение ячейки
 */
export function deleteCellValue(
  state: TableState,
  row: number,
  col: number
): void {
  const data = getCurrentData(state);
  data.delete(getCellKey(row, col));
}

/**
 * Очистить все данные текущего листа
 */
export function clearCurrentData(state: TableState): void {
  state.sheetsData.set(state.currentSheet, new Map());
}

/**
 * Очистить все данные всех листов
 */
export function clearAllData(state: TableState): void {
  state.sheetsData.clear();
  state.sheetsData.set(state.currentSheet, new Map());
}

/**
 * Переключиться на другой лист
 */
export function switchSheet(state: TableState, sheetId: number): void {
  if (state.sheetsData.has(sheetId)) {
    state.currentSheet = sheetId;
  }
}

/**
 * Получить все листы
 */
export function getAllSheetsData(state: TableState): Map<number, Map<string, CellData>> {
  return state.sheetsData;
}

/**
 * Экспортировать данные для сохранения
 */
export function exportData(state: TableState): any {
  const dataToSave: any = {};
  const currentData = getCurrentData(state);

  currentData.forEach((value, key) => {
    dataToSave[key] = value;
  });

  return {
    sheetsData: dataToSave,
    currentSheet: state.currentSheet,
    timestamp: Date.now()
  };
}

/**
 * Импортировать данные из сохранения
 */
export function importData(state: TableState, data: any): void {
  const currentData = getCurrentData(state);
  currentData.clear();

  if (data.sheetsData) {
    Object.keys(data.sheetsData).forEach(sheetKey => {
      const sheetData = data.sheetsData[sheetKey];
      const sheetMap = new Map();

      if (typeof sheetData === 'object') {
        Object.keys(sheetData).forEach(cellKey => {
          sheetMap.set(cellKey, sheetData[cellKey]);
        });
      }

      state.sheetsData.set(parseInt(sheetKey), sheetMap);
    });
  } else if (data.cells) {
    Object.keys(data.cells).forEach(key => {
      currentData.set(key, data.cells[key]);
    });
  }

  state.currentSheet = data.currentSheet || 1;
}

/**
 * Обновить кэш данных ИИ
 */
export function updateAIDataCache(state: TableState): void {
  const data = getCurrentData(state);
  state.aiDataCache = [];

  data.forEach((cellData, key) => {
    const [row, col] = key.split('-').map(Number);
    if (cellData.value) {
      state.aiDataCache.push({ row, col, value: cellData.value });
    }
  });

  // Сортируем по строкам и столбцам
  state.aiDataCache.sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });
}

/**
 * Очистить всё состояние
 */
export function clearAllState(state: TableState): void {
  state.sheetsData.clear();
  state.sheetsData.set(1, new Map());
  state.dataValidations.clear();
  state.currentSheet = 1;
  state.selectedCell = { row: 0, col: 0 };
  state.undoStack = [];
  state.redoStack = [];
  state.aiDataCache = [];
}

/**
 * Очистить все dataValidations
 */
export function clearAllDataValidations(state: TableState): void {
  state.dataValidations.clear();
}
