/**
 * Context Menu Module - Контекстное меню
 */

/**
 * Действие контекстного меню
 */
export interface ContextMenuAction {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
}

/**
 * Конфигурация контекстного меню
 */
export interface ContextMenuConfig {
  actions: ContextMenuAction[];
  onAction?: (actionId: string) => void;
}

/**
 * Позиция контекстного меню
 */
export interface MenuPosition {
  x: number;
  y: number;
}

/**
 * Стандартные действия для ячеек
 */
export function getCellMenuActions(): ContextMenuAction[] {
  return [
    { id: 'cut', label: 'Вырезать', shortcut: 'Ctrl+X' },
    { id: 'copy', label: 'Копировать', shortcut: 'Ctrl+C' },
    { id: 'paste', label: 'Вставить', shortcut: 'Ctrl+V' },
    { type: 'separator' } as any,
    { id: 'clear', label: 'Очистить' },
    { id: 'delete-selected', label: 'Удалить' },
    { type: 'separator' } as any,
    { id: 'insert-row-above', label: 'Вставить строку выше' },
    { id: 'insert-row-below', label: 'Вставить строку ниже' },
    { id: 'delete-row', label: 'Удалить строку' },
    { id: 'insert-col-left', label: 'Вставить столбец слева' },
    { id: 'insert-col-right', label: 'Вставить столбец справа' },
    { id: 'delete-col', label: 'Удалить столбец' },
    { type: 'separator' } as any,
    { id: 'find-in-selection', label: 'Найти...' },
    { id: 'filter-by-value', label: 'Фильтр по значению' },
  ];
}

/**
 * Стандартные действия для листов
 */
export function getSheetMenuActions(): ContextMenuAction[] {
  return [
    { id: 'rename-sheet', label: 'Переименовать' },
    { id: 'duplicate-sheet', label: 'Дублировать' },
    { type: 'separator' } as any,
    { id: 'move-sheet-left', label: 'Переместить влево' },
    { id: 'move-sheet-right', label: 'Переместить вправо' },
    { type: 'separator' } as any,
    { id: 'delete-sheet', label: 'Удалить' },
  ];
}

/**
 * Проверить попадает ли позиция в область меню
 */
export function isPositionInMenu(
  x: number,
  y: number,
  menuRect: DOMRect
): boolean {
  return (
    x >= menuRect.left &&
    x <= menuRect.right &&
    y >= menuRect.top &&
    y <= menuRect.bottom
  );
}

/**
 * Рассчитать позицию меню чтобы оно не выходило за пределы окна
 */
export function calculateMenuPosition(
  event: MouseEvent,
  menuWidth: number,
  menuHeight: number
): MenuPosition {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let x = event.pageX;
  let y = event.pageY;

  // Проверяем, помещается ли меню по горизонтали
  if (x + menuWidth > viewportWidth) {
    x = event.pageX - menuWidth;
  }

  // Проверяем, помещается ли меню по вертикали
  if (y + menuHeight > viewportHeight) {
    y = event.pageY - menuHeight;
  }

  return { x, y };
}

/**
 * Показать контекстное меню
 */
export function showContextMenu(
  menuElement: HTMLElement,
  x: number,
  y: number
): void {
  menuElement.style.display = 'block';
  menuElement.style.left = `${x}px`;
  menuElement.style.top = `${y}px`;
}

/**
 * Скрыть контекстное меню
 */
export function hideContextMenu(menuElement: HTMLElement): void {
  menuElement.style.display = 'none';
}

/**
 * Обработчик клика для контекстного меню
 */
export function handleContextMenuClick(
  event: MouseEvent,
  menuElement: HTMLElement,
  onAction: (actionId: string) => void
): void {
  const item = (event.target as HTMLElement).closest('.context-menu-item') as HTMLElement;
  if (!item) return;

  const action = item.dataset.action;
  if (action) {
    onAction(action);
  }
  
  hideContextMenu(menuElement);
}

/**
 * Создать обработчик для скрытия меню при клике вне
 */
export function createClickOutsideHandler(
  menuElement: HTMLElement,
  excludeElements?: HTMLElement[]
): (event: MouseEvent) => void {
  return function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;

    // Не скрывать если клик внутри меню
    if (menuElement.contains(target)) {
      return;
    }

    // Не скрывать если клик в исключённых элементах
    if (excludeElements?.some(el => el.contains(target))) {
      return;
    }

    hideContextMenu(menuElement);
  };
}

/**
 * Вспомогательные функции для действий контекстного меню
 */

/**
 * Вставить строку выше
 */
