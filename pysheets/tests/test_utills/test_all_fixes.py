#!/usr/bin/env python
"""Финальный тест всех исправлений"""

import sys
sys.path.insert(0, '/')

from pysheets.src.core.formula.engine import FormulaEngine
from pysheets.src.core.cell import Cell

print("=" * 60)
print("ФИНАЛЬНЫЙ ТЕСТ ВСЕХ ИСПРАВЛЕНИЙ")
print("=" * 60)
    
# Тест 1: Формулы
print("\n[ТЕСТ 1] Проверка формул...")
engine = FormulaEngine()

cells = {}
for i, val in enumerate(['10', '20', '30', '40', '50'], 1):
    cell = Cell(i-1, 0)
    cell.set_value(val)
    cell.set_calculated_value(val)
    cells[f'A{i}'] = cell

def get_data(ref):
    return cells.get(ref).calculated_value if ref in cells else None

try:
    result = engine.evaluate("SUM(A1:A5)", get_data)
    expected = 150
    assert result == expected, f"Ошибка: ожидалось {expected}, получили {result}"
    print(f"  ✓ SUM(A1:A5) = {result} (правильно)")
except Exception as e:
    print(f"  ✗ Ошибка: {e}")
try:
    result = engine.evaluate("AVERAGE(A1:A5)", get_data)
    expected = 30
    assert result == expected, f"Ошибка: ожидалось {expected}, получили {result}"
    print(f"  ✓ AVERAGE(A1:A5) = {result} (правильно)")
except Exception as e:
    print(f"  ✗ Ошибка: {e}")

# Тест 2: Проверка сортировки
print("\n[ТЕСТ 2] Проверка что сортировка отключена...")
try:
    from PyQt5.QtWidgets import QApplication
    from pysheets.src.ui.widghet.spreadsheet import SpreadsheetWidget
    
    app = QApplication.instance()
    if not app:
        app = QApplication([])
    
    table = SpreadsheetWidget()
    
    if not table.isSortingEnabled():
        print(f"  ✓ Сортировка отключена (правильно)")
    else:
        print(f"  ✗ Сортировка включена (БАГ!)")
except Exception as e:
    print(f"  ⚠ Не удалось протестировать: {e}")

# Тест 3: Проверка метода corner button
print("\n[ТЕСТ 3] Проверка наличия метода _style_corner_button...")
try:
    from pysheets.src.ui.widghet.spreadsheet import SpreadsheetWidget
    if hasattr(SpreadsheetWidget, '_style_corner_button'):
        print(f"  ✓ Метод _style_corner_button существует")
    else:
        print(f"  ✗ Метод _style_corner_button не найден")
except Exception as e:
    print(f"  ✗ Ошибка: {e}")

print("\n" + "=" * 60)
print("ТЕСТЫ ЗАВЕРШЕНЫ")
print("=" * 60)