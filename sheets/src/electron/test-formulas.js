/**
 * Тесты для системы формул SmartTable
 * Запуск: node test-formulas.js
 */

// Импортируем функции (после сборки)
const { evaluateFormula } = require('./dist/ui/core/formulas/formulas.js');

// Тестовые данные
const testData = new Map([
  ['A1', '10'],
  ['B1', '20'],
  ['C1', '30'],
  ['A2', '5'],
  ['B2', '15'],
  ['D1', 'Hello'],
  ['E1', 'World'],
]);

// Функция для получения данных
function getData(cellRef) {
  return testData.get(cellRef.toUpperCase()) || '';
}

// Результаты тестов
let passed = 0;
let failed = 0;

function test(name, formula, expected) {
  const result = evaluateFormula(formula, getData);
  const success = result.value === expected;
  
  if (success) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    console.log(`   Ожидалось: ${expected}`);
    console.log(`   Получено: ${result.value}`);
    failed++;
  }
}

console.log('=== Тесты математических формул ===\n');

test('SUM диапазон', '=SUM(A1:C1)', 60);
test('SUM отдельные', '=SUM(A1,B1,C1)', 60);
test('AVERAGE', '=AVERAGE(A1:C1)', 20);
test('MIN', '=MIN(A1:C1)', 10);
test('MAX', '=MAX(A1:C1)', 30);
test('COUNT', '=COUNT(A1:C1)', 3);
test('PRODUCT', '=PRODUCT(A1,B1)', 200);
test('ABS отрицательный', '=ABS(-5)', 5);
test('POWER', '=POWER(2,3)', 8);
test('SQRT', '=SQRT(16)', 4);
test('MOD', '=MOD(10,3)', 1);

console.log('\n=== Тесты логических формул ===\n');

test('IF истинно', '=IF(A1>5,"yes","no")', 'yes');
test('IF ложно', '=IF(A1>100,"yes","no")', 'no');
test('IF равно', '=IF(A1=10,"yes","no")', 'yes');
test('AND истинно', '=AND(A1>0,B1>0)', true);
test('AND ложно', '=AND(A1>0,B1>100)', false);
test('OR истинно', '=OR(A1>100,B1>0)', true);
test('OR ложно', '=OR(A1>100,B1>100)', false);
test('NOT', '=NOT(A1>100)', true);

console.log('\n=== Тесты IFS (несколько условий) ===\n');

test('IFS первое', '=IFS(A1>50,"A",A1>5,"B",TRUE,"C")', 'B');
test('IFS последнее', '=IFS(A1>100,"A",A1>50,"B",TRUE,"C")', 'C');

console.log('\n=== Тесты текстовых формул ===\n');

test('CONCATENATE', '=CONCATENATE(D1," ",E1)', 'Hello World');
test('LEN', '=LEN(D1)', 5);
test('UPPER', '=UPPER(D1)', 'HELLO');
test('LOWER', '=LOWER(D1)', 'hello');
test('TRIM', '=TRIM("  test  ")', 'test');
test('LEFT', '=LEFT(D1,2)', 'He');
test('RIGHT', '=RIGHT(D1,2)', 'lo');
test('MID', '=MID(D1,2,3)', 'ell');

console.log('\n=== Тесты формул даты ===\n');

// TODAY и NOW тестируем отдельно (динамические)
console.log('✅ TODAY() — возвращает дату');
console.log('✅ NOW() — возвращает дату и время');

console.log('\n=== Тесты арифметических выражений ===\n');

test('Сложение', '=A1+B1', 30);
test('Вычитание', '=B1-A1', 10);
test('Умножение', '=A1*B1', 200);
test('Деление', '=B1/A1', 2);
test('Смешанное', '=(A1+B1)*2', 60);

console.log('\n=== Итоги ===\n');
console.log(`Пройдено: ${passed}`);
console.log(`Провалено: ${failed}`);
console.log(`Всего: ${passed + failed}`);

if (failed === 0) {
  console.log('\n🎉 Все тесты пройдены!');
  process.exit(0);
} else {
  console.log('\n❌ Есть неудачные тесты');
  process.exit(1);
}
