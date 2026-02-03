"""
Модуль для печати таблицы
Поддерживает печать на принтер и экспорт в PDF
"""

from PyQt5.QtWidgets import QMessageBox, QFileDialog
from PyQt5.QtPrintSupport import QPrinter, QPrintDialog
from PyQt5.QtCore import QRect, Qt
from PyQt5.QtGui import QPainter, QFont, QColor, QPen
from pathlib import Path


class TablePrinter:
    """Класс для печати таблицы"""

    def __init__(self, spreadsheet_widget):
        """
        Args:
            spreadsheet_widget: экземпляр SpreadsheetWidget
        """
        self.widget = spreadsheet_widget
        self.printer = QPrinter(QPrinter.HighResolution)

    def print_table(self, parent=None):
        """
        Печать таблицы с диалогом выбора принтера

        Args:
            parent: родительское окно
        """
        try:
            dialog = QPrintDialog(self.printer, parent)
            if dialog.exec_() == QPrintDialog.Accepted:
                self._do_print(self.printer)
                print("[OK] Печать отправлена на принтер")
        except Exception as e:
            print(f"[ERROR] Ошибка при печати: {e}")
            if parent:
                QMessageBox.critical(parent, "Ошибка печати", str(e))

    def export_pdf(self, file_path: str, parent=None) -> bool:
        """
        Экспорт таблицы в PDF

        Args:
            file_path: путь для сохранения PDF
            parent: родительское окно

        Returns:
            bool: успешность экспорта
        """
        try:
            pdf_printer = QPrinter(QPrinter.HighResolution)
            pdf_printer.setOutputFormat(QPrinter.PdfFormat)
            pdf_printer.setOutputFileName(file_path)
            
            self._do_print(pdf_printer)
            print(f"[OK] PDF экспортирован: {file_path}")
            return True
        except Exception as e:
            print(f"[ERROR] Ошибка при экспорте в PDF: {e}")
            return False

    def _do_print(self, printer):
        """
        Отрисовка таблицы на принтер/PDF

        Args:
            printer: объект QPrinter
        """
        painter = QPainter()
        if not painter.begin(printer):
            print("[ERROR] Не удалось начать печать")
            return

        try:
            # Параметры
            margin_mm = 15
            printer.setPageMargins(margin_mm, margin_mm, margin_mm, margin_mm, QPrinter.Millimeter)

            page_rect = printer.pageRect(QPrinter.DevicePixel)
            page_width = page_rect.width()
            page_height = page_rect.height()

            # Размеры таблицы
            try:
                rows = self.widget.rowCount()
                cols = self.widget.columnCount()
            except AttributeError:
                print("[ERROR] Не удалось получить размер таблицы")
                painter.end()
                return

            if rows == 0 or cols == 0:
                print("[WARNING] Таблица пуста")
                painter.end()
                return

            # Параметры отрисовки
            margin_px = 50
            col_width = max(30, (page_width - 2 * margin_px) // max(cols, 1))
            row_height = 20

            x = margin_px
            y = margin_px

            # Шрифты и цвета
            header_font = QFont("Arial", 9)
            header_font.setBold(True)
            body_font = QFont("Arial", 8)
            
            header_color = QColor(220, 220, 220)
            border_pen = QPen(QColor(0, 0, 0), 1)
            text_pen = QPen(QColor(0, 0, 0))

            # Функция для получения буквы колонки
            def col_to_letter(col):
                if col < 26:
                    return chr(65 + col)
                return chr(65 + col // 26) + chr(65 + col % 26)

            # Основной цикл печати
            page_num = 1
            current_row = 0
            
            while current_row <= rows:
                # Рисуем заголовок (буквы колонок)
                painter.setFont(header_font)
                header_rect = QRect(x, y, col_width * cols, row_height)
                painter.fillRect(header_rect, header_color)
                
                for col in range(cols):
                    cell_rect = QRect(x + col * col_width, y, col_width, row_height)
                    painter.setPen(border_pen)
                    painter.drawRect(cell_rect)
                    
                    painter.setPen(text_pen)
                    painter.drawText(cell_rect, Qt.AlignCenter, col_to_letter(col))
                
                y_data = y + row_height
                
                # Рисуем данные
                painter.setFont(body_font)
                rows_on_page = 0
                max_rows_on_page = (page_height - y_data - margin_px) // row_height
                
                while current_row < rows and rows_on_page < max_rows_on_page:
                    for col in range(cols):
                        # Получаем текст ячейки
                        try:
                            item = self.widget.item(current_row, col)
                            cell_text = item.text() if item else ""
                        except:
                            cell_text = ""
                        
                        cell_rect = QRect(
                            x + col * col_width,
                            y_data + rows_on_page * row_height,
                            col_width,
                            row_height
                        )
                        
                        painter.setPen(border_pen)
                        painter.drawRect(cell_rect)
                        
                        painter.setPen(text_pen)
                        text_rect = cell_rect.adjusted(3, 2, -3, -2)
                        painter.drawText(text_rect, Qt.AlignLeft | Qt.AlignVCenter, cell_text)
                    
                    current_row += 1
                    rows_on_page += 1
                
                # Переход на новую страницу если есть ещё строки
                if current_row < rows:
                    printer.newPage()
                    page_num += 1
                    y = margin_px
                else:
                    break

            print(f"[OK] Печать на {page_num} стр. завершена")

        except Exception as e:
            print(f"[ERROR] Ошибка при печати: {e}")
            import traceback
            traceback.print_exc()
        finally:
            painter.end()
