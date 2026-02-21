/**
 * Интеграция формул в SmartTable Renderer
 */

// Вставляем FORMULAS и FORMULA_LIST напрямую чтобы не было импортов
const FORMULAS_LOCAL = {
  SUM: { name: 'SUM', description: 'Сумма значений', syntax: '=SUM(A1:A10)' },
  AVERAGE: { name: 'AVERAGE', description: 'Среднее значение', syntax: '=AVERAGE(A1:A10)' },
  MIN: { name: 'MIN', description: 'Минимальное значение', syntax: '=MIN(A1:A10)' },
  MAX: { name: 'MAX', description: 'Максимальное значение', syntax: '=MAX(A1:A10)' },
  COUNT: { name: 'COUNT', description: 'Количество чисел', syntax: '=COUNT(A1:A10)' },
  COUNTA: { name: 'COUNTA', description: 'Количество непустых', syntax: '=COUNTA(A1:A10)' },
  PRODUCT: { name: 'PRODUCT', description: 'Произведение', syntax: '=PRODUCT(A1:A10)' },
  ROUND: { name: 'ROUND', description: 'Округление', syntax: '=ROUND(A1, 2)' },
  ABS: { name: 'ABS', description: 'Модуль числа', syntax: '=ABS(A1)' },
  POWER: { name: 'POWER', description: 'Возведение в степень', syntax: '=POWER(A1, 2)' },
  SQRT: { name: 'SQRT', description: 'Квадратный корень', syntax: '=SQRT(A1)' },
  IF: { name: 'IF', description: 'Условие', syntax: '=IF(A1>10, "Да", "Нет")' },
  AND: { name: 'AND', description: 'И', syntax: '=AND(A1>0, A1<10)' },
  OR: { name: 'OR', description: 'ИЛИ', syntax: '=OR(A1>0, A1<10)' },
  NOT: { name: 'NOT', description: 'НЕ', syntax: '=NOT(A1>10)' },
  CONCATENATE: { name: 'CONCATENATE', description: 'Сцепить текст', syntax: '=CONCATENATE(A1, " ", B1)' },
  CONCAT: { name: 'CONCAT', description: 'Сцепить текст', syntax: '=CONCAT(A1, B1)' },
  LEN: { name: 'LEN', description: 'Длина текста', syntax: '=LEN(A1)' },
  UPPER: { name: 'UPPER', description: 'В верхний регистр', syntax: '=UPPER(A1)' },
  LOWER: { name: 'LOWER', description: 'В нижний регистр', syntax: '=LOWER(A1)' },
  TRIM: { name: 'TRIM', description: 'Удалить пробелы', syntax: '=TRIM(A1)' },
  LEFT: { name: 'LEFT', description: 'Слева символы', syntax: '=LEFT(A1, 3)' },
  RIGHT: { name: 'RIGHT', description: 'Справа символы', syntax: '=RIGHT(A1, 3)' },
  MID: { name: 'MID', description: 'Из середины', syntax: '=MID(A1, 2, 3)' },
  TODAY: { name: 'TODAY', description: 'Сегодняшняя дата', syntax: '=TODAY()' },
  NOW: { name: 'NOW', description: 'Текущая дата и время', syntax: '=NOW()' },
  DAY: { name: 'DAY', description: 'День месяца', syntax: '=DAY(A1)' },
  MONTH: { name: 'MONTH', description: 'Месяц', syntax: '=MONTH(A1)' },
  YEAR: { name: 'YEAR', description: 'Год', syntax: '=YEAR(A1)' },
  HOUR: { name: 'HOUR', description: 'Часы', syntax: '=HOUR(A1)' },
  MINUTE: { name: 'MINUTE', description: 'Минуты', syntax: '=MINUTE(A1)' },
  SECOND: { name: 'SECOND', description: 'Секунды', syntax: '=SECOND(A1)' },
  AI: { name: 'AI', description: 'ИИ запрос', syntax: '=AI("Сумма столбцов A и B")' },
};

const FORMULA_LIST_LOCAL = Object.keys(FORMULAS_LOCAL).sort();

