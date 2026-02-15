"""
Миксин для AI-формул в электронной таблице.
Поддерживает формулы вида =AI("промпт") для вычисления значений с помощью ИИ.
"""

import re
from typing import Optional

from PyQt5.QtWidgets import QTableWidgetItem


class AIFormulasMixin:
    """Миксин с методами для AI-формул =AI("...")"""

    def _is_ai_formula(self, value: str) -> bool:
        """Проверяет, является ли значение AI-формулой вида =AI("...") или =AI('...')"""
        if not value:
            return False
        normalized = value.strip()
        return bool(re.match(r'^=AI\s*\(', normalized, re.IGNORECASE))

    def _extract_ai_prompt(self, value: str) -> Optional[str]:
        """Извлекает текст промпта из AI-формулы =AI("промпт")"""
        if not value:
            return None
        normalized = value.strip()
        # Формат =AI("...") или =AI('...')
        match = re.match(r"^=AI\s*\([\"'](.+?)[\"']\)$", normalized, re.IGNORECASE | re.DOTALL)
        if match:
            return match.group(1)
        # Формат без кавычек: =AI(текст)
        match = re.match(r"^=AI\s*\((.+)\)$", normalized, re.IGNORECASE | re.DOTALL)
        if match:
            return match.group(1).strip().strip('"\'')
        return None

    def _get_table_context_for_ai(self, row: int, col: int) -> str:
        """Собирает контекст таблицы для AI-формулы (заголовки + данные)"""
        context_parts = []
        
        # Собираем заголовки (строка 0)
        headers = []
        for c in range(min(self.columns, 26)):
            cell = self.get_cell(0, c)
            if cell and cell.value:
                col_letter = chr(65 + c)
                headers.append(f"{col_letter}: {cell.value}")
        if headers:
            context_parts.append("Заголовки: " + ", ".join(headers))
        
        # Собираем данные (до 50 строк)
        data_rows = []
        for r in range(1, min(self.rows, 51)):
            row_data = []
            has_data = False
            for c in range(min(self.columns, 26)):
                cell = self.get_cell(r, c)
                val = ""
                if cell and cell.calculated_value:
                    val = cell.calculated_value
                elif cell and cell.value:
                    val = cell.value
                if val and "AI думает" not in val:
                    has_data = True
                row_data.append(val)
            if has_data:
                data_rows.append(f"Строка {r+1}: " + " | ".join(row_data))
        
        if data_rows:
            context_parts.append("Данные:\n" + "\n".join(data_rows[:30]))
        
        # Позиция текущей ячейки
        col_letter = chr(65 + col) if col < 26 else str(col)
        context_parts.append(f"Текущая ячейка: {col_letter}{row+1}")
        
        return "\n".join(context_parts)

    def _evaluate_ai_formula(self, row: int, col: int, prompt: str):
        """Вычисляет AI-формулу в фоновом потоке"""
        try:
            # Проверяем кэш
            cache_key = prompt.strip().lower()
            if cache_key in self._ai_cache:
                self.ai_formula_result.emit(row, col, self._ai_cache[cache_key])
                return
            
            # Собираем контекст таблицы
            table_context = self._get_table_context_for_ai(row, col)
            
            # Системный промпт для AI
            system_prompt = (
                "Ты — AI-помощник для электронных таблиц. "
                "Пользователь ввёл формулу =AI(\"промпт\") в ячейку. "
                "Ты должен вернуть ТОЛЬКО результат — одно число, текст или короткий ответ. "
                "НЕ возвращай объяснения, markdown или блоки кода. "
                "Только чистое значение для ячейки.\n\n"
                "Контекст таблицы:\n" + table_context
            )
            
            from pysheets.src.core.ai.openrouter import chat_with_openrouter
            
            full_message = f"Вычисли/ответь для ячейки таблицы: {prompt}"
            result = chat_with_openrouter(full_message, extra_system=system_prompt)
            
            if result:
                # Очищаем результат
                result = result.strip()
                result = result.replace('```', '').strip()
                # Берём первую значимую строку
                lines = [l.strip() for l in result.split('\n') if l.strip()]
                if lines:
                    result = lines[0]
                
                # Кэшируем результат
                self._ai_cache[cache_key] = result
                self.ai_formula_result.emit(row, col, result)
            else:
                self.ai_formula_result.emit(row, col, "#AI_ERROR!")
        except Exception as e:
            print(f"[AI Formula Error] {e}")
            self.ai_formula_result.emit(row, col, "#AI_ERROR!")

    def _on_ai_formula_result(self, row: int, col: int, result: str):
        """Обработка результата AI-формулы (вызывается в главном потоке через сигнал)"""
        cell = self.get_cell(row, col)
        if not cell:
            return
        
        cell.set_calculated_value(result)
        
        item = self.item(row, col)
        if item is None:
            item = QTableWidgetItem()
            self.setItem(row, col, item)
        
        self._updating = True
        item.setText(result)
        self._updating = False
        
        # Применяем форматирование
        self.apply_cell_formatting(row, col)
        print(f"[AI Formula] Ячейка ({row},{col}) = {result}")
