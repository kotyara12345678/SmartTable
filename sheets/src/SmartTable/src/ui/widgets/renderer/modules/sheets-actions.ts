/**
 * Sheets Actions Module - Действия с листами
 */

export interface SheetsActionsContext {
  state: any;
  elements: any;
  renderCells: () => void;
  renderSheets: () => void;
  updateFormulaBar: () => void;
  switchSheet: (sheetId: number) => void;
}

/**
 * Добавить лист
 */
export function addSheet(context: SheetsActionsContext): void {
  const id = context.state.sheets.length + 1;
  const name = `Лист ${id}`;
  context.state.sheets.push({ id, name });
  context.state.sheetsData.set(id, new Map());
  context.renderSheets();
  context.switchSheet(id);
}

/**
 * Рендерить листы
 */
export function renderSheets(context: SheetsActionsContext): void {
  console.log('[Renderer] renderSheets called, sheets:', context.state.sheets.length);
  context.elements.sheetsList.innerHTML = '';
  context.state.sheets.forEach((sheet: any) => {
    const tab = document.createElement('button');
    tab.className = `sheet-tab${sheet.id === context.state.currentSheet ? ' active' : ''}`;
    tab.dataset.sheet = sheet.id.toString();
    tab.innerHTML = `<span>${sheet.name}</span>`;
    tab.addEventListener('click', () => context.switchSheet(sheet.id));
    context.elements.sheetsList.appendChild(tab);
  });
  console.log('[Renderer] Sheets rendered:', context.elements.sheetsList.children.length);
}

/**
 * Переключить лист
 */
export function switchSheet(sheetId: number, context: SheetsActionsContext): void {
  context.state.currentSheet = sheetId;

  context.renderCells();
  context.renderSheets();

  context.updateFormulaBar();
}
