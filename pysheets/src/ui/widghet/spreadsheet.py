"""
Виджет электронной таблицы — основной класс.
Собирает функциональность из миксинов.
"""

import pandas as pd
import re
from typing import Optional, List, Dict, Any

from PyQt5.QtWidgets import (QTableWidget, QTableWidgetItem, QHeaderView,
                              QAbstractItemView, QMenu, QColorDialog, QAction, QApplication,
                              QStyledItemDelegate, QLineEdit, QDialog, QMessageBox)
from PyQt5.QtCore import Qt, pyqtSignal, QPoint, QTimer
from PyQt5.QtGui import QBrush, QColor, QFont, QKeySequence, QMouseEvent

from pysheets.src.core.cell import Cell
from pysheets.src.core.formula.engine import FormulaEngine
from pysheets.src.core.sheet.spread import Spreadsheet
from pysheets.src.util.validators import parse_cell_reference

# Импорт миксинов
from pysheets.src.ui.widghet.ui_setup import UISetupMixin
from pysheets.src.ui.widghet.cell_operations import CellOperationsMixin
from pysheets.src.ui.widghet.context_menu import ContextMenuMixin
from pysheets.src.ui.widghet.cell_features import CellFeaturesMixin
from pysheets.src.ui.widghet.editing import EditingMixin
from pysheets.src.ui.widghet.data_io import DataIOMixin
from pysheets.src.ui.widghet.ai_formulas import AIFormulasMixin


class SpreadsheetWidget(
    UISetupMixin,
    CellOperationsMixin,
    ContextMenuMixin,
    CellFeaturesMixin,
    EditingMixin,
    DataIOMixin,
    AIFormulasMixin,
    QTableWidget
):
    """Виджет электронной таблицы с поддержкой формул, форматирования и AI"""

    # Сигналы
    cell_selected = pyqtSignal(int, int, str)  # row, col, value
    data_changed = pyqtSignal(int, int, str)  # row, col, new_value
    selection_changed = pyqtSignal()

    # Расширенные сигналы
    auto_correction_applied = pyqtSignal(int, int)
    cell_resized = pyqtSignal(int, int, int, int)  # row, col, width, height
    cell_split = pyqtSignal(int, int, str)  # row, col, split_type
    cell_frozen = pyqtSignal(int, int, bool)  # row, col, frozen
    cell_hidden = pyqtSignal(int, int, bool)  # row, col, hidden
    format_changed = pyqtSignal()
    ai_formula_result = pyqtSignal(int, int, str)  # row, col, result — для AI-формул

    def __init__(self, parent=None):
        super().__init__(1000, 26, parent)  # 1000 строк, 26 колонок

        # Модель данных
        self.rows = 1000
        self.columns = 26
        self.zoom_level = 100
        self._updating = False
        
        # FormulaEngine для вычисления формул
        self.formula_engine = FormulaEngine()
        
        # Локальное хранилище ячеек
        self.cells: List[List[Cell]] = [
            [Cell(row, col) for col in range(self.columns)] for row in range(self.rows)
        ]
        
        # Модель данных (опционально)
        self.spreadsheet: Optional[Spreadsheet] = None

        # Состояния для расширенных функций
        self.frozen_cells = set()
        self.hidden_cells = set()
        self.split_cells = {}
        self.custom_sizes = {}
        self.merged_cells = {}

        # Атрибуты для изменения размера мышкой
        self._resizing_cell = None
        self._drag_start_pos = None
        self._original_size = None
        self._is_dragging = False

        # Настройка UI
        self.init_ui()

        # Контекстное меню
        self.setContextMenuPolicy(Qt.CustomContextMenu)
        self.customContextMenuRequested.connect(self.show_context_menu)

        # Подключение сигналов
        self.cellChanged.connect(self.on_cell_changed)
        self.cellClicked.connect(self.on_cell_clicked)
        self.itemSelectionChanged.connect(self.on_selection_changed)

        # AI formula cache and signal
        self._ai_cache = {}
        self.ai_formula_result.connect(self._on_ai_formula_result)
