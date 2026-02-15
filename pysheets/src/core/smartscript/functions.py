"""
SmartScript Functions — встроенные функции для работы с таблицей
"""

import re
from typing import Any, List, Tuple, Optional, Callable

from pysheets.src.core.smartscript.errors import SmartScriptError


class TableFunctions:
    """Набор встроенных функций SmartScript для работы с таблицей"""

    def __init__(self, cell_getter: Optional[Callable] = None):
        self.cell_getter = cell_getter

    def set_cell_getter(self, getter: Callable):
        """Устанавливает функцию для чтения ячеек таблицы"""
        self.cell_getter = getter

    # ============ Парсинг ссылок ============

    def parse_cell_ref(self, ref: str) -> Tuple[int, int]:
        """Парсит ссылку на ячейку: 'A1' -> (0, 0)"""
        match = re.match(r'^([A-Za-z]+)(\d+)$', ref.strip())
        if not match:
            raise SmartScriptError(f"Неверная ссылка на ячейку: '{ref}'")

        col_str = match.group(1).upper()
        row = int(match.group(2)) - 1  # 0-based

        col = 0
        for ch in col_str:
            col = col * 26 + (ord(ch) - ord('A') + 1)
        col -= 1  # 0-based

        return row, col

    def parse_range(self, range_str: str) -> List[Tuple[int, int]]:
        """Парсит диапазон: 'A1:B5' -> список (row, col)"""
        parts = range_str.split(':')
        if len(parts) != 2:
            raise SmartScriptError(f"Неверный диапазон: '{range_str}'")

        start_row, start_col = self.parse_cell_ref(parts[0])
        end_row, end_col = self.parse_cell_ref(parts[1])

        cells = []
        for r in range(start_row, end_row + 1):
            for c in range(start_col, end_col + 1):
                cells.append((r, c))
        return cells

    def get_cell_value(self, row: int, col: int) -> Any:
        """Получает значение ячейки"""
        if not self.cell_getter:
            raise SmartScriptError("Нет доступа к данным таблицы")
        return self.cell_getter(row, col)

    def get_numeric_values(self, range_str: str) -> List[float]:
        """Получает числовые значения из диапазона"""
        cells = self.parse_range(range_str)
        values = []
        for row, col in cells:
            val = self.get_cell_value(row, col)
            if val is not None and val != "":
                try:
                    values.append(float(val))
                except (ValueError, TypeError):
                    pass
        return values

    # ============ Функции таблицы ============

    def func_cell(self, args: List, line_num: int) -> Any:
        """CELL("A1") — получить значение ячейки"""
        if len(args) != 1:
            raise SmartScriptError("CELL() принимает 1 аргумент: CELL(\"A1\")", line_num)
        row, col = self.parse_cell_ref(str(args[0]))
        val = self.get_cell_value(row, col)
        return val if val is not None else ""

    def func_sum(self, args: List, line_num: int) -> float:
        """SUM("A1:A10") — сумма диапазона"""
        if len(args) != 1:
            raise SmartScriptError("SUM() принимает 1 аргумент: SUM(\"A1:A10\")", line_num)
        values = self.get_numeric_values(str(args[0]))
        return sum(values)

    def func_average(self, args: List, line_num: int) -> float:
        """AVERAGE("A1:A10") — среднее значение"""
        if len(args) != 1:
            raise SmartScriptError("AVERAGE() принимает 1 аргумент", line_num)
        values = self.get_numeric_values(str(args[0]))
        if not values:
            return 0
        return sum(values) / len(values)

    def func_count(self, args: List, line_num: int) -> int:
        """COUNT("A1:A10") — количество непустых ячеек"""
        if len(args) != 1:
            raise SmartScriptError("COUNT() принимает 1 аргумент", line_num)
        cells = self.parse_range(str(args[0]))
        count = 0
        for row, col in cells:
            val = self.get_cell_value(row, col)
            if val is not None and val != "":
                count += 1
        return count

    def func_max(self, args: List, line_num: int) -> float:
        """MAX("A1:A10") — максимум"""
        if len(args) != 1:
            raise SmartScriptError("MAX() принимает 1 аргумент", line_num)
        values = self.get_numeric_values(str(args[0]))
        if not values:
            return 0
        return max(values)

    def func_min(self, args: List, line_num: int) -> float:
        """MIN("A1:A10") — минимум"""
        if len(args) != 1:
            raise SmartScriptError("MIN() принимает 1 аргумент", line_num)
        values = self.get_numeric_values(str(args[0]))
        if not values:
            return 0
        return min(values)

    def func_countif(self, args: List, line_num: int) -> int:
        """COUNTIF("A1:A10", "value") — подсчёт ячеек с условием"""
        if len(args) != 2:
            raise SmartScriptError("COUNTIF() принимает 2 аргумента", line_num)
        cells = self.parse_range(str(args[0]))
        target = str(args[1])
        count = 0
        for row, col in cells:
            val = self.get_cell_value(row, col)
            if str(val) == target:
                count += 1
        return count

    def func_sumif(self, args: List, line_num: int) -> float:
        """SUMIF("A1:A10", "condition", "B1:B10") — сумма с условием"""
        if len(args) != 3:
            raise SmartScriptError("SUMIF() принимает 3 аргумента", line_num)
        cond_cells = self.parse_range(str(args[0]))
        condition = str(args[1])
        sum_cells = self.parse_range(str(args[2]))

        total = 0
        for i, (row, col) in enumerate(cond_cells):
            val = self.get_cell_value(row, col)
            if str(val) == condition and i < len(sum_cells):
                sum_row, sum_col = sum_cells[i]
                sum_val = self.get_cell_value(sum_row, sum_col)
                try:
                    total += float(sum_val)
                except (ValueError, TypeError):
                    pass
        return total

    def func_column(self, args: List, line_num: int) -> List:
        """COLUMN("A") — получить все значения колонки как список"""
        if len(args) != 1:
            raise SmartScriptError("COLUMN() принимает 1 аргумент: COLUMN(\"A\")", line_num)
        col_str = str(args[0]).upper().strip()
        col = 0
        for ch in col_str:
            col = col * 26 + (ord(ch) - ord('A') + 1)
        col -= 1

        values = []
        for row in range(1000):
            val = self.get_cell_value(row, col)
            if val is None or val == "":
                if row > 0:
                    break
            else:
                values.append(val)
        return values

    def func_row_count(self, args: List, line_num: int) -> int:
        """ROW_COUNT() — количество заполненных строк"""
        count = 0
        for row in range(1000):
            has_data = False
            for col in range(26):
                val = self.get_cell_value(row, col)
                if val is not None and val != "":
                    has_data = True
                    break
            if has_data:
                count += 1
            elif count > 0:
                break
        return count

    def func_col_count(self, args: List, line_num: int) -> int:
        """COL_COUNT() — количество заполненных колонок (по первой строке)"""
        count = 0
        for col in range(26):
            val = self.get_cell_value(0, col)
            if val is not None and val != "":
                count += 1
            elif count > 0:
                break
        return count

    def func_range(self, args: List, line_num: int) -> range:
        """RANGE(start, end) или RANGE(end) — генератор чисел"""
        if len(args) == 1:
            return range(int(args[0]))
        elif len(args) == 2:
            return range(int(args[0]), int(args[1]))
        elif len(args) == 3:
            return range(int(args[0]), int(args[1]), int(args[2]))
        raise SmartScriptError("RANGE() принимает 1-3 аргумента", line_num)
