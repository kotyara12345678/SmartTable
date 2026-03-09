/**
 * FocusManager - Универсальный менеджер фокуса для SmartTable
 * 
 * Назначение:
 * - Никогда не терять фокус ввода в таблице
 * - Автоматически восстанавливать фокус после ререндера, очистки кеша, загрузки файлов
 * - Отслеживать потерю фокуса и восстанавливать его
 * 
 * Использование:
 *   FocusManager.init()
 *   FocusManager.setActiveCell(cellElement)
 *   FocusManager.restoreFocus()
 *   FocusManager.getActiveCell()
 */

const FocusManager = (function() {
  'use strict';

  // ==========================================
  // === КОНФИГУРАЦИЯ ===
  // ==========================================
  const CONFIG = {
    // Задержка перед восстановлением фокуса (мс)
    RESTORE_DELAY: 50,
    
    // Максимальное количество попыток восстановления фокуса
    MAX_FOCUS_ATTEMPTS: 3,
    
    // Интервал проверки фокуса в фоне (мс)
    FOCUS_CHECK_INTERVAL: 1000,
    
    // Селектор активной ячейки
    CELL_SELECTOR: '.cell',
    
    // Атрибуты для идентификации ячейки
    ROW_ATTR: 'data-row',
    COL_ATTR: 'data-col',
    
    // Класс для подсветки активной ячейки
    ACTIVE_CLASS: 'focus-manager-active',
    
    // Логирование (отключить в продакшене)
    DEBUG: false
  };

  // ==========================================
  // === ВНУТРЕННЕЕ СОСТОЯНИЕ ===
  // ==========================================
  let state = {
    // Последняя активная ячейка (координаты)
    activeCell: null, // { row: number, col: number, id?: string }
    
    // Ссылка на DOM элемент активной ячейки
    activeCellElement: null,
    
    // Флаг восстановления (защита от рекурсии)
    isRestoring: false,
    
    // Счётчик попыток восстановления
    restoreAttempts: 0,
    
    // Таймер периодической проверки
    checkIntervalId: null,
    
    // MutationObserver для отслеживания изменений DOM
    mutationObserver: null,
    
    // Флаг инициализации
    initialized: false,
    
    // Callback для получения ячейки по координатам
    getCellByCoords: null,
    
    // Последний известный фокусированный элемент
    lastFocusedElement: null
  };

  // ==========================================
  // === ЛОГИРОВАНИЕ ===
  // ==========================================
  function log(...args) {
    if (CONFIG.DEBUG) {
      console.log('[FocusManager]', ...args);
    }
  }

  function warn(...args) {
    if (CONFIG.DEBUG) {
      console.warn('[FocusManager]', ...args);
    }
  }

  function error(...args) {
    console.error('[FocusManager]', ...args);
  }

  // ==========================================
  // === ОСНОВНЫЕ ФУНКЦИИ ===
  // ==========================================

  /**
   * Инициализация менеджера фокуса
   * @param {Object} options - Опции
   * @param {Function} options.getCellByCoords - Функция для получения ячейки по координатам (row, col) => HTMLElement
   * @param {string} options.containerSelector - Селектор контейнера таблицы
   */
  function init(options = {}) {
    if (state.initialized) {
      log('Уже инициализирован');
      return;
    }

    log('Инициализация...');

    // Сохранить callback для получения ячейки
    state.getCellByCoords = options.getCellByCoords || null;

    // Установить обработчики событий
    setupEventListeners();

    // Установить MutationObserver
    setupMutationObserver(options.containerSelector || 'body');

    // Запустить фоновую проверку фокуса
    startFocusMonitoring();

    state.initialized = true;
    log('Инициализация завершена');
  }

  /**
   * Установить активную ячейку
   * @param {HTMLElement} cellElement - DOM элемент ячейки
   * @param {Object} coords - Координаты { row, col }
   */
  function setActiveCell(cellElement, coords = null) {
    if (!cellElement) {
      warn('setActiveCell: элемент не передан');
      return;
    }

    // Снять класс с предыдущей ячейки
    if (state.activeCellElement && state.activeCellElement !== cellElement) {
      state.activeCellElement.classList.remove(CONFIG.ACTIVE_CLASS);
    }

    // Сохранить ссылку на элемент
    state.activeCellElement = cellElement;
    state.lastFocusedElement = cellElement;

    // Получить координаты из атрибутов если не переданы
    if (!coords) {
      const row = cellElement.getAttribute(CONFIG.ROW_ATTR);
      const col = cellElement.getAttribute(CONFIG.COL_ATTR);
      
      if (row !== null && col !== null) {
        coords = {
          row: parseInt(row, 10),
          col: parseInt(col, 10)
        };
      }
    }

    // Сохранить координаты
    state.activeCell = coords;

    // Добавить класс активной ячейки
    cellElement.classList.add(CONFIG.ACTIVE_CLASS);

    log('Активная ячейка установлена:', coords);
  }

  /**
   * Восстановить фокус на активной ячейке
   * @param {boolean} force - Принудительное восстановление (игнорировать проверки)
   */
  function restoreFocus(force = false) {
    // Защита от рекурсии
    if (state.isRestoring && !force) {
      log('Восстановление уже выполняется');
      return;
    }

    // Проверка: есть ли активная ячейка
    if (!state.activeCell) {
      log('Нет активной ячейки для восстановления');
      return;
    }

    // Проверка: текущий фокус уже на нужном элементе
    const currentActive = document.activeElement;
    if (currentActive === state.activeCellElement && !force) {
      log('Фокус уже на активной ячейке');
      return;
    }

    // Защита от бесконечных циклов
    if (state.restoreAttempts >= CONFIG.MAX_FOCUS_ATTEMPTS) {
      warn('Превышено максимальное количество попыток восстановления');
      state.restoreAttempts = 0;
      return;
    }

    state.isRestoring = true;
    state.restoreAttempts++;

    log(`Восстановление фокуса (попытка ${state.restoreAttempts})...`);

    // Использовать requestAnimationFrame для плавного восстановления
    requestAnimationFrame(() => {
      try {
        let targetElement = state.activeCellElement;

        // Если элемент не найден, попробовать найти по координатам
        if (!targetElement && state.activeCell && state.getCellByCoords) {
          const { row, col } = state.activeCell;
          targetElement = state.getCellByCoords(row, col);
          
          if (targetElement) {
            log('Ячейка найдена по координатам:', { row, col });
            state.activeCellElement = targetElement;
          }
        }

        if (targetElement) {
          // Проверить что элемент всё ещё в DOM
          if (!document.contains(targetElement)) {
            warn('Элемент больше не в DOM');
            state.activeCellElement = null;
            state.isRestoring = false;
            return;
          }

          // Сфокусировать элемент
          targetElement.focus({ preventScroll: false });
          
          // Убедиться что фокус установлен
          setTimeout(() => {
            if (document.activeElement === targetElement) {
              log('Фокус успешно восстановлен');
              state.restoreAttempts = 0;
            } else {
              warn('Не удалось установить фокус');
            }
            state.isRestoring = false;
          }, 10);
        } else {
          warn('Целевой элемент не найден');
          state.isRestoring = false;
        }
      } catch (err) {
        error('Ошибка при восстановлении фокуса:', err);
        state.isRestoring = false;
      }
    });
  }

  /**
   * Получить текущую активную ячейку
   * @returns {Object|null} { row, col, element }
   */
  function getActiveCell() {
    if (!state.activeCell) {
      return null;
    }

    return {
      row: state.activeCell.row,
      col: state.activeCell.col,
      element: state.activeCellElement
    };
  }

  /**
   * Получить координаты активной ячейки
   * @returns {Object|null} { row, col }
   */
  function getActiveCellCoords() {
    return state.activeCell;
  }

  /**
   * Очистить активную ячейку
   */
  function clearActiveCell() {
    if (state.activeCellElement) {
      state.activeCellElement.classList.remove(CONFIG.ACTIVE_CLASS);
    }
    
    state.activeCell = null;
    state.activeCellElement = null;
    state.lastFocusedElement = null;
    
    log('Активная ячейка очищена');
  }

  // ==========================================
  // === ОБРАБОТЧИКИ СОБЫТИЙ ===
  // ==========================================

  /**
   * Установить обработчики событий
   */
  function setupEventListeners() {
    // Потеря фокуса окном
    window.addEventListener('blur', handleWindowBlur);
    
    // Восстановление фокуса окном
    window.addEventListener('focus', handleWindowFocus);
    
    // Потеря фокуса документом
    document.addEventListener('blur', handleDocumentBlur, true);
    
    // Навигационные клавиши
    document.addEventListener('keydown', handleKeydown, true);
    
    // Клик по таблице
    document.addEventListener('click', handleClick, true);
    
    // Очистка при выгрузке
    window.addEventListener('beforeunload', cleanup);
    
    log('Обработчики событий установлены');
  }

  /**
   * Обработчик потери фокуса окном
   */
  function handleWindowBlur() {
    log('Окно потеряло фокус');
    // Сохранить текущий активный элемент
    state.lastFocusedElement = document.activeElement;
  }

  /**
   * Обработчик восстановления фокуса окном
   */
  function handleWindowFocus() {
    log('Окно восстановило фокус');
    // Небольшая задержка перед восстановлением
    setTimeout(() => {
      restoreFocus();
    }, CONFIG.RESTORE_DELAY);
  }

  /**
   * Обработчик потери фокуса документом
   */
  function handleDocumentBlur(e) {
    const relatedTarget = e.relatedTarget;
    
    // Если фокус ушёл за пределы документа
    if (!relatedTarget || relatedTarget === document.body) {
      log('Документ потерял фокус');
    }
  }

  /**
   * Обработчик нажатия клавиш
   */
  function handleKeydown(e) {
    // Навигационные клавиши
    const navigationKeys = [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Enter', 'Tab', 'Escape'
    ];

    // Если нажата навигационная клавиша и фокус потерян
    if (navigationKeys.includes(e.key)) {
      const activeElement = document.activeElement;
      
      // Если фокус на body или null - восстановить
      if (activeElement === document.body || activeElement === null) {
        log('Фокус потерян при нажатии клавиши:', e.key);
        restoreFocus();
      }
    }
  }

  /**
   * Обработчик клика
   */
  function handleClick(e) {
    const target = e.target;
    
    // Если кликнули по ячейке
    if (target && target.classList && target.classList.contains('cell')) {
      setActiveCell(target);
    }
  }

  // ==========================================
  // === MUTATION OBSERVER ===
  // ==========================================

  /**
   * Установить MutationObserver для отслеживания изменений DOM
   * @param {string} containerSelector - Селектор контейнера
   */
  function setupMutationObserver(containerSelector) {
    // Очистить предыдущий observer если есть
    if (state.mutationObserver) {
      state.mutationObserver.disconnect();
    }

    const container = document.querySelector(containerSelector);
    
    if (!container) {
      warn('Контейнер не найден:', containerSelector);
      return;
    }

    // Конфигурация observer
    const config = {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    };

    // Callback при изменениях
    const callback = (mutationsList) => {
      handleDOMMutations(mutationsList);
    };

    // Создать observer
    state.mutationObserver = new MutationObserver(callback);
    state.mutationObserver.observe(container, config);

    log('MutationObserver установлен на:', containerSelector);
  }

  /**
   * Обработчик изменений DOM
   * @param {MutationRecord[]} mutationsList - Список изменений
   */
  function handleDOMMutations(mutationsList) {
    // Проверить есть ли активная ячейка
    if (!state.activeCell) {
      return;
    }

    // Проверить существует ли ещё элемент активной ячейки
    if (state.activeCellElement && document.contains(state.activeCellElement)) {
      // Элемент существует, проверить фокус
      if (document.activeElement !== state.activeCellElement) {
        log('DOM изменён, элемент существует, но фокус потерян');
        requestAnimationFrame(() => {
          restoreFocus();
        });
      }
      return;
    }

    // Элемент не найден, попробовать найти по координатам
    log('Элемент активной ячейки не найден в DOM, поиск по координатам...');
    
    if (state.getCellByCoords) {
      const { row, col } = state.activeCell;
      const newElement = state.getCellByCoords(row, col);
      
      if (newElement) {
        log('Ячейка найдена по координатам после мутации DOM');
        state.activeCellElement = newElement;
        
        requestAnimationFrame(() => {
          restoreFocus(true);
        });
      } else {
        warn('Не удалось найти ячейку по координатам после мутации DOM');
      }
    }
  }

  // ==========================================
  // === ФОНОВЫЙ МОНИТОРИНГ ===
  // ==========================================

  /**
   * Запустить фоновую проверку фокуса
   */
  function startFocusMonitoring() {
    // Очистить предыдущий интервал если есть
    if (state.checkIntervalId) {
      clearInterval(state.checkIntervalId);
    }

    // Проверка каждые CONFIG.FOCUS_CHECK_INTERVAL мс
    state.checkIntervalId = setInterval(() => {
      checkFocusHealth();
    }, CONFIG.FOCUS_CHECK_INTERVAL);

    log('Фоновый мониторинг запущен (интервал: ' + CONFIG.FOCUS_CHECK_INTERVAL + 'мс)');
  }

  /**
   * Проверка здоровья фокуса
   */
  function checkFocusHealth() {
    // Если нет активной ячейки - ничего не делать
    if (!state.activeCell) {
      return;
    }

    const activeElement = document.activeElement;
    
    // Если фокус на body или null - восстановить
    if (activeElement === document.body || activeElement === null) {
      log('Фоновая проверка: фокус потерян (body/null)');
      restoreFocus();
      return;
    }

    // Если фокус не на активной ячейке и не на input/textarea
    const isInput = activeElement.tagName === 'INPUT' || 
                    activeElement.tagName === 'TEXTAREA' ||
                    activeElement.isContentEditable;
    
    if (!isInput && activeElement !== state.activeCellElement) {
      // Проверить что активный элемент всё ещё в DOM
      if (!document.contains(activeElement)) {
        log('Фоновая проверка: активный элемент удалён из DOM');
        restoreFocus();
      }
    }
  }

  // ==========================================
  // === УТИЛИТЫ ===
  // ==========================================

  /**
   * Очистка ресурсов
   */
  function cleanup() {
    log('Очистка ресурсов...');

    // Остановить интервал
    if (state.checkIntervalId) {
      clearInterval(state.checkIntervalId);
      state.checkIntervalId = null;
    }

    // Отключить observer
    if (state.mutationObserver) {
      state.mutationObserver.disconnect();
      state.mutationObserver = null;
    }

    // Удалить обработчики событий
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('focus', handleWindowFocus);
    document.removeEventListener('blur', handleDocumentBlur, true);
    document.removeEventListener('keydown', handleKeydown, true);
    document.removeEventListener('click', handleClick, true);
    window.removeEventListener('beforeunload', cleanup);

    state.initialized = false;
    log('Очистка завершена');
  }

  /**
   * Сброс состояния (для тестов)
   */
  function reset() {
    cleanup();
    state = {
      activeCell: null,
      activeCellElement: null,
      isRestoring: false,
      restoreAttempts: 0,
      checkIntervalId: null,
      mutationObserver: null,
      initialized: false,
      getCellByCoords: null,
      lastFocusedElement: null
    };
    log('Состояние сброшено');
  }

  /**
   * Получить статистику
   */
  function getStats() {
    return {
      initialized: state.initialized,
      hasActiveCell: !!state.activeCell,
      activeCellCoords: state.activeCell,
      restoreAttempts: state.restoreAttempts,
      isRestoring: state.isRestoring
    };
  }

  // ==========================================
  // === ПУБЛИЧНОЕ API ===
  // ==========================================
  return {
    // Основные методы
    init,
    setActiveCell,
    restoreFocus,
    getActiveCell,
    getActiveCellCoords,
    clearActiveCell,
    
    // Утилиты
    reset,
    getStats,
    cleanup,
    
    // Настройки (для отладки)
    setDebug: (value) => { CONFIG.DEBUG = value; },
    setRestoreDelay: (ms) => { CONFIG.RESTORE_DELAY = ms; }
  };
})();

// Экспорт для разных систем модулей
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FocusManager;
}

if (typeof window !== 'undefined') {
  window.FocusManager = FocusManager;
}

// ES6 export для TypeScript
export default FocusManager;
