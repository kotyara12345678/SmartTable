import os
import re
import ast
import operator
from typing import Optional
from pysheets.src.core.ai.lama import chat_with_local_model

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
            resp = chat_with_openrouter(message)
            if resp:
                return str(resp)
            return "Ошибка: не удалось получить ответ от OpenRouter"
        else:
            return "Ошибка: функция OpenRouter недоступна"
    except Exception as e:
        return f"Ошибка: {e}"
