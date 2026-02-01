"""
Главное окно приложения
"""

import json
import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import Optional

from PyQt5.QtWidgets import (QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
                             QTabWidget, QStatusBar, QMenuBar, QMessageBox,
                             QFileDialog, QSplitter, QToolBar, QDialog, QAction,
                             QApplication)
from PyQt5.QtCore import Qt, QTimer, QSize, QSettings
from PyQt5.QtGui import QKeySequence, QIcon, QColor, QPixmap, QPainter

from pysheets.src.core import Workbook
from pysheets.src.io import ExcelImporter, ExcelExporter
from pysheets.src.ui.formula_bar import FormulaBar
from pysheets.src.ui.sidebar import Sidebar
from pysheets.src.ui.spreadsheet_widget import SpreadsheetWidget
from pysheets.src.ui.toolbar import MainToolBar, FormatToolBar, FunctionsToolBar
from pysheets.src.utils import show_error_message


class MainWindow(QMainWindow):
    """Главное окно приложения SmartTable"""

    def __init__(self):
        super().__init__()

        # Настройки
        self.settings = QSettings("SmartTable", "SmartTable")

        # Данные
        self.workbook = Workbook()
        self.current_file_path = None
        self.undo_stack = []
        self.redo_stack = []
        
        # Загружаем сохраненную тему или используем системную с малиновым цветом по умолчанию
        saved_theme = self.settings.value("theme")
        saved_color = self.settings.value("theme_color")
        
        self.current_theme = saved_theme if saved_theme else "system"
        if saved_color:
            self.app_theme_color = QColor(saved_color)
        else:
            self.app_theme_color = QColor("#DC143C")

        # UI элементы
        self.tab_widget = None
        self.status_bar = None
        self.main_toolbar = None
        self.format_toolbar = None
        self.functions_toolbar = None
        self.formula_bar = None
        self.sidebar = None
        self.menu_bar = None

        # Инициализация UI
        self.init_ui()

        # Настройка горячих клавиш
        self.setup_shortcuts()

        # Загрузка последней сессии
        self.load_last_session()

    def init_ui(self):
        """Инициализация пользовательского интерфейса"""
        # Основные настройки окна
        self.setWindowTitle("SmartTable - Новый документ")
        self.setGeometry(100, 100, 1400, 800)

        # Центральный виджет
        central_widget = QWidget()
        self.setCentralWidget(central_widget)

        # Основной layout
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # Создание меню
        self.create_menubar()

        # Создание панелей инструментов
        self.create_toolbars()
        main_layout.addWidget(self.main_toolbar)
        main_layout.addWidget(self.format_toolbar)
        main_layout.addWidget(self.functions_toolbar)

        # Панель формул
        self.formula_bar = FormulaBar()
        main_layout.addWidget(self.formula_bar)

        # Основная рабочая область
        main_area = QWidget()
        main_area_layout = QHBoxLayout(main_area)
        main_area_layout.setContentsMargins(0, 0, 0, 0)

        # Боковая панель слева
        self.sidebar = Sidebar()
        self.sidebar.setMaximumWidth(250)

        # Виджет вкладок
        self.tab_widget = QTabWidget()
        self.tab_widget.setTabsClosable(True)
        self.tab_widget.tabCloseRequested.connect(self.close_tab)
        self.tab_widget.currentChanged.connect(self.tab_changed)

        # Добавляем первую вкладку
        self.add_new_sheet("Лист1")

        # AI Chat панель справа
        from pysheets.src.ui.chat import AIChatWidget
        self.ai_chat_widget = AIChatWidget(self.current_theme, self.app_theme_color)
        self.ai_chat_widget.setMaximumWidth(350)
        self.ai_chat_widget.setMinimumWidth(300)
        self.ai_chat_widget.hide()

        # Разделитель слева
        splitter_left = QSplitter(Qt.Horizontal)
        splitter_left.addWidget(self.sidebar)
        splitter_left.addWidget(self.tab_widget)
        splitter_left.setSizes([200, 600])

        # Разделитель для AI Chat справа
        splitter_right = QSplitter(Qt.Horizontal)
        splitter_right.addWidget(splitter_left)
        splitter_right.addWidget(self.ai_chat_widget)
        splitter_right.setCollapsible(1, True)

        main_area_layout.addWidget(splitter_right)
        main_layout.addWidget(main_area, 1)  # stretch factor = 1, чтобы занять всё пространство

        # Строка состояния
        self.create_statusbar()

        # Применяем тему ПОСЛЕ полной инициализации UI
        # (используем QTimer для отложенного выполнения)
        from PyQt5.QtCore import QTimer
        QTimer.singleShot(100, lambda: self.apply_theme(self.current_theme, self.app_theme_color))

        # Подключение сигналов
        self.connect_signals()

    def create_menubar(self):
        """Создание меню"""
        self.menu_bar = QMenuBar()
        self.setMenuBar(self.menu_bar)

        # Меню "Файл"
        file_menu = self.menu_bar.addMenu("Файл")

        new_action = QAction("Новый", self)
        new_action.setShortcut(QKeySequence("Ctrl+N"))
        new_action.triggered.connect(self.new_file)
        file_menu.addAction(new_action)

        open_action = QAction("Открыть...", self)
        open_action.setShortcut(QKeySequence("Ctrl+O"))
        open_action.triggered.connect(self.open_file)
        file_menu.addAction(open_action)

        file_menu.addSeparator()

        save_action = QAction("Сохранить", self)
        save_action.setShortcut(QKeySequence("Ctrl+S"))
        save_action.triggered.connect(self.save_file)
        file_menu.addAction(save_action)

        save_as_action = QAction("Сохранить как...", self)
        save_as_action.setShortcut(QKeySequence("Ctrl+Shift+S"))
        save_as_action.triggered.connect(self.save_as)
        file_menu.addAction(save_as_action)

        file_menu.addSeparator()

        export_menu = file_menu.addMenu("Экспорт")

        export_excel_action = QAction("Экспорт в Excel...", self)
        export_excel_action.triggered.connect(self.export_to_excel)
        export_menu.addAction(export_excel_action)

        export_csv_action = QAction("Экспорт в CSV...", self)
        export_csv_action.triggered.connect(self.export_to_csv)
        export_menu.addAction(export_csv_action)

        export_pdf_action = QAction("Экспорт в PDF...", self)
        export_pdf_action.triggered.connect(self.export_to_pdf)
        export_menu.addAction(export_pdf_action)

        export_png_action = QAction("Экспорт в PNG...", self)
        export_png_action.triggered.connect(self.export_to_png)
        export_menu.addAction(export_png_action)

        file_menu.addSeparator()

        theme_action = QAction("Настроить тему...", self)
        theme_action.triggered.connect(self.show_theme_settings)
        file_menu.addAction(theme_action)

        file_menu.addSeparator()

        exit_action = QAction("Выход", self)
        exit_action.setShortcut(QKeySequence("Alt+F4"))
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)

        # Меню "Правка"
        edit_menu = self.menu_bar.addMenu("Правка")

        undo_action = QAction("Отменить", self)
        undo_action.setShortcut(QKeySequence("Ctrl+Z"))
        undo_action.triggered.connect(self.undo)
        edit_menu.addAction(undo_action)

        redo_action = QAction("Повторить", self)
        redo_action.setShortcut(QKeySequence("Ctrl+Y"))
        redo_action.triggered.connect(self.redo)
        edit_menu.addAction(redo_action)

        edit_menu.addSeparator()

        cut_action = QAction("Вырезать", self)
        cut_action.setShortcut(QKeySequence("Ctrl+X"))
        cut_action.triggered.connect(self.cut)
        edit_menu.addAction(cut_action)

        copy_action = QAction("Копировать", self)
        copy_action.setShortcut(QKeySequence("Ctrl+C"))
        copy_action.triggered.connect(self.copy)
        edit_menu.addAction(copy_action)

        paste_action = QAction("Вставить", self)
        paste_action.setShortcut(QKeySequence("Ctrl+V"))
        paste_action.triggered.connect(self.paste)
        edit_menu.addAction(paste_action)

        # Меню "Вид"
        view_menu = self.menu_bar.addMenu("Вид")

        zoom_in_action = QAction("Увеличить", self)
        zoom_in_action.setShortcut(QKeySequence("Ctrl++"))
        zoom_in_action.triggered.connect(self.zoom_in)
        view_menu.addAction(zoom_in_action)

        zoom_out_action = QAction("Уменьшить", self)
        zoom_out_action.setShortcut(QKeySequence("Ctrl+-"))
        zoom_out_action.triggered.connect(self.zoom_out)
        view_menu.addAction(zoom_out_action)

        # Меню "Инструменты"
        tools_menu = self.menu_bar.addMenu("Инструменты")

        chart_action = QAction("Создать диаграмму...", self)
        chart_action.triggered.connect(self.create_chart)
        tools_menu.addAction(chart_action)

    def create_toolbars(self):
        """Создание панелей инструментов"""
        self.main_toolbar = MainToolBar()
        self.main_toolbar.new_file_triggered.connect(self.new_file)
        self.main_toolbar.open_file_triggered.connect(self.open_file)
        self.main_toolbar.save_file_triggered.connect(self.save_file)
        self.main_toolbar.export_excel_triggered.connect(self.export_to_excel)
        self.main_toolbar.zoom_changed.connect(self.zoom_combo_changed)
        self.main_toolbar.ai_chat_triggered.connect(self.open_ai_chat)

        self.format_toolbar = FormatToolBar()
        self.format_toolbar.format_changed.connect(self.apply_format)

        self.functions_toolbar = FunctionsToolBar()
        self.functions_toolbar.function_selected.connect(self.on_function_selected)
        self.functions_toolbar.format_selected.connect(self.on_format_selected)

    def create_statusbar(self):
        """Создание строки состояния"""
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self.status_bar.showMessage("Готов")

    def connect_signals(self):
        """Подключение сигналов"""
        self.formula_bar.formula_entered.connect(self.on_formula_entered)
        self.sidebar.function_selected.connect(self.on_function_selected)

    def add_new_sheet(self, name: str):
        """Добавление нового листа"""
        spreadsheet = SpreadsheetWidget()
        spreadsheet.cell_selected.connect(self.on_cell_selected)
        spreadsheet.data_changed.connect(self.on_data_changed)

        index = self.tab_widget.addTab(spreadsheet, name)
        self.tab_widget.setCurrentIndex(index)

        # Добавляем лист в workbook
        self.workbook.add_sheet(name)

    def open_ai_chat(self):
        """Открывает/закрывает боковую панель с чатом ИИ"""
        if self.ai_chat_widget.isVisible():
            self.ai_chat_widget.hide()
        else:
            self.ai_chat_widget.show()
            self.ai_chat_widget.input_field.setFocus()


    def get_current_spreadsheet(self) -> Optional[SpreadsheetWidget]:
        """Получение текущего виджета таблицы"""
        current_widget = self.tab_widget.currentWidget()
        if isinstance(current_widget, SpreadsheetWidget):
            return current_widget
        return None

    # ============ ОБРАБОТЧИКИ СОБЫТИЙ ============

    def on_cell_selected(self, row: int, col: int, value: str):
        """Обработка выбора ячейки"""
        cell_ref = f"{chr(65 + col)}{row + 1}"
        self.formula_bar.set_cell_reference(cell_ref)
        self.formula_bar.set_formula(value)

        # Обновление статус бара с информацией о выделении
        spreadsheet = self.get_current_spreadsheet()
        if spreadsheet:
            stats = spreadsheet.calculate_selection_stats()
            if stats['count'] > 0:
                msg = f"Ячейка {cell_ref} | Сумма: {stats['sum']:.2f} | Среднее: {stats['average']:.2f} | Кол-во: {stats['count']}"
                self.status_bar.showMessage(msg)
            else:
                self.status_bar.showMessage(f"Ячейка {cell_ref} выбрана")
        else:
            self.status_bar.showMessage(f"Ячейка {cell_ref} выбрана")

    def on_data_changed(self, row: int, col: int, value: str):
        """Обработка изменения данных"""
        # Обновление в workbook
        current_sheet = self.tab_widget.currentIndex()
        self.workbook.set_cell_value(current_sheet, row, col, value)

        # Добавление в историю
        self.add_to_undo_stack(row, col, value)

        # Обновление заголовка окна
        self.update_window_title(modified=True)

    def on_formula_entered(self, formula: str):
        """Обработка ввода формулы"""
        spreadsheet = self.get_current_spreadsheet()
        if spreadsheet:
            spreadsheet.set_current_cell_formula(formula)

    def on_function_selected(self, function: str):
        """Обработка выбора функции из комбобокса"""
        spreadsheet = self.get_current_spreadsheet()
        if not function or function == "Функции...":
            return
        
        # Получаем выделенный диапазон
        selected_range = spreadsheet.get_selection_range()
        
        # Если есть выделение, подставляем его в формулу
        if selected_range:
            formula = f"={function}({selected_range})"
            
            # Применяем в ПОСЛЕДНЮЮ выделенную ячейку (bottomRight)
            selected = spreadsheet.selectedRanges()
            if selected:
                range_obj = selected[0]
                last_row = range_obj.bottomRow()
                last_col = range_obj.rightColumn()
                
                # Устанавливаем и применяем формулу в последнюю ячейку
                spreadsheet.set_cell_value(last_row, last_col, formula)
                
                # Обновляем formula bar
                cell_ref = f"{chr(65 + last_col)}{last_row + 1}"
                self.formula_bar.set_cell_reference(cell_ref)
                self.formula_bar.set_formula(formula)
                
                # Устанавливаем текущую ячейку
                spreadsheet.setCurrentCell(last_row, last_col)
        else:
            # Если нет выделения, просто вставляем пустую функцию
            self.formula_bar.insert_function(function)

    def on_format_selected(self, format_type: str):
        """Обработка выбора формата из панели функций"""
        spreadsheet = self.get_current_spreadsheet()
        if not spreadsheet:
            return
        
        # Применяем формат к выделенным ячейкам
        spreadsheet.apply_format('number_format', format_type)
        self.status_bar.showMessage(f"Применён формат: {format_type}")

    # ============ ФУНКЦИИ ФАЙЛОВ ============

    def new_file(self):
        """Создание нового листа (вкладки)"""
        # Просто добавляем новый лист
        sheet_count = self.tab_widget.count() + 1
        sheet_name = f"Лист{sheet_count}"
        self.add_new_sheet(sheet_name)
        self.update_window_title(modified=True)
        self.status_bar.showMessage(f"Создана новая вкладка '{sheet_name}'")

    def open_file(self):
        """Открытие файла"""
        dlg = QFileDialog(self, "Открыть файл")
        dlg.setFileMode(QFileDialog.ExistingFile)
        dlg.setNameFilter("Excel файлы (*.xlsx *.xls);;CSV файлы (*.csv);;Все файлы (*.*)")
        dlg.setOption(QFileDialog.DontUseNativeDialog, True)
        app = QApplication.instance()
        if app and app.styleSheet():
            dlg.setStyleSheet(app.styleSheet())
        if dlg.exec_() == QDialog.Accepted:
            selected = dlg.selectedFiles()
            if selected:
                file_path = selected[0]
            else:
                file_path = None
        else:
            file_path = None

        if file_path:
            try:
                if file_path.endswith(('.xlsx', '.xls')):
                    importer = ExcelImporter()
                    workbook = importer.import_excel(file_path)
                elif file_path.endswith('.csv'):
                    # Импорт CSV
                    df = pd.read_csv(file_path)
                    workbook = Workbook()
                    workbook.add_sheet_from_dataframe(df, "Лист1")
                else:
                    raise ValueError("Неподдерживаемый формат файла")

                self.workbook = workbook
                self.current_file_path = file_path

                # Обновление UI
                self.tab_widget.clear()
                for sheet_name in workbook.sheet_names:
                    spreadsheet = SpreadsheetWidget()
                    spreadsheet.load_data(workbook.get_sheet_data(sheet_name))
                    self.tab_widget.addTab(spreadsheet, sheet_name)

                self.update_window_title()
                self.status_bar.showMessage(f"Файл открыт: {Path(file_path).name}")

            except Exception as e:
                show_error_message(self, f"Ошибка при открытии файла: {str(e)}")

    def save_file(self):
        """Сохранение файла"""
        if self.current_file_path:
            self.save_to_file(self.current_file_path)
        else:
            self.save_as()

    def save_as(self):
        """Сохранение как"""
        dlg = QFileDialog(self, "Сохранить как")
        dlg.setAcceptMode(QFileDialog.AcceptSave)
        dlg.setNameFilter("Excel файлы (*.xlsx);;CSV файлы (*.csv);;JSON файлы (*.json)")
        dlg.setOption(QFileDialog.DontUseNativeDialog, True)
        app = QApplication.instance()
        if app and app.styleSheet():
            dlg.setStyleSheet(app.styleSheet())
        if dlg.exec_() == QDialog.Accepted:
            selected = dlg.selectedFiles()
            if selected:
                file_path = selected[0]
            else:
                file_path = None
        else:
            file_path = None

        if file_path:
            self.save_to_file(file_path)
            self.current_file_path = file_path
            self.update_window_title()

    def save_to_file(self, file_path: str):
        """Сохранение в файл"""
        try:
            if file_path.endswith('.xlsx'):
                exporter = ExcelExporter()
                exporter.export_excel(self.workbook, file_path)
            elif file_path.endswith('.csv'):
                # Экспорт в CSV
                current_sheet = self.tab_widget.currentIndex()
                if current_sheet >= 0:
                    spreadsheet = self.tab_widget.widget(current_sheet)
                    df = spreadsheet.get_dataframe()
                    df.to_csv(file_path, index=False, encoding='utf-8')
            elif file_path.endswith('.json'):
                # Экспорт в JSON
                data = self.workbook.to_dict()
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)

            self.update_window_title(modified=False)
            self.status_bar.showMessage(f"Файл сохранен: {Path(file_path).name}")

        except Exception as e:
            show_error_message(self, f"Ошибка при сохранении файла: {str(e)}")

    def export_to_excel(self):
        """Экспорт в Excel"""
        dlg = QFileDialog(self, "Экспорт в Excel")
        dlg.setAcceptMode(QFileDialog.AcceptSave)
        dlg.setNameFilter("Excel файлы (*.xlsx)")
        dlg.setOption(QFileDialog.DontUseNativeDialog, True)
        app = QApplication.instance()
        if app and app.styleSheet():
            dlg.setStyleSheet(app.styleSheet())
        if dlg.exec_() == QDialog.Accepted:
            selected = dlg.selectedFiles()
            file_path = selected[0] if selected else None
        else:
            file_path = None

        if file_path:
            try:
                exporter = ExcelExporter()
                exporter.export_excel(self.workbook, file_path)
                self.status_bar.showMessage(f"Экспорт завершен: {Path(file_path).name}")
            except Exception as e:
                show_error_message(self, f"Ошибка при экспорте: {str(e)}")

    def export_to_csv(self):
        """Экспорт в CSV"""
        spreadsheet = self.get_current_spreadsheet()
        if not spreadsheet:
            return

        dlg = QFileDialog(self, "Экспорт в CSV")
        dlg.setAcceptMode(QFileDialog.AcceptSave)
        dlg.setNameFilter("CSV файлы (*.csv)")
        dlg.setOption(QFileDialog.DontUseNativeDialog, True)
        app = QApplication.instance()
        if app and app.styleSheet():
            dlg.setStyleSheet(app.styleSheet())
        if dlg.exec_() == QDialog.Accepted:
            selected = dlg.selectedFiles()
            file_path = selected[0] if selected else None
        else:
            file_path = None

        if file_path:
            try:
                df = spreadsheet.get_dataframe()
                df.to_csv(file_path, index=False, encoding='utf-8')
                self.status_bar.showMessage(f"Экспорт завершен: {Path(file_path).name}")
            except Exception as e:
                show_error_message(self, f"Ошибка при экспорте: {str(e)}")

    # ============ ФУНКЦИИ ПРАВКИ ============

    def undo(self):
        """Отмена последнего действия"""
        if self.undo_stack:
            action = self.undo_stack.pop()
            self.redo_stack.append(action)

            # Восстановление состояния
            # (реализация зависит от структуры данных)
            self.status_bar.showMessage("Отменено последнее действие")

    def redo(self):
        """Повтор последнего действия"""
        if self.redo_stack:
            action = self.redo_stack.pop()
            self.undo_stack.append(action)

            # Восстановление состояния
            self.status_bar.showMessage("Повторено последнее действие")

    def cut(self):
        """Вырезание"""
        spreadsheet = self.get_current_spreadsheet()
        if spreadsheet:
            spreadsheet.cut()
            self.status_bar.showMessage("Вырезано")

    def copy(self):
        """Копирование"""
        spreadsheet = self.get_current_spreadsheet()
        if spreadsheet:
            spreadsheet.copy()
            self.status_bar.showMessage("Скопировано")

    def paste(self):
        """Вставка"""
        spreadsheet = self.get_current_spreadsheet()
        if spreadsheet:
            spreadsheet.paste()
            self.status_bar.showMessage("Вставлено")

    # ============ ФУНКЦИИ ВИДА ============

    def zoom_in(self):
        """Увеличение масштаба"""
        spreadsheet = self.get_current_spreadsheet()
        if spreadsheet:
            spreadsheet.zoom_in()

    def zoom_out(self):
        """Уменьшение масштаба"""
        spreadsheet = self.get_current_spreadsheet()
        if spreadsheet:
            spreadsheet.zoom_out()

    def zoom_combo_changed(self, value):
        """Обработка изменения масштаба из комбобокса"""
        if value.endswith("%"):
            zoom_value = int(value[:-1])
            spreadsheet = self.get_current_spreadsheet()
            if spreadsheet:
                spreadsheet.zoom_level = zoom_value
                spreadsheet.apply_zoom()
            self.status_bar.showMessage(f"Масштаб: {zoom_value}%")

    # ============ ИНСТРУМЕНТЫ ============

    def create_chart(self):
        """Создание диаграммы"""
        spreadsheet = self.get_current_spreadsheet()
        if spreadsheet:
            dialog = QDialog(self)
            if dialog.exec() == QDialog.Accepted:
                chart_data = dialog.get_chart_data()
                # Создание диаграммы
                self.status_bar.showMessage("Диаграмма создана")

    # ============ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ============

    def add_to_undo_stack(self, row: int, col: int, value: str):
        """Добавление действия в стек отмены"""
        self.undo_stack.append({
            'row': row,
            'col': col,
            'value': value,
            'timestamp': datetime.now()
        })

        # Ограничиваем размер стека
        if len(self.undo_stack) > 50:
            self.undo_stack.pop(0)

    def update_window_title(self, modified: bool = False):
        """Обновление заголовка окна"""
        title = "SmartTable"

        if self.current_file_path:
            title += f" - {Path(self.current_file_path).name}"
        else:
            title += " - Новый документ"

        if modified:
            title += " *"

        self.setWindowTitle(title)

    def tab_changed(self, index: int):
        """Обработка смены вкладки"""
        if index >= 0:
            spreadsheet = self.tab_widget.widget(index)
            if spreadsheet:
                # Обновление UI для новой вкладки
                pass

    def close_tab(self, index: int):
        """Закрытие вкладки"""
        if self.tab_widget.count() > 1:
            self.tab_widget.removeTab(index)
        else:
            QMessageBox.warning(self, "Ошибка", "Нельзя закрыть последнюю вкладку")

    def apply_format(self, format_type: str, value):
        """Применение форматирования"""
        spreadsheet = self.get_current_spreadsheet()
        if spreadsheet:
            spreadsheet.apply_format(format_type, value)

    def setup_shortcuts(self):
        """Настройка горячих клавиш"""
        # Дополнительные горячие клавиши
        shortcuts = [
            (QKeySequence("F2"), self.edit_cell),
            (QKeySequence("F5"), self.calculate_formulas),
            (QKeySequence("F11"), self.toggle_fullscreen),
        ]

        for shortcut, handler in shortcuts:
            action = QAction(self)
            action.setShortcut(shortcut)
            action.triggered.connect(handler)
            self.addAction(action)

    def edit_cell(self):
        """Редактирование ячейки"""
        self.formula_bar.setFocus()

    def calculate_formulas(self):
        """Пересчет формул"""
        spreadsheet = self.get_current_spreadsheet()
        if spreadsheet:
            spreadsheet.calculate_formulas()
            self.status_bar.showMessage("Формулы пересчитаны")

    def toggle_fullscreen(self):
        """Переключение полноэкранного режима"""
        if self.isFullScreen():
            self.showNormal()
        else:
            self.showFullScreen()

    def load_last_session(self):
        """Загрузка последней сессии"""
        last_file = self.settings.value("last_file")
        if last_file and Path(last_file).exists():
            reply = QMessageBox.question(
                self, "Восстановление сессии",
                f"Восстановить последний файл?\n{Path(last_file).name}",
                QMessageBox.Yes | QMessageBox.No
            )

            if reply == QMessageBox.Yes:
                self.current_file_path = last_file
                self.open_file()

    def autosave(self):
        """Автосохранение"""
        if self.workbook and self.current_file_path:
            backup_file = self.current_file_path + ".autosave"
            try:
                self.save_to_file(backup_file)
            except:
                pass

    def export_to_csv(self):
        """Экспорт в CSV"""
        spreadsheet = self.get_current_spreadsheet()
        if not spreadsheet:
            return

        dlg = QFileDialog(self, "Экспорт в CSV")
        dlg.setAcceptMode(QFileDialog.AcceptSave)
        dlg.setNameFilter("CSV файлы (*.csv)")
        dlg.setOption(QFileDialog.DontUseNativeDialog, True)
        app = QApplication.instance()
        if app and app.styleSheet():
            dlg.setStyleSheet(app.styleSheet())
        if dlg.exec_() == QDialog.Accepted:
            selected = dlg.selectedFiles()
            file_path = selected[0] if selected else None
        else:
            file_path = None

        if file_path:
            try:
                df = spreadsheet.get_dataframe()
                df.to_csv(file_path, index=False, encoding='utf-8')
                self.status_bar.showMessage(f"Экспорт завершен: {Path(file_path).name}")
            except Exception as e:
                from pysheets.src.utils.helpers import show_error_message
                show_error_message(self, f"Ошибка при экспорте: {str(e)}")

    def export_to_pdf(self):
        """Экспорт в PDF"""
        spreadsheet = self.get_current_spreadsheet()
        if not spreadsheet:
            return

        dlg = QFileDialog(self, "Экспорт в PDF")
        dlg.setAcceptMode(QFileDialog.AcceptSave)
        dlg.setNameFilter("PDF файлы (*.pdf)")
        dlg.setOption(QFileDialog.DontUseNativeDialog, True)
        app = QApplication.instance()
        if app and app.styleSheet():
            dlg.setStyleSheet(app.styleSheet())
        if dlg.exec_() == QDialog.Accepted:
            selected = dlg.selectedFiles()
            file_path = selected[0] if selected else None
        else:
            file_path = None

        if file_path:
            try:
                from reportlab.lib.pagesizes import letter, A4
                from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
                from reportlab.lib.styles import getSampleStyleSheet
                from reportlab.lib import colors
                
                # Получаем данные
                df = spreadsheet.get_dataframe()
                
                # Создаем PDF
                doc = SimpleDocTemplate(file_path, pagesize=A4)
                elements = []
                
                # Преобразуем DataFrame в таблицу
                data = [df.columns.tolist()] + df.values.tolist()
                
                # Создаем таблицу
                table = Table(data)
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 10),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black)
                ]))
                
                elements.append(table)
                doc.build(elements)
                
                self.status_bar.showMessage(f"Экспорт в PDF завершен: {Path(file_path).name}")
            except ImportError:
                from pysheets.src.utils.helpers import show_error_message
                show_error_message(self, "Ошибка: необходимо установить reportlab\nУстановите: pip install reportlab")
            except Exception as e:
                from pysheets.src.utils.helpers import show_error_message
                show_error_message(self, f"Ошибка при экспорте в PDF: {str(e)}")

    def export_to_png(self):
        """Экспорт в PNG"""
        spreadsheet = self.get_current_spreadsheet()
        if not spreadsheet:
            return

        dlg = QFileDialog(self, "Экспорт в PNG")
        dlg.setAcceptMode(QFileDialog.AcceptSave)
        dlg.setNameFilter("PNG файлы (*.png)")
        dlg.setOption(QFileDialog.DontUseNativeDialog, True)
        app = QApplication.instance()
        if app and app.styleSheet():
            dlg.setStyleSheet(app.styleSheet())
        if dlg.exec_() == QDialog.Accepted:
            selected = dlg.selectedFiles()
            file_path = selected[0] if selected else None
        else:
            file_path = None

        if file_path:
            try:
                # Получаем таблицу и создаем скриншот
                table = spreadsheet
                
                # Определяем размер изображения
                width = table.width()
                height = table.height()
                
                # Создаем pixmap
                pixmap = QPixmap(width, height)
                pixmap.fill()
                
                # Рисуем таблицу на pixmap
                painter = QPainter(pixmap)
                table.render(painter)
                painter.end()
                
                # Сохраняем в файл
                pixmap.save(file_path, "PNG")
                
                self.status_bar.showMessage(f"Экспорт в PNG завершен: {Path(file_path).name}")
            except Exception as e:
                from pysheets.src.utils.helpers import show_error_message
                show_error_message(self, f"Ошибка при экспорте в PNG: {str(e)}")

    def apply_theme(self, theme_name, color):
        """Применяет тему приложению"""
        from pysheets.src.ui.themes import ThemeManager
        from PyQt5.QtWidgets import QApplication
        
        manager = ThemeManager()
        manager.current_theme = theme_name
        if color is not None:
            manager.app_theme_color = color
        manager.apply_theme(theme_name, color)
        self.current_theme = theme_name
        if color is not None:
            self.app_theme_color = color
        
        # Также применяем stylesheet на само окно для гарантии
        app = QApplication.instance()
        if app and app.styleSheet():
            self.setStyleSheet(app.styleSheet())
        
        # Обновляем тему в AI Chat
        if hasattr(self, 'ai_chat_widget'):
            self.ai_chat_widget.update_theme(theme_name, color)
        
        # Сохраняем тему в настройки
        self.settings.setValue("theme", theme_name)
        if color is not None:
            self.settings.setValue("theme_color", color.name())

    def show_theme_settings(self):
        """Показывает диалог настроек темы"""
        from pysheets.src.ui.themes import ThemeSettingsDialog
        dialog = ThemeSettingsDialog(self)
        if dialog.exec_() == QDialog.Accepted:
            settings = dialog.get_settings()
            # Применяем выбранную тему
            self.apply_theme(settings['theme'], settings['color'])

    def closeEvent(self, event):
        """Обработка закрытия окна"""
        # Сохранение настроек
        if self.current_file_path:
            self.settings.setValue("last_file", self.current_file_path)

        # Проверка несохраненных изменений
        try:
            is_modified = self.workbook.is_modified()
        except Exception:
            is_modified = False

        if is_modified:
            # Создаём диалог с поддержкой темы
            result = self._show_save_dialog()
            
            if result == "save":
                try:
                    self.save_file()
                except Exception:
                    pass  # Если не удалось сохранить, всё равно закрываем
                event.accept()
            elif result == "discard":
                event.accept()
            else:  # cancel
                event.ignore()
        else:
            event.accept()

    def _show_save_dialog(self) -> str:
        """Показывает диалог сохранения с поддержкой темы.
        
        Returns:
            'save', 'discard' или 'cancel'
        """
        from pysheets.src.ui.themes import ThemeManager
        
        # Определяем текущую тему для стилизации диалога
        actual_theme = self.current_theme
        if actual_theme == "system":
            manager = ThemeManager()
            actual_theme = manager._get_real_system_theme()
        
        # Создаём стилизованный диалог
        dlg = QMessageBox(self)
        dlg.setWindowTitle("Сохранение")
        dlg.setText("Есть несохраненные изменения.")
        dlg.setInformativeText("Сохранить изменения перед закрытием?")
        dlg.setIcon(QMessageBox.Question)
        
        # Добавляем кнопки с русскими названиями
        save_btn = dlg.addButton("Сохранить", QMessageBox.AcceptRole)
        discard_btn = dlg.addButton("Не сохранять", QMessageBox.DestructiveRole)
        cancel_btn = dlg.addButton("Отмена", QMessageBox.RejectRole)
        
        dlg.setDefaultButton(save_btn)
        
        # Применяем стили в соответствии с темой
        accent_color = self.app_theme_color.name()
        accent_hover = self.app_theme_color.lighter(120).name()
        accent_dark = self.app_theme_color.darker(150).name()
        
        if actual_theme == "dark":
            dialog_style = f"""
                QMessageBox {{
                    background-color: #2d2d2d;
                }}
                QMessageBox QLabel {{
                    color: #e8eaed;
                    font-size: 12px;
                    padding: 10px;
                }}
                QPushButton {{
                    background-color: #3d3d3d;
                    border: 1px solid #4a4a4a;
                    border-radius: 6px;
                    padding: 8px 20px;
                    color: #e8eaed;
                    font-weight: 500;
                    min-width: 80px;
                }}
                QPushButton:hover {{
                    background-color: #4d4d4d;
                    border-color: #5a5a5a;
                }}
                QPushButton:pressed {{
                    background-color: #555555;
                }}
                QPushButton:default {{
                    background-color: {accent_color};
                    color: white;
                    border: none;
                }}
                QPushButton:default:hover {{
                    background-color: {accent_hover};
                }}
                QPushButton:default:pressed {{
                    background-color: {accent_dark};
                }}
            """
        else:
            dialog_style = f"""
                QMessageBox {{
                    background-color: #ffffff;
                }}
                QMessageBox QLabel {{
                    color: #202124;
                    font-size: 12px;
                    padding: 10px;
                }}
                QPushButton {{
                    background-color: #f8f9fa;
                    border: 1px solid #dadce0;
                    border-radius: 6px;
                    padding: 8px 20px;
                    color: #202124;
                    font-weight: 500;
                    min-width: 80px;
                }}
                QPushButton:hover {{
                    background-color: #f1f3f4;
                    border-color: #c6c6c6;
                }}
                QPushButton:pressed {{
                    background-color: #e8eaed;
                }}
                QPushButton:default {{
                    background-color: {accent_color};
                    color: white;
                    border: none;
                }}
                QPushButton:default:hover {{
                    background-color: {accent_hover};
                }}
                QPushButton:default:pressed {{
                    background-color: {accent_dark};
                }}
            """
        
        dlg.setStyleSheet(dialog_style)
        
        # Показываем диалог
        dlg.exec_()
        
        clicked = dlg.clickedButton()
        if clicked == save_btn:
            return "save"
        elif clicked == discard_btn:
            return "discard"
        else:
            return "cancel"