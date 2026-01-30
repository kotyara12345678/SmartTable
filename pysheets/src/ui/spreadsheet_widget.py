from PyQt5.QtWidgets import QTableWidget, QTableWidgetItem, QMenu
from PyQt5.QtCore import Qt


class ModernTableWidget(QTableWidget):
    def __init__(self, rows, cols, parent=None):
        super().__init__(rows, cols, parent)
        self.setAlternatingRowColors(True)

        self.horizontalHeader().setDefaultAlignment(Qt.AlignCenter)
        self.verticalHeader().setDefaultAlignment(Qt.AlignCenter)
        self.horizontalHeader().setMinimumSectionSize(60)

        self.setSelectionBehavior(QTableWidget.SelectItems)
        self.setSelectionMode(QTableWidget.ContiguousSelection)

        # Контекстное меню
        self.setContextMenuPolicy(Qt.CustomContextMenu)
        self.customContextMenuRequested.connect(self.show_context_menu)

    def show_context_menu(self, position):
        menu = QMenu()

        copy_action = menu.addAction("📋 Копировать")
        paste_action = menu.addAction("📝 Вставить")
        menu.addSeparator()

        format_action = menu.addAction("🎨 Форматирование")
        insert_row_action = menu.addAction("➕ Вставить строку выше")
        insert_col_action = menu.addAction("📊 Вставить столбец слева")
        menu.addSeparator()

        clear_action = menu.addAction("🧹 Очистить")
        sort_action = menu.addAction("🔢 Сортировать")

        action = menu.exec_(self.viewport().mapToGlobal(position))

        if action == copy_action:
            self.copy_selection()
        elif action == paste_action:
            self.paste_selection()
        elif action == clear_action:
            self.clear_selection()

    def copy_selection(self):
        """Копирует выделенные ячейки"""
        selected = self.selectedRanges()
        if not selected:
            return

        data = []
        for sel_range in selected:
            rows = []
            for row in range(sel_range.topRow(), sel_range.bottomRow() + 1):
                cols = []
                for col in range(sel_range.leftColumn(), sel_range.rightColumn() + 1):
                    item = self.item(row, col)
                    cols.append(item.text() if item else "")
                rows.append(cols)
            data.append(rows)

        # Сохраняем в системный буфер
        import pyperclip
        try:
            text = ""
            for sheet in data:
                for row in sheet:
                    text += "\t".join(row) + "\n"
                text += "\n"
            pyperclip.copy(text)
        except:
            # Если pyperclip не установлен, просто сохраняем во внутренний буфер
            if hasattr(self.parent(), 'clipboard_data'):
                self.parent().clipboard_data = data

    def paste_selection(self):
        """Вставляет данные из буфера"""
        pass

    def clear_selection(self):
        """Очищает выделенные ячейки"""
        selected = self.selectedRanges()
        for sel_range in selected:
            for row in range(sel_range.topRow(), sel_range.bottomRow() + 1):
                for col in range(sel_range.leftColumn(), sel_range.rightColumn() + 1):
                    item = self.item(row, col)
                    if item:
                        item.setText("")