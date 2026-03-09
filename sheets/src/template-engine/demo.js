/**
 * Demo: Template Engine Usage
 * Примеры использования системы шаблонов SmartTable
 * 
 * Запуск: node demo.js (в среде с поддержкой ES modules)
 * Или импортировать в браузер через <script type="module">
 */

import { TemplateManager } from './index.js';
import { bankTransactionsTemplate } from './templates.js';

// ============================================
// ПРИМЕР 1: Инициализация таблицы с шаблоном
// ============================================

console.log('=== SmartTable Template Engine Demo ===\n');

// Создаём менеджер и инициализируем шаблоном
const manager = new TemplateManager();

// Подписываемся на события
manager.on('init', (data) => {
  console.log(`[EVENT] Инициализирован шаблон: ${data.template.name}`);
});

manager.on('rowCreated', (data) => {
  console.log(`[EVENT] Строка создана: ${data.rowId}`);
});

manager.on('cellUpdated', (data) => {
  console.log(`[EVENT] Ячейка обновлена: ${data.colId} = ${data.value}`);
  if (data.formulaUpdates?.length > 0) {
    data.formulaUpdates.forEach(u => {
      console.log(`  → Пересчитана формула: ${u.colId} = ${u.value}`);
    });
  }
  if (data.ruleChanges?.length > 0) {
    data.ruleChanges.forEach(c => {
      console.log(`  → Правило изменило: ${c.colId} = ${c.value}`);
    });
  }
});

// Инициализируем с шаблоном
manager.init(bankTransactionsTemplate);

console.log('\n--- Колонки таблицы ---');
const columns = manager.getColumns();
columns.forEach(col => {
  const formulaInfo = col.type === 'formula' ? ` (формула: ${col.formula})` : '';
  const optionsInfo = col.options ? ` (опции: ${col.options.join(', ')})` : '';
  console.log(`  • ${col.label} (${col.id}): ${col.type}${formulaInfo}${optionsInfo}`);
});

// ============================================
// ПРИМЕР 2: Создание строк
// ============================================

console.log('\n=== Создание транзакций ===\n');

const row1Id = manager.createRow({
  date: '2025-03-01',
  description: 'Amazon Marketplace',
  amount: 119
});

console.log(`\nТранзакция 1 (ID: ${row1Id}):`);
console.log(`  Description: ${manager.getCellValue(row1Id, 'description')}`);
console.log(`  Amount: ${manager.getCellValue(row1Id, 'amount')} EUR`);
console.log(`  Category: ${manager.getCellValue(row1Id, 'category')} (авто-категоризация!)`);
console.log(`  VAT: ${manager.getCellValue(row1Id, 'vat').toFixed(2)} EUR`);
console.log(`  Net: ${manager.getCellValue(row1Id, 'net').toFixed(2)} EUR`);

const row2Id = manager.createRow({
  date: '2025-03-02',
  description: 'Lidl Supermarket',
  amount: 59.50
});

console.log(`\nТранзакция 2 (ID: ${row2Id}):`);
console.log(`  Description: ${manager.getCellValue(row2Id, 'description')}`);
console.log(`  Amount: ${manager.getCellValue(row2Id, 'amount')} EUR`);
console.log(`  Category: ${manager.getCellValue(row2Id, 'category')} (авто-категоризация!)`);
console.log(`  VAT: ${manager.getCellValue(row2Id, 'vat').toFixed(2)} EUR`);
console.log(`  Net: ${manager.getCellValue(row2Id, 'net').toFixed(2)} EUR`);

const row3Id = manager.createRow({
  date: '2025-03-03',
  description: 'Monthly Salary',
  amount: 3500
});

console.log(`\nТранзакция 3 (ID: ${row3Id}):`);
console.log(`  Description: ${manager.getCellValue(row3Id, 'description')}`);
console.log(`  Amount: ${manager.getCellValue(row3Id, 'amount')} EUR`);
console.log(`  Category: ${manager.getCellValue(row3Id, 'category')} (авто-категоризация!)`);

// ============================================
// ПРИМЕР 3: Обновление ячеек с триггерами правил
// ============================================

console.log('\n=== Обновление ячеек (триггеры правил) ===\n');

// Создаём транзакцию без категории
const row4Id = manager.createRow({
  date: '2025-03-04',
  description: 'Some Store',
  amount: 200,
  category: 'Other'
});

console.log(`До изменения: category = ${manager.getCellValue(row4Id, 'category')}`);

// Изменяем описание на "amazon" - сработает правило авто-категоризации
manager.updateCell(row4Id, 'description', 'Amazon DE');

console.log(`После изменения description на "Amazon DE":`);
console.log(`  Category = ${manager.getCellValue(row4Id, 'category')} (изменено правилом!)`);

// Изменяем сумму - формулы пересчитаются автоматически
console.log('\nИзменяем amount с 200 на 238:');
manager.updateCell(row4Id, 'amount', 238);

