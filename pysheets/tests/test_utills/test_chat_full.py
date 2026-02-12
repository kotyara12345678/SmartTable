#!/usr/bin/env python3
"""
Полный тест для проверки всех функций ИИ чата с темами
- Светлая тема
- Темная тема  
- Системная тема
- Обновление цветов при смене акцента
"""

import sys
from pathlib import Path
from PyQt5.QtWidgets import QApplication
from PyQt5.QtGui import QColor, QPalette

# Добавляем pysheets в path
sys.path.insert(0, str(Path(__file__).parent / 'pysheets'))

from src.ui.chat.ai_chat import AIChatWidget


def test_light_theme():
    """Тест: светлая тема"""
    print("\n=== ТЕСТ 1: Светлая тема ===")
    
    app = QApplication.instance() or QApplication([])
    
    # Создаем чат со светлой темой
    chat = AIChatWidget(theme="light", accent_color=QColor("#DC143C"))
    
    print(f"  Тема: {chat.theme}")
    print(f"  Цвет ИИ сообщений: {chat.ai_msg_color}")
    print(f"  Фон ИИ сообщений: {chat.ai_msg_bg}")
    
    # Проверяем, что текст не белый
    if chat.ai_msg_color != "white":
        print(f"  ✓ Текст ИИ НЕ белый (правильно)")
    else:
        print(f"  ✗ Текст ИИ белый (ошибка!)")
        return False
    
    # Добавляем сообщение
    chat.add_user_message("Тест светлой темы")
    chat.add_system_message("Ответ ИИ в светлой теме")
    
    if len(chat.message_history) == 2:
        print(f"  ✓ Сообщения добавлены (2 сообщения)")
    else:
        print(f"  ✗ Ошибка при добавлении сообщений")
        return False
    
    print(f"  ✓ ТЕСТ 1 ПРОЙДЕН")
    return True


def test_dark_theme():
    """Тест: темная тема"""
    print("\n=== ТЕСТ 2: Темная тема ===")
    
    app = QApplication.instance()
    
    # Создаем чат с темной темой
    chat = AIChatWidget(theme="dark", accent_color=QColor("#DC143C"))
    
    print(f"  Тема: {chat.theme}")
    print(f"  Цвет ИИ сообщений: {chat.ai_msg_color}")
    print(f"  Фон ИИ сообщений: {chat.ai_msg_bg}")
    
    # Проверяем, что текст белый (в темной теме)
    if chat.ai_msg_color == "white":
        print(f"  ✓ Текст ИИ белый (правильно для темной темы)")
    else:
        print(f"  ✗ Текст ИИ не белый (ошибка!)")
        return False
    
    # Добавляем сообщение
    chat.add_user_message("Тест темной темы")
    chat.add_system_message("Ответ ИИ в темной теме")
    
    if len(chat.message_history) == 2:
        print(f"  ✓ Сообщения добавлены (2 сообщения)")
    else:
        print(f"  ✗ Ошибка при добавлении сообщений")
        return False
    
    print(f"  ✓ ТЕСТ 2 ПРОЙДЕН")
    return True


def test_system_theme():
    """Тест: системная тема"""
    print("\n=== ТЕСТ 3: Системная тема ===")
    
    app = QApplication.instance()
    
    # Создаем чат с системной темой
    chat = AIChatWidget(theme="system", accent_color=QColor("#1a73e8"))
    
    print(f"  Тема: {chat.theme}")
    print(f"  Цвет ИИ сообщений: {chat.ai_msg_color}")
    print(f"  Фон ИИ сообщений: {chat.ai_msg_bg}")
    
    # Проверяем, что цвета установлены (не None, не пусто)
    if chat.ai_msg_color and chat.ai_msg_bg:
        print(f"  ✓ Цвета установлены для системной темы")
    else:
        print(f"  ✗ Цвета не установлены!")
        return False
    
    # Добавляем сообщение
    chat.add_user_message("Тест системной темы")
    chat.add_system_message("Ответ ИИ в системной теме")
    
    if len(chat.message_history) == 2:
        print(f"  ✓ Сообщения добавлены (2 сообщения)")
    else:
        print(f"  ✗ Ошибка при добавлении сообщений")
        return False
    
    print(f"  ✓ ТЕСТ 3 ПРОЙДЕН")
    return True


