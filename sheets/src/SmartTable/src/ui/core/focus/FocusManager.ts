/**
 * ==========================================
 * FocusManager - Полнофункциональный менеджер фокуса для SmartTable
 * ==========================================
 * 
 * Возможности:
 * - Сохранение фокуса при очистке кэша, создании/удалении шаблонов
 * - Автоматическое восстановление фокуса после DOM re-render
 * - Поддержка быстрых кликов и ввода с клавиатуры
 * - Debounce для двойных/быстрых кликов
 * - Оптимизирована для большых таблиц (100x100+)
 * - Режим отладки и настраиваемые задержки
 * - Полная поддержка TypeScript
 */

// ==========================================
// === ТИПЫ И ИНТЕРФЕЙСЫ ===
// ==========================================

interface FocusManagerOptions {
  getCellByCoords?: (row: number, col: number) => HTMLElement | null;
  containerSelector?: string;
  debug?: boolean;
  restoreDelay?: number;
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

interface FocusManagerInternal {
  // Последняя активная ячейка
  activeCell: { row: number; col: number } | null;
  activeCellElement: HTMLElement | null;
  
  // Синхронизация состояния
  isRestoring: boolean;
  restoreAttempts: number;
  restoringDelay: number;
  
  // Обработчики
  getCellByCoords: ((row: number, col: number) => HTMLElement | null) | null;
  containerSelector: string;
  
  // Таймеры и наблюдатели
  checkIntervalId: number | null;
  mutationObserver: MutationObserver | null;
  
  // Отладка
  isDebug: boolean;
  initialized: boolean;
  
  // Защита от быстрых кликов
  lastClickTime: number;
  clickDebounceTime: number;
}

// ==========================================
// === РЕАЛИЗАЦИЯ ===
// ==========================================

class FocusManagerImpl {
  private state: FocusManagerInternal;

  constructor() {
    this.state = {
      activeCell: null,
      activeCellElement: null,
      isRestoring: false,
      restoreAttempts: 0,
      restoringDelay: 50,
      getCellByCoords: null,
      containerSelector: 'body',
      checkIntervalId: null,
      mutationObserver: null,
      isDebug: false,
      initialized: false,
      lastClickTime: 0,
      clickDebounceTime: 100
    };
  }

  // ==========================================
  // === ЛОГИРОВАНИЕ ===
  // ==========================================

  /**
   * Логировать сообщение (только в режиме отладки)
   */
  private log(...args: any[]): void {
    if (this.state.isDebug) {
      console.log('[FocusManager]', ...args);
    }
  }

  /**
   * Логировать предупреждение
   */
  private warn(...args: any[]): void {
    if (this.state.isDebug) {
      console.warn('[FocusManager]', ...args);
    }
  }

  /**
   * Логировать ошибку
   */
  private error(...args: any[]): void {
    console.error('[FocusManager]', ...args);
  }

  // ==========================================
  // === ИНИЦИАЛИЗАЦИЯ ===
  // ==========================================

  /**
   * Инициализация менеджера фокуса
   * @param options Опции инициализации
   */
  public init(options: FocusManagerOptions = {}): void {
    if (this.state.initialized) {
      this.log('⚠️  Уже инициализирован');
      return;
    }

    this.log('🚀 Инициализация FocusManager...');

    // Установить опции
    if (options.getCellByCoords) {
      this.state.getCellByCoords = options.getCellByCoords;
    }
    if (options.containerSelector) {
      this.state.containerSelector = options.containerSelector;
    }
    if (options.debug !== undefined) {
      this.state.isDebug = options.debug;
    }
    if (options.restoreDelay !== undefined) {
      this.state.restoringDelay = options.restoreDelay;
    }

    // Установить обработчики событий
    this.setupEventListeners();

    // Установить MutationObserver для отслеживания DOM изменений
    this.setupMutationObserver();

    // Запустить фоновый мониторинг
    this.startFocusMonitoring();

    this.state.initialized = true;
    this.log('✅ Инициализация завершена');
  }

  // ==========================================
  // === УПРАВЛЕНИЕ АКТИВНОЙ ЯЧЕЙКОЙ ===
  // ==========================================

