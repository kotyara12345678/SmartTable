#!/usr/bin/env python3
"""
Тест для проверки обновления цветов сообщений в ИИ чате при смене акцентного цвета
"""

import sys
from pathlib import Path
from PyQt5.QtWidgets import QApplication
from PyQt5.QtGui import QColor

# Добавляем pysheets в path
sys.path.insert(0, str(Path(__file__).parent / 'pysheets'))

from src.ui.chat.ai_chat import AIChatWidget


def test_message_color_update():
    """Тест: проверка обновления цветов сообщений при смене темы"""
    print("\n=== ТЕСТ: Обновление цветов сообщений при смене акцента ===")
    
    app = QApplication.instance() or QApplication([])
    
    # Создаем чат с начальным цветом (зелёный)
    initial_color = QColor("#0b8043")
    chat = AIChatWidget(theme="light", accent_color=initial_color)
    
    print(f"\n1. Начальный акцентный цвет: {initial_color.name()} (зелёный)")
    
    # Добавляем сообщение
    chat.add_user_message("Привет! Это первое сообщение.")
    chat.add_system_message("Добро пожаловать в чат!")
    
    print(f"   Фон сообщения ИИ: {chat.ai_msg_bg}")
    initial_bg = chat.ai_msg_bg
    
    print(f"\n2. Меняем акцентный цвет на синий (#1a73e8)")
    # Меняем цвет на синий
    new_color = QColor("#1a73e8")
    chat.update_theme("light", new_color)
    
    print(f"   Новый акцентный цвет: {new_color.name()}")
    print(f"   Новый фон сообщения ИИ: {chat.ai_msg_bg}")
    
    # Проверяем, что цвет изменился
    if initial_bg != chat.ai_msg_bg:
        print(f"\n   ✓ УСПЕШНО: Фон изменился с {initial_bg} на {chat.ai_msg_bg}")
    else:
        print(f"\n   ✗ ОШИБКА: Фон остался прежним {initial_bg}")
        return False
    
    # Добавляем новое сообщение
    print(f"\n3. Добавляем новое сообщение с новым цветом")
    chat.add_user_message("А это сообщение отправлено после смены цвета.")
    chat.add_system_message("И это ответ с новым цветом.")
    
    print(f"   История сообщений: {len(chat.message_history)} сообщений")
    print(f"   Сообщения в истории:")
    for i, (msg_type, text, time) in enumerate(chat.message_history, 1):
        print(f"     {i}. [{msg_type:4s}] {text[:40]}...")
    
    # Проверяем, что в истории 4 сообщения
    if len(chat.message_history) == 4:
        print(f"\n   ✓ УСПЕШНО: История содержит все 4 сообщения")
    else:
        print(f"\n   ✗ ОШИБКА: Ожидалось 4 сообщения, получено {len(chat.message_history)}")
        return False
    
    # Проверяем HTML содержимое чата
    html_content = chat.chat_display.toHtml()
    
    # Ищем новый цвет в HTML
    new_color_hex = new_color.name()
    if new_color_hex in html_content:
        print(f"\n   ✓ УСПЕШНО: Новый цвет {new_color_hex} найден в HTML")
    else:
        print(f"\n   ✗ ОШИБКА: Новый цвет {new_color_hex} НЕ найден в HTML")
        return False
    
    print(f"\n✓ ТЕСТ ПРОЙДЕН: Цвета сообщений обновляются при смене акцента")
    return True


if __name__ == "__main__":
    print("=" * 60)
    print("ТЕСТИРОВАНИЕ ОБНОВЛЕНИЯ ЦВЕТОВ СООБЩЕНИЙ В ИИ ЧАТЕ")
    print("=" * 60)
    
    try:
        result = test_message_color_update()
        sys.exit(0 if result else 1)
    except Exception as e:
        print(f"\n✗ ОШИБКА ТЕСТА: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
