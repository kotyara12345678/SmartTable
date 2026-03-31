import {RunServer} from "../core/server/app/server";

import { calculateCellFormula as calcFormula, previewFormula, validateFormula, saveActiveCell, showFormulaSuggestions, hideFormulaSuggestions, handleFormulaSuggestionsKeydown, insertFormula } from './formulabar/formulas-renderer.js';
import { registerFormula as registerFormulaDep, removeFormula as removeFormulaDep, getDependentCells as getDependentCellsDep } from '../core/formulas/formula-dependencies.js';
import FocusManager from '../core/focus/FocusManager.js';
import KeyboardController from '../core/keyboard-controller.js';

import {
  // Utils
  colToLetter as colToLetterMod,
  letterToCol as letterToColMod,
  getCellId as getCellIdMod,
  getCellKey as getCellKeyMod,
  hashStyle as hashStyleUtil,

  // Cell Rendering
  createCellElement,
  createAbsoluteCellElement,
  applyCellStyle as applyCellStyleMod,
  cleanupCellCache as cleanupCellCacheUtil,
  setGridSize,
  restoreSelection,
  getSelectedCellsFromDOM,
  calculateVisibleRangeWithBuffer,

  // Selection
  selectCell as selectCellImpl,

  // Editing
  editCell as editCellImpl,
  finishEditing as finishEditingImpl,
  resetEditing as resetEditingImpl,

  // Scroll
  syncScrollHeaders,
  updateFixedHeaders,

  // Formatting - Import from both modules
  applyColorToSelection as applyColorToSelectionFormatter,
  applyTextAlign as applyTextAlignFormatter,

  // Borders
  applyBorders,
  toggleAllBorders,
  clearBorders,
  getBorderState,

  // Column/Row
  updateColumnWidth as updateColumnWidthMod,
  updateRowHeight as updateRowHeightMod,
  autoFitColumn as autoFitColumnUtil,
  renderColumnHeadersColumns,
  renderRowHeadersColumns,
  renderFixedColumnHeadersColumns,
  renderFixedRowHeadersColumns,

  // Data Validation
  setDataValidation as setDataValidationUtil,
  getDataValidation as getDataValidationUtil,
  removeDataValidation as removeDataValidationUtil,
  clearAllDataValidations as clearAllDataValidationsUtil,
  hasDropdown,
  validateValue,

  // Undo/Redo
  pushUndo as pushUndoAction,
  undo as undoAction,
  redo as redoAction,

  // Formulas
  getHexColorByName as getHexColorByNameMod,
  applyCellColor as applyCellColorUtil,
  recalculateDependentCells as recalculateDependentCellsMod,
  applyColorFromFormula as applyColorFromFormulaMod,

  // Context Menu
  showContextMenu,
  hideContextMenu,
  handleContextMenuClick,
  createClickOutsideHandler,
  calculateMenuPosition,

  // AutoSave
  saveToLocalStorage,
  loadFromLocalStorage,
  clearAutoSaveData,

  // State
  getCurrentData as getCurrentDataFromModule,
  updateAIDataCache as updateAIDataCacheFromModule,
  clearAllData as clearAllDataFromModule,

  // AI
  normalizeColor as normalizeColorMod,
  animateCellChange as animateCellChangeMod,
  escapeXml as escapeXmlMod,
  processMarkdown as processMarkdownMod,
  highlightCode as highlightCodeMod,
  sleep as sleepMod,
  executeSingleCommand as executeSingleCommandMod,

  // UI Helpers
  updateCellReference as updateCellReferenceMod,
  updateFormulaBar as updateFormulaBarMod,
  initElements as initElementsMod,
  getGlobalCellInput as getGlobalCellInputMod,

  // Rendering
  renderCells as renderCellsMod,
  renderVisibleCells as renderVisibleCellsMod,

  // Toolbar
  toggleFormatting as toggleFormattingMod,
  toggleBorders as toggleBordersMod,
  applyStyle as applyStyleMod,

  // Image
  makeDraggableByHeader as makeDraggableByHeaderMod,
  makeDraggable as makeDraggableMod,
  addResizeHandles as addResizeHandlesMod,

  // Events
  setupEventListeners as setupEventListenersMod, setupScrollHandler as setupScrollHandlerMod,
  setupRangeSelection as setupRangeSelectionMod,
  setupCellEventListeners as setupCellEventListenersMod,
  setupContextMenu as setupContextMenuMod,
  setupSheetContextMenu as setupSheetContextMenuMod,

  // Keyboard
  setupKeyboardController as setupKeyboardControllerMod,
  handleGlobalInputKeyDown as handleGlobalInputKeyDownMod,
  handleGlobalInputChange as handleGlobalInputChangeMod,

  // Search & Filter
  performSearch as performSearchMod,
  clearSearchHighlight as clearSearchHighlightMod,
  applyFilters as applyFiltersMod,
  sortByColumn as sortByColumnMod,
  getCellValueForSort as getCellValueForSortMod,

  // Actions
  deleteSelectedCells as deleteSelectedCellsMod,
  saveToClipboardHistory as saveToClipboardHistoryMod,
  insertRowAboveAt as insertRowAboveAtMod,
  insertRowBelowAt as insertRowBelowAtMod,
  deleteRowAt as deleteRowAtMod,
  insertColumnLeftAt as insertColumnLeftAtMod,
  insertColumnRightAt as insertColumnRightAtMod,
  deleteColumnAt as deleteColumnAtMod,

  // Modals
  showPromptModal as showPromptModalMod,
  showFindInSelectionModal as showFindInSelectionModalMod,
  showFilterByValueModal as showFilterByValueModalMod,
  showExportMenu as showExportMenuMod,

  // Export
  exportData as exportDataMod,

  // Image
  insertImage as insertImageMod,
  insertImageInCell as insertImageInCellMod,

  // Init
  init as initMod

} from './renderer/modules/index.js';

