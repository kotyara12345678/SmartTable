/**
 * Resize Module - Функции для изменения размера столбцов и строк
 */

/**
 * Настройка изменения размера столбцов
 */
export function setupColumnResize(
  elements: any,
  CONFIG: any,
  renderVisibleCells: () => void
): void {
  let isResizing = false;
  let currentCol = -1;
  let startX = 0;
  let startWidth = 0;
  let resizeHandle: HTMLElement | null = null;

  elements.columnHeaders.addEventListener('mousedown', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('column-resize-handle')) {
      isResizing = true;
      currentCol = parseInt(target.dataset.col || '0');
      resizeHandle = target;
      startX = e.pageX;
      const header = elements.columnHeaders.querySelector(`.column-header[data-col="${currentCol}"]`) as HTMLElement;
      startWidth = header?.offsetWidth || CONFIG.CELL_WIDTH;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      resizeHandle.classList.add('resizing');
      e.preventDefault();
      e.stopPropagation();
    }
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isResizing || currentCol === -1) return;
    e.preventDefault();
    e.stopPropagation();

    const diff = e.pageX - startX;
    const newWidth = Math.max(30, startWidth + diff);
    updateColumnWidth(currentCol, newWidth, elements, CONFIG, renderVisibleCells);
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
  const headers = elements.columnHeaders.querySelectorAll('.column-header');
  headers.forEach((header: HTMLElement) => {
    const oldHandle = header.querySelector('.column-resize-handle');
    if (oldHandle) oldHandle.remove();

    const handle = document.createElement('div');
    handle.className = 'column-resize-handle';
    handle.dataset.col = (header as HTMLElement).dataset.col;
    header.appendChild(handle);
  });
}

/**
 * Функция обновления ширины колонки
 */
export function updateColumnWidth(
  col: number,
  width: number,
  elements: any,
  CONFIG: any,
  renderVisibleCells: () => void
): void {
  // Обновляем заголовок
  const header = elements.columnHeaders.querySelector(`.column-header[data-col="${col}"]`) as HTMLElement;
  if (header) {
    header.style.width = `${width}px`;
    header.style.minWidth = `${width}px`;
    header.style.maxWidth = `${width}px`;
  }

  // Обновляем все ячейки в этом столбце
  const cells = elements.cellGrid.querySelectorAll(`.cell[data-col="${col}"]`);
  cells.forEach((cell: HTMLElement) => {
    cell.style.width = `${width}px`;
    cell.style.minWidth = `${width}px`;
    cell.style.maxWidth = `${width}px`;
  });
  
  // Обновляем grid-template-columns для правильного позиционирования
  // Оптимизация: не пересчитываем всю сетку, только изменённую колонку
  const columnWidths: string[] = [];
  for (let c = 0; c < CONFIG.COLS; c++) {
    if (c === col) {
      columnWidths.push(`${width}px`);
    } else {
      const colHeader = elements.columnHeaders.querySelector(`.column-header[data-col="${c}"]`) as HTMLElement;
      columnWidths.push(colHeader?.style.width || `${CONFIG.CELL_WIDTH}px`);
    }
  }
  elements.cellGrid.style.gridTemplateColumns = columnWidths.join(' ');
  
  // Синхронизируем скролл после изменения размера
  requestAnimationFrame(() => {
    renderVisibleCells();
  });
}

/**
 * Функция обновления высоты строки
 */
export function updateRowHeight(
  row: number,
  height: number,
  elements: any,
  CONFIG: any
): void {
  // Обновляем заголовок
  const header = elements.rowHeaders.querySelector(`.row-header[data-row="${row}"]`) as HTMLElement;
  if (header) {
    header.style.height = `${height}px`;
    header.style.minHeight = `${height}px`;
    header.style.maxHeight = `${height}px`;
  }

  // Обновляем все ячейки в этой строке
  const cells = elements.cellGrid.querySelectorAll(`.cell[data-row="${row}"]`);
  cells.forEach((cell: HTMLElement) => {
    cell.style.height = `${height}px`;
    cell.style.minHeight = `${height}px`;
    cell.style.maxHeight = `${height}px`;
  });
  
  // Обновляем grid-template-rows для правильного позиционирования
  const rowHeights: string[] = [];
  for (let r = 0; r < CONFIG.ROWS; r++) {
    const rowHeader = elements.rowHeaders.querySelector(`.row-header[data-row="${r}"]`) as HTMLElement;
    const rowHeight = rowHeader?.style.height || `${CONFIG.CELL_HEIGHT}px`;
    rowHeights.push(rowHeight);
  }
  elements.cellGrid.style.gridTemplateRows = rowHeights.join(' ');
}

/**
 * Настройка изменения размера строк
 */
export function setupRowResize(
  elements: any,
  CONFIG: any,
  updateRowHeightFn: (row: number, height: number) => void
): void {
  let isResizing = false;
  let currentRow = -1;
  let startY = 0;
  let startHeight = 0;

  elements.rowHeaders.addEventListener('mousedown', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('row-resize-handle')) {
      isResizing = true;
      currentRow = parseInt(target.dataset.row || '0');
      startY = e.pageY;
      const header = elements.rowHeaders.querySelector(`.row-header[data-row="${currentRow}"]`) as HTMLElement;
      startHeight = header?.offsetHeight || CONFIG.CELL_HEIGHT;
      document.body.style.cursor = 'row-resize';
      e.preventDefault();
    }
  });

  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isResizing || currentRow === -1) return;

    const diff = e.pageY - startY;
    const newHeight = Math.max(20, startHeight + diff);

    const header = elements.rowHeaders.querySelector(`.row-header[data-row="${currentRow}"]`) as HTMLElement;
    if (header) {
      header.style.height = `${newHeight}px`;
    }

    // Обновить все ячейки в этой строке
    const cells = elements.cellGrid.querySelectorAll(`.cell[data-row="${currentRow}"]`);
    cells.forEach((cell: HTMLElement) => {
      cell.style.height = `${newHeight}px`;
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
  const headers = elements.rowHeaders.querySelectorAll('.row-header');
  headers.forEach((header: HTMLElement) => {
    const oldHandle = header.querySelector('.row-resize-handle');
    if (oldHandle) oldHandle.remove();

    const handle = document.createElement('div');
    handle.className = 'row-resize-handle';
    handle.dataset.row = (header as HTMLElement).dataset.row;
    header.appendChild(handle);
  });
}
