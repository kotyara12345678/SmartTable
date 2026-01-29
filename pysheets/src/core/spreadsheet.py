"""
Основной класс электронной таблицы
"""
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import re


class CellType(Enum):
    """Типы данных ячейки"""
    TEXT = "text"
    NUMBER = "number"
    FORMULA = "formula"
    DATE = "date"
    BOOLEAN = "boolean"
    ERROR = "error"


@dataclass
class CellFormat:
    """Форматирование ячейки"""
    font_name: str = "Arial"
    font_size: int = 10
    font_bold: bool = False
    font_italic: bool = False
    font_color: str = "#000000"
    bg_color: str = "#FFFFFF"
    text_align: str = "left"
    number_format: str = "general"
    borders: Dict = field(default_factory=dict)


class Cell:
    """Ячейка электронной таблицы"""

    def __init__(self,
                 value: Any = None,
                 formula: Optional[str] = None,
                 cell_type: CellType = CellType.TEXT,
                 format: Optional[CellFormat] = None):
        self._raw_value = value
        self.formula = formula
        self.cell_type = cell_type
        self.format = format or CellFormat()
        self._display_value = None
        self._is_dirty = True

    @property
    def value(self):
        """Получить значение ячейки"""
        return self._raw_value

    @value.setter
    def value(self, new_value):
        """Установить значение ячейки"""
        self._raw_value = new_value
        self._is_dirty = True

    @property
    def display_value(self):
        """Значение для отображения (с учетом формата)"""
        if self._is_dirty or self._display_value is None:
            self._update_display_value()
        return self._display_value

    def _update_display_value(self):
        """Обновить отображаемое значение"""
        if self.formula:
            self._display_value = f"={self.formula}"
        elif self.value is None:
            self._display_value = ""
        else:
            self._display_value = str(self.value)
        self._is_dirty = False

    def clear(self):
        """Очистить ячейку"""
        self._raw_value = None
        self.formula = None
        self.cell_type = CellType.TEXT
        self._display_value = ""
        self._is_dirty = True

    def __str__(self):
        return str(self.display_value)

    def __repr__(self):
        return f"Cell(value={self.value}, formula={self.formula})"


