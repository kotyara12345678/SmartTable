"""
SmartScript Builtins — встроенные функции и парсинг аргументов

Миксин для SmartScriptInterpreter, содержащий вызов встроенных функций.
"""

import re
from typing import Any, List

from pysheets.src.core.smartscript.errors import SmartScriptError

# Regex для голых ссылок на ячейки
_CELL_REF_PATTERN = re.compile(r'^[A-Z]{1,3}\d+$')


class BuiltinsMixin:
    """Миксин: встроенные функции SmartScript"""

    def _call_function(self, name: str, args_str: str, line_num: int) -> Any:
        """Вызывает встроенную функцию"""
        args = self._parse_args(args_str, line_num)

        # Функции работы с таблицей
        if name == 'CELL':
            return self._table_funcs.func_cell(args, line_num)
        elif name == 'SUM':
            return self._table_funcs.func_sum(args, line_num)
        elif name in ('AVERAGE', 'AVG'):
            return self._table_funcs.func_average(args, line_num)
        elif name == 'COUNT':
            return self._table_funcs.func_count(args, line_num)
        elif name == 'MAX':
            return self._table_funcs.func_max(args, line_num)
        elif name == 'MIN':
            return self._table_funcs.func_min(args, line_num)
        elif name == 'COUNTIF':
            return self._table_funcs.func_countif(args, line_num)
        elif name == 'SUMIF':
            return self._table_funcs.func_sumif(args, line_num)
        elif name == 'COLUMN':
            return self._table_funcs.func_column(args, line_num)
        elif name == 'ROW_COUNT':
            return self._table_funcs.func_row_count(args, line_num)
        elif name == 'COL_COUNT':
            return self._table_funcs.func_col_count(args, line_num)

        # Утилиты
        elif name == 'RANGE':
            return self._table_funcs.func_range(args, line_num)
        elif name == 'STR':
            if len(args) != 1:
                raise SmartScriptError("STR() принимает 1 аргумент", line_num)
            return str(args[0])
        elif name == 'INT':
            if len(args) != 1:
                raise SmartScriptError("INT() принимает 1 аргумент", line_num)
            try:
                return int(float(args[0]))
            except (ValueError, TypeError):
                raise SmartScriptError(f"Невозможно преобразовать '{args[0]}' в INT", line_num)
        elif name == 'FLOAT':
            if len(args) != 1:
                raise SmartScriptError("FLOAT() принимает 1 аргумент", line_num)
            try:
                return float(args[0])
            except (ValueError, TypeError):
                raise SmartScriptError(f"Невозможно преобразовать '{args[0]}' в FLOAT", line_num)
        elif name == 'LEN':
            if len(args) != 1:
                raise SmartScriptError("LEN() принимает 1 аргумент", line_num)
            return len(str(args[0]))
        elif name == 'ABS':
            if len(args) != 1:
                raise SmartScriptError("ABS() принимает 1 аргумент", line_num)
            return abs(float(args[0]))
        elif name == 'ROUND':
            if len(args) < 1 or len(args) > 2:
                raise SmartScriptError("ROUND() принимает 1-2 аргумента", line_num)
            digits = int(args[1]) if len(args) == 2 else 0
            return round(float(args[0]), digits)
        elif name == 'UPPER':
            if len(args) != 1:
                raise SmartScriptError("UPPER() принимает 1 аргумент", line_num)
            return str(args[0]).upper()
        elif name == 'LOWER':
            if len(args) != 1:
                raise SmartScriptError("LOWER() принимает 1 аргумент", line_num)
            return str(args[0]).lower()
        elif name == 'TRIM':
            if len(args) != 1:
                raise SmartScriptError("TRIM() принимает 1 аргумент", line_num)
            return str(args[0]).strip()
        elif name == 'CONCAT':
            return "".join(str(a) for a in args)

        # Математические
        elif name == 'SQRT':
            if len(args) != 1:
                raise SmartScriptError("SQRT() принимает 1 аргумент", line_num)
            import math
            return math.sqrt(float(args[0]))
        elif name == 'POWER':
            if len(args) != 2:
                raise SmartScriptError("POWER() принимает 2 аргумента", line_num)
            return float(args[0]) ** float(args[1])
        elif name == 'MOD':
            if len(args) != 2:
                raise SmartScriptError("MOD() принимает 2 аргумента", line_num)
            return float(args[0]) % float(args[1])

        # Логические
        elif name == 'IF':
            if len(args) != 3:
                raise SmartScriptError("IF() принимает 3 аргумента: IF(cond, true_val, false_val)", line_num)
            return args[1] if args[0] else args[2]

        # Дата и время
        elif name == 'NOW':
            from datetime import datetime
            return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        elif name == 'TODAY':
            from datetime import datetime
            return datetime.now().strftime("%Y-%m-%d")
        elif name == 'DATE':
            if len(args) != 3:
                raise SmartScriptError("DATE() принимает 3 аргумента: DATE(year, month, day)", line_num)
            return f"{int(args[0])}-{int(args[1]):02d}-{int(args[2]):02d}"

        # Текстовые расширенные
        elif name == 'CONCATENATE':
            return "".join(str(a) for a in args)
        elif name == 'PROPER':
            if len(args) != 1:
                raise SmartScriptError("PROPER() принимает 1 аргумент", line_num)
            return str(args[0]).title()
        elif name == 'LEFT':
            if len(args) != 2:
                raise SmartScriptError("LEFT() принимает 2 аргумента", line_num)
            return str(args[0])[:int(args[1])]
        elif name == 'RIGHT':
            if len(args) != 2:
                raise SmartScriptError("RIGHT() принимает 2 аргумента", line_num)
            return str(args[0])[-int(args[1]):]
        elif name == 'MID':
            if len(args) != 3:
                raise SmartScriptError("MID() принимает 3 аргумента", line_num)
            start = int(args[1]) - 1
            length = int(args[2])
            return str(args[0])[start:start + length]
        elif name == 'FIND':
            if len(args) < 2:
                raise SmartScriptError("FIND() принимает 2-3 аргумента", line_num)
            text = str(args[1])
            search = str(args[0])
            start = int(args[2]) - 1 if len(args) > 2 else 0
            pos = text.find(search, start)
            return pos + 1 if pos >= 0 else -1
        elif name == 'SEARCH':
            if len(args) < 2:
                raise SmartScriptError("SEARCH() принимает 2-3 аргумента", line_num)
            text = str(args[1]).lower()
            search = str(args[0]).lower()
            start = int(args[2]) - 1 if len(args) > 2 else 0
            pos = text.find(search, start)
            return pos + 1 if pos >= 0 else -1
        elif name == 'REPLACE':
            if len(args) != 4:
                raise SmartScriptError("REPLACE() принимает 4 аргумента", line_num)
            text = str(args[0])
            start = int(args[1]) - 1
            length = int(args[2])
            new_text = str(args[3])
            return text[:start] + new_text + text[start + length:]
        elif name == 'SUBSTITUTE':
            if len(args) < 3:
                raise SmartScriptError("SUBSTITUTE() принимает 3-4 аргумента", line_num)
            text = str(args[0])
            old = str(args[1])
            new = str(args[2])
            if len(args) > 3:
                count = int(args[3])
                return text.replace(old, new, count)
            return text.replace(old, new)
        elif name == 'REPT':
            if len(args) != 2:
                raise SmartScriptError("REPT() принимает 2 аргумента", line_num)
            return str(args[0]) * int(args[1])
        elif name == 'TEXT':
            if len(args) != 2:
                raise SmartScriptError("TEXT() принимает 2 аргумента", line_num)
            return str(args[0])
        elif name == 'VALUE':
            if len(args) != 1:
                raise SmartScriptError("VALUE() принимает 1 аргумент", line_num)
            try:
                return float(args[0])
            except (ValueError, TypeError):
                raise SmartScriptError(f"Невозможно преобразовать '{args[0]}' в число", line_num)
        elif name == 'CHAR':
            if len(args) != 1:
                raise SmartScriptError("CHAR() принимает 1 аргумент", line_num)
            return chr(int(args[0]))
        elif name == 'CODE':
            if len(args) != 1:
                raise SmartScriptError("CODE() принимает 1 аргумент", line_num)
            return ord(str(args[0])[0])
        elif name == 'CLEAN':
            if len(args) != 1:
                raise SmartScriptError("CLEAN() принимает 1 аргумент", line_num)
            return re.sub(r'[\x00-\x1f]', '', str(args[0]))
        elif name == 'EXACT':
            if len(args) != 2:
                raise SmartScriptError("EXACT() принимает 2 аргумента", line_num)
            return str(args[0]) == str(args[1])
        elif name == 'T':
            if len(args) != 1:
                raise SmartScriptError("T() принимает 1 аргумент", line_num)
            return str(args[0]) if isinstance(args[0], str) else ""
        elif name == 'TEXTJOIN':
            if len(args) < 2:
                raise SmartScriptError("TEXTJOIN() принимает минимум 2 аргумента", line_num)
            delimiter = str(args[0])
            return delimiter.join(str(a) for a in args[1:])
        elif name == 'NUMBERVALUE':
            if len(args) != 1:
                raise SmartScriptError("NUMBERVALUE() принимает 1 аргумент", line_num)
            text = str(args[0]).replace(',', '.').replace(' ', '')
            return float(text)
        elif name == 'FIXED':
            if len(args) < 1 or len(args) > 2:
                raise SmartScriptError("FIXED() принимает 1-2 аргумента", line_num)
            decimals = int(args[1]) if len(args) > 1 else 2
            return f"{float(args[0]):.{decimals}f}"

        # Утилиты
        elif name == 'PRINT':
            text = " ".join(str(a) for a in args)
            self.output.append(text)
            return text
        elif name == 'TYPE':
            if len(args) != 1:
                raise SmartScriptError("TYPE() принимает 1 аргумент", line_num)
            return type(args[0]).__name__
        elif name == 'BOOL':
            if len(args) != 1:
                raise SmartScriptError("BOOL() принимает 1 аргумент", line_num)
            return bool(args[0])

        # AI — единая функция
        elif name == 'AI':
            if len(args) < 1:
                raise SmartScriptError("AI() принимает минимум 1 аргумент: AI(\"запрос\")", line_num)
            prompt = " ".join(str(a) for a in args)
            return self._call_ai(prompt, line_num)

        # Пользовательские функции
        if name in self.user_functions or name.upper() in self.user_functions:
            return self._call_user_function(name, args, line_num)

        raise SmartScriptError(f"Неизвестная функция: {name}()", line_num)

    def _call_ai(self, prompt: str, line_num: int) -> str:
        """Вызывает AI через OpenRouter — единая функция AI()"""
        try:
            from pysheets.src.core.ai.chat import RequestMessage
            result = RequestMessage(prompt)
            return str(result) if result else "AI не ответил"
        except Exception as e:
            return f"AI ошибка: {e}"

    def _parse_args(self, args_str: str, line_num: int) -> List[Any]:
        """Парсит аргументы функции"""
        if not args_str.strip():
            return []

        args = []
        depth = 0
        in_string = None
        current = ""

        for ch in args_str:
            if in_string:
                current += ch
                if ch == in_string:
                    in_string = None
                continue

            if ch in ('"', "'"):
                in_string = ch
                current += ch
            elif ch == '(':
                depth += 1
                current += ch
            elif ch == ')':
                depth -= 1
                current += ch
            elif ch == ',' and depth == 0:
                args.append(self._eval_arg(current.strip(), line_num))
                current = ""
            else:
                current += ch

        if current.strip():
            args.append(self._eval_arg(current.strip(), line_num))

        return args

    def _eval_arg(self, arg: str, line_num: int) -> Any:
        """Вычисляет аргумент функции, поддерживая синтаксис var1:var2 для диапазонов"""
        arg = arg.strip()

        # Проверяем синтаксис var1:var2 (переменные с двоеточием)
        # Но не строковые литералы и не обычные ячейки (A1:B10)
        if ':' in arg and not arg.startswith('"') and not arg.startswith("'"):
            parts = arg.split(':', 1)
            left_part = parts[0].strip()
            right_part = parts[1].strip()

            # Если обе части — переменные, используем их source (оригинальную ячейку)
            if left_part in self.variables and right_part in self.variables:
                # Если переменные были присвоены из ячеек, используем ячейки
                left_ref = self.variable_sources.get(left_part, str(self.variables[left_part]))
                right_ref = self.variable_sources.get(right_part, str(self.variables[right_part]))
                return left_ref + ':' + right_ref

            # Если это обычные ссылки на ячейки (A1:B10) — оставляем как есть
            if _CELL_REF_PATTERN.match(left_part) and _CELL_REF_PATTERN.match(right_part):
                return arg

        return self._eval_expression(arg, line_num)
