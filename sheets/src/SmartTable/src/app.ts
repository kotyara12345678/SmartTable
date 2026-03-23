/**
 * SmartTable App - главный файл приложения
 * Модульная архитектура на основе компонентов
 */

import { TopBarComponent } from './ui/components/TopBarComponent.js';
import { RibbonComponent } from './ui/components/RibbonComponent.js';
import { ChartsWidget } from './ui/widgets/charts/ChartsWidget.js';
import { SettingsPanelComponent } from './ui/components/SettingsPanelComponent.js';
import { StartScreenComponent } from './ui/components/StartScreenComponent.js';
import { UserProfileComponent } from './ui/components/UserProfileComponent.js';
import { DashboardComponent } from './ui/components/DashboardComponent.js';
import { AIChatComponent } from './ui/components/AIChatComponent.js';
import { ExtensionsPanelComponent } from './ui/components/ExtensionsPanelComponent.js';
import { TemplateManagerComponent } from './ui/core/template-manager/TemplateManagerComponent.js';
import { pluginManager } from './ui/core/plugins/PluginManager.js';
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
let startScreen: StartScreenComponent | null = null;
let topBar: TopBarComponent | null = null;
let ribbon: RibbonComponent | null = null;
let chartsWidget: ChartsWidget | null = null;
let settingsPanel: SettingsPanelComponent | null = null;
let userProfile: UserProfileComponent | null = null;
let dashboard: DashboardComponent | null = null;
let aiChat: AIChatComponent | null = null;
let extensionsPanel: ExtensionsPanelComponent | null = null;
let templateManager: TemplateManagerComponent | null = null;

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
    (window as any).topBar = topBar;  // Делаем доступным глобально
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

    // Инициализация начального экрана
    logs.push('[App] Creating StartScreenComponent...');
    startScreen = new StartScreenComponent();
    await startScreen.init(
      (projectName: string) => {
        // Callback при создании проекта
        logs.push('[App] Project created: ' + projectName);
        // Обновляем заголовок в TopBar
        if (topBar) {
          topBar.setProjectName(projectName);
        }
        // Скрываем начальный экран
        startScreen?.hide();
      },
      (sheets: Array<{ name: string; data: string[][] }>) => {
        // Callback при открытии файла/папки
        logs.push('[App] Importing sheets: ' + sheets.length);
        
        // Импортируем листы в таблицу
        importSheets(sheets);
        
        // Скрываем начальный экран
        startScreen?.hide();
        if (topBar) {
          topBar.setProjectName('Импортированный файл');
        }
      }
    );
    (window as any).startScreen = startScreen;
    logs.push('[App] StartScreenComponent initialized');
    
    // Проверяем есть ли сохранённый проект
    const savedProject = localStorage.getItem('smarttable-current-project');
    const lastSaved = localStorage.getItem('smarttable-last-saved');
    
    if (savedProject && startScreen) {
      // Если есть проект - скрываем начальный экран и загружаем
      logs.push('[App] Found saved project: ' + savedProject);
      startScreen.hide();
      if (topBar) {
        topBar.setProjectName(savedProject);
      }
      
      // Восстанавливаем последние сохраненные данные если они есть
      if (lastSaved) {
        try {
          const saveData = localStorage.getItem(`smarttable-autosave-${lastSaved}`);
          if (saveData) {
            const parsed = JSON.parse(saveData);
            // Восстанавливаем данные таблицы
            if (parsed.data && typeof parsed.data === 'string') {
              // Передаем данные в таблицу через глобальную функцию
              setTimeout(() => {
                const importSheets = (window as any).importSheets;
                if (typeof importSheets === 'function') {
                  try {
                    const sheets = JSON.parse(parsed.data);
                    importSheets(sheets);
                    logs.push('[App] Restored data from last save');
                  } catch (e) {
                    logs.push('[App] Failed to restore data: ' + String(e));
                  }
                }
              }, 500);
            }
          }
        } catch (e) {
          logs.push('[App] Error recovering saved data: ' + String(e));
        }
      }
    } else if (startScreen) {
      // Если нет проекта - показываем начальный экран
      logs.push('[App] No saved project, showing start screen');
      startScreen.show();
    }

    // Инициализация панели настроек
    logs.push('[App] Creating SettingsPanelComponent...');
    settingsPanel = new SettingsPanelComponent();
    settingsPanel.init();
    (window as any).settingsPanel = settingsPanel;
    logs.push('[App] SettingsPanelComponent initialized');

    // Инициализация панели расширений
    logs.push('[App] Creating ExtensionsPanelComponent...');
    extensionsPanel = new ExtensionsPanelComponent();
    extensionsPanel.init();
    (window as any).extensionsPanel = extensionsPanel;
    logs.push('[App] ExtensionsPanelComponent initialized');

    // Инициализация менеджера плагинов
    logs.push('[App] Initializing PluginManager...');
    await initPluginManager();
    logs.push('[App] PluginManager initialized');

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

    // Инициализация менеджера шаблонов
    logs.push('[App] Creating TemplateManagerComponent...');
    templateManager = new TemplateManagerComponent();
    document.body.appendChild(templateManager);
    logs.push('[App] TemplateManagerComponent initialized');

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

  // Событие открытия панели расширений
  document.addEventListener('extensions-panel-open', () => {
    openExtensionsPanel();
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
  const BASE_HEADER_WIDTH = 50;
  const BASE_HEADER_HEIGHT = 32;

  // Обновляем сетку ячеек
  const cellGrid = document.getElementById('cellGrid');
  if (cellGrid) {
    (cellGrid as HTMLElement).style.gridTemplateColumns =
      `repeat(26, ${BASE_CELL_WIDTH * scale}px)`;
    (cellGrid as HTMLElement).style.gridTemplateRows =
      `repeat(100, ${BASE_CELL_HEIGHT * scale}px)`;
  }

  // Обновляем заголовки столбцов
  const columnHeaders = document.getElementById('columnHeaders');
  if (columnHeaders) {
    const headerCells = columnHeaders.querySelectorAll('.column-header');
    headerCells.forEach((cell) => {
      (cell as HTMLElement).style.minWidth = `${BASE_CELL_WIDTH * scale}px`;
      (cell as HTMLElement).style.height = `${BASE_HEADER_HEIGHT * scale}px`;
    });
  }

  // Обновляем заголовки строк
  const rowHeaders = document.getElementById('rowHeaders');
  if (rowHeaders) {
    const headerCells = rowHeaders.querySelectorAll('.row-header');
    headerCells.forEach((cell) => {
      (cell as HTMLElement).style.width = `${BASE_HEADER_WIDTH * scale}px`;
      (cell as HTMLElement).style.height = `${BASE_CELL_HEIGHT * scale}px`;
    });
  }

  // Обновляем угловой заголовок
  const cornerHeader = document.querySelector('.corner-header');
  if (cornerHeader) {
    (cornerHeader as HTMLElement).style.width = `${BASE_HEADER_WIDTH * scale}px`;
    (cornerHeader as HTMLElement).style.height = `${BASE_HEADER_HEIGHT * scale}px`;
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
  if (aiChat) {
    aiChat.open();
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
 * Открытие панели расширений
 */
function openExtensionsPanel(): void {
  if (extensionsPanel) {
    extensionsPanel.open();
  }
}

/**
 * Инициализация менеджера плагинов
 */
async function initPluginManager(): Promise<void> {
  // Массив для хранения кнопок плагинов
  const pluginButtons: Array<{ id: string; groupId: string; element?: HTMLElement }> = [];

  // Создаем API для плагинов
  const pluginAPI = {
    version: '1.0.0',
    sheets: {
      getCell: () => null,
      setCell: () => {},
      getSelectedRange: () => null,
      getSheet: () => null,
      createSheet: () => 0,
      deleteSheet: () => {},
      getAllSheets: () => []
    },
    ui: {
      addRibbonButton: (config: { id: string; groupId: string; icon: string; label: string; tooltip?: string; size?: string; onClick?: () => void }) => {
        console.log('[PluginAPI] Adding ribbon button:', config.id, 'to group:', config.groupId);
        
        // Находим группу в ribbon
        const groupSelector = `.ribbon-group[data-group="${config.groupId}"]`;
        const group = document.querySelector(groupSelector);
        
        if (!group) {
          console.warn('[PluginAPI] Ribbon group not found:', config.groupId);
          return null;
        }

        // Создаём кнопку
        const button = document.createElement('button');
        button.className = config.size === 'lg' ? 'ribbon-btn-lg' : 'ribbon-btn-sm';
        button.id = config.id;
        button.title = config.tooltip || config.label;
        button.innerHTML = `
          ${config.icon}
          ${config.label ? `<span>${config.label}</span>` : ''}
        `;
        
        // Добавляем обработчик клика
        if (config.onClick) {
          button.addEventListener('click', (e) => {
            e.stopPropagation();
            config.onClick?.();
          });
        }

        // Добавляем кнопку в группу
        group.appendChild(button);
        
        // Сохраняем ссылку на кнопку
        const buttonInfo = { id: config.id, groupId: config.groupId, element: button };
        pluginButtons.push(buttonInfo);
        
        console.log('[PluginAPI] Ribbon button added:', config.id);
        return button;
      },
      addMenuItem: () => {},
      addPanel: () => {},
      showModal: (content: HTMLElement, options?: { size?: 'sm' | 'md' | 'lg' | 'xl' | 'full' }) => {
        console.log('[PluginAPI] showModal called', options);
        
        // Размеры модального окна
        const sizeMap = {
          sm: 'max-width: 400px; max-height: 60vh;',
          md: 'max-width: 600px; max-height: 70vh;',
          lg: 'max-width: 900px; max-height: 85vh;',
          xl: 'max-width: 1200px; max-height: 90vh;',
          full: 'max-width: 95%; max-height: 95%;'
        };
        
        const size = options?.size || 'lg';
        const sizeStyle = sizeMap[size] || sizeMap.md;
        
        // Простая реализация модального окна
        const modal = document.createElement('div');
        modal.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100000;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
          background: var(--bg-secondary, #ffffff);
          border-radius: 12px;
          padding: 0;
          ${sizeStyle}
          width: 100%;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        `;
        modalContent.appendChild(content);

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Закрытие по клику на фон
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            modal.remove();
          }
        });

        return modal;
      },
      closeModals: () => {
        console.log('[PluginAPI] closeModals called');
        // Закрываем все модальные окна
        const modals = document.body.querySelectorAll('div[style*="z-index: 100000"]');
        modals.forEach(modal => {
          modal.remove();
        });
      },
      showNotification: () => {},
      getActiveTheme: () => 'default'
    },
    events: {
      onCellChange: () => {},
      onSheetCreate: () => {},
      onSheetDelete: () => {},
      onSelectionChange: () => {},
      onFileOpen: () => {},
      onFileSave: () => {},
      off: () => {}
    },
    storage: {
      get: (key: string) => {
        try {
          return JSON.parse(localStorage.getItem('plugin_' + key) || 'null');
        } catch {
          return null;
        }
      },
      set: (key: string, value: any) => {
        try {
          localStorage.setItem('plugin_' + key, JSON.stringify(value));
        } catch {}
      },
      remove: (key: string) => {
        localStorage.removeItem('plugin_' + key);
      },
      clear: () => {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('plugin_')) {
            localStorage.removeItem(key);
          }
        });
      }
    }
  };

  await pluginManager.init(pluginAPI as any);
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
  
  try {
    // Получаем данные таблицы через автосохранение callback
    const autosave = (window as any).autosaveManager;
    if (!autosave) {
      console.error('[App] AutoSaveManager not available');
      return;
    }

    // Сохраняем через встроенную функцию автосохранения
    autosave.forceSave?.();

    if (topBar) {
      topBar.showSaveSuccess();
    }

    console.log('[App] File saved successfully');
  } catch (error) {
    console.error('[App] Save error:', error);
  }
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
 * Импорт листов из XLSX/CSV файла
 */
function importSheets(sheets: Array<{ name: string; data: string[][] }>): void {
  console.log('[App] Importing sheets:', sheets);
  
  const importFunc = (window as any).importSheets;
  if (typeof importFunc === 'function') {
    importFunc(sheets);
  } else {
    console.error('[App] importSheets function not found');
    alert('Ошибка импорта: функция импорта недоступна');
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
  if (!autosaveManager) {
    console.error('[App] AutoSaveManager not initialized!');
    return;
  }
  
  // Устанавливаем callbacks
  autosaveManager.setGetContentCallback(getContentCallback);
  autosaveManager.setOnSaveCallback(async (content: string) => {
    try {
      // Показываем индикатор автосохранения
      if (topBar) {
        topBar.showAutoSaveIndicator();
      }

      const result = await (window as any).electronAPI.ipcRenderer.invoke('autosave-file', {
        content,
        filePath: null
      });
      if (!result.success) {
        console.error('[App] AutoSave failed:', result.error);
        if (topBar) {
          topBar.showSaveError(result.error);
        }
      } else {
        console.log('[App] AutoSave successful:', result.filePath);
        if (topBar) {
          topBar.showSaveSuccess();
        }
      }
    } catch (error) {
      console.error('[App] AutoSave error:', error);
      if (topBar) {
        topBar.showSaveError(error instanceof Error ? error.message : 'Неизвестная ошибка');
      }
    }
  });

  // Включаем и запускаем автосохранение
  autosaveManager.enable();
  console.log('[App] AutoSave setup completed');
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
