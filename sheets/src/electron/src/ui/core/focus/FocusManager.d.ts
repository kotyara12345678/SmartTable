/**
 * FocusManager - Универсальный менеджер фокуса для SmartTable
 */

interface FocusManagerOptions {
  getCellByCoords?: (row: number, col: number) => HTMLElement | null;
  containerSelector?: string;
}

interface ActiveCell {
  row: number;
  col: number;
  element: HTMLElement | null;
}

interface FocusManagerStats {
  initialized: boolean;
  hasActiveCell: boolean;
  activeCellCoords: { row: number; col: number } | null;
  restoreAttempts: number;
  isRestoring: boolean;
}

declare const FocusManager: {
  /**
   * Инициализация менеджера фокуса
   */
  init(options: FocusManagerOptions): void;

  /**
   * Установить активную ячейку
   */
  setActiveCell(cellElement: HTMLElement, coords?: { row: number; col: number } | null): void;

  /**
   * Восстановить фокус на активной ячейке
   */
  restoreFocus(force?: boolean): void;

  /**
   * Получить текущую активную ячейку
   */
  getActiveCell(): ActiveCell | null;

  /**
   * Получить координаты активной ячейки
   */
  getActiveCellCoords(): { row: number; col: number } | null;

  /**
   * Очистить активную ячейку
   */
  clearActiveCell(): void;

  /**
   * Сброс состояния (для тестов)
   */
  reset(): void;

  /**
   * Получить статистику
   */
  getStats(): FocusManagerStats;

  /**
   * Очистка ресурсов
   */
  cleanup(): void;

  /**
   * Установить режим отладки
   */
  setDebug(value: boolean): void;

  /**
   * Установить задержку восстановления
   */
  setRestoreDelay(ms: number): void;
};

export default FocusManager;
