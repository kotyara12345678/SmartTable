/**
 * TemplateManager
 * Ответственность:
 * - Загрузка и валидация шаблонов
 * - Инициализация всех движков
 * - Применение шаблона к таблице
 * - Оркестрация событий между модулями
 * 
 * Публичный API для интеграции с UI
 */

import { EventEmitter } from './EventEmitter.js';
import { SchemaEngine } from './SchemaEngine.js';
import { FormulaEngine } from './FormulaEngine.js';
import { RuleEngine } from './RuleEngine.js';
import { DataStore } from './DataStore.js';

export class TemplateManager extends EventEmitter {
  constructor() {
    super();
    this._template = null;
    this._schemaEngine = null;
    this._formulaEngine = null;
    this._ruleEngine = null;
    this._dataStore = null;
    this._initialized = false;
  }

  /**
   * Инициализация менеджера с шаблоном
   * @param {Object} template - Шаблон таблицы
   */
  init(template) {
    this._validateTemplate(template);
    this._template = { ...template };

    // Создаём хранилище и движки
    this._dataStore = new DataStore();
    this._schemaEngine = new SchemaEngine();
    
    // Инициализируем схему
    this._schemaEngine.init(template);
    this._dataStore.init(this._schemaEngine.getColumns());

    // Создаём движки с зависимостями
    this._formulaEngine = new FormulaEngine(this._schemaEngine, this._dataStore);
    this._ruleEngine = new RuleEngine(this._schemaEngine, this._dataStore);

    // Регистрируем формулы из шаблона
    this._registerTemplateFormulas();

    // Регистрируем правила из шаблона
    this._registerTemplateRules();

    this._initialized = true;
    this.emit('init', { template });

    return this;
  }

  /**
   * Валидация шаблона
   */
  _validateTemplate(template) {
    if (!template.name) {
      throw new Error('Template must have a name');
    }
    if (!template.columns || !Array.isArray(template.columns)) {
      throw new Error('Template must have columns array');
    }
    if (template.rules && !Array.isArray(template.rules)) {
      throw new Error('Template rules must be an array');
    }
  }

  /**
   * Регистрация формул из шаблона
   */
  _registerTemplateFormulas() {
    const formulaColumns = this._schemaEngine.getFormulaColumns();
    
    for (const col of formulaColumns) {
      if (col.formula) {
        this._formulaEngine.registerFormula(col.id, col.formula);
      }
    }
  }

  /**
   * Регистрация правил из шаблона
   */
  _registerTemplateRules() {
    if (!this._template.rules) return;

    for (const rule of this._template.rules) {
      this._ruleEngine.registerRule(rule);
    }
  }

  /**
   * Создать новую строку
   * @param {Object} data - Начальные данные
   * @returns {string} ID созданной строки
   */
  createRow(data = {}) {
    if (!this._initialized) {
      throw new Error('TemplateManager not initialized');
    }

    // Создаём строку с default значениями
    const rowData = this._schemaEngine.createRow();
    
    // Переопределяем переданными данными
    Object.assign(rowData, data);

    // Валидируем
    const validation = this._schemaEngine.validateRow(rowData);
    if (!validation.valid) {
      throw new Error(`Invalid row data: ${JSON.stringify(validation.errors)}`);
    }

    // Добавляем в хранилище
    const rowId = this._dataStore.addRow(rowData);

    // Выполняем правила onRowInsert
    const ruleChanges = this._ruleEngine.onRowInsert(rowId);
    if (ruleChanges.length > 0) {
      this._dataStore.batchUpdate(ruleChanges);
    }

    // Вычисляем формулы
    const formulaUpdates = [];
    const formulaCols = this._schemaEngine.getFormulaColumns();
    
    for (const col of formulaCols) {
      const result = this._formulaEngine.evaluate(rowId, col.id, false);
      this._dataStore.setValue(rowId, col.id, result);
      formulaUpdates.push({ rowId, colId: col.id, value: result });
    }

    this.emit('rowCreated', { rowId, data: rowData, ruleChanges, formulaUpdates });

    return rowId;
  }

  /**
   * Обновить ячейку
   * @param {string} rowId - ID строки
   * @param {string} colId - ID колонки
   * @param {*} value - Новое значение
   */
  updateCell(rowId, colId, value) {
    if (!this._initialized) {
      throw new Error('TemplateManager not initialized');
    }

    const col = this._schemaEngine.getColumn(colId);
    if (!col) {
      throw new Error(`Column ${colId} not found`);
    }

    // Формульные колонки только для чтения
    if (col.readOnly) {
      console.warn(`Column ${colId} is read-only (formula)`);
      return false;
    }

    // Конвертируем значение
    const convertedValue = this._schemaEngine.convertValue(colId, value);
    
    // Сохраняем
    this._dataStore.setValue(rowId, colId, convertedValue);

    // Выполняем правила onCellChange
    const ruleChanges = this._ruleEngine.onCellChange(rowId, colId, convertedValue);
    if (ruleChanges.length > 0) {
      this._dataStore.batchUpdate(ruleChanges);
    }

    // Пересчитываем зависимые формулы
    const formulaUpdates = this._formulaEngine.recalculateForRow(rowId, colId);

    this.emit('cellUpdated', { 
      rowId, 
      colId, 
      value: convertedValue,
      ruleChanges,
      formulaUpdates
    });

    return true;
  }

