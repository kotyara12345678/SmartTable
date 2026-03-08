/**
 * Borders Module - Границы ячеек
 */

export interface BorderConfig {
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
  all?: boolean;
  none?: boolean;
}

const BORDER_STYLE = '1px solid #000';

/**
 * Применить границы к ячейкам
 */
export function applyBorders(cells: HTMLElement[], config: BorderConfig): void {
  cells.forEach((cell) => {
    if (config.all) {
      cell.style.border = BORDER_STYLE;
    } else if (config.none) {
      cell.style.border = 'none';
    } else {
      if (config.top) cell.style.borderTop = BORDER_STYLE;
      if (config.right) cell.style.borderRight = BORDER_STYLE;
      if (config.bottom) cell.style.borderBottom = BORDER_STYLE;
      if (config.left) cell.style.borderLeft = BORDER_STYLE;
    }
  });
}

/**
 * Переключить все границы
 */
export function toggleAllBorders(cells: HTMLElement[]): boolean {
  const hasBorders = cells.some(
    (cell) => cell.style.border && cell.style.border !== 'none'
  );

  cells.forEach((cell) => {
    cell.style.border = hasBorders ? 'none' : BORDER_STYLE;
  });

  return !hasBorders;
}

/**
 * Установить границу сверху
 */
export function setTopBorder(cells: HTMLElement[]): void {
  cells.forEach((cell) => {
    cell.style.borderTop = BORDER_STYLE;
  });
}

/**
 * Установить границу снизу
 */
export function setBottomBorder(cells: HTMLElement[]): void {
  cells.forEach((cell) => {
    cell.style.borderBottom = BORDER_STYLE;
  });
}

/**
 * Установить границу слева
 */
export function setLeftBorder(cells: HTMLElement[]): void {
  cells.forEach((cell) => {
    cell.style.borderLeft = BORDER_STYLE;
  });
}

/**
 * Установить границу справа
 */
export function setRightBorder(cells: HTMLElement[]): void {
  cells.forEach((cell) => {
    cell.style.borderRight = BORDER_STYLE;
  });
}

/**
 * Очистить все границы
 */
export function clearBorders(cells: HTMLElement[]): void {
  cells.forEach((cell) => {
    cell.style.border = 'none';
  });
}

/**
 * Получить состояние границ ячейки
 */
export function getBorderState(cell: HTMLElement): BorderConfig {
  const style = cell.style;
  return {
    top: !!style.borderTop && style.borderTop !== 'none',
    right: !!style.borderRight && style.borderRight !== 'none',
    bottom: !!style.borderBottom && style.borderBottom !== 'none',
    left: !!style.borderLeft && style.borderLeft !== 'none',
  };
}
