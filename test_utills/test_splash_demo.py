"""
Тест и демонстрация Splash Screen
Запустите: python test_utills/test_splash_demo.py
"""

import sys
from pathlib import Path
from PyQt5.QtWidgets import QApplication, QMainWindow, QLabel, QVBoxLayout, QWidget
from PyQt5.QtCore import QTimer
from PyQt5.QtGui import QFont

# Добавляем путь
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from pysheets.src.ui.splash_screen import SplashScreen, show_splash_screen


def demo_basic():
    """Демо 1: Простой splash с сообщениями"""
    print("=" * 60)
    print("ДЕМО 1: Простой splash screen")
    print("=" * 60)
    
    app = QApplication(sys.argv)
    
    # Создаём splash
    splash = SplashScreen()
    splash.show()
    
    # Симулируем инициализацию
    app.processEvents()
    
    splash.show_message("Инициализация базы данных...")
    QTimer.singleShot(1000, lambda: None)
    app.processEvents()
    
    splash.show_message("Загрузка интерфейса...")
    QTimer.singleShot(1500, lambda: None)
    app.processEvents()
    
    # Создаём фиктивное главное окно
    window = QMainWindow()
    window.setWindowTitle("SmartTable - Основное окно")
    window.setGeometry(100, 100, 600, 400)
    
    # Добавляем содержимое
    central = QWidget()
    layout = QVBoxLayout(central)
    
    label = QLabel("✅ Приложение загружено!\n\nSplash screen закроется в 3 секунды...")
    label.setFont(QFont("Arial", 14))
    label.setAlignment(0x0004 | 0x0020)  # Center | VCenter
    layout.addWidget(label)
    
    window.setCentralWidget(central)
    
    # Закрываем splash и показываем окно
    splash.show_message("Готово!")
    app.processEvents()
    
    QTimer.singleShot(1000, lambda: splash.finish(window))
    
    window.show()
    
    # Авто-закрыть после 3 сек
    QTimer.singleShot(3000, lambda: window.close())
    
    print("✅ Splash screen инициализирован")
    print("Окно закроется через 3 секунды...")
    
    sys.exit(app.exec_())


def demo_helper_function():
    """Демо 2: Использование helper функции"""
    print("=" * 60)
    print("ДЕМО 2: Helper функция show_splash_screen()")
    print("=" * 60)
    
    app = QApplication(sys.argv)
    
    # Используем helper
    splash = show_splash_screen(auto_close_ms=0)  # Не закрываем автоматически
    splash.show_message("Загрузка...")
    
    QTimer.singleShot(2000, lambda: None)
    app.processEvents()
    
    splash.show_message("Готово!")
    QTimer.singleShot(1000, lambda: None)
    app.processEvents()
    
    # Главное окно
    window = QMainWindow()
    window.setWindowTitle("SmartTable")
    window.setGeometry(100, 100, 600, 400)
    
    central = QWidget()
    layout = QVBoxLayout(central)
    label = QLabel("Hello from Splash Demo!\nОкно закроется через 2 секунды")
    label.setFont(QFont("Arial", 12))
    label.setAlignment(0x0004 | 0x0020)
    layout.addWidget(label)
    
    window.setCentralWidget(central)
    
    splash.finish(window)
    window.show()
    
    QTimer.singleShot(2000, lambda: window.close())
    
    print("✅ Splash screen (helper mode)")
    
    sys.exit(app.exec_())


def info():
    """Информация о тестах"""
    print("=" * 60)
    print("ТЕСТЫ SPLASH SCREEN")
    print("=" * 60)
    print("\nДоступные тесты:")
    print("  python test_utills/test_splash_demo.py 1  - Базовый splash")
    print("  python test_utills/test_splash_demo.py 2  - Helper функция")
    print("  python test_utills/test_splash_demo.py    - Информация (этот текст)")
    print("\nВозможности:")
    print("  • Показывать сообщения на splash screen")
    print("  • Показывать картинку при инициализации")
    print("  • Закрывать при нажатии на окно")
    print("  • Автоматическое закрытие через N миллисекунд")
    print("\nРасположение картинки:")
    print("  pysheets/assets/splash/splash.png")
    print("\nДокументация:")
    print("  md/SPLASH_SCREEN_GUIDE.md")
    print("=" * 60)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        mode = sys.argv[1]
        if mode == "1":
            demo_basic()
        elif mode == "2":
            demo_helper_function()
        else:
            info()
    else:
        info()
