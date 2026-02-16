"""
SmartScript Editor — виджет редактора кода для SmartTable
Включает: номера строк, подсветку синтаксиса, автокомплит, панель вывода
"""

from typing import Optional, List
from PyQt5.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QPlainTextEdit,
                              QTextEdit, QLabel, QPushButton, QCompleter,
                              QFrame, QSplitter, QApplication)
from PyQt5.QtCore import Qt, QRect, QSize, QStringListModel, QTimer, pyqtSignal
from PyQt5.QtGui import (QFont, QColor, QPainter, QTextFormat, QSyntaxHighlighter,
                          QTextCharFormat, QTextCursor, QPalette, QKeySequence)
import re

from pysheets.src.core.smartscript.interpreter import SmartScriptInterpreter
from pysheets.src.core.smartscript.errors import SmartScriptError


class LineNumberArea(QWidget):
    """Область с номерами строк (как в VS Code)"""
    
    def __init__(self, editor):
        super().__init__(editor)
        self.editor = editor
    
    def sizeHint(self):
        return QSize(self.editor.line_number_area_width(), 0)
    
    def paintEvent(self, event):
        self.editor.line_number_area_paint_event(event)


class SmartScriptHighlighter(QSyntaxHighlighter):
    """Подсветка синтаксиса SmartScript"""
    
    def __init__(self, parent=None, accent_color=None, is_dark=True):
        super().__init__(parent)
        self.accent_color = accent_color or QColor("#DC143C")
        self.is_dark = is_dark
        self._setup_formats()
    
    def _setup_formats(self):
        """Настройка форматов подсветки"""
        # Ключевые слова — акцентный цвет
        self.keyword_format = QTextCharFormat()
        self.keyword_format.setForeground(self.accent_color)
        self.keyword_format.setFontWeight(QFont.Bold)
        
        # Функции — акцентный цвет (светлее)
        self.function_format = QTextCharFormat()
        func_color = QColor(self.accent_color)
        func_color = func_color.lighter(130) if self.is_dark else func_color.darker(120)
        self.function_format.setForeground(func_color)
        self.function_format.setFontWeight(QFont.Bold)
        
        # Строки — зелёный
        self.string_format = QTextCharFormat()
        self.string_format.setForeground(QColor("#6A9955") if self.is_dark else QColor("#098658"))
        
        # Числа
        self.number_format = QTextCharFormat()
        self.number_format.setForeground(QColor("#B5CEA8") if self.is_dark else QColor("#098658"))
        
        # Комментарии — серый
        self.comment_format = QTextCharFormat()
        self.comment_format.setForeground(QColor("#6A9955") if self.is_dark else QColor("#008000"))
        self.comment_format.setFontItalic(True)
        
        # Операторы
        self.operator_format = QTextCharFormat()
        self.operator_format.setForeground(QColor("#D4D4D4") if self.is_dark else QColor("#333333"))
        
        # Ссылки на ячейки — голубой
        self.cell_ref_format = QTextCharFormat()
        self.cell_ref_format.setForeground(QColor("#4EC9B0") if self.is_dark else QColor("#267f99"))
        
        # Правила
        self.rules = []
        
        # Ключевые слова
        keywords = ['if', 'else', 'elif', 'for', 'in', 'while', 'return',
                     'and', 'or', 'not', 'True', 'False', 'None', 'func', 'print',
                     'import', 'from']
        for kw in keywords:
            pattern = r'\b' + kw + r'\b'
            self.rules.append((re.compile(pattern), self.keyword_format))
        
        # AI функции — специальный цвет
        self.ai_func_format = QTextCharFormat()
        ai_color = QColor("#C586C0")  # фиолетовый для AI
        self.ai_func_format.setForeground(ai_color)
        self.ai_func_format.setFontWeight(QFont.Bold)
        
        # Функции таблицы
        functions = SmartScriptInterpreter.TABLE_FUNCTIONS
        for func in functions:
            if func == 'AI':
                pattern = r'\bAI\b'
                self.rules.append((re.compile(pattern), self.ai_func_format))
            else:
                pattern = r'\b' + func + r'\b'
                self.rules.append((re.compile(pattern, re.IGNORECASE), self.function_format))
        
        # Числа
        self.rules.append((re.compile(r'\b\d+\.?\d*\b'), self.number_format))
        
        # Ссылки на ячейки (A1, B10, AA5)
        self.rules.append((re.compile(r'\b[A-Z]{1,2}\d+\b'), self.cell_ref_format))
    
    def update_accent_color(self, color: QColor, is_dark: bool = None):
        """Обновляет акцентный цвет"""
        self.accent_color = color
        if is_dark is not None:
            self.is_dark = is_dark
        self._setup_formats()
        self.rehighlight()
    
    def highlightBlock(self, text):
        """Подсветка блока текста"""
        # Применяем правила
        for pattern, fmt in self.rules:
            for match in pattern.finditer(text):
                start = match.start()
                length = match.end() - start
                self.setFormat(start, length, fmt)
        
        # Строки (перезаписывают другие правила)
        in_string = None
        i = 0
        start = 0
        while i < len(text):
            ch = text[i]
            if in_string:
                if ch == in_string:
                    self.setFormat(start, i - start + 1, self.string_format)
                    in_string = None
            else:
                if ch in ('"', "'"):
                    in_string = ch
                    start = i
                elif ch == '#':
                    # Комментарий до конца строки
                    self.setFormat(i, len(text) - i, self.comment_format)
                    return
            i += 1


