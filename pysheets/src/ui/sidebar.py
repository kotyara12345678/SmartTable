"""
Боковая панель приложения
"""

from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QGroupBox, QPushButton,
                             QListWidget, QListWidgetItem, QLabel)
from PyQt6.QtCore import pyqtSignal, Qt
from PyQt6.QtGui import QFont


class Sidebar(QWidget):
    """Боковая панель с инструментами"""

    # Сигналы
    function_selected = pyqtSignal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.init_ui()

    def init_ui(self):
        """Инициализация UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(5, 5, 5, 5)
        layout.setSpacing(10)

        # Быстрые функции
        func_group = QGroupBox("⚡ Быстрые функции")
        func_layout = QVBoxLayout()

        functions = [
            ("SUM", "Сумма выделенного"),
            ("AVERAGE", "Среднее значение"),
            ("COUNT", "Количество"),
            ("MAX", "Максимум"),
            ("MIN", "Минимум"),
            ("AUTOSUM", "Автосумма"),
        ]

        for func_code, func_name in functions:
            btn = QPushButton(func_name)
            btn.setObjectName(func_code)
            btn.clicked.connect(lambda checked, f=func_code: self.on_function_clicked(f))
            btn.setStyleSheet("""
                QPushButton {
                    text-align: left;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 3px;
                }
                QPushButton:hover {
                    background-color: #f0f0f0;
                }
            """)
            func_layout.addWidget(btn)

        func_group.setLayout(func_layout)
        layout.addWidget(func_group)

        # Форматы данных
        format_group = QGroupBox("📊 Форматы данных")
        format_layout = QVBoxLayout()

        formats = [
            ("general", "Общий"),
            ("number", "Числовой"),
            ("currency", "Денежный"),
            ("percent", "Процент"),
            ("date", "Дата"),
            ("time", "Время"),
        ]

        for format_code, format_name in formats:
            btn = QPushButton(format_name)
            btn.setObjectName(format_code)
            btn.clicked.connect(lambda checked, f=format_code: self.on_format_clicked(f))
            btn.setStyleSheet("""
                QPushButton {
                    text-align: left;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 3px;
                }
                QPushButton:hover {
                    background-color: #f0f0f0;
                }
            """)
            format_layout.addWidget(btn)

        format_group.setLayout(format_layout)
        layout.addWidget(format_group)

        # Открытые вкладки
        self.tabs_group = QGroupBox("📑 Вкладки")
        tabs_layout = QVBoxLayout()
        self.tabs_list = QListWidget()
        self.tabs_list.itemClicked.connect(self.on_tab_clicked)
        tabs_layout.addWidget(self.tabs_list)
        self.tabs_group.setLayout(tabs_layout)
        layout.addWidget(self.tabs_group)

        # Информация
        info_group = QGroupBox("ℹ️ Информация")
        info_layout = QVBoxLayout()

        self.cell_info = QLabel("Ячейка: A1")
        self.selection_info = QLabel("Выделено: 0 ячеек")
        self.sheet_info = QLabel("Лист: Лист1")

        info_layout.addWidget(self.cell_info)
        info_layout.addWidget(self.selection_info)
        info_layout.addWidget(self.sheet_info)

        info_group.setLayout(info_layout)
        layout.addWidget(info_group)

        layout.addStretch()

    def on_function_clicked(self, function: str):
        """Обработка клика по функции"""
        self.function_selected.emit(function)

    def on_format_clicked(self, format_type: str):
        """Обработка клика по формату"""
        # Можно добавить обработку форматов
        pass

    def on_tab_clicked(self, item: QListWidgetItem):
        """Обработка клика по вкладке"""
        # Переключение на вкладку
        pass

    def update_tabs(self, tab_names: list):
        """Обновление списка вкладок"""
        self.tabs_list.clear()
        for name in tab_names:
            item = QListWidgetItem(name)
            self.tabs_list.addItem(item)

    def update_cell_info(self, cell_ref: str):
        """Обновление информации о ячейке"""
        self.cell_info.setText(f"Ячейка: {cell_ref}")

    def update_selection_info(self, count: int):
        """Обновление информации о выделении"""
        self.selection_info.setText(f"Выделено: {count} ячеек")

    def update_sheet_info(self, sheet_name: str):
        """Обновление информации о листе"""
        self.sheet_info.setText(f"Лист: {sheet_name}")