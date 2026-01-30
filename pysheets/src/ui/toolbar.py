"""
Панели инструментов приложения
"""

from PyQt5.QtWidgets import (QToolBar, QWidget, QHBoxLayout, QPushButton,
                            QLabel, QComboBox, QSpinBox, QButtonGroup, QAction)
from PyQt5.QtCore import pyqtSignal, Qt, QSize
from PyQt5.QtGui import QIcon, QFont


class ModernToolBar(QToolBar):
    def __init__(self, parent=None):
        super().__init__(parent)


class MainToolBar(QToolBar):
    """Главная панель инструментов"""

    # Сигналы
    new_file_triggered = pyqtSignal()
    open_file_triggered = pyqtSignal()
    save_file_triggered = pyqtSignal()
    export_excel_triggered = pyqtSignal()
    print_triggered = pyqtSignal()
    zoom_changed = pyqtSignal(str)  # Добавлен сигнал для масштаба
    ai_chat_triggered = pyqtSignal()  # Новый сигнал для AI Chat

    def __init__(self, parent=None):
        super().__init__("Главная панель", parent)
        self.setMovable(False)
        self.setIconSize(QSize(20, 20))
        self.init_ui()

    def init_ui(self):
        """Инициализация UI"""
        actions = [
            ("📄", "Новый", self.new_file_triggered, "Ctrl+N"),
            ("➕", "Новая вкладка", None, "Ctrl+T"),
            ("📂", "Открыть", self.open_file_triggered, "Ctrl+O"),
            ("💾", "Сохранить", self.save_file_triggered, "Ctrl+S"),
            ("📊", "Экспорт в Excel", self.export_excel_triggered, "Ctrl+E"),
            ("🖨️", "Печать", self.print_triggered, "Ctrl+P"),
        ]

        for icon, text, signal, shortcut in actions:
            btn = QPushButton(icon + " " + text)
            if signal:
                btn.clicked.connect(signal.emit)
            if shortcut:
                btn.setShortcut(shortcut)
            btn.setProperty("accent", "true")
            self.addWidget(btn)

        self.addSeparator()

        # Кнопка AI Chat
        ai_chat_btn = QPushButton("🤖 Помощь ИИ")
        ai_chat_btn.setProperty("accent", "true")
        ai_chat_btn.clicked.connect(self.ai_chat_triggered.emit)
        self.addWidget(ai_chat_btn)

        self.addSeparator()

        # Кнопки масштаба
        zoom_out_btn = QPushButton("🔍-")
        zoom_out_btn.setToolTip("Уменьшить масштаб (Ctrl+-)")
        zoom_out_btn.setFixedSize(30, 24)
        zoom_out_btn.clicked.connect(self.on_zoom_out)
        self.addWidget(zoom_out_btn)

        self.zoom_combo = QComboBox()
        self.zoom_combo.addItems(["50%", "75%", "100%", "125%", "150%", "200%"])
        self.zoom_combo.setCurrentText("100%")
        self.zoom_combo.setFixedWidth(80)
        self.zoom_combo.currentTextChanged.connect(self.on_zoom_changed)
        self.addWidget(self.zoom_combo)

        zoom_in_btn = QPushButton("🔍+")
        zoom_in_btn.setToolTip("Увеличить масштаб (Ctrl++)")
        zoom_in_btn.setFixedSize(30, 24)
        zoom_in_btn.clicked.connect(self.on_zoom_in)
        self.addWidget(zoom_in_btn)

        zoom_reset_btn = QPushButton("⟲")
        zoom_reset_btn.setToolTip("Сбросить масштаб (Ctrl+0)")
        zoom_reset_btn.setFixedSize(30, 24)
        zoom_reset_btn.clicked.connect(self.on_zoom_reset)
        self.addWidget(zoom_reset_btn)

    def on_zoom_reset(self):
        """Обработчик для сброса масштаба"""
        self.zoom_combo.setCurrentText("100%")

    def on_zoom_in(self):
        """Увеличить масштаб"""
        current = self.zoom_combo.currentText()
        zoom_values = ["50%", "75%", "100%", "125%", "150%", "200%"]
        try:
            current_idx = zoom_values.index(current)
            if current_idx < len(zoom_values) - 1:
                self.zoom_combo.setCurrentText(zoom_values[current_idx + 1])
        except:
            pass

    def on_zoom_out(self):
        """Уменьшить масштаб"""
        current = self.zoom_combo.currentText()
        zoom_values = ["50%", "75%", "100%", "125%", "150%", "200%"]
        try:
            current_idx = zoom_values.index(current)
            if current_idx > 0:
                self.zoom_combo.setCurrentText(zoom_values[current_idx - 1])
        except:
            pass

    def on_zoom_changed(self, value):
        """Обработка изменения масштаба - эмитирует сигнал"""
        if isinstance(value, str) and value.endswith("%"):
            self.zoom_changed.emit(value)


