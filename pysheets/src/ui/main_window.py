
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout,
    QMenuBar, QStatusBar, QToolBar, QMessageBox,
    QTableWidget, QTableWidgetItem, QMenu, QFileDialog
)
from PyQt6.QtCore import Qt, QSize
from PyQt6.QtGui import QAction, QIcon, QKeySequence
import os


class MainWindow(QMainWindow):

    def __init__(self):
        super().__init__()
        self.setWindowTitle("PySheets")
        self.setGeometry(100, 100, 1200, 800)

        # Текущий файл
        self.current_file = None

        # Создаем UI
        self._create_actions()
        self._create_menubar()
        self._create_toolbar()
        self._create_statusbar()
        self._create_central_widget()

        # Пример данных
        self._load_sample_data()

    def _create_actions(self):
        # Файл
        self.new_action = QAction("&Новый", self)
        self.new_action.setShortcut(QKeySequence.StandardKey.New)
        self.new_action.triggered.connect(self.new_file)

        self.open_action = QAction("&Открыть", self)
        self.open_action.setShortcut(QKeySequence.StandardKey.Open)
        self.open_action.triggered.connect(self.open_file)

        self.save_action = QAction("&Сохранить", self)
        self.save_action.setShortcut(QKeySequence.StandardKey.Save)
        self.save_action.triggered.connect(self.save_file)

        self.save_as_action = QAction("Сохранить &как...", self)
        self.save_as_action.setShortcut(QKeySequence.StandardKey.SaveAs)
        self.save_as_action.triggered.connect(self.save_as_file)

        self.exit_action = QAction("В&ыход", self)
        self.exit_action.setShortcut(QKeySequence.StandardKey.Quit)
        self.exit_action.triggered.connect(self.close)

        # Редактирование
        self.copy_action = QAction("&Копировать", self)
        self.copy_action.setShortcut(QKeySequence.StandardKey.Copy)
        self.copy_action.triggered.connect(self.copy)

        self.paste_action = QAction("&Вставить", self)
        self.paste_action.setShortcut(QKeySequence.StandardKey.Paste)
        self.paste_action.triggered.connect(self.paste)

        self.cut_action = QAction("&Вырезать", self)
        self.cut_action.setShortcut(QKeySequence.StandardKey.Cut)
        self.cut_action.triggered.connect(self.cut)

        # Вид
        self.zoom_in_action = QAction("Увеличить", self)
        self.zoom_in_action.setShortcut(QKeySequence.StandardKey.ZoomIn)

        self.zoom_out_action = QAction("Уменьшить", self)
        self.zoom_out_action.setShortcut(QKeySequence.StandardKey.ZoomOut)

        # Справка
        self.about_action = QAction("О &программе", self)
        self.about_action.triggered.connect(self.about)

    def _create_menubar(self):
        """Создание меню"""
        menubar = self.menuBar()

        # Меню Файл
        file_menu = menubar.addMenu("&Файл")
        file_menu.addAction(self.new_action)
        file_menu.addAction(self.open_action)
        file_menu.addAction(self.save_action)
        file_menu.addAction(self.save_as_action)
        file_menu.addSeparator()
        file_menu.addAction(self.exit_action)

        # Меню Правка
        edit_menu = menubar.addMenu("&Правка")
        edit_menu.addAction(self.cut_action)
        edit_menu.addAction(self.copy_action)
        edit_menu.addAction(self.paste_action)

        # Меню Вид
        view_menu = menubar.addMenu("&Вид")
        view_menu.addAction(self.zoom_in_action)
        view_menu.addAction(self.zoom_out_action)

        # Меню Справка
        help_menu = menubar.addMenu("&Справка")
        help_menu.addAction(self.about_action)

    def _create_toolbar(self):
        """Создание панели инструментов"""
        toolbar = QToolBar("Основная панель")
        toolbar.setIconSize(QSize(24, 24))
        self.addToolBar(toolbar)

        toolbar.addAction(self.new_action)
        toolbar.addAction(self.open_action)
        toolbar.addAction(self.save_action)
        toolbar.addSeparator()
        toolbar.addAction(self.copy_action)
        toolbar.addAction(self.paste_action)
        toolbar.addAction(self.cut_action)

    def _create_statusbar(self):
        """Создание строки состояния"""
        self.statusbar = QStatusBar()
        self.setStatusBar(self.statusbar)
        self.statusbar.showMessage("Готово")

    def _create_central_widget(self):
        """Создание центрального виджета"""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)

        layout = QVBoxLayout()
        layout.setContentsMargins(0, 0, 0, 0)
        central_widget.setLayout(layout)

        # Создаем таблицу
        self.table = QTableWidget(100, 26)

        # Настраиваем заголовки столбцов (A, B, C...)
        for col in range(26):
            self.table.setHorizontalHeaderItem(col, QTableWidgetItem(chr(65 + col)))

        # Настраиваем заголовки строк (1, 2, 3...)
        for row in range(100):
            self.table.setVerticalHeaderItem(row, QTableWidgetItem(str(row + 1)))

        # Настройки таблицы
        self.table.setAlternatingRowColors(True)
        self.table.setShowGrid(True)

        # Стили
        self.table.setStyleSheet("""
            QTableWidget {
                background-color: white;
                gridline-color: #e0e0e0;
                font-family: Arial;
                font-size: 11px;
            }
            QTableWidget::item {
                padding: 2px 4px;
                border: none;
            }
            QTableWidget::item:selected {
                background-color: #cce8ff;
                color: black;
            }
            QHeaderView::section {
                background-color: #f5f5f5;
                padding: 4px 8px;
                border: 1px solid #e0e0e0;
                font-weight: bold;
                color: #333333;
            }
        """)

        layout.addWidget(self.table)

        # Подключаем сигналы
        self.table.cellChanged.connect(self.on_cell_changed)

    def _load_sample_data(self):
        """Загрузить пример данных"""
        sample_data = [
            ["Товар", "Количество", "Цена", "Сумма"],
            ["Яблоки", 10, 50, 500],
            ["Бананы", 5, 30, 150],
            ["Апельсины", 8, 40, 320],
            ["", "", "Итого:", 970]
        ]

        for row, row_data in enumerate(sample_data):
            for col, value in enumerate(row_data):
                item = QTableWidgetItem(str(value))

                # Выделяем заголовки
                if row == 0:
                    item.setBackground(Qt.GlobalColor.lightGray)
                    font = item.font()
                    font.setBold(True)
                    item.setFont(font)

                # Выравнивание для чисел
                if isinstance(value, (int, float)):
                    item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)

                self.table.setItem(row, col, item)

    def new_file(self):
        """Создать новый файл"""
        reply = QMessageBox.question(
            self, "Новый файл",
            "Создать новую таблицу? Несохраненные данные будут потеряны.",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )

        if reply == QMessageBox.StandardButton.Yes:
            self.table.clearContents()
            self.current_file = None
            self.setWindowTitle("PySheets - Новая таблица")
            self.statusbar.showMessage("Создана новая таблица")

    def open_file(self):
        """Открыть файл"""
        file_name, _ = QFileDialog.getOpenFileName(
            self, "Открыть файл", "",
            "Таблицы (*.csv *.xlsx);;Все файлы (*.*)"
        )

        if file_name:
            try:
                # TODO: Реализовать загрузку файлов
                self.current_file = file_name
                self.setWindowTitle(f"PySheets - {os.path.basename(file_name)}")
                self.statusbar.showMessage(f"Открыт файл: {file_name}")
            except Exception as e:
                QMessageBox.critical(self, "Ошибка", f"Не удалось открыть файл: {str(e)}")

    def save_file(self):
        """Сохранить файл"""
        if self.current_file:
            self._save_to_file(self.current_file)
        else:
            self.save_as_file()

    def save_as_file(self):
        """Сохранить как"""
        file_name, _ = QFileDialog.getSaveFileName(
            self, "Сохранить как", "",
            "CSV файлы (*.csv);;Excel файлы (*.xlsx);;Все файлы (*.*)"
        )

        if file_name:
            self.current_file = file_name
            self._save_to_file(file_name)

    def _save_to_file(self, file_name):
        """Сохранить данные в файл"""
        try:
            # TODO: Реализовать сохранение в разных форматах
            with open(file_name, 'w', encoding='utf-8') as f:
                # Простое сохранение как CSV
                for row in range(self.table.rowCount()):
                    row_data = []
                    for col in range(self.table.columnCount()):
                        item = self.table.item(row, col)
                        if item:
                            row_data.append(item.text())
                        else:
                            row_data.append("")
                    f.write(",".join(row_data) + "\n")

            self.setWindowTitle(f"PySheets - {os.path.basename(file_name)}")
            self.statusbar.showMessage(f"Файл сохранен: {file_name}")

        except Exception as e:
            QMessageBox.critical(self, "Ошибка", f"Не удалось сохранить файл: {str(e)}")

    def copy(self):
        """Копировать выделенное"""
        selected = self.table.selectedItems()
        if selected:
            text = "\t".join([item.text() for item in selected])
            from PyQt6.QtGui import QGuiApplication
            QGuiApplication.clipboard().setText(text)
            self.statusbar.showMessage("Скопировано в буфер обмена")

    def paste(self):
        """Вставить из буфера обмена"""
        from PyQt6.QtGui import QGuiApplication
        clipboard = QGuiApplication.clipboard()
        text = clipboard.text()

        if text:
            rows = text.split('\n')
            current_row = self.table.currentRow()
            current_col = self.table.currentColumn()

            for i, row in enumerate(rows):
                if not row.strip():
                    continue

                cols = row.split('\t')
                for j, value in enumerate(cols):
                    target_row = current_row + i
                    target_col = current_col + j

                    if target_row < self.table.rowCount() and target_col < self.table.columnCount():
                        self.table.setItem(target_row, target_col, QTableWidgetItem(value))

            self.statusbar.showMessage("Вставлено из буфера обмена")

    def cut(self):
        """Вырезать выделенное"""
        self.copy()
        for item in self.table.selectedItems():
            item.setText("")
        self.statusbar.showMessage("Вырезано в буфер обмена")

    def on_cell_changed(self, row, col):
        """Обработчик изменения ячейки"""
        item = self.table.item(row, col)
        if item:
            value = item.text()

            # Автоматическое форматирование чисел
            try:
                # Пробуем преобразовать в число
                num = float(value.replace(',', '.'))
                item.setText(str(num))
                item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
            except ValueError:
                # Если не число, выравниваем по левому краю
                item.setTextAlignment(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter)

            self.statusbar.showMessage(f"Ячейка {chr(65 + col)}{row + 1}: {value}")

    def about(self):
        """Показать информацию о программе"""
        QMessageBox.about(
            self, "О программе PySheets",
            "<h3>PySheets v1.0.0</h3>"
            "<p>Современный табличный редактор на Python</p>"
            "<p>Функции:</p>"
            "<ul>"
            "<li>Создание и редактирование таблиц</li>"
            "<li>Копирование/вставка данных</li>"
            "<li>Базовое форматирование</li>"
            "<li>Сохранение в CSV</li>"
            "</ul>"
            "<p>© 2024 PySheets Team</p>"
        )

    def closeEvent(self, event):
        """Обработчик закрытия окна"""
        reply = QMessageBox.question(
            self, "Выход",
            "Вы уверены, что хотите выйти?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )

        if reply == QMessageBox.StandardButton.Yes:
            event.accept()
        else:
            event.ignore()