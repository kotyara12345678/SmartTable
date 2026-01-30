"""
Главное окно приложения
"""

import json
import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import Optional

from PyQt6.QtWidgets import (QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
                             QTabWidget, QStatusBar, QMenuBar, QMessageBox,
                             QFileDialog, QSplitter, QToolBar, QDialog)
from PyQt6.QtCore import Qt, QTimer, QSize, QSettings
from PyQt6.QtGui import QAction, QKeySequence, QIcon

from src.ui.toolbar import MainToolBar, FormatToolBar
from src.ui.spreadsheet_widget import SpreadsheetWidget
from src.ui.formula_bar import FormulaBar
from src.ui.sidebar import Sidebar
from src.io.excel_import import ExcelImporter
from src.io.excel_export import ExcelExporter
from src.core.workbook import Workbook
from src.utils.helpers import show_error_message


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

        # UI элементы
        self.tab_widget = None
        self.status_bar = None
        self.main_toolbar = None
        self.format_toolbar = None
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

        # Панель формул
        self.formula_bar = FormulaBar()
        main_layout.addWidget(self.formula_bar)

        # Основная рабочая область
        main_area = QWidget()
        main_area_layout = QHBoxLayout(main_area)
        main_area_layout.setContentsMargins(0, 0, 0, 0)

        # Боковая панель
        self.sidebar = Sidebar()
        self.sidebar.setMaximumWidth(250)

        # Виджет вкладок
        self.tab_widget = QTabWidget()
        self.tab_widget.setTabsClosable(True)
        self.tab_widget.tabCloseRequested.connect(self.close_tab)
        self.tab_widget.currentChanged.connect(self.tab_changed)

        # Добавляем первую вкладку
        self.add_new_sheet("Лист1")

        # Разделитель
        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.addWidget(self.sidebar)
        splitter.addWidget(self.tab_widget)
        splitter.setSizes([200, 600])

        main_area_layout.addWidget(splitter)
        main_layout.addWidget(main_area)

        # Строка состояния
        self.create_statusbar()

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

        self.format_toolbar = FormatToolBar()
        self.format_toolbar.format_changed.connect(self.apply_format)

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

        # Обновление статус бара
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
        """Обработка выбора функции"""
        self.formula_bar.insert_function(function)

    # ============ ФУНКЦИИ ФАЙЛОВ ============

    def new_file(self):
        """Создание нового файла"""
        reply = QMessageBox.question(
            self, "Новый файл",
            "Создать новый файл? Несохраненные данные будут потеряны.",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )

        if reply == QMessageBox.StandardButton.Yes:
            self.workbook = Workbook()
            self.current_file_path = None
            self.tab_widget.clear()
            self.add_new_sheet("Лист1")
            self.update_window_title()
            self.status_bar.showMessage("Создан новый файл")

    def open_file(self):
        """Открытие файла"""
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "Открыть файл",
            "",
            "Excel файлы (*.xlsx *.xls);;CSV файлы (*.csv);;Все файлы (*.*)"
        )

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
        file_path, _ = QFileDialog.getSaveFileName(
            self,
            "Сохранить как",
            "",
            "Excel файлы (*.xlsx);;CSV файлы (*.csv);;JSON файлы (*.json)"
        )

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
        file_path, _ = QFileDialog.getSaveFileName(
            self,
            "Экспорт в Excel",
            "",
            "Excel файлы (*.xlsx)"
        )

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

        file_path, _ = QFileDialog.getSaveFileName(
            self,
            "Экспорт в CSV",
            "",
            "CSV файлы (*.csv)"
        )

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

    # ============ ИНСТРУМЕНТЫ ============

    def create_chart(self):
        """Создание диаграммы"""
        from src.ui.dialogs.chart_wizard import ChartWizard

        spreadsheet = self.get_current_spreadsheet()
        if spreadsheet:
            dialog = ChartWizard(spreadsheet.get_dataframe(), self)
            if dialog.exec() == QDialog.DialogCode.Accepted:
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
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
            )

            if reply == QMessageBox.StandardButton.Yes:
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

    def closeEvent(self, event):
        """Обработка закрытия окна"""
        # Сохранение настроек
        if self.current_file_path:
            self.settings.setValue("last_file", self.current_file_path)

        # Проверка несохраненных изменений
        if self.workbook.is_modified():
            reply = QMessageBox.question(
                self, "Сохранение",
                "Есть несохраненные изменения. Сохранить?",
                QMessageBox.StandardButton.Yes |
                QMessageBox.StandardButton.No |
                QMessageBox.StandardButton.Cancel
            )

            if reply == QMessageBox.StandardButton.Yes:
                self.save_file()
                event.accept()
            elif reply == QMessageBox.StandardButton.No:
                event.accept()
            else:
                event.ignore()
        else:
            event.accept()