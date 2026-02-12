"""
Тест для упрощённой версии БД - только таблицы и функции
"""

import sys
from pathlib import Path

# Добавляем пути
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from pysheets.src.db.database_manager import DatabaseManager


def test_minimal_database():
    """Тестируем упрощённую версию БД"""
    
    print("=" * 60)
    print("ТЕСТ УПРОЩЁННОЙ ВЕРСИИ БД")
    print("=" * 60)
    
    # Используем :memory: БД для тестирования
    db = DatabaseManager(":memory:")
    print("✅ БД инициализирована\n")
    
    # ==================== ТАБЛИЦЫ ====================
    print("📊 ТЕСТ: Работа с таблицами")
    print("-" * 60)
    
    # Создаём таблицы
    sheet1 = db.create_spreadsheet("sales.xlsx", "Продажи 2024", '{"A1": 100}')
    print(f"✅ Создана таблица: {sheet1.title} (ID={sheet1.id})")
    
    sheet2 = db.create_spreadsheet("inventory.xlsx", "Склад", '{"B2": 50}')
    print(f"✅ Создана таблица: {sheet2.title} (ID={sheet2.id})")
    
    sheet3 = db.create_spreadsheet("report.xlsx", "Отчёт", '{"C3": 75}')
    print(f"✅ Создана таблица: {sheet3.title} (ID={sheet3.id})\n")
    
    # Получаем таблицу по ID
    found = db.get_spreadsheet_by_id(sheet1.id)
    print(f"✅ Получена по ID: {found.title}")
    
    # Получаем по имени файла
    found = db.get_spreadsheet_by_filename("sales.xlsx")
    print(f"✅ Получена по имени: {found.title}\n")
    
    # Получаем все таблицы
    all_sheets = db.get_all_spreadsheets()
    print(f"✅ Всего таблиц в БД: {len(all_sheets)}")
    for sheet in all_sheets:
        print(f"   - {sheet.title}: {sheet.filename}")
    
    print()
    
    # Поиск по названию
    search_result = db.search_spreadsheets("Продажи")
    print(f"✅ Поиск по 'Продажи': найдено {len(search_result)} результатов")
    for sheet in search_result:
        print(f"   - {sheet.title}: {sheet.filename}\n")
    
    # Обновление таблицы
    db.update_spreadsheet(sheet1.id, title="Продажи Q1")
    updated = db.get_spreadsheet_by_id(sheet1.id)
    print(f"✅ Обновлена таблица: {updated.title}\n")
    
    # ==================== ФУНКЦИИ ====================
    print("\n📐 ТЕСТ: Работа с функциями")
    print("-" * 60)
    
    # Получаем все функции
    all_funcs = db.get_all_functions()
    print(f"✅ Всего функций: {len(all_funcs)}")
    
    # Функции по категориям
    categories = set(f.category for f in all_funcs)
    print(f"✅ Категории: {categories}\n")
    
    for cat in sorted(categories):
        funcs = db.get_functions_by_category(cat)
        print(f"   {cat}: {len(funcs)} функций")
        for func in funcs[:3]:  # Первые 3
            print(f"      - {func.name}: {func.formula}")
        if len(funcs) > 3:
            print(f"      ... и ещё {len(funcs) - 3}")
    
    print()
    
    # Поиск функций
    search = db.search_functions("SQRT")
    print(f"✅ Поиск 'SQRT': {len(search)} результатов")
    for func in search:
        print(f"   - {func.name}: {func.formula} - {func.example}\n")
    
    # ==================== НЕДАВНИЕ ====================
    print("\n🕐 ТЕСТ: Недавние файлы")
    print("-" * 60)
    
    db.add_recent_file("sales.xlsx", "/home/user/sales.xlsx", 2.5)
    db.add_recent_file("inventory.xlsx", "/home/user/inventory.xlsx", 1.8)
    db.add_recent_file("report.xlsx", "/home/user/report.xlsx", 3.2)
    
    print("✅ Добавлены 3 файла в недавние\n")
    
    recent = db.get_recent_files()
    print(f"✅ Последние файлы ({len(recent)}):")
    for file in recent:
        print(f"   - {file.filename} ({file.size_mb} МБ)")
    
    print()
    
    # ==================== ИНФОРМАЦИЯ ====================
    print("\n📋 ИНФОРМАЦИЯ О БД")
    print("-" * 60)
    
    info = db.get_database_info()
    for key, value in info.items():
        print(f"{key}: {value}")
    
    # ==================== УДАЛЕНИЕ ====================
    print("\n🗑️ ТЕСТ: Удаление")
    print("-" * 60)
    
    result = db.delete_spreadsheet(sheet3.id)
    print(f"✅ Удалена таблица ID={sheet3.id}: {result}")
    
    remaining = db.get_all_spreadsheets()
    print(f"✅ Осталось таблиц: {len(remaining)}\n")
    
    print("=" * 60)
    print("✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ")
    print("=" * 60)


if __name__ == "__main__":
    test_minimal_database()
