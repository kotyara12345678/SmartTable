"""
Экспорт в JSON формат
"""

import json
from pathlib import Path
from PyQt5.QtWidgets import QMessageBox


class JSONExporter:
    """Экспортёр таблицы в JSON"""

    def __init__(self, spreadsheet_widget, file_path: str):
        self.widget = spreadsheet_widget
        self.file_path = Path(file_path)

    def export(self) -> bool:
        """Экспортировать таблицу в JSON"""
        try:
            data = []
            rows = self.widget.rowCount()
            cols = self.widget.columnCount()

            for row in range(rows):
                row_data = {}
                for col in range(cols):
                    cell = self.widget.get_cell(row, col)
                    cell_widget = self.widget.item(row, col)
                    
                    # Колонка как ключ (A, B, C...)
                    col_letter = chr(65 + col % 26) if col < 26 else f"{chr(65 + col // 26)}{chr(65 + col % 26)}"
                    
                    if cell_widget:
                        value = cell_widget.text()
                    elif cell:
                        value = cell.value or ""
                    else:
                        value = ""
                    
                    row_data[col_letter] = value
                
                data.append(row_data)

            with open(self.file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            return True

        except Exception as e:
            print(f"[ERROR] Ошибка при экспорте в JSON: {e}")
            return False
