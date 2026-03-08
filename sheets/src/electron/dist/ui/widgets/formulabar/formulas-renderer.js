/**
 * Интеграция формул в SmartTable Renderer - Полная поддержка IF/ELSE
 */
import { evaluateFormula, FORMULAS, FORMULA_LIST } from '../../core/formulas/formulas.js';
let autocompleteVisible = false;
let selectedFormulaIndex = 0;
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
 * Настройка поддержки формул
 */
export function setupFormulaSupport(formulaInput, cellGrid, autocompleteEl, formulaListEl, getData, setCurrentCellFormula) {
    // Автокомплит при вводе =
    formulaInput.addEventListener('input', (e) => {
        const value = formulaInput.value;
        if (value.startsWith('=')) {
            const text = value.substring(1).toUpperCase();
            const lastPart = text.split(/[\(\),\s]/).pop() || '';
            if (lastPart.length > 0) {
                showAutocomplete(lastPart, formulaInput, autocompleteEl, formulaListEl);
            }
            else {
                hideAutocomplete(autocompleteEl);
            }
        }
        else {
            hideAutocomplete(autocompleteEl);
        }
    });
    // Навигация по автокомплиту
    formulaInput.addEventListener('keydown', (e) => {
        if (!autocompleteVisible)
            return;
        const items = formulaListEl.querySelectorAll('.formula-item');
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedFormulaIndex = Math.min(selectedFormulaIndex + 1, items.length - 1);
                updateSelectedFormula(items);
                break;
            case 'ArrowUp':
                e.preventDefault();
                selectedFormulaIndex = Math.max(selectedFormulaIndex - 1, 0);
                updateSelectedFormula(items);
                break;
            case 'Enter':
            case 'Tab':
                if (autocompleteVisible && items[selectedFormulaIndex]) {
                    e.preventDefault();
                    const formulaName = items[selectedFormulaIndex].dataset.formula || '';
                    insertFormula(formulaName, formulaInput);
                    hideAutocomplete(autocompleteEl);
                }
                break;
            case 'Escape':
                hideAutocomplete(autocompleteEl);
                break;
        }
    });
    // Клик по формуле
    formulaListEl.addEventListener('click', (e) => {
        const item = e.target.closest('.formula-item');
        if (!item)
            return;
        const formulaName = item.dataset.formula || '';
        insertFormula(formulaName, formulaInput);
        hideAutocomplete(autocompleteEl);
    });
    // Скрыть при клике вне
    document.addEventListener('click', (e) => {
        if (!autocompleteEl.contains(e.target) && e.target !== formulaInput) {
            hideAutocomplete(autocompleteEl);
        }
    });
}
function showAutocomplete(filter, formulaInput, autocompleteEl, formulaListEl) {
    formulaListEl.innerHTML = '';
    selectedFormulaIndex = 0;
    const filtered = FORMULA_LIST.filter(name => name.startsWith(filter)).slice(0, 10);
    if (filtered.length === 0) {
        hideAutocomplete(autocompleteEl);
        return;
    }
    filtered.forEach((name, index) => {
        const formula = FORMULAS[name];
        const item = document.createElement('div');
        item.className = 'formula-item' + (index === 0 ? ' selected' : '');
        item.dataset.formula = name;
        item.innerHTML = `
      <span class="formula-name">${formula.name}</span>
      <span class="formula-description">${formula.description}</span>
      <span class="formula-syntax">${formula.syntax}</span>
    `;
        formulaListEl.appendChild(item);
    });
    // Позиционирование
    const rect = formulaInput.getBoundingClientRect();
    autocompleteEl.style.left = `${rect.left}px`;
    autocompleteEl.style.top = `${rect.bottom + 5}px`;
    autocompleteEl.classList.add('visible');
    autocompleteVisible = true;
}
function hideAutocomplete(autocompleteEl) {
    autocompleteEl.classList.remove('visible');
    autocompleteVisible = false;
}
function updateSelectedFormula(items) {
    items.forEach((item, index) => {
        if (index === selectedFormulaIndex) {
            item.classList.add('selected');
        }
        else {
            item.classList.remove('selected');
        }
    });
}
function insertFormula(formulaName, formulaInput) {
    const value = formulaInput.value;
    const text = value.substring(1).toUpperCase();
    const lastPart = text.split(/[\(\),\s]/).pop() || '';
    if (lastPart.length > 0) {
        const newValue = value.slice(0, -lastPart.length) + formulaName + '(';
        formulaInput.value = newValue;
        formulaInput.focus();
    }
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
window.setupFormulaSupport = setupFormulaSupport;
window.validateFormula = validateFormula;
window.getFormulaInfo = getFormulaInfo;
//# sourceMappingURL=formulas-renderer.js.map