"""
Миксин для операций с ячейками электронной таблицы.
Получение/установка значений, форматирование, формулы.
"""

import re
from typing import Optional, List

from PyQt5.QtWidgets import QTableWidgetItem
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QBrush, QColor, QFont

from pysheets.src.core.cell import Cell
from pysheets.src.util.validators import parse_cell_reference


class CellOperationsMixin:
    """Миксин для операций с ячейками"""

    def set_spreadsheet(self, spreadsheet):
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
        # Авто-хелпер: если пользователь ввёл формулу БЕЗ знака "="
        if isinstance(value, str):
            normalized = value.strip()
            if normalized and not normalized.startswith('='):
                if re.match(r'^[A-Za-z_]+\(.*\)$', normalized):
                    value = f"={normalized}"

        # Проверяем, не скрыта ли ячейка
        if (row, col) in self.hidden_cells:
            cell = self.get_cell(row, col)
            if cell:
                cell.set_value(value)
                cell.set_calculated_value(value)
                item = self.item(row, col)
                if item:
                    item.setData(Qt.UserRole + 1, value)
            return

        cell = self.get_cell(row, col)
        if not cell:
            return

        old_value = cell.value
        cell.set_value(value)

        # Обновление отображения
        item = self.item(row, col)
        if item is None:
            item = QTableWidgetItem()
            self.setItem(row, col, item)

        # Проверка на формулу и вычисление
        if value and value.startswith('='):
            # Проверяем AI-формулу: =AI("...") или =AI('...')
            if self._is_ai_formula(value):
                prompt = self._extract_ai_prompt(value)
                if prompt:
                    cell.set_formula(value)
                    self._updating = True
                    item.setText("⏳ AI думает...")
                    self._updating = False
                    cell.set_calculated_value("⏳ AI думает...")
                    import threading
                    threading.Thread(
                        target=self._evaluate_ai_formula,
                        args=(row, col, prompt),
                        daemon=True
                    ).start()
                    return
            
            try:
                result = self.formula_engine.evaluate(value[1:], self.get_cell_data)
                cell.set_formula(value)
                cell.set_calculated_value(str(result))
                self._updating = True
                item.setText(str(result))
                self._updating = False
                print(f"DEBUG: Формула {value} = {result}")
            except Exception as e:
                print(f"[WARNING] Ошибка при вычислении формулы \'{value}\': {e}")
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
        row, col = parse_cell_reference(cell_ref)
        if row is not None and col is not None:
            cell = self.get_cell(row, col)
            if cell:
                return cell.calculated_value or cell.value
        return None

    def apply_cell_formatting(self, row: int, col: int):
        """Применение форматирования к ячейке"""
        cell = self.get_cell(row, col)
        item = self.item(row, col)

        if not cell:
            return
        
        # Создаём item если его нет (важно для пустых ячеек)
        if item is None:
            from PyQt5.QtWidgets import QTableWidgetItem
            item = QTableWidgetItem()
            self.setItem(row, col, item)

        # Шрифт
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

        # Цвет текста — применяем только если явно задан
        try:
            if cell.text_color:
                text_color = QColor(cell.text_color)
                if text_color.isValid():
                    item.setData(Qt.ForegroundRole, QBrush(text_color))
            
            # Цвет фона — применяем только если явно задан
            if cell.background_color:
                bg_color = QColor(cell.background_color)
                if bg_color.isValid():
                    item.setData(Qt.BackgroundRole, QBrush(bg_color))
        except Exception as e:
            print(f"[ERROR] Ошибка при применении цветов ({row},{col}): {e}")

    def refresh_display(self):
        """Обновление отображения на основе модели"""
        if not self.spreadsheet:
            return

        self._updating = True
        used_rows, used_cols = self.spreadsheet.get_used_range()

        for row in range(min(used_rows, 1000)):
            for col in range(min(used_cols, 26)):
                cell = self.spreadsheet.get_cell(row, col)
                if cell:
                    value = cell.get_display_value() or ""
                    item = self.item(row, col)
                    if item is None:
                        item = QTableWidgetItem()
                        self.setItem(row, col, item)
                    item.setText(str(value))

        self._updating = False

    def on_cell_changed(self, row: int, col: int):
        """Обработка изменения ячейки"""
        if self._updating:
            return
        item = self.item(row, col)
        if item:
            value = item.text()
            self.set_cell_value(row, col, value)

    def on_cell_clicked(self, row: int, col: int):
        """Обработка клика по ячейке"""
        cell = self.get_cell(row, col)
        value = cell.value if cell else ""
        self.cell_selected.emit(row, col, value or "")

    def on_selection_changed(self):
        """Обработка изменения выделения"""
        self.selection_changed.emit()
