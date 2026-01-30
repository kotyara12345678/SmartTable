#!/usr/bin/env python3
"""
Главный файл приложения SmartTable
Простой табличный редактор с поддержкой Excel
"""

import sys
import os
from pathlib import Path

from PyQt6.QtWidgets import QApplication, QMainWindow, QMessageBox
from PyQt6.QtCore import Qt, QSettings
from PyQt6.QtGui import QIcon

# Добавление пути к модулям проекта
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

try:
    from src.ui.main_window import MainWindow
except ImportError as e:
    print(f"Ошибка импорта: {e}")
    print("Создаем базовую структуру...")


    # Создание минимальной структуры
    class SimpleSpreadsheet(QMainWindow):
        """Простой табличный редактор для быстрого старта"""

        def __init__(self):
            super().__init__()
            self.setWindowTitle("SmartTable - Простой редактор")
            self.setGeometry(100, 100, 1200, 800)

            # Простое сообщение
            self.show_message()

        def show_message(self):
            QMessageBox.information(
                self,
                "Приветствие",
                "SmartTable успешно запущен!\n\n"
                "Это базовая версия приложения.\n"
                "Полная версия будет доступна после настройки всех модулей."
            )


    # Используем простую версию
    MainWindow = SimpleSpreadsheet


def main():
    """Точка входа приложения"""
    # Создание приложения
    app = QApplication(sys.argv)

    # Настройка приложения
    app.setApplicationName("SmartTable")
    app.setOrganizationName("SmartTable")

    # Попытка установки иконки
    icon_path = current_dir / "assets" / "icons" / "app_icon.ico"
    if icon_path.exists():
        app.setWindowIcon(QIcon(str(icon_path)))

    # Создание и отображение главного окна
    try:
        window = MainWindow()
    except Exception as e:
        QMessageBox.critical(
            None,
            "Ошибка запуска",
            f"Не удалось создать главное окно:\n{str(e)}"
        )
        return 1

    window.show()

    # Запуск главного цикла
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())