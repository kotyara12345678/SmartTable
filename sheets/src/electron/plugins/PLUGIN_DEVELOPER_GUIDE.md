# 🔌 Разработка плагинов для SmartTable

Полное руководство по созданию, публикации и установке плагинов.

---

## 📖 Оглавление

1. [Что такое плагин](#что-такое-плагин)
2. [Быстрый старт](#быстрый-старт)
3. [Структура плагина](#структура-плагина)
4. [Manifest.json](#manifestjson)
5. [Plugin API](#plugin-api)
6. [Публикация на GitHub](#публикация-на-github)
7. [Автоматическая установка](#автоматическая-установка)
8. [Примеры](#примеры)
9. [Отладка](#отладка)
10. [Частые вопросы](#частые-вопросы)

---

## 🎯 Что такое плагин

**Плагин** — это модуль расширения, который добавляет новые функции в SmartTable без изменения основного кода приложения.

### Возможности плагинов

- ✅ Добавление кнопок в ленту (Ribbon)
- ✅ Создание боковых панелей
- ✅ Работа с ячейками и листами
- ✅ Подписка на события (изменение ячеек, открытие файлов)
- ✅ Показ уведомлений и модальных окон
- ✅ Хранение данных плагина
- ✅ Интеграция с внешними API

### Ограничения

- ❌ Плагины не могут изменять ядро SmartTable
- ❌ Нет доступа к файловой системе за пределами plugins/
- ❌ Нельзя блокировать основной поток длительными операциями

---

## 🚀 Быстрый старт

### 1. Создайте папку плагина

```bash
cd sheets/src/electron/plugins
mkdir my-awesome-plugin
cd my-awesome-plugin
```

### 2. Создайте manifest.json

```json
{
  "id": "com.example.my-awesome-plugin",
  "name": "My Awesome Plugin",
  "version": "1.0.0",
  "description": "Мой потрясающий плагин для SmartTable",
  "author": "Ваше Имя",
  "main": "main.js",
  "apiVersion": "1.0",
  "permissions": [
    "sheets.read",
    "sheets.write",
    "ui.ribbon"
  ]
}
```

### 3. Создайте main.js

```javascript
/**
 * My Awesome Plugin
 * Точка входа плагина
 */

export function activate(api) {
  console.log('[MyAwesomePlugin] Активирован!');
  
  // Добавляем кнопку в ленту
  api.ui.addRibbonButton({
    id: 'my-awesome-btn',
    groupId: 'insert',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
      <path d="M2 17l10 5 10-5"/>
      <path d="M2 12l10 5 10-5"/>
    </svg>`,
    label: 'Awesome',
    tooltip: 'Нажми для awesome действия',
    onClick: () => {
      const range = api.sheets.getSelectedRange();
      if (range) {
        api.sheets.setCell(range.sheetId, range.start, '🚀 Awesome!');
        api.ui.showNotification('Ячейка заполнена!', 'success');
      } else {
        api.ui.showNotification('Выделите ячейку сначала', 'warning');
      }
    }
  });
  
  // Подписываемся на события
  api.events.onCellChange((sheetId, cellId, value) => {
    console.log(`[MyAwesomePlugin] Ячейка ${cellId} изменена на ${value}`);
  });
  
  // Возвращаем объект для деактивации
  return {
    deactivate: () => {
      console.log('[MyAwesomePlugin] Деактивирован');
    }
  };
}
```

### 4. Запустите SmartTable

```bash
cd sheets/src/electron
npm run dev
```

### 5. Включите плагин

1. Нажмите кнопку **Расширения** 📦 на верхней панели
2. Перейдите на вкладку **Установленные**
3. Найдите "My Awesome Plugin"
4. Нажмите **Включить**

Готово! Кнопка появится в ленте на вкладке "Вставка".

---

## 📦 Структура плагина

```
my-plugin/
├── manifest.json          # Обязательный файл метаданных
├── main.js                # Точка входа (обязательно)
├── README.md              # Документация (рекомендуется)
├── styles.css             # Стили (опционально)
├── assets/                # Ресурсы (иконки, изображения)
│   └── icon.png
└── lib/                   # Дополнительные модули (опционально)
    └── utils.js
```

### Требования к файлам

| Файл | Обязательный | Описание |
|------|-------------|----------|
| `manifest.json` | ✅ | Метаданные плагина |
| `main.js` | ✅ | Точка входа, функция `activate(api)` |
| `README.md` | ❌ | Документация для пользователей |
| `styles.css` | ❌ | Пользовательские стили |
| `assets/` | ❌ | Иконки, изображения |

---

## 📄 Manifest.json

### Полная структура

```json
{
  "id": "com.example.my-plugin",
  "name": "Название Плагина",
  "version": "1.0.0",
  "description": "Подробное описание возможностей плагина",
  "author": "Ваше Имя <email@example.com>",
  "main": "main.js",
  "styles": ["styles.css"],
  "apiVersion": "1.0",
  "permissions": [
    "sheets.read",
    "sheets.write",
    "ui.ribbon",
    "ui.panel",
    "events.subscribe",
    "storage.read",
    "storage.write"
  ],
  "icon": "assets/icon.png",
  "homepage": "https://github.com/username/my-plugin",
  "repository": {
    "type": "git",
    "url": "https://github.com/username/my-plugin.git"
  },
  "keywords": ["формулы", "диаграммы", "импорт"],
  "license": "MIT"
}
```

### Поля

| Поле | Тип | Обязательное | Описание |
|------|-----|-------------|----------|
| `id` | string | ✅ | Уникальный ID в reverse-DNS стиле |
| `name` | string | ✅ | Название для отображения |
| `version` | string | ✅ | Версия по semver (мажорная.минорная.патч) |
| `description` | string | ✅ | Краткое описание (1-2 предложения) |
| `author` | string | ✅ | Автор (можно с email) |
| `main` | string | ✅ | Главный файл (точка входа) |
| `styles` | string[] | ❌ | Массив CSS файлов |
| `apiVersion` | string | ✅ | Версия API SmartTable |
| `permissions` | string[] | ❌ | Запрашиваемые разрешения |
| `icon` | string | ❌ | Путь к иконке (PNG, 48x48) |
| `homepage` | string | ❌ | Ссылка на сайт/репозиторий |
| `keywords` | string[] | ❌ | Ключевые слова для поиска |
| `license` | string | ❌ | Лицензия (MIT, Apache-2.0 и т.д.) |

### Разрешения (Permissions)

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
| `ui.notification` | Показ уведомлений |
| `events.subscribe` | Подписка на события |
| `storage.read` | Чтение хранилища плагина |
| `storage.write` | Запись в хранилище |

---

## 🔌 Plugin API

### Объект API

Плагин получает объект `api` в функции `activate(api)`:

```javascript
export function activate(api) {
  // api.sheets - работа с таблицами
  // api.ui - UI компоненты
  // api.events - события
  // api.storage - хранилище
}
```

### Sheets API

```javascript
// Получить значение ячейки
const value = api.sheets.getCell(sheetId, 'A1');

// Установить значение ячейки
api.sheets.setCell(sheetId, 'B2', 'Новое значение');

// Установить формулу
api.sheets.setCell(sheetId, 'C3', '=SUM(A1:A10)');

// Получить выделенный диапазон
const range = api.sheets.getSelectedRange();
// Возвращает: { sheetId: number, start: string, end: string } | null

// Получить информацию о листе
const sheet = api.sheets.getSheet(sheetId);
// Возвращает: { id, name, rowCount, columnCount } | null

// Создать новый лист
const newSheetId = api.sheets.createSheet('Новый лист');

// Удалить лист
api.sheets.deleteSheet(sheetId);

// Получить все листы
const allSheets = api.sheets.getAllSheets();
// Возвращает: Array<{ id, name, rowCount, columnCount }>
```

### UI API

#### Добавление кнопки в ленту

```javascript
api.ui.addRibbonButton({
  id: 'unique-btn-id',
  groupId: 'insert', // 'home', 'insert', 'formulas', 'data', 'view'
  icon: '<svg viewBox="0 0 24 24">...</svg>', // SVG иконка
  label: 'Текст кнопки',
  tooltip: 'Подсказка при наведении',
  size: 'sm', // или 'lg'
  onClick: () => {
    // Обработчик клика
    const range = api.sheets.getSelectedRange();
    if (range) {
      api.sheets.setCell(range.sheetId, range.start, 'Hello!');
    }
  }
});
```

#### Добавление пункта меню

```javascript
api.ui.addMenuItem({
  id: 'unique-menu-id',
  label: 'Пункт меню',
  tab: 'home', // вкладка меню
  onClick: () => {
    // Обработчик
  }
});
```

#### Добавление боковой панели

```javascript
api.ui.addPanel({
  id: 'my-side-panel',
  title: 'Моя панель',
  content: '<div>HTML содержимое</div>',
  width: 400,
  position: 'right' // или 'left'
});
```

#### Показ модального окна

```javascript
api.ui.showModal(`
  <div style="padding: 20px;">
    <h2>Заголовок</h2>
    <p>Содержимое модального окна</p>
    <button onclick="window.SmartTableAPI.ui.closeModals()">Закрыть</button>
  </div>
`);

// Закрыть все модальные окна
api.ui.closeModals();
```

#### Показ уведомлений

```javascript
api.ui.showNotification('Текст уведомления', 'success');
// Типы: 'info' (по умолчанию), 'success', 'warning', 'error'
```

### Events API

```javascript
// Изменение ячейки
api.events.onCellChange((sheetId, cellId, value) => {
  console.log(`Ячейка ${cellId} изменена на ${value}`);
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
  console.log('Выделение:', range);
});

// Открытие файла
api.events.onFileOpen((fileName) => {
  console.log('Открыт файл:', fileName);
});

// Сохранение файла
api.events.onFileSave((fileName) => {
  console.log('Сохранен файл:', fileName);
});

// Отписаться от события (нужно сохранить ссылку на callback)
const myCallback = (sheetId, cellId, value) => {...};
api.events.onCellChange(myCallback);
api.events.off('cellChange', myCallback);
```

### Storage API

```javascript
// Сохранить значение
api.storage.set('myKey', { some: 'data', count: 42 });

// Получить значение
const value = api.storage.get('myKey');

// Получить с значением по умолчанию
const valueWithDefault = api.storage.get('unknownKey', 'default');

// Удалить значение
api.storage.remove('myKey');

// Очистить всё хранилище плагина
api.storage.clear();
```

---

## 🌐 Публикация на GitHub

### 1. Создайте репозиторий

```bash
# Локально
git init
git add .
git commit -m "Initial commit"

# Создайте репозиторий на GitHub
# Затем добавьте remote
git remote add origin https://github.com/username/my-plugin.git
git push -u origin main
```

### 2. Создайте релиз

1. Перейдите в репозиторий на GitHub
2. **Releases** → **Draft a new release**
3. Выберите тег (например, `v1.0.0`)
4. Название релиза (например, `v1.0.0 - Initial Release`)
5. Описание изменений
6. **Attach binaries** — загрузите ZIP-архив

### 3. Структура ZIP-архива

```
my-plugin-v1.0.0.zip
├── manifest.json
├── main.js
├── README.md
├── styles.css (если есть)
└── assets/ (если есть)
    └── icon.png
```

**Важно:** ZIP должен содержать файлы в корне, а не в папке!

### 4. Создание ZIP через CLI

```bash
# В папке плагина
zip -r ../my-plugin-v1.0.0.zip manifest.json main.js README.md styles.css assets/
```

Или используйте скрипт в package.json:

```json
{
  "scripts": {
    "package": "zip -r my-plugin-v1.0.0.zip manifest.json main.js README.md"
  }
}
```

---

## ⬇️ Автоматическая установка

### Как это работает

```
1. Пользователь нажимает [⬇️] в маркетплейсе
2. PluginInstaller получает releaseUrl из маркетплейса
3. GET GitHub API → /repos/{owner}/{repo}/releases/latest
4. Находит .zip в assets релиза
5. Скачивает ZIP
6. Через IPC → main процесс
7. AdmZip распаковывает в userData/plugins/
8. Валидирует manifest.json
9. PluginManager загружает плагин
10. Плагин активируется ✅
```

### Добавление плагина в маркетплейс

Откройте файл `sheets/src/electron/src/ui/core/plugins/PluginMarketplace.ts` и добавьте:

```typescript
this.plugins = [
  // ... другие плагины
  
  {
    id: 'com.example.my-plugin',
    name: 'My Plugin',
    version: '1.0.0',
    description: 'Описание плагина',
    author: 'Your Name',
    downloads: 0,
    rating: 0,
    icon: '',
    repository: 'https://github.com/username/my-plugin',
    releaseUrl: 'https://github.com/username/my-plugin/releases/latest',
    tags: ['tag1', 'tag2'],
    lastUpdated: '2026-03-06'
  }
];
```

Теперь плагин появится в маркетплейсе и пользователи смогут установить его в один клик!

---

## 📚 Примеры

### Пример 1: Формула

```javascript
export function activate(api) {
  api.ui.addRibbonButton({
    id: 'insert-custom-formula',
    groupId: 'formulas',
    icon: '<svg>Σ</svg>',
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

### Пример 2: Импорт данных из API

```javascript
export function activate(api) {
  api.ui.addMenuItem({
    id: 'import-currency-rates',
    label: 'Импорт курсов валют',
    tab: 'data',
    onClick: async () => {
      try {
        const response = await fetch('https://api.exchangerate.com/latest');
        const data = await response.json();
        
        let row = 1;
        for (const [currency, rate] of Object.entries(data.rates)) {
          api.sheets.setCell(0, `A${row}`, currency);
          api.sheets.setCell(0, `B${row}`, rate);
          row++;
        }
        
        api.ui.showNotification('Курсы валют импортированы!', 'success');
      } catch (error) {
        api.ui.showNotification('Ошибка импорта: ' + error.message, 'error');
      }
    }
  });
}
```

### Пример 3: Автоматическое форматирование

```javascript
export function activate(api) {
  api.ui.addRibbonButton({
    id: 'auto-format-table',
    groupId: 'home',
    icon: '<svg>🎨</svg>',
    label: 'Авто-формат',
    onClick: () => {
      const range = api.sheets.getSelectedRange();
      if (!range) {
        api.ui.showNotification('Выделите диапазон ячеек', 'warning');
        return;
      }
      
      // Форматируем заголовок
      for (let col = range.start.charCodeAt(0); col <= range.end.charCodeAt(0); col++) {
        const cellId = String.fromCharCode(col) + range.start.replace(/\d+/, '');
        // Здесь был бы код форматирования
      }
      
      api.ui.showNotification('Таблица отформатирована!', 'success');
    }
  });
}
```

### Пример 4: Статистика изменений

```javascript
export function activate(api) {
  let changeCount = 0;
  
  api.events.onCellChange(() => {
    changeCount++;
    api.storage.set('changeCount', changeCount);
  });
  
  api.ui.addRibbonButton({
    id: 'show-stats',
    groupId: 'home',
    icon: '<svg>📊</svg>',
    label: 'Статистика',
    onClick: () => {
      const count = api.storage.get('changeCount') || 0;
      api.ui.showNotification(`Изменений ячеек: ${count}`);
    }
  });
  
  return {
    deactivate: () => {
      console.log('Total changes:', changeCount);
    }
  };
}
```

---

## 🐛 Отладка

### Консоль разработчика

Откройте DevTools в Electron:

```javascript
// В main.ts или через меню
mainWindow.webContents.openDevTools();
```

### Логирование в плагине

```javascript
export function activate(api) {
  console.log('[MyPlugin] Активирован!');
  console.log('[MyPlugin] API version:', api.version);
  
  try {
    // Ваш код
  } catch (error) {
    console.error('[MyPlugin] Error:', error);
    api.ui.showNotification('Ошибка: ' + error.message, 'error');
  }
}
```

### Проверка API

```javascript
export function activate(api) {
  console.log('Available API methods:', {
    sheets: Object.keys(api.sheets),
    ui: Object.keys(api.ui),
    events: Object.keys(api.events),
    storage: Object.keys(api.storage)
  });
}
```

---

## ❓ Частые вопросы

### Q: Как получить выбранные ячейки?

```javascript
const range = api.sheets.getSelectedRange();
if (range) {
  console.log('Выделено:', range.start, 'до', range.end);
}
```

### Q: Как перебрать все ячейки в диапазоне?

```javascript
const range = api.sheets.getSelectedRange();
if (range) {
  const startCol = range.start.charCodeAt(0);
  const endCol = range.end.charCodeAt(0);
  const rowNum = parseInt(range.start.replace(/\D/, ''));
  
  for (let col = startCol; col <= endCol; col++) {
    for (let row = rowNum; row <= rowNum + 5; row++) {
      const cellId = String.fromCharCode(col) + row;
      const value = api.sheets.getCell(range.sheetId, cellId);
      console.log(cellId, value);
    }
  }
}
```

### Q: Как сохранить данные между сессиями?

```javascript
// Сохранение
api.storage.set('userSettings', { theme: 'dark', fontSize: 14 });

// Загрузка при следующей активации
const settings = api.storage.get('userSettings');
```

### Q: Можно ли использовать сторонние библиотеки?

Да! Упакуйте их в папку `lib/` и импортируйте:

```javascript
import { myFunction } from './lib/utils.js';

export function activate(api) {
  myFunction();
}
```

### Q: Как обновить плагин?

1. Увеличьте версию в `manifest.json`
2. Создайте новый релиз на GitHub с новым ZIP
3. Пользователи получат уведомление об обновлении

### Q: Плагин не загружается, что делать?

1. Проверьте консоль на ошибки
2. Убедитесь что `manifest.json` валиден
3. Проверьте что `main.js` существует
4. Убедитесь что функция `activate` экспортируется

---

## 📞 Поддержка

- **Документация**: Этот файл
- **Примеры**: `plugins/example-plugin/`
- **Вопросы**: Создавайте issues в репозитории SmartTable

---

**Лицензия**: Эта документация может быть использована свободно для разработки плагинов.
