"""
Модель электронной таблицы
"""

import pandas as pd
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field

from .cell import Cell
from .formula_engine import FormulaEngine

@dataclass
class Spreadsheet:
    """Класс электронной таблицы"""

    name: str
    index: int
    rows: int = 100
    columns: int = 26
    cells: List[List[Cell]] = field(default_factory=list)
    formula_engine: FormulaEngine = field(default_factory=FormulaEngine)
    modified: bool = False

    def __post_init__(self):
        """Инициализация после создания"""
        if not self.cells:
            self.initialize_cells()

    def initialize_cells(self):
        """Инициализация ячеек"""
        self.cells = [
            [Cell(row, col) for col in range(self.columns)]
            for row in range(self.rows)
        ]

    def get_cell(self, row: int, col: int) -> Optional[Cell]:
        """Получение ячейки"""
        if 0 <= row < self.rows and 0 <= col < self.columns:
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
        # Парсинг ссылки типа "A1"
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
        """Пересчет всех формул"""
        for row in range(self.rows):
            for col in range(self.columns):
                cell = self.get_cell(row, col)
                if cell and cell.formula:
                    try:
                        result = self.formula_engine.evaluate(
                            cell.formula[1:],
                            self.get_cell_data
                        )
                        cell.set_calculated_value(str(result))
                    except Exception as e:
                        cell.set_calculated_value(f"#ERROR: {str(e)}")

    def get_data(self) -> List[List[str]]:
        """Получение всех данных в виде списка"""
        data = []
        for row in range(self.rows):
            row_data = []
            for col in range(self.columns):
                cell = self.get_cell(row, col)
                row_data.append(cell.value if cell else "")
            data.append(row_data)
        return data

    def load_from_dataframe(self, df: pd.DataFrame):
        """Загрузка данных из DataFrame"""
        self.rows = len(df)
        self.columns = len(df.columns) if len(df.columns) > 0 else 26

        self.initialize_cells()

        for row_idx, row in df.iterrows():
            for col_idx, value in enumerate(row):
                if row_idx < self.rows and col_idx < self.columns:
                    self.set_cell_value(row_idx, col_idx, str(value))

        self.modified = False

    def load_from_data(self, data: List[List[str]]):
        """Загрузка данных из списка"""
        if not data:
            return

        self.rows = len(data)
        self.columns = max(len(row) for row in data) if data else 26

        self.initialize_cells()

        for row_idx, row_data in enumerate(data):
            for col_idx, value in enumerate(row_data):
                if row_idx < self.rows and col_idx < self.columns:
                    self.set_cell_value(row_idx, col_idx, str(value))

        self.modified = False

    def to_dict(self) -> Dict[str, Any]:
        """Сериализация в словарь"""
        cells_data = []
        for row in range(self.rows):
            for col in range(self.columns):
                cell = self.get_cell(row, col)
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
        sheet = cls(
            name=data['name'],
            index=data['index'],
            rows=data['rows'],
            columns=data['columns']
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