/**
 * Column & Row Module - Управление колонками и строками
 */

import { colToLetter } from './utils';

export interface ColumnConfig {
  width: number;
  minWidth?: number;
  maxWidth?: number;
}

export interface RowConfig {
  height: number;
  minHeight?: number;
  maxHeight?: number;
}

export interface RenderHeadersConfig {
  totalCols: number;
  totalRows: number;
  cellWidth: number;
  cellHeight: number;
}

/**
 * Обновить ширину колонки
 */
export function updateColumnWidth(
  col: number,
  width: number,
  columnHeaders: HTMLElement,
  cellGrid: HTMLElement,
  minwidth = 30
): void {
  const newWidth = Math.max(minwidth, width);

  // Обновляем заголовок
  const header = columnHeaders.querySelector(
    `.column-header[data-col="${col}"]`
  ) as HTMLElement;
  if (header) {
    header.style.width = `${newWidth}px`;
    header.style.minWidth = `${newWidth}px`;
    header.style.maxWidth = `${newWidth}px`;
  }

  // Обновляем ячейки
  const cells = cellGrid.querySelectorAll(`.cell[data-col="${col}"]`);
  cells.forEach((cell) => {
    (cell as HTMLElement).style.width = `${newWidth}px`;
    (cell as HTMLElement).style.minWidth = `${newWidth}px`;
    (cell as HTMLElement).style.maxWidth = `${newWidth}px`;
  });
}

/**
 * Обновить высоту строки
 */
export function updateRowHeight(
  row: number,
  height: number,
  rowHeaders: HTMLElement,
  cellGrid: HTMLElement,
  minHeight = 24
): void {
  const newHeight = Math.max(minHeight, height);

  // Обновляем заголовок
  const header = rowHeaders.querySelector(
    `.row-header[data-row="${row}"]`
  ) as HTMLElement;
  if (header) {
    header.style.height = `${newHeight}px`;
    header.style.minHeight = `${newHeight}px`;
    header.style.maxHeight = `${newHeight}px`;
  }

  // Обновляем ячейки
  const cells = cellGrid.querySelectorAll(`.cell[data-row="${row}"]`);
  cells.forEach((cell) => {
    (cell as HTMLElement).style.height = `${newHeight}px`;
    (cell as HTMLElement).style.minHeight = `${newHeight}px`;
    (cell as HTMLElement).style.maxHeight = `${newHeight}px`;
  });
}

/**
 * Автоподбор ширины колонки
 */
export function autoFitColumn(
  col: number,
  cellGrid: HTMLElement,
  columnHeaders: HTMLElement,
  defaultWidth = 100,
  maxWidth = 500
): void {
  const cells = cellGrid.querySelectorAll(`.cell[data-col="${col}"]`);
  let maxWidthContent = defaultWidth;

  cells.forEach((cell) => {
    const textLength = (cell as HTMLElement).textContent?.length || 0;
    const estimatedWidth = textLength * 8 + 16; // Примерная ширина символа
    maxWidthContent = Math.max(maxWidthContent, estimatedWidth);
  });

  const finalWidth = Math.min(maxWidthContent, maxWidth);
  updateColumnWidth(col, finalWidth, columnHeaders, cellGrid);
}

/**
 * Вставить строку
 */
export function insertRow(
  rowIndex: number,
  totalCols: number,
  onInsert: (row: number) => void
): void {
  for (let c = 0; c < totalCols; c++) {
    onInsert(rowIndex);
  }
}

/**
 * Вставить колонку
 */
export function insertColumn(
  colIndex: number,
  totalRows: number,
  onInsert: (col: number) => void
): void {
  for (let r = 0; r < totalRows; r++) {
    onInsert(colIndex);
  }
}

/**
 * Удалить строку
 */
export function deleteRow(
  rowIndex: number,
  totalCols: number,
  onDelete: (row: number) => void
): void {
  for (let c = 0; c < totalCols; c++) {
    onDelete(rowIndex);
  }
}

/**
 * Удалить колонку
 */
export function deleteColumn(
  colIndex: number,
  totalRows: number,
  onDelete: (col: number) => void
): void {
  for (let r = 0; r < totalRows; r++) {
    onDelete(colIndex);
  }
}

/**
 * Рендеринг заголовков колонок
 */
