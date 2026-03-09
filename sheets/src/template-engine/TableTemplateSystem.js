/**
 * SmartTable Template Engine System
 * Модульная система шаблонов таблиц с формулами и правилами автоматизации
 * Pure JavaScript, оптимизировано для таблиц до 50k строк
 */

// ============================================================================
// БАЗОВЫЕ СТРУКТУРЫ ДАННЫХ
// ============================================================================

/**
 * Типы колонок
 */
const ColumnType = {
  TEXT: 'text',
  NUMBER: 'number',
  DATE: 'date',
  SELECT: 'select',
  FORMULA: 'formula'
};

/**
 * Колонка таблицы
 */
class Column {
  constructor(id, type, options = {}) {
    this.id = id;
    this.type = type;
    this.label = options.label || id;
    this.options = options; // для select: { values: [...] }
    this.formula = options.formula || null;
    this.defaultValue = options.defaultValue || null;
    this.width = options.width || 120;
    this.readonly = type === ColumnType.FORMULA;
  }
}

/**
 * Ячейка таблицы
 */
class Cell {
  constructor(columnId, rowId, value = null) {
    this.columnId = columnId;
    this.rowId = rowId;
    this.value = value;
    this.computedValue = null; // для формул
    this.error = null;
    this.dependencies = []; // какие ячейки зависят от этой
    this.dependents = []; // от каких ячеек зависит эта
  }

  getValue() {
    return this.computedValue !== null ? this.computedValue : this.value;
  }
}

/**
 * Строка таблицы
 */
class Row {
  constructor(id, cells = {}) {
    this.id = id;
    this.cells = cells; // Map<columnId, Cell>
    this.createdAt = Date.now();
  }
}

/**
 * Модель таблицы
 */
class TableModel {
  constructor(schema) {
    this.id = schema.id || `table_${Date.now()}`;
    this.name = schema.name;
    this.columns = new Map(); // Map<columnId, Column>
    this.rows = new Map();    // Map<rowId, Row>
    this.rowOrder = [];       // для сохранения порядка строк
    this._nextRowId = 1;
  }

  addColumn(column) {
    this.columns.set(column.id, column);
  }

  getColumn(columnId) {
    return this.columns.get(columnId);
  }

  createRow(data = {}) {
    const rowId = `row_${this._nextRowId++}`;
    const row = new Row(rowId);
    
    // Создаём ячейки для всех колонок
    for (const [colId, column] of this.columns) {
      const value = data[colId] !== undefined ? data[colId] : column.defaultValue;
      const cell = new Cell(colId, rowId, value);
      row.cells[colId] = cell;
    }
    
    this.rows.set(rowId, row);
    this.rowOrder.push(rowId);
    return row;
  }

  getRow(rowId) {
    return this.rows.get(rowId);
  }

  getCell(rowId, columnId) {
    const row = this.rows.get(rowId);
    return row ? row.cells[columnId] : null;
  }

  setCellValue(rowId, columnId, value) {
    const cell = this.getCell(rowId, columnId);
    if (cell) {
      cell.value = value;
      cell.computedValue = null; // сброс кэша
      cell.error = null;
      return true;
    }
    return false;
  }

  getRowCount() {
    return this.rows.size;
  }

  getAllRows() {
    return this.rowOrder.map(id => this.rows.get(id));
  }
}

// ============================================================================
// FORMULA ENGINE - Движок формул с DAG зависимостей
// ============================================================================

/**
 * Парсер и исполнитель формул
 * Поддерживает: ссылки на ячейки, арифметику, функции
 */
