// Проверка загрузки скрипта
console.log('[Renderer] Script loaded!');
// Импорт функций для работы с формулами
import { calculateCellFormula as calcFormula, previewFormula, saveActiveCell, showFormulaSuggestions, hideFormulaSuggestions, handleFormulaSuggestionsKeydown } from './formulabar/formulas-renderer.js';
import { registerFormula, removeFormula, getDependentCells } from '../core/formulas/formula-dependencies.js';
import FocusManager from '../core/focus/FocusManager.js';
import KeyboardController from '../core/keyboard-controller.js';
// === КОНФИГУРАЦИЯ ===
const CONFIG = {
    ROWS: 100,
    COLS: 100,
    CELL_WIDTH: 100,
    CELL_HEIGHT: 32,
    HEADER_WIDTH: 50,
    HEADER_HEIGHT: 32,
};
// Переменные для virtual scrolling и кэширования
let visibleRange = {
    rowStart: 0,
    rowEnd: 0,
    colStart: 0,
    colEnd: 0
};
let renderScheduled = false;
let renderDebounceTimer = null;
// Кэш отрисованных ячеек для оптимизации
const cellCache = new Map();
// Ограничение размера кэша (макс 5000 ячеек в памяти)
const MAX_CACHED_CELLS = 5000;
// === СОСТОЯНИЕ ===
const state = {
    selectedCell: { row: 0, col: 0 },
    editingCell: { row: -1, col: -1 }, // Текущая редактируемая ячейка
    sheetsData: new Map(),
    sheets: [{ id: 1, name: 'Лист 1' }],
    currentSheet: 1,
    isEditing: false,
    selectionStart: null,
    selectionEnd: null,
    isSelecting: false,
    contextMenuCell: null,
    contextMenuSheet: null,
    aiDataCache: [],
    // Undo/Redo история
    undoStack: [],
    redoStack: [],
    // Валидация данных (dropdown списки)
    dataValidations: new Map(),
    // Условное форматирование
    conditionalFormats: [],
    // Реактивное обновление формул
    cellFormulas: new Map(), // ячейка -> формула
    // Фильтры и сортировка
    activeFilters: new Map(), // колонка -> фильтр
    activeSort: { column: null, direction: null },
    // Группировка
    groupedColumns: new Set(),
    // Поиск
    searchResults: new Set(), // ячейки которые найдены
    searchHighlight: false,
    // Буфер обмена
    clipboardHistory: [],
};
// Инициализировать значения по умолчанию
state.activeSort.column = null;
state.activeSort.direction = null;
// Инициализировать данные для первого листа
state.sheetsData.set(1, new Map());
// ==========================================
// === UNDO/REDO ФУНКЦИИ ===
// ==========================================
function pushUndo(key, oldValue) {
    const MAX_UNDO = 50;
    state.undoStack.push({ key, oldValue, newValue: state.sheetsData.get(state.currentSheet)?.get(key) });
    if (state.undoStack.length > MAX_UNDO) {
        state.undoStack.shift();
    }
    state.redoStack = []; // Очищаем redo при новом действии
    console.log('[Undo] Pushed to undo stack, size:', state.undoStack.length);
    // Автосохранение после каждого изменения
    autoSave();
}
function undo() {
    if (state.undoStack.length === 0) {
        console.log('[Undo] Nothing to undo');
        return;
    }
    const action = state.undoStack.pop();
    const data = getCurrentData();
    const currentValue = data.get(action.key);
    // Сохраняем текущее значение для redo
    state.redoStack.push({ key: action.key, oldValue: currentValue, newValue: action.oldValue });
    // Восстанавливаем старое значение
    if (action.oldValue) {
        data.set(action.key, action.oldValue);
    }
    else {
        data.delete(action.key);
    }
    console.log('[Undo] Undone:', action.key);
    renderCells();
    updateAIDataCache();
    updateFormulaBar();
    autoSave();
}
function redo() {
    if (state.redoStack.length === 0) {
        console.log('[Redo] Nothing to redo');
        return;
    }
    const action = state.redoStack.pop();
    const data = getCurrentData();
    // Сохраняем текущее значение для undo
    state.undoStack.push({ key: action.key, oldValue: data.get(action.key), newValue: action.newValue });
    // Восстанавливаем значение
    if (action.newValue) {
        data.set(action.key, action.newValue);
    }
    else {
        data.delete(action.key);
    }
    console.log('[Redo] Redone:', action.key);
    renderCells();
    updateAIDataCache();
    updateFormulaBar();
    autoSave();
}
// ==========================================
// === DATA VALIDATION (DROPDOWN) ===
// ==========================================
function setDataValidation(cellRef, values) {
    const match = cellRef.match(/^([A-Z]+)(\d+)$/i);
    if (!match)
        return;
    const col = match[1].toUpperCase().charCodeAt(0) - 65;
    const row = parseInt(match[2]) - 1;
    const key = getCellKey(row, col);
    state.dataValidations.set(key, { type: 'list', values });
    console.log('[DataValidation] Set for', cellRef, ':', values);
}
function getDataValidation(row, col) {
    const key = getCellKey(row, col);
    return state.dataValidations.get(key) || null;
}
function removeDataValidation(cellRef) {
    const match = cellRef.match(/^([A-Z]+)(\d+)$/i);
    if (!match)
        return;
    const col = match[1].toUpperCase().charCodeAt(0) - 65;
    const row = parseInt(match[2]) - 1;
    const key = getCellKey(row, col);
    state.dataValidations.delete(key);
}
// Рендеринг dropdown для ячейки
function renderCellDropdown(cell, row, col) {
    const validation = getDataValidation(row, col);
    if (!validation || validation.type !== 'list')
        return;
    // Добавляем индикатор dropdown
    cell.style.position = 'relative';
    const arrow = document.createElement('span');
    arrow.innerHTML = '▼';
    arrow.style.cssText = 'position:absolute;right:2px;top:50%;transform:translateY(-50%);font-size:10px;color:#666;pointer-events:none;';
    cell.appendChild(arrow);
}
// Показ dropdown списка
function showDropdownList(event, cell, row, col, values) {
    event.stopPropagation();
    // Удаляем предыдущий dropdown если есть
    const existing = document.getElementById('cell-dropdown-list');
    if (existing)
        existing.remove();
    // Создаём dropdown
    const dropdown = document.createElement('div');
    dropdown.id = 'cell-dropdown-list';
    dropdown.style.cssText = `
    position:fixed;
    z-index:10000;
    background:white;
    border:1px solid #ddd;
    border-radius:4px;
    box-shadow:0 2px 8px rgba(0,0,0,0.15);
    max-height:200px;
    overflow-y:auto;
    min-width:150px;
  `;
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
    // Закрыть при клике вне
    setTimeout(() => {
        document.addEventListener('click', function closeDropdown() {
            dropdown.remove();
            document.removeEventListener('click', closeDropdown);
        });
    }, 100);
}
/**
 * Автосохранение данных таблицы
 * Использует AutoSaveManager если доступен, иначе сохраняет в localStorage
 */
function autoSave() {
    try {
        const dataToSave = {};
        const currentData = getCurrentData();
        currentData.forEach((value, key) => {
            dataToSave[key] = value;
        });
        // Помечаем как измененное для AutoSaveManager
        if (window.markAutoSaveDirty) {
            window.markAutoSaveDirty();
        }
        // Сохраняем в localStorage для резервного копирования
        localStorage.setItem('smarttable-autosave', JSON.stringify({
            sheetsData: dataToSave,
            currentSheet: state.currentSheet,
            timestamp: Date.now()
        }));
    }
    catch (e) {
        console.error('[AutoSave] Error:', e);
    }
}
function autoLoad() {
    try {
        const saved = localStorage.getItem('smarttable-autosave');
        const currentData = getCurrentData();
        currentData.clear();
        if (saved) {
            const data = JSON.parse(saved);
            // Загружаем sheetsData
            if (data.sheetsData) {
                Object.keys(data.sheetsData).forEach(sheetKey => {
                    const sheetData = data.sheetsData[sheetKey];
                    const sheetMap = new Map();
                    if (typeof sheetData === 'object') {
                        Object.keys(sheetData).forEach(cellKey => {
                            sheetMap.set(cellKey, sheetData[cellKey]);
                            // ✅ Восстанавливаем формулы из loaded data
                            const cellData = sheetData[cellKey];
                            if (cellData.formula) {
                                state.cellFormulas.set(cellKey, cellData.formula);
                                // Регистрируем формулу в системе зависимостей
                                registerFormula(cellKey, cellData.formula, (ref, formula) => {
                                    state.cellFormulas.set(ref, formula);
                                });
                            }
                        });
                    }
                    state.sheetsData.set(parseInt(sheetKey), sheetMap);
                });
            }
            else if (data.cells) {
                Object.keys(data.cells).forEach(key => {
                    currentData.set(key, data.cells[key]);
                    // ✅ Восстанавливаем формулы из loaded data
                    const cellData = data.cells[key];
                    if (cellData.formula) {
                        state.cellFormulas.set(key, cellData.formula);
                        // Регистрируем формулу в системе зависимостей
                        registerFormula(key, cellData.formula, (ref, formula) => {
                            state.cellFormulas.set(ref, formula);
                        });
                    }
                });
            }
            state.currentSheet = data.currentSheet || 1;
            if (data.fileName) {
                updateFileNameInHeader(data.fileName);
            }
        }
        // ПРИНУДИТЕЛЬНО очищаем dataValidations при каждой загрузке
        state.dataValidations.clear();
        renderCells();
        updateAIDataCache();
    }
    catch (e) {
        console.error('[AutoLoad] Error:', e);
    }
}
function updateFileNameInHeader(fileName) {
    // Обновляем имя файла в TopBar
    const topBar = document.querySelector('#fileName');
    if (topBar) {
        topBar.textContent = fileName;
    }
    console.log('[AutoLoad] File name updated in header:', fileName);
}
// Очистить всё состояние и localStorage
function clearAllState() {
    localStorage.removeItem('smarttable-autosave');
    localStorage.removeItem('smarttable-data-validations');
    state.sheetsData.clear();
    state.sheetsData.set(1, new Map());
    state.dataValidations.clear();
    state.currentSheet = 1;
    state.selectedCell = { row: 0, col: 0 };
    state.undoStack = [];
    state.redoStack = [];
    state.aiDataCache = [];
    renderCells();
    updateAIDataCache();
}
// Очистить только dataValidations
function clearAllDataValidations() {
    state.dataValidations.clear();
    renderCells();
}
/**
 * Очистить все обработчики событий и ресурсы
 * Предотвращает утечки памяти при закрытии приложения
 */
function cleanupEventListeners() {
    // Очищаем основные обработчики
    elements.cellGridWrapper.replaceWith(elements.cellGridWrapper.cloneNode(true));
    // Сбрасываем ссылки на элементы (будут пересозданы при следующей инициализации)
    // Это предотвращает удержание ссылок на удалённые DOM элементы
}
/**
 * Очистить всё состояние и ресурсы
 */
function cleanup() {
    cleanupEventListeners();
    clearAllState();
    // Очищаем таймеры
    if (ipcRenderer) {
        ipcRenderer.removeAllListeners('close-app');
        ipcRenderer.removeAllListeners('export');
    }
}
console.log('[Renderer] Config and State initialized!');
// Глобальный ipcRenderer
let ipcRenderer;
// Контроллер клавиатуры
let keyboardController;
// Режим ИИ: 'assistant' или 'agent'
let aiMode = 'assistant';
let pendingModeSwitch = null;
// История чата для контекста
let chatHistory = [];
// Последний план выполнения для кнопки подтверждения
let lastExecutionPlan = [];
// Очистить историю чата
function clearChatHistory() {
    chatHistory = [];
    lastExecutionPlan = [];
    console.log('[AI] Chat history cleared');
}
// Функция для обновления кэша ИИ
function updateAIDataCache() {
    const data = getCurrentData();
    state.aiDataCache = [];
    data.forEach((cellData, key) => {
        const [row, col] = key.split('-').map(Number);
        if (cellData.value) {
            state.aiDataCache.push({ row, col, value: cellData.value });
        }
    });
    // Сортируем по строкам и столбцам
    state.aiDataCache.sort((a, b) => {
        if (a.row !== b.row)
            return a.row - b.row;
        return a.col - b.col;
    });
}
// === ГЛОБАЛЬНЫЙ INPUT ДЛЯ РЕДАКТИРОВАНИЯ ===
let globalCellInput = null;
function getGlobalCellInput() {
    if (!globalCellInput) {
        globalCellInput = document.getElementById('global-cell-input');
    }
    return globalCellInput;
}
// === DOM ЭЛЕМЕНТЫ ===
let elements;
function initElements() {
    elements = {
        columnHeaders: document.getElementById('columnHeaders'),
        rowHeaders: document.getElementById('rowHeaders'),
        cellGrid: document.getElementById('cellGrid'),
        cellReference: document.getElementById('cellReference'),
        formulaInput: document.getElementById('formulaInput'),
        cellGridWrapper: document.getElementById('cellGridWrapper'),
        sheetsList: document.getElementById('sheetsList'),
        btnAddSheet: document.getElementById('btnAddSheet'),
        contextMenu: document.getElementById('contextMenu'),
        formulaSuggestions: document.getElementById('formulaSuggestions'),
        formulaSuggestionsList: document.getElementById('formulaSuggestionsList'),
        zoomLabel: document.getElementById('zoomLabel'),
        btnZoomIn: document.getElementById('btnZoomIn'),
        btnZoomOut: document.getElementById('btnZoomOut'),
        aiPanel: document.getElementById('aiPanel'),
        btnAI: document.getElementById('btnAI'),
        btnCloseAI: document.getElementById('btnCloseAI'),
        btnClearChat: document.getElementById('btnClearChat'),
        btnAiSend: document.getElementById('btnAiSend'),
        aiInput: document.getElementById('aiInput'),
        aiChat: document.getElementById('aiChat'),
        btnBold: document.getElementById('btnBold'),
        btnItalic: document.getElementById('btnItalic'),
        btnUnderline: document.getElementById('btnUnderline'),
        btnStrike: document.getElementById('btnStrike'),
        btnBorders: document.getElementById('btnBorders'),
        btnToggleFormulaBar: document.getElementById('btnToggleFormulaBar'),
        textColor: document.getElementById('textColor'),
        fillColor: document.getElementById('fillColor'),
        fontFamily: document.getElementById('fontFamily'),
        fontSize: document.getElementById('fontSize'),
        numberFormat: document.getElementById('numberFormat'),
    };
    console.log('[Renderer] Elements initialized:', {
        columnHeaders: !!elements.columnHeaders,
        rowHeaders: !!elements.rowHeaders,
        cellGrid: !!elements.cellGrid,
    });
}
// === УТИЛИТЫ ===
function colToLetter(col) {
    let letter = '';
    let n = col + 1; // Excel использует 1-индексацию
    while (n > 0) {
        n--;
        letter = String.fromCharCode(65 + (n % 26)) + letter;
        n = Math.floor(n / 26);
    }
    return letter;
}
/**
 * Преобразовать буквы в номер колонки (A → 0, B → 1, AA → 26, и т.д.)
 */
function letterToCol(letter) {
    let col = 0;
    const upper = letter.toUpperCase();
    for (let i = 0; i < upper.length; i++) {
        col = col * 26 + (upper.charCodeAt(i) - 64);
    }
    return col - 1; // Excel использует 1-индексацию, мы используем 0
}
function getCellId(row, col) {
    return `${colToLetter(col)}${row + 1}`;
}
function getCellKey(row, col) {
    return `${row}-${col}`;
}
function getCurrentData() {
    return state.sheetsData.get(state.currentSheet) || new Map();
}
// === ИНИЦИАЛИЗАЦИЯ ===
async function init() {
    console.log('[Renderer] init() called');
    // Рендерим формулу бар в контейнер
    const formulaBarContainer = document.getElementById('formula-bar-container');
    if (formulaBarContainer) {
        formulaBarContainer.innerHTML = `
      <div class="formula-bar" id="formulaBar">
        <div class="cell-reference" id="cellReference">A1</div>
        <div class="formula-divider"></div>
        <button class="btn-formula" id="btnFormula">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
        <div class="formula-input-wrapper">
          <span class="formula-icon">fx</span>
          <input type="text" class="formula-input" id="formulaInput" placeholder="">
        </div>
      </div>
    `;
        // Показываем формула бар по умолчанию
        formulaBarContainer.classList.add('visible');
        console.log('[Renderer] Formula bar HTML rendered');
    }
    // Загружаем AI панель из шаблона
    const aiPanelContainer = document.getElementById('ai-panel-container');
    if (aiPanelContainer) {
        try {
            // Используем абсолютный путь для Electron
            const basePath = window.location.href.includes('index.html')
                ? window.location.href.substring(0, window.location.href.lastIndexOf('/')) + '/'
                : './';
            const response = await fetch(basePath + 'ui/templates/ai-panel.html');
            if (response.ok) {
                aiPanelContainer.innerHTML = await response.text();
                console.log('[Renderer] AI panel template loaded');
            }
            else {
                console.log('[Renderer] AI panel template not found, using inline');
                // Fallback - использовать inline HTML
                aiPanelContainer.innerHTML = `<div class="ai-panel">...</div>`;
            }
        }
        catch (e) {
            console.log('[Renderer] Error loading AI panel template, using defaults');
        }
    }
    // Инициализируем DOM элементы (после загрузки шаблонов)
    initElements();
    console.log('[Renderer] initElements() done');
    // ==========================================
    // === ИНИЦИАЛИЗАЦИЯ FOCUS MANAGER ===
    // ==========================================
    FocusManager.init({
        getCellByCoords: (row, col) => {
            return getCellElement(row, col);
        },
        containerSelector: '#cellGridWrapper'
    });
    console.log('[Renderer] FocusManager initialized');
    // ==========================================
    // Рендерим таблицу
    renderColumnHeaders();
    renderRowHeaders();
    renderFixedColumnHeaders();
    renderFixedRowHeaders();
    renderCells();
    // Автозагрузка сохранённых данных (после рендеринга!)
    autoLoad();
    try {
        // Получаем ipcRenderer через contextBridge
        const electronAPI = window.electronAPI;
        if (electronAPI?.ipcRenderer) {
            ipcRenderer = electronAPI.ipcRenderer;
        }
        else if (window.require) {
            // Fallback для прямой загрузки
            const electron = window.require('electron');
            if (electron?.ipcRenderer) {
                ipcRenderer = electron.ipcRenderer;
            }
        }
    }
    catch (e) {
        console.error('[Renderer] Error:', e.message);
    }
    // Регистрируем обработчик закрытия приложения ПОСЛЕ инициализации ipcRenderer
    if (ipcRenderer) {
        console.log('[Renderer] Registering close-app handler');
        ipcRenderer.on('close-app', async () => {
            console.log('[Renderer] Received close-app event');
            try {
                const shouldSave = await showSaveDialog();
                console.log('[Renderer] User chose to save:', shouldSave);
                if (shouldSave) {
                    await exportToXLSXWithDialog();
                    console.log('[Renderer] File saved, closing app');
                    // Отправляем ответ main процессу что можно закрывать
                    ipcRenderer.send('close-app-response');
                }
                else {
                    console.log('[Renderer] User chose not to save, clearing state and closing');
                    clearAllState();
                    // Отправляем ответ main процессу что можно закрывать
                    ipcRenderer.send('close-app-response');
                }
            }
            catch (error) {
                console.error('[Renderer] Error during close:', error);
                // В случае ошибки всё равно закрываем
                ipcRenderer.send('close-app-response');
            }
        });
        // Обработчик экспорта из главного меню
        ipcRenderer.on('export', (event, format) => {
            exportData(format);
        });
        // Обработчик очистки кэша из хаба
        ipcRenderer.on('clear-cache', async () => {
            console.log('[Renderer] Received clear-cache event from hub');
            try {
                // Завершаем редактирование если оно активно
                if (state.isEditing) {
                    finishEditing();
                }
                // Очищаем всё состояние
                clearAllState();
                // Очищаем localStorage полностью
                localStorage.removeItem('smarttable-autosave');
                localStorage.removeItem('smarttable-data-validations');
                // Перерендериваем таблицу
                renderCells();
                updateAIDataCache();
                updateCellReference();
                console.log('[Renderer] Cache cleared and table reinitialized');
            }
            catch (error) {
                console.error('[Renderer] Error during cache clearing:', error);
            }
        });
    }
    else {
        console.warn('[Renderer] ipcRenderer not initialized, close-app handler not registered');
    }
    console.log('[Renderer] Starting setupEventListeners');
    setupEventListeners();
    console.log('[Renderer] Starting setupKeyboardController');
    setupKeyboardController();
    console.log('[Renderer] Starting updateCellReference');
    updateCellReference();
    // Инициализируем UI режима ИИ
    updateModeUI();
    // Инициализация автосохранения
    const getTableData = () => {
        const dataToSave = {};
        const currentData = getCurrentData();
        currentData.forEach((value, key) => {
            dataToSave[key] = value;
        });
        return JSON.stringify({
            sheetsData: dataToSave,
            currentSheet: state.currentSheet,
            timestamp: Date.now()
        });
    };
    if (window.setupAutoSave) {
        window.setupAutoSave(getTableData);
        console.log('[Renderer] AutoSave initialized');
    }
    console.log('[Renderer] init() completed');
}
// === РЕНДЕРИНГ ===
function renderColumnHeaders() {
    elements.columnHeaders.innerHTML = '';
    for (let col = 0; col < CONFIG.COLS; col++) {
        const header = document.createElement('div');
        header.className = 'column-header';
        header.textContent = colToLetter(col);
        header.dataset.col = col.toString();
        header.addEventListener('click', () => selectColumn(col));
        elements.columnHeaders.appendChild(header);
    }
}
function renderFixedColumnHeaders() {
    const fixedHeaders = document.getElementById('fixedColumnHeaders');
    if (!fixedHeaders)
        return;
    fixedHeaders.innerHTML = '';
    // Фиксируем первые 5 столбцов (A-E)
    const fixedCols = Math.min(5, CONFIG.COLS);
    for (let col = 0; col < fixedCols; col++) {
        const header = document.createElement('div');
        header.className = 'fixed-column-header';
        header.textContent = colToLetter(col);
        header.dataset.col = col.toString();
        header.style.width = `${CONFIG.CELL_WIDTH}px`;
        header.addEventListener('click', () => selectColumn(col));
        fixedHeaders.appendChild(header);
    }
}
function renderRowHeaders() {
    elements.rowHeaders.innerHTML = '';
    for (let row = 0; row < CONFIG.ROWS; row++) {
        const header = document.createElement('div');
        header.className = 'row-header';
        header.textContent = (row + 1).toString();
        header.dataset.row = row.toString();
        header.addEventListener('click', () => selectRow(row));
        elements.rowHeaders.appendChild(header);
    }
}
function renderFixedRowHeaders() {
    const fixedHeaders = document.getElementById('fixedRowHeaders');
    if (!fixedHeaders)
        return;
    fixedHeaders.innerHTML = '';
    // Фиксируем первые 5 строк (1-5)
    const fixedRows = Math.min(5, CONFIG.ROWS);
    for (let row = 0; row < fixedRows; row++) {
        const header = document.createElement('div');
        header.className = 'fixed-row-header';
        header.textContent = (row + 1).toString();
        header.dataset.row = row.toString();
        header.style.height = `${CONFIG.CELL_HEIGHT}px`;
        header.addEventListener('click', () => selectRow(row));
        fixedHeaders.appendChild(header);
    }
}
function syncFixedHeaders() {
    const fixedColumnHeaders = document.getElementById('fixedColumnHeaders');
    const fixedRowHeaders = document.getElementById('fixedRowHeaders');
    const scrollLeft = elements.cellGridWrapper.scrollLeft;
    const scrollTop = elements.cellGridWrapper.scrollTop;
    // Скрываем фиксированные заголовки когда прокрутка больше 0
    if (fixedColumnHeaders) {
        fixedColumnHeaders.style.display = scrollLeft > 0 ? 'flex' : 'none';
    }
    if (fixedRowHeaders) {
        fixedRowHeaders.style.display = scrollTop > 0 ? 'flex' : 'none';
    }
}
function renderCells() {
    if (renderScheduled)
        return;
    renderScheduled = true;
    // Используем requestAnimationFrame для плавности
    requestAnimationFrame(() => {
        renderScheduled = false;
        renderVisibleCells();
        // Очищаем старые ячейки из кэша
        cleanupCellCache();
    });
}
// Очистка старых ячеек из кэша
function cleanupCellCache() {
    if (cellCache.size > MAX_CACHED_CELLS) {
        const now = Date.now();
        const toDelete = [];
        cellCache.forEach((cached, key) => {
            // Удаляем если не использовались больше 30 секунд
            if (now - cached.lastUsed > 30000) {
                toDelete.push(key);
            }
        });
        // Удаляем половину самых старых
        toDelete.sort((a, b) => {
            const aTime = cellCache.get(a).lastUsed;
            const bTime = cellCache.get(b).lastUsed;
            return aTime - bTime;
        });
        const deleteCount = Math.floor(toDelete.length / 2);
        for (let i = 0; i < deleteCount; i++) {
            cellCache.delete(toDelete[i]);
        }
    }
}
// Вычисление хэша стиля для кэширования
function hashStyle(style) {
    if (!style)
        return '';
    return JSON.stringify(style).split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0).toString(36);
}
function renderVisibleCells() {
    // Сохраняем текущее выделение
    const selectedCells = Array.from(elements.cellGrid.querySelectorAll('.cell.selected'))
        .map(cell => {
        const el = cell;
        return {
            row: parseInt(el.dataset.row || '0'),
            col: parseInt(el.dataset.col || '0')
        };
    });
    const data = getCurrentData();
    const fragment = document.createDocumentFragment();
    // Вычисляем видимый диапазон
    calculateVisibleRange();
    // Рендерим только видимые ячейки + буфер
    const buffer = 3;
    const rowStart = Math.max(0, visibleRange.rowStart - buffer);
    const rowEnd = Math.min(CONFIG.ROWS, visibleRange.rowEnd + buffer);
    const colStart = Math.max(0, visibleRange.colStart - buffer);
    const colEnd = Math.min(CONFIG.COLS, visibleRange.colEnd + buffer);
    // Устанавливаем размеры сетки для правильного скролла
    elements.cellGrid.style.width = `${CONFIG.COLS * CONFIG.CELL_WIDTH}px`;
    elements.cellGrid.style.height = `${CONFIG.ROWS * CONFIG.CELL_HEIGHT}px`;
    elements.cellGrid.style.position = 'relative';
    elements.cellGrid.style.display = 'block';
    for (let row = rowStart; row < rowEnd; row++) {
        for (let col = colStart; col < colEnd; col++) {
            // ⚠️ ВАЖНО: Пропускаем редактируемую ячейку - на нее наложен input!
            if (state.editingCell.row === row && state.editingCell.col === col) {
                continue;
            }
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row.toString();
            cell.dataset.col = col.toString();
            cell.tabIndex = -1;
            // Абсолютное позиционирование
            cell.style.position = 'absolute';
            cell.style.left = `${col * CONFIG.CELL_WIDTH}px`;
            cell.style.top = `${row * CONFIG.CELL_HEIGHT}px`;
            cell.style.width = `${CONFIG.CELL_WIDTH}px`;
            cell.style.height = `${CONFIG.CELL_HEIGHT}px`;
            // Загрузка данных
            const key = getCellKey(row, col);
            const cellData = data.get(key);
            if (cellData) {
                cell.textContent = cellData.value;
                // Применяем сохраненные стили
                if (cellData.style) {
                    Object.entries(cellData.style).forEach(([prop, value]) => {
                        if (value !== undefined && value !== null && value !== '' &&
                            prop !== 'merged' && prop !== 'rowspan' && prop !== 'colspan' &&
                            prop !== 'gridColumnStart' && prop !== 'gridRowStart') {
                            cell.style[prop] = value;
                        }
                    });
                    // Если ячейка объединённая
                    if (cellData.style.merged) {
                        if (cellData.style.colspan) {
                            cell.style.width = `${cellData.style.colspan * CONFIG.CELL_WIDTH}px`;
                        }
                        if (cellData.style.rowspan) {
                            cell.style.height = `${cellData.style.rowspan * CONFIG.CELL_HEIGHT}px`;
                        }
                    }
                    // Перенос текста
                    if (cellData.style.wrapText) {
                        cell.style.whiteSpace = 'normal';
                        cell.style.wordWrap = 'break-word';
                        cell.style.overflow = 'visible';
                        cell.style.lineHeight = '1.2';
                    }
                    // Ссылка
                    if (cellData.style.hyperlink) {
                        cell.style.color = '#0066cc';
                        cell.style.textDecoration = 'underline';
                        cell.style.cursor = 'pointer';
                        cell.addEventListener('click', (e) => {
                            e.stopPropagation();
                            window.open(cellData.style.hyperlink, '_blank', 'noopener,noreferrer');
                        });
                    }
                    // Изображение в ячейке
                    if (cellData.style.backgroundImage) {
                        cell.style.backgroundImage = cellData.style.backgroundImage;
                        cell.style.backgroundSize = cellData.style.backgroundSize || 'contain';
                        cell.style.backgroundRepeat = cellData.style.backgroundRepeat || 'no-repeat';
                        cell.style.backgroundPosition = cellData.style.backgroundPosition || 'center';
                        cell.textContent = ''; // Убираем текст
                    }
                }
            }
            // Проверка data validation
            const validation = getDataValidation(row, col);
            if (validation && validation.type === 'list') {
                cell.style.cursor = 'pointer';
                cell.dataset.hasDropdown = 'true';
                renderCellDropdown(cell, row, col);
            }
            fragment.appendChild(cell);
        }
    }
    elements.cellGrid.innerHTML = '';
    elements.cellGrid.appendChild(fragment);
    // Восстанавливаем выделение
    selectedCells.forEach(({ row, col }) => {
        const cell = getCellElement(row, col);
        if (cell) {
            cell.classList.add('selected');
        }
    });
    // Обновляем заголовки
    updateSelectionHeaders();
}
function calculateVisibleRange() {
    const scrollLeft = elements.cellGridWrapper.scrollLeft;
    const scrollTop = elements.cellGridWrapper.scrollTop;
    const viewportWidth = elements.cellGridWrapper.clientWidth;
    const viewportHeight = elements.cellGridWrapper.clientHeight;
    visibleRange.colStart = Math.floor(scrollLeft / CONFIG.CELL_WIDTH);
    visibleRange.colEnd = Math.ceil((scrollLeft + viewportWidth) / CONFIG.CELL_WIDTH);
    visibleRange.rowStart = Math.floor(scrollTop / CONFIG.CELL_HEIGHT);
    visibleRange.rowEnd = Math.ceil((scrollTop + viewportHeight) / CONFIG.CELL_HEIGHT);
}
// === ВЫДЕЛЕНИЕ ЯЧЕЕК ===
function updateSelectionHeaders() {
    const rowHeader = elements.rowHeaders.querySelector(`.row-header[data-row="${state.selectedCell.row}"]`);
    if (rowHeader) {
        rowHeader.classList.add('selected');
    }
    const colHeader = elements.columnHeaders.querySelector(`.column-header[data-col="${state.selectedCell.col}"]`);
    if (colHeader) {
        colHeader.classList.add('selected');
    }
}
// Для отслеживания повторного клика по той же ячейке
let lastSelectedCell = null;
let lastSelectTime = 0;
function selectCell(row, col) {
    // Завершить редактирование если оно идет и переключились на другую ячейку
    if (state.isEditing) {
        const isDifferentCell = state.editingCell.row !== row || state.editingCell.col !== col;
        if (isDifferentCell) {
            finishEditing();
        }
    }
    // Не снимать выделение если идет выделение диапазона
    if (!state.isSelecting) {
        elements.cellGrid.querySelectorAll('.cell.selected').forEach(cell => {
            cell.classList.remove('selected');
        });
    }
    const prevRowHeader = elements.rowHeaders.querySelector('.row-header.selected');
    if (prevRowHeader) {
        prevRowHeader.classList.remove('selected');
    }
    const prevColHeader = elements.columnHeaders.querySelector('.column-header.selected');
    if (prevColHeader) {
        prevColHeader.classList.remove('selected');
    }
    // Выделить новую ячейку
    state.selectedCell = { row, col };
    const cell = getCellElement(row, col);
    if (cell) {
        cell.classList.add('selected');
        cell.focus();
        // Сообщить Focus Manager об активной ячейке
        FocusManager.setActiveCell(cell, { row, col });
    }
    // Сохранить активную ячейку для Focus Manager
    saveActiveCell(row, col);
    // Выделить заголовки
    const rowHeader = elements.rowHeaders.querySelector(`.row-header[data-row="${row}"]`);
    if (rowHeader) {
        rowHeader.classList.add('selected');
    }
    const colHeader = elements.columnHeaders.querySelector(`.column-header[data-col="${col}"]`);
    if (colHeader) {
        colHeader.classList.add('selected');
    }
    updateCellReference();
    updateFormulaBar();
    // Обновить fill handle
    const fillHandle = document.getElementById('fillHandle');
    if (fillHandle) {
        const rect = cell?.getBoundingClientRect();
        if (rect) {
            fillHandle.style.display = 'block';
            fillHandle.style.left = `${rect.right - 4}px`;
            fillHandle.style.top = `${rect.bottom - 4}px`;
        }
    }
    // Запомнить последнюю выделенную ячейку для double-click
    lastSelectedCell = { row, col };
    lastSelectTime = Date.now();
}
function selectRow(row) {
    for (let col = 0; col < CONFIG.COLS; col++) {
        selectCell(row, col);
    }
}
function selectColumn(col) {
    for (let row = 0; row < CONFIG.ROWS; row++) {
        const cell = getCellElement(row, col);
        if (cell) {
            cell.classList.add('selected');
        }
    }
    state.selectedCell.col = col;
    updateCellReference();
}
function getCellElement(row, col) {
    // Ищем по data-атрибутам вместо индекса
    return elements.cellGrid.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
}
// === РЕДАКТИРОВАНИЕ (ГЛОБАЛЬНЫЙ INPUT) ===
function editCell(row, col, selectAll = true) {
    const cell = getCellElement(row, col);
    if (!cell)
        return;
    const input = getGlobalCellInput();
    const data = getCurrentData();
    const key = getCellKey(row, col);
    const cellData = data.get(key);
    // Установить значение в input
    input.value = cellData?.value || '';
    // Позиционировать input над ячейкой с учетом скролла
    const wrapper = elements.cellGridWrapper;
    // Координаты ячейки: row * hauteur + column * largeur
    const cellLeft = col * CONFIG.CELL_WIDTH;
    const cellTop = row * CONFIG.CELL_HEIGHT;
    // Позиция относительно скролл-контейнера (с учетом скролла)
    const posLeft = cellLeft - wrapper.scrollLeft;
    const posTop = cellTop - wrapper.scrollTop;
    input.style.left = posLeft + 'px';
    input.style.top = posTop + 'px';
    input.style.width = CONFIG.CELL_WIDTH + 'px';
    input.style.height = CONFIG.CELL_HEIGHT + 'px';
    input.style.font = window.getComputedStyle(cell).font;
    // Добавить класс для показа input
    input.classList.add('editing');
    // Запомнить редактируемую ячейку
    state.editingCell = { row, col };
    state.isEditing = true;
    // Добавить класс к ячейке для визуальной подсветки
    cell.classList.add('editing');
    // Удалить старый input listener если есть
    if (input._currentInputHandler) {
        input.removeEventListener('input', input._currentInputHandler);
    }
    // ✅ LIVE FORMULA HANDLER - реактивное обновление при вводе
    const handleFormulaInput = () => {
        const currentValue = input.value;
        // Если это формула, показать live preview
        if (currentValue.startsWith('=')) {
            const result = previewFormula(currentValue, (cellRef) => {
                const match = cellRef.match(/^([A-Z]+)(\d+)$/i);
                if (!match)
                    return '';
                const refCol = letterToCol(match[1]);
                const refRow = parseInt(match[2]) - 1;
                const refKey = getCellKey(refRow, refCol);
                const cellData = data.get(refKey);
                return cellData?.value || '';
            });
            console.log(`[Live Formula] Input: "${currentValue}" → Result: ${result.value}`);
        }
        // Обновить formula bar с live preview
        updateFormulaBar();
    };
    input.addEventListener('input', handleFormulaInput);
    input._currentInputHandler = handleFormulaInput;
    // Focus и выделение текста
    input.focus();
    if (selectAll) {
        input.select();
    }
    updateFormulaBar();
}
function finishEditing(save = true) {
    if (state.editingCell.row === -1)
        return; // Нет редактируемой ячейки
    const input = getGlobalCellInput();
    const { row, col } = state.editingCell;
    const cell = getCellElement(row, col);
    if (!cell) {
        resetEditing();
        return;
    }
    state.isEditing = false;
    cell.classList.remove('editing');
    input.classList.remove('editing');
    if (save) {
        // Сохранить данные
        const key = getCellKey(row, col);
        const inputValue = input.value;
        const data = getCurrentData();
        const oldValue = data.get(key);
        // ✅ НОВАЯ ЛОГИКА: Разделяем формулу и результат
        let finalValue = inputValue; // То что будет отображаться в ячейке
        let isFormula = false;
        if (inputValue.startsWith('=')) {
            isFormula = true;
            const result = previewFormula(inputValue, (cellRef) => {
                const match = cellRef.match(/^([A-Z]+)(\d+)$/i);
                if (!match)
                    return '';
                const refCol = letterToCol(match[1]);
                const refRow = parseInt(match[2]) - 1;
                const cellKey = getCellKey(refRow, refCol);
                const cellData = data.get(cellKey);
                return cellData?.value || '';
            });
            finalValue = String(result.value);
            // Обработка формулы COLOR
            if (result.value === '#COLOR_COMMAND' && result.colorName) {
                applyColorFromFormula(result, data);
                finalValue = ''; // COLOR не отображает значение в ячейке
            }
            // Зарегистрировать формулу для реактивного обновления
            removeFormula(key);
            registerFormula(key, inputValue, (ref, formula) => {
                state.cellFormulas.set(ref, formula);
                console.log(`[Formulas] Registered: ${ref} = ${formula}`);
            });
            state.cellFormulas.set(key, inputValue);
        }
        else {
            // Если ввели обычное значение, удалить формулу
            removeFormula(key);
            if (state.cellFormulas.has(key)) {
                state.cellFormulas.delete(key);
            }
        }
        // ✅ Сохраняем в data:
        // - value: результат для отображения в ячейке
        // - formula: саму формулу для показа в formula bar
        const cellDataToSave = {
            value: finalValue,
            ...(isFormula && { formula: inputValue }), // Сохраняем формулу если это формула
            ...oldValue // Сохраняем прежние стили и другие поля
        };
        if (finalValue || isFormula) {
            data.set(key, cellDataToSave);
        }
        else {
            data.delete(key);
        }
        pushUndo(key, oldValue);
        updateAIDataCache();
        updateFormulaBar();
        // ✅ Пересчитать зависимые ячейки
        recalculateDependentCells(key, data);
        updateSingleCell(row, col);
        // Автоподбор ширины если включен
        const autoFitEnabled = localStorage.getItem('smarttable-auto-fit-columns') === 'true';
        if (autoFitEnabled && finalValue) {
            autoFitColumn(col);
        }
        // Сохраняем данные в localStorage
        autoSave();
    }
    resetEditing();
}
function resetEditing() {
    const input = getGlobalCellInput();
    input.value = '';
    input.classList.remove('editing');
    state.editingCell = { row: -1, col: -1 };
    state.isEditing = false;
    // Убрать класс editing со всех ячеек
    elements.cellGrid.querySelectorAll('.cell.editing').forEach(cell => {
        cell.classList.remove('editing');
    });
}
// === РЕДАКТИРОВАНИЕ (СТАРЫЕ ФУНКЦИИ - УДАЛЕНЫ) ===
/**
 * Реактивное пересчитывание зависимых ячеек
 */
