/**
 * Keyboard Module - Обработчики клавиатуры
 */

export interface KeyboardContext {
  state: any;
  CONFIG: any;
  selectCell: (row: number, col: number) => void;
  editCell: (row: number, col: number, selectAll?: boolean) => void;
  finishEditing: () => void;
  getCellElement: (row: number, col: number) => HTMLElement | null;
  getGlobalCellInput: () => HTMLInputElement;
  updateFormulaBar: () => void;
}

/**
 * Обработать клавиши при редактировании
 */
export function handleGlobalInputKeyDown(
  e: KeyboardEvent,
  context: KeyboardContext
): void {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const currentRow = context.state.editingCell.row;
    const currentCol = context.state.editingCell.col;
    context.finishEditing();
    const nextRow = Math.min(currentRow + 1, context.CONFIG.ROWS - 1);
    context.selectCell(nextRow, currentCol);
  } else if (e.key === 'Tab') {
    e.preventDefault();
    const currentRow = context.state.editingCell.row;
    const currentCol = context.state.editingCell.col;
    context.finishEditing();
    const nextCol = e.shiftKey
      ? Math.max(0, currentCol - 1)
      : Math.min(context.CONFIG.COLS - 1, currentCol + 1);
    context.selectCell(currentRow, nextCol);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    context.finishEditing();
  }
}

/**
 * Обработать ввод в глобальный input
 */
export function handleGlobalInputChange(e: Event, context: KeyboardContext): void {
  if (!context.state.isEditing) return;
  context.updateFormulaBar();
}

/**
 * Настроить клавиатурный контроллер
 */
export function setupKeyboardController(context: KeyboardContext): void {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // Глобальные горячие клавиши
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 's':
          e.preventDefault();
          // Сохранить
          break;
        case 'z':
          e.preventDefault();
          // Undo
          break;
        case 'y':
          e.preventDefault();
          // Redo
          break;
        case 'c':
          // Copy
          break;
        case 'v':
          // Paste
          break;
        case 'x':
          // Cut
          break;
      }
    }
  });

  const input = context.getGlobalCellInput();
  input.addEventListener('keydown', (e: KeyboardEvent) => {
    handleGlobalInputKeyDown(e, context);
  });

  input.addEventListener('input', (e: Event) => {
    handleGlobalInputChange(e, context);
  });
}