// Простая функция evaluateFormula локально
function evaluateFormulaLocal(formula: string, getData: (cell: string) => string): { value: any; error?: string } {
  try {
    if (!formula.startsWith('=')) {
      return { value: formula };
    }

    const expression = formula.substring(1).toUpperCase();
    
    // 1. Простая ссылка на ячейку (=A1, =B2)
    const cellRefMatch = expression.match(/^([A-Z]+)(\d+)$/);
    if (cellRefMatch) {
      const value = getData(expression);
      return { value: value || 0 };
    }
    
    // 2. Формула с функцией (=SUM(A1:A10))
    const funcMatch = expression.match(/^([A-Z]+)\((.*)\)$/);
    if (funcMatch) {
      const [, funcName, argsStr] = funcMatch;
      
      // Парсим аргументы
      const args: any[] = [];
      const parts = argsStr.split(',');
      for (const part of parts) {
        const trimmed = part.trim();
        
        // Диапазон ячеек (A1:A10)
        const rangeMatch = trimmed.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
        if (rangeMatch) {
          const [, startCol, startRow, endCol, endRow] = rangeMatch;
          const startColCode = startCol.charCodeAt(0);
          const endColCode = endCol.charCodeAt(0);
          for (let col = startColCode; col <= endColCode; col++) {
            for (let row = parseInt(startRow); row <= parseInt(endRow); row++) {
              const cellRef = String.fromCharCode(col) + row;
              const value = getData(cellRef);
              if (value !== '' && !isNaN(parseFloat(value))) {
                args.push(parseFloat(value));
              }
            }
          }
          continue;
        }
        
        // Одиночная ячейка (A1)
        const cellMatch = trimmed.match(/^([A-Z]+)(\d+)$/);
        if (cellMatch) {
          const value = getData(trimmed);
          if (value !== '' && !isNaN(parseFloat(value))) {
            args.push(parseFloat(value));
          } else if (value !== '') {
            args.push(value);
          }
          continue;
        }
        
        // Число
        if (!isNaN(parseFloat(trimmed))) {
          args.push(parseFloat(trimmed));
        }
        
        // Текст в кавычках
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
          args.push(trimmed.slice(1, -1));
        }
      }

      switch (funcName) {
        case 'SUM': return { value: args.reduce((a, b) => a + b, 0) };
        case 'AVERAGE': return { value: args.length > 0 ? args.reduce((a, b) => a + b, 0) / args.length : 0 };
        case 'MIN': return { value: args.length > 0 ? Math.min(...args) : 0 };
        case 'MAX': return { value: args.length > 0 ? Math.max(...args) : 0 };
        case 'COUNT': return { value: args.filter(a => typeof a === 'number').length };
        case 'PRODUCT': return { value: args.reduce((a, b) => a * b, 1) };
        case 'ROUND': return { value: Math.round(args[0] * Math.pow(10, args[1])) / Math.pow(10, args[1]) };
        case 'ABS': return { value: Math.abs(args[0]) };
        case 'POWER': return { value: Math.pow(args[0], args[1]) };
        case 'SQRT': return { value: Math.sqrt(args[0]) };
        case 'IF': return { value: args[0] ? args[1] : args[2] };
        case 'AND': return { value: args.every(a => a) };
        case 'OR': return { value: args.some(a => a) };
        case 'CONCAT':
        case 'CONCATENATE': return { value: args.join('') };
        case 'LEN': return { value: String(args[0] || '').length };
        case 'UPPER': return { value: String(args[0] || '').toUpperCase() };
        case 'LOWER': return { value: String(args[0] || '').toLowerCase() };
        case 'TRIM': return { value: String(args[0] || '').trim() };
        case 'TODAY': return { value: new Date().toLocaleDateString('ru-RU') };
        case 'NOW': return { value: new Date().toLocaleString('ru-RU') };
        default: return { value: '#NAME?', error: `Unknown function: ${funcName}` };
      }
    }
    
    // 3. Арифметическое выражение (=A1+B2, =A1*2)
    // Заменяем ссылки на ячейки их значениями
    let calcExpression = expression;
    const cellRefs = expression.match(/([A-Z]+)(\d+)/g);
    if (cellRefs) {
      for (const ref of cellRefs) {
        const value = getData(ref);
        const numValue = parseFloat(value) || 0;
        calcExpression = calcExpression.replace(ref, numValue.toString());
      }
    }
    
    // Проверяем что выражение безопасное
    if (/^[\d+\-*/().\s]+$/.test(calcExpression)) {
      try {
        // Используем Function вместо eval для безопасности
        const result = new Function('return ' + calcExpression)();
        return { value: result };
      } catch (e) {
        return { value: '#ERROR!', error: 'Invalid expression' };
      }
    }
    
    return { value: expression };
  } catch (error: any) {
    return { value: '#ERROR!', error: error.message };
  }
}

let autocompleteVisible = false;
let selectedFormulaIndex = 0;
let formulaStartPos = 0;

