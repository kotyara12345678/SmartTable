"use strict";
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
    // Для выделения диапазона
    selectionStart: null,
    selectionEnd: null,
    isSelecting: false,
    // Для контекстного меню
    contextMenuCell: null,
    // Кэш данных для ИИ (обновляется автоматически)
    aiDataCache: [],
};
// Инициализировать данные для первого листа
state.sheetsData.set(1, new Map());
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
function init() {
    console.log('[Renderer] init() called');
    // Инициализируем DOM элементы
    initElements();
    try {
        // Получаем ipcRenderer через contextBridge
        ipcRenderer = window.electronAPI?.ipcRenderer;
        if (!ipcRenderer) {
            // Fallback для прямой загрузки
            ipcRenderer = window.require?.('electron')?.ipcRenderer;
        }
        console.log('[Renderer] ipcRenderer initialized:', !!ipcRenderer);
    }
    catch (e) {
        console.error('[Renderer] Failed to get ipcRenderer:', e);
    }
    console.log('[Renderer] Starting renderColumnHeaders');
    renderColumnHeaders();
    console.log('[Renderer] Starting renderRowHeaders');
    renderRowHeaders();
    console.log('[Renderer] Starting renderCells');
    renderCells();
    console.log('[Renderer] Starting setupEventListeners');
    setupEventListeners();
    console.log('[Renderer] Starting updateCellReference');
    updateCellReference();
    // Инициализируем UI режима ИИ
    updateModeUI();
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
    elements.cellGrid.innerHTML = '';
    elements.cellGrid.style.gridTemplateColumns = `repeat(${CONFIG.COLS}, ${CONFIG.CELL_WIDTH}px)`;
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
            }
            // События
            cell.addEventListener('click', () => selectCell(row, col));
            cell.addEventListener('dblclick', () => editCell(row, col));
            cell.addEventListener('keydown', handleCellKeyDown);
            cell.addEventListener('input', handleCellInput);
            elements.cellGrid.appendChild(cell);
        }
    }
}
// === ВЫДЕЛЕНИЕ ЯЧЕЕК ===
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
    cell.contentEditable = 'false';
    // Сохранить данные
    const key = getCellKey(state.selectedCell.row, state.selectedCell.col);
    const value = cell.textContent || '';
    const data = getCurrentData();
    if (value) {
        data.set(key, { value });
    }
    else {
        data.delete(key);
    }
    // Обновить кэш для ИИ
    updateAIDataCache();
    updateFormulaBar();
}
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
        default:
            // Начать редактирование при вводе символа
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                editCell(row, col);
            }
    }
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
        if (value) {
            data.set(key, { value });
        }
        else {
            data.delete(key);
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
    elements.formulaInput.value = cellData?.value || '';
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
        const menu = elements.contextMenu;
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
        menu.classList.add('visible');
    });
    // Скрыть меню при клике
    document.addEventListener('click', () => {
        elements.contextMenu.classList.remove('visible');
    });
    // Обработка действий меню
    elements.contextMenu.addEventListener('click', (e) => {
        const item = e.target.closest('.context-menu-item');
        if (!item)
            return;
        const action = item.dataset.action;
        handleContextMenuAction(action);
        elements.contextMenu.classList.remove('visible');
    });
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
        case 'insert-row-above':
        case 'insert-row-below':
        case 'delete-row':
        case 'insert-col-left':
        case 'insert-col-right':
        case 'delete-col':
            console.log(`Action: ${action} (to be implemented)`);
            break;
    }
}
function setupEventListeners() {
    // Переключение вкладок меню
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
            item.classList.add('active');
        });
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
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
            item.classList.add('active');
            currentMenuTab = item.dataset.tab || 'home';
            // Скрыть/показать формула-бар в зависимости от вкладки
            const formulaBar = document.querySelector('.formula-bar');
            if (formulaBar) {
                if (currentMenuTab === 'formulas') {
                    formulaBar.style.display = 'flex';
                }
                else {
                    formulaBar.style.display = 'none';
                }
            }
        });
    });
    // Экспорт через меню Файл
    // elements.btnExport удалена из UI
    // Выделение диапазона мышью
    setupRangeSelection();
    // Контекстное меню (ПКМ)
    setupContextMenu();
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
    elements.btnAddSheet.addEventListener('click', addSheet);
    // ИИ панель
    elements.btnAI.addEventListener('click', () => {
        elements.aiPanel.classList.add('open');
    });
    elements.btnCloseAI.addEventListener('click', () => {
        elements.aiPanel.classList.remove('open');
    });
    elements.btnClearChat.addEventListener('click', () => {
        clearChatHistory();
        elements.aiChat.innerHTML = '<div class="ai-message ai-message-assistant">История чата очищена. Чем могу помочь?</div>';
    });
    elements.btnAiSend.addEventListener('click', sendAiMessage);
    elements.aiInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            sendAiMessage();
        }
    });
    // Форматирование
    elements.btnBold.addEventListener('click', () => toggleFormatting('bold'));
    elements.btnItalic.addEventListener('click', () => toggleFormatting('italic'));
    elements.btnUnderline.addEventListener('click', () => toggleFormatting('underline'));
    elements.btnStrike.addEventListener('click', () => toggleFormatting('lineThrough'));
    // Переключение видимости formula bar
    elements.btnToggleFormulaBar.addEventListener('click', () => {
        const formulaBar = document.querySelector('.formula-bar');
        if (formulaBar) {
            formulaBar.classList.toggle('visible');
        }
    });
    elements.textColor.addEventListener('input', (e) => {
        applyStyle('color', e.target.value);
    });
    elements.fillColor.addEventListener('input', (e) => {
        applyStyle('backgroundColor', e.target.value);
    });
    elements.fontFamily.addEventListener('change', (e) => {
        applyStyle('fontFamily', e.target.value);
    });
    elements.fontSize.addEventListener('change', (e) => {
        applyStyle('fontSize', `${e.target.value}px`);
    });
    // Глобальные горячие клавиши
    document.addEventListener('keydown', handleGlobalKeyDown);
}
function handleGlobalKeyDown(e) {
    // Ctrl+B, Ctrl+I, Ctrl+U
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
                ? 'Это сложная задача. Переключиться в режим агента для выполнения по шагам?'
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
    switch (style) {
        case 'bold':
            cellData.style.fontWeight = cellData.style.fontWeight === 'bold' ? 'normal' : 'bold';
            cell.style.fontWeight = cellData.style.fontWeight;
            elements.btnBold.classList.toggle('active');
            break;
        case 'italic':
            cellData.style.fontStyle = cellData.style.fontStyle === 'italic' ? 'normal' : 'italic';
            cell.style.fontStyle = cellData.style.fontStyle;
            elements.btnItalic.classList.toggle('active');
            break;
        case 'underline':
            cellData.style.textDecoration = cellData.style.textDecoration === 'underline' ? 'none' : 'underline';
            cell.style.textDecoration = cellData.style.textDecoration;
            elements.btnUnderline.classList.toggle('active');
            break;
        case 'lineThrough':
            cellData.style.textDecoration = cellData.style.textDecoration === 'line-through' ? 'none' : 'line-through';
            cell.style.textDecoration = cellData.style.textDecoration;
            elements.btnStrike.classList.toggle('active');
            break;
    }
    data.set(key, cellData);
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
// Обработчик экспорта из главного меню
if (ipcRenderer) {
    ipcRenderer.on('export', (event, format) => {
        exportData(format);
    });
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
    // Показать индикатор загрузки
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'ai-message ai-message-assistant';
    loadingMsg.textContent = 'Думаю...';
    loadingMsg.id = 'ai-loading';
    elements.aiChat.appendChild(loadingMsg);
    elements.aiChat.scrollTop = elements.aiChat.scrollHeight;
    // Получить контекст таблицы
    const tableContext = getTableContext();
    try {
        if (!ipcRenderer) {
            throw new Error('ipcRenderer not initialized');
        }
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
                            '📊 Заполни таблицу данными',
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
    return colorMap[normalized] || color;
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
    // Нормализуем цвета в параметрах
    if (params.bg_color)
        params.bg_color = normalizeColor(params.bg_color);
    if (params.text_color)
        params.text_color = normalizeColor(params.text_color);
    console.log('[DEBUG] Executing action:', action, 'params:', params);
    const data = getCurrentData();
    switch (action) {
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
                const colIndex = params.column.toUpperCase().charCodeAt(0) - 65;
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
                const colIndex = params.column.toUpperCase().charCodeAt(0) - 65;
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
                const colIndex = params.column.toUpperCase().charCodeAt(0) - 65;
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
                console.log('[DEBUG] set_cell_color:', params);
                const colIndex = params.column.toUpperCase().charCodeAt(0) - 65;
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
                console.log('[DEBUG] color_column:', params);
                const colIndex = params.column.toUpperCase().charCodeAt(0) - 65;
                console.log('[DEBUG] colIndex:', colIndex, 'bg_color:', params.bg_color);
                let coloredCount = 0;
                for (let r = 0; r < CONFIG.ROWS; r++) {
                    const cell = getCellElement(r, colIndex);
                    if (cell) {
                        if (params.bg_color) {
                            cell.style.backgroundColor = params.bg_color;
                        }
                        if (params.text_color) {
                            cell.style.color = params.text_color;
                        }
                        coloredCount++;
                        const key = getCellKey(r, colIndex);
                        const cellData = data.get(key) || { value: cell.textContent };
                        data.set(key, { ...cellData, style: { ...cellData.style, backgroundColor: params.bg_color, color: params.text_color } });
                    }
                }
                console.log('[DEBUG] Colored cells:', coloredCount);
                updateAIDataCache();
            }
            break;
        case 'color_row':
            {
                const rowIndex = params.row - 1;
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
                const colIndex = params.column.toUpperCase().charCodeAt(0) - 65;
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
    message.textContent = text;
    elements.aiChat.appendChild(message);
    elements.aiChat.scrollTop = elements.aiChat.scrollHeight;
}
// === ИЗМЕНЕНИЕ РАЗМЕРА СТОЛБЦОВ ===
function setupColumnResize() {
    let isResizing = false;
    let currentCol = -1;
    let startX = 0;
    let startWidth = 0;
    elements.columnHeaders.addEventListener('mousedown', (e) => {
        const target = e.target;
        if (target.classList.contains('column-resize-handle')) {
            isResizing = true;
            currentCol = parseInt(target.dataset.col || '0');
            startX = e.pageX;
            const header = elements.columnHeaders.querySelector(`.column-header[data-col="${currentCol}"]`);
            startWidth = header?.offsetWidth || CONFIG.CELL_WIDTH;
            document.body.style.cursor = 'col-resize';
            e.preventDefault();
        }
    });
    document.addEventListener('mousemove', (e) => {
        if (!isResizing || currentCol === -1)
            return;
        const diff = e.pageX - startX;
        const newWidth = Math.max(30, startWidth + diff);
        const header = elements.columnHeaders.querySelector(`.column-header[data-col="${currentCol}"]`);
        if (header) {
            header.style.width = `${newWidth}px`;
            header.style.minWidth = `${newWidth}px`;
        }
        // Обновить все ячейки в этом столбце
        const cells = elements.cellGrid.querySelectorAll(`.cell[data-col="${currentCol}"]`);
        cells.forEach(cell => {
            cell.style.width = `${newWidth}px`;
            cell.style.minWidth = `${newWidth}px`;
        });
    });
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            currentCol = -1;
            document.body.style.cursor = '';
        }
    });
    // Добавить resize handle к заголовкам столбцов
    const headers = elements.columnHeaders.querySelectorAll('.column-header');
    headers.forEach(header => {
        const handle = document.createElement('div');
        handle.className = 'column-resize-handle';
        handle.dataset.col = header.dataset.col;
        header.appendChild(handle);
    });
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
    });
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            currentRow = -1;
            document.body.style.cursor = '';
        }
    });
    // Добавить resize handle к заголовкам строк
    const headers = elements.rowHeaders.querySelectorAll('.row-header');
    headers.forEach(header => {
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
    // Показать/скрыть fill handle при выделении ячейки
    const updateFillHandle = () => {
        const { row, col } = state.selectedCell;
        const cell = getCellElement(row, col);
        if (cell) {
            const rect = cell.getBoundingClientRect();
            fillHandle.style.display = 'block';
            fillHandle.style.left = `${rect.right - 4}px`;
            fillHandle.style.top = `${rect.bottom - 4}px`;
        }
    };
    // Обработчик нажатия на fill handle
    fillHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        isDragging = true;
        startCell = { ...state.selectedCell };
        fillHandle.classList.add('dragging');
    });
    document.addEventListener('mousemove', (e) => {
        if (!isDragging || !startCell)
            return;
        // Найти ячейку под курсором
        const element = document.elementFromPoint(e.clientX, e.clientY);
        const cell = element?.closest('.cell');
        if (cell) {
            const endRow = parseInt(cell.dataset.row || '0');
            const endCol = parseInt(cell.dataset.col || '0');
            // Копировать значение от startCell до endCell
            const data = getCurrentData();
            const startKey = getCellKey(startCell.row, startCell.col);
            const startData = data.get(startKey);
            const sourceValue = startData?.value || '';
            // Определить направление (строка или столбец)
            if (endRow !== startCell.row) {
                // Вертикальное копирование
                const minRow = Math.min(startCell.row, endRow);
                const maxRow = Math.max(startCell.row, endRow);
                for (let r = minRow; r <= maxRow; r++) {
                    const targetCell = getCellElement(r, startCell.col);
                    if (targetCell) {
                        targetCell.textContent = sourceValue;
                        data.set(getCellKey(r, startCell.col), { value: sourceValue });
                    }
                }
            }
            else if (endCol !== startCell.col) {
                // Горизонтальное копирование
                const minCol = Math.min(startCell.col, endCol);
                const maxCol = Math.max(startCell.col, endCol);
                for (let c = minCol; c <= maxCol; c++) {
                    const targetCell = getCellElement(startCell.row, c);
                    if (targetCell) {
                        targetCell.textContent = sourceValue;
                        data.set(getCellKey(startCell.row, c), { value: sourceValue });
                    }
                }
            }
            updateFillHandle();
        }
    });
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            startCell = null;
            fillHandle.classList.remove('dragging');
        }
    });
    // Скры��ь при скр��лле
    elements.cellGridWrapper.addEventListener('scroll', () => {
        fillHandle.style.display = 'none';
    }, true);
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
        return '📊 Я могу проанализировать ваши данные:\n\n1. Найти закономерности\n2. Выявить аномалии\n3. Построить статистику\n4. Предложить визуализацию\n\nВыделите диапазон яч��ек и попросите меня проанализировать их.';
    }
    if (lowerMessage.includes('очист') || lowerMessage.includes('удал')) {
        return '🧹 Для очистки данных я могу:\n\n• Удалить пустые строки\n• Убрать дубликаты\n• Исправить формат\n• Нормализовать текст\n\nЧто именно нужно очистить?';
    }
    return 'Я понял ваш запрос! Вот что я могу сделать:\n\n📝 **Создать формулу** - помогу с функциями\n📊 **Анализировать** - найду закономерности\n🧹 **Очистить данные** - уберу лишнее\n📈 **Визуализировать** - предложу графики\n\nЧт�� бы вы хотели сделать?';
}
// === ЗАПУСК ===
init();
renderSheets();
//# sourceMappingURL=renderer.js.map