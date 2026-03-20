# Notes Plugin для SmartTable

Простой плагин для создания и хранения заметок в SmartTable.

## Особенности

- 📝 Создание и редактирование заметок
- 💾 Автоматическое сохранение в локальном хранилище
- 🎨 Плавающая кнопка в правом нижнем углу
- 🚀 Независимость от API приложения
- 📦 Автоматическая сборка и публикация

## Установка

### Вариант 1: Через SmartTable Marketplace
1. Откройте SmartTable
2. Перейдите в **Extensions** (плагины)
3. Найдите **"Заметки"**
4. Нажмите **"Установить"**

### Вариант 2: Ручная установка
1. Скачайте `notes-plugin.zip` из [Releases](https://github.com/kotyara12345678/SmartTable_notes_plugin/releases)
2. В SmartTable откройте **Extensions**
3. Нажмите **"Установить"** и выберите ZIP файл

## Использование

1. После активации в **правом нижнем углу** появится зелёная кнопка 📝
2. Нажмите на кнопку для открытия окна заметок
3. Создавайте, редактируйте и удаляйте заметки
4. Все заметки сохраняются автоматически

## Разработка

### Структура проекта
```
notes-plugin/
├── main.js           # Основной код плагина
├── manifest.json     # Манифест плагина
├── styles.css        # Стили (опционально)
├── README.md         # Документация
├── package.json      # Зависимости и скрипты
├── scripts/
│   ├── build.js      # Скрипт сборки ZIP
│   └── release.js    # Скрипт публикации в GitHub
├── build/            # Папка сборки (автоматически)
└── releases/         # Копии релизов (автоматически)
```

### Сборка и публикация

```bash
# Установка зависимостей
npm install

# Сборка ZIP архива
npm run build

# Публикация в GitHub Releases
npm run release -- --token YOUR_GITHUB_TOKEN

# Или через переменную окружения
GITHUB_TOKEN=your_token npm run release
```

### Создание GitHub Token

1. Перейдите на https://github.com/settings/tokens/new
2. Выберите разрешения: **repo** (Full control of private repositories)
3. Скопируйте токен
4. Используйте при публикации: `npm run release -- --token YOUR_TOKEN`

## Авто-версионирование

При каждом запуске `npm run release`:
- Версия берётся из `manifest.json`
- Создаётся/обновляется релиз с тегом `plugin`
- ZIP файл загружается как ассет релиза
- Старые ассеты удаляются

Для обновления версии измените `version` в `manifest.json`:
```json
{
  "version": "1.0.1"
}
```

## API

Плагин использует следующее API SmartTable:

- `api.storage.get/set` - хранение данных
- `api.ui.showModal/closeModals` - модальные окна

## Лицензия

MIT

## Автор

SmartTable Team
