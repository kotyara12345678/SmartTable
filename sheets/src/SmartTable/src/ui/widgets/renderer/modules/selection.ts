/**
 * Selection Module - Выделение и навигация
 */

export interface SelectionContext {
  state: any;
  CONFIG: any;
  elements: any;
  getCellElement: (row: number, col: number) => HTMLElement | null;
  getCellId: (row: number, col: number) => string;
  updateCellReference: () => void;
  updateFormulaBar: () => void;
  finishEditing: () => void;
  saveActiveCell?: (row: number, col: number) => void;
  FocusManager?: any;
}

/**
 * Выделить ячейку
 */
export function selectCell(row: number, col: number, context: SelectionContext): void {
  const { state, elements, CONFIG } = context;

  // Завершить редактирование если оно идет
  if (state.isEditing) {
    const isDifferentCell = state.editingCell.row !== row || state.editingCell.col !== col;
    if (isDifferentCell) {
      context.finishEditing();
    }
  }

  // Не снимать выделение если идет выделение диапазона
  if (!state.isSelecting) {
    elements.cellGrid.querySelectorAll('.cell.selected').forEach((cell: HTMLElement) => {
      cell.classList.remove('selected');
    });
  }

  // Снять выделение с предыдущих заголовков
  const prevRowHeader = elements.rowHeaders.querySelector('.row-header.selected');
  if (prevRowHeader) prevRowHeader.classList.remove('selected');

  const prevColHeader = elements.columnHeaders.querySelector('.column-header.selected');
  if (prevColHeader) prevColHeader.classList.remove('selected');

  // Выделить новую ячейку
  state.selectedCell = { row, col };
  const cell = context.getCellElement(row, col);

  if (cell) {
    cell.classList.add('selected');
    cell.focus();

    if (context.FocusManager) {
      context.FocusManager.setActiveCell(cell, { row, col });
    }
  }

  if (context.saveActiveCell) {
    context.saveActiveCell(row, col);
  }

  // Выделить заголовки
  const rowHeader = elements.rowHeaders.querySelector(`.row-header[data-row="${row}"]`);
  if (rowHeader) rowHeader.classList.add('selected');

  const colHeader = elements.columnHeaders.querySelector(`.column-header[data-col="${col}"]`);
  if (colHeader) colHeader.classList.add('selected');

  context.updateCellReference();
  context.updateFormulaBar();

  // Обновить fill handle
  const fillHandle = document.getElementById('fillHandle');
  if (fillHandle && cell) {
    const rect = cell.getBoundingClientRect();
    fillHandle.style.display = 'block';
    fillHandle.style.left = `${rect.right - 4}px`;
    fillHandle.style.top = `${rect.bottom - 4}px`;
  }
}

/**
 * Выделить строку
 */
export function selectRow(row: number, context: SelectionContext): void {
  for (let col = 0; col < context.CONFIG.COLS; col++) {
    selectCell(row, col, context);
  }
}

/**
 * Выделить столбец
 */
export function selectColumn(col: number, context: SelectionContext): void {
  const { state, elements } = context;
  
  for (let row = 0; row < context.CONFIG.ROWS; row++) {
    const cell = context.getCellElement(row, col);
    if (cell) {
      cell.classList.add('selected');
    }
  }
  state.selectedCell.col = col;
  context.updateCellReference();
}

/**
 * Переместить выделение
 */
export function moveSelection(deltaRow: number, deltaCol: number, context: SelectionContext): void {
  const { state, CONFIG } = context;
  const newRow = Math.max(0, Math.min(CONFIG.ROWS - 1, state.selectedCell.row + deltaRow));
  const newCol = Math.max(0, Math.min(CONFIG.COLS - 1, state.selectedCell.col + deltaCol));
  selectCell(newRow, newCol, context);
}

/**
 * Получить элемент ячейки
 */
export function getCellElement(row: number, col: number, cellGrid: HTMLElement): HTMLElement | null {
  return cellGrid.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`) as HTMLElement | null;
}
