/**
 * SmartTable AutoComplete Module
 * Легковесная система автозаполнения ячеек и подсказок формул
 * Работает полностью локально, без внешних зависимостей и API
 * 
 * Особенности:
 * - Rule-based система для формул (SUM, AVG, IF, VLOOKUP и др.)
 * - Статистический анализ для числовых последовательностей
 * - Pattern matching для текстовых данных
 * - Placeholder-style подсказки (серый текст)
 * - Принятие по Tab/Enter
 * - Интеграция с Focus Manager
 */

// ==================== КОНФИГУРАЦИЯ ====================

const AUTOCOMPLETE_CONFIG = {
  // Задержка перед показом подсказки (мс)
  suggestionDelay: 150,
  
  // Минимальное количество символов для показа подсказки
  minCharsForSuggestion: 1,
  
  // Цвет серого текста подсказки
  placeholderColor: '#a0a0a0',
  
  // Максимальное количество подсказок
  maxSuggestions: 5,
  
  // Порог уверенности для автодополнения (0-1)
  confidenceThreshold: 0.6
};

// ==================== ФОРМУЛЫ И ПАТТЕРНЫ ====================

/**
 * Словарь формул с паттернами для автодополнения
 */
const FORMULA_PATTERNS = {
  // Математические
  'SUM': {
    pattern: /^=S/i,
    completion: '=SUM()',
    cursorOffset: -1, // Позиция курсора внутри скобок
    description: 'Сумма значений',
    example: '=SUM(A1:A10)'
  },
  'AVERAGE': {
    pattern: /^=A/i,
    completion: '=AVERAGE()',
    cursorOffset: -1,
    description: 'Среднее значение',
    example: '=AVERAGE(A1:A10)'
  },
  'MIN': {
    pattern: /^=MI/i,
    completion: '=MIN()',
    cursorOffset: -1,
    description: 'Минимальное значение',
    example: '=MIN(A1:A10)'
  },
  'MAX': {
    pattern: /^=MA/i,
    completion: '=MAX()',
    cursorOffset: -1,
    description: 'Максимальное значение',
    example: '=MAX(A1:A10)'
  },
  'COUNT': {
    pattern: /^=CO/i,
    completion: '=COUNT()',
    cursorOffset: -1,
    description: 'Количество чисел',
    example: '=COUNT(A1:A10)'
  },
  
  // Логические
  'IF': {
    pattern: /^=I/i,
    completion: '=IF(, , )',
    cursorOffset: -3,
    description: 'Условие',
    example: '=IF(A1>10, "Да", "Нет")'
  },
  'IFS': {
    pattern: /^=IFS/i,
    completion: '=IFS(, , , , TRUE, )',
    cursorOffset: -3,
    description: 'Несколько условий',
    example: '=IFS(A1>90, "A", A1>70, "B", TRUE, "C")'
  },
  'AND': {
    pattern: /^=AN/i,
    completion: '=AND()',
    cursorOffset: -1,
    description: 'И',
    example: '=AND(A1>0, A1<10)'
  },
  'OR': {
    pattern: /^=O/i,
    completion: '=OR()',
    cursorOffset: -1,
    description: 'ИЛИ',
    example: '=OR(A1>0, A1<10)'
  },
  
  // Текстовые
  'CONCATENATE': {
    pattern: /^=CON/i,
    completion: '=CONCATENATE()',
    cursorOffset: -1,
    description: 'Сцепить текст',
    example: '=CONCATENATE(A1, " ", B1)'
  },
  'LEN': {
    pattern: /^=LE/i,
    completion: '=LEN()',
    cursorOffset: -1,
    description: 'Длина текста',
    example: '=LEN(A1)'
  },
  'UPPER': {
    pattern: /^=UP/i,
    completion: '=UPPER()',
    cursorOffset: -1,
    description: 'В верхний регистр',
    example: '=UPPER(A1)'
  },
  'LOWER': {
    pattern: /^=LO/i,
    completion: '=LOWER()',
    cursorOffset: -1,
    description: 'В нижний регистр',
    example: '=LOWER(A1)'
  },
  
  // Поиск
  'VLOOKUP': {
    pattern: /^=V/i,
    completion: '=VLOOKUP(, , , FALSE)',
    cursorOffset: -7,
    description: 'Вертикальный поиск',
    example: '=VLOOKUP(A1, B1:C10, 2, FALSE)'
  },
  'HLOOKUP': {
    pattern: /^=H/i,
    completion: '=HLOOKUP(, , , FALSE)',
    cursorOffset: -7,
    description: 'Горизонтальный поиск',
    example: '=HLOOKUP(A1, B1:C10, 2, FALSE)'
  },
  'INDEX': {
    pattern: /^=IN/i,
    completion: '=INDEX(, , )',
    cursorOffset: -3,
    description: 'Значение по индексу',
    example: '=INDEX(A1:C10, 2, 3)'
  },
  'MATCH': {
    pattern: /^=MAT/i,
    completion: '=MATCH(, , 0)',
    cursorOffset: -3,
    description: 'Позиция значения',
    example: '=MATCH(A1, B1:B10, 0)'
  }
};

