"""
Виджет для чата с ИИ
"""

from PyQt5.QtWidgets import QWidget, QVBoxLayout, QHBoxLayout, QTextEdit, QPushButton, QLabel, QScrollArea
from PyQt5.QtCore import Qt, QDateTime, QSize
from PyQt5.QtGui import QFont, QColor, QIcon


from PyQt5.QtCore import Qt, QDateTime, QSize, pyqtSignal
import threading


class AIChatWidget(QWidget):
    """Виджет чата с ИИ помощником с современным дизайном"""

    ai_response_ready = pyqtSignal(str)
    ai_response_done = pyqtSignal()

    def __init__(self, theme="dark", accent_color=None, parent=None, main_window=None):
        super().__init__(parent)
        self.theme = theme
        self.accent_color = accent_color if accent_color else QColor("#DC143C")
        self.main_window = main_window  # Reference to main window for table data
        
        # История сообщений для пересоздания при смене цвета
        self.message_history = []  # Список кортежей (type, message, time)
        
        self.init_ui()
        self.apply_theme()

        # Подключаем сигналы для асинхронного ответа
        self.ai_response_ready.connect(self._on_ai_response)
        self.ai_response_done.connect(self._on_ai_done)
        # Флаг для индикатора набора
        self._placeholder_active = False

    def init_ui(self):
        """Инициализация интерфейса"""
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # === ЗАГОЛОВОК ===
        header_container = QWidget()
        header_layout = QHBoxLayout(header_container)
        header_layout.setContentsMargins(15, 12, 15, 12)
        header_layout.setSpacing(10)
        
        # Иконка
        icon_label = QLabel("🤖")
        icon_label.setStyleSheet("font-size: 18px;")
        header_layout.addWidget(icon_label)
        
        # Заголовок
        self.header = QLabel("Помощник ИИ")
        header_font = self.header.font()
        header_font.setPointSize(11)
        header_font.setBold(True)
        self.header.setFont(header_font)
        header_layout.addWidget(self.header)
        
        header_layout.addStretch()
        header_container.setLayout(header_layout)
        main_layout.addWidget(header_container)

        # Разделитель после заголовка
        separator1 = QWidget()
        separator1.setFixedHeight(1)
        main_layout.addWidget(separator1)

        # === ОБЛАСТЬ СООБЩЕНИЙ ===
        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        scroll_area.setStyleSheet("""
            QScrollArea {
                border: none;
            }
            QScrollBar:vertical {
                width: 8px;
                margin: 0px;
            }
            QScrollBar::handle:vertical {
                border-radius: 4px;
                min-height: 20px;
                margin: 0px;
            }
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
                border: none;
                background: none;
                height: 0px;
            }
        """)
        
        self.chat_display = QTextEdit()
        self.chat_display.setReadOnly(True)
        self.chat_display.setStyleSheet("border: none; margin: 0px; padding: 15px;")
        scroll_area.setWidget(self.chat_display)
        main_layout.addWidget(scroll_area)

        # Разделитель перед вводом
        self.separator2 = QWidget()
        self.separator2.setFixedHeight(1)
        main_layout.addWidget(self.separator2)

        # === НИЖНЯЯ ПАНЕЛЬ С ВВОДОМ ===
        input_container = QWidget()
        input_layout = QHBoxLayout(input_container)
        input_layout.setContentsMargins(12, 12, 12, 12)
        input_layout.setSpacing(8)

        # Поле ввода сообщения
        self.input_field = QTextEdit()
        self.input_field.setPlaceholderText("Введите сообщение... (Enter для отправки)")
        self.input_field.setMaximumHeight(90)
        self.input_field.setMinimumHeight(50)
        self.input_field.keyPressEvent = self._input_key_press
        input_layout.addWidget(self.input_field, 1)

        # Кнопка отправки (как иконка)
        self.send_button = QPushButton("➤")
        self.send_button.setMaximumSize(QSize(45, 45))
        self.send_button.setMinimumSize(QSize(45, 45))
        self.send_button.setFont(QFont("Arial", 16))
        self.send_button.clicked.connect(self.send_message)
        input_layout.addWidget(self.send_button, 0, Qt.AlignBottom)

        input_container.setLayout(input_layout)
        main_layout.addWidget(input_container)

    def _input_key_press(self, event):
        """Обработка горячих клавиш в поле ввода"""
        if event.key() == Qt.Key_Return:
            if event.modifiers() == Qt.ShiftModifier:
                # Shift+Enter - новая строка
                QTextEdit.keyPressEvent(self.input_field, event)
            else:
                # Enter - отправить
                self.send_message()
        else:
            QTextEdit.keyPressEvent(self.input_field, event)

    def apply_theme(self):
        """Применяет тему и цвета к чату"""
        from PyQt5.QtGui import QPalette
        from PyQt5.QtWidgets import QApplication
        
        # Определяем реальную тему
        actual_theme = self.theme
        
        if self.theme == "system":
            # Для системной темы, сначала применим светлую палитру и проверим
            actual_theme = "light"  # По умолчанию
            
            app = QApplication.instance()
            if app:
                # Пытаемся определить реальную тему по текущей палитре приложения
                palette = app.palette()
                text_color = palette.color(QPalette.Text)
                text_brightness = (text_color.red() + text_color.green() + text_color.blue()) / 3
                
                # Если текст светлый (RGB > 128) - тёмная тема
                # Если текст тёмный (RGB < 128) - светлая тема
                actual_theme = "dark" if text_brightness > 128 else "light"
        
        accent_hex = self.accent_color.name()
        accent_light = self.accent_color.lighter(130).name()
        accent_hover = self.accent_color.lighter(110).name()
        accent_pressed = self.accent_color.darker(110).name()
        
        if actual_theme == "dark":
            header_style = f"""
                background-color: #2d2e30;
                color: #e8eaed;
                border: none;
            """
            
            chat_style = f"""
                QTextEdit {{
                    background-color: #202124;
                }}
            """
            
            separator_style = "background-color: #3c4043;"
            
            input_style = f"""
                QTextEdit {{
                    border: 1px solid #3c4043;
                    border-radius: 8px;
                    padding: 10px;
                    background-color: #2d2e30;
                    color: #e8eaed;
                    font-family: 'Segoe UI', Arial, sans-serif;
                    font-size: 11px;
                }}
                QTextEdit:focus {{
                    border: 2px solid {accent_hex};
                }}
            """
            
            button_style = f"""
                QPushButton {{
                    background-color: {accent_hex};
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: bold;
                    font-size: 18px;
                }}
                QPushButton:hover {{
                    background-color: {accent_hover};
                }}
                QPushButton:pressed {{
                    background-color: {accent_pressed};
                }}
            """
            
            user_msg_color = "white"
            user_msg_bg = accent_hex
            ai_msg_color = "#9aa0a6"
            ai_msg_bg = "#2d2e30"
            ai_msg_border = "#3c4043"
            
        else:  # light theme
            header_style = f"""
                background-color: #f8f9fa;
                color: #202124;
                border: none;
            """
            
            chat_style = f"""
                QTextEdit {{
                    background-color: #ffffff;
                }}
            """
            
            separator_style = "background-color: #e8eaed;"
            
            input_style = f"""
                QTextEdit {{
                    border: 1px solid #e8eaed;
                    border-radius: 8px;
                    padding: 10px;
                    background-color: #f8f9fa;
                    color: #202124;
                    font-family: 'Segoe UI', Arial, sans-serif;
                    font-size: 11px;
                }}
                QTextEdit:focus {{
                    border: 2px solid {accent_hex};
                }}
            """
            
            button_style = f"""
                QPushButton {{
                    background-color: {accent_hex};
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: bold;
                    font-size: 18px;
                }}
                QPushButton:hover {{
                    background-color: {accent_hover};
                }}
                QPushButton:pressed {{
                    background-color: {accent_pressed};
                }}
            """
            
            user_msg_color = "white"
            user_msg_bg = accent_hex
            ai_msg_color = "white"
            ai_msg_bg = accent_light
            ai_msg_border = accent_hex
        
        # Применяем стили
        self.header.setStyleSheet(f"color: {chat_style.split('color: ')[1].split(';')[0]}")
        self.chat_display.setStyleSheet(chat_style)
        self.separator2.setStyleSheet(separator_style)
        self.input_field.setStyleSheet(input_style)
        self.send_button.setStyleSheet(button_style)
        
        # Сохраняем цвета для сообщений
        self.user_msg_color = user_msg_color
        self.user_msg_bg = user_msg_bg
        self.ai_msg_color = ai_msg_color
        self.ai_msg_bg = ai_msg_bg
        self.ai_msg_border = ai_msg_border

    def update_theme(self, theme: str, accent_color: QColor):
        """Обновляет тему и цвета"""
        self.theme = theme
        self.accent_color = accent_color
        self.apply_theme()
        # Пересоздаём весь чат с новыми цветами
        self._rebuild_chat()
    
    def _rebuild_chat(self):
        """Перестраивает все сообщения в чате с текущими цветами"""
        # Сначала применяем тему (это определит реальную тему для системной темы)
        self.apply_theme()
        
        # Сохраняем историю
        history = self.message_history.copy()
        
        # Очищаем чат
        self.chat_display.clear()
        self.message_history.clear()
        
        # Пересоздаём все сообщения
        for msg_type, message, time in history:
            if msg_type == "user":
                # Пересоздаём пользовательское сообщение
                clean_message = message.replace('<', '&lt;').replace('>', '&gt;')
                html = f"""<table width="100%"><tr><td align="right"><table><tr><td style="background-color: {self.user_msg_bg}; color: white; padding: 10px 14px; border-radius: 14px; box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.2);"><span style="font-size: 11px; color: white; opacity: 0.8;">{time}</span><br><span style="color: white;">{clean_message}</span></td></tr></table></td></tr></table>"""
                cursor = self.chat_display.textCursor()
                cursor.movePosition(cursor.End)
                self.chat_display.setTextCursor(cursor)
                self.chat_display.insertHtml(html)
                # Добавляем в историю
                self.message_history.append((msg_type, message, time))
            else:  # "ai"
                # Пересоздаём ИИ сообщение
                clean_message = message.replace('<', '&lt;').replace('>', '&gt;')
                html = f"""<table width="100%"><tr><td align="left"><table><tr><td style="background-color: {self.ai_msg_bg}; color: {self.ai_msg_color}; padding: 10px 14px; border-radius: 14px; border-left: 3px solid {self.ai_msg_color}; box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);"><span style="font-size: 11px; color: {self.ai_msg_color}; opacity: 0.8;">{time}</span><br><span style="color: {self.ai_msg_color};">{clean_message}</span></td></tr></table></td></tr></table>"""
                cursor = self.chat_display.textCursor()
                cursor.movePosition(cursor.End)
                self.chat_display.setTextCursor(cursor)
                self.chat_display.insertHtml(html)
                # Добавляем в историю
                self.message_history.append((msg_type, message, time))
        
        # Автоскролл вниз
        self.chat_display.verticalScrollBar().setValue(
            self.chat_display.verticalScrollBar().maximum()
        )

    def send_message(self):
        """Отправка сообщения. Запускаем запрос в фоновом потоке и отключаем ввод."""
        message = self.input_field.toPlainText().strip()

        if not message:
            return

        # Добавляем сообщение пользователя
        self.add_user_message(message)

        # Очищаем поле ввода и временно отключаем ввод/кнопку
        self.input_field.clear()
        self.input_field.setEnabled(False)
        self.send_button.setEnabled(False)

        # Запускаем фоновую отправку
        threading.Thread(target=self._send_to_ai, args=(message,), daemon=True).start()

        # Показываем индикатор, что ИИ печатает
        try:
            self.add_system_message("Печатает...")
            self._placeholder_active = True
        except Exception:
            # не критично, продолжим
            pass

    def _send_to_ai(self, message: str):
        """Выполняет запрос к локальной модели в отдельном потоке и эмитит сигнал с ответом."""
        try:
            from pysheets.src.core.ai.chat import RequestMessage
            
            # Extract table data and inject it into the message
            table_data = None
            if self.main_window:
                table_data = self._extract_table_data()
            
            # If we have table data, prepend it to the message
            final_message = message
            if table_data:
                final_message = f"{table_data}\n\nUser request: {message}"
            
            # Send message with table context embedded
            resp = RequestMessage(final_message)
            if resp is None:
                resp = "Ошибка: пустой ответ от модели"
        except Exception as e:
            resp = f"Ошибка: {e}"

        # Отправляем ответ в главный поток
        self.ai_response_ready.emit(str(resp))
        self.ai_response_done.emit()

    def _extract_table_data(self) -> Optional[str]:
        """Extract current table data from spreadsheet widget as formatted string."""
        try:
            if not self.main_window or not self.main_window.tab_widget:
                return None
            
            # Get the current tab (spreadsheet widget)
            spreadsheet_widget = self.main_window.tab_widget.currentWidget()
            if not spreadsheet_widget:
                return None
            
            # SpreadsheetWidget has cells attribute (list of lists of Cell objects)
            if not hasattr(spreadsheet_widget, 'cells'):
                return None
            
            cells = spreadsheet_widget.cells
            if not cells:
                return None
            
            # Convert Cell objects to values
            lines = []
            
            # Determine max columns (non-empty)
            max_cols = len(cells[0]) if cells else 0
            if max_cols == 0:
                return None
            
            # Add header row with column names (A, B, C, ...)
            header = " | ".join([chr(65 + i) for i in range(min(max_cols, 26))])
            lines.append(header)
            lines.append("-" * len(header))
            
            # Add data rows (limit to first 10 rows to save token space)
            has_data = False
            for row_idx, row in enumerate(cells[:10]):
                row_data = []
                for col_idx in range(min(max_cols, 26)):
                    cell = row[col_idx] if col_idx < len(row) else None
                    # Extract value from Cell object
                    if cell and hasattr(cell, 'value'):
                        value = cell.value
                    else:
                        value = None
                    
                    if value is not None:
                        cell_str = str(value)[:15]  # Limit cell width
                        has_data = True
                    else:
                        cell_str = ""
                    row_data.append(cell_str)
                
                # Only add non-empty rows
                if any(row_data):
                    lines.append(" | ".join(row_data))
            
            if not has_data or len(lines) <= 2:  # Only header + separator
                return None
            
            table_str = "\n".join(lines)
            return f"CURRENT SPREADSHEET DATA:\n{table_str}"
            
        except Exception as e:
            # If extraction fails, log and return None
            import logging
            logging.exception(f"Failed to extract table data: {e}")
            return None

    def _on_ai_response(self, text: str):
        """Слот: вызывается когда получен ответ от модели"""
        # Parse and execute any table commands from the response
        text = self._process_ai_commands(text)
        
        # Если был показан индикатор, удалим его из истории и пересоберём чат
        if getattr(self, '_placeholder_active', False):
            try:
                # удалим последний элемент истории, он должен быть индикатором
                if len(self.message_history) > 0 and self.message_history[-1][0] == 'ai' and 'Печатает' in self.message_history[-1][1]:
                    self.message_history.pop()
                    self._rebuild_chat()
            except Exception:
                pass
            finally:
                self._placeholder_active = False

        self.add_system_message(text)

    def _on_ai_done(self):
        """Слот: восстановление UI после завершения запроса"""
        self.send_button.setEnabled(True)
        self.input_field.setEnabled(True)
        self.input_field.setFocus()

    def add_user_message(self, message: str):
        """Добавляет сообщение пользователя в чат"""
        time = QDateTime.currentDateTime().toString("hh:mm")
        # Сохраняем в историю (оригинальное сообщение без экранирования)
        self.message_history.append(("user", message, time))
        
        # Экранируем HTML теги в сообщении
        clean_message = message.replace('<', '&lt;').replace('>', '&gt;')
        html = f"""<table width="100%"><tr><td align="right"><table><tr><td style="background-color: {self.user_msg_bg}; color: white; padding: 10px 14px; border-radius: 14px; box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.2);"><span style="font-size: 11px; color: white; opacity: 0.8;">{time}</span><br><span style="color: white;">{clean_message}</span></td></tr></table></td></tr></table>"""
        cursor = self.chat_display.textCursor()
        cursor.movePosition(cursor.End)
        self.chat_display.setTextCursor(cursor)
        self.chat_display.insertHtml(html)
        
        # Автоскролл вниз
        self.chat_display.verticalScrollBar().setValue(
            self.chat_display.verticalScrollBar().maximum()
        )

    def add_system_message(self, message: str):
        """Добавляет системное сообщение в чат"""
        time = QDateTime.currentDateTime().toString("hh:mm")
        # Сохраняем в историю (оригинальное сообщение без экранирования)
        self.message_history.append(("ai", message, time))
        
        # Экранируем HTML теги в сообщении
        clean_message = message.replace('<', '&lt;').replace('>', '&gt;')
        html = f"""<table width="100%"><tr><td align="left"><table><tr><td style="background-color: {self.ai_msg_bg}; color: {self.ai_msg_color}; padding: 10px 14px; border-radius: 14px; border-left: 3px solid {self.ai_msg_color}; box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);"><span style="font-size: 11px; color: {self.ai_msg_color}; opacity: 0.8;">{time}</span><br><span style="color: {self.ai_msg_color};">{clean_message}</span></td></tr></table></td></tr></table>"""
        cursor = self.chat_display.textCursor()
        cursor.movePosition(cursor.End)
        self.chat_display.setTextCursor(cursor)
        self.chat_display.insertHtml(html)
        
        # Автоскролл вниз
        self.chat_display.verticalScrollBar().setValue(
            self.chat_display.verticalScrollBar().maximum()
        )
    def _process_ai_commands(self, response: str) -> str:
        """
        Парсит JSON команды из ответа модели для модификации таблицы.
        Поддерживает форматы:
        - [TABLE_COMMAND]{json}[/TABLE_COMMAND]
        - ```json {json} ```
        - Голые JSON объекты с полем 'action'
        - Простые массивы [[...], [...]] - автоматически преобразуются в insert команду
        
        Возвращает отчищенный от команд текст ответа.
        """
        import re
        import json
        import logging
        
        logger = logging.getLogger(__name__)
        removed_positions = []
        commands_found = 0
        
        # DEBUG: выводим весь ответ
        print(f"\n=== RESPONSE DEBUG ===")
        print(f"Response length: {len(response)}")
        print(f"Response preview: {response[:500]}")
        print(f"=== END RESPONSE DEBUG ===\n")
        
        try:
            # 1. Проверяем [TABLE_COMMAND] маркеры
            command_pattern = r'\[TABLE_COMMAND\](.*?)\[/TABLE_COMMAND\]'
            matches = re.finditer(command_pattern, response, re.DOTALL)
            
            for match in matches:
                try:
                    command = json.loads(match.group(1).strip())
                    logger.info(f"Found [TABLE_COMMAND] marker with action: {command.get('action')}")
                    self._execute_table_command(command)
                    commands_found += 1
                    removed_positions.append((match.start(), match.end()))
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse [TABLE_COMMAND]: {e}")
            
            # 2. Ищем ```json``` блоки ВРУЧНУЮ (более надежный способ)
            i = 0
            backtick_json_count = response.count('```json')
            print(f"Looking for ```json blocks. Found {backtick_json_count} occurrences")
            
            while i < len(response):
                # Проверяем есть ли ```json в этой позиции
                if i + 7 <= len(response) and response[i:i+7] == '```json':
                    print(f"Found ```json at position {i}")
                    # Нашли начало блока
                    start_pos = i
                    i += 7
                    # Ищем конец блока ``` 
                    end_pos = response.find('```', i)
                    print(f"Looking for closing ``` from position {i}, found at {end_pos}")
                    
                    if end_pos == -1:
                        # Нет закрывающего ```, может быть JSON продолжается до конца
                        # Ищем первый [ и пытаемся парсить массив до конца
                        bracket_pos = response.find('[', i)
                        if bracket_pos != -1:
                            print(f"No closing ```, but found [ at {bracket_pos}, trying to parse from there")
                            # Ищем парный ]
                            bracket_depth = 0
                            j = bracket_pos
                            in_string = False
                            escape_next = False
                            
                            while j < len(response):
                                char = response[j]
                                
                                if escape_next:
                                    escape_next = False
                                    j += 1
                                    continue
                                
                                if char == '\\' and in_string:
                                    escape_next = True
                                    j += 1
                                    continue
                                
                                if char == '"':
                                    in_string = not in_string
                                elif not in_string:
                                    if char == '[':
                                        bracket_depth += 1
                                    elif char == ']':
                                        bracket_depth -= 1
                                        if bracket_depth == 0:
                                            json_str = response[bracket_pos:j+1]
                                            print(f"Found complete array, length: {len(json_str)}")
                                            try:
                                                data = json.loads(json_str)
                                                print(f"Successfully parsed JSON array with {len(data) if isinstance(data, list) else '?'} rows")
                                                
                                                if isinstance(data, list) and len(data) > 0:
                                                    # Валидация: выравниваем количество колонок
                                                    data = self._normalize_table_data(data)
                                                    insert_command = {"action": "insert", "data": data, "start_row": 0, "start_col": 0}
                                                    self._execute_table_command(insert_command)
                                                    commands_found += 1
                                                    removed_positions.append((start_pos, j+1))
                                            except json.JSONDecodeError as e:
                                                print(f"Failed to parse array: {e}")
                                            break
                                j += 1
                        i = len(response)
                    else:
                        json_str = response[i:end_pos].strip()
                        print(f"Found ```json block, length: {len(json_str)}")
                        print(f"JSON preview: {json_str[:200]}")
                        try:
                            data = json.loads(json_str)
                            print(f"Successfully parsed JSON, type: {type(data)}")
                            
                            if isinstance(data, list) and len(data) > 0:
                                logger.info(f"Found ```json block with array of {len(data)} rows")
                                print(f"Converting to insert command with {len(data)} rows")
                                # Валидация: выравниваем количество колонок
                                data = self._normalize_table_data(data)
                                insert_command = {"action": "insert", "data": data, "start_row": 0, "start_col": 0}
                                self._execute_table_command(insert_command)
                                commands_found += 1
                                removed_positions.append((start_pos, end_pos + 3))
                            elif isinstance(data, dict) and 'action' in data:
                                logger.info(f"Found ```json block with action: {data.get('action')}")
                                self._execute_table_command(data)
                                commands_found += 1
                                removed_positions.append((start_pos, end_pos + 3))
                        except json.JSONDecodeError as e:
                            logger.warning(f"Failed to parse ```json block: {e}")
                            print(f"Failed to parse JSON: {e}")
                        i = end_pos + 3
                else:
                    i += 1
            
            # 3. Ищем голые JSON объекты - мощный парсер с учетом строк
            i = 0
            while i < len(response):
                if response[i] == '{':
                    brace_depth = 0
                    j = i
                    in_string = False
                    escape_next = False
                    
                    # Сканируем с учетом строк и экранирования
                    while j < len(response):
                        char = response[j]
                        
                        if escape_next:
                            escape_next = False
                            j += 1
                            continue
                        
                        if char == '\\' and in_string:
                            escape_next = True
                            j += 1
                            continue
                        
                        if char == '"':
                            in_string = not in_string
                        elif not in_string:
                            if char == '{':
                                brace_depth += 1
                            elif char == '}':
                                brace_depth -= 1
                                if brace_depth == 0:
                                    json_str = response[i:j+1]
                                    try:
                                        command = json.loads(json_str)
                                        if isinstance(command, dict) and 'action' in command:
                                            if command['action'] in ['set', 'insert']:
                                                logger.info(f"Found bare JSON object with action: {command['action']}")
                                                self._execute_table_command(command)
                                                commands_found += 1
                                                # Проверяем не пересекается ли с уже найденными
                                                overlaps = False
                                                for start, end in removed_positions:
                                                    if not (j+1 <= start or i >= end):
                                                        overlaps = True
                                                        break
                                                if not overlaps:
                                                    removed_positions.append((i, j+1))
                                        i = j + 1
                                        break
                                    except (json.JSONDecodeError, ValueError) as e:
                                        logger.debug(f"JSON parse failed at position {i}: {e}")
                        j += 1
                    
                    if brace_depth == 0 and j >= len(response):
                        break
                    elif brace_depth != 0:
                        i += 1
                elif response[i] == '[':
                    # Ищем массивы [[...], [...], ...]
                    bracket_depth = 0
                    j = i
                    in_string = False
                    escape_next = False
                    
                    while j < len(response):
                        char = response[j]
                        
                        if escape_next:
                            escape_next = False
                            j += 1
                            continue
                        
                        if char == '\\' and in_string:
                            escape_next = True
                            j += 1
                            continue
                        
                        if char == '"':
                            in_string = not in_string
                        elif not in_string:
                            if char == '[':
                                bracket_depth += 1
                            elif char == ']':
                                bracket_depth -= 1
                                if bracket_depth == 0:
                                    json_str = response[i:j+1]
                                    try:
                                        data = json.loads(json_str)
                                        # Проверяем что это массив массивов (таблица данных)
                                        if isinstance(data, list) and len(data) > 0:
                                            is_data_table = True
                                            for row in data[:min(3, len(data))]:  # Проверяем первые 3 строки
                                                if not isinstance(row, (list, tuple)):
                                                    is_data_table = False
                                                    break
                                            
                                            if is_data_table:
                                                logger.info(f"Found data array [[...], [...], ...] with {len(data)} rows, converting to insert command")
                                                insert_command = {"action": "insert", "data": data, "start_row": 0, "start_col": 0}
                                                self._execute_table_command(insert_command)
                                                commands_found += 1
                                                # Проверяем не пересекается ли с уже найденными
                                                overlaps = False
                                                for start, end in removed_positions:
                                                    if not (j+1 <= start or i >= end):
                                                        overlaps = True
                                                        break
                                                if not overlaps:
                                                    removed_positions.append((i, j+1))
                                        i = j + 1
                                        break
                                    except (json.JSONDecodeError, ValueError) as e:
                                        logger.debug(f"Array parse failed at position {i}: {e}")
                        j += 1
                    
                    if bracket_depth == 0 and j >= len(response):
                        break
                    elif bracket_depth != 0:
                        i += 1
                else:
                    i += 1
            
            logger.info(f"Total commands found and executed: {commands_found}")
            
            # Удаляем найденные JSON объекты из ответа (в обратном порядке)
            for start, end in sorted(set(removed_positions), reverse=True):
                response = response[:start] + response[end:]
            
            # DEBUG
            print(f"\n=== PROCESS RESULT ===")
            print(f"Commands found: {commands_found}")
            print(f"Positions to remove: {len(removed_positions)}")
            print(f"Final response length: {len(response)}")
            print(f"=== END PROCESS RESULT ===\n")
            
        except Exception as e:
            logger.warning(f"Error processing AI commands: {e}", exc_info=True)
            print(f"ERROR in _process_ai_commands: {e}")
        
        return response.strip()

    def _normalize_table_data(self, data: list) -> list:
        """
        Нормализует данные таблицы - выравнивает количество колонок.
        Если строки имеют разное количество колонок, приводит их к максимуму.
        """
        if not isinstance(data, list) or len(data) == 0:
            return data
        
        # Находим максимальное количество колонок
        max_cols = max(len(row) if isinstance(row, (list, tuple)) else 1 for row in data)
        print(f"Normalizing table data: {len(data)} rows, max columns: {max_cols}")
        
        normalized = []
        for row_idx, row in enumerate(data):
            if isinstance(row, (list, tuple)):
                # Приводим все значения к строкам и выравниваем количество колонок
                normalized_row = []
                for col_idx in range(max_cols):
                    if col_idx < len(row):
                        # Преобразуем в строку
                        value = str(row[col_idx]) if row[col_idx] is not None else ""
                        normalized_row.append(value)
                    else:
                        # Дополняем пустыми значениями
                        normalized_row.append("")
                normalized.append(normalized_row)
            else:
                # Если элемент не список, оборачиваем его
                normalized.append([str(row)] + [""] * (max_cols - 1))
        
        print(f"Normalization complete: {len(normalized)} rows, {max_cols} columns per row")
        return normalized

    def _execute_table_command(self, command: dict):
        """
        Выполняет команду для модификации таблицы.
        
        Поддерживаемые команды:
        - {"action": "set", "row": int, "col": int, "value": str}
        - {"action": "insert", "data": [[row_data]], "start_row": int, "start_col": int}
        """
        import logging
        logger = logging.getLogger(__name__)
        
        # DEBUG
        print(f"\n=== _execute_table_command called ===")
        print(f"Command: {command}")
        print(f"=== end debug ===\n")
        
        try:
            # Debug: проверяем наличие main_window
            if not self.main_window:
                logger.error("ERROR: main_window is None")
                print("ERROR: main_window is None")
                return
            
            # Debug: проверяем наличие tab_widget
            if not hasattr(self.main_window, 'tab_widget'):
                logger.error("ERROR: main_window has no tab_widget attribute")
                return
            
            spreadsheet_widget = self.main_window.tab_widget.currentWidget()
            
            # Debug: проверяем наличие текущего виджета
            if not spreadsheet_widget:
                logger.error("ERROR: currentWidget returned None")
                return
            
            # Debug: проверяем методы
            has_add_ai_data = hasattr(spreadsheet_widget, 'add_ai_data')
            has_set_cell = hasattr(spreadsheet_widget, 'set_cell_value')
            logger.info(f"Spreadsheet methods - add_ai_data: {has_add_ai_data}, set_cell_value: {has_set_cell}")
            
            if not has_add_ai_data and not has_set_cell:
                logger.error(f"ERROR: spreadsheet_widget missing both methods. Widget type: {type(spreadsheet_widget)}")
                return
            
            action = command.get('action', '').lower()
            logger.info(f"Processing action: {action}, command: {command}")
            
            if action == 'set':
                # Установка значения в одну ячейку
                row = command.get('row', 0)
                col = command.get('col', 0)
                value = command.get('value', '')
                
                if has_set_cell:
                    spreadsheet_widget.set_cell_value(row, col, value)
                    logger.info(f"SUCCESS: Set cell [{row},{col}] = {value}")
                else:
                    logger.error(f"ERROR: set_cell_value method not found")
                    
            elif action == 'insert':
                # Вставка множества значений
                data = command.get('data', [])
                start_row = command.get('start_row', 0)
                start_col = command.get('start_col', 0)
                
                logger.info(f"Attempting insert: {len(data) if data else 0} rows at [{start_row},{start_col}]")
                
                if data and has_add_ai_data:
                    result = spreadsheet_widget.add_ai_data(data, start_row, start_col)
                    logger.info(f"SUCCESS: Inserted {len(data)} rows at [{start_row},{start_col}], result: {result}")
                elif data and has_set_cell:
                    # Fallback: если нет add_ai_data, используем set_cell_value в цикле
                    logger.info(f"Using fallback set_cell_value loop for {len(data)} rows")
                    for row_idx, row_data in enumerate(data):
                        for col_idx, value in enumerate(row_data):
                            spreadsheet_widget.set_cell_value(start_row + row_idx, start_col + col_idx, str(value))
                    logger.info(f"SUCCESS: Inserted via fallback")
                else:
                    logger.error(f"ERROR: No data or add_ai_data method not available")
            else:
                logger.warning(f"Unknown action: {action}")
                    
        except Exception as e:
            import logging
            logging.error(f"ERROR executing table command: {e}", exc_info=True)