  /**
   * Установить активную ячейку
   * @param cellElement DOM элемент ячейки
   * @param coords Координаты { row, col } (если не переданы, будут получены из атрибутов)
   */
  public setActiveCell(
    cellElement: HTMLElement | null,
    coords?: { row: number; col: number } | null
  ): void {
    if (!cellElement) {
      this.warn('⚠️  setActiveCell: элемент не передан');
      return;
    }

    // Снять класс активности с предыдущей ячейки
    if (
      this.state.activeCellElement &&
      this.state.activeCellElement !== cellElement
    ) {
      this.state.activeCellElement.classList.remove('focus-manager-active');
    }

    // Сохранить ссылку на элемент
    this.state.activeCellElement = cellElement;

    // Получить координаты из атрибутов элемента, если не переданы
    if (!coords) {
      const row = cellElement.getAttribute('data-row');
      const col = cellElement.getAttribute('data-col');

      if (row !== null && col !== null) {
        coords = {
          row: parseInt(row, 10),
          col: parseInt(col, 10)
        };
      }
    }

    // Сохранить координаты активной ячейки
    this.state.activeCell = coords || null;

    // Добавить класс активной ячейки
    cellElement.classList.add('focus-manager-active');

    this.log('✓ Активная ячейка установлена:', coords);
  }

  /**
   * Получить текущую активную ячейку
   * @returns Информация об активной ячейке или null
   */
  public getActiveCell(): ActiveCell | null {
    if (!this.state.activeCell) {
      return null;
    }

    return {
      row: this.state.activeCell.row,
      col: this.state.activeCell.col,
      element: this.state.activeCellElement
    };
  }

  /**
   * Получить координаты активной ячейки
   * @returns Координаты { row, col } или null
   */
  public getActiveCellCoords(): { row: number; col: number } | null {
    return this.state.activeCell;
  }

  /**
   * Очистить активную ячейку
   */
  public clearActiveCell(): void {
    if (this.state.activeCellElement) {
      this.state.activeCellElement.classList.remove('focus-manager-active');
    }

    this.state.activeCell = null;
    this.state.activeCellElement = null;

    this.log('✓ Активная ячейка очищена');
  }

  // ==========================================
  // === ВОССТАНОВЛЕНИЕ ФОКУСА ===
  // ==========================================

  /**
   * Восстановить фокус на активной ячейке
   * @param force Принудительное восстановление (игнорировать проверки)
   */
  public restoreFocus(force: boolean = false): void {
    // Защита от рекурсии
    if (this.state.isRestoring && !force) {
      this.log('⏳ Восстановление уже выполняется');
      return;
    }

    // Проверка: есть ли активная ячейка
    if (!this.state.activeCell) {
      this.log('⚠️  Нет активной ячейки для восстановления');
      return;
    }

    // Проверка: текущий фокус уже на нужном элементе
    if (
      document.activeElement === this.state.activeCellElement &&
      !force
    ) {
      this.log('✓ Фокус уже на активной ячейке');
      return;
    }

    // Защита от бесконечных циклов
    if (this.state.restoreAttempts >= 3) {
      this.warn(
        '❌ Превышено максимальное количество попыток восстановления (3)'
      );
      this.state.restoreAttempts = 0;
      return;
    }

    this.state.isRestoring = true;
    this.state.restoreAttempts++;

    this.log(
      `🔄 Восстановление фокуса (попытка ${this.state.restoreAttempts}/3)...`
    );

    // Использовать requestAnimationFrame для плавного восстановления
    requestAnimationFrame(() => {
      this.performFocusRestore();
    });
  }

