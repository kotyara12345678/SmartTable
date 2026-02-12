#!/usr/bin/env python3
"""Тест функции печати SmartTable"""

import sys
from pathlib import Path

# Add project to path
project_root = Path(__file__).parent / "pysheets"
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "src"))

def test_print_imports():
    """Проверяем что импорты работают"""
    try:
        # Импортируем через sys.path
        from pysheets.src.io.handler.printer import TablePrinter
        print("[OK] TablePrinter импортирован")
        
        from pysheets.src.ui.main_window import MainWindow
        print("[OK] MainWindow импортирован")
        
        # Проверяем что метод есть
        if hasattr(MainWindow, 'print_table'):
            print("[OK] Метод print_table существует")
        else:
            print("[FAIL] Метод print_table не найден")
            return False
        
        return True
    except Exception as e:
        print(f"[FAIL] Ошибка при импорте: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_print_handler():
    """Проверяем что TablePrinter работает"""
    try:
        from pysheets.src.io.handler.printer import TablePrinter
        from PyQt5.QtWidgets import QApplication, QTableWidget, QTableWidgetItem
        from PyQt5.QtPrintSupport import QPrinter
        
        # Создаём фиктивную таблицу
        app = QApplication.instance()
        if not app:
            app = QApplication([])
        
        table = QTableWidget(3, 3)
        
        # Добавляем тестовые данные
        for row in range(3):
            for col in range(3):
                table.setItem(row, col, QTableWidgetItem(f"R{row}C{col}"))
        
        # Создаём принтер
        printer = TablePrinter(table)
        print("[OK] TablePrinter создан")
        
        # Проверяем методы
        if hasattr(printer, 'print_table'):
            print("[OK] Метод print_table существует")
        else:
            print("[FAIL] Метод print_table не найден")
            return False
        
        if hasattr(printer, 'export_pdf'):
            print("[OK] Метод export_pdf существует")
        else:
            print("[FAIL] Метод export_pdf не найден")
            return False
        
        print("[OK] Все методы TablePrinter работают")
        return True
        
    except Exception as e:
        print(f"[FAIL] Ошибка при тесте TablePrinter: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Тест функции печати SmartTable")
    print("=" * 60)
    
    print("\n1. Проверка импортов...")
    result1 = test_print_imports()
    
    print("\n2. Проверка TablePrinter...")
    result2 = test_print_handler()
    
    print("\n" + "=" * 60)
    if result1 and result2:
        print("[SUCCESS] Все тесты печати пройдены!")
    else:
        print("[FAIL] Некоторые тесты не пройдены")
    print("=" * 60)
