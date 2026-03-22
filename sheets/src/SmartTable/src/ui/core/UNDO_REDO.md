# Система Undo/Redo для SmartTable

## Обзор

Реализована полноценная система отмены/повтора действий на основе паттерна **Command Pattern**. Теперь все операции в таблице работают корректно и предсказуемо.

## Архитектура

### Основные компоненты

1. **`commands.ts`** - Базовые классы команд
   - `ICommand` - интерфейс для всех команд
   - `SetValueCommand` - установка значения ячейки
   - `SetFormatCommand` - применение форматирования
   - `MergeCellsCommand` - объединение ячеек
   - `InsertRowCommand` - вставка строки
   - `DeleteRowCommand` - удаление строки
   - `InsertColumnCommand` - вставка столбца
   - `DeleteColumnCommand` - удаление столбца
   - `BatchCommand` - групповая команда

2. **`command-manager.ts`** - менеджер команд
   - Управляет стеками undo/redo
   - Поддерживает до 100 действий в истории
   - Предоставляет API для выполнения команд

## Как использовать

### Базовое использование

```typescript
import { commandManager, SetValueCommand, SetFormatCommand } from './core/commands.js';
import { commandManager } from './core/command-manager.js';

// Установить значение ячейки
const setValueCmd = new SetValueCommand(row, col, 'Hello World', false);
commandManager.execute(setValueCmd);

// Применить форматирование к диапазону
const formatCmd = new SetFormatCommand(0, 0, 5, 3, 'bold', true);
commandManager.execute(formatCmd);

// Отменить последнее действие
commandManager.undo();

// Повторить действие
commandManager.redo();
```

### Примеры команд

#### 1. Установка значения ячейки

```typescript
// Простое значение
new SetValueCommand(0, 0, 'Текст', false);

// Формула
new SetValueCommand(0, 1, '=SUM(A1:A10)', true);
```

#### 2. Форматирование

```typescript
// Жирный шрифт
new SetFormatCommand(startRow, startCol, endRow, endCol, 'bold', true);

// Цвет текста
new SetFormatCommand(startRow, startCol, endRow, endCol, 'color', '#FF0000');

// Цвет фона
new SetFormatCommand(startRow, startCol, endRow, endCol, 'backgroundColor', '#FFFF00');

// Выравнивание
new SetFormatCommand(startRow, startCol, endRow, endCol, 'align', 'center');
```

#### 3. Операции со строками/столбцами

```typescript
// Вставить строку
new InsertRowCommand(5);

// Удалить строку
new DeleteRowCommand(3);

// Вставить столбец
new InsertColumnCommand(2);

// Удалить столбец
new DeleteColumnColumn(4);
```

#### 4. Объединение ячеек

```typescript
// Объединить диапазон
new MergeCellsCommand(0, 0, 3, 3);
```

## Интеграция в существующий код

### Обновленные функции в renderer.ts

Следующие функции теперь используют систему команд:

- `setCellValue()` → использует `SetValueCommand`
- `applyColorToSelection()` → использует `SetFormatCommand`
- `toggleFormatting()` → использует `SetFormatCommand`
- `mergeCells()` → использует `MergeCellsCommand`
- `insertRow()` → использует `InsertRowCommand`
- `deleteRow()` → использует `DeleteRowCommand`
- `insertColumn()` → использует `InsertColumnCommand`
- `deleteColumn()` → использует `DeleteColumnCommand`
- `insertRowAboveAt()` → использует `InsertRowCommand`
- `deleteRowAt()` → использует `DeleteRowCommand`
- `insertColumnLeftAt()` → использует `InsertColumnCommand`
- `deleteColumnAt()` → использует `DeleteColumnCommand`

### Глобальные функции

```javascript
// Отменить
window.undo();

// Повторить
window.redo();

// Прямой доступ к менеджеру команд
window.commandManager.undo();
window.commandManager.redo();
window.commandManager.execute(command);
```

## Преимущества новой системы

### ✅ До изменений

- Undo/Redo работали только на уровне отдельных ячеек
- Невозможно было отменить комплексные операции
- Потеря состояния при форматировании диапазонов
- Баги при отмене вставки/удаления строк

### ✅ После изменений

- **Полная поддержка undo/redo** для всех операций
- **Комплексные команды** - отмена одним действием:
  - Форматирование диапазона
  - Объединение ячеек
  - Вставка/удаление строк и столбцов
- **Сохранение стилей** - при изменении значения стили не теряются
- **Масштабируемость** - легко добавлять новые команды
- **Надежность** - каждая команда хранит полное состояние для отмены

## Добавление новой команды

```typescript
export class MyCustomCommand implements ICommand {
  name = 'MyCustom';
  
  private oldValue: any;
  private newValue: any;
  
  constructor(private param: any) {}
  
  execute(): void {
    // Сохраняем старое состояние
    this.oldValue = this.saveState();
    
    // Применяем изменения
    this.applyChanges();
  }
  
  undo(): void {
    // Восстанавливаем старое состояние
    this.restoreState(this.oldValue);
  }
  
  redo(): void {
    // Повторяем изменения
    this.applyChanges();
  }
  
  private saveState(): any {
    // Логика сохранения
  }
  
  private applyChanges(): void {
    // Логика применения
  }
  
  private restoreState(state: any): void {
    // Логика восстановления
  }
}
```

## Ограничения

- Максимум 100 действий в истории undo (настраивается в `CommandManagerConfig`)
- При закрытии приложения история очищается
- Некоторые операции (сортировка, фильтрация) пока не поддерживают undo

## Тестирование

### Базовые тесты

1. Введите значение в ячейку → Ctrl+Z → значение должно вернуться
2. Покрасьте ячейку → Ctrl+Z → цвет должен сброситься
3. Объедините ячейки → Ctrl+Z → ячейки должны разъединиться
4. Вставьте строку → Ctrl+Z → строка должна удалиться
5. Удалите столбец → Ctrl+Z → столбец должен восстановиться

### Проверка через консоль

```javascript
// Проверить количество действий в undo
console.log(window.commandManager.getUndoCount());

// Проверить доступные действия
console.log(window.commandManager.canUndo());
console.log(window.commandManager.canRedo());

// Очистить историю
window.commandManager.clear();
```

## Будущие улучшения

- [ ] Добавить команды для сортировки с undo/redo
- [ ] Добавить команды для фильтрации с undo/redo
- [ ] Добавить команды для conditional formatting
- [ ] Сохранение истории между сессиями
- [ ] Визуальный список действий для отмены
- [ ] Поддержка "шагов" (группировка действий)
