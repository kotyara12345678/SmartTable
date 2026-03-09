# Template Engine Architecture

## Обзор

Template Engine превращает таблицы SmartTable в логически управляемые мини-приложения. Шаблоны определяют не только структуру данных, но и бизнес-логику: формулы, правила автоматизации, значения по умолчанию.

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                     TemplateManager                         │
│  • Загрузка шаблонов                                        │
│  • Инициализация движков                                    │
│  • Оркестрация событий                                      │
│  • Публичный API для UI                                     │
└─────────────────────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  SchemaEngine   │ │  FormulaEngine  │ │   RuleEngine    │
│                 │ │                 │ │                 │
│  • Валидация    │ │  • Парсинг      │ │  • Триггеры     │
│  • Колонки      │ │  • DAG          │ │  • Условия      │
│  • Типы         │ │  • Пересчёт     │ │  • Действия     │
│  • Конвертация  │ │  • Кэширование  │ │  • Приоритеты   │
└─────────────────┘ └─────────────────┘ └─────────────────┘
         │              │              │
         └──────────────┼──────────────┘
                        ▼
              ┌─────────────────┐
              │   DataStore     │
              │  • Хранение     │
              │  • 50k+ строк   │
              │  • Виртуализация│
              └─────────────────┘
```

## Модули

### TemplateManager

**Ответственность:**
- Загрузка и валидация шаблонов
- Инициализация всех движков
- Применение шаблона к таблице
- Оркестрация событий между модулями
- Предоставление публичного API для UI

**Ключевые методы:**
```javascript
manager.init(template)           // Инициализация с шаблоном
manager.createRow(data)          // Создание строки
manager.updateCell(rowId, col, value)  // Обновление ячейки
manager.bulkInsert(rowsData)     // Массовая вставка
manager.getRowsInRange(start, end)  // Для виртуализации
manager.exportState()            // Экспорт состояния
manager.importState(state)       // Импорт состояния
```

**События:**
```javascript
manager.on('init', data => {...})
manager.on('rowCreated', data => {...})
manager.on('cellUpdated', data => {...})
manager.on('rowDeleted', data => {...})
manager.on('bulkInsert', data => {...})
```

### SchemaEngine

**Ответственность:**
- Валидация схемы шаблона
- Создание и управление колонками
- Типы данных и конвертация значений
- Метаданные колонок

**Поддерживаемые типы:**
- `text` - текстовые значения
- `number` - числа (с валидацией)
- `date` - даты (ISO формат)
- `select` - выпадающий список с опциями
- `formula` - вычисляемые значения (только чтение)

**Ключевые методы:**
```javascript
schema.init(template)            // Инициализация схемы
schema.getColumn(colId)          // Конфигурация колонки
schema.getColumns()              // Все колонки
schema.getFormulaColumns()       // Только формулы
schema.convertValue(colId, val)  // Конвертация по типу
schema.createRow()               // Строка с default
schema.validateRow(row)          // Валидация
```

### FormulaEngine

**Ответственность:**
- Парсинг формул и извлечение зависимостей
- Построение DAG (Directed Acyclic Graph) зависимостей
- Топологическая сортировка для порядка вычислений
- Инкрементальный пересчёт (только затронутые ячейки)
- Кэширование результатов

**Оптимизации для 50k+ строк:**
- Ленивое вычисление формул
- Кэширование скомпилированных функций
- Пересчёт только зависимых колонок
- BFS для определения затронутых колонок

**Пример формул:**
```javascript
// Простые формулы
vat = amount * 0.19 / 1.19
net = amount - vat

// С зависимостями
totalCost = quantity * costPrice
margin = sellingPrice - costPrice
marginPercent = costPrice > 0 ? (margin / costPrice) * 100 : 0

