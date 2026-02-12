#!/usr/bin/env python3
"""
Тест для проверки автоматического определения системной темы при запуске
"""

import sys
from pathlib import Path
from PyQt5.QtWidgets import QApplication
from PyQt5.QtGui import QColor, QPalette

# Добавляем pysheets в path
sys.path.insert(0, str(Path(__file__).parent / 'pysheets'))

from src.ui.themes import ThemeManager


def test_system_theme_on_startup():
    """Тест: автоматическое определение системной темы при запуске"""
    print("\n=== ТЕСТ: Определение системной темы при запуске ===\n")
    
    # Создаём приложение (это нужно для получения системной палитры)
    app = QApplication.instance() or QApplication([])
    
    print("1. Информация о системной палитре:")
    palette = app.palette()
    text_color = palette.color(QPalette.Text)
    window_color = palette.color(QPalette.Window)
    
    print(f"   Цвет текста: RGB({text_color.red()}, {text_color.green()}, {text_color.blue()})")
    print(f"   Цвет окна: RGB({window_color.red()}, {window_color.green()}, {window_color.blue()})")
    
    text_brightness = (text_color.red() + text_color.green() + text_color.blue()) / 3
    print(f"   Яркость текста: {text_brightness:.0f}")
    
    if text_brightness > 128:
        expected_theme = "dark"
        print(f"   → Система использует ТЁМНУЮ тему")
    else:
        expected_theme = "light"
        print(f"   → Система использует СВЕТЛУЮ тему")
    
    print(f"\n2. Создаём ThemeManager и применяем системную тему:")
    manager = ThemeManager()
    manager.apply_theme("system")
    
    print(f"   Текущая тема: {manager.current_theme}")
    print(f"   Акцентный цвет: {manager.app_theme_color.name()}")
    
    print(f"\n3. Проверяем палитру приложения после применения:")
    new_palette = app.palette()
    new_text_color = new_palette.color(QPalette.Text)
    new_window_color = new_palette.color(QPalette.Window)
    
    print(f"   Цвет текста: RGB({new_text_color.red()}, {new_text_color.green()}, {new_text_color.blue()})")
    print(f"   Цвет окна: RGB({new_window_color.red()}, {new_window_color.green()}, {new_window_color.blue()})")
    
    # Проверяем, что применилась правильная тема
    new_text_brightness = (new_text_color.red() + new_text_color.green() + new_text_color.blue()) / 3
    
    if expected_theme == "dark":
        # В тёмной теме текст должен быть светлым (RGB > 200)
        if new_text_brightness > 128:
            print(f"\n   ✓ Применилась ТЁМНАЯ тема (текст светлый)")
            return True
        else:
            print(f"\n   ✗ Ошибка: применилась светлая тема вместо тёмной!")
            return False
    else:
        # В светлой теме текст должен быть тёмным (RGB < 100)
        if new_text_brightness < 128:
            print(f"\n   ✓ Применилась СВЕТЛАЯ тема (текст тёмный)")
            return True
        else:
            print(f"\n   ✗ Ошибка: применилась тёмная тема вместо светлой!")
            return False


def test_ai_chat_with_system_theme():
    """Тест: ИИ чат с системной темой"""
    print("\n=== ТЕСТ: ИИ чат с системной темой ===\n")
    
    app = QApplication.instance()
    
    from src.ui.chat.ai_chat import AIChatWidget
    
    chat = AIChatWidget(theme="system", accent_color=QColor("#DC143C"))
    
    print(f"1. ИИ чат создан со следующими параметрами:")
    print(f"   Тема: {chat.theme}")
    print(f"   Цвет текста ИИ: {chat.ai_msg_color}")
    print(f"   Фон ИИ сообщений: {chat.ai_msg_bg}")
    print(f"   Цвет пользователя: {chat.user_msg_color}")
    print(f"   Фон пользователя: {chat.user_msg_bg}")
    
    # Проверяем, что цвета установлены
    if chat.ai_msg_color and chat.ai_msg_bg and chat.user_msg_color and chat.user_msg_bg:
        print(f"\n   ✓ Все цвета установлены корректно")
        return True
    else:
        print(f"\n   ✗ Ошибка: цвета не установлены!")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("ТЕСТИРОВАНИЕ АВТОМАТИЧЕСКОГО ОПРЕДЕЛЕНИЯ СИСТЕМНОЙ ТЕМЫ")
    print("=" * 60)
    
    results = []
    
    try:
        result = test_system_theme_on_startup()
        results.append(("Определение системной темы при запуске", result))
    except Exception as e:
        print(f"  ✗ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Определение системной темы при запуске", False))
    
    try:
        result = test_ai_chat_with_system_theme()
        results.append(("ИИ чат с системной темой", result))
    except Exception as e:
        print(f"  ✗ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        results.append(("ИИ чат с системной темой", False))
    
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
        print("\n✓ СИСТЕМА ПРАВИЛЬНО ОПРЕДЕЛЯЕТ И ПРИМЕНЯЕТ СИСТЕМНУЮ ТЕМУ!")
        sys.exit(0)
    else:
        print(f"\n⚠ {total_count - passed_count} проблем(ы)")
        sys.exit(1)
