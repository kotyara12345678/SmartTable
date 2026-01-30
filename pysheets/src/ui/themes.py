"""
Менеджер тем приложения
"""

from PyQt5.QtWidgets import QApplication
from PyQt5.QtGui import QPalette, QColor


class ThemeManager:
    """Менеджер тем приложения"""

    def __init__(self):
        self.current_theme = "system"  # Системная тема по умолчанию
        self.app_theme_color = QColor("#DC143C")  # Малиновый цвет по умолчанию
        self.themes = {
            "light": "light",
            "dark": "dark",
            "system": "system",
        }

    def apply_theme(self, theme_name: str, color: QColor = None):
        """Применение темы"""
        if theme_name in self.themes:
            self.current_theme = theme_name
            if color:
                self.app_theme_color = color
            
            # Для системной темы определяем реальную тему системы
            if theme_name == "system":
                # Проверяем системную палитру
                app = QApplication.instance()
                if app:
                    palette = app.palette()
                    bg_color = palette.color(__import__('PyQt5.QtGui', fromlist=['QPalette']).QPalette.Window)
                    brightness = (bg_color.red() + bg_color.green() + bg_color.blue()) / 3
                    actual_theme = "dark" if brightness < 128 else "light"
                else:
                    actual_theme = "light"
            else:
                actual_theme = theme_name
            
            self.apply_palette(actual_theme)
            self.apply_stylesheet(actual_theme)

    def apply_stylesheet(self, theme_name: str):
        """Применение таблицы стилей"""
        accent_color = self.app_theme_color.name()
        accent_light = self.app_theme_color.lighter(150).name()
        accent_dark = self.app_theme_color.darker(150).name()
        accent_hover = self.app_theme_color.lighter(120).name()

        if theme_name == "light":
            stylesheet = f"""
                QMainWindow {{ background-color: #f8f9fa; }}
                QWidget {{ color: #202124; font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; }}
                QToolBar {{ background-color: #f8f9fa; border-bottom: 1px solid #dadce0; spacing: 3px; padding: 2px; }}
                QToolButton {{ background-color: transparent; border: 1px solid transparent; border-radius: 3px; padding: 5px 8px; color: #202124; min-height: 24px; }}
                QToolButton:hover {{ background-color: #f1f3f4; border: 1px solid #dadce0; }}
                QToolButton:pressed {{ background-color: #e8eaed; }}
                QToolButton:checked {{ background-color: {accent_light}; border: 1px solid {accent_color}; }}
                QStatusBar {{ background-color: white; color: #5f6368; border-top: 1px solid #dadce0; }}
                QStatusBar::item {{ border: none; }}
                QTableWidget {{ background-color: white; alternate-background-color: #f8f9fa; gridline-color: #e0e0e0; border: 1px solid #dadce0; selection-background-color: {accent_light}; selection-color: #202124; }}
                QTableWidget::item {{ padding: 2px 4px; border-right: 1px solid #e0e0e0; border-bottom: 1px solid #e0e0e0; }}
                QTableWidget::item:selected {{ background-color: {accent_light}; color: #202124; }}
                QHeaderView::section {{ background-color: #f8f9fa; color: #202124; padding: 4px 8px; border-right: 1px solid #dadce0; border-bottom: 1px solid #dadce0; font-weight: 500; }}
                QTableWidget::corner-button {{ background-color: #f8f9fa; border: 1px solid #dadce0; margin: 0px; padding: 0px; }}
                QHeaderView {{ background-color: #f8f9fa; border: none; }}
                QAbstractButton {{ color: #202124; }}
                QTabWidget::pane {{ border: 1px solid #dadce0; background-color: white; }}
                QTabBar::tab {{ background-color: #f8f9fa; border: 1px solid #dadce0; color: #5f6368; padding: 8px 12px; margin-right: 2px; }}
                QTabBar::tab:selected {{ background-color: white; border-bottom-color: white; color: #202124; }}
                QTabBar::tab:hover {{ background-color: {accent_light}; }}
                QPushButton {{ background-color: white; border: 1px solid #dadce0; border-radius: 4px; padding: 6px 12px; color: #202124; }}
                QPushButton:hover {{ background-color: #f8f9fa; border-color: #c0c0c0; }}
                QPushButton:pressed {{ background-color: #e8eaed; }}
                QPushButton:checked {{ background-color: {accent_light}; border-color: {accent_color}; }}
                QPushButton[accent="true"] {{ background-color: {accent_color}; color: white; border: none; border-radius: 4px; padding: 6px 12px; font-weight: bold; }}
                QPushButton[accent="true"]:hover {{ background-color: {accent_hover}; }}
                QPushButton[accent="true"]:pressed {{ background-color: {accent_dark}; }}
                QGroupBox {{ border: 1px solid #dadce0; border-radius: 4px; margin-top: 12px; padding-top: 10px; font-weight: bold; font-size: 12px; }}
                QGroupBox::title {{ subcontrol-origin: margin; left: 10px; padding: 0 5px 0 5px; color: #202124; }}
                QLineEdit {{ border: 1px solid #dadce0; padding: 4px 8px; background-color: white; selection-background-color: {accent_light}; }}
                QLineEdit:focus {{ border: 2px solid {accent_color}; padding: 3px 7px; }}
                QComboBox {{ border: 1px solid #dadce0; padding: 4px 8px; background-color: white; }}
                QComboBox:hover {{ border-color: #a0a0a0; }}
                QComboBox::drop-down {{ border: none; }}
                QComboBox QAbstractItemView {{ background-color: white; selection-background-color: {accent_light}; }}
                QListWidget {{ border: 1px solid #dadce0; background-color: white; }}
                QListWidget::item {{ padding: 5px; border-bottom: 1px solid #f0f0f0; }}
                QListWidget::item:selected {{ background-color: {accent_light}; color: #202124; }}
                QMenuBar {{ background-color: #f8f9fa; border-bottom: 1px solid #dadce0; }}
                QMenuBar::item {{ background-color: transparent; padding: 5px 10px; }}
                QMenuBar::item:selected {{ background-color: {accent_light}; }}
                QMenu {{ background-color: white; border: 1px solid #dadce0; }}
                QMenu::item {{ padding: 5px 20px 5px 20px; }}
                QMenu::item:selected {{ background-color: {accent_light}; }}
                QCheckBox, QRadioButton {{ spacing: 5px; }}
                QCheckBox::indicator, QRadioButton::indicator {{ width: 16px; height: 16px; }}
                QCheckBox::indicator {{ border: 1px solid #dadce0; border-radius: 2px; background-color: white; }}
                QCheckBox::indicator:checked {{ background-color: {accent_color}; border-color: {accent_color}; }}
                QRadioButton::indicator {{ border: 1px solid #dadce0; border-radius: 8px; background-color: white; }}
                QRadioButton::indicator:checked {{ border: 5px solid {accent_color}; }}
                QDialog {{ background-color: white; }}
                QMessageBox {{ background-color: white; }}
                QScrollBar:vertical {{ border: none; background-color: transparent; width: 10px; margin: 0px; padding: 0px; }}
                QScrollBar::handle:vertical {{ background-color: #dadce0; border-radius: 5px; min-height: 20px; margin: 2px 2px 2px 2px; }}
                QScrollBar::handle:vertical:hover {{ background-color: #c0c0c0; }}
                QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{ border: none; background: none; height: 0px; }}
                QScrollBar:horizontal {{ border: none; background-color: transparent; height: 10px; margin: 0px; padding: 0px; }}
                QScrollBar::handle:horizontal {{ background-color: #dadce0; border-radius: 5px; min-width: 20px; margin: 2px 2px 2px 2px; }}
                QScrollBar::handle:horizontal:hover {{ background-color: #c0c0c0; }}
                QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {{ border: none; background: none; width: 0px; }}
            """
        else:
            stylesheet = f"""
                QMainWindow {{ background-color: #202124; }}
                QWidget {{ color: #e8eaed; font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; background-color: #202124; }}
                QToolBar {{ background-color: #2d2e30; border-bottom: 1px solid #3c4043; spacing: 3px; padding: 2px; }}
                QToolButton {{ background-color: transparent; border: 1px solid transparent; border-radius: 3px; padding: 5px 8px; color: #e8eaed; min-height: 24px; }}
                QToolButton:hover {{ background-color: #3c4043; border: 1px solid #5f6368; }}
                QToolButton:pressed {{ background-color: #5f6368; }}
                QToolButton:checked {{ background-color: {accent_dark}; border: 1px solid {accent_color}; }}
                QStatusBar {{ background-color: #202124; color: #9aa0a6; border-top: 1px solid #3c4043; }}
                QStatusBar::item {{ border: none; }}
                QTableWidget {{ background-color: #202124; alternate-background-color: #2d2e30; gridline-color: #3c4043; border: 1px solid #3c4043; selection-background-color: {accent_dark}; selection-color: #e8eaed; }}
                QTableWidget::item {{ padding: 2px 4px; border-right: 1px solid #3c4043; border-bottom: 1px solid #3c4043; }}
                QTableWidget::item:selected {{ background-color: {accent_dark}; color: #e8eaed; }}
                QHeaderView::section {{ background-color: #2d2e30; color: #e8eaed; padding: 4px 8px; border-right: 1px solid #3c4043; border-bottom: 1px solid #3c4043; font-weight: 500; }}
                QTableWidget::corner-button {{ background-color: #2d2e30; border: 1px solid #3c4043; margin: 0px; padding: 0px; }}
                QHeaderView {{ background-color: #2d2e30; border: none; }}
                QAbstractButton {{ color: #e8eaed; }}
                QTabWidget::pane {{ border: 1px solid #3c4043; background-color: #202124; }}
                QTabBar::tab {{ background-color: #2d2e30; border: 1px solid #3c4043; color: #9aa0a6; padding: 8px 12px; margin-right: 2px; }}
                QTabBar::tab:selected {{ background-color: #202124; border-bottom-color: #202124; color: #e8eaed; }}
                QTabBar::tab:hover {{ background-color: {accent_dark}; }}
                QPushButton {{ background-color: #2d2e30; border: 1px solid #3c4043; border-radius: 4px; padding: 6px 12px; color: #e8eaed; }}
                QPushButton:hover {{ background-color: #3c4043; border-color: #5f6368; }}
                QPushButton:pressed {{ background-color: #5f6368; }}
                QPushButton:checked {{ background-color: {accent_dark}; border-color: {accent_color}; }}
                QPushButton[accent="true"] {{ background-color: {accent_color}; color: white; border: none; border-radius: 4px; padding: 6px 12px; font-weight: bold; }}
                QPushButton[accent="true"]:hover {{ background-color: {accent_hover}; }}
                QPushButton[accent="true"]:pressed {{ background-color: {accent_dark}; }}
                QGroupBox {{ border: 1px solid #3c4043; border-radius: 4px; margin-top: 12px; padding-top: 10px; font-weight: bold; font-size: 12px; background-color: #2d2e30; }}
                QGroupBox::title {{ subcontrol-origin: margin; left: 10px; padding: 0 5px 0 5px; color: #e8eaed; }}
                QLineEdit {{ border: 1px solid #3c4043; padding: 4px 8px; background-color: #2d2e30; color: #e8eaed; selection-background-color: {accent_dark}; }}
                QLineEdit:focus {{ border: 2px solid {accent_color}; padding: 3px 7px; }}
                QComboBox {{ border: 1px solid #3c4043; padding: 4px 8px; background-color: #2d2e30; color: #e8eaed; }}
                QComboBox:hover {{ border-color: #5f6368; }}
                QComboBox::drop-down {{ border: none; }}
                QComboBox QAbstractItemView {{ background-color: #2d2e30; color: #e8eaed; selection-background-color: {accent_dark}; }}
                QListWidget {{ border: 1px solid #3c4043; background-color: #2d2e30; }}
                QListWidget::item {{ padding: 5px; border-bottom: 1px solid #3c4043; }}
                QListWidget::item:selected {{ background-color: {accent_dark}; color: #e8eaed; }}
                QMenuBar {{ background-color: #2d2e30; border-bottom: 1px solid #3c4043; }}
                QMenuBar::item {{ background-color: transparent; padding: 5px 10px; }}
                QMenuBar::item:selected {{ background-color: {accent_dark}; }}
                QMenu {{ background-color: #2d2e30; border: 1px solid #3c4043; }}
                QMenu::item {{ padding: 5px 20px 5px 20px; color: #e8eaed; }}
                QMenu::item:selected {{ background-color: {accent_dark}; }}
                QCheckBox, QRadioButton {{ color: #e8eaed; spacing: 5px; }}
                QCheckBox::indicator, QRadioButton::indicator {{ width: 16px; height: 16px; }}
                QCheckBox::indicator {{ border: 1px solid #5f6368; border-radius: 2px; background-color: #2d2e30; }}
                QCheckBox::indicator:checked {{ background-color: {accent_color}; border-color: {accent_color}; }}
                QRadioButton::indicator {{ border: 1px solid #5f6368; border-radius: 8px; background-color: #2d2e30; }}
                QRadioButton::indicator:checked {{ border: 5px solid {accent_color}; }}
                QDialog {{ background-color: #202124; }}
                QMessageBox {{ background-color: #202124; }}
                QScrollBar:vertical {{ border: none; background-color: #202124; width: 8px; margin: 0px; padding: 0px; }}
                QScrollBar::handle:vertical {{ background-color: #5f6368; border-radius: 4px; min-height: 20px; margin: 0px; }}
                QScrollBar::handle:vertical:hover {{ background-color: #80868b; }}
                QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{ border: none; background: none; height: 0px; }}
                QScrollBar:horizontal {{ border: none; background-color: #202124; height: 8px; margin: 0px; padding: 0px; }}
                QScrollBar::handle:horizontal {{ background-color: #5f6368; border-radius: 4px; min-width: 20px; margin: 0px; }}
                QScrollBar::handle:horizontal:hover {{ background-color: #80868b; }}
                QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {{ border: none; background: none; width: 0px; }}
            """

        app = QApplication.instance()
        if app:
            app.setStyleSheet(stylesheet)

    def apply_palette(self, theme_name: str):
        """Применение палитры цветов"""
        app = QApplication.instance()
        if not app:
            return

        palette = QPalette()
        accent_color = self.app_theme_color

        if theme_name == "dark":
            palette.setColor(QPalette.Window, QColor(32, 33, 36))
            palette.setColor(QPalette.WindowText, QColor(232, 234, 237))
            palette.setColor(QPalette.Base, QColor(32, 33, 36))
            palette.setColor(QPalette.AlternateBase, QColor(45, 46, 48))
            palette.setColor(QPalette.ToolTipBase, QColor(25, 25, 25))
            palette.setColor(QPalette.ToolTipText, QColor(232, 234, 237))
            palette.setColor(QPalette.Text, QColor(232, 234, 237))
            palette.setColor(QPalette.Button, QColor(45, 46, 48))
            palette.setColor(QPalette.ButtonText, QColor(232, 234, 237))
            palette.setColor(QPalette.BrightText, QColor(255, 0, 0))
            palette.setColor(QPalette.Link, accent_color.lighter(150))
            palette.setColor(QPalette.Highlight, accent_color)
            palette.setColor(QPalette.HighlightedText, QColor(0, 0, 0))
        else:
            palette.setColor(QPalette.Window, QColor(248, 249, 250))
            palette.setColor(QPalette.WindowText, QColor(32, 33, 36))
            palette.setColor(QPalette.Base, QColor(255, 255, 255))
            palette.setColor(QPalette.AlternateBase, QColor(248, 249, 250))
            palette.setColor(QPalette.ToolTipBase, QColor(255, 255, 255))
            palette.setColor(QPalette.ToolTipText, QColor(32, 33, 36))
            palette.setColor(QPalette.Text, QColor(32, 33, 36))
            palette.setColor(QPalette.Button, QColor(248, 249, 250))
            palette.setColor(QPalette.ButtonText, QColor(32, 33, 36))
            palette.setColor(QPalette.BrightText, QColor(255, 0, 0))
            palette.setColor(QPalette.Link, accent_color)
            palette.setColor(QPalette.Highlight, accent_color)
            palette.setColor(QPalette.HighlightedText, QColor(255, 255, 255))

        app.setPalette(palette)

    def get_available_themes(self) -> list:
        """Получение списка доступных тем"""
        return list(self.themes.keys())


