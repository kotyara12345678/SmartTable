"""
Виджет электронной таблицы
"""

import pandas as pd
import numpy as np
from typing import Optional, List, Tuple
from dataclasses import dataclass
from enum import Enum

from PyQt5.QtWidgets import (QTableWidget, QTableWidgetItem, QHeaderView,
                             QAbstractItemView, QMenu, QInputDialog, QColorDialog, QAction, QApplication,
                             QStyledItemDelegate, QLineEdit, QDialog)
from PyQt5.QtCore import Qt, pyqtSignal, QPoint, QTimer
from PyQt5.QtGui import QBrush, QColor, QFont, QKeySequence

from pysheets.src.core.cell import Cell
from pysheets.src.core.formula_engine import FormulaEngine
from pysheets.src.utils.validators import validate_formula, parse_cell_reference


class SpreadsheetWidget(QTableWidget):
    """Виджет электронной таблицы с поддержкой формул и форматирования"""

    # Сигналы
    cell_selected = pyqtSignal(int, int, str)  # row, col, value
    data_changed = pyqtSignal(int, int, str)  # row, col, new_value
    selection_changed = pyqtSignal()

    def __init__(self, rows: int = 100, cols: int = 26, parent=None):
        super().__init__(rows, cols, parent)

        # Инициализация
        self.rows = rows
        self.columns = cols
        self.zoom_level = 100
        self.formula_engine = FormulaEngine()
        self._updating = False  # Флаг чтобы избежать циклических обновлений

        # Данные ячеек
        self.cells: List[List[Cell]] = [
            [Cell(row, col) for col in range(cols)] for row in range(rows)
        ]

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
        """Инициализация интерфейса"""
        # Настройка заголовков
        self.setHorizontalHeaderLabels([chr(65 + i) for i in range(self.columns)])
        self.setVerticalHeaderLabels([str(i + 1) for i in range(self.rows)])

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
        vertical_header.setDefaultSectionSize(25)
        vertical_header.setMinimumSectionSize(20)

        # Включение сортировки
        # ОТКЛЮЧЕНО: сортировка может менять порядок данных и нарушать формулы
        # self.setSortingEnabled(True)

        # Настройка сетки
        self.setShowGrid(True)
        self.setGridStyle(Qt.PenStyle.SolidLine)

        # Скрываем corner button полностью
        self._hide_corner_button()

        # Устанавливаем делегат, чтобы редакторы заполняли всю ячейку
        class FullCellDelegate(QStyledItemDelegate):
            def createEditor(self, parent, option, index):
                editor = QLineEdit(parent)
                editor.setFrame(False)
                return editor

            def updateEditorGeometry(self, editor, option, index):
                # Сделать редактор размером на всю ячейку
                editor.setGeometry(option.rect)

            def paint(self, painter, option, index):
                # Remove focus rectangle while keeping selection highlight
                from PyQt5.QtWidgets import QStyle
                opt = option
                # Clear focus state so the small focus rect isn't drawn
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

    def get_cell(self, row: int, col: int) -> Optional[Cell]:
        """Получение объекта ячейки"""
        if 0 <= row < self.rows and 0 <= col < self.columns:
            return self.cells[row][col]
        return None

    def set_cell_value(self, row: int, col: int, value: str):
        """Установка значения ячейки"""
        cell = self.get_cell(row, col)
        if cell:
            cell.set_value(value)

            # Обновление отображения
            item = self.item(row, col)
            if not item:
                item = QTableWidgetItem()
                self.setItem(row, col, item)

            # Проверка на формулу
            if value.startswith('='):
                try:
                    result = self.formula_engine.evaluate(value[1:], self.get_cell_data)
                    cell.set_formula(value)
                    cell.set_calculated_value(str(result))
                    # Устанавливаем флаг чтобы не триггерить on_cell_changed при setText
                    self._updating = True
                    item.setText(str(result))
                    self._updating = False
                except Exception as e:
                    print(f"[WARNING] Ошибка при вычислении формулы '{value}': {e}")
                    self._updating = True
                    item.setText(f"#ERROR!")
                    self._updating = False
                    cell.set_calculated_value(f"#ERROR!")
            else:
                self._updating = True
                item.setText(value)
                self._updating = False
                cell.set_formula(None)
                cell.set_calculated_value(value)

            # Применение форматирования
            self.apply_cell_formatting(row, col)

            # Эмитация сигнала
            self.data_changed.emit(row, col, value)

    def get_cell_data(self, cell_ref: str) -> Optional[str]:
        """Получение данных ячейки по ссылке"""
        row, col = parse_cell_reference(cell_ref)
        if row is not None and col is not None:
            cell = self.get_cell(row, col)
            if cell:
                return cell.calculated_value
        return None

    def add_ai_data(self, data: List[List[str]], start_row: int = 0, start_col: int = 0) -> bool:
        """
        Add data from AI to the spreadsheet.
        
        Args:
            data: List of lists with string values
            start_row: Starting row (default 0)
            start_col: Starting column (default 0)
        
        Returns:
            True if successful, False otherwise
        """
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

    def apply_cell_formatting(self, row: int, col: int):
        """Применение форматирования к ячейке"""
        cell = self.get_cell(row, col)
        item = self.item(row, col)

        if cell and item:
            # Применение шрифта
            font = QFont()
            font.setBold(bool(cell.bold))
            font.setItalic(bool(cell.italic))
            font.setUnderline(bool(cell.underline))
            if hasattr(cell, 'strike'):
                font.setStrikeOut(bool(cell.strike))
            font.setPointSize(cell.font_size)
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

            # Цвета
            if cell.text_color:
                item.setForeground(QBrush(QColor(cell.text_color)))
            if cell.background_color:
                item.setBackground(QBrush(QColor(cell.background_color)))

    def on_cell_changed(self, row: int, col: int):
        """Обработка изменения ячейки"""
        # Пропускаем если это обновление от set_cell_value
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
            self.cell_selected.emit(row, col, value)

    def on_selection_changed(self):
        """Обработка изменения выделения"""
        # Вычислим и отправим статистику по выделению
        stats = self.calculate_selection_stats()
        self.selection_changed.emit()

    def show_context_menu(self, position: QPoint):
        """Показать контекстное меню с расширенным форматированием"""
        menu = QMenu(self)

        # Основные действия
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

        # Форматирование (все функции)
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

        # Шрифт
        font_menu = format_menu.addMenu("Шрифт")
        for font_name in ["Arial", "Calibri", "Times New Roman", "Verdana", "Segoe UI"]:
            font_action = QAction(font_name, self)
            font_action.triggered.connect(lambda checked, f=font_name: self.apply_format('font', f))
            font_menu.addAction(font_action)

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

        # Вставка/удаление
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

        menu.exec(self.viewport().mapToGlobal(position))

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
        """Применяет сортировку к диапазону или ко всему листу.

        cfg: {'has_header': bool, 'levels': [{'column': idx, 'type': str, 'order': 'ASC'|'DESC'}, ...]}
        range_obj: QTableWidgetSelectionRange or None
        """
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
                val = cell.value if cell and cell.value is not None else ''
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
                # Простая попытка распарсить как ISO или DD/MM/YYYY
                from datetime import datetime
                for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%Y/%m/%d"):
                    try:
                        return datetime.strptime(s, fmt)
                    except:
                        continue
                return s
            else:
                return s.lower()

        # Сортируем по уровням: применяем stable sort от последнего уровня к первому
        levels = cfg.get('levels', [])
        # Map column index relative to left
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
                # If Automatic, try numeric first
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
                # Fallback: convert keys to strings to avoid comparison errors
                rows.sort(key=lambda it: str(key_fn(it)), reverse=reverse)

        # Записываем отсортированные значения обратно в таблицу
        for i, (orig_r, rowvals) in enumerate(rows):
            target_r = data_top + i
            for j, v in enumerate(rowvals):
                col = left + j
                # Устанавливаем значение без триггера on_cell_changed
                item = self.item(target_r, col)
                if not item:
                    item = QTableWidgetItem()
                    self.setItem(target_r, col, item)
                self._updating = True
                item.setText(str(v))
                self._updating = False
                # Обновляем модель
                cell = self.get_cell(target_r, col)
                if cell:
                    cell.set_value(str(v))
                    cell.set_calculated_value(str(v))
                    cell.set_formula(None)
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
        # Apply application stylesheet so color dialog matches theme
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
            # Обновление данных cells
            self.cells.insert(row, [Cell(row, col) for col in range(self.columns)])
            # Обновление индексов
            for r in range(row + 1, self.rows):
                for c in range(self.columns):
                    self.cells[r][c].row = r

    def delete_row(self):
        """Удаление строки"""
        selected = self.selectedRanges()
        if selected:
            row = selected[0].topRow()
            self.removeRow(row)
            self.rows -= 1
            # Обновление данных cells
            self.cells.pop(row)
            # Обновление индексов
            for r in range(row, self.rows):
                for c in range(self.columns):
                    self.cells[r][c].row = r

    def set_current_cell_formula(self, formula: str):
        """Установка формулы для текущей ячейки"""
        current = self.currentItem()
        if current:
            self.set_cell_value(current.row(), current.column(), formula)

    def calculate_formulas(self):
        """Пересчет всех формул"""
        for row in range(self.rows):
            for col in range(self.columns):
                cell = self.cells[row][col]
                if cell.formula:
                    try:
                        result = self.formula_engine.evaluate(
                            cell.formula[1:],
                            self.get_cell_data
                        )
                        cell.set_calculated_value(str(result))

                        item = self.item(row, col)
                        if item:
                            item.setText(str(result))
                    except Exception as e:
                        cell.set_calculated_value("#ERROR!")
                        item = self.item(row, col)
                        if item:
                            item.setText("#ERROR!")
    
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
                    if cell and cell.calculated_value:
                        try:
                            # Попытаться преобразовать в число
                            value = float(str(cell.calculated_value).replace(',', '.').replace('$', '').replace('%', ''))
                            values.append(value)
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
        """Загрузка данных"""
        if not data:
            return

        rows = len(data)
        cols = max(len(row) for row in data) if data else 0

        self.setRowCount(rows)
        self.setColumnCount(cols)
        self.rows = rows
        self.columns = cols

        # Обновление массива cells
        self.cells = [
            [Cell(row, col) for col in range(cols)] for row in range(rows)
        ]

        # Обновление заголовков
        self.setHorizontalHeaderLabels([chr(65 + i) for i in range(cols)])
        self.setVerticalHeaderLabels([str(i + 1) for i in range(rows)])

        # Загрузка данных
        for row in range(rows):
            for col in range(len(data[row])):
                value = data[row][col]
                if value is not None:
                    self.set_cell_value(row, col, str(value))

    def get_dataframe(self) -> pd.DataFrame:
        """Получение данных в виде DataFrame"""
        data = []
        for row in range(self.rows):
            row_data = []
            for col in range(self.columns):
                cell = self.get_cell(row, col)
                if cell:
                    row_data.append(cell.value)
                else:
                    row_data.append("")
            data.append(row_data)

        return pd.DataFrame(data)

    def apply_format(self, format_type: str, value):
        """Применение форматирования к выделенным ячейкам (toolbar и меню)"""
        for item in self.selectedItems():
            row = item.row()
            col = item.column()
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
                if value is None:
                    dlg = QColorDialog(self)
                    app = QApplication.instance()
                    if app and app.styleSheet():
                        dlg.setStyleSheet(app.styleSheet())
                    if dlg.exec_() == QDialog.Accepted:
                        color = dlg.currentColor()
                        if color.isValid():
                            cell.text_color = color.name()
                else:
                    cell.text_color = value
            elif format_type == 'bg_color':
                if value is None:
                    dlg = QColorDialog(self)
                    app = QApplication.instance()
                    if app and app.styleSheet():
                        dlg.setStyleSheet(app.styleSheet())
                    if dlg.exec_() == QDialog.Accepted:
                        color = dlg.currentColor()
                        if color.isValid():
                            cell.background_color = color.name()
                else:
                    cell.background_color = value
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