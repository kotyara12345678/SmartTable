/**
 * Events Module - Обработчики событий
 */

export interface EventContext {
  elements: any;
  state: any;
  CONFIG: any;
  selectCell: (row: number, col: number) => void;
  editCell: (row: number, col: number, selectAll?: boolean) => void;
  finishEditing: () => void;
  updateCellReference: () => void;
  updateFormulaBar: () => void;
  getCellElement: (row: number, col: number) => HTMLElement | null;
  getCellKey: (row: number, col: number) => string;
  getCurrentData: () => Map<string, any>;
  getDataValidation: (row: number, col: number) => any;
  showDropdownList: (event: MouseEvent, cell: HTMLElement, row: number, col: number, values: string[]) => void;
}

/**
 * Настроить выделение диапазона
 */
export function setupRangeSelection(context: EventContext): void {
  const { elements, state } = context;

  elements.cellGrid.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button !== 0) return;

    const cell = (e.target as HTMLElement).closest('.cell') as HTMLElement;
    if (!cell) return;

    const row = parseInt(cell.dataset.row || '0');
    const col = parseInt(cell.dataset.col || '0');

    state.selectionStart = { row, col };
    state.selectionEnd = { row, col };
    state.isSelecting = true;

    context.selectCell(row, col);
  });

  elements.cellGrid.addEventListener('mousemove', (e: MouseEvent) => {
    if (!state.isSelecting || !state.selectionStart) return;

    const cell = (e.target as HTMLElement).closest('.cell') as HTMLElement;
    if (!cell) return;

    const row = parseInt(cell.dataset.row || '0');
    const col = parseInt(cell.dataset.col || '0');

    state.selectionEnd = { row, col };
  });

  document.addEventListener('mouseup', () => {
    state.isSelecting = false;
  });
}

/**
 * Настроить обработчики событий ячеек
 */
export function setupCellEventListeners(context: EventContext): void {
  const { elements, state } = context;

  // Клик по ячейке
  elements.cellGrid.addEventListener('click', (e: MouseEvent) => {
    const cell = (e.target as HTMLElement).closest('.cell') as HTMLElement;
    if (!cell) return;

    const row = parseInt(cell.dataset.row || '0');
    const col = parseInt(cell.dataset.col || '0');

    // Проверка на dropdown ячейку
    if (cell.dataset.hasDropdown === 'true') {
      context.selectCell(row, col);
      const validation = context.getDataValidation(row, col);
      if (validation && validation.type === 'list') {
        context.showDropdownList(e, cell, row, col, validation.values);
      }
      return;
    }

    if (state.isSelecting) return;
    context.selectCell(row, col);
  });

  // Двойной клик
  elements.cellGrid.addEventListener('dblclick', (e: MouseEvent) => {
    const cell = (e.target as HTMLElement).closest('.cell') as HTMLElement;
    if (!cell) return;

    const row = parseInt(cell.dataset.row || '0');
    const col = parseInt(cell.dataset.col || '0');

    context.selectCell(row, col);
    context.editCell(row, col, true);
  });
}

/**
 * Настроить контекстное меню
 */
export function setupContextMenu(context: EventContext): void {
  const { elements, state } = context;

  elements.cellGrid.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();

    const cell = (e.target as HTMLElement).closest('.cell') as HTMLElement;
    if (!cell) return;

    const row = parseInt(cell.dataset.row || '0');
    const col = parseInt(cell.dataset.col || '0');

    if (!state.isSelecting && (!state.selectionStart || 
        (state.selectionStart.row === row && state.selectionStart.col === col))) {
      state.contextMenuCell = { row, col };
      context.selectCell(row, col);
    } else {
      state.contextMenuCell = state.selectedCell;
    }

    const menu = document.getElementById('contextMenu');
    if (menu) {
      menu.style.display = 'block';
      menu.style.left = `${e.pageX}px`;
      menu.style.top = `${e.pageY}px`;
    }
  });

  document.addEventListener('click', () => {
    const menu = document.getElementById('contextMenu');
    if (menu) menu.style.display = 'none';
  });
}

/**
 * Настроить контекстное меню листов
 */
export function setupSheetContextMenu(context: EventContext): void {
  const { elements, state } = context;

  elements.sheetsList.addEventListener('contextmenu', (e: MouseEvent) => {
    e.preventDefault();

    const tab = (e.target as HTMLElement).closest('.sheet-tab') as HTMLElement;
    if (!tab) return;

    const sheetId = parseInt(tab.dataset.sheet || '0');
    if (!sheetId) return;

    state.contextMenuSheet = sheetId;

    const menu = document.getElementById('sheetContextMenu');
    if (menu) {
      menu.style.display = 'block';
      const menuRect = menu.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      let left = e.pageX;
      let top = e.pageY;

      if (top + menuRect.height > viewportHeight) {
        top = e.pageY - menuRect.height;
      }
      if (left + menuRect.width > viewportWidth) {
        left = e.pageX - menuRect.width;
      }

      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
    }
  });

  document.addEventListener('click', () => {
    const menu = document.getElementById('sheetContextMenu');
    if (menu) menu.style.display = 'none';
  });
}

/**
 * Настроить клавиатурный контроллер
 */
export function setupKeyboardController(context: EventContext): void {
  // Реализация обработчиков клавиатуры
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // Обработка глобальных горячих клавиш
  });
}

/**
 * Настроить все обработчики событий
 */
export function setupEventListeners(context: EventContext): void {
  setupRangeSelection(context);
  setupCellEventListeners(context);
  setupContextMenu(context);
  setupSheetContextMenu(context);
  setupKeyboardController(context);
}
