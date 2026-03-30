/**
 * Cell Rendering Module - Отрисовка ячеек таблицы
 */

export interface RenderState {
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
}

export interface CellStyle {
  background?: string;
  color?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  textAlign?: string;
  verticalAlign?: string;
  borderTop?: string;
  borderRight?: string;
  borderBottom?: string;
  borderLeft?: string;
  backgroundImage?: string;
  wrapText?: boolean;
  merged?: boolean;
  colspan?: number;
  rowspan?: number;
  hyperlink?: string;
}

export interface CellData {
  value: string;
  formula?: string;
  style?: CellStyle;
}

/**
 * Кэш отрисованных ячеек
 */
export interface CellCacheEntry {
  element: HTMLElement;
  value: string;
  styleHash: string;
  lastUsed: number;
}

/**
 * Конфигурация для рендеринга
 */
export interface RenderConfig {
  cellWidth: number;
  cellHeight: number;
  totalRows: number;
  totalCols: number;
  overscan?: number;
}

/**
 * Получить видимый диапазон ячеек
 */
export function getVisibleRange(
  scrollLeft: number,
  scrollTop: number,
  viewportWidth: number,
  viewportHeight: number,
  cellWidth: number,
  cellHeight: number,
  totalCols: number,
  totalRows: number
): RenderState {
  const colStart = Math.floor(scrollLeft / cellWidth);
  const colEnd = Math.min(
    Math.ceil((scrollLeft + viewportWidth) / cellWidth),
    totalCols
  );
  const rowStart = Math.floor(scrollTop / cellHeight);
  const rowEnd = Math.min(
    Math.ceil((scrollTop + viewportHeight) / cellHeight),
    totalRows
  );

  return {
    rowStart: Math.max(0, rowStart),
    rowEnd: Math.max(0, rowEnd),
    colStart: Math.max(0, colStart),
    colEnd: Math.max(0, colEnd),
  };
}

/**
 * Рассчитать видимый диапазон с буфером (overscan)
 */
export function calculateVisibleRangeWithBuffer(
  scrollLeft: number,
  scrollTop: number,
  viewportWidth: number,
  viewportHeight: number,
  config: RenderConfig
): RenderState {
  const { cellWidth, cellHeight, totalRows, totalCols, overscan = 5 } = config;
  
  const colStart = Math.max(0, Math.floor(scrollLeft / cellWidth) - overscan);
  const colEnd = Math.min(
    totalCols,
    Math.ceil((scrollLeft + viewportWidth) / cellWidth) + overscan
  );
  const rowStart = Math.max(0, Math.floor(scrollTop / cellHeight) - overscan);
  const rowEnd = Math.min(
    totalRows,
    Math.ceil((scrollTop + viewportHeight) / cellHeight) + overscan
  );

  return { rowStart, rowEnd, colStart, colEnd };
}

/**
 * Создать HTML элемент ячейки
 */
export function createCellElement(
  row: number,
  col: number,
  data: CellData | null,
  validation?: { type: string; values?: string[] }
): HTMLDivElement {
  const cell = document.createElement('div');
  cell.className = 'cell';
  cell.dataset.row = row.toString();
  cell.dataset.col = col.toString();

  if (data) {
    cell.textContent = data.value;
    if (data.value) {
      cell.classList.add('has-content');
    }

    // Применяем стили
    if (data.style) {
      applyCellStyle(cell, data.style);
    }
  }

  // Добавляем dropdown индикатор если есть валидация
  if (validation && validation.type === 'list') {
    cell.dataset.hasDropdown = 'true';
  }

  return cell;
}

/**
 * Создать ячейку с абсолютным позиционированием
 */
export function createAbsoluteCellElement(
  row: number,
  col: number,
  data: CellData | null,
  config: RenderConfig,
  validation?: { type: string; values?: string[] }
): HTMLDivElement {
  const cell = createCellElement(row, col, data, validation);
  
  // Абсолютное позиционирование
  cell.style.position = 'absolute';
  cell.style.left = `${col * config.cellWidth}px`;
  cell.style.top = `${row * config.cellHeight}px`;
  cell.style.width = `${config.cellWidth}px`;
  cell.style.height = `${config.cellHeight}px`;
  cell.tabIndex = -1;
  
  return cell;
}

/**
 * Применить стили к ячейке
 */
