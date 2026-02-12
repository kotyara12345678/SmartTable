"""
Модель рабочей книги
"""

import json
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field

from pysheets.src.core.sheet.spread import Spreadsheet


@dataclass
class Workbook:
    """Класс рабочей книги"""

    sheets: List[Spreadsheet] = field(default_factory=list)
    active_sheet_index: int = 0
    file_path: Optional[str] = None
    modified: bool = False

    def __post_init__(self):
        """Инициализация после создания"""
        if not self.sheets:
            self.add_sheet("Лист1")
            # Сброс флага модификации после начальной инициализации
            self.modified = False
            for sheet in self.sheets:
                sheet.modified = False

    def add_sheet(self, name: str) -> 'Spreadsheet':
        """Добавление нового листа"""
        sheet = Spreadsheet(name, len(self.sheets))
        self.sheets.append(sheet)
        self.modified = True
        return sheet

    def add_sheet_from_dataframe(self, df, name: str) -> 'Spreadsheet':
        """Добавление листа из DataFrame"""
        sheet = self.add_sheet(name)
        sheet.load_from_dataframe(df)
        return sheet

    def remove_sheet(self, index: int) -> bool:
        """Удаление листа"""
        if 0 <= index < len(self.sheets):
            if len(self.sheets) > 1:
                self.sheets.pop(index)
                self.modified = True
                # Корректировка индекса активного листа
                if self.active_sheet_index >= len(self.sheets):
                    self.active_sheet_index = len(self.sheets) - 1
                return True
        return False

    def get_sheet(self, index: int) -> Optional[Spreadsheet]:
        """Получение листа по индексу"""
        if 0 <= index < len(self.sheets):
            return self.sheets[index]
        return None

    def get_active_sheet(self) -> Optional[Spreadsheet]:
        """Получение активного листа"""
        return self.get_sheet(self.active_sheet_index)

    def set_active_sheet(self, index: int) -> bool:
        """Установка активного листа"""
        if 0 <= index < len(self.sheets):
            self.active_sheet_index = index
            return True
        return False

    def rename_sheet(self, index: int, new_name: str) -> bool:
        """Переименование листа"""
        sheet = self.get_sheet(index)
        if sheet:
            sheet.name = new_name
            self.modified = True
            return True
        return False

    def move_sheet(self, from_index: int, to_index: int) -> bool:
        """Перемещение листа"""
        if (0 <= from_index < len(self.sheets) and
                0 <= to_index < len(self.sheets)):
            sheet = self.sheets.pop(from_index)
            self.sheets.insert(to_index, sheet)
            self.modified = True
            # Корректировка индекса активного листа
            if self.active_sheet_index == from_index:
                self.active_sheet_index = to_index
            elif from_index < to_index and self.active_sheet_index > from_index and self.active_sheet_index <= to_index:
                self.active_sheet_index -= 1
            elif from_index > to_index and self.active_sheet_index >= to_index and self.active_sheet_index < from_index:
                self.active_sheet_index += 1
            return True
        return False

    def sheet_names(self) -> List[str]:
        """Получение списка имен листов"""
        return [sheet.name for sheet in self.sheets]

    def get_sheet_data(self, sheet_name: str) -> List[List[str]]:
        """Получение данных листа"""
        for sheet in self.sheets:
            if sheet.name == sheet_name:
                return sheet.get_data()
        return []

    def set_cell_value(self, sheet_index: int, row: int, col: int, value: str):
        """Установка значения ячейки"""
        sheet = self.get_sheet(sheet_index)
        if sheet:
            sheet.set_cell_value(row, col, value)
            self.modified = True

    def get_cell_value(self, sheet_index: int, row: int, col: int) -> Optional[str]:
        """Получение значения ячейки"""
        sheet = self.get_sheet(sheet_index)
        if sheet:
            return sheet.get_cell_value(row, col)
        return None

    def calculate_all_formulas(self):
        """Пересчет всех формул"""
        for sheet in self.sheets:
            sheet.calculate_formulas()

    def to_dict(self) -> Dict[str, Any]:
        """Сериализация в словарь"""
        return {
            'sheets': [sheet.to_dict() for sheet in self.sheets],
            'active_sheet_index': self.active_sheet_index,
            'file_path': self.file_path
        }

    def from_dict(self, data: Dict[str, Any]) -> 'Workbook':
        """Десериализация из словаря"""
        self.sheets = [Spreadsheet.from_dict(sheet_data) for sheet_data in data.get('sheets', [])]
        self.active_sheet_index = data.get('active_sheet_index', 0)
        self.file_path = data.get('file_path')
        self.modified = False
        return self

    def save_to_json(self, file_path: str):
        """Сохранение в JSON файл"""
        data = self.to_dict()
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        self.file_path = file_path
        self.modified = False

    def load_from_json(self, file_path: str):
        """Загрузка из JSON файла"""
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        self.from_dict(data)
        self.file_path = file_path
        self.modified = False

    def is_modified(self) -> bool:
        """Проверка наличия изменений"""
        if self.modified:
            return True
        for sheet in self.sheets:
            if sheet.is_modified():
                return True
        return False