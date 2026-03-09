/**
 * Интеграция формул в SmartTable Renderer
 * Выпадающий список формул при вводе =
 */
import { evaluateFormula, FORMULAS, FORMULA_LIST } from '../../core/formulas/formulas.js';
let selectedFormulaIndex = 0;
let formulaSuggestionsVisible = false;
/**
 * Вычислить формулу для ячейки
 */
export function calculateCellFormula(formula, currentRow, currentCol, getData) {
    if (!formula.startsWith('=')) {
        return formula;
    }
    // Функция для получения данных из ячейки
    const getCellValue = (cellRef) => {
        const match = cellRef.match(/^([A-Z]+)(\d+)$/i);
        if (!match)
            return '';
        const col = match[1].toUpperCase().charCodeAt(0) - 65;
        const row = parseInt(match[2]) - 1;
        return getData(row, col);
    };
    const result = evaluateFormula(formula, getCellValue);
    if (result.error && result.value === '#AI_PROCESSING...') {
        return handleAIFormula(formula, currentRow, currentCol);
    }
    return String(result.value);
}
/**
 * Вычислить формулу с предпросмотром (для редактирования)
 */
export function previewFormula(formula, getData) {
    if (!formula.startsWith('=')) {
        return { value: formula };
    }
    return evaluateFormula(formula, getData);
}
/**
 * Обработка ИИ формулы
 */
function handleAIFormula(formula, row, col) {
    const match = formula.match(/=AI\(["'](.+)["']\)/i);
    if (!match) {
        return '#ERROR!';
    }
    const request = match[1];
    // Отправить запрос к ИИ через IPC
    const { ipcRenderer } = require('electron');
    return new Promise((resolve) => {
        ipcRenderer.invoke('ai-formula', { request, row, col })
            .then((result) => {
            resolve(result.value || '#ERROR!');
        })
            .catch(() => {
            resolve('#ERROR!');
        });
    });
}
/**
 * Проверка формулы на валидность (для подсветки ошибок)
 */
export function validateFormula(formula) {
    if (!formula.startsWith('=')) {
        return { valid: true };
    }
    // Проверка на парные скобки
    const openParens = (formula.match(/\(/g) || []).length;
    const closeParens = (formula.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
        return { valid: false, error: 'Несбалансированные скобки' };
    }
    // Проверка на пустую формулу
    if (formula === '=') {
        return { valid: false, error: 'Пустая формула' };
    }
    return { valid: true };
}
/**
 * Показать выпадающий список формул
 */
export function showFormulaSuggestions(filter, formulaInput, suggestionsEl, suggestionsListEl) {
    suggestionsListEl.innerHTML = '';
    selectedFormulaIndex = 0;
    // Фильтруем формулы по введенному тексту
    const filtered = FORMULA_LIST.filter(name => name.toUpperCase().startsWith(filter.toUpperCase())).slice(0, 15);
    if (filtered.length === 0) {
        hideFormulaSuggestions(suggestionsEl);
        return;
    }
    filtered.forEach((name, index) => {
        const formula = FORMULAS[name];
        const item = document.createElement('div');
        item.className = 'formula-suggestion-item' + (index === 0 ? ' selected' : '');
        item.dataset.formula = name;
        item.innerHTML = `
      <span class="formula-name">${formula.name}</span>
      <span class="formula-description">${formula.description}</span>
      <span class="formula-syntax">${formula.syntax}</span>
    `;
        // Клик по формуле
        item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            insertFormula(name, formulaInput);
            hideFormulaSuggestions(suggestionsEl);
            formulaInput.focus();
        });
        suggestionsListEl.appendChild(item);
    });
    // Позиционирование под строкой формул
    const rect = formulaInput.getBoundingClientRect();
    suggestionsEl.style.left = `${rect.left}px`;
    suggestionsEl.style.top = `${rect.bottom + 5}px`;
    suggestionsEl.classList.add('visible');
    formulaSuggestionsVisible = true;
}
/**
 * Скрыть выпадающий список формул
 */
export function hideFormulaSuggestions(suggestionsEl) {
    suggestionsEl.classList.remove('visible');
    formulaSuggestionsVisible = false;
}
/**
 * Обновить выделенный элемент в списке
 */
export function updateSelectedFormulaInList(suggestionsListEl) {
    const items = suggestionsListEl.querySelectorAll('.formula-suggestion-item');
    items.forEach((item, index) => {
        if (index === selectedFormulaIndex) {
            item.classList.add('selected');
        }
        else {
            item.classList.remove('selected');
        }
    });
    // Прокрутка к выделенному элементу
    const selectedItem = suggestionsListEl.querySelector('.formula-suggestion-item.selected');
    if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
    }
}
/**
 * Вставить формулу в строку ввода
 */
export function insertFormula(formulaName, formulaInput) {
    const value = formulaInput.value;
    // Если уже есть начало формулы с частичным именем
    if (value.startsWith('=')) {
        const text = value.substring(1).toUpperCase();
        const parts = text.split(/[\(\),\s]/);
        const lastPart = parts[parts.length - 1] || '';
        if (lastPart.length > 0 && lastPart !== formulaName) {
            // Заменяем частичное имя на полное
            const newValue = value.slice(0, -lastPart.length) + formulaName + '(';
            formulaInput.value = newValue;
        }
        else if (lastPart === formulaName) {
            // Имя уже введено, просто добавляем скобку
            formulaInput.value = value + '(';
        }
        else {
            // Пустая строка после =
            formulaInput.value = '=' + formulaName + '(';
        }
    }
    else {
        formulaInput.value = '=' + formulaName + '(';
    }
}
/**
 * Обработать нажатие клавиш в списке формул
 */
export function handleFormulaSuggestionsKeydown(e, suggestionsEl, suggestionsListEl, formulaInput) {
    if (!formulaSuggestionsVisible)
        return false;
    const items = suggestionsListEl.querySelectorAll('.formula-suggestion-item');
    if (items.length === 0)
        return false;
    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            selectedFormulaIndex = Math.min(selectedFormulaIndex + 1, items.length - 1);
            updateSelectedFormulaInList(suggestionsListEl);
            return true;
        case 'ArrowUp':
            e.preventDefault();
            selectedFormulaIndex = Math.max(selectedFormulaIndex - 1, 0);
            updateSelectedFormulaInList(suggestionsListEl);
            return true;
        case 'Enter':
        case 'Tab':
            e.preventDefault();
            const formulaName = items[selectedFormulaIndex].dataset.formula || '';
            insertFormula(formulaName, formulaInput);
            hideFormulaSuggestions(suggestionsEl);
            return true;
        case 'Escape':
            e.preventDefault();
            hideFormulaSuggestions(suggestionsEl);
            return true;
    }
    return false;
}
/**
 * Получить информацию о формуле для подсказки
 */
