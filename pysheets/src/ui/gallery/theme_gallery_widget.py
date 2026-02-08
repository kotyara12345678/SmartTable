"""
UI компонент галереи пользовательских тем
"""

from PyQt5.QtWidgets import (QDialog, QVBoxLayout, QHBoxLayout, QScrollArea, 
                             QWidget, QPushButton, QLabel, QLineEdit, QComboBox,
                             QGridLayout, QMessageBox, QFileDialog, QFrame)
from PyQt5.QtGui import QColor, QFont, QPixmap, QIcon
from PyQt5.QtCore import Qt, QSize, pyqtSignal
from pathlib import Path
import json

from .theme_gallery_manager import ThemeGalleryManager, ThemeMetadata


class ThemeCard(QFrame):
    """Карточка темы в галерее"""
    
    selected = pyqtSignal(str)  # ID выбранной темы
    
    def __init__(self, theme_info: dict, parent=None):
        super().__init__(parent)
        self.theme_info = theme_info
        self.theme_id = theme_info['id']
        self.metadata = theme_info['metadata']
        
        self.setFrameStyle(QFrame.StyledPanel | QFrame.Raised)
        # Удалили жёсткие стили, теперь наследуем от приложения
        self.setStyleSheet("""
            ThemeCard {
                border: 1px solid #e8eaed;
                border-radius: 8px;
                padding: 12px;
            }
            ThemeCard:hover {
                border: 2px solid #5f6368;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
        """)
        
        self.setup_ui()
    
    def setup_ui(self):
        """Инициализация UI"""
        layout = QVBoxLayout()
        
        # Цветной квадрат (превью цвета темы)
        color_widget = QWidget()
        color_widget.setStyleSheet(f"background-color: {self.metadata.preview_color};")
        color_widget.setFixedHeight(60)
        layout.addWidget(color_widget)
        
        # Название темы
        name_label = QLabel(self.metadata.name)
        font = name_label.font()
        font.setPointSize(11)
        font.setBold(True)
        name_label.setFont(font)
        layout.addWidget(name_label)
        
        # Описание
        desc_label = QLabel(self.metadata.description)
        desc_label.setWordWrap(True)
        desc_label.setStyleSheet("color: #5f6368; font-size: 10px;")
        layout.addWidget(desc_label)
        
        # Автор
        author_label = QLabel(f"Автор: {self.metadata.author}")
        author_label.setStyleSheet("color: #80868b; font-size: 9px;")
        layout.addWidget(author_label)
        
        # Теги
        if self.metadata.tags:
            tags_label = QLabel(" | ".join(self.metadata.tags))
            tags_label.setStyleSheet("color: #5f6368; font-size: 9px; font-style: italic;")
            layout.addWidget(tags_label)
        
        # Кнопка применить
        apply_btn = QPushButton("Применить")
        apply_btn.clicked.connect(self.on_apply_clicked)
        layout.addWidget(apply_btn)
        
        layout.addStretch()
        self.setLayout(layout)
        self.setFixedWidth(200)
        self.setFixedHeight(280)
    
    def on_apply_clicked(self):
        """Обработка клика на кнопку применить"""
        self.selected.emit(self.theme_id)


