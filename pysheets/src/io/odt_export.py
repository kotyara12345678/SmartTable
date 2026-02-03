"""
Модуль для экспорта таблицы в формат ODT (OpenDocument Text)
Используется библиотека odf-py для создания ODT файлов
"""

from pathlib import Path
from odf.opendocument import OpenDocumentText
from odf.table import Table, TableRow, TableCell
from odf.text import P
from odf.style import Style, TableCellProperties
from odf.namespaces import STYLENS
from PyQt5.QtWidgets import QMessageBox


class ODTExporter:
    """Экспортёр таблицы в формат ODT"""

    def __init__(self, spreadsheet_widget, file_path: str):
        """
        Args:
            spreadsheet_widget: экземпляр SpreadsheetWidget
            file_path: путь для сохранения файла
        """
        self.widget = spreadsheet_widget
        self.file_path = Path(file_path)

    def export(self) -> bool:
        """
        Экспортировать таблицу в ODT

        Returns:
            True если успешно, False если ошибка
        """
        try:
            # Создаём ODT документ
            doc = OpenDocumentText()

            # Добавляем стиль для ячеек таблицы
            style = Style(name="TableCellStyle", family="table-cell")
            style.addAttribute(
                (STYLENS, "background-color"), "#FFFFFF"
            )
            doc.styles.addElement(style)

            # Создаём таблицу
            table = Table(name="SmartTable")

            # Получаем количество строк и колонок
            rows = self.widget.rowCount()
            cols = self.widget.columnCount()

            # Добавляем данные
            for row in range(rows):
                table_row = TableRow()

                for col in range(cols):
                    cell = self.widget.get_cell(row, col)
                    cell_widget = self.widget.item(row, col)

                    # Получаем значение ячейки
                    if cell_widget:
                        value = cell_widget.text()
                    elif cell:
                        value = cell.value or ""
                    else:
                        value = ""

                    # Создаём ячейку ODT
                    odt_cell = TableCell(valuetype="string")

                    # Добавляем текст в ячейку
                    p = P(text=str(value))
                    odt_cell.addElement(p)

                    # Копируем форматирование если есть
                    if cell_widget and cell:
                        # Получаем шрифт
                        font = cell_widget.font()
                        if font.bold():
                            # Добавляем жирный стиль (базовое форматирование)
                            pass  # TODO: улучшить форматирование

                    table_row.addElement(odt_cell)

                table.addElement(table_row)

            # Добавляем таблицу в документ
            doc.text.addElement(table)

            # Сохраняем документ
            doc.save(str(self.file_path))

            return True

        except Exception as e:
            print(f"[ERROR] Ошибка при экспорте в ODT: {e}")
            return False

    @staticmethod
    def save_dialog(spreadsheet_widget, parent=None) -> bool:
        """
        Диалог сохранения файла ODT

        Args:
            spreadsheet_widget: экземпляр SpreadsheetWidget
            parent: родительское окно

        Returns:
            True если успешно, False если отмена
        """
        from PyQt5.QtWidgets import QFileDialog

        file_path, _ = QFileDialog.getSaveFileName(
            parent,
            "Экспорт в ODT",
            "",
            "OpenDocument Text (*.odt);;Все файлы (*.*)"
        )

        if not file_path:
            return False

        exporter = ODTExporter(spreadsheet_widget, file_path)
        success = exporter.export()

        if success:
            QMessageBox.information(
                parent,
                "Успех",
                f"Таблица экспортирована в {Path(file_path).name}"
            )
        else:
            QMessageBox.critical(
                parent,
                "Ошибка",
                "Не удалось экспортировать таблицу в ODT"
            )

        return success
