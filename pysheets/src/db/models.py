"""
Модели данных для SQLite базы данных - упрощённая версия
Только для работы с таблицами и функциями
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class Spreadsheet:
    """Модель таблицы"""
    id: Optional[int] = None
    filename: str = ""
    title: str = ""
    content: str = ""  # JSON данные таблицы
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    file_size: int = 0
    is_recent: bool = False
    
    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'title': self.title,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'file_size': self.file_size,
        }


@dataclass
class SheetFunction:
    """Модель функции/шаблона"""
    id: Optional[int] = None
    name: str = ""
    category: str = ""  # math, text, date, finance, etc
    formula: str = ""
    description: str = ""
    example: str = ""
    created_at: Optional[datetime] = None


@dataclass
class RecentFile:
    """Модель недавно открытого файла"""
    id: Optional[int] = None
    filename: str = ""
    file_path: str = ""
    opened_at: Optional[datetime] = None
    size_mb: float = 0.0
