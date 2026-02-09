#!/usr/bin/env python3
"""
Главный файл приложения SmartTable
Простой табличный редактор с поддержкой Excel
"""

import sys
import os
import logging
from pathlib import Path

from PyQt5.QtWidgets import QApplication, QMainWindow, QMessageBox
from PyQt5.QtCore import Qt, QSettings
from PyQt5.QtGui import QIcon

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(Path.home() / ".smarttable" / "smarttable.log")
    ]
)

current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))
current_dir = Path(__file__).parent
parent_dir = current_dir.parent
sys.path.insert(0, str(parent_dir))
sys.path.insert(0, str(current_dir))

try:
    from pysheets.src.ui.main_window import MainWindow
    from pysheets.src.db.database_manager import DatabaseManager
except ImportError as e:
    print(f"Ошибка импорта: {e}")
    print("Создаем базовую структуру...")

    class SimpleSpreadsheet(QMainWindow):
        def __init__(self):
            super().__init__()
            self.setWindowTitle("SmartTable - Простой редактор")
            self.setGeometry(100, 100, 1200, 800)
    MainWindow = SimpleSpreadsheet


def init_database():
    """Инициализация базы данных"""
    try:
        db_manager = DatabaseManager()
        logging.info(f"Database initialized at: {db_manager.db_path}")
        db_info = db_manager.get_database_info()
        logging.info(f"Database info: {db_info}")
        return db_manager
    except Exception as e:
        logging.error(f"Database initialization error: {e}")
        return None


def main():
    """Точка входа приложения"""
    app = QApplication(sys.argv)

    app.setApplicationName("SmartTable")
    app.setOrganizationName("SmartTable")

    icon_path = current_dir / "assets" / "icons" / "app_icon.ico"
    if icon_path.exists():
        app.setWindowIcon(QIcon(str(icon_path)))

    # Инициализируем БД
    db_manager = init_database()

    try:
        window = MainWindow()
        # Передаём менеджер БД в главное окно если нужно
        if hasattr(window, 'set_database_manager'):
            window.set_database_manager(db_manager)
    except Exception as e:
        QMessageBox.critical(
            None,
            "Ошибка запуска",
            f"Не удалось создать главное окно:\n{str(e)}"
        )
        return 1

    window.show()

    return app.exec()


if __name__ == "__main__":
    sys.exit(main())