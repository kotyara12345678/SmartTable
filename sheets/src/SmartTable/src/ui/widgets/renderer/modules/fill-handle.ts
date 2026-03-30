/**
 * Fill Handle Module
 * Handles cell fill/drag functionality for pattern detection and filling
 */

import { getCellKey } from './utils';
import { getCurrentData, updateAIDataCache } from './state';
import { pushUndo } from './undo-redo';
import { autoSave } from './autosave';
import { animateCellChange } from './ai';

export function setupFillHandle(
  elements: any,
  state: any,
  CONFIG: any
): void {
  const fillHandle = document.getElementById('fillHandle');
  if (!fillHandle) return;

  let isDragging = false;
  let startCell: { row: number; col: number } | null = null;
  let endCell: { row: number; col: number } | null = null;
  let fillDirection: 'vertical' | 'horizontal' | null = null;

  fillHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!state.selectedCell) return;
    
    isDragging = true;
    startCell = { ...state.selectedCell };
    endCell = null;
    fillDirection = null;
    
    document.body.style.cursor = 'crosshair';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging || !startCell) return;
    
    const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest('.cell') as HTMLElement;
    if (!cell) return;
    
    const row = parseInt(cell.dataset.row || '0');
    const col = parseInt(cell.dataset.col || '0');
    
    endCell = { row, col };
    
    // Determine fill direction
    const rowDiff = Math.abs(row - startCell.row);
    const colDiff = Math.abs(col - startCell.col);
    
    if (rowDiff > colDiff) {
      fillDirection = 'vertical';
    } else if (colDiff > rowDiff) {
      fillDirection = 'horizontal';
    }
    
    // Highlight cells in fill range
    highlightFillRange(startCell, endCell, fillDirection, elements, CONFIG);
  });

  document.addEventListener('mouseup', (e) => {
    if (!isDragging || !startCell || !endCell) {
      isDragging = false;
      startCell = null;
      endCell = null;
      fillDirection = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      return;
    }
    
    // Perform fill operation
    performFill(startCell, endCell, fillDirection, elements, state, CONFIG);
    
    // Reset state
    isDragging = false;
    startCell = null;
    endCell = null;
    fillDirection = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    // Clear highlights
    clearFillHighlights(elements);
  });
}

function highlightFillRange(
  start: { row: number; col: number },
  end: { row: number; col: number },
  direction: 'vertical' | 'horizontal' | null,
  elements: any,
  CONFIG: any
): void {
  // Clear previous highlights
  clearFillHighlights(elements);
  
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);
  
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const cellKey = getCellKey(row, col);
      const cell = elements.cellGrid.querySelector(`[data-key="${cellKey}"]`);
      if (cell) {
        cell.classList.add('fill-highlight');
      }
    }
  }
}

function clearFillHighlights(elements: any): void {
  const highlighted = elements.cellGrid.querySelectorAll('.fill-highlight');
  highlighted.forEach((cell: HTMLElement) => {
    cell.classList.remove('fill-highlight');
  });
}

function performFill(
  start: { row: number; col: number },
  end: { row: number; col: number },
  direction: 'vertical' | 'horizontal' | null,
  elements: any,
  state: any,
  CONFIG: any
): void {
  const data = getCurrentData(state);
  const startKey = getCellKey(start.row, start.col);
  const startData = data.get(startKey);
  
  if (!startData) return;
  
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);
  
  // Detect pattern
  const pattern = detectFillPattern(start, direction, data);
  
  // Fill cells
  let valueIndex = 0;
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const cellKey = getCellKey(row, col);
      
      // Skip the start cell
      if (row === start.row && col === start.col) continue;
      
      let value = startData.value;
      
      if (pattern) {
        value = calculatePatternValue(pattern, valueIndex);
        valueIndex++;
      }
      
      data.set(cellKey, {
        value: value,
        style: startData.style ? { ...startData.style } : undefined
      });
    }
  }
  
  // Save undo state
  pushUndo(state, startKey, startData.value, () => autoSave(state));
  
  // Update data cache
  updateAIDataCache(state);
}

