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
            # Математические функции
            'SUM': self._sum,
            'AVERAGE': self._average,
            'COUNT': self._count,
            'MAX': self._max,
            'MIN': self._min,
            'ROUND': self._round,
            'ABS': self._abs,
            'SQRT': self._sqrt,
            'POWER': self._power,
            'MOD': self._mod,
            
            # Логические функции
            'IF': self._if,
            
            # Дата и время
            'NOW': self._now,
            'TODAY': self._today,
            'DATE': self._date,
            
            # Текстовые функции
            'CONCATENATE': self._concatenate,
            'CONCAT': self._concatenate,  # Алиас
            'LEN': self._len,
            'UPPER': self._upper,
            'LOWER': self._lower,
            'PROPER': self._proper,
            'TRIM': self._trim,
            'LEFT': self._left,
            'RIGHT': self._right,
            'MID': self._mid,
            'FIND': self._find,
            'SEARCH': self._search,
            'REPLACE': self._replace,
            'SUBSTITUTE': self._substitute,
            'REPT': self._rept,
            'TEXT': self._text,
            'VALUE': self._value,
            'CHAR': self._char,
            'CODE': self._code,
            'CLEAN': self._clean,
            'EXACT': self._exact,
            'T': self._t,
            'TEXTJOIN': self._textjoin,
            'NUMBERVALUE': self._numbervalue,
            'FIXED': self._fixed,
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
            # Если это диапазон, берем первое значение
            arg0 = args[0]
            if ':' in arg0:
                values = self._get_range_values(arg0, cell_resolver)
                number = float(values[0]) if values else 0.0
            else:
                number = float(self.evaluate(arg0, cell_resolver))
            decimals = int(float(self.evaluate(args[1], cell_resolver))) if len(args) > 1 else 0
            return round(number, decimals)
        return 0.0

    def _abs(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> float:
        """Абсолютное значение"""
        if args:
            # Если это диапазон, берем первое значение
            arg = args[0]
            if ':' in arg:
                values = self._get_range_values(arg, cell_resolver)
                number = float(values[0]) if values else 0.0
            else:
                number = float(self.evaluate(arg, cell_resolver))
            return abs(number)
        return 0.0

    def _sqrt(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> float:
        """Квадратный корень"""
        if args:
            # Если это диапазон, берем первое значение
            arg = args[0]
            if ':' in arg:
                values = self._get_range_values(arg, cell_resolver)
                number = float(values[0]) if values else 0.0
            else:
                number = float(self.evaluate(arg, cell_resolver))
            return math.sqrt(number) if number >= 0 else float('nan')
        return 0.0

    def _power(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> float:
        """Возведение в степень"""
        if len(args) >= 2:
            # Если это диапазон, берем первое значение
            arg0 = args[0]
            if ':' in arg0:
                values = self._get_range_values(arg0, cell_resolver)
                base = float(values[0]) if values else 0.0
            else:
                base = float(self.evaluate(arg0, cell_resolver))
            
            arg1 = args[1]
            if ':' in arg1:
                values = self._get_range_values(arg1, cell_resolver)
                exponent = float(values[0]) if values else 0.0
            else:
                exponent = float(self.evaluate(arg1, cell_resolver))
            
            return base ** exponent
        return 0.0

    def _mod(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> float:
        """Остаток от деления (модуль)"""
        if len(args) >= 2:
            # Если это диапазон, берем первое значение
            arg0 = args[0]
            if ':' in arg0:
                values = self._get_range_values(arg0, cell_resolver)
                dividend = float(values[0]) if values else 0.0
            else:
                dividend = float(self.evaluate(arg0, cell_resolver))
            
            arg1 = args[1]
            if ':' in arg1:
                values = self._get_range_values(arg1, cell_resolver)
                divisor = float(values[0]) if values else 0.0
            else:
                divisor = float(self.evaluate(arg1, cell_resolver))
            
            if divisor == 0:
                raise ValueError("Деление на ноль")
            return dividend % divisor
        return 0.0

    def _today(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> str:
        """Текущая дата"""
        return datetime.now().strftime("%Y-%m-%d")

    # ============ ТЕКСТОВЫЕ ФУНКЦИИ ============

    def _get_text_value(self, arg: str, cell_resolver: Callable[[str], Optional[str]]) -> str:
        """Получение текстового значения из аргумента"""
        if self._is_cell_reference(arg):
            value = cell_resolver(arg)
            return str(value) if value is not None else ''
        else:
            # Удаление кавычек для строковых литералов
            if arg.startswith('"') and arg.endswith('"'):
                return arg[1:-1]
            return arg

    def _len(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> int:
        """Длина текста - LEN(текст)"""
        if args:
            text = self._get_text_value(args[0], cell_resolver)
            return len(text)
        return 0

    def _upper(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> str:
        """Преобразование в верхний регистр - UPPER(текст)"""
        if args:
            text = self._get_text_value(args[0], cell_resolver)
            return text.upper()
        return ''

    def _lower(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> str:
        """Преобразование в нижний регистр - LOWER(текст)"""
        if args:
            text = self._get_text_value(args[0], cell_resolver)
            return text.lower()
        return ''

    def _proper(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> str:
        """Каждое слово с заглавной буквы - PROPER(текст)"""
        if args:
            text = self._get_text_value(args[0], cell_resolver)
            return text.title()
        return ''

    def _trim(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> str:
        """Удаление лишних пробелов - TRIM(текст)"""
        if args:
            text = self._get_text_value(args[0], cell_resolver)
            # Удаляем пробелы по краям и заменяем множественные пробелы на одинарные
            return ' '.join(text.split())
        return ''

    def _left(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> str:
        """Левые символы - LEFT(текст, количество)"""
        if args:
            text = self._get_text_value(args[0], cell_resolver)
            num_chars = 1  # По умолчанию 1 символ
            if len(args) > 1:
                try:
                    num_chars = int(float(self.evaluate(args[1], cell_resolver)))
                except:
                    num_chars = 1
            return text[:num_chars]
        return ''

    def _right(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> str:
        """Правые символы - RIGHT(текст, количество)"""
        if args:
            text = self._get_text_value(args[0], cell_resolver)
            num_chars = 1  # По умолчанию 1 символ
            if len(args) > 1:
                try:
                    num_chars = int(float(self.evaluate(args[1], cell_resolver)))
                except:
                    num_chars = 1
            return text[-num_chars:] if num_chars > 0 else ''
        return ''

    def _mid(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> str:
        """Подстрока из середины - MID(текст, начало, длина)"""
        if len(args) >= 3:
            text = self._get_text_value(args[0], cell_resolver)
            try:
                start = int(float(self.evaluate(args[1], cell_resolver))) - 1  # 1-based в 0-based
                length = int(float(self.evaluate(args[2], cell_resolver)))
                if start < 0:
                    start = 0
                return text[start:start + length]
            except:
                pass
        return ''

    def _find(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> int:
        """Поиск текста (с учётом регистра) - FIND(искать, текст, [начало])"""
        if len(args) >= 2:
            find_text = self._get_text_value(args[0], cell_resolver)
            within_text = self._get_text_value(args[1], cell_resolver)
            start_num = 0
            if len(args) > 2:
                try:
                    start_num = int(float(self.evaluate(args[2], cell_resolver))) - 1
                except:
                    start_num = 0
            
            pos = within_text.find(find_text, start_num)
            if pos >= 0:
                return pos + 1  # 1-based позиция
            else:
                raise ValueError(f"Текст '{find_text}' не найден")
        return 0

    def _search(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> int:
        """Поиск текста (без учёта регистра) - SEARCH(искать, текст, [начало])"""
        if len(args) >= 2:
            find_text = self._get_text_value(args[0], cell_resolver).lower()
            within_text = self._get_text_value(args[1], cell_resolver).lower()
            start_num = 0
            if len(args) > 2:
                try:
                    start_num = int(float(self.evaluate(args[2], cell_resolver))) - 1
                except:
                    start_num = 0
            
            pos = within_text.find(find_text, start_num)
            if pos >= 0:
                return pos + 1  # 1-based позиция
            else:
                raise ValueError(f"Текст не найден")
        return 0

    def _replace(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> str:
        """Замена по позиции - REPLACE(текст, начало, длина, новый_текст)"""
        if len(args) >= 4:
            old_text = self._get_text_value(args[0], cell_resolver)
            try:
                start = int(float(self.evaluate(args[1], cell_resolver))) - 1  # 1-based
                num_chars = int(float(self.evaluate(args[2], cell_resolver)))
                new_text = self._get_text_value(args[3], cell_resolver)
                
                if start < 0:
                    start = 0
                return old_text[:start] + new_text + old_text[start + num_chars:]
            except:
                pass
        return ''

    def _substitute(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> str:
        """Замена текста - SUBSTITUTE(текст, старый, новый, [номер])"""
        if len(args) >= 3:
            text = self._get_text_value(args[0], cell_resolver)
            old_text = self._get_text_value(args[1], cell_resolver)
            new_text = self._get_text_value(args[2], cell_resolver)
            
            if len(args) > 3:
                # Заменить только n-ое вхождение
                try:
                    instance_num = int(float(self.evaluate(args[3], cell_resolver)))
                    count = 0
                    result = ''
                    i = 0
                    while i < len(text):
                        if text[i:i + len(old_text)] == old_text:
                            count += 1
                            if count == instance_num:
                                result += new_text
                            else:
                                result += old_text
                            i += len(old_text)
                        else:
                            result += text[i]
                            i += 1
                    return result
                except:
                    pass
            else:
                # Заменить все вхождения
                return text.replace(old_text, new_text)
        return ''

    def _rept(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> str:
        """Повторение текста - REPT(текст, количество)"""
        if len(args) >= 2:
            text = self._get_text_value(args[0], cell_resolver)
            try:
                times = int(float(self.evaluate(args[1], cell_resolver)))
                return text * max(0, times)
            except:
                pass
        return ''

    def _text(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> str:
        """Форматирование числа как текст - TEXT(число, формат)"""
        if len(args) >= 2:
            try:
                value = float(self.evaluate(args[0], cell_resolver))
                format_str = self._get_text_value(args[1], cell_resolver)
                
                # Базовые форматы
                if format_str == "0":
                    return str(int(value))
                elif format_str == "0.00":
                    return f"{value:.2f}"
                elif format_str == "0.000":
                    return f"{value:.3f}"
                elif format_str == "#,##0":
                    return f"{value:,.0f}"
                elif format_str == "#,##0.00":
                    return f"{value:,.2f}"
                elif format_str == "0%":
                    return f"{value * 100:.0f}%"
                elif format_str == "0.00%":
                    return f"{value * 100:.2f}%"
                else:
                    return str(value)
            except:
                pass
        return ''

    def _value(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> float:
        """Преобразование текста в число - VALUE(текст)"""
        if args:
            text = self._get_text_value(args[0], cell_resolver)
            # Удаляем пробелы, валюту и проценты
            text = text.strip().replace(' ', '').replace('$', '').replace('€', '').replace('₽', '')
            text = text.replace(',', '.')
            
            is_percent = '%' in text
            text = text.replace('%', '')
            
            try:
                value = float(text)
                if is_percent:
                    value /= 100
                return value
            except:
                raise ValueError(f"Не удалось преобразовать '{text}' в число")
        return 0.0

    def _char(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> str:
        """Символ по коду - CHAR(число)"""
        if args:
            try:
                code = int(float(self.evaluate(args[0], cell_resolver)))
                return chr(code)
            except:
                pass
        return ''

    def _code(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> int:
        """Код первого символа - CODE(текст)"""
        if args:
            text = self._get_text_value(args[0], cell_resolver)
            if text:
                return ord(text[0])
        return 0

    def _clean(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> str:
        """Удаление непечатаемых символов - CLEAN(текст)"""
        if args:
            text = self._get_text_value(args[0], cell_resolver)
            # Удаляем все непечатаемые символы (ASCII 0-31)
            return ''.join(char for char in text if ord(char) >= 32)
        return ''

    def _exact(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> bool:
        """Точное сравнение строк - EXACT(текст1, текст2)"""
        if len(args) >= 2:
            text1 = self._get_text_value(args[0], cell_resolver)
            text2 = self._get_text_value(args[1], cell_resolver)
            return text1 == text2
        return False

    def _t(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> str:
        """Возвращает текст или пустую строку - T(значение)"""
        if args:
            value = self._get_text_value(args[0], cell_resolver)
            # Если это число, вернуть пустую строку
            try:
                float(value)
                return ''
            except:
                return value
        return ''

    def _textjoin(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> str:
        """Объединение текста с разделителем - TEXTJOIN(разделитель, игнор_пустых, текст1, ...)"""
        if len(args) >= 3:
            delimiter = self._get_text_value(args[0], cell_resolver)
            try:
                ignore_empty = bool(int(float(self.evaluate(args[1], cell_resolver))))
            except:
                ignore_empty = True
            
            texts = []
            for arg in args[2:]:
                if ':' in arg:
                    # Диапазон ячеек
                    values = self._get_range_text_values(arg, cell_resolver)
                    texts.extend(values)
                else:
                    text = self._get_text_value(arg, cell_resolver)
                    texts.append(text)
            
            if ignore_empty:
                texts = [t for t in texts if t.strip()]
            
            return delimiter.join(texts)
        return ''

    def _get_range_text_values(self, range_str: str, cell_resolver: Callable[[str], Optional[str]]) -> list:
        """Получение текстовых значений из диапазона"""
        values = []
        if ':' in range_str:
            start, end = range_str.split(':')
            start_col, start_row = self._parse_cell_reference(start)
            end_col, end_row = self._parse_cell_reference(end)
            
            if all(v is not None for v in [start_col, start_row, end_col, end_row]):
                for row in range(start_row, end_row + 1):
                    for col in range(start_col, end_col + 1):
                        col_letter = self._col_number_to_letter(col)
                        cell_ref = f"{col_letter}{row + 1}"
                        value = cell_resolver(cell_ref)
                        values.append(str(value) if value is not None else '')
        return values

    def _numbervalue(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> float:
        """Преобразование текста в число с настройками локали - NUMBERVALUE(текст, [дес_разд], [груп_разд])"""
        if args:
            text = self._get_text_value(args[0], cell_resolver)
            decimal_sep = '.' if len(args) < 2 else self._get_text_value(args[1], cell_resolver)
            group_sep = '' if len(args) < 3 else self._get_text_value(args[2], cell_resolver)
            
            # Удаляем разделитель групп
            if group_sep:
                text = text.replace(group_sep, '')
            # Заменяем десятичный разделитель на точку
            if decimal_sep and decimal_sep != '.':
                text = text.replace(decimal_sep, '.')
            
            text = text.strip()
            
            is_percent = '%' in text
            text = text.replace('%', '')
            
            try:
                value = float(text)
                if is_percent:
                    value /= 100
                return value
            except:
                raise ValueError(f"Не удалось преобразовать в число")
        return 0.0

    def _fixed(self, args: list, cell_resolver: Callable[[str], Optional[str]]) -> str:
        """Форматирование числа с фиксированным количеством знаков - FIXED(число, [знаки], [без_разделителей])"""
        if args:
            try:
                number = float(self.evaluate(args[0], cell_resolver))
                decimals = 2  # По умолчанию
                no_commas = False
                
                if len(args) > 1:
                    decimals = int(float(self.evaluate(args[1], cell_resolver)))
                if len(args) > 2:
                    no_commas = bool(int(float(self.evaluate(args[2], cell_resolver))))
                
                if no_commas:
                    return f"{number:.{decimals}f}"
                else:
                    return f"{number:,.{decimals}f}"
            except:
                pass
        return ''

    def _get_range_values(self, range_str: str, cell_resolver: Callable[[str], Optional[str]]) -> list:
        """Получение значений из диапазона (пропускает пустые ячейки)"""
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
                        cell_ref = f"{col_letter}{row + 1}"  # +1 для 1-based индекса

                        value = cell_resolver(cell_ref)
                        # Пропускаем пустые ячейки - не добавляем None и пустые строки
                        if value is not None and str(value).strip():
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