"""
Экспорт в Excel
"""

import pandas as pd
from typing import List
from pysheets.src.core.workbook import Workbook

class ExcelExporter:
    """Экспортер в Excel"""

    @staticmethod
    def export_excel(workbook: Workbook, file_path: str):
        """Экспорт в Excel файл"""
        try:
            with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
                for sheet in workbook.sheets:
                    # Получение данных
                    data = sheet.get_data()

                    # Создание DataFrame
                    df = pd.DataFrame(data)

                    # Сохранение в Excel
                    df.to_excel(
                        writer,
                        sheet_name=sheet.name,
                        index=False,
                        header=False
                    )

                    # Настройка ширины столбцов (опционально)
                    worksheet = writer.sheets[sheet.name]
                    for col_idx, column in enumerate(df.columns):
                        column_width = max(df[col_idx].astype(str).map(len).max(), 10)
                        column_letter = chr(65 + col_idx) if col_idx < 26 else f"A{chr(65 + col_idx - 26)}"
                        worksheet.column_dimensions[column_letter].width = min(column_width, 50)

        except ImportError:
            raise ImportError("Требуется установка openpyxl: pip install openpyxl")
        except Exception as e:
            raise ValueError(f"Ошибка экспорта в Excel: {str(e)}")

    @staticmethod
    def export_csv(workbook: Workbook, file_path: str, delimiter: str = ','):
        """Экспорт в CSV файл"""
        try:
            sheet = workbook.get_active_sheet()
            if not sheet:
                raise ValueError("Нет активного листа")

            data = sheet.get_data()
            df = pd.DataFrame(data)

            df.to_csv(
                file_path,
                sep=delimiter,
                index=False,
                header=False,
                encoding='utf-8'
            )

        except Exception as e:
            raise ValueError(f"Ошибка экспорта в CSV: {str(e)}")