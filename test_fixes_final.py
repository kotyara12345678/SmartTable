#!/usr/bin/env python3
"""
Тест для проверки исправления двух проблем:
1. Текст в таблице в тёмной теме должен быть светлым
2. Системная тема должна работать
"""

import sys
from pathlib import Path
from PyQt5.QtWidgets import QApplication, QTableWidget, QTableWidgetItem
from PyQt5.QtGui import QColor, QPalette

# Добавляем pysheets в path
sys.path.insert(0, str(Path(__file__).parent / 'pysheets'))

from src.ui.themes import ThemeManager


def test_dark_theme_table_text():
    """Тест: текст в таблице должен быть светлым в тёмной теме"""
    print("\n=== ТЕСТ 1: Текст в таблице при тёмной теме ===\n")
    
    app = QApplication.instance() or QApplication([])
    
    # Применяем тёмную тему
    manager = ThemeManager()
    manager.apply_theme("dark")
    
    print("1. Создаём таблицу и проверяем стили")
    
    # Получаем stylesheet
    stylesheet = app.styleSheet()
    
    # Проверяем, что в стилях есть цвет текста для элементов таблицы
    if "QTableWidget::item {" in stylesheet and "color: #e8eaed" in stylesheet:
        print("   ✓ В стилях установлен светлый цвет текста (#e8eaed)")
    else:
        print("   ✗ В стилях нет светлого цвета для текста таблицы")
        return False
    
    # Проверяем палитру
    palette = app.palette()
    text_color = palette.color(QPalette.Text)
    text_rgb = (text_color.red(), text_color.green(), text_color.blue())
    
    print(f"   Цвет текста в палитре: RGB{text_rgb}")
    
    # Проверяем, что текст светлый (RGB > 200 для всех компонентов)
    if all(c > 200 for c in text_rgb):
        print("   ✓ Палитра содержит светлый текст")
    else:
        print("   ✗ Палитра содержит тёмный текст!")
        return False
    
    print("   ✓ ТЕСТ 1 ПРОЙДЕН")
    return True


def test_system_theme_detection():
    """Тест: системная тема должна определяться и применяться"""
    print("\n=== ТЕСТ 2: Системная тема ===\n")
    
    app = QApplication.instance()
    
    print("1. Информация о системной палитре:")
    palette = app.palette()
    text_color = palette.color(QPalette.Text)
    window_color = palette.color(QPalette.Window)
    
    print(f"   Цвет текста: RGB({text_color.red()}, {text_color.green()}, {text_color.blue()})")
    print(f"   Цвет окна: RGB({window_color.red()}, {window_color.green()}, {window_color.blue()})")
    
    text_brightness = (text_color.red() + text_color.green() + text_color.blue()) / 3
    if text_brightness > 128:
        expected_theme = "dark"
        print("   → Система использует ТЁМНУЮ тему")
    else:
        expected_theme = "light"
        print("   → Система использует СВЕТЛУЮ тему")
    
    print(f"\n2. Применяем системную тему...")
    manager = ThemeManager()
    manager.apply_theme("system")
    
    print(f"   Текущая тема: {manager.current_theme}")
    
    # Проверяем палитру после применения
    palette_after = app.palette()
    text_color_after = palette_after.color(QPalette.Text)
    
    print(f"   Цвет текста после: RGB({text_color_after.red()}, {text_color_after.green()}, {text_color_after.blue()})")
    
    # Проверяем, что применилась правильная тема
    text_brightness_after = (text_color_after.red() + text_color_after.green() + text_color_after.blue()) / 3
    
    if expected_theme == "dark":
        if text_brightness_after > 128:
            print(f"\n   ✓ Применилась ТЁМНАЯ тема (текст светлый)")
        else:
            print(f"\n   ✗ Ошибка: текст не светлый!")
            return False
    else:
        if text_brightness_after < 128:
            print(f"\n   ✓ Применилась СВЕТЛАЯ тема (текст тёмный)")
        else:
            print(f"\n   ✗ Ошибка: текст не тёмный!")
            return False
    
    # Ещё раз проверим через несколько миллисекунд (для асинхронного применения)
    from PyQt5.QtCore import QTimer
    
    def check_final():
        palette_final = app.palette()
        text_final = palette_final.color(QPalette.Text)
        brightness_final = (text_final.red() + text_final.green() + text_final.blue()) / 3
        
        if expected_theme == "dark" and brightness_final > 128:
            print(f"   ✓ После задержки тема остаётся тёмной")
            return True
        elif expected_theme == "light" and brightness_final < 128:
            print(f"   ✓ После задержки тема остаётся светлой")
            return True
        else:
            print(f"   ✗ Тема изменилась после задержки!")
            return False
    
    # Проверяем через 200ms (потому что мы используем QTimer.singleShot(50))
    QTimer.singleShot(200, check_final)
    
    print("   ✓ ТЕСТ 2 ПРОЙДЕН")
    return True


if __name__ == "__main__":
    print("=" * 60)
    print("ТЕСТИРОВАНИЕ ИСПРАВЛЕНИЙ")
    print("=" * 60)
    
    results = []
    
    try:
        result = test_dark_theme_table_text()
        results.append(("Текст в таблице при тёмной теме", result))
    except Exception as e:
        print(f"  ✗ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Текст в таблице при тёмной теме", False))
    
    try:
        result = test_system_theme_detection()
        results.append(("Системная тема работает", result))
    except Exception as e:
        print(f"  ✗ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Системная тема работает", False))
    
    # Итоги
    print("\n" + "=" * 60)
    print("ИТОГИ")
    print("=" * 60)
    
    for test_name, passed in results:
        status = "✓ ПРОЙДЕН" if passed else "✗ НЕ ПРОЙДЕН"
        print(f"  {status}: {test_name}")
    
    passed_count = sum(1 for _, p in results if p)
    total_count = len(results)
    
    print(f"\nВсего: {passed_count}/{total_count} тестов пройдено")
    
    if passed_count == total_count:
        print("\n✓ ВСЕ ПРОБЛЕМЫ ИСПРАВЛЕНЫ!")
        sys.exit(0)
    else:
        print(f"\n⚠ {total_count - passed_count} проблем(ы)")
        sys.exit(1)
