# 🔌 Independent Plugins для SmartTable

Эта папка содержит **независимые плагины**, которые не связаны с основным кодом приложения.

## 📁 Что здесь находится

Каждая подпапка — это готовый плагин, который можно:
- Использовать в приложении
- Опубликовать на GitHub Releases
- Передать другим разработчикам как пример

## 📦 Доступные плагины

### Notes Plugin (`notes-plugin/`)

Плагин для создания и хранения заметок.

**Возможности:**
- Создание/редактирование/удаление заметок
- Автосохранение при вводе
- Отдельное модальное окно
- Сохранение между сессиями

**Установка:**
```bash
# Скопировать в папку плагинов SmartTable
cp -r notes-plugin %APPDATA%/SmartTable/plugins/
```

**Использование:**
1. Включить в панели **Расширения**
2. Открыть вкладку **Вставка**
3. Нажать кнопку **Заметки**

---

## 🚀 Как создать свой плагин

### 1. Скопируйте шаблон

```bash
cp -r notes-plugin my-new-plugin
cd my-new-plugin
```

### 2. Отредактируйте manifest.json

```json
{
  "id": "com.example.my-plugin",
  "name": "Мой Плагин",
  "version": "1.0.0",
  "description": "Описание",
  "author": "Ваше Имя",
  "main": "main.js",
  "apiVersion": "1.0"
}
```

### 3. Напишите код в main.js

```javascript
export function activate(api) {
  api.ui.addRibbonButton({
    id: 'my-btn',
    groupId: 'insert',
    icon: '<svg>...</svg>',
    label: 'Кнопка',
    onClick: () => {
      api.ui.showNotification('Привет!');
    }
  });
}
```

### 4. Протестируйте

Скопируйте в `plugins/` и включите в приложении.

---

## 📤 Публикация

### Подготовка ZIP

```bash
# В папке плагина
zip -r ../my-plugin-v1.0.0.zip manifest.json main.js styles.css README.md
```

### GitHub Releases

1. Создайте репозиторий на GitHub
2. Создайте релиз с тегом (например, `v1.0.0`)
3. Прикрепите ZIP-файл
4. Добавьте в `PluginMarketplace.ts`

---

## 📚 Документация

- [Полное руководство по разработке плагинов](../plugins/PLUGIN_DEVELOPER_GUIDE.md)
- [Примеры API](../plugins/DEVELOPER_GUIDE.md)

---

## ⚖️ Лицензия

Все плагины в этой папке могут использоваться свободно для обучения и в продакшене.
