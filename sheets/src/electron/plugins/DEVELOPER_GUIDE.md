# Разработка плагинов для SmartTable

Этот документ описывает процесс создания, установки и публикации плагинов для SmartTable.

## 📦 Что такое плагин?

Плагин — это модуль расширения, который добавляет новые функции в SmartTable. Плагины позволяют:
- Добавлять новые формулы
- Создавать пользовательские UI элементы (кнопки, панели)
- Интегрироваться с внешними сервисами
- Автоматизировать задачи
- И многое другое

## 🏗 Структура плагина

```
my-plugin/
├── manifest.json          # Обязательный файл метаданных
├── main.js                # Точка входа (обязательно)
├── styles.css             # Стили (опционально)
├── assets/                # Ресурсы (иконки, изображения)
│   └── icon.png
└── README.md              # Документация плагина
```

## 📄 manifest.json

Файл манифеста содержит метаданные вашего плагина:

```json
{
  "id": "com.example.my-plugin",
  "name": "Мой Плагин",
  "version": "1.0.0",
  "description": "Описание возможностей плагина",
  "author": "Ваше Имя",
  "main": "main.js",
  "styles": ["styles.css"],
  "apiVersion": "1.0",
  "permissions": [
    "sheets.read",
    "sheets.write",
    "ui.ribbon"
  ],
  "icon": "assets/icon.png",
  "homepage": "https://github.com/username/my-plugin"
}
```

### Поля манифеста

| Поле | Обязательное | Описание |
|------|-------------|----------|
| `id` | ✅ | Уникальный идентификатор (reverse-DNS стиль) |
| `name` | ✅ | Название плагина |
| `version` | ✅ | Версия в формате semver (мажорная.минорная.патч) |
| `description` | ✅ | Краткое описание |
| `author` | ✅ | Автор плагина |
| `main` | ✅ | Главный файл плагина |
| `styles` | ❌ | Массив CSS файлов |
| `apiVersion` | ✅ | Версия API SmartTable |
| `permissions` | ❌ | Запрашиваемые разрешения |
| `icon` | ❌ | Путь к иконке |
| `homepage` | ❌ | Ссылка на репозиторий/сайт |

## 🔑 Разрешения (Permissions)

| Разрешение | Описание |
|-----------|----------|
| `sheets.read` | Чтение данных ячеек |
| `sheets.write` | Запись данных в ячейки |
| `sheets.create` | Создание новых листов |
| `sheets.delete` | Удаление листов |
| `ui.ribbon` | Добавление кнопок в ленту |
| `ui.menu` | Добавление пунктов меню |
| `ui.panel` | Создание боковых панелей |
| `ui.modal` | Показ модальных окон |
| `events.subscribe` | Подписка на события |
| `storage.read` | Чтение хранилища плагина |
| `storage.write` | Запись в хранилище |

## 🚀 Точка входа (main.js)

Ваш плагин должен экспортировать функцию, которая принимает API SmartTable:

```javascript
/**
 * Точка входа плагина
 * @param {SmartTablePluginAPI} api - API для взаимодействия со SmartTable
 */
export function activate(api) {
  console.log('Плагин активирован!');
  
  // Пример: добавление кнопки в ленту
  api.ui.addRibbonButton({
    id: 'my-plugin-btn',
    groupId: 'insert',
    icon: '<svg>...</svg>',
    label: 'Моя кнопка',
    tooltip: 'Нажми меня',
    onClick: () => {
      // Обработчик клика
      const selected = api.sheets.getSelectedRange();
      if (selected) {
        api.ui.showNotification('Выделено: ' + JSON.stringify(selected));
      }
    }
  });
  
  // Пример: подписка на события
  api.events.onCellChange((sheetId, cellId, value) => {
    console.log(`Ячейка ${cellId} изменена на ${value}`);
  });
  
  // Возвращаем объект с методами для деактивации
  return {
    deactivate: () => {
      console.log('Плагин деактивирован');
      // Очистка ресурсов
    }
  };
}
```

## 📚 API Плагинов

### Sheets API

Работа с данными таблиц:

```javascript
// Получить значение ячейки
const value = api.sheets.getCell(sheetId, 'A1');

// Установить значение ячейки
api.sheets.setCell(sheetId, 'B2', 'Новое значение');

// Получить выделенный диапазон
const range = api.sheets.getSelectedRange();
// Возвращает: { sheetId: 0, start: 'A1', end: 'C5' } | null

// Получить информацию о листе
const sheet = api.sheets.getSheet(sheetId);

// Создать новый лист
const newSheetId = api.sheets.createSheet('Новый лист');

// Удалить лист
api.sheets.deleteSheet(sheetId);

// Получить все листы
const allSheets = api.sheets.getAllSheets();
```

### UI API

Создание элементов интерфейса:

```javascript
// Добавить кнопку в ленту
api.ui.addRibbonButton({
  id: 'unique-btn-id',
  groupId: 'home', // или 'insert', 'formulas', etc.
  icon: '<svg viewBox="0 0 24 24">...</svg>',
  label: 'Текст',
  tooltip: 'Подсказка',
  onClick: () => { /* ... */ },
  size: 'sm' // или 'lg'
});

// Добавить пункт меню
api.ui.addMenuItem({
  id: 'unique-menu-id',
  label: 'Пункт меню',
  tab: 'home', // вкладка меню
  onClick: () => { /* ... */ }
});

// Добавить боковую панель
api.ui.addPanel({
  id: 'my-panel',
  title: 'Моя панель',
  content: '<div>HTML содержимое</div>',
  width: 400,
  position: 'right' // или 'left'
});

// Показать модальное окно
api.ui.showModal('<div>Содержимое модального окна</div>');

// Закрыть все модальные окна
api.ui.closeModals();

// Показать уведомление
api.ui.showNotification('Текст уведомления', 'info');
// Типы: 'info', 'success', 'warning', 'error'

// Получить активную тему
const theme = api.ui.getActiveTheme();
```

