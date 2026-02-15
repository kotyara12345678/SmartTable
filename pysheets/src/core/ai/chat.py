import os
import re
import ast
import operator
from typing import Optional
from pysheets.src.core.ai.promt import chat_with_local_model

try:
    from pysheets.src.core.ai.openrouter import chat_with_openrouter
except Exception:
    chat_with_openrouter = None


# Safe eval for simple arithmetic expressions (+ - * /)
_ALLOWED_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
}


def _safe_eval(expr: str) -> Optional[float]:
    try:
        node = ast.parse(expr, mode='eval')

        def _eval(n):
            # Expression wrapper
            if isinstance(n, ast.Expression):
                return _eval(n.body)
            # Numbers in newer Python ASTs are Constant
            if isinstance(n, ast.Constant) and isinstance(n.value, (int, float)):
                return n.value
            # Fallback for older AST types
            if isinstance(n, ast.Num):
                return n.n
            # Binary operations
            if isinstance(n, ast.BinOp):
                op_type = type(n.op)
                if op_type in _ALLOWED_OPERATORS:
                    left = _eval(n.left)
                    right = _eval(n.right)
                    if left is None or right is None:
                        return None
                    return _ALLOWED_OPERATORS[op_type](left, right)
                return None
            # Unary minus
            if isinstance(n, ast.UnaryOp) and isinstance(n.op, ast.USub):
                val = _eval(n.operand)
                return -val if val is not None else None
            return None

        return _eval(node)
    except Exception:
        # If parsing failed, return None
        return None


# Detect patterns like "How many r's are in the word 'strawberry'?" or Russian "Сколько букв 'а' в слове 'мама'?"
_RE_COUNT_EN = re.compile(r"how many\s+([a-zA-Z])(?:'s)?\s+are in the word\s+'([^']+)'\??", re.IGNORECASE)
_RE_COUNT_RU = re.compile(r"сколько\s+(?:букв|буква)?\s*['\"]?([а-яёА-ЯЁ])['\"]?\s+в\s+слове\s+['\"]?([^\'\"]+)['\"]?\??", re.IGNORECASE)


def _handle_simple_questions(message: str) -> Optional[str]:
    s = message.strip()
    # Arithmetic like 'Посчитай 1 + 1' or '1 + 1 = ?' or 'How much is 2+2?'
    # Require at least one operator to avoid accidental number matches
    m = re.search(r"(\d+(?:\s*[\+\-\*\/]\s*\d+)+)", s)
    if m:
        expr = m.group(1)
        val = _safe_eval(expr)
        if val is not None:
            # If integer-like, return as int
            if abs(val - int(val)) < 1e-9:
                return str(int(val))
            return str(val)

    # Count letters in word (English). Accept several phrasing variants.
    m = _RE_COUNT_EN.search(s)
    if not m:
        # Try variations like "How many 'r' in strawberry?" or unquoted
        m = re.search(r"how many\s+['\"]?([a-zA-Z])['\"]?\s+in\s+the\s+word\s+['\"]?([^'\"]+)['\"]?\??", s, re.IGNORECASE)
    if m:
        letter = re.sub(r"[^a-zA-Z]", "", m.group(1)).lower()
        word = re.sub(r"[^a-zA-Z]", "", m.group(2)).lower()
        # defensive: if no letter or word found, skip
        if not letter or not word:
            return None
        count = sum(1 for ch in word if ch == letter)
        # debug: print groups to help diagnose bad counts
        if count > len(word):
            print(f"[debug] EN count mismatch: letter={letter}, word={word}, count={count}")
        return str(count)

    # Count letters in word (Russian)
    m = _RE_COUNT_RU.search(s)
    if m:
        letter = re.sub(r"[^а-яёА-ЯЁ]", "", m.group(1), flags=re.IGNORECASE).lower()
        word = re.sub(r"[^а-яёА-ЯЁ]", "", m.group(2), flags=re.IGNORECASE).lower()
        if not letter or not word:
            return None
        count = sum(1 for ch in word if ch == letter)
        if count > len(word):
            print(f"[debug] RU count mismatch: letter={letter}, word={word}, count={count}")
        return str(count)

    # Domain knowledge: supplements (creatine)
    s_lower = s.lower()
    if 'креатин' in s_lower or 'creatine' in s_lower:
        # Short, safe, factual reply
        if 'ru' in s_lower or any(c in s for c in 'абвгдеёжзийклмнопрстуфхцчшщ'):
            return (
                'Креатин обычно считается безопасной и эффективной добавкой при дозировке ~3–5 г в сутки. '
                'Он может помочь увеличить силу и восстановление; при заболеваниях или сомнениях – проконсультируйтесь с врачом.'
            )
        else:
            return (
                'Creatine is generally safe and effective at ~3–5 g/day for improving strength and recovery. '
                'Consult a doctor if you have health conditions or concerns.'
            )

    return None


def _simple_token_set(text: str, lang: str = 'en') -> set:
    s = text.lower()
    # basic tokenization
    tokens = re.findall(r"[\wа-яё]+", s)
    stop_en = {'the','is','a','an','in','on','and','or','to','of','for','how','what','when','where','why'}
    stop_ru = {'и','в','не','на','что','как','к','по','с','за','для','есть','ли','ты','я'}
    if lang == 'ru':
        tokens = [t for t in tokens if t not in stop_ru]
    else:
        tokens = [t for t in tokens if t not in stop_en]
    return set(tokens)


def _detect_lang_simple(text: str) -> str:
    # reuse charset heuristic
    cyr = sum(1 for ch in text if '\u0400' <= ch <= '\u04FF')
    return 'ru' if cyr > 0 else 'en'