export function renderColumnHeaders(
  container: HTMLElement,
  config: RenderHeadersConfig,
  onHeaderClick?: (col: number) => void
): void {
  container.innerHTML = '';
  
  for (let col = 0; col < config.totalCols; col++) {
    const header = document.createElement('div');
    header.className = 'column-header';
    header.textContent = colToLetter(col);
    header.dataset.col = col.toString();
    header.style.width = `${config.cellWidth}px`;
    
    if (onHeaderClick) {
      header.addEventListener('click', () => onHeaderClick(col));
    }
    
    container.appendChild(header);
  }
}

/**
 * Рендеринг заголовков строк
 */
export function renderRowHeaders(
  container: HTMLElement,
  config: RenderHeadersConfig,
  onHeaderClick?: (row: number) => void
): void {
  container.innerHTML = '';
  
  for (let row = 0; row < config.totalRows; row++) {
    const header = document.createElement('div');
    header.className = 'row-header';
    header.textContent = (row + 1).toString();
    header.dataset.row = row.toString();
    header.style.height = `${config.cellHeight}px`;
    
    if (onHeaderClick) {
      header.addEventListener('click', () => onHeaderClick(row));
    }
    
    container.appendChild(header);
  }
}

/**
 * Рендеринг фиксированных заголовков колонок
 */
export function renderFixedColumnHeaders(
  container: HTMLElement,
  config: RenderHeadersConfig,
  fixedCols?: number,
  onHeaderClick?: (col: number) => void
): void {
  container.innerHTML = '';
  
  const colsToRender = fixedCols || Math.min(5, config.totalCols);
  
  for (let col = 0; col < colsToRender; col++) {
    const header = document.createElement('div');
    header.className = 'fixed-column-header';
    header.textContent = colToLetter(col);
    header.dataset.col = col.toString();
    header.style.width = `${config.cellWidth}px`;
    
    if (onHeaderClick) {
      header.addEventListener('click', () => onHeaderClick(col));
    }
    
    container.appendChild(header);
  }
}

/**
 * Рендеринг фиксированных заголовков строк
 */
export function renderFixedRowHeaders(
  container: HTMLElement,
  config: RenderHeadersConfig,
  fixedRows?: number,
  onHeaderClick?: (row: number) => void
): void {
  container.innerHTML = '';
  
  const rowsToRender = fixedRows || Math.min(5, config.totalRows);
  
  for (let row = 0; row < rowsToRender; row++) {
    const header = document.createElement('div');
    header.className = 'fixed-row-header';
    header.textContent = (row + 1).toString();
    header.dataset.row = row.toString();
    header.style.height = `${config.cellHeight}px`;
    
    if (onHeaderClick) {
      header.addEventListener('click', () => onHeaderClick(row));
    }
    
    container.appendChild(header);
  }
}

/**
 * Переместить данные строк при вставке/удалении
 */
export function moveRowData(
  data: Map<string, any>,
  fromRow: number,
  toRow: number,
  totalCols: number
): void {
  const rowsToMove: Array<{ oldKey: string; newKey: string; value: any }> = [];
  
  data.forEach((cellData, key) => {
    const [row, col] = key.split('-').map(Number);
    if (row >= fromRow) {
      const newKey = `${row + toRow}-${col}`;
      rowsToMove.push({ oldKey: key, newKey, value: cellData });
    }
  });
  
  rowsToMove.forEach(item => {
    data.delete(item.oldKey);
    data.set(item.newKey, item.value);
  });
}

/**
 * Переместить данные колонок при вставке/удалении
 */
export function moveColumnData(
  data: Map<string, any>,
  fromCol: number,
  toCol: number,
  totalRows: number
): void {
  const colsToMove: Array<{ oldKey: string; newKey: string; value: any }> = [];
  
  data.forEach((cellData, key) => {
    const [row, col] = key.split('-').map(Number);
    if (col >= fromCol) {
      const newKey = `${row}-${col + toCol}`;
      colsToMove.push({ oldKey: key, newKey, value: cellData });
    }
  });
  
  colsToMove.forEach(item => {
    data.delete(item.oldKey);
    data.set(item.newKey, item.value);
  });
}

/**
 * Удалить данные строки
 */
export function deleteRowData(
  data: Map<string, any>,
  rowIndex: number,
  totalCols: number
): void {
  const keysToDelete: string[] = [];
  
  data.forEach((_, key) => {
    const [row] = key.split('-').map(Number);
    if (row === rowIndex) keysToDelete.push(key);
  });
  
  keysToDelete.forEach(key => data.delete(key));
}

