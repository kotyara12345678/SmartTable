"""
Миксин для операций редактирования электронной таблицы.
Копирование, вставка, форматирование, вставка/удаление строк, перемещение ячеек.
"""

import pandas as pd
from typing import List, Dict, Any, Optional

from PyQt5.QtWidgets import QTableWidgetItem, QColorDialog, QApplication, QDialog
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QColor, QBrush, QFont


class EditingMixin:
    """Миксин для операций редактирования"""

    # 8. ОРИГИНАЛЬНЫЕ МЕТОДЫ
    def add_ai_data(self, data: List[List[str]], start_row: int = 0, start_col: int = 0) -> bool:
        """Добавить данные от AI"""
        try:
            for row_idx, row in enumerate(data):
                actual_row = start_row + row_idx
                if actual_row >= self.rows:
                    break
                for col_idx, value in enumerate(row):
                    actual_col = start_col + col_idx
                    if actual_col >= self.columns:
                        break
                    self.set_cell_value(actual_row, actual_col, str(value))
            return True
        except Exception as e:
            print(f"[ERROR] Failed to add AI data: {e}")
            return False

    def open_sort_dialog(self):
        """Открывает диалог сортировки и применяет выбранные опции"""
        from pysheets.src.ui.dialog.sort_dialog import SortDialog
        selected = self.selectedRanges()
        if selected:
            rng = selected[0]
            start_col = rng.leftColumn()
            end_col = rng.rightColumn()
            # Собираем метки колонок (буквы)
            cols = [chr(65 + c) for c in range(start_col, end_col + 1)]
        else:
            # Если нет выделения, используем все колонки виджета
            cols = [chr(65 + c) for c in range(self.columns)]

        dlg = SortDialog(cols, self)
        if dlg.exec_() != QDialog.Accepted:
            return
        cfg = dlg.get_sort_config()
        # Применяем сортировку
        self.apply_sort(cfg, selected[0] if selected else None)

    def apply_sort(self, cfg: dict, range_obj=None):
        """Применяет сортировку к диапазону или ко всему листу."""
        import math

        if range_obj:
            top = range_obj.topRow()
            bottom = range_obj.bottomRow()
            left = range_obj.leftColumn()
            right = range_obj.rightColumn()
        else:
            top, bottom, left, right = 0, self.rows - 1, 0, self.columns - 1

        # Определяем стартовую строку данных (если есть заголовок в выделении)
        data_top = top + 1 if cfg.get('has_header', False) else top

        # Считываем строки в виде списка списков
        rows = []
        for r in range(data_top, bottom + 1):
            row_vals = []
            for c in range(left, right + 1):
                cell = self.get_cell(r, c)
                val = cell.get_display_value() if cell else ''
                row_vals.append(val)
            rows.append((r, row_vals))

        if not rows:
            return

        # Вспомогательная функция для преобразования по типу
        def convert_value(v, typ):
            if v is None or v == '':
                return None
            s = str(v)
            if typ == 'Numeric':
                try:
                    return float(s.replace(',', '.'))
                except:
                    return math.nan
            elif typ == 'Date':
                from datetime import datetime
                for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%Y/%m/%d"):
                    try:
                        return datetime.strptime(s, fmt)
                    except:
                        continue
                return s
            else:
                return s.lower()

        # Сортируем по уровням
        levels = cfg.get('levels', [])
        for level in reversed(levels):
            col_idx = left + int(level.get('column', 0))
            typ = level.get('type', 'Automatic')
            order = level.get('order', 'ASC')

            def key_fn(item):
                _, rowvals = item
                rel_idx = col_idx - left
                if rel_idx < 0 or rel_idx >= len(rowvals):
                    return None
                v = rowvals[rel_idx]
                if typ == 'Automatic':
                    try:
                        return float(str(v).replace(',', '.'))
                    except:
                        return str(v).lower()
                return convert_value(v, typ)

            reverse = True if order == 'DESC' else False
            try:
                rows.sort(key=key_fn, reverse=reverse)
            except TypeError:
                rows.sort(key=lambda it: str(key_fn(it)), reverse=reverse)

        # Записываем отсортированные значения обратно
        for i, (orig_r, rowvals) in enumerate(rows):
            target_r = data_top + i
            for j, v in enumerate(rowvals):
                col = left + j
                # Устанавливаем значение
                item = self.item(target_r, col)
                if not item:
                    item = QTableWidgetItem()
                    self.setItem(target_r, col, item)
                self._updating = True
                item.setText(str(v))
                self._updating = False
                # Обновляем модель
                if self.spreadsheet:
                    self.spreadsheet.set_cell_value(target_r, col, str(v))
                self.apply_cell_formatting(target_r, col)

    def get_selection_range(self) -> str:
        """Получить строку диапазона выделенных ячеек (например A1:C5)"""
        selected = self.selectedRanges()
        if selected:
            range_obj = selected[0]
            start_row = range_obj.topRow()
            end_row = range_obj.bottomRow()
            start_col = range_obj.leftColumn()
            end_col = range_obj.rightColumn()

            start_cell = f"{chr(65 + start_col)}{start_row + 1}"
            end_cell = f"{chr(65 + end_col)}{end_row + 1}"

            if start_cell == end_cell:
                return start_cell
            return f"{start_cell}:{end_cell}"
        return ""

    def copy_selection(self):
        """Копирование выделения"""
        selected = self.selectedRanges()
        if selected:
            # Реализация копирования
            pass

    def paste_selection(self):
        """Вставка из буфера"""
        # Реализация вставки
        pass

    def cut_selection(self):
        """Вырезание выделения"""
        self.copy_selection()
        self.clear_selection()

    def clear_selection(self):
        """Очистка выделенных ячеек"""
        for item in self.selectedItems():
            item.setText("")

    def toggle_bold(self):
        """Переключение жирного шрифта"""
        for item in self.selectedItems():
            row = item.row()
            col = item.column()
            cell = self.get_cell(row, col)
            if cell:
                cell.bold = not cell.bold
                self.apply_cell_formatting(row, col)

    def toggle_italic(self):
        """Переключение курсива"""
        for item in self.selectedItems():
            row = item.row()
            col = item.column()
            cell = self.get_cell(row, col)
            if cell:
                cell.italic = not cell.italic
                self.apply_cell_formatting(row, col)

    def change_text_color(self):
        """Изменение цвета текста"""
        color = QColorDialog.getColor(QColor("#000000"), self, "Цвет текста")
        if color.isValid():
            for rng in self.selectedRanges():
                for row in range(rng.topRow(), rng.bottomRow() + 1):
                    for col in range(rng.leftColumn(), rng.rightColumn() + 1):
                        cell = self.get_cell(row, col)
                        if cell:
                            cell.text_color = color.name()
                            self.apply_cell_formatting(row, col)
            self.viewport().update()

    def change_bg_color(self):
        """Изменение цвета фона"""
        color = QColorDialog.getColor(QColor("#FFFFFF"), self, "Цвет фона")
        if color.isValid():
            for rng in self.selectedRanges():
                for row in range(rng.topRow(), rng.bottomRow() + 1):
                    for col in range(rng.leftColumn(), rng.rightColumn() + 1):
                        cell = self.get_cell(row, col)
                        if cell:
                            cell.background_color = color.name()
                            self.apply_cell_formatting(row, col)
            self.viewport().update()

    def insert_row(self):
        """Вставка строки"""
        selected = self.selectedRanges()
        if selected:
            row = selected[0].topRow()
            self.insertRow(row)
            self.rows += 1
            # Обновляем модель если есть
            if self.spreadsheet:
                # Добавляем строку в модель
                self.spreadsheet.rows += 1
                self.spreadsheet.cells.insert(row, [None for _ in range(self.spreadsheet.columns)])

    def delete_row(self):
        """Удаление строки"""
        selected = self.selectedRanges()
        if selected:
            row = selected[0].topRow()
            self.removeRow(row)
            self.rows -= 1
            # Обновляем модель если есть
            if self.spreadsheet:
                if row < len(self.spreadsheet.cells):
                    self.spreadsheet.cells.pop(row)
                    self.spreadsheet.rows -= 1

    def delete_content(self):
        """Удаление содержимого выделенных ячеек"""
        selected = self.selectedRanges()
        if selected:
            for range in selected:
                for row in range(range.topRow(), range.bottomRow() + 1):
                    for col in range(range.leftColumn(), range.rightColumn() + 1):
                        item = self.item(row, col)
                        if item:
                            item.setText("")
                            # Очищаем значение в модели
                            if self.spreadsheet and row < len(self.spreadsheet.cells):
                                if col < len(self.spreadsheet.cells[row]):
                                    self.spreadsheet.cells[row][col].value = ""
                                    self.spreadsheet.cells[row][col].formula = None
    
    def delete_all(self):
        """Очистить всю таблицу"""
        from PyQt5.QtWidgets import QMessageBox
        
        reply = QMessageBox.warning(
            self,
            "Очистить таблицу",
            "Вы уверены, что хотите очистить всю таблицу?\nЭто действие невозможно отменить!",
            QMessageBox.Yes | QMessageBox.No,
            QMessageBox.No
        )
        
        if reply == QMessageBox.Yes:
            # Очищаем все ячейки
            for row in range(self.rowCount()):
                for col in range(self.columnCount()):
                    item = self.item(row, col)
                    if item:
                        item.setText("")
                    # Очищаем в модели
                    if self.spreadsheet and row < len(self.spreadsheet.cells):
                        if col < len(self.spreadsheet.cells[row]):
                            self.spreadsheet.cells[row][col].value = ""
                            self.spreadsheet.cells[row][col].formula = None

    def move_cells_up(self):
        """Переместить выделённые ячейки вверх"""
        selected = self.selectedRanges()
        if selected and selected[0].topRow() > 0:
            range_obj = selected[0]
            self._move_cells_vertical(range_obj, -1)

    def move_cells_down(self):
        """Переместить выделённые ячейки вниз"""
        selected = self.selectedRanges()
        if selected and selected[0].bottomRow() < self.rowCount() - 1:
            range_obj = selected[0]
            self._move_cells_vertical(range_obj, 1)

    def move_cells_left(self):
        """Переместить выделённые ячейки влево"""
        selected = self.selectedRanges()
        if selected and selected[0].leftColumn() > 0:
            range_obj = selected[0]
            self._move_cells_horizontal(range_obj, -1)

    def move_cells_right(self):
        """Переместить выделённые ячейки вправо"""
        selected = self.selectedRanges()
        if selected and selected[0].rightColumn() < self.columnCount() - 1:
            range_obj = selected[0]
            self._move_cells_horizontal(range_obj, 1)

    def _move_cells_vertical(self, range_obj, direction: int):
        """Вспомогательная функция для вертикального перемещения"""
        start_row = range_obj.topRow()
        end_row = range_obj.bottomRow()
        start_col = range_obj.leftColumn()
        end_col = range_obj.rightColumn()
        
        new_start_row = start_row + direction
        new_end_row = end_row + direction
        
        # Копируем данные в новые позиции
        for row in range(start_row, end_row + 1):
            new_row = row + direction
            for col in range(start_col, end_col + 1):
                # Копируем из старой позиции в новую
                old_item = self.item(row, col)
                new_item = self.item(new_row, col)
                if old_item and new_item:
                    new_item.setText(old_item.text())
                # Копируем из модели тоже
                old_cell = self.get_cell(row, col)
                new_cell = self.get_cell(new_row, col)
                if old_cell and new_cell:
                    new_cell.value = old_cell.value
                    new_cell.formula = old_cell.formula
                    new_cell.bold = old_cell.bold
                    new_cell.italic = old_cell.italic
        
        # Очищаем старые позиции
        for col in range(start_col, end_col + 1):
            item = self.item(start_row, col) if direction > 0 else self.item(end_row, col)
            if item:
                item.setText("")

    def _move_cells_horizontal(self, range_obj, direction: int):
        """Вспомогательная функция для горизонтального перемещения"""
        start_row = range_obj.topRow()
        end_row = range_obj.bottomRow()
        start_col = range_obj.leftColumn()
        end_col = range_obj.rightColumn()
        
        new_start_col = start_col + direction
        new_end_col = end_col + direction
        
        # Копируем данные в новые позиции
        for row in range(start_row, end_row + 1):
            for col in range(start_col, end_col + 1):
                new_col = col + direction
                # Копируем из старой позиции в новую
                old_item = self.item(row, col)
                new_item = self.item(row, new_col)
                if old_item and new_item:
                    new_item.setText(old_item.text())
                # Копируем из модели тоже
                old_cell = self.get_cell(row, col)
                new_cell = self.get_cell(row, new_col)
                if old_cell and new_cell:
                    new_cell.value = old_cell.value
                    new_cell.formula = old_cell.formula
                    new_cell.bold = old_cell.bold
                    new_cell.italic = old_cell.italic
        
        # Очищаем старые позиции
        for row in range(start_row, end_row + 1):
            col = start_col if direction > 0 else end_col
            item = self.item(row, col)
            if item:
                item.setText("")

    def set_current_cell_formula(self, formula: str):
        """Установка формулы для текущей ячейки"""
        current = self.currentItem()
        if current:
            self.set_cell_value(current.row(), current.column(), formula)

    def calculate_formulas(self):
        """Пересчет всех формул в модели"""
        if self.spreadsheet:
            self.spreadsheet.calculate_formulas()
            self.refresh_display()

    def get_selected_cells_range(self) -> str:
        """Получить диапазон выделенных ячеек"""
        selected = self.selectedRanges()
        if selected:
            range_obj = selected[0]
            start_row = range_obj.topRow()
            start_col = range_obj.leftColumn()
            end_row = range_obj.bottomRow()
            end_col = range_obj.rightColumn()

            start_cell = f"{chr(65 + start_col)}{start_row + 1}"
            end_cell = f"{chr(65 + end_col)}{end_row + 1}"

            if start_cell == end_cell:
                return start_cell
            else:
                return f"{start_cell}:{end_cell}"
        return ""

    def calculate_selection_stats(self) -> dict:
        """Вычислить статистику по выделению (SUM, AVERAGE, COUNT)"""
        stats = {
            'sum': 0,
            'average': 0,
            'count': 0,
            'min': 0,
            'max': 0
        }

        values = []
        selected = self.selectedRanges()

        if not selected:
            return stats

        # Собрать все значения из выделения
        for range_obj in selected:
            for row in range(range_obj.topRow(), range_obj.bottomRow() + 1):
                for col in range(range_obj.leftColumn(), range_obj.rightColumn() + 1):
                    cell = self.get_cell(row, col)
                    if cell:
                        value = cell.get_display_value()
                        if value:
                            try:
                                num_value = float(str(value).replace(',', '.').replace('$', '').replace('%', ''))
                                values.append(num_value)
                            except:
                                pass

        if values:
            stats['sum'] = sum(values)
            stats['average'] = sum(values) / len(values)
            stats['count'] = len(values)
            stats['min'] = min(values)
            stats['max'] = max(values)

        return stats

    def zoom_in(self):
        """Увеличение масштаба"""
        if self.zoom_level < 200:
            self.zoom_level += 10
            self.apply_zoom()

    def zoom_out(self):
        """Уменьшение масштаба"""
        if self.zoom_level > 50:
            self.zoom_level -= 10
            self.apply_zoom()

    def apply_zoom(self):
        """Применение масштаба"""
        # Сохраняем позицию прокрутки перед изменением размеров
        scroll_x = self.horizontalScrollBar().value()
        scroll_y = self.verticalScrollBar().value()

        font = self.font()
        base_size = 10
        new_size = base_size * self.zoom_level / 100
        font.setPointSizeF(new_size)
        self.setFont(font)

        # Обновление высоты строк
        self.verticalHeader().setDefaultSectionSize(int(25 * self.zoom_level / 100))

        # Обновление ширины колонок
        self.horizontalHeader().setDefaultSectionSize(int(100 * self.zoom_level / 100))

        # Применение размеров ко всем строкам и колонкам
        for i in range(self.rowCount()):
            self.setRowHeight(i, int(25 * self.zoom_level / 100))
        for i in range(self.columnCount()):
            self.setColumnWidth(i, int(100 * self.zoom_level / 100))

        # Восстанавливаем позицию прокрутки
        self.horizontalScrollBar().setValue(scroll_x)
        self.verticalScrollBar().setValue(scroll_y)

        # Обновляем позицию corner button после зума (с большей задержкой для стабилизации layout)
        if hasattr(self, '_corner_button') and self._corner_button:
            QTimer.singleShot(50, self._position_corner_button)

    def load_data(self, data: List[List[str]]):
        """Загрузка данных в модель и отображение"""
        if not data:
            return

        # Создаем модель если нет
        if not self.spreadsheet:
            self.spreadsheet = Spreadsheet("Sheet1", 0, rows=1000, columns=1000)

        # Загружаем данные в модель
        self.spreadsheet.load_from_data(data)

        # Обновляем отображение
        self.refresh_display()

    def get_dataframe(self) -> pd.DataFrame:
        """Получение данных в виде DataFrame из модели"""
        if not self.spreadsheet:
            return pd.DataFrame()

        data = self.spreadsheet.get_data(max_rows=1000, max_cols=26)
        return pd.DataFrame(data)

    def apply_format(self, format_type: str, value):
        """Применение форматирования к выделенным ячейкам (toolbar и меню)"""
        
        # Для цветов: открываем диалог один раз ДО цикла
        selected_color = None
        if format_type in ('text_color', 'bg_color') and value is None:
            initial_color = QColor("#000000") if format_type == 'text_color' else QColor("#FFFFFF")
            title = "Цвет текста" if format_type == 'text_color' else "Цвет фона"
            selected_color = QColorDialog.getColor(initial_color, self, title)
            if not selected_color.isValid():
                return  # Отмена выбора цвета
            value = selected_color.name()
        
        # Собираем все выделённые ячейки через selectedRanges (работает и для пустых ячеек)
        rows_cols = set()
        for rng in self.selectedRanges():
            for r in range(rng.topRow(), rng.bottomRow() + 1):
                for c in range(rng.leftColumn(), rng.rightColumn() + 1):
                    rows_cols.add((r, c))
        
        # Применяем формат ко всем выделенным ячейкам
        for row, col in rows_cols:
            cell = self.get_cell(row, col)
            if not cell:
                continue
            if format_type == 'font':
                cell.font_family = value
            elif format_type == 'font_size':
                cell.font_size = value
            elif format_type == 'alignment':
                cell.alignment = value
            elif format_type == 'bold':
                cell.bold = value if value is not None else not cell.bold
            elif format_type == 'italic':
                cell.italic = value if value is not None else not cell.italic
            elif format_type == 'underline':
                cell.underline = value if value is not None else not cell.underline
            elif format_type == 'strike':
                if hasattr(cell, 'strike'):
                    cell.strike = value if value is not None else not getattr(cell, 'strike', False)
                else:
                    cell.strike = value if value is not None else True
            elif format_type == 'text_color':
                cell.text_color = value
                print(f"[DEBUG] Устанавливаю text_color для ({row}, {col}): {value}")
            elif format_type == 'bg_color':
                cell.background_color = value
                print(f"[DEBUG] Устанавливаю background_color для ({row}, {col}): {value}")
            elif format_type == 'clear_format':
                cell.font_family = "Arial"
                cell.font_size = 11
                cell.bold = False
                cell.italic = False
                cell.underline = False
                cell.text_color = None
                cell.background_color = None
                cell.alignment = "left"
                if hasattr(cell, 'strike'):
                    cell.strike = False
            self.apply_cell_formatting(row, col)
        
        # Обновляем весь виджет после применения всех изменений
        self.viewport().update()
        self.repaint()