def test_color_update_all_themes():
    """Тест: обновление цветов при смене акцента во всех темах"""
    print("\n=== ТЕСТ 4: Обновление цветов при смене акцента (все темы) ===")
    
    app = QApplication.instance()
    
    themes = ["light", "dark", "system"]
    
    for theme_name in themes:
        print(f"\n  Тестируем тему: {theme_name}")
        
        # Создаем чат
        chat = AIChatWidget(theme=theme_name, accent_color=QColor("#0b8043"))
        
        # Добавляем сообщения
        chat.add_user_message(f"Сообщение в {theme_name} теме")
        chat.add_system_message(f"Ответ в {theme_name} теме")
        
        old_bg = chat.ai_msg_bg
        print(f"    Начальный фон: {old_bg}")
        
        # Меняем цвет
        chat.update_theme(theme_name, QColor("#f6bf26"))
        
        new_bg = chat.ai_msg_bg
        print(f"    Новый фон: {new_bg}")
        
        # Проверяем, что цвет изменился
        if old_bg != new_bg:
            print(f"    ✓ Цвет изменился для {theme_name}")
        else:
            print(f"    ✗ Цвет НЕ изменился для {theme_name}!")
            return False
        
        # Проверяем, что историю сообщений не потеряли
        if len(chat.message_history) == 2:
            print(f"    ✓ История сохранена (2 сообщения)")
        else:
            print(f"    ✗ История потеряна ({len(chat.message_history)} сообщений вместо 2)!")
            return False
    
    print(f"\n  ✓ ТЕСТ 4 ПРОЙДЕН")
    return True


def test_system_theme_color_switch():
    """Тест: смена цвета в системной теме"""
    print("\n=== ТЕСТ 5: Смена цвета в системной теме ===")
    
    app = QApplication.instance()
    
    # Создаем чат с системной темой
    chat = AIChatWidget(theme="system", accent_color=QColor("#8e24aa"))
    
    print(f"  Начальный цвет: {chat.accent_color.name()}")
    
    # Добавляем сообщения
    chat.add_user_message("Первое сообщение")
    chat.add_system_message("Первый ответ")
    
    # Меняем цвет (системная тема должна остаться системной)
    chat.update_theme("system", QColor("#e67c73"))
    
    print(f"  Новый цвет: {chat.accent_color.name()}")
    
    # Добавляем новые сообщения
    chat.add_user_message("Второе сообщение")
    chat.add_system_message("Второй ответ")
    
    # Проверяем историю
    if len(chat.message_history) == 4:
        print(f"  ✓ История сохранена (4 сообщения)")
    else:
        print(f"  ✗ История потеряна ({len(chat.message_history)} сообщений вместо 4)!")
        return False
    
    # Проверяем HTML
    html_content = chat.chat_display.toHtml()
    if "e67c73" in html_content or chat.accent_color.name() in html_content:
        print(f"  ✓ Новый цвет применён в HTML")
    else:
        print(f"  ✗ Новый цвет НЕ найден в HTML!")
        return False
    
    print(f"  ✓ ТЕСТ 5 ПРОЙДЕН")
    return True


if __name__ == "__main__":
    print("=" * 60)
    print("ПОЛНОЕ ТЕСТИРОВАНИЕ ИИ ЧАТА С ТЕМАМИ")
    print("=" * 60)
    
    results = []
    
    tests = [
        ("Светлая тема", test_light_theme),
        ("Темная тема", test_dark_theme),
        ("Системная тема", test_system_theme),
        ("Обновление цветов (все темы)", test_color_update_all_themes),
        ("Смена цвета в системной теме", test_system_theme_color_switch),
    ]
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"  ✗ ОШИБКА: {e}")
            import traceback
            traceback.print_exc()
            results.append((test_name, False))
    
    # Итоги
    print("\n" + "=" * 60)
    print("ИТОГИ ТЕСТИРОВАНИЯ")
    print("=" * 60)
    
    for test_name, passed in results:
        status = "✓ ПРОЙДЕН" if passed else "✗ НЕ ПРОЙДЕН"
        print(f"  {status}: {test_name}")
    
    passed_count = sum(1 for _, p in results if p)
    total_count = len(results)
    
    print(f"\nВсего: {passed_count}/{total_count} тестов пройдено")
    
    if passed_count == total_count:
        print("\n✓ ВСЕ ТЕСТЫ ПРОЙДЕНЫ!")
    else:
        print(f"\n✗ {total_count - passed_count} проблем(ы) остались")
    
    sys.exit(0 if passed_count == total_count else 1)
