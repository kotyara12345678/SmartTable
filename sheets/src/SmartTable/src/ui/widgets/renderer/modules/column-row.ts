/**
 * Column & Row Module - Управление колонками и строками
 */

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