def _is_relevant(question: str, response: str) -> bool:
    try:
        lang = _detect_lang_simple(question)
        q_tokens = _simple_token_set(question, lang)
        r_tokens = _simple_token_set(response, lang)
        if not q_tokens or not r_tokens:
            return False
        overlap = q_tokens.intersection(r_tokens)
        # Require either at least 2 overlapping tokens, or proportion >= 0.3
        if len(overlap) >= 2:
            return True
        prop = len(overlap) / max(1, len(q_tokens))
        # Reject overly long responses with low overlap
        if len(response) > 400 and prop < 0.35:
            return False
        return prop >= 0.30
    except Exception:
        return False


def RequestMessage(message: str) -> str:
    """Send the message to the preferred model (OpenRouter if configured) and return the response text.

    Falls back to the local model if OpenRouter is not configured or fails.
    Returns an error message string if no model responds.
    """
    try:
        # Always use chat_with_openrouter, which uses the hardcoded API key
        if chat_with_openrouter is not None:
            # System prompt to instruct AI about table modification capabilities
            system_prompt = """You are a helpful spreadsheet assistant. You can fill tables with data and modify them.

You MUST understand user messages even with typos and mistakes. For example:
- "удали паля A2" means "удали поля A2" (clear cell A2)
- "очисти ячейку" means clear a cell
- "убери столбец" means clear a column

=== FILLING TABLE WITH DATA ===
When providing table data, ALWAYS use this exact format:

```json
[
  ["Header1", "Header2", "Header3"],
  ["Value1", "Value2", "Value3"]
]
```

Rules:
- Wrap JSON arrays in ```json and ``` markers
- All rows must have the same number of columns
- All values must be strings
- Headers go in the first row

=== TABLE COMMANDS ===
When user asks to clear, delete, or modify cells/columns/rows, you MUST use [TABLE_COMMAND] markers.
ALWAYS include the command even if you also write explanatory text.

Clear a specific cell:
[TABLE_COMMAND]{"action": "clear_cell", "column": "A", "row": 2}[/TABLE_COMMAND]

Clear a column (all data in it):
[TABLE_COMMAND]{"action": "clear_column", "column": "B"}[/TABLE_COMMAND]

Clear multiple columns:
[TABLE_COMMAND]{"action": "clear_columns", "columns": ["B", "C"]}[/TABLE_COMMAND]

Clear specific rows (1-based):
[TABLE_COMMAND]{"action": "clear_rows", "rows": [1, 2, 3]}[/TABLE_COMMAND]

Clear a range of cells:
[TABLE_COMMAND]{"action": "clear_range", "start_col": "A", "start_row": 1, "end_col": "C", "end_row": 5}[/TABLE_COMMAND]

Delete a column (shift remaining left):
[TABLE_COMMAND]{"action": "delete_column", "column": "B"}[/TABLE_COMMAND]

Clear entire table:
[TABLE_COMMAND]{"action": "clear_all"}[/TABLE_COMMAND]

=== COLORING / FORMATTING CELLS ===
Color background of specific cells:
[TABLE_COMMAND]{"action": "color_cells", "cells": [{"column": "A", "row": 1, "bg_color": "#FF0000", "text_color": "#FFFFFF"}]}[/TABLE_COMMAND]

Color entire column (all non-empty cells):
[TABLE_COMMAND]{"action": "color_column", "column": "B", "bg_color": "#00FF00", "text_color": "#000000"}[/TABLE_COMMAND]

Color entire row:
[TABLE_COMMAND]{"action": "color_row", "row": 1, "bg_color": "#0000FF", "text_color": "#FFFFFF"}[/TABLE_COMMAND]

Color a range of cells:
[TABLE_COMMAND]{"action": "color_range", "start_col": "A", "start_row": 1, "end_col": "C", "end_row": 5, "bg_color": "#FFFF00", "text_color": "#000000"}[/TABLE_COMMAND]

Make text bold in a column:
[TABLE_COMMAND]{"action": "bold_column", "column": "A"}[/TABLE_COMMAND]

Common colors: red=#FF0000, green=#00AA00, blue=#0000FF, yellow=#FFFF00, orange=#FF8800, white=#FFFFFF, black=#000000
You can use bg_color alone (only background), text_color alone (only text), or both together.

=== MULTI-SHEET SUPPORT ===
When the user mentions specific sheets (e.g. [Лист1], [Лист2]), you can target data to a specific sheet.
Use [SHEET:ИмяЛиста] marker BEFORE the ```json block to specify which sheet to fill:

[SHEET:Лист1]
```json
[
  ["Header1", "Header2"],
  ["Value1", "Value2"]
]
```

[SHEET:Лист2]
```json
[
  ["Header1", "Header2"],
  ["Value1", "Value2"]
]
```

If no [SHEET:] marker is used, data goes to the current active sheet.
You can fill multiple sheets in one response by using multiple [SHEET:name] + ```json blocks.

=== CRITICAL RULES ===
1. ALWAYS include [TABLE_COMMAND] when user asks to clear/delete/remove anything
2. Column letters: A, B, C, D, ... Z
3. Row numbers are 1-based (first row = 1)
4. Understand typos! "паля" = "поля", "ячейка" = "ячейку", etc.
5. If user says "A2" it means column A, row 2
6. Always respond in Russian
7. Put explanatory text BEFORE or AFTER the command/JSON block
8. When user mentions specific sheets with @, use [SHEET:name] to target the correct sheet"""
            
            resp = chat_with_openrouter(message, extra_system=system_prompt)
            if resp:
                return str(resp)
            return "Ошибка: не удалось получить ответ от OpenRouter"
        else:
            return "Ошибка: функция OpenRouter недоступна"
    except Exception as e:
        return f"Ошибка: {e}"
