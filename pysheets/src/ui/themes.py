

import sys
from PyQt5.QtWidgets import QApplication
from PyQt5.QtGui import QPalette, QColor

# Try to import winreg on Windows for reliable system theme detection
if sys.platform.startswith("win"):
    try:
        import winreg
    except Exception:
        winreg = None
else:
    winreg = None


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

    def _get_real_system_theme(self):
        """Определяет реальную системную тему.

        Сначала пытается прочитать значения из реестра Windows (AppsUseLightTheme / SystemUsesLightTheme).
        Если реестр недоступен или ключи не найдены — использует эвристику по палитре приложения.
        """
        # Try registry on Windows first
        if winreg is not None:
            try:
                key_path = r"Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize"
                with winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path) as key:
                    try:
                        apps_val, _ = winreg.QueryValueEx(key, "AppsUseLightTheme")
                    except FileNotFoundError:
                        apps_val = None
                    try:
                        sys_val, _ = winreg.QueryValueEx(key, "SystemUsesLightTheme")
                    except FileNotFoundError:
                        sys_val = None

                    print(f"DEBUG: Registry AppsUseLightTheme={apps_val}, SystemUsesLightTheme={sys_val}")

                    if apps_val is not None:
                        return "dark" if apps_val == 0 else "light"
                    if sys_val is not None:
                        return "dark" if sys_val == 0 else "light"
            except Exception as e:
                print(f"DEBUG: Registry read failed: {e}")

        # Fallback to palette heuristics
        app = QApplication.instance()
        if not app:
            return "light"

        palette = app.palette()
        window_color = palette.color(QPalette.Window)
        window_brightness = (window_color.red() + window_color.green() + window_color.blue()) / 3
        text_color = palette.color(QPalette.Text)
        text_brightness = (text_color.red() + text_color.green() + text_color.blue()) / 3

        print(
            f"DEBUG: Palette Window RGB=({window_color.red()},{window_color.green()},{window_color.blue()}) brightness={window_brightness}")
        print(
            f"DEBUG: Palette Text RGB=({text_color.red()},{text_color.green()},{text_color.blue()}) brightness={text_brightness}")

        if window_brightness < 100:
            return "dark"
        if text_brightness > 180:
            return "dark"
        return "light"

    def apply_theme(self, theme_name: str, color: QColor = None):
        """Применение темы"""
        self.current_theme = theme_name
        if color:
            self.app_theme_color = color

        # Определяем реальную тему
        actual_theme = theme_name

        if theme_name == "system":
            # Для системной темы: сначала применяем светлую, потом проверяем и переприменяем если нужна тёмная
            self.apply_palette("light")
            self.apply_stylesheet("light")

            # Теперь проверяем реальную системную тему после применения светлой темы
            actual_theme = self._get_real_system_theme()

            # Если реальная тема тёмная, переприменяем
            if actual_theme == "dark":
                self.apply_palette("dark")
                self.apply_stylesheet("dark")
        elif theme_name == "gallery":
            # Галерея может быть светлой или ночной в зависимости от категории
            # Режим хранится в current_theme_mode (установлен в apply_gallery_theme_full)
            theme_mode = getattr(self, 'current_theme_mode', 'light')
            print(f"[THEMES] apply_theme для gallery: режим={theme_mode}")
            self.apply_palette(theme_mode)
            self.apply_stylesheet(theme_mode)
        elif theme_name in self.themes:
            # Для явных светлых/тёмных тем просто применяем
            self.apply_palette(actual_theme)
            self.apply_stylesheet(actual_theme)
        else:
            # Если тема неизвестна, применяем светлую
            self.apply_palette("light")
            self.apply_stylesheet("light")

    def apply_stylesheet(self, theme_name: str):
        """Применение таблицы стилей"""
        accent_color = self.app_theme_color.name()
        accent_light = self.app_theme_color.lighter(150).name()
        accent_dark = self.app_theme_color.darker(150).name()
        accent_hover = self.app_theme_color.lighter(120).name()

        print(f"[THEMES] apply_stylesheet: theme={theme_name}, accent={accent_color}")

        if theme_name == "light":
            stylesheet = f"""
                QMainWindow {{ background-color: #ffffff; }}
                QWidget {{ color: #202124; font-family: 'Segoe UI', 'Helvetica Neue', sans-serif; font-size: 11px; }}

                /* TOOLBAR */
                QToolBar {{ 
                    background-color: #ffffff; 
                    border-bottom: 1px solid #e8eaed; 
                    spacing: 8px; 
                    padding: 8px 12px;
                }}
                QToolButton {{ 
                    background-color: transparent; 
                    border: none; 
                    border-radius: 6px; 
                    padding: 6px 10px; 
                    color: #202124; 
                    min-height: 32px;
                    font-weight: 500;
                }}
                QToolButton:hover {{ 
                    background-color: #f1f3f4; 
                }}
                QToolButton:pressed {{ 
                    background-color: #e8eaed; 
                }}
                QToolButton:checked {{ 
                    background-color: {accent_light}; 
                }}

                /* STATUS BAR */
                QStatusBar {{ 
                    background-color: #f8f9fa; 
                    color: #5f6368; 
                    border-top: 1px solid #e8eaed;
                    padding: 6px 12px;
                }}
                QStatusBar::item {{ border: none; }}

                /* TABLE */
                QTableWidget {{ 
                    background-color: #ffffff; 
                    alternate-background-color: #f8f9fa; 
                    gridline-color: #e8eaed; 
                    border: none;
                    selection-background-color: {accent_light};
                    selection-color: #202124;
                    font-size: 12px;
                }}
                QTableWidget::item {{ 
                    padding: 10px 12px; 
                    border-right: 1px solid #dadce0; 
                    border-bottom: 1px solid #dadce0;
                    background-color: #ffffff;
                }}
                QTableWidget::item:alternate {{
                    background-color: #f8f9fa;
                }}
                QTableWidget::item:hover {{
                    background-color: #f1f3f4;
                }}
                QTableWidget::item:selected {{ 
                    background-color: {accent_light}; 
                    color: #202124;
                    font-weight: 500;
                }}

                /* HEADERS */
                QHeaderView::section {{ 
                    background: linear-gradient(to bottom, #ffffff, #f8f9fa);
                    color: #202124; 
                    padding: 10px 14px; 
                    border-right: 1px solid #dadce0; 
                    border-bottom: 2px solid #dadce0;
                    font-weight: 700;
                    font-size: 12px;
                    text-align: center;
                    min-height: 36px;
                    height: 36px;
                }}
                QHeaderView::section:hover {{
                    background: linear-gradient(to bottom, #f1f3f4, #f8f9fa);
                }}
                QHeaderView {{ background-color: #f8f9fa; border: none; border-left: 1px solid #dadce0; border-bottom: 2px solid #dadce0; }}
                QAbstractButton {{ color: #202124; font-weight: 700; }}

                /* TABS */
                QTabWidget::pane {{ 
                    border: 1px solid #e8eaed; 
                    background-color: #ffffff;
                    border-radius: 0px;
                }}
                QTabBar::tab {{ 
                    background-color: #f8f9fa; 
                    border: none;
                    color: #5f6368; 
                    padding: 10px 16px; 
                    margin-right: 4px;
                    border-radius: 8px 8px 0px 0px;
                    font-weight: 500;
                }}
                QTabBar::tab:selected {{ 
                    background-color: #ffffff;
                    color: #202124;
                    border-bottom: 3px solid {accent_color};
                }}
                QTabBar::tab:hover:!selected {{ 
                    background-color: #eeeff1;
                }}

                /* BUTTONS */
                QPushButton {{ 
                    background-color: #f8f9fa; 
                    border: 1px solid #dadce0; 
                    border-radius: 6px; 
                    padding: 8px 16px; 
                    color: #202124;
                    font-weight: 500;
                }}
                QPushButton:hover {{ 
                    background-color: #f1f3f4; 
                    border-color: #c6c6c6;
                }}
                QPushButton:pressed {{ 
                    background-color: #e8eaed;
                }}
                QPushButton:checked {{ 
                    background-color: {accent_light}; 
                    border-color: {accent_color};
                }}
                QPushButton[accent="true"] {{ 
                    background-color: {accent_color}; 
                    color: white; 
                    border: none; 
                    border-radius: 6px; 
                    padding: 8px 16px; 
                    font-weight: 600;
                }}
                QPushButton[accent="true"]:hover {{ 
                    background-color: {accent_hover};
                }}
                QPushButton[accent="true"]:pressed {{ 
                    background-color: {accent_dark};
                }}

                /* GROUPS */
                QGroupBox {{ 
                    border: 1px solid #e8eaed; 
                    border-radius: 8px; 
                    margin-top: 12px; 
                    padding-top: 10px; 
                    font-weight: 600; 
                    font-size: 12px;
                    color: #202124;
                }}
                QGroupBox::title {{ 
                    subcontrol-origin: margin; 
                    left: 12px; 
                    padding: 0 6px 0 6px;
                }}

                /* INPUTS */
                QLineEdit {{ 
                    border: 1px solid #dadce0; 
                    border-radius: 6px;
                    padding: 8px 12px; 
                    background-color: #ffffff;
                    selection-background-color: {accent_light};
                    font-size: 11px;
                }}
                QLineEdit:focus {{ 
                    border: 2px solid {accent_color};
                    padding: 7px 11px;
                }}

                QComboBox {{ 
                    border: 1px solid #dadce0; 
                    border-radius: 6px;
                    padding: 8px 12px; 
                    background-color: #ffffff;
                    font-size: 11px;
                }}
                QComboBox:focus {{ 
                    border: 2px solid {accent_color};
                }}
                QComboBox:hover {{ 
                    border-color: #c6c6c6;
                }}
                QComboBox::drop-down {{ 
                    border: none;
                    subcontrol-position: right 6px center;
                }}
                QComboBox QAbstractItemView {{ 
                    background-color: #ffffff; 
                    selection-background-color: {accent_light};
                    border: 1px solid #dadce0;
                    border-radius: 6px;
                }}

                /* LIST */
                QListWidget {{ 
                    border: 1px solid #dadce0; 
                    border-radius: 6px;
                    background-color: #ffffff;
                }}
                QListWidget::item {{ 
                    padding: 6px 8px;
                    border: none;
                }}
                QListWidget::item:hover {{ 
                    background-color: #f1f3f4;
                }}
                QListWidget::item:selected {{ 
                    background-color: {accent_light}; 
                    color: #202124;
                }}

                /* MENU */
                QMenuBar {{ 
                    background-color: #ffffff; 
                    border-bottom: 1px solid #e8eaed;
                    padding: 4px 12px;
                }}
                QMenuBar::item {{ 
                    background-color: transparent; 
                    padding: 6px 12px;
                    border-radius: 4px;
                }}
                QMenuBar::item:selected {{ 
                    background-color: #f1f3f4;
                }}
                QMenu {{ 
                    background-color: #ffffff; 
                    border: 1px solid #dadce0;
                    border-radius: 8px;
                    padding: 4px 0px;
                }}
                QMenu::item {{ 
                    padding: 8px 20px;
                    border: none;
                }}
                QMenu::item:selected {{ 
                    background-color: #f1f3f4;
                }}

                /* CHECKBOXES AND RADIOS */
                QCheckBox, QRadioButton {{ 
                    spacing: 8px;
                    color: #202124;
                }}
                QCheckBox::indicator, QRadioButton::indicator {{ 
                    width: 18px; 
                    height: 18px;
                }}
                QCheckBox::indicator {{ 
                    border: 2px solid #dadce0; 
                    border-radius: 3px; 
                    background-color: #ffffff;
                }}
                QCheckBox::indicator:hover {{ 
                    border-color: #bfbfbf;
                }}
                QCheckBox::indicator:checked {{ 
                    background-color: {accent_color};
                    border-color: {accent_color};
                }}
                QRadioButton::indicator {{ 
                    border: 2px solid #dadce0; 
                    border-radius: 9px; 
                    background-color: #ffffff;
                }}
                QRadioButton::indicator:checked {{ 
                    background-color: {accent_color};
                    border-color: {accent_color};
                }}

                /* SCROLLBAR */
                QScrollBar:vertical {{ 
                    border: none; 
                    background-color: transparent; 
                    width: 10px; 
                    margin: 0px;
                }}
                QScrollBar::handle:vertical {{ 
                    background-color: #dadce0; 
                    border-radius: 5px; 
                    min-height: 20px;
                }}
                QScrollBar::handle:vertical:hover {{ 
                    background-color: #c6c6c6;
                }}
                QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{ 
                    border: none; 
                    background: none; 
                    height: 0px;
                }}
                QScrollBar:horizontal {{ 
                    border: none; 
                    background-color: transparent; 
                    height: 10px; 
                    margin: 0px;
                }}
                QScrollBar::handle:horizontal {{ 
                    background-color: #dadce0; 
                    border-radius: 5px; 
                    min-width: 20px;
                }}
                QScrollBar::handle:horizontal:hover {{ 
                    background-color: #c6c6c6;
                }}
                QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {{ 
                    border: none; 
                    background: none; 
                    width: 0px;
                }}
            """
        else:  # dark theme
            stylesheet = f"""
                QMainWindow {{ background-color: #1e1e1e; }}
                QWidget {{ color: #e8eaed; font-family: 'Segoe UI', 'Helvetica Neue', sans-serif; font-size: 11px; }}

                /* TOOLBAR */
                QToolBar {{ 
                    background-color: #252525; 
                    border-bottom: 1px solid #3f3f3f; 
                    spacing: 8px; 
                    padding: 8px 12px;
                }}
                QToolButton {{ 
                    background-color: transparent; 
                    border: none; 
                    border-radius: 6px; 
                    padding: 6px 10px; 
                    color: #e8eaed; 
                    min-height: 32px;
                    font-weight: 500;
                }}
                QToolButton:hover {{ 
                    background-color: #353535; 
                }}
                QToolButton:pressed {{ 
                    background-color: #454545; 
                }}
                QToolButton:checked {{ 
                    background-color: {accent_dark}; 
                }}

                /* STATUS BAR */
                QStatusBar {{ 
                    background-color: #252525; 
                    color: #9aa0a6; 
                    border-top: 1px solid #3f3f3f;
                    padding: 6px 12px;
                }}
                QStatusBar::item {{ border: none; }}

                /* TABLE */
                QTableWidget {{ 
                    background-color: #1e1e1e; 
                    alternate-background-color: #262626; 
                    gridline-color: #3f3f3f; 
                    border: none;
                    selection-background-color: {accent_dark};
                    selection-color: #e8eaed;
                    font-size: 12px;
                    color: #e8eaed;
                }}
                QTableWidget::item {{ 
                    padding: 10px 12px; 
                    border-right: 1px solid #4a4a4a; 
                    border-bottom: 1px solid #4a4a4a;
                    background-color: #1e1e1e;
                    color: #e8eaed;
                }}
                QTableWidget::item:alternate {{
                    background-color: #262626;
                }}
                QTableWidget::item:hover {{
                    background-color: #323232;
                }}
                QTableWidget::item:selected {{ 
                    background-color: {accent_dark}; 
                    color: #e8eaed;
                    font-weight: 500;
                }}

                /* HEADERS */
                QHeaderView::section {{ 
                    background-color: #262626; 
                    color: #e8eaed; 
                    padding: 10px 14px; 
                    border-right: 1px solid #4a4a4a; 
                    border-bottom: 2px solid #454545;
                    font-weight: 700;
                    font-size: 12px;
                    text-align: center;
                    min-height: 36px;
                    height: 36px;
                }}
                QHeaderView::section:hover {{
                    background: linear-gradient(to bottom, #3f3f3f, #323232);
                }}
                QHeaderView {{ background-color: #262626; border: none; border-left: 1px solid #4a4a4a; border-bottom: 2px solid #454545; }}
                QAbstractButton {{ color: #e8eaed; font-weight: 700; }}

                /* TABS */
                QTabWidget::pane {{ 
                    border: 1px solid #3f3f3f; 
                    background-color: #1e1e1e;
                    border-radius: 0px;
                }}
                QTabBar::tab {{ 
                    background-color: #262626; 
                    border: none;
                    color: #9aa0a6; 
                    padding: 10px 16px; 
                    margin-right: 4px;
                    border-radius: 8px 8px 0px 0px;
                    font-weight: 500;
                }}
                QTabBar::tab:selected {{ 
                    background-color: #1e1e1e;
                    color: #e8eaed;
                    border-bottom: 3px solid {accent_color};
                }}
                QTabBar::tab:hover:!selected {{ 
                    background-color: #323232;
                }}

                /* BUTTONS */
                QPushButton {{ 
                    background-color: #2d2d2d; 
                    border: 1px solid #3f3f3f; 
                    border-radius: 6px; 
                    padding: 8px 16px; 
                    color: #e8eaed;
                    font-weight: 500;
                }}
                QPushButton:hover {{ 
                    background-color: #353535; 
                    border-color: #4a4a4a;
                }}
                QPushButton:pressed {{ 
                    background-color: #454545;
                }}
                QPushButton:checked {{ 
                    background-color: {accent_dark}; 
                    border-color: {accent_color};
                }}
                QPushButton[accent="true"] {{ 
                    background-color: {accent_color}; 
                    color: white; 
                    border: none; 
                    border-radius: 6px; 
                    padding: 8px 16px; 
                    font-weight: 600;
                }}
                QPushButton[accent="true"]:hover {{ 
                    background-color: {accent_hover};
                }}
                QPushButton[accent="true"]:pressed {{ 
                    background-color: {accent_dark};
                }}

                /* GROUPS */
                QGroupBox {{ 
                    border: 1px solid #3f3f3f; 
                    border-radius: 8px; 
                    margin-top: 12px; 
                    padding-top: 10px; 
                    font-weight: 600; 
                    font-size: 12px;
                    color: #e8eaed;
                }}
                QGroupBox::title {{ 
                    subcontrol-origin: margin; 
                    left: 12px; 
                    padding: 0 6px 0 6px;
                }}

                /* INPUTS */
                QLineEdit {{ 
                    border: 1px solid #3f3f3f; 
                    border-radius: 6px;
                    padding: 8px 12px; 
                    background-color: #2d2d2d;
                    color: #e8eaed;
                    selection-background-color: {accent_dark};
                    font-size: 11px;
                }}
                QLineEdit:focus {{ 
                    border: 2px solid {accent_color};
                    padding: 7px 11px;
                }}

                QComboBox {{ 
                    border: 1px solid #3f3f3f; 
                    border-radius: 6px;
                    padding: 8px 12px; 
                    background-color: #2d2d2d;
                    color: #e8eaed;
                    font-size: 11px;
                }}
                QComboBox:focus {{ 
                    border: 2px solid {accent_color};
                }}
                QComboBox:hover {{ 
                    border-color: #4a4a4a;
                }}
                QComboBox::drop-down {{ 
                    border: none;
                    subcontrol-position: right 6px center;
                }}
                QComboBox QAbstractItemView {{ 
                    background-color: #2d2d2d; 
                    color: #e8eaed;
                    selection-background-color: {accent_dark};
                    border: 1px solid #3f3f3f;
                    border-radius: 6px;
                }}

                /* LIST */
                QListWidget {{ 
                    border: 1px solid #3f3f3f; 
                    border-radius: 6px;
                    background-color: #1e1e1e;
                    color: #e8eaed;
                }}
                QListWidget::item {{ 
                    padding: 6px 8px;
                    border: none;
                }}
                QListWidget::item:hover {{ 
                    background-color: #262626;
                }}
                QListWidget::item:selected {{ 
                    background-color: {accent_dark}; 
                    color: #e8eaed;
                }}

                /* MENU */
                QMenuBar {{ 
                    background-color: #252525; 
                    border-bottom: 1px solid #3f3f3f;
                    padding: 4px 12px;
                    color: #e8eaed;
                }}
                QMenuBar::item {{ 
                    background-color: transparent; 
                    padding: 6px 12px;
                    border-radius: 4px;
                }}
                QMenuBar::item:selected {{ 
                    background-color: #353535;
                }}
                QMenu {{ 
                    background-color: #2d2d2d; 
                    border: 1px solid #3f3f3f;
                    border-radius: 8px;
                    padding: 4px 0px;
                    color: #e8eaed;
                }}
                QMenu::item {{ 
                    padding: 8px 20px;
                    border: none;
                }}
                QMenu::item:selected {{ 
                    background-color: #353535;
                }}

                /* CHECKBOXES AND RADIOS */
                QCheckBox, QRadioButton {{ 
                    spacing: 8px;
                    color: #e8eaed;
                }}
                QCheckBox::indicator, QRadioButton::indicator {{ 
                    width: 18px; 
                    height: 18px;
                }}
                QCheckBox::indicator {{ 
                    border: 2px solid #4a4a4a; 
                    border-radius: 3px; 
                    background-color: #2d2d2d;
                }}
                QCheckBox::indicator:hover {{ 
                    border-color: #5a5a5a;
                }}
                QCheckBox::indicator:checked {{ 
                    background-color: {accent_color};
                    border-color: {accent_color};
                }}
                QRadioButton::indicator {{ 
                    border: 2px solid #4a4a4a; 
                    border-radius: 9px; 
                    background-color: #2d2d2d;
                }}
                QRadioButton::indicator:checked {{ 
                    background-color: {accent_color};
                    border-color: {accent_color};
                }}

                /* SCROLLBAR */
                QScrollBar:vertical {{ 
                    border: none; 
                    background-color: transparent; 
                    width: 10px; 
                    margin: 0px;
                }}
                QScrollBar::handle:vertical {{ 
                    background-color: #4a4a4a; 
                    border-radius: 5px; 
                    min-height: 20px;
                }}
                QScrollBar::handle:vertical:hover {{ 
                    background-color: #5a5a5a;
                }}
                QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{ 
                    border: none; 
                    background: none; 
                    height: 0px;
                }}
                QScrollBar:horizontal {{ 
                    border: none; 
                    background-color: transparent; 
                    height: 10px; 
                    margin: 0px;
                }}
                QScrollBar::handle:horizontal {{ 
                    background-color: #4a4a4a; 
                    border-radius: 5px; 
                    min-width: 20px;
                }}
                QScrollBar::handle:horizontal:hover {{ 
                    background-color: #5a5a5a;
                }}
                QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {{ 
                    border: none; 
                    background: none; 
                    width: 0px;
                }}
            """

        app = QApplication.instance()
        if app:
            print(f"[THEMES] Устанавливаю stylesheet, длина={len(stylesheet)}")
            app.setStyleSheet(stylesheet)
            # Принудительно обновляем все виджеты
            all_widgets = app.allWidgets()
            print(f"[THEMES] Перерисовываю {len(all_widgets)} виджетов")
            for widget in all_widgets:
                try:
                    widget.style().unpolish(widget)
                    widget.style().polish(widget)
                    widget.repaint()
                except RuntimeError:
                    # Виджет может быть удален, пропускаем его
                    pass
            app.processEvents()
            print(f"[THEMES] Стиль применен")

    def apply_palette(self, theme_name: str):
        """Применение палитры цветов"""
        app = QApplication.instance()
        if not app:
            return

        print(f"[THEMES] apply_palette: theme={theme_name}, accent={self.app_theme_color.name()}")
        
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
            palette.setColor(QPalette.HighlightedText, QColor(32, 33, 36))

        print(f"[THEMES] Применяю palette для {theme_name}")
        app.setPalette(palette)

    def get_available_themes(self) -> list:
        """Получение списка доступных тем"""
        return list(self.themes.keys())


