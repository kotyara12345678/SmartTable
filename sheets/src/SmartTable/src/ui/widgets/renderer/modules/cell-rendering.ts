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
  style?: CellStyle;
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
    cellStyle.overflow = 'visible';
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
    cellStyle.color = '#1a0dab';
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