// ==================== СОСТОЯНИЕ ====================

let currentActiveCell = null;        // Текущая активная ячейка
let currentInput = '';               // Текущий ввод пользователя
let suggestionElement = null;        // DOM элемент подсказки
let debounceTimer = null;            // Таймер для задержки
let cellValueCache = new Map();      // Кэш значений ячеек для анализа

// ==================== HELPER ФУНКЦИИ ====================

/**
 * Получить элемент подсказки (создать если нет)
 */
function getSuggestionElement() {
  if (!suggestionElement) {
    suggestionElement = document.createElement('div');
    suggestionElement.id = 'autocomplete-suggestion';
    suggestionElement.style.cssText = `
      position: absolute;
      pointer-events: none;
      font-family: inherit;
      font-size: inherit;
      color: ${AUTOCOMPLETE_CONFIG.placeholderColor};
      white-space: pre;
      overflow: hidden;
      text-overflow: ellipsis;
      z-index: 1000;
      padding: 4px 8px;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;
    document.body.appendChild(suggestionElement);
  }
  return suggestionElement;
}

/**
 * Скрыть подсказку
 */
function hideSuggestion() {
  if (suggestionElement) {
    suggestionElement.style.display = 'none';
    suggestionElement.textContent = '';
  }
}

/**
 * Показать подсказку рядом с ячейкой
 */
function showSuggestion(cell, suggestion, userInput) {
  if (!suggestion || !userInput) {
    hideSuggestion();
    return;
  }
  
  const el = getSuggestionElement();
  const rect = cell.getBoundingClientRect();
  
  // Полный текст подсказки
  const fullText = suggestion.completion || suggestion;
  
  // Часть после ввода пользователя
  const suggestionPart = fullText.substring(userInput.length);
  
  el.textContent = userInput + suggestionPart;
  el.style.display = 'block';
  el.style.left = `${rect.left}px`;
  el.style.top = `${rect.top}px`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
  
  // Выделяем подсказку цветом
  const userPart = userInput;
  el.innerHTML = `<span style="color: inherit;">${userPart}</span><span style="color: ${AUTOCOMPLETE_CONFIG.placeholderColor};">${suggestionPart}</span>`;
}

/**
 * Принять подсказку
 */
function acceptSuggestion(suggestion, cell) {
  if (!suggestion || !cell) return;
  
  const fullText = suggestion.completion || suggestion;
  cell.textContent = fullText;
  cell.classList.add('has-content');
  
  // Сохраняем в кэш
  const key = `${cell.dataset.row}-${cell.dataset.col}`;
  cellValueCache.set(key, fullText);
  
  // Скрываем подсказку
  hideSuggestion();
  
  // Восстанавливаем фокус
  cell.focus();
  
  // Вызываем Focus Manager если доступен
  if (typeof window.restoreFocus === 'function') {
    window.restoreFocus();
  }
  
  // Триггерим событие изменения
  cell.dispatchEvent(new Event('input', { bubbles: true }));
}

// ==================== АНАЛИЗ ПАТТЕРНОВ ====================

/**
 * Анализ числовых последовательностей для предсказания следующего значения
 */
function analyzeNumericPattern(values) {
  if (values.length < 2) return null;
  
  const nums = values.map(v => parseFloat(v)).filter(n => !isNaN(n));
  if (nums.length < 2) return null;
  
  // Проверяем арифметическую прогрессию
  const diff = nums[1] - nums[0];
  let isArithmetic = true;
  for (let i = 1; i < nums.length; i++) {
    if (Math.abs(nums[i] - nums[i-1] - diff) > 0.0001) {
      isArithmetic = false;
      break;
    }
  }
  
  if (isArithmetic) {
    const next = nums[nums.length - 1] + diff;
    return {
      type: 'arithmetic',
      prediction: String(next),
      confidence: 0.9
    };
  }
  
  // Проверяем геометрическую прогрессию
  if (nums[0] !== 0) {
    const ratio = nums[1] / nums[0];
    let isGeometric = true;
    for (let i = 1; i < nums.length; i++) {
      if (Math.abs(nums[i] / nums[i-1] - ratio) > 0.0001) {
        isGeometric = false;
        break;
      }
    }
    
    if (isGeometric) {
      const next = nums[nums.length - 1] * ratio;
      return {
        type: 'geometric',
        prediction: String(next),
        confidence: 0.85
      };
    }
  }
  
  // Линейный тренд (простая регрессия)
  const n = nums.length;
  const sumX = n * (n - 1) / 2;
  const sumY = nums.reduce((a, b) => a + b, 0);
  const sumXY = nums.reduce((sum, y, i) => sum + i * y, 0);
  const sumX2 = n * (n - 1) * (2 * n - 1) / 6;
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  const next = slope * n + intercept;
  return {
    type: 'linear',
    prediction: String(Math.round(next * 100) / 100),
    confidence: 0.7
  };
}

/**
 * Анализ текстовых паттернов
 */
function analyzeTextPattern(values) {
  if (values.length < 2) return null;
  
  // Проверяем общие префиксы/суффиксы
  const texts = values.filter(v => typeof v === 'string' && v.length > 0);
  if (texts.length < 2) return null;
  
  // Ищем числовые суффиксы (Item 1, Item 2, Item 3...)
  const numSuffixPattern = /^(.*?)(\d+)$/;
  const matches = texts.map(t => t.match(numSuffixPattern)).filter(m => m);
  
  if (matches.length >= 2) {
    const prefixes = matches.map(m => m[1]);
    const numbers = matches.map(m => parseInt(m[2]));
    
    // Все префиксы одинаковые?
    const allSamePrefix = prefixes.every(p => p === prefixes[0]);
    if (allSamePrefix) {
      // Проверяем последовательность чисел
      const diff = numbers[1] - numbers[0];
      let isSequential = true;
      for (let i = 1; i < numbers.length; i++) {
        if (numbers[i] - numbers[i-1] !== diff) {
          isSequential = false;
          break;
        }
      }
      
      if (isSequential) {
        const nextNum = numbers[numbers.length - 1] + diff;
        return {
          type: 'text-number-sequence',
          prediction: prefixes[0] + nextNum,
          confidence: 0.85
        };
      }
    }
  }
  
  return null;
}

// ==================== ГЕНЕРАЦИЯ ПОДСКАЗОК ====================

/**
 * Получить подсказку для текущего ввода
 */
function getSuggestion(input, cell) {
  if (!input || input.length < AUTOCOMPLETE_CONFIG.minCharsForSuggestion) {
    return null;
  }
  
  const trimmedInput = input.trim();
  
  // 1. Формулы (начинается с =)
  if (trimmedInput.startsWith('=')) {
    return getFormulaSuggestion(trimmedInput);
  }
  
  // 2. Числовые паттерны
  const columnValues = getColumnValues(cell.dataset.col);
  const numericPrediction = analyzeNumericPattern(columnValues);
  if (numericPrediction && numericPrediction.confidence >= AUTOCOMPLETE_CONFIG.confidenceThreshold) {
    return {
      type: 'numeric',
      completion: numericPrediction.prediction,
      confidence: numericPrediction.confidence,
      description: `Продолжение последовательности (${numericPrediction.type})`
    };
  }
  
  // 3. Текстовые паттерны
  const textPrediction = analyzeTextPattern(columnValues);
  if (textPrediction && textPrediction.confidence >= AUTOCOMPLETE_CONFIG.confidenceThreshold) {
    return {
      type: 'text',
      completion: textPrediction.prediction,
      confidence: textPrediction.confidence,
      description: `Продолжение паттерна (${textPrediction.type})`
    };
  }
  
  return null;
}

/**
 * Получить подсказку формулы
 */
function getFormulaSuggestion(input) {
  // Ищем совпадение по паттернам
  for (const [name, formula] of Object.entries(FORMULA_PATTERNS)) {
    if (formula.pattern.test(input)) {
      return {
        type: 'formula',
        completion: formula.completion,
        confidence: 0.95,
        description: formula.description,
        example: formula.example
      };
    }
  }
  
  return null;
}

/**
 * Получить значения колонки для анализа
 */
function getColumnValues(colIndex) {
  const values = [];
  const rows = 100; // Максимум строк
  
  for (let row = 0; row < rows; row++) {
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${colIndex}"]`);
    if (cell && cell.textContent) {
      values.push(cell.textContent);
    }
  }
  
  return values;
}

