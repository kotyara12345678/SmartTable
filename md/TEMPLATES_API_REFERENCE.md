# 👨‍💻 Справка разработчика: API системы шаблонов

## Импорты

```python
from src.ui.templates.templates import (
    TemplateManager,
    TemplateApplier,
    ExportTemplate,
    TemplateField,
    DataPattern,
    TemplateGalleryDialog
)
```

---

## TemplateManager - управление шаблонами

### Инициализация

```python
# Создать менеджер
manager = TemplateManager(
    templates_dir="templates",           # встроенные
    user_templates_dir="user_templates"  # пользовательские
)
```

### Загрузка и получение

```python
# Получить все имена
names = manager.get_template_names()
# ['Контакты', 'Продажи', 'Товары', 'Контакты компании']

# Получить шаблон
template = manager.get_template('Контакты')

# Получить подробную информацию
info = manager.get_template_info('Контакты')
# {
#   'name': 'Контакты',
#   'description': '...',
#   'created_at': '2026-02-09T...',
#   'fields_count': 3,
#   'fields': [
#     {'name': 'Имя', 'type': 'text', 'is_key': False},
#     {'name': 'Email', 'type': 'email', 'is_key': False},
#     {'name': 'Телефон', 'type': 'phone', 'is_key': False}
#   ]
# }
```

### Сохранение

```python
# Сохранить как пользовательский
template = ExportTemplate(
    name="Мой шаблон",
    description="Описание",
    fields=[...]
)
manager.save_template(template, is_user_template=True)

# Или как встроенный (не рекомендуется)
manager.save_template(template, is_user_template=False)
```

### Импорт/экспорт

```python
from pathlib import Path

# Экспортировать в файл
manager.export_template('Контакты', Path('export.json'))

# Импортировать из файла
manager.import_template(Path('import.json'), is_user_template=True)
```

### Удаление

```python
# Удалить шаблон
manager.delete_template('Мой шаблон')
```

---

## TemplateApplier - применение структур

### Применить структуру шаблона

```python
# Получить структуру для таблицы
structure = TemplateApplier.apply_template_structure(
    template,
    max_rows=100  # количество пустых строк
)

# Результат
# {
#   'headers': ['Имя', 'Email', 'Телефон'],
#   'rows': [[], [], ...],  # 100 пустых строк
#   'column_types': [DataPattern.TEXT, DataPattern.EMAIL, DataPattern.PHONE],
#   'key_fields': [],  # индексы ключевых полей
#   'settings': {...}
# }

# Использование
headers = structure['headers']
for col_idx, header in enumerate(headers):
    # заполнить заголовок в таблице
    my_table.set_header(col_idx, header)

column_types = structure['column_types']
for col_idx, dtype in enumerate(column_types):
    # применить тип col_idx
    my_table.set_column_type(col_idx, dtype)
```

### Создать пустую таблицу

```python
# Создать таблицу со структурой
table = TemplateApplier.create_empty_table_with_template(
    template,
    rows_count=50  # количество строк
)

# Результат - список списков
# [
#   ['Имя', 'Email', 'Телефон'],  # заголовок
#   ['', '', ''],                   # пустая строка 1
#   ['', '', ''],                   # пустая строка 2
#   ...
# ]
```

### Форматирование

```python
# Получить format string для поля
field = template.fields[0]
format_str = TemplateApplier.get_column_format_string(field)
# Примеры: "dd.mm.yyyy", "#,##0.00 ₽", etc

# Получить валидацию
validation = TemplateApplier.get_validation_formula(field)
# Примеры: "CONTAINS('@')", "IS_NUMBER", "IS_DATE"
```

### Описание шаблона

```python
# Получить текстовое описание
description = TemplateApplier.get_template_description_text(template)
print(description)
# 📋 Шаблон: Контакты
# 📝 Описание: Для списка контактов
# 📅 Создан: 2026-02-09T...
# ...
```

---

## ExportTemplate - объект шаблона

### Создание

```python
from datetime import datetime

template = ExportTemplate(
    name="Новый шаблон",
    description="Описание шаблона",
    created_at=datetime.now().isoformat(),
    modified_at=datetime.now().isoformat()
)
```

### Добавление полей

```python
field = TemplateField(
    name="Email",
    column_index=0,
    pattern=DataPattern.EMAIL,
    format_string="",
    is_key_field=False,
    validation_rules=[]
)

template.fields.append(field)
```

### Конвертация

```python
# В словарь (для JSON)
data = template.to_dict()

# Из словаря (из JSON)
template = ExportTemplate.from_dict(data)
```

---

## DataPattern - типы данных

```python
# Доступные типы
DataPattern.TEXT        # Обычный текст
DataPattern.NUMBER      # Число
DataPattern.CURRENCY    # Деньги
DataPattern.DATE        # Дата
DataPattern.TIME        # Время
DataPattern.EMAIL       # Email
DataPattern.PHONE       # Телефон
DataPattern.URL         # Веб-адрес
DataPattern.PERCENTAGE  # Процент
DataPattern.FORMULA     # Формула

# Получить строку
pattern_str = DataPattern.EMAIL.value  # "email"

# Из строки
pattern = DataPattern("email")
```

---

## TemplateGalleryDialog - UI диалог

### Использование

```python
from PyQt5.QtCore import pyqtSignal

dialog = TemplateGalleryDialog(parent_widget)

# Обработка выбора
def on_template_selected(template_name):
    print(f"Выбран шаблон: {template_name}")

dialog.template_selected.connect(on_template_selected)

# Показать диалог
dialog.exec_()
```

---

## Полный пример: Применить шаблон в приложении

