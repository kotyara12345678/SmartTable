"""
Экспорт в Markdown формат
"""

from pathlib import Path


class MarkdownExporter:
    """Экспортёр таблицы в Markdown"""

    def __init__(self, spreadsheet_widget, file_path: str):
        self.widget = spreadsheet_widget
        self.file_path = Path(file_path)

    def export(self) -> bool:
        """Экспортировать таблицу в Markdown"""
        try:
            rows = self.widget.rowCount()
            cols = self.widget.columnCount()

            markdown = "# SmartTable Export\n\n"
            markdown += "| "

            # Заголовки колонок
            for col in range(cols):
                col_letter = chr(65 + col % 26) if col < 26 else f"{chr(65 + col // 26)}{chr(65 + col % 26)}"
                markdown += f"{col_letter} | "
            markdown += "\n"

            # Разделитель
            markdown += "|"
            for col in range(cols):
                markdown += " --- |"
            markdown += "\n"

            # Данные
            for row in range(rows):
                markdown += "| "
                for col in range(cols):
                    cell = self.widget.get_cell(row, col)
                    cell_widget = self.widget.item(row, col)
                    
                    if cell_widget:
                        value = cell_widget.text()
                    elif cell:
                        value = cell.value or ""
                    else:
                        value = ""
                    
                    markdown += f"{value} | "
                markdown += "\n"

            with open(self.file_path, 'w', encoding='utf-8') as f:
                f.write(markdown)

            return True

        except Exception as e:
            print(f"[ERROR] Ошибка при экспорте в Markdown: {e}")
            return False