// === WRAPPER ФУНКЦИИ ДЛЯ МОДУЛЕЙ ===
const colToLetter = colToLetterMod;
const letterToCol = letterToColMod;
const getCellId = getCellIdMod;
const getCellKey = getCellKeyMod;
const getHexColorByName = getHexColorByNameMod;

// State
const state = {
  selectedCell: { row: 0, col: 0 },
  editingCell: { row: -1, col: -1 },
  sheetsData: new Map(),
  sheets: [{ id: 1, name: 'Лист 1' }],
  currentSheet: 1,
  isEditing: false,
  selectionStart: null as { row: number, col: number } | null,
  selectionEnd: null as { row: number, col: number } | null,
  isSelecting: false,
  contextMenuCell: null as { row: number, col: number } | null,
  contextMenuSheet: null as number | null,
  aiDataCache: [] as Array<{ row: number; col: number; value: string }>,
  undoStack: [] as Array<{ key: string; oldValue: any; newValue: any }>,
  redoStack: [] as Array<{ key: string; oldValue: any; newValue: any }>,
  dataValidations: new Map<string, { type: string; values: string[] }>(),
  conditionalFormats: [] as Array<{ range: string; rule: string; style: any }>,
  cellFormulas: new Map<string, string>(),
  activeFilters: new Map<number, { values: string[]; type: 'include' | 'exclude' }>(),
  activeSort: { column: null as number | null, direction: null as 'asc' | 'desc' | null },
  groupedColumns: new Set<number>(),
  searchResults: new Set<string>(),
  searchHighlight: false,
  clipboardHistory: [] as Array<{ text: string; timestamp: number; type: string }>,
};

state.activeSort.column = null;
state.activeSort.direction = null;
state.sheetsData.set(1, new Map());

const CONFIG = {
  ROWS: 100,
  COLS: 100,
  CELL_WIDTH: 100,
  CELL_HEIGHT: 32,
  HEADER_WIDTH: 50,
  HEADER_HEIGHT: 32,
};

let elements: any = null;
let ipcRenderer: any;
let keyboardController: KeyboardController;
let renderScheduled = false;
const cellCache = new Map();
const MAX_CACHED_CELLS = 5000;

// Инициализация элементов
function initRenderer(): void {
  if (elements) return; // Уже инициализировано
  elements = initElements();
  
  renderColumnHeaders();
  renderRowHeaders();
  renderFixedColumnHeaders();
  renderFixedRowHeaders();
  renderCells();
  autoLoad();
  setupEventListeners();
  setupKeyboardController();
  updateCellReference();
  updateModeUI();
  console.log('[Renderer] Initialized!');
}

// Wrapper функции
function getCurrentData(): Map<string, any> {
  return getCurrentDataFromModule(state);
}

