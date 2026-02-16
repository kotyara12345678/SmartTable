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
    
    # Импорт другого листа
    import Лист1 from l1
    val = l1.D3
    
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
from pysheets.src.core.smartscript.evaluator import EvaluatorMixin
from pysheets.src.core.smartscript.builtins import BuiltinsMixin
from pysheets.src.core.smartscript.completions import CompletionsMixin
from pysheets.src.core.smartscript.functions import TableFunctions

# Regex для голых ссылок на ячейки: A1, D2, AA10, ABC999
_CELL_REF_PATTERN = re.compile(r'^[A-Z]{1,3}\d+$')


class _ReturnSignal(Exception):
    """Внутренний сигнал для return — прерывает выполнение блока"""
    def __init__(self, value):
        self.value = value


class SmartScriptInterpreter(EvaluatorMixin, BuiltinsMixin, CompletionsMixin):
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
        'func', 'import', 'from', 'print',
    ]
    
    def __init__(self, cell_getter: Optional[Callable] = None, sheet_getter: Optional[Callable] = None):
        """
        Args:
            cell_getter: функция (row, col) -> value для чтения данных из текущей таблицы
            sheet_getter: функция (sheet_name, row, col) -> value для чтения из других листов
        """
        self.cell_getter = cell_getter
        self.sheet_getter = sheet_getter  # (sheet_name, row, col) -> value
        self.variables: Dict[str, Any] = {}
        self.variable_sources: Dict[str, str] = {}  # {var_name: "D3"} — original cell ref
        self.user_functions: Dict[str, dict] = {}
        self.imported_sheets: Dict[str, str] = {}  # {alias: sheet_name}
        self.output: List[str] = []
        self._max_iterations = 10000
        self._iteration_count = 0
        self._table_funcs = TableFunctions(cell_getter)
    
    def set_cell_getter(self, getter: Callable):
        """Устанавливает функцию для чтения ячеек таблицы"""
        self.cell_getter = getter
        self._table_funcs.set_cell_getter(getter)
    
    def set_sheet_getter(self, getter: Callable):
        """Устанавливает функцию для чтения ячеек из других листов
        
        Args:
            getter: (sheet_name: str, row: int, col: int) -> value
        """
        self.sheet_getter = getter
    
    def execute(self, code: str) -> List[str]:
        """Выполняет SmartScript код и возвращает список результатов (return)"""
        self.variables = {}
        self.variable_sources = {}
        self.user_functions = {}
        self.imported_sheets = {}
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
            
            # import — импорт другого листа
            if stripped.startswith('import '):
                self._handle_import(stripped, i + 1)
                i += 1
                continue
            
            # return — прерывает выполнение всего скрипта
            if stripped.startswith('return ') or stripped == 'return':
                if stripped == 'return':
                    raise _ReturnSignal('')
                expr = stripped[7:].strip()
                result = self._eval_expression(expr, i + 1)
                raise _ReturnSignal(result)
            
            # print() — lowercase alias, treated as statement
            if stripped.startswith('print(') and stripped.endswith(')'):
                inner = stripped[6:-1].strip()
                if inner:
                    value = self._eval_expression(inner, i + 1)
                    self.output.append(str(value))
                else:
                    self.output.append('')
                i += 1
                continue
            
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
                        else:
                            # Track sheet cell references: alias.CELL or alias,CELL
                            for sep in ('.', ','):
                                if sep in expr:
                                    parts = expr.split(sep, 1)
                                    alias = parts[0].strip()
                                    cell_ref = parts[1].strip()
                                    if alias in self.imported_sheets and _CELL_REF_PATTERN.match(cell_ref):
                                        self.variable_sources[var_name] = cell_ref
                                        break
                        value = self._eval_expression(expr, i + 1)
                        self.variables[var_name] = value
                        i += 1
                        continue
            
            # Просто выражение (вызов функции и тп)
            try:
                result = self._eval_expression(stripped, i + 1)
            except SmartScriptError:
                raise
            except _ReturnSignal:
                raise
            except Exception:
                pass
            
            i += 1
    
    # ============ Вспомогательные методы ============
    
    def _is_valid_identifier(self, name: str) -> bool:
        """Проверяет, является ли строка допустимым идентификатором"""
        return bool(re.match(
            r'^[a-zA-Z\u0430-\u044f\u0451\u0410-\u042f\u0401_]'
            r'[a-zA-Z\u0430-\u044f\u0451\u0410-\u042f\u04010-9_]*$',
            name
        ))
    
    def _handle_import(self, line: str, line_num: int):
        """Обрабатывает import стейтмент
        
        Синтаксис:
            import Лист1 from l1     -> l1.ячейка (алиас l1)
            import Лист1              -> Лист1.ячейка (алиас = имя листа)
        """
        rest = line[7:].strip()  # after 'import '
        
        if ' from ' in rest:
            parts = rest.split(' from ', 1)
            sheet_name = parts[0].strip()
            alias = parts[1].strip()
        else:
            sheet_name = rest.strip()
            alias = sheet_name
        
        if not sheet_name:
            raise SmartScriptError("Не указано имя листа для import", line_num)
        
        if not self.sheet_getter:
            raise SmartScriptError("Импорт листов недоступен (нет sheet_getter)", line_num)
        
        self.imported_sheets[alias] = sheet_name
    
    def _resolve_sheet_cell(self, expr: str, line_num: int):
        """Проверяет, является ли выражение ссылкой на ячейку другого листа
        
        Форматы:
            l1.D3      -> алиас.CELL_REF
            l1,D3      -> алиас,CELL_REF (альтернативный синтаксис)
        
        Returns:
            value если это ссылка на лист, иначе None
        """
        for sep in ('.', ','):
            if sep in expr:
                parts = expr.split(sep, 1)
                alias = parts[0].strip()
                cell_ref = parts[1].strip()
                
                if alias in self.imported_sheets and _CELL_REF_PATTERN.match(cell_ref):
                    sheet_name = self.imported_sheets[alias]
                    from pysheets.src.util.validators import parse_cell_reference
                    row, col = parse_cell_reference(cell_ref)
                    if row is not None and col is not None:
                        try:
                            value = self.sheet_getter(sheet_name, row, col)
                            if value is not None:
                                try:
                                    return float(value) if '.' in str(value) else int(value)
                                except (ValueError, TypeError):
                                    return str(value)
                            return ''
                        except Exception as e:
                            raise SmartScriptError(f"Ошибка чтения {alias}.{cell_ref}: {e}", line_num)
        return None
    
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