export function insertRowAboveAt(
  row: number,
  data: Map<string, any>
): void {
  const rowsToMove: Array<{ oldKey: string; newKey: string; value: any }> = [];
  data.forEach((cellData, key) => {
    const [cellRow, cellCol] = key.split('-').map(Number);
    if (cellRow >= row) {
      const newKey = `${cellRow + 1}-${cellCol}`;
      rowsToMove.push({ oldKey: key, newKey, value: cellData });
    }
  });
  rowsToMove.forEach(item => { data.delete(item.oldKey); data.set(item.newKey, item.value); });
}

/**
 * Вставить строку ниже
 */
export function insertRowBelowAt(
  row: number,
  data: Map<string, any>
): void {
  insertRowAboveAt(row + 1, data);
}

/**
 * Удалить строку
 */
export function deleteRowAt(
  row: number,
  data: Map<string, any>
): void {
  const keysToDelete: string[] = [];
  data.forEach((_, key) => {
    const [cellRow] = key.split('-').map(Number);
    if (cellRow === row) keysToDelete.push(key);
  });
  keysToDelete.forEach(key => data.delete(key));
  
  const rowsToMove: Array<{ oldKey: string; newKey: string; value: any }> = [];
  data.forEach((cellData, key) => {
    const [cellRow, cellCol] = key.split('-').map(Number);
    if (cellRow > row) {
      const newKey = `${cellRow - 1}-${cellCol}`;
      rowsToMove.push({ oldKey: key, newKey, value: cellData });
    }
  });
  rowsToMove.forEach(item => { data.delete(item.oldKey); data.set(item.newKey, item.value); });
}

/**
 * Вставить столбец слева
 */
export function insertColumnLeftAt(
  col: number,
  data: Map<string, any>
): void {
  const colsToMove: Array<{ oldKey: string; newKey: string; value: any }> = [];
  data.forEach((cellData, key) => {
    const [row, cellCol] = key.split('-').map(Number);
    if (cellCol >= col) {
      const newKey = `${row}-${cellCol + 1}`;
      colsToMove.push({ oldKey: key, newKey, value: cellData });
    }
  });
  colsToMove.forEach(item => { data.delete(item.oldKey); data.set(item.newKey, item.value); });
}

/**
 * Вставить столбец справа
 */
export function insertColumnRightAt(
  col: number,
  data: Map<string, any>
): void {
  insertColumnLeftAt(col + 1, data);
}

/**
 * Удалить столбец
 */
export function deleteColumnAt(
  col: number,
  data: Map<string, any>
): void {
  const keysToDelete: string[] = [];
  data.forEach((_, key) => {
    const [row, cellCol] = key.split('-').map(Number);
    if (cellCol === col) keysToDelete.push(key);
  });
  keysToDelete.forEach(key => data.delete(key));
  
  const colsToMove: Array<{ oldKey: string; newKey: string; value: any }> = [];
  data.forEach((cellData, key) => {
    const [row, cellCol] = key.split('-').map(Number);
    if (cellCol > col) {
      const newKey = `${row}-${cellCol - 1}`;
      colsToMove.push({ oldKey: key, newKey, value: cellData });
    }
  });
  colsToMove.forEach(item => { data.delete(item.oldKey); data.set(item.newKey, item.value); });
}

/**
 * Обработать действие контекстного меню ячейки
 */
