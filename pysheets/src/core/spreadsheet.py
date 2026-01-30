"""
Главное окно приложения PySheets
"""
import sys
import os
import json
import pandas as pd
import math
import re
from datetime import datetime, timedelta

from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QTableWidget, QTableWidgetItem,
    QToolBar, QStatusBar, QLabel, QLineEdit, QPushButton,
    QVBoxLayout, QWidget, QHBoxLayout, QFileDialog, QMessageBox,
    QDialog, QFormLayout, QComboBox, QDialogButtonBox, QAction,
    QHeaderView, QStyleFactory, QMenu, QInputDialog,
    QColorDialog, QFontDialog, QTabWidget, QTextEdit,
    QSplitter, QGroupBox, QCheckBox, QSpinBox, QDoubleSpinBox,
    QTabBar, QStyle, QStyleOptionTab, QMenuBar, QListWidget, QRadioButton
)
from PyQt5.QtCore import Qt, QSize, QTimer, QDate, QRect, QPoint
from PyQt5.QtGui import (
    QFont, QIcon, QPalette, QColor, QLinearGradient,
    QBrush, QPainter, QFontDatabase, QCursor, QKeySequence
)

from ..core.spreadsheet import Spreadsheet


class ModernToolBar(QToolBar):
    def __init__(self, parent=None):
        super().__init__(parent)


class ModernTableWidget(QTableWidget):
    def __init__(self, rows, cols, parent=None):
        super().__init__(rows, cols, parent)
        self.setAlternatingRowColors(True)

        self.horizontalHeader().setDefaultAlignment(Qt.AlignCenter)
        self.verticalHeader().setDefaultAlignment(Qt.AlignCenter)
        self.horizontalHeader().setMinimumSectionSize(60)

        self.setSelectionBehavior(QTableWidget.SelectItems)
        self.setSelectionMode(QTableWidget.ContiguousSelection)

        # Контекстное меню
        self.setContextMenuPolicy(Qt.CustomContextMenu)
        self.customContextMenuRequested.connect(self.show_context_menu)

    def show_context_menu(self, position):
        menu = QMenu()

        copy_action = menu.addAction("📋 Копировать")
        paste_action = menu.addAction("📝 Вставить")
        menu.addSeparator()

        format_action = menu.addAction("🎨 Форматирование")
        insert_row_action = menu.addAction("➕ Вставить строку выше")
        insert_col_action = menu.addAction("📊 Вставить столбец слева")
        menu.addSeparator()

        clear_action = menu.addAction("🧹 Очистить")
        sort_action = menu.addAction("🔢 Сортировать")

        action = menu.exec_(self.viewport().mapToGlobal(position))

        if action == copy_action:
            self.copy_selection()
        elif action == paste_action:
            self.paste_selection()
        elif action == clear_action:
            self.clear_selection()

    def copy_selection(self):
        """Копирует выделенные ячейки"""
        selected = self.selectedRanges()
        if not selected:
            return

        data = []
        for sel_range in selected:
            rows = []
            for row in range(sel_range.topRow(), sel_range.bottomRow() + 1):
                cols = []
                for col in range(sel_range.leftColumn(), sel_range.rightColumn() + 1):
                    item = self.item(row, col)
                    cols.append(item.text() if item else "")
                rows.append(cols)
            data.append(rows)

        # Сохраняем в системный буфер
        import pyperclip
        try:
            text = ""
            for sheet in data:
                for row in sheet:
                    text += "\t".join(row) + "\n"
                text += "\n"
            pyperclip.copy(text)
        except:
            # Если pyperclip не установлен, просто сохраняем во внутренний буфер
            if hasattr(self.parent(), 'clipboard_data'):
                self.parent().clipboard_data = data

    def paste_selection(self):
        """Вставляет данные из буфера"""
        # Эта функция будет обрабатываться в основном классе
        pass

    def clear_selection(self):
        """Очищает выделенные ячейки"""
        selected = self.selectedRanges()
        for sel_range in selected:
            for row in range(sel_range.topRow(), sel_range.bottomRow() + 1):
                for col in range(sel_range.leftColumn(), sel_range.rightColumn() + 1):
                    item = self.item(row, col)
                    if item:
                        item.setText("")