export function detectFillPattern(
  start: { row: number; col: number },
  direction: 'vertical' | 'horizontal' | null,
  data: Map<string, any>
): any {
  const startKey = getCellKey(start.row, start.col);
  const startData = data.get(startKey);
  
  if (!startData) return null;
  
  const value = startData.value;
  
  // Check if it's a number
  if (!isNaN(parseFloat(value))) {
    return detectNumericPattern(start, direction, data);
  }
  
  // Check if it's a date
  if (isDatePattern(value)) {
    return detectDatePattern(start, direction, data);
  }
  
  // Check if it's a day of week
  if (isDayOfWeekPattern(value)) {
    return detectDayOfWeekPattern(start, direction, data);
  }
  
  // Check if it's a month
  if (isMonthPattern(value)) {
    return detectMonthPattern(start, direction, data);
  }
  
  return null;
}

function detectNumericPattern(
  start: { row: number; col: number },
  direction: 'vertical' | 'horizontal' | null,
  data: Map<string, any>
): any {
  const values: number[] = [];
  const steps = direction === 'vertical' 
    ? Array.from({ length: 5 }, (_, i) => start.row - i)
    : Array.from({ length: 5 }, (_, i) => start.col - i);
  
  for (const step of steps) {
    const key = direction === 'vertical'
      ? getCellKey(step, start.col)
      : getCellKey(start.row, step);
    
    const cellData = data.get(key);
    if (cellData && !isNaN(parseFloat(cellData.value))) {
      values.unshift(parseFloat(cellData.value));
    } else {
      break;
    }
  }
  
  if (values.length < 2) return null;
  
  // Check for arithmetic pattern
  const diff = values[1] - values[0];
  let isArithmetic = true;
  for (let i = 2; i < values.length; i++) {
    if (Math.abs(values[i] - values[i - 1] - diff) > 0.0001) {
      isArithmetic = false;
      break;
    }
  }
  
  if (isArithmetic) {
    return {
      type: 'arithmetic',
      startValue: values[0],
      step: diff
    };
  }
  
  // Check for geometric pattern
  if (values[0] !== 0) {
    const ratio = values[1] / values[0];
    let isGeometric = true;
    for (let i = 2; i < values.length; i++) {
      if (values[i - 1] === 0 || Math.abs(values[i] / values[i - 1] - ratio) > 0.0001) {
        isGeometric = false;
        break;
      }
    }
    
    if (isGeometric) {
      return {
        type: 'geometric',
        startValue: values[0],
        ratio: ratio
      };
    }
  }
  
  return null;
}

function detectDatePattern(
  start: { row: number; col: number },
  direction: 'vertical' | 'horizontal' | null,
  data: Map<string, any>
): any {
  const values: string[] = [];
  const steps = direction === 'vertical'
    ? Array.from({ length: 5 }, (_, i) => start.row - i)
    : Array.from({ length: 5 }, (_, i) => start.col - i);
  
  for (const step of steps) {
    const key = direction === 'vertical'
      ? getCellKey(step, start.col)
      : getCellKey(start.row, step);
    
    const cellData = data.get(key);
    if (cellData && isDatePattern(cellData.value)) {
      values.unshift(cellData.value);
    } else {
      break;
    }
  }
  
  if (values.length < 2) return null;
  
  // Parse dates and check for pattern
  const dates = values.map(v => parseDate(v));
  if (dates.some(d => d === null)) return null;
  
  const diff = dates[1]!.getTime() - dates[0]!.getTime();
  let isSequential = true;
  for (let i = 2; i < dates.length; i++) {
    if (Math.abs(dates[i]!.getTime() - dates[i - 1]!.getTime() - diff) > 1000) {
      isSequential = false;
      break;
    }
  }
  
  if (isSequential) {
    return {
      type: 'date',
      startDate: dates[0],
      step: diff
    };
  }
  
  return null;
}