  /**
   * Выполнить восстановление фокуса (логика в отдельном методе для чистоты)
   */
  private performFocusRestore(): void {
    try {
      let targetElement = this.state.activeCellElement;

      // Если элемент не найден в DOM, попробовать найти по координатам
      if (!targetElement && this.state.activeCell) {
        const { row, col } = this.state.activeCell;
        this.log(`🔍 Поиск ячейки по координатам: row=${row}, col=${col}`);

        if (this.state.getCellByCoords) {
          targetElement = this.state.getCellByCoords(row, col);

          if (targetElement) {
            this.log('✓ Ячейка найдена и сделана видима:', { row, col });
            this.state.activeCellElement = targetElement;
          } else {
            this.warn(
              '⚠️  getCellByCoords вернула null для:',
              { row, col }
            );
          }
        }
      }

      // Проверить существование и валидность элемента
      if (targetElement && document.contains(targetElement)) {
        // Убедиться что элемент видим перед фокусировкой
        try {
          targetElement.scrollIntoView({
            block: 'nearest',
            inline: 'nearest'
          });
        } catch (e) {
          this.log('⚠️  scrollIntoView не сработал');
        }

        // Сфокусировать элемент (preventScroll = true чтобы не прыгать)
        targetElement.focus({ preventScroll: true });

        // Небольшая задержка для проверки успешности
        setTimeout(() => {
          if (document.activeElement === targetElement) {
            this.log('✅ Фокус успешно восстановлен');
            this.state.restoreAttempts = 0;
          } else {
            this.warn(
              '❌ Фокус не установлен. Текущий фокус:',
              (document.activeElement as HTMLElement)?.tagName,
              (document.activeElement as HTMLElement)?.className
            );

            // Повторная попытка если это не последняя попытка
            if (this.state.restoreAttempts < 3) {
              this.log('🔁 Повторная попытка восстановления фокуса...');
              this.state.isRestoring = false;
              setTimeout(() => {
                this.restoreFocus(true);
              }, this.state.restoringDelay);
              return;
            }
          }
          this.state.isRestoring = false;
        }, 10);
      } else {
        this.warn(
          '❌ Целевой элемент не найден или не в DOM'
        );
        this.state.isRestoring = false;
      }
    } catch (err) {
      this.error('❌ Ошибка при восстановлении фокуса:', err);
      this.state.isRestoring = false;
    }
  }

  // ==========================================
  // === ОБРАБОТЧИКИ СОБЫТИЙ ===
  // ==========================================

  /**
   * Установить обработчики событий
   */
  private setupEventListeners(): void {
    // Потеря фокуса окном
    window.addEventListener(
      'blur',
      () => this.handleWindowBlur(),
      false
    );

    // Восстановление фокуса окном
    window.addEventListener(
      'focus',
      () => this.handleWindowFocus(),
      false
    );

    // Навигационные клавиши
    document.addEventListener(
      'keydown',
      (e) => this.handleKeydown(e),
      true
    );

    // Клик по таблице
    document.addEventListener(
      'click',
      (e) => this.handleClick(e),
      true
    );

    // Очистка при выгрузке
    window.addEventListener(
      'beforeunload',
      () => this.cleanup(),
      false
    );

    this.log('✓ Обработчики событий установлены');
  }

  /**
   * Обработчик потери фокуса окном
   */
  private handleWindowBlur(): void {
    this.log('⚠️  Окно потеряло фокус');
  }

  /**
   * Обработчик восстановления фокуса окном
   */
  private handleWindowFocus(): void {
    this.log('✓ Окно восстановило фокус');

    // Восстановить фокус с небольшой задержкой
    setTimeout(
      () => this.restoreFocus(),
      this.state.restoringDelay
    );
  }

  /**
   * Обработчик нажатия клавиш
   * Восстанавливает фокус при потере, если нажата навигационная клавиша
   */
  private handleKeydown(e: KeyboardEvent): void {
    // Навигационные клавиши для отслеживания
    const navigationKeys = [
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Enter',
      'Tab',
      'Escape'
    ];

    // Если нажата навигационная клавиша и фокус потерян
    if (navigationKeys.includes(e.key)) {
      const activeElement = document.activeElement;

      // Если фокус на body или null - восстановить
      if (
        activeElement === document.body ||
        activeElement === null
      ) {
        this.log('⚠️  Фокус потерян при нажатии клавиши:', e.key);
        this.restoreFocus();
      }
    }
  }

  /**
   * Обработчик клика на таблицу
   * С защитой от быстрых двойных кликов (debounce)
   */
  private handleClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    // Проверить что это клик по ячейке
    if (!target || !target.classList.contains('cell')) {
      return;
    }

    // Debounce для защиты от быстрых двойных кликов
    const now = Date.now();
    if (now - this.state.lastClickTime < this.state.clickDebounceTime) {
      this.log('⏱️  Быстрый клик проигнорирован (debounce)');
      return;
    }
    this.state.lastClickTime = now;

    // Установить как активную ячейку
    this.setActiveCell(target);

    // Убедиться что фокус установлен
    setTimeout(() => {
      this.restoreFocus();
    }, 0);
  }