class FormulaParser {
  constructor() {
    this.functions = {
      // Математические
      SUM: (...args) => args.reduce((a, b) => a + b, 0),
      AVG: (...args) => args.reduce((a, b) => a + b, 0) / args.length,
      MIN: Math.min,
      MAX: Math.max,
      ABS: Math.abs,
      ROUND: (val, decimals = 0) => {
        const mult = Math.pow(10, decimals);
        return Math.round(val * mult) / mult;
      },
      // Логические
      IF: (cond, thenVal, elseVal) => cond ? thenVal : elseVal,
      AND: (...args) => args.every(Boolean),
      OR: (...args) => args.some(Boolean),
      NOT: (val) => !val,
      // Текстовые
      CONCAT: (...args) => args.join(''),
      UPPER: (str) => String(str).toUpperCase(),
      LOWER: (str) => String(str).toLowerCase(),
      LEN: (str) => String(str).length,
      // Поиск
      CONTAINS: (str, search) => String(str).includes(search),
      // Дата
      TODAY: () => new Date().toISOString().split('T')[0],
      NOW: () => Date.now(),
      // Утилиты
      ISNUMBER: (val) => typeof val === 'number',
      ISEMPTY: (val) => val === null || val === undefined || val === '',
      COALESCE: (...args) => args.find(v => v !== null && v !== undefined) || null
    };
  }

  /**
   * Извлекает ссылки на ячейки из формулы
   * Формат: [columnId] или [columnId]rowIndex (будет реализовано)
   */
  extractDependencies(formula) {
    const deps = new Set();
    const regex = /\[([^\]]+)\]/g;
    let match;
    
    while ((match = regex.exec(formula)) !== null) {
      deps.add(match[1]);
    }
    
