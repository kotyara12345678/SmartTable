"""
Панель ввода формул
"""

from PyQt6.QtWidgets import QWidget, QHBoxLayout, QLineEdit, QComboBox, QLabel
from PyQt6.QtCore import pyqtSignal, Qt
from PyQt6.QtGui import QKeySequence, QShortcut


class FormulaBar(QWidget):
    """Панель ввода формул"""

    # Сигналы
    formula_entered = pyqtSignal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.init_ui()
        self.setup_shortcuts()

    def init_ui(self):
        """Инициализация UI"""
        layout = QHBoxLayout(self)
        layout.setContentsMargins(5, 2, 5, 2)

        # Метка и поле адреса ячейки
        layout.addWidget(QLabel("Ячейка:"))
        self.cell_label = QLineEdit()
        self.cell_label.setReadOnly(True)
        self.cell_label.setFixedWidth(70)
        layout.addWidget(self.cell_label)

        # Метка формулы
        layout.addWidget(QLabel("fx:"))

        # Выбор функций
        self.function_combo = QComboBox()
        self.function_combo.addItems([
            "Функции...",
            "SUM", "AVERAGE", "COUNT", "MAX", "MIN",
            "IF", "VLOOKUP", "CONCATENATE", "DATE", "NOW"
        ])
        self.function_combo.currentTextChanged.connect(self.on_function_selected)
        self.function_combo.setFixedWidth(120)
        layout.addWidget(self.function_combo)

        # Поле ввода формулы
        self.formula_edit = QLineEdit()
        self.formula_edit.setPlaceholderText("Введите формулу (начинается с =) или значение...")
        self.formula_edit.returnPressed.connect(self.on_formula_entered)
        layout.addWidget(self.formula_edit)

    def setup_shortcuts(self):
        """Настройка горячих клавиш"""
        # F2 для редактирования ячейки
        shortcut = QShortcut(QKeySequence("F2"), self)
        shortcut.activated.connect(self.focus_formula_edit)

    def set_cell_reference(self, cell_ref: str):
        """Установка ссылки на ячейку"""
        self.cell_label.setText(cell_ref)

    def set_formula(self, formula: str):
        """Установка формулы"""
        self.formula_edit.setText(formula)

    def on_formula_entered(self):
        """Обработка ввода формулы"""
        formula = self.formula_edit.text().strip()
        if formula:
            self.formula_entered.emit(formula)

    def on_function_selected(self, function: str):
        """Обработка выбора функции"""
        if function != "Функции...":
            self.formula_edit.setText(f"={function}()")
            self.formula_edit.setFocus()
            # Установка курсора между скобками
            cursor_pos = len(f"={function}(")
            self.formula_edit.setCursorPosition(cursor_pos)

    def insert_function(self, function: str):
        """Вставка функции"""
        current_text = self.formula_edit.text()
        if current_text.startswith('='):
            self.formula_edit.setText(f"{current_text}{function}()")
        else:
            self.formula_edit.setText(f"={function}()")
        self.formula_edit.setFocus()

    def focus_formula_edit(self):
        """Фокус на поле ввода формулы"""
        self.formula_edit.setFocus()
        self.formula_edit.selectAll()