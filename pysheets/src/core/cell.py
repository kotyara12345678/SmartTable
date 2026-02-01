"""
Модель ячейки таблицы
"""

from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime


@dataclass
class Cell:
    """Класс ячейки электронной таблицы"""

    row: int
    column: int
    value: str = ""
    formula: Optional[str] = None
    calculated_value: str = ""
    data_type: str = "text"  # text, number, date, formula

    # Форматирование
    font_family: str = "Arial"
    font_size: int = 11
    bold: bool = False
    italic: bool = False
    underline: bool = False
    strike: bool = False  # перечёркнутый
    text_color: str = "#000000"
    background_color: str = "#FFFFFF"
    alignment: str = "left"  # left, center, right

    # Метаданные
    modified_at: datetime = field(default_factory=datetime.now)
    locked: bool = False

    def set_value(self, value: str):
        """Установка значения ячейки"""
        self.value = value
        self.modified_at = datetime.now()

        # Определение типа данных
        self.detect_data_type()

    def set_formula(self, formula: Optional[str]):
        """Установка формулы"""
        self.formula = formula
        if formula:
            self.data_type = "formula"

    def set_calculated_value(self, value: str):
        """Установка вычисленного значения"""
        self.calculated_value = value

    def detect_data_type(self):
        """Определение типа данных"""
        if not self.value:
            self.data_type = "text"
        elif self.value.startswith('='):
            self.data_type = "formula"
        elif self.value.replace('.', '', 1).isdigit():
            self.data_type = "number"
        else:
            # Попытка распознать дату
            try:
                datetime.strptime(self.value, "%Y-%m-%d")
                self.data_type = "date"
            except:
                try:
                    datetime.strptime(self.value, "%d.%m.%Y")
                    self.data_type = "date"
                except:
                    self.data_type = "text"

    def get_display_value(self) -> str:
        """Получение значения для отображения"""
        if self.formula and self.calculated_value:
            return self.calculated_value
        return self.value

    def to_dict(self) -> dict:
        """Сериализация в словарь"""
        return {
            'row': self.row,
            'column': self.column,
            'value': self.value,
            'formula': self.formula,
            'calculated_value': self.calculated_value,
            'data_type': self.data_type,
            'font_family': self.font_family,
            'font_size': self.font_size,
            'bold': self.bold,
            'italic': self.italic,
            'underline': self.underline,
            'strike': self.strike,
            'text_color': self.text_color,
            'background_color': self.background_color,
            'alignment': self.alignment,
            'locked': self.locked
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'Cell':
        """Десериализация из словаря"""
        cell = cls(
            row=data['row'],
            column=data['column'],
            value=data['value'],
            formula=data.get('formula'),
            calculated_value=data.get('calculated_value', ''),
            data_type=data.get('data_type', 'text'),
            font_family=data.get('font_family', 'Arial'),
            font_size=data.get('font_size', 11),
            bold=data.get('bold', False),
            italic=data.get('italic', False),
            underline=data.get('underline', False),
            strike=data.get('strike', False),
            text_color=data.get('text_color', '#000000'),
            background_color=data.get('background_color', '#FFFFFF'),
            alignment=data.get('alignment', 'left'),
            locked=data.get('locked', False)
        )
        return cell