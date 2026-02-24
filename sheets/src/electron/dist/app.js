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
const state = {
    zoom: 100,
    currentFile: null,
    isModified: false,
};
// Компоненты приложения
let topBar = null;
let ribbon = null;
let chartsWidget = null;
let settingsPanel = null;
let userProfile = null;
let dashboard = null;
let aiChat = null;
/**
 * Инициализация приложения
 */
async function initApp() {
    const logs = [];
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
        window.aiContextService = aiContextService;
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
            window.chartsWidget = chartsWidget;
            logs.push('[App] ChartsWidget initialized');
        }
        // Инициализация панели настроек
        logs.push('[App] Creating SettingsPanelComponent...');
        settingsPanel = new SettingsPanelComponent();
        settingsPanel.init();
        window.settingsPanel = settingsPanel;
        logs.push('[App] SettingsPanelComponent initialized');
        // Инициализация компонента профиля пользователя
        logs.push('[App] Creating UserProfileComponent...');
        userProfile = new UserProfileComponent();
        userProfile.init();
        window.userProfile = userProfile;
        logs.push('[App] UserProfileComponent initialized');
        // Инициализация компонента Dashboard
        logs.push('[App] Creating DashboardComponent...');
        dashboard = new DashboardComponent();
        dashboard.init();
        window.dashboard = dashboard;
        logs.push('[App] DashboardComponent initialized');
        // Инициализация AI чата
        logs.push('[App] Creating AIChatComponent...');
        aiChat = new AIChatComponent();
        window.aiChat = aiChat;
        logs.push('[App] AIChatComponent initialized');
        // Инициализация трекера времени
        logs.push('[App] Initializing TimeTracker...');
        window.timeTracker = timeTracker;
        logs.push('[App] TimeTracker initialized');
        // Инициализация менеджера автосохранений
        logs.push('[App] Initializing AutoSaveManager...');
        await autosaveManager.init();
        window.autosaveManager = autosaveManager;
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
    }
    catch (error) {
        logs.push('[App] Initialization error: ' + error.message);
        alert(logs.join('\n'));
    }
}
/**
 * Настройка глобальных обработчиков событий
 */
function setupGlobalEventListeners() {
    // Событие изменения зума
    document.addEventListener('zoom-change', ((event) => {
        const { delta } = event.detail;
        updateZoom(delta);
    }));
    // Событие изменения форматирования
    document.addEventListener('format-change', ((event) => {
        const { format } = event.detail;
        applyFormat(format);
    }));
    // Событие открытия AI панели
    document.addEventListener('ai-panel-open', () => {
        openAIPanel();
    });
    // Событие открытия панели настроек
    document.addEventListener('settings-panel-open', () => {
        openSettingsPanel();
    });
    // Событие действий от Ribbon (диаграммы, сортировка и т.д.)
    document.addEventListener('ribbon-action', ((event) => {
        const { action } = event.detail;
        handleRibbonAction(action);
    }));
    // Горячие клавиши
    document.addEventListener('keydown', handleKeyDown);
}
/**
 * Обновление зума
 */
function updateZoom(delta) {
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
function applyZoomToSpreadsheet() {
    const scale = state.zoom / 100;
    const BASE_CELL_WIDTH = 100;
    const BASE_CELL_HEIGHT = 32;
    const cellGrid = document.getElementById('cellGrid');
    if (cellGrid) {
        cellGrid.style.gridTemplateColumns =
            `repeat(26, ${BASE_CELL_WIDTH * scale}px)`;
    }
    // Сохраняем в localStorage
    localStorage.setItem('smarttable-zoom', state.zoom.toString());
}
/**
 * Применение форматирования
 */
function applyFormat(format) {
    console.log('[App] Applying format:', format);
    // Будет реализовано в SpreadsheetComponent
}
/**
 * Открытие AI панели
 */
function openAIPanel() {
    const aiPanel = document.getElementById('ai-panel-container');
    if (aiPanel) {
        aiPanel.classList.add('open');
    }
}
/**
 * Открытие панели настроек
 */
function openSettingsPanel() {
    if (settingsPanel) {
        settingsPanel.open();
    }
}
/**
 * Обработка горячих клавиш
 */
function handleKeyDown(event) {
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
function saveFile() {
    console.log('[App] Saving file...');
    // Будет реализовано в FileManager
}
/**
 * Отменить действие
 */
function undo() {
    console.log('[App] Undo');
}
/**
 * Повторить действие
 */
function redo() {
    console.log('[App] Redo');
}
/**
 * Переключение полного экрана
 */
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    }
    else {
        document.exitFullscreen();
    }
}
/**
 * Загрузка настроек
 */