function recalculateDependentCells(changedCellKey, data) {
    // Получаем все ячейки, которые зависят от только что измененной ячейки
    const dependents = getDependentCells(changedCellKey);
    console.log(`[Formulas] Recalculating dependents of ${changedCellKey}:`, dependents);
    for (const depKey of dependents) {
        // ✅ Получаем формулу из cellData (более надежно чем state.cellFormulas)
        const depCellData = data.get(depKey);
        const formula = depCellData?.formula || state.cellFormulas.get(depKey);
        if (!formula || !formula.startsWith('=')) {
            continue; // Пропускаем, если это не формула
        }
        // Разобрать ключ на row и col
        const [row, col] = depKey.split('-').map(Number);
        console.log(`[Formulas] Recalculating ${depKey} (${colToLetter(col)}${row + 1}): ${formula}`);
        // Пересчитываем формулу
        const result = previewFormula(formula, (cellRef) => {
            const match = cellRef.match(/^([A-Z]+)(\d+)$/i);
            if (!match)
                return '';
            const refCol = letterToCol(match[1]);
            const refRow = parseInt(match[2]) - 1;
            const refKey = getCellKey(refRow, refCol);
            const cellData = data.get(refKey);
            return cellData?.value || '';
        });
        const finalValue = String(result.value);
        // ✅ Обновляем значение в ячейке, сохраняя формулу
        if (finalValue || formula) {
            const updatedData = {
                value: finalValue,
                formula: formula, // Сохраняем формулу
                ...(depCellData?.style && { style: depCellData.style }) // Сохраняем стили если есть
            };
            data.set(depKey, updatedData);
        }
        else {
            data.delete(depKey);
        }
        // Обновить ячейку на экране
        updateSingleCell(row, col);
        console.log(`[Formulas] Updated ${depKey} = ${finalValue}`);
        // Рекурсивно пересчитываем зависимые ячейки от этой ячейки
        // (если эта формула сама влияет на другие)
        recalculateDependentCells(depKey, data);
    }
}
/**
 * Применение цвета из формулы COLOR
 */
function applyColorFromFormula(result, data) {
    const colorName = result.colorName;
    const range = result.range;
    const rangeType = result.rangeType || 'cell';
    // Получаем hex цвета из имени
    const hexColor = getHexColorByName(colorName);
    if (!hexColor) {
        console.warn('[COLOR] Invalid color name:', colorName);
        return;
    }
    console.log('[COLOR] Applying color:', { colorName, hexColor, range, rangeType });
    if (rangeType === 'column') {
        // Закрасить столбец (A:B)
        const columnRangeMatch = range.match(/^([A-Z]):([A-Z])$/i);
        if (columnRangeMatch) {
            const startCol = columnRangeMatch[1].toUpperCase().charCodeAt(0) - 65;
            const endCol = columnRangeMatch[2].toUpperCase().charCodeAt(0) - 65;
            for (let c = startCol; c <= endCol; c++) {
                for (let r = 0; r < CONFIG.ROWS; r++) {
                    applyCellColor(r, c, hexColor, data);
                }
            }
        }
        else {
            // Один столбец (A)
            const col = range.toUpperCase().charCodeAt(0) - 65;
            for (let r = 0; r < CONFIG.ROWS; r++) {
                applyCellColor(r, col, hexColor, data);
            }
        }
    }
    else if (rangeType === 'row') {
        // Закрасить строку (1:2)
        const rowRangeMatch = range.match(/^(\d+):(\d+)$/);
        if (rowRangeMatch) {
            const startRow = parseInt(rowRangeMatch[1]) - 1;
            const endRow = parseInt(rowRangeMatch[2]) - 1;
            for (let r = startRow; r <= endRow; r++) {
                for (let c = 0; c < CONFIG.COLS; c++) {
                    applyCellColor(r, c, hexColor, data);
                }
            }
        }
        else {
            // Одна строка
            const row = parseInt(range) - 1;
            for (let c = 0; c < CONFIG.COLS; c++) {
                applyCellColor(row, c, hexColor, data);
            }
        }
    }
    else if (rangeType === 'range') {
        // Диапазон ячеек (A1:B2)
        const cellRangeMatch = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
        if (cellRangeMatch) {
            const startCol = cellRangeMatch[1].toUpperCase().charCodeAt(0) - 65;
            const startRow = parseInt(cellRangeMatch[2]) - 1;
            const endCol = cellRangeMatch[3].toUpperCase().charCodeAt(0) - 65;
            const endRow = parseInt(cellRangeMatch[4]) - 1;
            for (let r = startRow; r <= endRow; r++) {
                for (let c = startCol; c <= endCol; c++) {
                    applyCellColor(r, c, hexColor, data);
                }
            }
        }
    }
    else {
        // Одна ячейка (A1)
        const cellMatch = range.match(/^([A-Z]+)(\d+)$/i);
        if (cellMatch) {
            const col = cellMatch[1].toUpperCase().charCodeAt(0) - 65;
            const row = parseInt(cellMatch[2]) - 1;
            applyCellColor(row, col, hexColor, data);
        }
    }
    updateAIDataCache();
}
/**
 * Получить hex цвета по имени
 */
function getHexColorByName(colorName) {
    if (!colorName)
        return null;
    const color = colorName.toLowerCase().trim();
    // 16 базовых цветов
    const colors = {
        'black': '#000000',
        'white': '#FFFFFF',
        'red': '#FF0000',
        'green': '#008000',
        'blue': '#0000FF',
        'yellow': '#FFFF00',
        'cyan': '#00FFFF',
        'aqua': '#00FFFF',
        'magenta': '#FF00FF',
        'fuchsia': '#FF00FF',
        'gray': '#808080',
        'grey': '#808080',
        'silver': '#C0C0C0',
        'maroon': '#800000',
        'olive': '#808000',
        'lime': '#00FF00',
        'teal': '#008080',
        'navy': '#000080',
        'purple': '#800080',
        'orange': '#FFA500',
    };
    return colors[color] || colorName; // Если не найдено, пробуем использовать как hex
}
/**
 * Применить цвет к ячейке
 */
function applyCellColor(row, col, hexColor, data) {
    const key = getCellKey(row, col);
    const cellData = data.get(key) || { value: '' };
    const newStyle = { ...cellData.style, backgroundColor: hexColor };
    data.set(key, { ...cellData, style: newStyle });
    const cell = getCellElement(row, col);
    if (cell) {
        cell.style.backgroundColor = hexColor;
    }
}
function updateSingleCell(row, col) {
    const cell = getCellElement(row, col);
    if (!cell)
        return;
    const key = getCellKey(row, col);
    const cellData = getCurrentData().get(key);
    if (cellData) {
        cell.textContent = cellData.value;
        cell.classList.add('has-content');
        // Применяем стили
        if (cellData.style) {
            Object.entries(cellData.style).forEach(([prop, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    cell.style[prop] = value;
                }
            });
        }
        // Применить подсветку поиска
        if (state.searchHighlight && state.searchResults.has(key)) {
            cell.style.backgroundColor = '#FFEB3B';
            cell.style.fontWeight = 'bold';
        }
    }
    else {
        cell.textContent = '';
        cell.classList.remove('has-content');
        // Применить подсветку поиска для пустых ячеек
        if (state.searchHighlight && state.searchResults.has(key)) {
            cell.style.backgroundColor = '#FFEB3B';
            cell.style.fontWeight = 'bold';
        }
    }
    // Применить фильтры
    const filter = state.activeFilters.get(col);
    if (filter && cellData && cellData.value) {
        const value = String(cellData.value);
        const isIncluded = filter.values.includes(value);
        if ((filter.type === 'include' && !isIncluded) || (filter.type === 'exclude' && isIncluded)) {
            cell.style.display = 'none';
        }
        else {
            cell.style.display = '';
        }
    }
}
// === ПРИМЕНЕНИЕ ЦВЕТА К ЯЧЕЙКАМ ===
function applyColorToSelection(type, color) {
    const data = getCurrentData();
    const cellsToColor = [];
    // Получаем выделенные ячейки
    if (state.selectionStart && state.selectionEnd) {
        // Выделен диапазон
        const minRow = Math.min(state.selectionStart.row, state.selectionEnd.row);
        const maxRow = Math.max(state.selectionStart.row, state.selectionEnd.row);
        const minCol = Math.min(state.selectionStart.col, state.selectionEnd.col);
        const maxCol = Math.max(state.selectionStart.col, state.selectionEnd.col);
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                cellsToColor.push({ row: r, col: c });
            }
        }
    }
    else {
        // Одна ячейка
        cellsToColor.push({ ...state.selectedCell });
    }
    // Применяем цвет
    for (const cellRef of cellsToColor) {
        const key = getCellKey(cellRef.row, cellRef.col);
        const cellData = data.get(key);
        const cellElement = getCellElement(cellRef.row, cellRef.col);
        if (cellData) {
            // Сохраняем цвет в стиле
            const newStyle = { ...cellData.style };
            if (type === 'text') {
                newStyle.color = color;
                if (cellElement)
                    cellElement.style.color = color;
            }
            else {
                newStyle.backgroundColor = color;
                if (cellElement)
                    cellElement.style.backgroundColor = color;
            }
            data.set(key, { ...cellData, style: newStyle });
        }
        else {
            // Если ячейка пустая, создаём стиль
            const newStyle = {};
            if (type === 'text') {
                newStyle.color = color;
                if (cellElement)
                    cellElement.style.color = color;
            }
            else {
                newStyle.backgroundColor = color;
                if (cellElement)
                    cellElement.style.backgroundColor = color;
            }
            data.set(key, { value: '', style: newStyle });
        }
    }
    // Обновляем выделение чтобы применить стили
    updateRangeSelection();
    updateAIDataCache();
    pushUndo('format', type);
    autoSave();
}
// Применение выравнивания текста
function applyTextAlign(align) {
    const data = getCurrentData();
    const cellsToAlign = [];
    // Получаем выделенные ячейки
    if (state.selectionStart && state.selectionEnd) {
        // Выделен диапазон
        const minRow = Math.min(state.selectionStart.row, state.selectionEnd.row);
        const maxRow = Math.max(state.selectionStart.row, state.selectionEnd.row);
        const minCol = Math.min(state.selectionStart.col, state.selectionEnd.col);
        const maxCol = Math.max(state.selectionStart.col, state.selectionEnd.col);
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                cellsToAlign.push({ row: r, col: c });
            }
        }
    }
    else {
        // Одна ячейка
        cellsToAlign.push({ ...state.selectedCell });
    }
    // Применяем выравнивание
    for (const cellRef of cellsToAlign) {
        const key = getCellKey(cellRef.row, cellRef.col);
        const cellData = data.get(key);
        const cellElement = getCellElement(cellRef.row, cellRef.col);
        if (cellData) {
            // Сохраняем выравнивание в стиле
            const newStyle = { ...cellData.style };
            newStyle.textAlign = align;
            if (cellElement)
                cellElement.style.textAlign = align;
            data.set(key, { ...cellData, style: newStyle });
        }
        else {
            // Если ячейка пустая, создаём стиль
            const newStyle = { textAlign: align };
            if (cellElement)
                cellElement.style.textAlign = align;
            data.set(key, { value: '', style: newStyle });
        }
    }
    updateAIDataCache();
    autoSave();
}
// Изменение разрядности чисел
function changeDecimalPlaces(delta) {
    const data = getCurrentData();
    const cellsToFormat = [];
    // Получаем выделенные ячейки
    if (state.selectionStart && state.selectionEnd) {
        // Выделен диапазон
        const minRow = Math.min(state.selectionStart.row, state.selectionEnd.row);
        const maxRow = Math.max(state.selectionStart.row, state.selectionEnd.row);
        const minCol = Math.min(state.selectionStart.col, state.selectionEnd.col);
        const maxCol = Math.max(state.selectionStart.col, state.selectionEnd.col);
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                cellsToFormat.push({ row: r, col: c });
            }
        }
    }
    else {
        // Одна ячейка
        cellsToFormat.push({ ...state.selectedCell });
    }
    // Применяем разрядность
    for (const cellRef of cellsToFormat) {
        const key = getCellKey(cellRef.row, cellRef.col);
        const cellData = data.get(key);
        const cellElement = getCellElement(cellRef.row, cellRef.col);
        if (cellData && cellData.value) {
            // Проверяем, является ли значение числом
            const numValue = parseFloat(cellData.value);
            if (!isNaN(numValue)) {
                // Получаем текущую разрядность из стиля
                const currentDecimals = cellData.style?.decimals ?? 2;
                const newDecimals = Math.max(0, Math.min(10, currentDecimals + delta));
                // Форматируем число
                const formattedValue = numValue.toFixed(newDecimals);
                // Сохраняем разрядность в стиле
                const newStyle = { ...cellData.style };
                newStyle.decimals = newDecimals;
                data.set(key, { value: formattedValue, style: newStyle });
                if (cellElement) {
                    cellElement.textContent = formattedValue;
                }
            }
        }
    }
    updateAIDataCache();
    autoSave();
}
// Автоподбор ширины колонки
function autoFitColumn(col) {
    const data = getCurrentData();
    let maxWidth = CONFIG.CELL_WIDTH;
    // Найти максимальную ширину текста в колонке
    for (let row = 0; row < CONFIG.ROWS; row++) {
        const key = getCellKey(row, col);
        const cellData = data.get(key);
        if (cellData?.value) {
            const textWidth = cellData.value.length * 7 + 16;
            maxWidth = Math.max(maxWidth, textWidth);
        }
    }
    maxWidth = Math.min(maxWidth, 500);
    // Применить ширину
    const columnHeader = elements.columnHeaders.children[col];
    if (columnHeader) {
        columnHeader.style.width = `${maxWidth}px`;
        columnHeader.style.minWidth = `${maxWidth}px`;
    }
    for (let row = 0; row < CONFIG.ROWS; row++) {
        const cell = getCellElement(row, col);
        if (cell) {
            cell.style.width = `${maxWidth}px`;
            cell.style.minWidth = `${maxWidth}px`;
            cell.style.maxWidth = `${maxWidth}px`;
        }
    }
}
// Завершить редактирование при клике вне input
document.addEventListener('mousedown', (e) => {
    if (state.isEditing) {
        const clickTarget = e.target;
        const input = getGlobalCellInput();
        const formulaBar = elements.formulaInput;
        // Если клик на input или formula bar - не закрываем редактор
        if (clickTarget === input || input.contains(clickTarget)) {
            return;
        }
        if (clickTarget === formulaBar || formulaBar.contains(clickTarget)) {
            return;
        }
        // Клик вне input и formula bar - закрываем редактор и выделяем кликнутую ячейку
        finishEditing();
        // Если кликнули на другую ячейку - выделяем её
        const cell = e.target.closest('.cell');
        if (cell) {
            const row = parseInt(cell.dataset.row || '0');
            const col = parseInt(cell.dataset.col || '0');
            selectCell(row, col);
        }
    }
});
function handleGlobalInputKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        // Запомним текущую позицию ДО завершения редактирования
        const currentRow = state.editingCell.row;
        const currentCol = state.editingCell.col;
        finishEditing(true);
        // Перейти к следующей ячейке (используем сохраненную позицию)
        const nextRow = Math.min(currentRow + 1, CONFIG.ROWS - 1);
        selectCell(nextRow, currentCol);
    }
    else if (e.key === 'Tab') {
        e.preventDefault();
        // Запомним текущую позицию ДО завершения редактирования
        const currentRow = state.editingCell.row;
        const currentCol = state.editingCell.col;
        finishEditing(true);
        const nextCol = e.shiftKey
            ? Math.max(0, currentCol - 1)
            : Math.min(CONFIG.COLS - 1, currentCol + 1);
        selectCell(currentRow, nextCol);
    }
    else if (e.key === 'Escape') {
        e.preventDefault();
        // Отменить изменения - закрыть без сохранения
        finishEditing(false);
    }
}
// Редактирование ячейки с автоматическим вводом символа
function editCellWithChar(row, col, char) {
    editCell(row, col, false);
    const input = getGlobalCellInput();
    input.value = char;
    input.focus();
    // Переместить курсор в конец
    input.setSelectionRange(input.value.length, input.value.length);
    updateFormulaBar();
}
function handleGlobalInputChange(e) {
    const input = e.target;
    if (!state.isEditing)
        return;
    // Обновляем formula bar в режиме реального времени
    updateFormulaBar();
}
// === ФОРМУЛЫ ===
function updateFormulaBar() {
    const { row, col } = state.selectedCell;
    const key = getCellKey(row, col);
    const data = getCurrentData();
    const cellData = data.get(key);
    // ✅ Показываем в формула баре формулу если есть, иначе значение
    const value = cellData?.formula || cellData?.value || '';
    elements.formulaInput.value = value;
}
// === ОБНОВЛЕНИЕ ССЫЛКИ НА ЯЧЕЙКУ ===
function updateCellReference() {
    const { row, col } = state.selectedCell;
    elements.cellReference.textContent = getCellId(row, col);
}
// === СОБЫТИЯ ===
// === ВЫДЕЛЕНИЕ ДИАПАЗОНА МЫШЬЮ ===
function setupRangeSelection() {
    elements.cellGrid.addEventListener('mousedown', (e) => {
        if (e.button !== 0)
            return; // Только левая кнопка
        const cell = e.target.closest('.cell');
        if (!cell)
            return;
        const row = parseInt(cell.dataset.row || '0');
        const col = parseInt(cell.dataset.col || '0');
        state.selectionStart = { row, col };
        state.selectionEnd = { row, col };
        state.isSelecting = true;
        selectCell(row, col);
        updateRangeSelection();
    });
    elements.cellGrid.addEventListener('mousemove', (e) => {
        if (!state.isSelecting || !state.selectionStart)
            return;
        const cell = e.target.closest('.cell');
        if (!cell)
            return;
        const row = parseInt(cell.dataset.row || '0');
        const col = parseInt(cell.dataset.col || '0');
        state.selectionEnd = { row, col };
        updateRangeSelection();
    });
    document.addEventListener('mouseup', () => {
        state.isSelecting = false;
    });
}
// === ДЕЛЕГИРОВАНИЕ СОБЫТИЙ ЯЧЕЕК ===
function setupCellEventListeners() {
    // Клик по ячейке (только выделение)
    elements.cellGrid.addEventListener('click', (e) => {
        const cell = e.target.closest('.cell');
        if (!cell)
            return;
        const row = parseInt(cell.dataset.row || '0');
        const col = parseInt(cell.dataset.col || '0');
        // Проверка на dropdown ячейку
        if (cell.dataset.hasDropdown === 'true') {
            selectCell(row, col);
            const validation = getDataValidation(row, col);
            if (validation && validation.type === 'list') {
                showDropdownList(e, cell, row, col, validation.values);
            }
            return;
        }
        // Игнорируем клик если было выделение диапазона
        if (state.isSelecting)
            return;
        // Просто выделяем ячейку (без редактирования)
        selectCell(row, col);
    });
    // Двойной клик (редактирование с выделением)
    elements.cellGrid.addEventListener('dblclick', (e) => {
        const cell = e.target.closest('.cell');
        if (!cell)
            return;
        const row = parseInt(cell.dataset.row || '0');
        const col = parseInt(cell.dataset.col || '0');
        // При двойном клике всегда выделяем ячейку и начинаем редактирование
        selectCell(row, col);
        editCell(row, col, true);
    });
    // === ОБРАБОТЧИКИ ДЛЯ ГЛОБАЛЬНОГО INPUT ===
    const globalInput = getGlobalCellInput();
    // Keydown для глобального input
    globalInput.addEventListener('keydown', (e) => {
        handleGlobalInputKeyDown(e);
    });
    // Input event для обновления formula bar
    globalInput.addEventListener('input', (e) => {
        handleGlobalInputChange(e);
    });
    // Blur - завершить редактирование
    globalInput.addEventListener('blur', (e) => {
        // Проверить, не перешёл ли фокус на formula bar
        const relatedTarget = e.relatedTarget;
        if (relatedTarget === elements.formulaInput) {
            // Фокус перешёл на formula bar - не завершать редактирование
            return;
        }
        if (state.isEditing) {
            finishEditing(true);
        }
    });
}
function updateRangeSelection() {
    if (!state.selectionStart || !state.selectionEnd)
        return;
    // Снять предыдущее выделение
    elements.cellGrid.querySelectorAll('.cell.selected').forEach(cell => {
        cell.classList.remove('selected');
    });
    // Выделить диапазон
    const minRow = Math.min(state.selectionStart.row, state.selectionEnd.row);
    const maxRow = Math.max(state.selectionStart.row, state.selectionEnd.row);
    const minCol = Math.min(state.selectionStart.col, state.selectionEnd.col);
    const maxCol = Math.max(state.selectionStart.col, state.selectionEnd.col);
    for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
            const cell = getCellElement(r, c);
            if (cell) {
                cell.classList.add('selected');
            }
        }
    }
    // Обновить активную ячейку
    state.selectedCell = { row: state.selectionEnd.row, col: state.selectionEnd.col };
    updateCellReference();
    updateFormulaBar();
}
// === КОНТЕКСТНОЕ МЕНЮ ===
function setupContextMenu() {
    // ПКМ на ячейке
    elements.cellGrid.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const cell = e.target.closest('.cell');
        if (!cell)
            return;
        const row = parseInt(cell.dataset.row || '0');
        const col = parseInt(cell.dataset.col || '0');
        // Не сбрасывать выделение если уже выделено несколько ячеек
        if (!state.isSelecting && (!state.selectionStart || (state.selectionStart.row === row && state.selectionStart.col === col))) {
            state.contextMenuCell = { row, col };
            selectCell(row, col);
        }
        else {
            // Сохранить текущее выделение
            state.contextMenuCell = state.selectedCell;
        }
        // Показать меню
        const menu = document.getElementById('contextMenu');
        if (menu) {
            menu.style.display = 'block';
            menu.style.left = `${e.pageX}px`;
            menu.style.top = `${e.pageY}px`;
        }
    });
    // Скрыть меню при клике
    document.addEventListener('click', () => {
        const menu = document.getElementById('contextMenu');
        if (menu) {
            menu.style.display = 'none';
        }
    });
    // Обработка действий меню
    document.addEventListener('click', (e) => {
        const item = e.target.closest('.context-menu-item');
        if (!item)
            return;
        const action = item.dataset.action;
        handleContextMenuAction(action);
        const menu = document.getElementById('contextMenu');
        if (menu) {
            menu.style.display = 'none';
        }
    });
}
// === КОНТЕКСТНОЕ МЕНЮ ЛИСТОВ ===
function setupSheetContextMenu() {
    // ПКМ на списке листов
    elements.sheetsList.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const tab = e.target.closest('.sheet-tab');
        if (!tab)
            return;
        const sheetId = parseInt(tab.dataset.sheet || '0');
        if (!sheetId)
            return;
        state.contextMenuSheet = sheetId;
        // Показать меню
        const menu = document.getElementById('sheetContextMenu');
        if (menu) {
            menu.style.display = 'block';
            // Получаем размеры меню и окна
            const menuRect = menu.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const viewportWidth = window.innerWidth;
            let left = e.pageX;
            let top = e.pageY;
            // Проверяем, помещается ли меню по вертикали
            if (top + menuRect.height > viewportHeight) {
                // Если не помещается внизу - показываем выше курсора
                top = e.pageY - menuRect.height;
            }
            // Проверяем, помещается ли меню по горизонтали
            if (left + menuRect.width > viewportWidth) {
                // Если не помещается справа - показываем слева от курсора
                left = e.pageX - menuRect.width;
            }
            menu.style.left = `${left}px`;
            menu.style.top = `${top}px`;
        }
    });
    // Скрыть меню при клике
    document.addEventListener('click', () => {
        const menu = document.getElementById('sheetContextMenu');
        if (menu) {
            menu.style.display = 'none';
        }
    });
    // Обработка действий меню листов
    document.addEventListener('click', (e) => {
        const item = e.target.closest('.context-menu-item');
        if (!item || !item.closest('#sheetContextMenu'))
            return;
        const action = item.dataset.action;
        handleSheetContextMenuAction(action);
        const menu = document.getElementById('sheetContextMenu');
        if (menu) {
            menu.style.display = 'none';
        }
    });
}
function handleSheetContextMenuAction(action) {
    const sheetId = state.contextMenuSheet;
    if (!sheetId)
        return;
    switch (action) {
        case 'rename-sheet':
            {
                const sheet = state.sheets.find(s => s.id === sheetId);
                if (!sheet)
                    return;
                showPromptModal('Введите новое название листа:', (newName) => {
                    if (!newName || !newName.trim())
                        return;
                    sheet.name = newName.trim();
                    renderSheets();
                }, sheet.name);
            }
            break;
        case 'duplicate-sheet':
            {
                const sheet = state.sheets.find(s => s.id === sheetId);
                if (!sheet)
                    return;
                const newId = state.sheets.length + 1;
                const newName = `${sheet.name} (копия)`;
                const newSheet = { id: newId, name: newName };
                state.sheets.push(newSheet);
                // Копировать данные
                const sourceData = state.sheetsData.get(sheetId);
                if (sourceData) {
                    const newData = new Map(sourceData);
                    state.sheetsData.set(newId, newData);
                }
                else {
                    state.sheetsData.set(newId, new Map());
                }
                switchSheet(newId);
            }
            break;
        case 'move-sheet-left':
            {
                const index = state.sheets.findIndex(s => s.id === sheetId);
                if (index <= 0)
                    return; // Уже первый
                const sheet = state.sheets[index];
                state.sheets.splice(index, 1);
                state.sheets.splice(index - 1, 0, sheet);
                renderSheets();
            }
            break;
        case 'move-sheet-right':
            {
                const index = state.sheets.findIndex(s => s.id === sheetId);
                if (index < 0 || index >= state.sheets.length - 1)
                    return; // Уже последний
                const sheet = state.sheets[index];
                state.sheets.splice(index, 1);
                state.sheets.splice(index + 1, 0, sheet);
                renderSheets();
            }
            break;
        case 'delete-sheet':
            {
                if (state.sheets.length <= 1) {
                    alert('Нельзя удалить последний лист');
                    return;
                }
                if (!confirm('Вы уверены, что хотите удалить этот лист?'))
                    return;
                const index = state.sheets.findIndex(s => s.id === sheetId);
                if (index < 0)
                    return;
                state.sheets.splice(index, 1);
                state.sheetsData.delete(sheetId);
                // Переключиться на соседний лист
                if (state.currentSheet === sheetId) {
                    const newSheetId = state.sheets[Math.max(0, index - 1)].id;
                    switchSheet(newSheetId);
                }
                else {
                    renderSheets();
                }
            }
            break;
    }
}
function handleContextMenuAction(action) {
    const cellRef = state.contextMenuCell || state.selectedCell;
    const row = cellRef.row;
    const col = cellRef.col;
    const data = getCurrentData();
    switch (action) {
        case 'cut':
        case 'copy':
            {
                const cell = getCellElement(row, col);
                const value = cell?.textContent || '';
                navigator.clipboard.writeText(value);
                // Сохранить в историю буфера обмена
                saveToClipboardHistory(value);
                if (action === 'cut') {
                    cell && (cell.textContent = '');
                    data.delete(getCellKey(row, col));
                }
            }
            break;
        case 'paste':
            navigator.clipboard.readText().then(text => {
                const cell = getCellElement(row, col);
                if (cell) {
                    cell.textContent = text;
                    data.set(getCellKey(row, col), { value: text });
                }
            });
            break;
        case 'delete-selected':
            deleteSelectedCells();
            break;
        case 'clear':
            {
                const cell = getCellElement(row, col);
                if (cell) {
                    cell.textContent = '';
                    data.delete(getCellKey(row, col));
                }
            }
            break;
        case 'find-in-selection':
            showFindInSelectionModal();
            break;
        case 'filter-by-value':
            showFilterByValueModal(col);
            break;
        case 'bg-color':
            {
                showPromptModal('Введите цвет фона (hex, например #FFEBEE):', (color) => {
                    if (!color)
                        return;
                    const cell = getCellElement(row, col);
                    if (cell) {
                        cell.style.backgroundColor = color;
                    }
                }, '#FFEBEE');
            }
            break;
        case 'insert-row-above':
            insertRowAboveAt(row);
            break;
        case 'insert-row-below':
            insertRowBelowAt(row);
            break;
        case 'delete-row':
            deleteRowAt(row);
            break;
        case 'insert-col-left':
            insertColumnLeftAt(col);
            break;
        case 'insert-col-right':
            insertColumnRightAt(col);
            break;
        case 'delete-col':
            deleteColumnAt(col);
            break;
    }
    renderCells();
    updateAIDataCache();
}
// Вспомогательные функции для контекстного меню
function insertRowAboveAt(row) {
    const data = getCurrentData();
    const rowsToMove = [];
    data.forEach((cellData, key) => {
        const [cellRow, cellCol] = key.split('-').map(Number);
        if (cellRow >= row) {
            const newKey = `${cellRow + 1}-${cellCol}`;
            rowsToMove.push({ oldKey: key, newKey, value: cellData });
        }
    });
    rowsToMove.forEach(item => { data.delete(item.oldKey); data.set(item.newKey, item.value); });
}
function insertRowBelowAt(row) {
    insertRowAboveAt(row + 1);
}
function deleteRowAt(row) {
    const data = getCurrentData();
    const keysToDelete = [];
    data.forEach((_, key) => {
        const [cellRow] = key.split('-').map(Number);
        if (cellRow === row)
            keysToDelete.push(key);
    });
    keysToDelete.forEach(key => data.delete(key));
    const rowsToMove = [];
    data.forEach((cellData, key) => {
        const [cellRow, cellCol] = key.split('-').map(Number);
        if (cellRow > row) {
            const newKey = `${cellRow - 1}-${cellCol}`;
            rowsToMove.push({ oldKey: key, newKey, value: cellData });
        }
    });
    rowsToMove.forEach(item => { data.delete(item.oldKey); data.set(item.newKey, item.value); });
}
function insertColumnLeftAt(col) {
    const data = getCurrentData();
    const colsToMove = [];
    data.forEach((cellData, key) => {
        const [row, cellCol] = key.split('-').map(Number);
        if (cellCol >= col) {
            const newKey = `${row}-${cellCol + 1}`;
            colsToMove.push({ oldKey: key, newKey, value: cellData });
        }
    });
    colsToMove.forEach(item => { data.delete(item.oldKey); data.set(item.newKey, item.value); });
}
function insertColumnRightAt(col) {
    insertColumnLeftAt(col + 1);
}
function deleteColumnAt(col) {
    const data = getCurrentData();
    const keysToDelete = [];
    data.forEach((_, key) => {
        const [row, cellCol] = key.split('-').map(Number);
        if (cellCol === col)
            keysToDelete.push(key);
    });
    keysToDelete.forEach(key => data.delete(key));
    const colsToMove = [];
    data.forEach((cellData, key) => {
        const [row, cellCol] = key.split('-').map(Number);
        if (cellCol > col) {
            const newKey = `${row}-${cellCol - 1}`;
            colsToMove.push({ oldKey: key, newKey, value: cellData });
        }
    });
    colsToMove.forEach(item => { data.delete(item.oldKey); data.set(item.newKey, item.value); });
}
// ==========================================
// === НОВЫЕ ФУНКЦИИ: УДАЛЕНИЕ, ПОИСК, ФИЛЬТРЫ ===
// ==========================================
/**
 * Сохранить в историю буфера обмена
 */
