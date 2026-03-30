/**
 * Rendering Module - Рендеринг ячеек и заголовков
 */

export interface RenderingContext {
  elements: any;
  state: any;
  CONFIG: any;
  getCellKey: (row: number, col: number) => string;
  getCurrentData: () => Map<string, any>;
  getDataValidation: (row: number, col: number) => any;
  createAbsoluteCellElement: (row: number, col: number, data: any, config: any, validation?: any) => HTMLElement;
  calculateVisibleRangeWithBuffer: (scrollLeft: number, scrollTop: number, clientWidth: number, clientHeight: number, config: any) => any;
  setGridSize: (grid: HTMLElement, cols: number, rows: number, width: number, height: number) => void;
  getSelectedCellsFromDOM: (grid: HTMLElement) => Array<{ row: number; col: number }>;
  restoreSelection: (grid: HTMLElement, cells: Array<{ row: number; col: number }>) => void;
  cleanupCellCache: (cache: Map<string, any>, maxCells: number) => void;
  cellCache: Map<string, any>;
  MAX_CACHED_CELLS: number;
}

/**
 * Рендерить ячейки
 */
export function renderCells(context: RenderingContext): void {
  renderVisibleCells(context);
  context.cleanupCellCache(context.cellCache, context.MAX_CACHED_CELLS);
}

/**
 * Рендерить видимые ячейки
 */
export function renderVisibleCells(context: RenderingContext): void {
  const { elements, state, CONFIG, getCellKey, getCurrentData, getDataValidation } = context;
  
  const selectedCells = context.getSelectedCellsFromDOM(elements.cellGrid);
  const data = getCurrentData();
  const fragment = document.createDocumentFragment();

  const visibleRangeState = context.calculateVisibleRangeWithBuffer(
    elements.cellGridWrapper.scrollLeft,
    elements.cellGridWrapper.scrollTop,
    elements.cellGridWrapper.clientWidth,
    elements.cellGridWrapper.clientHeight,
    {
      cellWidth: CONFIG.CELL_WIDTH,
      cellHeight: CONFIG.CELL_HEIGHT,
      totalRows: CONFIG.ROWS,
      totalCols: CONFIG.COLS,
      overscan: 3
    }
  );

  context.setGridSize(
    elements.cellGrid,
    CONFIG.COLS,
    CONFIG.ROWS,
    CONFIG.CELL_WIDTH,
    CONFIG.CELL_HEIGHT
  );

  for (let row = visibleRangeState.rowStart; row < visibleRangeState.rowEnd; row++) {
    for (let col = visibleRangeState.colStart; col < visibleRangeState.colEnd; col++) {
      if (state.editingCell.row === row && state.editingCell.col === col) {
        continue;
      }

      const key = getCellKey(row, col);
      const cellData = data.get(key) || null;
      const validation = getDataValidation(row, col) || undefined;

      const cell = context.createAbsoluteCellElement(
        row,
        col,
        cellData,
        {
          cellWidth: CONFIG.CELL_WIDTH,
          cellHeight: CONFIG.CELL_HEIGHT,
          totalRows: CONFIG.ROWS,
          totalCols: CONFIG.COLS
        },
        validation
      );

      if (cellData?.style?.hyperlink) {
        cell.addEventListener('click', (e) => {
          e.stopPropagation();
          window.open(cellData.style.hyperlink, '_blank', 'noopener,noreferrer');
        });
      }

      if (cellData?.style?.backgroundImage) {
        cell.textContent = '';
      }

      fragment.appendChild(cell);
    }
  }

  elements.cellGrid.innerHTML = '';
  elements.cellGrid.appendChild(fragment);
  context.restoreSelection(elements.cellGrid, selectedCells);
}

/**
 * Рендерить заголовки колонок
 */
export function renderColumnHeaders(context: RenderingContext): void {
  const { elements, CONFIG } = context;
  const renderColumnHeadersUtil = (context as any).renderColumnHeadersUtil;
  if (renderColumnHeadersUtil) {
    renderColumnHeadersUtil(elements.columnHeaders, {
      totalCols: CONFIG.COLS,
      totalRows: CONFIG.ROWS,
      cellWidth: CONFIG.CELL_WIDTH,
      cellHeight: CONFIG.CELL_HEIGHT
    }, (col: number) => (context as any).selectColumn?.(col));
  }
}

/**
 * Рендерить заголовки строк
 */
export function renderRowHeaders(context: RenderingContext): void {
  const { elements, CONFIG } = context;
  const renderRowHeadersUtil = (context as any).renderRowHeadersUtil;
  if (renderRowHeadersUtil) {
    renderRowHeadersUtil(elements.rowHeaders, {
      totalCols: CONFIG.COLS,
      totalRows: CONFIG.ROWS,
      cellWidth: CONFIG.CELL_WIDTH,
      cellHeight: CONFIG.CELL_HEIGHT
    }, (row: number) => (context as any).selectRow?.(row));
  }
}

/**
 * Рендерить фиксированные заголовки колонок
 */
export function renderFixedColumnHeaders(context: RenderingContext): void {
  const { elements, CONFIG } = context;
  const renderFixedColumnHeadersUtil = (context as any).renderFixedColumnHeadersUtil;
  if (renderFixedColumnHeadersUtil) {
    renderFixedColumnHeadersUtil(
      document.getElementById('fixedColumnHeaders')!,
      {
        totalCols: CONFIG.COLS,
        totalRows: CONFIG.ROWS,
        cellWidth: CONFIG.CELL_WIDTH,
        cellHeight: CONFIG.CELL_HEIGHT
      },
      Math.min(5, CONFIG.COLS),
      (col: number) => (context as any).selectColumn?.(col)
    );
  }
}

/**
 * Рендерить фиксированные заголовки строк
 */
export function renderFixedRowHeaders(context: RenderingContext): void {
  const { elements, CONFIG } = context;
  const renderFixedRowHeadersUtil = (context as any).renderFixedRowHeadersUtil;
  if (renderFixedRowHeadersUtil) {
    renderFixedRowHeadersUtil(
      document.getElementById('fixedRowHeaders')!,
      {
        totalCols: CONFIG.COLS,
        totalRows: CONFIG.ROWS,
        cellWidth: CONFIG.CELL_WIDTH,
        cellHeight: CONFIG.CELL_HEIGHT
      },
      Math.min(5, CONFIG.ROWS),
      (row: number) => (context as any).selectRow?.(row)
    );
  }
}
