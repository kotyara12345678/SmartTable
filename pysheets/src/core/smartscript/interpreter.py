"""
SmartScript Interpreter — интерпретатор скриптового языка SmartTable

Синтаксис (Python-подобный):
    # Переменные
    x = 10
    name = "Привет"
    
    # Ссылки на ячейки (автоматически читают значение)
    val = A1
    total = D2
    
    # Функции таблицы
    total = SUM("B2:B10")
    avg = AVERAGE("C1:C20")
    val = CELL("A1")
    count = COUNT("D1:D50")
    
    # Пользовательские функции
    func add(a, b):
        return a + b
    result = add(3, 5)
    
    # Переменные в диапазонах
    a = D3
    b = D2
    c = SUM(a:b)   # использует ячейки D3:D2
    
    # Условия
    if total > 1000:
        result = "Хорошо"
    else:
        result = "Плохо"
    
    # Циклы
    for i in RANGE(1, 10):
        val = CELL("A" + STR(i))
    
    # AI запрос
    answer = AI("Проанализируй данные в таблице")
    
    # Вывод результата
    return "Итого: " + STR(total)
"""

import re
from typing import Any, Dict, List, Optional, Callable

from pysheets.src.core.smartscript.errors import SmartScriptError
from pysheets.src.core.smartscript.functions import TableFunctions

# Regex для голых ссылок на ячейки: A1, D2, AA10, ABC999
_CELL_REF_PATTERN = re.compile(r'^[A-Z]{1,3}\d+$')


class _ReturnSignal(Exception):
    """Внутренний сигнал для return — прерывает выполнение блока"""
    def __init__(self, value):
        self.value = value


