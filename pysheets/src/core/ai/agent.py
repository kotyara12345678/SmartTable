"""
AI Agent — выполняет цепочки действий над таблицей.

Пользователь пишет сложный запрос, например:
  "Создай таблицу продаж за квартал, отсортируй по выручке, выдели красным убыточные позиции"

Агент:
1. Разбивает запрос на шаги (plan)
2. Выполняет каждый шаг последовательно
3. После каждого шага читает состояние таблицы
4. Передаёт контекст следующему шагу
5. Отчитывается о прогрессе
"""

import json
import re
import logging
from typing import Optional, List, Dict, Any, Callable

try:
    from pysheets.src.core.ai.openrouter import chat_with_openrouter
except Exception:
    chat_with_openrouter = None

logger = logging.getLogger(__name__)


# ============================================================
# Системный промпт для планирования
# ============================================================
PLANNER_SYSTEM_PROMPT = """You are an AI Agent for a spreadsheet application called SmartTable.
Your job is to break down complex user requests into a sequence of simple steps.

AVAILABLE ACTIONS (you can use these in your plan):
1. fill_table — fill the table with data (provide JSON array)
2. clear_cell — clear a specific cell (column + row)
3. clear_column — clear an entire column
4. clear_range — clear a range of cells
5. clear_all — clear the entire table
6. set_cell — set a specific cell value (column, row, value)
7. set_formula — set a formula in a cell (column, row, formula)
8. sort_column — sort by a column (column, order: asc/desc)
9. format_cells — conditional formatting (conditions with column, condition, value, bg_color, text_color)
10. color_column — color all non-empty cells in a column (column, bg_color, text_color)
11. color_cells — color specific cells (cells: [{column, row, bg_color, text_color}])
12. color_row — color all non-empty cells in a row (row, bg_color, text_color)
13. color_range — color a range of cells (start_col, start_row, end_col, end_row, bg_color, text_color)
14. bold_column — make text bold in a column (column)
15. insert_row — insert a row at position
16. delete_row — delete a row
17. analyze — analyze current table data and return insights

RESPONSE FORMAT — you MUST return a JSON array of steps:
```json
[
  {
    "step": 1,
    "action": "fill_table",
    "description": "Заполняю таблицу данными о продажах",
    "params": {
      "data": [
        ["Товар", "Количество", "Цена", "Выручка"],
        ["iPhone 15", "50", "89990", "4499500"],
        ["Galaxy S24", "35", "74990", "2624650"]
      ]
    }
  },
  {
    "step": 2,
    "action": "sort_column",
    "description": "Сортирую по выручке (убывание)",
    "params": {
      "column": "D",
      "order": "desc"
    }
  },
  {
    "step": 3,
    "action": "color_column",
    "description": "Окрашиваю столбец с выручкой зелёным",
    "params": {
      "column": "D",
      "text_color": "#00AA00"
    }
  },
  {
    "step": 4,
    "action": "format_cells",
    "description": "Выделяю красным убыточные позиции",
    "params": {
      "conditions": [
        {"column": "D", "condition": "less_than", "value": "1000000", "bg_color": "#FF4444", "text_color": "#FFFFFF"}
      ]
    }
  }
]
```

RULES:
1. ALWAYS return valid JSON wrapped in ```json ... ```
2. Each step must have: step (number), action (string), description (string in Russian), params (object)
3. Break complex requests into 2-5 simple steps
4. For fill_table, provide realistic data with 5-15 rows
5. All descriptions must be in Russian
6. If the request is simple (1 action), still return an array with 1 step
7. Think about the logical order of operations
8. Always respond in Russian for descriptions"""


# ============================================================
# Системный промпт для выполнения шага
# ============================================================
STEP_SYSTEM_PROMPT = """You are executing step {step_num} of a plan for a spreadsheet.

Current table state:
{table_state}

Step to execute:
Action: {action}
Description: {description}
Parameters: {params}

If the action is "fill_table", return the data as a JSON array in ```json ... ``` format.
If the action is "analyze", return a text analysis of the current data.
If the action requires generating data, generate it now.

For format_cells with conditions, return:
```json
{{"action": "format_cells", "conditions": [...]}}
```

Always respond in Russian."""


