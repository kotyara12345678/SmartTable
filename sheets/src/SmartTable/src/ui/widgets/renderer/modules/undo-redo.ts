/**
 * Undo/Redo Module - Отмена и повтор действий
 */

import { TableState } from './state';

/**
 * Добавить действие в undo стек
 */
export function pushUndo(
  state: TableState,
  key: string,
  oldValue: any,
  autoSave: () => void
): void {
  const MAX_UNDO = 50;
  const currentData = state.sheetsData.get(state.currentSheet);
  state.undoStack.push({ 
    key, 
    oldValue, 
    newValue: currentData?.get(key) 
  });
  
  if (state.undoStack.length > MAX_UNDO) {
    state.undoStack.shift();
  }
  
  state.redoStack = []; // Очищаем redo при новом действии
  console.log('[Undo] Pushed to undo stack, size:', state.undoStack.length);

  // Автосохранение после каждого изменения
  autoSave();
}

/**
 * Отменить последнее действие
 */
export function undo(
  state: TableState,
  renderCells: () => void,
  updateAIDataCache: () => void,
  updateFormulaBar: () => void,
  autoSave: () => void
): void {
  if (state.undoStack.length === 0) {
    console.log('[Undo] Nothing to undo');
    return;
  }

  const action = state.undoStack.pop()!;
  const data = state.sheetsData.get(state.currentSheet)!;
  const currentValue = data.get(action.key);

  // Сохраняем текущее значение для redo
  state.redoStack.push({ 
    key: action.key, 
    oldValue: currentValue, 
    newValue: action.oldValue 
  });

  // Восстанавливаем старое значение
  if (action.oldValue) {
    data.set(action.key, action.oldValue);
  } else {
    data.delete(action.key);
  }

  console.log('[Undo] Undone:', action.key);
  renderCells();
  updateAIDataCache();
  updateFormulaBar();
  autoSave();
}

/**
 * Повторить отменённое действие
 */
export function redo(
  state: TableState,
  renderCells: () => void,
  updateAIDataCache: () => void,
  updateFormulaBar: () => void,
  autoSave: () => void
): void {
  if (state.redoStack.length === 0) {
    console.log('[Redo] Nothing to redo');
    return;
  }

  const action = state.redoStack.pop()!;
  const data = state.sheetsData.get(state.currentSheet)!;

  // Сохраняем текущее значение для undo
  state.undoStack.push({ 
    key: action.key, 
    oldValue: data.get(action.key), 
    newValue: action.newValue 
  });

  // Восстанавливаем значение
  if (action.newValue) {
    data.set(action.key, action.newValue);
  } else {
    data.delete(action.key);
  }

  console.log('[Redo] Redone:', action.key);
  renderCells();
  updateAIDataCache();
  updateFormulaBar();
  autoSave();
}

/**
 * Очистить undo/redo историю
 */
export function clearUndoRedo(state: TableState): void {
  state.undoStack = [];
  state.redoStack = [];
}

/**
 * Проверить есть ли действия для отмены
 */
export function canUndo(state: TableState): boolean {
  return state.undoStack.length > 0;
}

/**
 * Проверить есть ли действия для повтора
 */
export function canRedo(state: TableState): boolean {
  return state.redoStack.length > 0;
}
