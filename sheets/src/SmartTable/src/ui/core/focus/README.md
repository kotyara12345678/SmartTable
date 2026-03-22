# FocusManager - Полное руководство

## 📋 Описание

**FocusManager** - это полнофункциональный TypeScript менеджер фокуса для SmartTable, который автоматически сохраняет и восстанавливает фокус ввода даже после:
- 🔄 Очистки кэша DOM
- 📄 Создания/удаления шаблонов
- 🔄 Re-render таблицы (изменение размера, сортировка, фильтрация)
- ⌨️ Быстрого последовательного ввода

## ✨ Возможности

✅ **Автоматическое восстановление фокуса**
- При потере фокуса окном (blur/focus)
- При изменении DOM (MutationObserver)
- При навигации клавишами (Arrow, Enter, Tab)
- При re-render таблицы и очистке кэша

✅ **Защита от быстрых кликов (Debounce)**
- Двойные клики не ломают фокус
- Быстрая последовательность кликов игнорируется
- Интервал debounce: 100мс

✅ **Оптимизирована для больших таблиц**
- Поддержка 100x100 и больше ячеек
- MutationObserver следит только за необходимыми изменениями
- Фоновая проверка каждую секунду (минимальные издержки)

✅ **Гибкая отладка**
- Режим отладки (`setDebug(true)`) с подробными логами
- Регулируемая задержка восстановления (`setRestoreDelay(ms)`)
- Эмодзи-логирование для чистоты читаемости (✓, ✅, ❌, ⚠️, 🔄)

✅ **Полная поддержка TypeScript**
- 100% типизирована
- Готова к использованию в TypeScript проектах
- Интеллектуальная поддержка IDE

## 🚀 Быстрый старт

### 1. Инициализация в renderer.ts

```typescript
import FocusManager from '../core/focus/FocusManager';

export function init() {
  // Инициализировать FocusManager с callback для получения ячейки по координатам
  FocusManager.init({
    getCellByCoords: (row: number, col: number): HTMLElement | null => {
      return document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    },
    containerSelector: '#cellGrid',  // Контейнер для MutationObserver
    debug: false,                     // Отключить логирование в продакшене
    restoreDelay: 50                  // Задержка восстановления (мс)
  });
}
```

### 2. Установка активной ячейки

```typescript
// Когда пользователь кликает на ячейку
function selectCell(row: number, col: number) {
  const cellElement = document.querySelector(
    `.cell[data-row="${row}"][data-col="${col}"]`
  ) as HTMLElement;
  
  if (cellElement) {
    // Установить как активную ячейку
    FocusManager.setActiveCell(cellElement, { row, col });
    
    // Сфокусировать для ввода
    cellElement.focus();
  }
}
```

### 3. Восстановление фокуса после операций

```typescript
// После очистки кэша
function cleanupCellCache() {
  // ... ваш код очистки ...
  
  // Восстановить фокус на старой ячейке
  FocusManager.restoreFocus();
}

// После re-render таблицы
function renderCells() {
  // ... ваш код рендера ...
  renderScheduled = false;
  renderVisibleCells();
  cleanupCellCache();
  
  // Восстановить фокус после re-render (автоматически через MutationObserver)
  // или явно:
  FocusManager.restoreFocus();
}
```

## 📖 API Документация

### `init(options?: FocusManagerOptions): void`

Инициализирует менеджер фокуса с опциями.

**Параметры:**
```typescript
interface FocusManagerOptions {
  // Функция для получения элемента ячейки по координатам
  getCellByCoords?: (row: number, col: number) => HTMLElement | null;
  
  // Селектор контейнера для MutationObserver
  containerSelector?: string;  // default: 'body'
  
  // Включить режим отладки
  debug?: boolean;  // default: false
  
  // Задержка восстановления фокуса (мс)
  restoreDelay?: number;  // default: 50
}
```

