"""
Валидаторы и парсеры
"""

import re
from typing import Optional, Tuple


def validate_formula(formula: str) -> bool:
    """Проверка валидности формулы"""
    if not formula.startswith('='):
        return False

    # Проверка на корректные символы
    formula_upper = formula.upper()
    valid_chars = set('=+-*/^()0123456789. ,"ABCDEFGHIJKLMNOPQRSTUVWXYZ:')
    if not all(c in valid_chars for c in formula_upper):
        return False

    # Проверка баланса скобок
    if formula_upper.count('(') != formula_upper.count(')'):
        return False

    return True


def parse_cell_reference(cell_ref: str) -> Tuple[Optional[int], Optional[int]]:
    """Парсинг ссылки на ячейку (например, "A1" -> (0, 0))"""
    match = re.match(r'^([A-Z]+)(\d+)$', cell_ref.upper())
    if match:
        col_str = match.group(1)
        row_str = match.group(2)

        # Конвертация букв столбца в число (0-based)
        col = 0
        for char in col_str:
            col = col * 26 + (ord(char) - ord('A') + 1)
        col -= 1

        row = int(row_str) - 1  # 0-based индекс

        return row, col

    return None, None


def parse_range_reference(range_ref: str) -> Tuple[Optional[int], Optional[int], Optional[int], Optional[int]]:
    """Парсинг ссылки на диапазон (например, "A1:C3")"""
    if ':' in range_ref:
        start_ref, end_ref = range_ref.split(':')
        start_row, start_col = parse_cell_reference(start_ref)
        end_row, end_col = parse_cell_reference(end_ref)

        return start_row, start_col, end_row, end_col

    return None, None, None, None


def is_numeric(value: str) -> bool:
    """Проверка, является ли строка числом"""
    try:
        float(value.replace(',', '.'))
        return True
    except ValueError:
        return False


def is_date(value: str) -> bool:
    """Проверка, является ли строка датой"""
    date_patterns = [
        r'^\d{4}-\d{2}-\d{2}$',
        r'^\d{2}\.\d{2}\.\d{4}$',
        r'^\d{2}/\d{2}/\d{4}$',
    ]

    for pattern in date_patterns:
        if re.match(pattern, value):
            return True

    return False


def sanitize_input(value: str) -> str:
    """Очистка ввода от потенциально опасных символов"""
    # Удаляем управляющие символы
    sanitized = ''.join(char for char in value if ord(char) >= 32)

    # Ограничиваем длину
    if len(sanitized) > 1000:
        sanitized = sanitized[:1000]

    return sanitized


def validate_file_extension(filename: str, extensions: list) -> bool:
    """Проверка расширения файла"""
    return any(filename.lower().endswith(ext.lower()) for ext in extensions)