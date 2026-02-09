# SmartTable Database Documentation

## 📋 Обзор

Интегрированная локальная база данных SQLite с полной поддержкой:
- ✅ Управления пользователями
- ✅ Контроля доступа (ACL - Access Control List)
- ✅ Аудита всех действий
- ✅ Оптимизация поиска через индексирование
- ✅ Безопасное хеширование паролей (bcrypt)

## 🗄️ Структура БД

### Таблица `users`
Хранит информацию о пользователях.

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'user',  -- admin, user, viewer, editor
    is_active BOOLEAN DEFAULT 1,
    created_at TIMESTAMP,
    last_login TIMESTAMP
)
```

**Индексы:**
- `idx_users_username` - Поиск по логину
- `idx_users_email` - Поиск по email
- `idx_users_role` - Фильтрация по ролям
- `idx_users_active` - Поиск активных пользователей

### Таблица `spreadsheets`
Хранит таблицы пользователей.

```sql
CREATE TABLE spreadsheets (
    id INTEGER PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    title TEXT,
    description TEXT,
    content TEXT,  -- JSON
    is_shared BOOLEAN DEFAULT 0,
    is_public BOOLEAN DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    file_size INTEGER,
    FOREIGN KEY (owner_id) REFERENCES users(id)
)
```

**Индексы:**
- `idx_spreadsheets_owner` - Получение таблиц пользователя
- `idx_spreadsheets_title` - Поиск по названию
- `idx_spreadsheets_shared` - Фильтрация общих таблиц
- `idx_spreadsheets_public` - Фильтрация публичных таблиц
- `idx_spreadsheets_created` - Сортировка по дате создания
- `idx_spreadsheets_updated` - Сортировка по последнему обновлению

### Таблица `roles`
Роли и описания.

```sql
CREATE TABLE roles (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,  -- admin, user, viewer, editor
    description TEXT,
    created_at TIMESTAMP
)
```

### Таблица `permissions`
Разрешения для каждой роли.

```sql
CREATE TABLE permissions (
    id INTEGER PRIMARY KEY,
    role_id INTEGER NOT NULL,
    permission TEXT NOT NULL,
    created_at TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission)
)
```

### Таблица `shared_spreadsheets`
Управление совместным доступом.

```sql
CREATE TABLE shared_spreadsheets (
    id INTEGER PRIMARY KEY,
    spreadsheet_id INTEGER NOT NULL,
    owner_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    permission_level TEXT,  -- view, edit, admin
    shared_at TIMESTAMP,
    expires_at TIMESTAMP,
    FOREIGN KEY (spreadsheet_id) REFERENCES spreadsheets(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
)
```

### Таблица `audit_logs`
Логирование всех действий.

```sql
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,  -- user, file, system
    resource_id INTEGER,
    details TEXT,  -- JSON
    ip_address TEXT,
    timestamp TIMESTAMP,
    status TEXT,  -- success, failed
    FOREIGN KEY (user_id) REFERENCES users(id)
)
```

**Индексы:**
- `idx_audit_user` - Найти все действия пользователя
- `idx_audit_action` - Фильтр по типу действия
- `idx_audit_resource` - Найти все действия над ресурсом
- `idx_audit_timestamp` - Хронологический порядок
- `idx_audit_status` - Фильтр по статусу

## 🔐 Система разрешений (ACL)

### Роли

```
ADMIN
├── Все разрешения
├── Управление пользователями
├── Просмотр аудита
└── Управление системой

EDITOR
├── Создание файлов
├── Редактирование файлов
├── Удаление собственных файлов
├── Совместное использование
└── Экспорт

USER
├── Создание файлов
├── Редактирование файлов
└── Экспорт

VIEWER
└── Просмотр файлов
```

### Разрешения (Permissions)

```python
# Файлы
CREATE_FILE = "create_file"
EDIT_FILE = "edit_file"
DELETE_FILE = "delete_file"
VIEW_FILE = "view_file"
SHARE_FILE = "share_file"
EXPORT_FILE = "export_file"

# Пользователи
CREATE_USER = "create_user"
EDIT_USER = "edit_user"
DELETE_USER = "delete_user"
VIEW_USERS = "view_users"
MANAGE_PERMISSIONS = "manage_permissions"

# Система
VIEW_AUDIT = "view_audit"
MANAGE_TEMPLATES = "manage_templates"
MANAGE_THEMES = "manage_themes"
```

## 📦 API Использование

### Инициализация

```python
from pysheets.src.db.database_manager import DatabaseManager
from pysheets.src.db.models import UserRole, Permission

