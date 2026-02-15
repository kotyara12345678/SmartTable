"""
Миксин для расширенных функций ячеек электронной таблицы.
Автокорректировка размеров, разделение, замораживание, скрытие ячеек.
"""

from typing import Dict, Any
from PyQt5.QtWidgets import QTableWidgetItem
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont, QMouseEvent, QColor, QBrush


class CellFeaturesMixin:
    """Миксин для расширенных функций ячеек"""

    # 1. АВТОКОРРЕКТИРОВКА РАЗМЕРА ЯЧЕЙКИ
    def auto_adjust_cell(self, row: int, col: int, include_font: bool = True) -> bool:
        """
        Автоматическая корректировка размера ячейки под текст

        Args:
            row: Номер строки
            col: Номер колонки
            include_font: Учитывать размер шрифта при расчете

        Returns:
            True если размер был изменен
        """
        item = self.item(row, col)
        if not item:
            return False

        cell = self.get_cell(row, col)
        if not cell:
            return False

        text = item.text()
        if not text:
            return False

        # Используем текущий шрифт ячейки
        font = item.font() if include_font else QFont()
        fm = self.fontMetrics()
        fm.setFont(font)

        # Рассчитываем ширину
        text_width = fm.horizontalAdvance(text)
        padding = 15  # Отступы
        needed_width = text_width + padding

        # Проверяем многострочный текст
        current_height = self.rowHeight(row)
        if '\n' in text:
            lines = text.split('\n')
            max_line_width = max(fm.horizontalAdvance(line) for line in lines)
            needed_width = max_line_width + padding

            # Рассчитываем нужную высоту
            line_height = fm.height()
            line_spacing = 4
            needed_height = line_height * len(lines) + line_spacing * (len(lines) - 1) + 10

            # Устанавливаем новую высоту если нужно
            if needed_height > current_height:
                self.setRowHeight(row, needed_height)
                self.custom_sizes[(row, col)] = (self.columnWidth(col), needed_height)

        # Устанавливаем новую ширину если нужно
        current_width = self.columnWidth(col)
        if needed_width > current_width:
            new_width = min(needed_width, 500)  # Максимум 500px
            self.setColumnWidth(col, new_width)
            if (row, col) in self.custom_sizes:
                w, h = self.custom_sizes[(row, col)]
                self.custom_sizes[(row, col)] = (new_width, h)
            else:
                self.custom_sizes[(row, col)] = (new_width, current_height)

        self.auto_correction_applied.emit(row, col)
        return True

    def auto_adjust_selection(self):
        """Автокорректировка всех выделенных ячеек"""
        changed = False
        for item in self.selectedItems():
            if self.auto_adjust_cell(item.row(), item.column()):
                changed = True

        if changed:
            self.format_changed.emit()

    def auto_fit_column(self, col_index: int):
        """Автоподгонка ширины колонки под содержимое"""
        if col_index < 0 or col_index >= self.columnCount():
            return

        max_width = 50  # Минимальная ширина
        for row in range(self.rowCount()):
            item = self.item(row, col_index)
            if item and item.text():
                font = item.font()
                fm = self.fontMetrics()
                fm.setFont(font)
                text_width = fm.horizontalAdvance(item.text()) + 20
                max_width = max(max_width, text_width)

        # Устанавливаем новую ширину с ограничением
        new_width = min(max_width, 400)
        self.setColumnWidth(col_index, new_width)

        # Обновляем кастомные размеры для ячеек в этой колонке
        for row in range(self.rowCount()):
            if (row, col_index) in self.custom_sizes:
                _, height = self.custom_sizes[(row, col_index)]
                self.custom_sizes[(row, col_index)] = (new_width, height)

    def auto_fit_row(self, row_index: int):
        """Автоподгонка высоты строки под содержимое"""
        if row_index < 0 or row_index >= self.rowCount():
            return

        max_height = 20  # Минимальная высота
        for col in range(self.columnCount()):
            item = self.item(row_index, col)
            if item and item.text():
                text = item.text()
                if '\n' in text:
                    lines = text.split('\n')
                    font = item.font()
                    fm = self.fontMetrics()
                    fm.setFont(font)
                    line_height = fm.height()
                    line_spacing = 4
                    text_height = line_height * len(lines) + line_spacing * (len(lines) - 1) + 10
                    max_height = max(max_height, text_height)

        # Устанавливаем новую высоту с ограничением
        new_height = min(max_height, 300)
        self.setRowHeight(row_index, new_height)

        # Обновляем кастомные размеры для ячеек в этой строке
        for col in range(self.columnCount()):
            if (row_index, col) in self.custom_sizes:
                width, _ = self.custom_sizes[(row_index, col)]
                self.custom_sizes[(row_index, col)] = (width, new_height)

    # 2. РАСТЯГИВАНИЕ ЯЧЕЙКИ МЫШКОЮ
    def mousePressEvent(self, event: QMouseEvent):
        """Обработка нажатия мыши для изменения размера ячеек"""
        pos = event.pos()

        # Проверяем, не на границе ли ячейки для изменения размера
        if event.button() == Qt.LeftButton:
            row = self.rowAt(pos.y())
            col = self.columnAt(pos.x())

            if row >= 0 and col >= 0:
                rect = self.visualRect(self.model().index(row, col))
                resize_margin = 8  # Отступ для захвата границы

                # Проверяем близость к правой границе
                near_right_edge = abs(pos.x() - (rect.x() + rect.width())) < resize_margin
                # Проверяем близость к нижней границе
                near_bottom_edge = abs(pos.y() - (rect.y() + rect.height())) < resize_margin

                if near_right_edge or near_bottom_edge:
                    self._resizing_cell = (row, col)
                    self._drag_start_pos = pos
                    self._original_size = (self.columnWidth(col), self.rowHeight(row))
                    self._is_dragging = True

                    # Устанавливаем соответствующий курсор
                    if near_right_edge and near_bottom_edge:
                        self.setCursor(Qt.SizeFDiagCursor)
                    elif near_right_edge:
                        self.setCursor(Qt.SizeHorCursor)
                    elif near_bottom_edge:
                        self.setCursor(Qt.SizeVerCursor)

                    event.accept()
                    return

        super().mousePressEvent(event)

    def mouseMoveEvent(self, event: QMouseEvent):
        """Обработка движения мыши"""
        pos = event.pos()

        if self._is_dragging and self._resizing_cell:
            # Изменение размера ячейки
            row, col = self._resizing_cell
            dx = pos.x() - self._drag_start_pos.x()
            dy = pos.y() - self._drag_start_pos.y()

            new_width = max(30, self._original_size[0] + dx)
            new_height = max(15, self._original_size[1] + dy)

            # Определяем, какое измерение изменяем
            rect = self.visualRect(self.model().index(row, col))
            near_right = abs(pos.x() - (rect.x() + rect.width())) < 20
            near_bottom = abs(pos.y() - (rect.y() + rect.height())) < 20

            if near_right:
                self.setColumnWidth(col, new_width)
            if near_bottom:
                self.setRowHeight(row, new_height)

            # Сохраняем кастомный размер
            current_width = self.columnWidth(col)
            current_height = self.rowHeight(row)
            self.custom_sizes[(row, col)] = (current_width, current_height)

        else:
            # Проверяем, не на границе ли курсор
            row = self.rowAt(pos.y())
            col = self.columnAt(pos.x())

            if row >= 0 and col >= 0:
                rect = self.visualRect(self.model().index(row, col))
                resize_margin = 8

                near_right = abs(pos.x() - (rect.x() + rect.width())) < resize_margin
                near_bottom = abs(pos.y() - (rect.y() + rect.height())) < resize_margin

                if near_right and near_bottom:
                    self.setCursor(Qt.SizeFDiagCursor)
                elif near_right:
                    self.setCursor(Qt.SizeHorCursor)
                elif near_bottom:
                    self.setCursor(Qt.SizeVerCursor)
                else:
                    self.setCursor(Qt.ArrowCursor)

        super().mouseMoveEvent(event)

    def mouseReleaseEvent(self, event: QMouseEvent):
        """Обработка отпускания мыши"""
        if self._is_dragging and self._resizing_cell:
            row, col = self._resizing_cell
            self.cell_resized.emit(row, col, self.columnWidth(col), self.rowHeight(row))

            # Сбрасываем состояние
            self._resizing_cell = None
            self._drag_start_pos = None
            self._original_size = None
            self._is_dragging = False
            self.setCursor(Qt.ArrowCursor)

        super().mouseReleaseEvent(event)

    # 3. ДЕЛЕНИЕ ЯЧЕЙКИ НА 2
    def split_cell(self, row: int, col: int, split_type: str = 'vertical'):
        """
        Деление ячейки на 2 части

        Args:
            row: Номер строки
            col: Номер колонки
            split_type: 'vertical' или 'horizontal'
        """
        # Проверяем, не разделена ли уже ячейка
        if (row, col) in self.split_cells:
            QMessageBox.information(self, "Информация", "Ячейка уже разделена")
            return

        # Проверяем границы
        if split_type == 'vertical' and col >= self.columns - 1:
            QMessageBox.warning(self, "Ошибка", "Недостаточно колонок для вертикального разделения")
            return
        elif split_type == 'horizontal' and row >= self.rows - 1:
            QMessageBox.warning(self, "Ошибка", "Недостаточно строк для горизонтального разделения")
            return

        # Сохраняем текущее значение
        cell = self.get_cell(row, col)
        original_value = cell.get_display_value() if cell else ""

        # Добавляем в список разделенных ячеек
        self.split_cells[(row, col)] = split_type

        # Создаем объединение ячеек для визуального эффекта
        if split_type == 'vertical':
            # Объединяем текущую и следующую ячейку по горизонтали
            self.setSpan(row, col, 1, 2)
            # Разделяем значение (первая часть - оригинал, вторая - пустая)
            if col + 1 < self.columns:
                # Создаем вторую ячейку если нужно
                if not self.item(row, col + 1):
                    item = QTableWidgetItem("")
                    self.setItem(row, col + 1, item)
        else:  # horizontal
            # Объединяем текущую и следующую ячейку по вертикали
            self.setSpan(row, col, 2, 1)
            if row + 1 < self.rows:
                if not self.item(row + 1, col):
                    item = QTableWidgetItem("")
                    self.setItem(row + 1, col, item)

        self.cell_split.emit(row, col, split_type)
        self.viewport().update()

    def unsplit_cell(self, row: int, col: int):
        """Убрать разделение ячейки"""
        if (row, col) not in self.split_cells:
            return

        split_type = self.split_cells[(row, col)]

        # Убираем объединение
        self.setSpan(row, col, 1, 1)

        # Удаляем из списка разделенных
        del self.split_cells[(row, col)]

        # Восстанавливаем независимые ячейки
        if split_type == 'vertical' and col + 1 < self.columns:
            # Очищаем вторую ячейку
            item = self.item(row, col + 1)
            if item:
                item.setText("")
        elif split_type == 'horizontal' and row + 1 < self.rows:
            item = self.item(row + 1, col)
            if item:
                item.setText("")

        self.viewport().update()

    # 4. ЗАМОРАЖИВАНИЕ ЯЧЕЙКИ
    def freeze_cell(self, row: int, col: int, freeze: bool = True):
        """
        Заморозить/разморозить ячейку

        Args:
            row: Номер строки
            col: Номер колонки
            freeze: True - заморозить, False - разморозить
        """
        cell = self.get_cell(row, col)
        if not cell:
            return

        item = self.item(row, col)
        if not item:
            return

        if freeze:
            # Добавляем в замороженные
            self.frozen_cells.add((row, col))
            # Делаем read-only
            item.setFlags(item.flags() & ~Qt.ItemIsEditable)
            # Применяем специальное форматирование
            if cell:
                cell.bold = True
                cell.background_color = "#F0F8FF"  # AliceBlue
        else:
            # Убираем из замороженных
            self.frozen_cells.discard((row, col))
            # Разрешаем редактирование
            item.setFlags(item.flags() | Qt.ItemIsEditable)
            # Сбрасываем специальное форматирование
            if cell:
                cell.bold = False
                cell.background_color = None
        self.apply_cell_formatting(row, col)
        self.cell_frozen.emit(row, col, freeze)

    def freeze_selection(self):
        """Заморозить выделенные ячейки"""
        for item in self.selectedItems():
            self.freeze_cell(item.row(), item.column(), True)

    def unfreeze_selection(self):
        """Разморозить выделенные ячейки"""
        for item in self.selectedItems():
            self.freeze_cell(item.row(), item.column(), False)

    # 5. СКРЫТИЕ ЯЧЕЙКИ
    def hide_cell(self, row: int, col: int, hide: bool = True):
        """
        Скрыть/показать ячейку

        Args:
            row: Номер строки
            col: Номер колонки
            hide: True - скрыть, False - показать
        """
        item = self.item(row, col)
        if not item:
            return

        cell = self.get_cell(row, col)
        if not cell:
            return

        if hide:
            # Добавляем в скрытые
            self.hidden_cells.add((row, col))
            # Сохраняем значение
            hidden_value = item.text()
            item.setData(Qt.UserRole + 1, hidden_value)  # Сохраняем скрытое значение
            item.setText("")  # Очищаем отображение
            # Меняем фон для индикации
            cell.background_color = "#E0E0E0"
        else:
            # Убираем из скрытых
            self.hidden_cells.discard((row, col))
            # Восстанавливаем значение
            hidden_value = item.data(Qt.UserRole + 1)
            if hidden_value:
                item.setText(str(hidden_value))
                cell.set_value(str(hidden_value))
            cell.background_color = None

        self.apply_cell_formatting(row, col)
        self.cell_hidden.emit(row, col, hide)

    def hide_selection(self):
        """Скрыть выделенные ячейки"""
        for item in self.selectedItems():
            self.hide_cell(item.row(), item.column(), True)

    def show_selection(self):
        """Показать скрытые ячейки в выделении"""
        for item in self.selectedItems():
            self.hide_cell(item.row(), item.column(), False)

    def split_selected_cell(self, split_type: str):
        """Разделить текущую ячейку"""
        current = self.currentItem()
        if current:
            self.split_cell(current.row(), current.column(), split_type)

    def unsplit_selected_cell(self):
        """Убрать разделение текущей ячейки"""
        current = self.currentItem()
        if current:
            self.unsplit_cell(current.row(), current.column())

    def reset_custom_sizes(self):
        """Сбросить все кастомные размеры"""
        self.custom_sizes.clear()

        # Восстанавливаем стандартные размеры
        for col in range(self.columnCount()):
            self.setColumnWidth(col, 100)

        for row in range(self.rowCount()):
            self.setRowHeight(row, 25)

    # ============ DROPDOWN (ВЫПАДАЮЩИЙ СПИСОК) ============

    def set_dropdown(self, row: int, col: int, options: list):
        """Устанавливает выпадающий список для ячейки (видимый ComboBox со стрелкой)
        
        Args:
            row: номер строки
            col: номер столбца
            options: список вариантов для выбора
        """
        from PyQt5.QtWidgets import QComboBox, QMenu, QAction as QAct
        
        if not options:
            return
        self.dropdown_cells[(row, col)] = list(options)
        
        # Сохраняем в Cell модель
        cell = self.get_cell(row, col)
        if cell and hasattr(cell, 'dropdown_options'):
            cell.dropdown_options = list(options)
        
        # Удаляем старый виджет если есть
        old_widget = self.cellWidget(row, col)
        if old_widget:
            self.removeCellWidget(row, col)
        
        # Создаём ComboBox как постоянный виджет ячейки
        combo = QComboBox()
        combo.addItems(options)
        combo.setStyleSheet("""
            QComboBox {
                border-radius: 0px;
            }
            QComboBox::drop-down {
                border-radius: 0px;
            }
            QComboBox QAbstractItemView {
                border-radius: 0px;
            }
        """)
        
        # Устанавливаем текущее значение если есть
        item = self.item(row, col)
        if item and item.text() in options:
            combo.setCurrentText(item.text())
        
        # При смене значения в ComboBox — обновляем ячейку
        def on_combo_changed(text, r=row, c=col):
            self.set_cell_value(r, c, text)
        
        combo.currentTextChanged.connect(on_combo_changed)
        
        # ПКМ на ComboBox — редактирование/удаление
        combo.setContextMenuPolicy(Qt.CustomContextMenu)
        spreadsheet_ref = self
        def on_combo_context(pos, r=row, c=col):
            menu = QMenu(combo)
            edit_action = menu.addAction("✉ Редактировать список...")
            remove_action = menu.addAction("✖ Удалить список")
            action = menu.exec_(combo.mapToGlobal(pos))
            if action == edit_action:
                spreadsheet_ref._edit_dropdown_at(r, c)
            elif action == remove_action:
                spreadsheet_ref.remove_dropdown(r, c)
        combo.customContextMenuRequested.connect(on_combo_context)
        
        self.setCellWidget(row, col, combo)
        
        # Устанавливаем первое значение если ячейка пустая
        if not item or not item.text():
            self.set_cell_value(row, col, options[0])
        
        print(f"[Dropdown] Set dropdown at ({row},{col}): {options}")

    def _edit_dropdown_at(self, row: int, col: int):
        """Открывает диалог редактирования dropdown для конкретной ячейки"""
        existing = self.get_dropdown_options(row, col)
        self._show_dropdown_editor([(row, col)], existing)

    def remove_dropdown(self, row: int, col: int):
        """Удаляет выпадающий список из ячейки"""
        if (row, col) in self.dropdown_cells:
            del self.dropdown_cells[(row, col)]
        # Удаляем виджет ComboBox
        widget = self.cellWidget(row, col)
        if widget:
            self.removeCellWidget(row, col)
        cell = self.get_cell(row, col)
        if cell and hasattr(cell, 'dropdown_options'):
            cell.dropdown_options = None
        print(f"[Dropdown] Removed dropdown at ({row},{col})")

    def has_dropdown(self, row: int, col: int) -> bool:
        """Проверяет, есть ли выпадающий список у ячейки"""
        return (row, col) in self.dropdown_cells

    def get_dropdown_options(self, row: int, col: int) -> list:
        """Возвращает варианты выпадающего списка"""
        return self.dropdown_cells.get((row, col), [])

    def show_dropdown_dialog(self):
        """Показывает диалог для создания выпадающего списка в выделенных ячейках"""
        from PyQt5.QtWidgets import QMessageBox
        
        selected = self.selectedRanges()
        if not selected:
            QMessageBox.warning(self, "Выпадающий список", "Выделите ячейки для создания выпадающего списка")
            return
        
        # Собираем все ячейки
        cells_list = []
        for sel_range in selected:
            for row in range(sel_range.topRow(), sel_range.bottomRow() + 1):
                for col in range(sel_range.leftColumn(), sel_range.rightColumn() + 1):
                    cells_list.append((row, col))
        
        # Проверяем существующие варианты у первой ячейки
        existing = self.get_dropdown_options(cells_list[0][0], cells_list[0][1]) if cells_list else []
        self._show_dropdown_editor(cells_list, existing)

    def _show_dropdown_editor(self, cells_list: list, existing_options: list = None):
        """Показывает красивый диалог с отдельными полями для каждого варианта"""
        from PyQt5.QtWidgets import (QDialog, QVBoxLayout, QHBoxLayout, QLabel, 
                                      QLineEdit, QPushButton, QScrollArea, QWidget,
                                      QMessageBox, QFrame)
        from PyQt5.QtCore import QSize
        
        dialog = QDialog(self)
        dialog.setWindowTitle("Выпадающий список")
        dialog.setMinimumSize(400, 350)
        dialog.setMaximumSize(500, 600)
        
        main_layout = QVBoxLayout(dialog)
        main_layout.setSpacing(10)
        
        # Заголовок
        title_label = QLabel("Варианты выпадающего списка:")
        title_font = title_label.font()
        title_font.setBold(True)
        title_font.setPointSize(11)
        title_label.setFont(title_font)
        main_layout.addWidget(title_label)
        
        # Прокручиваемая область с полями
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setMinimumHeight(200)
        
        scroll_widget = QWidget()
        options_layout = QVBoxLayout(scroll_widget)
        options_layout.setSpacing(6)
        options_layout.setContentsMargins(4, 4, 4, 4)
        
        scroll.setWidget(scroll_widget)
        main_layout.addWidget(scroll)
        
        # Список полей ввода (храним как пары (field, row_widget))
        option_rows = []  # [(QLineEdit, QWidget), ...]
        
        def _update_numbers():
            """Обновляет нумерацию всех полей"""
            for i, (fld, rw) in enumerate(option_rows):
                lbl = rw.findChild(QLabel)
                if lbl:
                    lbl.setText(f"{i + 1}.")
        
        def add_option_field(text=""):
            """Добавляет новое поле варианта"""
            row_widget = QWidget()
            row_layout = QHBoxLayout(row_widget)
            row_layout.setContentsMargins(0, 0, 0, 0)
            row_layout.setSpacing(6)
            
            # Номер
            num_label = QLabel(f"{len(option_rows) + 1}.")
            num_label.setFixedWidth(24)
            row_layout.addWidget(num_label)
            
            # Поле ввода
            field = QLineEdit()
            field.setText(text)
            field.setPlaceholderText("Введите вариант...")
            field.setMinimumHeight(32)
            row_layout.addWidget(field)
            
            # Кнопка удаления
            del_btn = QPushButton("✖")
            del_btn.setFixedSize(32, 32)
            del_btn.setToolTip("Удалить вариант")
            del_btn.setCursor(Qt.PointingHandCursor)
            del_btn.setStyleSheet("QPushButton { color: #e74c3c; border: 1px solid #ccc; border-radius: 4px; } QPushButton:hover { background: #fde8e8; }")
            
            entry = (field, row_widget)
            
            def remove_field(checked=False, _entry=entry):
                if len(option_rows) <= 1:
                    return  # Не удаляем последнее поле
                try:
                    option_rows.remove(_entry)
                except ValueError:
                    return
                _fld, _rw = _entry
                options_layout.removeWidget(_rw)
                _rw.setParent(None)
                _rw.deleteLater()
                _update_numbers()
            
            del_btn.clicked.connect(remove_field)
            row_layout.addWidget(del_btn)
            
            options_layout.addWidget(row_widget)
            option_rows.append(entry)
            return field
        
        # Заполняем существующими вариантами или пустыми
        if existing_options:
            for opt in existing_options:
                add_option_field(opt)
        else:
            add_option_field("")
            add_option_field("")
        
        # Кнопка "Добавить вариант"
        add_btn = QPushButton("➕ Добавить вариант")
        add_btn.setCursor(Qt.PointingHandCursor)
        add_btn.setMinimumHeight(36)
        add_btn.setStyleSheet("QPushButton { border: 1px dashed #aaa; border-radius: 6px; color: #666; } QPushButton:hover { background: #f0f0f0; color: #333; }")
        add_btn.clicked.connect(lambda: add_option_field(""))
        main_layout.addWidget(add_btn)
        
        # Разделитель
        sep = QFrame()
        sep.setFrameShape(QFrame.HLine)
        main_layout.addWidget(sep)
        
        # Кнопки действий
        btn_layout = QHBoxLayout()
        
        remove_all_btn = QPushButton("Удалить список")
        remove_all_btn.setStyleSheet("QPushButton { color: #e74c3c; }")
        btn_layout.addWidget(remove_all_btn)
        
        btn_layout.addStretch()
        
        cancel_btn = QPushButton("Отмена")
        btn_layout.addWidget(cancel_btn)
        
        ok_btn = QPushButton("Применить")
        ok_btn.setStyleSheet("QPushButton { background: #4CAF50; color: white; padding: 6px 20px; border-radius: 4px; } QPushButton:hover { background: #45a049; }")
        btn_layout.addWidget(ok_btn)
        
        main_layout.addLayout(btn_layout)
        
        def apply_dropdown():
            options = [f.text().strip() for f, rw in option_rows if f.text().strip()]
            if not options:
                QMessageBox.warning(dialog, "Ошибка", "Введите хотя бы один вариант")
                return
            for row, col in cells_list:
                self.set_dropdown(row, col, options)
            dialog.accept()
        
        def remove_all():
            for row, col in cells_list:
                self.remove_dropdown(row, col)
            dialog.accept()
        
        ok_btn.clicked.connect(apply_dropdown)
        cancel_btn.clicked.connect(dialog.reject)
        remove_all_btn.clicked.connect(remove_all)
        
        dialog.exec_()

        self.viewport().update()

    # 7. ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ
    def get_cell_state(self, row: int, col: int) -> Dict[str, Any]:
        """Получить полное состояние ячейки"""
        state = {
            'frozen': (row, col) in self.frozen_cells,
            'hidden': (row, col) in self.hidden_cells,
            'split': self.split_cells.get((row, col)),
            'custom_size': self.custom_sizes.get((row, col)),
            'has_custom_size': (row, col) in self.custom_sizes,
            'row_height': self.rowHeight(row),
            'col_width': self.columnWidth(col)
        }

        if self.spreadsheet:
            cell = self.spreadsheet.get_cell(row, col)
            if cell:
                state['value'] = cell.get_display_value()
                state['formula'] = cell.formula

        return state

    def save_cell_states(self) -> Dict[str, Any]:
        """Сохранить состояния всех ячеек"""
        states = {
            'frozen_cells': list(self.frozen_cells),
            'hidden_cells': list(self.hidden_cells),
            'split_cells': {f"{row},{col}": split_type
                           for (row, col), split_type in self.split_cells.items()},
            'custom_sizes': {f"{row},{col}": size
                           for (row, col), size in self.custom_sizes.items()}
        }

        return states

    def load_cell_states(self, states: Dict[str, Any]):
        """Загрузить состояния ячеек"""
        # Замороженные ячейки
        for cell_str in states.get('frozen_cells', []):
            if isinstance(cell_str, tuple) and len(cell_str) == 2:
                self.freeze_cell(cell_str[0], cell_str[1], True)
            elif isinstance(cell_str, str):
                try:
                    row, col = map(int, cell_str.split(','))
                    self.freeze_cell(row, col, True)
                except:
                    pass

        # Скрытые ячейки
        for cell_str in states.get('hidden_cells', []):
            if isinstance(cell_str, tuple) and len(cell_str) == 2:
                self.hide_cell(cell_str[0], cell_str[1], True)
            elif isinstance(cell_str, str):
                try:
                    row, col = map(int, cell_str.split(','))
                    self.hide_cell(row, col, True)
                except:
                    pass

        # Разделенные ячейки
        for cell_str, split_type in states.get('split_cells', {}).items():
            try:
                row, col = map(int, cell_str.split(','))
                self.split_cells[(row, col)] = split_type

                # Восстанавливаем объединение
                if split_type == 'vertical':
                    self.setSpan(row, col, 1, 2)
                else:
                    self.setSpan(row, col, 2, 1)
            except:
                pass

        # Кастомные размеры
        for cell_str, size in states.get('custom_sizes', {}).items():
            try:
                row, col = map(int, cell_str.split(','))
                if isinstance(size, (list, tuple)) and len(size) == 2:
                    width, height = size
                    self.custom_sizes[(row, col)] = (width, height)

                    # Применяем размеры
                    if col < self.columnCount():
                        self.setColumnWidth(col, width)
                    if row < self.rowCount():
                        self.setRowHeight(row, height)
            except:
                pass

