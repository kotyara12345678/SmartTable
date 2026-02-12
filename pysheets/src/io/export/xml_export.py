"""
Экспорт в XML формат
"""

import xml.etree.ElementTree as ET
from pathlib import Path


class XMLExporter:
    """Экспортёр таблицы в XML"""

    def __init__(self, spreadsheet_widget, file_path: str):
        self.widget = spreadsheet_widget
        self.file_path = Path(file_path)

    def export(self) -> bool:
        """Экспортировать таблицу в XML"""
        try:
            rows = self.widget.rowCount()
            cols = self.widget.columnCount()

            # Создаём корневой элемент
            root = ET.Element('Spreadsheet')
            table = ET.SubElement(root, 'Table')

            # Добавляем данные
            for row in range(rows):
                row_elem = ET.SubElement(table, 'Row')
                for col in range(cols):
                    cell = self.widget.get_cell(row, col)
                    cell_widget = self.widget.item(row, col)
                    
                    col_letter = chr(65 + col % 26) if col < 26 else f"{chr(65 + col // 26)}{chr(65 + col % 26)}"
                    
                    if cell_widget:
                        value = cell_widget.text()
                    elif cell:
                        value = cell.value or ""
                    else:
                        value = ""
                    
                    cell_elem = ET.SubElement(row_elem, f'Cell_{col_letter}')
                    cell_elem.text = str(value)

            # Сохраняем с красивым форматированием
            tree = ET.ElementTree(root)
            tree.write(self.file_path, encoding='utf-8', xml_declaration=True)

            return True

        except Exception as e:
            print(f"[ERROR] Ошибка при экспорте в XML: {e}")
            return False
