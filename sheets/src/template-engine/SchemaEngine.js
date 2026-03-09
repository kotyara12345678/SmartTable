/**
 * SchemaEngine
 * Ответственность:
 * - Валидация схемы шаблона
 * - Создание и управление колонками
 * - Типы данных и конвертация
 * - Метаданные колонок
 */

export class SchemaEngine {
  constructor() {
    this._columns = new Map();
    this._columnOrder = [];
    this._typeValidators = {
      text: (v) => String(v ?? ''),
      number: (v) => {
        const n = Number(v);
        return isNaN(n) ? 0 : n;
      },
      date: (v) => {
        if (!v) return null;
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
      },
      select: (v, options = []) => {
        return options.includes(v) ? v : options[0] ?? null;
      },
      formula: (v) => v ?? null
    };
  }

  /**
   * Инициализация схемы из шаблона
   * @param {Object} template - Шаблон с колонками
   */
  init(template) {
    this._columns.clear();
    this._columnOrder = [];

    if (!template.columns || !Array.isArray(template.columns)) {
      throw new Error('Template must have columns array');
    }

    for (const col of template.columns) {
      this._validateColumn(col);
      this._columns.set(col.id, {
        id: col.id,
        type: col.type || 'text',
        label: col.label || col.id,
        options: col.options || null,
        formula: col.formula || null,
        defaultValue: col.defaultValue ?? null,
        readOnly: col.type === 'formula'
      });
      this._columnOrder.push(col.id);
    }

    return this;
  }

  _validateColumn(col) {
    if (!col.id) {
      throw new Error('Column must have an id');
    }
    const validTypes = ['text', 'number', 'date', 'select', 'formula'];
    if (col.type && !validTypes.includes(col.type)) {
      throw new Error(`Invalid column type: ${col.type}`);
    }
    if (col.type === 'select' && !col.options) {
      throw new Error('Select column must have options');
    }
  }

  /**
   * Получить конфигурацию колонки
   */
  getColumn(colId) {
    return this._columns.get(colId);
  }

  /**
   * Получить все колонки в порядке
   */
  getColumns() {
    return this._columnOrder.map(id => this._columns.get(id));
  }

  /**
   * Получить только формульные колонки
   */
  getFormulaColumns() {
    return this._columnOrder
      .map(id => this._columns.get(id))
      .filter(col => col.type === 'formula' && col.formula);
  }

  /**
   * Конвертация значения согласно типу колонки
   */
  convertValue(colId, value) {
    const col = this._columns.get(colId);
    if (!col) return value;

    const validator = this._typeValidators[col.type];
    if (!validator) return value;

    return col.type === 'select'
      ? validator(value, col.options)
      : validator(value);
  }

  /**
   * Создание пустой строки с default значениями
   */
  createRow() {
    const row = {};
    for (const colId of this._columnOrder) {
      const col = this._columns.get(colId);
      row[colId] = col.defaultValue ?? (col.type === 'number' ? 0 : '');
    }
    return row;
  }

  /**
   * Валидация строки данных
   */
  validateRow(row) {
    const errors = [];
    for (const [colId, col] of this._columns.entries()) {
      const value = row[colId];
      if (col.type === 'number' && value !== '' && isNaN(Number(value))) {
        errors.push({ column: colId, error: 'Invalid number' });
      }
      if (col.type === 'date' && value && isNaN(new Date(value).getTime())) {
        errors.push({ column: colId, error: 'Invalid date' });
      }
      if (col.type === 'select' && col.options && !col.options.includes(value)) {
        errors.push({ column: colId, error: 'Invalid select value' });
      }
    }
    return { valid: errors.length === 0, errors };
  }

  /**
   * Получить схему для сериализации
   */
  toJSON() {
    return {
      columns: this._columnOrder.map(id => {
        const col = this._columns.get(id);
        return { ...col };
      })
    };
  }
}
