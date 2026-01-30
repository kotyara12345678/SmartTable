"""
Панели инструментов приложения
"""

from PyQt6.QtWidgets import QToolBar, QWidget, QHBoxLayout, QPushButton, QLabel, QComboBox, QSpinBox
from PyQt6.QtCore import pyqtSignal, Qt, QSize
from PyQt6.QtGui import QIcon, QAction


class MainToolBar(QToolBar):
    """Главная панель инструментов"""

    # Сигналы
    new_file_triggered = pyqtSignal()
    open_file_triggered = pyqtSignal()
    save_file_triggered = pyqtSignal()
    export_excel_triggered = pyqtSignal()
    print_triggered = pyqtSignal()

    def __init__(self, parent=None):
        super().__init__("Главная панель", parent)
        self.setMovable(False)
        self.setIconSize(QSize(24, 24))
        self.init_ui()

    def init_ui(self):
        """Инициализация UI"""
        # Кнопка "Новый"
        new_action = QAction("Новый", self)
        new_action.triggered.connect(self.new_file_triggered)
        new_action.setShortcut("Ctrl+N")
        self.addAction(new_action)

        # Кнопка "Открыть"
        open_action = QAction("Открыть", self)
        open_action.triggered.connect(self.open_file_triggered)
        open_action.setShortcut("Ctrl+O")
        self.addAction(open_action)

        # Кнопка "Сохранить"
        save_action = QAction("Сохранить", self)
        save_action.triggered.connect(self.save_file_triggered)
        save_action.setShortcut("Ctrl+S")
        self.addAction(save_action)

        self.addSeparator()

        # Кнопка "Экспорт в Excel"
        export_action = QAction("Экспорт Excel", self)
        export_action.triggered.connect(self.export_excel_triggered)
        export_action.setShortcut("Ctrl+E")
        self.addAction(export_action)

        # Кнопка "Печать"
        print_action = QAction("Печать", self)
        print_action.triggered.connect(self.print_triggered)
        print_action.setShortcut("Ctrl+P")
        self.addAction(print_action)

        self.addSeparator()

        # Комбо-бокс масштаба
        self.addWidget(QLabel("Масштаб:"))
        self.zoom_combo = QComboBox()
        self.zoom_combo.addItems(["50%", "75%", "100%", "125%", "150%", "200%"])
        self.zoom_combo.setCurrentText("100%")
        self.zoom_combo.setFixedWidth(80)
        self.addWidget(self.zoom_combo)


class FormatToolBar(QToolBar):
    """Панель форматирования"""

    # Сигналы
    format_changed = pyqtSignal(str, object)  # format_type, value

    def __init__(self, parent=None):
        super().__init__("Форматирование", parent)
        self.setMovable(False)
        self.setIconSize(QSize(20, 20))
        self.init_ui()

    def init_ui(self):
        """Инициализация UI"""
        # Выбор шрифта
        self.font_combo = QComboBox()
        self.font_combo.addItems(["Arial", "Calibri", "Times New Roman", "Verdana", "Segoe UI"])
        self.font_combo.setCurrentText("Arial")
        self.font_combo.currentTextChanged.connect(
            lambda: self.format_changed.emit('font', self.font_combo.currentText())
        )
        self.font_combo.setFixedWidth(120)
        self.addWidget(QLabel("Шрифт:"))
        self.addWidget(self.font_combo)

        # Размер шрифта
        self.font_size_combo = QComboBox()
        self.font_size_combo.addItems(["8", "9", "10", "11", "12", "14", "16", "18", "20", "24"])
        self.font_size_combo.setCurrentText("11")
        self.font_size_combo.currentTextChanged.connect(
            lambda: self.format_changed.emit('font_size', int(self.font_size_combo.currentText()))
        )
        self.font_size_combo.setFixedWidth(60)
        self.addWidget(QLabel("Размер:"))
        self.addWidget(self.font_size_combo)

        self.addSeparator()

        # Кнопки форматирования текста
        self.bold_btn = QPushButton("B")
        self.bold_btn.setCheckable(True)
        self.bold_btn.setToolTip("Жирный (Ctrl+B)")
        self.bold_btn.clicked.connect(
            lambda: self.format_changed.emit('bold', self.bold_btn.isChecked())
        )
        self.addWidget(self.bold_btn)

        self.italic_btn = QPushButton("I")
        self.italic_btn.setCheckable(True)
        self.italic_btn.setToolTip("Курсив (Ctrl+I)")
        self.italic_btn.clicked.connect(
            lambda: self.format_changed.emit('italic', self.italic_btn.isChecked())
        )
        self.addWidget(self.italic_btn)

        self.addSeparator()

        # Выравнивание
        self.align_left_btn = QPushButton("◀")
        self.align_left_btn.setCheckable(True)
        self.align_left_btn.setToolTip("По левому краю")
        self.align_left_btn.clicked.connect(
            lambda: self.format_changed.emit('alignment', 'left')
        )
        self.addWidget(self.align_left_btn)

        self.align_center_btn = QPushButton("🔘")
        self.align_center_btn.setCheckable(True)
        self.align_center_btn.setToolTip("По центру")
        self.align_center_btn.clicked.connect(
            lambda: self.format_changed.emit('alignment', 'center')
        )
        self.addWidget(self.align_center_btn)

        self.align_right_btn = QPushButton("▶")
        self.align_right_btn.setCheckable(True)
        self.align_right_btn.setToolTip("По правому краю")
        self.align_right_btn.clicked.connect(
            lambda: self.format_changed.emit('alignment', 'right')
        )
        self.addWidget(self.align_right_btn)