/**
 * Scroll Module - Прокрутка и виртуализация
 */

export interface ScrollState {
  scrollLeft: number;
  scrollTop: number;
}

export interface VirtualScrollOptions {
  cellWidth: number;
  cellHeight: number;
  totalRows: number;
  totalCols: number;
  overscan?: number;
}

/**
 * Получить видимый диапазон при скролле
 */
export function getScrollVisibleRange(
  scrollLeft: number,
  scrollTop: number,
  containerWidth: number,
  containerHeight: number,
  options: VirtualScrollOptions
): {
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
} {
  const { cellWidth, cellHeight, totalRows, totalCols, overscan = 5 } = options;

  const colStart = Math.max(0, Math.floor(scrollLeft / cellWidth) - overscan);
  const colEnd = Math.min(
    totalCols,
    Math.ceil((scrollLeft + containerWidth) / cellWidth) + overscan
  );
  const rowStart = Math.max(0, Math.floor(scrollTop / cellHeight) - overscan);
  const rowEnd = Math.min(
    totalRows,
    Math.ceil((scrollTop + containerHeight) / cellHeight) + overscan
  );

  return { rowStart, rowEnd, colStart, colEnd };
}

/**
 * Синхронизировать скролл заголовков
 */
export function syncScrollHeaders(
  container: HTMLElement,
  columnHeaders: HTMLElement,
  rowHeaders: HTMLElement
): void {
  const { scrollLeft, scrollTop } = container;

  if (columnHeaders) {
    columnHeaders.scrollLeft = scrollLeft;
  }
  if (rowHeaders) {
    rowHeaders.scrollTop = scrollTop;
  }
}

/**
 * Обновить позицию фиксированных заголовков
 */
export function updateFixedHeaders(
  scrollLeft: number,
  scrollTop: number,
  fixedColumnHeaders: HTMLElement | null,
  fixedRowHeaders: HTMLElement | null
): void {
  if (fixedColumnHeaders) {
    fixedColumnHeaders.style.display = scrollLeft > 0 ? 'flex' : 'none';
  }
  if (fixedRowHeaders) {
    fixedRowHeaders.style.display = scrollTop > 0 ? 'flex' : 'none';
  }
}

/**
 * Оптимизировать скролл с requestAnimationFrame
 */
export function optimizeScroll(
  callback: () => void,
  frameIdRef: { current: number | null }
): void {
  if (frameIdRef.current !== null) {
    cancelAnimationFrame(frameIdRef.current);
  }
  frameIdRef.current = requestAnimationFrame(() => {
    callback();
    frameIdRef.current = null;
  });
}

/**
 * Получить текущее состояние скролла
 */
export function getScrollState(container: HTMLElement): ScrollState {
  return {
    scrollLeft: container.scrollLeft,
    scrollTop: container.scrollTop,
  };
}

/**
 * Установить позицию скролла
 */
export function setScrollPosition(
  container: HTMLElement,
  left: number,
  top: number
): void {
  container.scrollLeft = left;
  container.scrollTop = top;
}

/**
 * Прокрутить к ячейке
 */
export function scrollToCell(
  container: HTMLElement,
  row: number,
  col: number,
  cellWidth: number,
  cellHeight: number
): void {
  const targetLeft = col * cellWidth;
  const targetTop = row * cellHeight;

  container.scrollTo({
    left: targetLeft,
    top: targetTop,
    behavior: 'smooth',
  });
}