  // ==========================================
  // === MUTATION OBSERVER ===
  // ==========================================

  /**
   * Установить MutationObserver для отслеживания изменений DOM
   * Это необходимо для восстановления фокуса при re-render таблицы
   */
  private setupMutationObserver(): void {
    // Очистить предыдущий observer если есть
    if (this.state.mutationObserver) {
      this.state.mutationObserver.disconnect();
    }

    // Получить контейнер
    const container = document.querySelector(
      this.state.containerSelector
    );

    if (!container) {
      this.warn('⚠️  Контейнер не найден:', this.state.containerSelector);
      return;
    }

    // Конфигурация observer
    const config: MutationObserverInit = {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    };

    // Создать observer
    this.state.mutationObserver = new MutationObserver(
      (mutationsList) => this.handleDOMMutations(mutationsList)
    );

    this.state.mutationObserver.observe(container, config);

    this.log('✓ MutationObserver установлен на:', this.state.containerSelector);
  }

  /**
   * Обработчик изменений DOM
   * Восстанавливает фокус после re-render, очистки кэша, создания/удаления шаблонов
   */
  private handleDOMMutations(mutationsList: MutationRecord[]): void {
    // Если нет активной ячейки - ничего не делать
    if (!this.state.activeCell) {
      return;
    }

    // Проверить существует ли элемент активной ячейки в DOM
    if (
      this.state.activeCellElement &&
      document.contains(this.state.activeCellElement)
    ) {
      // Элемент существует, проверить валидность координат
      const row = this.state.activeCellElement.getAttribute('data-row');
      const col = this.state.activeCellElement.getAttribute('data-col');

      if (
        row !== null &&
        col !== null &&
        parseInt(row, 10) === this.state.activeCell.row &&
        parseInt(col, 10) === this.state.activeCell.col
      ) {
        // Элемент валиден, просто проверить фокус
        if (document.activeElement !== this.state.activeCellElement) {
          this.log('⚠️  Элемент существует, но фокус потерян');
          requestAnimationFrame(() => {
            this.restoreFocus();
          });
        }
        return;
      } else {
        // Координаты не совпадают, найти правильный элемент
        this.warn(
          '⚠️  Координаты элемента изменились, поиск новой ячейки...'
        );
        this.state.activeCellElement = null;
      }
    }

    // Элемент не найден, попробовать найти по координатам
    this.log('🔍 Поиск ячейки по координатам после DOM изменений:', this.state.activeCell);

    if (this.state.getCellByCoords) {
      try {
        const { row, col } = this.state.activeCell;
        const newElement = this.state.getCellByCoords(row, col);

        if (newElement && document.contains(newElement)) {
          this.log(
            '✓ Ячейка найдена по координатам, восстанавливаем фокус'
          );
          this.state.activeCellElement = newElement;

          // Проверить что элемент имеет правильные координаты
          const foundRow = newElement.getAttribute('data-row');
          const foundCol = newElement.getAttribute('data-col');

          if (
            parseInt(foundRow || '', 10) === row &&
            parseInt(foundCol || '', 10) === col
          ) {
            requestAnimationFrame(() => {
              this.restoreFocus(true);
            });
          } else {
            this.warn('⚠️  Найденный элемент имеет неправильные координаты');
          }
        } else {
          this.warn('⚠️  Не удалось найти ячейку по координатам');
        }
      } catch (err) {
        this.error('❌ Ошибка при поиске ячейки:', err);
      }
    }
  }

  // ==========================================
  // === ФОНОВЫЙ МОНИТОРИНГ ===
  // ==========================================

  /**
   * Запустить фоновый мониторинг здоровья фокуса
   * Проверяет каждую секунду что фокус не потерян
   */
  private startFocusMonitoring(): void {
    // Очистить предыдущий интервал если есть
    if (this.state.checkIntervalId !== null) {
      clearInterval(this.state.checkIntervalId);
    }

    // Проверка каждую секунду (1000мс)
    // Для больших таблиц это не создаёт заметного оверхеда
    this.state.checkIntervalId = window.setInterval(
      () => this.checkFocusHealth(),
      1000
    );

    this.log('✓ Фоновый мониторинг запущен (интервал: 1000мс)');
  }

