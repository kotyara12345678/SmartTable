// Проверка загрузки скрипта
console.log('[Renderer] Script loaded!');
// === КОНФИГУРАЦИЯ ===
const CONFIG = {
    ROWS: 100,
    COLS: 26,
    CELL_WIDTH: 100,
    CELL_HEIGHT: 32,
    HEADER_WIDTH: 50,
    HEADER_HEIGHT: 32,
};
// === СОСТОЯНИЕ ===
const state = {
    selectedCell: { row: 0, col: 0 },
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
};
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
            // dataValidations НЕ сохраняем чтобы избежать проблем
        }));
        console.log('[AutoSave] Data saved to localStorage');
    }
    catch (e) {
        console.error('[AutoSave] Error:', e);
    }
}
function autoLoad() {
    try {
        const saved = localStorage.getItem('smarttable-autosave');
        // Загружаем данные
        const currentData = getCurrentData();
        currentData.clear();
        if (saved) {
            const data = JSON.parse(saved);
            console.log('[AutoLoad] Found autosave from:', new Date(data.timestamp).toLocaleString());
            Object.keys(data.sheetsData).forEach(key => {
                currentData.set(key, data.sheetsData[key]);
            });
            state.currentSheet = data.currentSheet || 1;
            // НЕ загружаем dataValidations из старых сохранений!
            // state.dataValidations остаётся пустым
            console.log('[AutoLoad] Data loaded successfully');
        }
        // ПРИНУДИТЕЛЬНО очищаем dataValidations при каждой загрузке!
        // Это удалит злощастный текст из A1
        state.dataValidations.clear();
        console.log('[AutoLoad] Force cleared dataValidations');
        // Проверяем и очищаем ячейку A1 если там текст setDataValidation
        const a1Key = getCellKey(0, 0); // A1 = row 0, col 0
        const a1Data = currentData.get(a1Key);
        if (a1Data && a1Data.value && a1Data.value.includes('setDataValidation')) {
            currentData.delete(a1Key);
            console.log('[AutoLoad] Removed setDataValidation text from A1');
        }
        renderCells();
        updateAIDataCache();
        console.log('[AutoLoad] Completed successfully');
    }
    catch (e) {
        console.error('[AutoLoad] Error:', e);
    }
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
    console.log('[ClearState] All state cleared');
}
// Очистить только dataValidations
function clearAllDataValidations() {
    state.dataValidations.clear();
    renderCells();
    console.log('[ClearValidation] All data validations cleared');
}
console.log('[Renderer] Config and State initialized!');
// Глобальный ipcRenderer
let ipcRenderer;
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
        formulaAutocomplete: document.getElementById('formulaAutocomplete'),
        formulaList: document.getElementById('formulaList'),
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
    return String.fromCharCode(65 + col);
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
    // Рендерим таблицу
    renderColumnHeaders();
    renderRowHeaders();
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
    }
    else {
        console.warn('[Renderer] ipcRenderer not initialized, close-app handler not registered');
    }
    console.log('[Renderer] Starting setupEventListeners');
    setupEventListeners();
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
    // Добавим пустой элемент в начале для угла
    elements.columnHeaders.style.display = 'flex';
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
function renderCells() {
    // Сохраняем текущее выделение
    const selectedCells = Array.from(elements.cellGrid.querySelectorAll('.cell.selected'))
        .map(cell => {
        const el = cell;
        return {
            row: parseInt(el.dataset.row || '0'),
            col: parseInt(el.dataset.col || '0')
        };
    });
    elements.cellGrid.innerHTML = '';
    elements.cellGrid.style.gridTemplateColumns = `repeat(${CONFIG.COLS}, ${CONFIG.CELL_WIDTH}px)`;
    elements.cellGrid.style.gridTemplateRows = `repeat(${CONFIG.ROWS}, ${CONFIG.CELL_HEIGHT}px)`;
    const data = getCurrentData();
    for (let row = 0; row < CONFIG.ROWS; row++) {
        for (let col = 0; col < CONFIG.COLS; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row.toString();
            cell.dataset.col = col.toString();
            cell.tabIndex = -1;
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
                    // Если ячейка объединённая - устанавливаем grid свойства
                    if (cellData.style.merged) {
                        if (cellData.style.gridColumnStart && cellData.style.colspan) {
                            cell.style.gridColumn = `${cellData.style.gridColumnStart} / span ${cellData.style.colspan}`;
                        }
                        if (cellData.style.gridRowStart && cellData.style.rowspan) {
                            cell.style.gridRow = `${cellData.style.gridRowStart} / span ${cellData.style.rowspan}`;
                        }
                    }
                }
            }
            // Проверка data validation - только устанавливаем флаг, обработчик через делегирование
            const validation = getDataValidation(row, col);
            if (validation && validation.type === 'list') {
                cell.style.cursor = 'pointer';
                cell.dataset.hasDropdown = 'true';
                renderCellDropdown(cell, row, col);
            }
            elements.cellGrid.appendChild(cell);
        }
    }
    // Восстанавливаем выделение
    selectedCells.forEach(({ row, col }) => {
        const cell = getCellElement(row, col);
        if (cell) {
            cell.classList.add('selected');
        }
    });
    // Обновляем заголовки
    const rowHeader = elements.rowHeaders.querySelector(`.row-header[data-row="${state.selectedCell.row}"]`);
    if (rowHeader) {
        rowHeader.classList.add('selected');
    }
    const colHeader = elements.columnHeaders.querySelector(`.column-header[data-col="${state.selectedCell.col}"]`);
    if (colHeader) {
        colHeader.classList.add('selected');
    }
}
// === ВЫДЕЛЕНИЕ ЯЧЕЕК ===
// Для отслеживания повторного клика по той же ячейке
let lastSelectedCell = null;
let lastSelectTime = 0;
function selectCell(row, col) {
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
    // Проверяем, кликнули ли по той же ячейке второй раз подряд
    const now = Date.now();
    const isSameCell = lastSelectedCell && lastSelectedCell.row === row && lastSelectedCell.col === col;
    const isQuickClick = now - lastSelectTime < 300; // 300мс между кликами
    // Выделить новую ячейку
    state.selectedCell = { row, col };
    const cell = getCellElement(row, col);
    if (cell) {
        cell.classList.add('selected');
        cell.focus();
    }
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
    // Если кликнули по той же ячейке второй раз — начинаем редактирование
    if (isSameCell && isQuickClick) {
        editCell(row, col);
        lastSelectedCell = null; // Сбрасываем
    }
    else {
        lastSelectedCell = { row, col };
        lastSelectTime = now;
    }
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
    const index = row * CONFIG.COLS + col;
    return elements.cellGrid.children[index];
}
// === РЕДАКТИРОВАНИЕ ===
function editCell(row, col) {
    const cell = getCellElement(row, col);
    if (!cell)
        return;
    state.isEditing = true;
    cell.classList.add('editing');
    // Убираем класс has-content, курсор не будет виден в пустой ячейке
    cell.classList.remove('has-content');
    cell.contentEditable = 'true';
    cell.focus();
    // Выделить весь текст
    const range = document.createRange();
    range.selectNodeContents(cell);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
}
function finishEditing() {
    const cell = getCellElement(state.selectedCell.row, state.selectedCell.col);
    if (!cell)
        return;
    state.isEditing = false;
    cell.classList.remove('editing');
    cell.classList.remove('has-content');
    cell.contentEditable = 'false';
    // Сохранить данные
    const key = getCellKey(state.selectedCell.row, state.selectedCell.col);
    const inputValue = cell.textContent || '';
    const data = getCurrentData();
    const oldValue = data.get(key);
    // Вычислить формулу если есть
    let finalValue = inputValue;
    if (inputValue.startsWith('=')) {
        // Функция для получения значения ячейки
        const getCellValue = (cellRef) => {
            const match = cellRef.match(/^([A-Z]+)(\d+)$/i);
            if (!match)
                return '';
            const c = match[1].toUpperCase().charCodeAt(0) - 65;
            const r = parseInt(match[2]) - 1;
            const cellKey = getCellKey(r, c);
            const cellData = data.get(cellKey);
            return cellData?.value || '';
        };
        const result = evaluateFormulaLocal(inputValue, getCellValue);
        finalValue = String(result.value);
    }
    if (finalValue) {
        data.set(key, { value: finalValue });
    }
    else {
        data.delete(key);
    }
    // Сохраняем в undo историю
    pushUndo(key, oldValue);
    // Обновить кэш для ИИ
    updateAIDataCache();
    updateFormulaBar();
    // Перерисовать ячейку
    renderCells();
    // Автоподбор ширины если включен
    const autoFitEnabled = localStorage.getItem('smarttable-auto-fit-columns') === 'true';
    if (autoFitEnabled && finalValue) {
        autoFitColumn(state.selectedCell.col);
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
    updateAIDataCache();
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
// Завершить редактирование при клике вне ячейки
document.addEventListener('mousedown', (e) => {
    if (state.isEditing) {
        const cell = e.target;
        if (!cell.classList.contains('cell') && !cell.closest('.cell')) {
            finishEditing();
        }
    }
});
function handleCellKeyDown(e) {
    if (state.isEditing) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            finishEditing();
            // Перейти к следующей ячейке
            const nextRow = Math.min(state.selectedCell.row + 1, CONFIG.ROWS - 1);
            selectCell(nextRow, state.selectedCell.col);
        }
        else if (e.key === 'Tab') {
            e.preventDefault();
            finishEditing();
            const nextCol = e.shiftKey
                ? Math.max(0, state.selectedCell.col - 1)
                : Math.min(CONFIG.COLS - 1, state.selectedCell.col + 1);
            selectCell(state.selectedCell.row, nextCol);
        }
        else if (e.key === 'Escape') {
            e.preventDefault();
            // Отменить изменения
            const cell = getCellElement(state.selectedCell.row, state.selectedCell.col);
            const key = getCellKey(state.selectedCell.row, state.selectedCell.col);
            const data = getCurrentData();
            const cellData = data.get(key);
            if (cell) {
                cell.textContent = cellData?.value || '';
            }
            finishEditing();
        }
        return;
    }
    const { row, col } = state.selectedCell;
    switch (e.key) {
        case 'Enter':
            e.preventDefault();
            editCell(row, col);
            break;
        case 'Tab':
            e.preventDefault();
            const nextCol = e.shiftKey
                ? Math.max(0, col - 1)
                : Math.min(CONFIG.COLS - 1, col + 1);
            selectCell(row, nextCol);
            break;
        case 'ArrowUp':
            if (row > 0)
                selectCell(row - 1, col);
            break;
        case 'ArrowDown':
            if (row < CONFIG.ROWS - 1)
                selectCell(row + 1, col);
            break;
        case 'ArrowLeft':
            if (col > 0)
                selectCell(row, col - 1);
            break;
        case 'ArrowRight':
            if (col < CONFIG.COLS - 1)
                selectCell(row, col + 1);
            break;
        case 'Backspace':
        case 'Delete':
            const cell = getCellElement(row, col);
            const data = getCurrentData();
            if (cell) {
                cell.textContent = '';
                data.delete(getCellKey(row, col));
                updateAIDataCache(); // Обновить кэш
                updateFormulaBar();
            }
            break;
        case 'F2':
            e.preventDefault();
            editCell(row, col);
            break;
        default:
            // Начать редактирование при вводе символа (буква, цифра, знак)
            // Не реагируем на модификаторы и специальные клавиши
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                editCellWithChar(row, col, e.key);
            }
            break;
    }
}
// Редактирование ячейки с автоматическим вводом символа
function editCellWithChar(row, col, char) {
    const cell = getCellElement(row, col);
    if (!cell)
        return;
    state.isEditing = true;
    cell.classList.add('editing');
    cell.contentEditable = 'true';
    cell.focus();
    // Устанавливаем символ и выделяем его для замены
    cell.textContent = char;
    // Добавляем класс для показа курсора
    cell.classList.add('has-content');
    // Сохраняем данные
    const key = getCellKey(row, col);
    const data = getCurrentData();
    const existingCellData = data.get(key);
    const existingStyle = existingCellData?.style || {};
    data.set(key, { value: char, style: existingStyle });
    // Выделяем весь текст (символ) для последующей замены
    const range = document.createRange();
    range.selectNodeContents(cell);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    updateAIDataCache();
    updateFormulaBar();
    autoSave();
}
function handleCellInput(e) {
    // Авто-увеличение высоты ячейки при многострочном тексте
    const cell = e.target;
    if (cell.classList.contains('editing')) {
        // Обновляем кэш при каждом изменении в режиме редактирования
        const row = parseInt(cell.dataset.row || '0');
        const col = parseInt(cell.dataset.col || '0');
        const key = getCellKey(row, col);
        const data = getCurrentData();
        const value = cell.textContent || '';
        // Показываем/скрываем курсор в зависимости от наличия текста
        if (value) {
            cell.classList.add('has-content');
        }
        else {
            cell.classList.remove('has-content');
        }
        // Получаем существующий стиль ячейки
        const existingCellData = data.get(key);
        const existingStyle = existingCellData?.style || {};
        if (value) {
            // Сохраняем значение и стиль
            data.set(key, { value, style: existingStyle });
        }
        else {
            // Если значение пустое, сохраняем стиль с пустым значением
            data.set(key, { value: '', style: existingStyle });
        }
        updateAIDataCache();
    }
}
// === ФОРМУЛЫ ===
function updateFormulaBar() {
    const { row, col } = state.selectedCell;
    const key = getCellKey(row, col);
    const data = getCurrentData();
    const cellData = data.get(key);
    // Показываем в формула баре только формулы (начинающиеся с =)
    const value = cellData?.value || '';
    elements.formulaInput.value = value.startsWith('=') ? value : '';
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
    // Клик по ячейке (выделение)
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
        }
        else {
            selectCell(row, col);
        }
    });
    // Двойной клик (редактирование) - теперь не нужен, т.к. редактирование начинается по клику или клавише
    // Оставлен для совместимости, если пользователь привык к двойному клику
    elements.cellGrid.addEventListener('dblclick', (e) => {
        const cell = e.target.closest('.cell');
        if (!cell)
            return;
        const row = parseInt(cell.dataset.row || '0');
        const col = parseInt(cell.dataset.col || '0');
        editCell(row, col);
    });
    // Обработка клавиатуры для ячеек
    elements.cellGrid.addEventListener('keydown', (e) => {
        const cell = e.target;
        if (!cell.classList.contains('cell'))
            return;
        handleCellKeyDown(e);
    });
    // Обработка ввода для ячеек
    elements.cellGrid.addEventListener('input', (e) => {
        const cell = e.target;
        if (!cell.classList.contains('cell'))
            return;
        handleCellInput(e);
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
            menu.style.left = `${e.pageX}px`;
            menu.style.top = `${e.pageY}px`;
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
                const newName = prompt('Введите новое название листа:', sheet.name);
                if (newName && newName.trim()) {
                    sheet.name = newName.trim();
                    renderSheets();
                }
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
        case 'clear':
            {
                const cell = getCellElement(row, col);
                if (cell) {
                    cell.textContent = '';
                    data.delete(getCellKey(row, col));
                }
            }
            break;
        case 'bg-color':
            {
                const color = prompt('Введите цвет фона (hex, например #FFEBEE):', '#FFEBEE');
                if (color) {
                    const cell = getCellElement(row, col);
                    if (cell) {
                        cell.style.backgroundColor = color;
                    }
                }
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
// Вставка изображения в ячейку
function insertImage(imageSrc) {
    const { row, col } = state.selectedCell;
    const key = getCellKey(row, col);
    const data = getCurrentData();
    data.set(key, {
        value: '[Изображение]',
        style: {
            backgroundImage: `url(${imageSrc})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            minHeight: '100px'
        }
    });
    renderCells();
    updateAIDataCache();
    autoSave();
}
function setupEventListeners() {
    // Переключение вкладок меню
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
            item.classList.add('active');
        });
    });
    // Изменение цвета текста
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
    // Вставка изображения
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
    // Вставка ссылки
    document.addEventListener('insert-link', () => {
        const url = prompt('Введите URL ссылки:');
        if (url) {
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
        }
    });
    // Вставка комментария
    document.addEventListener('insert-comment', () => {
        const { row, col } = state.selectedCell;
        const key = getCellKey(row, col);
        const data = getCurrentData();
        const cellData = data.get(key) || { value: '' };
        const comment = prompt('Введите комментарий:');
        if (comment) {
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
        }
    });
    // Вставка символа
    document.addEventListener('insert-symbol', () => {
        const symbols = ['©', '®', '™', '±', '×', '÷', '≠', '≤', '≥', '∞', '√', '°', '€', '£', '¥'];
        const symbol = prompt('Введите символ или выберите из: ' + symbols.join(', '));
        if (symbol) {
            pasteToCell(symbol);
        }
    });
    // Вставка таблицы
    document.addEventListener('insert-table', () => {
        const rows = prompt('Количество строк:', '3');
        const cols = prompt('Количество столбцов:', '3');
        if (rows && cols) {
            const numRows = parseInt(rows);
            const numCols = parseInt(cols);
            const startRow = state.selectedCell.row;
            const startCol = state.selectedCell.col;
            const data = getCurrentData();
            for (let r = 0; r < numRows; r++) {
                for (let c = 0; c < numCols; c++) {
                    const key = getCellKey(startRow + r, startCol + c);
                    const value = c === 0 ? `Строка ${r + 1}` : `Ячейка ${r + 1}-${c + 1}`;
                    data.set(key, {
                        value,
                        style: {
                            backgroundColor: r % 2 === 0 ? '#f0f0f0' : 'white',
                            border: '1px solid #ccc'
                        }
                    });
                }
            }
            renderCells();
            updateAIDataCache();
            autoSave();
        }
    });
    // Синхронизация скролла
    elements.cellGridWrapper.addEventListener('scroll', () => {
        const scrollLeft = elements.cellGridWrapper.scrollLeft;
        const scrollTop = elements.cellGridWrapper.scrollTop;
        // Синхронизация заголовков столбцов
        elements.columnHeaders.scrollLeft = scrollLeft;
        // Синхронизация заголовков строк
        elements.rowHeaders.scrollTop = scrollTop;
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
    // Формула бар
    elements.formulaInput.addEventListener('input', (e) => {
        const value = e.target.value;
        const { row, col } = state.selectedCell;
        const cell = getCellElement(row, col);
        const data = getCurrentData();
        if (cell) {
            cell.textContent = value;
            if (value) {
                data.set(getCellKey(row, col), { value });
            }
            else {
                data.delete(getCellKey(row, col));
            }
            // Обновляем кэш при каждом изменении
            updateAIDataCache();
        }
    });
    elements.formulaInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            elements.formulaInput.blur();
            const cell = getCellElement(state.selectedCell.row, state.selectedCell.col);
            cell?.focus();
        }
        else if (e.key === 'Escape') {
            elements.formulaInput.blur();
        }
    });
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
            aiPanelContainer.classList.add('open');
        });
    }
    if (elements.btnCloseAI && aiPanelContainer) {
        elements.btnCloseAI.addEventListener('click', () => {
            console.log('[Renderer] Close AI button clicked');
            aiPanelContainer.classList.remove('open');
        });
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
    elements.textColor?.addEventListener('input', (e) => {
        applyStyle('color', e.target.value);
    });
    elements.fillColor?.addEventListener('input', (e) => {
        applyStyle('backgroundColor', e.target.value);
    });
    elements.fontFamily?.addEventListener('change', (e) => {
        applyStyle('fontFamily', e.target.value);
    });
    elements.fontSize?.addEventListener('change', (e) => {
        applyStyle('fontSize', `${e.target.value}px`);
    });
    // Глобальные горячие клавиши
    document.addEventListener('keydown', handleGlobalKeyDown);
}
function handleGlobalKeyDown(e) {
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
    const { row, col } = state.selectedCell;
    const cell = getCellElement(row, col);
    if (!cell)
        return;
    const key = getCellKey(row, col);
    const data = getCurrentData();
    const cellData = data.get(key) || { value: cell.textContent || '' };
    if (!cellData.style) {
        cellData.style = {};
    }
    cellData.style[property] = value;
    cell.style[property] = value;
    data.set(key, cellData);
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
                    // Если есть план - показываем но не выполняем пока пользователь не подтвердит
                    if (response.executionPlan && response.executionPlan.length > 0) {
                        lastExecutionPlan = response.executionPlan; // Сохраняем план
                        addAiMessage('📋 Предлагаю следующий план:', 'assistant');
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
                            '🎨 Покрась ячейки',
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
    // Find JSON blocks
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/g;
    let match;
    while ((match = jsonRegex.exec(content)) !== null) {
        try {
            const jsonStr = match[1].trim();
            const parsed = JSON.parse(jsonStr);
            if (parsed.commands && Array.isArray(parsed.commands)) {
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
                commands.push(parsed);
            }
        }
        catch (e) {
            console.warn('Failed to parse JSON from AI response:', e);
        }
    }
    console.log('[DEBUG] Parsed commands:', commands);
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
    // Сообщение об успехе
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
    // Если есть cell (например "E2"), конвертируем в column и row
    if (params.cell && typeof params.cell === 'string') {
        const cellMatch = params.cell.match(/^([A-Z])(\d+)$/i);
        if (cellMatch) {
            params.column = cellMatch[1].toUpperCase().charCodeAt(0) - 65;
            params.row = parseInt(cellMatch[2]);
            console.log('[DEBUG] Converted cell', params.cell, 'to column:', params.column, 'row:', params.row);
        }
    }
    // Проверяем что column и row существуют для команд которые их требуют
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
    const columnWidths = [];
    for (let c = 0; c < CONFIG.COLS; c++) {
        const colHeader = elements.columnHeaders.querySelector(`.column-header[data-col="${c}"]`);
        const colWidth = colHeader?.style.width || `${CONFIG.CELL_WIDTH}px`;
        columnWidths.push(colWidth);
    }
    elements.cellGrid.style.gridTemplateColumns = columnWidths.join(' ');
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
// === FILL HANDLE (растягивание ячеек) ===
function setupFillHandle() {
    const fillHandle = document.getElementById('fillHandle');
    if (!fillHandle)
        return;
    let isDragging = false;
    let startCell = null;
    let previewCells = [];
    // Показать/скрыть fill handle при выделении ячейки
    const updateFillHandle = () => {
        const { row, col } = state.selectedCell;
        const cell = getCellElement(row, col);
        if (cell) {
            const rect = cell.getBoundingClientRect();
            const containerRect = elements.cellGridWrapper.getBoundingClientRect();
            fillHandle.style.display = 'block';
            fillHandle.style.left = `${rect.right - containerRect.left - 6}px`;
            fillHandle.style.top = `${rect.bottom - containerRect.top - 6}px`;
        }
    };
    // Обработчик нажатия на fill handle
    fillHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        isDragging = true;
        startCell = { ...state.selectedCell };
        fillHandle.classList.add('dragging');
        document.body.style.cursor = 'crosshair';
        document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging || !startCell)
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
            const endRow = parseInt(cell.dataset.row || '0');
            const endCol = parseInt(cell.dataset.col || '0');
            // Вертикальное растягивание - показываем предпросмотр
            if (endRow !== startCell.row) {
                const minRow = Math.min(startCell.row, endRow);
                const maxRow = Math.max(startCell.row, endRow);
                for (let r = minRow; r <= maxRow; r++) {
                    if (r !== startCell.row) {
                        const targetCell = getCellElement(r, startCell.col);
                        if (targetCell) {
                            targetCell.classList.add('fill-preview');
                            previewCells.push(targetCell);
                        }
                    }
                }
            }
            else if (endCol !== startCell.col) {
                // Горизонтальное растягивание - показываем предпросмотр
                const minCol = Math.min(startCell.col, endCol);
                const maxCol = Math.max(startCell.col, endCol);
                for (let c = minCol; c <= maxCol; c++) {
                    if (c !== startCell.col) {
                        const targetCell = getCellElement(startCell.row, c);
                        if (targetCell) {
                            targetCell.classList.add('fill-preview');
                            previewCells.push(targetCell);
                        }
                    }
                }
            }
        }
    });
    document.addEventListener('mouseup', (e) => {
        if (!isDragging)
            return;
        // Найти ячейку под курсором для применения значений
        const element = document.elementFromPoint(e.clientX, e.clientY);
        const cell = element?.closest('.cell');
        if (cell && startCell) {
            const endRow = parseInt(cell.dataset.row || '0');
            const endCol = parseInt(cell.dataset.col || '0');
            const data = getCurrentData();
            const startKey = getCellKey(startCell.row, startCell.col);
            const startData = data.get(startKey);
            const sourceValue = startData?.value || '';
            // Пытаемся определить паттерн для автозаполнения
            const pattern = detectFillPattern(startCell, data);
            // Вертикальное заполнение
            if (endRow !== startCell.row) {
                const minRow = Math.min(startCell.row, endRow);
                const maxRow = Math.max(startCell.row, endRow);
                for (let r = minRow; r <= maxRow; r++) {
                    if (r !== startCell.row) {
                        const value = pattern ? calculatePatternValue(pattern, r - startCell.row) : sourceValue;
                        const targetCell = getCellElement(r, startCell.col);
                        if (targetCell) {
                            targetCell.textContent = String(value);
                            data.set(getCellKey(r, startCell.col), { value: String(value) });
                        }
                    }
                }
            }
            else if (endCol !== startCell.col) {
                // Горизонтальное заполнение
                const minCol = Math.min(startCell.col, endCol);
                const maxCol = Math.max(startCell.col, endCol);
                for (let c = minCol; c <= maxCol; c++) {
                    if (c !== startCell.col) {
                        const value = pattern ? calculatePatternValue(pattern, c - startCell.col) : sourceValue;
                        const targetCell = getCellElement(startCell.row, c);
                        if (targetCell) {
                            targetCell.textContent = String(value);
                            data.set(getCellKey(startCell.row, c), { value: String(value) });
                        }
                    }
                }
            }
            renderCells();
            pushUndo('fill', { start: startCell, end: { row: endRow, col: endCol } });
        }
        // Очистка
        isDragging = false;
        startCell = null;
        previewCells.forEach(cell => cell.classList.remove('fill-preview'));
        previewCells = [];
        fillHandle.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        updateFillHandle();
    });
    // Скры��ь при скр��лле
    elements.cellGridWrapper.addEventListener('scroll', () => {
        fillHandle.style.display = 'none';
    }, true);
}
// === PATTERNS FOR FILL HANDLE ===
function detectFillPattern(startCell, data) {
    const values = [];
    for (let r = startCell.row - 1; r >= Math.max(0, startCell.row - 5); r--) {
        const key = getCellKey(r, startCell.col);
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
function calculatePatternValue(pattern, step) {
    if (pattern.type === 'arithmetic')
        return pattern.lastValue + (pattern.diff * step);
    if (pattern.type === 'geometric')
        return pattern.lastValue * Math.pow(pattern.ratio, step);
    return pattern.lastValue;
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
        { format: 'csv', label: 'CSV (.csv)', icon: '📄' },
        { format: 'xlsx', label: 'Excel (.xlsx)', icon: '📊' },
        { format: 'json', label: 'JSON (.json)', icon: '📋' },
        { format: 'html', label: 'HTML (.html)', icon: '🌐' },
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
${row.map(cell => `        <Cell><Data ss:Type="String">${cell}</Data></Cell>`).join('\n')}
      </Row>`).join('\n')}
    </Table>
  </Worksheet>
</Workbook>`;
            mimeType = 'application/vnd.ms-excel';
            extension = 'xls';
            break;
    }
    // Создать и скачать файл
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartTable_${new Date().toISOString().slice(0, 10)}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    return 'Я понял ваш запрос! Вот что я могу сделать:\n\n📝 **Создать формулу** - помогу с функциями\n📊 **Анализировать** - найду закономерности\n🧹 **Очистить данные** - уберу лишнее\n📈 **Визуализировать** - предложу графики\n\nЧт�� бы вы хотели сделать?';
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
// Вычисление формул
function evaluateFormulaLocal(formula, getCellValue) {
    try {
        let expr = formula.substring(1).toUpperCase(); // Убираем '=' и переводим в верхний регистр
        // Сначала обрабатываем функции с диапазонами
        expr = expr.replace(/SUM\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/g, (match, col1, row1, col2, row2) => {
            const values = getRangeValues(col1, parseInt(row1), col2, parseInt(row2), getCellValue);
            return values.reduce((a, b) => a + b, 0).toString();
        });
        expr = expr.replace(/AVERAGE\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/g, (match, col1, row1, col2, row2) => {
            const values = getRangeValues(col1, parseInt(row1), col2, parseInt(row2), getCellValue);
            return values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toString() : '0';
        });
        expr = expr.replace(/MAX\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/g, (match, col1, row1, col2, row2) => {
            const values = getRangeValues(col1, parseInt(row1), col2, parseInt(row2), getCellValue);
            return values.length > 0 ? Math.max(...values).toString() : '0';
        });
        expr = expr.replace(/MIN\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/g, (match, col1, row1, col2, row2) => {
            const values = getRangeValues(col1, parseInt(row1), col2, parseInt(row2), getCellValue);
            return values.length > 0 ? Math.min(...values).toString() : '0';
        });
        expr = expr.replace(/COUNT\(([A-Z]+)(\d+):([A-Z]+)(\d+)\)/g, (match, col1, row1, col2, row2) => {
            const values = getRangeValues(col1, parseInt(row1), col2, parseInt(row2), getCellValue);
            return values.length.toString();
        });
        // Заменяем отдельные ссылки на ячейки (A1, B2 и т.д.) на значения
        expr = expr.replace(/([A-Z]+)(\d+)/g, (match) => {
            const val = getCellValue(match);
            const num = parseFloat(val);
            return isNaN(num) ? `"${val}"` : val.toString();
        });
        // Вычисляем выражение (безопасно)
        const result = Function('"use strict";return (' + expr + ')')();
        return { value: typeof result === 'number' ? result : String(result) };
    }
    catch (e) {
        return { value: '#ERROR!' };
    }
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
    // Суммируем только первую и последнюю ячейку (A1 и B5)
    const firstRef = `${col1}${row1}`;
    const lastRef = `${col2}${row2}`;
    const firstVal = getCellValue(firstRef);
    const firstNum = parseFloat(firstVal);
    if (!isNaN(firstNum)) {
        values.push(firstNum);
    }
    // Если первая и последняя ячейки разные, добавляем последнюю
    if (firstRef !== lastRef) {
        const lastVal = getCellValue(lastRef);
        const lastNum = parseFloat(lastVal);
        if (!isNaN(lastNum)) {
            values.push(lastNum);
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
    // Если выделено несколько строк - сумма в нижней ячейке
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
        const getCellValue = (cellRef) => {
            const match = cellRef.match(/^([A-Z]+)(\d+)$/i);
            if (!match)
                return '';
            const c = match[1].toUpperCase().charCodeAt(0) - 65;
            const r = parseInt(match[2]) - 1;
            const cellKey = getCellKey(r, c);
            const cellData = data.get(cellKey);
            return cellData?.value || '';
        };
        const result = evaluateFormulaLocal(value, getCellValue);
        finalValue = String(result.value);
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
                const getCellValue = (cellRef) => {
                    const match = cellRef.match(/^([A-Z]+)(\d+)$/i);
                    if (!match)
                        return '';
                    const colIdx = match[1].toUpperCase().charCodeAt(0) - 65;
                    const rowIdx = parseInt(match[2]) - 1;
                    const cellKey = getCellKey(rowIdx, colIdx);
                    const cellData = tableData.get(cellKey);
                    return cellData?.value || '';
                };
                const result = evaluateFormulaLocal(value, getCellValue);
                value = String(result.value);
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
export {};
//# sourceMappingURL=renderer.js.map