class SpreadsheetTab(QWidget):
    """Вкладка с таблицей и ее данными"""

    def __init__(self, tab_name="Новая таблица", parent=None):
        super().__init__(parent)
        self.tab_name = tab_name
        self.file_path = None
        self.modified = False

        # Используем наш Spreadsheet класс
        self.spreadsheet = Spreadsheet(100, 26)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)

        # Таблица
        self.table = ModernTableWidget(100, 26, self)
        self.table.setHorizontalHeaderLabels([chr(65 + i) for i in range(26)])
        self.table.setVerticalHeaderLabels([str(i + 1) for i in range(100)])

        # Настройка таблицы
        header = self.table.horizontalHeader()
        header.setSectionResizeMode(QHeaderView.Interactive)
        header.setDefaultSectionSize(100)

        # Заполняем начальными данными
        self.update_table_from_spreadsheet()

        layout.addWidget(self.table)

        # Подключаем сигналы
        self.table.cellChanged.connect(self.on_cell_changed)

    def on_cell_changed(self, row, col):
        """Обработчик изменения ячейки"""
        item = self.table.item(row, col)
        if item:
            text = item.text()

            # Если это формула
            if text.startswith('='):
                self.spreadsheet.set_cell(row, col, None, text)
                try:
                    # Получаем вычисленное значение
                    cell = self.spreadsheet.get_cell(row, col)
                    result = cell.value
                    item.setText(str(result))

                    # Форматирование для формул
                    item.setForeground(QColor("#0066CC"))
                    font = item.font()
                    font.setBold(True)
                    item.setFont(font)
                except Exception as e:
                    item.setText("#ERROR!")
                    item.setForeground(QColor("#FF0000"))
            else:
                # Простое значение
                self.spreadsheet.set_cell(row, col, text)

                # Автоматическое определение типа
                try:
                    # Пробуем преобразовать в число
                    num = float(text.replace(',', '.'))
                    item.setTextAlignment(Qt.AlignRight | Qt.AlignVCenter)
                    item.setText(f"{num:,.2f}")
                    item.setForeground(QColor("#000000"))
                    font = item.font()
                    font.setBold(False)
                    item.setFont(font)
                except ValueError:
                    item.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter)
                    item.setForeground(QColor("#000000"))
                    font = item.font()
                    font.setBold(False)
                    item.setFont(font)

            self.modified = True

    def update_table_from_spreadsheet(self):
        """Обновляет таблицу из объекта spreadsheet"""
        rows, cols = self.spreadsheet.get_dimensions()

        self.table.setRowCount(max(rows, 100))
        self.table.setColumnCount(max(cols, 26))

        # Устанавливаем заголовки
        col_labels = [chr(65 + i) if i < 26 else f"A{chr(65 + i - 26)}" for i in range(max(cols, 26))]
        self.table.setHorizontalHeaderLabels(col_labels)

        row_labels = [str(i + 1) for i in range(max(rows, 100))]
        self.table.setVerticalHeaderLabels(row_labels)

        # Заполняем данные
        for row in range(rows):
            for col in range(cols):
                cell = self.spreadsheet.get_cell(row, col)
                if cell.value or cell.formula:
                    item = self.table.item(row, col)
                    if not item:
                        item = QTableWidgetItem()
                        self.table.setItem(row, col, item)

                    if cell.formula:
                        item.setText(f"={cell.formula}")
                        item.setForeground(QColor("#0066CC"))
                        font = item.font()
                        font.setBold(True)
                        item.setFont(font)
                    else:
                        item.setText(str(cell.value))

                        # Форматирование чисел
                        if cell.cell_type.name == "NUMBER":
                            item.setTextAlignment(Qt.AlignRight | Qt.AlignVCenter)
                        else:
                            item.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter)

    def get_table(self):
        return self.table

    def get_data(self):
        """Получает данные в виде списка списков"""
        return self.spreadsheet.to_list()

    def set_data(self, data):
        """Устанавливает данные из списка списков"""
        self.spreadsheet.from_list(data)
        self.update_table_from_spreadsheet()

    def set_modified(self, modified):
        self.modified = modified
        name = self.tab_name
        if modified:
            name += " *"
        return name

    def save_data(self):
        """Сохраняет данные из таблицы в spreadsheet"""
        # Данные уже сохранены через on_cell_changed
        pass


class ThemeSettingsDialog(QDialog):
    """Диалог настроек темы"""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Настройки темы")
        self.setFixedSize(500, 400)

        layout = QVBoxLayout(self)

        # Выбор цветовой схемы
        theme_group = QGroupBox("Цветовая схема")
        theme_layout = QVBoxLayout()

        self.light_theme_radio = QRadioButton("🌞 Светлая тема")
        self.light_theme_radio.setChecked(True)
        self.dark_theme_radio = QRadioButton("🌚 Темная тема")
        self.system_theme_radio = QRadioButton("⚙️ Системная тема")

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
                    border-radius: 3px;
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
            self.color_buttons.append(btn)
            colors_layout.addWidget(btn)

        color_layout.addLayout(colors_layout)

        # Пользовательский цвет
        custom_layout = QHBoxLayout()
        self.custom_color_btn = QPushButton("🎨 Пользовательский цвет")
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
            QDialogButtonBox.Ok | QDialogButtonBox.Cancel | QDialogButtonBox.Apply
        )
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        apply_btn = buttons.button(QDialogButtonBox.Apply)
        apply_btn.clicked.connect(self.apply_settings)

        # Добавляем все в основной layout
        layout.addWidget(theme_group)
        layout.addWidget(color_group)
        layout.addWidget(settings_group)
        layout.addWidget(buttons)

        # Устанавливаем первый цвет как выбранный
        if self.color_buttons:
            self.color_buttons[0].setChecked(True)
            self.selected_color = QColor(colors[0][0])

    def choose_custom_color(self):
        color = QColorDialog.getColor(self.selected_color, self, "Выберите цвет")
        if color.isValid():
            self.selected_color = color
            self.color_preview.setStyleSheet(f"background-color: {color.name()}; border: 1px solid #ccc;")
            # Снимаем выбор с пресетов
            for btn in self.color_buttons:
                btn.setChecked(False)

    def apply_settings(self):
        self.accept()

    def get_settings(self):
        # Определяем выбранную тему
        if self.light_theme_radio.isChecked():
            theme = "light"
        elif self.dark_theme_radio.isChecked():
            theme = "dark"
        else:
            theme = "system"

        # Определяем выбранный цвет
        color = self.selected_color
        for btn in self.color_buttons:
            if btn.isChecked():
                color = QColor(btn.color_code)
                break

        return {
            'theme': theme,
            'color': color,
            'show_grid': self.grid_checkbox.isChecked(),
            'alternating_rows': self.alternating_rows_checkbox.isChecked()
        }


class SpreadsheetApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("PySheets - Smart Table Editor")
        self.setGeometry(100, 50, 1400, 850)

        # Настройки темы
        self.current_theme = "light"
        self.app_theme_color = QColor("#DC143C")

        # Загрузка сохраненных настроек темы
        self.load_theme_settings()

        # Масштаб
        self.zoom_level = 100

        # Данные и состояние
        self.tabs = QTabWidget()
        self.tabs.setTabsClosable(True)
        self.tabs.tabCloseRequested.connect(self.close_tab)
        self.tabs.currentChanged.connect(self.tab_changed)

        self.current_tab_index = 0
        self.clipboard_data = []

        # Применяем тему ДО создания UI
        self.apply_theme()

        self.init_ui()

    def load_theme_settings(self):
        """Загружает сохраненные настройки темы"""
        try:
            config_file = "pysheets_config.json"
            if os.path.exists(config_file):
                with open(config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    theme_settings = config.get('theme', {})
                    self.current_theme = theme_settings.get('name', 'light')

                    color_str = theme_settings.get('color', '#DC143C')
                    self.app_theme_color = QColor(color_str)
        except:
            pass

    def save_theme_settings(self):
        """Сохраняет настройки темы"""
        try:
            config = {
                'theme': {
                    'name': self.current_theme,
                    'color': self.app_theme_color.name()
                }
            }
            with open("pysheets_config.json", 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
        except:
            pass

    def apply_theme(self):
        """Применяет текущую тему"""
        palette = QPalette()
        accent_color = self.app_theme_color

        if self.current_theme == "light":
            # Светлая тема
            palette.setColor(QPalette.Window, QColor(248, 249, 250))
            palette.setColor(QPalette.WindowText, QColor(32, 33, 36))
            palette.setColor(QPalette.Base, QColor(255, 255, 255))
            palette.setColor(QPalette.AlternateBase, QColor(248, 249, 250))
            palette.setColor(QPalette.ToolTipBase, QColor(255, 255, 255))
            palette.setColor(QPalette.ToolTipText, QColor(32, 33, 36))
            palette.setColor(QPalette.Text, QColor(32, 33, 36))
            palette.setColor(QPalette.Button, QColor(248, 249, 250))
            palette.setColor(QPalette.ButtonText, QColor(32, 33, 36))
            palette.setColor(QPalette.BrightText, Qt.red)
            palette.setColor(QPalette.Link, accent_color)
            palette.setColor(QPalette.Highlight, accent_color)
            palette.setColor(QPalette.HighlightedText, Qt.white)
        else:  # Темная тема
            # Темная тема
            palette.setColor(QPalette.Window, QColor(32, 33, 36))
            palette.setColor(QPalette.WindowText, QColor(232, 234, 237))
            palette.setColor(QPalette.Base, QColor(32, 33, 36))
            palette.setColor(QPalette.AlternateBase, QColor(45, 46, 48))
            palette.setColor(QPalette.ToolTipBase, Qt.black)
            palette.setColor(QPalette.ToolTipText, QColor(232, 234, 237))
            palette.setColor(QPalette.Text, QColor(232, 234, 237))
            palette.setColor(QPalette.Button, QColor(45, 46, 48))
            palette.setColor(QPalette.ButtonText, QColor(232, 234, 237))
            palette.setColor(QPalette.BrightText, Qt.red)
            palette.setColor(QPalette.Link, accent_color.lighter(150))
            palette.setColor(QPalette.Highlight, accent_color)
            palette.setColor(QPalette.HighlightedText, Qt.black)

        self.setPalette(palette)
        self.update_stylesheet()
        self.save_theme_settings()

    def update_stylesheet(self):
        """Обновляет таблицу стилей"""
        accent_color = self.app_theme_color.name()
        accent_light = self.app_theme_color.lighter(150).name()
        accent_dark = self.app_theme_color.darker(150).name()
        accent_hover = self.app_theme_color.lighter(120).name()

        if self.current_theme == "light":
            stylesheet = f"""
                /* Основные стили */
                QMainWindow {{
                    background-color: #f8f9fa;
                }}
                QWidget {{
                    color: #202124;
                    font-family: 'Segoe UI', Arial, sans-serif;
                    font-size: 11px;
                }}
                /* Таблица */
                QTableWidget {{
                    background-color: white;
                    alternate-background-color: #f8f9fa;
                    gridline-color: #e0e0e0;
                    selection-background-color: {accent_light};
                    selection-color: #202124;
                }}
                QTableWidget::item {{
                    padding: 2px 4px;
                }}
                QHeaderView::section {{
                    background-color: #f8f9fa;
                    color: #5f6368;
                    padding: 4px 8px;
                    font-weight: 500;
                }}
                /* Кнопки с акцентом */
                QPushButton[accent="true"] {{
                    background-color: {accent_color};
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 6px 12px;
                    font-weight: bold;
                }}
                QPushButton[accent="true"]:hover {{
                    background-color: {accent_hover};
                }}
            """
        else:
            stylesheet = f"""
                /* Основные стили */
                QMainWindow {{
                    background-color: #202124;
                }}
                QWidget {{
                    color: #e8eaed;
                    font-family: 'Segoe UI', Arial, sans-serif;
                    font-size: 11px;
                    background-color: #202124;
                }}
                /* Таблица */
                QTableWidget {{
                    background-color: #202124;
                    alternate-background-color: #2d2e30;
                    gridline-color: #3c4043;
                    selection-background-color: {accent_dark};
                    selection-color: #e8eaed;
                }}
                QTableWidget::item {{
                    padding: 2px 4px;
                }}
                QHeaderView::section {{
                    background-color: #2d2e30;
                    color: #9aa0a6;
                    padding: 4px 8px;
                    font-weight: 500;
                }}
                /* Кнопки с акцентом */
                QPushButton[accent="true"] {{
                    background-color: {accent_color};
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 6px 12px;
                    font-weight: bold;
                }}
                QPushButton[accent="true"]:hover {{
                    background-color: {accent_hover};
                }}
            """

        self.setStyleSheet(stylesheet)

    def init_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)

        main_layout = QVBoxLayout()
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        central_widget.setLayout(main_layout)

        # Меню бар
        self.create_menu_bar()
        main_layout.addWidget(self.menu_bar)

        # Верхняя панель инструментов
        self.create_main_toolbar()
        main_layout.addWidget(self.main_toolbar)

        # Панель форматирования
        self.create_format_toolbar()
        main_layout.addWidget(self.format_toolbar)

        # Панель адреса и формул
        self.create_formula_bar()
        main_layout.addWidget(self.formula_bar)

        # Вкладки
        main_layout.addWidget(self.tabs)

        # Создаем первую вкладку
        self.add_new_tab()

        # Строка состояния
        self.create_status_bar()

        # Горячие клавиши
        self.setup_shortcuts()

        # Таймер автосохранения
        self.setup_autosave()

    def create_menu_bar(self):
        self.menu_bar = QMenuBar()

        # Меню Файл
        file_menu = self.menu_bar.addMenu("📁 Файл")
        file_menu.addAction("Новый", self.new_file, "Ctrl+N")
        file_menu.addAction("Новая вкладка", self.add_new_tab, "Ctrl+T")
        file_menu.addAction("Открыть...", self.open_file_dialog, "Ctrl+O")
        file_menu.addAction("Сохранить", self.save_current_tab, "Ctrl+S")
        file_menu.addAction("Сохранить как...", self.save_as_current_tab, "Ctrl+Shift+S")
        file_menu.addSeparator()

        export_menu = file_menu.addMenu("Экспорт")
        export_menu.addAction("Экспорт в Excel (.xlsx)", self.export_to_excel)
        export_menu.addAction("Экспорт в CSV", self.export_to_csv)
        export_menu.addAction("Экспорт в HTML", self.export_to_html)

        file_menu.addSeparator()
        file_menu.addAction("Настройки темы...", self.show_theme_settings)
        file_menu.addSeparator()
        file_menu.addAction("Выход", self.close, "Alt+F4")

        # Меню Правка
        edit_menu = self.menu_bar.addMenu("✏️ Правка")
        edit_menu.addAction("Копировать", self.copy_selection, "Ctrl+C")
        edit_menu.addAction("Вставить", self.paste_selection, "Ctrl+V")
        edit_menu.addAction("Вырезать", self.cut_selection, "Ctrl+X")
        edit_menu.addSeparator()
        edit_menu.addAction("Найти...", self.find_dialog, "Ctrl+F")
        edit_menu.addAction("Заменить...", self.replace_dialog, "Ctrl+H")

        # Меню Вид
        view_menu = self.menu_bar.addMenu("👁️ Вид")
        view_menu.addAction("Увеличить", self.zoom_in, "Ctrl++")
        view_menu.addAction("Уменьшить", self.zoom_out, "Ctrl+-")
        view_menu.addAction("Сбросить масштаб", self.zoom_reset, "Ctrl+0")

        theme_menu = view_menu.addMenu("Тема оформления")
        light_theme_action = theme_menu.addAction("Светлая тема")
        light_theme_action.triggered.connect(lambda: self.switch_theme("light"))
        dark_theme_action = theme_menu.addAction("Темная тема")
        dark_theme_action.triggered.connect(lambda: self.switch_theme("dark"))

    def create_main_toolbar(self):
        self.main_toolbar = ModernToolBar()
        self.main_toolbar.setIconSize(QSize(20, 20))

        actions = [
            ("📄", "Новый", self.new_file, "Ctrl+N", True),
            ("➕", "Новая вкладка", self.add_new_tab, "Ctrl+T", True),
            ("📂", "Открыть", self.open_file_dialog, "Ctrl+O", True),
            ("💾", "Сохранить", self.save_current_tab, "Ctrl+S", True),
        ]

        for icon, text, slot, shortcut, accent in actions:
            btn = QPushButton(icon + " " + text)
            if shortcut:
                btn.setShortcut(shortcut)
            btn.clicked.connect(slot)
            if accent:
                btn.setProperty("accent", "true")
            self.main_toolbar.addWidget(btn)

        self.main_toolbar.addSeparator()

        # Кнопки масштаба
        zoom_out_btn = QPushButton("🔍-")
        zoom_out_btn.setToolTip("Уменьшить масштаб (Ctrl+-)")
        zoom_out_btn.clicked.connect(self.zoom_out)
        zoom_out_btn.setFixedSize(30, 24)

        self.zoom_combo = QComboBox()
        self.zoom_combo.addItems(["50%", "75%", "100%", "125%", "150%", "200%"])
        self.zoom_combo.setCurrentText("100%")
        self.zoom_combo.currentTextChanged.connect(self.zoom_combo_changed)
        self.zoom_combo.setFixedWidth(80)

        zoom_in_btn = QPushButton("🔍+")
        zoom_in_btn.setToolTip("Увеличить масштаб (Ctrl++)")
        zoom_in_btn.clicked.connect(self.zoom_in)
        zoom_in_btn.setFixedSize(30, 24)

        self.main_toolbar.addWidget(QLabel("Масштаб:"))
        self.main_toolbar.addWidget(zoom_out_btn)
        self.main_toolbar.addWidget(self.zoom_combo)
        self.main_toolbar.addWidget(zoom_in_btn)

    def create_format_toolbar(self):
        self.format_toolbar = ModernToolBar()
        self.format_toolbar.setIconSize(QSize(18, 18))

        # Шрифт
        self.font_combo = QComboBox()
        self.font_combo.addItems(["Arial", "Calibri", "Times New Roman", "Verdana", "Segoe UI"])
        self.font_combo.setCurrentText("Arial")
        self.font_combo.currentTextChanged.connect(self.apply_font)
        self.font_combo.setFixedWidth(120)
        self.format_toolbar.addWidget(QLabel("Шрифт:"))
        self.format_toolbar.addWidget(self.font_combo)

        # Размер шрифта
        self.font_size_combo = QComboBox()
        self.font_size_combo.addItems(["8", "9", "10", "11", "12", "14", "16", "18", "20", "24"])
        self.font_size_combo.setCurrentText("11")
        self.font_size_combo.currentTextChanged.connect(self.apply_font_size)
        self.font_size_combo.setFixedWidth(60)
        self.format_toolbar.addWidget(QLabel("Размер:"))
        self.format_toolbar.addWidget(self.font_size_combo)

        self.format_toolbar.addSeparator()

        # Кнопки форматирования
        format_buttons = [
            ("B", "Жирный", self.toggle_bold, "Ctrl+B"),
            ("I", "Курсив", self.toggle_italic, "Ctrl+I"),
            ("U", "Подчеркнутый", self.toggle_underline, "Ctrl+U"),
        ]

        for text, tooltip, slot, shortcut in format_buttons:
            btn = QPushButton(text)
            btn.setToolTip(tooltip)
            if shortcut:
                btn.setShortcut(shortcut)
            btn.clicked.connect(slot)
            btn.setFixedSize(30, 24)
            btn.setCheckable(True)
            self.format_toolbar.addWidget(btn)

    def create_formula_bar(self):
        self.formula_bar = QWidget()
        layout = QHBoxLayout(self.formula_bar)
        layout.setContentsMargins(10, 5, 10, 5)

        # Поле адреса ячейки
        self.cell_address = QLineEdit()
        self.cell_address.setReadOnly(True)
        self.cell_address.setFixedWidth(80)

        # Поле ввода формулы
        self.formula_edit = QLineEdit()
        self.formula_edit.setPlaceholderText("Введите формулу или значение...")
        self.formula_edit.returnPressed.connect(self.apply_formula)

        layout.addWidget(QLabel("Ячейка:"))
        layout.addWidget(self.cell_address)
        layout.addWidget(QLabel("fx:"))
        layout.addWidget(self.formula_edit)

    def create_status_bar(self):
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)

        # Элементы статус бара
        self.sheet_label = QLabel("Лист1")
        self.selection_label = QLabel("")
        self.calc_label = QLabel("Готов")
        self.zoom_label = QLabel(f"{self.zoom_level}%")

        self.status_bar.addPermanentWidget(self.sheet_label)
        self.status_bar.addPermanentWidget(self.selection_label, 1)
        self.status_bar.addPermanentWidget(self.calc_label)
        self.status_bar.addPermanentWidget(self.zoom_label)

        self.update_status("Готов")

    def setup_shortcuts(self):
        shortcuts = [
            (QKeySequence("Ctrl+N"), self.new_file),
            (QKeySequence("Ctrl+T"), self.add_new_tab),
            (QKeySequence("Ctrl+O"), self.open_file_dialog),
            (QKeySequence("Ctrl+S"), self.save_current_tab),
            (QKeySequence("Ctrl+Shift+S"), self.save_as_current_tab),
            (QKeySequence("Ctrl+X"), self.cut_selection),
            (QKeySequence("Ctrl+C"), self.copy_selection),
            (QKeySequence("Ctrl+V"), self.paste_selection),
            (QKeySequence("Ctrl+F"), self.find_dialog),
            (QKeySequence("Ctrl+H"), self.replace_dialog),
            (QKeySequence("Ctrl+B"), self.toggle_bold),
            (QKeySequence("Ctrl+I"), self.toggle_italic),
            (QKeySequence("Ctrl+U"), self.toggle_underline),
            (QKeySequence("Ctrl++"), self.zoom_in),
            (QKeySequence("Ctrl+-"), self.zoom_out),
            (QKeySequence("Ctrl+0"), self.zoom_reset),
        ]

        for key, slot in shortcuts:
            action = QAction(self)
            action.setShortcut(key)
            action.triggered.connect(slot)
            self.addAction(action)

    def setup_autosave(self):
        self.autosave_timer = QTimer()
        self.autosave_timer.timeout.connect(self.autosave)
        self.autosave_timer.start(300000)

    def show_theme_settings(self):
        dialog = ThemeSettingsDialog(self)
        if dialog.exec_() == QDialog.Accepted:
            settings = dialog.get_settings()
            self.current_theme = settings['theme']
            self.app_theme_color = settings['color']
            self.apply_theme()
            self.update_status("Настройки темы применены")

    def switch_theme(self, theme_name):
        self.current_theme = theme_name
        self.apply_theme()
        self.update_status(f"Тема изменена на: {theme_name}")

    def add_new_tab(self, file_path=None, tab_name=None):
        if tab_name is None:
            tab_count = self.tabs.count()
            tab_name = f"Таблица {tab_count + 1}"

        tab = SpreadsheetTab(tab_name)
        if file_path:
            tab.file_path = file_path
            tab.tab_name = os.path.basename(file_path)

        index = self.tabs.addTab(tab, tab.tab_name)
        self.tabs.setCurrentIndex(index)

        # Подключаем сигналы
        table = tab.get_table()
        table.cellClicked.connect(lambda row, col: self.cell_focused(row, col, tab))

        self.update_status(f"Создана новая вкладка: {tab_name}")
        return tab

    def get_current_tab(self):
        current_index = self.tabs.currentIndex()
        if current_index >= 0:
            return self.tabs.widget(current_index)
        return None

    def tab_changed(self, index):
        if index >= 0:
            tab = self.tabs.widget(index)
            if tab:
                name = tab.tab_name
                if tab.modified:
                    name += " *"
                self.sheet_label.setText(name)
                self.update_status(f"Переключено на: {tab.tab_name}")

    def close_tab(self, index):
        tab = self.tabs.widget(index)
        if tab.modified:
            reply = QMessageBox.question(
                self, "Закрыть вкладку",
                f"Вкладка '{tab.tab_name}' имеет несохраненные изменения. Сохранить?",
                QMessageBox.Save | QMessageBox.Discard | QMessageBox.Cancel
            )

            if reply == QMessageBox.Save:
                self.save_tab(tab)
            elif reply == QMessageBox.Cancel:
                return

        self.tabs.removeTab(index)

        if self.tabs.count() == 0:
            self.add_new_tab()

        self.update_status(f"Вкладка закрыта")

    def new_file(self):
        self.add_new_tab()

    def open_file_dialog(self):
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Открыть файл", "",
            "Таблицы (*.csv *.xlsx *.xls);;Все файлы (*.*)"
        )
        if file_path:
            self.load_file(file_path)

    def load_file(self, file_path):
        try:
            ext = os.path.splitext(file_path)[1].lower()
            if ext == '.csv':
                df = pd.read_csv(file_path, header=None, dtype=str, encoding='utf-8')
            elif ext in ['.xlsx', '.xls']:
                df = pd.read_excel(file_path, header=None, dtype=str)
            else:
                with open(file_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                data = [line.strip().split('\t') for line in lines]
                df = pd.DataFrame(data)

            data = df.fillna('').values.tolist()
            tab = self.add_new_tab(file_path)
            tab.set_data(data)
            tab.modified = False
            index = self.tabs.indexOf(tab)
            if index >= 0:
                self.tabs.setTabText(index, tab.tab_name)

            filename = os.path.basename(file_path)
            self.update_status(f"Файл '{filename}' загружен")

        except Exception as ex:
            QMessageBox.critical(self, "Ошибка", f"Не удалось загрузить файл:\n{str(ex)}")

    def save_current_tab(self):
        tab = self.get_current_tab()
        if tab:
            self.save_tab(tab)

    def save_as_current_tab(self):
        tab = self.get_current_tab()
        if tab:
            self.save_tab_as(tab)

    def save_tab(self, tab):
        if tab.file_path:
            self.save_file(tab.file_path, tab)
        else:
            self.save_tab_as(tab)

    def save_tab_as(self, tab):
        file_path, _ = QFileDialog.getSaveFileName(
            self, "Сохранить как", tab.tab_name + ".csv",
            "CSV файлы (*.csv);;Excel файлы (*.xlsx);;Все файлы (*.*)"
        )
        if file_path:
            if not os.path.splitext(file_path)[1]:
                file_path += '.csv'
            self.save_file(file_path, tab)
            tab.file_path = file_path
            tab.tab_name = os.path.basename(file_path)
            index = self.tabs.indexOf(tab)
            if index >= 0:
                self.tabs.setTabText(index, tab.tab_name)

    def save_file(self, file_path, tab):
        try:
            tab.save_data()
            data = tab.get_data()

            # Определяем максимальные размеры
            max_rows = len(data)
            max_cols = max((len(row) for row in data), default=0)

            # Нормализуем строки
            for i in range(len(data)):
                if len(data[i]) < max_cols:
                    data[i].extend([''] * (max_cols - len(data[i])))

            df = pd.DataFrame(data)
            ext = os.path.splitext(file_path)[1].lower()

            if ext == '.csv':
                df.to_csv(file_path, index=False, header=False, encoding='utf-8-sig')
            elif ext == '.xlsx':
                with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
                    df.to_excel(writer, sheet_name='Лист1', index=False, header=False)

                    workbook = writer.book
                    worksheet = writer.sheets['Лист1']

                    for col_idx in range(max_cols):
                        column_letter = chr(65 + col_idx) if col_idx < 26 else f"A{chr(65 + col_idx - 26)}"
                        max_length = 0
                        for row_idx in range(len(data)):
                            cell_value = str(df.iloc[row_idx, col_idx]) if col_idx < len(df.iloc[row_idx]) else ""
                            if cell_value:
                                max_length = max(max_length, len(cell_value))

                        adjusted_width = min(max(max_length + 2, 8.43), 50)
                        worksheet.column_dimensions[column_letter].width = adjusted_width
            else:
                df.to_csv(file_path, sep='\t', index=False, header=False, encoding='utf-8')

            tab.modified = False
            index = self.tabs.indexOf(tab)
            if index >= 0:
                self.tabs.setTabText(index, tab.tab_name)

            self.update_status(f"Файл сохранен: {os.path.basename(file_path)}")

        except Exception as ex:
            QMessageBox.critical(self, "Ошибка", f"Не удалось сохранить файл:\n{str(ex)}")

    def export_to_excel(self):
        tab = self.get_current_tab()
        if not tab:
            QMessageBox.warning(self, "Экспорт", "Нет активной таблицы для экспорта")
            return

        file_path, _ = QFileDialog.getSaveFileName(
            self, "Экспорт в Excel",
            f"{tab.tab_name}.xlsx" if tab.tab_name else "таблица.xlsx",
            "Excel файлы (*.xlsx);;Все файлы (*.*)"
        )

        if not file_path:
            return

        try:
            if not file_path.lower().endswith('.xlsx'):
                file_path += '.xlsx'

            tab.save_data()
            data = tab.get_data()

            max_rows = len(data)
            max_cols = max((len(row) for row in data), default=0)

            df_data = []
            for i, row in enumerate(data):
                padded_row = row + [''] * (max_cols - len(row))
                df_data.append(padded_row)

            df = pd.DataFrame(df_data)

            with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Лист1', index=False, header=False)

                workbook = writer.book
                worksheet = writer.sheets['Лист1']

                for col_idx in range(max_cols):
                    column_letter = chr(65 + col_idx) if col_idx < 26 else f"A{chr(65 + col_idx - 26)}"
                    max_length = 0
                    for row_idx in range(max_rows):
                        cell_value = str(df.iloc[row_idx, col_idx]) if col_idx < len(df.iloc[row_idx]) else ""
                        if cell_value:
                            max_length = max(max_length, len(cell_value))

                    adjusted_width = min(max(max_length + 2, 8.43), 50)
                    worksheet.column_dimensions[column_letter].width = adjusted_width

            self.update_status(f"Таблица экспортирована в Excel: {os.path.basename(file_path)}")
            QMessageBox.information(self, "Экспорт успешен",
                                    f"Таблица успешно экспортирована в:\n{file_path}")

        except Exception as e:
            QMessageBox.critical(self, "Ошибка экспорта",
                                 f"Не удалось экспортировать таблицу:\n{str(e)}")

    def export_to_csv(self):
        tab = self.get_current_tab()
        if not tab:
            QMessageBox.warning(self, "Экспорт", "Нет активной таблицы для экспорта")
            return

        file_path, _ = QFileDialog.getSaveFileName(
            self, "Экспорт в CSV",
            f"{tab.tab_name}.csv" if tab.tab_name else "таблица.csv",
            "CSV файлы (*.csv);;Все файлы (*.*)"
        )

        if not file_path:
            return

        try:
            tab.save_data()
            data = tab.get_data()

            max_cols = max((len(row) for row in data), default=0)

            for i in range(len(data)):
                if len(data[i]) < max_cols:
                    data[i].extend([''] * (max_cols - len(data[i])))

            df = pd.DataFrame(data)
            df.to_csv(file_path, index=False, header=False, encoding='utf-8-sig')

            self.update_status(f"Таблица экспортирована в CSV: {os.path.basename(file_path)}")
            QMessageBox.information(self, "Экспорт успешен",
                                    f"Таблица успешно экспортирована в:\n{file_path}")

        except Exception as e:
            QMessageBox.critical(self, "Ошибка экспорта",
                                 f"Не удалось экспортировать таблицу:\n{str(e)}")

    def export_to_html(self):
        tab = self.get_current_tab()
        if not tab:
            QMessageBox.warning(self, "Экспорт", "Нет активной таблицы для экспорта")
            return

        file_path, _ = QFileDialog.getSaveFileName(
            self, "Экспорт в HTML",
            f"{tab.tab_name}.html" if tab.tab_name else "таблица.html",
            "HTML файлы (*.html *.htm);;Все файлы (*.*)"
        )

        if not file_path:
            return

        try:
            tab.save_data()
            data = tab.get_data()

            html = """<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Экспорт таблицы</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
    </style>
</head>
<body>
    <h1>Экспорт таблицы</h1>
    <table>
"""

            # Определяем максимальное количество столбцов
            max_cols = max((len(row) for row in data), default=0)

            # Добавляем данные
            for row_idx, row in enumerate(data):
                html += "        <tr>\n"
                for col_idx in range(max_cols):
                    cell = row[col_idx] if col_idx < len(row) else ""
                    cell_text = str(cell).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                    html += f"            <td>{cell_text}</td>\n"
                html += "        </tr>\n"

            html += """    </table>
    <p>Экспортировано: """ + datetime.now().strftime("%Y-%m-%d %H:%M:%S") + """</p>
</body>
</html>"""

            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(html)

            self.update_status(f"Таблица экспортирована в HTML: {os.path.basename(file_path)}")
            QMessageBox.information(self, "Экспорт успешен",
                                    f"Таблица успешно экспортирована в HTML.\n\nФайл: {file_path}")

        except Exception as e:
            QMessageBox.critical(self, "Ошибка экспорта",
                                 f"Не удалось экспортировать таблицу:\n{str(e)}")

    def cell_focused(self, row, col, tab):
        cell_ref = f"{chr(65 + col)}{row + 1}"
        self.cell_address.setText(cell_ref)

        table = tab.get_table()
        item = table.item(row, col)
        if item:
            value = item.text()
            self.formula_edit.setText(value)

    def apply_formula(self):
        formula = self.formula_edit.text().strip()
        if not formula:
            return

        tab = self.get_current_tab()
        if not tab:
            return

        table = tab.get_table()
        selected = table.selectedIndexes()
        if not selected:
            return

        row = selected[0].row()
        col = selected[0].column()

        item = table.item(row, col)
        if not item:
            item = QTableWidgetItem()
            table.setItem(row, col, item)

        item.setText(formula)
        # Изменение ячейки обработается в tab.on_cell_changed

        tab.modified = True
        index = self.tabs.indexOf(tab)
        if index >= 0:
            self.tabs.setTabText(index, tab.set_modified(True))

    def apply_font(self):
        font_name = self.font_combo.currentText()
        self.apply_format_to_selection(lambda item: item.setFont(QFont(font_name)))

    def apply_font_size(self):
        font_size = int(self.font_size_combo.currentText())
        self.apply_format_to_selection(lambda item:
                                       item.setFont(QFont(item.font().family(), font_size)))

    def toggle_bold(self):
        self.apply_format_to_selection(lambda item:
                                       item.setFont(QFont(item.font().family(), item.font().pointSize(),
                                                          QFont.Bold if item.font().weight() != QFont.Bold else QFont.Normal)))

    def toggle_italic(self):
        self.apply_format_to_selection(lambda item:
                                       item.setFont(QFont(item.font().family(), item.font().pointSize(),
                                                          item.font().weight(), not item.font().italic())))

    def toggle_underline(self):
        self.apply_format_to_selection(lambda item:
                                       item.setFont(QFont(item.font().family(), item.font().pointSize(),
                                                          item.font().weight(), item.font().italic(),
                                                          not item.font().underline())))

    def apply_format_to_selection(self, format_func):
        tab = self.get_current_tab()
        if not tab:
            return

        table = tab.get_table()
        selection = table.selectedRanges()
        for sel_range in selection:
            for row in range(sel_range.topRow(), sel_range.bottomRow() + 1):
                for col in range(sel_range.leftColumn(), sel_range.rightColumn() + 1):
                    item = table.item(row, col)
                    if not item:
                        item = QTableWidgetItem()
                        table.setItem(row, col, item)
                    format_func(item)

    def zoom_in(self):
        if self.zoom_level < 200:
            self.zoom_level = min(self.zoom_level + 10, 200)
            self.apply_zoom()
            self.update_status(f"Масштаб: {self.zoom_level}%")

    def zoom_out(self):
        if self.zoom_level > 50:
            self.zoom_level = max(self.zoom_level - 10, 50)
            self.apply_zoom()
            self.update_status(f"Масштаб: {self.zoom_level}%")

    def zoom_reset(self):
        self.zoom_level = 100
        self.apply_zoom()
        self.update_status("Масштаб сброшен до 100%")

    def zoom_combo_changed(self, text):
        if text.endswith('%'):
            try:
                self.zoom_level = int(text[:-1])
                self.apply_zoom()
            except:
                pass

    def apply_zoom(self):
        self.zoom_combo.setCurrentText(f"{self.zoom_level}%")
        self.zoom_label.setText(f"{self.zoom_level}%")

        for i in range(self.tabs.count()):
            tab = self.tabs.widget(i)
            if tab:
                table = tab.get_table()
                font = table.font()
                base_size = 11
                new_size = base_size * self.zoom_level / 100
                font.setPointSizeF(new_size)
                table.setFont(font)
                table.verticalHeader().setDefaultSectionSize(int(25 * self.zoom_level / 100))

    def update_status(self, message):
        if hasattr(self, 'status_bar') and self.status_bar is not None:
            self.status_bar.showMessage(message, 3000)

        if hasattr(self, 'calc_label') and self.calc_label is not None:
            self.calc_label.setText(message.split('|')[0].strip() if '|' in message else message)

    def find_dialog(self):
        text, ok = QInputDialog.getText(self, "Найти", "Введите текст для поиска:")
        if ok and text:
            self.find_text(text)

    def replace_dialog(self):
        dialog = QDialog(self)
        dialog.setWindowTitle("Найти и заменить")
        dialog.setFixedSize(400, 150)

        layout = QFormLayout(dialog)

        find_edit = QLineEdit()
        replace_edit = QLineEdit()

        layout.addRow("Найти:", find_edit)
        layout.addRow("Заменить на:", replace_edit)

        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(dialog.accept)
        buttons.rejected.connect(dialog.reject)

        layout.addRow(buttons)

        if dialog.exec_() == QDialog.Accepted:
            self.replace_text(find_edit.text(), replace_edit.text())

    def find_text(self, text):
        tab = self.get_current_tab()
        if not tab:
            return

        table = tab.get_table()
        for row in range(table.rowCount()):
            for col in range(table.columnCount()):
                item = table.item(row, col)
                if item and text.lower() in item.text().lower():
                    table.setCurrentCell(row, col)
                    self.update_status(f"Найдено в ячейке {chr(65 + col)}{row + 1}")
                    return

        self.update_status("Текст не найден")

    def replace_text(self, find_text, replace_text):
        tab = self.get_current_tab()
        if not tab:
            return

        count = 0
        table = tab.get_table()
        for row in range(table.rowCount()):
            for col in range(table.columnCount()):
                item = table.item(row, col)
                if item and find_text in item.text():
                    item.setText(item.text().replace(find_text, replace_text))
                    count += 1

        if count > 0:
            tab.modified = True
            index = self.tabs.indexOf(tab)
            if index >= 0:
                self.tabs.setTabText(index, tab.set_modified(True))
            self.update_status(f"Заменено {count} вхождений")

    def copy_selection(self):
        tab = self.get_current_tab()
        if not tab:
            return

        table = tab.get_table()
        selection = table.selectedRanges()
        if not selection:
            return

        self.clipboard_data = []
        for sel_range in selection:
            rows = []
            for row in range(sel_range.topRow(), sel_range.bottomRow() + 1):
                cols = []
                for col in range(sel_range.leftColumn(), sel_range.rightColumn() + 1):
                    item = table.item(row, col)
                    cols.append(item.text() if item else "")
                rows.append(cols)
            self.clipboard_data.append(rows)

        self.update_status("Скопировано в буфер")

    def paste_selection(self):
        if not self.clipboard_data:
            return

        tab = self.get_current_tab()
        if not tab:
            return

        table = tab.get_table()
        selected = table.selectedIndexes()
        if not selected:
            return

        row, col = selected[0].row(), selected[0].column()

        for data in self.clipboard_data:
            for r_offset, row_data in enumerate(data):
                for c_offset, value in enumerate(row_data):
                    target_row = row + r_offset
                    target_col = col + c_offset

                    if target_row < table.rowCount() and target_col < table.columnCount():
                        item = table.item(target_row, target_col)
                        if not item:
                            item = QTableWidgetItem()
                            table.setItem(target_row, target_col, item)
                        item.setText(value)

        tab.modified = True
        index = self.tabs.indexOf(tab)
        if index >= 0:
            self.tabs.setTabText(index, tab.set_modified(True))

        self.update_status("Вставлено из буфера")

    def cut_selection(self):
        self.copy_selection()
        self.clear_selected_cells()

    def clear_selected_cells(self):
        tab = self.get_current_tab()
        if not tab:
            return

        table = tab.get_table()
        selection = table.selectedRanges()
        for sel_range in selection:
            for row in range(sel_range.topRow(), sel_range.bottomRow() + 1):
                for col in range(sel_range.leftColumn(), sel_range.rightColumn() + 1):
                    item = table.item(row, col)
                    if item:
                        item.setText("")

        tab.modified = True
        index = self.tabs.indexOf(tab)
        if index >= 0:
            self.tabs.setTabText(index, tab.set_modified(True))

        self.update_status("Ячейки очищены")

    def autosave(self):
        for i in range(self.tabs.count()):
            tab = self.tabs.widget(i)
            if tab.modified and tab.file_path:
                try:
                    backup_file = tab.file_path + '.bak'
                    self.save_file(backup_file, tab)
                except:
                    pass

    def closeEvent(self, event):
        unsaved_tabs = []
        for i in range(self.tabs.count()):
            tab = self.tabs.widget(i)
            if tab.modified:
                unsaved_tabs.append(tab.tab_name)

        if unsaved_tabs:
            tabs_list = "\n".join(f"- {name}" for name in unsaved_tabs)
            reply = QMessageBox.question(
                self, "Выход",
                f"Следующие вкладки имеют несохраненные изменения:\n{tabs_list}\n\nСохранить перед выходом?",
                QMessageBox.Save | QMessageBox.Discard | QMessageBox.Cancel
            )

            if reply == QMessageBox.Save:
                for i in range(self.tabs.count()):
                    tab = self.tabs.widget(i)
                    if tab.modified:
                        self.save_tab(tab)
                event.accept()
            elif reply == QMessageBox.Discard:
                event.accept()
            else:
                event.ignore()
        else:
            event.accept()