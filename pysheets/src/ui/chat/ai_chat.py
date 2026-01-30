"""
Виджет для чата с ИИ
"""

from PyQt5.QtWidgets import QWidget, QVBoxLayout, QHBoxLayout, QTextEdit, QPushButton, QLabel
from PyQt5.QtCore import Qt, QDateTime
from PyQt5.QtGui import QFont


class AIChatWidget(QWidget):
    """Виджет чата с ИИ помощником"""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.init_ui()

    def init_ui(self):
        """Инициализация интерфейса"""
        main_layout = QVBoxLayout(self)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # Заголовок
        header = QLabel("Помощник ИИ")
        header_font = header.font()
        header_font.setPointSize(12)
        header_font.setBold(True)
        header.setFont(header_font)
        header.setStyleSheet("padding: 10px; border-bottom: 1px solid #3c4043;")
        main_layout.addWidget(header)

        # Область сообщений
        self.chat_display = QTextEdit()
        self.chat_display.setReadOnly(True)
        self.chat_display.setStyleSheet("""
            QTextEdit {
                border: none;
                margin: 0px;
                padding: 10px;
                background-color: #202124;
                color: #e8eaed;
            }
        """)
        main_layout.addWidget(self.chat_display)

        # Разделитель
        separator = QWidget()
        separator.setFixedHeight(1)
        separator.setStyleSheet("background-color: #3c4043;")
        main_layout.addWidget(separator)

        # Нижняя панель с вводом
        input_layout = QHBoxLayout()
        input_layout.setContentsMargins(10, 10, 10, 10)
        input_layout.setSpacing(10)

        # Поле ввода сообщения
        self.input_field = QTextEdit()
        self.input_field.setPlaceholderText("Введите сообщение...")
        self.input_field.setMaximumHeight(80)
        self.input_field.setStyleSheet("""
            QTextEdit {
                border: 1px solid #3c4043;
                border-radius: 4px;
                padding: 8px;
                background-color: #2d2e30;
                color: #e8eaed;
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 11px;
            }
        """)
        input_layout.addWidget(self.input_field)

        # Кнопка отправки
        self.send_button = QPushButton("Отправить")
        self.send_button.setMaximumWidth(100)
        self.send_button.setMaximumHeight(80)
        self.send_button.setStyleSheet("""
            QPushButton {
                background-color: #DC143C;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 16px;
                font-weight: bold;
                font-size: 11px;
            }
            QPushButton:hover {
                background-color: #E63655;
            }
            QPushButton:pressed {
                background-color: #C71230;
            }
        """)
        self.send_button.clicked.connect(self.send_message)
        input_layout.addWidget(self.send_button)

        # Контейнер для нижней части
        input_container = QWidget()
        input_container.setLayout(input_layout)
        main_layout.addWidget(input_container)

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
        html = f"""
        <div style="margin-bottom: 10px; text-align: right;">
            <span style="color: #DC143C; font-weight: bold;">{time}</span>
            <div style="background-color: #1e88e5; color: white; padding: 8px 12px; 
                        border-radius: 8px; display: inline-block; max-width: 70%; 
                        text-align: left; margin-top: 4px;">
                {message}
            </div>
        </div>
        """
        self.chat_display.append(html)
        
        # Автоскролл вниз
        self.chat_display.verticalScrollBar().setValue(
            self.chat_display.verticalScrollBar().maximum()
        )

    def add_system_message(self, message: str):
        """Добавляет системное сообщение в чат"""
        time = QDateTime.currentDateTime().toString("hh:mm")
        html = f"""
        <div style="margin-bottom: 10px; text-align: left;">
            <span style="color: #9aa0a6; font-weight: bold;">{time}</span>
            <div style="background-color: #2d2e30; color: #e8eaed; padding: 8px 12px; 
                        border-radius: 8px; display: inline-block; max-width: 70%; 
                        text-align: left; margin-top: 4px; border-left: 3px solid #9aa0a6;">
                {message}
            </div>
        </div>
        """
        self.chat_display.append(html)
        
        # Автоскролл вниз
        self.chat_display.verticalScrollBar().setValue(
            self.chat_display.verticalScrollBar().maximum()
        )
