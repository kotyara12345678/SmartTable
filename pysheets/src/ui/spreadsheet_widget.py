"""
Виджет электронной таблицы
"""
from PyQt6.QtWidgets import (
    QTableWidget, QTableWidgetItem, QHeaderView,
    QAbstractItemView, QMenu, QInputDialog, QMessageBox
)
from PyQt6.QtCore import Qt, pyqtSignal, QPoint, QTimer
from PyQt6.QtGui import QColor, QBrush, QFont, QAction, QKeyEvent
from typing import Optional


class SpreadsheetWidget(QTableWidget):
    """Виджет электронной таблицы"""

    # Сигналы
    cellChanged = pyqtSignal(int, int, object)  # row, col, value
    selectionChangedSignal = pyqtSignal(int, int, int, int)  # start_row, start_col, end_row, end_col

    def __init__(self, rows: int = 100, cols: int = 26, parent=None):
        super().__init__(rows, cols, parent)

        self.spreadsheet = None
        self.undo_stack = []
        self.redo_stack = []
        self.max_undo_steps = 100
        self.is_editing = False

        self._setup_ui()
        self._setup_connections()
        self._setup_context_menu()

    def _setup_ui(self):
        """Настройка интерфейса"""
        # Заголовки столбцов (A, B, C, ...)
        for col in range(self.columnCount()):
            self.setHorizontalHeaderItem(col, QTableWidgetItem(self._col_letter(col)))

        # Заголовки строк (1, 2, 3, ...)
        for row in range(self.rowCount()):
            self.setVerticalHeaderItem(row, QTableWidgetItem(str(row + 1)))

        # Настройки таблицы
        self.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Interactive)
        self.verticalHeader().setDefaultSectionSize(24)
        self.setShowGrid(True)
        self.setAlternatingRowColors(True)

        # Разрешаем выделение диапазона
        self.setSelectionMode(QAbstractItemView.SelectionMode.ContiguousSelection)
        self.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectItems)

        # Настройки редактирования
        self.setEditTriggers(QAbstractItemView.EditTrigger.DoubleClicked |
                             QAbstractItemView.EditTrigger.AnyKeyPressed)

        # Стили
        self.setStyleSheet("""
            QTableWidget {
                gridline-color: #d0d0d0;
                background-color: white;
                alternate-background-color: #f8f8f8;
            }
            QTableWidget::item {
                padding: 2px 4px;
            }
            QTableWidget::item:selected {
                background-color: #cce8ff;
            }
            QHeaderView::section {
                background-color: #f0f0f0;
                padding: 4px;
                border: 1px solid #d0d0d0;
                font-weight: bold;
            }
        """)

    def _setup_connections(self):
        """Настройка сигналов"""
        self.cellChanged.connect(self._on_cell_changed)
        self.itemSelectionChanged.connect(self._on_selection_changed)

    def _setup_context_menu(self):
        """Настройка контекстного меню"""
        self.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.customContextMenuRequested.connect(self._show_context_menu)

    def set_spreadsheet(self, spreadsheet):
        """Установить объект таблицы"""
        self.spreadsheet = spreadsheet
        self.spreadsheet.add_listener(self._on_spreadsheet_changed)
        self.refresh()

    def refresh(self):
        """Обновить отображение таблицы"""
        if not self.spreadsheet:
            return

        # Устанавливаем размеры
        self.setRowCount(self.spreadsheet.rows)
        self.setColumnCount(self.spreadsheet.cols)

        # Обновляем заголовки
        for col in range(self.columnCount()):
            if self.horizontalHeaderItem(col) is None:
                self.setHorizontalHeaderItem(col, QTableWidgetItem(self._col_letter(col)))
            else:
                self.horizontalHeaderItem(col).setText(self._col_letter(col))

        for row in range(self.rowCount()):
            if self.verticalHeaderItem(row) is None:
                self.setVerticalHeaderItem(row, QTableWidgetItem(str(row + 1)))
            else:
                self.verticalHeaderItem(row).setText(str(row + 1))

        # Заполняем данные
        for r in range(self.spreadsheet.rows):
            for c in range(self.spreadsheet.cols):
                cell = self.spreadsheet.get_cell(r, c)
                self._update_cell_display(r, c, cell)

    def _update_cell_display(self, row: int, col: int, cell):
        """Обновить отображение ячейки"""
        item = self.item(row, col)
        if not item:
            item = QTableWidgetItem()
            self.setItem(row, col, item)

        # Устанавливаем значение
        display_value = cell.display_value
        item.setText(display_value)

        # Устанавливаем выравнивание
        if cell.cell_type.name == "NUMBER":
            item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
        else:
            item.setTextAlignment(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter)

        # Устанавливаем цвет для формул
        if cell.formula:
            item.setForeground(QColor("#0066CC"))
            item.setFont(QFont("Consolas", 10, QFont.Weight.Bold))
        else:
            item.setForeground(QColor("#000000"))
            item.setFont(QFont("Arial", 10))

        # Применяем форматирование
        if cell.format:
            if cell.format.font_bold:
                font = item.font()
                font.setBold(True)
                item.setFont(font)

            if cell.format.font_italic:
                font = item.font()
                font.setItalic(True)
                item.setFont(font)

            if cell.format.font_color:
                item.setForeground(QColor(cell.format.font_color))

            if cell.format.bg_color and cell.format.bg_color != "#FFFFFF":
                item.setBackground(QBrush(QColor(cell.format.bg_color)))

    def _col_letter(self, col: int) -> str:
        """Преобразовать номер колонки в букву (0 -> A)"""
        result = ""
        while col >= 0:
            result = chr(col % 26 + 65) + result
            col = col // 26 - 1
        return result

    def _col_number(self, letters: str) -> int:
        """Преобразовать букву колонки в номер (A -> 0)"""
        result = 0
        for letter in letters:
            result = result * 26 + (ord(letter.upper()) - 64)
        return result - 1

    def _on_cell_changed(self, row: int, col: int):
        """Обработчик изменения ячейки в виджете"""
        if not self.spreadsheet or self.is_editing:
            return

        item = self.item(row, col)
        if not item:
            return

        text = item.text()

        # Проверяем, является ли текст формулой
        if text.startswith('='):
            self.spreadsheet.set_cell(row, col, None, text)
        else:
            # Пробуем преобразовать в число
            try:
                # Убираем пробелы и запятые как разделители тысяч
                clean_text = text.replace(' ', '').replace(',', '')
                if '.' in clean_text:
                    value = float(clean_text)
                else:
                    value = int(clean_text)
            except ValueError:
                value = text

            self.spreadsheet.set_cell(row, col, value)

        # Обновляем отображение ячейки
        cell = self.spreadsheet.get_cell(row, col)
        self._update_cell_display(row, col, cell)

    def _on_spreadsheet_changed(self, row: int, col: int):
        """Обработчик изменения в объекте таблицы"""
        if not self.spreadsheet or self.is_editing:
            return

        cell = self.spreadsheet.get_cell(row, col)
        self._update_cell_display(row, col, cell)

    def _on_selection_changed(self):
        """Обработчик изменения выделения"""
        ranges = self.selectedRanges()
        if ranges:
            range_ = ranges[0]
            self.selectionChangedSignal.emit(
                range_.topRow(),
                range_.leftColumn(),
                range_.bottomRow(),
                range_.rightColumn()
            )

    def insert_row(self, position: int):
        """Вставить строку"""
        if self.spreadsheet:
            self.spreadsheet.insert_row(position)
            self.refresh()

        # Обновить нумерацию
        for row in range(self.rowCount()):
            if self.verticalHeaderItem(row) is None:
                self.setVerticalHeaderItem(row, QTableWidgetItem(str(row + 1)))
            else:
                self.verticalHeaderItem(row).setText(str(row + 1))

    def insert_column(self, position: int):
        """Вставить столбец"""
        if self.spreadsheet:
            self.spreadsheet.insert_column(position)
            self.refresh()

        # Обновить буквы столбцов
        for col in range(self.columnCount()):
            if self.horizontalHeaderItem(col) is None:
                self.setHorizontalHeaderItem(col, QTableWidgetItem(self._col_letter(col)))
            else:
                self.horizontalHeaderItem(col).setText(self._col_letter(col))

    def delete_selected_rows(self):
        """Удалить выбранные строки"""
        rows = set()
        for item in self.selectedItems():
            rows.add(item.row())

        if not rows:
            return

        # Удаляем в обратном порядке, чтобы индексы не сдвигались
        for row in sorted(rows, reverse=True):
            if self.spreadsheet:
                self.spreadsheet.delete_row(row)

        self.refresh()

    def delete_selected_columns(self):
        """Удалить выбранные столбцы"""
        cols = set()
        for item in self.selectedItems():
            cols.add(item.column())

        if not cols:
            return

        # Удаляем в обратном порядке
        for col in sorted(cols, reverse=True):
            if self.spreadsheet:
                self.spreadsheet.delete_column(col)

        self.refresh()

    def clear_selection(self):
        """Очистить выбранные ячейки"""
        if not self.spreadsheet:
            return

        for item in self.selectedItems():
            row, col = item.row(), item.column()
            self.spreadsheet.set_cell(row, col, None)
            self._update_cell_display(row, col, self.spreadsheet.get_cell(row, col))

    def copy_selection(self):
        """Копировать выделение в буфер обмена"""
        if not self.spreadsheet:
            return

        from PyQt6.QtGui import QGuiApplication

        selected_range = self._get_selected_range()
        if not selected_range:
            return

        start_row, start_col, end_row, end_col = selected_range

        # Собираем данные
        data = []
        for r in range(start_row, end_row + 1):
            row_data = []
            for c in range(start_col, end_col + 1):
                cell = self.spreadsheet.get_cell(r, c)
                row_data.append(str(cell.display_value))
            data.append('\t'.join(row_data))

        clipboard_text = '\n'.join(data)
        QGuiApplication.clipboard().setText(clipboard_text)

    def paste_selection(self):
        """Вставить из буфера обмена"""
        if not self.spreadsheet:
            return

        from PyQt6.QtGui import QGuiApplication

        clipboard_text = QGuiApplication.clipboard().text()
        if not clipboard_text:
            return

        # Получаем текущую ячейку
        current_row = self.currentRow()
        current_col = self.currentColumn()

        # Разбираем данные
        rows = clipboard_text.split('\n')
        for i, row_text in enumerate(rows):
            if not row_text.strip():
                continue

            cols = row_text.split('\t')
            for j, cell_text in enumerate(cols):
                target_row = current_row + i
                target_col = current_col + j

                if target_row < self.spreadsheet.rows and target_col < self.spreadsheet.cols:
                    # Проверяем, является ли текст формулой
                    if cell_text.startswith('='):
                        self.spreadsheet.set_cell(target_row, target_col, None, cell_text)
                    else:
                        # Пробуем преобразовать в число
                        try:
                            clean_text = cell_text.replace(' ', '').replace(',', '')
                            if '.' in clean_text:
                                value = float(clean_text)
                            else:
                                value = int(clean_text)
                        except ValueError:
                            value = cell_text

                        self.spreadsheet.set_cell(target_row, target_col, value)

                    # Обновляем отображение
                    cell = self.spreadsheet.get_cell(target_row, target_col)
                    self._update_cell_display(target_row, target_col, cell)

    def _get_selected_range(self):
        """Получить выделенный диапазон"""
        ranges = self.selectedRanges()
        if not ranges:
            return None

        range_ = ranges[0]
        return (
            range_.topRow(),
            range_.leftColumn(),
            range_.bottomRow(),
            range_.rightColumn()
        )

    def _show_context_menu(self, position: QPoint):
        """Показать контекстное меню"""
        menu = QMenu(self)

        # Получаем выбранные ячейки
        selected_range = self._get_selected_range()

        menu.addAction("Копировать (Ctrl+C)", self.copy_selection)
        menu.addAction("Вставить (Ctrl+V)", self.paste_selection)
        menu.addAction("Вырезать (Ctrl+X)", self.cut_selection)
        menu.addSeparator()

        if selected_range:
            menu.addAction("Очистить", self.clear_selection)
            menu.addSeparator()

            start_row, start_col, end_row, end_col = selected_range

            # Проверяем, выделена ли вся строка/столбец
            if start_col == 0 and end_col == self.columnCount() - 1:
                menu.addAction("Удалить строки", self.delete_selected_rows)
                menu.addAction("Вставить строку выше",
                               lambda: self.insert_row(start_row))
                menu.addAction("Вставить строку ниже",
                               lambda: self.insert_row(end_row + 1))

            elif start_row == 0 and end_row == self.rowCount() - 1:
                menu.addAction("Удалить столбцы", self.delete_selected_columns)
                menu.addAction("Вставить столбец слева",
                               lambda: self.insert_column(start_col))
                menu.addAction("Вставить столбец справа",
                               lambda: self.insert_column(end_col + 1))

            else:
                menu.addAction("Вставить строку выше",
                               lambda: self.insert_row(self.currentRow()))
                menu.addAction("Вставить столбец слева",
                               lambda: self.insert_column(self.currentColumn()))

        menu.addSeparator()
        menu.addAction("Форматировать ячейки...", self.show_format_dialog)
        menu.addAction("Вставить формулу...", self.insert_formula)

        menu.exec(self.viewport().mapToGlobal(position))

    def cut_selection(self):
        """Вырезать выделение"""
        self.copy_selection()
        self.clear_selection()

    def show_format_dialog(self):
        """Показать диалог форматирования"""
        # TODO: Реализовать диалог форматирования
        QMessageBox.information(self, "Форматирование", "Диалог форматирования будет реализован позже")

    def insert_formula(self):
        """Вставить формулу"""
        row, col = self.currentRow(), self.currentColumn()
        formula, ok = QInputDialog.getText(
            self, "Вставить формулу",
            f"Введите формулу для ячейки {self._col_letter(col)}{row + 1}:",
            text="="
        )

        if ok and formula:
            if self.spreadsheet:
                self.spreadsheet.set_cell(row, col, None, formula)
                cell = self.spreadsheet.get_cell(row, col)
                self._update_cell_display(row, col, cell)

    def keyPressEvent(self, event: QKeyEvent):
        """Обработка нажатий клавиш"""
        # Ctrl+C - копировать
        if event.modifiers() == Qt.KeyboardModifier.ControlModifier and event.key() == Qt.Key.Key_C:
            self.copy_selection()
            event.accept()
            return

        # Ctrl+V - вставить
        elif event.modifiers() == Qt.KeyboardModifier.ControlModifier and event.key() == Qt.Key.Key_V:
            self.paste_selection()
            event.accept()
            return

        # Ctrl+X - вырезать
        elif event.modifiers() == Qt.KeyboardModifier.ControlModifier and event.key() == Qt.Key.Key_X:
            self.cut_selection()
            event.accept()
            return

        # Ctrl+Z - отмена
        elif event.modifiers() == Qt.KeyboardModifier.ControlModifier and event.key() == Qt.Key.Key_Z:
            # TODO: Реализовать отмену
            pass

        # Ctrl+Y - повтор
        elif event.modifiers() == Qt.KeyboardModifier.ControlModifier and event.key() == Qt.Key.Key_Y:
            # TODO: Реализовать повтор
            pass

        # Delete - очистить
        elif event.key() == Qt.Key.Key_Delete:
            self.clear_selection()
            event.accept()
            return

        super().keyPressEvent(event)