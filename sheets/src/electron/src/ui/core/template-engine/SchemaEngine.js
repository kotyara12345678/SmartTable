/**
 * SchemaEngine - Движок схемы таблицы
 * 
 * Отвечает за:
 * - Определение колонок и их типов
 * - Валидацию данных
 * - Преобразование значений
 * - Значения по умолчанию
 */

(function() {
  'use strict';

  // ==========================================
  // === КОНФИГУРАЦИЯ ===
  // ==========================================
  const COLUMN_TYPES = {
    text: 'text',
    number: 'number',
    date: 'date',
    boolean: 'boolean',
    select: 'select',
    formula: 'formula',
    currency: 'currency',
    percent: 'percent'
  };

  // Значения по умолчанию для типов
  const DEFAULT_VALUES = {
    text: '',
    number: 0,
    date: null,
    boolean: false,
    select: null,
    formula: null,
    currency: 0,
    percent: 0
  };

  // ==========================================
  // === КЛАСС SCHEMA ENGINE ===
  // ==========================================
  class SchemaEngine {
    /**
     * Конструктор
     * @param {Object} schema - Схема таблицы
     */
    constructor(schema = null) {
      this.schema = null;
      this.columns = new Map(); // id -> column definition
      this.columnIndex = new Map(); // index -> id
      
      if (schema) {
        this.loadSchema(schema);
      }
    }

    /**
     * Загрузить схему
     * @param {Object} schema - Объект схемы
     */
    loadSchema(schema) {
      this.schema = deepClone(schema);
      this.columns.clear();
      this.columnIndex.clear();
      
      if (!schema.columns || !Array.isArray(schema.columns)) {
        throw new Error('Schema must have columns array');
      }
      
      schema.columns.forEach((col, index) => {
        if (!col.id) {
          throw new Error(`Column at index ${index} missing id`);
        }
        
        // Установить тип по умолчанию
        col.type = col.type || COLUMN_TYPES.text;
        
        // Валидировать тип
        if (!COLUMN_TYPES[col.type]) {
          throw new Error(`Unknown column type: ${col.type}`);
        }
        
        this.columns.set(col.id, col);
        this.columnIndex.set(index, col.id);
      });
      
      log('Schema loaded:', schema.name || 'unnamed');
    }

    /**
     * Получить определение колонки
     * @param {string} columnId - ID колонки
     * @returns {Object|null}
     */
    getColumn(columnId) {
      return this.columns.get(columnId) || null;
    }

    /**
     * Получить все колонки
     * @returns {Array}
     */
    getColumns() {
      return Array.from(this.columns.values());
    }

    /**
     * Получить ID колонки по индексу
     * @param {number} index - Индекс колонки
     * @returns {string|null}
     */
    getColumnIdByIndex(index) {
      return this.columnIndex.get(index) || null;
    }

    /**
     * Получить индекс колонки
     * @param {string} columnId - ID колонки
     * @returns {number}
     */
    getColumnIndex(columnId) {
      const ids = Array.from(this.columnIndex.values());
      return ids.indexOf(columnId);
    }

    /**
     * Получить количество колонок
     * @returns {number}
     */
    getColumnCount() {
      return this.columns.size;
    }

    /**
     * Валидировать значение для колонки
     * @param {string} columnId - ID колонки
     * @param {any} value - Значение для валидации
     * @returns {Object} { valid: boolean, error?: string, value?: any }
     */
    validateValue(columnId, value) {
      const column = this.getColumn(columnId);
      
      if (!column) {
        return { valid: false, error: `Column ${columnId} not found` };
      }
      
      // Пустые значения всегда валидны
      if (value === null || value === undefined || value === '') {
        return { valid: true, value: this.getDefaultValue(columnId) };
      }
      
      // Валидация по типу
      switch (column.type) {
        case COLUMN_TYPES.number:
        case COLUMN_TYPES.currency:
        case COLUMN_TYPES.percent:
          return this._validateNumber(value, column);
          
        case COLUMN_TYPES.date:
          return this._validateDate(value, column);
          
        case COLUMN_TYPES.boolean:
          return this._validateBoolean(value);
          
        case COLUMN_TYPES.select:
          return this._validateSelect(value, column);
          
        case COLUMN_TYPES.formula:
          return this._validateFormula(value, column);
          
        case COLUMN_TYPES.text:
        default:
          return this._validateText(value, column);
      }
    }

    /**
     * Валидация числа
     */
    _validateNumber(value, column) {
      const num = parseFloat(value);
      
      if (isNaN(num)) {
        return { valid: false, error: 'Must be a number' };
      }
      
      // Проверка мин/макс
      if (column.min !== undefined && num < column.min) {
        return { valid: false, error: `Value must be >= ${column.min}` };
      }
      
      if (column.max !== undefined && num > column.max) {
        return { valid: false, error: `Value must be <= ${column.max}` };
      }
      
      return { valid: true, value: num };
    }

    /**
     * Валидация даты
     */
    _validateDate(value, column) {
      const date = new Date(value);
      
      if (isNaN(date.getTime())) {
        return { valid: false, error: 'Invalid date' };
      }
      
      return { valid: true, value: date.toISOString() };
    }

    /**
     * Валидация булевого значения
     */
    _validateBoolean(value) {
      if (typeof value === 'boolean') {
        return { valid: true, value: value };
      }
      
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'true' || lower === '1' || lower === 'yes') {
          return { valid: true, value: true };
        }
        if (lower === 'false' || lower === '0' || lower === 'no') {
          return { valid: true, value: false };
        }
      }
      
      return { valid: false, error: 'Must be a boolean' };
    }

    /**
     * Валидация select
     */
    _validateSelect(value, column) {
      if (column.options && Array.isArray(column.options)) {
        if (!column.options.includes(value)) {
          return { 
            valid: false, 
            error: `Value must be one of: ${column.options.join(', ')}` 
          };
        }
      }
      
      return { valid: true, value: value };
    }

    /**
     * Валидация формулы
     */
    _validateFormula(value, column) {
      // Формулы валидируются отдельно в FormulaEngine
      return { valid: true, value: value };
    }

    /**
     * Валидация текста
     */
    _validateText(value, column) {
      const str = String(value);
      
      // Проверка длины
      if (column.maxLength && str.length > column.maxLength) {
        return { valid: false, error: `Text too long (max ${column.maxLength})` };
      }
      
      // Проверка паттерна
      if (column.pattern) {
        const regex = new RegExp(column.pattern);
        if (!regex.test(str)) {
          return { valid: false, error: 'Text does not match pattern' };
        }
      }
      
      return { valid: true, value: str };
    }

    /**
     * Получить значение по умолчанию для колонки
     * @param {string} columnId - ID колонки
     * @returns {any}
     */
    getDefaultValue(columnId) {
      const column = this.getColumn(columnId);
      
      if (!column) {
        return null;
      }
      
      // Явное значение по умолчанию
      if (column.default !== undefined) {
        return column.default;
      }
      
      // Значение по умолчанию для типа
      return DEFAULT_VALUES[column.type] || null;
    }

    /**
     * Преобразовать значение для отображения
     * @param {string} columnId - ID колонки
     * @param {any} value - Значение
     * @returns {string}
     */
    formatValue(columnId, value) {
      const column = this.getColumn(columnId);
      
      if (!column || value === null || value === undefined) {
        return '';
      }
      
      switch (column.type) {
        case COLUMN_TYPES.date:
          return this._formatDate(value, column);
          
        case COLUMN_TYPES.currency:
          return this._formatCurrency(value, column);
          
        case COLUMN_TYPES.percent:
          return this._formatPercent(value, column);
          
        case COLUMN_TYPES.boolean:
          return value ? '✓' : '';
          
        default:
          return String(value);
      }
    }

    /**
     * Форматирование даты
     */
    _formatDate(value, column) {
      const date = new Date(value);
      const format = column.format || 'YYYY-MM-DD';
      
      // Простое форматирование
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day);
    }

    /**
     * Форматирование валюты
     */
    _formatCurrency(value, column) {
      const num = parseFloat(value);
      const currency = column.currency || 'USD';
      const decimals = column.decimals !== undefined ? column.decimals : 2;
      
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(num);
    }

    /**
     * Форматирование процента
     */
    _formatPercent(value, column) {
      const num = parseFloat(value);
      const decimals = column.decimals !== undefined ? column.decimals : 2;
      
      return (num * 100).toFixed(decimals) + '%';
    }

    /**
     * Создать пустую строку данных согласно схеме
     * @returns {Object}
     */
    createEmptyRow() {
      const row = {};
      
      this.columns.forEach((column, id) => {
        row[id] = this.getDefaultValue(id);
      });
      
      return row;
    }

    /**
     * Валидировать всю строку
     * @param {Object} row - Данные строки
     * @returns {Object} { valid: boolean, errors: Array }
     */
    validateRow(row) {
      const errors = [];
      
      this.columns.forEach((column, id) => {
        // Пропустить формулы (они вычисляются)
        if (column.type === COLUMN_TYPES.formula) {
          return;
        }
        
        const value = row[id];
        
        // Проверка обязательности
        if (column.required && (value === null || value === undefined || value === '')) {
          errors.push({
            field: id,
            error: 'Field is required'
          });
          return;
        }
        
        // Валидация значения
        if (value !== null && value !== undefined && value !== '') {
          const result = this.validateValue(id, value);
          if (!result.valid) {
            errors.push({
              field: id,
              error: result.error
            });
          }
        }
      });
      
      return {
        valid: errors.length === 0,
        errors: errors
      };
    }

    /**
     * Экспорт схемы
     * @returns {Object}
     */
    exportSchema() {
      return deepClone(this.schema);
    }
  }

  // ==========================================
  // ЭКСПОРТ
  // ==========================================
  
  if (typeof module !== 'undefined' && module.exports) {
    module.exports.SchemaEngine = SchemaEngine;
    module.exports.COLUMN_TYPES = COLUMN_TYPES;
  }
  
  if (typeof window !== 'undefined') {
    window.TemplateEngine.SchemaEngine = SchemaEngine;
    window.TemplateEngine.COLUMN_TYPES = COLUMN_TYPES;
  }
  
})();
