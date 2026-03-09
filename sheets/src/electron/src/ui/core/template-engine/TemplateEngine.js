/**
 * Template Engine для SmartTable
 * 
 * Архитектура системы шаблонов с встроенной логикой
 * 
 * Компоненты:
 * ┌─────────────────────────────────────────────────────────┐
 * │                  TemplateManager                        │
 * │  - Управление жизненным циклом шаблонов                 │
 * │  - Загрузка/сохранение шаблонов                         │
 * │  - Применение шаблонов к таблицам                       │
 * └─────────────────────────────────────────────────────────┘
 *                            │
 *         ┌──────────────────┼──────────────────┐
 *         ▼                  ▼                  ▼
 * ┌─────────────────┐ ┌──────────────┐ ┌─────────────────┐
 * │  SchemaEngine   │ │ FormulaEngine│ │   RuleEngine    │
 * │                 │ │              │ │                 │
 * │ - Схема колонок │ │ - Формулы    │ │ - Правила       │
 * │ - Типы данных   │ │ - Зависимости│ │ - Автоматизация │
 * │ - Валидация     │ │ - Пересчёт   │ │ - Триггеры      │
 * └─────────────────┘ └──────────────┘ └─────────────────┘
 * 
 * 
 * Пример использования:
 * 
 * const template = {
 *   name: "Bank Transactions",
 *   columns: [
 *     { id: "date", type: "date" },
 *     { id: "description", type: "text" },
 *     { id: "amount", type: "number" },
 *     { id: "category", type: "select", options: ["Питание", "Транспорт", "Закупки"] },
 *     { id: "vat", type: "formula", formula: "amount * 0.19 / 1.19" },
 *     { id: "net", type: "formula", formula: "amount - vat" }
 *   ],
 *   rules: [
 *     { 
 *       trigger: "onRowInsert",
 *       condition: { field: "description", contains: "amazon" },
 *       action: { set: { field: "category", value: "Закупки" } }
 *     }
 *   ]
 * };
 * 
 * TemplateManager.apply(template, tableData);
 */

/**
 * ==========================================
 * === КОНФИГУРАЦИЯ ===
 * ==========================================
 */
const TemplateConfig = {
  // Максимальное количество правил для одной таблицы
  MAX_RULES: 1000,
  
  // Максимальная глубина зависимостей формул
  MAX_FORMULA_DEPTH: 50,
  
  // Таймаут для массового пересчёта формул (мс)
  FORMULA_RECALC_TIMEOUT: 100,
  
  // Включить логирование
  DEBUG: false
};

/**
 * ==========================================
 * === УТИЛИТЫ ===
 * ==========================================
 */

/**
 * Логирование
 */
function log(...args) {
  if (TemplateConfig.DEBUG) {
    console.log('[TemplateEngine]', ...args);
  }
}

/**
 * Глубокое копирование объекта
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Проверка является ли значение примитивом
 */
function isPrimitive(value) {
  return value !== Object(value);
}

/**
 * Получить значение из объекта по пути (например "a.b.c")
 */
function getByPath(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

/**
 * Установить значение в объекте по пути
 */
function setByPath(obj, path, value) {
  const parts = path.split('.');
  const last = parts.pop();
  const target = parts.reduce((acc, part) => {
    if (!(part in acc)) acc[part] = {};
    return acc[part];
  }, obj);
  target[last] = value;
}

/**
 * ==========================================
 * === ЭКСПОРТ ===
 * ==========================================
 */

// Экспорт для разных систем модулей
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TemplateConfig,
    log,
    deepClone,
    isPrimitive,
    getByPath,
    setByPath
  };
}

if (typeof window !== 'undefined') {
  window.TemplateEngine = {
    TemplateConfig,
    log,
    deepClone,
    isPrimitive,
    getByPath,
    setByPath
  };
}
