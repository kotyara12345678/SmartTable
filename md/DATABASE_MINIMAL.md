# Упрощённая база данных SmartTable

## Описание

Минимальная локальная SQLite база данных для хранения таблиц, формул и истории файлов. **Без пользователей, ролей и прав доступа** - только для данных.

## Структура БД

### Таблица: `spreadsheets`
```
id          INTEGER PRIMARY KEY
filename    TEXT (уникальное имя файла)
title       TEXT (название таблицы)
content     TEXT (JSON содержимое) 
created_at  TIMESTAMP
updated_at  TIMESTAMP
file_size   INTEGER (размер в байтах)
```

**Индексы:** title, filename, created_at, updated_at

### Таблица: `sheet_functions`
```
id          INTEGER PRIMARY KEY
name        TEXT UNIQUE (имя функции)
category    TEXT (math, text, logic, date)
formula     TEXT (синтаксис формулы)
description TEXT (описание)
example     TEXT (пример использования)
created_at  TIMESTAMP
```

**Индексы:** category, name

### Таблица: `recent_files`
```
id          INTEGER PRIMARY KEY
filename    TEXT
file_path   TEXT (полный путь)
opened_at   TIMESTAMP
size_mb     REAL (размер в МБ)
```

**Индексы:** opened_at DESC

## Расположение БД

```
~/.smarttable/smarttable.db
```

На Windows: `C:\Users\[username]\.smarttable\smarttable.db`

## Встроенные функции

### Математические (10)
- SUM, AVERAGE, MIN, MAX, COUNT, SQRT, POWER, ABS, ROUND, MOD

### Текстовые (9)
- CONCATENATE, LEN, UPPER, LOWER, TRIM, LEFT, RIGHT, FIND, REPLACE

### Логические (1)
- IF

### Дата/Время (2)
- NOW, TODAY

**Итого: 22 встроенные функции**

## API DatabaseManager

### Таблицы

```python
# Создать
sheet = db.create_spreadsheet("file.xlsx", "Название", "{}")

# Получить
sheet = db.get_spreadsheet_by_id(1)
sheet = db.get_spreadsheet_by_filename("file.xlsx")

# Список
sheets = db.get_all_spreadsheets(limit=50)

# Поиск
sheets = db.search_spreadsheets("Продажи")

# Обновить
db.update_spreadsheet(id, filename="", title="", content="")

# Удалить
result = db.delete_spreadsheet(id)
```

### Функции

```python
# Все функции
funcs = db.get_all_functions()

# По категории
funcs = db.get_functions_by_category("math")

# Поиск
funcs = db.search_functions("SQRT")
```

### Недавние

```python
# Добавить
db.add_recent_file("file.xlsx", "/path/to/file.xlsx", 2.5)

# Получить последние
files = db.get_recent_files(limit=20)
```

### Информация

```python
info = db.get_database_info()
# {
#   'db_path': '~/.smarttable/smarttable.db',
#   'db_size_mb': 0.15,
#   'spreadsheets': 5,
#   'functions': 22,
#   'recent_files': 10,
#   'version': 1
# }
```

## Использование

```python
from pysheets.src.db import DatabaseManager, Spreadsheet

# Инициализация
db = DatabaseManager()  # или DatabaseManager(":memory:") для тестов

# Работа с таблицами
sheet = db.create_spreadsheet("sales.xlsx", "Продажи 2024")
print(db.get_database_info())
```

## Миграции

Система версионирования позволяет обновлять схему:
- v1: Начальная схема (таблицы, функции, недавние файлы)

## Производительность

- **Индексы** на часто используемые поля (title, filename, category)
- **PRAGMA foreign_keys** включен для целостности
- **Context managers** для правильного управления соединениями
- **:memory:** режим для тестирования

## Заметки

- БД автоматически создаёт таблицы при первом запуске
- 22 встроенные функции загружаются автоматически
- Нет пользовательских данных - чистая локальная хранилище
- COM для :memory: БД используется постоянное соединение
