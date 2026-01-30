"""
Виджет для чата с ИИ
"""

from PyQt5.QtWidgets import QWidget, QVBoxLayout, QHBoxLayout, QTextEdit, QPushButton, QLabel, QScrollArea
from PyQt5.QtCore import Qt, QDateTime, QSize
from PyQt5.QtGui import QFont, QColor, QIcon


class AIChatWidget(QWidget):
    """Виджет чата с ИИ помощником с современным дизайном"""

    def __init__(self, theme="dark", accent_color=None, parent=None):
        super().__init__(parent)
        self.theme = theme
        self.accent_color = accent_color if accent_color else QColor("#DC143C")
        self.init_ui()
        self.apply_theme()

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
        
        # Если системная тема, определяем реальную тему
        actual_theme = self.theme
        if self.theme == "system":
            app = QApplication.instance()
            if app:
                palette = app.palette()
                # Проверяем базовый цвет приложения
                base_color = palette.color(QPalette.Base)
                # Если цвет светлый (RGB > 128 в среднем) - светлая тема
                brightness = (base_color.red() + base_color.green() + base_color.blue()) / 3
                actual_theme = "light" if brightness > 128 else "dark"
            else:
                actual_theme = "light"
        
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
            ai_msg_color = "#202124"
            ai_msg_bg = "#f0f0f0"
            ai_msg_border = "#e8eaed"
        
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

    def send_message(self):
        """Отправка сообщения"""
        message = self.input_field.toPlainText().strip()
        
        if not message:
            return
        
        # Добавляем сообщение пользователя
        self.add_user_message(message)
        
        # Очищаем поле ввода
        self.input_field.clear()
        self.input_field.setFocus()

    def add_user_message(self, message: str):
        """Добавляет сообщение пользователя в чат"""
        time = QDateTime.currentDateTime().toString("hh:mm")
        # Экранируем HTML теги в сообщении
        message = message.replace('<', '&lt;').replace('>', '&gt;')
        html = f"""<table width="100%"><tr><td align="right"><table><tr><td style="background-color: {self.user_msg_bg}; color: white; padding: 10px 14px; border-radius: 14px; box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.2);"><span style="font-size: 11px; color: white; opacity: 0.8;">{time}</span><br><span style="color: white;">{message}</span></td></tr></table></td></tr></table>"""
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
        # Экранируем HTML теги в сообщении
        message = message.replace('<', '&lt;').replace('>', '&gt;')
        html = f"""<table width="100%"><tr><td align="left"><table><tr><td style="background-color: {self.ai_msg_bg}; color: {self.ai_msg_color}; padding: 10px 14px; border-radius: 14px; border-left: 3px solid {self.ai_msg_color}; box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);"><span style="font-size: 11px; color: {self.ai_msg_color}; opacity: 0.8;">{time}</span><br><span style="color: {self.ai_msg_color};">{message}</span></td></tr></table></td></tr></table>"""
        cursor = self.chat_display.textCursor()
        cursor.movePosition(cursor.End)
        self.chat_display.setTextCursor(cursor)
        self.chat_display.insertHtml(html)
        
        # Автоскролл вниз
        self.chat_display.verticalScrollBar().setValue(
            self.chat_display.verticalScrollBar().maximum()
        )
