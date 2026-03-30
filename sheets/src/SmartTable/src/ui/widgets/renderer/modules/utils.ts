/**
 * Utils Module - Утилитарные функции
 */

/**
 * Преобразовать номер колонки в букву (0 → A, 1 → B, 26 → AA)
 */
export function colToLetter(col: number): string {
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
 * Преобразовать букву в номер колонки (A → 0, B → 1, AA → 26)
 */
export function letterToCol(letter: string): number {
  let col = 0;
  const upper = letter.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    col = col * 26 + (upper.charCodeAt(i) - 64);
  }
  return col - 1; // Excel использует 1-индексацию, мы используем 0
}

/**
 * Получить ID ячейки (A1, B2, и т.д.)
 */
export function getCellId(row: number, col: number): string {
  return `${colToLetter(col)}${row + 1}`;
}

/**
 * Получить ключ ячейки для хранения в Map (row-col)
 */
export function getCellKey(row: number, col: number): string {
  return `${row}-${col}`;
}

/**
 * Разобрать ключ ячейки обратно в row и col
 */
export function parseCellKey(key: string): { row: number; col: number } {
  const [row, col] = key.split('-').map(Number);
  return { row, col };
}

/**
 * Проверить является ли значение формулой
 */
export function isFormula(value: string): boolean {
  return value.startsWith('=');
}

/**
 * Вычислить хэш стиля для кэширования
 */
export function hashStyle(style: any): string {
  if (!style) return '';
  return JSON.stringify(style).split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0).toString(36);
}
