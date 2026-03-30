/**
 * UI Helpers Module - Вспомогательные функции UI
 */

export interface UIContext {
  elements: any;
  state: any;
  getCellId: (row: number, col: number) => string;
  getCellKey: (row: number, col: number) => string;
  getCurrentData: () => Map<string, any>;
}

/**
 * Обновить ссылку на ячейку
 */
export function updateCellReference(context: UIContext): void {
  const { row, col } = context.state.selectedCell;
  context.elements.cellReference.textContent = context.getCellId(row, col);
}

/**
 * Обновить formula bar
 */
export function updateFormulaBar(context: UIContext): void {
  const { row, col } = context.state.selectedCell;
  const key = context.getCellKey(row, col);
  const data = context.getCurrentData();
  const cellData = data.get(key);
  const value = cellData?.formula || cellData?.value || '';
  context.elements.formulaInput.value = value;
}

/**
 * Обновить заголовки выделения
 */
export function updateSelectionHeaders(context: UIContext): void {
  const { elements, state } = context;
  
  const rowHeader = elements.rowHeaders.querySelector(`.row-header[data-row="${state.selectedCell.row}"]`);
  if (rowHeader) {
    rowHeader.classList.add('selected');
  }
  const colHeader = elements.columnHeaders.querySelector(`.column-header[data-col="${state.selectedCell.col}"]`);
  if (colHeader) {
    colHeader.classList.add('selected');
  }
}

/**
 * Обновить выделение диапазона
 */
export function updateRangeSelection(context: UIContext): void {
  const { elements, state } = context;
  
  if (!state.selectionStart || !state.selectionEnd) return;

  elements.cellGrid.querySelectorAll('.cell.selected').forEach((cell: HTMLElement) => {
    cell.classList.remove('selected');
  });

  const minRow = Math.min(state.selectionStart.row, state.selectionEnd.row);
  const maxRow = Math.max(state.selectionStart.row, state.selectionEnd.row);
  const minCol = Math.min(state.selectionStart.col, state.selectionEnd.col);
  const maxCol = Math.max(state.selectionStart.col, state.selectionEnd.col);

  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      const cell = elements.cellGrid.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`) as HTMLElement;
      if (cell) {
        cell.classList.add('selected');
      }
    }
  }

  state.selectedCell = { row: state.selectionEnd!.row, col: state.selectionEnd!.col };
  updateCellReference(context);
  updateFormulaBar(context);
}

/**
 * Инициализировать DOM элементы
 */
export function initElements(): any {
  return {
    columnHeaders: document.getElementById('columnHeaders')!,
    rowHeaders: document.getElementById('rowHeaders')!,
    cellGrid: document.getElementById('cellGrid')!,
    cellReference: document.getElementById('cellReference')!,
    formulaInput: document.getElementById('formulaInput')! as HTMLInputElement,
    cellGridWrapper: document.getElementById('cellGridWrapper')! as HTMLDivElement,
    sheetsList: document.getElementById('sheetsList')!,
    btnAddSheet: document.getElementById('btnAddSheet')!,
    contextMenu: document.getElementById('contextMenu')!,
    formulaSuggestions: document.getElementById('formulaSuggestions')!,
    formulaSuggestionsList: document.getElementById('formulaSuggestionsList')!,
    zoomLabel: document.getElementById('zoomLabel')!,
    btnZoomIn: document.getElementById('btnZoomIn')!,
    btnZoomOut: document.getElementById('btnZoomOut')!,
    btnAI: document.getElementById('btnAI')!,
    btnClearChat: document.getElementById('btnClearChat') || document.createElement('div'),
    btnAiSend: document.getElementById('btnAiSend') || document.createElement('div'),
    aiInput: document.getElementById('aiInput') as HTMLInputElement || document.createElement('input'),
    aiChat: document.getElementById('aiChat') || document.createElement('div'),
    btnBold: document.getElementById('btnBold')!,
    btnItalic: document.getElementById('btnItalic')!,
    btnUnderline: document.getElementById('btnUnderline')!,
    btnStrike: document.getElementById('btnStrike')!,
    btnBorders: document.getElementById('btnBorders')!,
    btnToggleFormulaBar: document.getElementById('btnToggleFormulaBar')!,
    textColor: document.getElementById('textColor')! as HTMLInputElement,
    fillColor: document.getElementById('fillColor')! as HTMLInputElement,
    fontFamily: document.getElementById('fontFamily')! as HTMLSelectElement,
    fontSize: document.getElementById('fontSize')! as HTMLSelectElement,
    numberFormat: document.getElementById('numberFormat')! as HTMLSelectElement,
  };
}

/**
 * Получить глобальный input для редактирования
 */
export function getGlobalCellInput(): HTMLInputElement {
  let globalCellInput: HTMLInputElement | null = document.getElementById('global-cell-input') as HTMLInputElement;
  if (!globalCellInput) {
    globalCellInput = document.createElement('input');
    globalCellInput.id = 'global-cell-input';
    document.body.appendChild(globalCellInput);
  }
  return globalCellInput;
}
