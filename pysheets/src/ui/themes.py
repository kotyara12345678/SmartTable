"""
Менеджер тем приложения
"""

from PyQt6.QtWidgets import QApplication
from PyQt6.QtCore import QFile, QTextStream
from PyQt6.QtGui import QPalette, QColor


class ThemeManager:
    """Менеджер тем приложения"""

    def __init__(self):
        self.current_theme = "light"
        self.themes = {
            "light": "assets/styles/main.qss",
            "dark": "assets/styles/dark.qss",
            "modern": "assets/styles/modern.qss"
        }

    def apply_theme(self, theme_name: str):
        """Применение темы"""
        if theme_name in self.themes:
            self.current_theme = theme_name

            # Загрузка стилей из QSS файла
            style_file = self.themes[theme_name]
            self.load_stylesheet(style_file)

            # Применение дополнительных настроек палитры
            self.apply_palette(theme_name)

    def load_stylesheet(self, filename: str):
        """Загрузка таблицы стилей из файла"""
        try:
            file = QFile(filename)
            if file.open(QFile.OpenModeFlag.ReadOnly | QFile.OpenModeFlag.Text):
                stream = QTextStream(file)
                style = stream.readAll()
                QApplication.instance().setStyleSheet(style)
                file.close()
        except Exception as e:
            print(f"Ошибка загрузки стилей: {e}")
            # Применение стандартных стилей
            self.apply_default_styles()

    def apply_palette(self, theme_name: str):
        """Применение палитры цветов"""
        app = QApplication.instance()
        if not app:
            return

        palette = QPalette()

        if theme_name == "dark":
            # Темная тема
            palette.setColor(QPalette.ColorRole.Window, QColor(53, 53, 53))
            palette.setColor(QPalette.ColorRole.WindowText, QColor(255, 255, 255))
            palette.setColor(QPalette.ColorRole.Base, QColor(35, 35, 35))
            palette.setColor(QPalette.ColorRole.AlternateBase, QColor(53, 53, 53))
            palette.setColor(QPalette.ColorRole.ToolTipBase, QColor(25, 25, 25))
            palette.setColor(QPalette.ColorRole.ToolTipText, QColor(255, 255, 255))
            palette.setColor(QPalette.ColorRole.Text, QColor(255, 255, 255))
            palette.setColor(QPalette.ColorRole.Button, QColor(53, 53, 53))
            palette.setColor(QPalette.ColorRole.ButtonText, QColor(255, 255, 255))
            palette.setColor(QPalette.ColorRole.BrightText, QColor(255, 0, 0))
            palette.setColor(QPalette.ColorRole.Link, QColor(42, 130, 218))
            palette.setColor(QPalette.ColorRole.Highlight, QColor(42, 130, 218))
            palette.setColor(QPalette.ColorRole.HighlightedText, QColor(255, 255, 255))
        else:
            # Светлая тема
            palette.setColor(QPalette.ColorRole.Window, QColor(240, 240, 240))
            palette.setColor(QPalette.ColorRole.WindowText, QColor(0, 0, 0))
            palette.setColor(QPalette.ColorRole.Base, QColor(255, 255, 255))
            palette.setColor(QPalette.ColorRole.AlternateBase, QColor(240, 240, 240))
            palette.setColor(QPalette.ColorRole.ToolTipBase, QColor(255, 255, 255))
            palette.setColor(QPalette.ColorRole.ToolTipText, QColor(0, 0, 0))
            palette.setColor(QPalette.ColorRole.Text, QColor(0, 0, 0))
            palette.setColor(QPalette.ColorRole.Button, QColor(240, 240, 240))
            palette.setColor(QPalette.ColorRole.ButtonText, QColor(0, 0, 0))
            palette.setColor(QPalette.ColorRole.BrightText, QColor(255, 0, 0))
            palette.setColor(QPalette.ColorRole.Link, QColor(0, 120, 215))
            palette.setColor(QPalette.ColorRole.Highlight, QColor(0, 120, 215))
            palette.setColor(QPalette.ColorRole.HighlightedText, QColor(255, 255, 255))

        app.setPalette(palette)

    def apply_default_styles(self):
        """Применение стандартных стилей"""
        default_style = """
            QMainWindow {
                background-color: #f0f0f0;
            }

            QTableWidget {
                background-color: white;
                alternate-background-color: #f8f8f8;
                gridline-color: #e0e0e0;
            }

            QHeaderView::section {
                background-color: #e8e8e8;
                padding: 4px;
                border: 1px solid #d0d0d0;
                font-weight: bold;
            }

            QToolBar {
                background-color: #f0f0f0;
                border-bottom: 1px solid #d0d0d0;
                spacing: 2px;
            }

            QToolButton {
                background-color: transparent;
                border: 1px solid transparent;
                border-radius: 2px;
                padding: 4px;
            }

            QToolButton:hover {
                background-color: #e0e0e0;
                border: 1px solid #c0c0c0;
            }

            QStatusBar {
                background-color: #e8e8e8;
                border-top: 1px solid #d0d0d0;
            }
        """
        QApplication.instance().setStyleSheet(default_style)

    def get_available_themes(self) -> list:
        """Получение списка доступных тем"""
        return list(self.themes.keys())