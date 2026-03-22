/**
 * Command Pattern для системы Undo/Redo в SmartTable
 * Полная поддержка всех операций с таблицей
 */

// ==========================================
// === ИНТЕРФЕЙСЫ ===
// ==========================================

export interface ICommand {
  name: string;
  execute(): void;
  undo(): void;
  redo(): void;
}

export interface CellState {
  value?: string;
  formula?: string;
  style?: any;
  merged?: boolean;
  mergeId?: string;
  rowspan?: number;
  colspan?: number;
}

// ==========================================
// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
// ==========================================

/** Получить sheetsData из глобального состояния */
function getSheetsData(): Map<number, Map<string, CellState>> {
  // Пробуем получить из state.renderer
  const renderer = (window as any).renderer;
  if (renderer && renderer.getSheetsData) {
    return renderer.getSheetsData();
  }
  
  // Fallback: пытаемся получить напрямую из window
  const sheetsData = (window as any).sheetsData;
  if (sheetsData instanceof Map) {
    return sheetsData;
  }
  
  console.error('[Command] Cannot get sheetsData!');
  return new Map();
}

/** Получить текущий лист */
function getCurrentSheetId(): number {
  return (window as any).currentSheet || 1;
}

/** Получить данные текущего листа */
export function getCurrentData(): Map<string, CellState> {
  const sheetsData = getSheetsData();
  const sheetId = getCurrentSheetId();
  if (!sheetsData.has(sheetId)) {
    sheetsData.set(sheetId, new Map());
  }
  return sheetsData.get(sheetId)!;
}

/** Получить ключ ячейки */
export function getCellKey(row: number, col: number): string {
  return `${row}-${col}`;
}

/** Глубокое копирование состояния */
export function cloneCellState(state: CellState | undefined): CellState | undefined {
  if (!state) return undefined;
  return JSON.parse(JSON.stringify(state));
}

/** Сохранить состояние диапазона */
export function saveRangeState(
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number
): Map<string, CellState | undefined> {
  const data = getCurrentData();
  const saved = new Map<string, CellState | undefined>();
  
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const key = getCellKey(r, c);
      saved.set(key, cloneCellState(data.get(key)));
    }
  }
  return saved;
}

/** Восстановить состояние диапазона */
export function restoreRangeState(savedState: Map<string, CellState | undefined>): void {
  const data = getCurrentData();
  
  savedState.forEach((state, key) => {
    if (state && (state.value || state.formula || state.style)) {
      data.set(key, state);
    } else {
      data.delete(key);
    }
  });
  
  // Рендерим
  const renderer = (window as any).renderer;
  if (renderer) {
    renderer.renderCells?.();
    renderer.updateAIDataCache?.();
    renderer.updateFormulaBar?.();
  }
}

/** Сохранить все данные */
export function saveAllData(): Map<string, CellState | undefined> {
  const data = getCurrentData();
  const saved = new Map<string, CellState | undefined>();
  
  data.forEach((state, key) => {
    saved.set(key, cloneCellState(state));
  });
  
  return saved;
}

/** Восстановить все данные */
export function restoreAllData(savedState: Map<string, CellState | undefined>): void {
  const data = getCurrentData();
  data.clear();
  
  savedState.forEach((state, key) => {
    if (state && (state.value || state.formula || state.style)) {
      data.set(key, state);
    }
  });
  
  // Рендерим
  const renderer = (window as any).renderer;
  if (renderer) {
    renderer.renderCells?.();
    renderer.updateAIDataCache?.();
    renderer.updateFormulaBar?.();
  }
}

// ==========================================
// === КОМАНДА: УСТАНОВИТЬ ЗНАЧЕНИЕ ===
// ==========================================

export class SetValueCommand implements ICommand {
  name = 'SetValue';
  
  private row: number;
  private col: number;
  private value: string;
  private isFormula: boolean;
  private oldState: CellState | undefined;
  private newState: CellState | undefined;
  
