/**
 * SmartTable App - главный файл приложения
 * Модульная архитектура на основе компонентов
 */
import { TopBarComponent } from './ui/components/TopBarComponent';
import { RibbonComponent } from './ui/components/RibbonComponent';
const state = {
    zoom: 100,
    currentFile: null,
    isModified: false,
};
// Компоненты приложения
let topBar = null;
let ribbon = null;
/**
 * Инициализация приложения
 */
function initApp() {
    console.log('[App] Initializing SmartTable...');
    try {
        // Инициализация компонентов
        topBar = new TopBarComponent();
        topBar.init();
        ribbon = new RibbonComponent();
        ribbon.init();
        // Глобальные обработчики событий
        setupGlobalEventListeners();
        // Загрузка сохраненных настроек
        loadSettings();
        console.log('[App] Initialization completed successfully');
    }
    catch (error) {
        console.error('[App] Initialization error:', error);
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
 * Очистка при закрытии
 */
function cleanup() {
    if (topBar) {
        topBar.destroy();
    }
    if (ribbon) {
        ribbon.destroy();
    }
}
// Инициализация при загрузке DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
}
else {
    initApp();
}
// Очистка при выгрузке
window.addEventListener('beforeunload', cleanup);
// Экспорт для глобального доступа
window.SmartTable = {
    state,
    updateZoom,
    saveFile,
    undo,
    redo,
};
//# sourceMappingURL=app.js.map