class FormatToolBar(QToolBar):
    """Панель форматирования"""

    # Сигналы
    format_changed = pyqtSignal(str, object)  # format_type, value

    def __init__(self, parent=None):
        super().__init__("Форматирование", parent)
        self.setMovable(False)
        self.setIconSize(QSize(20, 20))
        self.align_group = None
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
        self.bold_btn.setFont(QFont("Arial", 9, QFont.Weight.Bold))
        self.bold_btn.clicked.connect(
            lambda: self.format_changed.emit('bold', self.bold_btn.isChecked())
        )
        self.bold_btn.setFixedWidth(30)
        self.addWidget(self.bold_btn)

        self.italic_btn = QPushButton("I")
        self.italic_btn.setCheckable(True)
        self.italic_btn.setToolTip("Курсив (Ctrl+I)")
        font = QFont("Arial", 9)
        font.setItalic(True)
        self.italic_btn.setFont(font)
        self.italic_btn.clicked.connect(
            lambda: self.format_changed.emit('italic', self.italic_btn.isChecked())
        )
        self.italic_btn.setFixedWidth(30)
        self.addWidget(self.italic_btn)

        self.addSeparator()

        # Выравнивание - делаем кнопки взаимоисключающими
        self.align_group = QButtonGroup(self)
        self.align_group.setExclusive(True)

        self.align_left_btn = QPushButton("◀")
        self.align_left_btn.setCheckable(True)
        self.align_left_btn.setToolTip("По левому краю")
        self.align_left_btn.clicked.connect(
            lambda: self.format_changed.emit('alignment', 'left')
        )
        self.align_left_btn.setFixedWidth(30)
        self.align_group.addButton(self.align_left_btn)
        self.addWidget(self.align_left_btn)

        self.align_center_btn = QPushButton("🔘")
        self.align_center_btn.setCheckable(True)
        self.align_center_btn.setToolTip("По центру")
        self.align_center_btn.clicked.connect(
            lambda: self.format_changed.emit('alignment', 'center')
        )
        self.align_center_btn.setFixedWidth(30)
        self.align_group.addButton(self.align_center_btn)
        self.addWidget(self.align_center_btn)

        self.align_right_btn = QPushButton("▶")
        self.align_right_btn.setCheckable(True)
        self.align_right_btn.setToolTip("По правому краю")
        self.align_right_btn.clicked.connect(
            lambda: self.format_changed.emit('alignment', 'right')
        )
        self.align_right_btn.setFixedWidth(30)
        self.align_group.addButton(self.align_right_btn)
        self.addWidget(self.align_right_btn)

        # По умолчанию выбираем выравнивание по левому краю
        self.align_left_btn.setChecked(True)

    def update_format_buttons(self, format_data):
        """Обновление состояния кнопок форматирования"""
        if 'bold' in format_data:
            self.bold_btn.setChecked(format_data['bold'])
        if 'italic' in format_data:
            self.italic_btn.setChecked(format_data['italic'])
        if 'font' in format_data:
            self.font_combo.setCurrentText(format_data['font'])
        if 'font_size' in format_data:
            self.font_size_combo.setCurrentText(str(format_data['font_size']))
        if 'alignment' in format_data:
            alignment = format_data['alignment']
            if alignment == 'left':
                self.align_left_btn.setChecked(True)
            elif alignment == 'center':
                self.align_center_btn.setChecked(True)
            elif alignment == 'right':
                self.align_right_btn.setChecked(True)