export function applyCellStyle(cell: HTMLDivElement, style: CellStyle): void {
  const cellStyle = cell.style;

  if (style.background) cellStyle.backgroundColor = style.background;
  if (style.color) cellStyle.color = style.color;
  if (style.fontFamily) cellStyle.fontFamily = style.fontFamily;
  if (style.fontSize) cellStyle.fontSize = style.fontSize;
  if (style.fontWeight) cellStyle.fontWeight = style.fontWeight;
  if (style.fontStyle) cellStyle.fontStyle = style.fontStyle;
  if (style.textDecoration) cellStyle.textDecoration = style.textDecoration;
  if (style.textAlign) cellStyle.textAlign = style.textAlign;
  if (style.verticalAlign) cellStyle.verticalAlign = style.verticalAlign;

  // Границы
  if (style.borderTop) cellStyle.borderTop = style.borderTop;
  if (style.borderRight) cellStyle.borderRight = style.borderRight;
  if (style.borderBottom) cellStyle.borderBottom = style.borderBottom;
  if (style.borderLeft) cellStyle.borderLeft = style.borderLeft;

  // Фоновое изображение
  if (style.backgroundImage) {
    cellStyle.backgroundImage = `url(${style.backgroundImage})`;
    cellStyle.backgroundSize = 'cover';
    cellStyle.backgroundPosition = 'center';
  }

  // Перенос текста
  if (style.wrapText) {
    cellStyle.whiteSpace = 'normal';
    cellStyle.wordWrap = 'break-word';
    cellStyle.overflow = 'visible';
    cellStyle.lineHeight = '1.2';
  }

  // Объединённые ячейки
  if (style.merged) {
    if (style.colspan && style.colspan > 1) {
      cellStyle.gridColumn = `span ${style.colspan}`;
    }
    if (style.rowspan && style.rowspan > 1) {
      cellStyle.gridRow = `span ${style.rowspan}`;
    }
  }

  // Гиперссылка
  if (style.hyperlink) {
    cellStyle.color = '#0066cc';
    cellStyle.textDecoration = 'underline';
    cellStyle.cursor = 'pointer';
  }
}

/**
 * Обновить отображение ячейки
 */
export function updateCellDisplay(
  cell: HTMLDivElement,
  data: CellData | null
): void {
  if (!cell) return;

  if (data) {
    cell.textContent = data.value;
    if (data.value) {
      cell.classList.add('has-content');
    } else {
      cell.classList.remove('has-content');
    }

    if (data.style) {
      applyCellStyle(cell, data.style);
    }
  } else {
    cell.textContent = '';
    cell.classList.remove('has-content');
  }
}

/**
 * Получить стиль для экспорта
 */
export function exportCellStyle(style: CSSStyleDeclaration): CellStyle {
  return {
    background: style.backgroundColor || undefined,
    color: style.color || undefined,
    fontFamily: style.fontFamily || undefined,
    fontSize: style.fontSize || undefined,
    fontWeight: style.fontWeight || undefined,
    fontStyle: style.fontStyle || undefined,
    textAlign: style.textAlign || undefined,
    borderTop: style.borderTop || undefined,
    borderRight: style.borderRight || undefined,
    borderBottom: style.borderBottom || undefined,
    borderLeft: style.borderLeft || undefined,
  };
}

/**
 * Вычислить хэш стиля для кэширования
 */
export function hashStyle(style: any): string {
  if (!style) return '';
  return JSON.stringify(style).split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0).toString(36);
}

/**
 * Очистить старые ячейки из кэша
 */
export function cleanupCellCache(
  cellCache: Map<string, CellCacheEntry>,
  maxCachedCells: number = 5000
): void {
  if (cellCache.size <= maxCachedCells) return;
  
  const now = Date.now();
  const toDelete: string[] = [];

  cellCache.forEach((cached, key) => {
    // Удаляем если не использовались больше 30 секунд
    if (now - cached.lastUsed > 30000) {
      toDelete.push(key);
    }
  });

  // Удаляем половину самых старых
  toDelete.sort((a, b) => {
    const aTime = cellCache.get(a)!.lastUsed;
    const bTime = cellCache.get(b)!.lastUsed;
    return aTime - bTime;
  });

  const deleteCount = Math.floor(toDelete.length / 2);
  for (let i = 0; i < deleteCount; i++) {
    cellCache.delete(toDelete[i]);
  }
}

/**
 * Установить размеры сетки для правильного скролла
 */
export function setGridSize(
  gridElement: HTMLElement,
  totalCols: number,
  totalRows: number,
  cellWidth: number,
  cellHeight: number
): void {
  gridElement.style.width = `${totalCols * cellWidth}px`;
  gridElement.style.height = `${totalRows * cellHeight}px`;
  gridElement.style.position = 'relative';
  gridElement.style.display = 'block';
}

/**
 * Восстановить выделение после перерисовки
 */
export function restoreSelection(
  gridElement: HTMLElement,
  selectedCells: Array<{ row: number; col: number }>
): void {
  selectedCells.forEach(({ row, col }) => {
    const cell = gridElement.querySelector(
      `.cell[data-row="${row}"][data-col="${col}"]`
    ) as HTMLElement;
    if (cell) {
      cell.classList.add('selected');
    }
  });
}

/**
 * Получить выделенные ячейки из DOM
 */
export function getSelectedCellsFromDOM(gridElement: HTMLElement): Array<{ row: number; col: number }> {
  return Array.from(gridElement.querySelectorAll('.cell.selected'))
    .map(cell => {
      const el = cell as HTMLElement;
      return {
        row: parseInt(el.dataset.row || '0'),
        col: parseInt(el.dataset.col || '0')
      };
    });
}
