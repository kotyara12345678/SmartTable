# Плагины SmartTable

Эта папка предназначена для установки плагинов расширений.

## Структура плагина

```
plugin-name/
├── manifest.json          # Метаданные плагина
├── main.js                # Точка входа
├── styles.css             # Стили (опционально)
└── assets/                # Ресурсы (опционально)
```

## Пример manifest.json

```json
{
  "id": "unique-plugin-id",
  "name": "Название плагина",
  "version": "1.0.0",
  "description": "Описание возможностей",
  "author": "Автор",
  "main": "main.js",
  "styles": ["styles.css"],
  "apiVersion": "1.0",
  "permissions": ["sheets.read", "sheets.write", "ui.ribbon"]
}
```

## Установка

1. Скачайте ZIP-архив плагина
2. Распакуйте в эту папку
3. Перезапустите SmartTable

## Разработка

Документация для разработчиков плагинов будет доступна в будущем.