**Пример:**
```typescript
FocusManager.init({
  getCellByCoords: getCellElement,
  containerSelector: '#cellGrid',
  debug: process.env.NODE_ENV === 'development',
  restoreDelay: 50
});
```

---

### `setActiveCell(cellElement: HTMLElement | null, coords?: { row, col } | null): void`

Установить активную ячейку. Добавляет класс `'focus-manager-active'` для визуальной подсветки.

**Параметры:**
- `cellElement` - DOM элемент ячейки
- `coords` - Координаты `{ row, col }` (опционально, будут получены из `data-row`/`data-col`)

**Пример:**
```typescript
const cell = document.querySelector('.cell[data-row="5"][data-col="10"]');
FocusManager.setActiveCell(cell, { row: 5, col: 10 });

// Или сокращенно (координаты будут получены из атрибутов):
FocusManager.setActiveCell(cell);
```

---

### `restoreFocus(force?: boolean): void`

Восстановить фокус на активной ячейке.

**Параметры:**
- `force` - Если `true`, восстановить в любом случае (игнорировать проверки)

**Возвращаемое значение:** нет

**Автоматически вызывается при:**
- Потере/восстановлении фокуса окном
- Изменении DOM
- Навигации клавишами (если фокус потерян)

**Ручной вызов:**
```typescript
// Восстановление с проверками
FocusManager.restoreFocus();

// Принудительное восстановление (даже если фокус уже установлен)
FocusManager.restoreFocus(true);
```

---

### `getActiveCell(): ActiveCell | null`

Получить информацию о текущей активной ячейке.

**Возвращаемое значение:**
```typescript
interface ActiveCell {
  row: number;              // Номер строки
  col: number;              // Номер колонки
  element: HTMLElement | null;  // DOM элемент или null
}
```

**Пример:**
```typescript
const activeCell = FocusManager.getActiveCell();
if (activeCell) {
  console.log(`Активна ячейка: [${activeCell.row}, ${activeCell.col}]`);
  console.log('Элемент:', activeCell.element);
} else {
  console.log('Нет активной ячейки');
}
```

---

### `getActiveCellCoords(): { row: number; col: number } | null`

Получить только координаты активной ячейки.

**Возвращаемое значение:** `{ row, col }` или `null`

**Пример:**
```typescript
const coords = FocusManager.getActiveCellCoords();
if (coords) {
  console.log(`Row: ${coords.row}, Col: ${coords.col}`);
}
```

---

### `clearActiveCell(): void`

Очистить активную ячейку. Удаляет класс `'focus-manager-active'`.

**Пример:**
```typescript
FocusManager.clearActiveCell();
```

---

### `getStats(): FocusManagerStats`

Получить статистику работы менеджера.

**Возвращаемое значение:**
```typescript
interface FocusManagerStats {
  initialized: boolean;                        // Инициализирован ли
  hasActiveCell: boolean;                      // Есть ли активная ячейка
  activeCellCoords: { row, col } | null;      // Координаты активной
  restoreAttempts: number;                    // Количество попыток восстановления
  isRestoring: boolean;                       // Выполняется ли восстановление
}
```

**Пример:**
```typescript
const stats = FocusManager.getStats();
console.log('Статистика:', stats);
// {
//   initialized: true,
//   hasActiveCell: true,
//   activeCellCoords: { row: 5, col: 10 },
//   restoreAttempts: 0,
//   isRestoring: false
// }
```

---

### `setDebug(value: boolean): void`

Включить/отключить режим отладки.

**Параметры:**
- `value` - `true` для вывода логов, `false` для отключения

**Пример:**
```typescript
// Включить отладку
FocusManager.setDebug(true);
// Все операции будут логироваться с префиксом [FocusManager]

// Отключить отладку
FocusManager.setDebug(false);
```

**Вывод логов (примеры):**
```
[FocusManager] ✅ Инициализация завершена
[FocusManager] ✓ Активная ячейка установлена: { row: 5, col: 10 }
[FocusManager] 🔄 Восстановление фокуса (попытка 1/3)...
[FocusManager] ✓ Фокус успешно восстановлен
```

