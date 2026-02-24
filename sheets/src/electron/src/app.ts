/**
 * SmartTable App - главный файл приложения
 * Модульная архитектура на основе компонентов
 */

import { TopBarComponent } from './ui/components/TopBarComponent.js';
import { RibbonComponent } from './ui/components/RibbonComponent.js';
import { ChartsWidget } from './ui/widgets/charts/ChartsWidget.js';
import { SettingsPanelComponent } from './ui/components/SettingsPanelComponent.js';
import { UserProfileComponent } from './ui/components/UserProfileComponent.js';
import { DashboardComponent } from './ui/components/DashboardComponent.js';
import { AIChatComponent } from './ui/components/AIChatComponent.js';
import { themeManager } from './ui/core/theme-manager.js';
import { aiContextService } from './ui/core/ai/ai-context-service.js';
import { timeTracker } from './ui/core/time-tracker.js';
import { autosaveManager } from './ui/core/autosave-manager.js';

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
let settingsPanel: SettingsPanelComponent | null = null;
let userProfile: UserProfileComponent | null = null;
let dashboard: DashboardComponent | null = null;
let aiChat: AIChatComponent | null = null;

/**
 * Инициализация приложения
 */
async function initApp(): Promise<void> {
  const logs: string[] = [];
  logs.push('[App] Initializing SmartTable...');
  logs.push('[App] DOM ready: ' + document.readyState);
  logs.push('[App] top-bar-container: ' + !!document.getElementById('top-bar-container'));
  logs.push('[App] ribbon-container: ' + !!document.getElementById('ribbon-container'));
  logs.push('[App] spreadsheet-container: ' + !!document.getElementById('spreadsheet-container'));

  try {
    // Инициализация менеджера тем
    logs.push('[App] Initializing ThemeManager...');
    themeManager.initTheme();

    // Инициализация AI сервиса с базой данных
    logs.push('[App] Initializing AI Context Service...');
    await aiContextService.init();
    (window as any).aiContextService = aiContextService;
    logs.push('[App] AI Context Service initialized');

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

    // Инициализация панели настроек
    logs.push('[App] Creating SettingsPanelComponent...');
    settingsPanel = new SettingsPanelComponent();
    settingsPanel.init();
    (window as any).settingsPanel = settingsPanel;
    logs.push('[App] SettingsPanelComponent initialized');

    // Инициализация компонента профиля пользователя
    logs.push('[App] Creating UserProfileComponent...');
    userProfile = new UserProfileComponent();
    userProfile.init();
    (window as any).userProfile = userProfile;
    logs.push('[App] UserProfileComponent initialized');

    // Инициализация компонента Dashboard
    logs.push('[App] Creating DashboardComponent...');
    dashboard = new DashboardComponent();
    dashboard.init();
    (window as any).dashboard = dashboard;
    logs.push('[App] DashboardComponent initialized');

    // Инициализация AI чата
    logs.push('[App] Creating AIChatComponent...');
    aiChat = new AIChatComponent();
    (window as any).aiChat = aiChat;
    logs.push('[App] AIChatComponent initialized');

    // Инициализация трекера времени
    logs.push('[App] Initializing TimeTracker...');
    (window as any).timeTracker = timeTracker;
    logs.push('[App] TimeTracker initialized');

    // Инициализация менеджера автосохранений
    logs.push('[App] Initializing AutoSaveManager...');
    await autosaveManager.init();
    (window as any).autosaveManager = autosaveManager;
    logs.push('[App] AutoSaveManager initialized');

    // Начинаем отслеживание времени в таблицах при запуске
    timeTracker.startSession('spreadsheet');

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

  // Событие открытия панели настроек
  document.addEventListener('settings-panel-open', () => {
    openSettingsPanel();
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
 * Открытие панели настроек
 */
function openSettingsPanel(): void {
  if (settingsPanel) {
    settingsPanel.open();
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
  if (userProfile) {
    userProfile.destroy();
  }
  if (dashboard) {
    dashboard.destroy();
  }
  if (aiChat) {
    aiChat.destroy();
  }
  if (autosaveManager) {
    autosaveManager.destroy();
  }
}

// Инициализация при загрузке DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initApp().catch(console.error));
} else {
  initApp().catch(console.error);
}

// Очистка при выгрузке
window.addEventListener('beforeunload', cleanup);

// Глобальные функции для автосохранения
(window as any).setupAutoSave = (getContentCallback: () => string) => {
  if (autosaveManager) {
    autosaveManager.setGetContentCallback(getContentCallback);
    autosaveManager.setOnSaveCallback(async (content: string) => {
      try {
        const result = await (window as any).electronAPI.ipcRenderer.invoke('autosave-file', {
          content,
          filePath: null
        });
        if (!result.success) {
          console.error('[App] AutoSave failed:', result.error);
        }
      } catch (error) {
        console.error('[App] AutoSave error:', error);
      }
    });
  }
};

(window as any).markAutoSaveDirty = () => {
  if (autosaveManager) {
    autosaveManager.markDirty();
  }
};

(window as any).markAutoSaveClean = () => {
  if (autosaveManager) {
    autosaveManager.markClean();
  }
};

// Экспорт для глобального доступа
(window as any).SmartTable = {
  state,
  updateZoom,
  saveFile,
  undo,
  redo,
};
