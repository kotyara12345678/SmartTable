"""
Модуль для применения шаблонов к таблицам

Позволяет применять структуру шаблона к существующей таблице,
создавая колонки с нужными типами данных и заголовками
"""

from typing import List, Dict, Any
from .template_manager import ExportTemplate, TemplateField, DataPattern


class TemplateApplier:
    """Применяет шаблоны к таблицам"""

    @staticmethod
    def apply_template_structure(template: ExportTemplate, max_rows: int = 100) -> Dict[str, Any]:
        """
        Создает структуру данных для таблицы на основе шаблона
        
        Args:
            template: Объект шаблона
            max_rows: Максимальное количество пустых строк для создания
        
        Returns:
            Словарь с информацией о структуре:
            {
                'headers': ['Имя', 'Email', 'Телефон'],
                'rows': [[], [], ...],  # max_rows пустых строк
                'column_types': [DataPattern, ...],
                'key_fields': [0, ...],  # индексы ключевых полей
                'settings': {...}
            }
        """
        if not template or not template.fields:
            return {
                'headers': [],
                'rows': [[] for _ in range(max_rows)],
                'column_types': [],
                'key_fields': [],
                'settings': template.settings if template else {}
            }

        # Сортируем поля по column_index
        sorted_fields = sorted(template.fields, key=lambda f: f.column_index)

        headers = [field.name for field in sorted_fields]
        column_types = [field.pattern for field in sorted_fields]
        key_fields = [field.column_index for field in sorted_fields if field.is_key_field]

        # Создаем пустые строки
        rows = [[] for _ in range(max_rows)]

        return {
            'headers': headers,
            'rows': rows,
            'column_types': column_types,
            'key_fields': key_fields,
            'settings': template.settings
        }

    @staticmethod
    def get_column_format_string(field: TemplateField) -> str:
        """Возвращает строку формата для колонки"""
        if field.format_string:
            return field.format_string

        # Возвращаем формат по умолчанию для типа данных
        format_map = {
            DataPattern.DATE: "dd.mm.yyyy",
            DataPattern.CURRENCY: "#,##0.00 ₽",
            DataPattern.PERCENTAGE: "0.00%",
            DataPattern.NUMBER: "#,##0.00",
            DataPattern.EMAIL: "@",
            DataPattern.PHONE: "+7 (999) 999-99-99",
            DataPattern.TEXT: "",
            DataPattern.FORMULA: "",
        }

        return format_map.get(field.pattern, "")

    @staticmethod
    def get_validation_formula(field: TemplateField) -> str:
        """Возвращает формулу валидации для поля"""
        if field.pattern == DataPattern.EMAIL:
            return "CONTAINS('@') AND CONTAINS('.')"
        elif field.pattern == DataPattern.PHONE:
            return "LENGTH >= 10"
        elif field.pattern == DataPattern.CURRENCY or field.pattern == DataPattern.NUMBER:
            return "IS_NUMBER"
        elif field.pattern == DataPattern.DATE:
            return "IS_DATE"

        return ""

    @staticmethod
    def create_empty_table_with_template(template: ExportTemplate, rows_count: int = 100) -> List[List[str]]:
        """
        Создает пустую таблицу с структурой из шаблона
        
        Args:
            template: Объект шаблона
            rows_count: Количество пустых строк
        
        Returns:
            Список списков (таблица) с заголовками
        """
        if not template or not template.fields:
            return []

        sorted_fields = sorted(template.fields, key=lambda f: f.column_index)
        headers = [field.name for field in sorted_fields]

        # Создаем таблицу с заголовками и пустыми строками
        table = [headers]
        for _ in range(rows_count):
            table.append([''] * len(headers))

        return table

    @staticmethod
    def get_template_description_text(template: ExportTemplate) -> str:
        """Возвращает текстовое описание структуры шаблона"""
        lines = []
        lines.append(f"📋 Шаблон: {template.name}")
        lines.append(f"📝 Описание: {template.description}")
        lines.append(f"📅 Создан: {template.created_at}")
        lines.append(f"✏️ Изменен: {template.modified_at}")
        lines.append("")
        lines.append(f"📊 Структура ({len(template.fields)} полей):")

        sorted_fields = sorted(template.fields, key=lambda f: f.column_index)
        for i, field in enumerate(sorted_fields, 1):
            key_marker = " (ключевое)" if field.is_key_field else ""
            lines.append(f"  {i}. {field.name} [{field.pattern.value}]{key_marker}")

        if template.logic_rules:
            lines.append(f"\n⚙️ Правила обработки: {len(template.logic_rules)}")

        return "\n".join(lines)