console.log(`  Amount: ${manager.getCellValue(row4Id, 'amount')} EUR`);
console.log(`  VAT: ${manager.getCellValue(row4Id, 'vat').toFixed(2)} EUR (пересчитано!)`);
console.log(`  Net: ${manager.getCellValue(row4Id, 'net').toFixed(2)} EUR (пересчитано!)`);

// ============================================
// ПРИМЕР 4: Массовая вставка (оптимизировано)
// ============================================

console.log('\n=== Массовая вставка 1000 строк ===\n');

const bulkData = [];
const descriptions = ['Amazon', 'Lidl', 'Bolt', 'Salary', 'Other Purchase'];
const categories = ['Purchases', 'Food', 'Transport', 'Income', 'Other'];

for (let i = 0; i < 1000; i++) {
  bulkData.push({
    date: `2025-03-${String((i % 28) + 1).padStart(2, '0')}`,
    description: `${descriptions[i % 5]} transaction ${i}`,
    amount: Math.round((Math.random() * 500 + 10) * 100) / 100
  });
}

const startTime = performance.now();
const rowIds = manager.bulkInsert(bulkData);
const endTime = performance.now();

console.log(`Вставлено строк: ${rowIds.length}`);
console.log(`Время выполнения: ${(endTime - startTime).toFixed(2)} ms`);
console.log(`Всего строк в таблице: ${manager.getRowCount()}`);

// ============================================
// ПРИМЕР 5: Динамическое добавление правила
// ============================================

console.log('\n=== Динамическое добавление правила ===\n');

manager.addRule({
  id: 'auto-bolt-transport',
  trigger: 'onCellChange',
  condition: {
    column: 'description',
    operator: 'contains',
    value: 'bolt'
  },
  actions: [
    { type: 'setValue', column: 'category', value: 'Transport' }
  ],
  priority: 10
});

const row5Id = manager.createRow({
  date: '2025-03-05',
  description: 'Bolt Ride',
  amount: 15
});

console.log(`Транзакция с "Bolt Ride":`);
console.log(`  Category: ${manager.getCellValue(row5Id, 'category')} (новое правило!)`);

// ============================================
// ПРИМЕР 6: Получение всех данных
// ============================================

console.log('\n=== Первые 5 строк таблицы ===\n');

const firstRows = manager.getRowsInRange(0, 5);
firstRows.forEach(({ id, data }, index) => {
  console.log(`Строка ${index + 1}:`);
  console.log(`  ${data.description} | ${data.amount} EUR | ${data.category}`);
  console.log(`  VAT: ${data.vat.toFixed(2)} | Net: ${data.net.toFixed(2)}`);
});

// ============================================
// ПРИМЕР 7: Экспорт/Импорт состояния
// ============================================

console.log('\n=== Экспорт/Импорт состояния ===\n');

const exportedState = manager.exportState();
console.log(`Экспортировано:`);
console.log(`  - Шаблон: ${exportedState.template.name}`);
console.log(`  - Правил: ${exportedState.rules.length}`);
console.log(`  - Строк данных: ${exportedState.data.length}`);

// ============================================
// ПРИМЕР 8: Производительность на больших данных
// ============================================

console.log('\n=== Тест производительности (50,000 строк) ===\n');

const manager2 = new TemplateManager();
manager2.init(bankTransactionsTemplate);

const largeBulkData = [];
for (let i = 0; i < 50000; i++) {
  largeBulkData.push({
    date: '2025-03-01',
    description: `Transaction ${i}`,
    amount: Math.round(Math.random() * 1000 * 100) / 100
  });
}

const perfStart = performance.now();
manager2.bulkInsert(largeBulkData);
const perfEnd = performance.now();

console.log(`Строк создано: ${manager2.getRowCount().toLocaleString()}`);
console.log(`Время выполнения: ${(perfEnd - perfStart).toFixed(2)} ms`);
console.log(`Строк в секунду: ${Math.round(50000 / ((perfEnd - perfStart) / 1000)).toLocaleString()}`);

// Тест обновления ячейки с пересчётом формул
const testRowId = manager2.getAllRowIds()[0];
const updateStart = performance.now();
manager2.updateCell(testRowId, 'amount', 999);
const updateEnd = performance.now();

console.log(`\nОбновление 1 ячейки с пересчётом формул:`);
console.log(`  Время: ${(updateEnd - updateStart).toFixed(4)} ms`);
console.log(`  VAT: ${manager2.getCellValue(testRowId, 'vat').toFixed(2)}`);
console.log(`  Net: ${manager2.getCellValue(testRowId, 'net').toFixed(2)}`);

// ============================================
// ИТОГИ
// ============================================

console.log('\n=== Итоги демонстрации ===\n');
console.log('✓ SchemaEngine: валидация схемы, типы данных, конвертация');
console.log('✓ FormulaEngine: DAG зависимостей, инкрементальный пересчёт');
console.log('✓ RuleEngine: триггеры onRowInsert/onCellChange, условия, действия');
console.log('✓ TemplateManager: оркестрация, события, массовые операции');
console.log('✓ Производительность: 50,000 строк с формулами обрабатываются быстро');
console.log('\nTemplate Engine готов к интеграции с UI!');