# Создание менеджера БД
db = DatabaseManager()  # ~/.smarttable/smarttable.db

# Или с кастомным путём
db = DatabaseManager("/path/to/database.db")
```

### Работа с пользователями

```python
# Создание пользователя
user = db.create_user(
    username="john",
    email="john@example.com",
    password="secure_password",
    full_name="John Doe",
    role=UserRole.USER
)

# Аутентификация
user = db.authenticate_user("john", "secure_password")

# Получение пользователя
user = db.get_user_by_id(1)
user = db.get_user_by_username("john")

# Список пользователей
users = db.get_all_users(limit=50, offset=0)

# Изменение роли
db.update_user_role(user.id, UserRole.EDITOR)

# Деактивация
db.deactivate_user(user.id)
```

### Контроль доступа

```python
# Проверка разрешения
has_permission = db.has_permission(user.id, Permission.CREATE_FILE)

# Получить все разрешения
permissions = db.get_user_permissions(user.id)
```

### Работа со спредшитами

```python
# Создание
sheet = db.create_spreadsheet(
    owner_id=user.id,
    filename="sales.db",
    title="Sales Report",
    description="2025 sales data"
)

# Получение
sheet = db.get_spreadsheet_by_id(sheet.id)

# Поиск
results = db.search_spreadsheets(
    user_id=user.id,
    query="Sales",
    limit=50
)
```

### Аудит

```python
# Получить логи
logs = db.get_audit_logs(limit=100, offset=0, user_id=None)

# Информация о БД
info = db.get_database_info()
# {
#     'db_path': '/path/to/db',
#     'db_size_mb': 0.5,
#     'users': 10,
#     'spreadsheets': 25,
#     'audit_logs': 1000,
#     'version': 1
# }
```

## 🔐 Менеджер аутентификации

```python
from pysheets.src.db.database_utils import AuthenticationManager

auth = AuthenticationManager(db)

# Вход
if auth.login("john", "password"):
    print(f"Вошли как: {auth.current_user.username}")

# Проверка статуса
if auth.is_authenticated():
    print("Пользователь авторизован")

# Проверка разрешений
if auth.check_permission(Permission.CREATE_FILE):
    print("Может создавать файлы")

# Требовать разрешение (выбросит исключение если нет)
try:
    auth.require_permission(Permission.MANAGE_PERMISSIONS)
except PermissionError:
    print("Отказано в доступе")

# Проверка админа
if auth.is_admin():
    print("Это администратор")

# Выход
auth.logout()
```

## 🧪 Тестирование

Запуск демонстрации:

```bash
cd test_utills
python test_database_integration.py
```

Вывод включает:
- Базовые операции (создание, поиск, аутентификация)
- Проверку разрешений
- Работу с менеджером аутентификации
- Операции со спредшитами
- Аудит логирование

## 📊 Оптимизация производительности

### Индексатион
Все таблицы оптимизированы с индексами для:
- **Быстрого поиска** - по username, email, title
- **Фильтрации** - по role, status, shared
- **Сортировки** - по датам (DESC)
- **Связей** - между таблицами (FOREIGN KEYs)

### Запросы
Использованы параметризованные запросы для:
- ✅ Защиты от SQL-инъекций
- ✅ Кэширования плана запроса
- ✅ Улучшения производительности

### Миграции
Система версионирования БД позволяет:
- Безопасно обновлять схему
- Сохранять данные пользователей
- Автоматическую инициализацию

## 🚀 Будущее расширение

### Планы
- [ ] Экспорт/импорт данных БД
- [ ] Резервное копирование
- [ ] Синхронизация между устройствами
- [ ] WebApi для удалённого доступа
- [ ] Шифрование чувствительных данных
- [ ] Сжатие истории аудита

### Для .exe сборки
- БД встраивается в приложение
- При первом запуске создаётся в `~/.smarttable`
- Обновления мигрируют схему автоматически

## 📝 Логирование

Логи сохраняются в:
- **Console** - INFO и выше
- **File** - `~/.smarttable/smarttable.log`

## 🔒 Безопасность

- ✅ Хеширование паролей (bcrypt)
- ✅ SQL-инъекции защита (параметризованные запросы)
- ✅ Контроль доступа (ACL)
- ✅ Аудит всех действий
- ✅ Foreign key constraints
- ✅ PRAGMA foreign_keys = ON

---

**Версия БД:** 1  
**Последнее обновление:** 9 февраля 2026
