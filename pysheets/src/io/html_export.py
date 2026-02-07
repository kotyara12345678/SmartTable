"""
Экспорт в HTML формат
"""

from pathlib import Path


class HTMLExporter:
    """Экспортёр таблицы в HTML"""

    def __init__(self, spreadsheet_widget, file_path: str):
        self.widget = spreadsheet_widget
        self.file_path = Path(file_path)

    def export(self) -> bool:
        """Экспортировать таблицу в HTML"""
        try:
            rows = self.widget.rowCount()
            cols = self.widget.columnCount()

            html = """<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>SmartTable Export</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #4CAF50; color: white; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        tr:hover { background-color: #f5f5f5; }
    </style>
</head>
<body>
    <h1>SmartTable Export</h1>
    <table>
"""

            # Заголовки колонок
            html += "        <tr>\n"
            for col in range(cols):
                col_letter = chr(65 + col % 26) if col < 26 else f"{chr(65 + col // 26)}{chr(65 + col % 26)}"
                html += f"            <th>{col_letter}</th>\n"
            html += "        </tr>\n"

            # Данные
            for row in range(rows):
                html += "        <tr>\n"
                for col in range(cols):
                    cell = self.widget.get_cell(row, col)
                    cell_widget = self.widget.item(row, col)
                    
                    if cell_widget:
                        value = cell_widget.text()
                    elif cell:
                        value = cell.value or ""
                    else:
                        value = ""
                    
                    html += f"            <td>{value}</td>\n"
                html += "        </tr>\n"

            html += """    </table>
</body>
</html>
"""

            with open(self.file_path, 'w', encoding='utf-8') as f:
                f.write(html)

            return True

        except Exception as e:
            print(f"[ERROR] Ошибка при экспорте в HTML: {e}")
            return False
