"""
Модуль шаблонов для SmartTable
"""

from .template_manager import TemplateManager, ExportTemplate, TemplateField, CellRange, DataPattern, TemplateLogic
from .template_applier import TemplateApplier

__all__ = [
    'TemplateManager',
    'ExportTemplate',
    'TemplateField',
    'CellRange',
    'DataPattern',
    'TemplateLogic',
    'TemplateApplier',
    'TemplateBuilderDialog',
    'TemplateManagerDialog',
    'TemplatePreviewDialog',
    'TemplateGalleryDialog'
]

# Импортируем UI компоненты здесь, чтобы избежать циклических импортов
from .template_ui import TemplateBuilderDialog, TemplateManagerDialog, TemplatePreviewDialog, TemplateGalleryDialog