// ==================== ОБРАБОТКА ВВОДА ====================

/**
 * Обработчик ввода в ячейку
 */
function handleCellInput(e) {
  const cell = e.target;
  if (!cell || !cell.classList.contains('cell')) return;
  
  currentActiveCell = cell;
  currentInput = cell.textContent || '';
  
  // Сохраняем в кэш
  const key = `${cell.dataset.row}-${cell.dataset.col}`;
  cellValueCache.set(key, currentInput);
  
  // Очищаем предыдущий таймер
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  // Показываем подсказку с задержкой
  debounceTimer = setTimeout(() => {
    const suggestion = getSuggestion(currentInput, cell);
    if (suggestion) {
      showSuggestion(cell, suggestion, currentInput);
    } else {
      hideSuggestion();
    }
  }, AUTOCOMPLETE_CONFIG.suggestionDelay);
}

/**
 * Обработчик клавиш для принятия подсказки
 */
function handleCellKeydown(e) {
  const cell = e.target;
  if (!cell || !cell.classList.contains('cell')) return;
  
  // Tab или Enter для принятия подсказки
  if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
    const suggestion = getSuggestion(cell.textContent || '', cell);
    if (suggestion) {
      e.preventDefault();
      acceptSuggestion(suggestion, cell);
      return;
    }
  }
  
  // Escape для скрытия подсказки
  if (e.key === 'Escape') {
    hideSuggestion();
  }
}