export function handleContextMenuAction(
  action: string,
  context: {
    cellRef: { row: number; col: number };
    data: Map<string, any>;
    getCellKey: (row: number, col: number) => string;
    getCellElement: (row: number, col: number) => HTMLElement | null;
    removeFormula: (key: string) => void;
    navigator?: {
      clipboard: {
        writeText: (text: string) => Promise<void>;
        readText: () => Promise<string>;
      };
    };
    saveToClipboardHistory?: (text: string) => void;
    deleteSelectedCells?: () => void;
    showFindInSelectionModal?: () => void;
    showFilterByValueModal?: (col: number) => void;
    showPromptModal?: (message: string, callback: (value: string) => void, defaultValue?: string) => void;
  }
): void {
  const { cellRef, data } = context;
  const row = cellRef.row;
  const col = cellRef.col;

  switch (action) {
    case 'cut':
    case 'copy':
      {
        const cell = context.getCellElement(row, col);
        const value = cell?.textContent || '';
        
        if (context.navigator?.clipboard) {
          context.navigator.clipboard.writeText(value);
        }

        // Сохранить в историю буфера обмена
        if (context.saveToClipboardHistory) {
          context.saveToClipboardHistory(value);
        }

        if (action === 'cut') {
          const key = context.getCellKey(row, col);
          if (cell) {
            cell.textContent = '';
          }
          data.delete(key);
        }
      }
      break;

    case 'paste':
      if (context.navigator?.clipboard) {
        context.navigator.clipboard.readText().then(text => {
          const cell = context.getCellElement(row, col);
          if (cell) {
            cell.textContent = text;
            const key = context.getCellKey(row, col);
            data.set(key, { value: text });
          }
        });
      }
      break;

    case 'delete-selected':
      if (context.deleteSelectedCells) {
        context.deleteSelectedCells();
      }
      break;

    case 'clear':
      {
        const cell = context.getCellElement(row, col);
        if (cell) {
          cell.textContent = '';
          const key = context.getCellKey(row, col);
          data.delete(key);
        }
      }
      break;

    case 'find-in-selection':
      if (context.showFindInSelectionModal) {
        context.showFindInSelectionModal();
      }
      break;

    case 'filter-by-value':
      if (context.showFilterByValueModal) {
        context.showFilterByValueModal(col);
      }
      break;

    case 'bg-color':
      if (context.showPromptModal) {
        context.showPromptModal('Введите цвет фона (hex, например #FFEBEE):', (color) => {
          if (!color) return;
          const cell = context.getCellElement(row, col);
          if (cell) {
            cell.style.backgroundColor = color;
          }
        }, '#FFEBEE');
      }
      break;

    case 'insert-row-above':
      insertRowAboveAt(row, data);
      break;

    case 'insert-row-below':
      insertRowBelowAt(row, data);
      break;

    case 'delete-row':
      deleteRowAt(row, data);
      break;

    case 'insert-col-left':
      insertColumnLeftAt(col, data);
      break;

    case 'insert-col-right':
      insertColumnRightAt(col, data);
      break;

    case 'delete-col':
      deleteColumnAt(col, data);
      break;
  }
}

/**
 * Обработать действие контекстного меню листов
 */
export function handleSheetContextMenuAction(
  action: string,
  context: {
    sheetId: number | null;
    sheets: Array<{ id: number; name: string }>;
    sheetsData: Map<number, Map<string, any>>;
    currentSheet: number;
    switchSheet: (sheetId: number) => void;
    renderSheets: () => void;
    showPromptModal?: (message: string, callback: (value: string) => void, defaultValue?: string) => void;
    confirm?: (message: string) => boolean;
    alert?: (message: string) => void;
  }
): void {
  const { sheetId, sheets, sheetsData } = context;
  if (!sheetId) return;

  switch (action) {
    case 'rename-sheet':
      {
        const sheet = sheets.find(s => s.id === sheetId);
        if (!sheet) return;
        
        if (context.showPromptModal) {
          context.showPromptModal('Введите новое название листа:', (newName) => {
            if (!newName || !newName.trim()) return;
            sheet.name = newName.trim();
            context.renderSheets();
          }, sheet.name);
        }
      }
      break;

    case 'duplicate-sheet':
      {
        const sheet = sheets.find(s => s.id === sheetId);
        if (!sheet) return;
        
        const newId = sheets.length + 1;
        const newName = `${sheet.name} (копия)`;
        const newSheet = { id: newId, name: newName };
        sheets.push(newSheet);
        
        // Копировать данные
        const sourceData = sheetsData.get(sheetId);
        if (sourceData) {
          const newData = new Map(sourceData);
          sheetsData.set(newId, newData);
        } else {
          sheetsData.set(newId, new Map());
        }
        context.switchSheet(newId);
      }
      break;

    case 'move-sheet-left':
      {
        const index = sheets.findIndex(s => s.id === sheetId);
        if (index <= 0) return; // Уже первый
        const sheet = sheets[index];
        sheets.splice(index, 1);
        sheets.splice(index - 1, 0, sheet);
        context.renderSheets();
      }
      break;

    case 'move-sheet-right':
      {
        const index = sheets.findIndex(s => s.id === sheetId);
        if (index < 0 || index >= sheets.length - 1) return; // Уже последний
        const sheet = sheets[index];
        sheets.splice(index, 1);
        sheets.splice(index + 1, 0, sheet);
        context.renderSheets();
      }
      break;

    case 'delete-sheet':
      {
        if (sheets.length <= 1) {
          if (context.alert) {
            context.alert('Нельзя удалить последний лист');
          }
          return;
        }
        
        if (context.confirm && !context.confirm('Вы уверены, что хотите удалить этот лист?')) {
          return;
        }

        const index = sheets.findIndex(s => s.id === sheetId);
        if (index < 0) return;

        sheets.splice(index, 1);
        sheetsData.delete(sheetId);

        // Переключиться на соседний лист
        if (context.currentSheet === sheetId) {
          const newSheetId = sheets[Math.max(0, index - 1)].id;
          context.switchSheet(newSheetId);
        } else {
          context.renderSheets();
        }
      }
      break;
  }
}
