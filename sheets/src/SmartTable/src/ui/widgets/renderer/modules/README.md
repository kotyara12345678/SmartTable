# Модули Renderer

Папка `modules/` содержит переиспользуемые модули для работы с таблицей.

## Структура

```
renderer/
├── modules/
│   ├── index.ts              # Экспорт всех модулей
│   ├── utils.ts              # Утилитарные функции
│   ├── state.ts              # Управление состоянием
│   ├── cell-rendering.ts     # Отрисовка ячеек
│   ├── selection.ts          # Выделение и навигация
│   ├── editing.ts            # Редактирование ячеек
│   ├── scroll.ts             # Прокрутка и виртуализация
│   ├── formatting.ts         # Форматирование текста
│   ├── borders.ts            # Границы ячеек
│   ├── column-row.ts         # Управление колонками/строками
│   ├── data-validation.ts    # Валидация данных (dropdown)
│   ├── undo-redo.ts          # Отмена/повтор действий
│   ├── formulas.ts           # Формулы и реактивность
│   ├── context-menu.ts       # Контекстное меню
│   └── autosave.ts           # Автосохранение
└── renderer.ts               # Основной файл
```

## Модули

### utils.ts
Утилитарные функции для работы с ячейками и преобразований.

**Функции:**
- `colToLetter()` — преобразовать номер колонки в букву (0 → A)
- `letterToCol()` — преобразовать букву в номер колонки (A → 0)
- `getCellId()` — получить ID ячейки (A1, B2)
- `getCellKey()` — получить ключ ячейки для Map (row-col)
- `parseCellKey()` — разобрать ключ ячейки обратно в row и col
- `isFormula()` — проверить является ли значение формулой
- `hashStyle()` — вычислить хэш стиля для кэширования

**Пример:**
```typescript
import { colToLetter, getCellKey, isFormula } from './renderer/modules';

const colName = colToLetter(0); // 'A'
const key = getCellKey(0, 0); // '0-0'
const isFormula = isFormula('=SUM(A1:B2)'); // true
```

### state.ts
Управление состоянием и данными таблицы.

**Интерфейсы:**
- `CellData` — данные ячейки (value, formula, style)
- `TableState` — состояние таблицы

**Функции:**
- `getCurrentData()` — получить данные текущего листа
- `getSheetData()` — получить данные указанного листа
- `setCellValue()` — установить значение ячейки
- `getCellValue()` — получить значение ячейки
- `deleteCellValue()` — удалить значение ячейки
- `clearAllData()` — очистить все данные
- `switchSheet()` — переключиться на другой лист
- `exportData()` — экспортировать данные для сохранения
- `importData()` — импортировать данные из сохранения

**Пример:**
```typescript
import { getCurrentData, setCellValue } from './renderer/modules';

const data = getCurrentData(state);
setCellValue(state, 0, 0, { value: 'Hello', formula: '=A1' });
```

### cell-rendering.ts
Отрисовка и стилизация ячеек таблицы.

**Интерфейсы:**
- `RenderState` — состояние рендеринга
- `CellStyle` — стиль ячейки
- `CellData` — данные ячейки
- `CellCacheEntry` — запись кэша ячейки
- `RenderConfig` — конфигурация рендеринга

**Функции:**
- `getVisibleRange()` — получить видимый диапазон ячеек
- `calculateVisibleRangeWithBuffer()` — видимый диапазон с буфером
- `createCellElement()` — создать HTML элемент ячейки
- `createAbsoluteCellElement()` — создать ячейку с абсолютным позиционированием
- `applyCellStyle()` — применить стили к ячейке
- `updateCellDisplay()` — обновить отображение ячейки
- `hashStyle()` — вычислить хэш стиля
- `cleanupCellCache()` — очистить старые ячейки из кэша
- `setGridSize()` — установить размеры сетки
- `restoreSelection()` — восстановить выделение
- `getSelectedCellsFromDOM()` — получить выделенные ячейки из DOM

**Пример:**
```typescript
import { createCellElement, applyCellStyle, cleanupCellCache } from './renderer/modules';

const cell = createCellElement(0, 0, { value: 'Hello' });
applyCellStyle(cell, { color: '#ff0000', bold: true });
cleanupCellCache(cellCache, 5000);
```

### selection.ts
Выделение и навигация по ячейкам.

**Интерфейсы:**
- `CellPosition` — позиция ячейки
- `SelectionState` — состояние выделения
- `SelectionConfig` — конфигурация выделения