function saveToClipboardHistory(text) {
    if (!text)
        return;
    const history = JSON.parse(localStorage.getItem('clipboardHistory') || '[]');
    const MAX_HISTORY = 50;
    // Добавить в начало
    history.unshift({
        text: text,
        timestamp: Date.now()
    });
    // Ограничить размер
    if (history.length > MAX_HISTORY) {
        history.splice(MAX_HISTORY);
    }
    localStorage.setItem('clipboardHistory', JSON.stringify(history));
}
/**
 * Удалить выделенные ячейки
 */
function deleteSelectedCells() {
    const data = getCurrentData();
    if (state.selectionStart && state.selectionEnd) {
        // Выделен диапазон
        const minRow = Math.min(state.selectionStart.row, state.selectionEnd.row);
        const maxRow = Math.max(state.selectionStart.row, state.selectionEnd.row);
        const minCol = Math.min(state.selectionStart.col, state.selectionEnd.col);
        const maxCol = Math.max(state.selectionStart.col, state.selectionEnd.col);
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                const key = getCellKey(r, c);
                const cell = getCellElement(r, c);
                if (cell) {
                    cell.textContent = '';
                    cell.style.backgroundColor = '';
                }
                data.delete(key);
                removeFormula(key);
            }
        }
    }
    else {
        // Одна ячейка
        const key = getCellKey(state.selectedCell.row, state.selectedCell.col);
        const cell = getCellElement(state.selectedCell.row, state.selectedCell.col);
        if (cell) {
            cell.textContent = '';
            cell.style.backgroundColor = '';
        }
        data.delete(key);
        removeFormula(key);
    }
    updateAIDataCache();
    console.log('[Delete] Deleted selected cells');
}
/**
 * Показать модальное окно поиска в выделенном
 */
function showFindInSelectionModal() {
    // Создать модальное окно
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
    <div class="modal" style="max-width: 500px;">
      <div class="modal-header">
        <h3>🔍 Поиск в выделенном</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px;">Поисковый запрос:</label>
          <input type="text" id="searchInput" placeholder="Введите текст для поиска..." 
                 style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="searchCaseSensitive">
            Учитывать регистр
          </label>
        </div>
        <div style="margin-bottom: 15px;">
          <label style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" id="searchExactMatch">
            Точное совпадение
          </label>
        </div>
        <div id="searchResults" style="padding: 10px; background: #f5f5f5; border-radius: 4px; max-height: 200px; overflow-y: auto;">
          <div style="color: #888;">Результаты поиска появятся здесь...</div>
        </div>
      </div>
      <div class="modal-footer">
        <button id="btnSearchNow" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Найти
        </button>
        <button id="btnClearSearch" style="padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Очистить результаты
        </button>
        <button onclick="this.closest('.modal-overlay').remove()" 
                style="padding: 8px 16px; background: #9e9e9e; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Закрыть
        </button>
      </div>
    </div>
  `;
    document.body.appendChild(modal);
    // Обработчики событий
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const btnSearchNow = document.getElementById('btnSearchNow');
    const btnClearSearch = document.getElementById('btnClearSearch');
    btnSearchNow.addEventListener('click', () => {
        const query = searchInput.value.trim();
        if (!query) {
            alert('Введите поисковый запрос');
            return;
        }
        const caseSensitive = document.getElementById('searchCaseSensitive').checked;
        const exactMatch = document.getElementById('searchExactMatch').checked;
        performSearch(query, caseSensitive, exactMatch, searchResults);
    });
    btnClearSearch.addEventListener('click', () => {
        searchResults.innerHTML = '<div style="color: #888;">Результаты поиска появятся здесь...</div>';
        clearSearchHighlight();
    });
    // Поиск по нажатию Enter
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            btnSearchNow.click();
        }
    });
    // Автофокус на поле ввода
    setTimeout(() => searchInput.focus(), 100);
}
/**
 * Выполнить поиск в выделенных ячейках
 */
function performSearch(query, caseSensitive, exactMatch, resultsContainer) {
    const data = getCurrentData();
    const results = [];
    // Определить диапазон поиска
    let minRow = 0, maxRow = CONFIG.ROWS - 1, minCol = 0, maxCol = CONFIG.COLS - 1;
    if (state.selectionStart && state.selectionEnd) {
        minRow = Math.min(state.selectionStart.row, state.selectionEnd.row);
        maxRow = Math.max(state.selectionStart.row, state.selectionEnd.row);
        minCol = Math.min(state.selectionStart.col, state.selectionEnd.col);
        maxCol = Math.max(state.selectionStart.col, state.selectionEnd.col);
    }
    // Поиск
    for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
            const key = getCellKey(r, c);
            const cellData = data.get(key);
            if (!cellData || !cellData.value)
                continue;
            const value = String(cellData.value);
            let searchValue = value;
            let searchQuery = query;
            if (!caseSensitive) {
                searchValue = value.toLowerCase();
                searchQuery = query.toLowerCase();
            }
            const found = exactMatch
                ? searchValue === searchQuery
                : searchValue.includes(searchQuery);
            if (found) {
                results.push({ row: r, col: c, value: value.substring(0, 50), cellKey: key });
            }
        }
    }
    // Отобразить результаты
    state.searchResults = new Set(results.map(r => r.cellKey));
    state.searchHighlight = true;
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div style="color: #f44336;">Ничего не найдено</div>';
    }
    else {
        resultsContainer.innerHTML = `
      <div style="color: #4CAF50; margin-bottom: 10px;">Найдено: ${results.length}</div>
      <div style="max-height: 150px; overflow-y: auto;">
        ${results.slice(0, 20).map(r => `
          <div style="padding: 5px; margin: 3px 0; background: white; border-left: 3px solid #4CAF50; cursor: pointer;"
               onclick="document.dispatchEvent(new CustomEvent('goto-cell', { detail: { row: ${r.row}, col: ${r.col} } }))">
            <strong>${String.fromCharCode(65 + r.col)}${r.row + 1}</strong>: ${r.value}${r.value.length > 50 ? '...' : ''}
          </div>
        `).join('')}
        ${results.length > 20 ? `<div style="color: #888; padding: 5px;">... и ещё ${results.length - 20}</div>` : ''}
      </div>
    `;
        // Обработчик перехода к ячейке
        document.addEventListener('goto-cell', ((e) => {
            const { row, col } = e.detail;
            selectCell(row, col);
            const cell = getCellElement(row, col);
            cell?.scrollIntoView({ block: 'center', inline: 'center' });
        }), { once: false });
    }
    renderCells();
}
/**
 * Очистить подсветку поиска
 */
function clearSearchHighlight() {
    state.searchResults.clear();
    state.searchHighlight = false;
    renderCells();
}
/**
 * Показать модальное окно фильтра по значению
 */
function showFilterByValueModal(columnIndex) {
    const data = getCurrentData();
    const columnValues = new Map();
    // Собрать все уникальные значения в колонке
    data.forEach((cellData, key) => {
        const [row, col] = key.split('-').map(Number);
        if (col === columnIndex && cellData.value) {
            const value = String(cellData.value);
            columnValues.set(value, (columnValues.get(value) || 0) + 1);
        }
    });
    // Создать модальное окно
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
    <div class="modal" style="max-width: 400px;">
      <div class="modal-header">
        <h3>📊 Фильтр по столбцу ${String.fromCharCode(65 + columnIndex)}</h3>
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 15px;">
          <label style="display: block; margin-bottom: 5px;">Тип фильтра:</label>
          <select id="filterType" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            <option value="include">Показывать выбранные</option>
            <option value="exclude">Скрыть выбранные</option>
          </select>
        </div>
        <div style="margin-bottom: 15px;">
          <input type="text" id="filterSearch" placeholder="Поиск значений..." 
                 style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </div>
        <div id="filterValues" style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 10px;">
          ${Array.from(columnValues.entries()).slice(0, 100).map(([value, count]) => `
            <label style="display: flex; align-items: center; gap: 8px; padding: 5px 0;">
              <input type="checkbox" class="filter-checkbox" value="${value.replace(/"/g, '&quot;')}">
              <span>${value.substring(0, 50)}${value.length > 50 ? '...' : ''}</span>
              <span style="color: #888; font-size: 12px;">(${count})</span>
            </label>
          `).join('')}
          ${columnValues.size > 100 ? `<div style="color: #888; padding: 5px;">... и ещё ${columnValues.size - 100} значений</div>` : ''}
        </div>
      </div>
      <div class="modal-footer">
        <button id="btnApplyFilter" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Применить фильтр
        </button>
        <button id="btnClearFilter" style="padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Снять фильтр
        </button>
        <button onclick="this.closest('.modal-overlay').remove()" 
                style="padding: 8px 16px; background: #9e9e9e; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Отмена
        </button>
      </div>
    </div>
  `;
    document.body.appendChild(modal);
    // Живой поиск по значениям
    const filterSearch = document.getElementById('filterSearch');
    const filterValuesContainer = document.getElementById('filterValues');
    const allCheckboxes = filterValuesContainer.querySelectorAll('.filter-checkbox');
    filterSearch.addEventListener('input', () => {
        const searchTerm = filterSearch.value.toLowerCase();
        allCheckboxes.forEach(cb => {
            const label = cb.parentElement;
            const text = label?.textContent?.toLowerCase() || '';
            if (label) {
                label.style.display = text.includes(searchTerm) ? 'flex' : 'none';
            }
        });
    });
    // Применить фильтр
    const btnApplyFilter = document.getElementById('btnApplyFilter');
    btnApplyFilter.addEventListener('click', () => {
        const filterType = document.getElementById('filterType').value;
        const selectedValues = Array.from(filterValuesContainer.querySelectorAll('.filter-checkbox:checked'))
            .map(cb => cb.getAttribute('value'))
            .filter((v) => v !== null);
        if (selectedValues.length === 0) {
            alert('Выберите хотя бы одно значение');
            return;
        }
        // Установить фильтр
        state.activeFilters.set(columnIndex, {
            values: selectedValues,
            type: filterType
        });
        applyFilters();
        modal.remove();
    });
    // Снять фильтр
    const btnClearFilter = document.getElementById('btnClearFilter');
    btnClearFilter.addEventListener('click', () => {
        state.activeFilters.delete(columnIndex);
        applyFilters();
        modal.remove();
    });
}
/**
 * Применить все активные фильтры
 */
function applyFilters() {
    // Скрыть/показать ячейки согласно фильтрам
    const data = getCurrentData();
    data.forEach((cellData, key) => {
        const [row, col] = key.split('-').map(Number);
        const cell = getCellElement(row, col);
        if (!cell)
            return;
        let shouldShow = true;
        // Проверить фильтры для этой колонки
        const filter = state.activeFilters.get(col);
        if (filter && cellData.value) {
            const value = String(cellData.value);
            const isIncluded = filter.values.includes(value);
            if (filter.type === 'include') {
                shouldShow = isIncluded;
            }
            else { // exclude
                shouldShow = !isIncluded;
            }
        }
        cell.style.display = shouldShow ? '' : 'none';
    });
}
/**
 * Сортировка по колонке
 */
