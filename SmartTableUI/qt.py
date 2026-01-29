import sys
import pandas as pd
import json
import os
from datetime import datetime
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QTableWidget, QTableWidgetItem,
    QToolBar, QStatusBar, QLabel, QLineEdit, QPushButton,
    QVBoxLayout, QWidget, QHBoxLayout, QFileDialog, QMessageBox,
    QDialog, QFormLayout, QComboBox, QDialogButtonBox, QAction
)
from PyQt5.QtCore import Qt
from PyQt5.QtGui import QFont


class SpreadsheetApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("PyQt Excel - Табличный редактор")
        self.setGeometry(100, 100, 1200, 700)

        # Данные
        self.data = [["" for _ in range(10)] for _ in range(50)]
        self.current_file = None
        self.selected_cell = (0, 0)

        self.init_ui()

    def init_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)

        main_layout = QVBoxLayout()
        central_widget.setLayout(main_layout)

        toolbar = QToolBar()
        self.addToolBar(toolbar)

        open_action = QAction("📁 Открыть", self)
        open_action.triggered.connect(self.open_file_dialog)
        toolbar.addAction(open_action)

        save_action = QAction("💾 Сохранить", self)
        save_action.triggered.connect(self.save_file_dialog)
        toolbar.addAction(save_action)

        save_as_action = QAction("另 Сохранить как", self)
        save_as_action.triggered.connect(self.save_as_file_dialog)
        toolbar.addAction(save_as_action)

        toolbar.addSeparator()

        add_row_action = QAction("➕ Добавить строку", self)
        add_row_action.triggered.connect(self.add_row)
        toolbar.addAction(add_row_action)

        delete_row_action = QAction("➖ Удалить строку", self)
        delete_row_action.triggered.connect(self.delete_row)
        toolbar.addAction(delete_row_action)

        add_col_action = QAction(".AddColumn Добавить столбец", self)
        add_col_action.triggered.connect(self.add_column)
        toolbar.addAction(add_col_action)

        delete_col_action = QAction("❌ Удалить столбец", self)
        delete_col_action.triggered.connect(self.delete_column)
        toolbar.addAction(delete_col_action)

        toolbar.addSeparator()

        formulas_action = QAction("= Формулы", self)
        formulas_action.triggered.connect(self.show_formulas)
        toolbar.addAction(formulas_action)

        sort_action = QAction("⇅ Сортировка", self)
        sort_action.triggered.connect(self.show_sorting)
        toolbar.addAction(sort_action)

        formula_layout = QHBoxLayout()
        formula_label = QLabel("fx:")
        formula_label.setFont(QFont("Arial", 10))
        formula_label.setStyleSheet("font-weight: bold;")
        self.formula_edit = QLineEdit()
        self.formula_edit.returnPressed.connect(self.apply_formula)
        formula_layout.addWidget(formula_label)
        formula_layout.addWidget(self.formula_edit)
        main_layout.addLayout(formula_layout)

        self.table = QTableWidget(50, 10)
        self.table.setHorizontalHeaderLabels([chr(65 + i) for i in range(10)])
        self.table.setVerticalHeaderLabels([str(i + 1) for i in range(50)])

        self.table.cellChanged.connect(self.cell_changed)
        self.table.cellClicked.connect(self.cell_focused)
        self.table.horizontalHeader().setMinimumSectionSize(100)
        self.table.verticalHeader().setDefaultSectionSize(30)

        for row in range(50):
            for col in range(10):
                item = QTableWidgetItem(self.data[row][col])
                self.table.setItem(row, col, item)

        main_layout.addWidget(self.table)

        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self.update_status("Готово | Ячейка: A1")

    # ... остальные методы остаются без изменений ...

    def cell_changed(self, row, col):
        item = self.table.item(row, col)
        if item:
            self.data[row][col] = item.text()
            self.update_status(f"Изменено: {chr(65 + col)}{row + 1}")

    def cell_focused(self, row, col):
        self.selected_cell = (row, col)
        item = self.table.item(row, col)
        if item:
            self.formula_edit.setText(item.text())
        cell_ref = f"{chr(65 + col)}{row + 1}"
        self.update_status(f"Выбрано: {cell_ref}")

    def apply_formula(self):
        formula = self.formula_edit.text()
        row, col = self.selected_cell

        try:
            if formula.startswith("="):
                result = self.evaluate_formula(formula[1:])
                self.data[row][col] = str(result)
                item = self.table.item(row, col)
                if item:
                    item.setText(str(result))
                self.update_status(f"Формула применена: {result}")
            else:
                self.data[row][col] = formula
                item = self.table.item(row, col)
                if item:
                    item.setText(formula)
                self.update_status("Значение обновлено")
        except Exception as ex:
            self.update_status(f"Ошибка формулы: {str(ex)}")

    def evaluate_formula(self, formula):
        formula = formula.strip().upper()
        for i in range(len(self.data)):
            for j in range(len(self.data[0])):
                cell_ref = f"{chr(65 + j)}{i + 1}"
                if cell_ref in formula:
                    try:
                        value = float(self.data[i][j]) if self.data[i][j] else 0
                        formula = formula.replace(cell_ref, str(value))
                    except:
                        formula = formula.replace(cell_ref, "0")
        return eval(formula)

    def open_file_dialog(self):
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Открыть файл", "",
            "CSV Files (*.csv);;Excel Files (*.xlsx *.xls);;JSON Files (*.json);;Text Files (*.txt)"
        )
        if file_path:
            self.load_file(file_path)

    def save_file_dialog(self):
        if self.current_file:
            self.save_file(self.current_file)
        else:
            self.save_as_file_dialog()

    def save_as_file_dialog(self):
        file_path, _ = QFileDialog.getSaveFileName(
            self, "Сохранить файл", "таблица.csv",
            "CSV Files (*.csv);;Excel Files (*.xlsx);;JSON Files (*.json);;Text Files (*.txt)"
        )
        if file_path:
            if not os.path.splitext(file_path)[1]:
                file_path += '.csv'
            self.save_file(file_path)
            self.current_file = file_path

    def load_file(self, file_path):
        try:
            ext = os.path.splitext(file_path)[1].lower()
            if ext == '.csv':
                df = pd.read_csv(file_path, header=None, dtype=str)
            elif ext in ['.xlsx', '.xls']:
                df = pd.read_excel(file_path, header=None, dtype=str)
            elif ext == '.json':
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                df = pd.DataFrame(data)
            else:
                with open(file_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                data = [line.strip().split('\t') for line in lines]
                df = pd.DataFrame(data)

            self.data = df.fillna('').values.tolist()
            while len(self.data) < 50:
                self.data.append(["" for _ in range(10)])
            for i in range(len(self.data)):
                if len(self.data[i]) < 10:
                    self.data[i].extend(["" for _ in range(10 - len(self.data[i]))])
                elif len(self.data[i]) > 10:
                    self.data[i] = self.data[i][:10]
            self.data = self.data[:50]

            self.update_table_from_data()
            self.current_file = file_path
            self.update_status(f"Файл загружен: {os.path.basename(file_path)}")

        except Exception as ex:
            self.update_status(f"Ошибка загрузки файла: {str(ex)}")

    def save_file(self, file_path):
        try:
            ext = os.path.splitext(file_path)[1].lower()
            save_data = []
            for row in self.data:
                if any(cell for cell in row):
                    non_empty_cells = []
                    for cell in row:
                        if cell:
                            non_empty_cells.append(cell)
                        elif non_empty_cells:
                            non_empty_cells.append("")
                    save_data.append(non_empty_cells)

            df = pd.DataFrame(save_data)
            if ext == '.csv':
                df.to_csv(file_path, index=False, header=False, encoding='utf-8')
            elif ext == '.xlsx':
                df.to_excel(file_path, index=False, header=False)
            elif ext == '.json':
                df.to_json(file_path, orient='records', force_ascii=False, indent=2)
            else:
                df.to_csv(file_path, sep='\t', index=False, header=False, encoding='utf-8')

            self.update_status(f"Файл сохранен: {os.path.basename(file_path)}")

        except Exception as ex:
            self.update_status(f"Ошибка сохранения: {str(ex)}")

    def update_table_from_data(self):
        self.table.setRowCount(len(self.data))
        self.table.setColumnCount(len(self.data[0]) if self.data else 10)
        self.table.setHorizontalHeaderLabels([chr(65 + i) for i in range(len(self.data[0]) if self.data else 10)])
        self.table.setVerticalHeaderLabels([str(i + 1) for i in range(len(self.data))])
        for row in range(len(self.data)):
            for col in range(len(self.data[row])):
                item = QTableWidgetItem(str(self.data[row][col]))
                self.table.setItem(row, col, item)

    def add_row(self):
        if len(self.data) < 1000:
            self.data.append(["" for _ in range(len(self.data[0]) if self.data else 10)])
            self.update_table_from_data()
            self.update_status("Добавлена новая строка")

    def delete_row(self):
        if len(self.data) > 1:
            self.data.pop()
            self.update_table_from_data()
            self.update_status("Удалена последняя строка")

    def add_column(self):
        if len(self.data[0]) < 26:
            for row in self.data:
                row.append("")
            self.update_table_from_data()
            self.update_status("Добавлен новый столбец")

    def delete_column(self):
        if len(self.data[0]) > 1:
            for row in self.data:
                row.pop()
            self.update_table_from_data()
            self.update_status("Удален последний столбец")

    def show_formulas(self):
        msg = QMessageBox()
        msg.setWindowTitle("Доступные формулы")
        formulas = [
            "=A1+B1 - Сложение",
            "=A1*B1 - Умножение",
            "=A1/B1 - Деление",
            "=A1-B1 - Вычитание",
            "=SUM(A1:A5) - Сумма диапазона (простой пример)"
        ]
        msg.setText("\n".join(formulas))
        msg.exec_()

    def show_sorting(self):
        dialog = SortingDialog(self.data, self)
        if dialog.exec_() == QDialog.Accepted:
            col_index, order = dialog.get_result()
            if col_index is not None:
                try:
                    self.data = sorted(self.data,
                                       key=lambda x: x[col_index] if col_index < len(x) else "",
                                       reverse=(order == "desc"))
                    self.update_table_from_data()
                    col_name = chr(65 + col_index) if col_index < 26 else f"Col{col_index + 1}"
                    self.update_status(f"Отсортировано по столбцу {col_name}")
                except Exception as ex:
                    self.update_status(f"Ошибка сортировки: {str(ex)}")

    def update_status(self, message):
        row, col = self.selected_cell
        cell_ref = f"{chr(65 + col)}{row + 1}" if col < 26 else f"Col{col + 1}{row + 1}"
        status_text = f"{message} | Ячейка: {cell_ref} | Время: {datetime.now().strftime('%H:%M:%S')}"
        self.statusBar().showMessage(status_text)


class SortingDialog(QDialog):
    def __init__(self, data, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Сортировка данных")
        self.data = data
        self.result_col = None
        self.result_order = "asc"

        layout = QFormLayout()
        max_cols = max(len(row) for row in data) if data else 10
        col_options = []
        for i in range(min(max_cols, 26)):
            col_options.append(chr(65 + i))
        for i in range(26, max_cols):
            col_options.append(f"Col{i + 1}")

        self.col_combo = QComboBox()
        self.col_combo.addItems(col_options)
        layout.addRow("Столбец для сортировки:", self.col_combo)

        self.order_combo = QComboBox()
        self.order_combo.addItems(["По возрастанию", "По убыванию"])
        layout.addRow("Порядок сортировки:", self.order_combo)

        button_box = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        button_box.accepted.connect(self.accept)
        button_box.rejected.connect(self.reject)
        layout.addWidget(button_box)
        self.setLayout(layout)

    def get_result(self):
        col_index = self.col_combo.currentIndex()
        order = "desc" if self.order_combo.currentIndex() == 1 else "asc"
        return col_index, order


def main():
    app = QApplication(sys.argv)
    window = SpreadsheetApp()
    window.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()