**Функции:**
- `getSelectionBounds()` — получить границы выделения
- `getSelectedCells()` — получить все выделенные ячейки
- `moveSelection()` — переместить выделение
- `selectRow()` — выделить строку
- `selectColumn()` — выделить столбец
- `selectAll()` — выделить всё
- `isCellInRange()` — проверить попадание в диапазон
- `getSelectionRange()` — получить диапазон выделения
- `startSelection()` — начать выделение
- `endSelection()` — завершить выделение
- `clearSelection()` — очистить выделение
- `getActiveCell()` — получить активную ячейку

**Пример:**
```typescript
import { getSelectionBounds, moveSelection, startSelection } from './renderer/modules';

const bounds = getSelectionBounds(start, end);
const next = moveSelection(current, 'down', 100, 26);
startSelection(state, { row: 0, col: 0 });
```

### editing.ts
Редактирование ячеек.

**Интерфейсы:**
- `EditState` — состояние редактирования
- `EditCallbacks` — колбэки редактирования
- `EditConfig` — конфигурация редактирования

**Функции:**
- `startCellEdit()` — начать редактирование
- `finishCellEdit()` — завершить редактирование
- `getCellValue()` — получить значение
- `setCellValue()` — установить значение
- `handleCellInput()` — обработать ввод
- `isFormula()` — проверка на формулу
- `handleEditKeydown()` — обработка клавиш
- `handleGlobalInputKeyDown()` — обработка клавиш глобального input
- `positionEditInput()` — позиционировать input редактирования
- `startEditWithChar()` — начать редактирование с символом
- `isCellEditing()` — проверить режим редактирования
- `getEditedCell()` — получить редактируемую ячейку
- `setEditedCell()` — установить редактируемую ячейку
- `resetEditState()` — сбросить состояние редактирования

**Пример:**
```typescript
import { startCellEdit, handleEditKeydown, positionEditInput } from './renderer/modules';

startCellEdit(cell, true);
handleEditKeydown(event, { onSave, onCancel, onNextRow, onNextCell });
positionEditInput(input, row, col, cellWidth, cellHeight, scrollLeft, scrollTop);
```

### scroll.ts
Прокрутка и виртуализация.

**Интерфейсы:**
- `ScrollState` — состояние скролла
- `VirtualScrollOptions` — опции виртуального скролла
- `ScrollCallbacks` — колбэки скролла

**Функции:**
- `getScrollVisibleRange()` — видимый диапазон при скролле
- `syncScrollHeaders()` — синхронизация заголовков
- `updateFixedHeaders()` — обновление фиксированных заголовков
- `syncFixedHeaders()` — синхронизировать фиксированные заголовки
- `optimizeScroll()` — оптимизация скролла
- `getScrollState()` — получить состояние скролла
- `setScrollPosition()` — установить позицию скролла
- `scrollToCell()` — прокрутка к ячейке
- `isCellVisible()` — проверить видимость ячейки
- `handleScroll()` — обработать скролл
- `setupScrollHandler()` — настроить обработчик скролла

**Пример:**
```typescript
import { optimizeScroll, syncScrollHeaders, scrollToCell } from './renderer/modules';

const frameRef = { current: null };
optimizeScroll(() => renderVisibleCells(), frameRef);
syncScrollHeaders(container, columnHeaders, rowHeaders);
scrollToCell(container, 0, 0, 100, 32, true);
```

### formatting.ts
Форматирование текста в ячейках.

**Интерфейсы:**
- `CellFormat` — форматирование ячейки
- `FormatRange` — диапазон форматирования

**Функции:**
- `applyFormatting()` — применить форматирование
- `toggleBold()` — переключить жирный
- `toggleItalic()` — переключить курсив
- `toggleUnderline()` — переключить подчёркивание
- `toggleStrike()` — переключить зачёркивание
- `setTextColor()` — установить цвет текста
- `setFillColor()` — установить цвет фона
- `setTextAlign()` — установить выравнивание
- `setFont()` — установить шрифт
- `getCellFormat()` — получить форматирование
- `applyColorToSelection()` — применить цвет к выделению
- `applyTextAlignToSelection()` — применить выравнивание
- `changeDecimalPlaces()` — изменить разрядность чисел
- `saveCellStyle()` — сохранить стиль ячейки
- `applySavedCellStyle()` — применить сохранённый стиль

**Пример:**
```typescript
import { toggleBold, setTextColor, applyFormatting } from './renderer/modules';

toggleBold(cell);
setTextColor(cell, '#ff0000');
applyFormatting(cells, { bold: true, color: '#00ff00' });
```