class AIAgent:
    """AI Агент для выполнения цепочек действий над таблицей"""

    def __init__(self, get_table_state: Callable[[], Optional[str]] = None):
        """
        Args:
            get_table_state: функция, возвращающая текущее состояние таблицы как строку
        """
        self.get_table_state = get_table_state
        self._plan: List[Dict[str, Any]] = []
        self._current_step = 0
        self._is_running = False
        self._progress_callback: Optional[Callable[[str, int, int], None]] = None
        self._action_callback: Optional[Callable[[Dict[str, Any]], None]] = None

    def set_progress_callback(self, callback: Callable[[str, int, int], None]):
        """Устанавливает callback для отчёта о прогрессе.
        callback(message: str, current_step: int, total_steps: int)
        """
        self._progress_callback = callback

    def set_action_callback(self, callback: Callable[[Dict[str, Any]], None]):
        """Устанавливает callback для выполнения действий над таблицей.
        callback(action_dict: dict) — выполняет одно действие
        """
        self._action_callback = callback

    def _report_progress(self, message: str, step: int = 0, total: int = 0):
        """Отправляет отчёт о прогрессе"""
        if self._progress_callback:
            self._progress_callback(message, step, total)
        logger.info(f"Agent progress [{step}/{total}]: {message}")

    def is_agent_request(self, message: str) -> bool:
        """Определяет, нужен ли агент для этого запроса.
        
        Агент нужен когда запрос содержит несколько действий или сложную логику.
        """
        # Ключевые слова, указывающие на сложный запрос
        multi_action_keywords = [
            # Русские
            'и потом', 'затем', 'после этого', 'а потом', 'далее',
            'отсортируй', 'выдели', 'подсветь', 'раскрась', 'окрась', 'покрась',
            'сделай красным', 'сделай зелёным', 'сделай синим', 'цвет текста', 'цвет фона',
            'создай и', 'заполни и', 'сделай и',
            'проанализируй', 'найди и',
            # Комбинации действий
            'создай таблицу', 'сгенерируй таблицу',
            'заполни таблицу', 'построй таблицу',
            # Английские
            'and then', 'after that', 'next',
            'sort', 'highlight', 'color',
            'create and', 'fill and', 'generate table',
        ]
        
        msg_lower = message.lower()
        
        # Считаем количество "действий" в запросе
        action_count = 0
        action_words = [
            'создай', 'заполни', 'отсортируй', 'выдели', 'удали',
            'очисти', 'добавь', 'вставь', 'раскрась', 'подсветь',
            'окрась', 'покрась', 'цвет',
            'проанализируй', 'посчитай', 'сгенерируй', 'построй',
            'create', 'fill', 'sort', 'highlight', 'delete',
            'clear', 'add', 'insert', 'color', 'analyze', 'generate',
        ]
        for word in action_words:
            if word in msg_lower:
                action_count += 1
        
        # Если 2+ действий или есть ключевые слова — нужен агент
        if action_count >= 2:
            return True
        
        for keyword in multi_action_keywords:
            if keyword in msg_lower:
                return True
        
        return False

    def plan(self, user_request: str, table_state: Optional[str] = None) -> List[Dict[str, Any]]:
        """Создаёт план выполнения запроса.
        
        Returns:
            Список шагов [{step, action, description, params}, ...]
        """
        if chat_with_openrouter is None:
            logger.error("OpenRouter not available for agent planning")
            return []

        # Получаем состояние таблицы
        if table_state is None and self.get_table_state:
            table_state = self.get_table_state()
        
        context = ""
        if table_state:
            context = f"\n\nТекущее состояние таблицы:\n{table_state}"

        prompt = f"Запрос пользователя: {user_request}{context}\n\nСоздай план выполнения этого запроса."

        response = chat_with_openrouter(
            prompt,
            extra_system=PLANNER_SYSTEM_PROMPT
        )

        if not response:
            logger.error("Agent planner returned empty response")
            return []

        # Парсим план из ответа
        plan = self._parse_plan(response)
        self._plan = plan
        self._current_step = 0
        
        logger.info(f"Agent created plan with {len(plan)} steps")
        return plan

    def _parse_plan(self, response: str) -> List[Dict[str, Any]]:
        """Парсит план из ответа AI"""
        # Ищем JSON блок
        json_pattern = r'```json\s*\n?(.*?)\s*\n?```'
        match = re.search(json_pattern, response, re.DOTALL)
        
        if match:
            try:
                plan = json.loads(match.group(1).strip())
                if isinstance(plan, list):
                    # Валидируем каждый шаг
                    valid_steps = []
                    for i, step in enumerate(plan):
                        if isinstance(step, dict) and 'action' in step:
                            step.setdefault('step', i + 1)
                            step.setdefault('description', f'Шаг {i + 1}')
                            step.setdefault('params', {})
                            valid_steps.append(step)
                    return valid_steps
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse plan JSON: {e}")
        
        # Если не нашли JSON, пробуем найти массив напрямую
        try:
            # Ищем что-то похожее на JSON массив
            array_match = re.search(r'\[\s*\{.*?\}\s*\]', response, re.DOTALL)
            if array_match:
                plan = json.loads(array_match.group(0))
                if isinstance(plan, list):
                    return plan
        except Exception:
            pass
        
        logger.warning("Could not parse plan from AI response")
        return []

    def execute_plan(self, plan: Optional[List[Dict[str, Any]]] = None) -> str:
        """Выполняет план последовательно.
        
        Returns:
            Итоговый отчёт о выполнении
        """
        if plan is None:
            plan = self._plan
        
        if not plan:
            return "Не удалось создать план выполнения."
        
        self._is_running = True
        total = len(plan)
        results = []
        
        self._report_progress(
            f"Начинаю выполнение плана ({total} шагов)...",
            0, total
        )
        
        for i, step in enumerate(plan):
            if not self._is_running:
                results.append(f"Выполнение прервано на шаге {i + 1}")
                break
            
            step_num = step.get('step', i + 1)
            action = step.get('action', 'unknown')
            description = step.get('description', f'Шаг {step_num}')
            params = step.get('params', {})
            
            self._report_progress(
                f"Шаг {step_num}/{total}: {description}",
                step_num, total
            )
            
            try:
                result = self._execute_step(action, params, step_num, total)
                results.append(f"✅ Шаг {step_num}: {description}")
                if result:
                    results.append(f"   {result}")
            except Exception as e:
                results.append(f"❌ Шаг {step_num}: {description} — Ошибка: {e}")
                logger.exception(f"Error executing step {step_num}: {e}")
        
        self._is_running = False
        self._report_progress("Выполнение завершено!", total, total)
        
        return "\n".join(results)

    def _execute_step(self, action: str, params: dict, step_num: int, total: int) -> Optional[str]:
        """Выполняет один шаг плана"""
        
        if action == 'fill_table':
            data = params.get('data', [])
            if data and self._action_callback:
                self._action_callback({
                    'type': 'fill_table',
                    'data': data
                })
                return f"Заполнено {len(data)} строк"
        
        elif action == 'set_cell':
            col = params.get('column', 'A')
            row = params.get('row', 1)
            value = params.get('value', '')
            if self._action_callback:
                self._action_callback({
                    'type': 'set_cell',
                    'column': col,
                    'row': row,
                    'value': value
                })
                return f"Установлено {col}{row} = {value}"
        
        elif action == 'set_formula':
            col = params.get('column', 'A')
            row = params.get('row', 1)
            formula = params.get('formula', '')
            if self._action_callback:
                self._action_callback({
                    'type': 'set_cell',
                    'column': col,
                    'row': row,
                    'value': formula
                })
                return f"Формула {col}{row} = {formula}"
        
        elif action == 'sort_column':
            col = params.get('column', 'A')
            order = params.get('order', 'asc')
            if self._action_callback:
                self._action_callback({
                    'type': 'sort_column',
                    'column': col,
                    'order': order
                })
                return f"Отсортировано по {col} ({order})"
        
        elif action == 'format_cells':
            conditions = params.get('conditions', [])
            if conditions and self._action_callback:
                self._action_callback({
                    'type': 'format_cells',
                    'conditions': conditions
                })
                return f"Применено {len(conditions)} условий форматирования"
        
        elif action == 'color_column':
            col = params.get('column', 'A')
            bg_color = params.get('bg_color', None)
            text_color = params.get('text_color', None)
            bold = params.get('bold', False)
            if self._action_callback:
                self._action_callback({
                    'type': 'color_column',
                    'column': col,
                    'bg_color': bg_color,
                    'text_color': text_color,
                    'bold': bold
                })
                return f"Окрашен столбец {col}"
        
        elif action == 'color_cells':
            cells = params.get('cells', [])
            if cells and self._action_callback:
                self._action_callback({
                    'type': 'color_cells',
                    'cells': cells
                })
                return f"Окрашено {len(cells)} ячеек"
        
        elif action == 'color_row':
            row = params.get('row', 1)
            bg_color = params.get('bg_color', None)
            text_color = params.get('text_color', None)
            bold = params.get('bold', False)
            if self._action_callback:
                self._action_callback({
                    'type': 'color_row',
                    'row': row,
                    'bg_color': bg_color,
                    'text_color': text_color,
                    'bold': bold
                })
                return f"Окрашена строка {row}"
        
        elif action == 'color_range':
            if self._action_callback:
                self._action_callback({
                    'type': 'color_range',
                    **params
                })
                return "Окрашен диапазон"
        
        elif action == 'bold_column':
            col = params.get('column', 'A')
            if self._action_callback:
                self._action_callback({
                    'type': 'bold_column',
                    'column': col
                })
                return f"Жирный текст в столбце {col}"
        
        elif action == 'clear_cell':
            col = params.get('column', 'A')
            row = params.get('row', 1)
            if self._action_callback:
                self._action_callback({
                    'type': 'clear_cell',
                    'column': col,
                    'row': row
                })
                return f"Очищена ячейка {col}{row}"
        
        elif action == 'clear_column':
            col = params.get('column', 'A')
            if self._action_callback:
                self._action_callback({
                    'type': 'clear_column',
                    'column': col
                })
                return f"Очищен столбец {col}"
        
        elif action == 'clear_range':
            if self._action_callback:
                self._action_callback({
                    'type': 'clear_range',
                    **params
                })
                return "Очищен диапазон"
        
        elif action == 'clear_all':
            if self._action_callback:
                self._action_callback({
                    'type': 'clear_all'
                })
                return "Таблица очищена"
        
        elif action == 'insert_row':
            position = params.get('position', 0)
            if self._action_callback:
                self._action_callback({
                    'type': 'insert_row',
                    'position': position
                })
                return f"Вставлена строка на позиции {position}"
        
        elif action == 'delete_row':
            position = params.get('position', 0)
            if self._action_callback:
                self._action_callback({
                    'type': 'delete_row',
                    'position': position
                })
                return f"Удалена строка {position}"
        
        elif action == 'analyze':
            # Для анализа — запрашиваем AI
            table_state = self.get_table_state() if self.get_table_state else None
            if table_state and chat_with_openrouter:
                analysis = chat_with_openrouter(
                    f"Проанализируй эти данные таблицы и дай краткий отчёт. ВАЖНО: внимательно сравнивай числа, не путай строки! Найди максимальные и минимальные значения ТОЧНО.\n{table_state}",
                    extra_system="You are a precise data analyst. Analyze the spreadsheet data carefully. IMPORTANT: When comparing numbers, convert them to actual numbers first. Do NOT guess — read the exact values from the table. Respond in Russian. Be concise and accurate."
                )
                return analysis
            return "Нет данных для анализа"
        
        else:
            logger.warning(f"Unknown agent action: {action}")
            return f"Неизвестное действие: {action}"
        
        return None

    def stop(self):
        """Останавливает выполнение плана"""
        self._is_running = False
        logger.info("Agent execution stopped by user")

    def get_plan_summary(self) -> str:
        """Возвращает краткое описание текущего плана"""
        if not self._plan:
            return "Нет активного плана"
        
        lines = [f"План ({len(self._plan)} шагов):"]
        for step in self._plan:
            num = step.get('step', '?')
            desc = step.get('description', 'Без описания')
            action = step.get('action', 'unknown')
            lines.append(f"  {num}. [{action}] {desc}")
        
        return "\n".join(lines)
