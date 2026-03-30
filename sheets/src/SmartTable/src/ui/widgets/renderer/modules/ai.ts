/**
 * AI Module - Функции для работы с ИИ
 */

// Экранирование XML символов
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Конвертер названий цветов в HEX
export function normalizeColor(color: string): string {
  if (!color) return '';

  // Если уже HEX формат, возвращаем как есть
  if (color.startsWith('#')) return color;

  const colorMap: Record<string, string> = {
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

// Обработка markdown для AI сообщений
export function processMarkdown(text: string): string {
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
export function highlightCode(code: string, language: string): string {
  // Сначала обрабатываем HTML сущности
  let highlighted = code
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>');
  
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
  } else if (language === 'javascript' || language === 'js') {
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
  } else {
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

// Анимация изменения ячейки
export function animateCellChange(cell: HTMLElement, newValue: string, duration: number = 80): Promise<void> {
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

// Задержка
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Применение стиля к ячейке
 */
export function applyCellStyle(
  cell: HTMLElement,
  row: number,
  col: number,
  params: any,
  data: Map<string, any>,
  getCellKey: (row: number, col: number) => string,
  updateAIDataCache: () => void
): void {
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

/**
 * Анимация изменения ячейки
 */
export function animateCellChangeValue(
  cell: HTMLElement,
  newValue: string,
  duration: number = 80
): Promise<void> {
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

/**
 * Генерация ответа ИИ
 */
export function generateAiResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('формула') || lowerMessage.includes('посчит')) {
    return 'Для суммирования диапазона ячеек используйте формулу: =SUM(A1:A10)\n\nДругие полезные функции:\n• =AVERAGE() - среднее значение\n• =MAX() / =MIN() - максимум/минимум\n• =COUNT() - количество чисел';
  }

  if (lowerMessage.includes('анализ') || lowerMessage.includes('данные')) {
    return '📊 Я могу проанализировать ваши данные:\n\n1. Найти закономерности\n2. Выявить аномалии\n3. Построить статистику\n4. Предложить визуализацию\n\nВыделите диапазон ячеек и попросите меня проанализировать их.';
  }

  if (lowerMessage.includes('очист') || lowerMessage.includes('удал')) {
    return '🧹 Для очистки данных я могу:\n\n• Удалить пустые строки\n• Убрать дубликаты\n• Исправить формат\n• Нормализовать текст\n\nЧто именно нужно очистить?';
  }

  return 'Я понял ваш запрос! Вот что я могу сделать:\n\n📝 **Создать формулу** - помогу с функциями\n📊 **Анализировать** - найду закономерности\n🧹 **Очистить данные** - уберу лишнее\n📈 **Визуализировать** - предложу графики\n\nЧто бы вы хотели сделать?';
}

/**
 * Выполнение одной AI команды
 */
export async function executeSingleCommand(
  action: string,
  params: any,
  deps: {
    normalizeColor: (color: string) => string;
    getCurrentData: () => Map<string, any>;
    getCellElement: (row: number, col: number) => HTMLElement | null;
    getCellKey: (row: number, col: number) => string;
    updateAIDataCache: () => void;
    renderCells: () => void;
    setDataValidation: (cell: string, values: string[]) => void;
    addConditionalFormat: (range: string, rule: string, style: any) => void;
    getSelectedRangeData: () => any;
    animateCellChange: (cell: HTMLElement, newValue: string, duration?: number) => Promise<void>;
    sleep: (ms: number) => Promise<void>;
    CONFIG: { ROWS: number; COLS: number };
    elements: { cellGrid: HTMLElement };
    calculateCellFormula?: (formula: string, row: number, col: number, getCellValue: (r: number, c: number) => string) => any;
  }
): Promise<void> {
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

  // Нормализуем цвета в параметрах
  if (params.bg_color) params.bg_color = deps.normalizeColor(params.bg_color);
  if (params.text_color) params.text_color = deps.normalizeColor(params.text_color);

  console.log('[DEBUG] Executing action:', action, 'params:', params);
  const data = deps.getCurrentData();

  switch (action) {
    case 'set_data_validation':
      {
        const { cell, values } = params;
        if (cell && Array.isArray(values)) {
          deps.setDataValidation(cell, values);
          deps.renderCells();
          console.log('[DEBUG] Data validation set for', cell, ':', values);
        }
      }
      break;

    case 'set_conditional_format':
      {
        const { range, rule, style } = params;
        if (range && rule) {
          deps.addConditionalFormat(range, rule, style || {});
          console.log('[DEBUG] Conditional format set for', range, ':', rule);
        }
      }
      break;

    case 'create_chart':
      {
        const chartData = deps.getSelectedRangeData();
        if (chartData.labels.length === 0) {
          const labels: string[] = [];
          const values: number[] = [];
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
        const chartType = params?.type || 'bar';
        const chartTitle = params?.title || 'Диаграмма по данным';
        const chartsWidget = (window as any).chartsWidget;
        if (chartsWidget && chartData.labels.length > 0) {
          chartsWidget.createChartFromRange(chartData, chartType, chartTitle);
          console.log('[DEBUG] Chart created:', chartType, chartTitle);
        }
      }
      break;

    case 'format_cells':
    case 'style_cells':
    case 'format_cell':
    case 'style_cell':
      {
        if (params.range) {
          const rangeParts = params.range.split(':');
          const startMatch = rangeParts[0].match(/^([A-Z])(\d+)$/);
          if (startMatch) {
            const startCol = startMatch[1].toUpperCase().charCodeAt(0) - 65;
            const startRow = parseInt(startMatch[2]) - 1;
            if (rangeParts.length === 1) {
              const cell = deps.getCellElement(startRow, startCol);
              if (cell) {
                applyCellStyle(cell, startRow, startCol, params, data, deps.getCellKey, deps.updateAIDataCache);
              }
            } else {
              const endMatch = rangeParts[1].match(/^([A-Z])(\d+)$/);
              if (endMatch) {
                const endCol = endMatch[1].toUpperCase().charCodeAt(0) - 65;
                const endRow = parseInt(endMatch[2]) - 1;
                for (let r = startRow; r <= endRow; r++) {
                  for (let c = startCol; c <= endCol; c++) {
                    const cell = deps.getCellElement(r, c);
                    if (cell) {
                      applyCellStyle(cell, r, c, params, data, deps.getCellKey, deps.updateAIDataCache);
                    }
                  }
                }
              }
            }
          }
        } else if (params.cells && Array.isArray(params.cells)) {
          for (const cellInfo of params.cells) {
            if (cellInfo.cell) {
              const cellMatch = cellInfo.cell.match(/^([A-Z])(\d+)$/);
              if (cellMatch) {
                const col = cellMatch[1].toUpperCase().charCodeAt(0) - 65;
                const row = parseInt(cellMatch[2]) - 1;
                const cell = deps.getCellElement(row, col);
                if (cell) {
                  applyCellStyle(cell, row, col, cellInfo, data, deps.getCellKey, deps.updateAIDataCache);
                }
              }
            }
          }
        }
      }
      break;

    case 'set_cell':
      {
        if (params.column === undefined || params.row === undefined) break;
        const colIndex = typeof params.column === 'string'
          ? params.column.toUpperCase().charCodeAt(0) - 65
          : params.column;
        const rowIndex = params.row - 1;
        const cell = deps.getCellElement(rowIndex, colIndex);
        if (cell) {
          if (params.bg_color || params.text_color) {
            if (params.bg_color) cell.style.backgroundColor = params.bg_color;
            if (params.text_color) cell.style.color = params.text_color;
            const key = deps.getCellKey(rowIndex, colIndex);
            const cellData = data.get(key) || { value: cell.textContent };
            data.set(key, { ...cellData, style: { ...cellData.style, backgroundColor: params.bg_color, color: params.text_color } });
            deps.updateAIDataCache();
          }
          if (params.value !== undefined) {
            await deps.animateCellChange(cell, params.value);
            const key = deps.getCellKey(rowIndex, colIndex);
            data.set(key, { value: params.value });
            deps.updateAIDataCache();
          }
        }
      }
      break;

    case 'fill_table':
      {
        const tableData = params.data as string[][];
        data.clear();
        for (let r = 0; r < tableData.length; r++) {
          for (let c = 0; c < tableData[r].length; c++) {
            const key = deps.getCellKey(r, c);
            const value = tableData[r][c];
            data.set(key, { value });
            const cell = deps.getCellElement(r, c);
            if (cell && value) {
              await deps.animateCellChange(cell, value, 50);
            }
          }
        }
        deps.updateAIDataCache();
        deps.renderCells();
      }
      break;

    case 'clear_cell':
      {
        if (params.column === undefined || params.row === undefined) break;
        const colIndex = typeof params.column === 'string'
          ? params.column.toUpperCase().charCodeAt(0) - 65
          : params.column;
        const rowIndex = params.row - 1;
        const cell = deps.getCellElement(rowIndex, colIndex);
        if (cell) {
          await deps.animateCellChange(cell, '', 200);
          const key = deps.getCellKey(rowIndex, colIndex);
          data.delete(key);
          deps.updateAIDataCache();
        }
      }
      break;

    case 'clear_all':
      {
        const cells = deps.elements.cellGrid.querySelectorAll('.cell');
        cells.forEach((cell, index) => {
          setTimeout(() => {
            (cell as HTMLElement).style.backgroundColor = '#ffcccc';
            setTimeout(() => {
              (cell as HTMLElement).style.backgroundColor = '';
              (cell as HTMLElement).textContent = '';
            }, 100);
          }, index * 5);
        });
        data.clear();
        deps.updateAIDataCache();
        await deps.sleep(500);
      }
      break;

    case 'set_cell_color':
      {
        if (params.column === undefined || params.row === undefined) break;
        const colIndex = typeof params.column === 'string'
          ? params.column.toUpperCase().charCodeAt(0) - 65
          : params.column;
        const rowIndex = params.row - 1;
        const cell = deps.getCellElement(rowIndex, colIndex);
        if (cell) {
          if (params.bg_color) cell.style.backgroundColor = params.bg_color;
          if (params.text_color) cell.style.color = params.text_color;
          const key = deps.getCellKey(rowIndex, colIndex);
          const cellData = data.get(key) || { value: cell.textContent };
          data.set(key, { ...cellData, style: { ...cellData.style, backgroundColor: params.bg_color, color: params.text_color } });
          deps.updateAIDataCache();
        }
      }
      break;

    case 'color_column':
      {
        if (params.column === undefined) break;
        const colIndex = typeof params.column === 'string'
          ? params.column.toUpperCase().charCodeAt(0) - 65
          : params.column;
        const bgColor = params.bg_color || params.color;
        for (let r = 0; r < deps.CONFIG.ROWS; r++) {
          const cell = deps.getCellElement(r, colIndex);
          if (cell) {
            if (bgColor) cell.style.backgroundColor = bgColor;
            if (params.text_color) cell.style.color = params.text_color;
            const key = deps.getCellKey(r, colIndex);
            const cellData = data.get(key) || { value: cell.textContent };
            data.set(key, { ...cellData, style: { ...cellData.style, backgroundColor: bgColor, color: params.text_color } });
          }
        }
        deps.updateAIDataCache();
      }
      break;

    case 'color_row':
      {
        if (params.row === undefined) break;
        const rowIndex = typeof params.row === 'string' ? parseInt(params.row) - 1 : params.row - 1;
        for (let c = 0; c < deps.CONFIG.COLS; c++) {
          const cell = deps.getCellElement(rowIndex, c);
          if (cell) {
            if (params.bg_color) cell.style.backgroundColor = params.bg_color;
            if (params.text_color) cell.style.color = params.text_color;
            const key = deps.getCellKey(rowIndex, c);
            const cellData = data.get(key) || { value: cell.textContent };
            data.set(key, { ...cellData, style: { ...cellData.style, backgroundColor: params.bg_color, color: params.text_color } });
          }
        }
        deps.updateAIDataCache();
      }
      break;

    case 'set_formula':
      {
        if (params.column === undefined || params.row === undefined) break;
        const colIndex = typeof params.column === 'string'
          ? params.column.toUpperCase().charCodeAt(0) - 65
          : params.column;
        const rowIndex = params.row - 1;
        const cell = deps.getCellElement(rowIndex, colIndex);
        if (cell) {
          const formula = params.formula || params.value;
          if (formula && formula.startsWith('=')) {
            const key = deps.getCellKey(rowIndex, colIndex);
            data.set(key, { value: formula });
            deps.updateAIDataCache();
            if (deps.calculateCellFormula) {
              const result = deps.calculateCellFormula(formula, rowIndex, colIndex, (r: number, c: number) => {
                const cellKey = deps.getCellKey(r, c);
                const cellData = data.get(cellKey);
                return cellData?.value || '';
              });
              cell.textContent = String(result);
            }
          } else {
            await deps.animateCellChange(cell, formula);
            const key = deps.getCellKey(rowIndex, colIndex);
            data.set(key, { value: formula });
            deps.updateAIDataCache();
          }
        }
      }
      break;

    default:
      console.warn('[DEBUG] Unknown action:', action, params);
  }
}