function updateAIDataCache(): void {
  updateAIDataCacheFromModule(state);
}

function clearAllData(): void {
  clearAllDataFromModule(state);
}

function pushUndo(key: string, oldValue: any): void {
  pushUndoAction(state, key, oldValue, autoSave);
}

function undo(): void {
  undoAction(state, renderCells, updateAIDataCache, updateFormulaBar, autoSave);
}

function redo(): void {
  redoAction(state, renderCells, updateAIDataCache, updateFormulaBar, autoSave);
}

function autoSave(): void {
  saveToLocalStorage(state);
}

function autoLoad(): void {
  if (loadFromLocalStorage) {
    const data = loadFromLocalStorage(state);
    if (data) {
      Object.assign(state.sheetsData.get(state.currentSheet) || new Map(), data);
    }
  }
  renderCells();
  updateAIDataCache();
}

function registerFormula(key: string, formula: string): void {
  registerFormulaDep(key, formula);
  state.cellFormulas.set(key, formula);
}

function removeFormula(key: string): void {
  removeFormulaDep(key);
  state.cellFormulas.delete(key);
}

function getDependentCells(key: string): string[] {
  return getDependentCellsDep(key);
}

function setDataValidation(cellRef: string, values: string[]): void {
  setDataValidationUtil(state, cellRef, values);
}

function getDataValidation(row: number, col: number): any {
  return getDataValidationUtil(state, row, col);
}

function removeDataValidation(cellRef: string): void {
  removeDataValidationUtil(state, cellRef);
}

function clearAllDataValidations(): void {
  clearAllDataValidationsUtil(state);
  renderCells();
}

function renderCellDropdown(cell: HTMLElement, row: number, col: number): void {
  const validation = getDataValidation(row, col);
  if (validation?.type === 'list') {
    cell.style.position = 'relative';
    const arrow = document.createElement('span');
    arrow.innerHTML = 'Ў';
    arrow.style.cssText = 'position:absolute;right:2px;top:50%;transform:translateY(-50%);font-size:10px;color:#666;pointer-events:none;';
    cell.appendChild(arrow);
  }
}

function showDropdownList(event: MouseEvent, cell: HTMLElement, row: number, col: number, values: string[]): void {
  event.stopPropagation();
  const existing = document.getElementById('cell-dropdown-list');
  if (existing) existing.remove();

  const dropdown = document.createElement('div');
  dropdown.id = 'cell-dropdown-list';
  dropdown.style.cssText = `position:fixed;z-index:10000;background:white;border:1px solid #ddd;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.15);max-height:200px;overflow-y:auto;min-width:150px;`;

  const rect = cell.getBoundingClientRect();
  dropdown.style.left = rect.left + 'px';
  dropdown.style.top = rect.bottom + 'px';

  values.forEach(value => {
    const item = document.createElement('div');
    item.textContent = value;
    item.style.cssText = 'padding:8px 12px;cursor:pointer;font-size:13px;';
    item.onmouseover = () => item.style.background = '#f0f0f0';
    item.onmouseout = () => item.style.background = 'white';
    item.onclick = () => {
      const key = getCellKey(row, col);
      const data = getCurrentData();
      data.set(key, { value });
      cell.textContent = value;
      updateAIDataCache();
      updateFormulaBar();
      dropdown.remove();
      autoSave();
    };
    dropdown.appendChild(item);
  });

  document.body.appendChild(dropdown);
  setTimeout(() => {
    document.addEventListener('click', function closeDropdown() {
      dropdown.remove();
      document.removeEventListener('click', closeDropdown);
    });
  }, 100);
}

function clearAllState(): void {
  localStorage.removeItem('smarttable-autosave');
  localStorage.removeItem('smarttable-data-validations');
  clearAllData();
  state.dataValidations.clear();
  state.currentSheet = 1;
  state.selectedCell = { row: 0, col: 0 };
  state.undoStack = [];
  state.redoStack = [];
  state.aiDataCache = [];
  renderCells();
  updateAIDataCache();
}

function cleanupEventListeners(): void {
  elements.cellGridWrapper?.replaceWith(elements.cellGridWrapper.cloneNode(true));
}

function cleanup(): void {
  cleanupEventListeners();
  clearAllState();
  if (ipcRenderer) {
    ipcRenderer.removeAllListeners('close-app');
    ipcRenderer.removeAllListeners('export');
  }
}

