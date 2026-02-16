"""
SmartScript Evaluator — вычисление выражений

Миксин для SmartScriptInterpreter, содержащий логику парсинга и вычисления выражений.
"""

import re
from typing import Any, List, Optional

from pysheets.src.core.smartscript.errors import SmartScriptError

# Regex для голых ссылок на ячейки: A1, D2, AA10, ABC999
_CELL_REF_PATTERN = re.compile(r'^[A-Z]{1,3}\d+$')


class EvaluatorMixin:
    """Миксин: вычисление выражений SmartScript"""

    def _eval_expression(self, expr: str, line_num: int = 0) -> Any:
        """Вычисляет выражение SmartScript"""
        expr = expr.strip()

        if not expr:
            return None

        # Логические операторы (and, or, not)
        parts = self._split_logical(expr, ' or ')
        if len(parts) > 1:
            result = self._eval_expression(parts[0], line_num)
            for part in parts[1:]:
                result = result or self._eval_expression(part, line_num)
            return result

        parts = self._split_logical(expr, ' and ')
        if len(parts) > 1:
            result = self._eval_expression(parts[0], line_num)
            for part in parts[1:]:
                result = result and self._eval_expression(part, line_num)
            return result

        if expr.startswith('not '):
            return not self._eval_expression(expr[4:], line_num)

        # Сравнения: ==, !=, <=, >=, <, >
        for op in ['==', '!=', '<=', '>=', '<', '>']:
            parts = self._split_outside_strings(expr, op)
            if len(parts) == 2:
                left = self._eval_expression(parts[0], line_num)
                right = self._eval_expression(parts[1], line_num)
                return self._compare(left, right, op)

        # Арифметика: +, -, *, /, %
        parts = self._split_arithmetic(expr, ['+', '-'])
        if parts:
            return self._eval_arithmetic(parts, line_num)

        parts = self._split_arithmetic(expr, ['*', '/', '%'])
        if parts:
            return self._eval_arithmetic(parts, line_num)

        # Унарный минус
        if expr.startswith('-') and len(expr) > 1:
            val = self._eval_expression(expr[1:], line_num)
            if isinstance(val, (int, float)):
                return -val

        # Скобки
        if expr.startswith('(') and expr.endswith(')'):
            return self._eval_expression(expr[1:-1], line_num)

        # Строковые литералы
        if (expr.startswith('"') and expr.endswith('"')) or \
           (expr.startswith("'") and expr.endswith("'")):
            return expr[1:-1]

        # Числа
        try:
            if '.' in expr:
                return float(expr)
            return int(expr)
        except ValueError:
            pass

        # Булевы значения
        if expr == 'True':
            return True
        if expr == 'False':
            return False
        if expr == 'None':
            return None

        # Вызов функции: FUNC(args)
        func_match = re.match(
            r'^([A-Za-z\u0410-\u042f\u0430-\u044f\u0451\u0401_]\w*)\((.*)?\)$',
            expr, re.DOTALL
        )
        if func_match:
            func_name = func_match.group(1)
            args_str = func_match.group(2) or ""
            # Проверяем пользовательские функции (без upper)
            if func_name in self.user_functions or func_name.upper() in self.user_functions:
                args = self._parse_args(args_str, line_num)
                return self._call_user_function(func_name, args, line_num)
            return self._call_function(func_name.upper(), args_str, line_num)

        # Ссылка на ячейку другого листа: alias.CELL или alias,CELL
        sheet_val = self._resolve_sheet_cell(expr, line_num)
        if sheet_val is not None:
            return sheet_val

        # Переменная
        if expr in self.variables:
            return self.variables[expr]

        # Голая ссылка на ячейку: D2, A1, AA10 → автоматически CELL("D2")
        if _CELL_REF_PATTERN.match(expr):
            return self._call_function('CELL', '"' + expr + '"', line_num)

        # Неизвестный идентификатор
        if self._is_valid_identifier(expr):
            raise SmartScriptError(f"Неизвестная переменная: '{expr}'", line_num)

        raise SmartScriptError(f"Не удалось вычислить выражение: '{expr}'", line_num)

    # ============ Парсинг выражений ============

    def _split_logical(self, expr: str, operator: str) -> List[str]:
        """Разделяет выражение по логическому оператору (вне строк и скобок)"""
        parts = []
        depth = 0
        in_string = None
        current = ""
        i = 0

        while i < len(expr):
            ch = expr[i]

            if in_string:
                current += ch
                if ch == in_string and (i == 0 or expr[i-1] != '\\'):
                    in_string = None
            elif ch in ('"', "'"):
                in_string = ch
                current += ch
            elif ch == '(':
                depth += 1
                current += ch
            elif ch == ')':
                depth -= 1
                current += ch
            elif depth == 0 and expr[i:i+len(operator)] == operator:
                parts.append(current)
                current = ""
                i += len(operator)
                continue
            else:
                current += ch
            i += 1

        if current:
            parts.append(current)

        return parts if len(parts) > 1 else [expr]

    def _split_outside_strings(self, expr: str, operator: str) -> List[str]:
        """Разделяет по оператору вне строк и скобок"""
        depth = 0
        in_string = None
        i = 0

        while i < len(expr):
            ch = expr[i]
            if in_string:
                if ch == in_string and (i == 0 or expr[i-1] != '\\'):
                    in_string = None
            elif ch in ('"', "'"):
                in_string = ch
            elif ch == '(':
                depth += 1
            elif ch == ')':
                depth -= 1
            elif depth == 0 and expr[i:i+len(operator)] == operator:
                before = expr[i-1] if i > 0 else ''
                after = expr[i+len(operator)] if i+len(operator) < len(expr) else ''
                if operator in ('==', '!=', '<=', '>='):
                    return [expr[:i], expr[i+len(operator):]]
                elif operator in ('<', '>'):
                    if before != operator and after != '=':
                        return [expr[:i], expr[i+len(operator):]]
            i += 1

        return [expr]

    def _split_arithmetic(self, expr: str, operators: List[str]) -> Optional[List]:
        """Разделяет арифметическое выражение на части с операторами"""
        depth = 0
        in_string = None
        parts = []
        current = ""
        i = 0
        found = False

        while i < len(expr):
            ch = expr[i]

            if in_string:
                current += ch
                if ch == in_string and (i == 0 or expr[i-1] != '\\'):
                    in_string = None
                i += 1
                continue

            if ch in ('"', "'"):
                in_string = ch
                current += ch
                i += 1
                continue

            if ch == '(':
                depth += 1
                current += ch
                i += 1
                continue

            if ch == ')':
                depth -= 1
                current += ch
                i += 1
                continue

            if depth == 0 and ch in operators:
                # Не разделяем унарный минус
                if ch == '-' and (not current.strip() or current.strip()[-1:] in ('', '+', '-', '*', '/', '%', '(', ',')):
                    current += ch
                    i += 1
                    continue

                if current.strip():
                    parts.append(('val', current.strip()))
                parts.append(('op', ch))
                current = ""
                found = True
                i += 1
                continue

            current += ch
            i += 1

        if current.strip():
            parts.append(('val', current.strip()))

        return parts if found else None

    def _eval_arithmetic(self, parts: List, line_num: int) -> Any:
        """Вычисляет арифметическое выражение из частей"""
        if not parts:
            return 0

        values = []
        ops = []
        for kind, val in parts:
            if kind == 'val':
                values.append(self._eval_expression(val, line_num))
            else:
                ops.append(val)

        if not values:
            return 0

        result = values[0]
        for i, op in enumerate(ops):
            if i + 1 >= len(values):
                break
            right = values[i + 1]

            # Конкатенация строк (автоматически конвертирует в строку)
            if op == '+' and (isinstance(result, str) or isinstance(right, str)):
                result = str(result) + str(right)
                continue

            # Числовая арифметика
            try:
                left_num = float(result) if not isinstance(result, (int, float)) else result
                right_num = float(right) if not isinstance(right, (int, float)) else right
            except (ValueError, TypeError):
                raise SmartScriptError(f"Невозможно выполнить '{op}' с '{result}' и '{right}'", line_num)

            if op == '+':
                result = left_num + right_num
            elif op == '-':
                result = left_num - right_num
            elif op == '*':
                result = left_num * right_num
            elif op == '/':
                if right_num == 0:
                    raise SmartScriptError("Деление на ноль", line_num)
                result = left_num / right_num
            elif op == '%':
                if right_num == 0:
                    raise SmartScriptError("Деление на ноль (модуль)", line_num)
                result = left_num % right_num

            if isinstance(result, float) and result == int(result):
                result = int(result)

        return result

    def _compare(self, left: Any, right: Any, op: str) -> bool:
        """Сравнивает два значения"""
        try:
            if isinstance(left, str) and isinstance(right, (int, float)):
                left = float(left)
            elif isinstance(right, str) and isinstance(left, (int, float)):
                right = float(right)
        except (ValueError, TypeError):
            pass

        if op == '==':
            return left == right
        elif op == '!=':
            return left != right
        elif op == '<':
            return left < right
        elif op == '>':
            return left > right
        elif op == '<=':
            return left <= right
        elif op == '>=':
            return left >= right
        return False
