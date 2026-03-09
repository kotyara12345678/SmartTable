/**
 * FormulaEngine
 * Ответственность:
 * - Парсинг формул
 * - Построение DAG зависимостей
 * - Инкрементальный пересчёт (только затронутые ячейки)
 * - Топологическая сортировка для порядка вычислений
 * 
 * Оптимизация для 50k+ строк:
 * - Ленивое вычисление
 * - Кэширование результатов
 * - Минимальный пересчёт при изменении
 */

export class FormulaEngine {
  constructor(schemaEngine, dataStore) {
    this._schemaEngine = schemaEngine;
    this._dataStore = dataStore;
    this._formulas = new Map(); // colId -> формула
    this._dependencies = new Map(); // colId -> Set<зависимых колонок>
    this._reverseDeps = new Map(); // colId -> Set<кто зависит от этой колонки>
    this._cache = new Map(); // rowId -> { colId -> value }
    this._evalCache = new Map(); // formula string -> Function
  }

  /**
   * Регистрация формулы для колонки
   * @param {string} colId - ID колонки
   * @param {string} formula - Формула (например: "amount * 0.19 / 1.19")
   */
  registerFormula(colId, formula) {
    const col = this._schemaEngine.getColumn(colId);
    if (!col || col.type !== 'formula') {
      throw new Error(`Column ${colId} is not a formula column`);
    }

    this._formulas.set(colId, formula);
    this._parseDependencies(colId, formula);
    this._invalidateAllCache();
  }

  /**
   * Парсинг зависимостей из формулы
   * Находит все ссылки на другие колонки в формуле
   */
  _parseDependencies(colId, formula) {
    const deps = new Set();
    const columns = this._schemaEngine.getColumns();
    
    // Ищем ссылки на колонки в формате: [colId] или просто colId
    const tokens = formula.match(/\[?[a-zA-Z_][a-zA-Z0-9_]*\]?/g) || [];
    
    for (const token of tokens) {
      const cleanId = token.replace(/[\[\]]/g, '');
      // Проверяем, существует ли такая колонка и это не мы сами
      if (cleanId !== colId && this._schemaEngine.getColumn(cleanId)) {
        deps.add(cleanId);
      }
    }

    this._dependencies.set(colId, deps);

    // Обновляем обратные зависимости
    for (const dep of deps) {
      if (!this._reverseDeps.has(dep)) {
        this._reverseDeps.set(dep, new Set());
      }
      this._reverseDeps.get(dep).add(colId);
    }
  }

  /**
   * Получить все колонки, которые нужно пересчитать при изменении colId
   * Использует BFS для обхода графа зависимостей
   */
  _getAffectedColumns(colId) {
    const affected = new Set();
    const queue = [colId];
    const visited = new Set();

    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);

