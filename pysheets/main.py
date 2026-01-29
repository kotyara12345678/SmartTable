#!/usr/bin/env python3
"""
PySheets - современный табличный редактор
"""

import sys
import os

# Добавляем src в путь Python для импортов
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from PyQt6.QtWidgets import QApplication
from ui.main_window import MainWindow


def main():
    app = QApplication(sys.argv)
    app.setApplicationName("PySheets")
    app.setOrganizationName("PySheets")

    window = MainWindow()
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()