export function getFormulaInfo(formulaName) {
    const name = formulaName.toUpperCase();
    if (name in FORMULAS) {
        return FORMULAS[name];
    }
    return null;
}
// Делаем функции доступными глобально
window.calculateCellFormula = calculateCellFormula;
window.previewFormula = previewFormula;
window.validateFormula = validateFormula;
window.getFormulaInfo = getFormulaInfo;
window.showFormulaSuggestions = showFormulaSuggestions;
window.hideFormulaSuggestions = hideFormulaSuggestions;
// ==================== SmartTable Focus Manager ====================
// Менеджер фокуса для восстановления после операций
let activeCell = null;
/**
 * Сохранить активную ячейку
 */
export function saveActiveCell(row, col) {
    activeCell = { row, col };
}
/**
 * Получить активную ячейку
 */
export function getActiveCell() {
    return activeCell;
}
/**
 * Восстановить фокус на активной ячейке
 */
export function restoreFocus() {
    if (!activeCell)
        return;
    const cell = document.querySelector(`.cell[data-row="${activeCell.row}"][data-col="${activeCell.col}"]`);
    if (cell) {
        // Фокус на cellGridWrapper для работы навигации
        const gridWrapper = document.getElementById('cellGridWrapper');
        if (gridWrapper) {
            gridWrapper.focus({ preventScroll: true });
        }
    }
}
/**
 * Вызывать после операций с файлом/кешем
 */
export function onAfterFileOperation() {
    // Небольшая задержка чтобы DOM обновился
    setTimeout(() => {
        restoreFocus();
    }, 50);
}
/**
 * Защита от потери фокуса при навигации
 */
document.addEventListener('keydown', (e) => {
    // Если нажаты навигационные клавиши и фокус потерян
    const navigationKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab'];
    if (navigationKeys.includes(e.key)) {
        const gridWrapper = document.getElementById('cellGridWrapper');
        const activeElement = document.activeElement;
        // Если фокус не на таблице и не на input
        if (activeElement !== gridWrapper &&
            activeElement?.tagName !== 'INPUT' &&
            activeElement?.tagName !== 'TEXTAREA') {
            restoreFocus();
        }
    }
});
//# sourceMappingURL=formulas-renderer.js.map