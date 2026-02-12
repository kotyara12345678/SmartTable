"""
Панели инструментов приложения
"""

from PyQt5.QtWidgets import (QToolBar, QWidget, QHBoxLayout, QPushButton,
                            QLabel, QComboBox, QSpinBox, QButtonGroup, QAction, QFrame)
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
            ("📂", "Открыть", self.open_file_triggered, "Ctrl+O"),
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

        self.underline_btn = QPushButton("U")
        self.underline_btn.setCheckable(True)
        self.underline_btn.setToolTip("Подчеркнутый (Ctrl+U)")
        fontu = QFont("Arial", 9)
        fontu.setUnderline(True)
        self.underline_btn.setFont(fontu)
        self.underline_btn.clicked.connect(
            lambda: self.format_changed.emit('underline', self.underline_btn.isChecked())
        )
        self.underline_btn.setFixedWidth(30)
        self.addWidget(self.underline_btn)

        self.strike_btn = QPushButton("S")
        self.strike_btn.setCheckable(True)
        self.strike_btn.setToolTip("Перечеркнутый")
        fontstrike = QFont("Arial", 9)
        fontstrike.setStrikeOut(True)
        self.strike_btn.setFont(fontstrike)
        self.strike_btn.clicked.connect(
            lambda: self.format_changed.emit('strike', self.strike_btn.isChecked())
        )
        self.strike_btn.setFixedWidth(30)
        self.addWidget(self.strike_btn)

        self.addSeparator()

        # Цвет текста
        self.text_color_btn = QPushButton("A")
        self.text_color_btn.setToolTip("Цвет текста")
        self.text_color_btn.setStyleSheet("color: #DC143C; font-weight: bold;")
        self.text_color_btn.clicked.connect(lambda: self.format_changed.emit('text_color', None))
        self.text_color_btn.setFixedWidth(30)
        self.addWidget(self.text_color_btn)

        # Цвет фона
        self.bg_color_btn = QPushButton("🖌")
        self.bg_color_btn.setToolTip("Цвет фона ячейки")
        self.bg_color_btn.clicked.connect(lambda: self.format_changed.emit('bg_color', None))
        self.bg_color_btn.setFixedWidth(30)
        self.addWidget(self.bg_color_btn)

        self.addSeparator()

        # Сброс стилей
        self.clear_format_btn = QPushButton("✖")
        self.clear_format_btn.setToolTip("Сбросить форматирование")
        self.clear_format_btn.clicked.connect(lambda: self.format_changed.emit('clear_format', True))
        self.clear_format_btn.setFixedWidth(30)
        self.addWidget(self.clear_format_btn)

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
    # Новый сигнал, чтобы лента могла управлять форматированием как старая FormatToolBar
    format_changed = pyqtSignal(str, object)  # format_type, value
    # Сигналы для вкладок ленты
    new_file_requested = pyqtSignal()
    open_file_requested = pyqtSignal()
    save_file_requested = pyqtSignal()
    print_requested = pyqtSignal()
    chart_requested = pyqtSignal()
    sort_requested = pyqtSignal()
    templates_requested = pyqtSignal()
    zoom_in_requested = pyqtSignal()
    zoom_out_requested = pyqtSignal()

    def __init__(self, parent=None):
        super().__init__("Функции", parent)
        self.setMovable(False)
        self.current_panel = None
        self.panels = {}
        self.init_ui()

    def init_ui(self):
        """Инициализация UI"""
        from PyQt5.QtWidgets import QStackedWidget, QScrollArea, QFrame, QVBoxLayout, QSizePolicy, QWidget, QHBoxLayout, QPushButton
        
        # Корневой контейнер ленты: вкладки сверху, содержимое снизу
        ribbon_root = QWidget()
        ribbon_layout = QVBoxLayout(ribbon_root)
        # Убираем левый/правый отступы, чтобы вкладки и содержимое начинались с одного края
        ribbon_layout.setContentsMargins(0, 2, 0, 2)
        ribbon_layout.setSpacing(0)

        # Контейнер для кнопок-вкладок ленты
        tabs_widget = QWidget()
        tabs_layout = QHBoxLayout(tabs_widget)
        # Отступы только сверху/снизу, без левого/правого
        tabs_layout.setContentsMargins(4, 4, 4, 4)
        tabs_layout.setSpacing(2)

        # Кнопки-вкладки верхнего уровня (как в Excel)
        self.tab_buttons = []
        tabs = [
            ("Главная", "home"),
            ("Вставка", "insert"),
            ("Формулы", "formulas"),
            ("Данные", "data"),
            ("Рецензирование", "review"),
            ("Вид", "view"),
            ("Разметка страницы", "page_layout"),
            ("Справка", "help"),
        ]

        for tab_name, tab_id in tabs:
            btn = QPushButton(tab_name)
            btn.setCheckable(True)
            btn.setProperty("tab_id", tab_id)
            btn.clicked.connect(lambda checked, tid=tab_id: self.on_tab_clicked(tid))
            btn.setMinimumWidth(80)
            tabs_layout.addWidget(btn)
            self.tab_buttons.append(btn)

        # Убираем addStretch(), чтобы вкладки начинались слева
        ribbon_layout.addWidget(tabs_widget)

        # Горизонтальная разделительная линия между вкладками и содержимым
        separator = QFrame()
        separator.setFrameShape(QFrame.HLine)
        separator.setFrameShadow(QFrame.Sunken)
        separator.setLineWidth(1)
        separator.setFixedHeight(1)
        # Стиль для разделителя, чтобы он был заметен
        separator.setStyleSheet("QFrame { background-color: #dadce0; }")
        # Отступы вокруг разделителя
        separator_layout = QHBoxLayout()
        separator_layout.setContentsMargins(4, 4, 4, 4)
        separator_layout.addWidget(separator)
        separator_container = QWidget()
        separator_container.setLayout(separator_layout)
        ribbon_layout.addWidget(separator_container)

        # Стек панелей с функциями (вторая строка ленты)
        self.panels_stack = QStackedWidget()
        # Лента может быть повыше, чтобы влезли комбобоксы и группы
        self.panels_stack.setMaximumHeight(70)
        
        # Создаём панели для каждой вкладки
        self._create_home_panel()
        self._create_insert_panel()
        self._create_formulas_panel()
        self._create_data_panel()
        self._create_review_panel()
        self._create_view_panel()
        self._create_page_layout_panel()
        self._create_help_panel()

        ribbon_layout.addWidget(self.panels_stack)

        # Добавляем корневой виджет ленты в QToolBar
        self.addWidget(ribbon_root)

        # Выбираем первую вкладку по умолчанию
        self.tab_buttons[0].setChecked(True)
        self.panels_stack.setCurrentIndex(0)

    # --- Панели ленты верхнего уровня ---

    def _create_home_panel(self):
        """Главная: текст, выравнивание, простой формат чисел"""
        from PyQt5.QtWidgets import QLabel, QComboBox, QPushButton, QButtonGroup
        panel = QWidget()
        layout = QHBoxLayout(panel)
        layout.setContentsMargins(4, 2, 4, 2)
        layout.setSpacing(6)

        # Файл: Новый / Открыть / Сохранить
        new_btn = QPushButton("Новый")
        new_btn.setToolTip("Новый файл (Ctrl+N)")
        new_btn.clicked.connect(self.new_file_requested.emit)

        open_btn = QPushButton("Открыть")
        open_btn.setToolTip("Открыть файл (Ctrl+O)")
        open_btn.clicked.connect(self.open_file_requested.emit)

        save_btn = QPushButton("Сохранить")
        save_btn.setToolTip("Сохранить (Ctrl+S)")
        save_btn.clicked.connect(self.save_file_requested.emit)

        layout.addWidget(new_btn)
        layout.addWidget(open_btn)
        layout.addWidget(save_btn)

        layout.addSpacing(10)

        # Шрифт
        font_label = QLabel("Шрифт:")
        font_combo = QComboBox()
        font_combo.addItems(["Arial", "Calibri", "Times New Roman", "Verdana", "Segoe UI"])
        font_combo.setCurrentText("Arial")
        font_combo.setFixedWidth(130)
        font_combo.currentTextChanged.connect(
            lambda: self.format_changed.emit('font', font_combo.currentText())
        )

        # Размер шрифта
        size_label = QLabel("Размер:")
        size_combo = QComboBox()
        size_combo.addItems(["8", "9", "10", "11", "12", "14", "16", "18", "20", "24"])
        size_combo.setCurrentText("11")
        size_combo.setFixedWidth(60)
        size_combo.currentTextChanged.connect(
            lambda: self.format_changed.emit('font_size', int(size_combo.currentText()))
        )

        layout.addWidget(font_label)
        layout.addWidget(font_combo)
        layout.addWidget(size_label)
        layout.addWidget(size_combo)

        # Кнопки форматирования текста
        bold_btn = QPushButton("B")
        bold_btn.setCheckable(True)
        bold_btn.setToolTip("Жирный (Ctrl+B)")
        bold_btn.setFont(QFont("Arial", 9, QFont.Weight.Bold))
        bold_btn.setFixedWidth(28)
        bold_btn.clicked.connect(lambda: self.format_changed.emit('bold', bold_btn.isChecked()))

        italic_btn = QPushButton("I")
        italic_btn.setCheckable(True)
        italic_btn.setToolTip("Курсив (Ctrl+I)")
        f_i = QFont("Arial", 9)
        f_i.setItalic(True)
        italic_btn.setFont(f_i)
        italic_btn.setFixedWidth(28)
        italic_btn.clicked.connect(lambda: self.format_changed.emit('italic', italic_btn.isChecked()))

        underline_btn = QPushButton("U")
        underline_btn.setCheckable(True)
        underline_btn.setToolTip("Подчеркнутый (Ctrl+U)")
        f_u = QFont("Arial", 9)
        f_u.setUnderline(True)
        underline_btn.setFont(f_u)
        underline_btn.setFixedWidth(28)
        underline_btn.clicked.connect(lambda: self.format_changed.emit('underline', underline_btn.isChecked()))

        strike_btn = QPushButton("S")
        strike_btn.setCheckable(True)
        strike_btn.setToolTip("Перечеркнутый")
        f_s = QFont("Arial", 9)
        f_s.setStrikeOut(True)
        strike_btn.setFont(f_s)
        strike_btn.setFixedWidth(28)
        strike_btn.clicked.connect(lambda: self.format_changed.emit('strike', strike_btn.isChecked()))

        layout.addSpacing(6)
        layout.addWidget(bold_btn)
        layout.addWidget(italic_btn)
        layout.addWidget(underline_btn)
        layout.addWidget(strike_btn)

        # Цвет текста / фона
        text_color_btn = QPushButton("A")
        text_color_btn.setToolTip("Цвет текста")
        text_color_btn.setStyleSheet("color: #DC143C; font-weight: bold;")
        text_color_btn.setFixedWidth(30)
        text_color_btn.clicked.connect(lambda: self.format_changed.emit('text_color', None))

        bg_color_btn = QPushButton("🖌")
        bg_color_btn.setToolTip("Цвет фона ячейки")
        bg_color_btn.setFixedWidth(30)
        bg_color_btn.clicked.connect(lambda: self.format_changed.emit('bg_color', None))

        layout.addSpacing(6)
        layout.addWidget(text_color_btn)
        layout.addWidget(bg_color_btn)

        # Выравнивание
        align_group = QButtonGroup(panel)
        align_group.setExclusive(True)

        align_left_btn = QPushButton("◀")
        align_left_btn.setCheckable(True)
        align_left_btn.setToolTip("Выравнивание по левому краю")
        align_left_btn.setFixedWidth(30)
        align_left_btn.clicked.connect(lambda: self.format_changed.emit('alignment', 'left'))
        align_group.addButton(align_left_btn)

        align_center_btn = QPushButton("🔘")
        align_center_btn.setCheckable(True)
        align_center_btn.setToolTip("Выравнивание по центру")
        align_center_btn.setFixedWidth(30)
        align_center_btn.clicked.connect(lambda: self.format_changed.emit('alignment', 'center'))
        align_group.addButton(align_center_btn)

        align_right_btn = QPushButton("▶")
        align_right_btn.setCheckable(True)
        align_right_btn.setToolTip("Выравнивание по правому краю")
        align_right_btn.setFixedWidth(30)
        align_right_btn.clicked.connect(lambda: self.format_changed.emit('alignment', 'right'))
        align_group.addButton(align_right_btn)

        align_left_btn.setChecked(True)

        layout.addSpacing(6)
        layout.addWidget(align_left_btn)
        layout.addWidget(align_center_btn)
        layout.addWidget(align_right_btn)

        # Простые форматы чисел
        general_btn = QPushButton("Общий")
        general_btn.setToolTip("Автоформат")
        general_btn.clicked.connect(lambda: self.format_selected.emit("general"))

        number_btn = QPushButton("Число")
        number_btn.setToolTip("Числовой формат")
        number_btn.clicked.connect(lambda: self.format_selected.emit("number"))

        currency_btn = QPushButton("₽")
        currency_btn.setToolTip("Денежный формат (рубли)")
        currency_btn.clicked.connect(lambda: self.format_selected.emit("currency"))

        layout.addSpacing(10)
        layout.addWidget(general_btn)
        layout.addWidget(number_btn)
        layout.addWidget(currency_btn)

        # Печать (как в группе "Главная" у Excel)
        layout.addSpacing(10)
        print_btn = QPushButton("Печать")
        print_btn.setToolTip("Печать таблицы (Ctrl+P)")
        print_btn.clicked.connect(self.print_requested.emit)
        layout.addWidget(print_btn)

        layout.addStretch()
        self.panels_stack.addWidget(panel)
        self.panels["home"] = 0

    def _create_insert_panel(self):
        """Вставка: диаграммы и другие объекты"""
        from PyQt5.QtWidgets import QPushButton, QWidget, QHBoxLayout
        panel = QWidget()
        layout = QHBoxLayout(panel)
        layout.setContentsMargins(4, 2, 4, 2)
        layout.setSpacing(6)

        chart_btn = QPushButton("Диаграмма")
        chart_btn.setToolTip("Создать диаграмму из выделенных данных")
        chart_btn.clicked.connect(self.chart_requested.emit)

        layout.addWidget(chart_btn)
        layout.addStretch()

        self.panels_stack.addWidget(panel)
        self.panels["insert"] = 1

    def _create_formulas_panel(self):
        """Формулы: группируем математические/текстовые/другие функции"""
        from PyQt5.QtWidgets import QWidget, QHBoxLayout, QLabel

        panel = QWidget()
        layout = QHBoxLayout(panel)
        layout.setContentsMargins(4, 2, 4, 2)
        layout.setSpacing(8)

        # Блок "Математика"
        math_block = self._create_function_row([
            ("SUM", "Сумма", "SUM(A1:A10)"),
            ("AVERAGE", "Среднее", "AVERAGE(A1:A10)"),
            ("COUNT", "Кол-во", "COUNT(A1:A10)"),
            ("MAX", "Макс", "MAX(A1:A10)"),
            ("MIN", "Мин", "MIN(A1:A10)"),
        ])
        layout.addWidget(math_block)

        # Блок "Текст"
        text_block = self._create_function_row([
            ("LEN", "Длина", "LEN(текст)"),
            ("LEFT", "Слева", "LEFT(текст, N)"),
            ("RIGHT", "Справа", "RIGHT(текст, N)"),
            ("MID", "Середина", "MID(текст, старт, длина)"),
            ("CONCATENATE", "Склеить", "Объединить текст"),
        ])
        layout.addWidget(text_block)

        # Блок "Дата/логика"
        date_logic_block = self._create_function_row([
            ("TODAY", "Сегодня", "Текущая дата"),
            ("NOW", "Сейчас", "Дата и время"),
            ("IF", "Если", "IF(условие, да, нет)"),
        ])
        layout.addWidget(date_logic_block)

        layout.addStretch()
        self.panels_stack.addWidget(panel)
        self.panels["formulas"] = 2

    def _create_data_panel(self):
        """Данные: сортировка и шаблоны (сигналы обрабатываются в MainWindow через меню/горячие клавиши)"""
        from PyQt5.QtWidgets import QPushButton, QWidget, QHBoxLayout
        panel = QWidget()
        layout = QHBoxLayout(panel)
        layout.setContentsMargins(4, 2, 4, 2)
        layout.setSpacing(6)

        sort_btn = QPushButton("Сортировка")
        sort_btn.setToolTip("Диалог сортировки текущего листа")
        sort_btn.clicked.connect(self.sort_requested.emit)

        templates_btn = QPushButton("Шаблоны")
        templates_btn.setToolTip("Галерея и управление шаблонами")
        templates_btn.clicked.connect(self.templates_requested.emit)

        layout.addWidget(sort_btn)
        layout.addWidget(templates_btn)
        layout.addStretch()

        self.panels_stack.addWidget(panel)
        self.panels["data"] = 3

    def _create_review_panel(self):
        """Рецензирование: комментарии и проверка"""
        from PyQt5.QtWidgets import QPushButton, QWidget, QHBoxLayout, QLabel
        panel = QWidget()
        layout = QHBoxLayout(panel)
        layout.setContentsMargins(4, 2, 4, 2)
        layout.setSpacing(6)

        # Пока пустая панель, можно добавить функционал позже
        comment_label = QLabel("Рецензирование")
        layout.addWidget(comment_label)
        layout.addStretch()

        self.panels_stack.addWidget(panel)
        self.panels["review"] = 4

    def _create_view_panel(self):
        """Вид: масштаб (остальной функционал уже есть в MainToolBar)"""
        from PyQt5.QtWidgets import QPushButton, QWidget, QHBoxLayout, QLabel
        panel = QWidget()
        layout = QHBoxLayout(panel)
        layout.setContentsMargins(4, 2, 4, 2)
        layout.setSpacing(6)

        label = QLabel("Масштаб:")
        layout.addWidget(label)

        zoom_out_btn = QPushButton("−")
        zoom_out_btn.setToolTip("Уменьшить масштаб (Ctrl+-)")
        zoom_out_btn.setFixedWidth(28)
        zoom_out_btn.clicked.connect(self.zoom_out_requested.emit)

        zoom_in_btn = QPushButton("+")
        zoom_in_btn.setToolTip("Увеличить масштаб (Ctrl++)")
        zoom_in_btn.setFixedWidth(28)
        zoom_in_btn.clicked.connect(self.zoom_in_requested.emit)

        layout.addWidget(zoom_out_btn)
        layout.addWidget(zoom_in_btn)
        layout.addStretch()

        self.panels_stack.addWidget(panel)
        self.panels["view"] = 5

    def _create_page_layout_panel(self):
        """Разметка страницы: настройки печати"""
        from PyQt5.QtWidgets import QPushButton, QWidget, QHBoxLayout, QLabel
        panel = QWidget()
        layout = QHBoxLayout(panel)
        layout.setContentsMargins(4, 2, 4, 2)
        layout.setSpacing(6)

        print_settings_label = QLabel("Разметка страницы")
        layout.addWidget(print_settings_label)
        layout.addStretch()

        self.panels_stack.addWidget(panel)
        self.panels["page_layout"] = 6

    def _create_help_panel(self):
        """Справка: помощь и информация"""
        from PyQt5.QtWidgets import QPushButton, QWidget, QHBoxLayout, QLabel
        panel = QWidget()
        layout = QHBoxLayout(panel)
        layout.setContentsMargins(4, 2, 4, 2)
        layout.setSpacing(6)

        help_label = QLabel("Справка")
        layout.addWidget(help_label)
        layout.addStretch()

        self.panels_stack.addWidget(panel)
        self.panels["help"] = 7

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
            ("ABS", "Абс", "ABS(-5) = 5"),
            ("MOD", "Остаток", "MOD(10, 3) = 1"),
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