    return Array.from(deps);
  }

  /**
   * Парсит и вычисляет формулу
   * @param {string} formula - формула вида "[amount] * 0.19 / 1.19"
   * @param {Object} context - контекст с значениями ячеек
   */
  parse(formula, context = {}) {
    try {
      // Заменяем [columnId] на значения из контекста
      let expression = formula;
      
      for (const [colId, value] of Object.entries(context)) {
        const regex = new RegExp(`\\[${colId}\\]`, 'g');
        const safeValue = typeof value === 'string' ? `'${value.replace(/'/g, "\\'")}'` : value;
        expression = expression.replace(regex, safeValue !== undefined ? safeValue : 'null');
      }

      // Заменяем функции на вызовы
      expression = expression.replace(/\b([A-Z_]+)\s*\(/g, (match, funcName) => {
        return this.functions[funcName] ? `__funcs.${funcName}(` : match;
      });

      // Безопасное вычисление
      const result = this.safeEval(expression, context);
      return { success: true, value: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Безопасное вычисление выражения
   */
  safeEval(expression, context) {
    // Создаём безопасный контекст для eval
    const __funcs = this.functions;
    const __data = context;
    
    // Разрешаем только безопасные операции
    const sanitized = expression
      .replace(/[^a-zA-Z0-9_\.\s\+\-\*\/\(\)',!&|<>=\?]/g, '')
      .replace(/\b__funcs\b/g, '__funcs');
    
    // Используем Function вместо eval для изоляции
    const compute = new Function('__funcs', '__data', `
      with (__data) {
        return (${sanitized});
      }
    `);
    
    return compute(__funcs, context);
  }
}

/**
 * DAG (Directed Acyclic Graph) для отслеживания зависимостей
 */
class DependencyGraph {
  constructor() {
    this.nodes = new Map(); // nodeId -> Set<dependentNodeIds>
    this.reverse = new Map(); // nodeId -> Set<dependencyNodeIds>
  }

  /**
   * Добавляет зависимость: target зависит от source
   */
  addDependency(target, source) {
    if (!this.nodes.has(source)) {
      this.nodes.set(source, new Set());
    }
    if (!this.reverse.has(target)) {
      this.reverse.set(target, new Set());
    }
    
    this.nodes.get(source).add(target);
    this.reverse.get(target).add(source);
  }

  /**
   * Удаляет все зависимости узла
   */
  removeNode(nodeId) {
    // Удаляем из зависимых
    if (this.reverse.has(nodeId)) {
      for (const dep of this.reverse.get(nodeId)) {
        if (this.nodes.has(dep)) {
          this.nodes.get(dep).delete(nodeId);
        }
      }
      this.reverse.delete(nodeId);
    }
    
    // Удаляем из зависимостей
    if (this.nodes.has(nodeId)) {
      for (const dependent of this.nodes.get(nodeId)) {
        if (this.reverse.has(dependent)) {
          this.reverse.get(dependent).delete(nodeId);
        }
      }
      this.nodes.delete(nodeId);
    }
  }

  /**
   * Получает всех зависимых (транзитивно) через BFS
   */
  getDependents(nodeId) {
    const result = new Set();
    const queue = [nodeId];
    
    while (queue.length > 0) {
      const current = queue.shift();
      if (this.nodes.has(current)) {
        for (const dependent of this.nodes.get(current)) {
          if (!result.has(dependent)) {
            result.add(dependent);
            queue.push(dependent);
          }
        }
      }
    }
    
    return Array.from(result);
  }

  /**
   * Топологическая сортировка для порядка пересчёта
   */
  topologicalSort(nodeIds) {
    const visited = new Set();
    const result = [];
    const visiting = new Set(); // для детекции циклов
    
    const visit = (nodeId) => {
      if (visited.has(nodeId)) return;
      if (visiting.has(nodeId)) {
        throw new Error(`Circular dependency detected: ${nodeId}`);
      }
      
      visiting.add(nodeId);
      
      if (this.reverse.has(nodeId)) {
        for (const dep of this.reverse.get(nodeId)) {
          if (nodeIds.includes(dep)) {
            visit(dep);
          }
        }
      }
      
      visiting.delete(nodeId);
      visited.add(nodeId);
      result.push(nodeId);
    };
    
    for (const nodeId of nodeIds) {
      visit(nodeId);
    }
    
    return result;
  }

  /**
   * Детектирует циклы
   */
  hasCycle() {
    const visited = new Set();
    const visiting = new Set();
    
    const dfs = (nodeId) => {
      if (visiting.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;
      
      visiting.add(nodeId);
      
      if (this.nodes.has(nodeId)) {
        for (const dependent of this.nodes.get(nodeId)) {
          if (dfs(dependent)) return true;
        }
      }
      
      visiting.delete(nodeId);
      visited.add(nodeId);
      return false;
    };
    
    for (const nodeId of this.nodes.keys()) {
      if (dfs(nodeId)) return true;
    }
    
    return false;
  }
}

/**
 * FormulaEngine - управляет формулами и пересчётом
 */
class FormulaEngine {
  constructor(table) {
    this.table = table;
    this.parser = new FormulaParser();
    this.dependencyGraph = new DependencyGraph();
    this.formulaCells = new Map(); // "rowId:colId" -> formula
    this.recalcQueue = new Set();
    this.isRecalculating = false;
  }

  /**
   * Регистрирует формулу для колонки
   */
  registerFormula(columnId, formula) {
    const column = this.table.getColumn(columnId);
    if (!column) return;

    // Извлекаем зависимости из формулы
    const deps = this.parser.extractDependencies(formula);
    
    // Сохраняем формулу
    this.formulaCells.set(columnId, {
      formula,
      dependencies: deps
    });

    // Для каждой существующей строки создаём зависимости
    for (const row of this.table.getAllRows()) {
      this._createRowDependencies(row, columnId, deps);
    }
  }

  /**
   * Создаёт зависимости для строки
   */
  _createRowDependencies(row, formulaColId, deps) {
    const targetKey = `${row.id}:${formulaColId}`;
    
    for (const depColId of deps) {
      const sourceKey = `${row.id}:${depColId}`;
      this.dependencyGraph.addDependency(targetKey, sourceKey);
    }
  }

  /**
   * Вызывается при добавлении строки
   */
  onRowAdded(row) {
    for (const [colId, { formula, dependencies }] of this.formulaCells) {
      this._createRowDependencies(row, colId, dependencies);
      this.recalculateCell(row.id, colId);
    }
  }

  /**
   * Пересчитывает ячейку и всех зависимых
   */
  recalculateCell(rowId, columnId) {
    const key = `${rowId}:${columnId}`;
    this.recalcQueue.add(key);
    
    if (!this.isRecalculating) {
      this._processRecalcQueue();
    }
  }

  /**
   * Обрабатывает очередь пересчёта пачкой
   */
  _processRecalcQueue() {
    if (this.recalcQueue.size === 0) return;
    
    this.isRecalculating = true;
    
    try {
      // Получаем все затронутые ячейки
      const keysToRecalc = new Set(this.recalcQueue);
      
      // Добавляем всех зависимых (транзитивно)
      for (const key of this.recalcQueue) {
        const dependents = this.dependencyGraph.getDependents(key);
        for (const dep of dependents) {
          keysToRecalc.add(dep);
        }
      }
      
      // Сортируем топологически
      const sortedKeys = this.dependencyGraph.topologicalSort(Array.from(keysToRecalc));
      
      // Пересчитываем в правильном порядке
      for (const key of sortedKeys) {
        const [rowId, columnId] = key.split(':');
        this._computeCell(rowId, columnId);
      }
      
      this.recalcQueue.clear();
    } catch (error) {
      console.error('Formula recalculation error:', error);
    } finally {
      this.isRecalculating = false;
    }
  }

  /**
   * Вычисляет значение ячейки с формулой
   */
  _computeCell(rowId, columnId) {
    const column = this.table.getColumn(columnId);
    if (!column || column.type !== ColumnType.FORMULA) return;

    const formulaInfo = this.formulaCells.get(columnId);
    if (!formulaInfo) return;

    const row = this.table.getRow(rowId);
    if (!row) return;

    // Собираем контекст - значения зависимых ячеек
    const context = {};
    for (const depColId of formulaInfo.dependencies) {
      const depCell = row.cells[depColId];
      if (depCell) {
        context[depColId] = depCell.getValue();
      }
    }

    // Вычисляем формулу
    const result = this.parser.parse(formulaInfo.formula, context);
    
    const cell = row.cells[columnId];
    if (result.success) {
      cell.computedValue = result.value;
      cell.error = null;
    } else {
      cell.error = result.error;
      cell.computedValue = null;
    }
  }

  /**
   * Удаляет зависимости строки
   */
  onRowRemoved(rowId) {
    for (const column of this.table.columns.values()) {
      const key = `${rowId}:${column.id}`;
      this.dependencyGraph.removeNode(key);
      this.recalcQueue.delete(key);
    }
  }

  /**
   * Получает значение ячейки (с учётом формул)
   */
  getCellValue(rowId, columnId) {
    const cell = this.table.getCell(rowId, columnId);
    if (!cell) return null;
    return cell.getValue();
  }
}

// ============================================================================
// RULE ENGINE - Движок правил автоматизации
// ============================================================================

/**
 * Типы триггеров правил
 */
const RuleTrigger = {
  ON_ROW_INSERT: 'onRowInsert',
  ON_CELL_CHANGE: 'onCellChange'
};

/**
 * Операторы условий
 */
const ConditionOperators = {
  EQUALS: 'equals',
  NOT_EQUALS: 'notEquals',
  CONTAINS: 'contains',
  STARTS_WITH: 'startsWith',
  ENDS_WITH: 'endsWith',
  GREATER_THAN: 'greaterThan',
  LESS_THAN: 'lessThan',
  IS_EMPTY: 'isEmpty',
  IS_NOT_EMPTY: 'isNotEmpty',
  IN: 'in',
  NOT_IN: 'notIn'
};

/**
 * Правило автоматизации
 */
class AutomationRule {
  constructor(config) {
    this.id = config.id || `rule_${Date.now()}`;
    this.name = config.name;
    this.trigger = config.trigger; // onRowInsert | onCellChange
    this.triggerColumn = config.triggerColumn; // для onCellChange
    this.conditions = config.conditions || [];
    this.actions = config.actions || [];
    this.enabled = config.enabled !== false;
    this.priority = config.priority || 0;
  }
}

/**
 * RuleEngine - выполняет правила автоматизации
 */
class RuleEngine {
  constructor(table) {
    this.table = table;
    this.rules = [];
    this.isProcessing = false;
  }

  /**
   * Регистрирует правило
   */
  registerRule(ruleConfig) {
    const rule = new AutomationRule(ruleConfig);
    this.rules.push(rule);
    // Сортируем по приоритету
    this.rules.sort((a, b) => b.priority - a.priority);
    return rule;
  }

  /**
   * Вызывается при вставке строки
   */
  onRowInsert(row) {
    this._executeRules(RuleTrigger.ON_ROW_INSERT, null, row);
  }

  /**
   * Вызывается при изменении ячейки
   */
  onCellChange(rowId, columnId, oldValue, newValue) {
    const row = this.table.getRow(rowId);
    this._executeRules(RuleTrigger.ON_CELL_CHANGE, { columnId, oldValue, newValue }, row);
  }

  /**
   * Выполняет подходящие правила
   */
  _executeRules(trigger, context, row) {
    if (this.isProcessing) return; // защита от рекурсии
    this.isProcessing = true;

    try {
      for (const rule of this.rules) {
        if (!rule.enabled) continue;
        if (rule.trigger !== trigger) continue;
        
        // Для onCellChange проверяем колонку
        if (trigger === RuleTrigger.ON_CELL_CHANGE && 
            rule.triggerColumn && 
            rule.triggerColumn !== context.columnId) {
          continue;
        }

        // Проверяем условия
        if (this._checkConditions(rule.conditions, row, context)) {
          // Выполняем действия
          this._executeActions(rule.actions, row, context);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Проверяет все условия правила
   */
  _checkConditions(conditions, row, context) {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every(condition => {
      const cell = row.cells[condition.column];
      if (!cell) return false;

      const value = cell.getValue();
      return this._evaluateCondition(condition.operator, value, condition.value);
    });
  }

  /**
   * Вычисляет одно условие
   */
  _evaluateCondition(operator, value, expected) {
    switch (operator) {
      case ConditionOperators.EQUALS:
        return value === expected;
      case ConditionOperators.NOT_EQUALS:
        return value !== expected;
      case ConditionOperators.CONTAINS:
        return String(value || '').includes(expected);
      case ConditionOperators.STARTS_WITH:
        return String(value || '').startsWith(expected);
      case ConditionOperators.ENDS_WITH:
        return String(value || '').endsWith(expected);
      case ConditionOperators.GREATER_THAN:
        return Number(value) > Number(expected);
      case ConditionOperators.LESS_THAN:
        return Number(value) < Number(expected);
      case ConditionOperators.IS_EMPTY:
        return value === null || value === undefined || value === '';
      case ConditionOperators.IS_NOT_EMPTY:
        return value !== null && value !== undefined && value !== '';
      case ConditionOperators.IN:
        return Array.isArray(expected) && expected.includes(value);
      case ConditionOperators.NOT_IN:
        return Array.isArray(expected) && !expected.includes(value);
      default:
        return false;
    }
  }

  /**
   * Выполняет действия правила
   */
  _executeActions(actions, row, context) {
    for (const action of actions) {
      this._executeAction(action, row, context);
    }
  }

  /**
   * Выполняет одно действие
   */
  _executeAction(action, row, context) {
    switch (action.type) {
      case 'set':
        const cell = row.cells[action.column];
        if (cell) {
          cell.value = action.value;
          cell.computedValue = null;
        }
        break;
        
      case 'setFormula':
        // Динамическое значение
        const formulaCell = row.cells[action.column];
        if (formulaCell && this.table.formulaEngine) {
          const result = this.table.formulaEngine.parser.parse(action.formula, this._getRowContext(row));
          if (result.success) {
            formulaCell.computedValue = result.value;
          }
        }
        break;
        
      case 'copy':
        const sourceCell = row.cells[action.sourceColumn];
        const targetCell = row.cells[action.targetColumn];
        if (sourceCell && targetCell) {
          targetCell.value = sourceCell.value;
        }
        break;
        
      case 'clear':
        const clearCell = row.cells[action.column];
        if (clearCell) {
          clearCell.value = null;
          clearCell.computedValue = null;
        }
        break;
        
      case 'validate':
        // Проверка валидности (может выбросить ошибку)
        const validateCell = row.cells[action.column];
        if (validateCell) {
          const isValid = this._evaluateCondition(action.operator, validateCell.getValue(), action.value);
          if (!isValid && action.errorMessage) {
            validateCell.error = action.errorMessage;
          }
        }
        break;
    }
  }

  /**
   * Получает контекст строки для формул
   */
  _getRowContext(row) {
    const context = {};
    for (const [colId, cell] of Object.entries(row.cells)) {
      context[colId] = cell.getValue();
    }
    return context;
  }

  /**
   * Удаляет правило
   */
  removeRule(ruleId) {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  /**
   * Включает/выключает правило
   */
  toggleRule(ruleId, enabled) {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }
}

// ============================================================================
// SCHEMA ENGINE - Движок схем и валидации
// ============================================================================

/**
 * Валидатор схем
 */
class SchemaValidator {
  static validate(template) {
    const errors = [];

    if (!template.name) {
      errors.push('Template name is required');
    }

    if (!template.columns || !Array.isArray(template.columns)) {
      errors.push('Columns array is required');
      return { valid: false, errors };
    }

    const columnIds = new Set();
    for (const col of template.columns) {
      if (!col.id) {
        errors.push('Column id is required');
        continue;
      }
      
      if (columnIds.has(col.id)) {
        errors.push(`Duplicate column id: ${col.id}`);
      }
      columnIds.add(col.id);

      if (!Object.values(ColumnType).includes(col.type)) {
        errors.push(`Invalid column type: ${col.type}`);
      }

      if (col.type === ColumnType.SELECT && (!col.options || !col.options.values)) {
        errors.push(`Select column ${col.id} requires options.values`);
      }

      if (col.type === ColumnType.FORMULA && !col.formula) {
        errors.push(`Formula column ${col.id} requires formula`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * SchemaEngine - создаёт структуру таблицы из шаблона
 */
class SchemaEngine {
  constructor() {
    this.columnTypes = { ...ColumnType };
    this.customTypes = new Map();
  }

  /**
   * Регистрирует кастомный тип колонки
   */
  registerType(name, config) {
    this.customTypes.set(name, config);
  }

  /**
   * Создаёт таблицу из шаблона
   */
  createTable(template) {
    // Валидация
    const validation = SchemaValidator.validate(template);
    if (!validation.valid) {
      throw new Error(`Invalid template: ${validation.errors.join(', ')}`);
    }

    // Создаём таблицу
    const table = new TableModel(template);

    // Добавляем колонки
    for (const colConfig of template.columns) {
      const column = new Column(
        colConfig.id,
        colConfig.type,
        {
          label: colConfig.label,
          options: colConfig.options,
          formula: colConfig.formula,
          defaultValue: colConfig.defaultValue,
          width: colConfig.width
        }
      );
      table.addColumn(column);
    }

    return table;
  }

  /**
   * Получает конфигурацию типа
   */
  getType(typeName) {
    return this.customTypes.get(typeName) || this.columnTypes[typeName];
  }
}

// ============================================================================
// TEMPLATE MANAGER - Оркестратор системы
// ============================================================================

/**
 * Менеджер шаблонов - публичный API системы
 */
class TemplateManager {
  constructor() {
    this.templates = new Map();
    this.schemaEngine = new SchemaEngine();
    this.tables = new Map();
  }

  /**
   * Регистрирует шаблон
   */
  registerTemplate(name, templateConfig) {
    const template = {
      id: name,
      name: templateConfig.name || name,
      ...templateConfig
    };
    this.templates.set(name, template);
    return template;
  }

  /**
   * Получает шаблон
   */
  getTemplate(name) {
    return this.templates.get(name);
  }

  /**
   * Создаёт таблицу из шаблона
   * @param {string} templateName - имя шаблона
   * @param {Object} options - опции (rules, initialData)
   */
  createTable(templateName, options = {}) {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Создаём таблицу через SchemaEngine
    const table = this.schemaEngine.createTable(template);

    // Создаём движки
    table.formulaEngine = new FormulaEngine(table);
    table.ruleEngine = new RuleEngine(table);

    // Регистрируем формулы из шаблона
    if (template.columns) {
      for (const col of template.columns) {
        if (col.type === ColumnType.FORMULA && col.formula) {
          table.formulaEngine.registerFormula(col.id, col.formula);
        }
      }
    }

    // Регистрируем правила из шаблона
    if (template.rules) {
      for (const rule of template.rules) {
        table.ruleEngine.registerRule(rule);
      }
    }

    // Добавляем начальные данные
    if (options.initialData && Array.isArray(options.initialData)) {
      for (const rowData of options.initialData) {
        this._addRowWithLogic(table, rowData);
      }
    }

    this.tables.set(table.id, table);
    return table;
  }

  /**
   * Добавляет строку с выполнением правил и пересчётом формул
   */
  _addRowWithLogic(table, data = {}) {
    const row = table.createRow(data);
    
    // Выполняем правила onRowInsert
    table.ruleEngine.onRowInsert(row);
    
    // Пересчитываем формулы
    table.formulaEngine.onRowAdded(row);
    
    return row;
  }

  /**
   * Обновляет значение ячейки с триггерами правил
   */
  setCellValue(table, rowId, columnId, value) {
    const row = table.getRow(rowId);
    if (!row) return false;

    const cell = row.cells[columnId];
    if (!cell) return false;

    const oldValue = cell.value;
    cell.value = value;
    cell.computedValue = null;

    // Выполняем правила onCellChange
    table.ruleEngine.onCellChange(rowId, columnId, oldValue, value);

    // Пересчитываем формулы
    table.formulaEngine.recalculateCell(rowId, columnId);

    return true;
  }

  /**
   * Удаляет таблицу
   */
  removeTable(tableId) {
    this.tables.delete(tableId);
  }

  /**
   * Получает таблицу
   */
  getTable(tableId) {
    return this.tables.get(tableId);
  }

  /**
   * Экспорт шаблона в JSON
   */
  exportTemplate(templateName) {
    const template = this.templates.get(templateName);
    if (!template) return null;
    return JSON.stringify(template, null, 2);
  }

  /**
   * Импорт шаблона из JSON
   */
  importTemplate(json) {
    try {
      const template = JSON.parse(json);
      return this.registerTemplate(template.id || template.name, template);
    } catch (error) {
      throw new Error(`Invalid template JSON: ${error.message}`);
    }
  }
}

// ============================================================================
// ЭКСПОРТ
// ============================================================================

module.exports = {
  // Основные классы
  TemplateManager,
  SchemaEngine,
  FormulaEngine,
  RuleEngine,
  
  // Модели данных
  TableModel,
  Column,
  Row,
  Cell,
  
  // Утилиты
  FormulaParser,
  DependencyGraph,
  SchemaValidator,
  
  // Константы
  ColumnType,
  RuleTrigger,
  ConditionOperators
};
