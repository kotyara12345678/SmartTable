/**
 * Data Validation Module - Валидация данных (dropdown списки)
 */

import { getCellKey, letterToCol } from './utils';
import { TableState } from './state';

/**
 * Конфигурация валидации
 */
export interface ValidationConfig {
  type: 'list' | 'number' | 'date' | 'text';
  values?: string[];
  min?: number | string;
  max?: number | string;
}

/**
 * Установить валидацию для ячейки
 */
export function setDataValidation(
  state: TableState,
  cellRef: string,
  values: string[]
): void {
  const match = cellRef.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return;

  const col = match[1].toUpperCase().charCodeAt(0) - 65;
  const row = parseInt(match[2]) - 1;
  const key = getCellKey(row, col);

  state.dataValidations.set(key, { type: 'list', values });
  console.log('[DataValidation] Set for', cellRef, ':', values);
}

/**
 * Получить валидацию для ячейки
 */
export function getDataValidation(
  state: TableState,
  row: number,
  col: number
): { type: string; values: string[] } | null {
  const key = getCellKey(row, col);
  return state.dataValidations.get(key) || null;
}

/**
 * Удалить валидацию с ячейки
 */
export function removeDataValidation(
  state: TableState,
  cellRef: string
): void {
  const match = cellRef.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return;

  const col = match[1].toUpperCase().charCodeAt(0) - 65;
  const row = parseInt(match[2]) - 1;
  const key = getCellKey(row, col);

  state.dataValidations.delete(key);
}

/**
 * Очистить все валидации
 */
export function clearAllDataValidations(state: TableState): void {
  state.dataValidations.clear();
}

/**
 * Проверить имеет ли ячейка dropdown
 */
export function hasDropdown(
  state: TableState,
  row: number,
  col: number
): boolean {
  const validation = getDataValidation(state, row, col);
  return validation?.type === 'list';
}

/**
 * Рендеринг dropdown индикатора для ячейки
 */
export function renderCellDropdown(
  state: TableState,
  cell: HTMLElement,
  row: number,
  col: number
): void {
  const validation = getDataValidation(state, row, col);
  if (!validation || validation.type !== 'list') return;

  // Добавляем индикатор dropdown
  cell.style.position = 'relative';

  const arrow = document.createElement('span');
  arrow.innerHTML = '▼';
  arrow.style.cssText = 'position:absolute;right:2px;top:50%;transform:translateY(-50%);font-size:10px;color:#666;pointer-events:none;';
  cell.appendChild(arrow);
}

/**
 * Показать dropdown список с значениями
 */
export function showDropdownList(
  event: MouseEvent,
  cell: HTMLElement,
  row: number,
  col: number,
  values: string[],
  state: TableState,
  getCurrentData: () => Map<string, any>,
  updateAIDataCache: () => void,
  updateFormulaBar: () => void,
  autoSave: () => void
): void {
  event.stopPropagation();

  // Удаляем предыдущий dropdown если есть
  const existing = document.getElementById('cell-dropdown-list');
  if (existing) existing.remove();

  // Создаём dropdown
  const dropdown = document.createElement('div');
  dropdown.id = 'cell-dropdown-list';
  dropdown.style.cssText = `
    position:fixed;
    z-index:10000;
    background:white;
    border:1px solid #ddd;
    border-radius:4px;
    box-shadow:0 2px 8px rgba(0,0,0,0.15);
    max-height:200px;
    overflow-y:auto;
    min-width:150px;
  `;

  const rect = cell.getBoundingClientRect();
  dropdown.style.left = rect.left + 'px';
  dropdown.style.top = rect.bottom + 'px';

  values.forEach(value => {
    const item = document.createElement('div');
    item.textContent = value;
    item.style.cssText = 'padding:8px 12px;cursor:pointer;font-size:13px;';
    item.onmouseover = () => item.style.background = '#f0f0f0';
    item.onmouseout = () => item.style.background = 'white';
    item.onclick = () => {
      const key = getCellKey(row, col);
      const data = getCurrentData();
      data.set(key, { value });
      cell.textContent = value;
      updateAIDataCache();
      updateFormulaBar();
      dropdown.remove();
      autoSave();
    };
    dropdown.appendChild(item);
  });

  document.body.appendChild(dropdown);

  // Закрыть при клике вне
  setTimeout(() => {
    document.addEventListener('click', function closeDropdown() {
      dropdown.remove();
      document.removeEventListener('click', closeDropdown);
    });
  }, 100);
}

/**
 * Проверить проходит ли значение валидацию
 */
export function validateValue(
  validation: ValidationConfig,
  value: string
): boolean {
  switch (validation.type) {
    case 'list':
      return validation.values?.includes(value) ?? false;
    case 'number':
      const num = parseFloat(value);
      if (isNaN(num)) return false;
      if (validation.min !== undefined && num < Number(validation.min)) return false;
      if (validation.max !== undefined && num > Number(validation.max)) return false;
      return true;
    case 'date':
      const date = new Date(value);
      if (isNaN(date.getTime())) return false;
      if (validation.min) {
        const minDate = new Date(String(validation.min));
        if (date < minDate) return false;
      }
      if (validation.max) {
        const maxDate = new Date(String(validation.max));
        if (date > maxDate) return false;
      }
      return true;
    case 'text':
    default:
      return true;
  }
}
