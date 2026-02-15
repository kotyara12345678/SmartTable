"""
Панель ввода формул
"""

from PyQt5.QtWidgets import QWidget, QHBoxLayout, QLineEdit, QComboBox, QLabel
from PyQt5.QtCore import pyqtSignal, Qt
from PyQt5.QtGui import QKeySequence, QColor


class FormulaBar(QWidget):
    """Панель ввода формул"""

    # Сигналы
    formula_entered = pyqtSignal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self._formula_autocomplete = None
        self._autocomplete_initialized = False
        self.init_ui()
        self.setup_shortcuts()

    def init_ui(self):
        """Инициализация UI"""
        layout = QHBoxLayout(self)
        layout.setContentsMargins(10, 5, 10, 5)

        # Метка и поле адреса ячейки
        layout.addWidget(QLabel("Ячейка:"))
        self.cell_label = QLineEdit()
        self.cell_label.setReadOnly(True)
        self.cell_label.setFixedWidth(80)
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
        self.formula_edit.setPlaceholderText("Введите формулу или значение...")
        self.formula_edit.returnPressed.connect(self.on_formula_entered)
        layout.addWidget(self.formula_edit)

    def setup_shortcuts(self):
        """Настройка горячих клавиш"""
        pass

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
    
    def _ensure_autocomplete(self):
        """Ленивая инициализация автокомплита (вызывается после добавления в окно)"""
        if self._autocomplete_initialized:
            return
        self._autocomplete_initialized = True
        try:
            from pysheets.src.ui.formula.formula_autocomplete import FormulaAutocomplete
            main_win = self.window()
            parent = main_win if main_win and main_win is not self else self
            self._formula_autocomplete = FormulaAutocomplete(self.formula_edit, parent)
        except Exception as e:
            print(f"[FormulaBar] Failed to init autocomplete: {e}")
    
    def showEvent(self, event):
        """При первом показе инициализируем автокомплит"""
        super().showEvent(event)
        if not self._autocomplete_initialized:
            from PyQt5.QtCore import QTimer
            QTimer.singleShot(200, self._ensure_autocomplete)
    
    def update_autocomplete_theme(self, is_dark: bool, accent_color: QColor):
        """Обновляет тему автокомплита"""
        if self._formula_autocomplete:
            self._formula_autocomplete.set_theme(is_dark, accent_color)
