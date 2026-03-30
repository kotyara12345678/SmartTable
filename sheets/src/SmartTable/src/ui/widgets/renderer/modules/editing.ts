/**
 * Editing Module - Редактирование ячеек
 */

export interface EditingContext {
  state: any;
  elements: any;
  CONFIG: any;
  getCellKey: (row: number, col: number) => string;
  getCurrentData: () => Map<string, any>;
  getCellElement: (row: number, col: number) => HTMLElement | null;
  previewFormula: (formula: string, getter: (ref: string) => string) => any;
  letterToCol: (letter: string) => number;
  removeFormula: (key: string) => void;
  registerFormula: (key: string, formula: string, callback: any) => void;
  pushUndo: (key: string, oldValue: any) => void;
  updateAIDataCache: () => void;
  updateFormulaBar: () => void;
  recalculateDependentCells: (key: string, data: Map<string, any>) => void;
  updateSingleCell: (row: number, col: number) => void;
  autoSave: () => void;
  autoFitColumn: (col: number) => void;
}

export interface EditState {
  row: number;
  col: number;
}

/**
 * Начать редактирование ячейки
 */
export function editCell(
  row: number,
  col: number,
  selectAll: boolean,
  context: EditingContext
): void {
  const { elements, state, CONFIG, getCellKey, getCurrentData } = context;
  const cell = context.getCellElement(row, col);
  if (!cell) return;

  const input = context.elements.globalCellInput || document.getElementById('global-cell-input') as HTMLInputElement;
  const data = getCurrentData();
  const key = getCellKey(row, col);
  const cellData = data.get(key);

  input.value = cellData?.value || '';

  const wrapper = elements.cellGridWrapper;
  const cellLeft = col * CONFIG.CELL_WIDTH;
  const cellTop = row * CONFIG.CELL_HEIGHT;
  const posLeft = cellLeft - wrapper.scrollLeft;
  const posTop = cellTop - wrapper.scrollTop;

  input.style.left = posLeft + 'px';
  input.style.top = posTop + 'px';
  input.style.width = CONFIG.CELL_WIDTH + 'px';
  input.style.height = CONFIG.CELL_HEIGHT + 'px';
  input.style.font = window.getComputedStyle(cell).font;
  input.classList.add('editing');

  state.editingCell = { row, col };
  state.isEditing = true;
  cell.classList.add('editing');

  input.focus();
  if (selectAll) input.select();

  context.updateFormulaBar();
}

/**
 * Завершить редактирование
 */
export function finishEditing(save: boolean, context: EditingContext): void {
  const { state, elements } = context;
  if (state.editingCell.row === -1) return;

  const input = elements.globalCellInput || document.getElementById('global-cell-input') as HTMLInputElement;
  const { row, col } = state.editingCell;
  const cell = context.getCellElement(row, col);

  if (!cell) {
    resetEditing(context);
    return;
  }

  state.isEditing = false;
  cell.classList.remove('editing');
  input.classList.remove('editing');

  if (save) {
    const key = context.getCellKey(row, col);
    const data = context.getCurrentData();
    const oldValue = data.get(key);
    const inputValue = input.value;

    let finalValue = inputValue;
    let isFormula = false;

    if (inputValue.startsWith('=')) {
      isFormula = true;
      const result = context.previewFormula(inputValue, (cellRef: string) => {
        const match = cellRef.match(/^([A-Z]+)(\d+)$/i);
        if (!match) return '';
        const refCol = context.letterToCol(match[1]);
        const refRow = parseInt(match[2]) - 1;
        const cellKey = context.getCellKey(refRow, refCol);
        const cellData = data.get(cellKey);
        return cellData?.value || '';
      });

      finalValue = String(result.value);

      if (result.value === '#COLOR_COMMAND' && result.colorName) {
        (context as any).applyColorFromFormula?.(result, data);
        finalValue = '';
      }

      context.removeFormula(key);
      context.registerFormula(key, inputValue, (ref: string, formula: string) => {
        state.cellFormulas.set(ref, formula);
      });
      state.cellFormulas.set(key, inputValue);
    } else {
      context.removeFormula(key);
      if (state.cellFormulas.has(key)) {
        state.cellFormulas.delete(key);
      }
    }

    const cellDataToSave = {
      value: finalValue,
      ...(isFormula && { formula: inputValue }),
      ...oldValue
    };

    if (finalValue || isFormula) {
      data.set(key, cellDataToSave);
    } else {
      data.delete(key);
    }

    context.pushUndo(key, oldValue);
    context.updateAIDataCache();
    context.updateFormulaBar();
    context.recalculateDependentCells(key, data);
    context.updateSingleCell(row, col);

    const autoFitEnabled = localStorage.getItem('smarttable-auto-fit-columns') === 'true';
    if (autoFitEnabled && finalValue) {
      context.autoFitColumn(col);
    }

    context.autoSave();
  }

  resetEditing(context);
}

/**
 * Сбросить редактирование
 */
export function resetEditing(context: EditingContext): void {
  const { state, elements } = context;
  const input = elements.globalCellInput || document.getElementById('global-cell-input') as HTMLInputElement;
  
  input.value = '';
  input.classList.remove('editing');
  state.editingCell = { row: -1, col: -1 };
  state.isEditing = false;

  elements.cellGrid.querySelectorAll('.cell.editing').forEach((cell: HTMLElement) => {
    cell.classList.remove('editing');
  });
}

/**
 * Получить глобальный input
 */
export function getGlobalCellInput(): HTMLInputElement {
  let input = document.getElementById('global-cell-input') as HTMLInputElement;
  if (!input) {
    input = document.createElement('input');
    input.id = 'global-cell-input';
    input.style.position = 'absolute';
    input.style.display = 'none';
    document.body.appendChild(input);
  }
  return input;
}