### Events API

Подписка на события:

```javascript
// Изменение ячейки
api.events.onCellChange((sheetId, cellId, value) => {
  console.log(`Ячейка ${cellId} изменена`);
});

// Создание листа
api.events.onSheetCreate((sheetId) => {
  console.log(`Лист ${sheetId} создан`);
});

// Удаление листа
api.events.onSheetDelete((sheetId) => {
  console.log(`Лист ${sheetId} удален`);
});

// Изменение выделения
api.events.onSelectionChange((range) => {
  console.log('Выделение изменено:', range);
});

// Открытие файла
api.events.onFileOpen((fileName) => {
  console.log('Открыт файл:', fileName);
});

// Сохранение файла
api.events.onFileSave((fileName) => {
  console.log('Сохранен файл:', fileName);
});

// Отписаться от события
// (нужно сохранить ссылку на callback)
api.events.off('cellChange', myCallback);
```

### Storage API

Хранение данных плагина:

```javascript
// Сохранить значение
api.storage.set('myKey', { some: 'data' });

// Получить значение
const value = api.storage.get('myKey');

// Удалить значение
api.storage.remove('myKey');

// Очистить всё хранилище
api.storage.clear();
```

## 📦 Установка плагина

### Для пользователей

1. Скачайте ZIP-архив плагина
2. В SmartTable нажмите кнопку **Расширения** (иконка с слоями)
3. Нажмите **Установить плагин**
4. Выберите ZIP-файл
5. Плагин появится в списке установленных

### Для разработчиков (локальная установка)

1. Создайте папку с именем плагина в `plugins/`
2. Скопируйте файлы плагина
3. Перезапустите SmartTable

```
sheets/src/electron/plugins/
└── my-plugin/
    ├── manifest.json
    └── main.js
```

## 🧪 Отладка

Используйте консоль разработчика для отладки:

```javascript
export function activate(api) {
  console.log('[MyPlugin] Activated with API:', api);
  
  try {
    // Ваш код
  } catch (error) {
    console.error('[MyPlugin] Error:', error);
  }
}
```

## 📝 Примеры

### Пример 1: Формула

```javascript
export function activate(api) {
  // Добавляем кнопку для вставки пользовательской формулы
  api.ui.addRibbonButton({
    id: 'insert-custom-formula',
    groupId: 'formulas',
    icon: '<svg>...</svg>',
    label: 'Моя формула',
    onClick: () => {
      const range = api.sheets.getSelectedRange();
      if (range) {
        api.sheets.setCell(range.sheetId, range.start, '=MYCUSTOM()');
      }
    }
  });
}
```

### Пример 2: Импорт данных

```javascript
export function activate(api) {
  api.ui.addMenuItem({
    id: 'import-external-data',
    label: 'Импорт данных',
    tab: 'data',
    onClick: async () => {
      try {
        // Загрузка данных из внешнего API
        const response = await fetch('https://api.example.com/data');
        const data = await response.json();
        
        // Вставка в таблицу
        let row = 1;
        for (const item of data) {
          api.sheets.setCell(0, `A${row}`, item.name);
          api.sheets.setCell(0, `B${row}`, item.value);
          row++;
        }
        
        api.ui.showNotification('Данные импортированы!', 'success');
      } catch (error) {
        api.ui.showNotification('Ошибка импорта: ' + error.message, 'error');
      }
    }
  });
}
```

### Пример 3: Автоматизация

```javascript
export function activate(api) {
  let changeCount = 0;
  
  // Отслеживаем изменения
  api.events.onCellChange(() => {
    changeCount++;
    api.storage.set('changeCount', changeCount);
  });
  
  // Добавляем кнопку статистики
  api.ui.addRibbonButton({
    id: 'show-stats',
    groupId: 'home',
    icon: '<svg>...</svg>',
    label: 'Статистика',
    onClick: () => {
      const count = api.storage.get('changeCount') || 0;
      api.ui.showNotification(`Изменений ячеек: ${count}`);
    }
  });
  
  return {
    deactivate: () => {
      console.log('Статистика изменений:', changeCount);
    }
  };
}
```

## 📤 Публикация

### GitHub Releases

1. Создайте репозиторий на GitHub
2. Добавьте релизы с ZIP-архивами:
   ```
   my-plugin-v1.0.0.zip
   ```
3. Пользователи смогут скачивать плагины из Releases

### Структура релиза

```
Releases
└── v1.0.0
    └── my-plugin-v1.0.0.zip
        ├── manifest.json
        ├── main.js
        ├── styles.css
        └── README.md
```

## ⚠️ Ограничения

- Плагины работают в том же контексте, что и основное приложение
- Избегайте изменения глобальных переменных
- Всегда очищайте ресурсы при деактивации
- Не блокируйте основной поток длительными операциями

## 📞 Поддержка

- Документация: В разработке
- Примеры плагинов: Будут добавлены
- Вопросы: Создавайте issues в репозитории SmartTable

---

**Лицензия**: Документация может быть использована свободно для разработки плагинов.