/**
 * Удалить данные колонки
 */
export function deleteColumnData(
  data: Map<string, any>,
  colIndex: number,
  totalRows: number
): void {
  const keysToDelete: string[] = [];

  data.forEach((_, key) => {
    const [row, col] = key.split('-').map(Number);
    if (col === colIndex) keysToDelete.push(key);
  });

  keysToDelete.forEach(key => data.delete(key));
}

/**
 * Настроить изменение размера колонок
 */
export function setupColumnResize(
  columnHeaders: HTMLElement,
  cellGrid: HTMLElement,
  CONFIG: { COLS: number; CELL_WIDTH: number },
  updateColumnWidthFn: (col: number, width: number) => void,
  renderVisibleCellsFn: () => void
): void {
  let isResizing = false;
  let currentCol = -1;
  let startX = 0;
  let startWidth = 0;
  let resizeHandle: HTMLElement | null = null;

  columnHeaders.addEventListener('mousedown', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('column-resize-handle')) {
      isResizing = true;
      currentCol = parseInt(target.dataset.col || '0');
      resizeHandle = target;
      startX = e.pageX;
      const header = columnHeaders.querySelector(`.column-header[data-col="${currentCol}"]`) as HTMLElement;
      startWidth = header?.offsetWidth || CONFIG.CELL_WIDTH;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      resizeHandle.classList.add('resizing');
      e.preventDefault();
      e.stopPropagation();
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing || currentCol === -1) return;
    e.preventDefault();
    e.stopPropagation();

    const diff = e.pageX - startX;
    const newWidth = Math.max(30, startWidth + diff);
    updateColumnWidthFn(currentCol, newWidth);
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      if (resizeHandle) resizeHandle.classList.remove('resizing');
      isResizing = false;
      currentCol = -1;
      resizeHandle = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });

  // Добавить resize handle к заголовкам столбцов
  const headers = columnHeaders.querySelectorAll('.column-header');
  headers.forEach(header => {
    const oldHandle = header.querySelector('.column-resize-handle');
    if (oldHandle) oldHandle.remove();

    const handle = document.createElement('div');
    handle.className = 'column-resize-handle';
    handle.dataset.col = (header as HTMLElement).dataset.col;
    header.appendChild(handle);
  });
}

/**
 * Настроить изменение размера строк
 */
export function setupRowResize(
  rowHeaders: HTMLElement,
  cellGrid: HTMLElement,
  CONFIG: { ROWS: number; CELL_HEIGHT: number },
  updateRowHeightFn: (row: number, height: number) => void
): void {
  let isResizing = false;
  let currentRow = -1;
  let startY = 0;
  let startHeight = 0;

  rowHeaders.addEventListener('mousedown', (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('row-resize-handle')) {
      isResizing = true;
      currentRow = parseInt(target.dataset.row || '0');
      startY = e.pageY;
      const header = rowHeaders.querySelector(`.row-header[data-row="${currentRow}"]`) as HTMLElement;
      startHeight = header?.offsetHeight || CONFIG.CELL_HEIGHT;
      document.body.style.cursor = 'row-resize';
      e.preventDefault();
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing || currentRow === -1) return;

    const diff = e.pageY - startY;
    const newHeight = Math.max(20, startHeight + diff);

    const header = rowHeaders.querySelector(`.row-header[data-row="${currentRow}"]`) as HTMLElement;
    if (header) {
      header.style.height = `${newHeight}px`;
    }

    // Обновить все ячейки в этой строке
    const cells = cellGrid.querySelectorAll(`.cell[data-row="${currentRow}"]`);
    cells.forEach(cell => {
      (cell as HTMLElement).style.height = `${newHeight}px`;
    });
    updateRowHeightFn(currentRow, newHeight);
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      currentRow = -1;
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    }
  });

  // Добавить resize handle к заголовкам строк
  const headers = rowHeaders.querySelectorAll('.row-header');
  headers.forEach(header => {
    const oldHandle = header.querySelector('.row-resize-handle');
    if (oldHandle) oldHandle.remove();

    const handle = document.createElement('div');
    handle.className = 'row-resize-handle';
    handle.dataset.row = (header as HTMLElement).dataset.row;
    header.appendChild(handle);
  });
}
