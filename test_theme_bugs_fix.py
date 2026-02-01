#!/usr/bin/env python3
"""
Тест для проверки исправления багов темы
1. Белый текст в светлой теме
2. Фон сообщений в ИИ чате использует акцентный цвет
"""

import sys
from pathlib import Path

# Добавляем pysheets в path
sys.path.insert(0, str(Path(__file__).parent / 'pysheets'))

from PyQt5.QtGui import QColor
from src.ui.themes import ThemeManager
from src.ui.chat.ai_chat import AIChatWidget


def test_light_theme_text_color():
    """Тест: проверка цвета текста в светлой теме"""
    print("\n=== ТЕСТ 1: Цвет текста в светлой теме ===")
    
    manager = ThemeManager()
    manager.apply_theme("light")
    
    # Проверяем палитру
    from PyQt5.QtWidgets import QApplication
    app = QApplication.instance()
    if app:
        palette = app.palette()
        
        # Получаем QPalette
        from PyQt5.QtGui import QPalette
        
        text_color = palette.color(QPalette.Text)
        highlighted_text = palette.color(QPalette.HighlightedText)
        
        print(f"  Цвет текста: {text_color.name()} (должен быть чёрный #202124)")
        print(f"  Цвет выделенного текста: {highlighted_text.name()} (должен быть чёрный #202124)")
        
        # Проверяем, что текст не белый
        if text_color.name() != "#ffffff" and highlighted_text.name() != "#ffffff":
            print("  ✓ ТЕСТ ПРОЙДЕН: Текст не белый в светлой теме")
            return True
        else:
            print("  ✗ ТЕСТ НЕ ПРОЙДЕН: Текст остается белым!")
            return False
    return False


def test_ai_chat_accent_colors():
    """Тест: проверка использования акцентного цвета в ИИ чате"""
    print("\n=== ТЕСТ 2: Акцентные цвета в ИИ чате ===")
    
    from PyQt5.QtWidgets import QApplication
    app = QApplication.instance() or QApplication([])
    
    # Создаем чат с кастомным акцентным цветом
    accent_color = QColor("#1a73e8")  # Синий цвет
    chat = AIChatWidget(theme="light", accent_color=accent_color)
    
    # После apply_theme должны быть установлены цвета
    print(f"  Акцентный цвет ИИ: {accent_color.name()}")
    print(f"  Цвет фона сообщений ИИ: {chat.ai_msg_bg}")
    
    # Проверяем, что фон сообщений ИИ использует акцентный цвет или его производную
    accent_hex = accent_color.name()
    accent_light = accent_color.lighter(130).name()
    
    print(f"  Ожидаемые цвета: {accent_hex} или {accent_light}")
    
    # Проверяем, что ai_msg_bg содержит акцентный цвет или его версию
    if accent_hex in chat.ai_msg_bg or accent_light in chat.ai_msg_bg or chat.ai_msg_bg == accent_light:
        print("  ✓ ТЕСТ ПРОЙДЕН: ИИ чат использует акцентный цвет")
        return True
    else:
        print(f"  ✗ ТЕСТ НЕ ПРОЙДЕН: ИИ чат не использует акцентный цвет (получил {chat.ai_msg_bg})")
        return False


def test_dark_theme_text_color():
    """Тест: проверка цвета текста в темной теме (должна остаться серой)"""
    print("\n=== ТЕСТ 3: Цвет текста в темной теме ===")
    
    manager = ThemeManager()
    manager.apply_theme("dark")
    
    from PyQt5.QtWidgets import QApplication
    app = QApplication.instance()
    if app:
        palette = app.palette()
        
        from PyQt5.QtGui import QPalette
        
        text_color = palette.color(QPalette.Text)
        highlighted_text = palette.color(QPalette.HighlightedText)
        
        print(f"  Цвет текста: {text_color.name()} (должен быть светло-серый #e8eaed)")
        print(f"  Цвет выделенного текста: {highlighted_text.name()}")
        
        # В темной теме текст должен быть светлым
        if text_color.name() != "#000000":
            print("  ✓ ТЕСТ ПРОЙДЕН: Текст светлый в темной теме")
            return True
        else:
            print("  ✗ ТЕСТ НЕ ПРОЙДЕН: Текст тёмный в темной теме!")
            return False
    return False


if __name__ == "__main__":
    print("=" * 50)
    print("ТЕСТИРОВАНИЕ ИСПРАВЛЕНИЙ БАГОВ ТЕМЫ")
    print("=" * 50)
    
    results = []
    
    try:
        results.append(("Цвет текста (светлая тема)", test_light_theme_text_color()))
    except Exception as e:
        print(f"  ✗ ОШИБКА: {e}")
        results.append(("Цвет текста (светлая тема)", False))
    
    try:
        results.append(("Акцентные цвета (ИИ чат)", test_ai_chat_accent_colors()))
    except Exception as e:
        print(f"  ✗ ОШИБКА: {e}")
        results.append(("Акцентные цвета (ИИ чат)", False))
    
    try:
        results.append(("Цвет текста (темная тема)", test_dark_theme_text_color()))
    except Exception as e:
        print(f"  ✗ ОШИБКА: {e}")
        results.append(("Цвет текста (темная тема)", False))
    
    # Итоги
    print("\n" + "=" * 50)
    print("ИТОГИ ТЕСТИРОВАНИЯ")
    print("=" * 50)
    
    for test_name, passed in results:
        status = "✓ ПРОЙДЕН" if passed else "✗ НЕ ПРОЙДЕН"
        print(f"  {status}: {test_name}")
    
    passed_count = sum(1 for _, p in results if p)
    total_count = len(results)
    
    print(f"\nВсего: {passed_count}/{total_count} тестов пройдено")
    
    if passed_count == total_count:
        print("\n✓ ВСЕ БАГИ ИСПРАВЛЕНЫ!")
    else:
        print(f"\n✗ {total_count - passed_count} проблем(ы) остались")
    
    sys.exit(0 if passed_count == total_count else 1)
