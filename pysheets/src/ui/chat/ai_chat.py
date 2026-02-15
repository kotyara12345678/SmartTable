"""
Виджет для чата с ИИ - современный дизайн
"""

from typing import Optional
from PyQt5.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QTextEdit, 
                              QPushButton, QLabel, QScrollArea, QFrame,
                              QListWidget, QListWidgetItem)
from PyQt5.QtCore import Qt, QDateTime, QSize, QTimer, pyqtSignal, QPoint
from PyQt5.QtGui import QFont, QColor, QPainter, QPainterPath, QPixmap, QTextCursor
import threading


class AIChatWidget(QWidget):
    """Виджет чата с ИИ помощником с современным дизайном"""

    ai_response_ready = pyqtSignal(str)
    ai_response_done = pyqtSignal()
    agent_progress = pyqtSignal(str, int, int)  # message, current_step, total_steps
    agent_action = pyqtSignal(dict)  # action dict для выполнения в главном потоке
    
    def __init__(self, theme="dark", accent_color=None, parent=None, main_window=None):
        super().__init__(parent)
        self.theme = theme
        self.theme_mode = "light"
        self.accent_color = accent_color if accent_color else QColor("#DC143C")
        self.main_window = main_window
        
        self.message_history = []
        self._animation_timer = QTimer()
        self._animation_timer.timeout.connect(self._update_typing_animation)
        self._typing_dots = 0
        
        # AI Агент
        self._agent = None
        self._deferred_actions = []  # Отложенные действия (выполняются после анимации)
        self._animation_running = False  # Флаг: идёт ли анимация заполнения
        self._init_agent()
        
        self.init_ui()

        # === АВТОКОМПЛИТ @ ===
        self._autocomplete_popup = None
        self._at_start_pos = -1  # позиция символа @ в тексте
        self._last_mentioned_sheets = []  # упомянутые листы из последнего запроса
        self._init_autocomplete_popup()

        self.apply_theme()

        self.ai_response_ready.connect(self._on_ai_response)
        self.ai_response_done.connect(self._on_ai_done)
        self.agent_progress.connect(self._on_agent_progress)
        self.agent_action.connect(self._execute_agent_action)

    def init_ui(self):
        """Инициализация современного интерфейса"""
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        
        # === ЗАГОЛОВОК ===
        self._create_header(main_layout)
        
        # Разделитель с градиентом
        self._create_gradient_separator(main_layout)
        
        # === ОБЛАСТЬ СООБЩЕНИЙ ===
        self._create_chat_area(main_layout)
        
        # === ИНДИКАТОР НАБОРА ===
        self._create_typing_indicator(main_layout)
        
        # === ПАНЕЛЬ ВВОДА ===
        self._create_input_area(main_layout)
    
    def _create_header(self, main_layout):
        """Создание современного заголовка"""
        header = QWidget()
        header.setObjectName("chatHeader")
        header.setFixedHeight(56)
        header_layout = QHBoxLayout(header)
        header_layout.setContentsMargins(16, 0, 16, 0)
        header_layout.setSpacing(12)
        
        # AI аватар с иконкой
        avatar_container = QWidget()
        avatar_container.setFixedSize(40, 40)
        avatar_layout = QVBoxLayout(avatar_container)
        avatar_layout.setContentsMargins(0, 0, 0, 0)
        avatar_layout.setAlignment(Qt.AlignCenter)
        
        self.avatar_label = QLabel()
        self.avatar_label.setFixedSize(36, 36)
        self.avatar_label.setAlignment(Qt.AlignCenter)
        self.avatar_label.setObjectName("aiAvatar")
        avatar_layout.addWidget(self.avatar_label)
        
        header_layout.addWidget(avatar_container)
        
        # Текстовая информация
        text_container = QWidget()
        text_layout = QVBoxLayout(text_container)
        text_layout.setContentsMargins(0, 0, 0, 0)
        text_layout.setSpacing(0)
        
        self.header_title = QLabel("AI Assistant")
        self.header_title.setObjectName("headerTitle")
        header_font = self.header_title.font()
        header_font.setPointSize(13)
        header_font.setBold(True)
        self.header_title.setFont(header_font)
        text_layout.addWidget(self.header_title)
        
        self.header_status = QLabel("Ready to help")
        self.header_status.setObjectName("headerStatus")
        status_font = self.header_status.font()
        status_font.setPointSize(10)
        self.header_status.setFont(status_font)
        text_layout.addWidget(self.header_status)
        
        header_layout.addWidget(text_container)
        
        header_layout.addStretch()
        
        # Кнопка меню
        self.menu_button = QPushButton()
        self.menu_button.setFixedSize(32, 32)
        self.menu_button.setObjectName("menuButton")
        self.menu_button.setCursor(Qt.PointingHandCursor)
        header_layout.addWidget(self.menu_button)
        
        header.setLayout(header_layout)
        main_layout.addWidget(header)
    
    def _create_gradient_separator(self, main_layout):
        """Создание градиентного разделителя"""
        self.separator = QWidget()
        self.separator.setFixedHeight(3)
        main_layout.addWidget(self.separator)
    
    def _create_chat_area(self, main_layout):
        """Создание области сообщений"""
        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        scroll_area.setObjectName("chatScrollArea")
        scroll_area.setStyleSheet("""
            QScrollArea {
                border: none;
                background: transparent;
            }
            QScrollBar:vertical {
                width: 6px;
                margin: 4px;
                background: transparent;
            }
            QScrollBar::handle:vertical {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 3px;
                min-height: 24px;
            }
            QScrollBar::handle:vertical:hover {
                background: rgba(0, 0, 0, 0.4);
            }
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {
                border: none;
                background: none;
                height: 0px;
            }
            QScrollBar:horizontal {
                height: 0px;
            }
        """)
        
        self.chat_display = QWidget()
        self.chat_display.setObjectName("chatDisplay")
        self.chat_layout = QVBoxLayout(self.chat_display)
        self.chat_layout.setContentsMargins(16, 12, 16, 12)
        self.chat_layout.setSpacing(10)
        self.chat_layout.addStretch()
        
        scroll_area.setWidget(self.chat_display)
        main_layout.addWidget(scroll_area)
        
        self.scroll_area = scroll_area
    
    def _create_typing_indicator(self, main_layout):
        """Создание индикатора набора текста"""
        self.typing_widget = QWidget()
        self.typing_widget.setObjectName("typingWidget")
        self.typing_widget.setFixedHeight(0)
        self.typing_widget.setVisible(False)
        
        typing_layout = QHBoxLayout(self.typing_widget)
        typing_layout.setContentsMargins(16, 8, 16, 8)
        typing_layout.setSpacing(0)
        
        # AI аватар в индикаторе
        typing_avatar = QLabel("🤖")
        typing_avatar.setFixedSize(24, 24)
        typing_avatar.setAlignment(Qt.AlignCenter)
        typing_layout.addWidget(typing_avatar)
        
        typing_layout.addSpacing(8)
        
        # Текст "Печатает..." с анимацией
        self.typing_label = QLabel("AI is thinking")
        self.typing_label.setObjectName("typingLabel")
        typing_layout.addWidget(self.typing_label)
        
        self.typing_widget.setLayout(typing_layout)
        main_layout.addWidget(self.typing_widget)
    
    def _create_input_area(self, main_layout):
        """Создание современной области ввода"""
        input_container = QWidget()
        input_container.setObjectName("inputContainer")
        input_container.setFixedHeight(80)
        input_layout = QVBoxLayout(input_container)
        input_layout.setContentsMargins(12, 8, 12, 12)
        input_layout.setSpacing(8)
        
        # Поле ввода с rounded corners
        input_row = QHBoxLayout()
        input_row.setSpacing(10)
        
        self.input_field = QTextEdit()
        self.input_field.setObjectName("inputField")
        self.input_field.setMaximumHeight(60)
        self.input_field.setMinimumHeight(44)
        self.input_field.setPlaceholderText("Ask AI anything...")
        self.input_field.keyPressEvent = self._input_key_press
        
        input_row.addWidget(self.input_field, 1)
        
        # Кнопка отправки
        send_container = QWidget()
        send_layout = QVBoxLayout(send_container)
        send_layout.setContentsMargins(0, 0, 0, 0)
        send_layout.setAlignment(Qt.AlignBottom)
        
        self.send_button = QPushButton()
        self.send_button.setFixedSize(48, 48)
        self.send_button.setObjectName("sendButton")
        self.send_button.setCursor(Qt.PointingHandCursor)
        self.send_button.clicked.connect(self.send_message)
        
        send_icon_layout = QHBoxLayout(self.send_button)
        send_icon_layout.setContentsMargins(0, 0, 0, 0)
        send_icon_layout.setAlignment(Qt.AlignCenter)
        
        self.send_icon = QLabel()
        self.send_icon.setFixedSize(20, 20)
        self.send_icon.setObjectName("sendIcon")
        send_icon_layout.addWidget(self.send_icon)
        
        send_layout.addWidget(self.send_button)
        
        input_row.addWidget(send_container)
        
        input_layout.addLayout(input_row)
        
        input_container.setLayout(input_layout)
        main_layout.addWidget(input_container)

    def _update_typing_animation(self):
        """Обновление анимации точек при наборе"""
        self._typing_dots = (self._typing_dots + 1) % 4
        dots = "" + ("•" * self._typing_dots) + (" " * (3 - self._typing_dots))
        if hasattr(self, 'typing_label') and self.typing_label:
            self.typing_label.setText(f"AI is thinking{dots}")

    def _input_key_press(self, event):
        """Обработка горячих клавиш в поле ввода"""
        # Если автокомплит открыт — обрабатываем навигацию
        if self._autocomplete_popup is not None and self._autocomplete_popup.isVisible():
            if event.key() == Qt.Key_Down:
                row = self._autocomplete_popup.currentRow()
                if row < self._autocomplete_popup.count() - 1:
                    self._autocomplete_popup.setCurrentRow(row + 1)
                return
            elif event.key() == Qt.Key_Up:
                row = self._autocomplete_popup.currentRow()
                if row > 0:
                    self._autocomplete_popup.setCurrentRow(row - 1)
                return
            elif event.key() in (Qt.Key_Return, Qt.Key_Tab):
                self._accept_autocomplete()
                return
            elif event.key() == Qt.Key_Escape:
                self._hide_autocomplete()
                return
        
        if event.key() == Qt.Key_Return:
            if event.modifiers() == Qt.ShiftModifier:
                QTextEdit.keyPressEvent(self.input_field, event)
            else:
                self.send_message()
        else:
            QTextEdit.keyPressEvent(self.input_field, event)
            # После ввода символа — проверяем нужен ли автокомплит
            QTimer.singleShot(10, self._check_autocomplete)

    # ============ АВТОКОМПЛИТ @ ============
    
    def _init_autocomplete_popup(self):
        """Создаёт popup-виджет автокомплита для @-упоминаний"""
        self._autocomplete_popup = QListWidget(self)
        self._autocomplete_popup.setObjectName("autocompletePopup")
        # Не используем window flags — просто дочерний виджет с raise
        self._autocomplete_popup.setFocusPolicy(Qt.NoFocus)
        self._autocomplete_popup.setMaximumHeight(200)
        self._autocomplete_popup.setMinimumWidth(200)
        self._autocomplete_popup.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self._autocomplete_popup.itemClicked.connect(self._on_autocomplete_clicked)
        self._autocomplete_popup.hide()
        print(f"[AUTOCOMPLETE] popup created: {self._autocomplete_popup}")
        
        # Стили popup — будут обновлены в apply_theme()
        self._update_autocomplete_style()
    
    def _update_autocomplete_style(self):
        """Обновляет стили popup автокомплита с учётом текущего акцентного цвета и темы"""
        if self._autocomplete_popup is None:
            return
        
        accent_hex = self.accent_color.name()
        accent_hover = self.accent_color.lighter(130).name()
        
        # Определяем тему
        from PyQt5.QtGui import QPalette
        from PyQt5.QtWidgets import QApplication
        
        actual_theme = self.theme
        if self.theme == "system":
            actual_theme = "light"
            app = QApplication.instance()
            if app:
                palette = app.palette()
                text_color = palette.color(QPalette.Text)
                text_brightness = (text_color.red() + text_color.green() + text_color.blue()) / 3
                actual_theme = "dark" if text_brightness > 128 else "light"
        elif self.theme == "gallery":
            actual_theme = self.theme_mode
        
        if actual_theme == "dark":
            bg = "#2a2a35"
            border = "#4a4a55"
            text_color = "#e0e0e0"
            hover_bg = "#3a3a45"
        else:
            bg = "#ffffff"
            border = "#d2d2d7"
            text_color = "#1d1d1f"
            hover_bg = "#f0f0f5"
        
        self._autocomplete_popup.setStyleSheet(f"""
            QListWidget {{
                background-color: {bg};
                border: 1px solid {border};
                border-radius: 8px;
                padding: 4px;
                font-size: 13px;
                color: {text_color};
            }}
            QListWidget::item {{
                padding: 8px 12px;
                border-radius: 4px;
            }}
            QListWidget::item:hover {{
                background-color: {hover_bg};
            }}
            QListWidget::item:selected {{
                background-color: {accent_hex};
                color: white;
            }}
        """)
    
    def _get_sheet_names(self) -> list:
        """Получает список имён всех листов из tab_widget"""
        if not self.main_window or not self.main_window.tab_widget:
            return []
        tab_widget = self.main_window.tab_widget
        names = []
        for i in range(tab_widget.count()):
            names.append(tab_widget.tabText(i))
        return names
    
    def _check_autocomplete(self):
        """Проверяет, нужно ли показать автокомплит"""
        if self._autocomplete_popup is None:
            print("[AUTOCOMPLETE] no popup")
            return
        
        cursor = self.input_field.textCursor()
        text = self.input_field.toPlainText()
        pos = cursor.position()
        
        print(f"[AUTOCOMPLETE] text={repr(text)}, pos={pos}")
        
        if pos == 0:
            self._hide_autocomplete()
            return
        
        # Ищем последний @ перед курсором
        text_before = text[:pos]
        at_idx = text_before.rfind('@')
        
        if at_idx == -1:
            self._hide_autocomplete()
            return
        
        # Проверяем что между @ и курсором нет пробелов (или есть только часть имени)
        query = text_before[at_idx + 1:]
        
        # Если есть пробел после завершённого имени — скрываем
        # Но разрешаем пробелы внутри имени листа (напр. "Лист 1")
        sheet_names = self._get_sheet_names()
        
        print(f"[AUTOCOMPLETE] at_idx={at_idx}, query={repr(query)}, sheets={sheet_names}")
        
        # Фильтруем по запросу
        query_lower = query.lower()
        filtered = [name for name in sheet_names if query_lower in name.lower() or not query]
        
        print(f"[AUTOCOMPLETE] filtered={filtered}")
        
        if not filtered:
            self._hide_autocomplete()
            return
        
        self._at_start_pos = at_idx
        self._show_autocomplete(filtered)
    
    def _show_autocomplete(self, items: list):
        """Показывает popup с вариантами"""
        if self._autocomplete_popup is None:
            return
        
        print(f"[AUTOCOMPLETE] _show_autocomplete: {len(items)} items")
        
        self._autocomplete_popup.clear()
        
        for name in items:
            item = QListWidgetItem(f"\U0001F4CB {name}")
            item.setData(Qt.UserRole, name)  # сохраняем чистое имя
            self._autocomplete_popup.addItem(item)
        
        if self._autocomplete_popup.count() > 0:
            self._autocomplete_popup.setCurrentRow(0)
        
        # Позиционируем над полем ввода (относительно self)
        input_pos = self.input_field.mapTo(self, QPoint(0, 0))
        popup_height = min(len(items) * 36 + 10, 200)
        
        self._autocomplete_popup.setFixedHeight(popup_height)
        self._autocomplete_popup.setFixedWidth(max(200, self.input_field.width()))
        self._autocomplete_popup.move(
            input_pos.x(),
            input_pos.y() - popup_height - 4
        )
        self._autocomplete_popup.show()
        self._autocomplete_popup.raise_()
        print(f"[AUTOCOMPLETE] popup shown at ({input_pos.x()}, {input_pos.y() - popup_height - 4})")
        
        # Возвращаем фокус на поле ввода
        self.input_field.setFocus()
    
    def _hide_autocomplete(self):
        """Скрывает popup автокомплита"""
        if self._autocomplete_popup is not None:
            self._autocomplete_popup.hide()
        self._at_start_pos = -1
    
    def _on_autocomplete_clicked(self, item):
        """Обработка клика по элементу автокомплита"""
        self._accept_autocomplete()
    
    def _accept_autocomplete(self):
        """Принимает выбранный вариант автокомплита"""
        if self._autocomplete_popup is None or not self._autocomplete_popup.currentItem():
            self._hide_autocomplete()
            return
        
        selected = self._autocomplete_popup.currentItem().data(Qt.UserRole)
        if not selected:
            self._hide_autocomplete()
            return
        
        # Заменяем @запрос на @ИмяЛиста
        text = self.input_field.toPlainText()
        cursor = self.input_field.textCursor()
        pos = cursor.position()
        
        if self._at_start_pos >= 0:
            # Заменяем от @ до текущей позиции
            new_text = text[:self._at_start_pos] + f"@{selected} " + text[pos:]
            self.input_field.setPlainText(new_text)
            
            # Ставим курсор после вставленного имени
            new_cursor = self.input_field.textCursor()
            new_pos = self._at_start_pos + len(selected) + 2  # @ + name + space
            new_cursor.setPosition(min(new_pos, len(new_text)))
            self.input_field.setTextCursor(new_cursor)
        
        self._hide_autocomplete()
    
    def _extract_sheet_data_by_name(self, sheet_name: str) -> Optional[str]:
        """Извлекает данные конкретного листа по имени"""
        try:
            if not self.main_window or not self.main_window.tab_widget:
                return None
            
            tab_widget = self.main_window.tab_widget
            
            # Ищем лист по имени
            target_widget = None
            for i in range(tab_widget.count()):
                if tab_widget.tabText(i) == sheet_name:
                    target_widget = tab_widget.widget(i)
                    break
            
            if not target_widget or not hasattr(target_widget, 'cells'):
                return None
            
            cells = target_widget.cells
            if not cells:
                return None
            
            lines = []
            max_cols = len(cells[0]) if cells else 0
            if max_cols == 0:
                return None
            
            header = " | ".join([chr(65 + i) for i in range(min(max_cols, 26))])
            lines.append(header)
            lines.append("-" * len(header))
            
            has_data = False
            for row_idx, row in enumerate(cells[:50]):  # до 50 строк
                row_data = []
                for col_idx in range(min(max_cols, 26)):
                    cell = row[col_idx] if col_idx < len(row) else None
                    if cell and hasattr(cell, 'value'):
                        value = cell.value
                    else:
                        value = None
                    
                    if value is not None:
                        cell_str = str(value)[:20]
                        has_data = True
                    else:
                        cell_str = ""
                    row_data.append(cell_str)
                
                if any(row_data):
                    lines.append(" | ".join(row_data))
            
            if not has_data or len(lines) <= 2:
                return None
            
            return "\n".join(lines)
            
        except Exception as e:
            import logging
            logging.exception(f"Failed to extract sheet data for '{sheet_name}': {e}")
            return None
    
    def _parse_sheet_mentions(self, message: str) -> tuple:
        """Парсит @ИмяЛиста из сообщения.
        
        Returns:
            tuple: (clean_message, list_of_sheet_names)
        """
        import re
        sheet_names = self._get_sheet_names()
        mentioned = []
        clean = message
        
        # Сортируем по длине (сначала длинные) чтобы "Лист 10" матчился раньше "Лист 1"
        for name in sorted(sheet_names, key=len, reverse=True):
            pattern = f"@{re.escape(name)}"
            if re.search(pattern, clean, re.IGNORECASE):
                mentioned.append(name)
                clean = re.sub(pattern, f"[{name}]", clean, flags=re.IGNORECASE)
        
        return clean.strip(), mentioned

    def apply_theme(self):
        """Применяет современную тему и цвета к чату"""
        from PyQt5.QtGui import QPalette
        from PyQt5.QtWidgets import QApplication
        
        # Определяем реальную тему
        actual_theme = self.theme
        
        if self.theme == "system":
            actual_theme = "light"
            app = QApplication.instance()
            if app:
                palette = app.palette()
                text_color = palette.color(QPalette.Text)
                text_brightness = (text_color.red() + text_color.green() + text_color.blue()) / 3
                actual_theme = "dark" if text_brightness > 128 else "light"
        elif self.theme == "gallery":
            actual_theme = self.theme_mode
        
        accent_hex = self.accent_color.name()
        accent_light = self.accent_color.lighter(140).name()
        accent_hover = self.accent_color.lighter(115).name()
        accent_pressed = self.accent_color.darker(110).name()
        
        if actual_theme == "dark":
            # Тёмная тема
            header_bg = "#1a1a1f"
            header_title_color = "#ffffff"
            header_status_color = "#8b8b8b"
            chat_bg = "#121214"
            input_bg = "#1e1e24"
            input_border = "#2a2a35"
            input_focus = accent_hex
            user_msg_bg = accent_hex
            user_msg_color = "#ffffff"
            ai_msg_bg = "#1e1e24"
            ai_msg_color = "#e0e0e0"
            ai_avatar_bg = "#2a2a35"
            typing_bg = "#1e1e24"
            typing_color = "#8b8b8b"
            menu_icon_color = "#8b8b8b"
            
            separator_gradient = f"background: linear-gradient(90deg, {accent_hex} 0%, {accent_light} 100%);"
            
        else:  # light theme
            # Светлая тема
            header_bg = "#f5f5f7"
            header_title_color = "#1d1d1f"
            header_status_color = "#86868b"
            chat_bg = "#ffffff"
            input_bg = "#f5f5f7"
            input_border = "#d2d2d7"
            input_focus = accent_hex
            user_msg_bg = accent_hex
            user_msg_color = "#ffffff"
            ai_msg_bg = "#f5f5f7"
            ai_msg_color = "#1d1d1f"
            ai_avatar_bg = "#e8e8ed"
            typing_bg = "#f5f5f7"
            typing_color = "#86868b"
            menu_icon_color = "#86868b"
            
            separator_gradient = f"background: linear-gradient(90deg, {accent_hex} 0%, {accent_light} 100%);"
        
        # Стили для заголовка
        self.setStyleSheet(f"""
            #chatHeader {{
                background-color: {header_bg};
                border: none;
            }}
            #headerTitle {{
                color: {header_title_color};
            }}
            #headerStatus {{
                color: {header_status_color};
            }}
            #menuButton {{
                background-color: transparent;
                border: none;
                border-radius: 6px;
                color: {menu_icon_color};
                font-size: 14px;
            }}
            #menuButton:hover {{
                background-color: rgba(128, 128, 128, 0.15);
            }}
        """)
        
        # Аватар AI
        self.avatar_label.setStyleSheet(f"""
            background-color: {ai_avatar_bg};
            border-radius: 18px;
            font-size: 16px;
            color: {header_title_color};
        """)
        self.avatar_label.setText("🤖")
        
        # Область чата
        self.chat_display.setStyleSheet(f"""
            background-color: {chat_bg};
            border: none;
        """)
        
        # Разделитель с градиентом
        self.separator.setStyleSheet(separator_gradient)
        
        # Индикатор набора
        self.typing_widget.setStyleSheet(f"""
            #typingWidget {{
                background-color: {typing_bg};
                border-radius: 12px;
            }}
            #typingLabel {{
                color: {typing_color};
                font-size: 12px;
            }}
        """)
        
        # Поле ввода
        self.input_field.setStyleSheet(f"""
            QTextEdit {{
                background-color: {input_bg};
                border: 1px solid {input_border};
                border-radius: 12px;
                padding: 12px 14px;
                color: {header_title_color};
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                font-size: 13px;
            }}
            QTextEdit:focus {{
                border: 2px solid {input_focus};
            }}
            QTextEdit::placeholder {{
                color: {header_status_color};
            }}
        """)
        
        # Кнопка отправки
        self.send_button.setStyleSheet(f"""
            QPushButton {{
                background-color: {accent_hex};
                border: none;
                border-radius: 12px;
            }}
            QPushButton:hover {{
                background-color: {accent_hover};
            }}
            QPushButton:pressed {{
                background-color: {accent_pressed};
            }}
            QPushButton:disabled {{
                background-color: {input_border};
            }}
        """)
        
        # Иконка отправки
        self._draw_send_icon("#ffffff")
        
        # Контейнер ввода
        input_container = self.findChild(QWidget, "inputContainer")
        if input_container:
            input_container.setStyleSheet(f"""
                background-color: {chat_bg};
                border-top: 1px solid {input_border};
            """)
        
        # Сохраняем цвета для сообщений
        self.user_msg_color = user_msg_color
        self.user_msg_bg = user_msg_bg
        self.ai_msg_color = ai_msg_color
        self.ai_msg_bg = ai_msg_bg
        
        # Обновляем стили автокомплита
        self._update_autocomplete_style()
        
        # Обновляем стили автокомплита
        if self._autocomplete_popup:
            if actual_theme == "dark":
                self._autocomplete_popup.setStyleSheet(f"""
                    QListWidget {{
                        background-color: #2a2a35;
                        border: 1px solid #4a4a55;
                        border-radius: 8px;
                        padding: 4px;
                        font-size: 13px;
                        color: #e0e0e0;
                    }}
                    QListWidget::item {{
                        padding: 8px 12px;
                        border-radius: 4px;
                    }}
                    QListWidget::item:hover {{
                        background-color: #3a3a45;
                    }}
                    QListWidget::item:selected {{
                        background-color: {accent_hex};
                        color: white;
                    }}
                """)
            else:
                self._autocomplete_popup.setStyleSheet(f"""
                    QListWidget {{
                        background-color: #ffffff;
                        border: 1px solid #d2d2d7;
                        border-radius: 8px;
                        padding: 4px;
                        font-size: 13px;
                        color: #1d1d1f;
                    }}
                    QListWidget::item {{
                        padding: 8px 12px;
                        border-radius: 4px;
                    }}
                    QListWidget::item:hover {{
                        background-color: #f5f5f7;
                    }}
                    QListWidget::item:selected {{
                        background-color: {accent_hex};
                        color: white;
                    }}
                """)
        
    def _draw_send_icon(self, color: str = "#ffffff"):
        """Рисует иконку отправки"""
        pixmap = QPixmap(20, 20)
        pixmap.fill(Qt.transparent)
        
        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.Antialiasing)
        
        painter.setPen(Qt.NoPen)
        qcolor = QColor(color)
        painter.setBrush(qcolor)
        
        path = QPainterPath()
        path.moveTo(4, 4)
        path.lineTo(16, 10)
        path.lineTo(4, 16)
        path.closeSubpath()
        
        painter.fillPath(path, qcolor)
        painter.end()
        
        self.send_icon.setPixmap(pixmap)

    def update_theme(self, theme: str, accent_color: QColor, theme_mode: str = "light"):
        """Обновляет тему и цвета"""
        self.theme = theme
        self.accent_color = accent_color
        self.theme_mode = theme_mode
        self.apply_theme()
        self._rebuild_chat()
    
    def _rebuild_chat(self):
        """Перестраивает все сообщения в чате с текущими цветами"""
        self.apply_theme()
        
        # Сохраняем историю
        history = self.message_history.copy()
        
        # Очищаем чат (удаляем все виджеты кроме stretch)
        while self.chat_layout.count() > 1:
            item = self.chat_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        self.message_history.clear()
        
        # Пересоздаём все сообщения
        for msg_type, message, time in history:
            if msg_type == "user":
                self._create_message_widget(message, time, is_user=True)
            else:
                self._create_message_widget(message, time, is_user=False)
        
        # Автоскролл вниз
        QTimer.singleShot(0, self._scroll_to_bottom)
    
    def _scroll_to_bottom(self):
        """Прокрутка к последнему сообщению"""
        scroll_bar = self.scroll_area.verticalScrollBar()
        scroll_bar.setValue(scroll_bar.maximum())
    
    def _create_message_widget(self, message: str, time: str, is_user: bool = True):
        """Создаёт виджет сообщения с современным дизайном"""
        msg_widget = QWidget()
        msg_widget.setObjectName("messageWidget")
        layout = QHBoxLayout(msg_widget)
        layout.setContentsMargins(0, 4, 0, 4)
        layout.setSpacing(8)
        
        # Экранируем HTML
        clean_message = message.replace('<', '<').replace('>', '>').replace('\n', '<br>')
        
        if is_user:
            # Сообщение пользователя - справа
            layout.addStretch(1)
            
            # Контейнер сообщения
            bubble = QWidget()
            bubble.setObjectName("userBubble")
            bubble_layout = QVBoxLayout(bubble)
            bubble_layout.setContentsMargins(14, 10, 14, 10)
            bubble_layout.setSpacing(4)
            
            # Время
            time_label = QLabel(time)
            time_label.setObjectName("messageTime")
            bubble_layout.addWidget(time_label, 0, Qt.AlignRight)
            
            # Текст сообщения
            text_label = QLabel(clean_message)
            text_label.setObjectName("messageText")
            text_label.setWordWrap(True)
            text_label.setTextFormat(Qt.RichText)
            bubble_layout.addWidget(text_label, 0)
            
            layout.addWidget(bubble, 0, Qt.AlignRight)
            
        else:
            # Сообщение AI - слева с аватаром
            # Аватар
            avatar = QLabel("🤖")
            avatar.setFixedSize(28, 28)
            avatar.setAlignment(Qt.AlignCenter)
            avatar.setObjectName("aiAvatar")
            layout.addWidget(avatar)
            
            # Контейнер сообщения
            bubble = QWidget()
            bubble.setObjectName("aiBubble")
            bubble_layout = QVBoxLayout(bubble)
            bubble_layout.setContentsMargins(14, 10, 14, 10)
            bubble_layout.setSpacing(4)
            
            # Время
            time_label = QLabel(time)
            time_label.setObjectName("messageTime")
            bubble_layout.addWidget(time_label, 0, Qt.AlignLeft)
            
            # Текст сообщения
            text_label = QLabel(clean_message)
            text_label.setObjectName("messageText")
            text_label.setWordWrap(True)
            text_label.setTextFormat(Qt.RichText)
            bubble_layout.addWidget(text_label, 0)
            
            layout.addWidget(bubble, 0, Qt.AlignLeft)
            layout.addStretch(1)
        
        # Применяем стили к сообщению
        self._style_message_widget(msg_widget, is_user)
        
        # Вставляем перед stretch
        self.chat_layout.insertWidget(self.chat_layout.count() - 1, msg_widget)
    
    def _style_message_widget(self, widget: QWidget, is_user: bool):
        """Применяет стили к виджету сообщения"""
        if is_user:
            widget.setStyleSheet(f"""
                #userBubble {{
                    background-color: {self.user_msg_bg};
                    border-radius: 16px;
                    border-top-right-radius: 4px;
                }}
                #messageTime {{
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 10px;
                }}
                #messageText {{
                    color: {self.user_msg_color};
                    font-size: 13px;
                    line-height: 1.4;
                }}
                #aiAvatar {{
                    background-color: transparent;
                    font-size: 12px;
                }}
            """)
        else:
            widget.setStyleSheet(f"""
                #aiBubble {{
                    background-color: {self.ai_msg_bg};
                    border-radius: 16px;
                    border-top-left-radius: 4px;
                }}
                #messageTime {{
                    color: {self.ai_msg_color};
                    font-size: 10px;
                    opacity: 0.7;
                }}
                #messageText {{
                    color: {self.ai_msg_color};
                    font-size: 13px;
                    line-height: 1.4;
                }}
                #aiAvatar {{
                    background-color: {self.ai_msg_bg};
                    border-radius: 14px;
                    font-size: 12px;
                }}
            """)
    
    def _show_typing_indicator(self):
        """Показывает индикатор набора"""
        self.typing_widget.setVisible(True)
        self.typing_widget.setFixedHeight(36)
        self._animation_timer.start(500)
        
    def _hide_typing_indicator(self):
        """Скрывает индикатор набора"""
        self._animation_timer.stop()
        self.typing_widget.setVisible(False)
        self.typing_widget.setFixedHeight(0)

    def send_message(self):
        """Отправка сообщения"""
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

        # Показываем индикатор набора
        self._show_typing_indicator()

    def _init_agent(self):
        """Инициализация AI Агента"""
        try:
            from pysheets.src.core.ai.agent import AIAgent
            self._agent = AIAgent(get_table_state=self._extract_table_data)
            
            # Callback для прогресса — отправляем через сигнал в главный поток
            def progress_cb(msg, step, total):
                self.agent_progress.emit(msg, step, total)
            
            # Callback для действий — отправляем через сигнал в главный поток
            def action_cb(action_dict):
                self.agent_action.emit(action_dict)
            
            self._agent.set_progress_callback(progress_cb)
            self._agent.set_action_callback(action_cb)
        except Exception as e:
            import logging
            logging.warning(f"Failed to init AI Agent: {e}")
            self._agent = None

    def _send_to_ai(self, message: str):
        """Выполняет запрос к модели в отдельном потоке. Если запрос сложный — использует AI Агента."""
        try:
            # Парсим @-упоминания листов
            clean_message, mentioned_sheets = self._parse_sheet_mentions(message)
            
            # Сохраняем упомянутые листы для _process_ai_commands
            self._last_mentioned_sheets = mentioned_sheets
            
            # Проверяем, нужен ли агент
            if self._agent and self._agent.is_agent_request(clean_message):
                self._run_agent(clean_message)
                return
            
            from pysheets.src.core.ai.chat import RequestMessage
            
            # Собираем контекст из упомянутых листов
            sheets_context = ""
            if mentioned_sheets:
                for sheet_name in mentioned_sheets:
                    sheet_data = self._extract_sheet_data_by_name(sheet_name)
                    if sheet_data:
                        sheets_context += f"\n\n=== Данные листа '{sheet_name}' ===\n{sheet_data}"
                
                # Добавляем инструкцию о целевых листах
                if len(mentioned_sheets) >= 1:
                    sheet_list = ', '.join(mentioned_sheets)
                    sheets_context += f"\n\nДоступные листы: {sheet_list}"
                    sheets_context += "\nЕсли нужно заполнить конкретный лист, используй маркер [SHEET:ИмяЛиста] перед JSON блоком."
                    sheets_context += "\nЕсли нужно заполнить несколько листов, используй отдельный [SHEET:ИмяЛиста] + ```json ... ``` для каждого."
            
            # Если нет упоминаний — берём текущий лист как раньше
            if not sheets_context and self.main_window:
                table_data = self._extract_table_data()
                if table_data:
                    sheets_context = f"\n\n{table_data}"
            
            final_message = clean_message
            if sheets_context:
                final_message = f"{sheets_context}\n\nUser request: {clean_message}"
            
            resp = RequestMessage(final_message)
            if resp is None:
                resp = "Ошибка: пустой ответ от модели"
        except Exception as e:
            resp = f"Ошибка: {e}"

        self.ai_response_ready.emit(str(resp))
        self.ai_response_done.emit()

    def _run_agent(self, message: str):
        """Запускает AI Агента для сложного запроса"""
        try:
            import logging
            logger = logging.getLogger(__name__)
            
            # 1. Планирование
            plan = self._agent.plan(message)
            
            if not plan:
                self.ai_response_ready.emit("❌ Не удалось составить план. Попробуйте переформулировать запрос.")
                self.ai_response_done.emit()
                return
            
            # 2. Выполняем план (без промежуточных сообщений)
            result = self._agent.execute_plan(plan)
            
            # 3. Одно финальное сообщение
            self.ai_response_ready.emit(f"✅ Готово!\n{result}")
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            self.ai_response_ready.emit(f"❌ Ошибка агента: {e}")
        
        self.ai_response_done.emit()

    def _on_agent_progress(self, message: str, step: int, total: int):
        """Обработка прогресса агента — обновляем индикатор"""
        if hasattr(self, 'typing_label') and self.typing_label:
            progress = f"[{step}/{total}]" if total > 0 else ""
            self.typing_label.setText(f"🤖 {progress} {message}")

    def _execute_agent_action(self, action_dict: dict):
        """Выполняет действие агента над таблицей (в главном потоке)"""
        import logging
        logger = logging.getLogger(__name__)
        
        # Если анимация заполнения ещё идёт — откладываем действие (кроме fill_table)
        action_type = action_dict.get('type', '')
        if self._animation_running and action_type != 'fill_table':
            logger.info(f"Агент: откладываем действие '{action_type}' до завершения анимации")
            self._deferred_actions.append(action_dict)
            return
        
        if not self.main_window or not self.main_window.tab_widget:
            logger.warning("Нет главного окна для выполнения действия агента")
            return
        
        spreadsheet = self.main_window.tab_widget.currentWidget()
        if not spreadsheet or not hasattr(spreadsheet, 'set_cell_value'):
            logger.warning("Нет активной таблицы")
            return
        
        action_type = action_dict.get('type', '')
        
        try:
            if action_type == 'fill_table':
                data = action_dict.get('data', [])
                # Используем анимированное заполнение
                self._fill_table_with_data(data)
                logger.info(f"Агент: заполнение {len(data)} строк (анимация)")
            
            elif action_type == 'set_cell':
                col_letter = action_dict.get('column', 'A').upper()
                row_num = int(action_dict.get('row', 1))
                value = action_dict.get('value', '')
                col_idx = ord(col_letter) - ord('A')
                row_idx = row_num - 1
                if 0 <= col_idx < spreadsheet.columnCount() and 0 <= row_idx < spreadsheet.rowCount():
                    spreadsheet.set_cell_value(row_idx, col_idx, str(value))
                    # Анимация изменения
                    self._animate_update_cells(spreadsheet, [(row_idx, col_idx)])
                logger.info(f"Агент: установлено {col_letter}{row_num} = {value}")
            
            elif action_type == 'clear_cell':
                col_letter = action_dict.get('column', 'A').upper()
                row_num = int(action_dict.get('row', 1))
                col_idx = ord(col_letter) - ord('A')
                row_idx = row_num - 1
                if 0 <= col_idx < spreadsheet.columnCount() and 0 <= row_idx < spreadsheet.rowCount():
                    # Анимация удаления
                    self._animate_clear_cells(spreadsheet, [(row_idx, col_idx)])
            
            elif action_type == 'clear_column':
                col_letter = action_dict.get('column', 'A').upper()
                col_idx = ord(col_letter) - ord('A')
                if 0 <= col_idx < spreadsheet.columnCount():
                    cells_to_clear = []
                    for row in range(spreadsheet.rowCount()):
                        cell = spreadsheet.get_cell(row, col_idx) if hasattr(spreadsheet, 'get_cell') else None
                        if cell and cell.value:
                            cells_to_clear.append((row, col_idx))
                    if cells_to_clear:
                        self._animate_clear_cells(spreadsheet, cells_to_clear)
            
            elif action_type == 'clear_all':
                cells_to_clear = []
                for row in range(spreadsheet.rowCount()):
                    for col in range(spreadsheet.columnCount()):
                        cell = spreadsheet.get_cell(row, col) if hasattr(spreadsheet, 'get_cell') else None
                        if cell and cell.value:
                            cells_to_clear.append((row, col))
                if cells_to_clear:
                    self._animate_clear_cells(spreadsheet, cells_to_clear)
            
            elif action_type == 'sort_column':
                col_letter = action_dict.get('column', 'A').upper()
                order = action_dict.get('order', 'asc')
                col_idx = ord(col_letter) - ord('A')
                if hasattr(spreadsheet, 'sortItems'):
                    from PyQt5.QtCore import Qt
                    sort_order = Qt.AscendingOrder if order == 'asc' else Qt.DescendingOrder
                    spreadsheet.sortItems(col_idx, sort_order)
                    logger.info(f"Агент: отсортировано по {col_letter} ({order})")
            
            elif action_type == 'format_cells':
                conditions = action_dict.get('conditions', [])
                self._apply_format_conditions(spreadsheet, conditions)
            
            elif action_type == 'color_column':
                col_letter = action_dict.get('column', 'A').upper()
                bg_color = action_dict.get('bg_color', None)
                text_color = action_dict.get('text_color', None)
                bold = action_dict.get('bold', False)
                col_idx = ord(col_letter) - ord('A')
                if 0 <= col_idx < spreadsheet.columnCount():
                    cells_to_color = []
                    for row in range(spreadsheet.rowCount()):
                        item = spreadsheet.item(row, col_idx)
                        if not item or not item.text():
                            continue
                        cells_to_color.append((row, col_idx, bg_color, text_color, bold))
                    if cells_to_color:
                        self._animate_color_cells(spreadsheet, cells_to_color)
                    logger.info(f"Агент: окрашен столбец {col_letter}")
            
            elif action_type == 'color_cells':
                cells_list = action_dict.get('cells', [])
                # Конвертируем в формат для анимации
                cells_to_color = []
                for cell_info in cells_list:
                    try:
                        cl = cell_info.get('column', 'A').upper()
                        rn = int(cell_info.get('row', 1))
                        ci = ord(cl) - ord('A')
                        ri = rn - 1
                        bg = cell_info.get('bg_color', None)
                        tc = cell_info.get('text_color', None)
                        bl = cell_info.get('bold', False)
                        cells_to_color.append((ri, ci, bg, tc, bl))
                    except Exception:
                        pass
                if cells_to_color:
                    self._animate_color_cells(spreadsheet, cells_to_color)
                logger.info(f"Агент: окрашено {len(cells_list)} ячеек")
            
            elif action_type == 'color_row':
                row_num = int(action_dict.get('row', 1))
                bg_color = action_dict.get('bg_color', None)
                text_color = action_dict.get('text_color', None)
                bold = action_dict.get('bold', False)
                row_idx = row_num - 1
                if 0 <= row_idx < spreadsheet.rowCount():
                    cells_to_color = []
                    for col in range(spreadsheet.columnCount()):
                        item = spreadsheet.item(row_idx, col)
                        if not item or not item.text():
                            continue
                        cells_to_color.append((row_idx, col, bg_color, text_color, bold))
                    if cells_to_color:
                        self._animate_color_cells(spreadsheet, cells_to_color)
                    logger.info(f"Агент: окрашена строка {row_num}")
            
            elif action_type == 'color_range':
                start_col = action_dict.get('start_col', '').upper()
                start_row = int(action_dict.get('start_row', 1))
                end_col = action_dict.get('end_col', '').upper()
                end_row = int(action_dict.get('end_row', 1))
                bg_color = action_dict.get('bg_color', None)
                text_color = action_dict.get('text_color', None)
                bold = action_dict.get('bold', False)
                if start_col and end_col:
                    col1 = ord(start_col) - ord('A')
                    col2 = ord(end_col) - ord('A')
                    row1 = start_row - 1
                    row2 = end_row - 1
                    cells_to_color = []
                    for r in range(min(row1, row2), min(max(row1, row2) + 1, spreadsheet.rowCount())):
                        for c in range(min(col1, col2), min(max(col1, col2) + 1, spreadsheet.columnCount())):
                            cells_to_color.append((r, c, bg_color, text_color, bold))
                    if cells_to_color:
                        self._animate_color_cells(spreadsheet, cells_to_color)
                    logger.info(f"Агент: окрашен диапазон {start_col}{start_row}:{end_col}{end_row}")
            
            elif action_type == 'bold_column':
                col_letter = action_dict.get('column', 'A').upper()
                col_idx = ord(col_letter) - ord('A')
                if 0 <= col_idx < spreadsheet.columnCount():
                    for row in range(spreadsheet.rowCount()):
                        item = spreadsheet.item(row, col_idx)
                        if item and item.text():
                            font = item.font()
                            font.setBold(True)
                            item.setFont(font)
                            cell = spreadsheet.get_cell(row, col_idx) if hasattr(spreadsheet, 'get_cell') else None
                            if cell:
                                cell.bold = True
                    logger.info(f"Агент: жирный текст в столбце {col_letter}")
            
            elif action_type == 'insert_row':
                position = int(action_dict.get('position', 0))
                if hasattr(spreadsheet, 'insertRow'):
                    spreadsheet.insertRow(position)
            
            elif action_type == 'delete_row':
                position = int(action_dict.get('position', 0))
                if hasattr(spreadsheet, 'removeRow'):
                    spreadsheet.removeRow(position)
            
            else:
                logger.warning(f"Неизвестное действие агента: {action_type}")
        
        except Exception as e:
            logger.exception(f"Ошибка выполнения действия агента '{action_type}': {e}")

    def _apply_format_conditions(self, spreadsheet, conditions: list):
        """Применяет условное форматирование от агента"""
        from PyQt5.QtGui import QColor, QBrush
        import logging
        logger = logging.getLogger(__name__)
        
        for cond in conditions:
            try:
                col_letter = cond.get('column', 'A').upper()
                col_idx = ord(col_letter) - ord('A')
                condition_type = cond.get('condition', '')
                threshold = cond.get('value', '0')
                bg_color = cond.get('bg_color', None)
                text_color = cond.get('text_color', None)
                bold = cond.get('bold', False)
                
                if col_idx < 0 or col_idx >= spreadsheet.columnCount():
                    continue
                
                for row in range(spreadsheet.rowCount()):
                    item = spreadsheet.item(row, col_idx)
                    if not item or not item.text():
                        continue
                    
                    cell_text = item.text().strip()
                    
                    # Проверяем условие
                    match = False
                    try:
                        cell_val = float(cell_text.replace(',', '.').replace(' ', ''))
                        thresh_val = float(str(threshold).replace(',', '.').replace(' ', ''))
                        
                        if condition_type == 'less_than':
                            match = cell_val < thresh_val
                        elif condition_type == 'greater_than':
                            match = cell_val > thresh_val
                        elif condition_type == 'equals':
                            match = abs(cell_val - thresh_val) < 0.001
                        elif condition_type == 'not_equals':
                            match = abs(cell_val - thresh_val) >= 0.001
                        elif condition_type == 'contains':
                            match = str(threshold).lower() in cell_text.lower()
                        elif condition_type == 'negative':
                            match = cell_val < 0
                    except ValueError:
                        # Текстовое сравнение
                        if condition_type == 'contains':
                            match = str(threshold).lower() in cell_text.lower()
                        elif condition_type == 'equals':
                            match = cell_text == str(threshold)
                    
                    if match:
                        # Убираем из списка подсвеченных (чтобы fade-out не затирал)
                        if hasattr(self, '_highlight_cells') and self._highlight_cells:
                            self._highlight_cells = [
                                (r, c, s) for r, c, s in self._highlight_cells
                                if not (r == row and c == col_idx and s is spreadsheet)
                            ]
                        # Обновляем модель данных ячейки
                        cell = spreadsheet.get_cell(row, col_idx)
                        if bg_color:
                            color = QColor(bg_color)
                            if color.isValid():
                                item.setBackground(QBrush(color))
                                item.setData(Qt.BackgroundRole, QBrush(color))
                                if cell:
                                    cell.background_color = bg_color
                        if text_color:
                            color = QColor(text_color)
                            if color.isValid():
                                item.setForeground(QBrush(color))
                                item.setData(Qt.ForegroundRole, QBrush(color))
                                if cell:
                                    cell.text_color = text_color
                        if bold:
                            font = item.font()
                            font.setBold(True)
                            item.setFont(font)
                            if cell:
                                cell.bold = True
                
                logger.info(f"Агент: применено условное форматирование для столбца {col_letter}")
            except Exception as e:
                logger.warning(f"Ошибка применения условия: {e}")

    def _color_single_cell(self, spreadsheet, row: int, col: int, bg_color=None, text_color=None, bold=False):
        """Окрашивает одну ячейку (фон, текст, жирность)"""
        from PyQt5.QtGui import QColor, QBrush
        
        # Убираем ячейку из списка подсвеченных (чтобы fade-out не затирал цвет)
        if hasattr(self, '_highlight_cells') and self._highlight_cells:
            self._highlight_cells = [
                (r, c, s) for r, c, s in self._highlight_cells
                if not (r == row and c == col and s is spreadsheet)
            ]
        
        item = spreadsheet.item(row, col)
        if not item:
            from PyQt5.QtWidgets import QTableWidgetItem
            item = QTableWidgetItem()
            spreadsheet.setItem(row, col, item)
        
        cell = spreadsheet.get_cell(row, col) if hasattr(spreadsheet, 'get_cell') else None
        
        if bg_color:
            color = QColor(bg_color)
            if color.isValid():
                item.setBackground(QBrush(color))
                item.setData(Qt.BackgroundRole, QBrush(color))
                if cell:
                    cell.background_color = bg_color
        
        if text_color:
            color = QColor(text_color)
            if color.isValid():
                item.setForeground(QBrush(color))
                item.setData(Qt.ForegroundRole, QBrush(color))
                if cell:
                    cell.text_color = text_color
        
        if bold:
            font = item.font()
            font.setBold(True)
            item.setFont(font)
            if cell:
                cell.bold = True

    def _apply_color_to_cells(self, spreadsheet, cells_list: list):
        """Окрашивает список ячеек с индивидуальными цветами"""
        import logging
        logger = logging.getLogger(__name__)
        
        for cell_info in cells_list:
            try:
                col_letter = cell_info.get('column', 'A').upper()
                row_num = int(cell_info.get('row', 1))
                bg_color = cell_info.get('bg_color', None)
                text_color = cell_info.get('text_color', None)
                bold = cell_info.get('bold', False)
                
                col_idx = ord(col_letter) - ord('A')
                row_idx = row_num - 1
                
                if 0 <= col_idx < spreadsheet.columnCount() and 0 <= row_idx < spreadsheet.rowCount():
                    self._color_single_cell(spreadsheet, row_idx, col_idx, bg_color, text_color, bold)
            except Exception as e:
                logger.warning(f"Ошибка окрашивания ячейки: {e}")

    def _extract_table_data(self) -> Optional[str]:
        """Extract current table data from spreadsheet widget as formatted string."""
        try:
            if not self.main_window or not self.main_window.tab_widget:
                return None
            
            spreadsheet_widget = self.main_window.tab_widget.currentWidget()
            if not spreadsheet_widget:
                return None
            
            if not hasattr(spreadsheet_widget, 'cells'):
                return None
            
            cells = spreadsheet_widget.cells
            if not cells:
                return None
            
            lines = []
            max_cols = len(cells[0]) if cells else 0
            if max_cols == 0:
                return None
            
            header = " | ".join([chr(65 + i) for i in range(min(max_cols, 26))])
            lines.append(header)
            lines.append("-" * len(header))
            
            has_data = False
            for row_idx, row in enumerate(cells[:10]):
                row_data = []
                for col_idx in range(min(max_cols, 26)):
                    cell = row[col_idx] if col_idx < len(row) else None
                    if cell and hasattr(cell, 'value'):
                        value = cell.value
                    else:
                        value = None
                    
                    if value is not None:
                        cell_str = str(value)[:15]
                        has_data = True
                    else:
                        cell_str = ""
                    row_data.append(cell_str)
                
                if any(row_data):
                    lines.append(" | ".join(row_data))
            
            if not has_data or len(lines) <= 2:
                return None
            
            table_str = "\n".join(lines)
            return f"CURRENT SPREADSHEET DATA:\n{table_str}"
            
        except Exception as e:
            import logging
            logging.exception(f"Failed to extract table data: {e}")
            return None

    def _on_ai_response(self, text: str):
        """Слот: вызывается когда получен ответ от модели"""
        self._hide_typing_indicator()
        text = self._process_ai_commands(text)
        self.add_ai_message(text)

    def _on_ai_done(self):
        """Слот: восстановление UI после завершения запроса"""
        self.send_button.setEnabled(True)
        self.input_field.setEnabled(True)
        self.input_field.setFocus()

    def add_user_message(self, message: str):
        """Добавляет сообщение пользователя в чат"""
        time_str = QDateTime.currentDateTime().toString("HH:mm")
        self.message_history.append(("user", message, time_str))
        self._create_message_widget(message, time_str, is_user=True)
        QTimer.singleShot(50, self._scroll_to_bottom)

    def add_ai_message(self, message: str):
        """Добавляет сообщение AI в чат"""
        time_str = QDateTime.currentDateTime().toString("HH:mm")
        self.message_history.append(("ai", message, time_str))
        self._create_message_widget(message, time_str, is_user=False)
        QTimer.singleShot(50, self._scroll_to_bottom)
    
    # Алиас для совместимости
    add_system_message = add_ai_message

    def _process_ai_commands(self, response: str) -> str:
        """
        Парсит JSON команды из ответа модели для модификации таблицы.
        Поддерживает:
        1. [TABLE_COMMAND]...[/TABLE_COMMAND] маркеры
        2. ```json [...] ``` блоки с массивами данных для таблицы
        3. [SHEET:ИмяЛиста] маркеры для направления данных на конкретный лист
        """
        import re
        import json
        import logging
        
        logger = logging.getLogger(__name__)
        removed_positions = []
        commands_found = 0
        
        # Получаем упомянутые листы из последнего запроса
        mentioned_sheets = getattr(self, '_last_mentioned_sheets', [])
        
        try:
            # 1. Парсим [SHEET:Имя] + ```json ... ``` блоки
            # Паттерн: опциональный [SHEET:name] перед ```json
            sheet_json_pattern = r'(?:\[SHEET[:\s]*([^\]]+)\]\s*)?```json\s*\n?(\[.*?\])\s*\n?```'
            json_matches = list(re.finditer(sheet_json_pattern, response, re.DOTALL))
            
            for idx, match in enumerate(json_matches):
                try:
                    target_sheet = match.group(1)  # может быть None
                    if target_sheet:
                        target_sheet = target_sheet.strip()
                    
                    data = json.loads(match.group(2).strip())
                    if isinstance(data, list) and len(data) > 0 and isinstance(data[0], list):
                        logger.info(f"Found JSON table data: {len(data)} rows, target sheet: {target_sheet}")
                        # Нормализуем данные
                        data = self._normalize_table_data(data)
                        
                        # Определяем целевой лист
                        if target_sheet:
                            # AI явно указал лист
                            self._fill_table_on_sheet(target_sheet, data)
                        elif len(mentioned_sheets) == 1:
                            # Упомянут один лист — заполняем его
                            self._fill_table_on_sheet(mentioned_sheets[0], data)
                        elif len(mentioned_sheets) > 1 and len(json_matches) == len(mentioned_sheets):
                            # N JSON блоков = N упомянутых листов — распределяем 1:1
                            self._fill_table_on_sheet(mentioned_sheets[idx], data)
                        elif len(mentioned_sheets) > 1 and len(json_matches) == 1:
                            # 1 JSON блок, но несколько листов — заполняем все упомянутые
                            for sname in mentioned_sheets:
                                self._fill_table_on_sheet(sname, data)
                        elif mentioned_sheets:
                            # Есть упомянутые листы, но кол-во не совпадает — первый упомянутый
                            target = mentioned_sheets[min(idx, len(mentioned_sheets) - 1)]
                            self._fill_table_on_sheet(target, data)
                        else:
                            # Без указания листа — текущий
                            self._fill_table_with_data(data)
                        
                        commands_found += 1
                        removed_positions.append((match.start(), match.end()))
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse JSON block: {e}")
                except Exception as e:
                    logger.warning(f"Error processing JSON table data: {e}")
            
            # 2. Потом проверяем [TABLE_COMMAND] маркеры (окрашивание будет отложено если анимация идёт)
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
            
            # Очищаем response от команд и JSON-блоков
            cleaned_response = response
            for start, end in sorted(removed_positions, reverse=True):
                cleaned_response = cleaned_response[:start] + cleaned_response[end:]
            
            if commands_found > 0:
                cleaned_response = cleaned_response.strip()
                if not cleaned_response:
                    cleaned_response = "✅ Данные успешно добавлены в таблицу!"
            
            return cleaned_response.strip()
            
        except Exception as e:
            logger.exception(f"Error processing AI commands: {e}")
            return response

    def _get_spreadsheet_by_name(self, sheet_name: str):
        """Находит виджет таблицы по имени листа"""
        if not self.main_window or not self.main_window.tab_widget:
            return None
        tab_widget = self.main_window.tab_widget
        for i in range(tab_widget.count()):
            if tab_widget.tabText(i) == sheet_name:
                widget = tab_widget.widget(i)
                if hasattr(widget, 'set_cell_value'):
                    return widget
        return None
    
    def _fill_table_on_sheet(self, sheet_name: str, data: list):
        """Заполняет конкретный лист данными из 2D массива с анимацией"""
        import logging
        logger = logging.getLogger(__name__)
        
        spreadsheet = self._get_spreadsheet_by_name(sheet_name)
        if not spreadsheet:
            logger.warning(f"Sheet '{sheet_name}' not found, falling back to current")
            self._enqueue_sheet_fill(None, data)
            return
        
        logger.info(f"Filling sheet '{sheet_name}' with {len(data)} rows")
        self._enqueue_sheet_fill(sheet_name, data)
    
    def _enqueue_sheet_fill(self, sheet_name, data: list):
        """Добавляет заполнение листа в очередь. Заполнения выполняются последовательно."""
        if not hasattr(self, '_sheet_fill_queue'):
            self._sheet_fill_queue = []
        
        self._sheet_fill_queue.append((sheet_name, data))
        
        # Если анимация не идёт — запускаем следующее заполнение
        if not self._animation_running:
            self._process_next_sheet_fill()
    
    def _process_next_sheet_fill(self):
        """Запускает следующее заполнение из очереди"""
        if not hasattr(self, '_sheet_fill_queue') or not self._sheet_fill_queue:
            return
        
        sheet_name, data = self._sheet_fill_queue.pop(0)
        
        if sheet_name and self.main_window and self.main_window.tab_widget:
            # Переключаемся на нужный лист
            tab_widget = self.main_window.tab_widget
            for i in range(tab_widget.count()):
                if tab_widget.tabText(i) == sheet_name:
                    tab_widget.setCurrentIndex(i)
                    break
        
        # Заполняем с анимацией
        self._fill_table_with_data(data)
    
    def _fill_table_with_data(self, data: list):
        """Заполняет текущую таблицу данными из 2D массива с анимацией"""
        import logging
        logger = logging.getLogger(__name__)
        
        if not data or not self.main_window or not self.main_window.tab_widget:
            logger.warning("Cannot fill table: no data or no main window")
            return
        
        spreadsheet = self.main_window.tab_widget.currentWidget()
        if not spreadsheet or not hasattr(spreadsheet, 'set_cell_value'):
            logger.warning("Cannot fill table: no spreadsheet widget with set_cell_value")
            return
        
        try:
            # Создаём очередь ячеек для анимации (слева направо, сверху вниз)
            cell_queue = []
            for row_idx, row in enumerate(data):
                if row_idx >= spreadsheet.rowCount():
                    break
                for col_idx, value in enumerate(row):
                    if col_idx >= spreadsheet.columnCount():
                        break
                    cell_value = str(value) if value is not None else ""
                    if cell_value:  # Пропускаем пустые ячейки
                        cell_queue.append((row_idx, col_idx, cell_value))
            
            if not cell_queue:
                return
            
            # Запускаем анимированное заполнение
            self._animate_fill_queue = cell_queue
            self._animate_fill_spreadsheet = spreadsheet
            self._animate_fill_index = 0
            self._highlight_cells = []  # Очищаем список подсвеченных ячеек
            self._animation_running = True  # Флаг: анимация идёт
            
            # Таймер для анимации — 30мс между ячейками
            if not hasattr(self, '_fill_animation_timer'):
                self._fill_animation_timer = QTimer()
                self._fill_animation_timer.timeout.connect(self._animate_fill_next_cell)
            
            self._fill_animation_timer.start(30)
            
            logger.info(f"Started animated fill: {len(cell_queue)} cells")
        except Exception as e:
            logger.exception(f"Error filling table with data: {e}")

    def _animate_fill_next_cell(self):
        """Анимация: заполняет следующую ячейку с эффектом подсветки"""
        from PyQt5.QtGui import QColor, QBrush
        
        if not hasattr(self, '_animate_fill_queue') or not self._animate_fill_queue:
            if hasattr(self, '_fill_animation_timer'):
                self._fill_animation_timer.stop()
            return
        
        idx = self._animate_fill_index
        queue = self._animate_fill_queue
        spreadsheet = self._animate_fill_spreadsheet
        
        if idx >= len(queue) or not spreadsheet:
            # Анимация заполнения завершена — запускаем fade-out подсветки
            self._fill_animation_timer.stop()
            self._animate_fill_queue = []
            self._animate_fill_index = 0
            self._animate_fill_spreadsheet = None
            # Запускаем плавное затухание подсветки
            if hasattr(self, '_highlight_cells') and self._highlight_cells:
                self._fade_step = 0
                self._fade_total = 8  # 8 шагов затухания
                if not hasattr(self, '_fade_timer'):
                    self._fade_timer = QTimer()
                    self._fade_timer.timeout.connect(self._animate_fade_highlight)
                self._fade_timer.start(60)
            else:
                # Нет подсвеченных ячеек — сразу сбрасываем флаг и выполняем отложенные
                self._animation_running = False
                self._process_next_sheet_fill()
                if self._deferred_actions:
                    import logging
                    logging.getLogger(__name__).info(f"Выполняю {len(self._deferred_actions)} отложенных действий (без fade)")
                    deferred = self._deferred_actions[:]
                    self._deferred_actions = []
                    for action_dict in deferred:
                        self._execute_agent_action(action_dict)
            return
        
        row_idx, col_idx, cell_value = queue[idx]
        
        try:
            # Заполняем ячейку
            spreadsheet.set_cell_value(row_idx, col_idx, cell_value)
            
            # Подсвечиваем ячейку ярким цветом (accent color)
            item = spreadsheet.item(row_idx, col_idx)
            if item:
                # Используем accent color или зелёный по умолчанию
                highlight_color = QColor(self.accent_color) if hasattr(self, 'accent_color') else QColor("#4CAF50")
                highlight_color.setAlpha(120)  # Полупрозрачный
                item.setData(Qt.BackgroundRole, QBrush(highlight_color))
                
                # Сохраняем для последующего fade-out
                if not hasattr(self, '_highlight_cells'):
                    self._highlight_cells = []
                self._highlight_cells.append((row_idx, col_idx, spreadsheet))
            
            # Прокручиваем к текущей ячейке
            if item:
                spreadsheet.scrollToItem(item, spreadsheet.EnsureVisible)
        except Exception:
            pass
        
        self._animate_fill_index = idx + 1

    def _animate_fade_highlight(self):
        """Плавно убирает подсветку со всех заполненных ячеек"""
        from PyQt5.QtGui import QColor, QBrush
        
        if not hasattr(self, '_highlight_cells') or not self._highlight_cells:
            if hasattr(self, '_fade_timer'):
                self._fade_timer.stop()
            return
        
        self._fade_step += 1
        progress = self._fade_step / self._fade_total  # 0.0 -> 1.0
        
        if progress >= 1.0:
            # Завершаем — убираем все подсветки и восстанавливаем цвета из модели
            for row_idx, col_idx, spreadsheet in self._highlight_cells:
                try:
                    item = spreadsheet.item(row_idx, col_idx)
                    if item:
                        cell = spreadsheet.get_cell(row_idx, col_idx) if hasattr(spreadsheet, 'get_cell') else None
                        # Восстанавливаем фон
                        if cell and cell.background_color:
                            item.setBackground(QBrush(QColor(cell.background_color)))
                            item.setData(Qt.BackgroundRole, QBrush(QColor(cell.background_color)))
                        else:
                            item.setData(Qt.BackgroundRole, None)
                        # Восстанавливаем цвет текста
                        if cell and cell.text_color:
                            item.setForeground(QBrush(QColor(cell.text_color)))
                            item.setData(Qt.ForegroundRole, QBrush(QColor(cell.text_color)))
                except Exception:
                    pass
            
            self._highlight_cells = []
            self._fade_timer.stop()
            
            # Сбрасываем флаг анимации и выполняем отложенные действия
            self._animation_running = False
            self._process_next_sheet_fill()
            if self._deferred_actions:
                import logging
                logger = logging.getLogger(__name__)
                logger.info(f"Выполняю {len(self._deferred_actions)} отложенных действий после анимации")
                deferred = self._deferred_actions[:]
                self._deferred_actions = []
                for action_dict in deferred:
                    self._execute_agent_action(action_dict)
            return
        
        # Плавно уменьшаем alpha подсветки
        alpha = int(120 * (1.0 - progress))
        highlight_color = QColor(self.accent_color) if hasattr(self, 'accent_color') else QColor("#4CAF50")
        highlight_color.setAlpha(max(0, alpha))
        
        for row_idx, col_idx, spreadsheet in self._highlight_cells:
            try:
                item = spreadsheet.item(row_idx, col_idx)
                if item:
                    # Пропускаем ячейки с явно заданным цветом фона
                    cell = spreadsheet.get_cell(row_idx, col_idx) if hasattr(spreadsheet, 'get_cell') else None
                    if cell and cell.background_color:
                        item.setData(Qt.BackgroundRole, QBrush(QColor(cell.background_color)))
                    else:
                        item.setData(Qt.BackgroundRole, QBrush(highlight_color))
            except Exception:
                pass

    # ============================================================
    # Анимации для удаления, изменения и окрашивания
    # ============================================================

    def _animate_clear_cells(self, spreadsheet, cells: list):
        """Анимация удаления: красная подсветка → fade-out → очистка
        
        Args:
            spreadsheet: виджет таблицы
            cells: список (row, col) ячеек для удаления
        """
        from PyQt5.QtGui import QColor, QBrush
        
        if not cells or not spreadsheet:
            return
        
        self._animation_running = True
        
        # Подсвечиваем красным
        red_highlight = QColor("#FF4444")
        red_highlight.setAlpha(140)
        
        clear_highlight_cells = []
        for row, col in cells:
            item = spreadsheet.item(row, col)
            if item and item.text():
                item.setData(Qt.BackgroundRole, QBrush(red_highlight))
                clear_highlight_cells.append((row, col))
        
        if not clear_highlight_cells:
            self._animation_running = False
            self._process_next_sheet_fill()
            return
        
        # Сохраняем данные для анимации
        self._clear_anim_cells = clear_highlight_cells
        self._clear_anim_spreadsheet = spreadsheet
        self._clear_anim_step = 0
        self._clear_anim_total = 6  # 6 шагов fade
        
        if not hasattr(self, '_clear_anim_timer'):
            self._clear_anim_timer = QTimer()
            self._clear_anim_timer.timeout.connect(self._animate_clear_step)
        
        # Начинаем fade через 300мс (чтобы красный был виден)
        QTimer.singleShot(300, lambda: self._clear_anim_timer.start(80))

    def _animate_clear_step(self):
        """Шаг анимации удаления: fade-out красного → очистка"""
        from PyQt5.QtGui import QColor, QBrush
        
        if not hasattr(self, '_clear_anim_cells') or not self._clear_anim_cells:
            if hasattr(self, '_clear_anim_timer'):
                self._clear_anim_timer.stop()
            self._animation_running = False
            self._process_next_sheet_fill()
            return
        
        self._clear_anim_step += 1
        progress = self._clear_anim_step / self._clear_anim_total
        spreadsheet = self._clear_anim_spreadsheet
        
        if progress >= 1.0:
            # Завершаем — очищаем ячейки
            for row, col in self._clear_anim_cells:
                try:
                    if spreadsheet and hasattr(spreadsheet, 'set_cell_value'):
                        spreadsheet.set_cell_value(row, col, "")
                    item = spreadsheet.item(row, col)
                    if item:
                        item.setData(Qt.BackgroundRole, None)
                except Exception:
                    pass
            
            self._clear_anim_cells = []
            self._clear_anim_timer.stop()
            self._animation_running = False
            self._process_next_sheet_fill()
            
            # Выполняем отложенные действия
            if self._deferred_actions:
                deferred = self._deferred_actions[:]
                self._deferred_actions = []
                for action_dict in deferred:
                    self._execute_agent_action(action_dict)
            return
        
        # Плавно уменьшаем alpha
        alpha = int(140 * (1.0 - progress))
        red_color = QColor("#FF4444")
        red_color.setAlpha(max(0, alpha))
        
        for row, col in self._clear_anim_cells:
            try:
                item = spreadsheet.item(row, col)
                if item:
                    item.setData(Qt.BackgroundRole, QBrush(red_color))
            except Exception:
                pass

    def _animate_update_cells(self, spreadsheet, cells: list):
        """Анимация изменения: жёлтая подсветка → fade-out
        
        Args:
            spreadsheet: виджет таблицы
            cells: список (row, col) изменённых ячеек
        """
        from PyQt5.QtGui import QColor, QBrush
        
        if not cells or not spreadsheet:
            return
        
        # Подсвечиваем жёлтым
        yellow_highlight = QColor("#FFD700")
        yellow_highlight.setAlpha(120)
        
        update_cells = []
        for row, col in cells:
            item = spreadsheet.item(row, col)
            if item:
                # Сохраняем оригинальный фон
                cell = spreadsheet.get_cell(row, col) if hasattr(spreadsheet, 'get_cell') else None
                orig_bg = cell.background_color if cell else None
                item.setData(Qt.BackgroundRole, QBrush(yellow_highlight))
                update_cells.append((row, col, orig_bg))
        
        if not update_cells:
            return
        
        # Сохраняем данные для анимации
        self._update_anim_cells = update_cells
        self._update_anim_spreadsheet = spreadsheet
        self._update_anim_step = 0
        self._update_anim_total = 6
        
        if not hasattr(self, '_update_anim_timer'):
            self._update_anim_timer = QTimer()
            self._update_anim_timer.timeout.connect(self._animate_update_step)
        
        # Начинаем fade через 250мс
        QTimer.singleShot(250, lambda: self._update_anim_timer.start(70))

    def _animate_update_step(self):
        """Шаг анимации изменения: fade-out жёлтого"""
        from PyQt5.QtGui import QColor, QBrush
        
        if not hasattr(self, '_update_anim_cells') or not self._update_anim_cells:
            if hasattr(self, '_update_anim_timer'):
                self._update_anim_timer.stop()
            return
        
        self._update_anim_step += 1
        progress = self._update_anim_step / self._update_anim_total
        spreadsheet = self._update_anim_spreadsheet
        
        if progress >= 1.0:
            # Завершаем — восстанавливаем оригинальные цвета
            for row, col, orig_bg in self._update_anim_cells:
                try:
                    item = spreadsheet.item(row, col)
                    if item:
                        if orig_bg:
                            item.setBackground(QBrush(QColor(orig_bg)))
                            item.setData(Qt.BackgroundRole, QBrush(QColor(orig_bg)))
                        else:
                            item.setData(Qt.BackgroundRole, None)
                except Exception:
                    pass
            
            self._update_anim_cells = []
            self._update_anim_timer.stop()
            return
        
        # Плавно уменьшаем alpha
        alpha = int(120 * (1.0 - progress))
        yellow_color = QColor("#FFD700")
        yellow_color.setAlpha(max(0, alpha))
        
        for row, col, orig_bg in self._update_anim_cells:
            try:
                item = spreadsheet.item(row, col)
                if item:
                    item.setData(Qt.BackgroundRole, QBrush(yellow_color))
            except Exception:
                pass

    def _animate_color_cells(self, spreadsheet, cells_with_colors: list):
        """Анимация окрашивания: плавное появление цвета (alpha 0 → 255)
        
        Args:
            spreadsheet: виджет таблицы
            cells_with_colors: список (row, col, bg_color, text_color, bold)
        """
        from PyQt5.QtGui import QColor, QBrush
        
        if not cells_with_colors or not spreadsheet:
            return
        
        self._color_anim_cells = cells_with_colors
        self._color_anim_spreadsheet = spreadsheet
        self._color_anim_step = 0
        self._color_anim_total = 6
        
        if not hasattr(self, '_color_anim_timer'):
            self._color_anim_timer = QTimer()
            self._color_anim_timer.timeout.connect(self._animate_color_step)
        
        self._color_anim_timer.start(50)

    def _animate_color_step(self):
        """Шаг анимации окрашивания: плавное появление цвета"""
        from PyQt5.QtGui import QColor, QBrush
        
        if not hasattr(self, '_color_anim_cells') or not self._color_anim_cells:
            if hasattr(self, '_color_anim_timer'):
                self._color_anim_timer.stop()
            return
        
        self._color_anim_step += 1
        progress = self._color_anim_step / self._color_anim_total
        spreadsheet = self._color_anim_spreadsheet
        
        if progress >= 1.0:
            # Завершаем — устанавливаем финальные цвета
            for row, col, bg_color, text_color, bold in self._color_anim_cells:
                self._color_single_cell(spreadsheet, row, col, bg_color, text_color, bold)
            
            self._color_anim_cells = []
            self._color_anim_timer.stop()
            return
        
        # Плавно увеличиваем alpha
        alpha = int(255 * progress)
        
        for row, col, bg_color, text_color, bold in self._color_anim_cells:
            try:
                item = spreadsheet.item(row, col)
                if item:
                    if bg_color:
                        color = QColor(bg_color)
                        color.setAlpha(max(0, alpha))
                        item.setData(Qt.BackgroundRole, QBrush(color))
                    if text_color:
                        color = QColor(text_color)
                        color.setAlpha(max(0, alpha))
                        item.setForeground(QBrush(color))
                        item.setData(Qt.ForegroundRole, QBrush(color))
            except Exception:
                pass

    def _execute_table_command(self, command: dict):
        """Выполняет команду модификации таблицы"""
        import logging
        logger = logging.getLogger(__name__)
        
        action = command.get('action', '')
        
        # Если анимация заполнения идёт и это color/format команда — откладываем
        color_actions = {'color_cells', 'color_column', 'color_row', 'color_range', 'bold_column', 'format_cells'}
        if self._animation_running and action in color_actions:
            logger.info(f"Откладываем TABLE_COMMAND '{action}' до завершения анимации")
            # Конвертируем command в формат agent action для унификации
            agent_action = dict(command)
            agent_action['type'] = agent_action.pop('action', '')
            self._deferred_actions.append(agent_action)
            return
        
        try:
            if action == 'insert_rows':
                # Вставка строк
                rows = command.get('data', [])
                if rows and self.main_window and self.main_window.tab_widget:
                    spreadsheet = self.main_window.tab_widget.currentWidget()
                    if spreadsheet and hasattr(spreadsheet, 'insert_rows'):
                        start_row = command.get('start_row', 0)
                        spreadsheet.insert_rows(start_row, len(rows))
                        logger.info(f"Inserted {len(rows)} rows at position {start_row}")
            
            elif action == 'update_cells':
                # Обновление ячеек
                updates = command.get('updates', {})
                if updates and self.main_window and self.main_window.tab_widget:
                    spreadsheet = self.main_window.tab_widget.currentWidget()
                    if spreadsheet and hasattr(spreadsheet, 'update_cells'):
                        spreadsheet.update_cells(updates)
                        logger.info(f"Updated {len(updates)} cells")
            
            elif action == 'create_formula':
                # Создание формулы
                formula = command.get('formula', '')
                cell = command.get('cell', '')
                if formula and cell and self.main_window and self.main_window.tab_widget:
                    spreadsheet = self.main_window.tab_widget.currentWidget()
                    if spreadsheet and hasattr(spreadsheet, 'set_cell_formula'):
                        spreadsheet.set_cell_formula(cell, formula)
                        logger.info(f"Created formula '{formula}' at cell {cell}")
            
            elif action == 'clear_column':
                # Очистка одного столбца с анимацией
                col_letter = command.get('column', '').upper()
                if col_letter and self.main_window and self.main_window.tab_widget:
                    spreadsheet = self.main_window.tab_widget.currentWidget()
                    if spreadsheet and hasattr(spreadsheet, 'set_cell_value'):
                        col_idx = ord(col_letter) - ord('A')
                        if 0 <= col_idx < spreadsheet.columnCount():
                            cells_to_clear = []
                            for row in range(spreadsheet.rowCount()):
                                item = spreadsheet.item(row, col_idx)
                                cell = spreadsheet.get_cell(row, col_idx) if hasattr(spreadsheet, 'get_cell') else None
                                has_data = False
                                if cell and cell.value:
                                    has_data = True
                                elif item and item.text():
                                    has_data = True
                                if has_data:
                                    cells_to_clear.append((row, col_idx))
                            if cells_to_clear:
                                self._animate_clear_cells(spreadsheet, cells_to_clear)
                            logger.info(f"Cleared column {col_letter}")
            
            elif action == 'clear_columns':
                # Очистка нескольких столбцов с анимацией
                columns = command.get('columns', [])
                if columns and self.main_window and self.main_window.tab_widget:
                    spreadsheet = self.main_window.tab_widget.currentWidget()
                    if spreadsheet and hasattr(spreadsheet, 'set_cell_value'):
                        cells_to_clear = []
                        for col_letter in columns:
                            col_idx = ord(col_letter.upper()) - ord('A')
                            if 0 <= col_idx < spreadsheet.columnCount():
                                for row in range(spreadsheet.rowCount()):
                                    cell = spreadsheet.get_cell(row, col_idx) if hasattr(spreadsheet, 'get_cell') else None
                                    if cell and cell.value:
                                        cells_to_clear.append((row, col_idx))
                        if cells_to_clear:
                            self._animate_clear_cells(spreadsheet, cells_to_clear)
                        logger.info(f"Cleared columns: {columns}")
            
            elif action == 'clear_all':
                # Очистка всей таблицы с анимацией
                if self.main_window and self.main_window.tab_widget:
                    spreadsheet = self.main_window.tab_widget.currentWidget()
                    if spreadsheet and hasattr(spreadsheet, 'set_cell_value'):
                        cells_to_clear = []
                        for row in range(spreadsheet.rowCount()):
                            for col in range(spreadsheet.columnCount()):
                                cell = spreadsheet.get_cell(row, col) if hasattr(spreadsheet, 'get_cell') else None
                                if cell and cell.value:
                                    cells_to_clear.append((row, col))
                        if cells_to_clear:
                            self._animate_clear_cells(spreadsheet, cells_to_clear)
                        logger.info("Cleared entire table")
            
            elif action == 'delete_column':
                # Удаление столбца со сдвигом
                col_letter = command.get('column', '').upper()
                if col_letter and self.main_window and self.main_window.tab_widget:
                    spreadsheet = self.main_window.tab_widget.currentWidget()
                    if spreadsheet and hasattr(spreadsheet, 'set_cell_value'):
                        col_idx = ord(col_letter) - ord('A')
                        max_col = spreadsheet.columnCount() - 1
                        if 0 <= col_idx <= max_col:
                            # Сдвигаем данные влево
                            for row in range(spreadsheet.rowCount()):
                                for col in range(col_idx, max_col):
                                    next_cell = spreadsheet.get_cell(row, col + 1) if hasattr(spreadsheet, 'get_cell') else None
                                    next_value = next_cell.value if next_cell else ""
                                    spreadsheet.set_cell_value(row, col, next_value or "")
                                # Очищаем последний столбец
                                spreadsheet.set_cell_value(row, max_col, "")
                            logger.info(f"Deleted column {col_letter} and shifted data left")
            
            elif action == 'clear_rows':
                # Очистка конкретных строк с анимацией
                rows = command.get('rows', [])
                if rows and self.main_window and self.main_window.tab_widget:
                    spreadsheet = self.main_window.tab_widget.currentWidget()
                    if spreadsheet and hasattr(spreadsheet, 'set_cell_value'):
                        cells_to_clear = []
                        for row_num in rows:
                            row_idx = int(row_num) - 1  # 1-based to 0-based
                            if 0 <= row_idx < spreadsheet.rowCount():
                                for col in range(spreadsheet.columnCount()):
                                    cell = spreadsheet.get_cell(row_idx, col) if hasattr(spreadsheet, 'get_cell') else None
                                    if cell and cell.value:
                                        cells_to_clear.append((row_idx, col))
                        if cells_to_clear:
                            self._animate_clear_cells(spreadsheet, cells_to_clear)
                        logger.info(f"Cleared rows: {rows}")
            
            elif action == 'clear_cell':
                # Очистка конкретной ячейки с анимацией
                col_letter = command.get('column', '').upper()
                row_num = command.get('row', 0)
                if col_letter and row_num and self.main_window and self.main_window.tab_widget:
                    spreadsheet = self.main_window.tab_widget.currentWidget()
                    if spreadsheet and hasattr(spreadsheet, 'set_cell_value'):
                        col_idx = ord(col_letter) - ord('A')
                        row_idx = int(row_num) - 1  # 1-based to 0-based
                        if 0 <= col_idx < spreadsheet.columnCount() and 0 <= row_idx < spreadsheet.rowCount():
                            self._animate_clear_cells(spreadsheet, [(row_idx, col_idx)])
                            logger.info(f"Cleared cell {col_letter}{row_num}")
            
            elif action == 'clear_range':
                # Очистка диапазона ячеек с анимацией
                start_col = command.get('start_col', '').upper()
                start_row = command.get('start_row', 0)
                end_col = command.get('end_col', '').upper()
                end_row = command.get('end_row', 0)
                if start_col and end_col and start_row and end_row and self.main_window and self.main_window.tab_widget:
                    spreadsheet = self.main_window.tab_widget.currentWidget()
                    if spreadsheet and hasattr(spreadsheet, 'set_cell_value'):
                        col1 = ord(start_col) - ord('A')
                        col2 = ord(end_col) - ord('A')
                        row1 = int(start_row) - 1
                        row2 = int(end_row) - 1
                        cells_to_clear = []
                        for r in range(min(row1, row2), min(max(row1, row2) + 1, spreadsheet.rowCount())):
                            for c in range(min(col1, col2), min(max(col1, col2) + 1, spreadsheet.columnCount())):
                                cell = spreadsheet.get_cell(r, c) if hasattr(spreadsheet, 'get_cell') else None
                                if cell and cell.value:
                                    cells_to_clear.append((r, c))
                        if cells_to_clear:
                            self._animate_clear_cells(spreadsheet, cells_to_clear)
                        logger.info(f"Cleared range {start_col}{start_row}:{end_col}{end_row}")
            
            elif action == 'color_cells':
                # Окрашивание конкретных ячеек с анимацией
                cells_list = command.get('cells', [])
                if cells_list and self.main_window and self.main_window.tab_widget:
                    spreadsheet = self.main_window.tab_widget.currentWidget()
                    if spreadsheet:
                        cells_to_color = []
                        for cell_info in cells_list:
                            try:
                                cl = cell_info.get('column', 'A').upper()
                                rn = int(cell_info.get('row', 1))
                                ci = ord(cl) - ord('A')
                                ri = rn - 1
                                bg = cell_info.get('bg_color', None)
                                tc = cell_info.get('text_color', None)
                                bl = cell_info.get('bold', False)
                                cells_to_color.append((ri, ci, bg, tc, bl))
                            except Exception:
                                pass
                        if cells_to_color:
                            self._animate_color_cells(spreadsheet, cells_to_color)
                        logger.info(f"Colored {len(cells_list)} cells")
            
            elif action == 'color_column':
                # Окрашивание всего столбца с анимацией
                col_letter = command.get('column', '').upper()
                bg_color = command.get('bg_color', None)
                text_color = command.get('text_color', None)
                bold = command.get('bold', False)
                if col_letter and self.main_window and self.main_window.tab_widget:
                    spreadsheet = self.main_window.tab_widget.currentWidget()
                    if spreadsheet:
                        col_idx = ord(col_letter) - ord('A')
                        if 0 <= col_idx < spreadsheet.columnCount():
                            cells_to_color = []
                            for row in range(spreadsheet.rowCount()):
                                item = spreadsheet.item(row, col_idx)
                                if not item or not item.text():
                                    continue
                                cells_to_color.append((row, col_idx, bg_color, text_color, bold))
                            if cells_to_color:
                                self._animate_color_cells(spreadsheet, cells_to_color)
                            logger.info(f"Colored column {col_letter}")
            
            elif action == 'color_row':
                # Окрашивание строки с анимацией
                row_num = command.get('row', 0)
                bg_color = command.get('bg_color', None)
                text_color = command.get('text_color', None)
                bold = command.get('bold', False)
                if row_num and self.main_window and self.main_window.tab_widget:
                    spreadsheet = self.main_window.tab_widget.currentWidget()
                    if spreadsheet:
                        row_idx = int(row_num) - 1
                        if 0 <= row_idx < spreadsheet.rowCount():
                            cells_to_color = []
                            for col in range(spreadsheet.columnCount()):
                                item = spreadsheet.item(row_idx, col)
                                if not item or not item.text():
                                    continue
                                cells_to_color.append((row_idx, col, bg_color, text_color, bold))
                            if cells_to_color:
                                self._animate_color_cells(spreadsheet, cells_to_color)
                            logger.info(f"Colored row {row_num}")
            
            elif action == 'color_range':
                # Окрашивание диапазона с анимацией
                start_col = command.get('start_col', '').upper()
                start_row = command.get('start_row', 0)
                end_col = command.get('end_col', '').upper()
                end_row = command.get('end_row', 0)
                bg_color = command.get('bg_color', None)
                text_color = command.get('text_color', None)
                bold = command.get('bold', False)
                if start_col and end_col and start_row and end_row and self.main_window and self.main_window.tab_widget:
                    spreadsheet = self.main_window.tab_widget.currentWidget()
                    if spreadsheet:
                        col1 = ord(start_col) - ord('A')
                        col2 = ord(end_col) - ord('A')
                        row1 = int(start_row) - 1
                        row2 = int(end_row) - 1
                        cells_to_color = []
                        for r in range(min(row1, row2), min(max(row1, row2) + 1, spreadsheet.rowCount())):
                            for c in range(min(col1, col2), min(max(col1, col2) + 1, spreadsheet.columnCount())):
                                cells_to_color.append((r, c, bg_color, text_color, bold))
                        if cells_to_color:
                            self._animate_color_cells(spreadsheet, cells_to_color)
                        logger.info(f"Colored range {start_col}{start_row}:{end_col}{end_row}")
            
            elif action == 'bold_column':
                # Жирный текст в столбце
                col_letter = command.get('column', '').upper()
                if col_letter and self.main_window and self.main_window.tab_widget:
                    spreadsheet = self.main_window.tab_widget.currentWidget()
                    if spreadsheet:
                        col_idx = ord(col_letter) - ord('A')
                        if 0 <= col_idx < spreadsheet.columnCount():
                            for row in range(spreadsheet.rowCount()):
                                item = spreadsheet.item(row, col_idx)
                                if item and item.text():
                                    font = item.font()
                                    font.setBold(True)
                                    item.setFont(font)
                                    cell = spreadsheet.get_cell(row, col_idx) if hasattr(spreadsheet, 'get_cell') else None
                                    if cell:
                                        cell.bold = True
                            logger.info(f"Bold column {col_letter}")
            
            else:
                logger.warning(f"Unknown action: {action}")
                
        except Exception as e:
            logger.exception(f"Error executing table command: {e}")

    def _normalize_table_data(self, data: list) -> list:
        """Выравнивает количество колонок в данных"""
        if not data:
            return data
            
        max_cols = max(len(row) for row in data) if data else 0
        
        normalized = []
        for row in data:
            normalized_row = list(row)
            while len(normalized_row) < max_cols:
                normalized_row.append("")
            normalized.append(normalized_row[:max_cols])
        
        return normalized
