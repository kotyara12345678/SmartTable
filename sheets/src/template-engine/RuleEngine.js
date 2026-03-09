/**
 * RuleEngine
 * Ответственность:
 * - Регистрация правил автоматизации
 * - Триггеры: onRowInsert, onCellChange
 * - Выполнение условий и действий
 * - Приоритеты правил
 * 
 * Формат правила:
 * {
 *   id: "unique-id",
 *   trigger: "onCellChange" | "onRowInsert",
 *   condition: { column, operator, value },
 *   actions: [{ type: "setValue", column, value }],
 *   priority: 0
 * }
 */

export class RuleEngine {
  constructor(schemaEngine, dataStore) {
    this._schemaEngine = schemaEngine;
    this._dataStore = dataStore;
    this._rules = new Map();
    this._rulesByTrigger = {
      onRowInsert: [],
      onCellChange: []
    };
  }

  /**
   * Регистрация правила
   */
  registerRule(rule) {
    if (!rule.id) {
      throw new Error('Rule must have an id');
    }
    if (!rule.trigger || !this._rulesByTrigger.hasOwnProperty(rule.trigger)) {
      throw new Error(`Invalid trigger: ${rule.trigger}`);
    }

    this._rules.set(rule.id, rule);
    this._rulesByTrigger[rule.trigger].push(rule);
    
    // Сортировка по приоритету (выше = раньше)
    this._rulesByTrigger[rule.trigger].sort((a, b) => 
      (b.priority || 0) - (a.priority || 0)
    );

    return this;
  }

  /**
   * Удаление правила
   */
  unregisterRule(ruleId) {
    const rule = this._rules.get(ruleId);
    if (rule) {
      const triggerRules = this._rulesByTrigger[rule.trigger];
      const index = triggerRules.indexOf(rule);
      if (index > -1) {
        triggerRules.splice(index, 1);
      }
      this._rules.delete(ruleId);
    }
    return this;
  }

  /**
   * Выполнение правил при вставке строки
   * @param {string} rowId - ID строки
   * @returns {Array} Список изменений
   */
  onRowInsert(rowId) {
    const changes = [];
    const rules = this._rulesByTrigger.onRowInsert;

    for (const rule of rules) {
      if (this._evaluateCondition(rowId, rule.condition)) {
        const ruleChanges = this._executeActions(rowId, rule.actions);
        changes.push(...ruleChanges);
      }
    }

    return changes;
  }

  /**
   * Выполнение правил при изменении ячейки
   * @param {string} rowId - ID строки
   * @param {string} colId - Изменённая колонка
   * @param {*} newValue - Новое значение
   * @returns {Array} Список изменений
   */
  onCellChange(rowId, colId, newValue) {
    const changes = [];
    const rules = this._rulesByTrigger.onCellChange;

    for (const rule of rules) {
      // Проверяем, касается ли правило этой колонки
      if (this._ruleAffectsColumn(rule, colId)) {
        if (this._evaluateCondition(rowId, rule.condition)) {
          const ruleChanges = this._executeActions(rowId, rule.actions);
          changes.push(...ruleChanges);
        }
      }
    }

    return changes;
  }

  /**
   * Проверка, касается ли правило колонки
   */
  _ruleAffectsColumn(rule, colId) {
    const cond = rule.condition;
    if (!cond) return true;
    
    // Если условие проверяет эту колонку
    if (cond.column === colId) return true;
    
    // Если есть действия на эту колонку
    if (rule.actions && rule.actions.some(a => a.column === colId)) {
      return true;
    }

    return false;
  }

