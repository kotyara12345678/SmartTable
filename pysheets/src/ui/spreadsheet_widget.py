"""
Виджет электронной таблицы
"""

import pandas as pd
import numpy as np
from typing import Optional, List, Tuple, Dict, Any
from dataclasses import dataclass
from enum import Enum

from PyQt5.QtWidgets import (QTableWidget, QTableWidgetItem, QHeaderView,
                             QAbstractItemView, QMenu, QInputDialog, QColorDialog, QAction, QApplication,
                             QStyledItemDelegate, QLineEdit, QDialog, QMessageBox)
from PyQt5.QtCore import Qt, pyqtSignal, QPoint, QTimer
from PyQt5.QtGui import QBrush, QColor, QFont, QKeySequence, QMouseEvent

from pysheets.src.core.cell import Cell
from pysheets.src.core.formula_engine import FormulaEngine
from pysheets.src.core.spreadsheet import Spreadsheet
from pysheets.src.utils.validators import validate_formula, parse_cell_reference


class SpreadsheetWidget(QTableWidget):
    """Виджет электронной таблицы с поддержкой формул и форматирования"""

    # Сигналы
    cell_selected = pyqtSignal(int, int, str)  # row, col, value
    data_changed = pyqtSignal(int, int, str)  # row, col, new_value
    selection_changed = pyqtSignal()

    # Новые сигналы для расширенных функций
    auto_correction_applied = pyqtSignal(int, int)
    cell_resized = pyqtSignal(int, int, int, int)  # row, col, width, height
    cell_split = pyqtSignal(int, int, str)  # row, col, split_type
    cell_frozen = pyqtSignal(int, int, bool)  # row, col, frozen
    cell_hidden = pyqtSignal(int, int, bool)  # row, col, hidden
    format_changed = pyqtSignal()

    def __init__(self, parent=None):
        super().__init__(1000, 26, parent)  # 1000 строк, 26 колонок по умолчанию

        # Модель данных
        self.rows = 1000
        self.columns = 26
        self.zoom_level = 100
        self._updating = False
        
        # Инициализируем FormulaEngine для вычисления формул
        self.formula_engine = FormulaEngine()
        
        # Локальное хранилище ячеек (независимо от spreadsheet модели)
        self.cells: List[List[Cell]] = [
            [Cell(row, col) for col in range(self.columns)] for row in range(self.rows)
        ]
        
        # Модель данных (опционально)
        self.spreadsheet: Optional[Spreadsheet] = None

        # НОВЫЕ: состояния для расширенных функций
        self.frozen_cells = set()  # {(row, col)} замороженные ячейки
        self.hidden_cells = set()  # {(row, col)} скрытые ячейки
        self.split_cells = {}  # {(row, col): 'vertical'/'horizontal'} разделенные ячейки
        self.custom_sizes = {}  # {(row, col): (width, height)} кастомные размеры
        self.merged_cells = {}  # {(row, col): (row_span, col_span)} объединенные ячейки

        # НОВЫЕ: атрибуты для изменения размера мышкой
        self._resizing_cell = None
        self._drag_start_pos = None
        self._original_size = None
        self._is_dragging = False

        # Настройка UI
        self.init_ui()

        # Контекстное меню
        self.setContextMenuPolicy(Qt.CustomContextMenu)
        self.customContextMenuRequested.connect(self.show_context_menu)

        # Подключение сигналов
        self.cellChanged.connect(self.on_cell_changed)
        self.cellClicked.connect(self.on_cell_clicked)
        self.itemSelectionChanged.connect(self.on_selection_changed)

    def init_ui(self):
        """Инициализация интерфейса для 1000×26 таблицы"""
        # Настройка заголовков
        column_labels = []
        for i in range(self.columns):
            label = ""
            n = i
            while n >= 0:
                label = chr(65 + n % 26) + label
                n = n // 26 - 1
                if n < 0:
                    break
            column_labels.append(label)

        # Устанавливаем заголовки для 26 колонок
        self.setHorizontalHeaderLabels(column_labels[:26])

        # Устанавливаем заголовки строк для 1000 строк
        row_labels = [str(i + 1) for i in range(1000)]
        self.setVerticalHeaderLabels(row_labels)

        # Настройка внешнего вида
        self.setAlternatingRowColors(True)
        self.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectItems)
        self.setSelectionMode(QAbstractItemView.SelectionMode.ContiguousSelection)

        # Настройка заголовков
        header = self.horizontalHeader()
        header.setSectionResizeMode(QHeaderView.ResizeMode.Interactive)
        header.setDefaultSectionSize(100)
        header.setMinimumSectionSize(50)

        vertical_header = self.verticalHeader()
        vertical_header.setDefaultSectionSize(34)
        vertical_header.setMinimumSectionSize(20)

        # Настройка сетки
        self.setShowGrid(True)
        self.setGridStyle(Qt.PenStyle.SolidLine)

        # Скрываем corner button полностью
        self._hide_corner_button()

        # Устанавливаем делегат
        class FullCellDelegate(QStyledItemDelegate):
            def createEditor(self, parent, option, index):
                editor = QLineEdit(parent)
                editor.setFrame(False)
                return editor

            def updateEditorGeometry(self, editor, option, index):
                editor.setGeometry(option.rect)

            def paint(self, painter, option, index):
                from PyQt5.QtWidgets import QStyle
                opt = option
                opt.state &= ~QStyle.State_HasFocus
                super().paint(painter, opt, index)

        self.setItemDelegate(FullCellDelegate(self))

    def _hide_corner_button(self):
        """Полностью скрывает corner button"""
        from PyQt5.QtWidgets import QAbstractButton

        # Находим и скрываем кнопку
        for child in self.findChildren(QAbstractButton):
            child.setVisible(False)
            child.setMaximumHeight(0)
            child.setMaximumWidth(0)

    def set_spreadsheet(self, spreadsheet: Spreadsheet):
        """Установка модели таблицы"""
        self.spreadsheet = spreadsheet
        self.refresh_display()

    def get_cell(self, row: int, col: int) -> Optional[Cell]:
        """Получение объекта ячейки из локального хранилища"""
        if 0 <= row < self.rows and 0 <= col < self.columns:
            return self.cells[row][col]
        return None

    def set_cell_value(self, row: int, col: int, value: str):
        """Установка значения ячейки в модели и отображении"""
        # Проверяем, не скрыта ли ячейка
        if (row, col) in self.hidden_cells:
            cell = self.get_cell(row, col)
            if cell:
                cell.set_value(value)
                cell.set_calculated_value(value)
                item = self.item(row, col)
                if item:
                    item.setData(Qt.UserRole + 1, value)  # Сохраняем скрытое значение
            return

        cell = self.get_cell(row, col)
        if not cell:
            return

        old_value = cell.value
        cell.set_value(value)

        # Обновление отображения (только если ячейка видима)
        item = self.item(row, col)
        if item is None:
            item = QTableWidgetItem()
            self.setItem(row, col, item)

        # Проверка на формулу и вычисление
        if value and value.startswith('='):
            try:
                # Вычисляем формулу используя FormulaEngine
                result = self.formula_engine.evaluate(value[1:], self.get_cell_data)
                cell.set_formula(value)
                cell.set_calculated_value(str(result))
                
                self._updating = True
                item.setText(str(result))  # Показываем результат
                self._updating = False
                print(f"DEBUG: Формула {value} = {result}")
            except Exception as e:
                print(f"[WARNING] Ошибка при вычислении формулы '{value}': {e}")
                self._updating = True
                item.setText(f"#ERROR!")
                self._updating = False
                cell.set_calculated_value(f"#ERROR!")
        else:
            # Простое значение без формулы
            self._updating = True
            item.setText(str(value) if value else "")
            self._updating = False
            cell.set_formula(None)
            cell.set_calculated_value(str(value) if value else "")

        # Применение форматирования
        self.apply_cell_formatting(row, col)

        if old_value != value:
            self.data_changed.emit(row, col, value)

    def get_cell_data(self, cell_ref: str) -> Optional[str]:
        """Получение данных ячейки по ссылке (для формул)"""
        # Парсим ссылку типа "A1" в row, col
        row, col = parse_cell_reference(cell_ref)
        if row is not None and col is not None:
            cell = self.get_cell(row, col)
            if cell:
                # Возвращаем вычисленное значение, или обычное значение если это не формула
                return cell.calculated_value or cell.value
        return None

    def apply_cell_formatting(self, row: int, col: int):
        """Применение форматирования к ячейке"""
        cell = self.get_cell(row, col)
        item = self.item(row, col)

        if cell and item:
            # Применение шрифта
            font = QFont()
            font.setFamily(cell.font_family or "Arial")
            font.setBold(bool(cell.bold))
            font.setItalic(bool(cell.italic))
            font.setUnderline(bool(cell.underline))
            if hasattr(cell, 'strike'):
                font.setStrikeOut(bool(cell.strike))
            font.setPointSize(cell.font_size or 11)
            item.setFont(font)

            # Выравнивание
            alignment = Qt.AlignmentFlag.AlignVCenter
            if cell.alignment == 'left':
                alignment |= Qt.AlignmentFlag.AlignLeft
            elif cell.alignment == 'center':
                alignment |= Qt.AlignmentFlag.AlignHCenter
            elif cell.alignment == 'right':
                alignment |= Qt.AlignmentFlag.AlignRight
            item.setTextAlignment(alignment)

            # Цвета - явное преобразование в валидные QColor
            try:
                if cell.text_color and cell.text_color != "#FFFFFF" and cell.text_color != "#000000":
                    text_color = QColor(cell.text_color)
                    if text_color.isValid():
                        item.setForeground(QBrush(text_color))
                        print(f"[DEBUG] Применен text_color ({row},{col}): {cell.text_color}")
                elif cell.text_color:
                    text_color = QColor(cell.text_color)
                    if text_color.isValid():
                        item.setForeground(QBrush(text_color))
                        print(f"[DEBUG] Применен text_color ({row},{col}): {cell.text_color}")
                        
                if cell.background_color and cell.background_color != "#FFFFFF":
                    bg_color = QColor(cell.background_color)
                    if bg_color.isValid():
                        item.setBackground(QBrush(bg_color))
                        print(f"[DEBUG] Применен background_color ({row},{col}): {cell.background_color}")
            except Exception as e:
                print(f"[ERROR] Ошибка при применении цветов ({row},{col}): {e}")


    def refresh_display(self):
        """Обновление отображения на основе модели"""
        if not self.spreadsheet:
            return

        self._updating = True

        # Получаем используемый диапазон
        used_rows, used_cols = self.spreadsheet.get_used_range()

        # Обновляем отображение только для используемых ячеек
        for row in range(min(used_rows, 1000)):  # Ограничиваем 1000 строками
            for col in range(min(used_cols, 26)):  # Ограничиваем 26 колонками
                cell = self.spreadsheet.get_cell(row, col)
                if cell:
                    value = cell.get_display_value() or ""

                    item = self.item(row, col)
                    if item is None:
                        item = QTableWidgetItem()
                        self.setItem(row, col, item)

                    item.setText(str(value))
                    self.apply_cell_formatting(row, col)

        self._updating = False

    def on_cell_changed(self, row: int, col: int):
        """Обработка изменения ячейки"""
        # Пропускаем если это обновление от set_cell_value или refresh_display
        if self._updating:
            return

        item = self.item(row, col)
        if item:
            value = item.text()
            self.set_cell_value(row, col, value)

    def on_cell_clicked(self, row: int, col: int):
        """Обработка клика по ячейке"""
        cell = self.get_cell(row, col)
        if cell:
            value = cell.formula if cell.formula else cell.value
            self.cell_selected.emit(row, col, value or "")

    def on_selection_changed(self):
        """Обработка изменения выделения"""
        # Вычислим и отправим статистику по выделению
        stats = self.calculate_selection_stats()
        self.selection_changed.emit()

    def show_context_menu(self, position: QPoint):
        """Показать расширенное контекстное меню"""
        menu = QMenu(self)

        # Основные действия (оригинальные)
        copy_action = QAction("Копировать", self)
        copy_action.setShortcut(QKeySequence("Ctrl+C"))
        copy_action.triggered.connect(self.copy_selection)
        menu.addAction(copy_action)

        paste_action = QAction("Вставить", self)
        paste_action.setShortcut(QKeySequence("Ctrl+V"))
        paste_action.triggered.connect(self.paste_selection)
        menu.addAction(paste_action)

        cut_action = QAction("Вырезать", self)
        cut_action.setShortcut(QKeySequence("Ctrl+X"))
        cut_action.triggered.connect(self.cut_selection)
        menu.addAction(cut_action)

        menu.addSeparator()
        
        # НОВОЕ: Удаление содержимого
        delete_content_action = QAction("Удалить содержимое", self)
        delete_content_action.triggered.connect(self.delete_content)
        menu.addAction(delete_content_action)
        
        delete_all_action = QAction("Очистить всю таблицу", self)
        delete_all_action.triggered.connect(self.delete_all)
        menu.addAction(delete_all_action)
        
        menu.addSeparator()
        
        # НОВОЕ: Перемещение ячеек
        move_menu = menu.addMenu("Переместить")
        
        move_up_action = QAction("Вверх", self)
        move_up_action.triggered.connect(self.move_cells_up)
        move_menu.addAction(move_up_action)
        
        move_down_action = QAction("Вниз", self)
        move_down_action.triggered.connect(self.move_cells_down)
        move_menu.addAction(move_down_action)
        
        move_left_action = QAction("Влево", self)
        move_left_action.triggered.connect(self.move_cells_left)
        move_menu.addAction(move_left_action)
        
        move_right_action = QAction("Вправо", self)
        move_right_action.triggered.connect(self.move_cells_right)
        move_menu.addAction(move_right_action)

        menu.addSeparator()

        # НОВОЕ: Автокорректировка
        auto_adjust_menu = menu.addMenu("Автокорректировка")

        auto_adjust_cell_action = QAction("Подогнать выделенные ячейки", self)
        auto_adjust_cell_action.triggered.connect(self.auto_adjust_selection)
        auto_adjust_menu.addAction(auto_adjust_cell_action)

        auto_fit_col_action = QAction("Автоподгонка колонки", self)
        current_col = self.columnAt(position.x())
        auto_fit_col_action.triggered.connect(lambda: self.auto_fit_column(current_col))
        auto_adjust_menu.addAction(auto_fit_col_action)

        auto_fit_row_action = QAction("Автоподгонка строки", self)
        current_row = self.rowAt(position.y())
        auto_fit_row_action.triggered.connect(lambda: self.auto_fit_row(current_row))
        auto_adjust_menu.addAction(auto_fit_row_action)

        # НОВОЕ: Разделение ячеек
        split_menu = menu.addMenu("Разделить ячейку")

        split_vertical_action = QAction("Вертикально (Ctrl+Shift+V)", self)
        split_vertical_action.setShortcut(QKeySequence("Ctrl+Shift+V"))
        split_vertical_action.triggered.connect(
            lambda: self.split_selected_cell('vertical')
        )
        split_menu.addAction(split_vertical_action)

        split_horizontal_action = QAction("Горизонтально (Ctrl+Shift+H)", self)
        split_horizontal_action.setShortcut(QKeySequence("Ctrl+Shift+H"))
        split_horizontal_action.triggered.connect(
            lambda: self.split_selected_cell('horizontal')
        )
        split_menu.addAction(split_horizontal_action)

        split_menu.addSeparator()

        unsplit_action = QAction("Убрать разделение", self)
        unsplit_action.triggered.connect(self.unsplit_selected_cell)
        split_menu.addAction(unsplit_action)

        # НОВОЕ: Заморозка
        freeze_menu = menu.addMenu("Заморозить")

        freeze_action = QAction("Заморозить (Ctrl+F)", self)
        freeze_action.setShortcut(QKeySequence("Ctrl+F"))
        freeze_action.triggered.connect(self.freeze_selection)
        freeze_menu.addAction(freeze_action)

        unfreeze_action = QAction("Разморозить (Ctrl+Shift+F)", self)
        unfreeze_action.setShortcut(QKeySequence("Ctrl+Shift+F"))
        unfreeze_action.triggered.connect(self.unfreeze_selection)
        freeze_menu.addAction(unfreeze_action)

        # НОВОЕ: Скрытие
        hide_menu = menu.addMenu("Скрыть/Показать")

        hide_action = QAction("Скрыть выделение (Ctrl+H)", self)
        hide_action.setShortcut(QKeySequence("Ctrl+H"))
        hide_action.triggered.connect(self.hide_selection)
        hide_menu.addAction(hide_action)

        show_action = QAction("Показать выделение (Ctrl+Shift+H)", self)
        show_action.setShortcut(QKeySequence("Ctrl+Shift+H"))
        show_action.triggered.connect(self.show_selection)
        hide_menu.addAction(show_action)

        menu.addSeparator()

        # Оригинальные пункты меню
        format_menu = menu.addMenu("Форматирование")

        bold_action = QAction("Жирный", self)
        bold_action.setCheckable(True)
        bold_action.triggered.connect(lambda: self.apply_format('bold', None))
        format_menu.addAction(bold_action)

        italic_action = QAction("Курсив", self)
        italic_action.setCheckable(True)
        italic_action.triggered.connect(lambda: self.apply_format('italic', None))
        format_menu.addAction(italic_action)

        underline_action = QAction("Подчеркнутый", self)
        underline_action.setCheckable(True)
        underline_action.triggered.connect(lambda: self.apply_format('underline', None))
        format_menu.addAction(underline_action)

        strike_action = QAction("Перечеркнутый", self)
        strike_action.setCheckable(True)
        strike_action.triggered.connect(lambda: self.apply_format('strike', None))
        format_menu.addAction(strike_action)

        format_menu.addSeparator()

        text_color_action = QAction("Цвет текста...", self)
        text_color_action.triggered.connect(lambda: self.apply_format('text_color', None))
        format_menu.addAction(text_color_action)

        bg_color_action = QAction("Цвет фона...", self)
        bg_color_action.triggered.connect(lambda: self.apply_format('bg_color', None))
        format_menu.addAction(bg_color_action)

        format_menu.addSeparator()

        # Размер шрифта
        font_size_menu = format_menu.addMenu("Размер шрифта")
        for size in [8, 9, 10, 11, 12, 14, 16, 18, 20, 24]:
            size_action = QAction(str(size), self)
            size_action.triggered.connect(lambda checked, s=size: self.apply_format('font_size', s))
            font_size_menu.addAction(size_action)

        # Выравнивание
        align_menu = format_menu.addMenu("Выравнивание")
        align_left_action = QAction("По левому краю", self)
        align_left_action.triggered.connect(lambda: self.apply_format('alignment', 'left'))
        align_menu.addAction(align_left_action)
        align_center_action = QAction("По центру", self)
        align_center_action.triggered.connect(lambda: self.apply_format('alignment', 'center'))
        align_menu.addAction(align_center_action)
        align_right_action = QAction("По правому краю", self)
        align_right_action.triggered.connect(lambda: self.apply_format('alignment', 'right'))
        align_menu.addAction(align_right_action)

        format_menu.addSeparator()

        clear_format_action = QAction("Сбросить форматирование", self)
        clear_format_action.triggered.connect(lambda: self.apply_format('clear_format', True))
        format_menu.addAction(clear_format_action)

        menu.addSeparator()

        # Вставка/удаление строк
        insert_row_action = QAction("Вставить строку", self)
        insert_row_action.triggered.connect(self.insert_row)
        menu.addAction(insert_row_action)

        delete_row_action = QAction("Удалить строку", self)
        delete_row_action.triggered.connect(self.delete_row)
        menu.addAction(delete_row_action)

        # Сортировка
        sort_action = QAction("Сортировка...", self)
        sort_action.triggered.connect(self.open_sort_dialog)
        menu.addAction(sort_action)

        # НОВОЕ: Сброс размеров
        menu.addSeparator()
        reset_sizes_action = QAction("Сбросить кастомные размеры", self)
        reset_sizes_action.triggered.connect(self.reset_custom_sizes)
        menu.addAction(reset_sizes_action)

        menu.exec(self.viewport().mapToGlobal(position))

    # ============= НОВЫЕ ФУНКЦИИ =============

    # 1. АВТОКОРРЕКТИРОВКА РАЗМЕРА ЯЧЕЙКИ
    def auto_adjust_cell(self, row: int, col: int, include_font: bool = True) -> bool:
        """
        Автоматическая корректировка размера ячейки под текст

        Args:
            row: Номер строки
            col: Номер колонки
            include_font: Учитывать размер шрифта при расчете

        Returns:
            True если размер был изменен
        """
        item = self.item(row, col)
        if not item:
            return False

        cell = self.get_cell(row, col)
        if not cell:
            return False

        text = item.text()
        if not text:
            return False

        # Используем текущий шрифт ячейки
        font = item.font() if include_font else QFont()
        fm = self.fontMetrics()
        fm.setFont(font)

        # Рассчитываем ширину
        text_width = fm.horizontalAdvance(text)
        padding = 15  # Отступы
        needed_width = text_width + padding

        # Проверяем многострочный текст
        current_height = self.rowHeight(row)
        if '\n' in text:
            lines = text.split('\n')
            max_line_width = max(fm.horizontalAdvance(line) for line in lines)
            needed_width = max_line_width + padding

            # Рассчитываем нужную высоту
            line_height = fm.height()
            line_spacing = 4
            needed_height = line_height * len(lines) + line_spacing * (len(lines) - 1) + 10

            # Устанавливаем новую высоту если нужно
            if needed_height > current_height:
                self.setRowHeight(row, needed_height)
                self.custom_sizes[(row, col)] = (self.columnWidth(col), needed_height)

        # Устанавливаем новую ширину если нужно
        current_width = self.columnWidth(col)
        if needed_width > current_width:
            new_width = min(needed_width, 500)  # Максимум 500px
            self.setColumnWidth(col, new_width)
            if (row, col) in self.custom_sizes:
                w, h = self.custom_sizes[(row, col)]
                self.custom_sizes[(row, col)] = (new_width, h)
            else:
                self.custom_sizes[(row, col)] = (new_width, current_height)

        self.auto_correction_applied.emit(row, col)
        return True

    def auto_adjust_selection(self):
        """Автокорректировка всех выделенных ячеек"""
        changed = False
        for item in self.selectedItems():
            if self.auto_adjust_cell(item.row(), item.column()):
                changed = True

        if changed:
            self.format_changed.emit()

    def auto_fit_column(self, col_index: int):
        """Автоподгонка ширины колонки под содержимое"""
        if col_index < 0 or col_index >= self.columnCount():
            return

        max_width = 50  # Минимальная ширина
        for row in range(self.rowCount()):
            item = self.item(row, col_index)
            if item and item.text():
                font = item.font()
                fm = self.fontMetrics()
                fm.setFont(font)
                text_width = fm.horizontalAdvance(item.text()) + 20
                max_width = max(max_width, text_width)

        # Устанавливаем новую ширину с ограничением
        new_width = min(max_width, 400)
        self.setColumnWidth(col_index, new_width)

        # Обновляем кастомные размеры для ячеек в этой колонке
        for row in range(self.rowCount()):
            if (row, col_index) in self.custom_sizes:
                _, height = self.custom_sizes[(row, col_index)]
                self.custom_sizes[(row, col_index)] = (new_width, height)

    def auto_fit_row(self, row_index: int):
        """Автоподгонка высоты строки под содержимое"""
        if row_index < 0 or row_index >= self.rowCount():
            return

        max_height = 20  # Минимальная высота
        for col in range(self.columnCount()):
            item = self.item(row_index, col)
            if item and item.text():
                text = item.text()
                if '\n' in text:
                    lines = text.split('\n')
                    font = item.font()
                    fm = self.fontMetrics()
                    fm.setFont(font)
                    line_height = fm.height()
                    line_spacing = 4
                    text_height = line_height * len(lines) + line_spacing * (len(lines) - 1) + 10
                    max_height = max(max_height, text_height)

        # Устанавливаем новую высоту с ограничением
        new_height = min(max_height, 300)
        self.setRowHeight(row_index, new_height)

        # Обновляем кастомные размеры для ячеек в этой строке
        for col in range(self.columnCount()):
            if (row_index, col) in self.custom_sizes:
                width, _ = self.custom_sizes[(row_index, col)]
                self.custom_sizes[(row_index, col)] = (width, new_height)

    # 2. РАСТЯГИВАНИЕ ЯЧЕЙКИ МЫШКОЮ
    def mousePressEvent(self, event: QMouseEvent):
        """Обработка нажатия мыши для изменения размера ячеек"""
        pos = event.pos()

        # Проверяем, не на границе ли ячейки для изменения размера
        if event.button() == Qt.LeftButton:
            row = self.rowAt(pos.y())
            col = self.columnAt(pos.x())

            if row >= 0 and col >= 0:
                rect = self.visualRect(self.model().index(row, col))
                resize_margin = 8  # Отступ для захвата границы

                # Проверяем близость к правой границе
                near_right_edge = abs(pos.x() - (rect.x() + rect.width())) < resize_margin
                # Проверяем близость к нижней границе
                near_bottom_edge = abs(pos.y() - (rect.y() + rect.height())) < resize_margin

                if near_right_edge or near_bottom_edge:
                    self._resizing_cell = (row, col)
                    self._drag_start_pos = pos
                    self._original_size = (self.columnWidth(col), self.rowHeight(row))
                    self._is_dragging = True

                    # Устанавливаем соответствующий курсор
                    if near_right_edge and near_bottom_edge:
                        self.setCursor(Qt.SizeFDiagCursor)
                    elif near_right_edge:
                        self.setCursor(Qt.SizeHorCursor)
                    elif near_bottom_edge:
                        self.setCursor(Qt.SizeVerCursor)

                    event.accept()
                    return

        super().mousePressEvent(event)

    def mouseMoveEvent(self, event: QMouseEvent):
        """Обработка движения мыши"""
        pos = event.pos()

        if self._is_dragging and self._resizing_cell:
            # Изменение размера ячейки
            row, col = self._resizing_cell
            dx = pos.x() - self._drag_start_pos.x()
            dy = pos.y() - self._drag_start_pos.y()

            new_width = max(30, self._original_size[0] + dx)
            new_height = max(15, self._original_size[1] + dy)

            # Определяем, какое измерение изменяем
            rect = self.visualRect(self.model().index(row, col))
            near_right = abs(pos.x() - (rect.x() + rect.width())) < 20
            near_bottom = abs(pos.y() - (rect.y() + rect.height())) < 20

            if near_right:
                self.setColumnWidth(col, new_width)
            if near_bottom:
                self.setRowHeight(row, new_height)

            # Сохраняем кастомный размер
            current_width = self.columnWidth(col)
            current_height = self.rowHeight(row)
            self.custom_sizes[(row, col)] = (current_width, current_height)

        else:
            # Проверяем, не на границе ли курсор
            row = self.rowAt(pos.y())
            col = self.columnAt(pos.x())

            if row >= 0 and col >= 0:
                rect = self.visualRect(self.model().index(row, col))
                resize_margin = 8

                near_right = abs(pos.x() - (rect.x() + rect.width())) < resize_margin
                near_bottom = abs(pos.y() - (rect.y() + rect.height())) < resize_margin

                if near_right and near_bottom:
                    self.setCursor(Qt.SizeFDiagCursor)
                elif near_right:
                    self.setCursor(Qt.SizeHorCursor)
                elif near_bottom:
                    self.setCursor(Qt.SizeVerCursor)
                else:
                    self.setCursor(Qt.ArrowCursor)

        super().mouseMoveEvent(event)

    def mouseReleaseEvent(self, event: QMouseEvent):
        """Обработка отпускания мыши"""
        if self._is_dragging and self._resizing_cell:
            row, col = self._resizing_cell
            self.cell_resized.emit(row, col, self.columnWidth(col), self.rowHeight(row))

            # Сбрасываем состояние
            self._resizing_cell = None
            self._drag_start_pos = None
            self._original_size = None
            self._is_dragging = False
            self.setCursor(Qt.ArrowCursor)

        super().mouseReleaseEvent(event)

    # 3. ДЕЛЕНИЕ ЯЧЕЙКИ НА 2
    def split_cell(self, row: int, col: int, split_type: str = 'vertical'):
        """
        Деление ячейки на 2 части

        Args:
            row: Номер строки
            col: Номер колонки
            split_type: 'vertical' или 'horizontal'
        """
        # Проверяем, не разделена ли уже ячейка
        if (row, col) in self.split_cells:
            QMessageBox.information(self, "Информация", "Ячейка уже разделена")
            return

        # Проверяем границы
        if split_type == 'vertical' and col >= self.columns - 1:
            QMessageBox.warning(self, "Ошибка", "Недостаточно колонок для вертикального разделения")
            return
        elif split_type == 'horizontal' and row >= self.rows - 1:
            QMessageBox.warning(self, "Ошибка", "Недостаточно строк для горизонтального разделения")
            return

        # Сохраняем текущее значение
        cell = self.get_cell(row, col)
        original_value = cell.get_display_value() if cell else ""

        # Добавляем в список разделенных ячеек
        self.split_cells[(row, col)] = split_type

        # Создаем объединение ячеек для визуального эффекта
        if split_type == 'vertical':
            # Объединяем текущую и следующую ячейку по горизонтали
            self.setSpan(row, col, 1, 2)
            # Разделяем значение (первая часть - оригинал, вторая - пустая)
            if col + 1 < self.columns:
                # Создаем вторую ячейку если нужно
                if not self.item(row, col + 1):
                    item = QTableWidgetItem("")
                    self.setItem(row, col + 1, item)
        else:  # horizontal
            # Объединяем текущую и следующую ячейку по вертикали
            self.setSpan(row, col, 2, 1)
            if row + 1 < self.rows:
                if not self.item(row + 1, col):
                    item = QTableWidgetItem("")
                    self.setItem(row + 1, col, item)

        self.cell_split.emit(row, col, split_type)
        self.viewport().update()

    def unsplit_cell(self, row: int, col: int):
        """Убрать разделение ячейки"""
        if (row, col) not in self.split_cells:
            return

        split_type = self.split_cells[(row, col)]

        # Убираем объединение
        self.setSpan(row, col, 1, 1)

        # Удаляем из списка разделенных
        del self.split_cells[(row, col)]

        # Восстанавливаем независимые ячейки
        if split_type == 'vertical' and col + 1 < self.columns:
            # Очищаем вторую ячейку
            item = self.item(row, col + 1)
            if item:
                item.setText("")
        elif split_type == 'horizontal' and row + 1 < self.rows:
            item = self.item(row + 1, col)
            if item:
                item.setText("")

        self.viewport().update()

    # 4. ЗАМОРАЖИВАНИЕ ЯЧЕЙКИ
    def freeze_cell(self, row: int, col: int, freeze: bool = True):
        """
        Заморозить/разморозить ячейку

        Args:
            row: Номер строки
            col: Номер колонки
            freeze: True - заморозить, False - разморозить
        """
        cell = self.get_cell(row, col)
        if not cell:
            return

        item = self.item(row, col)
        if not item:
            return

        if freeze:
            # Добавляем в замороженные
            self.frozen_cells.add((row, col))
            # Делаем read-only
            item.setFlags(item.flags() & ~Qt.ItemIsEditable)
            # Применяем специальное форматирование
            if cell:
                cell.bold = True
                cell.background_color = "#F0F8FF"  # AliceBlue
        else:
            # Убираем из замороженных
            self.frozen_cells.discard((row, col))
            # Разрешаем редактирование
            item.setFlags(item.flags() | Qt.ItemIsEditable)
            # Сбрасываем специальное форматирование
            if cell:
                cell.bold = False
                cell.background_color = "#FFFFFF"

        self.apply_cell_formatting(row, col)
        self.cell_frozen.emit(row, col, freeze)

    def freeze_selection(self):
        """Заморозить выделенные ячейки"""
        for item in self.selectedItems():
            self.freeze_cell(item.row(), item.column(), True)

    def unfreeze_selection(self):
        """Разморозить выделенные ячейки"""
        for item in self.selectedItems():
            self.freeze_cell(item.row(), item.column(), False)

    # 5. СКРЫТИЕ ЯЧЕЙКИ
    def hide_cell(self, row: int, col: int, hide: bool = True):
        """
        Скрыть/показать ячейку

        Args:
            row: Номер строки
            col: Номер колонки
            hide: True - скрыть, False - показать
        """
        item = self.item(row, col)
        if not item:
            return

        cell = self.get_cell(row, col)
        if not cell:
            return

        if hide:
            # Добавляем в скрытые
            self.hidden_cells.add((row, col))
            # Сохраняем значение
            hidden_value = item.text()
            item.setData(Qt.UserRole + 1, hidden_value)  # Сохраняем скрытое значение
            item.setText("")  # Очищаем отображение
            # Меняем фон для индикации
            cell.background_color = "#E0E0E0"
        else:
            # Убираем из скрытых
            self.hidden_cells.discard((row, col))
            # Восстанавливаем значение
            hidden_value = item.data(Qt.UserRole + 1)
            if hidden_value:
                item.setText(str(hidden_value))
                cell.set_value(str(hidden_value))
            # Восстанавливаем фон
            cell.background_color = "#FFFFFF"

        self.apply_cell_formatting(row, col)
        self.cell_hidden.emit(row, col, hide)

    def hide_selection(self):
        """Скрыть выделенные ячейки"""
        for item in self.selectedItems():
            self.hide_cell(item.row(), item.column(), True)

    def show_selection(self):
        """Показать скрытые ячейки в выделении"""
        for item in self.selectedItems():
            self.hide_cell(item.row(), item.column(), False)

    def split_selected_cell(self, split_type: str):
        """Разделить текущую ячейку"""
        current = self.currentItem()
        if current:
            self.split_cell(current.row(), current.column(), split_type)

    def unsplit_selected_cell(self):
        """Убрать разделение текущей ячейки"""
        current = self.currentItem()
        if current:
            self.unsplit_cell(current.row(), current.column())

    def reset_custom_sizes(self):
        """Сбросить все кастомные размеры"""
        self.custom_sizes.clear()

        # Восстанавливаем стандартные размеры
        for col in range(self.columnCount()):
            self.setColumnWidth(col, 100)

        for row in range(self.rowCount()):
            self.setRowHeight(row, 25)

        self.viewport().update()

    # 7. ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ
    def get_cell_state(self, row: int, col: int) -> Dict[str, Any]:
        """Получить полное состояние ячейки"""
        state = {
            'frozen': (row, col) in self.frozen_cells,
            'hidden': (row, col) in self.hidden_cells,
            'split': self.split_cells.get((row, col)),
            'custom_size': self.custom_sizes.get((row, col)),
            'has_custom_size': (row, col) in self.custom_sizes,
            'row_height': self.rowHeight(row),
            'col_width': self.columnWidth(col)
        }

        if self.spreadsheet:
            cell = self.spreadsheet.get_cell(row, col)
            if cell:
                state['value'] = cell.get_display_value()
                state['formula'] = cell.formula

        return state

    def save_cell_states(self) -> Dict[str, Any]:
        """Сохранить состояния всех ячеек"""
        states = {
            'frozen_cells': list(self.frozen_cells),
            'hidden_cells': list(self.hidden_cells),
            'split_cells': {f"{row},{col}": split_type
                           for (row, col), split_type in self.split_cells.items()},
            'custom_sizes': {f"{row},{col}": size
                           for (row, col), size in self.custom_sizes.items()}
        }

        return states

    def load_cell_states(self, states: Dict[str, Any]):
        """Загрузить состояния ячеек"""
        # Замороженные ячейки
        for cell_str in states.get('frozen_cells', []):
            if isinstance(cell_str, tuple) and len(cell_str) == 2:
                self.freeze_cell(cell_str[0], cell_str[1], True)
            elif isinstance(cell_str, str):
                try:
                    row, col = map(int, cell_str.split(','))
                    self.freeze_cell(row, col, True)
                except:
                    pass

        # Скрытые ячейки
        for cell_str in states.get('hidden_cells', []):
            if isinstance(cell_str, tuple) and len(cell_str) == 2:
                self.hide_cell(cell_str[0], cell_str[1], True)
            elif isinstance(cell_str, str):
                try:
                    row, col = map(int, cell_str.split(','))
                    self.hide_cell(row, col, True)
                except:
                    pass

        # Разделенные ячейки
        for cell_str, split_type in states.get('split_cells', {}).items():
            try:
                row, col = map(int, cell_str.split(','))
                self.split_cells[(row, col)] = split_type

                # Восстанавливаем объединение
                if split_type == 'vertical':
                    self.setSpan(row, col, 1, 2)
                else:
                    self.setSpan(row, col, 2, 1)
            except:
                pass

        # Кастомные размеры
        for cell_str, size in states.get('custom_sizes', {}).items():
            try:
                row, col = map(int, cell_str.split(','))
                if isinstance(size, (list, tuple)) and len(size) == 2:
                    width, height = size
                    self.custom_sizes[(row, col)] = (width, height)

                    # Применяем размеры
                    if col < self.columnCount():
                        self.setColumnWidth(col, width)
                    if row < self.rowCount():
                        self.setRowHeight(row, height)
            except:
                pass

    # 8. ОРИГИНАЛЬНЫЕ МЕТОДЫ
    def add_ai_data(self, data: List[List[str]], start_row: int = 0, start_col: int = 0) -> bool:
        """Добавить данные от AI"""
        try:
            for row_idx, row in enumerate(data):
                actual_row = start_row + row_idx
                if actual_row >= self.rows:
                    break
                for col_idx, value in enumerate(row):
                    actual_col = start_col + col_idx
                    if actual_col >= self.columns:
                        break
                    self.set_cell_value(actual_row, actual_col, str(value))
            return True
        except Exception as e:
            print(f"[ERROR] Failed to add AI data: {e}")
            return False

    def open_sort_dialog(self):
        """Открывает диалог сортировки и применяет выбранные опции"""
        from pysheets.src.ui.dialogs.sort_dialog import SortDialog
        selected = self.selectedRanges()
        if selected:
            rng = selected[0]
            start_col = rng.leftColumn()
            end_col = rng.rightColumn()
            # Собираем метки колонок (буквы)
            cols = [chr(65 + c) for c in range(start_col, end_col + 1)]
        else:
            # Если нет выделения, используем все колонки виджета
            cols = [chr(65 + c) for c in range(self.columns)]

        dlg = SortDialog(cols, self)
        if dlg.exec_() != QDialog.Accepted:
            return
        cfg = dlg.get_sort_config()
        # Применяем сортировку
        self.apply_sort(cfg, selected[0] if selected else None)

    def apply_sort(self, cfg: dict, range_obj=None):
        """Применяет сортировку к диапазону или ко всему листу."""
        import math

        if range_obj:
            top = range_obj.topRow()
            bottom = range_obj.bottomRow()
            left = range_obj.leftColumn()
            right = range_obj.rightColumn()
        else:
            top, bottom, left, right = 0, self.rows - 1, 0, self.columns - 1

        # Определяем стартовую строку данных (если есть заголовок в выделении)
        data_top = top + 1 if cfg.get('has_header', False) else top

        # Считываем строки в виде списка списков
        rows = []
        for r in range(data_top, bottom + 1):
            row_vals = []
            for c in range(left, right + 1):
                cell = self.get_cell(r, c)
                val = cell.get_display_value() if cell else ''
                row_vals.append(val)
            rows.append((r, row_vals))

        if not rows:
            return

        # Вспомогательная функция для преобразования по типу
        def convert_value(v, typ):
            if v is None or v == '':
                return None
            s = str(v)
            if typ == 'Numeric':
                try:
                    return float(s.replace(',', '.'))
                except:
                    return math.nan
            elif typ == 'Date':
                from datetime import datetime
                for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%Y/%m/%d"):
                    try:
                        return datetime.strptime(s, fmt)
                    except:
                        continue
                return s
            else:
                return s.lower()

        # Сортируем по уровням
        levels = cfg.get('levels', [])
        for level in reversed(levels):
            col_idx = left + int(level.get('column', 0))
            typ = level.get('type', 'Automatic')
            order = level.get('order', 'ASC')

            def key_fn(item):
                _, rowvals = item
                rel_idx = col_idx - left
                if rel_idx < 0 or rel_idx >= len(rowvals):
                    return None
                v = rowvals[rel_idx]
                if typ == 'Automatic':
                    try:
                        return float(str(v).replace(',', '.'))
                    except:
                        return str(v).lower()
                return convert_value(v, typ)

            reverse = True if order == 'DESC' else False
            try:
                rows.sort(key=key_fn, reverse=reverse)
            except TypeError:
                rows.sort(key=lambda it: str(key_fn(it)), reverse=reverse)

        # Записываем отсортированные значения обратно
        for i, (orig_r, rowvals) in enumerate(rows):
            target_r = data_top + i
            for j, v in enumerate(rowvals):
                col = left + j
                # Устанавливаем значение
                item = self.item(target_r, col)
                if not item:
                    item = QTableWidgetItem()
                    self.setItem(target_r, col, item)
                self._updating = True
                item.setText(str(v))
                self._updating = False
                # Обновляем модель
                if self.spreadsheet:
                    self.spreadsheet.set_cell_value(target_r, col, str(v))
                self.apply_cell_formatting(target_r, col)

    def get_selection_range(self) -> str:
        """Получить строку диапазона выделенных ячеек (например A1:C5)"""
        selected = self.selectedRanges()
        if selected:
            range_obj = selected[0]
            start_row = range_obj.topRow()
            end_row = range_obj.bottomRow()
            start_col = range_obj.leftColumn()
            end_col = range_obj.rightColumn()

            start_cell = f"{chr(65 + start_col)}{start_row + 1}"
            end_cell = f"{chr(65 + end_col)}{end_row + 1}"

            if start_cell == end_cell:
                return start_cell
            return f"{start_cell}:{end_cell}"
        return ""

    def copy_selection(self):
        """Копирование выделения"""
        selected = self.selectedRanges()
        if selected:
            # Реализация копирования
            pass

    def paste_selection(self):
        """Вставка из буфера"""
        # Реализация вставки
        pass

    def cut_selection(self):
        """Вырезание выделения"""
        self.copy_selection()
        self.clear_selection()

    def clear_selection(self):
        """Очистка выделенных ячеек"""
        for item in self.selectedItems():
            item.setText("")

    def toggle_bold(self):
        """Переключение жирного шрифта"""
        for item in self.selectedItems():
            row = item.row()
            col = item.column()
            cell = self.get_cell(row, col)
            if cell:
                cell.bold = not cell.bold
                self.apply_cell_formatting(row, col)

    def toggle_italic(self):
        """Переключение курсива"""
        for item in self.selectedItems():
            row = item.row()
            col = item.column()
            cell = self.get_cell(row, col)
            if cell:
                cell.italic = not cell.italic
                self.apply_cell_formatting(row, col)

    def change_text_color(self):
        """Изменение цвета текста"""
        dlg = QColorDialog(self)
        app = QApplication.instance()
        if app and app.styleSheet():
            dlg.setStyleSheet(app.styleSheet())
        if dlg.exec_() == QDialog.Accepted:
            color = dlg.currentColor()
            if color.isValid():
                for item in self.selectedItems():
                    row = item.row()
                    col = item.column()
                    cell = self.get_cell(row, col)
                    if cell:
                        cell.text_color = color.name()
                        self.apply_cell_formatting(row, col)

    def change_bg_color(self):
        """Изменение цвета фона"""
        dlg = QColorDialog(self)
        app = QApplication.instance()
        if app and app.styleSheet():
            dlg.setStyleSheet(app.styleSheet())
        if dlg.exec_() == QDialog.Accepted:
            color = dlg.currentColor()
            if color.isValid():
                for item in self.selectedItems():
                    row = item.row()
                    col = item.column()
                    cell = self.get_cell(row, col)
                    if cell:
                        cell.background_color = color.name()
                        self.apply_cell_formatting(row, col)

    def insert_row(self):
        """Вставка строки"""
        selected = self.selectedRanges()
        if selected:
            row = selected[0].topRow()
            self.insertRow(row)
            self.rows += 1
            # Обновляем модель если есть
            if self.spreadsheet:
                # Добавляем строку в модель
                self.spreadsheet.rows += 1
                self.spreadsheet.cells.insert(row, [None for _ in range(self.spreadsheet.columns)])

    def delete_row(self):
        """Удаление строки"""
        selected = self.selectedRanges()
        if selected:
            row = selected[0].topRow()
            self.removeRow(row)
            self.rows -= 1
            # Обновляем модель если есть
            if self.spreadsheet:
                if row < len(self.spreadsheet.cells):
                    self.spreadsheet.cells.pop(row)
                    self.spreadsheet.rows -= 1

    def delete_content(self):
        """Удаление содержимого выделенных ячеек"""
        selected = self.selectedRanges()
        if selected:
            for range in selected:
                for row in range(range.topRow(), range.bottomRow() + 1):
                    for col in range(range.leftColumn(), range.rightColumn() + 1):
                        item = self.item(row, col)
                        if item:
                            item.setText("")
                            # Очищаем значение в модели
                            if self.spreadsheet and row < len(self.spreadsheet.cells):
                                if col < len(self.spreadsheet.cells[row]):
                                    self.spreadsheet.cells[row][col].value = ""
                                    self.spreadsheet.cells[row][col].formula = None
    
    def delete_all(self):
        """Очистить всю таблицу"""
        from PyQt5.QtWidgets import QMessageBox
        
        reply = QMessageBox.warning(
            self,
            "Очистить таблицу",
            "Вы уверены, что хотите очистить всю таблицу?\nЭто действие невозможно отменить!",
            QMessageBox.Yes | QMessageBox.No,
            QMessageBox.No
        )
        
        if reply == QMessageBox.Yes:
            # Очищаем все ячейки
            for row in range(self.rowCount()):
                for col in range(self.columnCount()):
                    item = self.item(row, col)
                    if item:
                        item.setText("")
                    # Очищаем в модели
                    if self.spreadsheet and row < len(self.spreadsheet.cells):
                        if col < len(self.spreadsheet.cells[row]):
                            self.spreadsheet.cells[row][col].value = ""
                            self.spreadsheet.cells[row][col].formula = None

    def move_cells_up(self):
        """Переместить выделённые ячейки вверх"""
        selected = self.selectedRanges()
        if selected and selected[0].topRow() > 0:
            range_obj = selected[0]
            self._move_cells_vertical(range_obj, -1)

    def move_cells_down(self):
        """Переместить выделённые ячейки вниз"""
        selected = self.selectedRanges()
        if selected and selected[0].bottomRow() < self.rowCount() - 1:
            range_obj = selected[0]
            self._move_cells_vertical(range_obj, 1)

    def move_cells_left(self):
        """Переместить выделённые ячейки влево"""
        selected = self.selectedRanges()
        if selected and selected[0].leftColumn() > 0:
            range_obj = selected[0]
            self._move_cells_horizontal(range_obj, -1)

    def move_cells_right(self):
        """Переместить выделённые ячейки вправо"""
        selected = self.selectedRanges()
        if selected and selected[0].rightColumn() < self.columnCount() - 1:
            range_obj = selected[0]
            self._move_cells_horizontal(range_obj, 1)

    def _move_cells_vertical(self, range_obj, direction: int):
        """Вспомогательная функция для вертикального перемещения"""
        start_row = range_obj.topRow()
        end_row = range_obj.bottomRow()
        start_col = range_obj.leftColumn()
        end_col = range_obj.rightColumn()
        
        new_start_row = start_row + direction
        new_end_row = end_row + direction
        
        # Копируем данные в новые позиции
        for row in range(start_row, end_row + 1):
            new_row = row + direction
            for col in range(start_col, end_col + 1):
                # Копируем из старой позиции в новую
                old_item = self.item(row, col)
                new_item = self.item(new_row, col)
                if old_item and new_item:
                    new_item.setText(old_item.text())
                # Копируем из модели тоже
                old_cell = self.get_cell(row, col)
                new_cell = self.get_cell(new_row, col)
                if old_cell and new_cell:
                    new_cell.value = old_cell.value
                    new_cell.formula = old_cell.formula
                    new_cell.bold = old_cell.bold
                    new_cell.italic = old_cell.italic
        
        # Очищаем старые позиции
        for col in range(start_col, end_col + 1):
            item = self.item(start_row, col) if direction > 0 else self.item(end_row, col)
            if item:
                item.setText("")

    def _move_cells_horizontal(self, range_obj, direction: int):
        """Вспомогательная функция для горизонтального перемещения"""
        start_row = range_obj.topRow()
        end_row = range_obj.bottomRow()
        start_col = range_obj.leftColumn()
        end_col = range_obj.rightColumn()
        
        new_start_col = start_col + direction
        new_end_col = end_col + direction
        
        # Копируем данные в новые позиции
        for row in range(start_row, end_row + 1):
            for col in range(start_col, end_col + 1):
                new_col = col + direction
                # Копируем из старой позиции в новую
                old_item = self.item(row, col)
                new_item = self.item(row, new_col)
                if old_item and new_item:
                    new_item.setText(old_item.text())
                # Копируем из модели тоже
                old_cell = self.get_cell(row, col)
                new_cell = self.get_cell(row, new_col)
                if old_cell and new_cell:
                    new_cell.value = old_cell.value
                    new_cell.formula = old_cell.formula
                    new_cell.bold = old_cell.bold
                    new_cell.italic = old_cell.italic
        
        # Очищаем старые позиции
        for row in range(start_row, end_row + 1):
            col = start_col if direction > 0 else end_col
            item = self.item(row, col)
            if item:
                item.setText("")

    def set_current_cell_formula(self, formula: str):
        """Установка формулы для текущей ячейки"""
        current = self.currentItem()
        if current:
            self.set_cell_value(current.row(), current.column(), formula)

    def calculate_formulas(self):
        """Пересчет всех формул в модели"""
        if self.spreadsheet:
            self.spreadsheet.calculate_formulas()
            self.refresh_display()

    def get_selected_cells_range(self) -> str:
        """Получить диапазон выделенных ячеек"""
        selected = self.selectedRanges()
        if selected:
            range_obj = selected[0]
            start_row = range_obj.topRow()
            start_col = range_obj.leftColumn()
            end_row = range_obj.bottomRow()
            end_col = range_obj.rightColumn()

            start_cell = f"{chr(65 + start_col)}{start_row + 1}"
            end_cell = f"{chr(65 + end_col)}{end_row + 1}"

            if start_cell == end_cell:
                return start_cell
            else:
                return f"{start_cell}:{end_cell}"
        return ""

    def calculate_selection_stats(self) -> dict:
        """Вычислить статистику по выделению (SUM, AVERAGE, COUNT)"""
        stats = {
            'sum': 0,
            'average': 0,
            'count': 0,
            'min': 0,
            'max': 0
        }

        values = []
        selected = self.selectedRanges()

        if not selected:
            return stats

        # Собрать все значения из выделения
        for range_obj in selected:
            for row in range(range_obj.topRow(), range_obj.bottomRow() + 1):
                for col in range(range_obj.leftColumn(), range_obj.rightColumn() + 1):
                    cell = self.get_cell(row, col)
                    if cell:
                        value = cell.get_display_value()
                        if value:
                            try:
                                num_value = float(str(value).replace(',', '.').replace('$', '').replace('%', ''))
                                values.append(num_value)
                            except:
                                pass

        if values:
            stats['sum'] = sum(values)
            stats['average'] = sum(values) / len(values)
            stats['count'] = len(values)
            stats['min'] = min(values)
            stats['max'] = max(values)

        return stats

    def zoom_in(self):
        """Увеличение масштаба"""
        if self.zoom_level < 200:
            self.zoom_level += 10
            self.apply_zoom()

    def zoom_out(self):
        """Уменьшение масштаба"""
        if self.zoom_level > 50:
            self.zoom_level -= 10
            self.apply_zoom()

    def apply_zoom(self):
        """Применение масштаба"""
        font = self.font()
        base_size = 10
        new_size = base_size * self.zoom_level / 100
        font.setPointSizeF(new_size)
        self.setFont(font)

        # Обновление высоты строк
        self.verticalHeader().setDefaultSectionSize(int(25 * self.zoom_level / 100))

        # Обновление ширины колонок
        self.horizontalHeader().setDefaultSectionSize(int(100 * self.zoom_level / 100))

        # Применение размеров ко всем строкам и колонкам
        for i in range(self.rowCount()):
            self.setRowHeight(i, int(25 * self.zoom_level / 100))
        for i in range(self.columnCount()):
            self.setColumnWidth(i, int(100 * self.zoom_level / 100))

    def load_data(self, data: List[List[str]]):
        """Загрузка данных в модель и отображение"""
        if not data:
            return

        # Создаем модель если нет
        if not self.spreadsheet:
            self.spreadsheet = Spreadsheet("Sheet1", 0, rows=1000, columns=1000)

        # Загружаем данные в модель
        self.spreadsheet.load_from_data(data)

        # Обновляем отображение
        self.refresh_display()

    def get_dataframe(self) -> pd.DataFrame:
        """Получение данных в виде DataFrame из модели"""
        if not self.spreadsheet:
            return pd.DataFrame()

        data = self.spreadsheet.get_data(max_rows=1000, max_cols=26)
        return pd.DataFrame(data)

    def apply_format(self, format_type: str, value):
        """Применение форматирования к выделенным ячейкам (toolbar и меню)"""
        
        # Для цветов: открываем диалог один раз ДО цикла
        selected_color = None
        if format_type in ('text_color', 'bg_color') and value is None:
            dlg = QColorDialog(self)
            app = QApplication.instance()
            if app and app.styleSheet():
                dlg.setStyleSheet(app.styleSheet())
            if dlg.exec_() == QDialog.Accepted:
                selected_color = dlg.currentColor()
                if not selected_color.isValid():
                    return  # Отмена выбора цвета
                value = selected_color.name()
            else:
                return  # Отмена диалога
        
        # Собираем все выделённые ячейки (включая из rangов)
        rows_cols = set()
        for item in self.selectedItems():
            rows_cols.add((item.row(), item.column()))
        
        # Применяем формат ко всем выделенным ячейкам
        for row, col in rows_cols:
            cell = self.get_cell(row, col)
            if not cell:
                continue
            if format_type == 'font':
                cell.font_family = value
            elif format_type == 'font_size':
                cell.font_size = value
            elif format_type == 'alignment':
                cell.alignment = value
            elif format_type == 'bold':
                cell.bold = value if value is not None else not cell.bold
            elif format_type == 'italic':
                cell.italic = value if value is not None else not cell.italic
            elif format_type == 'underline':
                cell.underline = value if value is not None else not cell.underline
            elif format_type == 'strike':
                if hasattr(cell, 'strike'):
                    cell.strike = value if value is not None else not getattr(cell, 'strike', False)
                else:
                    cell.strike = value if value is not None else True
            elif format_type == 'text_color':
                cell.text_color = value
                print(f"[DEBUG] Устанавливаю text_color для ({row}, {col}): {value}")
            elif format_type == 'bg_color':
                cell.background_color = value
                print(f"[DEBUG] Устанавливаю background_color для ({row}, {col}): {value}")
            elif format_type == 'clear_format':
                cell.font_family = "Arial"
                cell.font_size = 11
                cell.bold = False
                cell.italic = False
                cell.underline = False
                cell.text_color = "#000000"
                cell.background_color = "#FFFFFF"
                cell.alignment = "left"
                if hasattr(cell, 'strike'):
                    cell.strike = False
            self.apply_cell_formatting(row, col)
        
        # Обновляем весь виджет после применения всех изменений
        self.viewport().update()
        self.repaint()

    def save_state(self) -> Dict[str, Any]:
        """Сохранить состояние виджета"""
        return {
            'cell_states': self.save_cell_states(),
            'zoom_level': self.zoom_level,
            'column_widths': {col: self.columnWidth(col) for col in range(self.columns)},
            'row_heights': {row: self.rowHeight(row) for row in range(self.rows)}
        }

    def load_state(self, state: Dict[str, Any]):
        """Загрузить состояние виджета"""
        self.load_cell_states(state.get('cell_states', {}))

        if 'zoom_level' in state:
            self.zoom_level = state['zoom_level']
            self.apply_zoom()

        # Загружаем размеры колонок
        for col, width in state.get('column_widths', {}).items():
            if col < self.columnCount():
                self.setColumnWidth(col, width)

        # Загружаем размеры строк
        for row, height in state.get('row_heights', {}).items():
            if row < self.rowCount():
                self.setRowHeight(row, height)