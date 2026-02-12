"""
Экспорт в SQL формат (INSERT statements)
"""

from pathlib import Path


class SQLExporter:
    """Экспортёр таблицы в SQL"""

    def __init__(self, spreadsheet_widget, file_path: str, table_name: str = "table"):
        self.widget = spreadsheet_widget
        self.file_path = Path(file_path)
        self.table_name = table_name

    def export(self) -> bool:
        """Экспортировать таблицу в SQL INSERT statements"""
        try:
            rows = self.widget.rowCount()
            cols = self.widget.columnCount()

            sql = f"-- SmartTable Export\n"
            sql += f"-- Table: {self.table_name}\n\n"

            # Создаём таблицу
            sql += f"CREATE TABLE IF NOT EXISTS {self.table_name} (\n"
            for col in range(cols):
                col_letter = chr(65 + col % 26) if col < 26 else f"{chr(65 + col // 26)}{chr(65 + col % 26)}"
                sql += f"    {col_letter} TEXT"
                if col < cols - 1:
                    sql += ",\n"
                else:
                    sql += "\n"
            sql += ");\n\n"

            # INSERT statements
            for row in range(rows):
                values = []
                for col in range(cols):
                    cell = self.widget.get_cell(row, col)
                    cell_widget = self.widget.item(row, col)
                    
                    if cell_widget:
                        value = cell_widget.text()
                    elif cell:
                        value = cell.value or ""
                    else:
                        value = ""
                    
                    # Экранируем одинарные кавычки
                    value = str(value).replace("'", "''")
                    values.append(f"'{value}'")
                
                sql += f"INSERT INTO {self.table_name} VALUES ({', '.join(values)});\n"

            with open(self.file_path, 'w', encoding='utf-8') as f:
                f.write(sql)

            return True

        except Exception as e:
            print(f"[ERROR] Ошибка при экспорте в SQL: {e}")
            return False
