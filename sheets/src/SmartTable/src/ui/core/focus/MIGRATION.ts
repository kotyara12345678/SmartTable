/**
 * МИГРАЦИОННАЯ ИНСТРУКЦИЯ: FocusManager.js → FocusManager.ts
 * 
 * Замена старой реализации TypeScript версией
 * Время миграции: < 3 минуты
 */

// ======================================
// ШАГ 1: ОБНОВИТЬ ИМПОРТ в renderer.ts
// ======================================

// ❌ БЫЛО:
// import FocusManager from '../core/focus/FocusManager.js';

// ✅ СТАЛО:
// import FocusManager from '../core/focus/FocusManager';
// или явно с расширением:
// import FocusManager from '../core/focus/FocusManager.ts';

// ======================================
// ШАГ 2: ИНИЦИАЛИЗАЦИЯ (возможно уже есть)
// ======================================

// В функции init() в renderer.ts:
/*
FocusManager.init({
  getCellByCoords: (row: number, col: number): HTMLElement | null => {
    // Получить ячейку по координатам (обычно через querySelect вашей структуры)
    return document.querySelector(
      `.cell[data-row="${row}"][data-col="${col}"]`
    ) as HTMLElement | null;
  },
  containerSelector: '#cellGrid',  // или где находится ваша сетка
  debug: false,                     // true для отладки
  restoreDelay: 50                  // мс
});
*/

// ======================================
// ШАГ 3: ИСПОЛЬЗОВАНИЕ В selectCell()
// ======================================

/*
function selectCell(row: number, col: number) {
  // ... остальной ваш код ...

  const cell = getCellElement(row, col);
  if (cell) {
    // Установить как активную ячейку
    FocusManager.setActiveCell(cell, { row, col });
    
    // Сфокусировать
    cell.focus();
  }
}
*/

// ======================================
// ШАГ 4: ВОССТАНОВЛЕНИЕ ФОКУСА
// ======================================

/*
function renderCells() {
  requestAnimationFrame(() => {
    renderScheduled = false;
    renderVisibleCells();
    cleanupCellCache();

    // Восстановить фокус после преро-рендера
    FocusManager.restoreFocus();
  });
}
*/

// ======================================
// ШАГ 5: ПОЛУЧЕНИЕ ИНФОРМАЦИИ
// ======================================

// Получить текущую активную ячейку:
// const activeCell = FocusManager.getActiveCell();
// if (activeCell) {
//   console.log(`Активна ячейка: [${activeCell.row}, ${activeCell.col}]`);
// }

// Получить координаты:
// const coords = FocusManager.getActiveCellCoords();

// Получить статистику:
// const stats = FocusManager.getStats();

// ======================================
// ШАГ 6: ОТЛАДКА
// ======================================

// Включить логирование в браузере:
// FocusManager.setDebug(true);

// Установить кастомную задержку восстановления:
// FocusManager.setRestoreDelay(100);

// ======================================
// ШАГ 7: УДАЛЕНИЕ СТАРЫХ ФАЙЛОВ
// ======================================

// После проверки что всё работает:
// ❌ УДАЛИТЬ: src/ui/core/focus/FocusManager.js
// ✓ ОСТАВИТЬ: src/ui/core/focus/FocusManager.ts (новый)
// ✓ ОБНОВИТЬ: src/ui/core/focus/FocusManager.d.ts (с документацией)

// ======================================
// ВАЖНЫЕ ОТЛИЧИЯ НОВОЙ ВЕРСИИ
// ======================================

/*
1. ✅ Полностью на TypeScript
   - Строгая типизация
   - Лучшая поддержка IDE
   - Минимум ошибок

2. ✅ Debounce быстрых кликов
   - Защита от двойных кликов (100мс)
   - Стабильный ввод

3. ✅ Улучшенная отладка
   - Эмодзи в логах (✓, ✅, ❌, ⚠️, 🔄)
   - Понятные сообщения
   - Легко найти проблемы

4. ✅ Оптимизирована для больших таблиц
   - Меньше переборов
   - Умный MutationObserver
   - Фоновая проверка каждую секунду

5. ✅ Гибкая конфигурация
   - setDebug(boolean)
   - setRestoreDelay(ms)
   - Все параметры при init()
*/

// ======================================
// ФУНКЦИЯ МИГРАЦИИ: ПОЛНАЯ ЗАМЕНА
// ======================================

export function migrateToNewFocusManager() {
  // 1. Проверить что старый FocusManager загружен
  const oldFocusManager = (window as any).FocusManager;
  
  if (!oldFocusManager) {
    console.warn('[Migration] Старый FocusManager не найден');
    return false;
  }

  // 2. Получить текущее состояние
  const oldStats = oldFocusManager.getStats?.();
  console.log('[Migration] Старое состояние:', oldStats);

  // 3. Очистить старый FocusManager
  oldFocusManager.cleanup?.();

  // 4. Новый FocusManager будет инициализирован автоматически
  // через его init() вызов в renderer.ts

  console.log('[Migration] ✅ Миграция завершена');
  return true;
}

// Вызвать при необходимости:
// migrateToNewFocusManager();

// ======================================
// ПРОВЕРКА СОВМЕСТИМОСТИ
// ======================================

export function checkFocusManagerCompatibility(): {
  compatible: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 1. Проверить что FocusManager присутствует
  const FocusManager = (window as any).FocusManager;
  if (!FocusManager) {
    errors.push('FocusManager не найден в window');
    return { compatible: false, errors };
  }

  // 2. Проверить наличие основных методов
  const requiredMethods = [
    'init',
    'setActiveCell',
    'restoreFocus',
    'getActiveCell',
    'getActiveCellCoords',
    'clearActiveCell',
    'getStats',
    'setDebug',
    'setRestoreDelay'
  ];

  for (const method of requiredMethods) {
    if (typeof FocusManager[method] !== 'function') {
      errors.push(`Метод FocusManager.${method}() не найден`);
    }
  }

  // 3. Проверить что FocusManager инициализирован
  const stats = FocusManager.getStats?.();
  if (!stats?.initialized) {
    errors.push('FocusManager не инициализирован (вызовите init())');
  }

  return {
    compatible: errors.length === 0,
    errors
  };
}

// Использование:
// const check = checkFocusManagerCompatibility();
// if (check.compatible) {
//   console.log('✅ FocusManager совместим');
// } else {
//   console.error('❌ Ошибки совместимости:', check.errors);
// }

// ======================================
// ВРЕМЕННАЯ ШПАРГАЛКА API
// ======================================

/*
// Инициализация
FocusManager.init({ getCellByCoords, containerSelector, debug, restoreDelay })

// Установить активную ячейку
FocusManager.setActiveCell(element, { row, col })

// Восстановить фокус
FocusManager.restoreFocus(force?)

// Получить активную ячейку
FocusManager.getActiveCell() // → { row, col, element }

// Получить координаты
FocusManager.getActiveCellCoords() // → { row, col }

// Очистить активную ячейку
FocusManager.clearActiveCell()

// Статистика
FocusManager.getStats() // → FocusManagerStats

// Отладка
FocusManager.setDebug(true/false)
FocusManager.setRestoreDelay(ms)

// Очистка
FocusManager.cleanup()
FocusManager.reset()
*/

console.log('✅ FocusManager TypeScript версия готова к использованию');