  constructor(row: number, col: number, value: string, isFormula: boolean = false) {
    this.row = row;
    this.col = col;
    this.value = value;
    this.isFormula = isFormula;
  }
  
  execute(): void {
    const data = getCurrentData();
    const key = getCellKey(this.row, this.col);
    
    // Сохраняем старое состояние для undo
    this.oldState = cloneCellState(data.get(key));
    
    // Получаем существующие стили
    const existingStyle = this.oldState?.style;
    
    // Создаем новое состояние
    if (this.isFormula) {
      // Для формулы - сохраняем формулу, значение вычислится позже
      this.newState = {
        formula: this.value,
        value: this.value, // Временно сохраняем формулу как значение
        style: existingStyle
      };
    } else {
      // Простое значение
      this.newState = {
        value: this.value,
        style: existingStyle
      };
    }
    
    // Устанавливаем новое состояние
    if (this.newState.value || this.newState.formula || this.newState.style) {
      data.set(key, this.newState);
    } else {
      data.delete(key);
    }
    
    this._render();
  }
  
  undo(): void {
    const data = getCurrentData();
    const key = getCellKey(this.row, this.col);
    
    if (this.oldState && (this.oldState.value || this.oldState.formula || this.oldState.style)) {
      data.set(key, this.oldState);
    } else {
      data.delete(key);
    }
    
    this._render();
  }
  
  redo(): void {
    this.execute();
  }
  
  private _render(): void {
    const renderer = (window as any).renderer;
    if (renderer) {
      // Обновляем только одну ячейку вместо полной перерисовки
      if (renderer.updateSingleCell) {
        renderer.updateSingleCell(this.row, this.col);
      } else {
        renderer.renderCells?.();
      }
      renderer.updateFormulaBar?.();
    }
  }
}

// ==========================================
// === КОМАНДА: ФОРМАТИРОВАНИЕ ===
// ==========================================

export class SetFormatCommand implements ICommand {
  name = 'SetFormat';
  
  private startRow: number;
  private startCol: number;
  private endRow: number;
  private endCol: number;
  private formatType: string;
  private formatValue: any;
  private oldStates: Map<string, CellState | undefined> = new Map();
  
  constructor(
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number,
    formatType: string,
    formatValue: any
  ) {
    this.startRow = startRow;
    this.startCol = startCol;
    this.endRow = endRow;
    this.endCol = endCol;
    this.formatType = formatType;
    this.formatValue = formatValue;
  }
  
  execute(): void {
    // Сохраняем старое состояние
    this.oldStates = saveRangeState(this.startRow, this.startCol, this.endRow, this.endCol);
    this._applyFormat();
  }
  
  undo(): void {
    restoreRangeState(this.oldStates);
  }
  
  redo(): void {
    this._applyFormat();
  }
  
  private _applyFormat(): void {
    const data = getCurrentData();
    
    for (let r = this.startRow; r <= this.endRow; r++) {
      for (let c = this.startCol; c <= this.endCol; c++) {
        const key = getCellKey(r, c);
        let state = data.get(key);
        
        if (!state) {
          state = { value: '' };
        }
        
        if (!state.style) {
          state.style = {};
        }
        
        // Применяем форматирование
        switch (this.formatType) {
          case 'bold':
            state.style.fontWeight = this.formatValue ? 'bold' : 'normal';
            break;
          case 'italic':
            state.style.fontStyle = this.formatValue ? 'italic' : 'normal';
            break;
          case 'underline':
            state.style.textDecoration = this.formatValue ? 'underline' : 'none';
            break;
          case 'strikethrough':
            state.style.textDecoration = this.formatValue ? 'line-through' : 'none';
            break;
          case 'fontSize':
            state.style.fontSize = this.formatValue;
            break;
          case 'fontFamily':
            state.style.fontFamily = this.formatValue;
            break;
          case 'color':
            state.style.color = this.formatValue;
            break;
          case 'backgroundColor':
            state.style.backgroundColor = this.formatValue;
            break;
          case 'align':
            state.style.textAlign = this.formatValue;
            break;
          case 'wrap':
            state.style.whiteSpace = this.formatValue ? 'wrap' : 'nowrap';
            break;
        }
        
        data.set(key, state);
      }
    }
    
    const renderer = (window as any).renderer;
    if (renderer) {
      renderer.renderCells?.();
    }
  }
}