### borders.ts
Границы ячеек.

**Интерфейсы:**
- `BorderConfig` — конфигурация границ

**Функции:**
- `applyBorders()` — применить границы
- `toggleAllBorders()` — переключить все границы
- `clearBorders()` — очистить границы
- `getBorderState()` — получить состояние границ
- `setTopBorder()` — установить верхнюю границу
- `setBottomBorder()` — установить нижнюю границу
- `setLeftBorder()` — установить левую границу
- `setRightBorder()` — установить правую границу

**Пример:**
```typescript
import { applyBorders, clearBorders, toggleAllBorders } from './renderer/modules';

applyBorders(cells, { all: true });
clearBorders(cells);
const hasBorders = toggleAllBorders(cells);
```

### column-row.ts
Управление колонками и строками.

**Интерфейсы:**
- `ColumnConfig` — конфигурация колонки
- `RowConfig` — конфигурация строки
- `RenderHeadersConfig` — конфигурация рендеринга заголовков

**Функции:**
- `updateColumnWidth()` — обновить ширину колонки
- `updateRowHeight()` — обновить высоту строки
- `autoFitColumn()` — автоподбор ширины
- `insertRow()` — вставить строку
- `insertColumn()` — вставить колонку
- `deleteRow()` — удалить строку
- `deleteColumn()` — удалить колонку
- `renderColumnHeaders()` — рендеринг заголовков колонок
- `renderRowHeaders()` — рендеринг заголовков строк
- `renderFixedColumnHeaders()` — рендеринг фиксированных заголовков колонок
- `renderFixedRowHeaders()` — рендеринг фиксированных заголовков строк
- `moveRowData()` — переместить данные строк
- `moveColumnData()` — переместить данные колонок
- `deleteRowData()` — удалить данные строки
- `deleteColumnData()` — удалить данные колонки

**Пример:**
```typescript
import { autoFitColumn, updateRowHeight, renderColumnHeaders } from './renderer/modules';

autoFitColumn(0, cellGrid, columnHeaders);
updateRowHeight(0, 40, rowHeaders, cellGrid);
renderColumnHeaders(container, { totalCols: 100, totalRows: 100, cellWidth: 100, cellHeight: 32 });
```

### data-validation.ts
Валидация данных (dropdown списки).

**Интерфейсы:**
- `ValidationConfig` — конфигурация валидации
- `ValidationState` — состояние валидации

**Функции:**
- `setDataValidation()` — установить валидацию
- `getDataValidation()` — получить валидацию
- `removeDataValidation()` — удалить валидацию
- `clearAllDataValidations()` — очистить все валидации
- `validateValue()` — проверить значение
- `hasDropdown()` — проверить наличие dropdown

**Пример:**
```typescript
import { setDataValidation, getDataValidation, hasDropdown } from './renderer/modules';

setDataValidation(state, 'A1', ['Option 1', 'Option 2']);
const validation = getDataValidation(state, 0, 0);
const hasDropdown = hasDropdown(state, 0, 0);
```

### undo-redo.ts
Отмена и повтор действий.

**Интерфейсы:**
- `UndoAction` — действие для undo/redo
- `UndoRedoState` — состояние undo/redo

**Функции:**
- `pushUndo()` — добавить действие в undo стек
- `undo()` — отменить последнее действие
- `redo()` — повторить отменённое действие
- `clearUndoRedo()` — очистить историю
- `canUndo()` — проверить возможность отмены
- `canRedo()` — проверить возможность повтора
- `getUndoStackSize()` — размер undo стека
- `getRedoStackSize()` — размер redo стека

**Пример:**
```typescript
import { pushUndo, undo, redo, canUndo } from './renderer/modules';

pushUndo(state, key, oldValue);
if (canUndo(state)) {
  undo(state, getCurrentData, setValue);
}
redo(state, getCurrentData, setValue);
```

### formulas.ts
Формулы и реактивность.

**Интерфейсы:**
- `FormulaResult` — результат вычисления формулы
- `CellRefGetter` — функция получения значения ячейки

**Функции:**
- `calculateFormula()` — вычислить значение формулы
- `registerFormula()` — зарегистрировать формулу
- `removeFormula()` — удалить формулу
- `getDependentCells()` — получить зависимые ячейки
- `extractCellReferences()` — извлечь ссылки из формулы
- `parseCellReference()` — разобрать ссылку на ячейку
- `getHexColorByName()` — получить hex цвета по имени
- `applyCellColor()` — применить цвет к ячейке
- `getRangeType()` — определить тип диапазона
- `getCellsInRange()` — получить ячейки в диапазоне

