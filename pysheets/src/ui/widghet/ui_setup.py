"""
Миксин для инициализации UI электронной таблицы.
Настройка заголовков, corner button, темы.
"""

from PyQt5.QtWidgets import (QHeaderView, QAbstractItemView, QStyledItemDelegate,
                              QLineEdit, QAbstractButton, QPushButton, QApplication)
from PyQt5.QtCore import Qt, QTimer, QItemSelection
from PyQt5.QtGui import QPalette


class UISetupMixin:
    """Миксин для инициализации UI таблицы"""

    def init_ui(self):
        """Инициализация интерфейса для 1000×26 таблицы"""
        # Настройка заголовков
        column_labels = []
        for i in range(self.columns):
            label = ""
            n = i
            while n >= 0:
                label = chr(65 + n % 26) + label
                n = n // 26 - 1
                if n < 0:
                    break
            column_labels.append(label)

        self.setHorizontalHeaderLabels(column_labels[:26])

        row_labels = [str(i + 1) for i in range(1000)]
        self.setVerticalHeaderLabels(row_labels)

        # Настройка внешнего вида
        self.setAlternatingRowColors(True)
        self.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectItems)
        self.setSelectionMode(QAbstractItemView.SelectionMode.ContiguousSelection)

        # Настройка заголовков
        header = self.horizontalHeader()
        header.setSectionResizeMode(QHeaderView.ResizeMode.Interactive)
        header.setDefaultSectionSize(100)
        header.setMinimumSectionSize(50)
        header.setHighlightSections(False)
        header.setStretchLastSection(False)
        
        for i in range(self.columns):
            item = self.horizontalHeaderItem(i)
            if item:
                item.setTextAlignment(Qt.AlignCenter)
        
        vertical_header = self.verticalHeader()
        vertical_header.setDefaultSectionSize(34)
        vertical_header.setMinimumSectionSize(20)
        vertical_header.setHighlightSections(False)
        
        for i in range(self.rows):
            item = self.verticalHeaderItem(i)
            if item:
                item.setTextAlignment(Qt.AlignCenter)

        # Настройка сетки
        self.setShowGrid(True)
        self.setGridStyle(Qt.PenStyle.SolidLine)

        # Corner button
        self._hide_qt_corner_button()
        self._create_custom_corner_button()

        # Делегат
        class FullCellDelegate(QStyledItemDelegate):
            def createEditor(self, parent, option, index):
                editor = QLineEdit(parent)
                editor.setFrame(False)
                return editor

            def updateEditorGeometry(self, editor, option, index):
                editor.setGeometry(option.rect)

            def paint(self, painter, option, index):
                from PyQt5.QtWidgets import QStyle
                opt = option
                opt.state &= ~QStyle.State_HasFocus
                super().paint(painter, opt, index)

        self.setItemDelegate(FullCellDelegate(self))

    def _hide_qt_corner_button(self):
        """Полностью скрывает стандартную Qt corner button"""
        corner_widget = self.cornerWidget()
        if corner_widget:
            corner_widget.setVisible(False)
            corner_widget.setMaximumHeight(0)
            corner_widget.setMaximumWidth(0)
        
        for child in self.findChildren(QAbstractButton):
            if child.parent() == corner_widget or (corner_widget and child in corner_widget.findChildren(QAbstractButton)):
                child.setVisible(False)
                child.setMaximumHeight(0)
                child.setMaximumWidth(0)

    def _create_custom_corner_button(self, custom_width=100, custom_height=34):
        """Создаёт собственную corner button и размещает её в углу таблицы"""
        self._corner_button = QPushButton(self)
        self._corner_button.setObjectName("custom_corner_button")
        self._corner_custom_width = custom_width
        self._corner_custom_height = custom_height
        self._corner_button.setFixedSize(custom_width, custom_height)
        self._corner_button.setText("")
        self._corner_button.setToolTip("Выделить всю таблицу")
        self._corner_button.clicked.connect(self._select_all_table)
        QTimer.singleShot(150, lambda: self._apply_corner_button_theme(self._corner_button))
        QTimer.singleShot(100, self._position_corner_button)
        self.horizontalHeader().sectionResized.connect(self._position_corner_button)
        self.verticalHeader().sectionResized.connect(self._position_corner_button)

    def _position_corner_button(self):
        """Размещает corner button в левом верхнем углу таблицы"""
        if not hasattr(self, '_corner_button') or not self._corner_button:
            return
        h_header = self.horizontalHeader()
        v_header = self.verticalHeader()
        if h_header and v_header:
            v_header_width = v_header.width()
            h_header_height = h_header.height()
            self._corner_button.setFixedSize(v_header_width, h_header_height)
            self._corner_button.move(1, 0)
            self._corner_button.raise_()
            self._corner_button.show()
    
    def resizeEvent(self, event):
        """Обработка изменения размера таблицы"""
        super().resizeEvent(event)
        if hasattr(self, '_corner_button') and self._corner_button:
            QTimer.singleShot(20, self._position_corner_button)
    
    def scrollContentsBy(self, dx, dy):
        """Обработка прокрутки таблицы"""
        super().scrollContentsBy(dx, dy)
        if hasattr(self, '_corner_button') and self._corner_button:
            QTimer.singleShot(20, self._position_corner_button)
    
    def _apply_corner_button_theme(self, button):
        """Применяет стили corner button в зависимости от текущей темы"""
        app = QApplication.instance()
        if not app:
            return
        
        is_dark = False
        try:
            header = self.horizontalHeader()
            if header:
                header_color = header.palette().color(QPalette.Window)
                brightness = (header_color.red() + header_color.green() + header_color.blue()) / 3
                is_dark = brightness < 128
        except:
            stylesheet = app.styleSheet()
            if stylesheet:
                if '#1e1e1e' in stylesheet or '#252525' in stylesheet or '#262626' in stylesheet:
                    is_dark = True
                elif '#ffffff' in stylesheet or '#f8f9fa' in stylesheet:
                    is_dark = False
            else:
                palette = app.palette()
                window_color = palette.color(QPalette.Window)
                brightness = (window_color.red() + window_color.green() + window_color.blue()) / 3
                is_dark = brightness < 128
        
        if is_dark:
            button.setStyleSheet("""
                QPushButton {
                    background-color: #262626;
                    border: 1px solid #4a4a4a;
                    border-radius: 0px;
                }
                QPushButton:hover {
                    background-color: #353535;
                    border-color: #5a5a5a;
                }
                QPushButton:pressed {
                    background-color: #454545;
                    border-color: #6a6a6a;
                }
            """)
        else:
            button.setStyleSheet("""
                QPushButton {
                    background-color: #f8f9fa;
                    border: 1px solid #dadce0;
                    border-radius: 0px;
                }
                QPushButton:hover {
                    background-color: #f1f3f4;
                    border-color: #c6c6c6;
                }
                QPushButton:pressed {
                    background-color: #e8eaed;
                    border-color: #bfbfbf;
                }
            """)
    
    def update_corner_button_theme(self):
        """Обновление стилей corner button при смене темы"""
        if hasattr(self, '_corner_button') and self._corner_button:
            self._apply_corner_button_theme(self._corner_button)
    
    def _select_all_table(self):
        """Выделяет всю таблицу при клике на corner button"""
        last_row = self.rowCount() - 1
        last_col = self.columnCount() - 1
        if last_row >= 0 and last_col >= 0:
            top_left = self.model().index(0, 0)
            bottom_right = self.model().index(last_row, last_col)
            selection = QItemSelection(top_left, bottom_right)
            self.selectionModel().select(selection, self.selectionModel().Select)