class SmartScriptEditor(QPlainTextEdit):
    """Редактор кода SmartScript с номерами строк и автокомплитом"""
    
    execute_requested = pyqtSignal()  # Сигнал запуска скрипта (Ctrl+Enter)
    
    def __init__(self, accent_color=None, sheet_names_getter=None, parent=None):
        super().__init__(parent)
        
        self.accent_color = accent_color or QColor("#DC143C")
        self._sheet_names_getter = sheet_names_getter  # callable() -> List[str]
        
        # Номера строк
        self.line_number_area = LineNumberArea(self)
        
        # Шрифт моноширинный
        font = QFont("Consolas", 12)
        if not font.exactMatch():
            font = QFont("Courier New", 12)
        self.setFont(font)
        
        # Подсветка синтаксиса
        self.highlighter = SmartScriptHighlighter(self.document(), self.accent_color)
        
        # Автокомплит
        self._setup_completer()
        
        # Подключаем сигналы для номеров строк
        self.blockCountChanged.connect(self.update_line_number_area_width)
        self.updateRequest.connect(self.update_line_number_area)
        self.cursorPositionChanged.connect(self.highlight_current_line)
        
        self.update_line_number_area_width(0)
        self.highlight_current_line()
        
        # Placeholder
        self.setPlaceholderText("# Напишите SmartScript код здесь\n# Ctrl+Enter — запустить\n\ntotal = SUM(\"B2:B10\")\nreturn \"Итого: \" + STR(total)")
        
        # Tab = 4 пробела
        self.setTabStopDistance(self.fontMetrics().horizontalAdvance(' ') * 4)
    
    def _setup_completer(self):
        """Настройка автокомплита"""
        completions = SmartScriptInterpreter.get_completions()
        self._completer = QCompleter(completions, self)
        self._completer.setWidget(self)
        self._completer.setCompletionMode(QCompleter.PopupCompletion)
        self._completer.setCaseSensitivity(Qt.CaseInsensitive)
        self._completer.activated.connect(self._insert_completion)
        
        # Стиль popup
        popup = self._completer.popup()
        popup.setStyleSheet("""
            QListView {
                background-color: #1e1e1e;
                color: #d4d4d4;
                border: 1px solid #454545;
                border-radius: 4px;
                font-family: Consolas, 'Courier New', monospace;
                font-size: 12px;
                padding: 2px;
            }
            QListView::item {
                padding: 4px 8px;
                border-radius: 2px;
            }
            QListView::item:selected {
                background-color: #094771;
                color: #ffffff;
            }
            QListView::item:hover {
                background-color: #2a2d2e;
            }
        """)
    
    def _insert_completion(self, completion: str):
        """Вставляет выбранное автодополнение"""
        tc = self.textCursor()
        prefix = self._completer.completionPrefix()
        
        # Проверяем, находимся ли мы в контексте "import "
        line = tc.block().text()
        col_pos = tc.positionInBlock()
        text_before = line[:col_pos]
        import_match = re.match(r'^\s*import\s+(.*)$', text_before)
        
        if import_match:
            # В контексте import — заменяем текст после "import "
            typed = import_match.group(1)
            # Удаляем набранный текст после import и вставляем выбранное имя
            for _ in range(len(typed)):
                tc.deletePreviousChar()
            tc.insertText(completion)
            self.setTextCursor(tc)
        else:
            # Стандартная вставка автодополнения
            extra = len(completion) - len(prefix)
            tc.movePosition(QTextCursor.Left)
            tc.movePosition(QTextCursor.EndOfWord)
            tc.insertText(completion[len(prefix):])
            self.setTextCursor(tc)
    
    def keyPressEvent(self, event):
        """Обработка клавиш"""
        # Ctrl+Enter — запуск скрипта
        if event.key() == Qt.Key_Return and event.modifiers() == Qt.ControlModifier:
            self.execute_requested.emit()
            return
        
        # Если popup открыт — передаём ему управление
        if self._completer.popup().isVisible():
            if event.key() in (Qt.Key_Enter, Qt.Key_Return, Qt.Key_Escape,
                               Qt.Key_Tab, Qt.Key_Backtab):
                event.ignore()
                return
        
        # Tab → 4 пробела
        if event.key() == Qt.Key_Tab:
            self.insertPlainText("    ")
            return
        
        # Enter — автоотступ
        if event.key() in (Qt.Key_Return, Qt.Key_Enter) and not event.modifiers():
            cursor = self.textCursor()
            line = cursor.block().text()
            indent = len(line) - len(line.lstrip())
            # Если строка заканчивается на ":", добавляем отступ
            if line.rstrip().endswith(':'):
                indent += 4
            super().keyPressEvent(event)
            self.insertPlainText(' ' * indent)
            return
        
        super().keyPressEvent(event)
        
        # Автокомплит
        self._update_completer()
    
    def _update_completer(self):
        """Обновляет автокомплит на основе текущего слова"""
        # Проверяем контекст "import " — показываем имена листов
        if self._try_show_sheet_names():
            return
        
        tc = self.textCursor()
        tc.select(QTextCursor.WordUnderCursor)
        prefix = tc.selectedText()
        
        if len(prefix) < 2:
            self._completer.popup().hide()
            return
        
        # Сканируем текущий код на переменные и добавляем в автокомплит
        self._update_completions_from_code()
        
        if prefix != self._completer.completionPrefix():
            self._completer.setCompletionPrefix(prefix)
            popup = self._completer.popup()
            popup.setCurrentIndex(self._completer.completionModel().index(0, 0))
        
        if self._completer.completionCount() > 0:
            cr = self.cursorRect()
            cr.setWidth(self._completer.popup().sizeHintForColumn(0) + 
                       self._completer.popup().verticalScrollBar().sizeHint().width() + 20)
            self._completer.complete(cr)
        else:
            self._completer.popup().hide()
    
    def _try_show_sheet_names(self) -> bool:
        """Проверяет, находится ли курсор после 'import ' и показывает имена листов.
        Возвращает True если показал popup с листами, False иначе."""
        if not self._sheet_names_getter:
            return False
        
        cursor = self.textCursor()
        line = cursor.block().text()
        col_pos = cursor.positionInBlock()
        text_before = line[:col_pos]
        
        # Проверяем паттерн: "import " в начале строки (с возможным пробелом)
        import_pat = r'^\s*import\s+(.*)'
        match = re.match(import_pat, text_before)
        if not match:
            return False
        
        # Получаем то, что пользователь уже набрал после "import "
        typed_after_import = match.group(1)
        
        # Если уже есть " from" — не показываем (пользователь уже выбрал лист)
        if ' from' in typed_after_import:
            return False
        
        # Получаем список имён листов
        try:
            sheet_names = self._sheet_names_getter()
        except Exception:
            return False
        
        if not sheet_names:
            return False
        
        # Фильтруем по набранному тексту
        prefix = typed_after_import.strip()
        if prefix:
            filtered = [name for name in sheet_names if name.lower().startswith(prefix.lower())]
        else:
            filtered = list(sheet_names)
        
        if not filtered:
            self._completer.popup().hide()
            return True
        
        # Устанавливаем модель с именами листов
        model = QStringListModel(filtered)
        self._completer.setModel(model)
        self._completer.setCompletionPrefix(prefix)
        popup = self._completer.popup()
        popup.setCurrentIndex(self._completer.completionModel().index(0, 0))
        
        cr = self.cursorRect()
        cr.setWidth(popup.sizeHintForColumn(0) + 
                   popup.verticalScrollBar().sizeHint().width() + 20)
        self._completer.complete(cr)
        return True
    
    def _update_completions_from_code(self):
        """Сканирует текущий код и добавляет пользовательские переменные в автокомплит"""
        code = self.toPlainText()
        base_completions = SmartScriptInterpreter.get_completions()
        
        # Ищем присваивания: var_name = ...
        var_pattern = re.compile(r'^\s*([a-zA-Z\u0430-\u044f\u0451\u0410-\u042f\u0401_]\w*)\s*=', re.MULTILINE)
        user_vars = set()
        for match in var_pattern.finditer(code):
            var_name = match.group(1)
            if var_name not in ('if', 'else', 'elif', 'for', 'while', 'return', 'func', 'import', 'from', 'print', 'True', 'False', 'None'):
                user_vars.add(var_name)
        
        # Ищем func определения: func name(...):
        func_pattern = re.compile(r'^\s*func\s+(\w+)\(([^)]*)\)', re.MULTILINE)
        user_funcs = set()
        for match in func_pattern.finditer(code):
            func_name = match.group(1)
            params = match.group(2).strip()
            user_funcs.add(f"{func_name}({params})")
        
        # Объединяем
        all_completions = list(base_completions)
        for var in user_vars:
            if var not in all_completions:
                all_completions.append(var)
        for func in user_funcs:
            if func not in all_completions:
                all_completions.append(func)
        
        model = QStringListModel(all_completions)
        self._completer.setModel(model)
    
    # ============ Номера строк ============
    
    def line_number_area_width(self):
        """Ширина области номеров строк"""
        digits = 1
        max_val = max(1, self.blockCount())
        while max_val >= 10:
            max_val //= 10
            digits += 1
        space = 10 + self.fontMetrics().horizontalAdvance('9') * max(digits, 3)
        return space
    
    def update_line_number_area_width(self, _):
        """Обновляет отступ для номеров строк"""
        self.setViewportMargins(self.line_number_area_width(), 0, 0, 0)
    
    def update_line_number_area(self, rect, dy):
        """Обновляет область номеров строк при прокрутке"""
        if dy:
            self.line_number_area.scroll(0, dy)
        else:
            self.line_number_area.update(0, rect.y(), self.line_number_area.width(), rect.height())
        
        if rect.contains(self.viewport().rect()):
            self.update_line_number_area_width(0)
    
    def resizeEvent(self, event):
        super().resizeEvent(event)
        cr = self.contentsRect()
        self.line_number_area.setGeometry(QRect(cr.left(), cr.top(),
                                                 self.line_number_area_width(), cr.height()))
    
    def line_number_area_paint_event(self, event):
        """Рисует номера строк"""
        painter = QPainter(self.line_number_area)
        bg_color = getattr(self, '_line_num_bg', QColor("#1e1e1e"))
        painter.fillRect(event.rect(), bg_color)
        
        block = self.firstVisibleBlock()
        block_number = block.blockNumber()
        top = round(self.blockBoundingGeometry(block).translated(self.contentOffset()).top())
        bottom = top + round(self.blockBoundingRect(block).height())
        
        while block.isValid() and top <= event.rect().bottom():
            if block.isVisible() and bottom >= event.rect().top():
                number = str(block_number + 1)
                
                # Текущая строка — акцентный цвет
                if block_number == self.textCursor().blockNumber():
                    painter.setPen(self.accent_color)
                    font = painter.font()
                    font.setBold(True)
                    painter.setFont(font)
                else:
                    ln_color = getattr(self, '_line_num_color', QColor("#858585"))
                    painter.setPen(ln_color)
                    font = painter.font()
                    font.setBold(False)
                    painter.setFont(font)
                
                painter.drawText(0, top, self.line_number_area.width() - 5,
                                self.fontMetrics().height(),
                                Qt.AlignRight | Qt.AlignVCenter, number)
            
            block = block.next()
            top = bottom
            bottom = top + round(self.blockBoundingRect(block).height())
            block_number += 1
        
        painter.end()
    
    def highlight_current_line(self):
        """Подсветка текущей строки"""
        extra_selections = []
        
        if not self.isReadOnly():
            selection = QTextEdit.ExtraSelection()
            line_color = getattr(self, '_current_line_bg', QColor("#2a2a2e"))
            selection.format.setBackground(line_color)
            selection.format.setProperty(QTextFormat.FullWidthSelection, True)
            selection.cursor = self.textCursor()
            selection.cursor.clearSelection()
            extra_selections.append(selection)
        
        self.setExtraSelections(extra_selections)
    
    def update_accent_color(self, color: QColor, is_dark: bool = None):
        """Обновляет акцентный цвет"""
        self.accent_color = color
        self.highlighter.update_accent_color(color, is_dark)
        self.highlight_current_line()
        self.line_number_area.update()


