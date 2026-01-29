import flet as ft
import pandas as pd
import json
import os
from datetime import datetime


class SpreadsheetApp:
    def __init__(self, page: ft.Page):
        self.page = page
        self.page.title = "Flet Excel - Табличный редактор"
        self.page.theme_mode = ft.ThemeMode.LIGHT
        self.data = [["" for _ in range(10)] for _ in range(20)]
        self.current_file = None
        self.selected_cell = (0, 0)
        self.cells = {}
        self.init_ui()

    def init_ui(self):
        # Создаем колонки (вертикальные заголовки)
        columns = []
        for col in range(10):
            col_name = chr(65 + col)  # A, B, C, ...
            columns.append(ft.DataColumn(
                ft.Container(
                    content=ft.Text(col_name, weight=ft.FontWeight.BOLD),
                    alignment=ft.alignment.Alignment(0, 0),
                    bgcolor=ft.Colors.BLUE_GREY_100,
                    padding=ft.Padding(0, 0, 0, 0),
                    width=100,
                    height=30,
                )
            ))

        # Создаем строки
        rows = []
        for row_idx in range(len(self.data)):
            cells = []
            # Заголовок строки (номер)
            row_header = ft.DataCell(
                ft.Container(
                    content=ft.Text(str(row_idx + 1), weight=ft.FontWeight.BOLD),
                    alignment=ft.alignment.Alignment(0, 0),
                    bgcolor=ft.Colors.BLUE_GREY_100,
                    padding=ft.Padding(0, 0, 0, 0),
                    width=50,
                    height=30,
                )
            )
            cells.append(row_header)

            # Ячейки данных
            for col_idx in range(10):
                cell_key = f"{row_idx}_{col_idx}"
                tf = ft.TextField(
                    value=self.data[row_idx][col_idx],
                    text_size=12,
                    content_padding=ft.Padding.all(5),
                    border=ft.InputBorder.NONE,
                    on_change=lambda e, r=row_idx, c=col_idx: self.cell_changed(r, c, e.control.value),
                    on_focus=lambda e, r=row_idx, c=col_idx: self.cell_focused(r, c),
                    width=98,
                    height=30,
                )
                self.cells[cell_key] = tf
                cells.append(ft.DataCell(tf))
            rows.append(ft.DataRow(cells))

        # Создаем таблицу
        self.data_table = ft.DataTable(
            columns=[ft.DataColumn(ft.Container(width=50))] + columns,
            rows=rows,
            border=ft.Border.all(1, ft.Colors.GREY_400),
            column_spacing=0,
            show_bottom_border=True,
        )

        # Панель инструментов
        self.toolbar = ft.Row(
            controls=[
                ft.FilledButton("📁 Открыть", on_click=self.open_file_dialog),
                ft.FilledButton("💾 Сохранить", on_click=self.save_file_dialog),
                ft.FilledButton("另 Сохранить как", on_click=self.save_as_file_dialog),
                ft.VerticalDivider(),
                ft.FilledButton("➕ Добавить строку", on_click=self.add_row),
                ft.FilledButton("➖ Удалить строку", on_click=self.delete_row),
                ft.FilledButton(".AddColumn Добавить столбец", on_click=self.add_column),
                ft.FilledButton("❌ Удалить столбец", on_click=self.delete_column),
                ft.VerticalDivider(),
                ft.FilledButton("↩ Отменить", on_click=self.undo),
                ft.FilledButton("↪ Повторить", on_click=self.redo),
                ft.VerticalDivider(),
                ft.FilledButton("= Формулы", on_click=self.show_formulas),
                ft.FilledButton("🎨 Формат", on_click=self.show_formatting),
                ft.FilledButton("⇅ Сортировка", on_click=self.show_sorting),
            ],
            alignment=ft.MainAxisAlignment.START,
            wrap=True,
        )

        # Строка формул
        self.formula_bar = ft.Row(
            controls=[
                ft.Text("fx", weight=ft.FontWeight.BOLD, width=30),
                ft.TextField(
                    expand=True,
                    hint_text="Введите формулу или значение",
                    on_submit=self.apply_formula,
                ),
            ]
        )

        # Строка состояния
        self.status_bar = ft.Text("Готово | Ячейка: A1")

        # Основной макет
        main_container = ft.Column(
            controls=[
                self.toolbar,
                ft.Divider(),
                self.formula_bar,
                ft.Divider(),
                ft.Container(
                    content=self.data_table,
                    height=500,
                    padding=0,
                ),
                ft.Divider(),
                self.status_bar,
            ],
            spacing=5,
            expand=True,
        )

        self.page.add(main_container)

    def apply_formula(self, e):
        formula = e.control.value
        row, col = self.selected_cell

        try:
            if formula.startswith("="):
                result = self.evaluate_formula(formula[1:])
                self.data[row][col] = str(result)
                cell_key = f"{row}_{col}"
                if cell_key in self.cells:
                    self.cells[cell_key].value = str(result)
                    self.cells[cell_key].update()
                self.update_status(f"Формула применена: {result}")
            else:
                self.data[row][col] = formula
                self.update_status("Значение обновлено")
        except Exception as ex:
            self.update_status(f"Ошибка формулы: {str(ex)}")

    def evaluate_formula(self, formula):
        formula = formula.strip().upper()

        if formula.startswith("SUM("):
            range_str = formula[4:-1]
            return self.sum_range(range_str)
        elif formula.startswith("AVERAGE("):
            range_str = formula[8:-1]
            return self.average_range(range_str)
        elif formula.startswith("MAX("):
            range_str = formula[4:-1]
            return self.max_range(range_str)
        elif formula.startswith("MIN("):
            range_str = formula[4:-1]
            return self.min_range(range_str)
        elif formula.startswith("COUNT("):
            range_str = formula[6:-1]
            return self.count_range(range_str)
        else:
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

    def sum_range(self, range_str):
        total = 0
        cells = self.parse_range(range_str)
        for row, col in cells:
            try:
                total += float(self.data[row][col]) if self.data[row][col] else 0
            except:
                pass
        return total

    def average_range(self, range_str):
        cells = self.parse_range(range_str)
        total = self.sum_range(range_str)
        return total / len(cells) if cells else 0

    def max_range(self, range_str):
        cells = self.parse_range(range_str)
        values = []
        for row, col in cells:
            try:
                if self.data[row][col]:
                    values.append(float(self.data[row][col]))
            except:
                pass
        return max(values) if values else 0

    def min_range(self, range_str):
        cells = self.parse_range(range_str)
        values = []
        for row, col in cells:
            try:
                if self.data[row][col]:
                    values.append(float(self.data[row][col]))
            except:
                pass
        return min(values) if values else 0

    def count_range(self, range_str):
        cells = self.parse_range(range_str)
        count = 0
        for row, col in cells:
            if self.data[row][col]:
                count += 1
        return count

    def parse_range(self, range_str):
        cells = []
        try:
            if ":" in range_str:
                start, end = range_str.split(":")
                start_col = ord(start[0]) - 65
                start_row = int(start[1:]) - 1
                end_col = ord(end[0]) - 65
                end_row = int(end[1:]) - 1

                for row in range(start_row, end_row + 1):
                    for col in range(start_col, end_col + 1):
                        if 0 <= row < len(self.data) and 0 <= col < len(self.data[0]):
                            cells.append((row, col))
            else:
                col = ord(range_str[0]) - 65
                row = int(range_str[1:]) - 1
                if 0 <= row < len(self.data) and 0 <= col < len(self.data[0]):
                    cells.append((row, col))
        except:
            pass
        return cells

    def cell_changed(self, row, col, value):
        self.data[row][col] = value
        self.update_status(f"Изменено: {chr(65 + col)}{row + 1}")

    def cell_focused(self, row, col):
        self.selected_cell = (row, col)
        cell_ref = f"{chr(65 + col)}{row + 1}"
        self.formula_bar.controls[1].value = self.data[row][col]
        self.update_status(f"Выбрано: {cell_ref}")

    def open_file_dialog(self, e):
        def handle_result(e):
            if e.files:
                file_path = e.files[0].path
                self.load_file(file_path)

        file_picker = ft.FilePicker()
        file_picker.on_result = handle_result

        self.page.overlay.clear()
        self.page.overlay.append(file_picker)
        self.page.update()

        # Запускаем асинхронный метод правильно
        self.page.run_task(
            file_picker.pick_files,
            allowed_extensions=["csv", "xlsx", "xls", "json", "txt"],
            dialog_title="Открыть файл"
        )

    def save_as_file_dialog(self, e):
        def handle_save(e):
            if e.path:
                file_path = e.path
                if not os.path.splitext(file_path)[1]:
                    file_path += '.csv'
                self.save_file(file_path)
                self.current_file = file_path

        file_saver = ft.FilePicker()
        file_saver.on_result = handle_save

        self.page.overlay.clear()
        self.page.overlay.append(file_saver)
        self.page.update()

        # Запускаем асинхронный метод правильно
        self.page.run_task(
            file_saver.save_file,
            dialog_title="Сохранить файл",
            file_name="таблица.csv",
            allowed_extensions=["csv", "xlsx", "json", "txt"]
        )

    def save_file_dialog(self, e):
        if self.current_file:
            self.save_file(self.current_file)
        else:
            self.save_as_file_dialog(e)



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

            # Приводим к размеру 20x10
            while len(self.data) < 20:
                self.data.append(["" for _ in range(10)])
            for i in range(len(self.data)):
                if len(self.data[i]) < 10:
                    self.data[i].extend(["" for _ in range(10 - len(self.data[i]))])
                elif len(self.data[i]) > 10:
                    self.data[i] = self.data[i][:10]
            self.data = self.data[:20]

            self.rebuild_table()
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

    def add_row(self, e):
        if len(self.data) < 50:
            self.data.append(["" for _ in range(len(self.data[0]) if self.data else 10)])
            self.rebuild_table()
            self.update_status("Добавлена новая строка")

    def delete_row(self, e):
        if len(self.data) > 1:
            self.data.pop()
            self.rebuild_table()
            self.update_status("Удалена последняя строка")

    def add_column(self, e):
        if len(self.data[0]) < 26:
            for row in self.data:
                row.append("")
            self.rebuild_table()
            self.update_status("Добавлен новый столбец")

    def delete_column(self, e):
        if len(self.data[0]) > 1:
            for row in self.data:
                row.pop()
            # Убедимся, что все строки имеют одинаковую длину
            min_cols = min(len(row) for row in self.data) if self.data else 0
            for row in self.data:
                while len(row) > min_cols:
                    row.pop()
            self.rebuild_table()
            self.update_status("Удален последний столбец")

    def undo(self, e):
        self.update_status("Отмена - функция в разработке")

    def redo(self, e):
        self.update_status("Повтор - функция в разработке")

    def show_formulas(self, e):
        formulas = [
            "=SUM(A1:A5) - Сумма диапазона",
            "=AVERAGE(B1:B10) - Среднее значение",
            "=MAX(C1:C20) - Максимальное значение",
            "=MIN(D1:D15) - Минимальное значение",
            "=COUNT(E1:E100) - Количество непустых ячеек",
            "=A1+B1 - Сложение",
            "=A1*B1 - Умножение",
            "=A1/B1 - Деление",
            "=A1-B1 - Вычитание"
        ]

        def close_dlg(e):
            dlg_modal.open = False
            self.page.update()

        dlg_modal = ft.AlertDialog(
            title=ft.Text("Доступные формулы"),
            content=ft.Column(
                [ft.Text(formula) for formula in formulas],
                height=300,
                scroll=ft.ScrollMode.AUTO
            ),
            actions=[ft.TextButton("Закрыть", on_click=close_dlg)],
            actions_alignment=ft.MainAxisAlignment.END,
        )

        self.page.dialog = dlg_modal
        dlg_modal.open = True
        self.page.update()

    def show_formatting(self, e):
        def apply_formatting(e):
            self.update_status("Форматирование применено")
            dlg_modal.open = False
            self.page.update()

        def close_dlg(e):
            dlg_modal.open = False
            self.page.update()

        dlg_modal = ft.AlertDialog(
            title=ft.Text("Форматирование ячеек"),
            content=ft.Column([
                ft.Dropdown(
                    label="Выравнивание",
                    options=[
                        ft.dropdown.Option("left", "По левому краю"),
                        ft.dropdown.Option("center", "По центру"),
                        ft.dropdown.Option("right", "По правому краю"),
                    ]
                ),
                ft.Dropdown(
                    label="Шрифт",
                    options=[
                        ft.dropdown.Option("Arial", "Arial"),
                        ft.dropdown.Option("Times", "Times New Roman"),
                        ft.dropdown.Option("Courier", "Courier New"),
                    ]
                ),
                ft.Slider(label="Размер шрифта", min=8, max=24, divisions=16, value=12),
            ]),
            actions=[
                ft.TextButton("Применить", on_click=apply_formatting),
                ft.TextButton("Отмена", on_click=close_dlg),
            ],
            actions_alignment=ft.MainAxisAlignment.END,
        )

        self.page.dialog = dlg_modal
        dlg_modal.open = True
        self.page.update()

    def show_sorting(self, e):
        def apply_sort(e):
            try:
                col = sort_column.value
                order = sort_order.value
                if col:
                    col_index = ord(col) - 65
                    self.data = sorted(self.data,
                                       key=lambda x: x[col_index] if col_index < len(x) else "",
                                       reverse=(order == "desc"))
                    self.rebuild_table()
                    self.update_status(f"Отсортировано по столбцу {col}")
                dlg_modal.open = False
                self.page.update()
            except Exception as ex:
                self.update_status(f"Ошибка сортировки: {str(ex)}")

        def close_dlg(e):
            dlg_modal.open = False
            self.page.update()

        column_options = [ft.dropdown.Option(chr(65 + i), chr(65 + i)) for i in
                          range(min(10, len(self.data[0]) if self.data else 1))]
        sort_column = ft.Dropdown(label="Столбец для сортировки", options=column_options, width=200)
        sort_order = ft.Dropdown(
            label="Порядок сортировки",
            options=[
                ft.dropdown.Option("asc", "По возрастанию"),
                ft.dropdown.Option("desc", "По убыванию"),
            ],
            value="asc",
            width=200
        )

        dlg_modal = ft.AlertDialog(
            title=ft.Text("Сортировка данных"),
            content=ft.Column([sort_column, sort_order]),
            actions=[
                ft.TextButton("Сортировать", on_click=apply_sort),
                ft.TextButton("Отмена", on_click=close_dlg),
            ],
            actions_alignment=ft.MainAxisAlignment.END,
        )

        self.page.dialog = dlg_modal
        dlg_modal.open = True
        self.page.update()

    def rebuild_table(self):
        """Перестраивает всю таблицу при изменении данных"""
        # Убедимся, что все строки имеют одинаковую длину
        if not self.data:
            self.data = [["" for _ in range(10)] for _ in range(20)]

        max_cols = max(len(row) for row in self.data) if self.data else 10
        min_rows = min(20, len(self.data))

        # Приведем все строки к одинаковой длине
        for row in self.data:
            while len(row) < max_cols:
                row.append("")
            while len(row) > max_cols:
                row.pop()

        # Обрежем до 20 строк
        self.data = self.data[:20]
        while len(self.data) < 20:
            self.data.append(["" for _ in range(max_cols)])

        columns = []
        for col in range(max_cols):
            col_name = chr(65 + col) if col < 26 else f"Col{col + 1}"
            columns.append(ft.DataColumn(
                ft.Container(
                    content=ft.Text(col_name, weight=ft.FontWeight.BOLD),
                    alignment=ft.alignment.Alignment(0, 0),
                    bgcolor=ft.Colors.BLUE_GREY_100,
                    padding=ft.Padding(0, 0, 0, 0),
                    width=100,
                    height=30,
                )
            ))

        rows = []
        for row_idx in range(len(self.data)):
            cells = []
            row_header = ft.DataCell(
                ft.Container(
                    content=ft.Text(str(row_idx + 1), weight=ft.FontWeight.BOLD),
                    alignment=ft.alignment.Alignment(0, 0),
                    bgcolor=ft.Colors.BLUE_GREY_100,
                    padding=ft.Padding(0, 0, 0, 0),
                    width=50,
                    height=30,
                )
            )
            cells.append(row_header)

            for col_idx in range(len(self.data[row_idx])):
                cell_key = f"{row_idx}_{col_idx}"
                tf = ft.TextField(
                    value=self.data[row_idx][col_idx],
                    text_size=12,
                    content_padding=ft.Padding.all(5),
                    border=ft.InputBorder.NONE,
                    on_change=lambda e, r=row_idx, c=col_idx: self.cell_changed(r, c, e.control.value),
                    on_focus=lambda e, r=row_idx, c=col_idx: self.cell_focused(r, c),
                    width=98,
                    height=30,
                )
                self.cells[cell_key] = tf
                cells.append(ft.DataCell(tf))
            rows.append(ft.DataRow(cells))

        self.data_table.columns = [ft.DataColumn(ft.Container(width=50))] + columns
        self.data_table.rows = rows
        self.page.update()

    def update_status(self, message):
        cell_ref = f"{chr(65 + self.selected_cell[1])}{self.selected_cell[0] + 1}" if self.selected_cell[
                                                                                          1] < 26 else f"Col{self.selected_cell[1] + 1}{self.selected_cell[0] + 1}"
        self.status_bar.value = f"{message} | Ячейка: {cell_ref} | Время: {datetime.now().strftime('%H:%M:%S')}"
        self.status_bar.update()


def main(page: ft.Page):
    page.window.width = 1200
    page.window.height = 700
    page.window.min_width = 800
    page.window.min_height = 600
    page.theme_mode = ft.ThemeMode.LIGHT
    page.padding = 0
    app = SpreadsheetApp(page)


if __name__ == "__main__":
    ft.app(main, view=ft.AppView.FLET_APP)