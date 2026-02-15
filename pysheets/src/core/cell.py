"""
Модель ячейки таблицы
"""

from dataclasses import dataclass, field, asdict
from typing import Optional
import json

@dataclass
class Cell:
    """Класс ячейки таблицы"""

    row: int
    column: int
    value: str = ""
    formula: Optional[str] = None
    calculated_value: str = ""

    # Форматирование
    font_family: str = "Arial"
    font_size: int = 11
    bold: bool = False
    italic: bool = False
    underline: bool = False
    strike: bool = False
    text_color: Optional[str] = None
    background_color: Optional[str] = None
    alignment: str = "left"  # left, center, right
    dropdown_options: Optional[list] = None  # Список вариантов для выпадающего списка

    def set_value(self, value: str):
        """Установка значения ячейки"""
        self.value = str(value)
        if not self.formula:
            self.calculated_value = str(value)

    def set_formula(self, formula: str):
        """Установка формулы"""
        self.formula = formula

    def set_calculated_value(self, value: str):
        """Установка вычисленного значения"""
        self.calculated_value = str(value)

    def get_display_value(self) -> str:
        """Получение значения для отображения"""
        return self.calculated_value or self.value or ""

    def to_dict(self) -> dict:
        """Сериализация в словарь"""
        return {
            'row': self.row,
            'column': self.column,
            'value': self.value,
            'formula': self.formula,
            'calculated_value': self.calculated_value,
            'font_family': self.font_family,
            'font_size': self.font_size,
            'bold': self.bold,
            'italic': self.italic,
            'underline': self.underline,
            'strike': self.strike,
            'text_color': self.text_color,
            'background_color': self.background_color,
            'alignment': self.alignment,
            'dropdown_options': self.dropdown_options
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'Cell':
        """Десериализация из словаря"""
        return cls(
            row=data.get('row', 0),
            column=data.get('column', 0),
            value=data.get('value', ''),
            formula=data.get('formula'),
            calculated_value=data.get('calculated_value', ''),
            font_family=data.get('font_family', 'Arial'),
            font_size=data.get('font_size', 11),
            bold=data.get('bold', False),
            italic=data.get('italic', False),
            underline=data.get('underline', False),
            strike=data.get('strike', False),
            text_color=data.get('text_color', None),
            background_color=data.get('background_color', None),
            alignment=data.get('alignment', 'left'),
            dropdown_options=data.get('dropdown_options', None)
        )

    def __str__(self) -> str:
        """Строковое представление"""
        if self.formula:
            return f"Cell({self.row},{self.col}): {self.formula} = {self.calculated_value}"
        return f"Cell({self.row},{self.col}): {self.value}"

    @property
    def col(self) -> int:
        """Алиас для column"""
        return self.column