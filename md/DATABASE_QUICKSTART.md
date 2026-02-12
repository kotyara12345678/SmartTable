# Интеграция БД - Быстрый старт

## ⚡ За 5 минут

### 1. Установка зависимостей

```bash
pip install -r requirements.txt
```

Проверьте что есть `bcrypt>=4.0.0`

### 2. Инициализация при запуске

БД инициализируется автоматически при запуске приложения:

```python
# main.py - уже интегрировано
db_manager = init_database()
window.set_database_manager(db_manager)
```

### 3. Базовое использование

```python
from pysheets.src.db import DatabaseManager
from pysheets.src.util.database import AuthenticationManager
from pysheets.src.db.models import Permission

# Инициализация
db = DatabaseManager()
auth = AuthenticationManager(db)

# Вход пользователя
if auth.login("admin", "admin123"):
    print(f"Авторизован: {auth.current_user.username}")

    # Проверка разрешения
    if auth.check_permission(Permission.CREATE_FILE):
        # Создание файла
        sheet = db.create_spreadsheet(
            owner_id=auth.current_user.id,
            filename="test.db",
            title="Test Sheet"
        )
```

## 📌 Интеграция в MainWindow

```python
# src/ui/main_window.py

from pysheets.src.db.database_manager import DatabaseManager
from pysheets.src.util.database import AuthenticationManager


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.db_manager = None
        self.auth_manager = None

    def set_database_manager(self, db_manager: DatabaseManager):
        """Установить менеджер БД"""
        self.db_manager = db_manager
        self.auth_manager = AuthenticationManager(db_manager)

    def on_file_save(self):
        """Сохранение с проверкой разрешений"""
        if not self.auth_manager or not self.auth_manager.is_authenticated():
            show_error_message("Требуется аутентификация")
            return

        try:
            self.auth_manager.require_permission(Permission.EDIT_FILE)
            # Сохраняем файл...

        except PermissionError:
            show_error_message("Отказано в доступе")
```

## 🔑 Аутентификация пользователя

### Демо учётные данные (первый запуск)

```
ADMIN
└─ username: admin
└─ password: admin123
└─ role: admin (все разрешения)

USER
└─ username: user
└─ password: user123
└─ role: user (создание, редактирование файлов)
```

### Создание нового пользователя

```python
new_user = db.create_user(
    username="newuser",
    email="newuser@example.com",
    password="secure_pass",
    full_name="New User",
    role=UserRole.EDITOR
)
```

## 🗂️ Структура файлов

```
pysheets/
├── src/
│   └── db/
│       ├── __init__.py          # Экспорты модуля
│       ├── models.py            # Модели данных
│       ├── database_manager.py  # Основной класс БД
│       ├── database_utils.py    # Утилиты (Auth, Init)
│       └── decorators.py        # Декораторы
│
└── main.py                      # (обновлено с инициализацией БД)

test_utills/
└── test_database_integration.py # Примеры использования
```

## 🧪 Примеры

### Выполнить демонстрацию

```bash
python test_utills/test_database_integration.py
```

### Проверка БД

```python
from pysheets.src.db import DatabaseManager

db = DatabaseManager()
info = db.get_database_info()

print(f"Путь БД: {info['db_path']}")
print(f"Размер: {info['db_size_mb']:.2f} MB")
print(f"Пользователей: {info['users']}")
print(f"Таблиц: {info['spreadsheets']}")
print(f"Логов аудита: {info['audit_logs']}")
```

## 🎯 Примеры использования в коде

### Поиск таблиц

```python
# Поиск таблиц пользователя
results = db.search_spreadsheets(
    user_id=auth_manager.current_user.id,
    query="sales",
    limit=10
)

for sheet in results:
    print(f"- {sheet.title} ({sheet.filename})")
```

### Проверка разрешений перед действием

```python
# Проверка перед действием
def on_delete_file(self):
    try:
        self.auth_manager.require_permission(Permission.DELETE_FILE)
        # Удаляем файл
        self.db.delete_spreadsheet(file_id)
    except PermissionError as e:
        show_error_message(f"Отказано: {e}")
```

### Логирование действий

```python
# Выдача разрешений администратором
if auth_manager.is_admin():
    db.update_user_role(user_id, UserRole.EDITOR)
    # Логируется автоматически в audit_logs
```

## 🚀 Развёртывание .exe

Для сборки .exe версии:

```bash
# В pysheets/
pyinstaller pysheets.spec
```

БД будет автоматически создана в:
```
C:\Users\<username>\.smarttable\smarttable.db
```

## ⚙️ Конфигурация

### Кастомный путь БД

```python
# Вместо ~/.smarttable/smarttable.db
db = DatabaseManager(
    db_path="/custom/path/smarttable.db"
)
```

### Демо БД в памяти

```python
# Для тестирования
db = DatabaseManager(db_path=":memory:")
```

## 📖 Документация

Полная документация: [DATABASE_DOCUMENTATION.md](./DATABASE_DOCUMENTATION.md)

---

**✓ БД готова к использованию!**  
**✓ Все данные сохраняются локально**  
**✓ Готова к масштабированию**
