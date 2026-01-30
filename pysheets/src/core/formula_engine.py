"""
Движок вычисления формул
"""

import re
import math
from typing import Callable, Optional, Dict, Any
from datetime import datetime


class FormulaEngine:
    """Класс для вычисления формул"""

    def __init__(self):
        # Регистрация функций
        self.functions = {
            'SUM': self._sum,
            'AVERAGE': self._average,
            'COUNT': self._count,
            'MAX': self._max,
            'MIN': self._min,
            'IF': self._if,
            'CONCATENATE': self._concatenate,
            'NOW': self._now,
            'DATE': self._date,
            'ROUND': self._round,
            'ABS': self._abs,
            'SQRT': self._sqrt,
            'POWER': self._power,
        }

        # Операторы
        self.operators = {
            '+': lambda a, b: a + b,
            '-': lambda a, b: a - b,
            '*': lambda a, b: a * b,
            '/': lambda a, b: a / b if b != 0 else float('inf'),
            '^': lambda a, b: a ** b,
        }

    def evaluate(self, formula: str, cell_resolver: Callable[[str], Optional[str]]) -> Any:
        """Вычисление формулы"""
        try:
            # Очистка формулы
            formula = formula.strip().upper()

            # Проверка на простые операции
            if self._is_simple_operation(formula):
                return self._evaluate_simple_operation(formula, cell_resolver)

            # Проверка на функцию
            if self._is_function_call(formula):
                return self._evaluate_function(formula, cell_resolver)

            # Проверка на ссылку на ячейку
            if self._is_cell_reference(formula):
                value = cell_resolver(formula)
                return self._parse_value(value)

            # Если это просто значение
            return self._parse_value(formula)

        except Exception as e:
            raise ValueError(f"Ошибка вычисления формулы '{formula}': {str(e)}")

    def _is_simple_operation(self, formula: str) -> bool:
        """Проверка на простую операцию"""
        operators_pattern = r'[\+\-\*/\^]'
        return bool(re.search(operators_pattern, formula))

    def _evaluate_simple_operation(self, formula: str, cell_resolver: Callable[[str], Optional[str]]) -> float:
        """Вычисление простой операции"""
        # Разделение на операнды и операторы
        pattern = r'([\+\-\*/\^])'
        parts = re.split(pattern, formula)

        # Первый операнд
        result = self._parse_operand(parts[0].strip(), cell_resolver)

        # Обработка остальных частей
        i = 1
        while i < len(parts):
            operator = parts[i].strip()
            operand = self._parse_operand(parts[i + 1].strip(), cell_resolver)

            if operator in self.operators:
                result = self.operators[operator](result, operand)

            i += 2

        return result

    def _parse_operand(self, operand: str, cell_resolver: Callable[[str], Optional[str]]) -> float:
        """Парсинг операнда"""
        # Если это ссылка на ячейку
        if self._is_cell_reference(operand):
            value = cell_resolver(operand)
            return self._parse_value(value)

        # Если это число
        try:
            return float(operand)
        except ValueError:
            raise ValueError(f"Некорректный операнд: {operand}")

    def _is_function_call(self, formula: str) -> bool:
        """Проверка на вызов функции"""
        pattern = r'^([A-Z_]+)\(.*\)$'
        return bool(re.match(pattern, formula))

    def _evaluate_function(self, formula: str, cell_resolver: Callable[[str], Optional[str]]) -> Any:
        """Вычисление функции"""
        # Извлечение имени функции и аргументов
        match = re.match(r'^([A-Z_]+)\((.*)\)$', formula)
        if not match:
            raise ValueError(f"Некорректный формат функции: {formula}")

        func_name = match.group(1)
        args_str = match.group(2)

        # Проверка наличия функции
        if func_name not in self.functions:
            raise ValueError(f"Неизвестная функция: {func_name}")

        # Парсинг аргументов
        args = self._parse_function_args(args_str, cell_resolver)

        # Вызов функции
        return self.functions[func_name](args, cell_resolver)

    def _parse_function_args(self, args_str: str, cell_resolver: Callable[[str], Optional[str]]) -> list:
        """Парсинг аргументов функции"""
        args = []
        current_arg = ''
        parentheses = 0

        for char in args_str:
            if char == '(':
                parentheses += 1
                current_arg += char
            elif char == ')':
                parentheses -= 1
                current_arg += char
            elif char == ',' and parentheses == 0:
                args.append(current_arg.strip())
                current_arg = ''
            else:
                current_arg += char

        if current_arg:
            args.append(current_arg.strip())

        return args

    def _is_cell_reference(self, text: str) -> bool:
        """Проверка на ссылку на ячейку"""
        pattern = r'^[A-Z]+\d+$'
        return bool(re.match(pattern, text.upper()))

    def _parse_value(self, value: Optional[str]) -> float:
        """Парсинг значения"""
        if value is None:
            return 0.0

        # Удаление символов валют и процентов
        value = str(value).strip()
        value = value.replace('$', '').replace('%', '')

        # Проверка на пустую строку
        if not value:
            return 0.0

        # Попытка преобразовать в число
        try:
            # Замена запятой на точку для десятичных дробей
            value = value.replace(',', '.')
            return float(value)
        except ValueError:
            # Если не число, возвращаем 0
            return 0.0

    # ============ РЕАЛИЗАЦИИ ФУНКЦИЙ ============

    def _sum(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> float:
        """Сумма значений"""
        total = 0.0
        for arg in args:
            # Проверка на диапазон ячеек
            if ':' in arg:
                values = self._get_range_values(arg, cell_resolver)
                total += sum(values)
            else:
                value = self.evaluate(arg, cell_resolver)
                total += float(value)
        return total

    def _average(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> float:
        """Среднее значение"""
        values = []
        for arg in args:
            if ':' in arg:
                range_values = self._get_range_values(arg, cell_resolver)
                values.extend(range_values)
            else:
                value = self.evaluate(arg, cell_resolver)
                values.append(float(value))

        if not values:
            return 0.0
        return sum(values) / len(values)

    def _count(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> int:
        """Количество значений"""
        count = 0
        for arg in args:
            if ':' in arg:
                values = self._get_range_values(arg, cell_resolver)
                count += len([v for v in values if v != 0])
            else:
                value = cell_resolver(arg) if self._is_cell_reference(arg) else arg
                if value and str(value).strip():
                    count += 1
        return count

    def _max(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> float:
        """Максимальное значение"""
        values = []
        for arg in args:
            if ':' in arg:
                range_values = self._get_range_values(arg, cell_resolver)
                values.extend(range_values)
            else:
                value = self.evaluate(arg, cell_resolver)
                values.append(float(value))

        if not values:
            return 0.0
        return max(values)

    def _min(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> float:
        """Минимальное значение"""
        values = []
        for arg in args:
            if ':' in arg:
                range_values = self._get_range_values(arg, cell_resolver)
                values.extend(range_values)
            else:
                value = self.evaluate(arg, cell_resolver)
                values.append(float(value))

        if not values:
            return 0.0
        return min(values)

    def _if(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> Any:
        """Условная функция"""
        if len(args) < 2:
            raise ValueError("Функция IF требует минимум 2 аргумента")

        condition = args[0]
        value_if_true = args[1]
        value_if_false = args[2] if len(args) > 2 else ""

        # Вычисление условия
        cond_value = self.evaluate(condition, cell_resolver)

        if cond_value:
            return self.evaluate(value_if_true, cell_resolver)
        else:
            return self.evaluate(value_if_false, cell_resolver) if value_if_false else ""

    def _concatenate(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> str:
        """Конкатенация строк"""
        result = ''
        for arg in args:
            if self._is_cell_reference(arg):
                value = cell_resolver(arg)
                result += str(value) if value else ''
            else:
                # Удаление кавычек для строковых литералов
                if arg.startswith('"') and arg.endswith('"'):
                    arg = arg[1:-1]
                result += arg
        return result

    def _now(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> str:
        """Текущая дата и время"""
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def _date(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> str:
        """Создание даты"""
        if len(args) >= 3:
            try:
                year = int(float(args[0]))
                month = int(float(args[1]))
                day = int(float(args[2]))
                return f"{year:04d}-{month:02d}-{day:02d}"
            except:
                pass
        return ""

    def _round(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> float:
        """Округление числа"""
        if len(args) >= 1:
            number = float(self.evaluate(args[0], cell_resolver))
            decimals = int(float(args[1])) if len(args) > 1 else 0
            return round(number, decimals)
        return 0.0

    def _abs(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> float:
        """Абсолютное значение"""
        if args:
            number = float(self.evaluate(args[0], cell_resolver))
            return abs(number)
        return 0.0

    def _sqrt(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> float:
        """Квадратный корень"""
        if args:
            number = float(self.evaluate(args[0], cell_resolver))
            return math.sqrt(number) if number >= 0 else float('nan')
        return 0.0

    def _power(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> float:
        """Возведение в степень"""
        if len(args) >= 2:
            base = float(self.evaluate(args[0], cell_resolver))
            exponent = float(self.evaluate(args[1], cell_resolver))
            return base ** exponent
        return 0.0

    def _get_range_values(self, range_str: str, cell_resolver: Callable[[str], Optional[str]]) -> list:
        """Получение значений из диапазона"""
        values = []

        # Разделение на начальную и конечную ячейки
        if ':' in range_str:
            start, end = range_str.split(':')

            # Парсинг координат
            start_col, start_row = self._parse_cell_reference(start)
            end_col, end_row = self._parse_cell_reference(end)

            if start_col is not None and start_row is not None and end_col is not None and end_row is not None:
                for row in range(start_row, end_row + 1):
                    for col in range(start_col, end_col + 1):
                        # Преобразование координат в ссылку на ячейку
                        col_letter = self._col_number_to_letter(col)
                        cell_ref = f"{col_letter}{row}"

                        value = cell_resolver(cell_ref)
                        parsed_value = self._parse_value(value)
                        values.append(parsed_value)

        return values

    def _parse_cell_reference(self, cell_ref: str) -> tuple:
        """Парсинг ссылки на ячейку"""
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

            return col, row

        return None, None

    def _col_number_to_letter(self, col: int) -> str:
        """Преобразование номера столбца в буквенное обозначение"""
        result = ''
        col += 1  # Перевод в 1-based индекс

        while col > 0:
            col -= 1
            result = chr(ord('A') + (col % 26)) + result
            col //= 26

        return result