class Spreadsheet:
    """Класс электронной таблицы"""

    def __init__(self, rows: int = 1000, cols: int = 26):
        self.rows = rows
        self.cols = cols
        self.data: Dict[Tuple[int, int], Cell] = {}
        self.formulas: Dict[Tuple[int, int], str] = {}
        self._listeners = []

    def get_cell(self, row: int, col: int) -> Cell:
        """Получить ячейку по координатам"""
        if 0 <= row < self.rows and 0 <= col < self.cols:
            if (row, col) not in self.data:
                self.data[(row, col)] = Cell()
            return self.data[(row, col)]
        return Cell()  # Возвращаем пустую ячейку за пределами таблицы

    def set_cell(self, row: int, col: int, value: Any, formula: str = None):
        """Установить значение ячейки"""
        if 0 <= row < self.rows and 0 <= col < self.cols:
            cell = self.get_cell(row, col)
            cell.value = value
            if formula:
                cell.formula = formula
                cell.cell_type = CellType.FORMULA
                self.formulas[(row, col)] = formula
            else:
                # Определяем тип данных
                if isinstance(value, (int, float)):
                    cell.cell_type = CellType.NUMBER
                elif isinstance(value, bool):
                    cell.cell_type = CellType.BOOLEAN
                else:
                    cell.cell_type = CellType.TEXT

            # Оповещаем слушателей об изменении
            self._notify_listeners(row, col)
            return cell
        return None

    def get_range(self, start_row: int, start_col: int,
                  end_row: int, end_col: int) -> List[List[Cell]]:
        """Получить диапазон ячеек"""
        result = []
        for r in range(start_row, min(end_row, self.rows - 1) + 1):
            row_data = []
            for c in range(start_col, min(end_col, self.cols - 1) + 1):
                row_data.append(self.get_cell(r, c))
            result.append(row_data)
        return result

    def get_range_values(self, start_row: int, start_col: int,
                         end_row: int, end_col: int) -> List[List[Any]]:
        """Получить значения диапазона"""
        cells = self.get_range(start_row, start_col, end_row, end_col)
        return [[cell.value for cell in row] for row in cells]

    def insert_row(self, at_index: int, count: int = 1):
        """Вставить строки"""
        if at_index < 0 or at_index > self.rows:
            return False

        self.rows += count

        # Сдвигаем существующие данные вниз
        new_data = {}
        for (r, c), cell in self.data.items():
            if r >= at_index:
                new_data[(r + count, c)] = cell
            else:
                new_data[(r, c)] = cell

        self.data = new_data
        return True

    def insert_column(self, at_index: int, count: int = 1):
        """Вставить столбцы"""
        if at_index < 0 or at_index > self.cols:
            return False

        self.cols += count

        # Сдвигаем существующие данные вправо
        new_data = {}
        for (r, c), cell in self.data.items():
            if c >= at_index:
                new_data[(r, c + count)] = cell
            else:
                new_data[(r, c)] = cell

        self.data = new_data
        return True

    def delete_row(self, at_index: int, count: int = 1):
        """Удалить строки"""
        if at_index < 0 or at_index >= self.rows:
            return False

        self.rows = max(0, self.rows - count)

        # Удаляем данные и сдвигаем остальные вверх
        new_data = {}
        for (r, c), cell in self.data.items():
            if r >= at_index and r < at_index + count:
                continue  # Удаляем эти строки
            elif r >= at_index + count:
                new_data[(r - count, c)] = cell
            else:
                new_data[(r, c)] = cell

        self.data = new_data
        return True

    def delete_column(self, at_index: int, count: int = 1):
        """Удалить столбцы"""
        if at_index < 0 or at_index >= self.cols:
            return False

        self.cols = max(0, self.cols - count)

        # Удаляем данные и сдвигаем остальные влево
        new_data = {}
        for (r, c), cell in self.data.items():
            if c >= at_index and c < at_index + count:
                continue  # Удаляем эти столбцы
            elif c >= at_index + count:
                new_data[(r, c - count)] = cell
            else:
                new_data[(r, c)] = cell

        self.data = new_data
        return True

    def clear_range(self, start_row: int, start_col: int,
                    end_row: int, end_col: int):
        """Очистить диапазон ячеек"""
        for r in range(start_row, min(end_row, self.rows - 1) + 1):
            for c in range(start_col, min(end_col, self.cols - 1) + 1):
                if (r, c) in self.data:
                    self.data[(r, c)].clear()

    def copy_range(self, src_start_row: int, src_start_col: int,
                   src_end_row: int, src_end_col: int,
                   dest_row: int, dest_col: int):
        """Копировать диапазон ячеек"""
        src_cells = self.get_range(src_start_row, src_start_col,
                                   src_end_row, src_end_col)

        for i, row in enumerate(src_cells):
            for j, cell in enumerate(row):
                target_r = dest_row + i
                target_c = dest_col + j
                if target_r < self.rows and target_c < self.cols:
                    self.set_cell(target_r, target_c, cell.value, cell.formula)

    def find(self, search_text: str, start_row: int = 0,
             start_col: int = 0, case_sensitive: bool = False) -> Optional[Tuple[int, int]]:
        """Найти текст в таблице"""
        for r in range(start_row, self.rows):
            for c in range(start_col, self.cols):
                cell = self.get_cell(r, c)
                if cell.value:
                    cell_text = str(cell.value)
                    search_in = cell_text if case_sensitive else cell_text.lower()
                    search_for = search_text if case_sensitive else search_text.lower()
                    if search_for in search_in:
                        return (r, c)
        return None

    def add_listener(self, callback):
        """Добавить слушателя изменений"""
        self._listeners.append(callback)

    def _notify_listeners(self, row: int, col: int):
        """Оповестить слушателей об изменении"""
        for listener in self._listeners:
            listener(row, col)

    def to_list(self) -> List[List[Any]]:
        """Преобразовать таблицу в список списков"""
        result = []
        for r in range(self.rows):
            row = []
            for c in range(self.cols):
                cell = self.get_cell(r, c)
                row.append(cell.value)
            result.append(row)
        return result

    def from_list(self, data: List[List[Any]]):
        """Загрузить данные из списка списков"""
        self.clear()
        for r, row in enumerate(data):
            if r >= self.rows:
                self.insert_row(self.rows, 1)
            for c, value in enumerate(row):
                if c >= self.cols:
                    self.insert_column(self.cols, 1)
                self.set_cell(r, c, value)

    def clear(self):
        """Очистить всю таблицу"""
        self.data.clear()
        self.formulas.clear()

    def get_dimensions(self) -> Tuple[int, int]:
        """Получить размеры таблицы (фактические используемые)"""
        max_row = 0
        max_col = 0

        for (r, c) in self.data.keys():
            max_row = max(max_row, r)
            max_col = max(max_col, c)

        return (min(max_row + 1, self.rows), min(max_col + 1, self.cols))

    def col_to_letter(self, col: int) -> str:
        """Преобразовать номер столбца в букву (0 -> A)"""
        result = ""
        while col >= 0:
            result = chr(col % 26 + 65) + result
            col = col // 26 - 1
        return result

    def letter_to_col(self, letters: str) -> int:
        """Преобразовать букву столбца в номер (A -> 0)"""
        result = 0
        for letter in letters.upper():
            result = result * 26 + (ord(letter) - 64)
        return result - 1

    def get_cell_address(self, row: int, col: int) -> str:
        """Получить адрес ячейки (например, A1)"""
        return f"{self.col_to_letter(col)}{row + 1}"