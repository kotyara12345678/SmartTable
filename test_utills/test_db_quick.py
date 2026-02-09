import sys
sys.path.insert(0, r'c:\Users\glino\OneDrive\Рабочий стол\SmartTable-master')

from pysheets.src.db.database_manager import DatabaseManager
from pysheets.src.db.models import UserRole, Permission

print('╔═══════════════════════════════════════╗')
print('║  Тест Интеграции SQLite БД           ║')
print('╚═══════════════════════════════════════╝')
print()

try:
    # Тест с в памяти
    db = DatabaseManager(':memory:')
    print('✅ БД инициализирована')
    print()
    
    # Создание пользователя  
    admin = db.create_user(
        username='admin',
        email='admin@test.local',
        password='admin123',
        full_name='Administrator',
        role=UserRole.ADMIN
    )
    print(f'✅ Создан администратор: {admin.username}')
    
    # Создание обычного пользователя
    user = db.create_user(
        username='user',
        email='user@test.local',
        password='user123',
        full_name='Regular User',
        role=UserRole.USER
    )
    print(f'✅ Создан пользователь: {user.username}')
    print()
    
    # Аутентификация
    auth_user = db.authenticate_user('admin', 'admin123')
    print(f'✅ Аутентифицирован: {auth_user.username}')
    print()
    
    # Разрешения
    print('Проверка разрешений:')
    admin_perms = db.get_user_permissions(admin.id)
    user_perms = db.get_user_permissions(user.id)
    print(f'  - ADMIN: {len(admin_perms)} разрешений')
    print(f'  - USER: {len(user_perms)} разрешений')
    print()
    
    # Создание таблицы
    sheet = db.create_spreadsheet(
        owner_id=admin.id,
        filename='demo.db',
        title='Demo Spreadsheet',
        description='Test spreadsheet'
    )
    print(f'✅ Создана таблица: {sheet.title}')
    print()
    
    # Информация о БД
    info = db.get_database_info()
    print('Статус БД:')
    print(f'  - Пользователей: {info["users"]}')
    print(f'  - Таблиц: {info["spreadsheets"]}')
    print(f'  - Логов: {info["audit_logs"]}')
    print()
    
    print('✓ ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!')

except Exception as e:
    print(f'❌ Ошибка: {e}')
    import traceback
    traceback.print_exc()