class SmartScriptWidget(QWidget):
    """Полный виджет SmartScript: редактор + панель вывода + кнопка запуска"""
    
    def __init__(self, source_sheet_name: str = "", cell_getter=None, sheet_getter=None,
                 sheet_names_getter=None, accent_color=None, theme_name=None, theme_mode=None, parent=None):
        super().__init__(parent)
        
        self.source_sheet_name = source_sheet_name
        self.accent_color = accent_color or QColor("#DC143C")
        self.theme_name = theme_name
        self.theme_mode = theme_mode
        self._sheet_names_getter = sheet_names_getter
        
        # Detect dark/light
        self._is_dark = self._detect_dark_theme()
        
        # Интерпретатор
        self.interpreter = SmartScriptInterpreter(cell_getter, sheet_getter)
        
        self._init_ui()
        self._apply_theme(self._is_dark)
    
    def _detect_dark_theme(self) -> bool:
        """Detect if current theme is dark"""
        if self.theme_name == 'dark':
            return True
        if self.theme_name == 'light':
            return False
        if self.theme_name == 'gallery':
            return self.theme_mode == 'dark'
        # system or unknown — detect from palette
        app = QApplication.instance()
        if app:
            palette = app.palette()
            bg = palette.color(QPalette.Window)
            brightness = (bg.red() + bg.green() + bg.blue()) / 3
            return brightness < 128
        return True  # default dark
    
    def _init_ui(self):
        """Инициализация UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        
        # Заголовок
        header = QWidget()
        header.setObjectName("scriptHeader")
        header.setFixedHeight(40)
        header_layout = QHBoxLayout(header)
        header_layout.setContentsMargins(12, 0, 12, 0)
        
        self.title_label = QLabel(f"📜 SmartScript")
        self.title_label.setObjectName("scriptTitle")
        title_font = self.title_label.font()
        title_font.setPointSize(11)
        title_font.setBold(True)
        self.title_label.setFont(title_font)
        header_layout.addWidget(self.title_label)
        
        if self.source_sheet_name:
            self.source_label = QLabel(f"на основе «{self.source_sheet_name}»")
            self.source_label.setObjectName("scriptSource")
            source_font = self.source_label.font()
            source_font.setPointSize(9)
            self.source_label.setFont(source_font)
            header_layout.addWidget(self.source_label)
        
        header_layout.addStretch()
        
        # Кнопка запуска
        self.run_button = QPushButton("▶ Запустить")
        self.run_button.setObjectName("runButton")
        self.run_button.setFixedHeight(28)
        self.run_button.setCursor(Qt.PointingHandCursor)
        self.run_button.setToolTip("Ctrl+Enter")
        self.run_button.clicked.connect(self.run_script)
        header_layout.addWidget(self.run_button)
        
        layout.addWidget(header)
        
        # Сплиттер: редактор сверху, вывод снизу
        splitter = QSplitter(Qt.Vertical)
        
        # Редактор кода
        self.editor = SmartScriptEditor(self.accent_color, sheet_names_getter=self._sheet_names_getter)
        self.editor.execute_requested.connect(self.run_script)
        splitter.addWidget(self.editor)
        
        # Панель вывода
        output_container = QWidget()
        output_container.setObjectName("outputContainer")
        output_layout = QVBoxLayout(output_container)
        output_layout.setContentsMargins(0, 0, 0, 0)
        output_layout.setSpacing(0)
        
        # Заголовок вывода
        output_header = QWidget()
        output_header.setFixedHeight(28)
        output_header.setObjectName("outputHeader")
        output_header_layout = QHBoxLayout(output_header)
        output_header_layout.setContentsMargins(12, 0, 12, 0)
        
        output_title = QLabel("📋 Результат")
        output_title.setObjectName("outputTitle")
        output_font = output_title.font()
        output_font.setPointSize(10)
        output_font.setBold(True)
        output_title.setFont(output_font)
        output_header_layout.addWidget(output_title)
        
        output_header_layout.addStretch()
        
        # Кнопка очистки
        clear_btn = QPushButton("✕")
        clear_btn.setFixedSize(20, 20)
        clear_btn.setObjectName("clearOutputBtn")
        clear_btn.setCursor(Qt.PointingHandCursor)
        clear_btn.clicked.connect(self.clear_output)
        output_header_layout.addWidget(clear_btn)
        
        output_layout.addWidget(output_header)
        
        # Текст вывода
        self.output_text = QPlainTextEdit()
        self.output_text.setObjectName("outputText")
        self.output_text.setReadOnly(True)
        self.output_text.setMaximumHeight(200)
        font = QFont("Consolas", 11)
        if not font.exactMatch():
            font = QFont("Courier New", 11)
        self.output_text.setFont(font)
        self.output_text.setPlaceholderText("Результат выполнения скрипта появится здесь...")
        output_layout.addWidget(self.output_text)
        
        splitter.addWidget(output_container)
        
        # Пропорции: 70% редактор, 30% вывод
        splitter.setSizes([500, 200])
        splitter.setCollapsible(1, False)
        
        layout.addWidget(splitter)
    
    def _apply_theme(self, is_dark: bool = True):
        """Применяет тему (поддержка светлой и тёмной)"""
        accent = self.accent_color.name()
        accent_hover = self.accent_color.lighter(120).name()
        accent_pressed = self.accent_color.darker(110).name()
        
        if is_dark:
            header_bg = "#252526"
            header_border = "#3c3c3c"
            title_color = "#cccccc"
            source_color = "#858585"
            output_bg = "#1e1e1e"
            editor_bg = "#1e1e1e"
            editor_color = "#d4d4d4"
            selection_bg = "#264f78"
            clear_hover_bg = "#3c3c3c"
            line_num_bg = "#1e1e1e"
            line_num_color = "#858585"
            current_line_bg = "#2a2a2e"
            completer_bg = "#1e1e1e"
            completer_color = "#d4d4d4"
            completer_border = "#454545"
            completer_selected = "#094771"
            completer_hover = "#2a2d2e"
        else:
            header_bg = "#f3f3f3"
            header_border = "#d4d4d4"
            title_color = "#333333"
            source_color = "#666666"
            output_bg = "#ffffff"
            editor_bg = "#ffffff"
            editor_color = "#1e1e1e"
            selection_bg = "#add6ff"
            clear_hover_bg = "#e0e0e0"
            line_num_bg = "#f3f3f3"
            line_num_color = "#999999"
            current_line_bg = "#f0f0f0"
            completer_bg = "#ffffff"
            completer_color = "#1e1e1e"
            completer_border = "#c8c8c8"
            completer_selected = "#0060c0"
            completer_hover = "#e8e8e8"
        
        # Store theme colors for line number painting
        self._theme_is_dark = is_dark
        self._line_num_bg = QColor(line_num_bg)
        self._line_num_color = QColor(line_num_color)
        self._current_line_bg = QColor(current_line_bg)
        
        self.setStyleSheet(f"""
            #scriptHeader {{
                background-color: {header_bg};
                border-bottom: 1px solid {header_border};
            }}
            #scriptTitle {{
                color: {title_color};
            }}
            #scriptSource {{
                color: {source_color};
            }}
            #runButton {{
                background-color: {accent};
                color: #ffffff;
                border: none;
                border-radius: 4px;
                padding: 4px 16px;
                font-weight: bold;
                font-size: 11px;
            }}
            #runButton:hover {{
                background-color: {accent_hover};
            }}
            #runButton:pressed {{
                background-color: {accent_pressed};
            }}
            #outputContainer {{
                background-color: {output_bg};
            }}
            #outputHeader {{
                background-color: {header_bg};
                border-top: 1px solid {header_border};
            }}
            #outputTitle {{
                color: {title_color};
            }}
            #clearOutputBtn {{
                background-color: transparent;
                color: {source_color};
                border: none;
                border-radius: 2px;
                font-size: 12px;
            }}
            #clearOutputBtn:hover {{
                background-color: {clear_hover_bg};
                color: {title_color};
            }}
            #outputText {{
                background-color: {output_bg};
                color: {editor_color};
                border: none;
                padding: 8px;
            }}
            QPlainTextEdit {{
                background-color: {editor_bg};
                color: {editor_color};
                border: none;
                selection-background-color: {selection_bg};
                selection-color: #ffffff;
            }}
        """)
        
        # Update completer popup theme
        if hasattr(self, 'editor') and hasattr(self.editor, '_completer'):
            popup = self.editor._completer.popup()
            popup.setStyleSheet(f"""
                QListView {{
                    background-color: {completer_bg};
                    color: {completer_color};
                    border: 1px solid {completer_border};
                    border-radius: 4px;
                    font-family: Consolas, 'Courier New', monospace;
                    font-size: 12px;
                    padding: 2px;
                }}
                QListView::item {{
                    padding: 4px 8px;
                    border-radius: 2px;
                }}
                QListView::item:selected {{
                    background-color: {completer_selected};
                    color: #ffffff;
                }}
                QListView::item:hover {{
                    background-color: {completer_hover};
                }}
            """)
        
        # Update editor theme colors
        if hasattr(self, 'editor'):
            self.editor._line_num_bg = self._line_num_bg
            self.editor._line_num_color = self._line_num_color
            self.editor._current_line_bg = self._current_line_bg
            self.editor.highlight_current_line()
            self.editor.line_number_area.update()
    
    def set_cell_getter(self, getter):
        """Устанавливает функцию для чтения ячеек"""
        self.interpreter.set_cell_getter(getter)
    
    def run_script(self):
        """Запускает скрипт"""
        code = self.editor.toPlainText()
        if not code.strip():
            self.output_text.setPlainText("⚠ Скрипт пуст")
            return
        
        try:
            results = self.interpreter.execute(code)
            if results:
                output = "\n".join(results)
                self.output_text.setPlainText(f"✅ {output}")
            else:
                self.output_text.setPlainText("✅ Скрипт выполнен")
            
            # Обновляем автокомплит с пользовательскими переменными и функциями
            self._refresh_completer()
                
        except SmartScriptError as e:
            self.output_text.setPlainText(f"❌ Ошибка: {e}")
        except Exception as e:
            self.output_text.setPlainText(f"❌ Неожиданная ошибка: {e}")
    
    def _refresh_completer(self):
        """Обновляет автокомплит с пользовательскими переменными и функциями"""
        try:
            completions = self.interpreter.get_instance_completions()
            model = QStringListModel(completions)
            self.editor._completer.setModel(model)
        except Exception:
            pass
    
    def clear_output(self):
        """Очищает панель вывода"""
        self.output_text.clear()
    
    def update_accent_color(self, color: QColor):
        """Обновляет акцентный цвет"""
        self.accent_color = color
        self._is_dark = self._detect_dark_theme()
        self.editor.update_accent_color(color, self._is_dark)
        self._apply_theme(self._is_dark)
    
    def update_theme(self, theme_name: str, accent_color: QColor, theme_mode: str = "light"):
        """Обновляет тему и цвета"""
        self.theme_name = theme_name
        self.theme_mode = theme_mode
        self.accent_color = accent_color
        self._is_dark = self._detect_dark_theme()
        self.editor.update_accent_color(accent_color, self._is_dark)
        self._apply_theme(self._is_dark)
    
    def get_code(self) -> str:
        """Возвращает текущий код"""
        return self.editor.toPlainText()
    
    def set_code(self, code: str):
        """Устанавливает код"""
        self.editor.setPlainText(code)
