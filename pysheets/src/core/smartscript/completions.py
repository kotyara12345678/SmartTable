"""
SmartScript Completions — автокомплит для редактора

Миксин для SmartScriptInterpreter, содержащий логику автодополнения.
"""

from typing import List


class CompletionsMixin:
    """Миксин: автокомплит SmartScript"""

    @classmethod
    def get_completions(cls) -> List[str]:
        """Возвращает список всех доступных функций и ключевых слов для автокомплита"""
        completions = []

        func_hints = {
            # Основные табличные
            'SUM': 'SUM("A1:A10")',
            'AVERAGE': 'AVERAGE("A1:A10")',
            'AVG': 'AVG("A1:A10")',
            'COUNT': 'COUNT("A1:A10")',
            'MAX': 'MAX("A1:A10")',
            'MIN': 'MIN("A1:A10")',
            'CELL': 'CELL("A1")',
            'RANGE': 'RANGE(1, 10)',
            'COUNTIF': 'COUNTIF("A1:A10", "value")',
            'SUMIF': 'SUMIF("A1:A10", "cond", "B1:B10")',
            'COLUMN': 'COLUMN("A")',
            'ROW_COUNT': 'ROW_COUNT()',
            'COL_COUNT': 'COL_COUNT()',
            # Преобразование типов
            'STR': 'STR(value)',
            'INT': 'INT(value)',
            'FLOAT': 'FLOAT(value)',
            'BOOL': 'BOOL(value)',
            'TYPE': 'TYPE(value)',
            'VALUE': 'VALUE(text)',
            'NUMBERVALUE': 'NUMBERVALUE(text)',
            # Математические
            'ABS': 'ABS(number)',
            'ROUND': 'ROUND(number, digits)',
            'SQRT': 'SQRT(number)',
            'POWER': 'POWER(base, exp)',
            'MOD': 'MOD(number, divisor)',
            'LEN': 'LEN(text)',
            # Логические
            'IF': 'IF(condition, true_val, false_val)',
            # Дата и время
            'NOW': 'NOW()',
            'TODAY': 'TODAY()',
            'DATE': 'DATE(year, month, day)',
            # Текстовые
            'UPPER': 'UPPER(text)',
            'LOWER': 'LOWER(text)',
            'TRIM': 'TRIM(text)',
            'PROPER': 'PROPER(text)',
            'CONCAT': 'CONCAT(a, b, c)',
            'CONCATENATE': 'CONCATENATE(a, b, c)',
            'LEFT': 'LEFT(text, count)',
            'RIGHT': 'RIGHT(text, count)',
            'MID': 'MID(text, start, length)',
            'FIND': 'FIND(search, text)',
            'SEARCH': 'SEARCH(search, text)',
            'REPLACE': 'REPLACE(text, start, length, new)',
            'SUBSTITUTE': 'SUBSTITUTE(text, old, new)',
            'REPT': 'REPT(text, count)',
            'TEXT': 'TEXT(value, format)',
            'CHAR': 'CHAR(code)',
            'CODE': 'CODE(char)',
            'CLEAN': 'CLEAN(text)',
            'EXACT': 'EXACT(text1, text2)',
            'T': 'T(value)',
            'TEXTJOIN': 'TEXTJOIN(delimiter, text1, text2)',
            'FIXED': 'FIXED(number, decimals)',
            # Утилиты
            'PRINT': 'PRINT(value)',
            'print': 'print(value)',
            # AI
            'AI': 'AI("ваш запрос")',
        }

        for func, hint in func_hints.items():
            completions.append(hint)

        completions.extend(cls.KEYWORDS)

        return completions

    def get_instance_completions(self) -> List[str]:
        """Возвращает автокомплит включая пользовательские переменные и функции"""
        completions = self.get_completions()

        # Добавляем пользовательские переменные
        for var_name in self.variables:
            if var_name not in completions:
                completions.append(var_name)

        # Добавляем пользовательские функции
        for func_name, func_def in self.user_functions.items():
            params = ', '.join(func_def['params'])
            hint = f"{func_name}({params})"
            if hint not in completions:
                completions.append(hint)

        return completions
