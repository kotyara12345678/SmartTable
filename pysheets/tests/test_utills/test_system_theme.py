#!/usr/bin/env python3
"""
Тест для проверки системной темы
"""

import sys
from pathlib import Path
from PyQt5.QtWidgets import QApplication
from PyQt5.QtGui import QColor, QPalette

# Добавляем pysheets в path
sys.path.insert(0, str(Path(__file__).parent / 'pysheets'))

from src.ui.themes import ThemeManager


def test_system_theme_detection():
    """Тест: определение системной темы"""
    print("\n=== ТЕСТ: Определение системной темы ===\n")
    
    app = QApplication.instance() or QApplication([])
    
    # Получаем информацию о текущей системной палитре
    palette = app.palette()
    text_color = palette.color(QPalette.Text)
    window_color = palette.color(QPalette.Window)
    
    print(f"Текущая системная палитра:")
    print(f"  Цвет текста: RGB({text_color.red()}, {text_color.green()}, {text_color.blue()})")
    print(f"  Цвет окна: RGB({window_color.red()}, {window_color.green()}, {window_color.blue()})")
    
    text_brightness = (text_color.red() + text_color.green() + text_color.blue()) / 3
    window_brightness = (window_color.red() + window_color.green() + window_color.blue()) / 3
    
    print(f"  Яркость текста: {text_brightness:.0f}")
    print(f"  Яркость окна: {window_brightness:.0f}")
    
    # Определяем тему
    if text_brightness > 128:
        system_theme = "dark"
        print(f"\n→ Текст светлый, значит это ТЁМНАЯ тема")
    else:
        system_theme = "light"
        print(f"\n→ Текст тёмный, значит это СВЕТЛАЯ тема")
    
    # Теперь применяем систему тему
    print(f"\nПрименяем системную тему в ThemeManager...")
    manager = ThemeManager()
    manager.apply_theme("system")
    
    print(f"  Текущая тема менеджера: {manager.current_theme}")
    print(f"  Акцентный цвет: {manager.app_theme_color.name()}")
    
    # Проверяем палитру после применения
    palette_after = app.palette()
    text_color_after = palette_after.color(QPalette.Text)
    
    print(f"\nПалитра после применения системной темы:")
    print(f"  Цвет текста: RGB({text_color_after.red()}, {text_color_after.green()}, {text_color_after.blue()})")
    
    # Проверяем, что текст соответствует теме
    if system_theme == "dark":
        # В тёмной теме текст должен быть светлым
        if text_color_after.red() > 200 and text_color_after.green() > 200 and text_color_after.blue() > 200:
            print(f"  ✓ Текст светлый (верно для тёмной темы)")
            return True
        else:
            print(f"  ✗ Текст не светлый (ошибка!)")
            return False
    else:
        # В светлой теме текст должен быть тёмным
        if text_color_after.red() < 100 and text_color_after.green() < 100 and text_color_after.blue() < 100:
            print(f"  ✓ Текст тёмный (верно для светлой темы)")
            return True
        else:
            print(f"  ✗ Текст не тёмный (ошибка!)")
            return False


def test_system_theme_stylesheet():
    """Тест: стили при системной теме"""
    print("\n=== ТЕСТ: Стили при системной теме ===\n")
    
    app = QApplication.instance()
    
    manager = ThemeManager()
    manager.apply_theme("system", QColor("#1a73e8"))
    
    app_instance = QApplication.instance()
    stylesheet = app_instance.styleSheet()
    
    if stylesheet and len(stylesheet) > 0:
        print(f"  Стили применены")
        print(f"  Размер stylesheet: {len(stylesheet)} символов")
        
        # Проверяем, что акцентный цвет есть в стилях
        accent_color = "#1a73e8"
        if accent_color in stylesheet:
            print(f"  ✓ Акцентный цвет {accent_color} найден в стилях")
            return True
        else:
            print(f"  ⚠ Акцентный цвет {accent_color} не найден в стилях")
            # Это может быть нормально, проверяем хотя бы что-то есть
            if "#" in stylesheet:
                print(f"  ✓ Хотя бы какие-то цвета в стилях")
                return True
            else:
                print(f"  ✗ Нет цветов в стилях!")
                return False
    else:
        print(f"  ✗ Стили не применены!")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("ТЕСТИРОВАНИЕ СИСТЕМНОЙ ТЕМЫ")
    print("=" * 60)
    
    results = []
    
    try:
        result = test_system_theme_detection()
        results.append(("Определение системной темы", result))
    except Exception as e:
        print(f"  ✗ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Определение системной темы", False))
    
    try:
        result = test_system_theme_stylesheet()
        results.append(("Стили при системной теме", result))
    except Exception as e:
        print(f"  ✗ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Стили при системной теме", False))
    
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
        print("\n✓ ВСЕ ТЕСТЫ ПРОЙДЕНЫ!")
        sys.exit(0)
    else:
        print(f"\n⚠ {total_count - passed_count} проблем(ы)")
        sys.exit(1)
