/**
 * Formatting Module - Форматирование ячеек
 */

export interface CellFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  background?: string;
  align?: 'left' | 'center' | 'right';
  fontFamily?: string;
  fontSize?: string;
}

/**
 * Применить форматирование к выделенным ячейкам
 */
export function applyFormatting(
  cells: HTMLElement[],
  format: Partial<CellFormat>
): void {
  cells.forEach((cell) => {
    const style = cell.style;

    if (format.bold !== undefined) {
      style.fontWeight = format.bold ? 'bold' : 'normal';
    }
    if (format.italic !== undefined) {
      style.fontStyle = format.italic ? 'italic' : 'normal';
    }
    if (format.underline !== undefined) {
      style.textDecoration = format.underline
        ? 'underline'
        : style.textDecoration.replace('underline', '').trim() || 'none';
    }
    if (format.strike !== undefined) {
      style.textDecoration = format.strike
        ? 'line-through'
        : style.textDecoration.replace('line-through', '').trim() || 'none';
    }
    if (format.color) {
      style.color = format.color;
    }
    if (format.background) {
      style.backgroundColor = format.background;
    }
    if (format.align) {
      style.textAlign = format.align;
    }
    if (format.fontFamily) {
      style.fontFamily = format.fontFamily;
    }
    if (format.fontSize) {
      style.fontSize = format.fontSize;
    }
  });
}

/**
 * Переключить жирный шрифт
 */
export function toggleBold(cell: HTMLElement): boolean {
  const isBold = cell.style.fontWeight === 'bold';
  cell.style.fontWeight = isBold ? 'normal' : 'bold';
  return !isBold;
}

/**
 * Переключить курсив
 */
export function toggleItalic(cell: HTMLElement): boolean {
  const isItalic = cell.style.fontStyle === 'italic';
  cell.style.fontStyle = isItalic ? 'normal' : 'italic';
  return !isItalic;
}

/**
 * Переключить подчёркивание
 */
export function toggleUnderline(cell: HTMLElement): boolean {
  const hasUnderline = cell.style.textDecoration.includes('underline');
  if (hasUnderline) {
    cell.style.textDecoration = cell.style.textDecoration
      .replace('underline', '')
      .trim();
  } else {
    cell.style.textDecoration =
      (cell.style.textDecoration || '') + ' underline';
  }
  return !hasUnderline;
}

/**
 * Переключить зачёркивание
 */
export function toggleStrike(cell: HTMLElement): boolean {
  const hasStrike = cell.style.textDecoration.includes('line-through');
  if (hasStrike) {
    cell.style.textDecoration = cell.style.textDecoration
      .replace('line-through', '')
      .trim();
  } else {
    cell.style.textDecoration =
      (cell.style.textDecoration || '') + ' line-through';
  }
  return !hasStrike;
}

/**
 * Установить цвет текста
 */
export function setTextColor(cell: HTMLElement, color: string): void {
  cell.style.color = color;
}

/**
 * Установить цвет фона
 */
export function setFillColor(cell: HTMLElement, color: string): void {
  cell.style.backgroundColor = color;
}

/**
 * Установить выравнивание
 */
export function setTextAlign(
  cell: HTMLElement,
  align: 'left' | 'center' | 'right'
): void {
  cell.style.textAlign = align;
}

/**
 * Установить шрифт
 */
export function setFont(cell: HTMLElement, family: string, size?: string): void {
  cell.style.fontFamily = family;
  if (size) {
    cell.style.fontSize = size;
  }
}

/**
 * Получить текущее форматирование ячейки
 */
export function getCellFormat(cell: HTMLElement): CellFormat {
  const style = cell.style;
  return {
    bold: style.fontWeight === 'bold',
    italic: style.fontStyle === 'italic',
    underline: style.textDecoration.includes('underline'),
    strike: style.textDecoration.includes('line-through'),
    color: style.color,
    background: style.backgroundColor,
    align: (style.textAlign as CellFormat['align']) || 'left',
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
  };
}