  /**
   * Удалить строку
   */
  deleteRow(rowId) {
    const removed = this._dataStore.removeRow(rowId);
    if (removed) {
      this.emit('rowDeleted', { rowId });
    }
    return removed;
  }

  /**
   * Получить значение ячейки
   */
  getCellValue(rowId, colId) {
    const col = this._schemaEngine.getColumn(colId);
    if (col?.type === 'formula') {
      return this._formulaEngine.evaluate(rowId, colId);
    }
    return this._dataStore.getValue(rowId, colId);
  }

  /**
   * Получить всю строку
   */
  getRow(rowId) {
    const rowData = this._dataStore.getRow(rowId);
    if (!rowData) return null;

    // Вычисляем формульные значения
    const result = { ...rowData };
    const formulaCols = this._schemaEngine.getFormulaColumns();
    
    for (const col of formulaCols) {
      result[col.id] = this._formulaEngine.evaluate(rowId, col.id);
    }

    return result;
  }

  /**
   * Получить все строки
   */
  getAllRows() {
    return this._dataStore.getAllRowIds().map(id => this.getRow(id));
  }

  /**
   * Получить диапазон строк (для виртуализации UI)
   */
  getRowsInRange(start, end) {
    return this._dataStore.getRowsInRange(start, end).map(({ id, data }) => ({
      id,
      data: this.getRow(id)
    }));
  }

  /**
   * Массовая вставка строк (оптимизировано)
   */
  bulkInsert(rowsData) {
    const rowIds = [];
    const allRuleChanges = [];
    const allFormulaUpdates = [];

    for (const rowData of rowsData) {
      const rowId = this._dataStore.addRow(
        Object.assign(this._schemaEngine.createRow(), rowData)
      );
      rowIds.push(rowId);

      const ruleChanges = this._ruleEngine.onRowInsert(rowId);
      allRuleChanges.push(...ruleChanges);
    }

    // Применяем изменения правил
    if (allRuleChanges.length > 0) {
      this._dataStore.batchUpdate(allRuleChanges);
    }

    // Вычисляем все формулы (оптимизированный пересчёт)
    const formulaUpdates = this._formulaEngine.recalculateAll();

    this.emit('bulkInsert', { rowIds, count: rowIds.length });

    return rowIds;
  }

  /**
   * Получить схему колонок
   */
  getColumns() {
    return this._schemaEngine.getColumns();
  }

  /**
   * Получить конфигурацию колонки
   */
  getColumn(colId) {
    return this._schemaEngine.getColumn(colId);
  }

  /**
   * Получить количество строк
   */
  getRowCount() {
    return this._dataStore.getRowCount();
  }

  /**
   * Добавить правило динамически
   */
  addRule(rule) {
    this._ruleEngine.registerRule(rule);
    this.emit('ruleAdded', { rule });
  }

  /**
   * Удалить правило
   */
  removeRule(ruleId) {
    this._ruleEngine.unregisterRule(ruleId);
    this.emit('ruleRemoved', { ruleId });
  }

  /**
   * Получить все правила
   */
  getRules() {
    return this._ruleEngine.getRules();
  }

  /**
   * Изменить формулу колонки
   */
  updateFormula(colId, newFormula) {
    this._formulaEngine.registerFormula(colId, newFormula);
    const updates = this._formulaEngine.recalculateColumn(colId);
    this.emit('formulaUpdated', { colId, formula: newFormula, updates });
  }

  /**
   * Пересчитать все формулы
   */
  recalculateAllFormulas() {
    return this._formulaEngine.recalculateAll();
  }

  /**
   * Экспорт состояния
   */
  exportState() {
    return {
      template: this._template,
      schema: this._schemaEngine.toJSON(),
      rules: this._ruleEngine.getRules(),
      data: this._dataStore.toJSON()
    };
  }

  /**
   * Импорт состояния
   */
  importState(state) {
    this.init(state.template);
    
    if (state.data) {
      this._dataStore.fromJSON(state.data);
      // Пересчитываем формулы после импорта
      this._formulaEngine.recalculateAll();
    }

    this.emit('imported', { state });
  }

  /**
   * Очистить все данные (сохраняя схему)
   */
  clearData() {
    this._dataStore.clear();
    this.emit('dataCleared');
  }

  /**
   * Получить доступ к хранилищу (для UI)
   */
  getDataStore() {
    return this._dataStore;
  }

  /**
   * Получить доступ к формульному движку
   */
  getFormulaEngine() {
    return this._formulaEngine;
  }

  /**
   * Получить доступ к движку правил
   */
  getRuleEngine() {
    return this._ruleEngine;
  }

  /**
   * Получить доступ к схеме
   */
  getSchemaEngine() {
    return this._schemaEngine;
  }
}
