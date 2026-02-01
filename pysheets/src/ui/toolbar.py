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


class FunctionsToolBar(QToolBar):
    """Панель с вкладками функций как в Excel"""

    function_selected = pyqtSignal(str)
    format_selected = pyqtSignal(str)

    def __init__(self, parent=None):
        super().__init__("Функции", parent)
        self.setMovable(False)
        self.current_panel = None
        self.panels = {}
        self.init_ui()

    def init_ui(self):
        """Инициализация UI"""
        from PyQt5.QtWidgets import QStackedWidget, QScrollArea, QFrame, QVBoxLayout, QSizePolicy
        
        # Контейнер для вкладок
        tabs_widget = QWidget()
        tabs_layout = QHBoxLayout(tabs_widget)
        tabs_layout.setContentsMargins(4, 2, 4, 2)
        tabs_layout.setSpacing(2)

        # Кнопки-вкладки
        self.tab_buttons = []
        tabs = [
            ("➕ Математика", "math"),
            ("📝 Текст", "text"),
            ("📅 Дата", "date"),
            ("🔀 Логика", "logic"),
            ("🔄 Конверт.", "convert"),
            ("📊 Формат", "format"),
        ]

        for tab_name, tab_id in tabs:
            btn = QPushButton(tab_name)
            btn.setCheckable(True)
            btn.setProperty("tab_id", tab_id)
            btn.clicked.connect(lambda checked, tid=tab_id: self.on_tab_clicked(tid))
            btn.setMinimumWidth(80)
            tabs_layout.addWidget(btn)
            self.tab_buttons.append(btn)

        tabs_layout.addStretch()
        self.addWidget(tabs_widget)

        # Стек панелей с функциями
        self.panels_stack = QStackedWidget()
        self.panels_stack.setMaximumHeight(36)
        
        # Создаём панели для каждой категории
        self._create_math_panel()
        self._create_text_panel()
        self._create_date_panel()
        self._create_logic_panel()
        self._create_convert_panel()
        self._create_format_panel()

        self.addWidget(self.panels_stack)

        # Выбираем первую вкладку по умолчанию
        self.tab_buttons[0].setChecked(True)
        self.panels_stack.setCurrentIndex(0)

    def _create_function_row(self, functions: list) -> QWidget:
        """Создаёт горизонтальный ряд кнопок функций"""
        widget = QWidget()
        layout = QHBoxLayout(widget)
        layout.setContentsMargins(4, 2, 4, 2)
        layout.setSpacing(4)

        for func_data in functions:
            func_code = func_data[0]
            func_name = func_data[1]
            tooltip = func_data[2] if len(func_data) > 2 else func_code
            
            btn = QPushButton(func_name)
            btn.setToolTip(f"<b>{func_code}</b><br>{tooltip}")
            btn.clicked.connect(lambda checked, f=func_code: self.function_selected.emit(f))
            btn.setMinimumWidth(60)
            layout.addWidget(btn)

        layout.addStretch()
        return widget

    def _create_math_panel(self):
        functions = [
            ("SUM", "Сумма", "SUM(A1:A10)"),
            ("AVERAGE", "Среднее", "AVERAGE(A1:A10)"),
            ("COUNT", "Кол-во", "COUNT(A1:A10)"),
            ("MAX", "Макс", "MAX(A1:A10)"),
            ("MIN", "Мин", "MIN(A1:A10)"),
            ("ROUND", "Округл", "ROUND(число, знаки)"),
            ("ABS", "Модуль", "ABS(-5) = 5"),
            ("SQRT", "Корень", "SQRT(16) = 4"),
            ("POWER", "Степень", "POWER(2, 3)"),
        ]
        panel = self._create_function_row(functions)
        self.panels_stack.addWidget(panel)
        self.panels["math"] = 0

    def _create_text_panel(self):
        functions = [
            ("LEN", "Длина", "LEN(текст)"),
            ("UPPER", "ВЕРХН", "В верхний регистр"),
            ("LOWER", "нижн", "В нижний регистр"),
            ("PROPER", "Загл", "Каждое Слово"),
            ("TRIM", "Пробелы", "Удалить лишние"),
            ("LEFT", "Слева", "LEFT(текст, N)"),
            ("RIGHT", "Справа", "RIGHT(текст, N)"),
            ("MID", "Середина", "MID(текст, старт, длина)"),
            ("CONCATENATE", "Склеить", "Объединить текст"),
            ("SUBSTITUTE", "Замена", "Заменить текст"),
            ("FIND", "Найти", "Поиск в тексте"),
        ]
        panel = self._create_function_row(functions)
        self.panels_stack.addWidget(panel)
        self.panels["text"] = 1

    def _create_date_panel(self):
        functions = [
            ("NOW", "Сейчас", "Дата и время"),
            ("TODAY", "Сегодня", "Текущая дата"),
            ("DATE", "Дата", "DATE(год, месяц, день)"),
        ]
        panel = self._create_function_row(functions)
        self.panels_stack.addWidget(panel)
        self.panels["date"] = 2

    def _create_logic_panel(self):
        functions = [
            ("IF", "Если", "IF(условие, да, нет)"),
            ("EXACT", "Равно", "Сравнение строк"),
        ]
        panel = self._create_function_row(functions)
        self.panels_stack.addWidget(panel)
        self.panels["logic"] = 3

    def _create_convert_panel(self):
        functions = [
            ("TEXT", "→Текст", "TEXT(число, формат)"),
            ("VALUE", "→Число", "VALUE(текст)"),
            ("FIXED", "Формат", "FIXED(число, знаки)"),
            ("CHAR", "Символ", "CHAR(код)"),
            ("CODE", "Код", "CODE(символ)"),
        ]
        panel = self._create_function_row(functions)
        self.panels_stack.addWidget(panel)
        self.panels["convert"] = 4

    def _create_format_panel(self):
        formats = [
            ("general", "Общий", "Автоформат"),
            ("number", "Числовой", "1 234,56"),
            ("currency", "₽ Рубли", "Денежный"),
            ("currency_usd", "$ Доллары", "USD"),
            ("percent", "% Процент", "Процентный"),
            ("date", "Дата", "ДД.ММ.ГГГГ"),
            ("time", "Время", "ЧЧ:ММ"),
        ]
        
        widget = QWidget()
        layout = QHBoxLayout(widget)
        layout.setContentsMargins(4, 2, 4, 2)
        layout.setSpacing(4)

        for fmt_code, fmt_name, tooltip in formats:
            btn = QPushButton(fmt_name)
            btn.setToolTip(tooltip)
            btn.clicked.connect(lambda checked, f=fmt_code: self.format_selected.emit(f))
            btn.setMinimumWidth(60)
            layout.addWidget(btn)

        layout.addStretch()
        self.panels_stack.addWidget(widget)
        self.panels["format"] = 5

    def on_tab_clicked(self, tab_id: str):
        """Обработка клика по вкладке"""
        # Снимаем выделение со всех кнопок
        for btn in self.tab_buttons:
            btn.setChecked(btn.property("tab_id") == tab_id)
        
        # Показываем нужную панель
        if tab_id in self.panels:
            self.panels_stack.setCurrentIndex(self.panels[tab_id])