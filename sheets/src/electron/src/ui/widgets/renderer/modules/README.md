# Модули Renderer

Папка `modules/` содержит переиспользуемые модули для работы с таблицей.

## Структура

```
renderer/
├── modules/
│   ├── index.ts              # Экспорт всех модулей
│   ├── cell-rendering.ts     # Отрисовка ячеек
│   ├── selection.ts          # Выделение и навигация
│   ├── editing.ts            # Редактирование ячеек
│   ├── scroll.ts             # Прокрутка и виртуализация
│   ├── formatting.ts         # Форматирование текста
│   ├── borders.ts            # Границы ячеек
│   └── column-row.ts         # Управление колонками/строками
└── renderer.ts               # Основной файл
```

## Модули

### cell-rendering.ts
Отрисовка и стилизация ячеек таблицы.

**Функции:**
- `getVisibleRange()` — получить видимый диапазон ячеек
- `createCellElement()` — создать HTML элемент ячейки
- `applyCellStyle()` — применить стили к ячейке
- `updateCellDisplay()` — обновить отображение ячейки
- `exportCellStyle()` — экспортировать стиль ячейки

**Пример:**
```typescript
import { createCellElement, applyCellStyle } from './renderer/modules';

const cell = createCellElement(0, 0, { value: 'Hello' });
applyCellStyle(cell, { color: '#ff0000', bold: true });
```

### selection.ts
Выделение и навигация по ячейкам.

**Функции:**
- `getSelectionBounds()` — получить границы выделения
- `getSelectedCells()` — получить все выделенные ячейки
- `moveSelection()` — переместить выделение
- `selectRow()` — выделить строку
- `selectColumn()` — выделить столбец
- `selectAll()` — выделить всё
- `isCellInRange()` — проверить попадание в диапазон

**Пример:**
```typescript
import { getSelectionBounds, moveSelection } from './renderer/modules';

const bounds = getSelectionBounds(start, end);
const next = moveSelection(current, 'down', 100, 26);
```

### editing.ts
Редактирование ячеек.

**Функции:**
- `startCellEdit()` — начать редактирование
- `finishCellEdit()` — завершить редактирование
- `getCellValue()` — получить значение
- `setCellValue()` — установить значение
- `isFormula()` — проверка на формулу
- `handleEditKeydown()` — обработка клавиш

**Пример:**
```typescript
import { startCellEdit, handleEditKeydown } from './renderer/modules';

startCellEdit(cell, true);
handleEditKeydown(event, {
  onSave: () => finishCellEdit(cell),
  onCancel: () => {},
  onNextRow: () => {},
  onNextCell: () => {}
});
```

### scroll.ts
Прокрутка и виртуализация.

**Функции:**
- `getScrollVisibleRange()` — видимый диапазон при скролле
- `syncScrollHeaders()` — синхронизация заголовков
- `updateFixedHeaders()` — обновление фиксированных заголовков
- `optimizeScroll()` — оптимизация скролла
- `scrollToCell()` — прокрутка к ячейке

**Пример:**
```typescript
import { optimizeScroll, syncScrollHeaders } from './renderer/modules';

const frameRef = { current: null };
optimizeScroll(() => renderVisibleCells(), frameRef);
```

### formatting.ts
Форматирование текста в ячейках.

**Функции:**
- `applyFormatting()` — применить форматирование
- `toggleBold()` — переключить жирный
- `toggleItalic()` — переключить курсив
- `toggleUnderline()` — переключить подчёркивание
- `setTextAlign()` — установить выравнивание
- `getFormat()` — получить текущее форматирование

**Пример:**
```typescript
import { toggleBold, setTextColor } from './renderer/modules';

toggleBold(cell);
setTextColor(cell, '#ff0000');
```

### borders.ts
Границы ячеек.

**Функции:**
- `applyBorders()` — применить границы
- `toggleAllBorders()` — переключить все границы
- `clearBorders()` — очистить границы
- `getBorderState()` — получить состояние границ

**Пример:**
```typescript
import { applyBorders, clearBorders } from './renderer/modules';

applyBorders(cells, { all: true });
clearBorders(cells);
```

### column-row.ts
Управление колонками и строками.

**Функции:**
- `updateColumnWidth()` — обновить ширину колонки
- `updateRowHeight()` — обновить высоту строки
- `autoFitColumn()` — автоподбор ширины
- `insertRow()` — вставить строку
- `deleteColumn()` — удалить колонку

**Пример:**
```typescript
import { autoFitColumn, updateRowHeight } from './renderer/modules';

autoFitColumn(0, cellGrid, columnHeaders);
updateRowHeight(0, 40, rowHeaders, cellGrid);
```

## Использование

Импортируйте нужные функции из корневого index:

```typescript
import {
  createCellElement,
  getSelectionBounds,
  startCellEdit,
  toggleBold,
  applyBorders,
  autoFitColumn
} from './renderer/modules';
```

## Преимущества

1. **Модульность** — каждый модуль отвечает за свою задачу
2. **Переиспользование** — функции можно использовать в разных местах
3. **Тестируемость** — легко покрывать тестами
4. **Читаемость** — код проще понимать и поддерживать
