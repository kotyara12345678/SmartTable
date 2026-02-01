"""
Боковая панель приложения - информация и листы
"""

from PyQt5.QtWidgets import (QWidget, QVBoxLayout, QGroupBox, QPushButton,
                             QListWidget, QListWidgetItem, QLabel, QFrame,
                             QSizePolicy)
from PyQt5.QtCore import pyqtSignal, Qt
from PyQt5.QtGui import QFont


class Sidebar(QWidget):
    """Боковая панель с информацией о текущей ячейке и списком листов"""

    # Сигналы
    function_selected = pyqtSignal(str)
    format_selected = pyqtSignal(str)
    tab_switch_requested = pyqtSignal(int)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.Expanding)
        self.init_ui()

    def init_ui(self):
        """Инициализация UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(4, 4, 4, 4)
        layout.setSpacing(8)

        # ========== Информация о текущей позиции ==========
        info_group = QGroupBox("📍 Текущая позиция")
        info_layout = QVBoxLayout(info_group)
        info_layout.setContentsMargins(8, 12, 8, 8)
        info_layout.setSpacing(4)
        
        self.cell_info = QLabel("Ячейка: A1")
        self.cell_info.setFont(QFont("Segoe UI", 11, QFont.Bold))
        
        self.selection_info = QLabel("Выделено: 1 ячейка")
        self.value_info = QLabel("Значение: ")
        self.formula_info = QLabel("Формула: ")
        
        info_layout.addWidget(self.cell_info)
        info_layout.addWidget(self.selection_info)
        info_layout.addWidget(self.value_info)
        info_layout.addWidget(self.formula_info)
        
        layout.addWidget(info_group)

        # ========== Статистика выделения ==========
        stats_group = QGroupBox("📊 Статистика")
        stats_layout = QVBoxLayout(stats_group)
        stats_layout.setContentsMargins(8, 12, 8, 8)
        stats_layout.setSpacing(4)
        
        self.stats_sum = QLabel("Сумма: —")
        self.stats_avg = QLabel("Среднее: —")
        self.stats_count = QLabel("Чисел: —")
        self.stats_min = QLabel("Мин: —")
        self.stats_max = QLabel("Макс: —")
        
        stats_layout.addWidget(self.stats_sum)
        stats_layout.addWidget(self.stats_avg)
        stats_layout.addWidget(self.stats_count)
        stats_layout.addWidget(self.stats_min)
        stats_layout.addWidget(self.stats_max)
        
        layout.addWidget(stats_group)

        # ========== Список листов ==========
        sheets_group = QGroupBox("📑 Листы документа")
        sheets_layout = QVBoxLayout(sheets_group)
        sheets_layout.setContentsMargins(8, 12, 8, 8)
        
        self.tabs_list = QListWidget()
        self.tabs_list.itemClicked.connect(self.on_tab_clicked)
        self.tabs_list.setMinimumHeight(80)
        sheets_layout.addWidget(self.tabs_list)
        
        layout.addWidget(sheets_group)

        # ========== Растягивающийся элемент ==========
        layout.addStretch(1)

        # ========== Информация о документе ==========
        doc_group = QGroupBox("📄 Документ")
        doc_layout = QVBoxLayout(doc_group)
        doc_layout.setContentsMargins(8, 12, 8, 8)
        doc_layout.setSpacing(4)
        
        self.sheet_info = QLabel("Лист: Лист1")
        self.doc_info = QLabel("Размер: 100×26")
        
        doc_layout.addWidget(self.sheet_info)
        doc_layout.addWidget(self.doc_info)
        
        layout.addWidget(doc_group)

    def on_tab_clicked(self, item: QListWidgetItem):
        """Обработка клика по листу"""
        index = self.tabs_list.row(item)
        self.tab_switch_requested.emit(index)

    def update_tabs(self, tab_names: list):
        """Обновление списка листов"""
        self.tabs_list.clear()
        for name in tab_names:
            item = QListWidgetItem(f"📄 {name}")
            self.tabs_list.addItem(item)

    def update_cell_info(self, cell_ref: str):
        """Обновление информации о ячейке"""
        self.cell_info.setText(f"Ячейка: {cell_ref}")

    def update_selection_info(self, count: int):
        """Обновление информации о выделении"""
        if count == 1:
            self.selection_info.setText("Выделено: 1 ячейка")
        elif 2 <= count <= 4:
            self.selection_info.setText(f"Выделено: {count} ячейки")
        else:
            self.selection_info.setText(f"Выделено: {count} ячеек")

    def update_sheet_info(self, sheet_name: str):
        """Обновление информации о листе"""
        self.sheet_info.setText(f"Лист: {sheet_name}")

    def update_value_info(self, value: str):
        """Обновление отображаемого значения"""
        display = value[:30] + "..." if len(value) > 30 else value
        self.value_info.setText(f"Значение: {display}")

    def update_formula_info(self, formula: str):
        """Обновление отображаемой формулы"""
        if formula:
            display = formula[:25] + "..." if len(formula) > 25 else formula
            self.formula_info.setText(f"Формула: {display}")
        else:
            self.formula_info.setText("Формула: —")

    def update_stats(self, stats: dict):
        """Обновление статистики выделения"""
        if stats.get('count', 0) > 0:
            self.stats_sum.setText(f"Сумма: {stats.get('sum', 0):.2f}")
            self.stats_avg.setText(f"Среднее: {stats.get('average', 0):.2f}")
            self.stats_count.setText(f"Чисел: {stats.get('count', 0)}")
            self.stats_min.setText(f"Мин: {stats.get('min', 0):.2f}")
            self.stats_max.setText(f"Макс: {stats.get('max', 0):.2f}")
        else:
            self.stats_sum.setText("Сумма: —")
            self.stats_avg.setText("Среднее: —")
            self.stats_count.setText("Чисел: —")
            self.stats_min.setText("Мин: —")
            self.stats_max.setText("Макс: —")

    def update_doc_info(self, rows: int, cols: int):
        """Обновление информации о размере документа"""
        self.doc_info.setText(f"Размер: {rows}×{cols}")
