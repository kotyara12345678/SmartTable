# Инструкция по интеграции модулей в renderer.ts

## Статус
✅ Все модули созданы и готовы к использованию
⚠️ Интеграция в renderer.ts ещё не выполнена

## Созданные модули

| Модуль | Файл | Описание |
|--------|------|----------|
| utils | `utils.ts` | Утилитарные функции (colToLetter, getCellKey, и т.д.) |
| state | `state.ts` | Управление состоянием и данными |
| cell-rendering | `cell-rendering.ts` | Отрисовка ячеек |
| selection | `selection.ts` | Выделение и навигация |
| editing | `editing.ts` | Редактирование ячеек |
| scroll | `scroll.ts` | Прокрутка и виртуализация |
| formatting | `formatting.ts` | Форматирование |
| borders | `borders.ts` | Границы ячеек |
| column-row | `column-row.ts` | Управление колонками/строками |
| data-validation | `data-validation.ts` | Валидация данных (dropdown) |
| undo-redo | `undo-redo.ts` | Отмена/повтор действий |
| formulas | `formulas.ts` | Формулы и реактивность |
| context-menu | `context-menu.ts` | Контекстное меню |
| autosave | `autosave.ts` | Автосохранение |

## План интеграции

### Шаг 1: Добавить импорты в renderer.ts

Добавьте в начало файла `renderer.ts` после существующих импортов:

```typescript
// === ИМПОРТ МОДУЛЕЙ ===
import {
  // Utils
  colToLetter,
  letterToCol,
  getCellId,
  getCellKey,
  parseCellKey,
  isFormula,
  hashStyle,
  
  // State
  getCurrentData,
  getSheetData,
  setCellValue,
  getCellValue,
  deleteCellValue,
  clearAllData,
  switchSheet,
  exportData,
  importData,
  
  // Cell Rendering
  createCellElement,
  createAbsoluteCellElement,
  applyCellStyle,
  updateCellDisplay,
  cleanupCellCache,
  setGridSize,
  restoreSelection,
  getSelectedCellsFromDOM,
  calculateVisibleRangeWithBuffer,
  
  // Selection
  getSelectionBounds,
  getSelectedCells,
  moveSelection,
  selectRow as selectRowCells,
  selectColumn as selectColumnCells,
  selectAll,
  isCellInRange,
  startSelection,
  endSelection,
  clearSelection,
  getActiveCell,
  
  // Editing
  startCellEdit,
  finishCellEdit,
  handleEditKeydown,
  handleGlobalInputKeyDown,
  positionEditInput,
  resetEditState,
  isCellEditing,
  getEditedCell,
  setEditedCell,
  
  // Scroll
  syncScrollHeaders,
  updateFixedHeaders,
  syncFixedHeaders,
  optimizeScroll,
  getScrollState,
  setScrollPosition,
  scrollToCell,
  isCellVisible,
  
  // Formatting
  applyFormatting,
  toggleBold,
  toggleItalic,
  toggleUnderline,
  toggleStrike,
  setTextColor,
  setFillColor,
  setTextAlign,
  setFont,
  getCellFormat,
  applyColorToSelection,
  applyTextAlignToSelection,
  changeDecimalPlaces,
  
  // Borders
  applyBorders,
  toggleAllBorders,
  clearBorders,
  getBorderState,
  
  // Column/Row
  updateColumnWidth,
  updateRowHeight,
  autoFitColumn,
  renderColumnHeaders,
  renderRowHeaders,
  renderFixedColumnHeaders,
  renderFixedRowHeaders,
  moveRowData,
  moveColumnData,
  deleteRowData,
  deleteColumnData,
  
  // Data Validation
  setDataValidation,
  getDataValidation,
  removeDataValidation,
  clearAllDataValidations,
  hasDropdown,
  
  // Undo/Redo
  pushUndo as pushUndoAction,
  undo as undoAction,
  redo as redoAction,
  canUndo,
  canRedo,
  
  // Formulas
  registerFormula,
  removeFormula,
  getDependentCells,
  extractCellReferences,
  getHexColorByName,
  applyCellColor,
  
  // Context Menu
  showContextMenu,
  hideContextMenu,
  getCellMenuActions,
  getSheetMenuActions,
  
  // AutoSave
  saveToLocalStorage,
  loadFromLocalStorage,
  hasAutoSaveData,
  clearAutoSaveData
} from './modules';
```

### Шаг 2: Постепенная замена функций

**ВАЖНО:** Не удаляйте старый код сразу!

1. **Начните с утилит:**
   - Замените `colToLetter`, `letterToCol`, `getCellId`, `getCellKey` на импортированные
   
2. **Затем перейдите к рендерингу:**
   - `renderCells()` → используйте `createCellElement`, `applyCellStyle`
   - `renderVisibleCells()` → используйте `calculateVisibleRangeWithBuffer`
   
3. **Потом выделите функции выделения:**
   - `selectCell()`, `updateRangeSelection()` → используйте функции из `selection.ts`
   
4. **Функции редактирования:**
   - `editCell()`, `finishEditing()` → используйте функции из `editing.ts`

### Шаг 3: Проверка

После замены каждой группы функций:
1. Сохраните файл
2. Запустите приложение
3. Проверьте что заменённый функционал работает
4. Только потом переходите к следующей группе

### Шаг 4: Удаление старого кода

Когда все функции заменены:
1. Удалите старые определения функций
2. Удалите неиспользуемые импорты
3. Проверьте что всё ещё работает

## Пример замены

### До:
```typescript
function colToLetter(col: number): string {
  let letter = '';
  let n = col + 1;
  while (n > 0) {
    n--;
    letter = String.fromCharCode(65 + (n % 26)) + letter;
    n = Math.floor(n / 26);
  }
  return letter;
}

function renderCells(): void {
  // ... код ...
}
```

### После:
```typescript
// Импортировано из modules: colToLetter, createCellElement, etc.

function renderCells(): void {
  // Используем функции из модулей
  const cells = selectedCells.map(({ row, col }) => 
    createCellElement(row, col, getData(row, col))
  );
}
```

## Известные проблемы

1. **Конфликты имён:** Некоторые функции в модулях могут иметь те же имена что и в renderer.ts. Используйте алиасы при импорте:
   ```typescript
   import { selectRow as selectRowCells } from './modules';
   ```

2. **Зависимости от state:** Модули используют state который определяется в renderer.ts. Вам нужно будет передавать state в функции или использовать замыкания.

3. **DOM элементы:** Функции из модулей могут требовать DOM элементы которые создаются в renderer.ts. Убедитесь что элементы инициализированы до вызова функций.

## Тестирование

После полной интеграции проверьте:
- [ ] Отрисовка ячеек
- [ ] Выделение ячеек и диапазонов
- [ ] Редактирование ячеек
- [ ] Прокрутка таблицы
- [ ] Форматирование (жирный, курсив, цвет)
- [ ] Границы ячеек
- [ ] Вставка/удаление строк и колонок
- [ ] Dropdown валидация
- [ ] Undo/Redo
- [ ] Формулы
- [ ] Контекстное меню
- [ ] Автосохранение

## Обратная связь

Если возникли проблемы при интеграции:
1. Проверьте консоль на ошибки
2. Убедитесь что все импорты корректны
3. Проверьте что state передаётся правильно
4. При необходимости создайте issue с описанием проблемы