---

### `setRestoreDelay(ms: number): void`

Установить кастомную задержку восстановления фокуса.

**Параметры:**
- `ms` - Задержка в миллисекундах (от 0 до 1000)

**Default:** 50мс

**Рекомендации:**
- **Медленные системы:** 100мс
- **Нормальные системы:** 50мс
- **Быстрые системы:** 25мс

**Пример:**
```typescript
// Для медленных систем - увеличить задержку
FocusManager.setRestoreDelay(100);

// Для быстрых систем - уменьшить
FocusManager.setRestoreDelay(25);

// Для максимальной скорости (может быть нестабильно)
FocusManager.setRestoreDelay(0);
```

---

### `reset(): void`

Полный сброс состояния. Используется для тестов и отладки.

**Пример:**
```typescript
// Сохранить текущее состояние
const stats = FocusManager.getStats();

// Полная переинициализация
FocusManager.reset();
FocusManager.init(options);
```

---

### `cleanup(): void`

Очистка ресурсов. Вызывается автоматически при выгрузке страницы.

**Пример:**
```typescript
// Явный вызов (обычно не нужен)
FocusManager.cleanup();

// Или автоматически:
window.addEventListener('beforeunload', () => {
  FocusManager.cleanup();
});
```

---

## 🎯 Примеры использования

### Пример 1: Базовая инициализация

```typescript
// В init.ts или main.ts
import FocusManager from './core/focus/FocusManager';

export function initFocusManager() {
  FocusManager.init({
    getCellByCoords: (row, col) => {
      return document.querySelector(
        `.cell[data-row="${row}"][data-col="${col}"]`
      ) as HTMLElement;
    },
    containerSelector: '#cellGrid',
    debug: false
  });
}
```

### Пример 2: С отладкой включенной

```typescript
if (import.meta.env.DEV) {
  FocusManager.setDebug(true);
  FocusManager.setRestoreDelay(100);  // Для более медленной отладки
}
```

### Пример 3: Обработка клика по ячейке

```typescript
function handleCellClick(event: MouseEvent) {
  const cellElement = (event.target as HTMLElement).closest('.cell');
  if (!cellElement) return;

  const row = parseInt(cellElement.getAttribute('data-row') || '0');
  const col = parseInt(cellElement.getAttribute('data-col') || '0');

  // Установить как активную
  FocusManager.setActiveCell(cellElement, { row, col });

  // Сфокусировать для ввода
  cellElement.focus();

  // Начать редактирование
  startCellEditing(row, col);
}
```

### Пример 4: После очистки кэша

```typescript
function cleanupCellCache() {
  // Сохранить активную ячейку перед очисткой
  const activeCell = FocusManager.getActiveCell();
  const activeCoords = FocusManager.getActiveCellCoords();

  // ... ваш код очистки ...

  // Восстановить фокус после очистки
  if (activeCoords) {
    setTimeout(() => {
      FocusManager.restoreFocus();
    }, 10);
  }
}
```

### Пример 5: После re-render

```typescript
function renderVisibleCells() {
  // Сохранить активную ячейку перед рендером
  const activeCoords = FocusManager.getActiveCellCoords();

  // ... ваш код рендера ...

  // Восстановить фокус
  if (activeCoords) {
    // MutationObserver автоматически обнаружит изменения
    // и восстановит фокус, но можно и явно:
    FocusManager.restoreFocus();
  }
}
```

### Пример 6: Быстрый ввод (печать в ячейку)

```typescript
function typeInCell(char: string) {
  const activeCell = FocusManager.getActiveCell();

  if (activeCell?.element) {
    // Добавить символ
    activeCell.element.textContent += char;

    // Убедиться что фокус не потерян
    FocusManager.restoreFocus();

    // Автосохранение
    autoSave();
  }
}
```