function detectDayOfWeekPattern(
  start: { row: number; col: number },
  direction: 'vertical' | 'horizontal' | null,
  data: Map<string, any>
): any {
  const daysOfWeek = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
  const values: string[] = [];
  const steps = direction === 'vertical'
    ? Array.from({ length: 7 }, (_, i) => start.row - i)
    : Array.from({ length: 7 }, (_, i) => start.col - i);
  
  for (const step of steps) {
    const key = direction === 'vertical'
      ? getCellKey(step, start.col)
      : getCellKey(start.row, step);
    
    const cellData = data.get(key);
    if (cellData && isDayOfWeekPattern(cellData.value)) {
      values.unshift(cellData.value.toLowerCase());
    } else {
      break;
    }
  }
  
  if (values.length < 2) return null;
  
  const indices = values.map(v => daysOfWeek.indexOf(v));
  if (indices.some(i => i === -1)) return null;
  
  const diff = indices[1] - indices[0];
  let isSequential = true;
  for (let i = 2; i < indices.length; i++) {
    if (indices[i] - indices[i - 1] !== diff) {
      isSequential = false;
      break;
    }
  }
  
  if (isSequential) {
    return {
      type: 'dayOfWeek',
      startDay: indices[0],
      step: diff,
      daysOfWeek
    };
  }
  
  return null;
}

function detectMonthPattern(
  start: { row: number; col: number },
  direction: 'vertical' | 'horizontal' | null,
  data: Map<string, any>
): any {
  const months = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  const values: string[] = [];
  const steps = direction === 'vertical'
    ? Array.from({ length: 12 }, (_, i) => start.row - i)
    : Array.from({ length: 12 }, (_, i) => start.col - i);
  
  for (const step of steps) {
    const key = direction === 'vertical'
      ? getCellKey(step, start.col)
      : getCellKey(start.row, step);
    
    const cellData = data.get(key);
    if (cellData && isMonthPattern(cellData.value)) {
      values.unshift(cellData.value.toLowerCase());
    } else {
      break;
    }
  }
  
  if (values.length < 2) return null;
  
  const indices = values.map(v => months.indexOf(v));
  if (indices.some(i => i === -1)) return null;
  
  const diff = indices[1] - indices[0];
  let isSequential = true;
  for (let i = 2; i < indices.length; i++) {
    if (indices[i] - indices[i - 1] !== diff) {
      isSequential = false;
      break;
    }
  }
  
  if (isSequential) {
    return {
      type: 'month',
      startMonth: indices[0],
      step: diff,
      months
    };
  }
  
  return null;
}

export function calculatePatternValue(pattern: any, index: number): string {
  switch (pattern.type) {
    case 'arithmetic':
      return String(pattern.startValue + pattern.step * (index + 1));
    
    case 'geometric':
      return String(pattern.startValue * Math.pow(pattern.ratio, index + 1));
    
    case 'date':
      const newDate = new Date(pattern.startDate.getTime() + pattern.step * (index + 1));
      return formatDate(newDate);
    
    case 'dayOfWeek':
      const dayIndex = (pattern.startDay + pattern.step * (index + 1)) % 7;
      return pattern.daysOfWeek[dayIndex >= 0 ? dayIndex : dayIndex + 7];
    
    case 'month':
      const monthIndex = (pattern.startMonth + pattern.step * (index + 1)) % 12;
      return pattern.months[monthIndex >= 0 ? monthIndex : monthIndex + 12];
    
    default:
      return '';
  }
}

function isDatePattern(value: string): boolean {
  // Check for common date formats
  const datePatterns = [
    /^\d{1,2}\.\d{1,2}\.\d{4}$/,  // DD.MM.YYYY
    /^\d{4}-\d{1,2}-\d{1,2}$/,    // YYYY-MM-DD
    /^\d{1,2}\/\d{1,2}\/\d{4}$/   // MM/DD/YYYY
  ];
  
  return datePatterns.some(pattern => pattern.test(value));
}

function parseDate(value: string): Date | null {
  // Try different date formats
  const formats = [
    { regex: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, order: [3, 2, 1] },  // DD.MM.YYYY
    { regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, order: [1, 2, 3] },    // YYYY-MM-DD
    { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, order: [3, 1, 2] }   // MM/DD/YYYY
  ];
  
  for (const format of formats) {
    const match = value.match(format.regex);
    if (match) {
      const year = parseInt(match[format.order[0]]);
      const month = parseInt(match[format.order[1]]) - 1;
      const day = parseInt(match[format.order[2]]);
      return new Date(year, month, day);
    }
  }
  
  return null;
}

function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function isDayOfWeekPattern(value: string): boolean {
  const daysOfWeek = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
  return daysOfWeek.includes(value.toLowerCase());
}

function isMonthPattern(value: string): boolean {
  const months = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  return months.includes(value.toLowerCase());
}
