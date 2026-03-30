/**
 * Renderer Modules - Индексный файл
 * Selective exports to avoid naming conflicts between modules
 */

// Cell Rendering
export {
  RenderState,
  CellStyle,
  CellData,
  CellCacheEntry,
  RenderConfig,
  createCellElement,
  createAbsoluteCellElement,
  getVisibleRange,
  calculateVisibleRangeWithBuffer,
  applyCellStyle,
  updateCellDisplay,
  exportCellStyle,
  hashStyle,
  cleanupCellCache,
  setGridSize,
  restoreSelection,
  getSelectedCellsFromDOM
} from './cell.rendering';

// Selection
export {
  SelectionContext,
  selectCell,
  selectRow,
  selectColumn,
  moveSelection,
  getCellElement
} from './selection';

// Editing
export {
  EditingContext,
  EditState,
  editCell,
  finishEditing,
  resetEditing,
  getGlobalCellInput
} from './editing';

// Scroll
export {
  ScrollState,
  VirtualScrollOptions,
  ScrollCallbacks,
  getScrollVisibleRange,
  syncScrollHeaders,
  updateFixedHeaders,
  syncFixedHeaders,
  optimizeScroll,
  getScrollState,
  setScrollPosition,
  scrollToCell,
  isCellVisible,
  handleScroll,
  setupScrollHandler
} from './scroll';

// Formatting
export {
  FormattingContext,
  applyColorToSelection as applyColorToSelectionFormatting,
  applyTextAlign as applyTextAlignFormatting,
  changeDecimalPlaces as changeDecimalPlacesFormatting
} from './formatting';

// Formatting Actions
export {
  applyColorToSelection,
  applyTextAlign,
  changeDecimalPlaces
} from './formatting-actions';

// Borders
export {
  BorderConfig,
  applyBorders,
  toggleAllBorders,
  clearBorders,
  getBorderState,
  setTopBorder,
  setBottomBorder,
  setLeftBorder,
  setRightBorder
} from './borders';

// Column/Row
export {
  ColumnConfig,
  RowConfig,
  RenderHeadersConfig,
  updateColumnWidth,
  updateRowHeight,
  autoFitColumn,
  renderColumnHeaders as renderColumnHeadersColumns,
  renderRowHeaders as renderRowHeadersColumns,
  renderFixedColumnHeaders as renderFixedColumnHeadersColumns,
  renderFixedRowHeaders as renderFixedRowHeadersColumns,
  insertRow,
  insertColumn,
  deleteRow,
  deleteColumn,
  moveRowData,
  moveColumnData,
  deleteRowData,
  deleteColumnData,
  setupColumnResize as setupColumnResizeColumns,
  setupRowResize as setupRowResizeColumns
} from './column.row';

// Utils
export {
  colToLetter,
  letterToCol,
  getCellId,
  getCellKey,
  parseCellKey,
  isFormula
} from './utils';

// State
export {
  CellData as StateCellData,
  TableState,
  clearAllDataValidations,
  getCurrentData,
  updateAIDataCache,
  clearAllData,
  getSheetData,
  setCurrentData,
  getCellValue,
  setCellValue,
  deleteCellValue,
  clearCurrentData,
  switchSheet,
  getAllSheetsData,
  importData,
  clearAllState
} from './state';

// Data Validation
export {
  ValidationConfig,
  setDataValidation,
  getDataValidation,
  removeDataValidation,
  clearAllDataValidations as clearAllDataValidationsValidation,
  hasDropdown,
  validateValue,
  renderCellDropdown,
  showDropdownList
} from './data.validation';

// Undo/Redo
export {
  pushUndo,
  undo,
  redo,
  clearUndoRedo,
  canUndo,
  canRedo
} from './undo-redo';

// Formulas
export {
  FormulaResult,
  calculateFormula,
  registerFormula,
  removeFormula,
  getDependentCells,
  extractCellReferences,
  parseCellReference,
  getHexColorByName,
  getRangeType,
  getCellsInRange,
  recalculateDependentCells as recalculateDependentCellsFormulas,
  applyColorFromFormula as applyColorFromFormulaFormulas,
  applyCellColor as applyCellColorFormulas
} from './formulas';

// Context Menu
export {
  ContextMenuAction,
  ContextMenuConfig,
  MenuPosition,
  calculateMenuPosition,
  showContextMenu,
  hideContextMenu,
  handleContextMenuClick,
  createClickOutsideHandler,
  getCellMenuActions,
  getSheetMenuActions,
  isPositionInMenu,
  insertRowAboveAt,
  insertRowBelowAt,
  deleteRowAt,
  insertColumnLeftAt,
  insertColumnRightAt,
  deleteColumnAt,
  handleContextMenuAction,
  handleSheetContextMenuAction
} from './context.menu';

// AutoSave
export {
  saveToLocalStorage,
  loadFromLocalStorage,
  clearAutoSaveData
} from './autosave';

// AI
export {
  normalizeColor,
  animateCellChange,
  escapeXml,
  processMarkdown,
  highlightCode,
  sleep,
  executeSingleCommand
} from './ai';

// Events
export {
  EventContext,
  setupRangeSelection,
  setupCellEventListeners,
  setupContextMenu,
  setupSheetContextMenu,
  setupKeyboardController as setupKeyboardControllerEvents,
  setupEventListeners
} from './events';

// Actions
export {
  ActionContext,
  deleteSelectedCells,
  saveToClipboardHistory,
  insertRowAboveAt as insertRowAboveAtActions,
  insertRowBelowAt as insertRowBelowAtActions,
  deleteRowAt as deleteRowAtActions,
  insertColumnLeftAt as insertColumnLeftAtActions,
  insertColumnRightAt as insertColumnRightAtActions,
  deleteColumnAt as deleteColumnAtActions
} from './actions';

// UI Helpers
export {
  UIContext,
  updateCellReference,
  updateFormulaBar,
  updateSelectionHeaders,
  updateRangeSelection,
  initElements
} from './ui-helpers';

// Modals
export {
  showPromptModal,
  showFindInSelectionModal,
  showFilterByValueModal as showFilterByValueModalModals,
  showExportMenu
} from './modals';

// Export
export {
  ExportContext,
  exportData
} from './export';

// Keyboard
export {
  KeyboardContext,
  handleGlobalInputKeyDown,
  handleGlobalInputChange,
  setupKeyboardController
} from './keyboard';

// Rendering
export {
  RenderingContext,
  renderCells,
  renderVisibleCells
} from './rendering';

// Init
export { init } from './init';

// Formulas Helpers
export {
  FormulasContext,
  recalculateDependentCells,
  applyColorFromFormula,
  applyCellColor,
  updateSingleCell
} from './formulas-helpers';

// Toolbar
export {
  ToolbarContext,
  toggleFormatting,
  toggleBorders,
  applyStyle
} from './toolbar';

// Sheets Actions
export {
  addSheet,
  renderSheets
} from './sheets-actions';

// Search & Filter
export {
  performSearch,
  clearSearchHighlight,
  applyFilters,
  sortByColumn,
  getCellValueForSort,
  showFilterByValueModal
} from './search-filter';

// Image
export {
  insertImage,
  insertImageInCell,
  makeDraggable,
  makeDraggableByHeader,
  addResizeHandles
} from './image';

// Ribbon Actions
export { autoSum } from './ribbon-actions';

// Fill Handle
export { setupFillHandle } from './fill-handle';

// Resize
export { setupColumnResize, setupRowResize } from './resize';