# ThemeSettingsDialog для диалога настроек
from PyQt5.QtWidgets import QDialog, QVBoxLayout, QGroupBox, QRadioButton, QPushButton, QHBoxLayout, QLabel, QDialogButtonBox, QCheckBox
from PyQt5.QtCore import Qt


class ThemeSettingsDialog(QDialog):
    """Диалог настроек темы"""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Настроить тему")
        self.setFixedSize(400, 350)
        
        self.selected_color = QColor("#DC143C")
        self.parent_theme = "light"  # Будет установлено в _apply_dialog_theme

        layout = QVBoxLayout(self)

        # Выбор цветовой схемы
        theme_group = QGroupBox("Цветовая схема")
        theme_layout = QVBoxLayout()

        self.light_theme_radio = QRadioButton("☀️ Светлая тема")
        self.dark_theme_radio = QRadioButton("🌙 Темная тема")
        self.system_theme_radio = QRadioButton("⚙️ Системная тема")
        self.system_theme_radio.setChecked(True)  # По умолчанию системная

        theme_layout.addWidget(self.light_theme_radio)
        theme_layout.addWidget(self.dark_theme_radio)
        theme_layout.addWidget(self.system_theme_radio)
        theme_group.setLayout(theme_layout)

        # Выбор акцентного цвета
        color_group = QGroupBox("Акцентный цвет")
        color_layout = QVBoxLayout()

        # Предустановленные цвета
        colors_layout = QHBoxLayout()
        self.color_buttons = []

        colors = [
            ("#DC143C", "Малиновый"),
            ("#1a73e8", "Синий"),
            ("#0b8043", "Зеленый"),
            ("#f6bf26", "Желтый"),
            ("#8e24aa", "Фиолетовый"),
            ("#e67c73", "Коралловый"),
        ]

        for color_code, tooltip in colors:
            btn = QPushButton()
            btn.setFixedSize(30, 30)
            btn.setStyleSheet(f"""
                QPushButton {{
                    background-color: {color_code};
                    border: 2px solid #ddd;
                    border-radius: 15px;
                }}
                QPushButton:hover {{
                    border: 2px solid #888;
                }}
                QPushButton:checked {{
                    border: 3px solid #333;
                }}
            """)
            btn.setCheckable(True)
            btn.setToolTip(tooltip)
            btn.color_code = color_code
            btn.clicked.connect(lambda checked=False, c=color_code: self.on_color_selected(c))
            self.color_buttons.append(btn)
            colors_layout.addWidget(btn)

        color_layout.addLayout(colors_layout)

        # Пользовательский цвет
        custom_layout = QHBoxLayout()
        self.custom_color_btn = QPushButton("🎨 Выбрать цвет")
        self.custom_color_btn.clicked.connect(self.choose_custom_color)
        custom_layout.addWidget(self.custom_color_btn)

        self.color_preview = QLabel()
        self.color_preview.setFixedSize(30, 30)
        self.color_preview.setStyleSheet("background-color: #DC143C; border: 1px solid #ccc;")
        custom_layout.addWidget(self.color_preview)

        color_layout.addLayout(custom_layout)
        color_group.setLayout(color_layout)

        # Дополнительные настройки
        settings_group = QGroupBox("Дополнительные настройки")
        settings_layout = QVBoxLayout()

        self.grid_checkbox = QCheckBox("Показывать сетку таблицы")
        self.grid_checkbox.setChecked(True)

        self.alternating_rows_checkbox = QCheckBox("Чередовать цвета строк")
        self.alternating_rows_checkbox.setChecked(True)

        settings_layout.addWidget(self.grid_checkbox)
        settings_layout.addWidget(self.alternating_rows_checkbox)
        settings_group.setLayout(settings_layout)

        # Кнопки
        buttons = QDialogButtonBox(
            QDialogButtonBox.Ok | QDialogButtonBox.Cancel
        )
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)

        # Добавляем все в основной layout
        layout.addWidget(theme_group)
        layout.addWidget(color_group)
        layout.addWidget(settings_group)
        layout.addWidget(buttons)

        # Устанавливаем первый цвет как выбранный
        if self.color_buttons:
            self.color_buttons[0].setChecked(True)
            self.selected_color = QColor(colors[0][0])
        
        # Применяем тему к диалогу
        self._apply_dialog_theme()

    def _apply_dialog_theme(self):
        """Применить тему к диалогу"""
        # Определяем текущую тему из parent если это MainWindow
        current_theme = "light"
        if hasattr(self.parent(), 'current_theme'):
            current_theme = self.parent().current_theme
            if current_theme == "system":
                # Определяем системную тему
                palette = QApplication.instance().palette()
                bg_color = palette.color(__import__('PyQt5.QtGui', fromlist=['QPalette']).QPalette.Window)
                brightness = (bg_color.red() + bg_color.green() + bg_color.blue()) / 3
                current_theme = "dark" if brightness < 128 else "light"
        
        self.parent_theme = current_theme
        
        # Применяем тему к диалогу
        manager = ThemeManager()
        if current_theme == "dark":
            manager.apply_theme("dark")
        else:
            manager.apply_theme("light")

    def on_color_selected(self, color_code):
        """Обработка выбора цвета"""
        self.selected_color = QColor(color_code)
        self.color_preview.setStyleSheet(f"background-color: {color_code}; border: 1px solid #ccc;")

    def choose_custom_color(self):
        """Выбор пользовательского цвета"""
        from PyQt5.QtWidgets import QColorDialog
        color = QColorDialog.getColor(self.selected_color, self, "Выберите цвет")
        if color.isValid():
            self.selected_color = color
            self.color_preview.setStyleSheet(f"background-color: {color.name()}; border: 1px solid #ccc;")
            # Снимаем выбор с пресетов
            for btn in self.color_buttons:
                btn.setChecked(False)

    def get_settings(self):
        """Получение выбранных настроек"""
        # Определяем выбранную тему
        if self.light_theme_radio.isChecked():
            theme = "light"
        elif self.dark_theme_radio.isChecked():
            theme = "dark"
        else:
            theme = "system"

        return {
            'theme': theme,
            'color': self.selected_color,
            'show_grid': self.grid_checkbox.isChecked(),
            'alternating_rows': self.alternating_rows_checkbox.isChecked()
        }