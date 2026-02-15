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
    
    def __init__(self, parent=None, accent_color=None):
        super().__init__(parent)
        self.accent_color = accent_color or QColor("#DC143C")
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
        func_color = func_color.lighter(130)
        self.function_format.setForeground(func_color)
        self.function_format.setFontWeight(QFont.Bold)
        
        # Строки — зелёный
        self.string_format = QTextCharFormat()
        self.string_format.setForeground(QColor("#6A9955"))
        
        # Числа — оранжевый
        self.number_format = QTextCharFormat()
        self.number_format.setForeground(QColor("#B5CEA8"))
        
        # Комментарии — серый
        self.comment_format = QTextCharFormat()
        self.comment_format.setForeground(QColor("#6A9955"))
        self.comment_format.setFontItalic(True)
        
        # Операторы — светлый
        self.operator_format = QTextCharFormat()
        self.operator_format.setForeground(QColor("#D4D4D4"))
        
        # Ссылки на ячейки — голубой
        self.cell_ref_format = QTextCharFormat()
        self.cell_ref_format.setForeground(QColor("#4EC9B0"))
        
        # Правила
        self.rules = []
        
        # Ключевые слова
        keywords = ['if', 'else', 'elif', 'for', 'in', 'while', 'return',
                     'and', 'or', 'not', 'True', 'False', 'None', 'func']
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
    
    def update_accent_color(self, color: QColor):
        """Обновляет акцентный цвет"""
        self.accent_color = color
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
    
    def __init__(self, accent_color=None, parent=None):
        super().__init__(parent)
        
        self.accent_color = accent_color or QColor("#DC143C")
        
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
        # Удаляем уже набранный текст
        prefix = self._completer.completionPrefix()
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
    
    def _update_completions_from_code(self):
        """Сканирует текущий код и добавляет пользовательские переменные в автокомплит"""
        code = self.toPlainText()
        base_completions = SmartScriptInterpreter.get_completions()
        
        # Ищем присваивания: var_name = ...
        var_pattern = re.compile(r'^\s*([a-zA-Z\u0430-\u044f\u0451\u0410-\u042f\u0401_]\w*)\s*=', re.MULTILINE)
        user_vars = set()
        for match in var_pattern.finditer(code):
            var_name = match.group(1)
            if var_name not in ('if', 'else', 'elif', 'for', 'while', 'return', 'func', 'True', 'False', 'None'):
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
        painter.fillRect(event.rect(), QColor("#1e1e1e"))
        
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
                    painter.setPen(QColor("#858585"))
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
            line_color = QColor("#2a2a2e")
            selection.format.setBackground(line_color)
            selection.format.setProperty(QTextFormat.FullWidthSelection, True)
            selection.cursor = self.textCursor()
            selection.cursor.clearSelection()
            extra_selections.append(selection)
        
        self.setExtraSelections(extra_selections)
    
    def update_accent_color(self, color: QColor):
        """Обновляет акцентный цвет"""
        self.accent_color = color
        self.highlighter.update_accent_color(color)
        self.highlight_current_line()
        self.line_number_area.update()


class SmartScriptWidget(QWidget):
    """Полный виджет SmartScript: редактор + панель вывода + кнопка запуска"""
    
    def __init__(self, source_sheet_name: str = "", cell_getter=None, 
                 accent_color=None, parent=None):
        super().__init__(parent)
        
        self.source_sheet_name = source_sheet_name
        self.accent_color = accent_color or QColor("#DC143C")
        
        # Интерпретатор
        self.interpreter = SmartScriptInterpreter(cell_getter)
        
        self._init_ui()
        self._apply_theme()
    
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
        self.editor = SmartScriptEditor(self.accent_color)
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
    
    def _apply_theme(self):
        """Применяет тёмную тему (VS Code стиль)"""
        accent = self.accent_color.name()
        accent_hover = self.accent_color.lighter(120).name()
        
        self.setStyleSheet(f"""
            #scriptHeader {{
                background-color: #252526;
                border-bottom: 1px solid #3c3c3c;
            }}
            #scriptTitle {{
                color: #cccccc;
            }}
            #scriptSource {{
                color: #858585;
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
                background-color: {self.accent_color.darker(110).name()};
            }}
            #outputContainer {{
                background-color: #1e1e1e;
            }}
            #outputHeader {{
                background-color: #252526;
                border-top: 1px solid #3c3c3c;
            }}
            #outputTitle {{
                color: #cccccc;
            }}
            #clearOutputBtn {{
                background-color: transparent;
                color: #858585;
                border: none;
                border-radius: 2px;
                font-size: 12px;
            }}
            #clearOutputBtn:hover {{
                background-color: #3c3c3c;
                color: #cccccc;
            }}
            #outputText {{
                background-color: #1e1e1e;
                color: #d4d4d4;
                border: none;
                padding: 8px;
            }}
            QPlainTextEdit {{
                background-color: #1e1e1e;
                color: #d4d4d4;
                border: none;
                selection-background-color: #264f78;
                selection-color: #ffffff;
            }}
        """)
    
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
                self.output_text.setPlainText("✅ Скрипт выполнен (нет return)")
            
            # Показываем переменные
            if self.interpreter.variables:
                vars_str = "\n\n📊 Переменные:\n"
                for name, value in self.interpreter.variables.items():
                    vars_str += f"  {name} = {value}\n"
                self.output_text.appendPlainText(vars_str)
            
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
        self.editor.update_accent_color(color)
        self._apply_theme()
    
    def get_code(self) -> str:
        """Возвращает текущий код"""
        return self.editor.toPlainText()
    
    def set_code(self, code: str):
        """Устанавливает код"""
        self.editor.setPlainText(code)