// ==========================================
// === КОМАНДА: ОБЪЕДИНИТЬ ЯЧЕЙКИ ===
// ==========================================

export class MergeCellsCommand implements ICommand {
  name = 'MergeCells';
  
  private startRow: number;
  private startCol: number;
  private endRow: number;
  private endCol: number;
  private oldStates: Map<string, CellState | undefined> = new Map();
  private mergeId: string = '';
  
  constructor(
    startRow: number,
    startCol: number,
    endRow: number,
    endCol: number
  ) {
    this.startRow = startRow;
    this.startCol = startCol;
    this.endRow = endRow;
    this.endCol = endCol;
  }
  
  execute(): void {
    // Сохраняем старое состояние
    this.oldStates = saveRangeState(this.startRow, this.startCol, this.endRow, this.endCol);
    this.mergeId = `merge-${Date.now()}`;
    this._applyMerge();
  }
  
  undo(): void {
    restoreRangeState(this.oldStates);
  }
  
  redo(): void {
    this._applyMerge();
  }
  
  private _applyMerge(): void {
    const data = getCurrentData();
    const rowspan = this.endRow - this.startRow + 1;
    const colspan = this.endCol - this.startCol + 1;
    
    // Получаем значение из первой ячейки
    const firstKey = getCellKey(this.startRow, this.startCol);
    const firstState = data.get(firstKey);
    const firstValue = firstState?.value || '';
    
    for (let r = this.startRow; r <= this.endRow; r++) {
      for (let c = this.startCol; c <= this.endCol; c++) {
        const key = getCellKey(r, c);
        
        if (r === this.startRow && c === this.startCol) {
          // Первая ячейка - главная
          data.set(key, {
            value: firstValue,
            merged: true,
            mergeId: this.mergeId,
            rowspan,
            colspan,
            style: firstState?.style
          });
        } else {
          // Остальные ячейки - скрытые
          const existingState = data.get(key);
          data.set(key, {
            ...existingState,
            merged: true,
            mergeId: this.mergeId
          });
        }
      }
    }
    
    const renderer = (window as any).renderer;
    if (renderer) {
      renderer.renderCells?.();
    }
  }
}

// ==========================================
// === КОМАНДА: ВСТАВИТЬ СТРОКУ ===
// ==========================================

export class InsertRowCommand implements ICommand {
  name = 'InsertRow';
  
  private row: number;
  private oldStates: Map<string, CellState | undefined> = new Map();
  
  constructor(row: number) {
    this.row = row;
  }
  
  execute(): void {
    // Сохраняем ВСЕ данные до изменений
    this.oldStates = saveAllData();
    this._shiftRowsDown();
  }
  
  undo(): void {
    restoreAllData(this.oldStates);
  }
  
  redo(): void {
    this._shiftRowsDown();
  }
  
  private _shiftRowsDown(): void {
    const data = getCurrentData();
    const newData = new Map<string, CellState>();
    
    // Сдвигаем все строки начиная с row на 1 вниз
    data.forEach((state, key) => {
      const [r, c] = key.split('-').map(Number);
      
      if (r >= this.row) {
        const newKey = getCellKey(r + 1, c);
        newData.set(newKey, state);
      } else {
        newData.set(key, state);
      }
    });
    
    // Очищаем и копируем
    data.clear();
    newData.forEach((state, key) => {
      data.set(key, state);
    });
    
    const renderer = (window as any).renderer;
    if (renderer) {
      renderer.renderCells?.();
    }
  }
}