function clearChatHistory(): void {
  console.log('[AI] Chat history cleared');
}

function getGlobalCellInput(): HTMLInputElement {
  return getGlobalCellInputMod();
}

function initElements() {
  elements = initElementsMod();
  return elements;
}

function updateCellReference(): void {
  if (!elements.cellReference) return;
  updateCellReferenceMod({ elements, state, getCellId, getCellKey, getCurrentData });
}

function updateFormulaBar(): void {
  if (!elements.formulaInput) return;
  updateFormulaBarMod({ elements, state, getCellId, getCellKey, getCurrentData });
}

function renderCells(): void {
  renderCellsMod({
    elements, state, CONFIG, getCellKey, getCurrentData, getDataValidation,
    createAbsoluteCellElement, calculateVisibleRangeWithBuffer, setGridSize,
    getSelectedCellsFromDOM, restoreSelection, cleanupCellCache: cleanupCellCacheUtil,
    cellCache, MAX_CACHED_CELLS
  });
}

function renderVisibleCells(): void {
  renderVisibleCellsMod({
    elements, state, CONFIG, getCellKey, getCurrentData, getDataValidation,
    createAbsoluteCellElement, calculateVisibleRangeWithBuffer, setGridSize,
    getSelectedCellsFromDOM, restoreSelection, cleanupCellCache: cleanupCellCacheUtil,
    cellCache, MAX_CACHED_CELLS
  });
}

function renderColumnHeaders(): void {
  if (!renderColumnHeadersColumns || !elements.columnHeaders) return;
  renderColumnHeadersColumns(elements.columnHeaders, {
    totalCols: CONFIG.COLS,
    totalRows: CONFIG.ROWS,
    cellWidth: CONFIG.CELL_WIDTH,
    cellHeight: CONFIG.CELL_HEIGHT
  }, selectColumn);
}

function renderRowHeaders(): void {
  if (!renderRowHeadersColumns || !elements.rowHeaders) return;
  renderRowHeadersColumns(elements.rowHeaders, {
    totalCols: CONFIG.COLS,
    totalRows: CONFIG.ROWS,
    cellWidth: CONFIG.CELL_WIDTH,
    cellHeight: CONFIG.CELL_HEIGHT
  }, selectRow);
}

function renderFixedColumnHeaders(): void {
  const fixedHeaders = document.getElementById('fixedColumnHeaders');
  if (!renderFixedColumnHeadersColumns || !fixedHeaders) return;
  renderFixedColumnHeadersColumns(fixedHeaders, {
    totalCols: CONFIG.COLS,
    totalRows: CONFIG.ROWS,
    cellWidth: CONFIG.CELL_WIDTH,
    cellHeight: CONFIG.CELL_HEIGHT
  }, Math.min(5, CONFIG.COLS), selectColumn);
}

function renderFixedRowHeaders(): void {
  const fixedHeaders = document.getElementById('fixedRowHeaders');
  if (!renderFixedRowHeadersColumns || !fixedHeaders) return;
  renderFixedRowHeadersColumns(fixedHeaders, {
    totalCols: CONFIG.COLS,
    totalRows: CONFIG.ROWS,
    cellWidth: CONFIG.CELL_WIDTH,
    cellHeight: CONFIG.CELL_HEIGHT
  }, Math.min(5, CONFIG.ROWS), selectRow);
}

function syncFixedHeaders(): void {
  syncScrollHeaders(elements.cellGridWrapper, elements.columnHeaders, elements.rowHeaders);
  updateFixedHeaders(
    elements.cellGridWrapper.scrollLeft,
    elements.cellGridWrapper.scrollTop,
    document.getElementById('fixedColumnHeaders'),
    document.getElementById('fixedRowHeaders')
  );
}

function selectCell(row: number, col: number): void {
  selectCellImpl(row, col, {
    state, CONFIG, elements, getCellElement, getCellId,
    updateCellReference, updateFormulaBar, finishEditing,
    saveActiveCell, FocusManager
  });
}

function selectRow(row: number): void {
  for (let col = 0; col < CONFIG.COLS; col++) {
    selectCell(row, col);
  }
}

function selectColumn(col: number): void {
  for (let row = 0; row < CONFIG.ROWS; row++) {
    const cell = getCellElement(row, col);
    if (cell) cell.classList.add('selected');
  }
  state.selectedCell.col = col;
  updateCellReference();
}

