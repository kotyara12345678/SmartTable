"""
UI компонент галереи пользовательских тем
"""

from PyQt5.QtWidgets import (QDialog, QVBoxLayout, QHBoxLayout, QScrollArea, 
                             QWidget, QPushButton, QLabel, QLineEdit, QComboBox,
                             QGridLayout, QMessageBox, QFileDialog, QFrame, QTabWidget)
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
        
        # Создаем табы для День/Ночь
        self.tabs_widget = QTabWidget()
        
        # Вкладка "День" (светлые темы)
        day_scroll = QScrollArea()
        day_scroll.setWidgetResizable(True)
        self.day_container = QWidget()
        self.day_layout = QGridLayout()
        self.day_layout.setSpacing(12)
        self.day_container.setLayout(self.day_layout)
        day_scroll.setWidget(self.day_container)
        self.tabs_widget.addTab(day_scroll, "☀️ День (Светлые)")
        
        # Вкладка "Ночь" (темные темы)
        night_scroll = QScrollArea()
        night_scroll.setWidgetResizable(True)
        self.night_container = QWidget()
        self.night_layout = QGridLayout()
        self.night_layout.setSpacing(12)
        self.night_container.setLayout(self.night_layout)
        night_scroll.setWidget(self.night_container)
        self.tabs_widget.addTab(night_scroll, "🌙 Ночь (Темные)")
        
        # Вкладка "Все" (все темы)
        all_scroll = QScrollArea()
        all_scroll.setWidgetResizable(True)
        self.all_container = QWidget()
        self.all_layout = QGridLayout()
        self.all_layout.setSpacing(12)
        self.all_container.setLayout(self.all_layout)
        all_scroll.setWidget(self.all_container)
        self.tabs_widget.addTab(all_scroll, "📚 Все")
        
        main_layout.addWidget(self.tabs_widget)
        
        # Кнопка закрытия
        close_btn = QPushButton("Закрыть")
        close_btn.clicked.connect(self.accept)
        main_layout.addWidget(close_btn)
        
        self.setLayout(main_layout)
    
    def load_themes(self):
        """Загрузка тем в галерею"""
        # Очищаем все вкладки
        for layout in [self.day_layout, self.night_layout, self.all_layout]:
            while layout.count():
                item = layout.takeAt(0)
                if item.widget():
                    item.widget().deleteLater()
        
        themes = self.gallery_manager.get_all_themes()
        
        if not themes:
            no_themes_label = QLabel("Нет установленных тем. Импортируйте тему для начала.")
            no_themes_label.setAlignment(Qt.AlignCenter)
            no_themes_label.setStyleSheet("color: #5f6368; font-size: 12px; padding: 40px;")
            self.all_layout.addWidget(no_themes_label)
        else:
            # Сортируем темы по категориям
            day_themes = []  # light
            night_themes = []  # dark
            custom_themes = []  # custom
            
            for theme_info in themes:
                category = theme_info['metadata'].category if hasattr(theme_info['metadata'], 'category') else 'custom'
                
                if category == "light":
                    day_themes.append(theme_info)
                elif category == "dark":
                    night_themes.append(theme_info)
                else:
                    custom_themes.append(theme_info)
            
            # Добавляем темы в День
            if day_themes:
                self._add_themes_to_layout(self.day_layout, day_themes)
            else:
                label = QLabel("Нет светлых тем")
                label.setAlignment(Qt.AlignCenter)
                label.setStyleSheet("color: #5f6368; padding: 40px;")
                self.day_layout.addWidget(label)
            
            # Добавляем темы в Ночь
            if night_themes:
                self._add_themes_to_layout(self.night_layout, night_themes)
            else:
                label = QLabel("Нет темных тем")
                label.setAlignment(Qt.AlignCenter)
                label.setStyleSheet("color: #5f6368; padding: 40px;")
                self.night_layout.addWidget(label)
            
            # Добавляем все темы
            all_themes = day_themes + night_themes + custom_themes
            self._add_themes_to_layout(self.all_layout, all_themes)
    
    def _add_themes_to_layout(self, layout: QGridLayout, themes: list):
        """Добавляет карточки тем в layout"""
        row = col = 0
        for theme_info in themes:
            card = ThemeCard(theme_info)
            card.selected.connect(self.on_theme_selected)
            layout.addWidget(card, row, col)
            
            col += 1
            if col >= 4:  # 4 колонки
                col = 0
                row += 1
        
        # Добавляем растяжение в конце сетки
        if row >= 0:
            layout.setRowStretch(row + 1, 1)
    
    def on_theme_selected(self, theme_id: str):
        """Обработка выбора темы"""
        print(f"[GALLERY] Выбрана тема: {theme_id}")
        theme = self.gallery_manager.get_theme(theme_id)
        print(f"[GALLERY] Тема загружена: {theme is not None}")
        if theme:
            print(f"[GALLERY] Эмитим сигнал с темой {theme.get('id')}")
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
        
        # Очищаем все вкладки
        for layout in [self.day_layout, self.night_layout, self.all_layout]:
            while layout.count():
                item = layout.takeAt(0)
                if item.widget():
                    item.widget().deleteLater()
        
        if not themes:
            no_themes_label = QLabel("Темы не найдены.")
            no_themes_label.setAlignment(Qt.AlignCenter)
            self.all_layout.addWidget(no_themes_label)
        else:
            # Сортируем по категориям
            day_themes = [t for t in themes if getattr(t['metadata'], 'category', 'custom') == 'light']
            night_themes = [t for t in themes if getattr(t['metadata'], 'category', 'custom') == 'dark']
            custom_themes = [t for t in themes if getattr(t['metadata'], 'category', 'custom') == 'custom']
            
            if day_themes:
                self._add_themes_to_layout(self.day_layout, day_themes)
            else:
                label = QLabel("-")
                label.setAlignment(Qt.AlignCenter)
                self.day_layout.addWidget(label)
            
            if night_themes:
                self._add_themes_to_layout(self.night_layout, night_themes)
            else:
                label = QLabel("-")
                label.setAlignment(Qt.AlignCenter)
                self.night_layout.addWidget(label)
            
            # Все в третьей вкладке
            all_themes = day_themes + night_themes + custom_themes
            self._add_themes_to_layout(self.all_layout, all_themes)
    
    def on_category_changed(self):
        """Изменение фильтра по категории"""
        # Для расширения в будущем
        self.load_themes()
