"""
Демонстрация работы БД и контроля доступа
"""

import sys
import logging
from pathlib import Path

# Прибавляем путь
sys.path.insert(0, str(Path(__file__).parent.parent))

from pysheets.src.db.database_manager import DatabaseManager
from pysheets.src.util.database import AuthenticationManager
from pysheets.src.db.models import UserRole, Permission

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def demo_basic_operations():
    """Демонстрация базовых операций"""
    print("\n=== Демонстрация базовых операций БД ===\n")
    
    # Инициализация БД (в памяти для демо)
    db = DatabaseManager(":memory:")
    
    # Получение информации о БД
    info = db.get_database_info()
    print(f"Database Info: {info}")
    print()
    
    # Создание пользователя
    print("1. Создание пользователя...")
    admin = db.create_user(
        username="admin",
        email="admin@example.com",
        password="admin123",
        full_name="Super Admin",
        role=UserRole.ADMIN
    )
    print(f"✓ Создан: {admin.username} ({admin.role.value})")
    print()
    
    user = db.create_user(
        username="john",
        email="john@example.com",
        password="john123",
        full_name="John Doe",
        role=UserRole.USER
    )
    print(f"✓ Создан: {user.username} ({user.role.value})")
    print()
    
    # Аутентификация
    print("2. Аутентификация...")
    auth_user = db.authenticate_user("john", "john123")
    print(f"✓ Аутентифицирован: {auth_user.username if auth_user else 'Failed'}")
    print()
    
    # Проверка разрешений
    print("3. Проверка разрешений...")
    has_create = db.has_permission(user.id, Permission.CREATE_FILE)
    print(f"✓ USER может создавать файлы: {has_create}")
    
    has_delete_user = db.has_permission(user.id, Permission.DELETE_USER)
    print(f"✓ USER может удалять пользователей: {has_delete_user}")
    
    admin_has_all = db.has_permission(admin.id, Permission.MANAGE_PERMISSIONS)
    print(f"✓ ADMIN может управлять разрешениями: {admin_has_all}")
    print()
    
    # Получение разрешений
    print("4. Разрешения пользователей:")
    admin_perms = db.get_user_permissions(admin.id)
    print(f"  ADMIN: {len(admin_perms)} разрешений")
    print(f"    - {', '.join(admin_perms[:5])}...")
    
    user_perms = db.get_user_permissions(user.id)
    print(f"  USER: {len(user_perms)} разрешений")
    print(f"    - {', '.join(user_perms)}")
    print()


def demo_authentication_manager():
    """Демонстрация менеджера аутентификации"""
    print("\n=== Демонстрация AuthenticationManager ===\n")
    
    db = DatabaseManager(":memory:")
    
    # Создание пользователя
    admin = db.create_user(
        username="admin",
        email="admin@example.com",
        password="admin123",
        role=UserRole.ADMIN
    )
    
    # Инициализация менеджера аутентификации
    auth = AuthenticationManager(db)
    
    print("1. До входа:")
    print(f"✓ Аутентифицирован: {auth.is_authenticated()}")
    print()
    
    print("2. Вход...")
    success = auth.login("admin", "admin123")
    print(f"✓ Вход: {success}")
    print(f"✓ Текущий пользователь: {auth.current_user.username if auth.current_user else 'None'}")
    print()
    
    print("3. Проверка разрешений через менеджер:")
    can_create = auth.check_permission(Permission.CREATE_FILE)
    print(f"✓ Может создавать файлы: {can_create}")
    
    is_admin = auth.is_admin()
    print(f"✓ Является админом: {is_admin}")
    print()
    
    print("4. Выход...")
    auth.logout()
    print(f"✓ Аутентифицирован: {auth.is_authenticated()}")
    print()


def demo_spreadsheets():
    """Демонстрация работы со спредшитами"""
    print("\n=== Демонстрация работы со спредшитами ===\n")
    
    db = DatabaseManager(":memory:")
    
    # Создание пользователей
    user = db.create_user(
        username="user1",
        email="user1@example.com",
        password="pass123",
        role=UserRole.USER
    )
    print(f"✓ Создан пользователь: {user.username}")
    print()
    
    # Создание спредшита
    print("1. Создание спредшитов...")
    sheet1 = db.create_spreadsheet(
        owner_id=user.id,
        filename="sales.db",
        title="Sales Report 2025",
        description="Monthly sales data"
    )
    print(f"✓ Создан: {sheet1.title}")
    
    sheet2 = db.create_spreadsheet(
        owner_id=user.id,
        filename="inventory.db",
        title="Inventory List",
        description="Product inventory"
    )
    print(f"✓ Создан: {sheet2.title}")
    print()
    
    # Поиск
    print("2. Поиск спредшитов...")
    results = db.search_spreadsheets(user.id, query="Sales")
    print(f"✓ Найдено '{len(results)}' результатов для 'Sales'")
    for sheet in results:
        print(f"  - {sheet.title}")
    print()
    
    # Получение
    print("3. Получение спредшита по ID...")
    retrieved = db.get_spreadsheet_by_id(sheet1.id)
    print(f"✓ Получен: {retrieved.title} (ID: {retrieved.id})")
    print()


def demo_audit_logs():
    """Демонстрация аудита"""
    print("\n=== Демонстрация логирования аудита ===\n")
    
    db = DatabaseManager(":memory:")
    
    # Создание пользователя
    user = db.create_user(
        username="user",
        email="user@example.com",
        password="pass",
        role=UserRole.USER
    )
    
    # Создание спредшита
    sheet = db.create_spreadsheet(
        owner_id=user.id,
        filename="test.db",
        title="Test Sheet"
    )
    
    # Аутентификация
    db.authenticate_user("user", "pass")
    
    print("1. История аудита:")
    logs = db.get_audit_logs(limit=10)
    print(f"✓ Всего логов: {len(logs)}")
    for i, log in enumerate(logs[:5], 1):
        print(f"  {i}. {log.action} ({log.resource_type}) - {log.status}")
    print()
    
    print("2. Информация о БД:")
    info = db.get_database_info()
    print(f"  - Пользователей: {info['users']}")
    print(f"  - Спредшитов: {info['spreadsheets']}")
    print(f"  - Логов аудита: {info['audit_logs']}")
    print()


if __name__ == "__main__":
    print("╔════════════════════════════════════════════╗")
    print("║   SmartTable Database Demo                 ║")
    print("║   SQLite + ACL + Audit Logging             ║")
    print("╚════════════════════════════════════════════╝")
    
    try:
        demo_basic_operations()
        demo_authentication_manager()
        demo_spreadsheets()
        demo_audit_logs()
        
        print("\n✓ Все демонстрации выполнены успешно!")
        
    except Exception as e:
        print(f"\n✗ Ошибка: {e}")
        import traceback
        traceback.print_exc()