  /**
   * Проверить здоровье фокуса
   * Вызывается периодически фоновым монитором
   */
  private checkFocusHealth(): void {
    // Если нет активной ячейки - ничего не делать
    if (!this.state.activeCell) {
      return;
    }

    const activeElement = document.activeElement as HTMLElement;

    // Если фокус на body или null - восстановить
    if (activeElement === document.body || activeElement === null) {
      this.log('⚠️  Фоновая проверка: фокус потерян (body/null)');
      this.restoreFocus();
      return;
    }

    // Если фокус не на активной ячейке и не на input/textarea
    const isInput =
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable;

    if (!isInput && activeElement !== this.state.activeCellElement) {
      // Проверить что активный элемент всё ещё в DOM
      if (!document.contains(activeElement)) {
        this.log(
          '⚠️  Фоновая проверка: активный элемент удалён из DOM'
        );
        this.restoreFocus();
      }
    }
  }

  // ==========================================
  // === УТИЛИТЫ ===
  // ==========================================

  /**
   * Получить статистику менеджера
   */
  public getStats(): FocusManagerStats {
    return {
      initialized: this.state.initialized,
      hasActiveCell: !!this.state.activeCell,
      activeCellCoords: this.state.activeCell,
      restoreAttempts: this.state.restoreAttempts,
      isRestoring: this.state.isRestoring
    };
  }

  /**
   * Установить режим отладки (вывод логов в консоль)
   */
  public setDebug(value: boolean): void {
    this.state.isDebug = value;
    this.log(`Режим отладки ${value ? 'включен ✓' : 'выключен'}`);
  }

  /**
   * Установить задержку восстановления фокуса
   * @param ms Задержка в миллисекундах
   */
  public setRestoreDelay(ms: number): void {
    if (ms < 0 || ms > 1000) {
      this.warn('⚠️  Задержка должна быть от 0 до 1000мс');
      return;
    }
    this.state.restoringDelay = ms;
    this.log(`✓ Задержка восстановления установлена на ${ms}мс`);
  }

  /**
   * Сброс состояния (для тестов)
   */
  public reset(): void {
    this.cleanup();
    this.state = {
      activeCell: null,
      activeCellElement: null,
      isRestoring: false,
      restoreAttempts: 0,
      restoringDelay: 50,
      getCellByCoords: null,
      containerSelector: 'body',
      checkIntervalId: null,
      mutationObserver: null,
      isDebug: false,
      initialized: false,
      lastClickTime: 0,
      clickDebounceTime: 100
    };
    this.log('✓ Состояние сброшено');
  }

  /**
   * Очистка ресурсов (вызывается при выгрузке страницы)
   */
  public cleanup(): void {
    this.log('🧹 Очистка ресурсов...');

    // Остановить интервал
    if (this.state.checkIntervalId !== null) {
      clearInterval(this.state.checkIntervalId);
      this.state.checkIntervalId = null;
    }

    // Отключить observer
    if (this.state.mutationObserver) {
      this.state.mutationObserver.disconnect();
      this.state.mutationObserver = null;
    }

    // Очистить ссылки
    this.state.activeCellElement = null;
    this.state.activeCell = null;

    this.state.initialized = false;
    this.log('✓ Очистка завершена');
  }
}

// ==========================================
// === ЭКСПОРТ (SINGLETON PATTERN) ===
// ==========================================

// Создать единственный экземпляр FocusManager (singleton)
const FocusManager: {
  init: (options?: FocusManagerOptions) => void;
  setActiveCell: (
    cellElement: HTMLElement | null,
    coords?: { row: number; col: number } | null
  ) => void;
  restoreFocus: (force?: boolean) => void;
  getActiveCell: () => ActiveCell | null;
  getActiveCellCoords: () => { row: number; col: number } | null;
  clearActiveCell: () => void;
  reset: () => void;
  getStats: () => FocusManagerStats;
  cleanup: () => void;
  setDebug: (value: boolean) => void;
  setRestoreDelay: (ms: number) => void;
} = new FocusManagerImpl() as any;

// Экспорт для разных систем модулей
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FocusManager;
}

// Доступность в глобальном объекте (для браузера)
if (typeof window !== 'undefined') {
  (window as any).FocusManager = FocusManager;
}

export default FocusManager;
export type { FocusManagerOptions, ActiveCell, FocusManagerStats };