class SmartScriptInterpreter:
    """Интерпретатор SmartScript — Python-подобный язык для таблиц"""
    
    # Встроенные функции таблицы
    TABLE_FUNCTIONS = [
        # Основные табличные
        'SUM', 'AVERAGE', 'AVG', 'COUNT', 'MAX', 'MIN',
        'CELL', 'RANGE', 'STR', 'INT', 'FLOAT', 'LEN',
        'ABS', 'ROUND', 'UPPER', 'LOWER', 'TRIM',
        'COUNTIF', 'SUMIF', 'CONCAT',
        'ROW_COUNT', 'COL_COUNT', 'COLUMN',
        # Математические
        'SQRT', 'POWER', 'MOD',
        # Логические
        'IF',
        # Дата и время
        'NOW', 'TODAY', 'DATE',
        # Текстовые (расширенные)
        'CONCATENATE', 'PROPER', 'LEFT', 'RIGHT', 'MID',
        'FIND', 'SEARCH', 'REPLACE', 'SUBSTITUTE', 'REPT',
        'TEXT', 'VALUE', 'CHAR', 'CODE', 'CLEAN', 'EXACT',
        'T', 'TEXTJOIN', 'NUMBERVALUE', 'FIXED',
        # AI
        'AI',
        # Утилиты
        'PRINT', 'TYPE', 'BOOL',
    ]
    
    # Ключевые слова
    KEYWORDS = [
        'if', 'else', 'elif', 'for', 'in', 'while',
        'return', 'and', 'or', 'not', 'True', 'False', 'None',
        'func',
    ]
    
    def __init__(self, cell_getter: Optional[Callable] = None):
        """
        Args:
            cell_getter: функция (row, col) -> value для чтения данных из таблицы
        """
        self.cell_getter = cell_getter
        self.variables: Dict[str, Any] = {}
        self.variable_sources: Dict[str, str] = {}  # {var_name: "D3"} — original cell ref
        self.user_functions: Dict[str, dict] = {}
        self.output: List[str] = []
        self._max_iterations = 10000
        self._iteration_count = 0
        self._table_funcs = TableFunctions(cell_getter)
    
    def set_cell_getter(self, getter: Callable):
        """Устанавливает функцию для чтения ячеек таблицы"""
        self.cell_getter = getter
        self._table_funcs.set_cell_getter(getter)
    
    def execute(self, code: str) -> List[str]:
        """Выполняет SmartScript код и возвращает список результатов (return)"""
        self.variables = {}
        self.variable_sources = {}
        self.user_functions = {}
        self.output = []
        self._iteration_count = 0
        
        lines = code.split('\n')
        try:
            self._execute_block(lines, 0, len(lines), indent_level=0)
        except _ReturnSignal as rs:
            self.output.append(str(rs.value))
        
        return self.output
    
    # ============ Выполнение блоков ============
    
    def _execute_block(self, lines: List[str], start: int, end: int, indent_level: int):
        """Выполняет блок строк кода"""
        i = start
        while i < end:
            self._iteration_count += 1
            if self._iteration_count > self._max_iterations:
                raise SmartScriptError("Превышен лимит итераций (бесконечный цикл?)", i + 1)
            
            line = lines[i]
            stripped = line.strip()
            
            # Пропускаем пустые строки и комментарии
            if not stripped or stripped.startswith('#'):
                i += 1
                continue
            
            # Определяем отступ
            current_indent = len(line) - len(line.lstrip())
            
            # return — прерывает выполнение всего скрипта
            if stripped.startswith('return '):
                expr = stripped[7:].strip()
                result = self._eval_expression(expr, i + 1)
                raise _ReturnSignal(result)
            
            # func — определение пользовательской функции
            if stripped.startswith('func ') and stripped.endswith(':'):
                i = self._define_func(lines, i, end, current_indent)
                continue
            
            # if/elif/else
            if stripped.startswith('if ') and stripped.endswith(':'):
                i = self._execute_if(lines, i, end, current_indent)
                continue
            
            # for loop
            if stripped.startswith('for ') and ' in ' in stripped and stripped.endswith(':'):
                i = self._execute_for(lines, i, end, current_indent)
                continue
            
            # while loop
            if stripped.startswith('while ') and stripped.endswith(':'):
                i = self._execute_while(lines, i, end, current_indent)
                continue
            
            # Присваивание: x = expr
            if '=' in stripped and not stripped.startswith('='):
                eq_pos = stripped.index('=')
                # Проверяем что это не ==, !=, <=, >=
                if eq_pos > 0 and stripped[eq_pos - 1] not in ('!', '<', '>', '=') and \
                   (eq_pos + 1 >= len(stripped) or stripped[eq_pos + 1] != '='):
                    var_name = stripped[:eq_pos].strip()
                    if self._is_valid_identifier(var_name):
                        expr = stripped[eq_pos + 1:].strip()
                        # Track if the expression is a bare cell reference
                        if _CELL_REF_PATTERN.match(expr):
                            self.variable_sources[var_name] = expr
                        value = self._eval_expression(expr, i + 1)
                        self.variables[var_name] = value
                        i += 1
                        continue
            
            # Просто выражение (вызов функции и тп)
            try:
                result = self._eval_expression(stripped, i + 1)
                # Если результат от вызова функции — добавляем в output
                # (для main() и подобных вызовов)
            except SmartScriptError:
                raise
            except _ReturnSignal:
                raise
            except Exception:
                pass
            
            i += 1
    
    def _is_valid_identifier(self, name: str) -> bool:
        """Проверяет, является ли строка допустимым идентификатором"""
        return bool(re.match(
            r'^[a-zA-Z\u0430-\u044f\u0451\u0410-\u042f\u0401_]'
            r'[a-zA-Z\u0430-\u044f\u0451\u0410-\u042f\u04010-9_]*$',
            name
        ))
    
    def _find_block_end(self, lines: List[str], start: int, end: int, base_indent: int) -> int:
        """Находит конец блока по отступу"""
        i = start + 1
        while i < end:
            line = lines[i]
            stripped = line.strip()
            if not stripped or stripped.startswith('#'):
                i += 1
                continue
            current_indent = len(line) - len(line.lstrip())
            if current_indent <= base_indent:
                return i
            i += 1
        return end
    
    def _execute_if(self, lines: List[str], start: int, end: int, base_indent: int) -> int:
        """Выполняет if/elif/else блок"""
        stripped = lines[start].strip()
        condition_str = stripped[3:-1].strip()
        condition = self._eval_expression(condition_str, start + 1)
        
        block_end = self._find_block_end(lines, start, end, base_indent)
        
        if condition:
            self._execute_block(lines, start + 1, block_end, base_indent + 4)
            i = block_end
            while i < end:
                s = lines[i].strip()
                if s.startswith('elif ') or s.startswith('else:'):
                    i = self._find_block_end(lines, i, end, base_indent)
                else:
                    break
            return i
        else:
            i = block_end
            while i < end:
                s = lines[i].strip()
                if s.startswith('elif ') and s.endswith(':'):
                    cond_str = s[5:-1].strip()
                    cond = self._eval_expression(cond_str, i + 1)
                    next_end = self._find_block_end(lines, i, end, base_indent)
                    if cond:
                        self._execute_block(lines, i + 1, next_end, base_indent + 4)
                        i = next_end
                        while i < end:
                            ss = lines[i].strip()
                            if ss.startswith('elif ') or ss.startswith('else:'):
                                i = self._find_block_end(lines, i, end, base_indent)
                            else:
                                break
                        return i
                    i = next_end
                elif s.startswith('else:'):
                    next_end = self._find_block_end(lines, i, end, base_indent)
                    self._execute_block(lines, i + 1, next_end, base_indent + 4)
                    return next_end
                else:
                    break
            return i
    
    def _execute_for(self, lines: List[str], start: int, end: int, base_indent: int) -> int:
        """Выполняет for цикл"""
        stripped = lines[start].strip()
        match = re.match(r'for\s+(\w+)\s+in\s+(.+):', stripped)
        if not match:
            raise SmartScriptError(f"Неверный синтаксис for: {stripped}", start + 1)
        
        var_name = match.group(1)
        iterable_expr = match.group(2).strip()
        
        iterable = self._eval_expression(iterable_expr, start + 1)
        block_end = self._find_block_end(lines, start, end, base_indent)
        
        if not hasattr(iterable, '__iter__'):
            raise SmartScriptError(f"Объект не итерируемый: {iterable}", start + 1)
        
        for item in iterable:
            self._iteration_count += 1
            if self._iteration_count > self._max_iterations:
                raise SmartScriptError("Превышен лимит итераций", start + 1)
            self.variables[var_name] = item
            self._execute_block(lines, start + 1, block_end, base_indent + 4)
        
        return block_end
    
    def _execute_while(self, lines: List[str], start: int, end: int, base_indent: int) -> int:
        """Выполняет while цикл"""
        stripped = lines[start].strip()
        condition_str = stripped[6:-1].strip()
        
        block_end = self._find_block_end(lines, start, end, base_indent)
        
        while self._eval_expression(condition_str, start + 1):
            self._iteration_count += 1
            if self._iteration_count > self._max_iterations:
                raise SmartScriptError("Превышен лимит итераций (while)", start + 1)
            self._execute_block(lines, start + 1, block_end, base_indent + 4)
        
        return block_end
    
    def _define_func(self, lines: List[str], start: int, end: int, base_indent: int) -> int:
        """Определяет пользовательскую функцию: func name(a, b):"""
        stripped = lines[start].strip()
        match = re.match(r'func\s+(\w+)\((.*)?\)\s*:', stripped)
        if not match:
            raise SmartScriptError(f"Неверный синтаксис func: {stripped}", start + 1)
        
        func_name = match.group(1)
        params_str = (match.group(2) or "").strip()
        params = [p.strip() for p in params_str.split(',')] if params_str else []
        
        block_end = self._find_block_end(lines, start, end, base_indent)
        
        # Сохраняем тело функции (и в верхнем регистре для вызова)
        func_def = {
            'params': params,
            'lines': lines,
            'body_start': start + 1,
            'body_end': block_end,
            'base_indent': base_indent + 4,
        }
        self.user_functions[func_name] = func_def
        self.user_functions[func_name.upper()] = func_def
        
        return block_end
    
    def _call_user_function(self, name: str, args: List[Any], line_num: int) -> Any:
        """Вызывает пользовательскую функцию"""
        func_def = self.user_functions.get(name) or self.user_functions.get(name.upper())
        if not func_def:
            raise SmartScriptError(f"Неизвестная функция: {name}()", line_num)
        
        params = func_def['params']
        
        if len(args) != len(params):
            raise SmartScriptError(
                f"{name}() ожидает {len(params)} аргументов, получено {len(args)}", line_num)
        
        # Сохраняем текущие переменные
        saved_vars = self.variables.copy()
        
        # Устанавливаем параметры
        for param, arg in zip(params, args):
            self.variables[param] = arg
        
        # Выполняем тело
        result = None
        try:
            self._execute_block(
                func_def['lines'],
                func_def['body_start'],
                func_def['body_end'],
                func_def['base_indent']
            )
        except _ReturnSignal as rs:
            result = rs.value
        
        # Восстанавливаем переменные
        self.variables = saved_vars
        
        return result
    
    # ============ Вычисление выражений ============
    
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
    
    # ============ Вызов функций ============
    
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
    
    # ============ Автокомплит ============
    
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