# ThemeSettingsDialog для диалога настроек
from PyQt5.QtWidgets import QDialog, QVBoxLayout, QGroupBox, QRadioButton, QPushButton, QHBoxLayout, QLabel, \
    QDialogButtonBox, QCheckBox, QWidget, QColorDialog
from PyQt5.QtCore import Qt, pyqtSignal


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
        app = QApplication.instance()
        
        # Копируем текущий стиль приложения на диалог
        if app:
            current_stylesheet = app.styleSheet()
            if current_stylesheet:
                self.setStyleSheet(current_stylesheet)
            else:
                # Если стиль приложения еще не установлен, применяем светлую тему
                # Определяем текущую тему из parent если это MainWindow
                current_theme = "light"
                if hasattr(self.parent(), 'current_theme'):
                    current_theme = self.parent().current_theme
                    if current_theme == "system":
                        # Определяем системную тему
                        palette = app.palette()
                        bg_color = palette.color(__import__('PyQt5.QtGui', fromlist=['QPalette']).QPalette.Window)
                        brightness = (bg_color.red() + bg_color.green() + bg_color.blue()) / 3
                        current_theme = "dark" if brightness < 128 else "light"
                
                # Берем цвет из родителя если он есть
                color = QColor("#DC143C")  # default color
                if hasattr(self.parent(), 'app_theme_color'):
                    color = self.parent().app_theme_color
                
                # Применяем тему
                manager = ThemeManager()
                manager.app_theme_color = color
                manager.apply_theme(current_theme)
                
                # Копируем стиль из приложения
                updated_stylesheet = app.styleSheet()
                if updated_stylesheet:
                    self.setStyleSheet(updated_stylesheet)

    def on_color_selected(self, color_code):
        """Обработка выбора цвета"""
        self.selected_color = QColor(color_code)
        self.color_preview.setStyleSheet(f"background-color: {color_code}; border: 1px solid #ccc;")

    def choose_custom_color(self):
        """Выбор пользовательского цвета"""
        from PyQt5.QtWidgets import QColorDialog
        dlg = QColorDialog(self)
        app = QApplication.instance()
        if app and app.styleSheet():
            dlg.setStyleSheet(app.styleSheet())
        if dlg.exec_() == QDialog.Accepted:
            color = dlg.currentColor()
            if color.isValid():
                self.selected_color = color
                self.color_preview.setStyleSheet(f"background-color: {color.name()}; border: 1px solid #ccc;")
                # Снимаем выбор с пресетов
                for btn in self.color_buttons:
                    btn.setChecked(False)

    def get_settings(self):
        """Возвращает выбранные в диалоге настройки темы"""
        if self.system_theme_radio.isChecked():
            theme = "system"
        elif self.dark_theme_radio.isChecked():
            theme = "dark"
        else:
            theme = "light"

        return {
            "theme": theme,
            "color": self.selected_color,
            "show_grid": self.grid_checkbox.isChecked(),
            "alternating_rows": self.alternating_rows_checkbox.isChecked(),
        }


