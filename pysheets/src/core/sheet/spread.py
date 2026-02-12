"""
Модель электронной таблицы (1000x1000)
"""

import pandas as pd
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field

from pysheets.src.core.cell import Cell
from pysheets.src.core.formula.engine import FormulaEngine

@dataclass
class Spreadsheet:
    """Класс электронной таблицы 1000x1000"""

    name: str
    index: int
    rows: int = 1000  # Увеличили до 1000
    columns: int = 1000  # Увеличили до 1000
    cells: List[List[Optional[Cell]]] = field(default_factory=list)
    formula_engine: FormulaEngine = field(default_factory=FormulaEngine)
    modified: bool = False

    def __post_init__(self):
        """Инициализация после создания"""
        if not self.cells:
            self.initialize_sparse_cells()

    def initialize_sparse_cells(self):
        """Инициализация ячеек как разреженной матрицы"""
        # Используем None для пустых ячеек для экономии памяти
        self.cells = [[None for _ in range(self.columns)]
                     for _ in range(self.rows)]

    def get_cell(self, row: int, col: int) -> Optional[Cell]:
        """Получение ячейки (ленивое создание)"""
        if 0 <= row < self.rows and 0 <= col < self.columns:
            if self.cells[row][col] is None:
                # Создаем ячейку только когда она нужна
                self.cells[row][col] = Cell(row, col)
            return self.cells[row][col]
        return None

    def set_cell_value(self, row: int, col: int, value: str):
        """Установка значения ячейки"""
        cell = self.get_cell(row, col)
        if cell:
            old_value = cell.value
            cell.set_value(value)

            # Проверка на формулу
            if value.startswith('='):
                cell.set_formula(value)
                try:
                    result = self.formula_engine.evaluate(
                        value[1:],
                        self.get_cell_data
                    )
                    cell.set_calculated_value(str(result))
                except Exception as e:
                    cell.set_calculated_value(f"#ERROR: {str(e)}")
            else:
                cell.set_formula(None)
                cell.set_calculated_value(value)

            if old_value != value:
                self.modified = True

    def get_cell_value(self, row: int, col: int) -> Optional[str]:
        """Получение значения ячейки"""
        cell = self.get_cell(row, col)
        if cell:
            return cell.get_display_value()
        return None

    def get_cell_data(self, cell_ref: str) -> Optional[str]:
        """Получение данных ячейки по ссылке"""
        # Парсинг ссылки типа "A1" или "ABC123"
        try:
            col_str = ''
            row_str = ''

            for char in cell_ref:
                if char.isalpha():
                    col_str += char
                elif char.isdigit():
                    row_str += char

            if not col_str or not row_str:
                return None

            # Конвертация буквенного обозначения столбца в число
            col = 0
            for char in col_str.upper():
                col = col * 26 + (ord(char) - ord('A') + 1)
            col -= 1  # Перевод в 0-based индекс

            row = int(row_str) - 1  # Перевод в 0-based индекс

            return self.get_cell_value(row, col)

        except:
            return None

    def calculate_formulas(self):
        """Пересчет всех формул (только для заполненных ячеек)"""
        for row in range(self.rows):
            for col in range(self.columns):
                cell = self.cells[row][col]
                if cell and cell.formula:
                    try:
                        result = self.formula_engine.evaluate(
                            cell.formula[1:],
                            self.get_cell_data
                        )
                        cell.set_calculated_value(str(result))
                    except Exception as e:
                        cell.set_calculated_value(f"#ERROR: {str(e)}")

    def get_used_range(self) -> tuple:
        """Получает используемый диапазон"""
        max_row = 0
        max_col = 0

        for row in range(self.rows):
            for col in range(self.columns):
                cell = self.cells[row][col]
                if cell and (cell.value or cell.formula):
                    max_row = max(max_row, row + 1)
                    max_col = max(max_col, col + 1)

        return max_row, max_col

    def get_data(self, max_rows: int = None, max_cols: int = None) -> List[List[str]]:
        """Получение данных в виде списка с опциональными ограничениями"""
        data = []

        # Определяем фактически используемый размер
        used_rows, used_cols = self.get_used_range()
        if max_rows:
            used_rows = min(used_rows, max_rows)
        if max_cols:
            used_cols = min(used_cols, max_cols)

        for row in range(used_rows):
            row_data = []
            for col in range(used_cols):
                cell = self.cells[row][col]
                if cell:
                    row_data.append(cell.get_display_value())
                else:
                    row_data.append("")
            data.append(row_data)

        return data

    def load_from_dataframe(self, df: pd.DataFrame):
        """Загрузка данных из DataFrame"""
        self.rows = max(1000, len(df))
        self.columns = max(1000, len(df.columns) if len(df.columns) > 0 else 1000)

        self.initialize_sparse_cells()

        for row_idx, row in df.iterrows():
            for col_idx, value in enumerate(row):
                if row_idx < self.rows and col_idx < self.columns:
                    self.set_cell_value(row_idx, col_idx, str(value))

        self.modified = False

    def load_from_data(self, data: List[List[str]]):
        """Загрузка данных из списка"""
        if not data:
            return

        self.rows = max(1000, len(data))
        self.columns = max(1000, max(len(row) for row in data) if data else 1000)

        self.initialize_sparse_cells()

        for row_idx, row_data in enumerate(data):
            for col_idx, value in enumerate(row_data):
                if row_idx < self.rows and col_idx < self.columns:
                    self.set_cell_value(row_idx, col_idx, str(value))

        self.modified = False

    def to_dict(self) -> Dict[str, Any]:
        """Сериализация в словарь (только заполненные ячейки)"""
        cells_data = []
        for row in range(self.rows):
            for col in range(self.columns):
                cell = self.cells[row][col]
                if cell and (cell.value or cell.formula):
                    cells_data.append(cell.to_dict())

        return {
            'name': self.name,
            'index': self.index,
            'rows': self.rows,
            'columns': self.columns,
            'cells': cells_data,
            'modified': self.modified
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Spreadsheet':
        """Десериализация из словаря"""
        # Используем переданные размеры или 1000x1000
        rows = data.get('rows', 1000)
        columns = data.get('columns', 1000)

        sheet = cls(
            name=data['name'],
            index=data['index'],
            rows=max(1000, rows),
            columns=max(1000, columns)
        )

        # Загрузка ячеек
        for cell_data in data.get('cells', []):
            row = cell_data['row']
            col = cell_data['column']
            if 0 <= row < sheet.rows and 0 <= col < sheet.columns:
                cell = Cell.from_dict(cell_data)
                sheet.cells[row][col] = cell

        sheet.modified = data.get('modified', False)
        return sheet

    def is_modified(self) -> bool:
        """Проверка наличия изменений"""
        return self.modified

    def clear_cell(self, row: int, col: int):
        """Очистка ячейки"""
        if 0 <= row < self.rows and 0 <= col < self.columns:
            self.cells[row][col] = None
            self.modified = True

    def get_column_letter(self, col: int) -> str:
        """Получение буквенного обозначения столбца"""
        result = ""
        col += 1  # 1-based для Excel стиля
        while col > 0:
            col -= 1
            result = chr(col % 26 + ord('A')) + result
            col //= 26
        return result

    def get_cell_reference(self, row: int, col: int) -> str:
        """Получение ссылки на ячейку в формате A1"""
        return f"{self.get_column_letter(col)}{row + 1}"

    def get_range_stats(self, start_row: int, start_col: int,
                       end_row: int, end_col: int) -> Dict[str, Any]:
        """Статистика по диапазону"""
        values = []
        numeric_values = []

        for row in range(start_row, min(end_row + 1, self.rows)):
            for col in range(start_col, min(end_col + 1, self.columns)):
                cell = self.cells[row][col]
                if cell:
                    value = cell.get_display_value()
                    values.append(value)
                    try:
                        numeric = float(value)
                        numeric_values.append(numeric)
                    except:
                        pass

        stats = {
            'count': len(values),
            'text_count': len(values) - len(numeric_values),
            'number_count': len(numeric_values),
            'empty_count': (end_row - start_row + 1) * (end_col - start_col + 1) - len(values)
        }

        if numeric_values:
            stats.update({
                'sum': sum(numeric_values),
                'average': sum(numeric_values) / len(numeric_values),
                'min': min(numeric_values),
                'max': max(numeric_values)
            })

        return stats