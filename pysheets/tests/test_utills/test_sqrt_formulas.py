"""
Тест формул - проверка что SQRT и другие функции работают
"""

import sys
from pathlib import Path

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from pysheets.src.core.formula.engine import FormulaEngine


def test_sqrt_functions():
    """Тест SQRT и других функций"""
    
    print("=" * 60)
    print("ТЕСТ ФОРМУЛ - SQRT И ДРУГИЕ ФУНКЦИИ")
    print("=" * 60)
    
    engine = FormulaEngine()
    
    # Mock resolver для ячеек
    def cell_resolver(cell_ref):
        cells = {
            'A1': '16',
            'A2': '9',
            'A3': '25',
            'B1': '2',
            'B2': '3',
        }
        return cells.get(cell_ref, '0')
    
    # ==================== SQRT ====================
    print("\n🔢 ТЕСТ: SQRT функция")
    print("-" * 60)
    
    tests = [
        ("SQRT(16)", 4.0, "Корень из 16"),
        ("SQRT(9)", 3.0, "Корень из 9"),
        ("SQRT(25)", 5.0, "Корень из 25"),
        ("SQRT(A1)", 4.0, "Корень из ячейки A1 (16)"),
        ("SQRT(A2)", 3.0, "Корень из ячейки A2 (9)"),
    ]
    
    for formula, expected, description in tests:
        result = engine.evaluate(formula, cell_resolver)
        status = "✅" if abs(result - expected) < 0.001 else "❌"
        print(f"{status} {formula:20} = {result:6.2f} (ожидалось {expected}) - {description}")
    
    # ==================== ПРОСТЫЕ ОПЕРАЦИИ ====================
    print("\n➕ ТЕСТ: Простые операции")
    print("-" * 60)
    
    tests = [
        ("2+3", 5.0, "Сумма"),
        ("10-4", 6.0, "Разность"),
        ("3*4", 12.0, "Произведение"),
        ("12/3", 4.0, "Деление"),
        ("2^3", 8.0, "Степень"),
    ]
    
    for formula, expected, description in tests:
        result = engine.evaluate(formula, cell_resolver)
        status = "✅" if abs(result - expected) < 0.001 else "❌"
        print(f"{status} {formula:20} = {result:6.2f} (ожидалось {expected}) - {description}")
    
    # ==================== ОПЕРАЦИИ СО ССЫЛКАМИ ====================
    print("\n📍 ТЕСТ: Операции со ссылками на ячейки")
    print("-" * 60)
    
    tests = [
        ("A1+B1", 18.0, "A1 (16) + B1 (2)"),
        ("A2*B2", 27.0, "A2 (9) * B2 (3)"),
        ("A3/B1", 12.5, "A3 (25) / B1 (2)"),
    ]
    
    for formula, expected, description in tests:
        result = engine.evaluate(formula, cell_resolver)
        status = "✅" if abs(result - expected) < 0.001 else "❌"
        print(f"{status} {formula:20} = {result:6.2f} (ожидалось {expected}) - {description}")
    
    # ==================== КОМПЛЕКСНЫЕ ФОРМУЛЫ ====================
    print("\n🧮 ТЕСТ: Комплексные формулы")
    print("-" * 60)
    
    tests = [
        ("2*SQRT(16)", 8.0, "2 * SQRT(16)"),
        ("SQRT(A1)+10", 14.0, "SQRT(16) + 10"),
        ("SQRT(A1)*SQRT(A2)", 12.0, "SQRT(16) * SQRT(9)"),
    ]
    
    for formula, expected, description in tests:
        try:
            result = engine.evaluate(formula, cell_resolver)
            status = "✅" if abs(result - expected) < 0.001 else "❌"
            print(f"{status} {formula:25} = {result:6.2f} (ожидалось {expected}) - {description}")
        except Exception as e:
            print(f"❌ {formula:25} - ОШИБКА: {e}")
    
    # ==================== ДРУГИЕ ФУНКЦИИ ====================
    print("\n📊 ТЕСТ: Другие функции")
    print("-" * 60)
    
    tests = [
        ("SUM(16,9,25)", 50.0, "SUM трёх чисел"),
        ("AVERAGE(16,9,25)", 50/3, "AVERAGE трёх чисел"),
        ("MAX(16,9,25)", 25.0, "MAX трёх чисел"),
        ("MIN(16,9,25)", 9.0, "MIN трёх чисел"),
        ("COUNT(16,9,25)", 3.0, "COUNT трёх чисел"),
        ("ABS(-5)", 5.0, "ABS(-5)"),
        ("POWER(2,3)", 8.0, "POWER(2,3)"),
        ("MOD(10,3)", 1.0, "MOD(10,3)"),
        ("ROUND(3.14159,2)", 3.14, "ROUND(3.14159,2)"),
    ]
    
    for formula, expected, description in tests:
        try:
            result = engine.evaluate(formula, cell_resolver)
            status = "✅" if abs(result - expected) < 0.001 else "❌"
            print(f"{status} {formula:25} = {result:6.4f} (ожидалось {expected:.4f}) - {description}")
        except Exception as e:
            print(f"❌ {formula:25} - ОШИБКА: {e}")
    
    # ==================== ТЕКСТОВЫЕ ФУНКЦИИ ====================
    print("\n📝 ТЕСТ: Текстовые функции")
    print("-" * 60)
    
    tests = [
        ('LEN("hello")', 5.0, "Длина строки"),
        ('UPPER("hello")', "HELLO", "Верхний регистр"),
        ('LOWER("HELLO")', "hello", "Нижний регистр"),
        ('LEN("test")', 4.0, "Длина test"),
    ]
    
    for formula, expected, description in tests:
        try:
            result = engine.evaluate(formula, cell_resolver)
            status = "✅" if result == expected else "❌"
            print(f"{status} {formula:25} = {result!s:20} (ожидалось {expected!s}) - {description}")
        except Exception as e:
            print(f"❌ {formula:25} - ОШИБКА: {e}")
    
    print("\n" + "=" * 60)
    print("✅ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО")
    print("=" * 60)


if __name__ == "__main__":
    test_sqrt_functions()
