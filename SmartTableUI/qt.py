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
    QSplitter, QGroupBox, QCheckBox, QSpinBox, QDoubleSpinBox
)
from PyQt5.QtCore import Qt, QSize, QTimer, QDate
from PyQt5.QtGui import (
    QFont, QIcon, QPalette, QColor, QLinearGradient,
    QBrush, QPainter, QFontDatabase, QCursor
)


class ModernToolBar(QToolBar):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setStyleSheet("""
            QToolBar {
                background-color: #f8f9fa;
                border-bottom: 1px solid #e0e0e0;
                padding: 2px;
                spacing: 3px;
            }
            QToolButton {
                background-color: transparent;
                border: 1px solid transparent;
                border-radius: 3px;
                padding: 5px 8px;
                color: #202124;
                font-size: 11px;
                min-height: 24px;
            }
            QToolButton:hover {
                background-color: #f1f3f4;
                border: 1px solid #dadce0;
            }
            QToolButton:pressed {
                background-color: #e8eaed;
            }
            QToolButton:checked {
                background-color: #e8f0fe;
                border: 1px solid #d2e3fc;
            }
            QToolButton::menu-indicator {
                width: 0px;
            }
        """)


class ModernTableWidget(QTableWidget):
    def __init__(self, rows, cols):
        super().__init__(rows, cols)
        self.setAlternatingRowColors(True)
        self.setStyleSheet("""
            QTableWidget {
                background-color: white;
                gridline-color: #e0e0e0;
                border: 1px solid #dadce0;
                selection-background-color: #e8f0fe;
                selection-color: #202124;
            }
            QTableWidget::item {
                padding: 2px 4px;
                border-right: 1px solid #e0e0e0;
                border-bottom: 1px solid #e0e0e0;
            }
            QTableWidget::item:selected {
                background-color: #e8f0fe;
                color: #202124;
            }
            QHeaderView::section {
                background-color: #f8f9fa;
                color: #5f6368;
                padding: 4px 8px;
                border-right: 1px solid #e0e0e0;
                border-bottom: 1px solid #e0e0e0;
                font-weight: 500;
                font-size: 11px;
            }
            QTableCornerButton::section {
                background-color: #f8f9fa;
                border: 1px solid #e0e0e0;
            }
        """)

        self.horizontalHeader().setDefaultAlignment(Qt.AlignCenter)
        self.verticalHeader().setDefaultAlignment(Qt.AlignCenter)
        self.horizontalHeader().setMinimumSectionSize(60)

        # Настройка заголовков
        self.horizontalHeader().setStyleSheet("""
            QHeaderView::section {
                background-color: #f8f9fa;
                color: #5f6368;
                padding: 4px 8px;
                border-right: 1px solid #e0e0e0;
                border-bottom: 1px solid #e0e0e0;
                font-weight: 500;
            }
        """)

        self.verticalHeader().setStyleSheet("""
            QHeaderView::section {
                background-color: #f8f9fa;
                color: #5f6368;
                padding: 4px 8px;
                border-right: 1px solid #e0e0e0;
                border-bottom: 1px solid #e0e0e0;
                font-weight: 500;
            }
        """)

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


class SpreadsheetApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Smart Table Editor")
        self.setGeometry(100, 50, 1400, 850)

        # Стиль приложения
        self.setStyleSheet("""
            QMainWindow {
                background-color: #f8f9fa;
            }
            QWidget {
                font-family: 'Segoe UI', Arial, sans-serif;
            }
        """)

        # Данные и состояние
        self.data = [["" for _ in range(26)] for _ in range(100)]
        self.current_file = None
        self.selected_cell = (0, 0)
        self.file_modified = False
        self.clipboard_data = []
        self.cell_styles = {}  # Стили ячеек
        self.formulas = {}  # Формулы ячеек

        self.init_ui()

    def init_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)

        main_layout = QVBoxLayout()
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        central_widget.setLayout(main_layout)

        # Верхняя панель инструментов
        self.create_main_toolbar()
        main_layout.addWidget(self.main_toolbar)

        # Панель форматирования
        self.create_format_toolbar()
        main_layout.addWidget(self.format_toolbar)

        # Панель адреса и формул
        self.create_formula_bar()
        main_layout.addWidget(self.formula_bar)

        # Сплиттер для таблицы и боковой панели
        splitter = QSplitter(Qt.Horizontal)

        # Боковая панель инструментов
        self.create_sidebar()
        splitter.addWidget(self.sidebar)

        # Основная таблица
        self.table = ModernTableWidget(100, 26)
        self.table.setHorizontalHeaderLabels([chr(65 + i) for i in range(26)])
        self.table.setVerticalHeaderLabels([str(i + 1) for i in range(100)])

        # Настройка таблицы
        header = self.table.horizontalHeader()
        header.setSectionResizeMode(QHeaderView.Interactive)
        header.setDefaultSectionSize(100)

        # Подключаем сигналы
        self.table.cellChanged.connect(self.cell_changed)
        self.table.cellClicked.connect(self.cell_focused)
        self.table.cellDoubleClicked.connect(self.cell_double_clicked)
        self.table.itemSelectionChanged.connect(self.selection_changed)

        # Заполняем начальными данными
        self.update_table_from_data()

        splitter.addWidget(self.table)
        splitter.setStretchFactor(1, 1)
        splitter.setSizes([200, 1200])

        main_layout.addWidget(splitter)

        # Статус бар
        self.create_status_bar()

        # Горячие клавиши
        self.setup_shortcuts()

        # Запускаем таймер автосохранения
        self.setup_autosave()

    def create_main_toolbar(self):
        self.main_toolbar = ModernToolBar()
        self.main_toolbar.setIconSize(QSize(20, 20))

        # Файловые операции
        file_menu = QMenu("📁 Файл", self)
        file_menu.addAction("Новый", self.new_file, "Ctrl+N")
        file_menu.addAction("Открыть...", self.open_file_dialog, "Ctrl+O")
        file_menu.addAction("Сохранить", self.save_file_dialog, "Ctrl+S")
        file_menu.addAction("Сохранить как...", self.save_as_file_dialog, "Ctrl+Shift+S")
        file_menu.addSeparator()
        file_menu.addAction("Печать...", self.print_preview, "Ctrl+P")
        file_menu.addSeparator()
        file_menu.addAction("Выход", self.close, "Alt+F4")

        file_btn = QPushButton("📁 Файл")
        file_btn.setMenu(file_menu)
        file_btn.setStyleSheet("""
            QPushButton {
                background: transparent;
                border: none;
                padding: 5px 10px;
                color: #202124;
                font-size: 11px;
            }
            QPushButton:hover {
                background-color: #f1f3f4;
                border-radius: 3px;
            }
        """)
        self.main_toolbar.addWidget(file_btn)

        self.main_toolbar.addSeparator()

        # Основные кнопки
        actions = [
            ("💾", "Сохранить", self.save_file_dialog, "Ctrl+S"),
            ("📂", "Открыть", self.open_file_dialog, "Ctrl+O"),
            ("🖨️", "Печать", self.print_preview, "Ctrl+P"),
        ]

        for icon, text, slot, shortcut in actions:
            action = QAction(icon + " " + text, self)
            if shortcut:
                action.setShortcut(shortcut)
            action.triggered.connect(slot)
            self.main_toolbar.addAction(action)

        self.main_toolbar.addSeparator()

        # Операции с данными
        edit_menu = QMenu("✏️ Правка", self)
        edit_menu.addAction("Отменить", self.undo_action, "Ctrl+Z")
        edit_menu.addAction("Повторить", self.redo_action, "Ctrl+Y")
        edit_menu.addSeparator()
        edit_menu.addAction("Вырезать", self.cut_selection, "Ctrl+X")
        edit_menu.addAction("Копировать", self.copy_selection, "Ctrl+C")
        edit_menu.addAction("Вставить", self.paste_selection, "Ctrl+V")
        edit_menu.addSeparator()
        edit_menu.addAction("Найти...", self.find_dialog, "Ctrl+F")
        edit_menu.addAction("Заменить...", self.replace_dialog, "Ctrl+H")

        edit_btn = QPushButton("✏️ Правка")
        edit_btn.setMenu(edit_menu)
        edit_btn.setStyleSheet(file_btn.styleSheet())
        self.main_toolbar.addWidget(edit_btn)

        self.main_toolbar.addSeparator()

        # Вид
        view_menu = QMenu("👁️ Вид", self)
        view_menu.addAction("Панель формул", self.toggle_formula_bar, "Ctrl+Shift+F")
        view_menu.addAction("Сетка", self.toggle_grid, "Ctrl+Shift+G")
        view_menu.addSeparator()
        view_menu.addAction("Увеличить", self.zoom_in, "Ctrl++")
        view_menu.addAction("Уменьшить", self.zoom_out, "Ctrl+-")
        view_menu.addAction("Сбросить масштаб", self.zoom_reset, "Ctrl+0")

        view_btn = QPushButton("👁️ Вид")
        view_btn.setMenu(view_menu)
        view_btn.setStyleSheet(file_btn.styleSheet())
        self.main_toolbar.addWidget(view_btn)

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
            btn.setStyleSheet("""
                QPushButton {
                    background-color: white;
                    border: 1px solid #dadce0;
                    border-radius: 2px;
                    font-weight: bold;
                }
                QPushButton:hover {
                    background-color: #f8f9fa;
                }
                QPushButton:checked {
                    background-color: #e8eaed;
                }
            """)
            self.format_toolbar.addWidget(btn)

        self.format_toolbar.addSeparator()

        # Выравнивание
        align_buttons = [
            ("◀", "По левому краю", self.align_left, "Ctrl+Shift+L"),
            ("🔘", "По центру", self.align_center, "Ctrl+Shift+E"),
            ("▶", "По правому краю", self.align_right, "Ctrl+Shift+R"),
            ("⏏️", "По верхнему краю", self.align_top, None),
            ("⏬", "По центру вертикально", self.align_middle, None),
            ("⏯️", "По нижнему краю", self.align_bottom, None),
        ]

        for text, tooltip, slot, shortcut in align_buttons:
            btn = QPushButton(text)
            btn.setToolTip(tooltip)
            if shortcut:
                btn.setShortcut(shortcut)
            btn.clicked.connect(slot)
            btn.setFixedSize(30, 24)
            btn.setCheckable(True)
            btn.setStyleSheet("""
                QPushButton {
                    background-color: white;
                    border: 1px solid #dadce0;
                    border-radius: 2px;
                    font-size: 10px;
                }
                QPushButton:hover {
                    background-color: #f8f9fa;
                }
                QPushButton:checked {
                    background-color: #e8eaed;
                }
            """)
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
            btn.setStyleSheet("""
                QPushButton {
                    background-color: white;
                    border: 1px solid #dadce0;
                    border-radius: 2px;
                }
                QPushButton:hover {
                    background-color: #f8f9fa;
                }
            """)
            self.format_toolbar.addWidget(btn)

    def create_formula_bar(self):
        self.formula_bar = QWidget()
        self.formula_bar.setStyleSheet("""
            QWidget {
                background-color: white;
                border-bottom: 1px solid #dadce0;
                padding: 5px;
            }
        """)

        layout = QHBoxLayout(self.formula_bar)
        layout.setContentsMargins(10, 5, 10, 5)

        # Поле адреса ячейки
        self.cell_address = QLineEdit()
        self.cell_address.setReadOnly(True)
        self.cell_address.setFixedWidth(80)
        self.cell_address.setStyleSheet("""
            QLineEdit {
                background-color: #f8f9fa;
                border: 1px solid #dadce0;
                padding: 4px;
                font-family: 'Consolas', monospace;
                font-size: 11px;
            }
        """)

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
        self.formula_edit.setStyleSheet("""
            QLineEdit {
                border: 1px solid #dadce0;
                padding: 4px 8px;
                font-family: 'Consolas', monospace;
                font-size: 11px;
            }
            QLineEdit:focus {
                border: 2px solid #1a73e8;
                padding: 3px 7px;
            }
        """)

        layout.addWidget(QLabel("Ячейка:"))
        layout.addWidget(self.cell_address)
        layout.addWidget(QLabel("fx:"))
        layout.addWidget(self.function_combo)
        layout.addWidget(self.formula_edit)

    def create_sidebar(self):
        self.sidebar = QWidget()
        self.sidebar.setStyleSheet("""
            QWidget {
                background-color: white;
                border-right: 1px solid #dadce0;
            }
        """)

        layout = QVBoxLayout(self.sidebar)
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(10)

        # Быстрые функции
        func_group = QGroupBox("⚡ Быстрые функции")
        func_group.setStyleSheet("""
            QGroupBox {
                font-weight: bold;
                font-size: 12px;
                border: 1px solid #dadce0;
                border-radius: 4px;
                margin-top: 12px;
                padding-top: 10px;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 5px 0 5px;
            }
        """)

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
            btn.setStyleSheet("""
                QPushButton {
                    text-align: left;
                    padding: 6px 10px;
                    border: none;
                    border-radius: 3px;
                    background-color: white;
                }
                QPushButton:hover {
                    background-color: #f8f9fa;
                }
            """)
            func_layout.addWidget(btn)

        func_group.setLayout(func_layout)
        layout.addWidget(func_group)

        # Форматы данных
        format_group = QGroupBox("📊 Форматы данных")
        format_group.setStyleSheet(func_group.styleSheet())

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
            btn.setStyleSheet("""
                QPushButton {
                    text-align: left;
                    padding: 6px 10px;
                    border: none;
                    border-radius: 3px;
                    background-color: white;
                }
                QPushButton:hover {
                    background-color: #f8f9fa;
                }
            """)
            format_layout.addWidget(btn)

        format_group.setLayout(format_layout)
        layout.addWidget(format_group)

        # Статистика
        stats_group = QGroupBox("📈 Статистика")
        stats_group.setStyleSheet(func_group.styleSheet())

        stats_layout = QVBoxLayout()
        self.stats_label = QLabel("Выделите область")
        self.stats_label.setStyleSheet("padding: 10px; font-size: 11px;")
        stats_layout.addWidget(self.stats_label)
        format_group.setLayout(stats_layout)
        layout.addWidget(stats_group)

        layout.addStretch()

    def create_status_bar(self):
        self.status_bar = QStatusBar()
        self.status_bar.setStyleSheet("""
            QStatusBar {
                background-color: white;
                color: #5f6368;
                border-top: 1px solid #dadce0;
                font-size: 11px;
            }
        """)

        self.setStatusBar(self.status_bar)

        # Элементы статус бара
        self.sheet_label = QLabel("Лист1")
        self.selection_label = QLabel("")
        self.calc_label = QLabel("Готов")
        self.zoom_label = QLabel("100%")

        self.status_bar.addPermanentWidget(self.sheet_label)
        self.status_bar.addPermanentWidget(self.selection_label, 1)
        self.status_bar.addPermanentWidget(self.calc_label)
        self.status_bar.addPermanentWidget(self.zoom_label)

        self.update_status("Готов")

    def setup_shortcuts(self):
        from PyQt5.QtGui import QKeySequence

        # Основные горячие клавиши
        shortcuts = [
            ("Ctrl+N", self.new_file),
            ("Ctrl+O", self.open_file_dialog),
            ("Ctrl+S", self.save_file_dialog),
            ("Ctrl+P", self.print_preview),
            ("Ctrl+Z", self.undo_action),
            ("Ctrl+Y", self.redo_action),
            ("Ctrl+X", self.cut_selection),
            ("Ctrl+C", self.copy_selection),
            ("Ctrl+V", self.paste_selection),
            ("Ctrl+F", self.find_dialog),
            ("Ctrl+H", self.replace_dialog),
            ("Ctrl+B", self.toggle_bold),
            ("Ctrl+I", self.toggle_italic),
            ("Ctrl+U", self.toggle_underline),
            ("F2", self.edit_cell),
            ("F4", self.toggle_reference),
            ("F9", self.calculate_now),
            ("F11", self.create_chart),
        ]

        for key, slot in shortcuts:
            action = QAction(self)
            action.setShortcut(QKeySequence(key))
            action.triggered.connect(slot)
            self.addAction(action)

    def setup_autosave(self):
        self.autosave_timer = QTimer()
        self.autosave_timer.timeout.connect(self.autosave)
        self.autosave_timer.start(300000)  # 5 минут

    # ============ ОСНОВНЫЕ ФУНКЦИИ ============

    def cell_changed(self, row, col):
        item = self.table.item(row, col)
        if item:
            new_value = item.text()
            old_value = self.data[row][col] if row < len(self.data) and col < len(self.data[row]) else ""

            if new_value != old_value:
                # Обновляем данные
                if row >= len(self.data):
                    self.data.extend([[""] * len(self.data[0]) for _ in range(row - len(self.data) + 1)])
                if col >= len(self.data[row]):
                    for r in range(len(self.data)):
                        self.data[r].extend([""] * (col - len(self.data[r]) + 1))

                self.data[row][col] = new_value

                # Проверяем на формулу
                if new_value.startswith('='):
                    self.formulas[(row, col)] = new_value
                    try:
                        result = self.evaluate_formula(new_value[1:])
                        item.setText(str(result))
                    except Exception as e:
                        item.setText("#ERROR!")
                        self.update_status(f"Ошибка в формуле: {str(e)}")
                elif (row, col) in self.formulas:
                    del self.formulas[(row, col)]

                self.file_modified = True
                self.update_file_status()

    def cell_focused(self, row, col):
        self.selected_cell = (row, col)
        cell_ref = f"{chr(65 + col)}{row + 1}"
        self.cell_address.setText(cell_ref)

        item = self.table.item(row, col)
        if item:
            value = item.text()
            if (row, col) in self.formulas:
                self.formula_edit.setText(self.formulas[(row, col)])
            else:
                self.formula_edit.setText(value)

        self.update_selection_stats()

    def cell_double_clicked(self, row, col):
        self.edit_cell()

    def selection_changed(self):
        self.update_selection_stats()

    def update_selection_stats(self):
        selection = self.table.selectedRanges()
        if selection:
            range_text = self.get_selection_range()
            self.selection_label.setText(f"Выделено: {range_text}")

            # Рассчитываем статистику
            cells = []
            for sel_range in selection:
                for row in range(sel_range.topRow(), sel_range.bottomRow() + 1):
                    for col in range(sel_range.leftColumn(), sel_range.rightColumn() + 1):
                        item = self.table.item(row, col)
                        if item and item.text():
                            try:
                                cells.append(float(item.text().replace(',', '.')))
                            except:
                                pass

            if cells:
                stats = f"Σ={sum(cells):.2f} Ø={sum(cells) / len(cells):.2f} n={len(cells)}"
                self.stats_label.setText(stats)

    def get_selection_range(self):
        selection = self.table.selectedRanges()
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

        row, col = self.selected_cell

        # Если это формула
        if formula.startswith('='):
            self.formulas[(row, col)] = formula
            try:
                result = self.evaluate_formula(formula[1:])
                self.set_cell_value(row, col, str(result))
            except Exception as e:
                self.set_cell_value(row, col, "#ERROR!")
                self.update_status(f"Ошибка в формуле: {str(e)}")
        else:
            # Простое значение
            if (row, col) in self.formulas:
                del self.formulas[(row, col)]
            self.set_cell_value(row, col, formula)

        self.file_modified = True

    def evaluate_formula(self, formula):
        # Удаляем пробелы и переводим в верхний регистр
        formula = formula.strip().upper()

        # Обработка математических функций
        func_matches = re.findall(r'(\w+)\(([^)]+)\)', formula)
        for func_name, args in func_matches:
            if func_name == 'SUM':
                result = self.evaluate_sum(args)
                formula = formula.replace(f'{func_name}({args})', str(result))
            elif func_name == 'AVERAGE':
                result = self.evaluate_average(args)
                formula = formula.replace(f'{func_name}({args})', str(result))
            elif func_name == 'COUNT':
                result = self.evaluate_count(args)
                formula = formula.replace(f'{func_name}({args})', str(result))
            elif func_name == 'MAX':
                result = self.evaluate_max(args)
                formula = formula.replace(f'{func_name}({args})', str(result))
            elif func_name == 'MIN':
                result = self.evaluate_min(args)
                formula = formula.replace(f'{func_name}({args})', str(result))

        # Замена ссылок на ячейки
        cell_refs = re.findall(r'([A-Z]+)(\d+)', formula)
        for col_str, row_str in cell_refs:
            col = self.column_to_index(col_str)
            row = int(row_str) - 1
            try:
                value = self.get_cell_value(row, col)
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

    def evaluate_sum(self, args):
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
                            value = self.get_cell_value(row, col)
                            if value:
                                total += float(value)
                        except:
                            pass
            else:
                # Одиночная ячейка
                col, row = self.parse_cell_ref(rng)
                try:
                    value = self.get_cell_value(row, col)
                    if value:
                        total += float(value)
                except:
                    pass
        return total

    def evaluate_average(self, args):
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
                            value = self.get_cell_value(row, col)
                            if value:
                                total += float(value)
                                count += 1
                        except:
                            pass
        return total / count if count > 0 else 0

    def evaluate_count(self, args):
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
                        if self.get_cell_value(row, col):
                            count += 1
        return count

    def evaluate_max(self, args):
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
                            value = float(self.get_cell_value(row, col))
                            if max_val is None or value > max_val:
                                max_val = value
                        except:
                            pass
        return max_val if max_val is not None else 0

    def evaluate_min(self, args):
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
                            value = float(self.get_cell_value(row, col))
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

    def get_cell_value(self, row, col):
        if 0 <= row < len(self.data) and 0 <= col < len(self.data[row]):
            return self.data[row][col]
        return ""

    def set_cell_value(self, row, col, value):
        # Расширяем данные если нужно
        while row >= len(self.data):
            self.data.append([""] * (len(self.data[0]) if self.data else 26))
        while col >= len(self.data[row]):
            for r in range(len(self.data)):
                self.data[r].append("")

        self.data[row][col] = value

        # Обновляем таблицу
        if row < self.table.rowCount() and col < self.table.columnCount():
            item = self.table.item(row, col)
            if not item:
                item = QTableWidgetItem()
                self.table.setItem(row, col, item)
            item.setText(value)

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

    def align_top(self):
        self.apply_format_to_selection(lambda item:
                                       item.setTextAlignment(
                                           Qt.AlignTop | (item.textAlignment() & Qt.AlignHorizontal_Mask)))

    def align_middle(self):
        self.apply_format_to_selection(lambda item:
                                       item.setTextAlignment(
                                           Qt.AlignVCenter | (item.textAlignment() & Qt.AlignHorizontal_Mask)))

    def align_bottom(self):
        self.apply_format_to_selection(lambda item:
                                       item.setTextAlignment(
                                           Qt.AlignBottom | (item.textAlignment() & Qt.AlignHorizontal_Mask)))

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
            selection = self.table.selectedRanges()
            for sel_range in selection:
                for row in range(sel_range.topRow(), sel_range.bottomRow() + 1):
                    for col in range(sel_range.leftColumn(), sel_range.rightColumn() + 1):
                        item = self.table.item(row, col)
                        if item and item.text():
                            try:
                                item.setText(formatter(item.text()))
                            except:
                                pass

    def apply_format_to_selection(self, format_func):
        selection = self.table.selectedRanges()
        for sel_range in selection:
            for row in range(sel_range.topRow(), sel_range.bottomRow() + 1):
                for col in range(sel_range.leftColumn(), sel_range.rightColumn() + 1):
                    item = self.table.item(row, col)
                    if not item:
                        item = QTableWidgetItem()
                        self.table.setItem(row, col, item)
                    format_func(item)

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
        # Автоматически определяет диапазон выше или слева
        row, col = self.selected_cell
        range_text = ""

        # Проверяем ячейки выше
        values = []
        for r in range(row - 1, -1, -1):
            item = self.table.item(r, col)
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
                item = self.table.item(row, c)
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
        selection = self.table.selectedRanges()
        if selection:
            range_text = self.get_selection_range()
            self.formula_edit.setText(f"={func_name}({range_text})")
            self.apply_formula()

    def insert_function(self, func_name):
        if func_name != "Функции...":
            self.formula_edit.setText(f"={func_name}()")
            self.formula_edit.setFocus()
            self.formula_edit.setCursorPosition(len(self.formula_edit.text()) - 1)

    # ============ ОПЕРАЦИИ С ДАННЫМИ ============

    def copy_selection(self):
        selection = self.table.selectedRanges()
        if not selection:
            return

        self.clipboard_data = []
        for sel_range in selection:
            rows = []
            for row in range(sel_range.topRow(), sel_range.bottomRow() + 1):
                cols = []
                for col in range(sel_range.leftColumn(), sel_range.rightColumn() + 1):
                    item = self.table.item(row, col)
                    cols.append(item.text() if item else "")
                rows.append(cols)
            self.clipboard_data.append(rows)

        self.update_status("Скопировано в буфер")

    def paste_selection(self):
        if not self.clipboard_data:
            return

        row, col = self.selected_cell
        for data in self.clipboard_data:
            for r_offset, row_data in enumerate(data):
                for c_offset, value in enumerate(row_data):
                    target_row = row + r_offset
                    target_col = col + c_offset
                    self.set_cell_value(target_row, target_col, value)

        self.file_modified = True
        self.update_status("Вставлено из буфера")

    def cut_selection(self):
        self.copy_selection()
        self.clear_selected_cells()

    def clear_selected_cells(self):
        selection = self.table.selectedRanges()
        for sel_range in selection:
            for row in range(sel_range.topRow(), sel_range.bottomRow() + 1):
                for col in range(sel_range.leftColumn(), sel_range.rightColumn() + 1):
                    self.set_cell_value(row, col, "")

        self.file_modified = True
        self.update_status("Ячейки очищены")

    # ============ ФУНКЦИИ ФАЙЛА ============

    def new_file(self):
        if self.file_modified:
            reply = QMessageBox.question(self, "Новый файл",
                                         "Есть несохраненные изменения. Создать новый файл?",
                                         QMessageBox.Save | QMessageBox.Discard | QMessageBox.Cancel)

            if reply == QMessageBox.Save:
                self.save_file_dialog()
            elif reply == QMessageBox.Cancel:
                return

        self.data = [["" for _ in range(26)] for _ in range(100)]
        self.current_file = None
        self.file_modified = False
        self.formulas.clear()
        self.update_table_from_data()
        self.update_status("Новый файл создан")

    def open_file_dialog(self):
        if self.file_modified:
            reply = QMessageBox.question(self, "Открыть файл",
                                         "Есть несохраненные изменения. Открыть новый файл?",
                                         QMessageBox.Save | QMessageBox.Discard | QMessageBox.Cancel)

            if reply == QMessageBox.Save:
                self.save_file_dialog()
            elif reply == QMessageBox.Cancel:
                return

        file_path, _ = QFileDialog.getOpenFileName(
            self, "Открыть файл", "",
            "Таблицы (*.csv *.xlsx *.xls);;JSON файлы (*.json);;Текстовые файлы (*.txt);;Все файлы (*.*)"
        )
        if file_path:
            self.load_file(file_path)

    def save_file_dialog(self):
        if self.current_file:
            self.save_file(self.current_file)
        else:
            self.save_as_file_dialog()

    def save_as_file_dialog(self):
        file_path, _ = QFileDialog.getSaveFileName(
            self, "Сохранить файл", "Новая таблица.csv",
            "CSV файлы (*.csv);;Excel файлы (*.xlsx);;JSON файлы (*.json);;Текстовые файлы (*.txt)"
        )
        if file_path:
            if not os.path.splitext(file_path)[1]:
                file_path += '.csv'
            self.save_file(file_path)
            self.current_file = file_path

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

            self.data = df.fillna('').values.tolist()
            self.current_file = file_path
            self.file_modified = False
            self.formulas.clear()
            self.update_table_from_data()

            filename = os.path.basename(file_path)
            self.update_status(f"Файл '{filename}' загружен")

        except Exception as ex:
            QMessageBox.critical(self, "Ошибка", f"Не удалось загрузить файл:\n{str(ex)}")

    def save_file(self, file_path):
        try:
            # Собираем данные для сохранения
            save_data = []
            max_col = 0
            for row in self.data:
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
                df.to_excel(file_path, index=False, header=False)
            elif ext == '.json':
                df.to_json(file_path, orient='records', force_ascii=False, indent=2)
            else:
                df.to_csv(file_path, sep='\t', index=False, header=False, encoding='utf-8')

            self.file_modified = False
            self.update_file_status()
            self.update_status(f"Файл сохранен: {os.path.basename(file_path)}")

        except Exception as ex:
            QMessageBox.critical(self, "Ошибка", f"Не удалось сохранить файл:\n{str(ex)}")

    def print_preview(self):
        QMessageBox.information(self, "Печать", "Функция печати будет реализована в следующей версии")

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
        for row in range(self.table.rowCount()):
            for col in range(self.table.columnCount()):
                item = self.table.item(row, col)
                if item and text.lower() in item.text().lower():
                    self.table.setCurrentCell(row, col)
                    self.update_status(f"Найдено в ячейке {chr(65 + col)}{row + 1}")
                    return

        self.update_status("Текст не найден")

    def replace_text(self, find_text, replace_text):
        count = 0
        for row in range(self.table.rowCount()):
            for col in range(self.table.columnCount()):
                item = self.table.item(row, col)
                if item and find_text in item.text():
                    item.setText(item.text().replace(find_text, replace_text))
                    count += 1

        if count > 0:
            self.file_modified = True
            self.update_status(f"Заменено {count} вхождений")

    # ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============

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

                    # Применяем форматирование если есть
                    if (row, col) in self.cell_styles:
                        # Здесь можно восстановить стили
                        pass

    def update_file_status(self):
        if self.current_file:
            filename = os.path.basename(self.current_file)
            status = f"📄 {filename}"
            if self.file_modified:
                status += " *"
            self.sheet_label.setText(status)
        else:
            status = "📄 Новый файл"
            if self.file_modified:
                status += " *"
            self.sheet_label.setText(status)

    def update_status(self, message):
        self.status_bar.showMessage(message, 3000)
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
        # Пересчет всех формул
        for (row, col), formula in list(self.formulas.items()):
            try:
                result = self.evaluate_formula(formula[1:])
                self.set_cell_value(row, col, str(result))
            except Exception as e:
                self.set_cell_value(row, col, "#ERROR!")

        self.update_status("Формулы пересчитаны")

    def create_chart(self):
        QMessageBox.information(self, "Диаграмма", "Создание диаграмм будет реализовано в следующей версии")

    def toggle_formula_bar(self):
        self.formula_bar.setVisible(not self.formula_bar.isVisible())

    def toggle_grid(self):
        show_grid = self.table.showGrid()
        self.table.setShowGrid(not show_grid)

    def zoom_in(self):
        font = self.table.font()
        font.setPointSize(font.pointSize() + 1)
        self.table.setFont(font)
        self.zoom_label.setText(f"{font.pointSize() * 10}%")

    def zoom_out(self):
        font = self.table.font()
        if font.pointSize() > 8:
            font.setPointSize(font.pointSize() - 1)
            self.table.setFont(font)
            self.zoom_label.setText(f"{font.pointSize() * 10}%")

    def zoom_reset(self):
        font = self.table.font()
        font.setPointSize(10)
        self.table.setFont(font)
        self.zoom_label.setText("100%")

    def undo_action(self):
        self.update_status("Отменить - будет реализовано")
        # Здесь можно добавить систему отмены действий

    def redo_action(self):
        self.update_status("Повторить - будет реализовано")
        # Здесь можно добавить систему повтора действий

    def autosave(self):
        if self.file_modified and self.current_file:
            try:
                backup_file = self.current_file + '.bak'
                self.save_file(backup_file)
                self.update_status("Автосохранение выполнено")
            except:
                pass

    def closeEvent(self, event):
        if self.file_modified:
            reply = QMessageBox.question(
                self, "Выход",
                "Есть несохраненные изменения. Сохранить перед выходом?",
                QMessageBox.Save | QMessageBox.Discard | QMessageBox.Cancel
            )

            if reply == QMessageBox.Save:
                self.save_file_dialog()
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

    # Настройка палитры
    palette = QPalette()
    palette.setColor(QPalette.Window, QColor(240, 240, 240))
    palette.setColor(QPalette.WindowText, Qt.black)
    palette.setColor(QPalette.Base, Qt.white)
    palette.setColor(QPalette.AlternateBase, QColor(248, 248, 248))
    palette.setColor(QPalette.ToolTipBase, Qt.white)
    palette.setColor(QPalette.ToolTipText, Qt.black)
    palette.setColor(QPalette.Text, Qt.black)
    palette.setColor(QPalette.Button, QColor(240, 240, 240))
    palette.setColor(QPalette.ButtonText, Qt.black)
    palette.setColor(QPalette.BrightText, Qt.red)
    palette.setColor(QPalette.Link, QColor(42, 130, 218))
    palette.setColor(QPalette.Highlight, QColor(66, 133, 244))
    palette.setColor(QPalette.HighlightedText, Qt.white)
    app.setPalette(palette)

    window = SpreadsheetApp()
    window.show()

    sys.exit(app.exec_())


if __name__ == "__main__":
    main()