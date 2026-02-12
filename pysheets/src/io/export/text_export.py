"""
Экспорт в красивый текстовый формат (ASCII Table)
"""

from pathlib import Path


class TextExporter:
    """Экспортёр таблицы в текстовый формат"""

    def __init__(self, spreadsheet_widget, file_path: str):
        self.widget = spreadsheet_widget
        self.file_path = Path(file_path)

    def export(self) -> bool:
        """Экспортировать таблицу в красивый текстовый формат"""
        try:
            rows = self.widget.rowCount()
            cols = self.widget.columnCount()

            # Собираем данные и вычисляем ширины колонок
            data = []
            col_widths = [10] * cols  # Минимальная ширина

            for row in range(rows):
                row_data = []
                for col in range(cols):
                    cell = self.widget.get_cell(row, col)
                    cell_widget = self.widget.item(row, col)
                    
                    if cell_widget:
                        value = cell_widget.text()
                    elif cell:
                        value = str(cell.value or "")
                    else:
                        value = ""
                    
                    row_data.append(value)
                    col_widths[col] = max(col_widths[col], len(value) + 2)
                
                data.append(row_data)

            # Строим таблицу
            text = "SmartTable Export\n"
            text += "=" * (sum(col_widths) + len(col_widths) + 1) + "\n"

            # Заголовки
            text += "|"
            for col in range(cols):
                col_letter = chr(65 + col % 26) if col < 26 else f"{chr(65 + col // 26)}{chr(65 + col % 26)}"
                text += f" {col_letter:<{col_widths[col]-1}} |"
            text += "\n"

            # Разделитель
            text += "-" * (sum(col_widths) + len(col_widths) + 1) + "\n"

            # Данные
            for row_data in data:
                text += "|"
                for col, value in enumerate(row_data):
                    text += f" {value:<{col_widths[col]-1}} |"
                text += "\n"

            text += "=" * (sum(col_widths) + len(col_widths) + 1) + "\n"

            with open(self.file_path, 'w', encoding='utf-8') as f:
                f.write(text)

            return True

        except Exception as e:
            print(f"[ERROR] Ошибка при экспорте в текст: {e}")
            return False
