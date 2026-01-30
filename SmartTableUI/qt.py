import sys
import pandas as pd
import json
import os
import csv
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
        self.data = [["" for _ in range(26)] for _ in range(100)]
        self.formulas = {}
        self.cell_styles = {}

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
        self.update_table_from_data()

        layout.addWidget(self.table)

    def update_table_from_data(self):
        # Определяем размеры таблицы
        rows = max(len(self.data), 100)
        cols = max((len(row) for row in self.data), default=26)

        self.table.setRowCount(rows)
        self.table.setColumnCount(cols)

        # Устанавливаем заголовки
        col_labels = [chr(65 + i) if i < 26 else f"A{chr(65 + i - 26)}" for i in range(cols)]
        self.table.setHorizontalHeaderLabels(col_labels)
        self.table.setVerticalHeaderLabels([str(i + 1) for i in range(rows)])

        # Заполняем данные
        for row in range(len(self.data)):
            for col in range(len(self.data[row])):
                if col < cols:
                    value = self.data[row][col]
                    item = self.table.item(row, col)
                    if not item:
                        item = QTableWidgetItem()
                        self.table.setItem(row, col, item)
                    item.setText(str(value))

    def get_table(self):
        return self.table

    def get_data(self):
        return self.data

    def set_data(self, data):
        self.data = data
        self.update_table_from_data()

    def set_modified(self, modified):
        self.modified = modified
        name = self.tab_name
        if modified:
            name += " *"
        return name

    def save_data(self):
        # Обновляем данные из таблицы
        rows = self.table.rowCount()
        cols = self.table.columnCount()

        # Создаем новые данные правильного размера
        new_data = []
        for row in range(rows):
            row_data = []
            for col in range(cols):
                item = self.table.item(row, col)
                row_data.append(item.text() if item else "")
            new_data.append(row_data)

        self.data = new_data


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
        self.setWindowTitle("Smart Table Editor")
        self.setGeometry(100, 50, 1400, 850)

        # Настройки темы
        self.current_theme = "light"  # По умолчанию светлая тема
        self.app_theme_color = QColor("#DC143C")  # Малиновый цвет по умолчанию

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

        # Инициализация атрибутов перед использованием
        self.tabs_list = None
        self.tab_count_label = None
        self.sheet_label = None
        self.selection_label = None
        self.calc_label = None
        self.zoom_label = None

        # Применяем тему ДО создания UI
        self.apply_theme()

        self.init_ui()

    def load_theme_settings(self):
        """Загружает сохраненные настройки темы"""
        try:
            config_file = "table_editor_config.json"
            if os.path.exists(config_file):
                with open(config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    theme_settings = config.get('theme', {})
                    self.current_theme = theme_settings.get('name', 'light')

                    color_str = theme_settings.get('color', '#DC143C')
                    self.app_theme_color = QColor(color_str)
        except:
            pass  # Используем настройки по умолчанию

    def save_theme_settings(self):
        """Сохраняет настройки темы"""
        try:
            config = {
                'theme': {
                    'name': self.current_theme,
                    'color': self.app_theme_color.name()
                }
            }
            with open("table_editor_config.json", 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
        except:
            pass

    def apply_theme(self):
        """Применяет текущую тему"""
        # Создаем палитру
        palette = QPalette()

        # Устанавливаем цвет акцента в палитру
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

            # Акцентные цвета для состояний
            palette.setColor(QPalette.Light, accent_color.lighter(150))
            palette.setColor(QPalette.Midlight, accent_color.lighter(120))
            palette.setColor(QPalette.Dark, accent_color.darker(150))
            palette.setColor(QPalette.Mid, accent_color.darker(120))

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

            # Акцентные цвета для состояний
            palette.setColor(QPalette.Light, accent_color.lighter(150))
            palette.setColor(QPalette.Midlight, accent_color.lighter(120))
            palette.setColor(QPalette.Dark, accent_color.darker(150))
            palette.setColor(QPalette.Mid, accent_color.darker(120))

        self.setPalette(palette)

        # Применяем стили
        self.update_stylesheet()

        # Сохраняем настройки
        self.save_theme_settings()

    def update_stylesheet(self):
        """Обновляет таблицу стилей"""
        accent_color = self.app_theme_color.name()
        accent_light = self.app_theme_color.lighter(150).name()
        accent_dark = self.app_theme_color.darker(150).name()
        accent_hover = self.app_theme_color.lighter(120).name()

        if self.current_theme == "light":
            stylesheet = f"""
                /* ОСНОВНЫЕ СТИЛИ */
                QMainWindow {{
                    background-color: #f8f9fa;
                }}

                QWidget {{
                    color: #202124;
                    font-family: 'Segoe UI', Arial, sans-serif;
                    font-size: 11px;
                }}

                /* ПАНЕЛИ ИНСТРУМЕНТОВ */
                QToolBar {{
                    background-color: #f8f9fa;
                    border-bottom: 1px solid #dadce0;
                    spacing: 3px;
                    padding: 2px;
                }}

                QToolButton {{
                    background-color: transparent;
                    border: 1px solid transparent;
                    border-radius: 3px;
                    padding: 5px 8px;
                    color: #202124;
                    min-height: 24px;
                }}

                QToolButton:hover {{
                    background-color: #f1f3f4;
                    border: 1px solid #dadce0;
                }}

                QToolButton:pressed {{
                    background-color: #e8eaed;
                }}

                QToolButton:checked {{
                    background-color: {accent_light};
                    border: 1px solid {accent_color};
                }}

                /* СТАТУС БАР */
                QStatusBar {{
                    background-color: white;
                    color: #5f6368;
                    border-top: 1px solid #dadce0;
                }}

                QStatusBar::item {{
                    border: none;
                }}

                /* ТАБЛИЦА */
                QTableWidget {{
                    background-color: white;
                    alternate-background-color: #f8f9fa;
                    gridline-color: #e0e0e0;
                    border: 1px solid #dadce0;
                    selection-background-color: {accent_light};
                    selection-color: #202124;
                }}

                QTableWidget::item {{
                    padding: 2px 4px;
                    border-right: 1px solid #e0e0e0;
                    border-bottom: 1px solid #e0e0e0;
                }}

                QTableWidget::item:selected {{
                    background-color: {accent_light};
                    color: #202124;
                }}

                /* ЗАГОЛОВКИ ТАБЛИЦЫ */
                QHeaderView::section {{
                    background-color: #f8f9fa;
                    color: #5f6368;
                    padding: 4px 8px;
                    border-right: 1px solid #e0e0e0;
                    border-bottom: 1px solid #e0e0e0;
                    font-weight: 500;
                }}

                /* ВКЛАДКИ */
                QTabWidget::pane {{
                    border: 1px solid #dadce0;
                    background-color: white;
                }}

                QTabBar::tab {{
                    background-color: #f8f9fa;
                    border: 1px solid #dadce0;
                    color: #5f6368;
                    padding: 8px 12px;
                    margin-right: 2px;
                }}

                QTabBar::tab:selected {{
                    background-color: white;
                    border-bottom-color: white;
                    color: #202124;
                }}

                QTabBar::tab:hover {{
                    background-color: {accent_light};
                }}

                /* КНОПКИ */
                QPushButton {{
                    background-color: white;
                    border: 1px solid #dadce0;
                    border-radius: 4px;
                    padding: 6px 12px;
                    color: #202124;
                }}

                QPushButton:hover {{
                    background-color: #f8f9fa;
                    border-color: #c0c0c0;
                }}

                QPushButton:pressed {{
                    background-color: #e8eaed;
                }}

                QPushButton:checked {{
                    background-color: {accent_light};
                    border-color: {accent_color};
                }}

                /* КНОПКИ С АКЦЕНТОМ */
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

                QPushButton[accent="true"]:pressed {{
                    background-color: {accent_dark};
                }}

                /* ГРУППЫ */
                QGroupBox {{
                    border: 1px solid #dadce0;
                    border-radius: 4px;
                    margin-top: 12px;
                    padding-top: 10px;
                    font-weight: bold;
                    font-size: 12px;
                }}

                QGroupBox::title {{
                    subcontrol-origin: margin;
                    left: 10px;
                    padding: 0 5px 0 5px;
                    color: #202124;
                }}

                /* ПОЛЯ ВВОДА */
                QLineEdit {{
                    border: 1px solid #dadce0;
                    padding: 4px 8px;
                    background-color: white;
                    selection-background-color: {accent_light};
                }}

                QLineEdit:focus {{
                    border: 2px solid {accent_color};
                    padding: 3px 7px;
                }}

                /* ВЫПАДАЮЩИЕ СПИСКИ */
                QComboBox {{
                    border: 1px solid #dadce0;
                    padding: 4px 8px;
                    background-color: white;
                }}

                QComboBox:hover {{
                    border-color: #a0a0a0;
                }}

                QComboBox::drop-down {{
                    border: none;
                }}

                QComboBox QAbstractItemView {{
                    background-color: white;
                    selection-background-color: {accent_light};
                }}

                /* СПИСКИ */
                QListWidget {{
                    border: 1px solid #dadce0;
                    background-color: white;
                }}

                QListWidget::item {{
                    padding: 5px;
                    border-bottom: 1px solid #f0f0f0;
                }}

                QListWidget::item:selected {{
                    background-color: {accent_light};
                    color: #202124;
                }}

                /* МЕНЮ */
                QMenuBar {{
                    background-color: #f8f9fa;
                    border-bottom: 1px solid #dadce0;
                }}

                QMenuBar::item {{
                    background-color: transparent;
                    padding: 5px 10px;
                }}

                QMenuBar::item:selected {{
                    background-color: {accent_light};
                }}

                QMenu {{
                    background-color: white;
                    border: 1px solid #dadce0;
                }}

                QMenu::item {{
                    padding: 5px 20px 5px 20px;
                }}

                QMenu::item:selected {{
                    background-color: {accent_light};
                }}

                /* ФЛАЖКИ И ПЕРЕКЛЮЧАТЕЛИ */
                QCheckBox, QRadioButton {{
                    spacing: 5px;
                }}

                QCheckBox::indicator, QRadioButton::indicator {{
                    width: 16px;
                    height: 16px;
                }}

                QCheckBox::indicator {{
                    border: 1px solid #dadce0;
                    border-radius: 2px;
                    background-color: white;
                }}

                QCheckBox::indicator:checked {{
                    background-color: {accent_color};
                    border-color: {accent_color};
                }}

                QRadioButton::indicator {{
                    border: 1px solid #dadce0;
                    border-radius: 8px;
                    background-color: white;
                }}

                QRadioButton::indicator:checked {{
                    border: 5px solid {accent_color};
                }}

                /* ДИАЛОГИ */
                QDialog {{
                    background-color: white;
                }}

                QMessageBox {{
                    background-color: white;
                }}
            """
        else:  # Темная тема
            stylesheet = f"""
                /* ОСНОВНЫЕ СТИЛИ */
                QMainWindow {{
                    background-color: #202124;
                }}

                QWidget {{
                    color: #e8eaed;
                    font-family: 'Segoe UI', Arial, sans-serif;
                    font-size: 11px;
                    background-color: #202124;
                }}

                /* ПАНЕЛИ ИНСТРУМЕНТОВ */
                QToolBar {{
                    background-color: #2d2e30;
                    border-bottom: 1px solid #3c4043;
                    spacing: 3px;
                    padding: 2px;
                }}

                QToolButton {{
                    background-color: transparent;
                    border: 1px solid transparent;
                    border-radius: 3px;
                    padding: 5px 8px;
                    color: #e8eaed;
                    min-height: 24px;
                }}

                QToolButton:hover {{
                    background-color: #3c4043;
                    border: 1px solid #5f6368;
                }}

                QToolButton:pressed {{
                    background-color: #5f6368;
                }}

                QToolButton:checked {{
                    background-color: {accent_dark};
                    border: 1px solid {accent_color};
                }}

                /* СТАТУС БАР */
                QStatusBar {{
                    background-color: #202124;
                    color: #9aa0a6;
                    border-top: 1px solid #3c4043;
                }}

                QStatusBar::item {{
                    border: none;
                }}

                /* ТАБЛИЦА */
                QTableWidget {{
                    background-color: #202124;
                    alternate-background-color: #2d2e30;
                    gridline-color: #3c4043;
                    border: 1px solid #3c4043;
                    selection-background-color: {accent_dark};
                    selection-color: #e8eaed;
                }}

                QTableWidget::item {{
                    padding: 2px 4px;
                    border-right: 1px solid #3c4043;
                    border-bottom: 1px solid #3c4043;
                }}

                QTableWidget::item:selected {{
                    background-color: {accent_dark};
                    color: #e8eaed;
                }}

                /* ЗАГОЛОВКИ ТАБЛИЦЫ */
                QHeaderView::section {{
                    background-color: #2d2e30;
                    color: #9aa0a6;
                    padding: 4px 8px;
                    border-right: 1px solid #3c4043;
                    border-bottom: 1px solid #3c4043;
                    font-weight: 500;
                }}

                /* ВКЛАДКИ */
                QTabWidget::pane {{
                    border: 1px solid #3c4043;
                    background-color: #202124;
                }}

                QTabBar::tab {{
                    background-color: #2d2e30;
                    border: 1px solid #3c4043;
                    color: #9aa0a6;
                    padding: 8px 12px;
                    margin-right: 2px;
                }}

                QTabBar::tab:selected {{
                    background-color: #202124;
                    border-bottom-color: #202124;
                    color: #e8eaed;
                }}

                QTabBar::tab:hover {{
                    background-color: {accent_dark};
                }}

                /* КНОПКИ */
                QPushButton {{
                    background-color: #2d2e30;
                    border: 1px solid #3c4043;
                    border-radius: 4px;
                    padding: 6px 12px;
                    color: #e8eaed;
                }}

                QPushButton:hover {{
                    background-color: #3c4043;
                    border-color: #5f6368;
                }}

                QPushButton:pressed {{
                    background-color: #5f6368;
                }}

                QPushButton:checked {{
                    background-color: {accent_dark};
                    border-color: {accent_color};
                }}

                /* КНОПКИ С АКЦЕНТОМ */
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

                QPushButton[accent="true"]:pressed {{
                    background-color: {accent_dark};
                }}

                /* ГРУППЫ */
                QGroupBox {{
                    border: 1px solid #3c4043;
                    border-radius: 4px;
                    margin-top: 12px;
                    padding-top: 10px;
                    font-weight: bold;
                    font-size: 12px;
                    background-color: #2d2e30;
                }}

                QGroupBox::title {{
                    subcontrol-origin: margin;
                    left: 10px;
                    padding: 0 5px 0 5px;
                    color: #e8eaed;
                }}

                /* ПОЛЯ ВВОДА */
                QLineEdit {{
                    border: 1px solid #3c4043;
                    padding: 4px 8px;
                    background-color: #2d2e30;
                    color: #e8eaed;
                    selection-background-color: {accent_dark};
                }}

                QLineEdit:focus {{
                    border: 2px solid {accent_color};
                    padding: 3px 7px;
                }}

                /* ВЫПАДАЮЩИЕ СПИСКИ */
                QComboBox {{
                    border: 1px solid #3c4043;
                    padding: 4px 8px;
                    background-color: #2d2e30;
                    color: #e8eaed;
                }}

                QComboBox:hover {{
                    border-color: #5f6368;
                }}

                QComboBox::drop-down {{
                    border: none;
                }}

                QComboBox QAbstractItemView {{
                    background-color: #2d2e30;
                    color: #e8eaed;
                    selection-background-color: {accent_dark};
                }}

                /* СПИСКИ */
                QListWidget {{
                    border: 1px solid #3c4043;
                    background-color: #2d2e30;
                }}

                QListWidget::item {{
                    padding: 5px;
                    border-bottom: 1px solid #3c4043;
                }}

                QListWidget::item:selected {{
                    background-color: {accent_dark};
                    color: #e8eaed;
                }}

                /* МЕНЮ */
                QMenuBar {{
                    background-color: #2d2e30;
                    border-bottom: 1px solid #3c4043;
                }}

                QMenuBar::item {{
                    background-color: transparent;
                    padding: 5px 10px;
                }}

                QMenuBar::item:selected {{
                    background-color: {accent_dark};
                }}

                QMenu {{
                    background-color: #2d2e30;
                    border: 1px solid #3c4043;
                }}

                QMenu::item {{
                    padding: 5px 20px 5px 20px;
                    color: #e8eaed;
                }}

                QMenu::item:selected {{
                    background-color: {accent_dark};
                }}

                /* ФЛАЖКИ И ПЕРЕКЛЮЧАТЕЛИ */
                QCheckBox, QRadioButton {{
                    color: #e8eaed;
                    spacing: 5px;
                }}

                QCheckBox::indicator, QRadioButton::indicator {{
                    width: 16px;
                    height: 16px;
                }}

                QCheckBox::indicator {{
                    border: 1px solid #5f6368;
                    border-radius: 2px;
                    background-color: #2d2e30;
                }}

                QCheckBox::indicator:checked {{
                    background-color: {accent_color};
                    border-color: {accent_color};
                }}

                QRadioButton::indicator {{
                    border: 1px solid #5f6368;
                    border-radius: 8px;
                    background-color: #2d2e30;
                }}

                QRadioButton::indicator:checked {{
                    border: 5px solid {accent_color};
                }}

                /* ДИАЛОГИ */
                QDialog {{
                    background-color: #202124;
                }}

                QMessageBox {{
                    background-color: #202124;
                }}
            """

        self.setStyleSheet(stylesheet)
        self.update_child_widgets()

    def update_child_widgets(self):
        """Обновляет дочерние виджеты"""
        # Принудительно обновляем виджеты
        for widget in self.findChildren(QWidget):
            widget.style().unpolish(widget)
            widget.style().polish(widget)
            widget.update()

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

        # Боковая панель инструментов
        splitter = QSplitter(Qt.Horizontal)
        self.create_sidebar()
        splitter.addWidget(self.sidebar)
        splitter.addWidget(self.tabs)
        splitter.setStretchFactor(1, 1)
        splitter.setSizes([200, 1200])

        main_layout.addWidget(splitter)

        # Статус бар
        self.create_status_bar()

        # Горячие клавиши
        self.setup_shortcuts()

        self.tabs.currentChanged.connect(self.tab_changed)
        # Запускаем таймер автосохранения
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
        file_menu.addAction("Сохранить все", self.save_all_tabs)
        file_menu.addSeparator()

        # Меню экспорта
        export_menu = file_menu.addMenu("Экспорт")
        export_menu.addAction("Экспорт в Excel (.xlsx)", self.export_to_excel)
        export_menu.addAction("Экспорт в PDF", self.export_to_pdf)
        export_menu.addAction("Экспорт в HTML", self.export_to_html)

        file_menu.addSeparator()
        file_menu.addAction("Закрыть вкладку", self.close_current_tab, "Ctrl+W")
        file_menu.addAction("Закрыть все", self.close_all_tabs)
        file_menu.addSeparator()
        file_menu.addAction("Настройки темы...", self.show_theme_settings)
        file_menu.addSeparator()
        file_menu.addAction("Выход", self.close, "Alt+F4")

        # Меню Правка
        edit_menu = self.menu_bar.addMenu("✏️ Правка")
        edit_menu.addAction("Отменить", self.undo_action, "Ctrl+Z")
        edit_menu.addAction("Повторить", self.redo_action, "Ctrl+Y")
        edit_menu.addSeparator()
        edit_menu.addAction("Вырезать", self.cut_selection, "Ctrl+X")
        edit_menu.addAction("Копировать", self.copy_selection, "Ctrl+C")
        edit_menu.addAction("Вставить", self.paste_selection, "Ctrl+V")
        edit_menu.addSeparator()
        edit_menu.addAction("Найти...", self.find_dialog, "Ctrl+F")
        edit_menu.addAction("Заменить...", self.replace_dialog, "Ctrl+H")

        # Меню Вид
        view_menu = self.menu_bar.addMenu("👁️ Вид")
        view_menu.addAction("Увеличить", self.zoom_in, "Ctrl++")
        view_menu.addAction("Уменьшить", self.zoom_out, "Ctrl+-")
        view_menu.addAction("Сбросить масштаб", self.zoom_reset, "Ctrl+0")
        view_menu.addSeparator()
        view_menu.addAction("Панель формул", self.toggle_formula_bar, "Ctrl+Shift+F")
        view_menu.addAction("Боковая панель", self.toggle_sidebar, "Ctrl+Shift+B")
        view_menu.addAction("Сетка", self.toggle_grid, "Ctrl+Shift+G")
        view_menu.addSeparator()

        # Подменю темы
        theme_menu = view_menu.addMenu("Тема оформления")
        light_theme_action = theme_menu.addAction("Светлая тема")
        light_theme_action.triggered.connect(lambda: self.switch_theme("light"))
        dark_theme_action = theme_menu.addAction("Темная тема")
        dark_theme_action.triggered.connect(lambda: self.switch_theme("dark"))
        system_theme_action = theme_menu.addAction("Системная тема")
        system_theme_action.triggered.connect(lambda: self.switch_theme("system"))

    def create_main_toolbar(self):
        self.main_toolbar = ModernToolBar()
        self.main_toolbar.setIconSize(QSize(20, 20))

        # Основные кнопки с акцентным цветом
        actions = [
            ("📄", "Новый", self.new_file, "Ctrl+N", True),
            ("➕", "Новая вкладка", self.add_new_tab, "Ctrl+T", True),
            ("📂", "Открыть", self.open_file_dialog, "Ctrl+O", True),
            ("💾", "Сохранить", self.save_current_tab, "Ctrl+S", True),
            ("📊", "Экспорт в Excel", self.export_to_excel, "Ctrl+E", True),
            ("🖨️", "Печать", self.print_preview, "Ctrl+P", False),
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

        zoom_reset_btn = QPushButton("⟲")
        zoom_reset_btn.setToolTip("Сбросить масштаб (Ctrl+0)")
        zoom_reset_btn.clicked.connect(self.zoom_reset)
        zoom_reset_btn.setFixedSize(30, 24)

        self.main_toolbar.addWidget(QLabel("Масштаб:"))
        self.main_toolbar.addWidget(zoom_out_btn)
        self.main_toolbar.addWidget(self.zoom_combo)
        self.main_toolbar.addWidget(zoom_in_btn)
        self.main_toolbar.addWidget(zoom_reset_btn)

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

        self.format_toolbar.addSeparator()

        # Выравнивание
        align_buttons = [
            ("◀", "По левому краю", self.align_left, "Ctrl+Shift+L"),
            ("🔘", "По центру", self.align_center, "Ctrl+Shift+E"),
            ("▶", "По правому краю", self.align_right, "Ctrl+Shift+R"),
        ]

        for text, tooltip, slot, shortcut in align_buttons:
            btn = QPushButton(text)
            btn.setToolTip(tooltip)
            if shortcut:
                btn.setShortcut(shortcut)
            btn.clicked.connect(slot)
            btn.setFixedSize(30, 24)
            btn.setCheckable(True)
            self.format_toolbar.addWidget(btn)

        self.format_toolbar.addSeparator()

        # Цвета
        color_buttons = [
            ("🎨", "Цвет текста", self.text_color_dialog),
            ("🟦", "Цвет фона", self.bg_color_dialog),
        ]

        for text, tooltip, slot in color_buttons:
            btn = QPushButton(text)
            btn.setToolTip(tooltip)
            btn.clicked.connect(slot)
            btn.setFixedSize(30, 24)
            self.format_toolbar.addWidget(btn)

    def create_formula_bar(self):
        self.formula_bar = QWidget()
        layout = QHBoxLayout(self.formula_bar)
        layout.setContentsMargins(10, 5, 10, 5)

        # Поле адреса ячейки
        self.cell_address = QLineEdit()
        self.cell_address.setReadOnly(True)
        self.cell_address.setFixedWidth(80)

        # Поле функции
        self.function_combo = QComboBox()
        self.function_combo.addItems(["Функции...", "SUM", "AVERAGE", "COUNT", "MAX", "MIN",
                                      "IF", "VLOOKUP", "CONCATENATE", "DATE", "NOW"])
        self.function_combo.currentTextChanged.connect(self.insert_function)
        self.function_combo.setFixedWidth(120)

        # Поле ввода формулы
        self.formula_edit = QLineEdit()
        self.formula_edit.setPlaceholderText("Введите формулу или значение...")
        self.formula_edit.returnPressed.connect(self.apply_formula)

        layout.addWidget(QLabel("Ячейка:"))
        layout.addWidget(self.cell_address)
        layout.addWidget(QLabel("fx:"))
        layout.addWidget(self.function_combo)
        layout.addWidget(self.formula_edit)

    def create_sidebar(self):
        self.sidebar = QWidget()
        layout = QVBoxLayout(self.sidebar)
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(10)

        # Быстрые функции
        func_group = QGroupBox("⚡ Быстрые функции")
        func_layout = QVBoxLayout()

        quick_funcs = [
            ("Сумма выделенного", self.quick_sum),
            ("Среднее значение", self.quick_average),
            ("Количество", self.quick_count),
            ("Максимум", self.quick_max),
            ("Минимум", self.quick_min),
            ("Автосумма", self.auto_sum),
        ]

        for text, slot in quick_funcs:
            btn = QPushButton(text)
            btn.clicked.connect(slot)
            btn.setStyleSheet("text-align: left; padding: 6px 10px;")
            func_layout.addWidget(btn)

        func_group.setLayout(func_layout)
        layout.addWidget(func_group)

        # Форматы данных
        format_group = QGroupBox("📊 Форматы данных")
        format_layout = QVBoxLayout()

        formats = [
            ("Общий", lambda: self.set_number_format("general")),
            ("Числовой", lambda: self.set_number_format("number")),
            ("Денежный", lambda: self.set_number_format("currency")),
            ("Процент", lambda: self.set_number_format("percent")),
            ("Дата", lambda: self.set_number_format("date")),
            ("Время", lambda: self.set_number_format("time")),
        ]

        for text, slot in formats:
            btn = QPushButton(text)
            btn.clicked.connect(slot)
            btn.setStyleSheet("text-align: left; padding: 6px 10px;")
            format_layout.addWidget(btn)

        format_group.setLayout(format_layout)
        layout.addWidget(format_group)

        # Открытые вкладки
        tabs_group = QGroupBox("📑 Вкладки")
        tabs_layout = QVBoxLayout()
        self.tabs_list = QListWidget()
        self.tabs_list.itemClicked.connect(self.switch_to_tab)
        tabs_layout.addWidget(self.tabs_list)
        tabs_group.setLayout(tabs_layout)
        layout.addWidget(tabs_group)

        layout.addStretch()

    def create_status_bar(self):
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)

        # Элементы статус бара
        self.sheet_label = QLabel("Лист1")
        self.selection_label = QLabel("")
        self.calc_label = QLabel("Готов")
        self.zoom_label = QLabel(f"{self.zoom_level}%")
        self.tab_count_label = QLabel("Вкладок: 1")

        self.status_bar.addPermanentWidget(self.sheet_label)
        self.status_bar.addPermanentWidget(self.selection_label, 1)
        self.status_bar.addPermanentWidget(self.calc_label)
        self.status_bar.addPermanentWidget(self.zoom_label)
        self.status_bar.addPermanentWidget(self.tab_count_label)

        self.update_status("Готов")

    def setup_shortcuts(self):
        # Основные горячие клавиши
        shortcuts = [
            (QKeySequence("Ctrl+N"), self.new_file),
            (QKeySequence("Ctrl+T"), self.add_new_tab),
            (QKeySequence("Ctrl+O"), self.open_file_dialog),
            (QKeySequence("Ctrl+S"), self.save_current_tab),
            (QKeySequence("Ctrl+Shift+S"), self.save_as_current_tab),
            (QKeySequence("Ctrl+E"), self.export_to_excel),
            (QKeySequence("Ctrl+P"), self.print_preview),
            (QKeySequence("Ctrl+Z"), self.undo_action),
            (QKeySequence("Ctrl+Y"), self.redo_action),
            (QKeySequence("Ctrl+X"), self.cut_selection),
            (QKeySequence("Ctrl+C"), self.copy_selection),
            (QKeySequence("Ctrl+V"), self.paste_selection),
            (QKeySequence("Ctrl+F"), self.find_dialog),
            (QKeySequence("Ctrl+H"), self.replace_dialog),
            (QKeySequence("Ctrl+B"), self.toggle_bold),
            (QKeySequence("Ctrl+I"), self.toggle_italic),
            (QKeySequence("Ctrl+U"), self.toggle_underline),
            (QKeySequence("F2"), self.edit_cell),
            (QKeySequence("F4"), self.toggle_reference),
            (QKeySequence("F9"), self.calculate_now),
            (QKeySequence("F11"), self.create_chart),
            (QKeySequence("Ctrl++"), self.zoom_in),
            (QKeySequence("Ctrl+-"), self.zoom_out),
            (QKeySequence("Ctrl+0"), self.zoom_reset),
            (QKeySequence("Ctrl+W"), self.close_current_tab),
            (QKeySequence("Ctrl+Tab"), self.next_tab),
            (QKeySequence("Ctrl+Shift+Tab"), self.prev_tab),
        ]

        for key, slot in shortcuts:
            action = QAction(self)
            action.setShortcut(key)
            action.triggered.connect(slot)
            self.addAction(action)

    def setup_autosave(self):
        self.autosave_timer = QTimer()
        self.autosave_timer.timeout.connect(self.autosave)
        self.autosave_timer.start(300000)  # 5 минут

    # ============ НОВЫЕ ФУНКЦИИ ТЕМЫ ============

    def show_theme_settings(self):
        """Показывает диалог настроек темы"""
        dialog = ThemeSettingsDialog(self)
        if dialog.exec_() == QDialog.Accepted:
            settings = dialog.get_settings()

            # Применяем настройки
            self.current_theme = settings['theme']
            self.app_theme_color = settings['color']

            # Применяем тему
            self.apply_theme()

            # Обновляем отображение сетки
            for i in range(self.tabs.count()):
                tab = self.tabs.widget(i)
                if tab:
                    table = tab.get_table()
                    table.setShowGrid(settings['show_grid'])
                    table.setAlternatingRowColors(settings['alternating_rows'])

            self.update_status("Настройки темы применены")

    def switch_theme(self, theme_name):
        """Переключает тему"""
        self.current_theme = theme_name
        self.apply_theme()
        self.update_status(f"Тема изменена на: {theme_name}")

    # ============ НОВЫЕ ФУНКЦИИ ЭКСПОРТА ============

    def export_to_excel(self):
        """Экспортирует текущую таблицу в Excel (.xlsx)"""
        tab = self.get_current_tab()
        if not tab:
            QMessageBox.warning(self, "Экспорт", "Нет активной таблицы для экспорта")
            return

        # Сохраняем данные из таблицы
        tab.save_data()

        file_path, _ = QFileDialog.getSaveFileName(
            self, "Экспорт в Excel",
            f"{tab.tab_name}.xlsx" if tab.tab_name else "таблица.xlsx",
            "Excel файлы (*.xlsx);;Все файлы (*.*)"
        )

        if not file_path:
            return

        try:
            # Если файл не имеет расширения .xlsx, добавляем его
            if not file_path.lower().endswith('.xlsx'):
                file_path += '.xlsx'

            # Получаем данные
            data = tab.get_data()

            # Определяем максимальные размеры
            max_rows = 0
            max_cols = 0

            for row in data:
                max_rows += 1
                max_cols = max(max_cols, len(row))

            # Создаем DataFrame
            df_data = []
            for i, row in enumerate(data):
                # Дополняем строку до максимальной длины
                padded_row = row + [''] * (max_cols - len(row))
                df_data.append(padded_row)

            df = pd.DataFrame(df_data)

            # Создаем Excel writer
            with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Лист1', index=False, header=False)

                # Получаем workbook и worksheet для форматирования
                workbook = writer.book
                worksheet = writer.sheets['Лист1']

                # Настройка ширины столбцов
                for col_idx in range(max_cols):
                    column_letter = chr(65 + col_idx) if col_idx < 26 else f"A{chr(65 + col_idx - 26)}"
                    max_length = 0
                    for row_idx in range(max_rows):
                        cell_value = str(df.iloc[row_idx, col_idx]) if col_idx < len(df.iloc[row_idx]) else ""
                        if cell_value:
                            max_length = max(max_length, len(cell_value))

                    # Устанавливаем ширину столбца (минимальная ширина 8.43)
                    adjusted_width = min(max(max_length + 2, 8.43), 50)
                    worksheet.column_dimensions[column_letter].width = adjusted_width

                # Форматирование границ
                from openpyxl.styles import Border, Side
                thin_border = Border(
                    left=Side(style='thin'),
                    right=Side(style='thin'),
                    top=Side(style='thin'),
                    bottom=Side(style='thin')
                )

                # Применяем границы ко всем ячейкам
                for row in worksheet.iter_rows(min_row=1, max_row=max_rows, min_col=1, max_col=max_cols):
                    for cell in row:
                        cell.border = thin_border

            self.update_status(f"Таблица экспортирована в Excel: {os.path.basename(file_path)}")
            QMessageBox.information(self, "Экспорт успешен",
                                    f"Таблица успешно экспортирована в:\n{file_path}")

        except Exception as e:
            QMessageBox.critical(self, "Ошибка экспорта",
                                 f"Не удалось экспортировать таблицу:\n{str(e)}")
            self.update_status(f"Ошибка экспорта: {str(e)}")

    def export_to_pdf(self):
        """Экспортирует таблицу в PDF"""
        QMessageBox.information(self, "Экспорт в PDF",
                                "Экспорт в PDF будет реализован в следующей версии")

    def export_to_html(self):
        """Экспортирует таблицу в HTML"""
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

            # Создаем HTML таблицу
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
        .header-row { background-color: #e8f0fe; }
    </style>
</head>
<body>
    <h1>Экспорт таблицы</h1>
    <table>
"""

            # Добавляем заголовки столбцов
            max_cols = max((len(row) for row in data), default=0)
            html += "        <tr class='header-row'>\n"
            for col in range(max_cols):
                col_name = chr(65 + col) if col < 26 else f"A{chr(65 + col - 26)}"
                html += f"            <th>{col_name}</th>\n"
            html += "        </tr>\n"

            # Добавляем данные
            for row_idx, row in enumerate(data):
                html += "        <tr>\n"
                html += f"            <td><strong>{row_idx + 1}</strong></td>\n"  # Номер строки

                for col_idx, cell in enumerate(row):
                    if col_idx < max_cols - 1:  # -1 потому что добавили столбец с номерами строк
                        # Экранируем HTML символы
                        cell_text = str(cell).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                        html += f"            <td>{cell_text}</td>\n"

                # Дополняем пустыми ячейками если нужно
                for _ in range(max(0, max_cols - len(row) - 1)):
                    html += "            <td></td>\n"

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

    # ============ УПРАВЛЕНИЕ ВКЛАДКАМИ ============

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

        # Подключаем сигналы таблицы
        table = tab.get_table()
        table.cellChanged.connect(lambda row, col: self.cell_changed(row, col, tab))
        table.cellClicked.connect(lambda row, col: self.cell_focused(row, col, tab))
        table.cellDoubleClicked.connect(lambda row, col: self.cell_double_clicked(row, col, tab))
        table.itemSelectionChanged.connect(lambda: self.selection_changed(tab))

        self.update_tabs_list()
        self.update_status(f"Создана новая вкладка: {tab_name}")

        return tab

    def get_current_tab(self):
        current_index = self.tabs.currentIndex()
        if current_index >= 0:
            return self.tabs.widget(current_index)
        return None

    def get_current_table(self):
        tab = self.get_current_tab()
        if tab:
            return tab.get_table()
        return None

    def tab_changed(self, index):
        if index >= 0:
            tab = self.tabs.widget(index)
            if tab:
                # Обновляем интерфейс для новой вкладки
                self.update_ui_for_tab(tab)
                self.update_status(f"Переключено на: {tab.tab_name}")

    def update_ui_for_tab(self, tab):
        # Обновляем список вкладок
        self.update_tabs_list()

        # Обновляем счетчик вкладок (если он существует)
        if hasattr(self, 'tab_count_label') and self.tab_count_label is not None:
            self.tab_count_label.setText(f"Вкладок: {self.tabs.count()}")

        # Обновляем имя вкладки в статусе
        name = tab.tab_name
        if tab.modified:
            name += " *"

        # Проверяем существование sheet_label перед использованием
        if hasattr(self, 'sheet_label') and self.sheet_label is not None:
            self.sheet_label.setText(name)

    def update_tabs_list(self):
        # Добавь эту проверку в начале метода
        if not hasattr(self, 'tabs_list') or self.tabs_list is None:
            return

        self.tabs_list.clear()
        for i in range(self.tabs.count()):
            tab = self.tabs.widget(i)
            item_text = tab.tab_name
            if tab.modified:
                item_text += " *"
            self.tabs_list.addItem(item_text)

        # Выделяем текущую вкладку
        current_index = self.tabs.currentIndex()
        if current_index >= 0:
            item = self.tabs_list.item(current_index)
            if item:
                item.setSelected(True)
                self.tabs_list.scrollToItem(item)

    def switch_to_tab(self, item):
        index = self.tabs_list.row(item)
        if index >= 0 and index < self.tabs.count():
            self.tabs.setCurrentIndex(index)

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

        self.update_tabs_list()
        self.update_status(f"Вкладка закрыта")

    def close_current_tab(self):
        current_index = self.tabs.currentIndex()
        if current_index >= 0:
            self.close_tab(current_index)

    def close_all_tabs(self):
        while self.tabs.count() > 0:
            if not self.close_tab(0):
                return  # Пользователь отменил закрытие
        self.add_new_tab()

    def next_tab(self):
        current = self.tabs.currentIndex()
        next_index = (current + 1) % self.tabs.count()
        self.tabs.setCurrentIndex(next_index)

    def prev_tab(self):
        current = self.tabs.currentIndex()
        prev_index = (current - 1) % self.tabs.count()
        self.tabs.setCurrentIndex(prev_index)

    def save_current_tab(self):
        tab = self.get_current_tab()
        if tab:
            self.save_tab(tab)

    def save_as_current_tab(self):
        tab = self.get_current_tab()
        if tab:
            self.save_tab_as(tab)

    def save_all_tabs(self):
        for i in range(self.tabs.count()):
            tab = self.tabs.widget(i)
            if tab.modified:
                self.save_tab(tab)
        self.update_status("Все вкладки сохранены")

    def save_tab(self, tab):
        if tab.file_path:
            self.save_file(tab.file_path, tab)
        else:
            self.save_tab_as(tab)

    def save_tab_as(self, tab):
        file_path, _ = QFileDialog.getSaveFileName(
            self, "Сохранить файл", tab.tab_name + ".csv",
            "CSV файлы (*.csv);;Excel файлы (*.xlsx);;JSON файлы (*.json);;Текстовые файлы (*.txt)"
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
            self.update_tabs_list()

    # ============ ОСНОВНЫЕ ФУНКЦИИ ============

    def cell_changed(self, row, col, tab):
        table = tab.get_table()
        item = table.item(row, col)
        if item:
            new_value = item.text()
            data = tab.get_data()

            if row >= len(data):
                data.extend([[""] * len(data[0]) for _ in range(row - len(data) + 1)])
            if col >= len(data[row]):
                for r in range(len(data)):
                    data[r].extend([""] * (col - len(data[r]) + 1))

            old_value = data[row][col] if row < len(data) and col < len(data[row]) else ""

            if new_value != old_value:
                data[row][col] = new_value

                # Проверяем на формулу
                if new_value.startswith('='):
                    tab.formulas[(row, col)] = new_value
                    try:
                        result = self.evaluate_formula(new_value[1:], tab)
                        item.setText(str(result))
                    except Exception as e:
                        item.setText("#ERROR!")
                        self.update_status(f"Ошибка в формуле: {str(e)}")
                elif (row, col) in tab.formulas:
                    del tab.formulas[(row, col)]

                tab.modified = True
                index = self.tabs.indexOf(tab)
                if index >= 0:
                    self.tabs.setTabText(index, tab.set_modified(True))
                self.update_tabs_list()

    def cell_focused(self, row, col, tab):
        cell_ref = f"{chr(65 + col)}{row + 1}"
        self.cell_address.setText(cell_ref)

        table = tab.get_table()
        item = table.item(row, col)
        if item:
            value = item.text()
            if (row, col) in tab.formulas:
                self.formula_edit.setText(tab.formulas[(row, col)])
            else:
                self.formula_edit.setText(value)

        self.update_selection_stats(tab)

    def cell_double_clicked(self, row, col, tab):
        self.edit_cell()

    def selection_changed(self, tab):
        self.update_selection_stats(tab)

    def update_selection_stats(self, tab):
        table = tab.get_table()
        selection = table.selectedRanges()
        if selection:
            range_text = self.get_selection_range(table)
            self.selection_label.setText(f"Выделено: {range_text}")

    def get_selection_range(self, table):
        selection = table.selectedRanges()
        if not selection:
            return ""

        ranges = []
        for sel_range in selection:
            top = sel_range.topRow() + 1
            left = chr(65 + sel_range.leftColumn())
            bottom = sel_range.bottomRow() + 1
            right = chr(65 + sel_range.rightColumn())

            if top == bottom and left == right:
                ranges.append(f"{left}{top}")
            else:
                ranges.append(f"{left}{top}:{right}{bottom}")

        return ", ".join(ranges)

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

        # Если это формула
        if formula.startswith('='):
            tab.formulas[(row, col)] = formula
            try:
                result = self.evaluate_formula(formula[1:], tab)
                self.set_cell_value(row, col, str(result), tab)
            except Exception as e:
                self.set_cell_value(row, col, "#ERROR!", tab)
                self.update_status(f"Ошибка в формуле: {str(e)}")
        else:
            # Простое значение
            if (row, col) in tab.formulas:
                del tab.formulas[(row, col)]
            self.set_cell_value(row, col, formula, tab)

        tab.modified = True
        index = self.tabs.indexOf(tab)
        if index >= 0:
            self.tabs.setTabText(index, tab.set_modified(True))
        self.update_tabs_list()

    def evaluate_formula(self, formula, tab):
        # Удаляем пробелы и переводим в верхний регистр
        formula = formula.strip().upper()

        # Обработка математических функций
        func_matches = re.findall(r'(\w+)\(([^)]+)\)', formula)
        for func_name, args in func_matches:
            if func_name == 'SUM':
                result = self.evaluate_sum(args, tab)
                formula = formula.replace(f'{func_name}({args})', str(result))
            elif func_name == 'AVERAGE':
                result = self.evaluate_average(args, tab)
                formula = formula.replace(f'{func_name}({args})', str(result))
            elif func_name == 'COUNT':
                result = self.evaluate_count(args, tab)
                formula = formula.replace(f'{func_name}({args})', str(result))
            elif func_name == 'MAX':
                result = self.evaluate_max(args, tab)
                formula = formula.replace(f'{func_name}({args})', str(result))
            elif func_name == 'MIN':
                result = self.evaluate_min(args, tab)
                formula = formula.replace(f'{func_name}({args})', str(result))

        # Замена ссылок на ячейки
        cell_refs = re.findall(r'([A-Z]+)(\d+)', formula)
        for col_str, row_str in cell_refs:
            col = self.column_to_index(col_str)
            row = int(row_str) - 1
            try:
                value = self.get_cell_value(row, col, tab)
                if value:
                    formula = formula.replace(f'{col_str}{row_str}', str(float(value)))
                else:
                    formula = formula.replace(f'{col_str}{row_str}', '0')
            except:
                formula = formula.replace(f'{col_str}{row_str}', '0')

        # Безопасное вычисление
        try:
            # Разрешаем только математические операции
            allowed_chars = set('0123456789+-*/(). ')
            safe_formula = ''.join(c for c in formula if c in allowed_chars)
            return eval(safe_formula)
        except:
            raise ValueError(f"Невозможно вычислить формулу: {formula}")

    def evaluate_sum(self, args, tab):
        total = 0
        ranges = args.split(',')
        for rng in ranges:
            rng = rng.strip()
            if ':' in rng:
                # Диапазон ячеек
                start, end = rng.split(':')
                start_col, start_row = self.parse_cell_ref(start)
                end_col, end_row = self.parse_cell_ref(end)

                for row in range(start_row, end_row + 1):
                    for col in range(start_col, end_col + 1):
                        try:
                            value = self.get_cell_value(row, col, tab)
                            if value:
                                total += float(value)
                        except:
                            pass
        return total

    def evaluate_average(self, args, tab):
        total = 0
        count = 0
        ranges = args.split(',')
        for rng in ranges:
            rng = rng.strip()
            if ':' in rng:
                start, end = rng.split(':')
                start_col, start_row = self.parse_cell_ref(start)
                end_col, end_row = self.parse_cell_ref(end)

                for row in range(start_row, end_row + 1):
                    for col in range(start_col, end_col + 1):
                        try:
                            value = self.get_cell_value(row, col, tab)
                            if value:
                                total += float(value)
                                count += 1
                        except:
                            pass
        return total / count if count > 0 else 0

    def evaluate_count(self, args, tab):
        count = 0
        ranges = args.split(',')
        for rng in ranges:
            rng = rng.strip()
            if ':' in rng:
                start, end = rng.split(':')
                start_col, start_row = self.parse_cell_ref(start)
                end_col, end_row = self.parse_cell_ref(end)

                for row in range(start_row, end_row + 1):
                    for col in range(start_col, end_col + 1):
                        if self.get_cell_value(row, col, tab):
                            count += 1
        return count

    def evaluate_max(self, args, tab):
        max_val = None
        ranges = args.split(',')
        for rng in ranges:
            rng = rng.strip()
            if ':' in rng:
                start, end = rng.split(':')
                start_col, start_row = self.parse_cell_ref(start)
                end_col, end_row = self.parse_cell_ref(end)

                for row in range(start_row, end_row + 1):
                    for col in range(start_col, end_col + 1):
                        try:
                            value = float(self.get_cell_value(row, col, tab))
                            if max_val is None or value > max_val:
                                max_val = value
                        except:
                            pass
        return max_val if max_val is not None else 0

    def evaluate_min(self, args, tab):
        min_val = None
        ranges = args.split(',')
        for rng in ranges:
            rng = rng.strip()
            if ':' in rng:
                start, end = rng.split(':')
                start_col, start_row = self.parse_cell_ref(start)
                end_col, end_row = self.parse_cell_ref(end)

                for row in range(start_row, end_row + 1):
                    for col in range(start_col, end_col + 1):
                        try:
                            value = float(self.get_cell_value(row, col, tab))
                            if min_val is None or value < min_val:
                                min_val = value
                        except:
                            pass
        return min_val if min_val is not None else 0

    def parse_cell_ref(self, ref):
        # Конвертирует ссылку типа "A1" в (col, row)
        match = re.match(r'([A-Z]+)(\d+)', ref.upper())
        if match:
            col_str, row_str = match.groups()
            col = self.column_to_index(col_str)
            row = int(row_str) - 1
            return col, row
        return 0, 0

    def column_to_index(self, col_str):
        # Конвертирует буквы столбца в индекс
        result = 0
        for char in col_str:
            result = result * 26 + (ord(char) - ord('A') + 1)
        return result - 1

    def get_cell_value(self, row, col, tab):
        data = tab.get_data()
        if 0 <= row < len(data) and 0 <= col < len(data[row]):
            return data[row][col]
        return ""

    def set_cell_value(self, row, col, value, tab):
        data = tab.get_data()
        table = tab.get_table()

        # Расширяем данные если нужно
        while row >= len(data):
            data.append([""] * (len(data[0]) if data else 26))
        while col >= len(data[row]):
            for r in range(len(data)):
                data[r].append("")

        data[row][col] = value

        # Обновляем таблицу
        if row < table.rowCount() and col < table.columnCount():
            item = table.item(row, col)
            if not item:
                item = QTableWidgetItem()
                table.setItem(row, col, item)
            item.setText(value)

    # ============ ФУНКЦИИ ФАЙЛА ============

    def new_file(self):
        self.add_new_tab()

    def open_file_dialog(self):
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Открыть файл", "",
            "Таблицы (*.csv *.xlsx *.xls);;JSON файлы (*.json);;Текстовые файлы (*.txt);;Все файлы (*.*)"
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
            elif ext == '.json':
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                df = pd.DataFrame(data)
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

    def save_file(self, file_path, tab):
        try:
            tab.save_data()  # Сохраняем данные из таблицы
            save_data = []
            max_col = 0
            for row in tab.get_data():
                if any(cell for cell in row):
                    save_data.append(row)
                    max_col = max(max_col, len(row))

            # Нормализуем строки
            for i in range(len(save_data)):
                if len(save_data[i]) < max_col:
                    save_data[i].extend([''] * (max_col - len(save_data[i])))

            df = pd.DataFrame(save_data)
            ext = os.path.splitext(file_path)[1].lower()

            if ext == '.csv':
                df.to_csv(file_path, index=False, header=False, encoding='utf-8-sig')
            elif ext == '.xlsx':
                # Сохранение в Excel с форматированием
                with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
                    df.to_excel(writer, sheet_name='Лист1', index=False, header=False)

                    # Настройка ширины столбцов
                    workbook = writer.book
                    worksheet = writer.sheets['Лист1']

                    for col_idx in range(max_col):
                        column_letter = chr(65 + col_idx) if col_idx < 26 else f"A{chr(65 + col_idx - 26)}"
                        max_length = 0
                        for row_idx in range(len(save_data)):
                            cell_value = str(df.iloc[row_idx, col_idx]) if col_idx < len(df.iloc[row_idx]) else ""
                            if cell_value:
                                max_length = max(max_length, len(cell_value))

                        adjusted_width = min(max(max_length + 2, 8.43), 50)
                        worksheet.column_dimensions[column_letter].width = adjusted_width
            elif ext == '.json':
                df.to_json(file_path, orient='records', force_ascii=False, indent=2)
            else:
                df.to_csv(file_path, sep='\t', index=False, header=False, encoding='utf-8')

            tab.modified = False
            index = self.tabs.indexOf(tab)
            if index >= 0:
                self.tabs.setTabText(index, tab.tab_name)
            self.update_tabs_list()

            self.update_status(f"Файл сохранен: {os.path.basename(file_path)}")

        except Exception as ex:
            QMessageBox.critical(self, "Ошибка", f"Не удалось сохранить файл:\n{str(ex)}")

    # ============ ФУНКЦИИ ФОРМАТИРОВАНИЯ ============

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

    def align_left(self):
        self.apply_format_to_selection(lambda item:
                                       item.setTextAlignment(Qt.AlignLeft | Qt.AlignVCenter))

    def align_center(self):
        self.apply_format_to_selection(lambda item:
                                       item.setTextAlignment(Qt.AlignCenter | Qt.AlignVCenter))

    def align_right(self):
        self.apply_format_to_selection(lambda item:
                                       item.setTextAlignment(Qt.AlignRight | Qt.AlignVCenter))

    def text_color_dialog(self):
        color = QColorDialog.getColor()
        if color.isValid():
            self.apply_format_to_selection(lambda item: item.setForeground(QBrush(color)))

    def bg_color_dialog(self):
        color = QColorDialog.getColor()
        if color.isValid():
            self.apply_format_to_selection(lambda item: item.setBackground(QBrush(color)))

    def set_number_format(self, format_type):
        formats = {
            'general': lambda x: str(x),
            'number': lambda x: f"{float(x):,.2f}".replace(',', ' '),
            'currency': lambda x: f"${float(x):,.2f}",
            'percent': lambda x: f"{float(x) * 100:.1f}%",
            'date': lambda x: datetime.strptime(x, '%Y-%m-%d').strftime('%d.%m.%Y') if x else '',
            'time': lambda x: datetime.strptime(x, '%H:%M:%S').strftime('%H:%M') if x else ''
        }

        if format_type in formats:
            formatter = formats[format_type]
            self.apply_format_to_selection(lambda item:
                                           item.setText(formatter(item.text())) if item.text() else None)

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

    # ============ МАСШТАБ ============

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
        # Обновляем комбобокс
        self.zoom_combo.setCurrentText(f"{self.zoom_level}%")

        # Обновляем лейбл в статус баре
        self.zoom_label.setText(f"{self.zoom_level}%")

        # Применяем масштаб ко всем таблицам
        for i in range(self.tabs.count()):
            tab = self.tabs.widget(i)
            if tab:
                table = tab.get_table()
                font = table.font()
                base_size = 10  # Базовый размер шрифта
                new_size = base_size * self.zoom_level / 100
                font.setPointSizeF(new_size)
                table.setFont(font)

                # Также обновляем размеры строк
                table.verticalHeader().setDefaultSectionSize(int(25 * self.zoom_level / 100))

    # ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============

    def update_status(self, message):
        # Проверяем существование status_bar перед использованием
        if hasattr(self, 'status_bar') and self.status_bar is not None:
            self.status_bar.showMessage(message, 3000)

        # Проверяем существование calc_label перед использованием
        if hasattr(self, 'calc_label') and self.calc_label is not None:
            self.calc_label.setText(message.split('|')[0].strip() if '|' in message else message)

    def edit_cell(self):
        self.formula_edit.setFocus()
        self.formula_edit.selectAll()

    def toggle_reference(self):
        # Переключение абсолютных/относительных ссылок
        text = self.formula_edit.text()
        if '=' in text:
            # Простая реализация - добавляет/убирает $
            if '$' in text:
                text = text.replace('$', '')
            else:
                # Добавляем $ к последней ссылке
                parts = text.split('=')
                if len(parts) > 1:
                    formula = parts[1]
                    cell_refs = re.findall(r'([A-Z]+)(\d+)', formula)
                    if cell_refs:
                        last_ref = cell_refs[-1]
                        formula = formula.replace(f'{last_ref[0]}{last_ref[1]}', f'${last_ref[0]}${last_ref[1]}')
                        text = f'={formula}'
            self.formula_edit.setText(text)

    def calculate_now(self):
        tab = self.get_current_tab()
        if tab:
            for (row, col), formula in list(tab.formulas.items()):
                try:
                    result = self.evaluate_formula(formula[1:], tab)
                    self.set_cell_value(row, col, str(result), tab)
                except Exception as e:
                    self.set_cell_value(row, col, "#ERROR!", tab)

            self.update_status("Формулы пересчитаны")

    def create_chart(self):
        QMessageBox.information(self, "Диаграмма", "Создание диаграмм будет реализовано в следующей версии")

    def toggle_formula_bar(self):
        self.formula_bar.setVisible(not self.formula_bar.isVisible())

    def toggle_sidebar(self):
        self.sidebar.setVisible(not self.sidebar.isVisible())

    def toggle_grid(self):
        tab = self.get_current_tab()
        if tab:
            table = tab.get_table()
            show_grid = table.showGrid()
            table.setShowGrid(not show_grid)
            self.update_status("Сетка " + ("показана" if not show_grid else "скрыта"))

    def print_preview(self):
        QMessageBox.information(self, "Печать", "Функция печати будет реализовано в следующей версии")

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
            self.update_tabs_list()
            self.update_status(f"Заменено {count} вхождений")

    # ============ ОПЕРАЦИИ С ДАННЫМИ ============

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
                    self.set_cell_value(target_row, target_col, value, tab)

        tab.modified = True
        index = self.tabs.indexOf(tab)
        if index >= 0:
            self.tabs.setTabText(index, tab.set_modified(True))
        self.update_tabs_list()
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
                    self.set_cell_value(row, col, "", tab)

        tab.modified = True
        index = self.tabs.indexOf(tab)
        if index >= 0:
            self.tabs.setTabText(index, tab.set_modified(True))
        self.update_tabs_list()
        self.update_status("Ячейки очищены")

    # ============ БЫСТРЫЕ ФУНКЦИИ ============

    def quick_sum(self):
        self.insert_formula("SUM")

    def quick_average(self):
        self.insert_formula("AVERAGE")

    def quick_count(self):
        self.insert_formula("COUNT")

    def quick_max(self):
        self.insert_formula("MAX")

    def quick_min(self):
        self.insert_formula("MIN")

    def auto_sum(self):
        tab = self.get_current_tab()
        if not tab:
            return

        table = tab.get_table()
        selected = table.selectedIndexes()
        if not selected:
            return

        row, col = selected[0].row(), selected[0].column()
        range_text = ""

        # Проверяем ячейки выше
        values = []
        for r in range(row - 1, -1, -1):
            item = table.item(r, col)
            if item and item.text():
                try:
                    values.append(float(item.text()))
                except:
                    break
            else:
                break

        if values:
            range_text = f"{chr(65 + col)}{row - len(values) + 1}:{chr(65 + col)}{row}"
        else:
            # Проверяем ячейки слева
            values = []
            for c in range(col - 1, -1, -1):
                item = table.item(row, c)
                if item and item.text():
                    try:
                        values.append(float(item.text()))
                    except:
                        break
                else:
                    break

            if values:
                range_text = f"{chr(65 + col - len(values))}{row + 1}:{chr(65 + col - 1)}{row + 1}"

        if range_text:
            self.formula_edit.setText(f"=SUM({range_text})")
            self.apply_formula()

    def insert_formula(self, func_name):
        tab = self.get_current_tab()
        if not tab:
            return

        table = tab.get_table()
        selection = table.selectedRanges()
        if selection:
            range_text = self.get_selection_range(table)
            self.formula_edit.setText(f"={func_name}({range_text})")
            self.apply_formula()

    def insert_function(self, func_name):
        if func_name != "Функции...":
            self.formula_edit.setText(f"={func_name}()")
            self.formula_edit.setFocus()
            self.formula_edit.setCursorPosition(len(self.formula_edit.text()) - 1)

    def undo_action(self):
        self.update_status("Отменить - будет реализовано")
        # Здесь можно добавить систему отмены действий

    def redo_action(self):
        self.update_status("Повторить - будет реализовано")
        # Здесь можно добавить систему повтора действий

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
        # Проверяем все вкладки на несохраненные изменения
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
                self.save_all_tabs()
                event.accept()
            elif reply == QMessageBox.Discard:
                event.accept()
            else:
                event.ignore()
        else:
            event.accept()


def main():
    app = QApplication(sys.argv)
    app.setStyle('Fusion')

    # Устанавливаем иконку приложения (если есть)
    try:
        app.setWindowIcon(QIcon('table_editor_icon.png'))
    except:
        pass

    window = SpreadsheetApp()
    window.show()

    sys.exit(app.exec_())


if __name__ == "__main__":
    main()