  /**
   * Вычисление условия
   * Поддерживаемые операторы:
   * equals, notEquals, contains, startsWith, endsWith,
   * greaterThan, lessThan, greaterOrEqual, lessOrEqual,
   * isEmpty, isNotEmpty, in, notIn
   */
  _evaluateCondition(rowId, condition) {
    if (!condition) return true; // Нет условия = всегда true

    const { column, operator, value } = condition;
    const cellValue = this._dataStore.getValue(rowId, column);

    switch (operator) {
      case 'equals':
      case 'eq':
        return cellValue == value;
      
      case 'notEquals':
      case 'neq':
        return cellValue != value;
      
      case 'contains':
        return String(cellValue || '').includes(String(value));
      
      case 'startsWith':
        return String(cellValue || '').startsWith(String(value));
      
      case 'endsWith':
        return String(cellValue || '').endsWith(String(value));
      
      case 'greaterThan':
      case 'gt':
        return Number(cellValue) > Number(value);
      
      case 'lessThan':
      case 'lt':
        return Number(cellValue) < Number(value);
      
      case 'greaterOrEqual':
      case 'gte':
        return Number(cellValue) >= Number(value);
      
      case 'lessOrEqual':
      case 'lte':
        return Number(cellValue) <= Number(value);
      
      case 'isEmpty':
        return cellValue === '' || cellValue === null || cellValue === undefined;
      
      case 'isNotEmpty':
        return cellValue !== '' && cellValue !== null && cellValue !== undefined;
      
      case 'in':
        return Array.isArray(value) && value.includes(cellValue);
      
      case 'notIn':
        return Array.isArray(value) && !value.includes(cellValue);
      
      case 'regex':
        return new RegExp(value).test(String(cellValue || ''));
      
      default:
        console.warn(`Unknown operator: ${operator}`);
        return false;
    }
  }

  /**
   * Выполнение действий
   * Типы действий:
   * - setValue: установить значение
   * - clearValue: очистить значение
   * - copyFrom: скопировать из другой колонки
   * - calculate: вычислить по формуле действия
   */
  _executeActions(rowId, actions) {
    const changes = [];

    for (const action of actions) {
      switch (action.type) {
        case 'setValue':
          const convertedValue = this._schemaEngine.convertValue(
            action.column,
            action.value
          );
          this._dataStore.setValue(rowId, action.column, convertedValue);
          changes.push({ rowId, colId: action.column, value: convertedValue });
          break;

        case 'clearValue':
          this._dataStore.setValue(rowId, action.column, '');
          changes.push({ rowId, colId: action.column, value: '' });
          break;

        case 'copyFrom':
          const srcValue = this._dataStore.getValue(rowId, action.from);
          const convertedSrc = this._schemaEngine.convertValue(
            action.column,
            srcValue
          );
          this._dataStore.setValue(rowId, action.column, convertedSrc);
          changes.push({ rowId, colId: action.column, value: convertedSrc });
          break;

        case 'calculate':
          // Простое вычисление: action.expression - строка типа "amount * 0.19"
          try {
            const context = this._buildRuleContext(rowId, action);
            const fn = new Function(...Object.keys(context), 
              `return ${action.expression};`);
            const result = fn(...Object.values(context));
            const converted = this._schemaEngine.convertValue(
              action.column,
              result
            );
            this._dataStore.setValue(rowId, action.column, converted);
            changes.push({ rowId, colId: action.column, value: converted });
          } catch (e) {
            console.error(`Rule calculation error:`, e);
          }
          break;
      }
    }

    return changes;
  }

  /**
   * Построение контекста для вычислений в действии
   */
  _buildRuleContext(rowId, action) {
    const context = {};
    const columns = this._schemaEngine.getColumns();
    
    for (const col of columns) {
      context[col.id] = this._dataStore.getValue(rowId, col.id);
    }
    
    return context;
  }

  /**
   * Получить все правила
   */
  getRules() {
    return Array.from(this._rules.values());
  }

  /**
   * Получить правила по триггеру
   */
  getRulesByTrigger(trigger) {
    return this._rulesByTrigger[trigger] || [];
  }

  /**
   * Очистить все правила
   */
  clear() {
    this._rules.clear();
    this._rulesByTrigger = {
      onRowInsert: [],
      onCellChange: []
    };
  }
}
