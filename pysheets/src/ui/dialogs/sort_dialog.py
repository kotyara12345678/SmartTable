from PyQt5.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QPushButton, QTableWidget,
    QTableWidgetItem, QComboBox, QCheckBox, QLabel, QWidget, QHeaderView, QSizePolicy
)
from PyQt5.QtCore import Qt


class SortDialog(QDialog):
    """Диалог настройки сортировки с несколькими уровнями"""

    def __init__(self, columns: list, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Сортировка")
        self.resize(800, 420)
        self.setMinimumSize(600, 320)

        self.columns = columns[:]  # список меток колонок

        self.layout = QVBoxLayout(self)
        self.layout.setContentsMargins(12, 12, 12, 12)
        self.layout.setSpacing(8)

        # Опция: первая строка содержит заголовки
        header_widget = QWidget(self)
        header_layout = QHBoxLayout(header_widget)
        header_layout.setContentsMargins(0, 0, 0, 0)
        self.has_header_cb = QCheckBox("Первая строка содержит заголовки (использовать как подписи)")
        self.has_header_cb.setMinimumHeight(28)
        self.has_header_cb.setStyleSheet("QCheckBox{ padding:6px 4px; font-size:12px; }")
        header_layout.addWidget(self.has_header_cb)
        self.layout.addWidget(header_widget)

        # Таблица уровней сортировки
        self.level_table = QTableWidget(0, 3, self)
        self.level_table.setHorizontalHeaderLabels(["Колонка", "Тип", "Порядок"])
        # Настроим поведение изменения размеров колонок
        header = self.level_table.horizontalHeader()
        # Делаем первую колонку растягиваемой, остальные подстраиваются по содержимому
        header.setSectionResizeMode(0, QHeaderView.Stretch)
        header.setSectionResizeMode(1, QHeaderView.ResizeToContents)
        header.setSectionResizeMode(2, QHeaderView.ResizeToContents)
        self.level_table.setAlternatingRowColors(True)
        # Визуально интегрируем виджеты в ячейки: убираем сетку и делаем фон таблицы прозрачным
        self.level_table.setShowGrid(False)
        self.level_table.setStyleSheet(
            "QTableWidget{ background: transparent; border: none; }"
            "QHeaderView::section{ padding:8px 6px; }"
        )
        # Установим более компактную высоту строк
        vheader = self.level_table.verticalHeader()
        vheader.setDefaultSectionSize(30)
        vheader.setVisible(False)
        self.level_table.setMinimumHeight(180)
        self.level_table.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Expanding)
        self.layout.addWidget(self.level_table)

        # Кнопки добавить/удалить
        btn_row = QWidget(self)
        btn_layout = QHBoxLayout(btn_row)
        btn_layout.setContentsMargins(0, 0, 0, 0)
        self.add_btn = QPushButton("Добавить уровень")
        self.remove_btn = QPushButton("Удалить уровень")
        self.add_btn.setMinimumHeight(30)
        self.remove_btn.setMinimumHeight(30)
        self.add_btn.setStyleSheet("QPushButton{ padding:4px 10px; font-size:11px; }")
        self.remove_btn.setStyleSheet("QPushButton{ padding:4px 10px; font-size:11px; }")
        btn_layout.addWidget(self.add_btn)
        btn_layout.addWidget(self.remove_btn)
        btn_layout.addStretch()
        self.layout.addWidget(btn_row)

        # Нижняя строка OK/Cancel
        bottom = QWidget(self)
        bottom_layout = QHBoxLayout(bottom)
        bottom_layout.setContentsMargins(0, 0, 0, 0)
        bottom_layout.addStretch()
        self.ok_btn = QPushButton("OK")
        self.cancel_btn = QPushButton("Отмена")
        self.ok_btn.setMinimumHeight(30)
        self.cancel_btn.setMinimumHeight(30)
        self.ok_btn.setStyleSheet("QPushButton{ padding:4px 10px; font-size:11px; }")
        self.cancel_btn.setStyleSheet("QPushButton{ padding:4px 10px; font-size:11px; }")
        bottom_layout.addWidget(self.ok_btn)
        bottom_layout.addWidget(self.cancel_btn)
        self.layout.addWidget(bottom)

        # Сигналы
        self.add_btn.clicked.connect(self.add_level)
        self.remove_btn.clicked.connect(self.remove_level)
        self.ok_btn.clicked.connect(self.accept)
        self.cancel_btn.clicked.connect(self.reject)

        # Инициализация с одним уровнем
        self.add_level()

    def add_level(self, column_index: int = 0, sort_type: str = "Automatic", order: str = "ASC"):
        r = self.level_table.rowCount()
        self.level_table.insertRow(r)

        # Column combobox
        col_cb = QComboBox(self.level_table)
        for c in self.columns:
            col_cb.addItem(c)
        col_cb.setCurrentIndex(column_index if 0 <= column_index < len(self.columns) else 0)
        # more compact combobox
        col_cb.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
        col_cb.setStyleSheet(
            "QComboBox{ background: transparent; border: none; padding-left:6px; padding-top:-8px; min-height:26px; font-size:11px; }"
            "QComboBox::drop-down{ border: none; }"
        )
        self.level_table.setCellWidget(r, 0, col_cb)

        # Type combobox
        type_cb = QComboBox(self.level_table)
        for t in ["Automatic", "Numeric", "Text", "Date"]:
            type_cb.addItem(t)
        idx = type_cb.findText(sort_type)
        if idx >= 0:
            type_cb.setCurrentIndex(idx)
        type_cb.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
        type_cb.setStyleSheet(
            "QComboBox{ background: transparent; border: none; padding-left:6px; padding-top:-8px; min-height:26px; font-size:11px; }"
            "QComboBox::drop-down{ border: none; }"
        )
        # avoid fixed height
        self.level_table.setCellWidget(r, 1, type_cb)

        # Order combobox
        order_cb = QComboBox(self.level_table)
        order_cb.addItems(["ASC", "DESC"])
        order_cb.setCurrentIndex(0 if order == "ASC" else 1)
        order_cb.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
        order_cb.setStyleSheet(
            "QComboBox{ background: transparent; border: none; padding-left:6px; padding-top:-8px; min-height:26px; font-size:11px; }"
            "QComboBox::drop-down{ border: none; }"
        )
        # avoid fixed height to allow proper fitting
        self.level_table.setCellWidget(r, 2, order_cb)
        # Подгоняем колонки под содержимое, чтобы виджеты помещались
        self.level_table.resizeColumnsToContents()

    def remove_level(self):
        r = self.level_table.currentRow()
        if r >= 0:
            self.level_table.removeRow(r)

    def get_sort_config(self):
        """Возвращает конфигурацию сортировки: список уровней в порядке приоритетности"""
        levels = []
        for r in range(self.level_table.rowCount()):
            col_widget = self.level_table.cellWidget(r, 0)
            type_widget = self.level_table.cellWidget(r, 1)
            order_widget = self.level_table.cellWidget(r, 2)
            if col_widget and type_widget and order_widget:
                levels.append({
                    'column': col_widget.currentIndex(),
                    'type': type_widget.currentText(),
                    'order': order_widget.currentText()
                })
        return {
            'has_header': bool(self.has_header_cb.isChecked()),
            'levels': levels
        }
