/**
 * AutoSave Module - Автосохранение и автозагрузка
 */

import { TableState, CellData } from './state';

/**
 * Конфигурация автосохранения
 */
export interface AutoSaveConfig {
  enabled: boolean;
  interval?: number;
  localStorageKey?: string;
}

/**
 * Данные для сохранения
 */
export interface SaveData {
  sheetsData?: any;
  cells?: any;
  currentSheet?: number;
  timestamp?: number;
  fileName?: string;
}

/**
 * Автосохранение данных таблицы
 */
export function autoSave(
  state: TableState,
  markAutoSaveDirty?: () => void
): void {
  try {
    const dataToSave: any = {};
    const currentData = state.sheetsData.get(state.currentSheet);
    if (!currentData) return;
    
    currentData.forEach((value, key) => {
      dataToSave[key] = value;
    });

    // Помечаем как измененное для AutoSaveManager
    if (markAutoSaveDirty) {
      markAutoSaveDirty();
    }

    // Сохраняем в localStorage для резервного копирования
    localStorage.setItem('smarttable-autosave', JSON.stringify({
      sheetsData: dataToSave,
      currentSheet: state.currentSheet,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.error('[AutoSave] Error:', e);
  }
}

/**
 * Автозагрузка сохранённых данных
 */
export function autoLoad(
  state: TableState,
  registerFormulaDep: (key: string, formula: string, callback: any) => void,
  updateFileNameInHeader: (fileName: string) => void,
  renderCells: () => void,
  updateAIDataCache: () => void
): void {
  try {
    const saved = localStorage.getItem('smarttable-autosave');
    const currentData = state.sheetsData.get(state.currentSheet);
    if (!currentData) return;
    
    currentData.clear();

    if (saved) {
      const data: SaveData = JSON.parse(saved);

      // Загружаем sheetsData
      if (data.sheetsData) {
        Object.keys(data.sheetsData).forEach(sheetKey => {
          const sheetData = data.sheetsData[sheetKey];
          const sheetMap = new Map<string, CellData>();

          if (typeof sheetData === 'object') {
            Object.keys(sheetData).forEach(cellKey => {
              const cellData = sheetData[cellKey];
              sheetMap.set(cellKey, cellData);

              // Восстанавливаем формулы из loaded data
              if (cellData.formula) {
                state.cellFormulas.set(cellKey, cellData.formula);
                registerFormulaDep(cellKey, cellData.formula, (ref: string, formula: string) => {
                  state.cellFormulas.set(ref, formula);
                });
              }
            });
          }

          state.sheetsData.set(parseInt(sheetKey), sheetMap);
        });
      } else if (data.cells) {
        Object.keys(data.cells).forEach(key => {
          const cellData = data.cells[key];
          currentData.set(key, cellData);

          // Восстанавливаем формулы из loaded data
          if (cellData.formula) {
            state.cellFormulas.set(key, cellData.formula);
            registerFormulaDep(key, cellData.formula, (ref: string, formula: string) => {
              state.cellFormulas.set(ref, formula);
            });
          }
        });
      }

      state.currentSheet = data.currentSheet || 1;

      if (data.fileName) {
        updateFileNameInHeader(data.fileName);
      }
    }

    // ПРИНУДИТЕЛЬНО очищаем dataValidations при каждой загрузке
    state.dataValidations.clear();

    renderCells();
    updateAIDataCache();
  } catch (e) {
    console.error('[AutoLoad] Error:', e);
  }
}

/**
 * Обновить имя файла в заголовке
 */
export function updateFileNameInHeader(fileName: string): void {
  const topBar = document.querySelector('#fileName') as HTMLElement;
  if (topBar) {
    topBar.textContent = fileName;
  }
  console.log('[AutoLoad] File name updated in header:', fileName);
}

/**
 * Сохранить данные в localStorage
 */
export function saveToLocalStorage(
  state: TableState,
  fileName?: string
): void {
  try {
    const dataToSave: any = {};
    const currentData = state.sheetsData.get(state.currentSheet);
    if (!currentData) return;
    
    currentData.forEach((value, key) => {
      dataToSave[key] = value;
    });

    localStorage.setItem('smarttable-autosave', JSON.stringify({
      sheetsData: dataToSave,
      currentSheet: state.currentSheet,
      timestamp: Date.now(),
      fileName
    }));
  } catch (e) {
    console.error('[AutoSave] Error:', e);
  }
}

/**
 * Загрузить данные из localStorage
 */
export function loadFromLocalStorage(
  state: TableState
): SaveData | null {
  try {
    const saved = localStorage.getItem('smarttable-autosave');
    if (!saved) return null;
    
    const data: SaveData = JSON.parse(saved);
    return data;
  } catch (e) {
    console.error('[AutoLoad] Error:', e);
    return null;
  }
}

/**
 * Загрузить данные в состояние
 */
export function loadDataToState(
  state: TableState,
  data: SaveData,
  registerFormula?: (key: string, formula: string, callback: any) => void
): void {
  const currentData = state.sheetsData.get(state.currentSheet);
  if (!currentData) return;
  
  currentData.clear();

  if (data.sheetsData) {
    Object.keys(data.sheetsData).forEach(sheetKey => {
      const sheetData = data.sheetsData[sheetKey];
      const sheetMap = new Map<string, CellData>();

      if (typeof sheetData === 'object') {
        Object.keys(sheetData).forEach(cellKey => {
          const cellData = sheetData[cellKey];
          sheetMap.set(cellKey, cellData);

          if (cellData.formula && registerFormula) {
            registerFormula(cellKey, cellData.formula, () => {});
          }
        });
      }

      state.sheetsData.set(parseInt(sheetKey), sheetMap);
    });
  }

  state.currentSheet = data.currentSheet || 1;
}

/**
 * Очистить сохранённые данные
 */
export function clearAutoSaveData(): void {
  localStorage.removeItem('smarttable-autosave');
  localStorage.removeItem('smarttable-data-validations');
}

/**
 * Проверить есть ли сохранённые данные
 */
export function hasAutoSaveData(): boolean {
  return localStorage.getItem('smarttable-autosave') !== null;
}

/**
 * Экспортировать данные для сохранения
 */
export function exportData(state: TableState): any {
  const dataToSave: any = {};
  const currentData = state.sheetsData.get(state.currentSheet);
  if (!currentData) return {};
  
  currentData.forEach((value, key) => {
    dataToSave[key] = value;
  });

  return {
    sheetsData: dataToSave,
    currentSheet: state.currentSheet,
    timestamp: Date.now()
  };
}