```python
def apply_template(self, template_name: str):
    """Применяет шаблон к новой таблице"""
    try:
        # 1. Загрузить менеджер
        manager = TemplateManager("templates", "user_templates")
        template = manager.get_template(template_name)
        
        if not template:
            show_error(f"Шаблон не найден: {template_name}")
            return
        
        # 2. Создать новую таблицу
        new_spreadsheet = self.create_new_spreadsheet()
        
        # 3. Получить структуру
        structure = TemplateApplier.apply_template_structure(template)
        
        # 4. Применить заголовки
        for col_idx, header in enumerate(structure['headers']):
            new_spreadsheet.set_cell_value(0, col_idx, header)
        
        # 5. Применить типы данных
        for col_idx, dtype in enumerate(structure['column_types']):
            new_spreadsheet.set_column_type(col_idx, dtype)
        
        # 6. Показать результат
        show_info(f"Таблица создана из шаблона '{template_name}'")
        
    except Exception as e:
        show_error(f"Ошибка: {e}")
```

---

## Типичные задачи

### Получить структуру шаблона

```python
manager = TemplateManager()
template = manager.get_template('Контакты')
info = manager.get_template_info('Контакты')

print(f"Полей: {info['fields_count']}")
for field in info['fields']:
    print(f"  - {field['name']} ({field['type']})")
```

### Создать и сохранить шаблон

```python
template = ExportTemplate(
    name="Новый",
    description="Новый шаблон"
)

# Добавить поля
template.fields = [
    TemplateField("ID", 0, DataPattern.TEXT, is_key_field=True),
    TemplateField("Название", 1, DataPattern.TEXT),
    TemplateField("Цена", 2, DataPattern.CURRENCY),
]

manager = TemplateManager()
manager.save_template(template, is_user_template=True)
```

### Обмен шаблонами

```python
manager = TemplateManager()

# Экспорт
manager.export_template('МойШаблон', Path('template.json'))

# Передать файл...

# Импорт
manager.import_template(Path('template.json'), is_user_template=True)
```

### Валидация жонных

```python
template = manager.get_template('Контакты')

# Для каждого поля
for field in template.fields:
    if field.pattern == DataPattern.EMAIL:
        validation = "CONTAINS('@') AND CONTAINS('.')"
    elif field.pattern == DataPattern.PHONE:
        validation = "LENGTH >= 10"
    elif field.pattern == DataPattern.NUMBER:
        validation = "IS_NUMBER"
    # ...
```

---

## Обработка ошибок

```python
from pathlib import Path

try:
    manager = TemplateManager()
    template = manager.get_template('NonExistent')
    
    if not template:
        logging.warning("Шаблон не найден")
        return
    
    # ...
    
except FileNotFoundError:
    logging.error("Файл шаблона не найден")
except json.JSONDecodeError:
    logging.error("Ошибка в JSON файле")
except Exception as e:
    logging.error(f"Неожиданная ошибка: {e}")
    raise
```

---

## Логирование

```python
import logging

logger = logging.getLogger(__name__)

manager = TemplateManager()

# TemplateManager предоставляет логи
# ✓ Загружен встроенный шаблон: Контакты
# ✓ Загружен пользовательский шаблон: МойШаблон
# ✓ Шаблон сохранен: НовыйШаблон
# ✗ Ошибка загрузки шаблона: /path/to/file.json
```

---

## Интеграция в Qt приложение

```python
from PyQt5.QtWidgets import QMainWindow

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.template_manager = TemplateManager()
    
    def open_template_gallery(self):
        dialog = TemplateGalleryDialog(self)
        dialog.template_selected.connect(self.apply_template)
        dialog.exec_()
    
    def apply_template(self, template_name: str):
        template = self.template_manager.get_template(template_name)
        # Применить...
```

---

## Версионирование

```python
# Версия системы
from src.ui.templates.templates import __version__
# Нет встроенной версии, но можно добавить

# Версия формата
# Текущие: 1.1 (февраль 2026)
```

---

## Производительность

```python
import time

manager = TemplateManager()

# Measurement: загрузка 100 шаблонов
start = time.time()
manager.load_templates()  # < 50 ms
print(f"Загрузка: {time.time() - start:.3f}s")

# Measurement: получение структуры
template = manager.get_template('Контакты')
start = time.time()
struct = TemplateApplier.apply_template_structure(template)
print(f"Структура: {time.time() - start:.3f}s")  # < 1 ms
```

---

## Предупреждения

### ⚠️ Не делайте так

```python
# ❌ Прямое редактирование templates/
# Это встроенные файлы, используйте user_templates/

# ❌ Ручное редактирование JSON
# Используйте API TemplateManager

# ❌ Циклические зависимости между шаблонами
# Система не их поддерживает

# ❌ Очень большие шаблоны (> 10000 полей)
# Производительность снижается
```

### ✅ Делайте так

```python
# ✅ Используйте API
manager.save_template(template)

# ✅ Проверяйте существование
if manager.get_template(name):
    # ...

# ✅ Экспортируйте для общего использования
manager.export_template(name, path)

# ✅ Импортируйте чужие шаблоны
manager.import_template(path)
```

---

## Полезные ссылки

- [Template Manager Source](../src/ui/templates/templates/template_manager.py)
- [Template Applier Source](../src/ui/templates/templates/template_applier.py)
- [Template UI Source](../src/ui/templates/templates/template_ui.py)
- [User Guide](TEMPLATES_GUIDE.md)
- [API Improvements](TEMPLATES_IMPROVEMENTS.md)

---

**Версия документации:** 1.0  
**Последняя рационализация:** 9 февраля 2026  
**Статус:** Актуально ✅