**Пример:**
```typescript
import { registerFormula, extractCellReferences, getHexColorByName } from './renderer/modules';

registerFormula(key, formula, cellFormulas, registerDependency);
const refs = extractCellReferences('=SUM(A1:B2)'); // ['A1', 'B2']
const color = getHexColorByName('red'); // '#FF0000'
```

### context-menu.ts
Контекстное меню.

**Интерфейсы:**
- `ContextMenuAction` — действие контекстного меню
- `ContextMenuConfig` — конфигурация контекстного меню
- `MenuPosition` — позиция меню

**Функции:**
- `getCellMenuActions()` — получить действия для ячеек
- `getSheetMenuActions()` — получить действия для листов
- `isPositionInMenu()` — проверить позицию в меню
- `calculateMenuPosition()` — рассчитать позицию меню
- `showContextMenu()` — показать меню
- `hideContextMenu()` — скрыть меню
- `handleContextMenuClick()` — обработать клик
- `createClickOutsideHandler()` — создать обработчик клика вне

**Пример:**
```typescript
import { showContextMenu, hideContextMenu, getCellMenuActions } from './renderer/modules';

const actions = getCellMenuActions();
showContextMenu(menuElement, x, y);
hideContextMenu(menuElement);
```

### autosave.ts
Автосохранение и автозагрузка.

**Интерфейсы:**
- `AutoSaveConfig` — конфигурация автосохранения
- `SaveData` — данные для сохранения

**Функции:**
- `saveToLocalStorage()` — сохранить в localStorage
- `loadFromLocalStorage()` — загрузить из localStorage
- `loadDataToState()` — загрузить данные в состояние
- `clearAutoSaveData()` — очистить сохранённые данные
- `hasAutoSaveData()` — проверить наличие данных
- `getLastSaveTime()` — получить время последнего сохранения
- `setupAutoSaveInterval()` — настроить интервал автосохранения
- `clearAutoSaveInterval()` — очистить интервал

**Пример:**
```typescript
import { saveToLocalStorage, loadFromLocalStorage, hasAutoSaveData } from './renderer/modules';

saveToLocalStorage(state, { enabled: true, localStorageKey: 'my-table' });
if (hasAutoSaveData({ localStorageKey: 'my-table' })) {
  const data = loadFromLocalStorage(state, { localStorageKey: 'my-table' });
}
```

## Использование

Импортируйте нужные функции из корневого index:

```typescript
import {
  // Utils
  colToLetter, getCellKey, isFormula,
  
  // Cell rendering
  createCellElement, applyCellStyle, cleanupCellCache,
  
  // Selection
  getSelectionBounds, moveSelection, startSelection,
  
  // Editing
  startCellEdit, handleEditKeydown, positionEditInput,
  
  // Scroll
  optimizeScroll, syncScrollHeaders, scrollToCell,
  
  // Formatting
  toggleBold, setTextColor, applyFormatting,
  
  // Borders
  applyBorders, clearBorders, toggleAllBorders,
  
  // Column/Row
  autoFitColumn, updateRowHeight, renderColumnHeaders,
  
  // Data validation
  setDataValidation, getDataValidation, hasDropdown,
  
  // Undo/Redo
  pushUndo, undo, redo, canUndo,
  
  // Formulas
  registerFormula, extractCellReferences, getHexColorByName,
  
  // Context menu
  showContextMenu, hideContextMenu, getCellMenuActions,
  
  // AutoSave
  saveToLocalStorage, loadFromLocalStorage, hasAutoSaveData
} from './renderer/modules';
```

## Преимущества

1. **Модульность** — каждый модуль отвечает за свою задачу
2. **Переиспользование** — функции можно использовать в разных местах
3. **Тестируемость** — легко покрывать тестами
4. **Читаемость** — код проще понимать и поддерживать
5. **Типизация** — полная поддержка TypeScript
6. **Документация** — каждый модуль документирован

## Миграция

Для миграции с монолитного `renderer.ts`:

1. Импортируйте функции из модулей
2. Постепенно заменяйте старый код на использование функций из модулей
3. Не удаляйте старый код пока не убедитесь что новый работает
4. После полной замены — удалите старый код

```typescript
// Было:
function selectCell(row, col) { ... }

// Стало:
import { selectCell } from './renderer/modules';
// (функция уже определена в модуле)
```