      const dependents = this._reverseDeps.get(current);
      if (dependents) {
        for (const dep of dependents) {
          affected.add(dep);
          queue.push(dep);
        }
      }
    }

    return affected;
  }

  /**
   * Получить топологический порядок вычисления для колонок
   * Гарантирует, что зависимости вычисляются первыми
   */
  _getEvaluationOrder(colIds) {
    const order = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (colId) => {
      if (visited.has(colId)) return;
      if (visiting.has(colId)) {
        throw new Error(`Circular dependency detected: ${colId}`);
      }
      
      visiting.add(colId);
      
      const deps = this._dependencies.get(colId);
      if (deps) {
        for (const dep of deps) {
          if (colIds.has(dep) || this._formulas.has(dep)) {
            visit(dep);
          }
        }
      }
      
      visiting.delete(colId);
      visited.add(colId);
      
      if (colIds.has(colId)) {
        order.push(colId);
      }
    };

    for (const colId of colIds) {
      visit(colId);
    }

    return order;
  }

  /**
   * Вычислить значение формулы для строки
   * @param {string} rowId - ID строки
   * @param {string} colId - ID колонки
   * @param {boolean} useCache - Использовать ли кэш
   */
  evaluate(rowId, colId, useCache = true) {
    const cacheKey = `${rowId}:${colId}`;
    
    if (useCache && this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey);
    }

    const formula = this._formulas.get(colId);
    if (!formula) {
      return this._dataStore.getValue(rowId, colId);
    }

    // Получаем контекст для вычисления (значения зависимых колонок)
    const context = this._buildContext(rowId, colId);
    
    try {
      const result = this._evaluateFormula(formula, context);
      this._cache.set(cacheKey, result);
      return result;
    } catch (e) {
      console.error(`Formula error in ${colId}:`, e);
      return '#ERROR';
    }
  }

  /**
   * Построение контекста для формулы
   */
  _buildContext(rowId, colId) {
    const context = {};
    const deps = this._dependencies.get(colId) || new Set();

    for (const depId of deps) {
      const depCol = this._schemaEngine.getColumn(depId);
      if (depCol.type === 'formula') {
        // Рекурсивное вычисление зависимых формул
        context[depId] = this.evaluate(rowId, depId, true);
      } else {
        context[depId] = this._dataStore.getValue(rowId, depId);
      }
    }

    return context;
  }

  /**
   * Безопасное вычисление формулы
   * Использует Function вместо eval для лучшей производительности
   */
  _evaluateFormula(formula, context) {
    let fn = this._evalCache.get(formula);
    
    if (!fn) {
      // Создаём функцию с контекстом переменных
      const keys = Object.keys(context);
      const values = Object.values(context);
      
      // Заменяем [colId] на colId для совместимости
      const cleanFormula = formula.replace(/\[([a-zA-Z_][a-zA-Z0-9_]*)\]/g, '$1');
      
      fn = new Function(...keys, `return ${cleanFormula};`);
      this._evalCache.set(formula, fn);
    }

    const values = Object.values(context).map(v => 
      typeof v === 'number' ? v : (v === '' || v === null ? 0 : Number(v) || 0)
    );
    
    return fn(...values);
  }

  /**
   * Пересчёт при изменении ячейки
   * @param {string} rowId - ID строки
   * @param {string} colId - Изменённая колонка
   */
  recalculateForRow(rowId, colId) {
    const affectedCols = this._getAffectedColumns(colId);
    if (affectedCols.size === 0) return [];

    const order = this._getEvaluationOrder(affectedCols);
    const updated = [];

    // Очищаем кэш для затронутых колонок этой строки
    for (const affectedCol of affectedCols) {
      this._cache.delete(`${rowId}:${affectedCol}`);
    }

    // Вычисляем в правильном порядке
    for (const affectedCol of order) {
      const result = this.evaluate(rowId, affectedCol, false);
      this._dataStore.setValue(rowId, affectedCol, result);
      updated.push({ rowId, colId: affectedCol, value: result });
    }

    return updated;
  }

  /**
   * Пересчёт всех строк для колонки
   * Используется при изменении формулы
   */
  recalculateColumn(colId) {
    const rowIds = this._dataStore.getAllRowIds();
    const results = [];

    for (const rowId of rowIds) {
      const result = this.evaluate(rowId, colId, false);
      this._dataStore.setValue(rowId, colId, result);
      results.push({ rowId, colId, value: result });
    }

    return results;
  }

  /**
   * Пересчёт всех формул во всех строках
   * Используется при загрузке шаблона
   */
  recalculateAll() {
    const formulaCols = this._schemaEngine.getFormulaColumns();
    const order = this._getEvaluationOrder(
      new Set(formulaCols.map(c => c.id))
    );

    const rowIds = this._dataStore.getAllRowIds();
    const results = [];

    for (const rowId of rowIds) {
      for (const colId of order) {
        const result = this.evaluate(rowId, colId, false);
        this._dataStore.setValue(rowId, colId, result);
        results.push({ rowId, colId, value: result });
      }
    }

    return results;
  }

  /**
   * Очистка кэша
   */
  _invalidateAllCache() {
    this._cache.clear();
  }

  invalidateRow(rowId) {
    for (const key of this._cache.keys()) {
      if (key.startsWith(`${rowId}:`)) {
        this._cache.delete(key);
      }
    }
  }

  /**
   * Получить формулу колонки
   */
  getFormula(colId) {
    return this._formulas.get(colId);
  }

  /**
   * Получить зависимости колонки
   */
  getDependencies(colId) {
    return this._dependencies.get(colId) || new Set();
  }
}