## 🔧 Интеграция с SmartTable

### 1. Замена импорта в renderer.ts

```typescript
// Было:
import FocusManager from '../core/focus/FocusManager.js';

// Стало:
import FocusManager from '../core/focus/FocusManager.ts';
```

### 2. Обновление инициализации

```typescript
export function init() {
  // ... остальная инициализация ...

  FocusManager.init({
    getCellByCoords: (row, col) => getCellElement(row, col),
    containerSelector: '#cellGrid',
    debug: CONFIG.DEBUG
  });
}
```

### 3. Использование в selectCell()

```typescript
function selectCell(row: number, col: number) {
  // ... остальной код ...

  ensureCellIsVisible(row, col);

  const cell = getCellElement(row, col);
  if (cell) {
    FocusManager.setActiveCell(cell, { row, col });
    cell.focus();
  }
}
```

### 4. Восстановление после очистки кэша

```typescript
function renderCells() {
  requestAnimationFrame(() => {
    renderScheduled = false;
    renderVisibleCells();
    cleanupCellCache();

    // Восстановить фокус
    if ((window as any).FocusManager) {
      setTimeout(() => {
        (window as any).FocusManager.restoreFocus();
      }, 10);
    }
  });
}
```

## 📊 Производительность

### Нагрузка на систему

- **MutationObserver:** Следит только за необходимыми изменениями (childList, subtree)
- **Фоновая проверка:** Один раз в 1000мс (1 сек)
- **requestAnimationFrame:** Используется для плавности восстановления
- **debounce кликов:** 100мс - защита от двойных кликов

### Для таблицы 100x100

- **Память:** ~50KB для состояния
- **CPU:** < 1% во время простоя
- **Задержка восстановления:** 50-100мс

## 🐛 Режим отладки

Включите для анализа проблем:

```typescript
FocusManager.setDebug(true);

// В консоли вы увидите:
// [FocusManager] 🚀 Инициализация FocusManager...
// [FocusManager] ✓ Обработчики событий установлены
// [FocusManager] ✓ MutationObserver установлен на: #cellGrid
// [FocusManager] ✓ Фоновый мониторинг запущен (интервал: 1000мс)
// [FocusManager] ✅ Инициализация завершена
// [FocusManager] ✓ Активная ячейка установлена: { row: 5, col: 10 }
```

## ✅ Контрольный список интеграции

- [ ] Заменен импорт на новый FocusManager.ts
- [ ] Вызвана инициализация `FocusManager.init(options)` в `init()`
- [ ] Добавлено `FocusManager.setActiveCell()` в `selectCell()`
- [ ] Добавлено `FocusManager.restoreFocus()` в `renderCells()`
- [ ] Проверено восстановление фокуса после очистки кэша
- [ ] Проверено восстановление фокуса после re-render
- [ ] Проверено восстановление фокуса при быстром вводе
- [ ] Включена отладка `FocusManager.setDebug(true)` для проверки логов

## 🎓 Понимание архитектуры

1. **init()** - Инициализирует все обработчики и наблюдатели
2. **setActiveCell()** - Сохраняет ссылку на текущую ячейку
3. **MutationObserver** - Автоматически обнаруживает изменения DOM
4. **restoreFocus()** - Восстанавливает фокус на сохраненной ячейке
5. **checkFocusHealth()** - Периодическая проверка здоровья (фоновый мониторинг)

## 📞 Поддержка

Если возникают проблемы:

1. Включите режим отладки: `FocusManager.setDebug(true)`
2. Посмотрите логи в консоли
3. Проверьте что `getCellByCoords` правильно возвращает элемент
4. Убедитесь что элемент имеет атрибуты `data-row` и `data-col`
5. Проверьте что контейнер (containerSelector) правильно указан

---

**Создан:** 20 марта 2026  
**Версия:** 1.0  
**Автор:** SmartTable Development Team  
**Лицензия:** MIT
