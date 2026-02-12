"""
Импорт Excel файлов
"""

import pandas as pd
from typing import List
from pysheets.src.core.workbook import Workbook

class ExcelImporter:
    """Импортер Excel файлов"""

    @staticmethod
    def import_excel(file_path: str) -> Workbook:
        """Импорт Excel файла"""
        workbook = Workbook()

        try:
            # Определение движка в зависимости от расширения
            if file_path.endswith('.xlsx'):
                engine = 'openpyxl'
            elif file_path.endswith('.xls'):
                engine = 'xlrd'
            else:
                raise ValueError("Неподдерживаемый формат файла")

            # Чтение всех листов
            xls = pd.ExcelFile(file_path, engine=engine)

            for sheet_name in xls.sheet_names:
                # Чтение без заголовков
                df = pd.read_excel(
                    xls,
                    sheet_name=sheet_name,
                    header=None,
                    dtype=str  # Чтение как строки
                )

                # Замена NaN на пустые строки
                df = df.fillna('')

                # Создание листа
                sheet = workbook.add_sheet(sheet_name)

                # Преобразование DataFrame в список списков
                data = df.values.tolist()
                sheet.load_from_data(data)

            return workbook

        except ImportError as e:
            raise ImportError(f"Требуется установка библиотеки: {str(e)}")
        except Exception as e:
            raise ValueError(f"Ошибка импорта Excel файла: {str(e)}")

    @staticmethod
    def import_csv(file_path: str, delimiter: str = ',') -> Workbook:
        """Импорт CSV файла"""
        workbook = Workbook()

        try:
            # Чтение CSV
            df = pd.read_csv(
                file_path,
                delimiter=delimiter,
                header=None,
                dtype=str,
                encoding='utf-8'
            )

            # Замена NaN на пустые строки
            df = df.fillna('')

            # Создание листа
            sheet = workbook.add_sheet("Лист1")
            data = df.values.tolist()
            sheet.load_from_data(data)

            return workbook

        except Exception as e:
            raise ValueError(f"Ошибка импорта CSV файла: {str(e)}")