"""
Вспомогательные функции
"""

import logging
import json
from pathlib import Path
from typing import Optional
from PyQt5.QtWidgets import QMessageBox

def setup_logging():
    """Настройка логирования"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('smarttable.log'),
            logging.StreamHandler()
        ]
    )

def load_settings() -> dict:
    """Загрузка настроек"""
    settings_file = Path("settings.json")
    if settings_file.exists():
        try:
            with open(settings_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return {}

def save_settings(settings: dict):
    """Сохранение настроек"""
    try:
        with open("settings.json", 'w', encoding='utf-8') as f:
            json.dump(settings, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logging.error(f"Ошибка сохранения настроек: {e}")

def show_error_message(parent, message: str, title: str = "Ошибка"):
    """Показать сообщение об ошибке"""
    QMessageBox.critical(parent, title, message)

def show_info_message(parent, message: str, title: str = "Информация"):
    """Показать информационное сообщение"""
    QMessageBox.information(parent, title, message)

def show_warning_message(parent, message: str, title: str = "Предупреждение"):
    """Показать предупреждение"""
    QMessageBox.warning(parent, title, message)

def parse_cell_reference(cell_ref: str) -> tuple:
    """Парсинг ссылки на ячейку"""
    import re

    match = re.match(r'^([A-Z]+)(\d+)$', cell_ref.upper())
    if match:
        col_str = match.group(1)
        row_str = match.group(2)

        # Конвертация букв столбца в число
        col = 0
        for char in col_str:
            col = col * 26 + (ord(char) - ord('A') + 1)
        col -= 1  # Перевод в 0-based индекс

        row = int(row_str) - 1  # Перевод в 0-based индекс

        return row, col

    return None, None

def validate_formula(formula: str) -> bool:
    """Проверка валидности формулы"""
    if not formula.startswith('='):
        return False

    # Проверка на корректные символы
    valid_chars = set('=+-*/^()0123456789. ,"ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    if not all(c in valid_chars for c in formula.upper()):
        return False

    return True