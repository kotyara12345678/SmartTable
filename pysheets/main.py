#!/usr/bin/env python3
"""
Main entry point for SmartTable application
Simple spreadsheet editor with Excel support
"""

import sys
import os
from pathlib import Path

from PyQt5.QtWidgets import QApplication, QMainWindow, QMessageBox
from PyQt5.QtCore import Qt, QSettings
from PyQt5.QtGui import QIcon

current_dir = Path(__file__).parent
parent_dir = current_dir.parent
sys.path.insert(0, str(parent_dir))
sys.path.insert(0, str(current_dir))

try:
    from pysheets.src.ui.main_window import MainWindow
except ImportError as e:
    print("Error importing MainWindow: " + str(e))
    print("Creating basic structure...")

    class SimpleSpreadsheet(QMainWindow):
        def __init__(self):
            super().__init__()
            self.setWindowTitle("SmartTable - Simple editor")
            self.setGeometry(100, 100, 1200, 800)
    MainWindow = SimpleSpreadsheet


def main():
    """Application entry point"""
    app = QApplication(sys.argv)

    app.setApplicationName("SmartTable")
    app.setOrganizationName("SmartTable")

    icon_path = current_dir / "assets" / "icons" / "app_icon.ico"
    if icon_path.exists():
        app.setWindowIcon(QIcon(str(icon_path)))

    try:
        window = MainWindow()
    except Exception as e:
        QMessageBox.critical(
            None,
            "Launch Error",
            "Failed to create main window:\n{0}".format(str(e))
        )
        return 1

    window.show()

    return app.exec()


if __name__ == "__main__":
    sys.exit(main())