function setupFormulaSupport(
  formulaInput: HTMLInputElement,
  cellGrid: HTMLElement,
  autocompleteEl: HTMLElement,
  formulaListEl: HTMLElement,
  getData: (cellRef: string) => string,
  setCurrentCellFormula: (formula: string) => void
): void {
  
  // Автокомплит при вводе =
  formulaInput.addEventListener('input', (e) => {
    const value = formulaInput.value;
    
    if (value.startsWith('=')) {
      const text = value.substring(1).toUpperCase();
      const lastPart = text.split(/[\(\),\s]/).pop() || '';
      
      if (lastPart.length > 0) {
        showAutocomplete(lastPart, formulaInput);
      } else {
        hideAutocomplete();
      }
    } else {
      hideAutocomplete();
    }
  });
  
  // Навигация по автокомплиту
  formulaInput.addEventListener('keydown', (e) => {
    if (!autocompleteVisible) return;
    
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
          const formulaName = (items[selectedFormulaIndex] as HTMLElement).dataset.formula || '';
          insertFormula(formulaName, formulaInput);
          hideAutocomplete();
        }
        break;
        
      case 'Escape':
        hideAutocomplete();
        break;
    }
  });
  
  // Клик по формуле
  formulaListEl.addEventListener('click', (e) => {
    const item = (e.target as HTMLElement).closest('.formula-item') as HTMLElement;
    if (!item) return;
    
    const formulaName = item.dataset.formula || '';
    insertFormula(formulaName, formulaInput);
    hideAutocomplete();
  });
  
  // Скрыть при клике вне
  document.addEventListener('click', (e) => {
    if (!autocompleteEl.contains(e.target as Node) && e.target !== formulaInput) {
      hideAutocomplete();
    }
  });
}

function showAutocomplete(filter: string, formulaInput: HTMLInputElement): void {
  const autocompleteEl = document.getElementById('formulaAutocomplete')!;
  const formulaListEl = document.getElementById('formulaList')!;
  
  formulaListEl.innerHTML = '';
  selectedFormulaIndex = 0;
  
  const filtered = FORMULA_LIST_LOCAL.filter(name => 
    name.startsWith(filter)
  ).slice(0, 10);

  if (filtered.length === 0) {
    hideAutocomplete();
    return;
  }

  filtered.forEach((name, index) => {
    const formula = FORMULAS_LOCAL[name as keyof typeof FORMULAS_LOCAL];
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

function hideAutocomplete(): void {
  const autocompleteEl = document.getElementById('formulaAutocomplete')!;
  autocompleteEl.classList.remove('visible');
  autocompleteVisible = false;
}

function updateSelectedFormula(items: NodeListOf<Element>): void {
  items.forEach((item, index) => {
    if (index === selectedFormulaIndex) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
}

function insertFormula(formulaName: string, formulaInput: HTMLInputElement): void {
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
 * Вычислить формулу для ячейки
 */
function calculateCellFormula(
  formula: string,
  currentRow: number,
  currentCol: number,
  getData: (row: number, col: number) => string
): string {
  if (!formula.startsWith('=')) {
    return formula;
  }
  
  // Функция для получения данных из ячейки
  const getCellValue = (cellRef: string): string => {
    const match = cellRef.match(/^([A-Z]+)(\d+)$/i);
    if (!match) return '';
    
    const col = match[1].toUpperCase().charCodeAt(0) - 65;
    const row = parseInt(match[2]) - 1;
    return getData(row, col);
  };
  
  const result = evaluateFormulaLocal(formula, getCellValue);
  
  if (result.error && result.value === '#AI_PROCESSING...') {
    // ИИ формула - нужно отправить запрос
    return handleAIFormula(formula, currentRow, currentCol);
  }
  
  return String(result.value);
}

/**
 * Обработка ИИ формулы
 */
function handleAIFormula(formula: string, row: number, col: number): string {
  // Извлечь запрос из формулы
  const match = formula.match(/=AI\(["'](.+)["']\)/i);
  if (!match) {
    return '#ERROR!';
  }
  
  const request = match[1];
  
  // Отправить запрос к ИИ через IPC
  const { ipcRenderer } = require('electron');

  return new Promise((resolve) => {
    ipcRenderer.invoke('ai-formula', { request, row, col })
      .then((result: any) => {
        resolve(result.value || '#ERROR!');
      })
      .catch(() => {
        resolve('#ERROR!');
      });
  }) as any;
}

// Делаем функции доступными глобально для renderer.ts
(window as any).calculateCellFormula = calculateCellFormula;
(window as any).setupFormulaSupport = setupFormulaSupport;
