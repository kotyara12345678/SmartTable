/**
 * SmartTable App - главный файл приложения
 * Модульная архитектура на основе компонентов
 */

import { TopBarComponent } from './ui/components/TopBarComponent.js';
import { RibbonComponent } from './ui/components/RibbonComponent.js';
import { ChartsWidget } from './ui/widgets/charts/ChartsWidget.js';

// Глобальное состояние приложения
interface AppState {
  zoom: number;
  currentFile: string | null;
  isModified: boolean;
}

const state: AppState = {
  zoom: 100,
  currentFile: null,
  isModified: false,
};

// Компоненты приложения
let topBar: TopBarComponent | null = null;
let ribbon: RibbonComponent | null = null;
let chartsWidget: ChartsWidget | null = null;

/**
 * Инициализация приложения
 */
function initApp(): void {
  const logs: string[] = [];
  logs.push('[App] Initializing SmartTable...');
  logs.push('[App] DOM ready: ' + document.readyState);
  logs.push('[App] top-bar-container: ' + !!document.getElementById('top-bar-container'));
  logs.push('[App] ribbon-container: ' + !!document.getElementById('ribbon-container'));
  logs.push('[App] spreadsheet-container: ' + !!document.getElementById('spreadsheet-container'));

  try {
    // Инициализация компонентов
    logs.push('[App] Creating TopBarComponent...');
    topBar = new TopBarComponent();
    topBar.init();
    logs.push('[App] TopBarComponent initialized');

    logs.push('[App] Creating RibbonComponent...');
    ribbon = new RibbonComponent();
    ribbon.init();
    logs.push('[App] RibbonComponent initialized');

    // Инициализация виджета диаграмм
    const chartsContainer = document.getElementById('charts-container');
    if (chartsContainer) {
      logs.push('[App] Creating ChartsWidget...');
      chartsWidget = new ChartsWidget(chartsContainer);
      chartsWidget.init();
      // Добавляем в глобальную область для доступа из renderer
      (window as any).chartsWidget = chartsWidget;
      logs.push('[App] ChartsWidget initialized');
    }

    // Глобальные обработчики событий
    setupGlobalEventListeners();

    // Загрузка сохраненных настроек
    loadSettings();

    logs.push('[App] Initialization completed successfully');
    
    // Убираем alert - теперь он мешает
    // alert(logs.join('\n'));
    console.log(logs.join('\n'));
  } catch (error: any) {
    logs.push('[App] Initialization error: ' + error.message);
    alert(logs.join('\n'));
  }
}

/**
 * Настройка глобальных обработчиков событий
 */
function setupGlobalEventListeners(): void {
  // Событие изменения зума
  document.addEventListener('zoom-change', ((event: CustomEvent) => {
    const { delta } = event.detail;
    updateZoom(delta);
  }) as EventListener);

  // Событие изменения форматирования
  document.addEventListener('format-change', ((event: CustomEvent) => {
    const { format } = event.detail;
    applyFormat(format);
  }) as EventListener);

  // Событие открытия AI панели
  document.addEventListener('ai-panel-open', () => {
    openAIPanel();
  });

  // Событие действий от Ribbon (диаграммы, сортировка и т.д.)
  document.addEventListener('ribbon-action', ((event: CustomEvent) => {
    const { action } = event.detail;
    handleRibbonAction(action);
  }) as EventListener);

  // Горячие клавиши
  document.addEventListener('keydown', handleKeyDown);
}

/**
 * Обновление зума
 */
function updateZoom(delta: number): void {
  state.zoom = Math.max(50, Math.min(200, state.zoom + delta));
  saveSettings();
  
  if (ribbon) {
    ribbon.setZoomLevel(state.zoom);
  }
  
  // Применяем зум к таблице
  applyZoomToSpreadsheet();
}

/**
 * Применение зума к таблице
 */
function applyZoomToSpreadsheet(): void {
  const scale = state.zoom / 100;
  const BASE_CELL_WIDTH = 100;
  const BASE_CELL_HEIGHT = 32;
  
  const cellGrid = document.getElementById('cellGrid');
  if (cellGrid) {
    (cellGrid as HTMLElement).style.gridTemplateColumns = 
      `repeat(26, ${BASE_CELL_WIDTH * scale}px)`;
  }
  
  // Сохраняем в localStorage
  localStorage.setItem('smarttable-zoom', state.zoom.toString());
}

/**
 * Применение форматирования
 */
function applyFormat(format: string): void {
  console.log('[App] Applying format:', format);
  // Будет реализовано в SpreadsheetComponent
}

/**
 * Открытие AI панели
 */
function openAIPanel(): void {
  const aiPanel = document.getElementById('ai-panel-container');
  if (aiPanel) {
    aiPanel.classList.add('open');
  }
}

/**
 * Обработка горячих клавиш
 */