// ==========================================
// === КОМАНДА: УДАЛИТЬ СТРОКУ ===
// ==========================================

export class DeleteRowCommand implements ICommand {
  name = 'DeleteRow';
  
  private row: number;
  private oldStates: Map<string, CellState | undefined> = new Map();
  
  constructor(row: number) {
    this.row = row;
  }
  
  execute(): void {
    this.oldStates = saveAllData();
    this._shiftRowsUp();
  }
  
  undo(): void {
    restoreAllData(this.oldStates);
  }
  
  redo(): void {
    this._shiftRowsUp();
  }
  
  private _shiftRowsUp(): void {
    const data = getCurrentData();
    const newData = new Map<string, CellState>();
    
    data.forEach((state, key) => {
      const [r, c] = key.split('-').map(Number);
      
      if (r === this.row) {
        // Пропускаем удаляемую строку
        return;
      } else if (r > this.row) {
        const newKey = getCellKey(r - 1, c);
        newData.set(newKey, state);
      } else {
        newData.set(key, state);
      }
    });
    
    data.clear();
    newData.forEach((state, key) => {
      data.set(key, state);
    });
    
    const renderer = (window as any).renderer;
    if (renderer) {
      renderer.renderCells?.();
    }
  }
}

// ==========================================
// === КОМАНДА: ВСТАВИТЬ СТОЛБЕЦ ===
// ==========================================

export class InsertColumnCommand implements ICommand {
  name = 'InsertColumn';
  
  private col: number;
  private oldStates: Map<string, CellState | undefined> = new Map();
  
  constructor(col: number) {
    this.col = col;
  }
  
  execute(): void {
    this.oldStates = saveAllData();
    this._shiftColumnsRight();
  }
  
  undo(): void {
    restoreAllData(this.oldStates);
  }
  
  redo(): void {
    this._shiftColumnsRight();
  }
  
  private _shiftColumnsRight(): void {
    const data = getCurrentData();
    const newData = new Map<string, CellState>();
    
    data.forEach((state, key) => {
      const [r, c] = key.split('-').map(Number);
      
      if (c >= this.col) {
        const newKey = getCellKey(r, c + 1);
        newData.set(newKey, state);
      } else {
        newData.set(key, state);
      }
    });
    
    data.clear();
    newData.forEach((state, key) => {
      data.set(key, state);
    });
    
    const renderer = (window as any).renderer;
    if (renderer) {
      renderer.renderCells?.();
    }
  }
}

// ==========================================
// === КОМАНДА: УДАЛИТЬ СТОЛБЕЦ ===
// ==========================================

export class DeleteColumnCommand implements ICommand {
  name = 'DeleteColumn';
  
  private col: number;
  private oldStates: Map<string, CellState | undefined> = new Map();
  
  constructor(col: number) {
    this.col = col;
  }
  
  execute(): void {
    this.oldStates = saveAllData();
    this._shiftColumnsLeft();
  }
  
  undo(): void {
    restoreAllData(this.oldStates);
  }
  
  redo(): void {
    this._shiftColumnsLeft();
  }
  
  private _shiftColumnsLeft(): void {
    const data = getCurrentData();
    const newData = new Map<string, CellState>();
    
    data.forEach((state, key) => {
      const [r, c] = key.split('-').map(Number);
      
      if (c === this.col) {
        return;
      } else if (c > this.col) {
        const newKey = getCellKey(r, c - 1);
        newData.set(newKey, state);
      } else {
        newData.set(key, state);
      }
    });
    
    data.clear();
    newData.forEach((state, key) => {
      data.set(key, state);
    });
    
    const renderer = (window as any).renderer;
    if (renderer) {
      renderer.renderCells?.();
    }
  }
}
