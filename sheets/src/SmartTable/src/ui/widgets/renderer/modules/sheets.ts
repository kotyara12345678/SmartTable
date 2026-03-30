/**
 * Sheets Module - Управление листами
 */

export interface SheetData {
  id: number;
  name: string;
}

export interface SheetsContext {
  state: any;
  switchSheet: (sheetId: number) => void;
  renderSheets: () => void;
  renderCells: () => void;
  clearAllState: () => void;
  autoSave: () => void;
}

/**
 * Добавить новый лист
 */
export function addSheet(context: SheetsContext): void {
  const newId = context.state.sheets.length + 1;
  const newName = `Лист ${newId}`;
  context.state.sheets.push({ id: newId, name: newName });
  context.state.sheetsData.set(newId, new Map());
  context.switchSheet(newId);
}

/**
 * Переключиться на лист
 */
export function switchSheet(sheetId: number, context: SheetsContext): void {
  if (context.state.sheetsData.has(sheetId)) {
    context.state.currentSheet = sheetId;
    context.renderCells();
    context.renderSheets();
    context.autoSave();
  }
}

/**
 * Рендерить листы
 */
export function renderSheets(context: SheetsContext): void {
  const { elements, state } = context as any;
  if (!elements.sheetsList) return;

  elements.sheetsList.innerHTML = '';
  
  state.sheets.forEach((sheet: any) => {
    const tab = document.createElement('div');
    tab.className = `sheet-tab${sheet.id === state.currentSheet ? ' active' : ''}`;
    tab.dataset.sheet = sheet.id.toString();
    tab.textContent = sheet.name;
    elements.sheetsList.appendChild(tab);
  });
}

/**
 * Удалить лист
 */
export function deleteSheet(sheetId: number, context: SheetsContext): void {
  if (context.state.sheets.length <= 1) {
    alert('Нельзя удалить последний лист');
    return;
  }

  const index = context.state.sheets.findIndex((s: SheetData) => s.id === sheetId);
  if (index < 0) return;

  context.state.sheets.splice(index, 1);
  context.state.sheetsData.delete(sheetId);

  if (context.state.currentSheet === sheetId) {
    const newSheetId = context.state.sheets[Math.max(0, index - 1)].id;
    context.switchSheet(newSheetId);
  } else {
    context.renderSheets();
  }
}

/**
 * Переименовать лист
 */
export function renameSheet(sheetId: number, newName: string, context: SheetsContext): void {
  const sheet = context.state.sheets.find((s: SheetData) => s.id === sheetId);
  if (sheet) {
    sheet.name = newName;
    context.renderSheets();
  }
}

/**
 * Дублировать лист
 */
export function duplicateSheet(sheetId: number, context: SheetsContext): void {
  const sheet = context.state.sheets.find((s: SheetData) => s.id === sheetId);
  if (!sheet) return;

  const newId = context.state.sheets.length + 1;
  const newName = `${sheet.name} (копия)`;
  const newSheet = { id: newId, name: newName };
  context.state.sheets.push(newSheet);

  const sourceData = context.state.sheetsData.get(sheetId);
  if (sourceData) {
    const newData = new Map(sourceData);
    context.state.sheetsData.set(newId, newData);
  } else {
    context.state.sheetsData.set(newId, new Map());
  }
  context.switchSheet(newId);
}

/**
 * Переместить лист влево
 */
export function moveSheetLeft(sheetId: number, context: SheetsContext): void {
  const index = context.state.sheets.findIndex((s: SheetData) => s.id === sheetId);
  if (index <= 0) return;
  
  const sheet = context.state.sheets[index];
  context.state.sheets.splice(index, 1);
  context.state.sheets.splice(index - 1, 0, sheet);
  context.renderSheets();
}

/**
 * Переместить лист вправо
 */
export function moveSheetRight(sheetId: number, context: SheetsContext): void {
  const index = context.state.sheets.findIndex((s: SheetData) => s.id === sheetId);
  if (index < 0 || index >= context.state.sheets.length - 1) return;
  
  const sheet = context.state.sheets[index];
  context.state.sheets.splice(index, 1);
  context.state.sheets.splice(index + 1, 0, sheet);
  context.renderSheets();
}