class ThemeGalleryWidget(QDialog):
    """Галерея пользовательских тем"""
    
    theme_selected = pyqtSignal(dict)  # Сигнал при выборе темы
    
    def __init__(self, theme_manager: ThemeGalleryManager = None, parent=None):
        super().__init__(parent)
        
        self.setWindowTitle("Галерея тем SmartTable")
        self.setGeometry(100, 100, 1000, 700)
        
        self.gallery_manager = theme_manager or ThemeGalleryManager()
        
        self.setup_ui()
        self.load_themes()
    
    def setup_ui(self):
        """Инициализация UI"""
        main_layout = QVBoxLayout()
        
        # Заголовок
        title = QLabel("Галерея пользовательских тем")
        font = title.font()
        font.setPointSize(14)
        font.setBold(True)
        title.setFont(font)
        main_layout.addWidget(title)
        
        # Панель инструментов
        toolbar_layout = QHBoxLayout()
        
        # Поиск
        search_label = QLabel("Поиск:")
        search_label.setStyleSheet("font-weight: bold;")
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("Введите название или описание темы...")
        self.search_input.textChanged.connect(self.on_search)
        toolbar_layout.addWidget(search_label)
        toolbar_layout.addWidget(self.search_input)
        
        # Фильтр по категории
        category_label = QLabel("Категория:")
        category_label.setStyleSheet("font-weight: bold;")
        self.category_combo = QComboBox()
        self.category_combo.addItems(["Все", "Светлые", "Тёмные", "Пользовательские"])
        self.category_combo.currentTextChanged.connect(self.on_category_changed)
        toolbar_layout.addWidget(category_label)
        toolbar_layout.addWidget(self.category_combo)
        
        toolbar_layout.addStretch()
        
        main_layout.addLayout(toolbar_layout)
        
        # Кнопки действий
        actions_layout = QHBoxLayout()
        
        import_btn = QPushButton("📥 Импортировать")
        import_btn.clicked.connect(self.on_import_theme)
        actions_layout.addWidget(import_btn)
        
        refresh_btn = QPushButton("🔄 Обновить")
        refresh_btn.clicked.connect(self.load_themes)
        actions_layout.addWidget(refresh_btn)
        
        delete_btn = QPushButton("🗑️ Удалить")
        delete_btn.clicked.connect(self.on_delete_theme)
        actions_layout.addWidget(delete_btn)
        
        actions_layout.addStretch()
        
        main_layout.addLayout(actions_layout)
        
        # Область прокрутки с темами
        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        
        self.themes_container = QWidget()
        self.themes_layout = QGridLayout()
        self.themes_layout.setSpacing(12)
        self.themes_container.setLayout(self.themes_layout)
        
        scroll_area.setWidget(self.themes_container)
        main_layout.addWidget(scroll_area)
        
        # Кнопка закрытия
        close_btn = QPushButton("Закрыть")
        close_btn.clicked.connect(self.accept)
        main_layout.addWidget(close_btn)
        
        self.setLayout(main_layout)
    
    def load_themes(self):
        """Загрузка тем в галерею"""
        # Очищаем существующие виджеты
        while self.themes_layout.count():
            item = self.themes_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        
        themes = self.gallery_manager.get_all_themes()
        
        if not themes:
            no_themes_label = QLabel("Нет установленных тем. Импортируйте тему для начала.")
            no_themes_label.setAlignment(Qt.AlignCenter)
            no_themes_label.setStyleSheet("color: #5f6368; font-size: 12px; padding: 40px;")
            self.themes_layout.addWidget(no_themes_label)
        else:
            # Добавляем карточки тем
            row = col = 0
            for theme_info in themes:
                card = ThemeCard(theme_info)
                card.selected.connect(self.on_theme_selected)
                self.themes_layout.addWidget(card, row, col)
                
                col += 1
                if col >= 4:  # 4 колонки
                    col = 0
                    row += 1
            
            # Добавляем растяжение в конце сетки
            if row >= 0:
                self.themes_layout.setRowStretch(row + 1, 1)
    
    def on_theme_selected(self, theme_id: str):
        """Обработка выбора темы"""
        print(f"[DEBUG] on_theme_selected: {theme_id}")
        theme = self.gallery_manager.get_theme(theme_id)
        print(f"[DEBUG] theme получена: {theme is not None}")
        if theme:
            print(f"[DEBUG] Эмитим сигнал theme_selected")
            self.theme_selected.emit(theme)
        else:
            print(f"[ERROR] Не удалось загрузить тему {theme_id}")
    
    def on_import_theme(self):
        """Импорт темы из файла"""
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "Выберите файл темы",
            "",
            "Theme Files (*.json);;All Files (*)"
        )
        
        if file_path:
            if self.gallery_manager.import_theme(file_path):
                QMessageBox.information(self, "Успех", "Тема успешно импортирована!")
                self.load_themes()
            else:
                QMessageBox.warning(self, "Ошибка", "Не удалось импортировать тему.")
    
    def on_delete_theme(self):
        """Удаление выбранной темы"""
        # Для демонстрации - просто показываем сообщение
        QMessageBox.information(
            self,
            "Удаление",
            "Выберите тему из галереи и нажмите 'Удалить' на её карточке."
        )
    
    def on_search(self):
        """Поиск тем"""
        query = self.search_input.text()
        if query:
            themes = self.gallery_manager.search_themes(query)
        else:
            themes = self.gallery_manager.get_all_themes()
        
        # Очищаем и перезагружаем
        while self.themes_layout.count():
            item = self.themes_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        
        if not themes:
            no_themes_label = QLabel("Темы не найдены.")
            no_themes_label.setAlignment(Qt.AlignCenter)
            self.themes_layout.addWidget(no_themes_label)
        else:
            row = col = 0
            for theme_info in themes:
                card = ThemeCard(theme_info)
                card.selected.connect(self.on_theme_selected)
                self.themes_layout.addWidget(card, row, col)
                
                col += 1
                if col >= 4:
                    col = 0
                    row += 1
    
    def on_category_changed(self):
        """Изменение фильтра по категории"""
        # Для расширения в будущем
        self.load_themes()