// С ссылками на другие колонки
balance = [income] - [expenses]
```

**Ключевые методы:**
```javascript
formula.registerFormula(colId, formula)  // Регистрация
formula.evaluate(rowId, colId)           // Вычисление
formula.recalculateForRow(rowId, colId)  // Пересчёт строки
formula.recalculateColumn(colId)         // Пересчёт колонки
formula.recalculateAll()                 // Полный пересчёт
```

### RuleEngine

**Ответственность:**
- Регистрация правил автоматизации
- Триггеры: `onRowInsert`, `onCellChange`
- Вычисление условий (операторы сравнения)
- Выполнение действий

**Триггеры:**
- `onRowInsert` - при создании строки
- `onCellChange` - при изменении ячейки

**Операторы условий:**
- `equals`, `notEquals`
- `contains`, `startsWith`, `endsWith`
- `greaterThan`, `lessThan`, `greaterOrEqual`, `lessOrEqual`
- `isEmpty`, `isNotEmpty`
- `in`, `notIn`
- `regex`

**Типы действий:**
- `setValue` - установить значение
- `clearValue` - очистить значение
- `copyFrom` - скопировать из другой колонки
- `calculate` - вычислить по выражению

**Пример правила:**
```javascript
{
  id: "auto-amazon",
  trigger: "onCellChange",
  condition: {
    column: "description",
    operator: "contains",
    value: "amazon"
  },
  actions: [
    { type: "setValue", column: "category", value: "Purchases" }
  ],
  priority: 10
}
```

### DataStore

**Ответственность:**
- Эффективное хранение данных
- Поддержка 50k+ строк
- Виртуализация (диапазоны строк)
- Массовые операции

**Оптимизации:**
- Map для O(1) доступа к строкам
- Минимальные аллокации памяти
- Пакетное обновление

## Формат шаблона

```json
{
  "name": "Bank Transactions",
  "version": "1.0",
  "description": "Учёт транзакций",
  
  "columns": [
    {
      "id": "date",
      "type": "date",
      "label": "Дата",
      "defaultValue": null
    },
    {
      "id": "description",
      "type": "text",
      "label": "Описание"
    },
    {
      "id": "amount",
      "type": "number",
      "label": "Сумма",
      "defaultValue": 0
    },
    {
      "id": "category",
      "type": "select",
      "label": "Категория",
      "options": ["Food", "Transport", "Purchases"],
      "defaultValue": "Other"
    },
    {
      "id": "vat",
      "type": "formula",
      "label": "НДС",
      "formula": "amount * 0.19 / 1.19"
    },
    {
      "id": "net",
      "type": "formula",
      "label": "Нетто",
      "formula": "amount - vat"
    }
  ],
  
  "rules": [
    {
      "id": "auto-categorize",
      "trigger": "onCellChange",
      "condition": {
        "column": "description",
        "operator": "contains",
        "value": "amazon"
      },
      "actions": [
        { "type": "setValue", "column": "category", "value": "Purchases" }
      ],
      "priority": 10
    }
  ]
}
```

## Поток данных

### Создание строки

```
1. TemplateManager.createRow(data)
   ↓
2. SchemaEngine.createRow() → default значения
   ↓
3. DataStore.addRow() → сохранение
   ↓
4. RuleEngine.onRowInsert() → правила
   ↓
5. FormulaEngine.evaluate() → формулы
   ↓
6. Emit 'rowCreated'
```

### Обновление ячейки

```
1. TemplateManager.updateCell(rowId, colId, value)
   ↓
2. SchemaEngine.convertValue() → конвертация
   ↓
3. DataStore.setValue() → сохранение
   ↓
4. RuleEngine.onCellChange() → правила
   ↓
5. FormulaEngine.recalculateForRow() → зависимые формулы
   ↓
6. Emit 'cellUpdated'
```

## Интеграция с UI

```javascript
import { TemplateManager } from './template-engine/index.js';

// Инициализация
const manager = new TemplateManager();
manager.init(myTemplate);

// Подписка на события для обновления UI
manager.on('cellUpdated', (data) => {
  // Обновить ячейку в UI
  renderCell(data.rowId, data.colId, data.value);
  
  // Обновить зависимые формулы
  data.formulaUpdates.forEach(u => {
    renderCell(u.rowId, u.colId, u.value);
  });
  
  // Обновить изменения от правил
  data.ruleChanges.forEach(c => {
    renderCell(c.rowId, c.colId, c.value);
  });
});

// Рендеринг с виртуализацией
function renderVisibleRows(start, end) {
  const rows = manager.getRowsInRange(start, end);
  rows.forEach(({ id, data }) => renderRow(id, data));
}

// Обработчики UI
function onCellChange(rowId, colId, value) {
  manager.updateCell(rowId, colId, value);
}

function onAddRow() {
  const rowId = manager.createRow();
  renderRow(rowId, manager.getRow(rowId));
}
```

## Производительность

### Бенчмарки (ориентировочные)

| Операция | 1,000 строк | 10,000 строк | 50,000 строк |
|----------|-------------|--------------|--------------|
| bulkInsert | ~50ms | ~500ms | ~2500ms |
| updateCell | <1ms | <1ms | <1ms |
| recalc formulas | ~10ms | ~100ms | ~500ms |

### Рекомендации

1. **Используйте `bulkInsert`** для массовой загрузки данных
2. **Виртуализация UI** - рендерьте только видимые строки
3. **Дебаунс изменений** при быстром вводе
4. **Ленивая загрузка** формул - вычисляйте только при отображении
5. **Web Workers** для тяжёлых вычислений в фоне

## Расширение

### Добавление нового типа колонки

```javascript
// В SchemaEngine._typeValidators
this._typeValidators['currency'] = (v) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n.toFixed(2);
};
```

### Добавление нового оператора правил

```javascript
// В RuleEngine._evaluateCondition
case 'between':
  const [min, max] = value;
  return cellValue >= min && cellValue <= max;
```

### Добавление нового типа действия

```javascript
// В RuleEngine._executeActions
case 'increment':
  const current = this._dataStore.getValue(rowId, action.column);
  const newValue = Number(current) + action.value;
  this._dataStore.setValue(rowId, action.column, newValue);
```

## Заключение

Template Engine предоставляет мощную систему для создания умных таблиц с минимальными усилиями. Шаблоны инкапсулируют бизнес-логику, делая таблицы переиспользуемыми компонентами.