function handleKeyDown(event: KeyboardEvent): void {
  // Ctrl/Cmd + S - Сохранить
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault();
    saveFile();
  }
  
  // Ctrl/Cmd + Z - Отменить
  if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
    event.preventDefault();
    undo();
  }
  
  // Ctrl/Cmd + Y - Повторить
  if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
    event.preventDefault();
    redo();
  }
  
  // F11 - Полный экран
  if (event.key === 'F11') {
    event.preventDefault();
    toggleFullscreen();
  }
}

/**
 * Сохранение файла
 */
function saveFile(): void {
  console.log('[App] Saving file...');
  // Будет реализовано в FileManager
}

/**
 * Отменить действие
 */
function undo(): void {
  console.log('[App] Undo');
}

/**
 * Повторить действие
 */
function redo(): void {
  console.log('[App] Redo');
}

/**
 * Переключение полного экрана
 */
function toggleFullscreen(): void {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

/**
 * Загрузка настроек
 */
function loadSettings(): void {
  const savedZoom = localStorage.getItem('smarttable-zoom');
  if (savedZoom) {
    state.zoom = parseInt(savedZoom);
  }
  
  if (ribbon) {
    ribbon.setZoomLevel(state.zoom);
  }
  
  applyZoomToSpreadsheet();
}

/**
 * Сохранение настроек
 */
function saveSettings(): void {
  localStorage.setItem('smarttable-zoom', state.zoom.toString());
}

/**
 * Обработка действий от Ribbon
 */
function handleRibbonAction(action: string): void {
  console.log('[App] Ribbon action:', action);
  
  switch (action) {
    case 'charts':
      createChartFromSelection();
      break;
    case 'merge':
      mergeCells();
      break;
    case 'insertRow':
      insertRow();
      break;
    case 'deleteRow':
      deleteRow();
      break;
    case 'insertCol':
      insertColumn();
      break;
    case 'deleteCol':
      deleteColumn();
      break;
    case 'sort':
      sortData();
      break;
    case 'filter':
      toggleFilter();
      break;
  }
}

/**
 * Создать диаграмму из выделенного диапазона
 */
function createChartFromSelection(): void {
  console.log('[App] Creating chart from selection...');
  
  // Получаем данные из renderer (глобальная функция)
  const getSelectedRangeData = (window as any).getSelectedRangeData;
  if (typeof getSelectedRangeData === 'function') {
    const rangeData = getSelectedRangeData();
    
    if (rangeData && rangeData.labels && rangeData.labels.length > 0) {
      if (chartsWidget) {
        chartsWidget.createChartFromRange(rangeData, 'bar', 'Диаграмма по данным таблицы');
      }
    } else {
      alert('Сначала выделите диапазон ячеек с данными для создания диаграммы');
    }
  }
}

/**
 * Объединить ячейки
 */
function mergeCells(): void {
  console.log('[App] Merge cells...');
  const mergeCellsFunc = (window as any).mergeCells;
  if (typeof mergeCellsFunc === 'function') {
    mergeCellsFunc();
  }
}

/**
 * Вставить строку
 */
function insertRow(): void {
  console.log('[App] Insert row...');
  const insertRowFunc = (window as any).insertRow;
  if (typeof insertRowFunc === 'function') {
    insertRowFunc();
  }
}

/**
 * Удалить строку
 */
function deleteRow(): void {
  console.log('[App] Delete row...');
  const deleteRowFunc = (window as any).deleteRow;
  if (typeof deleteRowFunc === 'function') {
    deleteRowFunc();
  }
}

/**
 * Вставить столбец
 */
function insertColumn(): void {
  console.log('[App] Insert column...');
  const insertColFunc = (window as any).insertColumn;
  if (typeof insertColFunc === 'function') {
    insertColFunc();
  }
}

/**
 * Удалить столбец
 */
function deleteColumn(): void {
  console.log('[App] Delete column...');
  const deleteColFunc = (window as any).deleteColumn;
  if (typeof deleteColFunc === 'function') {
    deleteColFunc();
  }
}

/**
 * Сортировать данные
 */
function sortData(): void {
  console.log('[App] Sort data...');
  const sortFunc = (window as any).sortData;
  if (typeof sortFunc === 'function') {
    sortFunc();
  }
}

/**
 * Переключить фильтр
 */
function toggleFilter(): void {
  console.log('[App] Toggle filter...');
  const filterFunc = (window as any).toggleFilter;
  if (typeof filterFunc === 'function') {
    filterFunc();
  }
}

/**
 * Очистка при закрытии
 */
function cleanup(): void {
  if (topBar) {
    topBar.destroy();
  }
  if (ribbon) {
    ribbon.destroy();
  }
  if (chartsWidget) {
    chartsWidget.close();
    chartsWidget.destroy();
  }
}

// Инициализация при загрузке DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Очистка при выгрузке
window.addEventListener('beforeunload', cleanup);

// Экспорт для глобального доступа
(window as any).SmartTable = {
  state,
  updateZoom,
  saveFile,
  undo,
  redo,
};