function getCellElement(row: number, col: number): HTMLDivElement | null {
  return elements.cellGrid?.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`) as HTMLDivElement | null;
}

function editCell(row: number, col: number, selectAll: boolean = true): void {
  editCellImpl(row, col, selectAll, {
    state, elements, CONFIG, getCellKey, getCurrentData, getCellElement,
    previewFormula, letterToCol, removeFormula, registerFormula, pushUndo,
    updateAIDataCache, updateFormulaBar, recalculateDependentCells,
    updateSingleCell, autoSave, autoFitColumn
  });
}

function finishEditing(save: boolean = true): void {
  finishEditingImpl(save, {
    state, elements, CONFIG, getCellKey, getCurrentData, getCellElement,
    previewFormula, letterToCol, removeFormula, registerFormula, pushUndo,
    updateAIDataCache, updateFormulaBar, recalculateDependentCells,
    updateSingleCell, autoSave, autoFitColumn
  });
}

function resetEditing(): void {
  resetEditingImpl({
    state, elements, CONFIG, getCellKey, getCurrentData, getCellElement,
    previewFormula, letterToCol, removeFormula, registerFormula, pushUndo,
    updateAIDataCache, updateFormulaBar, recalculateDependentCells,
    updateSingleCell, autoSave, autoFitColumn
  });
}

function recalculateDependentCells(changedCellKey: string, data: Map<string, any>): void {
  // Recalculate dependent cells after value change
  const dependents = getDependentCells(changedCellKey);
  for (const depKey of dependents) {
    const depCellData = data.get(depKey);
    if (depCellData?.formula && depCellData.formula.startsWith('=')) {
      // Mark for recalculation
      updateAIDataCache();
    }
  }
}

function applyColorFromFormula(result: any, data: Map<string, any>): void {
  // Apply color formulas to cells
  if (result?.colorName) {
    const hexColor = getHexColorByName(result.colorName);
    if (hexColor) {
      updateAIDataCache();
    }
  }
}

function applyCellColorWrapper(row: number, col: number, hexColor: string, data: Map<string, any>): void {
  const cell = getCellElement(row, col);
  if (cell) {
    cell.style.backgroundColor = hexColor;
    updateAIDataCache();
  }
}

function updateSingleCell(row: number, col: number): void {
  const cell = getCellElement(row, col);
  if (!cell) return;
  
  const key = getCellKey(row, col);
  const data = getCurrentData();
  const cellData = data.get(key);
  
  if (cellData?.value !== undefined) {
    const displayValue = typeof cellData.value === 'string' 
      ? cellData.value 
      : String(cellData.value);
    cell.textContent = displayValue;
    updateFormulaBar();
  }
}

function applyColorToSelection(type: 'text' | 'fill', color: string): void {
  (window as any).applyColorToSelectionInternal(type, color);
}

function applyTextAlign(align: string): void {
  (window as any).applyTextAlignInternal(align);
}

function changeDecimalPlaces(delta: number): void {
  (window as any).changeDecimalPlacesInternal(delta);
}

function toggleFormatting(style: string): void {
  if (toggleFormattingMod) {
    toggleFormattingMod(style, {
      state, getCellElement, getCurrentData, getCellKey, updateAIDataCache, autoSave,
      toggleBold: (cell: HTMLElement) => true,
      toggleItalic: (cell: HTMLElement) => true,
      toggleUnderline: (cell: HTMLElement) => true,
      toggleStrike: (cell: HTMLElement) => true,
      getCellFormat: (cell: HTMLElement) => ({}),
      applyBorders: () => {},
      getBorderState: () => ({})
    });
  }
}

function toggleBorders(): void {
  if (toggleBordersMod) {
    toggleBordersMod({
      state, getCellElement, getCurrentData, getCellKey, updateAIDataCache, autoSave,
      toggleBold: (cell: HTMLElement) => true,
      toggleItalic: (cell: HTMLElement) => true,
      toggleUnderline: (cell: HTMLElement) => true,
      toggleStrike: (cell: HTMLElement) => true,
      getCellFormat: (cell: HTMLElement) => ({}),
      applyBorders: () => {},
      getBorderState: () => ({})
    });
  }
}

function applyStyle(property: string, value: string): void {
  if (applyStyleMod) {
    applyStyleMod(property, value, {
      state, getCellElement, getCurrentData, getCellKey, updateAIDataCache, autoSave,
      toggleBold: (cell: HTMLElement) => true,
      toggleItalic: (cell: HTMLElement) => true,
      toggleUnderline: (cell: HTMLElement) => true,
      toggleStrike: (cell: HTMLElement) => true,
      getCellFormat: (cell: HTMLElement) => ({}),
      applyBorders: () => {},
      getBorderState: () => ({})
    });
  }
}

function addSheet(): void {
  const id = state.sheets.length + 1;
  const name = `Лист ${id}`;
  state.sheets.push({ id, name });
  state.sheetsData.set(id, new Map());
  renderSheets();
  switchSheet(id);
}

function renderSheets(): void {
  elements.sheetsList.innerHTML = '';
  state.sheets.forEach(sheet => {
    const tab = document.createElement('button');
    tab.className = `sheet-tab${sheet.id === state.currentSheet ? ' active' : ''}`;
    tab.dataset.sheet = sheet.id.toString();
    tab.innerHTML = `<span>${sheet.name}</span>`;
    tab.addEventListener('click', () => switchSheet(sheet.id));
    elements.sheetsList.appendChild(tab);
  });
}

function switchSheet(sheetId: number): void {
  state.currentSheet = sheetId;
  renderCells();
  renderSheets();
  updateFormulaBar();
}

function showPromptModal(message: string, callback: (value: string | null) => void, defaultValue: string = ''): void {
  if (showPromptModalMod) {
    showPromptModalMod(message, callback, defaultValue);
  }
}

function showFindInSelectionModal(): void {
  if (showFindInSelectionModalMod) {
    showFindInSelectionModalMod();
  }
}

function showFilterByValueModal(columnIndex: number): void {
  if (showFilterByValueModalMod) {
    showFilterByValueModalMod(columnIndex, { state, getCellKey, getCurrentData, elements, getCellElement, renderCells });
  }
}

function showExportMenu(): void {
  if (showExportMenuMod) {
    showExportMenuMod();
  }
}

function exportData(format: 'csv' | 'xlsx' | 'json' | 'html'): void {
  if (exportDataMod) {
    // Handle export based on format
    console.log(`[Export] Exporting data as ${format}`);
    // The actual export implementation would be in the module
    try {
      const result = exportDataMod(format, { state, CONFIG, getCurrentData, getCellValueForSort });
      console.log(`[Export] Export successful`);
    } catch (e) {
      console.error(`[Export] Error exporting:`, e);
    }
  }
}

function deleteSelectedCells(): void {
  if (deleteSelectedCellsMod) {
    deleteSelectedCellsMod({
      state, CONFIG, getCellKey, getCellElement, getCurrentData,
      deleteCellValue: (row: number, col: number) => {
        const key = getCellKey(row, col);
        const data = getCurrentData();
        data.delete(key);
      },
      updateAIDataCache, renderCells, removeFormula
    });
  }
}

function saveToClipboardHistory(text: string): void {
  saveToClipboardHistoryMod(text);
}

function insertRowAboveAt(row: number): void {
  insertRowAboveAtMod(row, getCurrentData());
}

function insertRowBelowAt(row: number): void {
  insertRowBelowAtMod(row, getCurrentData());
}

function deleteRowAt(row: number): void {
  deleteRowAtMod(row, getCurrentData());
}

function insertColumnLeftAt(col: number): void {
  insertColumnLeftAtMod(col, getCurrentData());
}

function insertColumnRightAt(col: number): void {
  insertColumnRightAtMod(col, getCurrentData());
}

function deleteColumnAt(col: number): void {
  deleteColumnAtMod(col, getCurrentData());
}

function setupEventListeners(): void {
  setupEventListenersMod({
    elements, state, CONFIG, selectCell, editCell, finishEditing,
    updateCellReference, updateFormulaBar, getCellElement, getCellKey,
    getCurrentData, getDataValidation, showDropdownList
  });
}

function setupRangeSelection(): void {
  setupRangeSelectionMod({
    elements, state, CONFIG, selectCell, editCell, finishEditing,
    updateCellReference, updateFormulaBar, getCellElement, getCellKey,
    getCurrentData, getDataValidation, showDropdownList
  });
}

function setupCellEventListeners(): void {
  setupCellEventListenersMod({
    elements, state, CONFIG, selectCell, editCell, finishEditing,
    updateCellReference, updateFormulaBar, getCellElement, getCellKey,
    getCurrentData, getDataValidation, showDropdownList
  });
}

function setupContextMenu(): void {
  setupContextMenuMod({
    elements, state, CONFIG, selectCell, editCell, finishEditing,
    updateCellReference, updateFormulaBar, getCellElement, getCellKey,
    getCurrentData, getDataValidation, showDropdownList
  });
}

function setupSheetContextMenu(): void {
  setupSheetContextMenuMod({
    elements, state, CONFIG, selectCell, editCell, finishEditing,
    updateCellReference, updateFormulaBar, getCellElement, getCellKey,
    getCurrentData, getDataValidation, showDropdownList
  });
}

function handleGlobalInputKeyDown(e: KeyboardEvent): void {
  handleGlobalInputKeyDownMod(e, {
    state, CONFIG, selectCell, editCell, finishEditing,
    getCellElement, getGlobalCellInput, updateFormulaBar
  });
}

function handleGlobalInputChange(e: Event): void {
  handleGlobalInputChangeMod(e, {
    state, CONFIG, selectCell, editCell, finishEditing,
    getCellElement, getGlobalCellInput, updateFormulaBar
  });
}

function setupKeyboardController(): void {
  if (setupKeyboardControllerMod) {
    // setupKeyboardController from keyboard.ts takes KeyboardContext (no elements)
    setupKeyboardControllerMod({
      state, CONFIG, selectCell, editCell, finishEditing,
      getCellElement, getGlobalCellInput, updateFormulaBar
    });
  }
}

function performSearch(query: string, caseSensitive: boolean, exactMatch: boolean, resultsContainer: HTMLElement): void {
  performSearchMod(query, caseSensitive, exactMatch, resultsContainer, {
    state, elements, getCellKey, getCellElement, getCurrentData, renderCells
  });
}

function clearSearchHighlight(): void {
  clearSearchHighlightMod({ state, elements, getCellKey, getCellElement, getCurrentData, renderCells });
}

function applyFilters(): void {
  applyFiltersMod({ state, elements, getCellKey, getCellElement, getCurrentData, renderCells });
}

function sortByColumn(columnIndex: number, direction: 'asc' | 'desc'): void {
  sortByColumnMod(columnIndex, direction, {
    state, elements, getCellKey, getCellElement, getCurrentData, renderCells
  });
}

function getCellValueForSort(cellData: any): number | string {
  return getCellValueForSortMod(cellData);
}

function insertImage(imageSrc: string): void {
  insertImageMod(imageSrc, {
    state, elements, getCellElement, getCellKey, getCurrentData, updateAIDataCache, autoSave
  });
}

function insertImageInCell(imageSrc: string): void {
  insertImageInCellMod(imageSrc, {
    state, elements, getCellElement, getCellKey, getCurrentData, updateAIDataCache, autoSave
  });
}

function makeDraggableByHeader(element: HTMLElement, header: HTMLElement): void {
  makeDraggableByHeaderMod(element, header);
}

function makeDraggable(element: HTMLElement): void {
  makeDraggableMod(element);
}

function addResizeHandles(element: HTMLElement): void {
  addResizeHandlesMod(element);
}

function autoFitColumn(col: number): void {
  autoFitColumnUtil(col, elements.cellGrid, elements.columnHeaders, CONFIG.CELL_WIDTH, 500);
}

function updateColumnWidth(col: number, width: number): void {
  updateColumnWidthMod(col, width, elements.columnHeaders, elements.cellGrid);
}

function updateRowHeight(row: number, height: number): void {
  updateRowHeightMod(row, height, elements.rowHeaders, elements.cellGrid);
}

function handleContextMenuAction(action: string): void {
  (window as any).handleContextMenuActionInternal(action);
}

function handleSheetContextMenuAction(action: string): void {
  (window as any).handleSheetContextMenuActionInternal(action);
}

function getSelectedRange(): any {
  return (window as any).getSelectedRangeInternal();
}

function getSelectedRangeData(): any {
  return (window as any).getSelectedRangeDataInternal();
}

function pasteToCell(text: string): void {
  (window as any).pasteToCellInternal(text);
}

function clearCell(row: number, col: number): void {
  (window as any).clearCellInternal(row, col);
}

function autoSum(): void {
  (window as any).autoSumInternal();
}

function mergeCells(): void {
  (window as any).mergeCellsInternal();
}

function insertRow(): void {
  insertRowAboveAt(state.selectedCell.row);
  renderCells();
  autoSave();
}

function deleteRow(): void {
  deleteRowAt(state.selectedCell.row);
  renderCells();
  autoSave();
}

function insertColumn(): void {
  insertColumnLeftAt(state.selectedCell.col);
  renderCells();
  autoSave();
}

function deleteColumn(): void {
  deleteColumnAt(state.selectedCell.col);
  renderCells();
  autoSave();
}

function sortData(): void {
  sortByColumn(state.selectedCell.col, state.activeSort.direction === 'desc' ? 'asc' : 'desc');
}

function toggleFilter(): void {
  showFilterByValueModal(state.selectedCell.col);
}

function toggleWrapText(): void {
  (window as any).toggleWrapTextInternal();
}

function sortColumnAZ(): void {
  sortByColumn(state.selectedCell.col, 'asc');
}

function filterDataFull(): void {
  showFilterByValueModal(state.selectedCell.col);
}

function removeDuplicates(): void {
  (window as any).removeDuplicatesInternal();
}

function findAndReplace(findText: string, replaceText: string, options: any = {}): { found: number; replaced: number } {
  return (window as any).findAndReplaceInternal(findText, replaceText, options);
}

function addConditionalFormat(range: string, rule: string, style: any): void {
  state.conditionalFormats.push({ range, rule, style });
}

function clearConditionalFormats(): void {
  state.conditionalFormats = [];
}

function applyConditionalFormatting(): void {
  renderCells();
}

function globalSetCell(col: string, row: number, value: string): void {
  (window as any).globalSetCellInternal(col, row, value);
}

function globalFillTable(data: string[][]): void {
  (window as any).globalFillTableInternal(data);
}

function globalColorCells(cells: any[]): void {
  (window as any).globalColorCellsInternal(cells);
}

function globalBoldColumn(col: string): void {
  (window as any).globalBoldColumnInternal(col);
}

function globalSortColumn(col: string, order: string): void {
  (window as any).globalSortColumnInternal(col, order);
}

function globalClearCell(col: string, row: number): void {
  (window as any).globalClearCellInternal(col, row);
}

function globalClearColumn(col: string): void {
  (window as any).globalClearColumnInternal(col);
}

function globalClearAll(): void {
  (window as any).globalClearAllInternal();
}

function applyQuickFormula(formulaType: string): void {
  (window as any).applyQuickFormulaInternal(formulaType);
}

function getRangeAddress(startRow: number, startCol: number, endRow: number, endCol: number): string {
  return `${colToLetter(startCol)}${startRow + 1}:${colToLetter(endCol)}${endRow + 1}`;
}

function getColLetter(colIndex: number): string {
  return colToLetter(colIndex);
}

function showSaveDialog(): Promise<boolean> {
  return new Promise((resolve) => {
    const result = confirm('Сохранить таблицу перед закрытием?\n\nOK - Сохранить в XLSX\nОтмена - Закрыть без сохранения');
    resolve(result);
  });
}

async function exportToXLSXWithDialog(): Promise<void> {
  // Export implementation
  console.log('[Export] Exporting to XLSX...');
}

function updateModeUI(): void {
  /* updateModeUIInternal - disabled */
}

function showQuickReplies(replies: string[]): void {
  (window as any).showQuickRepliesInternal(replies);
}

function hideQuickReplies(): void {
  (window as any).hideQuickRepliesInternal();
}

function showModeSwitcher(mode: string): void {
  (window as any).showModeSwitcherInternal(mode);
}

function hideModeSwitcher(): void {
  (window as any).hideModeSwitcherInternal();
}

async function init(): Promise<void> {
  await initMod({
    elements, state, CONFIG, FocusManager,
    initElements, renderCells, renderColumnHeaders, renderRowHeaders,
    renderFixedColumnHeaders, renderFixedRowHeaders, autoLoad,
    updateCellReference, setupEventListeners, setupScrollHandler: () => setupScrollHandlerMod(elements.cellGridWrapper, renderCells), setupKeyboardController,
    updateModeUI
  });
}

// Инициализация после загрузки DOM и скрипта
window.addEventListener('load', () => {
  console.log('[Renderer] Window loaded!');
  initRenderer();
});