function loadSettings() {
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
function saveSettings() {
    localStorage.setItem('smarttable-zoom', state.zoom.toString());
}
/**
 * Обработка действий от Ribbon
 */
function handleRibbonAction(action) {
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
function createChartFromSelection() {
    console.log('[App] Creating chart from selection...');
    // Получаем данные из renderer (глобальная функция)
    const getSelectedRangeData = window.getSelectedRangeData;
    if (typeof getSelectedRangeData === 'function') {
        const rangeData = getSelectedRangeData();
        if (rangeData && rangeData.labels && rangeData.labels.length > 0) {
            if (chartsWidget) {
                chartsWidget.createChartFromRange(rangeData, 'bar', 'Диаграмма по данным таблицы');
            }
        }
        else {
            alert('Сначала выделите диапазон ячеек с данными для создания диаграммы');
        }
    }
}
/**
 * Объединить ячейки
 */
function mergeCells() {
    console.log('[App] Merge cells...');
    const mergeCellsFunc = window.mergeCells;
    if (typeof mergeCellsFunc === 'function') {
        mergeCellsFunc();
    }
}
/**
 * Вставить строку
 */
function insertRow() {
    console.log('[App] Insert row...');
    const insertRowFunc = window.insertRow;
    if (typeof insertRowFunc === 'function') {
        insertRowFunc();
    }
}
/**
 * Удалить строку
 */
function deleteRow() {
    console.log('[App] Delete row...');
    const deleteRowFunc = window.deleteRow;
    if (typeof deleteRowFunc === 'function') {
        deleteRowFunc();
    }
}
/**
 * Вставить столбец
 */
function insertColumn() {
    console.log('[App] Insert column...');
    const insertColFunc = window.insertColumn;
    if (typeof insertColFunc === 'function') {
        insertColFunc();
    }
}
/**
 * Удалить столбец
 */
function deleteColumn() {
    console.log('[App] Delete column...');
    const deleteColFunc = window.deleteColumn;
    if (typeof deleteColFunc === 'function') {
        deleteColFunc();
    }
}
/**
 * Сортировать данные
 */
function sortData() {
    console.log('[App] Sort data...');
    const sortFunc = window.sortData;
    if (typeof sortFunc === 'function') {
        sortFunc();
    }
}
/**
 * Переключить фильтр
 */
function toggleFilter() {
    console.log('[App] Toggle filter...');
    const filterFunc = window.toggleFilter;
    if (typeof filterFunc === 'function') {
        filterFunc();
    }
}
/**
 * Очистка при закрытии
 */
function cleanup() {
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
}
else {
    initApp().catch(console.error);
}
// Очистка при выгрузке
window.addEventListener('beforeunload', cleanup);
// Глобальные функции для автосохранения
window.setupAutoSave = (getContentCallback) => {
    if (autosaveManager) {
        autosaveManager.setGetContentCallback(getContentCallback);
        autosaveManager.setOnSaveCallback(async (content) => {
            try {
                const result = await window.electronAPI.ipcRenderer.invoke('autosave-file', {
                    content,
                    filePath: null
                });
                if (!result.success) {
                    console.error('[App] AutoSave failed:', result.error);
                }
            }
            catch (error) {
                console.error('[App] AutoSave error:', error);
            }
        });
    }
};
window.markAutoSaveDirty = () => {
    if (autosaveManager) {
        autosaveManager.markDirty();
    }
};
window.markAutoSaveClean = () => {
    if (autosaveManager) {
        autosaveManager.markClean();
    }
};
// Экспорт для глобального доступа
window.SmartTable = {
    state,
    updateZoom,
    saveFile,
    undo,
    redo,
};
//# sourceMappingURL=app.js.map