function sortByColumn(columnIndex, direction) {
    const data = getCurrentData();
    const rows = new Map();
    // Собрать данные по строкам
    data.forEach((cellData, key) => {
        const [row, col] = key.split('-').map(Number);
        if (!rows.has(row)) {
            rows.set(row, new Map());
        }
        rows.get(row).set(col, cellData);
    });
    // Преобразовать в массив для сортировки
    const rowsArray = Array.from(rows.entries()).map(([rowNum, rowData]) => ({
        rowNum,
        rowData,
        sortValue: getCellValueForSort(rowData.get(columnIndex))
    }));
    // Сортировать
    rowsArray.sort((a, b) => {
        const aVal = a.sortValue;
        const bVal = b.sortValue;
        // Если оба числа
        if (typeof aVal === 'number' && typeof bVal === 'number') {
            return direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        // Если строки
        const aStr = String(aVal);
        const bStr = String(bVal);
        const cmp = aStr.localeCompare(bStr);
        return direction === 'asc' ? cmp : -cmp;
    });
    // Переместить данные
    const newData = new Map();
    rowsArray.forEach((item, newIndex) => {
        item.rowData.forEach((cellData, col) => {
            const newKey = `${newIndex}-${col}`;
            newData.set(newKey, cellData);
        });
    });
    // Обновить данные
    state.sheetsData.set(state.currentSheet, newData);
    state.activeSort.column = columnIndex;
    state.activeSort.direction = direction;
    renderCells();
    updateAIDataCache();
}
/**
 * Получить значение для сортировки
 */
function getCellValueForSort(cellData) {
    if (!cellData || !cellData.value)
        return ''; // Пустые ячейки в конец
    const value = cellData.value;
    const numValue = parseFloat(value);
    // Если число - вернуть число
    if (!isNaN(numValue) && isFinite(numValue)) {
        return numValue;
    }
    // Иначе строка
    return String(value).toLowerCase();
}
// Вставка изображения (плавающий объект)
function insertImage(imageSrc) {
    const { row, col } = state.selectedCell;
    const cell = getCellElement(row, col);
    if (!cell)
        return;
    const rect = cell.getBoundingClientRect();
    const container = document.getElementById('cellGridWrapper');
    if (!container)
        return;
    // Создаём плавающее изображение
    const imgContainer = document.createElement('div');
    imgContainer.className = 'floating-image';
    imgContainer.style.cssText = `
    position: absolute;
    left: ${rect.left + container.scrollLeft}px;
    top: ${rect.top + container.scrollTop}px;
    min-width: 150px;
    min-height: 150px;
    max-width: 400px;
    max-height: 400px;
    border: 2px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    background: white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
  `;
    // Заголовок для перетаскивания
    const header = document.createElement('div');
    header.className = 'floating-header';
    header.style.cssText = `
    height: 28px;
    background: linear-gradient(to bottom, #f5f5f5, #e0e0e0);
    border-bottom: 1px solid #ddd;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px;
    cursor: move;
    user-select: none;
  `;
    const title = document.createElement('span');
    title.textContent = 'Фото';
    title.style.cssText = `
    font-size: 12px;
    color: #666;
    font-weight: 500;
  `;
    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '×';
    removeBtn.style.cssText = `
    width: 20px;
    height: 20px;
    border: none;
    background: transparent;
    color: #666;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
    removeBtn.onmouseover = () => {
        removeBtn.style.background = '#ff4444';
        removeBtn.style.color = 'white';
    };
    removeBtn.onmouseout = () => {
        removeBtn.style.background = 'transparent';
        removeBtn.style.color = '#666';
    };
    removeBtn.onclick = (e) => {
        e.stopPropagation();
        imgContainer.remove();
    };
    header.appendChild(title);
    header.appendChild(removeBtn);
    imgContainer.appendChild(header);
    // Контейнер для изображения
    const imgWrapper = document.createElement('div');
    imgWrapper.style.cssText = `
    position: relative;
    width: 100%;
    height: calc(100% - 28px);
    overflow: hidden;
  `;
    const img = document.createElement('img');
    img.src = imageSrc;
    img.style.cssText = `
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
    pointer-events: none;
  `;
    imgWrapper.appendChild(img);
    imgContainer.appendChild(imgWrapper);
    container.appendChild(imgContainer);
    // Делаем изображение перетаскиваемым за заголовок
    makeDraggableByHeader(imgContainer, header);
    // Добавляем изменение размера
    addResizeHandles(imgContainer);
    autoSave();
}
// Вставка изображения в ячейку
function insertImageInCell(imageSrc) {
    const { row, col } = state.selectedCell;
    const key = getCellKey(row, col);
    const data = getCurrentData();
    data.set(key, {
        value: '[Фото]',
        style: {
            backgroundImage: `url(${imageSrc})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            minHeight: `${CONFIG.CELL_HEIGHT}px`
        }
    });
    renderCells();
    updateAIDataCache();
    autoSave();
}
function makeDraggableByHeader(element, header) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    header.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = parseFloat(element.style.left) || 0;
        initialTop = parseFloat(element.style.top) || 0;
        header.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.stopPropagation();
            e.preventDefault();
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            element.style.left = `${initialLeft + dx}px`;
            element.style.top = `${initialTop + dy}px`;
        }
    });
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            header.style.cursor = 'move';
        }
    });
}
function makeDraggable(element) {
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    element.addEventListener('mousedown', (e) => {
        // Предотвращаем всплытие и выделение ячеек
        e.stopPropagation();
        e.preventDefault();
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = parseFloat(element.style.left) || 0;
        initialTop = parseFloat(element.style.top) || 0;
        element.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.stopPropagation();
            e.preventDefault();
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            element.style.left = `${initialLeft + dx}px`;
            element.style.top = `${initialTop + dy}px`;
        }
    });
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            element.style.cursor = 'move';
        }
    });
}
// Добавление ручек для изменения размера
function addResizeHandles(element) {
    // Ручка для изменения размера (правый нижний угол)
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    resizeHandle.style.cssText = `
    position: absolute;
    bottom: 0;
    right: 0;
    width: 16px;
    height: 16px;
    cursor: nwse-resize;
    z-index: 1001;
    background: linear-gradient(135deg, transparent 50%, #999 50%);
    border-radius: 0 0 8px 0;
  `;
    let isResizing = false;
    let startX, startY, startWidth, startHeight;
    resizeHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = element.offsetWidth;
        startHeight = element.offsetHeight;
    });
    document.addEventListener('mousemove', (e) => {
        if (isResizing) {
            e.stopPropagation();
            e.preventDefault();
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            element.style.width = `${Math.max(150, startWidth + dx)}px`;
            element.style.height = `${Math.max(100, startHeight + dy)}px`;
        }
    });
    document.addEventListener('mouseup', () => {
        isResizing = false;
    });
    element.appendChild(resizeHandle);
}
// === KEYBOARD CONTROLLER ===
function setupKeyboardController() {
    keyboardController = new KeyboardController({
        // Навигация
        onArrowUp: () => {
            const { row, col } = state.selectedCell;
            if (row > 0)
                selectCell(row - 1, col);
        },
        onArrowDown: () => {
            const { row, col } = state.selectedCell;
            if (row < CONFIG.ROWS - 1)
                selectCell(row + 1, col);
        },
        onArrowLeft: () => {
            const { row, col } = state.selectedCell;
            if (col > 0)
                selectCell(row, col - 1);
        },
        onArrowRight: () => {
            const { row, col } = state.selectedCell;
            if (col < CONFIG.COLS - 1)
                selectCell(row, col + 1);
        },
        // Редактирование
        onEnter: () => {
            const { row, col } = state.selectedCell;
            editCell(row, col);
        },
        onTab: (shiftKey) => {
            const { row, col } = state.selectedCell;
            const nextCol = shiftKey
                ? Math.max(0, col - 1)
                : Math.min(CONFIG.COLS - 1, col + 1);
            selectCell(row, nextCol);
        },
        onEscape: () => {
            if (state.isEditing) {
                finishEditing(false); // Отмена без сохранения
            }
        },
        // Удаление
        onDelete: () => {
            if (!state.isEditing) {
                const { row, col } = state.selectedCell;
                const cell = getCellElement(row, col);
                const data = getCurrentData();
                if (cell) {
                    cell.textContent = '';
                    data.delete(getCellKey(row, col));
                    updateAIDataCache();
                    updateFormulaBar();
                    autoSave();
                }
            }
        },
        onBackspace: () => {
            if (!state.isEditing) {
                const { row, col } = state.selectedCell;
                const cell = getCellElement(row, col);
                const data = getCurrentData();
                if (cell) {
                    cell.textContent = '';
                    data.delete(getCellKey(row, col));
                    updateAIDataCache();
                    updateFormulaBar();
                    autoSave();
                }
            }
        },
        // F2 - начать редактирование
        onF2: () => {
            const { row, col } = state.selectedCell;
            editCell(row, col, true);
        },
        // Проверка состояния
        isEditing: () => state.isEditing,
        isSelecting: () => state.isSelecting,
    });
    keyboardController.init();
    console.log('[KeyboardController] Setup complete');
}
// === СИНХРОНИЗАЦИЯ ПОЗИЦИИ INPUT ПРИ СКРОЛЛЕ ===
function syncInputPositionWithScroll() {
    if (!state.isEditing)
        return;
    const { row, col } = state.editingCell;
    const input = getGlobalCellInput();
    const wrapper = elements.cellGridWrapper;
    // Пересчитываем позицию с учетом текущего скролла
    const cellLeft = col * CONFIG.CELL_WIDTH;
    const cellTop = row * CONFIG.CELL_HEIGHT;
    const posLeft = cellLeft - wrapper.scrollLeft;
    const posTop = cellTop - wrapper.scrollTop;
    input.style.left = posLeft + 'px';
    input.style.top = posTop + 'px';
}
function setupEventListeners() {
    // Обработчик скролла таблицы - синхронизировать позицию input
    elements.cellGridWrapper.addEventListener('scroll', () => {
        syncInputPositionWithScroll();
        // Также обновляем видимый диапазон при скролле
        calculateVisibleRange();
        renderVisibleCells();
    });
    // Переключение вкладок меню
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
            item.classList.add('active');
        });
    });
    // Изменение ц��ета текста
    document.addEventListener('text-color-change', (e) => {
        const event = e;
        applyColorToSelection('text', event.detail.color);
    });
    // Изменение цвета фона
    document.addEventListener('fill-color-change', (e) => {
        const event = e;
        applyColorToSelection('fill', event.detail.color);
    });
    // Выравнивание текста
    document.addEventListener('align-change', (e) => {
        const event = e;
        applyTextAlign(event.detail.align);
    });
    // Увеличение разрядности чисел
    document.addEventListener('increase-decimal', () => {
        changeDecimalPlaces(1);
    });
    // Уменьшение разрядности чисел
    document.addEventListener('decrease-decimal', () => {
        changeDecimalPlaces(-1);
    });
    // Автосумма
    document.addEventListener('auto-sum', () => {
        autoSum();
    });
    // Автоподбор ширины колонки
    document.addEventListener('auto-fit-column', () => {
        autoFitColumn(state.selectedCell.col);
    });
    // Перенос текста
    document.addEventListener('wrap-text', () => {
        toggleWrapText();
    });
    // Сортировка
    document.addEventListener('sort-data', () => {
        sortData();
    });
    // Фильтр
    document.addEventListener('filter-data', () => {
        toggleFilter();
    });
    // Сортировка A-Z
    document.addEventListener('sort-a-z', () => {
        sortColumnAZ();
    });
    // Фильтр данных
    document.addEventListener('filter-data-full', () => {
        filterDataFull();
    });
    // Удаление дубликатов
    document.addEventListener('remove-duplicates', () => {
        removeDuplicates();
    });
    // Вставка из ribbon
    document.addEventListener('paste-from-ribbon', (e) => {
        const event = e;
        pasteToCell(event.detail.text);
    });
    // Очистка ячейки (для вырезания)
    document.addEventListener('cell-cleared', (e) => {
        const event = e;
        clearCell(event.detail.row, event.detail.col);
    });
    // ==================== ВКЛАДКА: ВСТАВКА ====================
    // Вставка строки сверху
    document.addEventListener('insert-row-above', () => {
        insertRowAboveAt(state.selectedCell.row);
        renderCells();
        autoSave();
    });
    // Вставка строки снизу
    document.addEventListener('insert-row-below', () => {
        insertRowBelowAt(state.selectedCell.row);
        renderCells();
        autoSave();
    });
    // Вставка столбца слева
    document.addEventListener('insert-col-left', () => {
        insertColumnLeftAt(state.selectedCell.col);
        renderCells();
        autoSave();
    });
    // Вставка столбца справа
    document.addEventListener('insert-col-right', () => {
        insertColumnRightAt(state.selectedCell.col);
        renderCells();
        autoSave();
    });
    // Вставка изображения (плавающий объект)
    document.addEventListener('insert-image', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const result = event.target?.result;
                    insertImage(result);
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    });
    // Вставка изображения в ячейку
    document.addEventListener('insert-image-in-cell', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const result = event.target?.result;
                    insertImageInCell(result);
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    });
    // Вставка ссылки
    document.addEventListener('insert-link', () => {
        showPromptModal('Введите URL ссылки:', (url) => {
            if (!url)
                return;
            const { row, col } = state.selectedCell;
            const key = getCellKey(row, col);
            const data = getCurrentData();
            const cellData = data.get(key) || { value: '' };
            cellData.style = cellData.style || {};
            cellData.style.hyperlink = url;
            data.set(key, cellData);
            const cell = getCellElement(row, col);
            if (cell) {
                cell.style.color = '#0066cc';
                cell.style.textDecoration = 'underline';
                cell.style.cursor = 'pointer';
                cell.addEventListener('click', () => {
                    window.open(url, '_blank');
                });
            }
            updateAIDataCache();
            autoSave();
        });
    });
    // Вставка комментария
    document.addEventListener('insert-comment', () => {
        const { row, col } = state.selectedCell;
        const key = getCellKey(row, col);
        const data = getCurrentData();
        const cellData = data.get(key) || { value: '' };
        showPromptModal('Вв����дите комментарий:', (comment) => {
            if (!comment)
                return;
            cellData.style = cellData.style || {};
            cellData.style.comment = comment;
            data.set(key, cellData);
            const cell = getCellElement(row, col);
            if (cell) {
                cell.style.backgroundColor = '#ffeb3b';
                cell.title = comment;
            }
            updateAIDataCache();
            autoSave();
        });
    });
    // Вставка символа
    document.addEventListener('insert-symbol', () => {
        const symbols = ['©', '®', '™', '±', '×', '÷', '≠', '≤', '≥', '∞', '√', '°', '€', '£', '¥'];
        showPromptModal('Введите символ или выберите из: ' + symbols.join(', '), (symbol) => {
            if (!symbol)
                return;
            pasteToCell(symbol);
        });
    });
    // ==========================================
    // === МЕНЕДЖЕР ШАБЛОНОВ ===
    // ==========================================
    // Открытие менеджера шаблонов
    document.addEventListener('open-template-manager', () => {
        const component = document.querySelector('template-manager-component');
        if (component && typeof component.open === 'function') {
            component.open();
        }
    });
    // Вставка таблицы (плавающий объект)
    document.addEventListener('insert-table', () => {
        showPromptModal('Количество строк:', (rows) => {
            if (!rows)
                return;
            showPromptModal('Количество столбцов:', (cols) => {
                if (!cols)
                    return;
                const numRows = parseInt(rows);
                const numCols = parseInt(cols);
                const { row, col } = state.selectedCell;
                const cell = getCellElement(row, col);
                if (!cell)
                    return;
                const rect = cell.getBoundingClientRect();
                const container = document.getElementById('cellGridWrapper');
                if (!container)
                    return;
                // Создаём плавающую таблицу
                const tableContainer = document.createElement('div');
                tableContainer.className = 'floating-table';
                tableContainer.style.cssText = `
          position: absolute;
          left: ${rect.left + container.scrollLeft}px;
          top: ${rect.top + container.scrollTop}px;
          background: white;
          border: 2px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 1000;
          min-width: 200px;
          min-height: 100px;
          max-width: 800px;
          max-height: 600px;
        `;
                // Заголовок для перетаскивания
                const header = document.createElement('div');
                header.className = 'floating-header';
                header.style.cssText = `
          height: 28px;
          background: linear-gradient(to bottom, #f5f5f5, #e0e0e0);
          border-bottom: 1px solid #ddd;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 8px;
          cursor: move;
          user-select: none;
        `;
                const title = document.createElement('span');
                title.textContent = `Таблица ${numRows}x${numCols}`;
                title.style.cssText = `
          font-size: 12px;
          color: #666;
          font-weight: 500;
        `;
                const removeBtn = document.createElement('button');
                removeBtn.innerHTML = '×';
                removeBtn.style.cssText = `
          width: 20px;
          height: 20px;
          border: none;
          background: transparent;
          color: #666;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        `;
                removeBtn.onmouseover = () => {
                    removeBtn.style.background = '#ff4444';
                    removeBtn.style.color = 'white';
                };
                removeBtn.onmouseout = () => {
                    removeBtn.style.background = 'transparent';
                    removeBtn.style.color = '#666';
                };
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    tableContainer.remove();
                };
                header.appendChild(title);
                header.appendChild(removeBtn);
                tableContainer.appendChild(header);
                // Контейнер для таблицы с прокруткой
                const tableWrapper = document.createElement('div');
                tableWrapper.style.cssText = `
          position: relative;
          width: 100%;
          height: calc(100% - 28px);
          overflow: auto;
          padding: 8px;
        `;
                const table = document.createElement('table');
                table.style.cssText = `
          width: 100%;
          border-collapse: collapse;
          min-width: ${numCols * 80}px;
        `;
                // Создаём пустую таблицу
                for (let r = 0; r < numRows; r++) {
                    const tr = document.createElement('tr');
                    for (let c = 0; c < numCols; c++) {
                        const td = document.createElement('td');
                        td.contentEditable = 'true';
                        td.style.cssText = `
              padding: 8px;
              border: 1px solid #ccc;
              min-width: 80px;
              min-height: 24px;
            `;
                        tr.appendChild(td);
                    }
                    table.appendChild(tr);
                }
                tableWrapper.appendChild(table);
                tableContainer.appendChild(tableWrapper);
                container.appendChild(tableContainer);
                // Делаем таблицу перетаскиваемой за заголовок
                makeDraggableByHeader(tableContainer, header);
                // Добавляем изменение размера
                addResizeHandles(tableContainer);
                autoSave();
            });
        });
    });
    // Синхронизация скролла
    let scrollFrameId = null;
    elements.cellGridWrapper.addEventListener('scroll', () => {
        const scrollLeft = elements.cellGridWrapper.scrollLeft;
        const scrollTop = elements.cellGridWrapper.scrollTop;
        // Синхронизация заголовков столбцов
        elements.columnHeaders.scrollLeft = scrollLeft;
        // Синхронизация заголовков строк
        elements.rowHeaders.scrollTop = scrollTop;
        // Синхронизация фиксированных заголовков
        syncFixedHeaders();
        // Оптимизация: перерисовка только видимых ячеек при скролле
        if (scrollFrameId !== null) {
            cancelAnimationFrame(scrollFrameId);
        }
        scrollFrameId = requestAnimationFrame(() => {
            renderVisibleCells();
            scrollFrameId = null;
        });
    });
    // Изменение размера столбцов
    setupColumnResize();
    // Изменение размера строк
    setupRowResize();
    // Fill handle для ячеек
    setupFillHandle();
    // ИИ кнопка
    elements.btnAI.addEventListener('click', () => {
        elements.aiPanel.classList.add('open');
    });
    // Зум
    let zoom = parseInt(localStorage.getItem('smarttable-zoom') || '100');
    const BASE_CELL_WIDTH = 100;
    const BASE_CELL_HEIGHT = 32;
    const BASE_HEADER_WIDTH = 50;
    const BASE_HEADER_HEIGHT = 32;
    function updateZoom() {
        elements.zoomLabel.textContent = `${zoom}%`;
        const scale = zoom / 100;
        // Меняем размеры ячеек
        const newCellWidth = BASE_CELL_WIDTH * scale;
        const newCellHeight = BASE_CELL_HEIGHT * scale;
        const newHeaderWidth = BASE_HEADER_WIDTH * scale;
        const newHeaderHeight = BASE_HEADER_HEIGHT * scale;
        // Обновляем сетку ячеек
        elements.cellGrid.style.gridTemplateColumns = `repeat(${CONFIG.COLS}, ${newCellWidth}px)`;
        // Обновляем все ячейки
        const cells = elements.cellGrid.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.style.width = `${newCellWidth}px`;
            cell.style.height = `${newCellHeight}px`;
        });
        // Обновляем заголовки столбцов
        const colHeaders = elements.columnHeaders.querySelectorAll('.column-header');
        colHeaders.forEach(header => {
            header.style.width = `${newCellWidth}px`;
            header.style.minWidth = `${newCellWidth}px`;
            header.style.height = `${newHeaderHeight}px`;
        });
        // Обновляем заголовки строк
        const rowHeaders = elements.rowHeaders.querySelectorAll('.row-header');
        rowHeaders.forEach(header => {
            header.style.width = `${newHeaderWidth}px`;
            header.style.height = `${newCellHeight}px`;
        });
        // Обновляем угловой элемент
        const corner = document.querySelector('.corner-header');
        if (corner) {
            corner.style.width = `${newHeaderWidth}px`;
            corner.style.height = `${newHeaderHeight}px`;
        }
        // Обновляем размеры контейнеров
        elements.columnHeaders.style.height = `${newHeaderHeight}px`;
        elements.rowHeaders.style.width = `${newHeaderWidth}px`;
        // Сохраняем в localStorage
        localStorage.setItem('smarttable-zoom', zoom.toString());
    }
    // Инициализируем зум при загрузке
    updateZoom();
    elements.btnZoomIn.addEventListener('click', () => {
        zoom = Math.min(200, zoom + 10);
        console.log('Zoom in:', zoom);
        updateZoom();
    });
    elements.btnZoomOut.addEventListener('click', () => {
        zoom = Math.max(50, zoom - 10);
        console.log('Zoom out:', zoom);
        updateZoom();
    });
    // Горячие клавиши для зума
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            zoom = Math.min(200, zoom + 10);
            updateZoom();
        }
        else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
            e.preventDefault();
            zoom = Math.max(50, zoom - 10);
            updateZoom();
        }
        else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
            e.preventDefault();
            zoom = 100;
            updateZoom();
        }
    });
    // Инициализация зума при запуске
    updateZoom();
    // Переключение вкладок меню
    let currentMenuTab = 'home';
    const menuItems = document.querySelectorAll('.menu-item');
    console.log('[Renderer] Menu items found:', menuItems.length);
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            console.log('[Renderer] Menu item clicked:', item.dataset.tab);
            menuItems.forEach(m => m.classList.remove('active'));
            item.classList.add('active');
            currentMenuTab = item.dataset.tab || 'home';
            // Скрыть/показать формула-бар в зависимости от вкладки
            const formulaBarContainer = document.getElementById('formula-bar-container');
            if (formulaBarContainer) {
                if (currentMenuTab === 'formulas') {
                    formulaBarContainer.classList.add('visible');
                }
                else {
                    formulaBarContainer.classList.remove('visible');
                }
            }
        });
    });
    // Экспорт через меню Файл
    // elements.btnExport удалена из UI
    // Выделение диапазона мышью
    setupRangeSelection();
    // Делегирование событий для ячеек (вместо навешивания на каждую ячейку)
    setupCellEventListeners();
    // Контекстное меню (ПКМ)
    setupContextMenu();
    setupSheetContextMenu();
    // Формула бар - редактирование и выпадающий список формул
    elements.formulaInput.addEventListener('input', (e) => {
        const value = e.target.value;
        const { row, col } = state.selectedCell;
        const cell = getCellElement(row, col);
        const data = getCurrentData();
        if (cell) {
            // ✅ Live preview: показываем в ячейке что вводишь
            if (value.startsWith('=')) {
                // Это формула - показываем результат preview
                const result = previewFormula(value, (cellRef) => {
                    const match = cellRef.match(/^([A-Z]+)(\d+)$/i);
                    if (!match)
                        return '';
                    const refCol = letterToCol(match[1]);
                    const refRow = parseInt(match[2]) - 1;
                    const refKey = getCellKey(refRow, refCol);
                    const cellData = data.get(refKey);
                    return cellData?.value || '';
                });
                cell.textContent = String(result.value);
                console.log(`[FormulaBar Live] Formula ${value} → ${result.value}`);
            }
            else {
                // Обычное значение - показываем как есть
                cell.textContent = value;
            }
            if (value) {
                data.set(getCellKey(row, col), { value });
            }
            else {
                data.delete(getCellKey(row, col));
            }
            // Обновляем кэш при каждом изменении
            updateAIDataCache();
        }
        // Показываем выпадающий список формул при вводе =
        if (value.startsWith('=')) {
            const text = value.substring(1);
            // Получаем последнее слово после разделителей
            const parts = text.split(/[\(\),\s]/);
            const lastPart = parts[parts.length - 1] || '';
            if (lastPart.length > 0) {
                showFormulaSuggestions(lastPart, elements.formulaInput, elements.formulaSuggestions, elements.formulaSuggestionsList);
            }
            else {
                hideFormulaSuggestions(elements.formulaSuggestions);
            }
        }
        else {
            hideFormulaSuggestions(elements.formulaSuggestions);
        }
    });
    elements.formulaInput.addEventListener('keydown', (e) => {
        // Сначала проверяем навигацию по списку формул
        const handled = handleFormulaSuggestionsKeydown(e, elements.formulaSuggestions, elements.formulaSuggestionsList, elements.formulaInput);
        if (handled)
            return;
        if (e.key === 'Enter') {
            e.preventDefault();
            // ✅ Сохранить изменения из formula bar как если бы редактировали через global input
            const { row, col } = state.selectedCell;
            const key = getCellKey(row, col);
            const inputValue = elements.formulaInput.value;
            const data = getCurrentData();
            const oldValue = data.get(key);
            console.log(`[FormulaBar] Saving: ${inputValue}`);
            // ✅ НОВАЯ ЛОГИКА: Разделяем формулу и результат
            let finalValue = inputValue; // То что будет отображаться в ячейке
            let isFormula = false;
            // Вычислить формулу если есть
            if (inputValue.startsWith('=')) {
                isFormula = true;
                const result = previewFormula(inputValue, (cellRef) => {
                    const match = cellRef.match(/^([A-Z]+)(\d+)$/i);
                    if (!match)
                        return '';
                    const refCol = letterToCol(match[1]);
                    const refRow = parseInt(match[2]) - 1;
                    const cellKey = getCellKey(refRow, refCol);
                    const cellData = data.get(cellKey);
                    return cellData?.value || '';
                });
                finalValue = String(result.value);
                // Зарегистрировать формулу для реактивного обновления
                removeFormula(key);
                registerFormula(key, inputValue, (ref, formula) => {
                    state.cellFormulas.set(ref, formula);
                    console.log(`[Formulas] Registered: ${ref} = ${formula}`);
                });
                state.cellFormulas.set(key, inputValue);
            }
            else {
                // Если ввели обычное значение, удалить формулу
                removeFormula(key);
                if (state.cellFormulas.has(key)) {
                    state.cellFormulas.delete(key);
                }
            }
            // ✅ Сохраняем в data:
            // - value: результат для отображения в ячейке
            // - formula: саму формулу для показа в formula bar
            const cellDataToSave = {
                value: finalValue,
                ...(isFormula && { formula: inputValue }), // Сохраняем формулу если это формула
                ...oldValue // Сохраняем прежние стили и другие поля
            };
            if (finalValue || isFormula) {
                data.set(key, cellDataToSave);
            }
            else {
                data.delete(key);
            }
            pushUndo(key, oldValue);
            updateAIDataCache();
            // ✅ Пересчитать зависимые ячейки
            recalculateDependentCells(key, data);
            updateSingleCell(row, col);
            updateFormulaBar(); // Обновить formula bar после сохранения
            elements.formulaInput.blur();
            const cell = getCellElement(row, col);
            cell?.focus();
        }
        else if (e.key === 'Escape') {
            e.preventDefault();
            hideFormulaSuggestions(elements.formulaSuggestions);
            elements.formulaInput.blur();
            updateFormulaBar(); // Вернуть исходное значение
        }
    });
    // ✅ При фокусе на formula bar - выделить весь текст для удобного редактирования
    elements.formulaInput.addEventListener('focus', (e) => {
        const input = e.target;
        input.select(); // Выделить весь текст для быстрого редактирования
    });
    // ✅ При потере фокуса на formula bar - завершить редактирование
    elements.formulaInput.addEventListener('blur', () => {
        if (state.isEditing) {
            finishEditing(true);
        }
    });
    // Скрыть список формул при клике вне
    document.addEventListener('click', (e) => {
        if (!elements.formulaSuggestions.contains(e.target) && e.target !== elements.formulaInput) {
            hideFormulaSuggestions(elements.formulaSuggestions);
        }
    });
    // ==========================================
    // === КНОПКА ФОРМУЛ (btnFormula) ===
    // ==========================================
    // Клик по кнопке формул слева от строки формул
    const btnFormula = document.getElementById('btnFormula');
    if (btnFormula) {
        btnFormula.addEventListener('click', () => {
            // Показываем список функций
            showFormulaSuggestions('', elements.formulaInput, elements.formulaSuggestions, elements.formulaSuggestionsList);
            elements.formulaInput.focus();
        });
    }
    // Навигация по листам
    console.log('[Renderer] Setting up addSheet listener, btnAddSheet:', !!elements.btnAddSheet);
    if (elements.btnAddSheet) {
        elements.btnAddSheet.addEventListener('click', () => {
            console.log('[Renderer] Add sheet clicked');
            addSheet();
        });
    }
    // ИИ панель - открываем по кнопке в топ-баре
    const aiPanelContainer = document.getElementById('ai-panel-container');
    console.log('[Renderer] AI panel container:', !!aiPanelContainer);
    console.log('[Renderer] btnAI element:', !!elements.btnAI);
    if (elements.btnAI && aiPanelContainer) {
        elements.btnAI.addEventListener('click', () => {
            console.log('[Renderer] AI button clicked');
            aiPanelContainer.classList.toggle('open');
        });
    }
    if (elements.btnCloseAI && aiPanelContainer) {
        elements.btnCloseAI.addEventListener('click', () => {
            console.log('[Renderer] Close AI button clicked');
            aiPanelContainer.classList.remove('open');
        });
    }
    // ==========================================
    // === RESIZE HANDLE ДЛЯ AI ПАНЕЛИ ===
    // ==========================================
    const resizeHandle = document.getElementById('ai-panel-resize-handle');
    if (resizeHandle && aiPanelContainer) {
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = aiPanelContainer.offsetWidth;
            resizeHandle.classList.add('resizing');
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isResizing)
                return;
            const dx = startX - e.clientX;
            const newWidth = startWidth + dx;
            // Ограничения ширины
            if (newWidth >= 300 && newWidth <= 800) {
                aiPanelContainer.style.width = newWidth + 'px';
            }
        });
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                resizeHandle.classList.remove('resizing');
                // Сохранить ширину в localStorage
                localStorage.setItem('smarttable-ai-panel-width', aiPanelContainer.style.width);
            }
        });
        // Восстановить ширину из localStorage
        const savedWidth = localStorage.getItem('smarttable-ai-panel-width');
        if (savedWidth) {
            aiPanelContainer.style.width = savedWidth;
        }
    }
    elements.btnClearChat.addEventListener('click', () => {
        clearChatHistory();
        elements.aiChat.innerHTML = '<div class="ai-message ai-message-assistant">История чата очищена. Чем могу помочь?</div>';
    });
    // Кнопка очистки валидаций
    const btnClearValidations = document.getElementById('btnClearValidations');
    if (btnClearValidations) {
        btnClearValidations.addEventListener('click', () => {
            clearAllDataValidations();
            const msg = document.createElement('div');
            msg.className = 'ai-message ai-message-assistant';
            msg.textContent = '✅ Все валидации данных очищены!';
            elements.aiChat.appendChild(msg);
            elements.aiChat.scrollTop = elements.aiChat.scrollHeight;
        });
    }
    elements.btnAiSend.addEventListener('click', sendAiMessage);
    elements.aiInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            sendAiMessage();
        }
    });
    // Форматирование
    elements.btnBold?.addEventListener('click', () => toggleFormatting('bold'));
    elements.btnItalic?.addEventListener('click', () => toggleFormatting('italic'));
    elements.btnUnderline?.addEventListener('click', () => toggleFormatting('underline'));
    elements.btnStrike?.addEventListener('click', () => toggleFormatting('lineThrough'));
    // Границы
    elements.btnBorders?.addEventListener('click', () => toggleBorders());
    // Переключение видимости formula bar
    elements.btnToggleFormulaBar?.addEventListener('click', () => {
        const formulaBarContainer = document.getElementById('formula-bar-container');
        if (formulaBarContainer) {
            formulaBarContainer.classList.toggle('visible');
        }
    });
    // Обработчики для RibbonComponent (через события)
    // textColor и fillColor обрабатываются через text-color-change и fill-color-change события
    elements.fontFamily?.addEventListener('change', (e) => {
        applyStyle('fontFamily', e.target.value);
    });
    elements.fontSize?.addEventListener('change', (e) => {
        applyStyle('fontSize', `${e.target.value}px`);
    });
    // Глобальные горячие клавиши
    document.addEventListener('keydown', handleGlobalKeyDown);
    // ==================== ОБРАБОТЧИКИ FOCUS/BLUR ДЛЯ ОКНА ====================
    // Восстанавливаем фокус при возврате в окно
    let lastFocusedCell = null;
    window.addEventListener('blur', () => {
        // Сохраняем текущую выделенную ячейку
        lastFocusedCell = { ...state.selectedCell };
    });
    window.addEventListener('focus', () => {
        // Восстанавливаем фокус н�� таблице при возврате в окно
        if (lastFocusedCell) {
            const cell = getCellElement(lastFocusedCell.row, lastFocusedCell.col);
            if (cell) {
                cell.focus();
                // Убеждаемся что ячейка не в режиме редактирования
                if (state.isEditing) {
                    finishEditing();
                }
            }
        }
        // Фокус на cellGridWrapper для работы навигации
        const gridWrapper = elements.cellGridWrapper;
        if (gridWrapper && document.activeElement !== gridWrapper) {
            gridWrapper.focus({ preventScroll: true });
        }
    });
}
function handleGlobalKeyDown(e) {
    // Игнорируем если фокус на input/textarea
    const target = e.target;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
    }
    // Обработка стрелок для навигации
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                moveSelection(-1, 0);
                break;
            case 'ArrowDown':
                e.preventDefault();
                moveSelection(1, 0);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                moveSelection(0, -1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                moveSelection(0, 1);
                break;
            case 'Enter':
                e.preventDefault();
                moveSelection(1, 0);
                break;
            case 'Tab':
                e.preventDefault();
                moveSelection(0, e.shiftKey ? -1 : 1);
                break;
        }
        return;
    }
    // Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+Z, Ctrl+Y
    if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
            case 'b':
                e.preventDefault();
                toggleFormatting('bold');
                break;
            case 'i':
                e.preventDefault();
                toggleFormatting('italic');
                break;
            case 'u':
                e.preventDefault();
                toggleFormatting('underline');
                break;
            case 'z':
                e.preventDefault();
                undo();
                break;
            case 'y':
                e.preventDefault();
                redo();
                break;
            case 'k':
                e.preventDefault();
                elements.aiPanel.classList.toggle('open');
                break;
        }
    }
}
function moveSelection(deltaRow, deltaCol) {
    let newRow = state.selectedCell.row + deltaRow;
    let newCol = state.selectedCell.col + deltaCol;
    // Ограничиваем в пределах таблицы
    newRow = Math.max(0, Math.min(CONFIG.ROWS - 1, newRow));
    newCol = Math.max(0, Math.min(CONFIG.COLS - 1, newCol));
    // Выделяем новую ячейку
    selectCell(newRow, newCol);
    // Прокручиваем к ячейке если нужно
    scrollToCell(newRow, newCol);
}
function scrollToCell(row, col) {
    const cellTop = row * CONFIG.CELL_HEIGHT;
    const cellLeft = col * CONFIG.CELL_WIDTH;
    const cellBottom = cellTop + CONFIG.CELL_HEIGHT;
    const cellRight = cellLeft + CONFIG.CELL_WIDTH;
    const scrollTop = elements.cellGridWrapper.scrollTop;
    const scrollLeft = elements.cellGridWrapper.scrollLeft;
    const viewportHeight = elements.cellGridWrapper.clientHeight;
    const viewportWidth = elements.cellGridWrapper.clientWidth;
    let newScrollTop = scrollTop;
    let newScrollLeft = scrollLeft;
    // Прокрутка по вертикали
    if (cellTop < scrollTop) {
        newScrollTop = cellTop;
    }
    else if (cellBottom > scrollTop + viewportHeight) {
        newScrollTop = cellBottom - viewportHeight;
    }
    // Прокрутка по горизонтали
    if (cellLeft < scrollLeft) {
        newScrollLeft = cellLeft;
    }
    else if (cellRight > scrollLeft + viewportWidth) {
        newScrollLeft = cellRight - viewportWidth;
    }
    // Применяем прокрутку
    if (newScrollTop !== scrollTop || newScrollLeft !== scrollLeft) {
        elements.cellGridWrapper.scrollTop = newScrollTop;
        elements.cellGridWrapper.scrollLeft = newScrollLeft;
    }
}
// === ОБРАБОТЧИКИ ПЕРЕКЛЮЧЕНИЯ РЕЖИМОВ ИИ ===
const modeSwitcher = document.getElementById('aiModeSwitcher');
const btnConfirmModeSwitch = document.getElementById('btnConfirmModeSwitch');
const btnCancelModeSwitch = document.getElementById('btnCancelModeSwitch');
const btnAssistantMode = document.getElementById('btnAssistantMode');
const btnAgentMode = document.getElementById('btnAgentMode');
const aiQuickReplies = document.getElementById('aiQuickReplies');
// Обновление UI режима
function updateModeUI() {
    if (btnAssistantMode && btnAgentMode) {
        if (aiMode === 'assistant') {
            btnAssistantMode.classList.add('active');
            btnAgentMode.classList.remove('active');
        }
        else {
            btnAssistantMode.classList.remove('active');
            btnAgentMode.classList.add('active');
        }
    }
}
// Переключение режимов кнопками
if (btnAssistantMode) {
    btnAssistantMode.addEventListener('click', () => {
        aiMode = 'assistant';
        updateModeUI();
        addAiMessage('✅ Переключено в режим ассистента', 'assistant');
    });
}
if (btnAgentMode) {
    btnAgentMode.addEventListener('click', () => {
        aiMode = 'agent';
        updateModeUI();
        addAiMessage('✅ Переключено в режим агента', 'assistant');
    });
}
if (btnConfirmModeSwitch) {
    btnConfirmModeSwitch.addEventListener('click', () => {
        if (pendingModeSwitch) {
            aiMode = pendingModeSwitch;
            pendingModeSwitch = null;
            hideModeSwitcher();
            updateModeUI();
            addAiMessage(`✅ Переключено в режим ${aiMode === 'agent' ? 'агента' : 'ассистента'}`, 'assistant');
        }
    });
}
if (btnCancelModeSwitch) {
    btnCancelModeSwitch.addEventListener('click', () => {
        pendingModeSwitch = null;
        hideModeSwitcher();
        addAiMessage('Переключение отменено', 'assistant');
    });
}
// Быстрые ответы
function showQuickReplies(replies) {
    if (!aiQuickReplies)
        return;
    aiQuickReplies.innerHTML = '';
    replies.forEach(text => {
        const btn = document.createElement('button');
        btn.className = 'ai-quick-reply-btn';
        btn.textContent = text;
        btn.addEventListener('click', async () => {
            // Если это "Выполнить план" - выполняем сохранённый план
            if (text === '✅ Выполнить план') {
                hideQuickReplies();
                if (lastExecutionPlan.length > 0) {
                    addAiMessage('Выполняю план...', 'assistant');
                    for (const step of lastExecutionPlan) {
                        if (step.commands && step.commands.length > 0) {
                            await executeAICommands(step.commands);
                        }
                    }
                    lastExecutionPlan = [];
                }
            }
            else if (text === '❌ Отменить') {
                hideQuickReplies();
                lastExecutionPlan = [];
                addAiMessage('План отменён', 'assistant');
            }
            else {
                elements.aiInput.value = text;
                sendAiMessage();
            }
        });
        aiQuickReplies.appendChild(btn);
    });
}
function hideQuickReplies() {
    if (aiQuickReplies) {
        aiQuickReplies.innerHTML = '';
    }
}
function showModeSwitcher(mode) {
    if (modeSwitcher) {
        pendingModeSwitch = mode;
        const text = modeSwitcher.querySelector('.ai-mode-switcher-text');
        if (text) {
            text.textContent = mode === 'agent'
                ? 'Это сл����жная задача. Переключиться в режим агента для выполнения по шагам?'
                : 'Запрос простой. Переключиться в режим ассистента для быстрого ответа?';
        }
        modeSwitcher.style.display = 'flex';
    }
}
function hideModeSwitcher() {
    if (modeSwitcher) {
        modeSwitcher.style.display = 'none';
    }
}
// === ФОРМАТИРОВАНИЕ ===
function toggleFormatting(style) {
    const selection = getSelectedRange();
    if (!selection)
        return;
    const { startRow, endRow, startCol, endCol } = selection;
    const data = getCurrentData();
    let firstCellBold = false;
    // Проверяем стиль первой ячейки для определения состоян����я
    const firstKey = getCellKey(startRow, startCol);
    const firstCellData = data.get(firstKey);
    if (firstCellData && firstCellData.style) {
        if (style === 'bold' && firstCellData.style.fontWeight === 'bold')
            firstCellBold = true;
        if (style === 'italic' && firstCellData.style.fontStyle === 'italic')
            firstCellBold = true;
        if (style === 'underline' && firstCellData.style.textDecoration === 'underline')
            firstCellBold = true;
        if (style === 'lineThrough' && firstCellData.style.textDecoration === 'line-through')
            firstCellBold = true;
    }
    // Применяем ко всем выделенным ячейкам
    for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
            const key = getCellKey(row, col);
            const cell = getCellElement(row, col);
            if (!cell)
                continue;
            let cellData = data.get(key) || { value: cell.textContent || '' };
            if (!cellData.style) {
                cellData.style = {};
            }
            const newValue = !firstCellBold;
            switch (style) {
                case 'bold':
                    cellData.style.fontWeight = newValue ? 'bold' : 'normal';
                    cell.style.fontWeight = cellData.style.fontWeight;
                    break;
                case 'italic':
                    cellData.style.fontStyle = newValue ? 'italic' : 'normal';
                    cell.style.fontStyle = cellData.style.fontStyle;
                    break;
                case 'underline':
                    cellData.style.textDecoration = newValue ? 'underline' : 'none';
                    cell.style.textDecoration = cellData.style.textDecoration;
                    break;
                case 'lineThrough':
                    cellData.style.textDecoration = newValue ? 'line-through' : 'none';
                    cell.style.textDecoration = cellData.style.textDecoration;
                    break;
            }
            data.set(key, cellData);
        }
    }
    // Обновляем кнопки
    if (elements.btnBold)
        elements.btnBold.classList.toggle('active', style === 'bold' && !firstCellBold);
    if (elements.btnItalic)
        elements.btnItalic.classList.toggle('active', style === 'italic' && !firstCellBold);
    if (elements.btnUnderline)
        elements.btnUnderline.classList.toggle('active', style === 'underline' && !firstCellBold);
    if (elements.btnStrike)
        elements.btnStrike.classList.toggle('active', style === 'lineThrough' && !firstCellBold);
    renderCells();
    pushUndo('format', style);
}
// === ГРАНИЦЫ ===
function toggleBorders() {
    const selection = getSelectedRange();
    if (!selection)
        return;
    const { startRow, endRow, startCol, endCol } = selection;
    const data = getCurrentData();
    // Проверяем состояние первой ячейки
    const firstKey = getCellKey(startRow, startCol);
    const firstCellData = data.get(firstKey);
    const hasBorder = firstCellData && firstCellData.style &&
        (firstCellData.style.border || firstCellData.style.borderTop ||
            firstCellData.style.borderRight || firstCellData.style.borderBottom ||
            firstCellData.style.borderLeft);
    const newBorder = hasBorder ? '' : '1px solid #000000';
    // Применяем ко всем выделенным ячейкам
    for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
            const key = getCellKey(row, col);
            const cell = getCellElement(row, col);
            if (!cell)
                continue;
            let cellData = data.get(key) || { value: cell.textContent || '' };
            if (!cellData.style) {
                cellData.style = {};
            }
            if (newBorder) {
                cellData.style.border = newBorder;
            }
            else {
                delete cellData.style.border;
                delete cellData.style.borderTop;
                delete cellData.style.borderRight;
                delete cellData.style.borderBottom;
                delete cellData.style.borderLeft;
            }
            cell.style.border = cellData.style.border || '';
            data.set(key, cellData);
        }
    }
    // Обновляем кнопку
    if (elements.btnBorders) {
        elements.btnBorders.classList.toggle('active', !!newBorder);
    }
    renderCells();
    pushUndo('format', 'borders');
}
function applyStyle(property, value) {
    const data = getCurrentData();
    // Если есть выделенный диапазон - применяем ко всем ячейкам диапазона
    if (state.selectionStart && state.selectionEnd) {
        const minRow = Math.min(state.selectionStart.row, state.selectionEnd.row);
        const maxRow = Math.max(state.selectionStart.row, state.selectionEnd.row);
        const minCol = Math.min(state.selectionStart.col, state.selectionEnd.col);
        const maxCol = Math.max(state.selectionStart.col, state.selectionEnd.col);
        // Применяем стиль ко всем ячейкам диапазона
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                const cell = getCellElement(r, c);
                if (!cell)
                    continue;
                const key = getCellKey(r, c);
                const cellData = data.get(key) || { value: cell.textContent || '' };
                if (!cellData.style) {
                    cellData.style = {};
                }
                cellData.style[property] = value;
                cell.style[property] = value;
                data.set(key, cellData);
            }
        }
    }
    else {
        // Если нет диапазона - применяем к текущей ячейке
        const { row, col } = state.selectedCell;
        const cell = getCellElement(row, col);
        if (!cell)
            return;
        const key = getCellKey(row, col);
        const cellData = data.get(key) || { value: cell.textContent || '' };
        if (!cellData.style) {
            cellData.style = {};
        }
        cellData.style[property] = value;
        cell.style[property] = value;
        data.set(key, cellData);
    }
    pushUndo('format', property);
    autoSave();
}
// === ЛИСТЫ ===
function addSheet() {
    const id = state.sheets.length + 1;
    const name = `Лист ${id}`;
    state.sheets.push({ id, name });
    // Создать пустые данные для нового листа
    state.sheetsData.set(id, new Map());
    renderSheets();
    // Переключиться на новый лист
    switchSheet(id);
}
function renderSheets() {
    console.log('[Renderer] renderSheets called, sheets:', state.sheets.length);
    elements.sheetsList.innerHTML = '';
    state.sheets.forEach(sheet => {
        const tab = document.createElement('button');
        tab.className = `sheet-tab${sheet.id === state.currentSheet ? ' active' : ''}`;
        tab.dataset.sheet = sheet.id.toString();
        tab.innerHTML = `<span>${sheet.name}</span>`;
        tab.addEventListener('click', () => switchSheet(sheet.id));
        elements.sheetsList.appendChild(tab);
    });
    console.log('[Renderer] Sheets rendered:', elements.sheetsList.children.length);
}
function switchSheet(sheetId) {
    // Сохранить текущее состояние перед переключением
    const currentData = getCurrentData();
    state.currentSheet = sheetId;
    // Перерисовать таблицу с данными нового листа
    renderCells();
    renderSheets();
    // Обновить формулу бар
    updateFormulaBar();
}
// Показать диалог сохранения при выходе
async function showSaveDialog() {
    console.log('[ShowSaveDialog] Showing confirm dialog...');
    return new Promise((resolve) => {
        const result = confirm('Сохранить таблицу перед закрытием?\n\nOK - Сохранить в XLSX\nОтмена - Закрыть без сохранения');
        console.log('[ShowSaveDialog] User selected:', result);
        resolve(result);
    });
}
// Экспорт в XLSX с диалогом выбора файла
async function exportToXLSXWithDialog() {
    const data = [];
    // Собрать данные из таблицы
    for (let row = 0; row < CONFIG.ROWS; row++) {
        const rowData = [];
        for (let col = 0; col < CONFIG.COLS; col++) {
            const key = getCellKey(row, col);
            const tableData = getCurrentData();
            const cellData = tableData.get(key);
            rowData.push(cellData?.value || '');
        }
        data.push(rowData);
    }
    // Создаём XML Spreadsheet (Excel compatible)
    const content = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Sheet1">
    <Table>
${data.map(row => `      <Row>
${row.map(cell => `        <Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`).join('\n')}
      </Row>`).join('\n')}
    </Table>
  </Worksheet>
</Workbook>`;
    // Сохраняем через IPC
    if (ipcRenderer) {
        console.log('[Export] Calling save-file IPC handler...');
        try {
            const result = await ipcRenderer.invoke('save-file', {
                content,
                mimeType: 'application/vnd.ms-excel',
                extension: 'xls',
                defaultName: `SmartTable_${new Date().toISOString().slice(0, 10)}`
            });
            console.log('[Export] Save result:', result);
            if (result.success) {
                console.log('[Export] File saved successfully:', result.filePath);
            }
            else {
                console.log('[Export] Save cancelled by user');
            }
        }
        catch (error) {
            console.error('[Export] Error saving file:', error);
        }
    }
    else {
        console.error('[Export] ipcRenderer not available!');
    }
}
// Экранирование XML символов
function escapeXml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
async function sendAiMessage() {
    const input = elements.aiInput;
    const message = input.value.trim();
    if (!message)
        return;
    // Скрыть быстрые ответы и переключатель
    hideQuickReplies();
    hideModeSwitcher();
    // Добавить сообщение пользователя
    addAiMessage(message, 'user');
    chatHistory.push({ role: 'user', content: message });
    input.value = '';
    // Получить контекст таблицы
    const tableContext = getTableContext();
    // Проверяем доступность ipcRenderer
    if (!ipcRenderer) {
        console.warn('[Renderer] ipcRenderer not available');
        console.warn('[Renderer] window.electronAPI:', window.electronAPI);
        // Показываем сообщение об ошибке
        const loading = document.getElementById('ai-loading');
        if (loading)
            loading.remove();
        addAiMessage('Извините, ИИ функции недоступны. Проверьте консоль для подробностей.', 'assistant');
        return;
    }
    // Показать индикатор загрузки
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'ai-message ai-message-assistant';
    loadingMsg.textContent = 'Думаю...';
    loadingMsg.id = 'ai-loading';
    elements.aiChat.appendChild(loadingMsg);
    elements.aiChat.scrollTop = elements.aiChat.scrollHeight;
    try {
        // Отправляем текущий режим и историю
        const response = await ipcRenderer.invoke('ai-chat', {
            message,
            tableContext,
            mode: aiMode,
            history: chatHistory.slice(-5) // Последние 5 сообщений
        });
        const loading = document.getElementById('ai-loading');
        if (loading)
            loading.remove();
        if (response.success) {
            if (response.content) {
                // Очищаем текст от ** и других markdown символов
                let cleanText = response.content.replace(/\*\*/g, '').replace(/```json[\s\S]*?```/g, '').trim();
                const commands = parseAICommands(response.content);
                // Добавляем ответ в историю
                chatHistory.push({ role: 'assistant', content: cleanText });
                // Проверяем предложение переключить режим - показываем ПЕРЕД выполнением
                if (response.suggestModeSwitch && response.suggestModeSwitch !== aiMode) {
                    showModeSwitcher(response.suggestModeSwitch);
                    // Если есть план - показываем но не выполняем пока пользователь н�� подтвердит
                    if (response.executionPlan && response.executionPlan.length > 0) {
                        lastExecutionPlan = response.executionPlan; // Сохраняем план
                        addAiMessage('📋 Предл��гаю следующий план:', 'assistant');
                        response.executionPlan.forEach((step) => {
                            addAiMessage(`Шаг ${step.step}: ${step.action} - ${step.description}`, 'assistant');
                        });
                        showQuickReplies(['✅ Выполнить план', '❌ Отменить']);
                    }
                    return; // Выходим, не выполняем пока пользователь не подтвердит
                }
                // Если есть execution plan - показываем его
                if (response.executionPlan && response.executionPlan.length > 0) {
                    lastExecutionPlan = response.executionPlan; // Сохраняем план
                    addAiMessage('📋 План выполнения:', 'assistant');
                    response.executionPlan.forEach((step) => {
                        addAiMessage(`Шаг ${step.step}: ${step.action} - ${step.description}`, 'assistant');
                    });
                    // Показываем кнопки подтверждения
                    showQuickReplies(['✅ Выполнить план', '❌ Отменить']);
                    // Если в плане есть команды - выполняем их сразу (уже в режиме агента)
                    for (const step of response.executionPlan) {
                        if (step.commands && step.commands.length > 0) {
                            await executeAICommands(step.commands);
                        }
                    }
                }
                if (commands && commands.length > 0) {
                    if (!response.executionPlan || response.executionPlan.length === 0) {
                        addAiMessage(cleanText, 'assistant');
                    }
                    await executeAICommands(commands);
                }
                else if (!response.executionPlan || response.executionPlan.length === 0) {
                    addAiMessage(cleanText, 'assistant');
                    // Показываем быстрые ответы для простых запросов
                    const lowerMsg = message.toLowerCase();
                    if (lowerMsg.includes('привет') || lowerMsg.includes('здравствуйте')) {
                        showQuickReplies([
                            '📊 Заполни таблицу дан��ыми',
                            '🎨 Покр��сь яче��ки',
                            '📈 Посчитай суммы'
                        ]);
                    }
                }
            }
        }
        else {
            addAiMessage(`❌ Ошибка: ${response.error}`, 'assistant');
        }
    }
    catch (error) {
        const loading = document.getElementById('ai-loading');
        if (loading)
            loading.remove();
        console.error('[Renderer] AI error:', error);
        addAiMessage(`❌ Ошибка: ${error.message || error}`, 'assistant');
    }
}
function getTableContext() {
    // Используем актуальный кэш данных
    const lines = [];
    // Header row
    lines.push('Row | A | B | C | D | E | F | G | H | I | J | K | L | M | N | O');
    lines.push('-'.repeat(70));
    // Группируем данные по строкам
    const rowsMap = new Map();
    state.aiDataCache.forEach(item => {
        if (!rowsMap.has(item.row)) {
            rowsMap.set(item.row, new Map());
        }
        rowsMap.get(item.row).set(item.col, item.value);
    });
    // Показываем строки с данными
    const sortedRows = Array.from(rowsMap.keys()).sort((a, b) => a - b);
    if (sortedRows.length === 0) {
        lines.push('(таблица пуста)');
    }
    else {
        sortedRows.slice(0, 20).forEach(rowNum => {
            const rowData = [String(rowNum + 1)];
            const row = rowsMap.get(rowNum);
            for (let col = 0; col < 15; col++) {
                rowData.push(row.get(col) || '');
            }
            lines.push(rowData.join(' | '));
        });
    }
    return lines.join('\n');
}
// === AI COMMANDS ===
function parseAICommands(content) {
    const commands = [];
    console.log('[DEBUG] parseAICommands - content:', content.substring(0, 500));
    // Find JSON blocks
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/g;
    let match;
    while ((match = jsonRegex.exec(content)) !== null) {
        try {
            const jsonStr = match[1].trim();
            console.log('[DEBUG] Found JSON block:', jsonStr.substring(0, 200));
            const parsed = JSON.parse(jsonStr);
            if (parsed.commands && Array.isArray(parsed.commands)) {
                console.log('[DEBUG] Found commands array:', parsed.commands.length);
                for (const cmd of parsed.commands) {
                    // Конвертируем cell в column и row если есть
                    if (cmd.params && cmd.params.cell && typeof cmd.params.cell === 'string') {
                        const cellMatch = cmd.params.cell.match(/^([A-Z])(\d+)$/i);
                        if (cellMatch) {
                            cmd.params.column = cellMatch[1].toUpperCase().charCodeAt(0) - 65;
                            cmd.params.row = parseInt(cellMatch[2]);
                            console.log('[DEBUG] parseAICommands converted cell', cmd.params.cell, 'to column:', cmd.params.column, 'row:', cmd.params.row);
                        }
                    }
                    // Преобразуем все варианты команд форматирования в наши команды
                    const action = cmd.action?.toLowerCase();
                    if (action === 'format_cells' || action === 'style_cells' || action === 'format_cell' || action === 'style_cell') {
                        // Это форматирование ячейки - преобразуем в set_cell_color
                        if (cmd.params) {
                            if (cmd.params.range) {
                                // range типа "A1" или "A1:B2"
                                const singleCellMatch = cmd.params.range.match(/^([A-Z])(\d+)$/);
                                if (singleCellMatch) {
                                    cmd.action = 'set_cell_color';
                                    cmd.params.column = singleCellMatch[1];
                                    cmd.params.row = parseInt(singleCellMatch[2]);
                                }
                            }
                            else if (cmd.params.cell) {
                                // cell типа "A1"
                                const cellMatch = cmd.params.cell.match(/^([A-Z])(\d+)$/);
                                if (cellMatch) {
                                    cmd.action = 'set_cell_color';
                                    cmd.params.column = cellMatch[1];
                                    cmd.params.row = parseInt(cellMatch[2]);
                                }
                            }
                            else if (cmd.params.column && cmd.params.row) {
                                // Уже есть column и row
                                cmd.action = 'set_cell_color';
                            }
                        }
                    }
                    else if (action === 'format_column' || action === 'style_column') {
                        // Преобразуем в color_column
                        cmd.action = 'color_column';
                    }
                    else if (action === 'format_row' || action === 'style_row') {
                        // Преобразуем в color_row
                        cmd.action = 'color_row';
                    }
                    else if (action === 'fill_background' || action === 'set_background') {
                        // Преобразуем в set_table_bg
                        cmd.action = 'set_table_bg';
                    }
                    commands.push(cmd);
                }
            }
            else if (parsed.action) {
                console.log('[DEBUG] Found single action:', parsed.action);
                commands.push(parsed);
            }
        }
        catch (e) {
            console.warn('[DEBUG] Failed to parse JSON from AI response:', e);
        }
    }
    // Если не найдено команд в JSON блоках, пробуем найти просто JSON
    if (commands.length === 0) {
        try {
            // Пробуем найти JSON без markdown обёртки
            const jsonMatch = content.match(/\{[\s\S]*"commands"[\s\S]*\}/);
            if (jsonMatch) {
                console.log('[DEBUG] Found raw JSON:', jsonMatch[0].substring(0, 200));
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.commands && Array.isArray(parsed.commands)) {
                    commands.push(...parsed.commands);
                }
            }
        }
        catch (e) {
            console.warn('[DEBUG] Failed to parse raw JSON:', e);
        }
    }
    console.log('[DEBUG] Total parsed commands:', commands.length);
    return commands;
}
async function executeAICommands(commands) {
    for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        const { action, params, description } = cmd;
        // Показываем описание действия
        const statusMsg = document.createElement('div');
        statusMsg.className = 'ai-message ai-message-assistant ai-status';
        statusMsg.textContent = `⚙️ ${description || `Выполняю ${action}...`}`;
        elements.aiChat.appendChild(statusMsg);
        elements.aiChat.scrollTop = elements.aiChat.scrollHeight;
        // Выполняем команду с анимацией
        await executeSingleCommand(action, params);
        // Удаляем статус
        statusMsg.remove();
    }
    // Соо��щение об успехе
    const successMsg = document.createElement('div');
    successMsg.className = 'ai-message ai-message-assistant';
    successMsg.textContent = `✅ Выполнено команд: ${commands.length}`;
    elements.aiChat.appendChild(successMsg);
    elements.aiChat.scrollTop = elements.aiChat.scrollHeight;
}
// Конвертер названий цветов в HEX
function normalizeColor(color) {
    if (!color)
        return '';
    // Если уже HEX формат, возвращаем как есть
    if (color.startsWith('#'))
        return color;
    const colorMap = {
        // Основные цвета
        'red': '#FF5252',
        'green': '#4CAF50',
        'blue': '#2196F3',
        'yellow': '#FFEB3B',
        'orange': '#FF9800',
        'purple': '#9C27B0',
        'pink': '#E91E63',
        'cyan': '#00BCD4',
        'teal': '#009688',
        'lime': '#CDDC39',
        'indigo': '#3F51B5',
        'brown': '#795548',
        'grey': '#9E9E9E',
        'gray': '#9E9E9E',
        'white': '#FFFFFF',
        'black': '#000000',
        // Светлые оттенки (для фона)
        'light red': '#FFEBEE',
        'light green': '#E8F5E9',
        'light blue': '#E3F2FD',
        'light yellow': '#FFFDE7',
        'light orange': '#FFF3E0',
        'light purple': '#F3E5F5',
        'light pink': '#FCE4EC',
        'light cyan': '#E0F7FA',
        'light teal': '#E0F2F1',
        'light lime': '#F9FBE7',
        'light indigo': '#E8EAF6',
        'light brown': '#EFEBE9',
        'light grey': '#F5F5F5',
        'light gray': '#F5F5F5',
        // Тёмные оттенки (для текста)
        'dark red': '#C62828',
        'dark green': '#2E7D32',
        'dark blue': '#1565C0',
        'dark yellow': '#F9A825',
        'dark orange': '#E65100',
        'dark purple': '#6A1B9A',
        'dark pink': '#C2185B',
        'dark cyan': '#006064',
        'dark teal': '#004D40',
        'dark lime': '#827717',
        'dark indigo': '#283593',
        'dark brown': '#3E2723',
        'dark grey': '#424242',
        'dark gray': '#424242'
    };
    const normalized = color.toLowerCase().trim();
    const result = colorMap[normalized] || color;
    console.log('[DEBUG] normalizeColor:', color, '->', result);
    return result;
}
// Применение стиля к ячейке
function applyCellStyle(cell, row, col, params, data) {
    const bg_color = params.bg_color ? normalizeColor(params.bg_color) : undefined;
    const text_color = params.text_color ? normalizeColor(params.text_color) : undefined;
    const background = params.background ? normalizeColor(params.background) : undefined;
    const color = params.color ? normalizeColor(params.color) : undefined;
    if (bg_color || background) {
        cell.style.backgroundColor = bg_color || background || '';
    }
    if (text_color || color) {
        cell.style.color = text_color || color || '';
    }
    // Сохраняем в данные
    const key = getCellKey(row, col);
    const cellData = data.get(key) || { value: cell.textContent };
    data.set(key, {
        ...cellData,
        style: {
            ...cellData.style,
            backgroundColor: bg_color || background,
            color: text_color || color
        }
    });
    updateAIDataCache();
    console.log('[DEBUG] applyCellStyle:', row, col, { bg_color, text_color });
}
async function executeSingleCommand(action, params) {
    console.log('[DEBUG] executeSingleCommand called with:', { action, params });
    // Проверяем что params существует
    if (!params) {
        console.warn('[DEBUG] executeSingleCommand called without params:', action);
        return;
    }
    // Если есть cell (��апример "E2"), конвертируем в column и row
    if (params.cell && typeof params.cell === 'string') {
        const cellMatch = params.cell.match(/^([A-Z])(\d+)$/i);
        if (cellMatch) {
            params.column = cellMatch[1].toUpperCase().charCodeAt(0) - 65;
            params.row = parseInt(cellMatch[2]);
            console.log('[DEBUG] Converted cell', params.cell, 'to column:', params.column, 'row:', params.row);
        }
    }
    // Провер��ем что column и row существуют для команд которые их требуют
    const requiresColumnRow = ['set_cell', 'set_cell_color', 'set_formula', 'color_row'];
    if (requiresColumnRow.includes(action)) {
        if (params.column === undefined || params.column === null) {
            console.error('[DEBUG] Command', action, 'requires column but got:', params);
            throw new Error(`Command ${action} requires column parameter`);
        }
        if (params.row === undefined || params.row === null) {
            console.error('[DEBUG] Command', action, 'requires row but got:', params);
            throw new Error(`Command ${action} requires row parameter`);
        }
    }
    // color_column требует только column
    if (action === 'color_column') {
        if (params.column === undefined || params.column === null) {
            console.error('[DEBUG] Command color_column requires column but got:', params);
            throw new Error(`Command color_column requires column parameter`);
        }
    }
    // Нормализуем цвета в параметрах
    if (params.bg_color)
        params.bg_color = normalizeColor(params.bg_color);
    if (params.text_color)
        params.text_color = normalizeColor(params.text_color);
    console.log('[DEBUG] Executing action:', action, 'params:', params);
    const data = getCurrentData();
    // Конвертируем column из буквы в число если нужно (на случай если ещё не конвертировано)
    if (params.column && typeof params.column === 'string') {
        const colLetter = params.column.toUpperCase();
        params.column = colLetter.charCodeAt(0) - 65;
        console.log('[DEBUG] Converted column', colLetter, 'to', params.column);
    }
    // Конвертируем row в число если это строка
    if (params.row && typeof params.row === 'string') {
        params.row = parseInt(params.row);
    }
    switch (action) {
        case 'set_data_validation':
            {
                // Установка dropdown списка
                console.log('[DEBUG] Setting data validation:', params);
                const { cell, values } = params;
                if (cell && Array.isArray(values)) {
                    setDataValidation(cell, values);
                    renderCells(); // Перерисовать для показа dropdown
                    console.log('[DEBUG] Data validation set for', cell, ':', values);
                }
            }
            break;
        case 'set_conditional_format':
            {
                // Установка условного форматирования
                console.log('[DEBUG] Setting conditional format:', params);
                const { range, rule, style } = params;
                if (range && rule) {
                    addConditionalFormat(range, rule, style || {});
                    console.log('[DEBUG] Conditional format set for', range, ':', rule);
                }
            }
            break;
        case 'create_chart':
            {
                // Создание диаграммы через ChartsWidget
                console.log('[DEBUG] Creating chart:', params);
                const chartData = getSelectedRangeData();
                // Если нет выделения, используем все данные из таблицы
                if (chartData.labels.length === 0) {
                    // Берём данные из первых двух столбцов
                    const labels = [];
                    const values = [];
                    for (let row = 0; row < 20; row++) {
                        const keyA = `${row}-0`;
                        const keyB = `${row}-1`;
                        const cellA = data.get(keyA);
                        const cellB = data.get(keyB);
                        if (cellA?.value) {
                            labels.push(cellA.value);
                            if (cellB?.value) {
                                const numValue = parseFloat(cellB.value);
                                values.push(isNaN(numValue) ? 0 : numValue);
                            }
                        }
                    }
                    if (labels.length > 0) {
                        chartData.labels = labels;
                        chartData.datasets = [{ label: 'Данные', data: values }];
                    }
                }
                // Создаём диаграмму
                const chartType = params?.type || 'bar';
                const chartTitle = params?.title || 'Диаграмма по данным';
                // Ищем ChartsWidget в глобальной области
                const chartsWidget = window.chartsWidget;
                if (chartsWidget && chartData.labels.length > 0) {
                    chartsWidget.createChartFromRange(chartData, chartType, chartTitle);
                    console.log('[DEBUG] Chart created:', chartType, chartTitle);
                }
                else {
                    console.warn('[DEBUG] ChartsWidget not found or no data');
                }
            }
            break;
        case 'format_cells':
        case 'style_cells':
        case 'format_cell':
        case 'style_cell':
            {
                // Обработка команд форматирования ячеек
                console.log('[DEBUG] format_cells params:', params);
                // Разбираем range
                if (params.range) {
                    // range типа "A1" или "A1:B2"
                    const rangeParts = params.range.split(':');
                    const startMatch = rangeParts[0].match(/^([A-Z])(\d+)$/);
                    if (startMatch) {
                        const startCol = startMatch[1].toUpperCase().charCodeAt(0) - 65;
                        const startRow = parseInt(startMatch[2]) - 1;
                        if (rangeParts.length === 1) {
                            // Одиночная ячейка A1
                            const cell = getCellElement(startRow, startCol);
                            if (cell) {
                                applyCellStyle(cell, startRow, startCol, params, data);
                            }
                        }
                        else {
                            // Диапазон A1:B2
                            const endMatch = rangeParts[1].match(/^([A-Z])(\d+)$/);
                            if (endMatch) {
                                const endCol = endMatch[1].toUpperCase().charCodeAt(0) - 65;
                                const endRow = parseInt(endMatch[2]) - 1;
                                for (let r = startRow; r <= endRow; r++) {
                                    for (let c = startCol; c <= endCol; c++) {
                                        const cell = getCellElement(r, c);
                                        if (cell) {
                                            applyCellStyle(cell, r, c, params, data);
                                        }
                                    }
                                }
                            }
                        }
                        console.log('[DEBUG] format_cells executed for range:', params.range);
                    }
                }
                else if (params.cells && Array.isArray(params.cells)) {
                    // Массив ячеек [{cell: "A1", bg_color: "#FFF"}, ...]
                    for (const cellInfo of params.cells) {
                        if (cellInfo.cell) {
                            const cellMatch = cellInfo.cell.match(/^([A-Z])(\d+)$/);
                            if (cellMatch) {
                                const col = cellMatch[1].toUpperCase().charCodeAt(0) - 65;
                                const row = parseInt(cellMatch[2]) - 1;
                                const cell = getCellElement(row, col);
                                if (cell) {
                                    applyCellStyle(cell, row, col, cellInfo, data);
                                }
                            }
                        }
                    }
                    console.log('[DEBUG] format_cells executed for cells array');
                }
            }
            break;
        case 'set_cell':
            {
                // Проверяем что column и row существуют
                if (params.column === undefined || params.row === undefined) {
                    console.warn('[DEBUG] set_cell: missing column or row');
                    break;
                }
                const colIndex = typeof params.column === 'string'
                    ? params.column.toUpperCase().charCodeAt(0) - 65
                    : params.column;
                const rowIndex = params.row - 1;
                const cell = getCellElement(rowIndex, colIndex);
                if (cell) {
                    // Если есть цвет - применяем его
                    if (params.bg_color || params.text_color) {
                        if (params.bg_color) {
                            cell.style.backgroundColor = params.bg_color;
                        }
                        if (params.text_color) {
                            cell.style.color = params.text_color;
                        }
                        const key = getCellKey(rowIndex, colIndex);
                        const cellData = data.get(key) || { value: cell.textContent };
                        data.set(key, { ...cellData, style: { ...cellData.style, backgroundColor: params.bg_color, color: params.text_color } });
                        updateAIDataCache();
                        console.log('[DEBUG] set_cell with color applied');
                    }
                    // Если есть значение - устанавливаем его
                    if (params.value !== undefined) {
                        await animateCellChange(cell, params.value);
                        const key = getCellKey(rowIndex, colIndex);
                        data.set(key, { value: params.value });
                        updateAIDataCache();
                    }
                }
            }
            break;
        case 'fill_table':
            {
                const tableData = params.data;
                data.clear();
                for (let r = 0; r < tableData.length; r++) {
                    for (let c = 0; c < tableData[r].length; c++) {
                        const key = getCellKey(r, c);
                        const value = tableData[r][c];
                        data.set(key, { value });
                        const cell = getCellElement(r, c);
                        if (cell && value) {
                            await animateCellChange(cell, value, 50);
                        }
                    }
                }
                updateAIDataCache();
                renderCells(); // Перерисовать таблицу
            }
            break;
        case 'clear_cell':
            {
                if (params.column === undefined || params.row === undefined) {
                    console.warn('[DEBUG] clear_cell: missing column or row');
                    break;
                }
                const colIndex = typeof params.column === 'string'
                    ? params.column.toUpperCase().charCodeAt(0) - 65
                    : params.column;
                const rowIndex = params.row - 1;
                const cell = getCellElement(rowIndex, colIndex);
                if (cell) {
                    await animateCellChange(cell, '', 200);
                    const key = getCellKey(rowIndex, colIndex);
                    data.delete(key);
                    updateAIDataCache();
                }
            }
            break;
        case 'clear_column':
            {
                if (params.column === undefined) {
                    console.warn('[DEBUG] clear_column: missing column');
                    break;
                }
                const colIndex = typeof params.column === 'string'
                    ? params.column.toUpperCase().charCodeAt(0) - 65
                    : params.column;
                for (let r = 0; r < CONFIG.ROWS; r++) {
                    const cell = getCellElement(r, colIndex);
                    const key = getCellKey(r, colIndex);
                    if (cell && data.has(key)) {
                        await animateCellChange(cell, '', 50);
                        data.delete(key);
                    }
                }
                updateAIDataCache();
            }
            break;
        case 'clear_all':
            {
                const cells = elements.cellGrid.querySelectorAll('.cell');
                cells.forEach((cell, index) => {
                    setTimeout(() => {
                        cell.style.backgroundColor = '#ffcccc';
                        setTimeout(() => {
                            cell.style.backgroundColor = '';
                            cell.textContent = '';
                        }, 100);
                    }, index * 5);
                });
                data.clear();
                updateAIDataCache();
                await sleep(500);
            }
            break;
        case 'set_cell_color':
            {
                if (params.column === undefined || params.row === undefined) {
                    console.warn('[DEBUG] set_cell_color: missing column or row');
                    break;
                }
                console.log('[DEBUG] set_cell_color:', params);
                const colIndex = typeof params.column === 'string'
                    ? params.column.toUpperCase().charCodeAt(0) - 65
                    : params.column;
                const rowIndex = params.row - 1;
                console.log('[DEBUG] colIndex:', colIndex, 'rowIndex:', rowIndex);
                const cell = getCellElement(rowIndex, colIndex);
                console.log('[DEBUG] cell:', cell);
                if (cell) {
                    if (params.bg_color) {
                        console.log('[DEBUG] Setting bg_color:', params.bg_color);
                        cell.style.backgroundColor = params.bg_color;
                    }
                    if (params.text_color) {
                        console.log('[DEBUG] Setting text_color:', params.text_color);
                        cell.style.color = params.text_color;
                    }
                    const key = getCellKey(rowIndex, colIndex);
                    const cellData = data.get(key) || { value: cell.textContent };
                    data.set(key, { ...cellData, style: { ...cellData.style, backgroundColor: params.bg_color, color: params.text_color } });
                    updateAIDataCache();
                }
            }
            break;
        case 'color_column':
            {
                if (params.column === undefined) {
                    console.warn('[DEBUG] color_column: missing column');
                    break;
                }
                console.log('[DEBUG] color_column:', params);
                const colIndex = typeof params.column === 'string'
                    ? params.column.toUpperCase().charCodeAt(0) - 65
                    : params.column;
                // ИИ может отправлять 'color' или 'bg_color'
                const bgColor = params.bg_color || params.color;
                console.log('[DEBUG] colIndex:', colIndex, 'bg_color:', bgColor);
                let coloredCount = 0;
                for (let r = 0; r < CONFIG.ROWS; r++) {
                    const cell = getCellElement(r, colIndex);
                    if (cell) {
                        if (bgColor) {
                            cell.style.backgroundColor = bgColor;
                        }
                        if (params.text_color) {
                            cell.style.color = params.text_color;
                        }
                        coloredCount++;
                        const key = getCellKey(r, colIndex);
                        const cellData = data.get(key) || { value: cell.textContent };
                        data.set(key, { ...cellData, style: { ...cellData.style, backgroundColor: bgColor, color: params.text_color } });
                    }
                }
                console.log('[DEBUG] Colored cells:', coloredCount);
                updateAIDataCache();
            }
            break;
        case 'color_row':
            {
                if (params.row === undefined) {
                    console.warn('[DEBUG] color_row: missing row');
                    break;
                }
                const rowIndex = typeof params.row === 'string' ? parseInt(params.row) - 1 : params.row - 1;
                for (let c = 0; c < CONFIG.COLS; c++) {
                    const cell = getCellElement(rowIndex, c);
                    if (cell) {
                        if (params.bg_color) {
                            cell.style.backgroundColor = params.bg_color;
                        }
                        if (params.text_color) {
                            cell.style.color = params.text_color;
                        }
                        const key = getCellKey(rowIndex, c);
                        const cellData = data.get(key) || { value: cell.textContent };
                        data.set(key, { ...cellData, style: { ...cellData.style, backgroundColor: params.bg_color, color: params.text_color } });
                    }
                }
                updateAIDataCache();
            }
            break;
        case 'color_table':
            {
                const cells = elements.cellGrid.querySelectorAll('.cell');
                cells.forEach((cell, index) => {
                    setTimeout(() => {
                        const cellEl = cell;
                        if (params.bg_color) {
                            cellEl.style.backgroundColor = params.bg_color;
                        }
                        if (params.text_color) {
                            cellEl.style.color = params.text_color;
                        }
                    }, index * 5);
                });
                // Сохраняем стили для всех ячеек
                data.forEach((cellData, key) => {
                    data.set(key, { ...cellData, style: { ...cellData.style, backgroundColor: params.bg_color, color: params.text_color } });
                });
                updateAIDataCache();
            }
            break;
        case 'set_table_bg':
            {
                const cells = elements.cellGrid.querySelectorAll('.cell');
                cells.forEach((cell, index) => {
                    setTimeout(() => {
                        cell.style.backgroundColor = params.bg_color;
                    }, index * 3);
                });
                data.forEach((cellData, key) => {
                    data.set(key, { ...cellData, style: { ...cellData.style, backgroundColor: params.bg_color } });
                });
                updateAIDataCache();
            }
            break;
        case 'set_formula':
            {
                // Проверяем что column и row существуют
                if (params.column === undefined || params.row === undefined) {
                    console.warn('[DEBUG] set_formula: missing column or row');
                    break;
                }
                // Конвертируем column из буквы в число если это строка
                const colIndex = typeof params.column === 'string'
                    ? params.column.toUpperCase().charCodeAt(0) - 65
                    : params.column;
                const rowIndex = params.row - 1;
                const cell = getCellElement(rowIndex, colIndex);
                if (cell) {
                    const formula = params.formula || params.value;
                    if (formula && formula.startsWith('=')) {
                        // Устанавливаем формулу
                        const key = getCellKey(rowIndex, colIndex);
                        data.set(key, { value: formula });
                        updateAIDataCache();
                        // Вычисляем формулу через глобальную функцию
                        const result = window.calculateCellFormula(formula, rowIndex, colIndex, (r, c) => {
                            const cellKey = getCellKey(r, c);
                            const cellData = data.get(cellKey);
                            return cellData?.value || '';
                        });
                        cell.textContent = String(result);
                        console.log('[DEBUG] set_formula:', formula, 'result:', result);
                    }
                    else {
                        // Обычное значение
                        await animateCellChange(cell, formula);
                        const key = getCellKey(rowIndex, colIndex);
                        data.set(key, { value: formula });
                        updateAIDataCache();
                    }
                }
            }
            break;
        default:
            console.warn('[DEBUG] Unknown action:', action, params);
    }
}
function animateCellChange(cell, newValue, duration = 80) {
    return new Promise(resolve => {
        // Быстрая анимация изменения
        cell.style.transition = 'all 0.15s ease';
        cell.style.backgroundColor = '#d1fae5';
        setTimeout(() => {
            cell.textContent = newValue;
            cell.style.backgroundColor = '#fef08a';
            setTimeout(() => {
                cell.style.backgroundColor = '';
                cell.style.transition = '';
                resolve();
            }, duration);
        }, 80);
    });
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function addAiMessage(text, type) {
    const message = document.createElement('div');
    message.className = `ai-message ai-message-${type}`;
    // Обрабатываем markdown и код
    if (type === 'assistant') {
        const html = processMarkdown(text);
        message.innerHTML = html;
    }
    else {
        message.textContent = text;
    }
    elements.aiChat.appendChild(message);
    elements.aiChat.scrollTop = elements.aiChat.scrollHeight;
}
// Обработка markdown для AI сообщений
function processMarkdown(text) {
    let html = text;
    // Обработка блоков кода
    html = html.replace(/```(\w*)\s*\n?([\s\S]*?)\s*```/g, (match, lang, code) => {
        const language = lang || 'text';
        const highlighted = highlightCode(code.trim(), language);
        return `<pre data-language="${language}"><code class="language-${language}">${highlighted}</code></pre>`;
    });
    // Обработка inline кода
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Жирный текст
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Курсив
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Переносы строк
    html = html.replace(/\n/g, '<br>');
    return html;
}
// Подсветка синтаксиса для кода
function highlightCode(code, language) {
    // Сначала обрабатываем HTML сущности
    let highlighted = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    if (language === 'python') {
        highlighted = highlighted
            // Комментарии
            .replace(/(#.*$)/gm, '<span class="token comment">$1</span>')
            // Строки
            .replace(/("[^"]*")/g, '<span class="token string">$1</span>')
            .replace(/('[^']*')/g, '<span class="token string">$1</span>')
            // Числа
            .replace(/\b(\d+\.?\d*)\b/g, '<span class="token number">$1</span>')
            // Ключевые слова
            .replace(/\b(def|class|import|from|return|if|elif|else|for|while|try|except|with|as|in|not|and|or|lambda|yield|global|nonlocal|pass|break|continue|True|False|None|is|raise|assert|finally|async|await)\b/g, '<span class="token keyword">$1</span>')
            // Функции
            .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g, '<span class="token function">$1</span>');
    }
    else if (language === 'javascript' || language === 'js') {
        highlighted = highlighted
            // Комментарии
            .replace(/(\/\/.*$)/gm, '<span class="token comment">$1</span>')
            .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="token comment">$1</span>')
            // Строки
            .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="token string">$1</span>')
            .replace(/('(?:[^'\\]|\\.)*')/g, '<span class="token string">$1</span>')
            // Числа
            .replace(/\b(\d+\.?\d*)\b/g, '<span class="token number">$1</span>')
            // Ключевые слова
            .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|throw|new|this|typeof|instanceof|switch|case|default|break|continue)\b/g, '<span class="token keyword">$1</span>')
            // Функции
            .replace(/\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, '<span class="token function">$1</span>');
    }
    else {
        // Для других языков - базовая подсветка
        highlighted = highlighted
            // Строки
            .replace(/("[^"]*")/g, '<span class="token string">$1</span>')
            .replace(/('[^']*')/g, '<span class="token string">$1</span>')
            // Числа
            .replace(/\b(\d+\.?\d*)\b/g, '<span class="token number">$1</span>')
            // Комментарии
            .replace(/(\/\/.*$|#.*$)/gm, '<span class="token comment">$1</span>');
    }
    return highlighted;
}
// === ИЗМЕНЕНИЕ РАЗМЕРА СТОЛБЦОВ ===
function setupColumnResize() {
    let isResizing = false;
    let currentCol = -1;
    let startX = 0;
    let startWidth = 0;
    let resizeHandle = null;
    elements.columnHeaders.addEventListener('mousedown', (e) => {
        const target = e.target;
        if (target.classList.contains('column-resize-handle')) {
            isResizing = true;
            currentCol = parseInt(target.dataset.col || '0');
            resizeHandle = target;
            startX = e.pageX;
            const header = elements.columnHeaders.querySelector(`.column-header[data-col="${currentCol}"]`);
            startWidth = header?.offsetWidth || CONFIG.CELL_WIDTH;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            resizeHandle.classList.add('resizing');
            e.preventDefault();
            e.stopPropagation();
        }
    });
    document.addEventListener('mousemove', (e) => {
        if (!isResizing || currentCol === -1)
            return;
        e.preventDefault();
        e.stopPropagation();
        const diff = e.pageX - startX;
        const newWidth = Math.max(30, startWidth + diff);
        updateColumnWidth(currentCol, newWidth);
    });
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            if (resizeHandle)
                resizeHandle.classList.remove('resizing');
            isResizing = false;
            currentCol = -1;
            resizeHandle = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
    // Добавить resize handle к заголовкам столбцов
    const headers = elements.columnHeaders.querySelectorAll('.column-header');
    headers.forEach(header => {
        const oldHandle = header.querySelector('.column-resize-handle');
        if (oldHandle)
            oldHandle.remove();
        const handle = document.createElement('div');
        handle.className = 'column-resize-handle';
        handle.dataset.col = header.dataset.col;
        header.appendChild(handle);
    });
}
// Функ��ия обновления ширины колонки
function updateColumnWidth(col, width) {
    // Обновляем заголовок
    const header = elements.columnHeaders.querySelector(`.column-header[data-col="${col}"]`);
    if (header) {
        header.style.width = `${width}px`;
        header.style.minWidth = `${width}px`;
        header.style.maxWidth = `${width}px`;
    }
    // Обновляем все ячейки в этом столбце
    const cells = elements.cellGrid.querySelectorAll(`.cell[data-col="${col}"]`);
    cells.forEach(cell => {
        cell.style.width = `${width}px`;
        cell.style.minWidth = `${width}px`;
        cell.style.maxWidth = `${width}px`;
    });
    // Обновляем grid-template-columns для правильного позиционирования
    // Оптимизация: не пересчитываем всю сетку, только изменённую колонку
    const columnWidths = [];
    for (let c = 0; c < CONFIG.COLS; c++) {
        if (c === col) {
            columnWidths.push(`${width}px`);
        }
        else {
            const colHeader = elements.columnHeaders.querySelector(`.column-header[data-col="${c}"]`);
            columnWidths.push(colHeader?.style.width || `${CONFIG.CELL_WIDTH}px`);
        }
    }
    elements.cellGrid.style.gridTemplateColumns = columnWidths.join(' ');
    // Синхронизируем скролл после изменения размера
    requestAnimationFrame(() => {
        renderVisibleCells();
    });
}
// Функция обновления высоты строки
function updateRowHeight(row, height) {
    // Обновляем заголовок
    const header = elements.rowHeaders.querySelector(`.row-header[data-row="${row}"]`);
    if (header) {
        header.style.height = `${height}px`;
        header.style.minHeight = `${height}px`;
        header.style.maxHeight = `${height}px`;
    }
    // Обновляем все ячейки в этой строке
    const cells = elements.cellGrid.querySelectorAll(`.cell[data-row="${row}"]`);
    cells.forEach(cell => {
        cell.style.height = `${height}px`;
        cell.style.minHeight = `${height}px`;
        cell.style.maxHeight = `${height}px`;
    });
    // Обновляем grid-template-rows для правильног�� позиционирования
    const rowHeights = [];
    for (let r = 0; r < CONFIG.ROWS; r++) {
        const rowHeader = elements.rowHeaders.querySelector(`.row-header[data-row="${r}"]`);
        const rowHeight = rowHeader?.style.height || `${CONFIG.CELL_HEIGHT}px`;
        rowHeights.push(rowHeight);
    }
    elements.cellGrid.style.gridTemplateRows = rowHeights.join(' ');
}
// === ИЗМЕНЕНИЕ РАЗМЕРА СТРОК ===
function setupRowResize() {
    let isResizing = false;
    let currentRow = -1;
    let startY = 0;
    let startHeight = 0;
    elements.rowHeaders.addEventListener('mousedown', (e) => {
        const target = e.target;
        if (target.classList.contains('row-resize-handle')) {
            isResizing = true;
            currentRow = parseInt(target.dataset.row || '0');
            startY = e.pageY;
            const header = elements.rowHeaders.querySelector(`.row-header[data-row="${currentRow}"]`);
            startHeight = header?.offsetHeight || CONFIG.CELL_HEIGHT;
            document.body.style.cursor = 'row-resize';
            e.preventDefault();
        }
    });
    document.addEventListener('mousemove', (e) => {
        if (!isResizing || currentRow === -1)
            return;
        const diff = e.pageY - startY;
        const newHeight = Math.max(20, startHeight + diff);
        const header = elements.rowHeaders.querySelector(`.row-header[data-row="${currentRow}"]`);
        if (header) {
            header.style.height = `${newHeight}px`;
        }
        // Обновить ��се ячейки в этой строке
        const cells = elements.cellGrid.querySelectorAll(`.cell[data-row="${currentRow}"]`);
        cells.forEach(cell => {
            cell.style.height = `${newHeight}px`;
        });
        updateRowHeight(currentRow, newHeight);
    });
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            currentRow = -1;
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
        }
    });
    // Добавить resize handle к заголовкам строк
    const headers = elements.rowHeaders.querySelectorAll('.row-header');
    headers.forEach(header => {
        const oldHandle = header.querySelector('.row-resize-handle');
        if (oldHandle)
            oldHandle.remove();
        const handle = document.createElement('div');
        handle.className = 'row-resize-handle';
        handle.dataset.row = header.dataset.row;
        header.appendChild(handle);
    });
}
// === FILL HANDLE (растягивание ячеек) - ИСПРАВЛЕНО ===
function setupFillHandle() {
    const fillHandle = document.getElementById('fillHandle');
    if (!fillHandle)
        return;
    let isDragging = false;
    let dragStartCell = null;
    let previewCells = [];
    let fillDirection = null;
    let fillRange = null;
    // Показать/скрыть fill handle при выделении ячейки или диапазона
    const updateFillHandle = () => {
        let targetRow = state.selectedCell.row;
        let targetCol = state.selectedCell.col;
        // Если выделен диапазон, используем нижний правый угол
        if (state.selectionStart && state.selectionEnd) {
            targetRow = Math.max(state.selectionStart.row, state.selectionEnd.row);
            targetCol = Math.max(state.selectionStart.col, state.selectionEnd.col);
        }
        const cell = getCellElement(targetRow, targetCol);
        if (cell) {
            const rect = cell.getBoundingClientRect();
            const containerRect = elements.cellGridWrapper.getBoundingClientRect();
            fillHandle.style.display = 'block';
            fillHandle.style.left = `${rect.right - containerRect.left - 6}px`;
            fillHandle.style.top = `${rect.bottom - containerRect.top - 6}px`;
        }
        else {
            fillHandle.style.display = 'none';
        }
    };
    // Обработчик нажатия на fill handle
    fillHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        isDragging = true;
        // Определяем начальную точку - правый нижний угол выделения
        if (state.selectionStart && state.selectionEnd) {
            dragStartCell = {
                row: Math.max(state.selectionStart.row, state.selectionEnd.row),
                col: Math.max(state.selectionStart.col, state.selectionEnd.col)
            };
            // Сохраняем диапазон для заполнения
            fillRange = {
                startRow: Math.min(state.selectionStart.row, state.selectionEnd.row),
                endRow: Math.max(state.selectionStart.row, state.selectionEnd.row),
                startCol: Math.min(state.selectionStart.col, state.selectionEnd.col),
                endCol: Math.max(state.selectionStart.col, state.selectionEnd.col)
            };
        }
        else {
            dragStartCell = { ...state.selectedCell };
            fillRange = {
                startRow: state.selectedCell.row,
                endRow: state.selectedCell.row,
                startCol: state.selectedCell.col,
                endCol: state.selectedCell.col
            };
        }
        fillHandle.classList.add('dragging');
        document.body.style.cursor = 'crosshair';
        document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging || !dragStartCell)
            return;
        e.preventDefault();
        e.stopPropagation();
        // Очистка предыдущего предпросмотра
        previewCells.forEach(cell => cell.classList.remove('fill-preview'));
        previewCells = [];
        // Найти ячейку под курсором
        const element = document.elementFromPoint(e.clientX, e.clientY);
        const cell = element?.closest('.cell');
        if (cell) {
            const currentRow = parseInt(cell.dataset.row || '0');
            const currentCol = parseInt(cell.dataset.col || '0');
            // Определяем направление заполнения
            const rowDiff = Math.abs(currentRow - dragStartCell.row);
            const colDiff = Math.abs(currentCol - dragStartCell.col);
            if (rowDiff >= colDiff && rowDiff > 0) {
                // Вертикальное заполнение
                fillDirection = 'vertical';
                const minRow = Math.min(dragStartCell.row, currentRow);
                const maxRow = Math.max(dragStartCell.row, currentRow);
                // Показываем предпросмотр для всех строк в диапазоне
                for (let r = minRow; r <= maxRow; r++) {
                    if (r !== dragStartCell.row) {
                        // Для каждой строки применяем ко всем колонкам исходного диапазона
                        if (fillRange) {
                            for (let c = fillRange.startCol; c <= fillRange.endCol; c++) {
                                const targetCell = getCellElement(r, c);
                                if (targetCell) {
                                    targetCell.classList.add('fill-preview');
                                    previewCells.push(targetCell);
                                }
                            }
                        }
                    }
                }
            }
            else if (colDiff > 0) {
                // Горизонтальное заполнение
                fillDirection = 'horizontal';
                const minCol = Math.min(dragStartCell.col, currentCol);
                const maxCol = Math.max(dragStartCell.col, currentCol);
                // Показываем предпросмотр для всех колонок в диапазоне
                for (let c = minCol; c <= maxCol; c++) {
                    if (c !== dragStartCell.col) {
                        // Для каждой колонки применяем ко всем строкам исходного диапазона
                        if (fillRange) {
                            for (let r = fillRange.startRow; r <= fillRange.endRow; r++) {
                                const targetCell = getCellElement(r, c);
                                if (targetCell) {
                                    targetCell.classList.add('fill-preview');
                                    previewCells.push(targetCell);
                                }
                            }
                        }
                    }
                }
            }
        }
    });
    document.addEventListener('mouseup', (e) => {
        if (!isDragging || !dragStartCell || !fillRange)
            return;
        const element = document.elementFromPoint(e.clientX, e.clientY);
        const cell = element?.closest('.cell');
        if (cell) {
            const endRow = parseInt(cell.dataset.row || '0');
            const endCol = parseInt(cell.dataset.col || '0');
            const data = getCurrentData();
            // Определяем направление
            let targetCells = [];
            if (fillDirection === 'vertical' && endRow !== dragStartCell.row) {
                const minRow = Math.min(dragStartCell.row, endRow);
                const maxRow = Math.max(dragStartCell.row, endRow);
                for (let r = minRow; r <= maxRow; r++) {
                    if (r !== dragStartCell.row) {
                        for (let c = fillRange.startCol; c <= fillRange.endCol; c++) {
                            targetCells.push({ row: r, col: c });
                        }
                    }
                }
            }
            else if (fillDirection === 'horizontal' && endCol !== dragStartCell.col) {
                const minCol = Math.min(dragStartCell.col, endCol);
                const maxCol = Math.max(dragStartCell.col, endCol);
                for (let c = minCol; c <= maxCol; c++) {
                    if (c !== dragStartCell.col) {
                        for (let r = fillRange.startRow; r <= fillRange.endRow; r++) {
                            targetCells.push({ row: r, col: c });
                        }
                    }
                }
            }
            // === ВАЖНО: Сначала определяем паттерн ПО ОБЩИМ ДАННЫМ ===
            let pattern = null;
            const sourceValues = [];
            // Собираем исходные значения из выделенного диапазона
            if (fillDirection === 'vertical') {
                for (let r = fillRange.startRow; r <= fillRange.endRow; r++) {
                    const key = getCellKey(r, fillRange.startCol);
                    const cellData = data.get(key);
                    if (cellData && cellData.value) {
                        const num = parseFloat(cellData.value);
                        sourceValues.push(isNaN(num) ? cellData.value : num);
                    }
                }
                // Определяем паттерн по последнему значению
                if (sourceValues.length >= 1) {
                    const lastRow = fillRange.endRow;
                    pattern = detectFillPatternVertical(fillRange.startCol, lastRow, data);
                }
            }
            else {
                for (let c = fillRange.startCol; c <= fillRange.endCol; c++) {
                    const key = getCellKey(fillRange.startRow, c);
                    const cellData = data.get(key);
                    if (cellData && cellData.value) {
                        const num = parseFloat(cellData.value);
                        sourceValues.push(isNaN(num) ? cellData.value : num);
                    }
                }
                if (sourceValues.length >= 1) {
                    const lastCol = fillRange.endCol;
                    pattern = detectFillPatternHorizontal(fillRange.startRow, lastCol, data);
                }
            }
            // === Применяем заполнение ===
            let stepCounter = 0;
            for (const target of targetCells) {
                const sourceKey = getCellKey(dragStartCell.row, dragStartCell.col);
                const targetKey = getCellKey(target.row, target.col);
                const sourceData = data.get(sourceKey);
                let finalValue = '';
                // Если есть паттерн — используем его
                if (pattern) {
                    stepCounter++;
                    finalValue = String(calculatePatternValue(pattern, stepCounter));
                }
                else if (sourceData) {
                    // Иначе просто копируем значение
                    finalValue = sourceData.value;
                }
                if (finalValue) {
                    const newCellData = { value: finalValue };
                    if (sourceData?.formula) {
                        newCellData.formula = sourceData.formula;
                    }
                    if (sourceData?.style) {
                        newCellData.style = { ...sourceData.style };
                    }
                    data.set(targetKey, newCellData);
                    const targetCellElement = getCellElement(target.row, target.col);
                    if (targetCellElement) {
                        targetCellElement.textContent = finalValue;
                        targetCellElement.classList.add('has-content');
                        if (sourceData?.style) {
                            Object.entries(sourceData.style).forEach(([prop, value]) => {
                                if (value !== undefined && value !== null && value !== '') {
                                    targetCellElement.style[prop] = value;
                                }
                            });
                        }
                    }
                }
            }
            // Определяем конечную точку для undo
            const finalEndRow = fillDirection === 'vertical' ? endRow : fillRange.endRow;
            const finalEndCol = fillDirection === 'horizontal' ? endCol : fillRange.endCol;
            pushUndo('fill', {
                range: { ...fillRange },
                direction: fillDirection,
                end: { row: endRow, col: endCol }
            });
        }
        // Очистка
        isDragging = false;
        dragStartCell = null;
        fillDirection = null;
        fillRange = null;
        previewCells.forEach(cell => cell.classList.remove('fill-preview'));
        previewCells = [];
        fillHandle.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        updateFillHandle();
        // Перерисовка для применения всех изменений
        renderCells();
        updateAIDataCache();
        autoSave();
    });
    // Скрыть при скролле
    elements.cellGridWrapper.addEventListener('scroll', () => {
        fillHandle.style.display = 'none';
    }, true);
    // Обновляем позицию handle при изменении выделения
    window.updateFillHandlePosition = updateFillHandle;
}
// === PATTERNS FOR FILL HANDLE - УЛУЧШЕНО ЕЩЁ БОЛЬШЕ ===
function detectFillPatternVertical(col, startRow, data) {
    const values = [];
    // Собираем до 10 предыдущих значений
    for (let r = startRow; r >= Math.max(0, startRow - 10); r--) {
        const key = getCellKey(r, col);
        const cellData = data.get(key);
        if (cellData && cellData.value !== '') {
            const num = parseFloat(cellData.value);
            values.unshift(isNaN(num) ? cellData.value : num);
        }
        else {
            break;
        }
    }
    if (values.length < 2)
        return null;
    // === ЧИСЛОВЫЕ ПАТТЕРНЫ ===
    const numValues = values.filter(v => typeof v === 'number');
    if (numValues.length >= 2) {
        // 1. Арифметическая прогрессия (1, 2, 3, 4...)
        const diff = numValues[numValues.length - 1] - numValues[numValues.length - 2];
        let isArithmetic = true;
        for (let i = 2; i < numValues.length; i++) {
            if (Math.abs((numValues[i] - numValues[i - 1]) - diff) > 0.0001) {
                isArithmetic = false;
                break;
            }
        }
        if (isArithmetic) {
            return { type: 'arithmetic', lastValue: numValues[numValues.length - 1], diff };
        }
        // 2. Геометрическая прогрессия (2, 4, 8, 16...)
        if (numValues[numValues.length - 2] !== 0) {
            const ratio = numValues[numValues.length - 1] / numValues[numValues.length - 2];
            let isGeometric = true;
            for (let i = 2; i < numValues.length; i++) {
                if (numValues[i - 1] === 0 || Math.abs((numValues[i] / numValues[i - 1]) - ratio) > 0.0001) {
                    isGeometric = false;
                    break;
                }
            }
            if (isGeometric) {
                return { type: 'geometric', lastValue: numValues[numValues.length - 1], ratio };
            }
        }
        // 3. Числа Фибоначчи (1, 1, 2, 3, 5, 8...)
        if (numValues.length >= 3) {
            const isFibonacci = numValues.every((val, i) => {
                if (i < 2)
                    return true;
                return val === numValues[i - 1] + numValues[i - 2];
            });
            if (isFibonacci) {
                return {
                    type: 'fibonacci',
                    lastValue: numValues[numValues.length - 1],
                    prevValue: numValues[numValues.length - 2]
                };
            }
        }
        // 4. Квадраты чисел (1, 4, 9, 16, 25...)
        if (numValues.length >= 2) {
            const sqrtLast = Math.sqrt(numValues[numValues.length - 1]);
            const sqrtPrev = Math.sqrt(numValues[numValues.length - 2]);
            if (Number.isInteger(sqrtLast) && Number.isInteger(sqrtPrev)) {
                const n = sqrtLast;
                const isSquares = numValues.every((val, i) => {
                    const sqrt = Math.sqrt(val);
                    return Number.isInteger(sqrt) && sqrt === sqrtPrev + (i - (numValues.length - 2));
                });
                if (isSquares) {
                    return { type: 'squares', nextN: n + 1 };
                }
            }
        }
        // 5. Кубы чисел (1, 8, 27, 64...)
        if (numValues.length >= 2) {
            const cbrtLast = Math.cbrt(numValues[numValues.length - 1]);
            const cbrtPrev = Math.cbrt(numValues[numValues.length - 2]);
            if (Number.isInteger(cbrtLast) && Number.isInteger(cbrtPrev)) {
                return { type: 'cubes', nextN: cbrtLast + 1 };
            }
        }
    }
    // === ТЕКСТОВЫЕ ПАТТЕРНЫ ===
    const textValues = values.filter(v => typeof v === 'string');
    if (textValues.length >= 2) {
        const days = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
        const daysShort = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
        const months = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
        const monthsShort = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
        const monthsGen = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
        const lastText = textValues[textValues.length - 1].toLowerCase().trim();
        const prevText = textValues[textValues.length - 2].toLowerCase().trim();
        // Дни недели
        const dayIndex = days.findIndex(d => lastText === d || lastText.includes(d));
        if (dayIndex !== -1) {
            const prevIndex = days.findIndex(d => prevText === d || prevText.includes(d));
            if (prevIndex !== -1 && (dayIndex - prevIndex === 1 || (prevIndex === 6 && dayIndex === 0))) {
                return { type: 'days', index: dayIndex, list: days };
            }
        }
        // Дни недели краткие
        const dayShortIndex = daysShort.findIndex(d => lastText === d);
        if (dayShortIndex !== -1) {
            const prevShortIndex = daysShort.findIndex(d => prevText === d);
            if (prevShortIndex !== -1 && (dayShortIndex - prevShortIndex === 1 || (prevShortIndex === 6 && dayShortIndex === 0))) {
                return { type: 'days', index: dayShortIndex, list: daysShort };
            }
        }
        // Месяцы (именительный падеж)
        const monthIndex = months.findIndex(m => lastText === m || lastText.includes(m));
        if (monthIndex !== -1) {
            const prevIndex = months.findIndex(m => prevText === m || prevText.includes(m));
            if (prevIndex !== -1 && (monthIndex - prevIndex === 1 || (prevIndex === 11 && monthIndex === 0))) {
                return { type: 'months', index: monthIndex, list: months };
            }
        }
        // Месяцы (родительный падеж)
        const monthGenIndex = monthsGen.findIndex(m => lastText === m || lastText.includes(m));
        if (monthGenIndex !== -1) {
            const prevGenIndex = monthsGen.findIndex(m => prevText === m || prevText.includes(m));
            if (prevGenIndex !== -1 && (monthGenIndex - prevGenIndex === 1 || (prevGenIndex === 11 && monthGenIndex === 0))) {
                return { type: 'months', index: monthGenIndex, list: monthsGen };
            }
        }
        // Месяцы краткие
        const monthShortIndex = monthsShort.findIndex(m => lastText === m);
        if (monthShortIndex !== -1) {
            const prevShortIndex = monthsShort.findIndex(m => prevText === m);
            if (prevShortIndex !== -1 && (monthShortIndex - prevShortIndex === 1 || (prevShortIndex === 11 && monthShortIndex === 0))) {
                return { type: 'months', index: monthShortIndex, list: monthsShort };
            }
        }
    }
    // === КОПИРОВАНИЕ ===
    if (values.length >= 2 && values.every(v => v === values[0])) {
        return { type: 'copy', value: values[0] };
    }
    return null;
}
function detectFillPatternHorizontal(row, startCol, data) {
    const values = [];
    // Собираем до 5 предыдущих значений в этой же строке
    for (let c = startCol; c >= Math.max(0, startCol - 5); c--) {
        const key = getCellKey(row, c);
        const cellData = data.get(key);
        if (cellData) {
            const num = parseFloat(cellData.value);
            if (!isNaN(num))
                values.unshift(num);
            else
                break;
        }
        else
            break;
    }
    if (values.length >= 2) {
        const diff = values[values.length - 1] - values[values.length - 2];
        let isArithmetic = true;
        for (let i = 1; i < values.length; i++) {
            if (values[i] - values[i - 1] !== diff) {
                isArithmetic = false;
                break;
            }
        }
        if (isArithmetic)
            return { type: 'arithmetic', lastValue: values[values.length - 1], diff };
        if (values[values.length - 2] !== 0) {
            const ratio = values[values.length - 1] / values[values.length - 2];
            let isGeometric = true;
            for (let i = 1; i < values.length; i++) {
                if (values[i - 1] === 0 || Math.abs(values[i] / values[i - 1] - ratio) > 0.0001) {
                    isGeometric = false;
                    break;
                }
            }
            if (isGeometric)
                return { type: 'geometric', lastValue: values[values.length - 1], ratio };
        }
    }
    return null;
}
// Старая функция для совместимости (можно удалить позже)
function detectFillPattern(startCell, data) {
    return detectFillPatternVertical(startCell.col, startCell.row - 1, data);
}
function calculatePatternValue(pattern, step) {
    if (!pattern)
        return '';
    switch (pattern.type) {
        case 'arithmetic':
            return pattern.lastValue + (pattern.diff * step);
        case 'geometric':
            return pattern.lastValue * Math.pow(pattern.ratio, step);
        case 'fibonacci':
            // Вычисляем следующее число Фибоначчи
            let a = pattern.prevValue;
            let b = pattern.lastValue;
            for (let i = 0; i < step; i++) {
                const temp = a + b;
                a = b;
                b = temp;
            }
            return b;
        case 'squares':
            return Math.pow(pattern.nextN + step - 1, 2);
        case 'cubes':
            return Math.pow(pattern.nextN + step - 1, 3);
        case 'days':
            return pattern.list[(pattern.index + step) % pattern.list.length];
        case 'months':
            return pattern.list[(pattern.index + step) % pattern.list.length];
        case 'copy':
            return pattern.value;
        default:
            return pattern.lastValue;
    }
}
// === ЭКСПОРТ ===
function showExportMenu() {
    const menu = document.createElement('div');
    menu.style.cssText = `
    position: fixed;
    bottom: 50px;
    right: 200px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    overflow: hidden;
  `;
    const options = [
        { format: 'xlsx', label: 'Excel (.xlsx)', icon: '📊' },
        { format: 'ods', label: 'OpenDocument (.ods)', icon: '📑' },
        { format: 'csv', label: 'CSV (.csv)', icon: '📄' },
        { format: 'tsv', label: 'TSV (.tsv)', icon: '📝' },
        { format: 'json', label: 'JSON (.json)', icon: '📋' },
        { format: 'xml', label: 'XML (.xml)', icon: '📄' },
        { format: 'html', label: 'HTML (.html)', icon: '🌐' },
        { format: 'markdown', label: 'Markdown (.md)', icon: '📖' },
    ];
    options.forEach(opt => {
        const btn = document.createElement('button');
        btn.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 10px 16px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 14px;
      text-align: left;
      transition: background 0.15s;
    `;
        btn.innerHTML = `<span>${opt.icon}</span><span>${opt.label}</span>`;
        btn.onmouseover = () => btn.style.background = '#f3f4f6';
        btn.onmouseout = () => btn.style.background = 'transparent';
        btn.onclick = () => {
            exportData(opt.format);
            menu.remove();
        };
        menu.appendChild(btn);
    });
    document.body.appendChild(menu);
    // Закрыть при клике вне
    setTimeout(() => {
        const closeHandler = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        document.addEventListener('click', closeHandler);
    }, 100);
}
function exportData(format) {
    const data = [];
    // Собрать данные из таблицы
    for (let row = 0; row < CONFIG.ROWS; row++) {
        const rowData = [];
        for (let col = 0; col < CONFIG.COLS; col++) {
            const key = getCellKey(row, col);
            const data = getCurrentData();
            const cellData = data.get(key);
            rowData.push(cellData?.value || '');
        }
        data.push(rowData);
    }
    let content = '';
    let mimeType = 'text/plain';
    let extension = format;
    switch (format) {
        case 'csv':
            content = data.map(row => row.map(cell => {
                if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                    return `"${cell.replace(/"/g, '""')}"`;
                }
                return cell;
            }).join(',')).join('\n');
            mimeType = 'text/csv;charset=utf-8';
            break;
        case 'json':
            content = JSON.stringify(data, null, 2);
            mimeType = 'application/json';
            break;
        case 'html':
            content = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>SmartTable Export</title></head>
<body>
<table border="1">
${data.map(row => `  <tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('\n')}
</table>
</body>
</html>`;
            mimeType = 'text/html';
            break;
        case 'xlsx':
            // Для XLSX используем простой формат XML (SpreadsheetML)
            content = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Sheet1">
    <Table>
${data.map(row => `      <Row>
${row.map(cell => `        <Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`).join('\n')}
      </Row>`).join('\n')}
    </Table>
  </Worksheet>
</Workbook>`;
            mimeType = 'application/vnd.ms-excel';
            extension = 'xls';
            break;
        case 'xml':
            // XML экспорт
            content = `<?xml version="1.0" encoding="UTF-8"?>
<SmartTable>
  <Metadata>
    <ExportDate>${new Date().toISOString()}</ExportDate>
    <Rows>${CONFIG.ROWS}</Rows>
    <Cols>${CONFIG.COLS}</Cols>
  </Metadata>
  <Data>
${data.map((row, ri) => `    <Row index="${ri}">
${row.map((cell, ci) => `      <Cell index="${ci}">${escapeXml(cell)}</Cell>`).join('\n')}
    </Row>`).join('\n')}
  </Data>
</SmartTable>`;
            mimeType = 'application/xml';
            extension = 'xml';
            break;
        case 'ods':
            // OpenDocument Spreadsheet
            content = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tdc:office" xmlns:table="urn:oasis:names:tdc:table" xmlns:text="urn:oasis:names:tdc:text">
  <office:body>
    <office:spreadsheet>
      <table:table table:name="Sheet1">
${data.map(row => row.map(cell => `        <table:table-cell><text:p>${escapeXml(cell)}</text:p></table:table-cell>`).join('\n') + `
      </table:table-row>`).join('\n')}
      </table:table>
    </office:spreadsheet>
  </office:body>
</office:document-content>`;
            mimeType = 'application/vnd.oasis.opendocument.spreadsheet';
            extension = 'ods';
            break;
        case 'tsv':
            // Tab-separated values
            content = data.map(row => row.join('\t')).join('\n');
            mimeType = 'text/tab-separated-values';
            extension = 'tsv';
            break;
        case 'markdown':
            // Markdown таблица
            const header = data[0] || [];
            const separator = header.map(() => '---').join(' | ');
            const rows = data.slice(1).map(row => row.join(' | '));
            content = `| ${header.join(' | ')} |
| ${separator} |
${rows.map(row => `| ${row} |`).join('\n')}`;
            mimeType = 'text/markdown';
            extension = 'md';
            break;
    }
    // Создаём и скачиваем файл через IPC
    const blob = new Blob([content], { type: mimeType });
    const reader = new FileReader();
    reader.onload = async () => {
        const base64Content = reader.result;
        // Для IPC передаём содержимое как текст
        const textContent = base64Content.split(',')[1]
            ? atob(base64Content.split(',')[1])
            : content;
        if (ipcRenderer) {
            try {
                const result = await ipcRenderer.invoke('save-file', {
                    content: textContent,
                    mimeType,
                    extension,
                    defaultName: `SmartTable_${new Date().toISOString().slice(0, 10)}`
                });
                if (result.success) {
                    console.log('[Export] File saved successfully:', result.filePath);
                }
                else if (result.canceled) {
                    console.log('[Export] Save cancelled by user');
                }
                else {
                    console.error('[Export] Save failed:', result.error);
                }
            }
            catch (error) {
                console.error('[Export] Error saving file:', error);
            }
        }
        else {
            // Fallback: скачивание через браузер
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `SmartTable_${new Date().toISOString().slice(0, 10)}.${extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };
    reader.readAsDataURL(blob);
}
function generateAiResponse(message) {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('формула') || lowerMessage.includes('посчит')) {
        return 'Для суммирования диапазона ячеек используйте формулу: =SUM(A1:A10)\n\nДругие полезные функции:\n• =AVERAGE() - среднее значение\n• =MAX() / =MIN() - максимум/минимум\n• =COUNT() - количество чисел';
    }
    if (lowerMessage.includes('анализ') || lowerMessage.includes('данные')) {
        return '📊 Я могу проанализировать ваши данные:\n\n1. Найти закономерности\n2. Выявить аномалии\n3. Построить статистику\n4. Предложить визуализацию\n\nВыделите ди��пазон яч��ек и попросите меня проанализировать их.';
    }
    if (lowerMessage.includes('очист') || lowerMessage.includes('удал')) {
        return '🧹 Для очистки данных я могу:\n\n• Удалить пустые строки\n• Убрать дубликаты\n• Исправить формат\n• Нормализовать текст\n\nЧто именно нужно очистить?';
    }
    return 'Я понял ваш запрос! Вот что я могу сделать:\n\n📝 **Создать формулу** - помогу с функци��ми\n📊 **Анализировать** - найду закономерности\n🧹 **Очистить данные** - ��беру лишнее\n📈 **Визуализировать** - предложу графики\n\nЧт���� бы вы хотели сделать?';
}
// === ВЫДЕЛЕНИЕ И ДИАПАЗОНЫ ===
function getSelectedRange() {
    if (state.selectionStart && state.selectionEnd) {
        return {
            startRow: Math.min(state.selectionStart.row, state.selectionEnd.row),
            endRow: Math.max(state.selectionStart.row, state.selectionEnd.row),
            startCol: Math.min(state.selectionStart.col, state.selectionEnd.col),
            endCol: Math.max(state.selectionStart.col, state.selectionEnd.col)
        };
    }
    // Если нет диапазона, возвращаем текущую ячейку
    return {
        startRow: state.selectedCell.row,
        endRow: state.selectedCell.row,
        startCol: state.selectedCell.col,
        endCol: state.selectedCell.col
    };
}
/**
 * Получить все числовые значения из диапазона ячеек
 */
function getRangeValues(col1, row1, col2, row2, getCellValue) {
    const values = [];
    const startCol = colToIndex(col1);
    const endCol = colToIndex(col2);
    const startRow = row1 - 1;
    const endRow = row2 - 1;
    // Проходим по ВСЕМУ диапазону ячеек (исправлено!)
    for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
            const ref = `${colToLetter(c)}${r + 1}`;
            const val = getCellValue(ref);
            const num = parseFloat(val);
            if (!isNaN(num)) {
                values.push(num);
            }
        }
    }
    return values;
}
/**
 * Преобразовать букву колонки в индекс (A -> 0, B -> 1, etc.)
 */
function colToIndex(col) {
    let index = 0;
    for (let i = 0; i < col.length; i++) {
        index = index * 26 + (col.charCodeAt(i) - 64);
    }
    return index - 1;
}
function autoSum() {
    const range = getSelectedRange();
    if (!range)
        return;
    const { startRow, endRow, startCol, endCol } = range;
    const data = getCurrentData();
    // Определяем, куда вставить сумму
    // Если выделено несколь��о строк - сум����а в нижней ячейке
    // Если выделено несколько столбцов - сумма в правой ячейке
    let sumRow = endRow;
    let sumCol = endCol;
    // Если выделение - одна ячейка, ищем числа выше или левее
    if (startRow === endRow && startCol === endCol) {
        let sum = 0;
        let count = 0;
        // Проверяем ячейки выше
        for (let r = endRow - 1; r >= 0; r--) {
            const key = getCellKey(r, endCol);
            const cellData = data.get(key);
            if (cellData) {
                const num = parseFloat(cellData.value);
                if (!isNaN(num)) {
                    sum += num;
                    count++;
                }
                else {
                    break; // Прерываем при пустой ячейке или тексте
                }
            }
            else {
                break;
            }
        }
        // Если ничего не нашли выше, пробуем слева
        if (count === 0) {
            for (let c = endCol - 1; c >= 0; c--) {
                const key = getCellKey(endRow, c);
                const cellData = data.get(key);
                if (cellData) {
                    const num = parseFloat(cellData.value);
                    if (!isNaN(num)) {
                        sum += num;
                        count++;
                    }
                    else {
                        break;
                    }
                }
                else {
                    break;
                }
            }
        }
        if (count > 0) {
            const key = getCellKey(endRow, endCol);
            const cell = getCellElement(endRow, endCol);
            if (cell) {
                cell.textContent = sum.toString();
                data.set(key, { value: sum.toString() });
                pushUndo('autosum', { sum });
                renderCells();
                updateFormulaBar();
            }
        }
        return;
    }
    // Если выделен диапазон - суммируем все числа в диапазоне
    let sum = 0;
    let count = 0;
    for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
            const key = getCellKey(row, col);
            const cellData = data.get(key);
            if (cellData) {
                const num = parseFloat(cellData.value);
                if (!isNaN(num)) {
                    sum += num;
                    count++;
                }
            }
        }
    }
    if (count > 0) {
        // Вставляем сумму в последнюю ячейку выделения
        const key = getCellKey(sumRow, sumCol);
        const cell = getCellElement(sumRow, sumCol);
        if (cell) {
            cell.textContent = sum.toString();
            data.set(key, { value: sum.toString() });
            pushUndo('autosum', { sum, range: { startRow, endRow, startCol, endCol } });
            renderCells();
            updateFormulaBar();
        }
    }
}
function pasteToCell(text) {
    const { row, col } = state.selectedCell;
    const data = getCurrentData();
    const key = getCellKey(row, col);
    // Сохраняем существующий стиль ячейки
    const existingCellData = data.get(key);
    const existingStyle = existingCellData?.style || {};
    data.set(key, { value: text, style: existingStyle });
    const cell = getCellElement(row, col);
    if (cell) {
        cell.textContent = text;
    }
    updateAIDataCache();
    autoSave();
}
function clearCell(row, col) {
    const data = getCurrentData();
    const key = getCellKey(row, col);
    // Сохраняем стиль ячейки (не удаляем его полностью)
    const existingCellData = data.get(key);
    const existingStyle = existingCellData?.style || {};
    // Очищаем только значение, стиль сохраняем
    data.set(key, { value: '', style: existingStyle });
    const cell = getCellElement(row, col);
    if (cell) {
        cell.textContent = '';
    }
    updateAIDataCache();
    autoSave();
    updateFormulaBar();
}
function getSelectedRangeData() {
    const selectedCells = elements.cellGrid.querySelectorAll('.cell.selected');
    console.log('[Renderer] getSelectedRangeData called, selected cells:', selectedCells.length);
    if (selectedCells.length === 0) {
        console.log('[Renderer] No cells selected, checking for data in current sheet');
        // Если нет выделенных ячеек, попробуем получить данные из текущего листа
        const data = getCurrentData();
        if (data.size > 0) {
            console.log('[Renderer] Using data from current sheet, size:', data.size);
            // Используем данные из всех строк - первая колонка = метки, остальные = значения
            const labels = [];
            const dataValues = [];
            // Собираем данные построчно
            const rows = new Map();
            data.forEach((cellData, key) => {
                const [row, col] = key.split('-').map(Number);
                if (!rows.has(row))
                    rows.set(row, new Map());
                rows.get(row).set(col, cellData.value);
            });
            // Первая строка - заголовки (метки)
            const firstRow = rows.get(0);
            if (firstRow) {
                firstRow.forEach((value, col) => {
                    if (col > 0)
                        labels.push(value || `Колонка ${col}`);
                });
            }
            // Остальные строки - данные
            rows.forEach((rowData, row) => {
                if (row > 0) {
                    rowData.forEach((value, col) => {
                        if (col > 0) {
                            const num = parseFloat(value);
                            if (!isNaN(num)) {
                                dataValues.push(num);
                            }
                        }
                    });
                }
            });
            console.log('[Renderer] Labels:', labels, 'Data:', dataValues);
            if (labels.length > 0 && dataValues.length > 0) {
                return { labels, datasets: [{ label: 'Данные', data: dataValues }] };
            }
        }
        return { labels: [], datasets: [] };
    }
    const labels = [];
    const dataValues = [];
    const cellsByRow = new Map();
    Array.from(selectedCells).sort((a, b) => {
        const rowA = parseInt(a.dataset.row || '0');
        const colA = parseInt(a.dataset.col || '0');
        const rowB = parseInt(b.dataset.row || '0');
        const colB = parseInt(b.dataset.col || '0');
        if (rowA !== rowB)
            return rowA - rowB;
        return colA - colB;
    }).forEach(cell => {
        const row = parseInt(cell.dataset.row || '0');
        const col = parseInt(cell.dataset.col || '0');
        const value = cell.textContent || '';
        if (!cellsByRow.has(row))
            cellsByRow.set(row, new Map());
        cellsByRow.get(row).set(col, value);
    });
    cellsByRow.forEach(rowData => {
        const firstCol = rowData.get(0);
        const secondCol = rowData.get(1);
        if (firstCol !== undefined)
            labels.push(firstCol);
        if (secondCol !== undefined)
            dataValues.push(parseFloat(secondCol) || 0);
    });
    return { labels, datasets: [{ label: 'Данные', data: dataValues }] };
}
function mergeCells() {
    const selectedCells = elements.cellGrid.querySelectorAll('.cell.selected');
    if (selectedCells.length <= 1) {
        alert('Выделите несколько ячеек для объединения');
        return;
    }
    // Собираем данные о выделенных ячейках
    const cellsData = [];
    let mergedValue = '';
    selectedCells.forEach(cell => {
        const row = parseInt(cell.dataset.row || '0');
        const col = parseInt(cell.dataset.col || '0');
        const value = cell.textContent || '';
        if (value)
            mergedValue += (mergedValue ? ' ' : '') + value;
        cellsData.push({ row, col, cell, value });
    });
    // Находим границы диапазона
    const rows = cellsData.map(c => c.row);
    const cols = cellsData.map(c => c.col);
    const minRow = Math.min(...rows);
    const maxRow = Math.max(...rows);
    const minCol = Math.min(...cols);
    const maxCol = Math.max(...cols);
    const rowspan = maxRow - minRow + 1;
    const colspan = maxCol - minCol + 1;
    const data = getCurrentData();
    // Первая ячейка становится объединённой
    const firstKey = getCellKey(minRow, minCol);
    const firstCell = getCellElement(minRow, minCol);
    if (firstCell) {
        // Устанавливаем значение
        firstCell.textContent = mergedValue;
        // Устанавливаем grid свойства для объединения
        firstCell.style.gridColumn = `${minCol + 1} / span ${colspan}`;
        firstCell.style.gridRow = `${minRow + 1} / span ${rowspan}`;
        firstCell.style.borderRight = 'none';
        firstCell.style.borderBottom = 'none';
        firstCell.style.zIndex = '10';
        data.set(firstKey, {
            value: mergedValue,
            style: {
                ...data.get(firstKey)?.style,
                merged: true,
                rowspan,
                colspan,
                gridColumnStart: minCol + 1,
                gridRowStart: minRow + 1
            }
        });
    }
    // Остальные ячейки скрываем полностью
    cellsData.forEach((item, index) => {
        if (index === 0)
            return; // Пропускаем первую
        const key = getCellKey(item.row, item.col);
        data.delete(key);
        // Полностью скрываем ячейку
        item.cell.style.display = 'none';
        item.cell.style.visibility = 'hidden';
        item.cell.style.pointerEvents = 'none';
    });
    updateAIDataCache();
    updateFormulaBar();
}
function insertRow() {
    const { row } = state.selectedCell;
    const data = getCurrentData();
    const rowsToMove = [];
    data.forEach((cellData, key) => {
        const [cellRow, col] = key.split('-').map(Number);
        if (cellRow >= row) {
            const newKey = `${cellRow + 1}-${col}`;
            rowsToMove.push({ oldKey: key, newKey, value: cellData });
        }
    });
    rowsToMove.forEach(item => { data.delete(item.oldKey); data.set(item.newKey, item.value); });
    renderCells();
    updateAIDataCache();
}
function deleteRow() {
    const { row } = state.selectedCell;
    const data = getCurrentData();
    const keysToDelete = [];
    data.forEach((_, key) => { const [cellRow] = key.split('-').map(Number); if (cellRow === row)
        keysToDelete.push(key); });
    keysToDelete.forEach(key => data.delete(key));
    const rowsToMove = [];
    data.forEach((cellData, key) => {
        const [cellRow, col] = key.split('-').map(Number);
        if (cellRow > row) {
            const newKey = `${cellRow - 1}-${col}`;
            rowsToMove.push({ oldKey: key, newKey, value: cellData });
        }
    });
    rowsToMove.forEach(item => { data.delete(item.oldKey); data.set(item.newKey, item.value); });
    renderCells();
    updateAIDataCache();
    updateFormulaBar();
}
function insertColumn() {
    const { col } = state.selectedCell;
    const data = getCurrentData();
    const colsToMove = [];
    data.forEach((cellData, key) => {
        const [row, cellCol] = key.split('-').map(Number);
        if (cellCol >= col) {
            const newKey = `${row}-${cellCol + 1}`;
            colsToMove.push({ oldKey: key, newKey, value: cellData });
        }
    });
    colsToMove.forEach(item => { data.delete(item.oldKey); data.set(item.newKey, item.value); });
    renderCells();
    updateAIDataCache();
}
function deleteColumn() {
    const { col } = state.selectedCell;
    const data = getCurrentData();
    const keysToDelete = [];
    data.forEach((_, key) => { const [, cellCol] = key.split('-').map(Number); if (cellCol === col)
        keysToDelete.push(key); });
    keysToDelete.forEach(key => data.delete(key));
    const colsToMove = [];
    data.forEach((cellData, key) => {
        const [row, cellCol] = key.split('-').map(Number);
        if (cellCol > col) {
            const newKey = `${row}-${cellCol - 1}`;
            colsToMove.push({ oldKey: key, newKey, value: cellData });
        }
    });
    colsToMove.forEach(item => { data.delete(item.oldKey); data.set(item.newKey, item.value); });
    renderCells();
    updateAIDataCache();
    updateFormulaBar();
}
function sortData() {
    const { col } = state.selectedCell;
    const data = getCurrentData();
    const rowsMap = new Map();
    data.forEach((cellData, key) => {
        const [row, cellCol] = key.split('-').map(Number);
        if (!rowsMap.has(row))
            rowsMap.set(row, new Map());
        rowsMap.get(row).set(cellCol, cellData.value);
    });
    const sortedRows = Array.from(rowsMap.entries()).sort((a, b) => {
        const valA = a[1].get(col) || '';
        const valB = b[1].get(col) || '';
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB))
            return numA - numB;
        return valA.localeCompare(valB, 'ru');
    });
    const newData = new Map();
    sortedRows.forEach(([, rowData], newRow) => {
        rowData.forEach((value, oldCol) => { const newKey = `${newRow}-${oldCol}`; newData.set(newKey, { value }); });
    });
    data.clear();
    newData.forEach((value, key) => data.set(key, value));
    renderCells();
    updateAIDataCache();
}
function toggleFilter() {
    const { col } = state.selectedCell;
    const cell = getCellElement(state.selectedCell.row, state.selectedCell.col);
    const value = cell?.textContent || '';
    if (!value) {
        alert('Введите значение для фильтрации в активной ячейке');
        return;
    }
    const data = getCurrentData();
    data.forEach((cellData, key) => {
        const [row, cellCol] = key.split('-').map(Number);
        if (cellCol === col) {
            const cellEl = getCellElement(row, col);
            if (cellEl)
                cellEl.style.display = cellData.value === value ? '' : 'none';
        }
    });
    updateAIDataCache();
}
// Перенос текста
function toggleWrapText() {
    const { row, col } = state.selectedCell;
    const key = getCellKey(row, col);
    const data = getCurrentData();
    const cellData = data.get(key) || { value: '' };
    cellData.style = cellData.style || {};
    cellData.style.wrapText = !cellData.style.wrapText;
    data.set(key, cellData);
    renderCells();
    updateAIDataCache();
    autoSave();
}
// Сортировка A-Z
function sortColumnAZ() {
    const { col } = state.selectedCell;
    const data = getCurrentData();
    const rowsMap = new Map();
    data.forEach((cellData, key) => {
        const [row, cellCol] = key.split('-').map(Number);
        if (!rowsMap.has(row))
            rowsMap.set(row, new Map());
        rowsMap.get(row).set(cellCol, cellData.value);
    });
    const sortedRows = Array.from(rowsMap.entries()).sort((a, b) => {
        const valA = a[1].get(col) || '';
        const valB = b[1].get(col) || '';
        return valA.localeCompare(valB, 'ru');
    });
    const newData = new Map();
    sortedRows.forEach(([, rowData], newRow) => {
        rowData.forEach((value, oldCol) => { const newKey = `${newRow}-${oldCol}`; newData.set(newKey, { value }); });
    });
    data.clear();
    newData.forEach((value, key) => data.set(key, value));
    renderCells();
    updateAIDataCache();
    autoSave();
}
// Фильтр данных (полный)
function filterDataFull() {
    const { col } = state.selectedCell;
    const cell = getCellElement(state.selectedCell.row, state.selectedCell.col);
    const value = cell?.textContent || '';
    if (!value) {
        alert('Введите значение для фильтрации в активной ячейке');
        return;
    }
    const data = getCurrentData();
    data.forEach((cellData, key) => {
        const [row, cellCol] = key.split('-').map(Number);
        if (cellCol === col) {
            const cellEl = getCellElement(row, col);
            if (cellEl)
                cellEl.style.display = cellData.value.includes(value) ? '' : 'none';
        }
    });
    updateAIDataCache();
    autoSave();
}
// Удаление дубликатов
function removeDuplicates() {
    const { col } = state.selectedCell;
    const data = getCurrentData();
    const seen = new Set();
    const rowsToDelete = new Set();
    const rowsMap = new Map();
    data.forEach((cellData, key) => {
        const [row, cellCol] = key.split('-').map(Number);
        if (!rowsMap.has(row))
            rowsMap.set(row, new Map());
        rowsMap.get(row).set(cellCol, cellData.value);
    });
    rowsMap.forEach((rowData, row) => {
        const val = rowData.get(col) || '';
        if (seen.has(val)) {
            rowsToDelete.add(row);
        }
        else {
            seen.add(val);
        }
    });
    rowsToDelete.forEach(row => {
        const rowToDelete = rowsMap.get(row);
        if (rowToDelete) {
            rowToDelete.forEach((_, c) => {
                const key = getCellKey(row, c);
                data.delete(key);
            });
        }
    });
    renderCells();
    updateAIDataCache();
    autoSave();
}
// Экспорт глобальных функций
window.getSelectedRangeData = getSelectedRangeData;
window.getSelectedRange = getSelectedRange;
window.getSelectedCell = () => state.selectedCell;
window.getCurrentData = getCurrentData;
window.autoSum = autoSum;
window.mergeCells = mergeCells;
window.insertRow = insertRow;
window.deleteRow = deleteRow;
window.insertColumn = insertColumn;
window.deleteColumn = deleteColumn;
window.sortData = sortData;
window.toggleFilter = toggleFilter;
// Data validation
window.setDataValidation = setDataValidation;
window.removeDataValidation = removeDataValidation;
window.clearAllDataValidations = clearAllDataValidations;
// Conditional formatting
window.addConditionalFormat = addConditionalFormat;
window.clearConditionalFormats = clearConditionalFormats;
// Find and Replace
window.findAndReplace = findAndReplace;
// Clear state
window.clearAllState = clearAllState;
function findAndReplace(findText, replaceText, options = {}) {
    const data = getCurrentData();
    let found = 0;
    let replaced = 0;
    data.forEach((cellData, key) => {
        const value = cellData.value || '';
        let searchValue = value;
        let searchFind = findText;
        if (!options.matchCase) {
            searchValue = value.toLowerCase();
            searchFind = findText.toLowerCase();
        }
        const isMatch = options.entireCell ? searchValue === searchFind : searchValue.includes(searchFind);
        if (isMatch) {
            found++;
            const newValue = value.replace(new RegExp(findText, options.matchCase ? 'g' : 'gi'), replaceText);
            if (newValue !== value) {
                data.set(key, { ...cellData, value: newValue });
                replaced++;
            }
        }
    });
    if (replaced > 0) {
        renderCells();
        updateAIDataCache();
    }
    console.log('[FindReplace] Found:', found, 'Replaced:', replaced);
    return { found, replaced };
}
function addConditionalFormat(range, rule, style) {
    state.conditionalFormats.push({ range, rule, style });
    applyConditionalFormatting();
    console.log('[ConditionalFormat] Added:', { range, rule, style });
}
function clearConditionalFormats() {
    state.conditionalFormats = [];
    renderCells();
    console.log('[ConditionalFormat] Cleared all formats');
}
function applyConditionalFormatting() {
    const data = getCurrentData();
    state.conditionalFormats.forEach(format => {
        const [startRef, endRef] = format.range.split(':');
        if (!startRef)
            return;
        const startMatch = startRef.match(/^([A-Z]+)(\d+)$/i);
        if (!startMatch)
            return;
        const startCol = startMatch[1].toUpperCase().charCodeAt(0) - 65;
        const startRow = parseInt(startMatch[2]) - 1;
        let endCol = startCol;
        let endRow = startRow;
        if (endRef) {
            const endMatch = endRef.match(/^([A-Z]+)(\d+)$/i);
            if (endMatch) {
                endCol = endMatch[1].toUpperCase().charCodeAt(0) - 65;
                endRow = parseInt(endMatch[2]) - 1;
            }
        }
        for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
                const key = getCellKey(row, col);
                const cellData = data.get(key);
                const value = cellData?.value;
                const cell = getCellElement(row, col);
                if (!cell || !value)
                    continue;
                // Проверяем правило
                let shouldApply = false;
                const numValue = parseFloat(value);
                if (format.rule.startsWith('>')) {
                    const threshold = parseFloat(format.rule.slice(1));
                    shouldApply = numValue > threshold;
                }
                else if (format.rule.startsWith('<')) {
                    const threshold = parseFloat(format.rule.slice(1));
                    shouldApply = numValue < threshold;
                }
                else if (format.rule.startsWith('=')) {
                    shouldApply = value === format.rule.slice(1);
                }
                else if (format.rule.startsWith('contains:')) {
                    shouldApply = value.includes(format.rule.slice(9));
                }
                if (shouldApply && cell) {
                    if (format.style.bg_color)
                        cell.style.backgroundColor = format.style.bg_color;
                    if (format.style.color)
                        cell.style.color = format.style.color;
                    if (format.style.fontWeight)
                        cell.style.fontWeight = format.style.fontWeight;
                }
            }
        }
    });
}
console.log('[Renderer] Script loaded, readyState:', document.readyState);
async function startApp() {
    console.log('[Renderer] Starting app...');
    await init();
    renderSheets();
    console.log('[Renderer] App started successfully');
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[Renderer] DOMContentLoaded - calling init()');
        startApp();
    });
}
else {
    console.log('[Renderer] DOM already ready - calling init()');
    startApp();
}
// ==================== ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ AI ====================
// Делаем функции доступными для AI Context Service
function globalSetCell(col, row, value) {
    const colIndex = col.toUpperCase().charCodeAt(0) - 65;
    const rowIndex = row - 1;
    const key = getCellKey(rowIndex, colIndex);
    const data = getCurrentData();
    // Вычисляем формулу если есть
    let finalValue = value;
    if (value.startsWith('=')) {
        const getCellValue = (row, col) => {
            const cellKey = getCellKey(row, col);
            const cellData = data.get(cellKey);
            return cellData?.value || '';
        };
        const result = calcFormula(value, rowIndex, colIndex, getCellValue);
        finalValue = String(result);
    }
    data.set(key, { value: finalValue });
    renderCells();
    updateAIDataCache();
    autoSave();
    console.log(`[Global] Set ${col}${row} = ${finalValue}`);
}
function globalFillTable(data) {
    const tableData = getCurrentData();
    tableData.clear();
    for (let r = 0; r < data.length; r++) {
        for (let c = 0; c < data[r].length; c++) {
            const key = getCellKey(r, c);
            let value = data[r][c];
            // Вычисляем формулы
            if (value.startsWith('=')) {
                const getCellValue = (row, col) => {
                    const cellKey = getCellKey(row, col);
                    const cellData = tableData.get(cellKey);
                    return cellData?.value || '';
                };
                const result = calcFormula(value, r, c, getCellValue);
                value = String(result);
            }
            tableData.set(key, { value });
        }
    }
    renderCells();
    updateAIDataCache();
    autoSave();
    console.log(`[Global] Filled table with ${data.length} rows`);
}
function globalColorCells(cells) {
    const data = getCurrentData();
    cells.forEach(cellRef => {
        const { column, row, bg_color, text_color } = cellRef;
        const colIndex = column.toUpperCase().charCodeAt(0) - 65;
        const rowIndex = typeof row === 'string' ? parseInt(row) - 1 : row - 1;
        const key = getCellKey(rowIndex, colIndex);
        const cellData = data.get(key) || { value: '' };
        cellData.style = cellData.style || {};
        if (bg_color)
            cellData.style.backgroundColor = bg_color;
        if (text_color)
            cellData.style.color = text_color;
        data.set(key, cellData);
    });
    renderCells();
    updateAIDataCache();
    autoSave();
}
function globalBoldColumn(col) {
    const colIndex = col.toUpperCase().charCodeAt(0) - 65;
    const data = getCurrentData();
    for (let r = 0; r < CONFIG.ROWS; r++) {
        const key = getCellKey(r, colIndex);
        const cellData = data.get(key) || { value: '' };
        cellData.style = cellData.style || {};
        cellData.style.fontWeight = 'bold';
        data.set(key, cellData);
    }
    renderCells();
    updateAIDataCache();
    autoSave();
}
function globalSortColumn(col, order) {
    console.log('[Global] Sort column', col, order);
    // TODO: реализовать сортировку
}
function globalClearCell(col, row) {
    const colIndex = col.toUpperCase().charCodeAt(0) - 65;
    const rowIndex = row - 1;
    const key = getCellKey(rowIndex, colIndex);
    const data = getCurrentData();
    data.delete(key);
    renderCells();
    updateAIDataCache();
    autoSave();
}
function globalClearColumn(col) {
    const colIndex = col.toUpperCase().charCodeAt(0) - 65;
    const data = getCurrentData();
    for (let r = 0; r < CONFIG.ROWS; r++) {
        const key = getCellKey(r, colIndex);
        data.delete(key);
    }
    renderCells();
    updateAIDataCache();
    autoSave();
}
function globalClearAll() {
    const data = getCurrentData();
    data.clear();
    renderCells();
    updateAIDataCache();
    autoSave();
}
// Регистрируем глобальные функции
window.setCell = globalSetCell;
window.fillTable = globalFillTable;
window.colorCells = globalColorCells;
window.boldColumn = globalBoldColumn;
window.sortColumn = globalSortColumn;
window.clearCell = globalClearCell;
window.clearColumn = globalClearColumn;
window.clearAll = globalClearAll;
// Обработчик быстрых формул
document.addEventListener('quick-formula', ((e) => {
    const { formula } = e.detail;
    applyQuickFormula(formula);
}));
/**
 * Применить быструю формулу к выделенному диапазону
 */
function applyQuickFormula(formulaType) {
    if (!state.selectionStart || !state.selectionEnd)
        return;
    const startRow = Math.min(state.selectionStart.row, state.selectionEnd.row);
    const endRow = Math.max(state.selectionStart.row, state.selectionEnd.row);
    const startCol = Math.min(state.selectionStart.col, state.selectionEnd.col);
    const endCol = Math.max(state.selectionStart.col, state.selectionEnd.col);
    const data = getCurrentData();
    const values = [];
    // Собираем числовые значения из выделенного диапазона
    for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
            const key = getCellKey(r, c);
            const cellData = data.get(key);
            if (cellData?.value) {
                const num = parseFloat(cellData.value.toString());
                if (!isNaN(num)) {
                    values.push(num);
                }
            }
        }
    }
    if (values.length === 0) {
        console.log('[QuickFormula] No numeric values in selection');
        return;
    }
    let result = 0;
    let formulaText = '';
    switch (formulaType) {
        case 'SUM':
            result = values.reduce((a, b) => a + b, 0);
            formulaText = `=SUM(${getRangeAddress(startRow, startCol, endRow, endCol)})`;
            break;
        case 'AVERAGE':
            result = values.reduce((a, b) => a + b, 0) / values.length;
            formulaText = `=AVERAGE(${getRangeAddress(startRow, startCol, endRow, endCol)})`;
            break;
        case 'MIN':
            result = Math.min(...values);
            formulaText = `=MIN(${getRangeAddress(startRow, startCol, endRow, endCol)})`;
            break;
        case 'MAX':
            result = Math.max(...values);
            formulaText = `=MAX(${getRangeAddress(startRow, startCol, endRow, endCol)})`;
            break;
        case 'COUNT':
            result = values.length;
            formulaText = `=COUNT(${getRangeAddress(startRow, startCol, endRow, endCol)})`;
            break;
        case 'COUNTCOLS':
            result = endCol - startCol + 1;
            formulaText = `=COLUMNS(${getRangeAddress(startRow, startCol, endRow, endCol)})`;
            break;
        case 'SQRT':
            result = Math.sqrt(values[0] || 0);
            formulaText = `=SQRT(${getColLetter(startCol)}${startRow + 1})`;
            break;
        case 'SQUARE':
            result = (values[0] || 0) * (values[0] || 0);
            formulaText = `=POWER(${getColLetter(startCol)}${startRow + 1};2)`;
            break;
    }
    // Вставляем формулу в последнюю выделенную ячейку
    const targetRow = state.selectionEnd.row;
    const targetCol = state.selectionEnd.col;
    const targetKey = getCellKey(targetRow, targetCol);
    data.set(targetKey, {
        value: result.toString(),
        style: {}
    });
    renderCells();
    updateAIDataCache();
    autoSave();
    updateFormulaBar();
    console.log(`[QuickFormula] ${formulaType} applied: ${result}`);
}
/**
 * Получить адрес диапазона ячеек (например, "A1:B5")
 */
function getRangeAddress(startRow, startCol, endRow, endCol) {
    const startColLetter = getColLetter(startCol);
    const endColLetter = getColLetter(endCol);
    return `${startColLetter}${startRow + 1}:${endColLetter}${endRow + 1}`;
}
/**
 * Получить букву колонки по индексу (0 -> A, 1 -> B, etc.)
 */
function getColLetter(colIndex) {
    let letter = '';
    let col = colIndex;
    do {
        letter = String.fromCharCode(65 + (col % 26)) + letter;
        col = Math.floor(col / 26) - 1;
    } while (col >= 0);
    return letter;
}
// Функция для получения данных таблицы (для AI контекста)
window.getTableData = () => getCurrentData();
console.log('[Renderer] Global AI functions registered');
/**
 * Показать модальное окно с prompt (замена prompt())
 */
function showPromptModal(message, callback, defaultValue = '') {
    // Удаляем старое модальное окно если есть
    const oldModal = document.querySelector('.prompt-modal-overlay');
    if (oldModal)
        oldModal.remove();
    const overlay = document.createElement('div');
    overlay.className = 'prompt-modal-overlay';
    overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
    const modal = document.createElement('div');
    modal.style.cssText = `
    background: var(--surface-color, #fff);
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    min-width: 400px;
    max-width: 90vw;
  `;
    modal.innerHTML = `
    <div style="margin-bottom: 16px; font-size: 16px; font-weight: 500; color: var(--text-primary, #000);">${message}</div>
    <input type="text" class="prompt-modal-input" value="${defaultValue}" 
      style="width: 100%; padding: 10px 12px; border: 2px solid var(--border-color, #ddd); border-radius: 6px; font-size: 14px; margin-bottom: 16px; box-sizing: border-box;">
    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button class="prompt-modal-cancel" 
        style="padding: 10px 20px; border: 1px solid var(--border-color, #ddd); background: var(--hover-bg, #f5f5f5); border-radius: 6px; cursor: pointer; font-size: 14px;">Отмена</button>
      <button class="prompt-modal-ok" 
        style="padding: 10px 20px; border: none; background: var(--primary-color, #10b981); color: white; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500;">OK</button>
    </div>
  `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    const input = modal.querySelector('.prompt-modal-input');
    const okBtn = modal.querySelector('.prompt-modal-ok');
    const cancelBtn = modal.querySelector('.prompt-modal-cancel');
    const close = (value) => {
        overlay.remove();
        callback(value);
    };
    okBtn?.addEventListener('click', () => close(input.value || null));
    cancelBtn?.addEventListener('click', () => close(null));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter')
            close(input.value || null);
        if (e.key === 'Escape')
            close(null);
    });
    input.focus();
    input.select();
}
/**
 * Экспорт данных с выбором листов
 */
async function exportDataWithSheets(format, sheetIds) {
    console.log('[Export] Exporting sheets:', sheetIds, 'format:', format);
    // Собрать данные из выбранных листов
    const sheetsData = [];
    sheetIds.forEach(sheetId => {
        const sheet = state.sheets.find(s => s.id === sheetId);
        if (!sheet)
            return;
        const sheetData = state.sheetsData.get(sheetId) || new Map();
        const rowData = [];
        // Собрать данные из таблицы
        for (let row = 0; row < CONFIG.ROWS; row++) {
            const rowDataArray = [];
            for (let col = 0; col < CONFIG.COLS; col++) {
                const key = getCellKey(row, col);
                const cellData = sheetData.get(key);
                rowDataArray.push(cellData?.value || '');
            }
            rowData.push(rowDataArray);
        }
        sheetsData.push({ name: sheet.name, data: rowData });
    });
    let content = '';
    let mimeType = 'text/plain';
    let extension = format;
    switch (format) {
        case 'xlsx':
            // XML Spreadsheet с несколькими листами
            content = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet">
${sheetsData.map(sheet => `  <Worksheet ss:Name="${escapeXml(sheet.name)}">
    <Table>
${sheet.data.map(row => `      <Row>
${row.map(cell => `        <Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`).join('\n')}
      </Row>`).join('\n')}
    </Table>
  </Worksheet>`).join('\n')}
</Workbook>`;
            mimeType = 'application/vnd.ms-excel';
            extension = 'xls';
            break;
        case 'csv':
            // CSV экспортирует только первый выбранный лист
            if (sheetsData.length > 0) {
                content = sheetsData[0].data.map(row => row.map(cell => {
                    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
                        return `"${cell.replace(/"/g, '""')}"`;
                    }
                    return cell;
                }).join(',')).join('\n');
            }
            mimeType = 'text/csv;charset=utf-8';
            break;
        case 'json':
            // JSON со всеми листами
            content = JSON.stringify(sheetsData.map(s => ({ sheetName: s.name, data: s.data })), null, 2);
            mimeType = 'application/json';
            break;
        case 'html':
            // HTML с несколькими листами как таблицы
            content = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>SmartTable Export</title></head>
<body>
${sheetsData.map(sheet => `<h2>Sheet: ${escapeXml(sheet.name)}</h2>
<table border="1">
${sheet.data.map(row => `  <tr>${row.map(cell => `<td>${escapeXml(cell)}</td>`).join('')}</tr>`).join('\n')}
</table>`).join('\n')}
</body>
</html>`;
            mimeType = 'text/html';
            break;
        case 'xml':
            // XML экспорт
            content = `<?xml version="1.0" encoding="UTF-8"?>
<SmartTable>
  <Metadata>
    <ExportDate>${new Date().toISOString()}</ExportDate>
    <Sheets>${sheetsData.length}</Sheets>
  </Metadata>
  <Data>
${sheetsData.map(sheet => `    <Sheet name="${escapeXml(sheet.name)}">
${sheet.data.map((row, ri) => `      <Row index="${ri}">
${row.map((cell, ci) => `        <Cell index="${ci}">${escapeXml(cell)}</Cell>`).join('\n')}
      </Row>`).join('\n')}
    </Sheet>`).join('\n')}
  </Data>
</SmartTable>`;
            mimeType = 'application/xml';
            extension = 'xml';
            break;
        case 'markdown':
            // Markdown с несколькими листами
            content = sheetsData.map(sheet => `## ${sheet.name}\n\n` +
                `| ${sheet.data[0]?.map(() => 'Column').join(' | ')} |\n` +
                `| ${sheet.data[0]?.map(() => '---').join(' | ')} |\n` +
                sheet.data.map(row => `| ${row.join(' | ')} |`).join('\n')).join('\n\n');
            mimeType = 'text/markdown';
            extension = 'md';
            break;
        case 'ods':
            // ODS (простой XML)
            content = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tdc:office" xmlns:table="urn:oasis:names:tdc:table">
  <office:body>
    <office:spreadsheet>
${sheetsData.map(sheet => `      <table:table table:name="${escapeXml(sheet.name)}">
${sheet.data.map(row => `        <table:table-row>
${row.map(cell => `          <table:table-cell><text:p>${escapeXml(cell)}</text:p></table:table-cell>`).join('\n')}
        </table:table-row>`).join('\n')}
      </table:table>`).join('\n')}
    </office:spreadsheet>
  </office:body>
</office:document-content>`;
            mimeType = 'application/vnd.oasis.opendocument.spreadsheet';
            break;
        case 'tsv':
            // TSV экспортирует только первый выбранный лист
            if (sheetsData.length > 0) {
                content = sheetsData[0].data.map(row => row.join('\t')).join('\n');
            }
            mimeType = 'text/tab-separated-values';
            break;
    }
    // Сохраняем через IPC
    if (ipcRenderer) {
        console.log('[Export] Calling save-file IPC handler...');
        try {
            const result = await ipcRenderer.invoke('save-file', {
                content,
                mimeType,
                extension,
                defaultName: `SmartTable_${new Date().toISOString().slice(0, 10)}`
            });
            console.log('[Export] Save result:', result);
            if (result.success) {
                console.log('[Export] File saved successfully:', result.filePath);
            }
            else {
                console.log('[Export] Save cancelled by user');
            }
        }
        catch (error) {
            console.error('[Export] Error saving file:', error);
        }
    }
    else {
        console.error('[Export] ipcRenderer not available!');
    }
}
// === ГЛОБАЛЬНЫЕ ФУНКЦИИ (регистрация в window) ===
// Делаем функции доступными из других модулей
// Импорт листов из файла - с полным извлечением стилей и формул
function importSheetsImpl(sheets) {
    console.log('====== [DEBUG importSheets] START ======');
    console.log('[DEBUG] Sheets count:', sheets.length);
    if (sheets.length > 0) {
        console.log('[DEBUG] First sheet name:', sheets[0].name);
        console.log('[DEBUG] First sheet rows:', sheets[0].data?.length);
        console.log('[DEBUG] First sheet cols:', sheets[0].data?.[0]?.length);
        console.log('[DEBUG] Has styles:', !!sheets[0].styles);
        console.log('[DEBUG] Has formulas:', !!sheets[0].formulas);
    }
    const oldSheetsData = new Map(state.sheetsData);
    const oldSheets = [...state.sheets];
    try {
        state.sheetsData.clear();
        state.sheets = [];
        sheets.forEach((sheet, index) => {
            const id = Date.now() + index;
            const name = sheet.name || `Лист ${id}`;
            state.sheets.push({ id, name });
            console.log('[DEBUG] Created sheet:', name, 'id:', id);
            const sheetData = new Map();
            // Заполняем данными с формулами и стилями
            sheet.data.forEach((row, rowIndex) => {
                row.forEach((cellValue, colIndex) => {
                    if (cellValue || (sheet.formulas && sheet.formulas[rowIndex]?.[colIndex])) {
                        const key = getCellKey(rowIndex, colIndex);
                        // Проверяем формулу
                        const formula = sheet.formulas?.[rowIndex]?.[colIndex];
                        const finalValue = formula || cellValue;
                        // Собираем стиль из XLSX
                        const xlsxStyle = sheet.styles?.[rowIndex]?.[colIndex];
                        const style = {};
                        if (xlsxStyle) {
                            if (xlsxStyle.fill?.fgColor?.rgb) {
                                style.backgroundColor = '#' + xlsxStyle.fill.fgColor.rgb.substring(2);
                            }
                            if (xlsxStyle.font) {
                                if (xlsxStyle.font.color?.rgb) {
                                    style.color = '#' + xlsxStyle.font.color.rgb.substring(2);
                                }
                                if (xlsxStyle.font.bold)
                                    style.fontWeight = 'bold';
                                if (xlsxStyle.font.italic)
                                    style.fontStyle = 'italic';
                                if (xlsxStyle.font.sz)
                                    style.fontSize = xlsxStyle.font.sz + 'pt';
                                if (xlsxStyle.font.name)
                                    style.fontFamily = xlsxStyle.font.name;
                            }
                            if (xlsxStyle.alignment) {
                                if (xlsxStyle.alignment.horizontal) {
                                    style.textAlign = xlsxStyle.alignment.horizontal;
                                }
                                if (xlsxStyle.alignment.vertical) {
                                    style.verticalAlign = xlsxStyle.alignment.vertical;
                                }
                                if (xlsxStyle.alignment.wrapText) {
                                    style.whiteSpace = 'normal';
                                    style.wordWrap = 'break-word';
                                }
                            }
                            if (xlsxStyle.border) {
                                if (xlsxStyle.border.top)
                                    style.borderTop = '1px solid #000';
                                if (xlsxStyle.border.bottom)
                                    style.borderBottom = '1px solid #000';
                                if (xlsxStyle.border.left)
                                    style.borderLeft = '1px solid #000';
                                if (xlsxStyle.border.right)
                                    style.borderRight = '1px solid #000';
                            }
                        }
                        sheetData.set(key, {
                            value: finalValue,
                            style: Object.keys(style).length > 0 ? style : undefined
                        });
                    }
                });
            });
            state.sheetsData.set(id, sheetData);
            console.log('[DEBUG] Sheet data populated, cells:', sheetData.size);
        });
        state.currentSheet = state.sheets[0]?.id || 1;
        console.log('[DEBUG] Switched to sheet:', state.currentSheet);
        // === ВАЖНО: ПОЛНЫЙ СБРОС СОСТОЯНИЯ РЕДАКТИРОВАНИЯ ===
        console.log('[DEBUG] Resetting edit state...');
        state.isEditing = false;
        state.isSelecting = false;
        state.selectionStart = null;
        state.selectionEnd = null;
        // Принудительно снимаем contentEditable со ВСЕХ ячеек
        const allCells = elements.cellGrid.querySelectorAll('.cell');
        console.log('[DEBUG] Total cells to reset:', allCells.length);
        allCells.forEach(cell => {
            const cellEl = cell;
            cellEl.contentEditable = 'false';
            cellEl.classList.remove('editing');
            cellEl.classList.remove('has-content');
            cellEl.blur();
        });
        console.log('[DEBUG] Calling renderCells()...');
        renderCells();
        renderSheets();
        updateFormulaBar();
        // Снимаем focus если есть
        const activeElement = document.activeElement;
        if (activeElement && activeElement.classList.contains('cell')) {
            activeElement.blur();
        }
        // Принудительно фокусируемся на cellGridWrapper чтобы клавиши работали
        elements.cellGridWrapper.focus();
        console.log('[DEBUG] Focused on cellGridWrapper');
        pushUndo('import', {
            oldData: oldSheetsData,
            newData: new Map(state.sheetsData),
            oldSheets,
            newSheets: [...state.sheets]
        });
        console.log('[DEBUG] Import completed with styles:', state.sheets.length);
        console.log('[DEBUG] State reset: isEditing=false, all cells non-editable');
        console.log('====== [DEBUG importSheets] SUCCESS ======');
    }
    catch (error) {
        console.error('====== [DEBUG importSheets] ERROR ======');
        console.error('[DEBUG] Error:', error.message);
        console.error('[DEBUG] Stack:', error.stack);
        alert('Ошибка при импорте данных: ' + error.message);
        state.sheetsData = oldSheetsData;
        state.sheets = oldSheets;
        renderCells();
        renderSheets();
    }
}
window.getSheets = () => state.sheets;
window.getSelectedRangeData = getSelectedRangeData;
window.getSelectedRange = getSelectedRange;
window.getSelectedCell = () => state.selectedCell;
window.getCurrentData = getCurrentData;
window.autoSum = autoSum;
window.mergeCells = mergeCells;
window.insertRow = insertRow;
window.deleteRow = deleteRow;
window.insertColumn = insertColumn;
window.deleteColumn = deleteColumn;
window.sortData = sortData;
window.toggleFilter = toggleFilter;
window.setDataValidation = setDataValidation;
window.removeDataValidation = removeDataValidation;
window.clearAllDataValidations = clearAllDataValidations;
window.addConditionalFormat = addConditionalFormat;
window.clearConditionalFormats = clearConditionalFormats;
window.findAndReplace = findAndReplace;
window.clearAllState = clearAllState;
window.fillTable = globalFillTable;
window.colorCells = globalColorCells;
window.boldColumn = globalBoldColumn;
// КРИТИЧНО: Регистрируем importSheets ПРЯМО здесь
window.importSheets = importSheetsImpl;
window.showExportMenu = showExportMenu;
window.exportData = exportData;
window.exportDataWithSheets = exportDataWithSheets;
// ==========================================
// === ЭКСПОРТ FOCUS MANAGER ===
// ==========================================
window.FocusManager = FocusManager;
console.log('[Renderer] FocusManager exported to window');
//# sourceMappingURL=renderer.js.map