"""
Модуль шаблонов для SmartTable
"""

from .template_manager import TemplateManager, ExportTemplate, TemplateField, CellRange, DataPattern

__all__ = [
    'TemplateManager',
    'ExportTemplate',
    'TemplateField',
    'CellRange',
    'DataPattern',
    'TemplateBuilderDialog',
    'TemplateManagerDialog',
    'TemplatePreviewDialog'
]

# Импортируем UI компоненты здесь, чтобы избежать циклических импортов
from .template_ui import TemplateBuilderDialog, TemplateManagerDialog, TemplatePreviewDialog