/**
 * Обработчик фокуса на ячейке
 */
function handleCellFocus(e) {
  const cell = e.target;
  if (!cell || !cell.classList.contains('cell')) return;
  
  currentActiveCell = cell;
  
  // Сохраняем для Focus Manager
  if (typeof window.saveActiveCell === 'function') {
    window.saveActiveCell(parseInt(cell.dataset.row), parseInt(cell.dataset.col));
  }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

/**
 * Инициализация автозаполнения
 * Подключается к существующим обработчикам renderer
 */
export function initAutoComplete() {
  console.log('[AutoComplete] Initializing...');
  
  // Находим cellGrid
  const cellGrid = document.getElementById('cellGrid');
  if (!cellGrid) {
    console.warn('[AutoComplete] cellGrid not found');
    return;
  }
  
  // Делегирование событий для ячеек
  cellGrid.addEventListener('input', handleCellInput, true);
  cellGrid.addEventListener('keydown', handleCellKeydown, true);
  cellGrid.addEventListener('focus', handleCellFocus, true);
  
  // Глобальный обработчик для восстановления фокуса
  document.addEventListener('keydown', (e) => {
    // Если нажаты навигационные клавиши и есть активная ячейка
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      if (currentActiveCell) {
        // Обновляем кэш перед навигацией
        const key = `${currentActiveCell.dataset.row}-${currentActiveCell.dataset.col}`;
        cellValueCache.set(key, currentActiveCell.textContent || '');
      }
    }
  });
  
  // Скрывать подсказку при скролле
  const gridWrapper = document.getElementById('cellGridWrapper');
  if (gridWrapper) {
    gridWrapper.addEventListener('scroll', hideSuggestion);
  }
  
  console.log('[AutoComplete] Initialized successfully');
}

/**
 * Получить предсказание для ячейки (публичный API)
 */
export function getPredictionForCell(row, col) {
  const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
  if (!cell) return null;
  
  const input = cell.textContent || '';
  return getSuggestion(input, cell);
}

/**
 * Принять текущую подсказку (публичный API)
 */
export function acceptCurrentSuggestion() {
  if (!currentActiveCell) return;
  
  const input = currentActiveCell.textContent || '';
  const suggestion = getSuggestion(input, currentActiveCell);
  if (suggestion) {
    acceptSuggestion(suggestion, currentActiveCell);
  }
}

/**
 * Очистить кэш
 */
export function clearCache() {
  cellValueCache.clear();
}

/**
 * Экспорт для глобального доступа
 */
window.autoComplete = {
  init: initAutoComplete,
  getPrediction: getPredictionForCell,
  accept: acceptCurrentSuggestion,
  clearCache: clearCache,
  config: AUTOCOMPLETE_CONFIG,
  FORMULA_PATTERNS
};

// Авто-инициализация при загрузке DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAutoComplete);
} else {
  initAutoComplete();
}
