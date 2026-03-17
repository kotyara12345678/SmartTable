/**
 * Cell Editing Module - Редактирование ячеек
 */

export interface EditState {
  isEditing: boolean;
  editedCell: { row: number; col: number } | null;
}

/**
 * Начать редактирование ячейки
 */
export function startCellEdit(cell: HTMLElement, selectAll = true): void {
  if (!cell) return;

  cell.classList.add('editing');
  cell.contentEditable = 'true';
  cell.focus();

  if (selectAll) {
    const range = document.createRange();
    range.selectNodeContents(cell);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }
}

/**
 * Завершить редактирование ячейки
 */
export function finishCellEdit(cell: HTMLElement): void {
  if (!cell) return;

  cell.classList.remove('editing');
  cell.contentEditable = 'false';
  cell.blur();
}

/**
 * Получить значение из редактируемой ячейки
 */
export function getCellValue(cell: HTMLElement): string {
  return cell.textContent || '';
}

/**
 * Установить значение в ячейку
 */
export function setCellValue(cell: HTMLElement, value: string): void {
  if (!cell) return;
  cell.textContent = value;
  if (value) {
    cell.classList.add('has-content');
  } else {
    cell.classList.remove('has-content');
  }
}

/**
 * Обработать ввод текста в ячейку
 */
export function handleCellInput(
  cell: HTMLElement,
  onChange: (value: string) => void
): void {
  const value = cell.textContent || '';

  if (value) {
    cell.classList.add('has-content');
  } else {
    cell.classList.remove('has-content');
  }

  onChange(value);
}

/**
 * Проверить является ли значение формулой
 */
export function isFormula(value: string): boolean {
  return value.startsWith('=');
}

/**
 * Обработать клавиши при редактировании
 */
export function handleEditKeydown(
  e: KeyboardEvent,
  callbacks: {
    onSave: () => void;
    onCancel: () => void;
    onNextRow: () => void;
    onNextCell: (shift: boolean) => void;
  }
): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    callbacks.onSave();
    callbacks.onNextRow();
  } else if (e.key === 'Tab') {
    e.preventDefault();
    callbacks.onSave();
    callbacks.onNextCell(e.shiftKey);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    callbacks.onCancel();
  }
}