class EmbeddedSettingsPanel(QWidget):
    """Встроенное окно настроек (плавающее внутри главного окна)"""
    
    settings_changed = pyqtSignal(dict)
    closed = pyqtSignal()
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Настроить тему")
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.NoDropShadowWindowHint)
        self.setStyleSheet("""
            QWidget {
                background-color: #f5f5f5;
                border: 1px solid #ccc;
                border-radius: 8px;
            }
        """)
        
        self.selected_color = QColor("#DC143C")
        self.parent_theme = "light"
        
        # Основной макет с отступом для эффекта панели
        outer_layout = QVBoxLayout(self)
        outer_layout.setContentsMargins(12, 12, 12, 12)
        
        # Внутренний контейнер
        inner_widget = QWidget()
        layout = QVBoxLayout(inner_widget)
        layout.setSpacing(10)
        
        # Заголовок с кнопкой закрытия
        header = QHBoxLayout()
        title = QLabel("⚙️ Настроить тему")
        title.setStyleSheet("font-weight: bold; font-size: 12px;")
        
        close_btn = QPushButton("✕")
        close_btn.setFixedSize(24, 24)
        close_btn.clicked.connect(self.close_panel)
        close_btn.setStyleSheet("""
            QPushButton {
                background-color: transparent;
                border: none;
                color: #666;
                font-weight: bold;
                padding: 2px;
            }
            QPushButton:hover {
                background-color: #ddd;
                border-radius: 4px;
            }
        """)
        
        header.addWidget(title)
        header.addStretch()
        header.addWidget(close_btn)
        layout.addLayout(header)
        
        # Выбор цветовой схемы
        theme_group = QGroupBox("Цветовая схема")
        theme_layout = QVBoxLayout()
        theme_layout.setSpacing(6)
        
        self.light_theme_radio = QRadioButton("☀️ Светлая тема")
        self.dark_theme_radio = QRadioButton("🌙 Темная тема")
        self.system_theme_radio = QRadioButton("⚙️ Системная тема")
        self.system_theme_radio.setChecked(True)
        
        theme_layout.addWidget(self.light_theme_radio)
        theme_layout.addWidget(self.dark_theme_radio)
        theme_layout.addWidget(self.system_theme_radio)
        theme_group.setLayout(theme_layout)
        layout.addWidget(theme_group)
        
        # Выбор акцентного цвета
        color_group = QGroupBox("Акцентный цвет")
        color_layout = QVBoxLayout()
        color_layout.setSpacing(6)
        
        colors_layout = QHBoxLayout()
        colors_layout.setSpacing(4)
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
            btn.setFixedSize(32, 32)
            btn.setStyleSheet(f"""
                QPushButton {{
                    background-color: {color_code};
                    border: 2px solid #999;
                    border-radius: 16px;
                }}
                QPushButton:hover {{
                    border: 2px solid #333;
                }}
                QPushButton:checked {{
                    border: 3px solid #000;
                }}
            """)
            btn.setCheckable(True)
            btn.setToolTip(tooltip)
            btn.color_code = color_code
            btn.clicked.connect(lambda checked=False, c=color_code: self.on_color_selected(c))
            colors_layout.addWidget(btn)
            self.color_buttons.append(btn)
        
        self.color_buttons[0].setChecked(True)
        colors_layout.addStretch()
        color_layout.addLayout(colors_layout)
        
        # Кнопка "Другой цвет..."
        custom_color_btn = QPushButton("🎨 Выбрать другой цвет...")
        custom_color_btn.setMaximumWidth(180)
        custom_color_btn.clicked.connect(self.choose_custom_color)
        color_layout.addWidget(custom_color_btn)
        
        color_group.setLayout(color_layout)
        layout.addWidget(color_group)
        
        # Чекбоксы
        options_group = QGroupBox("Опции")
        options_layout = QVBoxLayout()
        
        self.grid_checkbox = QCheckBox("Показывать сетку")
        self.grid_checkbox.setChecked(True)
        self.alternating_rows_checkbox = QCheckBox("Чередующиеся строки")
        self.alternating_rows_checkbox.setChecked(True)
        
        options_layout.addWidget(self.grid_checkbox)
        options_layout.addWidget(self.alternating_rows_checkbox)
        options_group.setLayout(options_layout)
        layout.addWidget(options_group)
        
        # Кнопка применить
        apply_btn = QPushButton("✓ Применить")
        apply_btn.setMaximumWidth(120)
        apply_btn.clicked.connect(self.apply_settings)
        layout.addWidget(apply_btn)
        
        layout.addStretch()
        outer_layout.addWidget(inner_widget)
        
        # Размер панели
        self.setFixedSize(320, 400)
    
    def on_color_selected(self, color_code: str):
        """Выбор цвета"""
        for btn in self.color_buttons:
            btn.setChecked(btn.color_code == color_code)
        self.selected_color = QColor(color_code)
    
    def choose_custom_color(self):
        """Выбрать пользовательский цвет"""
        color = QColorDialog.getColor(self.selected_color, self, "Выбрать цвет")
        if color.isValid():
            self.selected_color = color
            for btn in self.color_buttons:
                btn.setChecked(False)
    
    def apply_settings(self):
        """Применить настройки"""
        if self.system_theme_radio.isChecked():
            theme = "system"
        elif self.dark_theme_radio.isChecked():
            theme = "dark"
        else:
            theme = "light"
        
        settings = {
            "theme": theme,
            "color": self.selected_color,
            "show_grid": self.grid_checkbox.isChecked(),
            "alternating_rows": self.alternating_rows_checkbox.isChecked(),
        }
        self.settings_changed.emit(settings)
    
    def close_panel(self):
        """Закрыть панель"""
        self.closed.emit()
        self.hide()
