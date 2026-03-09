/**
 * SmartTable AutoComplete Module
 * ОТКЛЮЧЁН ПО ЗАПРОСУ ПОЛЬЗОВАТЕЛЯ
 */

// Модуль отключен - все функции пустые заглушки

export function initAutoComplete(): void {
  console.log('[AutoComplete] Module disabled by user request');
}

export function getPredictionForCell(row: number, col: number): null {
  return null;
}

export function acceptCurrentSuggestion(): void {
  // Пустая функция
}

export function clearCache(): void {
  // Пустая функция
}

// Пустой глобальный объект
(window as any).autoComplete = {
  init: initAutoComplete,
  getPrediction: getPredictionForCell,
  accept: acceptCurrentSuggestion,
  clearCache: clearCache,
  config: {},
  FORMULA_PATTERNS: {}
};

console.log('[AutoComplete] Module disabled');
