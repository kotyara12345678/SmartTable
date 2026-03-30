/**
 * Toolbar Module - Функции панели инструментов
 */

export interface ToolbarContext {
  state: any;
  getCellElement: (row: number, col: number) => HTMLElement | null;
  getCurrentData: () => Map<string, any>;
  getCellKey: (row: number, col: number) => string;
  updateAIDataCache: () => void;
  autoSave: () => void;
  toggleBold: (cell: HTMLElement) => boolean;
  toggleItalic: (cell: HTMLElement) => boolean;
  toggleUnderline: (cell: HTMLElement) => boolean;
  toggleStrike: (cell: HTMLElement) => boolean;
  getCellFormat: (cell: HTMLElement) => any;
  applyBorders: (borders: any) => void;
  getBorderState: () => any;
}

/**
 * Переключить форматирование
 */
export function toggleFormatting(style: string, context: ToolbarContext): void {
  const { state, getCellElement, getCurrentData } = context;
  const cell = getCellElement(state.selectedCell.row, state.selectedCell.col);
  if (!cell) return;

  const format = context.getCellFormat(cell);
  let newValue = '';

  switch (style) {
    case 'bold':
      newValue = format.bold ? 'normal' : 'bold';
      cell.style.fontWeight = newValue;
      break;
    case 'italic':
      newValue = format.italic ? 'normal' : 'italic';
      cell.style.fontStyle = newValue;
      break;
    case 'underline':
      newValue = format.underline ? 'none' : 'underline';
      cell.style.textDecoration = newValue;
      break;
    case 'strike':
      newValue = format.strike ? 'none' : 'line-through';
      cell.style.textDecoration = newValue;
      break;
  }

  context.updateAIDataCache();
  context.autoSave();
}

/**
 * Переключить границы
 */
export function toggleBorders(context: ToolbarContext): void {
  const borders = context.getBorderState();
  context.applyBorders(borders);
  context.autoSave();
}

/**
 * Применить стиль
 */
export function applyStyle(property: string, value: string, context: ToolbarContext): void {
  const { state, getCellElement, getCurrentData, getCellKey } = context;
  const cell = getCellElement(state.selectedCell.row, state.selectedCell.col);
  if (!cell) return;

  (cell.style as any)[property] = value;

  const key = getCellKey(state.selectedCell.row, state.selectedCell.col);
  const data = getCurrentData();
  const cellData = data.get(key) || { value: cell.textContent };

  const newStyle = { ...cellData.style };
  (newStyle as any)[property] = value;
  data.set(key, { ...cellData, style: newStyle });

  context.updateAIDataCache();
  context.autoSave();
}
