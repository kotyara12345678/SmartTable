/**
 * DataStore
 * Ответственность:
 * - Хранение данных таблицы
 * - Оптимизировано для больших таблиц (50k+ строк)
 * - Минимальные аллокации памяти
 */

export class DataStore {
  constructor() {
    this._rows = new Map(); // rowId -> { colId: value }
    this._rowOrder = []; // Для сохранения порядка
    this._columnIndices = new Map(); // colId -> индекс для быстрого доступа
  }

  /**
   * Инициализация хранилища
   */
  init(columns) {
    this._columnIndices.clear();
    columns.forEach((col, index) => {
      this._columnIndices.set(col.id, index);
    });
    return this;
  }

  /**
   * Создать уникальный ID для строки
   */
  static generateRowId() {
    return `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Добавить строку
   * @param {Object} data - Данные строки
   * @param {string} rowId - Опциональный ID строки
   * @returns {string} ID созданной строки
   */
  addRow(data = {}, rowId = null) {
    const id = rowId || DataStore.generateRowId();
    this._rows.set(id, { ...data });
    this._rowOrder.push(id);
    return id;
  }

  /**
   * Удалить строку
   */
  removeRow(rowId) {
    const index = this._rowOrder.indexOf(rowId);
    if (index > -1) {
      this._rowOrder.splice(index, 1);
    }
    this._rows.delete(rowId);
    return index > -1;
  }

  /**
   * Получить значение ячейки
   */
  getValue(rowId, colId) {
    const row = this._rows.get(rowId);
    if (!row) return undefined;
    return row[colId];
  }

  /**
   * Установить значение ячейки
   */
  setValue(rowId, colId, value) {
    const row = this._rows.get(rowId);
    if (!row) return false;
    row[colId] = value;
    return true;
  }

  /**
   * Получить всю строку
   */
  getRow(rowId) {
    return this._rows.get(rowId);
  }

  /**
   * Получить все ID строк
   */
  getAllRowIds() {
    return this._rowOrder;
  }

  /**
   * Получить количество строк
   */
  getRowCount() {
    return this._rowOrder.length;
  }

  /**
   * Получить диапазон строк (для виртуализации)
   */
  getRowsInRange(start, end) {
    const result = [];
    for (let i = start; i < Math.min(end, this._rowOrder.length); i++) {
      const rowId = this._rowOrder[i];
      result.push({ id: rowId, data: this._rows.get(rowId) });
    }
    return result;
  }

  /**
   * Массовое обновление (для производительности)
   */
  batchUpdate(updates) {
    // updates: [{ rowId, colId, value }, ...]
    for (const { rowId, colId, value } of updates) {
      this.setValue(rowId, colId, value);
    }
  }

  /**
   * Найти строки по условию
   */
  find(predicate) {
    const results = [];
    for (const rowId of this._rowOrder) {
      const row = this._rows.get(rowId);
      if (predicate(row, rowId)) {
        results.push({ id: rowId, data: row });
      }
    }
    return results;
  }

  /**
   * Очистить все данные
   */
  clear() {
    this._rows.clear();
    this._rowOrder = [];
  }

  /**
   * Экспорт данных
   */
  toJSON() {
    return this._rowOrder.map(id => ({
      id,
      data: this._rows.get(id)
    }));
  }

  /**
   * Импорт данных
   */
  fromJSON(data) {
    this.clear();
    for (const { id, data: rowData } of data) {
      this.addRow(rowData, id);
    }
  }
}
