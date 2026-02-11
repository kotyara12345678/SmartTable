# SmartTable - Упрощённая локальная БД

## Быстрый старт (30 сек)

```python
from pysheets.src.db import DatabaseManager, Spreadsheet, SheetFunction

# Инициализация
db = DatabaseManager()

# Создать таблицу
sheet = db.create_spreadsheet("sales.xlsx", "Продажи 2024")
print(f"✅ Создана таблица: {sheet.title}")

# Получить все таблицы
sheets = db.get_all_spreadsheets()
print(f"📊 Всего таблиц: {len(sheets)}")

# Получить функции
funcs = db.get_all_functions()
print(f"📐 Функций: {len(funcs)}")

# Информация
info = db.get_database_info()
print(info)
```

## Что внутри

### 3 таблицы
1. **spreadsheets** - ваши таблицы
2. **sheet_functions** - 22 встроенные функции
3. **recent_files** - история файлов

### 22 функции готовы к использованию
- **Math:** SUM, AVERAGE, MIN, MAX, COUNT, SQRT, POWER, ABS, ROUND, MOD
- **Text:** CONCATENATE, LEN, UPPER, LOWER, TRIM, LEFT, RIGHT, FIND, REPLACE  
- **Logic:** IF
- **Date:** NOW, TODAY

## Примеры

### Работа с таблицами
```python
# Создать
sheet = db.create_spreadsheet("file.xlsx", "Название", '{"A1": 100}')

# Получить
sheet = db.get_spreadsheet_by_id(1)
sheet = db.get_spreadsheet_by_filename("file.xlsx")

# Обновить
db.update_spreadsheet(1, title="Новое название")

# Удалить
db.delete_spreadsheet(1)

# Поиск
results = db.search_spreadsheets("2024")
```

### Работа с функциями
```python
# Все функции
funcs = db.get_all_functions()

# По категории
math_funcs = db.get_functions_by_category("math")

# Поиск
sqrt_funcs = db.search_functions("SQRT")
```

### Недавние файлы
```python
# Добавить
db.add_recent_file("file.xlsx", "/path/to/file.xlsx", 2.5)

# Получить
recent = db.get_recent_files(limit=20)
```

## Структура БД

```sql
-- Таблица таблиц
CREATE TABLE spreadsheets (
  id INTEGER PRIMARY KEY,
  filename TEXT,           -- уникальное имя файла
  title TEXT,              -- название для UI
  content TEXT,            -- JSON с данными {A1: value, B1: value}
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  file_size INTEGER
);

-- Встроенные функции
CREATE TABLE sheet_functions (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE,        -- SUM, SQRT, CONCATENATE
  category TEXT,           -- math, text, date, logic
  formula TEXT,            -- синтаксис функции
  description TEXT,        -- описание для UI
  example TEXT,            -- пример использования
  created_at TIMESTAMP
);

-- История файлов
CREATE TABLE recent_files (
  id INTEGER PRIMARY KEY,
  filename TEXT,
  file_path TEXT,
  opened_at TIMESTAMP,
  size_mb REAL
);
```

## Расположение

```
MacOS/Linux:     ~/.smarttable/smarttable.db
Windows:         C:\Users\[username]\.smarttable\smarttable.db
```

## Тестирование

```bash
# Тест БД (3 таблицы, CRUD, поиск)
python test_utills/test_db_minimal.py

# Тест формул (SQRT, комплексные выражения)
python test_utills/test_sqrt_formulas.py
```

## API Справка

### DatabaseManager

```python
def __init__(self, db_path=None)
def get_connection()                                # Context manager
def get_database_info() -> Dict                     # Статистика БД

# Таблицы
def create_spreadsheet(filename, title, content)    # Создать
def get_spreadsheet_by_id(id) -> Spreadsheet        # Получить по ID
def get_spreadsheet_by_filename(name) -> Spreadsheet # Получить по имени
def get_all_spreadsheets(limit=50) -> [Spreadsheet] # Все таблицы
def search_spreadsheets(query) -> [Spreadsheet]     # Поиск
def update_spreadsheet(id, filename, title, content) -> bool  # Обновить
def delete_spreadsheet(id) -> bool                  # Удалить

# Функции
def get_all_functions() -> [SheetFunction]          # Все функции
def get_functions_by_category(cat) -> [SheetFunction] # По категории
def search_functions(query) -> [SheetFunction]      # Поиск

# Недавние
def add_recent_file(filename, path, size_mb) -> bool
def get_recent_files(limit=20) -> [RecentFile]
```

## Характеристики

- ✅ **Локальное хранилище** - никакие сервера
- ✅ **Автоматическая инициализация** - таблицы создаются при старте
- ✅ **Встроенные функции** - 22 готовых функций
- ✅ **Индексирование** - быстрый поиск
- ✅ **Миграции** - система обновления схемы
- ✅ **Context managers** - правильное управление ресурсами
- ✅ **Для тестирования** - поддержка :memory: БД

## Что удалено (не нужно для локального приложения)

- ❌ Авторизация пользователей
- ❌ Контроль прав доступа
- ❌ Аудит операций
- ❌ Криптография паролей
- ❌ Многопользовательский доступ

## Для разработчиков

### Добавить новую встроенную функцию

В `database_manager.py` метод `_init_default_functions()`:

```python
functions = [
    # ... существующие
    ('CUSTOM', 'category', 'CUSTOM(arg)', 'Описание', '=CUSTOM(A1)'),
]
```

### Добавить поле в таблицу (миграция)

В методе `_migrate_database()`:

```python
def _create_schema_v2(self, cursor):
    # Новые таблицы или ALTER TABLE
    cursor.execute('ALTER TABLE spreadsheets ADD COLUMN new_field TEXT')
```

## Лицензия

SmartTable - локальное приложение для работы с таблицами

---

**Версия БД:** 1.0  
**Встроенные функции:** 22  
**Таблицы:** 3  
**Индексы:** 4  
