/**
 * Система отслеживания зависимостей формул
 * Для реактивного обновления ячеек при изменении зависимых значений
 */

// Карта зависимостей: ячейка -> какие ячейки от неё зависят
const dependenciesMap = new Map<string, Set<string>>();

// Карта формул: ячейка -> формула
const formulasMap = new Map<string, string>();

/**
 * Извлечь ссылки на ячейки из формулы
 */
export function extractCellReferences(formula: string): string[] {
  const refs: string[] = [];
  const refRegex = /([A-Z]+)(\d+)/gi;
  let match;
  
  while ((match = refRegex.exec(formula)) !== null) {
    const col = match[1].toUpperCase();
    const row = match[2];
    refs.push(`${col}${row}`);
  }
  
  return [...new Set(refs)]; // Удалить дубликаты
}

/**
 * Зарегистрировать формулу для ячейки
 */
export function registerFormula(cellRef: string, formula: string, saveCallback?: (ref: string, formula: string) => void): void {
  // Удалить старые зависимости
  removeFormula(cellRef);
  
  // Сохранить формулу
  formulasMap.set(cellRef, formula);
  
  // Вызвать callback для сохранения в state
  if (saveCallback) {
    saveCallback(cellRef, formula);
  }
  
  // Извлечь зависимости
  const refs = extractCellReferences(formula);
  
  // Добавить новые зависимости
  for (const ref of refs) {
    if (!dependenciesMap.has(ref)) {
      dependenciesMap.set(ref, new Set());
    }
    dependenciesMap.get(ref)!.add(cellRef);
  }
}

/**
 * Удалить формулу из ячейки
 */
export function removeFormula(cellRef: string): void {
  const formula = formulasMap.get(cellRef);
  if (formula) {
    const refs = extractCellReferences(formula);
    for (const ref of refs) {
      const deps = dependenciesMap.get(ref);
      if (deps) {
        deps.delete(cellRef);
        if (deps.size === 0) {
          dependenciesMap.delete(ref);
        }
      }
    }
    formulasMap.delete(cellRef);
  }
}

/**
 * Получить все зависимые ячейки (которые нужно обновить)
 */
export function getDependentCells(cellRef: string, visited = new Set<string>()): string[] {
  const result: string[] = [];
  const deps = dependenciesMap.get(cellRef);
  
  if (!deps) return result;
  
  for (const dep of deps) {
    if (visited.has(dep)) continue;
    visited.add(dep);
    result.push(dep);
    
    // Рекурсивно получить зависимые ячейки
    const nested = getDependentCells(dep, visited);
    result.push(...nested);
  }
  
  return result;
}

/**
 * Очистить все зависимости
 */
export function clearDependencies(): void {
  dependenciesMap.clear();
  formulasMap.clear();
}

/**
 * Получить карту всех формул
 */
export function getFormulasMap(): Map<string, string> {
  return new Map(formulasMap);
}
