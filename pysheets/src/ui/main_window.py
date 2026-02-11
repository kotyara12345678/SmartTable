"""
Главное окно приложения SmartTable (без боковой панели)
"""

import json
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Optional

from PyQt5.QtWidgets import (QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
                             QTabWidget, QStatusBar, QMenuBar, QMessageBox,
                             QFileDialog, QSplitter, QToolBar, QDialog, QAction,
                             QApplication, QMenu, QInputDialog, QPushButton, QShortcut)
from PyQt5.QtCore import Qt, QTimer, QSize, QSettings
from PyQt5.QtGui import QKeySequence, QIcon, QColor, QPixmap, QPainter, QBrush, QKeyEvent

from pysheets.src.core import Workbook
from pysheets.src.io import ExcelImporter, ExcelExporter
from pysheets.src.io.odt_export import ODTExporter
from pysheets.src.io.print_handler import TablePrinter
from pysheets.src.io.json_export import JSONExporter
from pysheets.src.io.html_export import HTMLExporter
from pysheets.src.io.xml_export import XMLExporter
from pysheets.src.io.markdown_export import MarkdownExporter
from pysheets.src.io.sql_export import SQLExporter
from pysheets.src.io.text_export import TextExporter
from pysheets.src.ui.formula_bar import FormulaBar
from pysheets.src.ui.spreadsheet_widget import SpreadsheetWidget
from pysheets.src.ui.toolbar import MainToolBar, FormatToolBar, FunctionsToolBar
from pysheets.src.utils import show_error_message, show_info_message


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

        # Загружаем сохраненную тему
        saved_theme = self.settings.value("theme")
        saved_color = self.settings.value("theme_color")
        saved_theme_mode = self.settings.value("theme_mode", "light")

        self.current_theme = saved_theme if saved_theme else "system"
        self.current_theme_mode = saved_theme_mode  # Загружаем сохраненный режим
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
        self.menu_bar = None
        self.ai_chat_widget = None

        # Инициализация UI (внутри вызывается setup_shortcuts)
        self.init_ui()

        # Загрузка последней сессии
        self.load_last_session()

    # ============ Undo/Redo and Clipboard ============
    def add_to_undo_stack(self, row, col, value):
        """Добавляет действие в стек отмены"""
        self.undo_stack.append((row, col, value))
        self.redo_stack.clear()

    def undo(self):
        """Отмена последнего действия"""
        if not self.undo_stack:
            self.status_bar.showMessage("Нет действий для отмены")
            return
        row, col, value = self.undo_stack.pop()
        spreadsheet = self.get_current_spreadsheet()
        if spreadsheet:
            prev_value = spreadsheet.item(row, col).text() if spreadsheet.item(row, col) else ""
            spreadsheet.set_cell_value(row, col, prev_value)
            self.redo_stack.append((row, col, value))
            self.status_bar.showMessage(f"Отмена: ({row+1},{col+1})")

    def redo(self):
        """Повтор последнего отмененного действия"""
        if not self.redo_stack:
            self.status_bar.showMessage("Нет действий для повтора")
            return
        row, col, value = self.redo_stack.pop()
        spreadsheet = self.get_current_spreadsheet()
        if spreadsheet:
            spreadsheet.set_cell_value(row, col, value)
            self.undo_stack.append((row, col, value))
            self.status_bar.showMessage(f"Повтор: ({row+1},{col+1})")

    def cut(self):
        """Вырезать выделение"""
        spreadsheet = self.get_current_spreadsheet()
        if spreadsheet:
            spreadsheet.cut_selection()
            self.status_bar.showMessage("Вырезано")

    def copy(self):
        """Копировать выделение"""
        spreadsheet = self.get_current_spreadsheet()
        if spreadsheet:
            spreadsheet.copy_selection()
            self.status_bar.showMessage("Скопировано")

    def paste(self):
        """Вставить из буфера"""
        spreadsheet = self.get_current_spreadsheet()
        if spreadsheet:
            spreadsheet.paste_selection()
            self.status_bar.showMessage("Вставлено")

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

        self.setup_shortcuts()

        # Панель формул
        self.formula_bar = FormulaBar()
        main_layout.addWidget(self.formula_bar)

        # Основная рабочая область
        main_area = QWidget()
        main_area_layout = QHBoxLayout(main_area)
        main_area_layout.setContentsMargins(0, 0, 0, 0)

        # Виджет вкладок (теперь занимает всю ширину слева)
        self.tab_widget = QTabWidget()
        self.tab_widget.setTabsClosable(True)
        self.tab_widget.tabCloseRequested.connect(self.close_tab)
        self.tab_widget.currentChanged.connect(self.tab_changed)
        # Контекстное меню для вкладок (правый клик)
        self.tab_widget.tabBar().setContextMenuPolicy(Qt.CustomContextMenu)
        self.tab_widget.tabBar().customContextMenuRequested.connect(self.show_tab_context_menu)

        # Добавляем первую вкладку
        self.add_new_sheet("Лист1")

        # AI Chat панель справа (можно скрывать)
        from pysheets.src.ui.chat import AIChatWidget
        self.ai_chat_widget = AIChatWidget(self.current_theme, self.app_theme_color, main_window=self)
        self.ai_chat_widget.setMaximumWidth(350)
        self.ai_chat_widget.setMinimumWidth(300)
        self.ai_chat_widget.hide()

        # Создаем разделитель 
        # Создаем разделитель 
        splitter = QSplitter(Qt.Horizontal)
        splitter.addWidget(self.tab_widget)
        splitter.addWidget(self.ai_chat_widget)
        splitter.setCollapsible(1, True)

        # Начальные размеры (больше места для таблицы)
        splitter.setSizes([1200, 350])

        main_area_layout.addWidget(splitter)
        main_layout.addWidget(main_area, 1)

        # Строка состояния
        self.create_statusbar()

        # Применяем тему ПОСЛЕ полной инициализации UI
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

        export_odt_action = QAction("Экспорт в ODT...", self)
        export_odt_action.triggered.connect(self.export_to_odt)
        export_menu.addAction(export_odt_action)

        export_json_action = QAction("Экспорт в JSON...", self)
        export_json_action.triggered.connect(self.export_to_json)
        export_menu.addAction(export_json_action)

        export_html_action = QAction("Экспорт в HTML...", self)
        export_html_action.triggered.connect(self.export_to_html)
        export_menu.addAction(export_html_action)

        export_xml_action = QAction("Экспорт в XML...", self)
        export_xml_action.triggered.connect(self.export_to_xml)
        export_menu.addAction(export_xml_action)

        export_markdown_action = QAction("Экспорт в Markdown...", self)
        export_markdown_action.triggered.connect(self.export_to_markdown)
        export_menu.addAction(export_markdown_action)

        export_sql_action = QAction("Экспорт в SQL...", self)
        export_sql_action.triggered.connect(self.export_to_sql)
        export_menu.addAction(export_sql_action)

        export_text_action = QAction("Экспорт в текст (TXT)...", self)
        export_text_action.triggered.connect(self.export_to_text)
        export_menu.addAction(export_text_action)

        file_menu.addSeparator()

        print_action = QAction("Печать...", self)
        print_action.setShortcut(QKeySequence("Ctrl+P"))
        print_action.triggered.connect(self.print_table)
        file_menu.addAction(print_action)

        file_menu.addSeparator()

        # Меню "Настройки"
        settings_menu = file_menu.addMenu("⚙️ Настройки")

        theme_action = QAction("Настроить тему...", self)
        theme_action.triggered.connect(self.show_theme_settings)
        settings_menu.addAction(theme_action)

        gallery_action = QAction("Галерея тем...", self)
        gallery_action.triggered.connect(self.open_theme_gallery)
        settings_menu.addAction(gallery_action)

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

        # AI Chat переключение
        ai_chat_action = QAction("Показать/скрыть AI Чат", self)
        ai_chat_action.setShortcut(QKeySequence("Ctrl+I"))
        ai_chat_action.triggered.connect(self.open_ai_chat)
        view_menu.addAction(ai_chat_action)

        # Меню "Инструменты"
        tools_menu = self.menu_bar.addMenu("Инструменты")

        chart_action = QAction("Создать диаграмму...", self)
        chart_action.triggered.connect(self.create_chart)
        tools_menu.addAction(chart_action)

        sort_action = QAction("Сортировка...", self)
        sort_action.triggered.connect(self.open_sort_for_current)
        tools_menu.addAction(sort_action)

        templates_action = QAction("Галерея шаблонов...", self)
        templates_action.triggered.connect(self.open_templates_dialog)
        tools_menu.addAction(templates_action)
        
        manage_templates_action = QAction("Управление шаблонами...", self)
        manage_templates_action.triggered.connect(self.open_templates_manager)
        tools_menu.addAction(manage_templates_action)
        create_template_action = QAction("📋 Создать шаблон из выделения", self)
        create_template_action.triggered.connect(self.create_template_from_selection)
        tools_menu.addAction(create_template_action)

        sort_quick_action = QAction("Сортировка (текущий лист)", self)
        sort_quick_action.triggered.connect(self.open_sort_for_current)
        tools_menu.addAction(sort_quick_action)



    def open_templates_dialog(self):
        """Открыть галерею шаблонов"""
        try:
            from pysheets.src.ui.templates.templates.template_ui import TemplateGalleryDialog
        except Exception as e:
            show_error_message(self, f"Не удалось импортировать модуль шаблонов: {e}")
            return
        
        dialog = TemplateGalleryDialog(self)
        dialog.template_selected.connect(self.apply_template)
        dialog.exec_()


    def open_templates_manager(self):
        """Открыть менеджер шаблонов (удаление/переименование)"""
        try:
            from pysheets.src.ui.templates.templates.template_ui import TemplateManagerDialog
        except Exception as e:
            show_error_message(self, f"Не удалось импортировать менеджер шаблонов: {e}")
            return

        dialog = TemplateManagerDialog(self)
        dialog.exec_()
        dialog.exec_()

    def apply_template(self, template_name: str):
        """Применяет выбранный шаблон, создавая новую таблицу"""
        try:
            from pysheets.src.ui.templates.templates.template_manager import TemplateManager
            from pysheets.src.ui.templates.templates.template_applier import TemplateApplier
            
            # Загружаем менеджер и получаем шаблон
            template_manager = TemplateManager("templates", "user_templates")
            template = template_manager.get_template(template_name)
            
            if not template:
                show_error_message(self, f"Шаблон '{template_name}' не найден")
                return
            
            # Создаем новый документ с структурой из шаблона
            self.new_file()
            
            # Получаем активную таблицу
            spreadsheet = self.get_current_spreadsheet()
            if not spreadsheet:
                show_error_message(self, "Не удалось создать новую таблицу")
                return
            
            # Применяем структуру шаблона
            template_data = TemplateApplier.apply_template_structure(template, max_rows=50)
            
            # Заполняем заголовки
            headers = template_data['headers']
            for col_idx, header in enumerate(headers):
                try:
                    spreadsheet.set_cell_value(0, col_idx, header)
                except:
                    pass
            
            # Показываем информацию о созданной таблице
            info_msg = f"✓ Таблица создана из шаблона '{template_name}'\n"
            info_msg += f"Колонки: {', '.join(headers)}\n"
            info_msg += f"Создано {len(headers)} полей"
            
            QMessageBox.information(self, "Шаблон применен", info_msg)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            show_error_message(self, f"Ошибка при применении шаблона: {e}")

    def create_template_from_selection(self):
        """Создает шаблон из выделенных колонок"""
        try:
            spreadsheet = self.get_current_spreadsheet()
            if not spreadsheet:
                show_error_message(self, "Нет активного листа")
                return
            
            # Получаем диапазон выделения (если есть) и собираем данные
            selected_ranges = spreadsheet.selectedRanges()
            data = []
            if selected_ranges:
                # Берем первый выделенный диапазон
                range_obj = selected_ranges[0]
                start_col = range_obj.leftColumn()
                end_col = range_obj.rightColumn()

                # Собираем данные из выделённых колонок
                for row_idx in range(spreadsheet.rowCount()):
                    row_data = []
                    for col_idx in range(start_col, end_col + 1):
                        item = spreadsheet.item(row_idx, col_idx)
                        row_data.append(item.text() if item else "")
                    if any(row_data):  # Добавляем только не-пустые строки
                        data.append(row_data)
            else:
                # Нет выделения — открываем диалог с пустыми данными, пользователь может заполнить поля вручную
                data = []
            
            # Открываем диалог создания шаблона
            try:
                from pysheets.src.ui.templates.templates.template_ui import TemplateBuilderDialog
            except Exception as e:
                show_error_message(self, f"Не удалось импортировать TemplateBuilderDialog: {e}")
                return
            
            dialog = TemplateBuilderDialog(self, data=data)
            if dialog.exec_() == QDialog.Accepted:
                show_info_message(self, "✓ Шаблон успешно создан и сохранен!")
        
        except Exception as e:
            import traceback
            traceback.print_exc()
            show_error_message(self, f"Ошибка при создании шаблона: {e}")

    def open_sort_for_current(self):
        """Открывает диалог сортировки для текущего листа"""
        spreadsheet = self.get_current_spreadsheet()
        if not spreadsheet:
            show_error_message(self, "Нет активного листа для сортировки")
            return
        try:
            spreadsheet.open_sort_dialog()
        except AttributeError:
            show_error_message(self, "Данный лист не поддерживает сортировку")

    def create_toolbars(self):
        """Создание панелей инструментов"""
        self.main_toolbar = MainToolBar()
        self.main_toolbar.new_file_triggered.connect(self.new_file)
        self.main_toolbar.open_file_triggered.connect(self.open_file)
        self.main_toolbar.save_file_triggered.connect(self.save_file)
        self.main_toolbar.export_excel_triggered.connect(self.export_to_excel)
        self.main_toolbar.print_triggered.connect(self.print_table)
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

    # ============ Масштаб (Zoom) ============
    def zoom_in(self):
        """Увеличить масштаб текущей таблицы"""
        spreadsheet = self.get_current_spreadsheet()
        if spreadsheet:
            spreadsheet.zoom_in()
            try:
                self.main_toolbar.zoom_combo.setCurrentText(f"{spreadsheet.zoom_level}%")
            except Exception:
                pass

    def zoom_out(self):
        """Уменьшить масштаб текущей таблицы"""
        spreadsheet = self.get_current_spreadsheet()
        if spreadsheet:
            spreadsheet.zoom_out()
            try:
                self.main_toolbar.zoom_combo.setCurrentText(f"{spreadsheet.zoom_level}%")
            except Exception:
                pass

    def zoom_combo_changed(self, value: str):
        """Обработчик изменения комбобокса масштаба"""
        if not isinstance(value, str) or not value.endswith('%'):
            return
        try:
            level = int(value.rstrip('%'))
        except ValueError:
            return
        spreadsheet = self.get_current_spreadsheet()
        if spreadsheet:
            spreadsheet.zoom_level = max(50, min(200, level))
            spreadsheet.apply_zoom()

    def create_chart(self):
        """Создать диаграмму на основе выделенных данных"""
        from pysheets.src.ui.dialogs.chart_wizard import ChartWizardDialog

        spreadsheet = self.get_current_spreadsheet()
        if not spreadsheet:
            show_error_message(self, "Откройте лист и выделите данные для построения диаграммы")
            return

        ranges = spreadsheet.selectedRanges()
        if not ranges:
            show_error_message(self, "Выделите диапазон данных для диаграммы")
            return

        sel = ranges[0]
        top, bottom = sel.topRow(), sel.bottomRow()
        left, right = sel.leftColumn(), sel.rightColumn()

        df = spreadsheet.get_dataframe()
        try:
            sub_df = df.iloc[top:bottom+1, left:right+1]
        except Exception:
            show_error_message(self, "Не удалось получить данные для выделенного диапазона")
            return

        dlg = ChartWizardDialog(self)
        if dlg.exec_() != QDialog.Accepted:
            return

        chart_type = dlg.get_chart_type()
        opts = dlg.get_options()

        try:
            import matplotlib
            matplotlib.use('Qt5Agg')
            from matplotlib.figure import Figure
            from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
        except Exception:
            show_error_message(self, "Для отображения диаграмм необходимо установить matplotlib\nУстановите: pip install matplotlib")
            return

        plot_df = sub_df.copy()
        for col in plot_df.columns:
            plot_df[col] = pd.to_numeric(plot_df[col], errors='coerce')

        chart_dialog = QDialog(self)
        chart_dialog.setWindowTitle(f"Диаграмма - {chart_type}")
        chart_dialog.setMinimumSize(600, 400)
        layout = QVBoxLayout(chart_dialog)

        fig = Figure(figsize=(6, 4))
        canvas = FigureCanvas(fig)
        ax = fig.add_subplot(111)

        if "Столбчатая" in chart_type:
            if plot_df.shape[1] == 1:
                vals = plot_df.iloc[:, 0].dropna()
                ax.bar(range(len(vals)), vals.values)
            else:
                x = range(plot_df.shape[0])
                for col in plot_df.columns:
                    vals = plot_df[col].fillna(0).values
                    ax.bar(x, vals, label=str(col), alpha=0.7)
        elif "Линейный" in chart_type or "Сглаженная" in chart_type:
            x = range(plot_df.shape[0])
            for col in plot_df.columns:
                vals = plot_df[col].fillna(np.nan).values
                ax.plot(x, vals, label=str(col))
            if opts.get('smooth') and plot_df.shape[0] >= 3:
                for col in plot_df.columns:
                    vals = pd.to_numeric(plot_df[col], errors='coerce').dropna()
                    if len(vals) >= 3:
                        sm = vals.rolling(window=3, min_periods=1).mean()
                        ax.plot(range(len(vals)), sm.values, linestyle='--')
        elif "Круговая" in chart_type:
            row = plot_df.iloc[0].fillna(0)
            ax.pie(row.values, labels=[str(c) for c in row.index], autopct='%1.1f%%')
        elif "Площадная" in chart_type:
            x = range(plot_df.shape[0])
            for col in plot_df.columns:
                vals = plot_df[col].fillna(0).values
                ax.fill_between(x, vals, step='pre', alpha=0.5)
        else:
            x = range(plot_df.shape[0])
            for col in plot_df.columns:
                vals = plot_df[col].fillna(np.nan).values
                ax.plot(x, vals, label=str(col))

        if opts.get('legend'):
            ax.legend()

        ax.set_title(chart_type)
        ax.grid(True)

        layout.addWidget(canvas)

        btn_layout = QHBoxLayout()
        save_btn = QPushButton("Сохранить как PNG")
        close_btn = QPushButton("Закрыть")
        btn_layout.addStretch()
        btn_layout.addWidget(save_btn)
        btn_layout.addWidget(close_btn)
        layout.addLayout(btn_layout)

        def on_save():
            from PyQt5.QtWidgets import QFileDialog
            path, _ = QFileDialog.getSaveFileName(self, "Сохранить диаграмму", "chart.png", "PNG Files (*.png);;All Files (*)")
            if path:
                fig.savefig(path)
        save_btn.clicked.connect(on_save)
        close_btn.clicked.connect(chart_dialog.accept)

        chart_dialog.exec_()

    def add_new_sheet(self, name: str):
        """Добавление нового листа"""
        print(f"[MAIN] add_new_sheet: {name}")
        spreadsheet = SpreadsheetWidget()
        spreadsheet.cell_selected.connect(self.on_cell_selected)
        spreadsheet.data_changed.connect(self.on_data_changed)
        self._install_shortcuts_on_spreadsheet(spreadsheet)

        index = self.tab_widget.addTab(spreadsheet, name)
        self.tab_widget.setCurrentIndex(index)
        self.workbook.add_sheet(name)
        print(f"[MAIN] add_new_sheet: добавлена вкладка, теперь всего {self.tab_widget.count()}")

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

    # ============ Вкладки и сессии ============
    def close_tab(self, index: int):
        """Закрывает вкладку по индексу и удаляет соответствующий лист в модели"""
        if index < 0:
            return
        removed = self.workbook.remove_sheet(index)
        if removed:
            self.tab_widget.removeTab(index)
            self.update_window_title()
        else:
            self.status_bar.showMessage("Нельзя удалить последний лист")

    def tab_changed(self, index: int):
        """Обработка смены активной вкладки"""
        if index < 0:
            return
        self.workbook.set_active_sheet(index)
        self.update_window_title()

    def show_tab_context_menu(self, pos):
        """Контекстное меню для вкладок"""
        tab_bar = self.tab_widget.tabBar()
        index = tab_bar.tabAt(pos)
        if index < 0:
            return
        menu = QMenu()

        def make_action(text, handler):
            act = QAction(text, self)
            act.triggered.connect(handler)
            return act

        def rename():
            old_name = self.tab_widget.tabText(index)
            new_name, ok = QInputDialog.getText(self, "Переименование вкладки", "Новое имя:", text=old_name)
            if ok and new_name and new_name != old_name:
                if self.workbook.rename_sheet(index, new_name):
                    self.tab_widget.setTabText(index, new_name)

        def duplicate():
            source_widget = self.tab_widget.widget(index)
            if not isinstance(source_widget, SpreadsheetWidget):
                return
            df = source_widget.get_dataframe()
            new_name = f"{self.tab_widget.tabText(index)} (копия)"
            self.workbook.add_sheet_from_dataframe(df, new_name)
            new_sheet = SpreadsheetWidget()
            new_sheet.cell_selected.connect(self.on_cell_selected)
            new_sheet.data_changed.connect(self.on_data_changed)
            self._install_shortcuts_on_spreadsheet(new_sheet)
            new_sheet.load_data(df.values.tolist())
            new_index = self.tab_widget.addTab(new_sheet, new_name)
            self.tab_widget.setCurrentIndex(new_index)

        def close_here():
            self.close_tab(index)

        def new_here():
            self.add_new_sheet("Новый лист")

        menu.addAction(make_action("Переименовать", rename))
        menu.addAction(make_action("Дублировать", duplicate))
        menu.addAction(make_action("Закрыть", close_here))
        menu.addSeparator()
        menu.addAction(make_action("Новый лист", new_here))

        menu.exec_(tab_bar.mapToGlobal(pos))

    def update_window_title(self, modified: bool = False):
        """Обновляет заголовок окна"""
        base = "SmartTable"
        if self.current_file_path:
            name = Path(self.current_file_path).name
            title = f"{base} - {name}"
        else:
            title = f"{base} - Новый документ"
        if modified or self.workbook.is_modified():
            title += " *"
        self.setWindowTitle(title)

    def setup_shortcuts(self):
        """Горячие клавиши через глобальный event filter — ловит нажатия в любом месте,
        включая таблицу (QShortcut там не срабатывает из‑за перехвата событий)."""
        self._shortcut_bindings = [
            ("Ctrl+N", self.new_file),
            ("Ctrl+O", self.open_file),
            ("Ctrl+S", self.save_file),
            ("Ctrl+Shift+S", self.save_as),
            ("Ctrl+P", self.print_table),
            ("Ctrl+Z", self.undo),
            ("Ctrl+Y", self.redo),
            ("Ctrl+X", self.cut),
            ("Ctrl+C", self.copy),
            ("Ctrl+V", self.paste),
            ("Ctrl+=", self.zoom_in),
            ("Ctrl++", self.zoom_in),
            ("Ctrl+-", self.zoom_out),
            ("Ctrl+0", lambda: self.main_toolbar.zoom_combo.setCurrentText("100%")),
            ("Ctrl+I", self.open_ai_chat),
        ]
        app = QApplication.instance()
        app.installEventFilter(self)

    def eventFilter(self, obj, event):
        """Перехват клавиш на уровне приложения — чтобы работали при фокусе на таблице."""
        if event.type() == event.Type.KeyPress:
            try:
                # Проверяем конкретные комбинации через event.key() и event.modifiers()
                modifiers = event.modifiers()
                key = event.key()
                is_ctrl = modifiers & Qt.ControlModifier
                is_shift = modifiers & Qt.ShiftModifier
                
                # Специальная обработка для Ctrl+O и Ctrl+P (часто перехватываются виджетами)
                if is_ctrl and not is_shift:
                    if key == Qt.Key_O:
                        self.open_file()
                        return True
                    elif key == Qt.Key_P:
                        self.print_table()
                        return True
                
                # Общая обработка через QKeySequence
                key_seq = QKeySequence(int(event.modifiers()) | int(event.key()))
                pressed = key_seq.toString(QKeySequence.NativeText)
                pressed_norm = pressed.replace(' ', '').lower()
                
                for keys, slot in self._shortcut_bindings:
                    keys_norm = keys.replace(' ', '').lower()
                    
                    # Сравниваем точно и нормализованно
                    if (pressed == keys or 
                        pressed_norm == keys_norm or
                        (keys in ('Ctrl++', 'Ctrl+=') and pressed in ('Ctrl++', 'Ctrl+=', 'Ctrl+Shift++')) or
                        (keys in ('Ctrl++', 'Ctrl+=') and pressed_norm in ('ctrl++', 'ctrl+=', 'ctrl+shift++'))):
                        try:
                            slot()
                            return True  # событие обработано
                        except Exception as e:
                            print(f"[ERROR] При выполнении {keys}: {e}")
                            return False
            except Exception as e:
                print(f"[ERROR] eventFilter: {e}")
                return False
                
        return super().eventFilter(obj, event)

    def _install_shortcuts_on_spreadsheet(self, spreadsheet):
        """Заглушка — shortcuts теперь через eventFilter, но вызываем для совместимости."""
        pass

    def load_last_session(self):
        """Загружает последний файл"""
        last = self.settings.value("last_file")
        if last:
            try:
                p = Path(last)
                if p.exists():
                    if str(last).endswith(('.xlsx', '.xls')):
                        importer = ExcelImporter()
                        workbook = importer.import_excel(last)
                        self.workbook = workbook
                        self.tab_widget.clear()
                        for sheet_name in workbook.sheet_names:
                            spreadsheet = SpreadsheetWidget()
                            spreadsheet.cell_selected.connect(self.on_cell_selected)
                            spreadsheet.data_changed.connect(self.on_data_changed)
                            self._install_shortcuts_on_spreadsheet(spreadsheet)
                            spreadsheet.load_data(workbook.get_sheet_data(sheet_name))
                            self.tab_widget.addTab(spreadsheet, sheet_name)
                        self.update_window_title()
            except Exception:
                pass

    # ============ ОБРАБОТЧИКИ СОБЫТИЙ ============

    def on_cell_selected(self, row: int, col: int, value: str):
        """Обработка выбора ячейки"""
        cell_ref = f"{chr(65 + col)}{row + 1}"
        self.formula_bar.set_cell_reference(cell_ref)
        self.formula_bar.set_formula(value)

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
        current_sheet = self.tab_widget.currentIndex()
        self.workbook.set_cell_value(current_sheet, row, col, value)
        self.add_to_undo_stack(row, col, value)
        self.update_window_title(modified=True)

    def on_formula_entered(self, formula: str):
        """Обработка ввода формулы"""
        spreadsheet = self.get_current_spreadsheet()
        if spreadsheet:
            spreadsheet.set_current_cell_formula(formula)

    def on_function_selected(self, function: str):
        """Обработка выбора функции"""
        print(f"[DEBUG_FUNC] Функция выбрана: {function}")
        spreadsheet = self.get_current_spreadsheet()
        if not spreadsheet:
            print(f"[ERROR] Нет открытой таблицы!")
            self.status_bar.showMessage("Ошибка: нет открытой таблицы")
            return
        
        if not function or function == "Функции...":
            return

        current_row = spreadsheet.currentRow()
        current_col = spreadsheet.currentColumn()
        print(f"[DEBUG_FUNC] Текущая ячейка: ({current_row}, {current_col})")
        
        # Пытаемся получить выделённый диапазон
        selected_range = spreadsheet.get_selection_range()
        print(f"[DEBUG_FUNC] Выделённый диапазон: {selected_range}")

        current_cell_ref = f"{chr(65 + current_col)}{current_row + 1}"

        if selected_range and selected_range != current_cell_ref:
            # Если выделен диапазон (не просто одна ячейка) - используем его
            formula = f"={function}({selected_range})"
            print(f"[DEBUG_FUNC] Вставляю формулу с диапазоном: {formula}")
        else:
            # Если нет выделения - показываем ошибку
            self.status_bar.showMessage(f"Выберите диапазон ячеек перед использованием функции {function}")
            return

        # Вставляем в текущую ячейку
        spreadsheet.set_cell_value(current_row, current_col, formula)

        self.formula_bar.set_cell_reference(current_cell_ref)
        self.formula_bar.set_formula(formula)

        spreadsheet.setCurrentCell(current_row, current_col)
        self.status_bar.showMessage(f"Добавлена функция: {function}")


    def on_format_selected(self, format_type: str):
        """Обработка выбора формата"""
        spreadsheet = self.get_current_spreadsheet()
        if not spreadsheet:
            return

        spreadsheet.apply_format('number_format', format_type)
        self.status_bar.showMessage(f"Применён формат: {format_type}")

    def apply_format(self, format_type: str, value=None):
        spreadsheet = self.get_current_spreadsheet()
        if not spreadsheet:
            self.status_bar.showMessage("Нет активного листа для применения формата")
            return

        try:
            spreadsheet.apply_format(format_type, value)
            if format_type in ('bold', 'italic', 'underline', 'strike'):
                self.status_bar.showMessage(f"Применён стиль: {format_type}")
            elif format_type in ('font', 'font_size') and value is not None:
                self.status_bar.showMessage(f"Применён формат: {format_type} = {value}")
            elif format_type in ('text_color', 'bg_color') and value is None:
                self.status_bar.showMessage("Цвет изменён")
            else:
                self.status_bar.showMessage(f"Применён формат: {format_type}")
        except Exception as e:
            show_error_message(self, f"Ошибка при применении формата: {str(e)}")

    # ============ ФУНКЦИИ ФАЙЛОВ ============

    def new_file(self):
        """Создание нового листа"""
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
                    df = pd.read_csv(file_path)
                    workbook = Workbook()
                    workbook.add_sheet_from_dataframe(df, "Лист1")
                else:
                    raise ValueError("Неподдерживаемый формат файла")

                self.workbook = workbook
                self.current_file_path = file_path

                self.tab_widget.clear()
                for sheet_name in workbook.sheet_names:
                    spreadsheet = SpreadsheetWidget()
                    spreadsheet.cell_selected.connect(self.on_cell_selected)
                    spreadsheet.data_changed.connect(self.on_data_changed)
                    self._install_shortcuts_on_spreadsheet(spreadsheet)
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
                current_sheet = self.tab_widget.currentIndex()
                if current_sheet >= 0:
                    spreadsheet = self.tab_widget.widget(current_sheet)
                    df = spreadsheet.get_dataframe()
                    df.to_csv(file_path, index=False, encoding='utf-8')
            elif file_path.endswith('.json'):
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
            if not file_path.lower().endswith('.xlsx'):
                file_path += '.xlsx'
            if not self.workbook.sheets or all(sheet.rows == 0 or sheet.columns == 0 for sheet in self.workbook.sheets):
                show_error_message(self, "Нет данных для экспорта!")
                return
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
            if not file_path.lower().endswith('.csv'):
                file_path += '.csv'
            try:
                df = spreadsheet.get_dataframe()
                df.to_csv(file_path, index=False, encoding='utf-8')
                self.status_bar.showMessage(f"Экспорт завершен: {Path(file_path).name}")
            except Exception as e:
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
            if not file_path.lower().endswith('.pdf'):
                file_path += '.pdf'
            try:
                from reportlab.lib.pagesizes import letter, A4
                from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
                from reportlab.lib import colors

                df = spreadsheet.get_dataframe()

                doc = SimpleDocTemplate(file_path, pagesize=A4)
                elements = []

                data = [df.columns.tolist()] + df.values.tolist()

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
                show_error_message(self, "Ошибка: необходимо установить reportlab\nУстановите: pip install reportlab")
            except Exception as e:
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
            if not file_path.lower().endswith('.png'):
                file_path += '.png'
            try:
                table = spreadsheet
                width = table.width()
                height = table.height()

                pixmap = QPixmap(width, height)
                pixmap.fill()

                painter = QPainter(pixmap)
                table.render(painter)
                painter.end()

                pixmap.save(file_path, "PNG")

                self.status_bar.showMessage(f"Экспорт в PNG завершен: {Path(file_path).name}")
            except Exception as e:
                show_error_message(self, f"Ошибка при экспорте в PNG: {str(e)}")

    def export_to_odt(self):
        """Экспорт в ODT"""
        spreadsheet = self.get_current_spreadsheet()
        if not spreadsheet:
            return

        dlg = QFileDialog(self, "Экспорт в ODT")
        dlg.setAcceptMode(QFileDialog.AcceptSave)
        dlg.setNameFilter("ODT файлы (*.odt)")
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
            if not file_path.lower().endswith('.odt'):
                file_path += '.odt'
            try:
                exporter = ODTExporter(spreadsheet, file_path)
                success = exporter.export()
                if success:
                    self.status_bar.showMessage(f"Экспорт в ODT завершен: {Path(file_path).name}")
                else:
                    show_error_message(self, "Не удалось экспортировать таблицу в ODT")
            except ImportError:
                show_error_message(self, "Ошибка: необходимо установить odfpy\nУстановите: pip install odfpy")
            except Exception as e:
                show_error_message(self, f"Ошибка при экспорте в ODT: {str(e)}")

    def export_to_json(self):
        """Экспорт в JSON"""
        spreadsheet = self.get_current_spreadsheet()
        if not spreadsheet:
            return

        dlg = QFileDialog(self, "Экспорт в JSON")
        dlg.setAcceptMode(QFileDialog.AcceptSave)
        dlg.setNameFilter("JSON файлы (*.json)")
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
            if not file_path.lower().endswith('.json'):
                file_path += '.json'
            try:
                exporter = JSONExporter(spreadsheet, file_path)
                success = exporter.export()
                if success:
                    self.status_bar.showMessage(f"Экспорт в JSON завершен: {Path(file_path).name}")
                else:
                    show_error_message(self, "Не удалось экспортировать таблицу в JSON")
            except Exception as e:
                show_error_message(self, f"Ошибка при экспорте в JSON: {str(e)}")

    def export_to_html(self):
        """Экспорт в HTML"""
        spreadsheet = self.get_current_spreadsheet()
        if not spreadsheet:
            return

        dlg = QFileDialog(self, "Экспорт в HTML")
        dlg.setAcceptMode(QFileDialog.AcceptSave)
        dlg.setNameFilter("HTML файлы (*.html)")
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
            if not file_path.lower().endswith('.html'):
                file_path += '.html'
            try:
                exporter = HTMLExporter(spreadsheet, file_path)
                success = exporter.export()
                if success:
                    self.status_bar.showMessage(f"Экспорт в HTML завершен: {Path(file_path).name}")
                else:
                    show_error_message(self, "Не удалось экспортировать таблицу в HTML")
            except Exception as e:
                show_error_message(self, f"Ошибка при экспорте в HTML: {str(e)}")

    def export_to_xml(self):
        """Экспорт в XML"""
        spreadsheet = self.get_current_spreadsheet()
        if not spreadsheet:
            return

        dlg = QFileDialog(self, "Экспорт в XML")
        dlg.setAcceptMode(QFileDialog.AcceptSave)
        dlg.setNameFilter("XML файлы (*.xml)")
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
            if not file_path.lower().endswith('.xml'):
                file_path += '.xml'
            try:
                exporter = XMLExporter(spreadsheet, file_path)
                success = exporter.export()
                if success:
                    self.status_bar.showMessage(f"Экспорт в XML завершен: {Path(file_path).name}")
                else:
                    show_error_message(self, "Не удалось экспортировать таблицу в XML")
            except Exception as e:
                show_error_message(self, f"Ошибка при экспорте в XML: {str(e)}")

    def export_to_markdown(self):
        """Экспорт в Markdown"""
        spreadsheet = self.get_current_spreadsheet()
        if not spreadsheet:
            return

        dlg = QFileDialog(self, "Экспорт в Markdown")
        dlg.setAcceptMode(QFileDialog.AcceptSave)
        dlg.setNameFilter("Markdown файлы (*.md)")
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
            if not file_path.lower().endswith('.md'):
                file_path += '.md'
            try:
                exporter = MarkdownExporter(spreadsheet, file_path)
                success = exporter.export()
                if success:
                    self.status_bar.showMessage(f"Экспорт в Markdown завершен: {Path(file_path).name}")
                else:
                    show_error_message(self, "Не удалось экспортировать таблицу в Markdown")
            except Exception as e:
                show_error_message(self, f"Ошибка при экспорте в Markdown: {str(e)}")

    def export_to_sql(self):
        """Экспорт в SQL"""
        spreadsheet = self.get_current_spreadsheet()
        if not spreadsheet:
            return

        dlg = QFileDialog(self, "Экспорт в SQL")
        dlg.setAcceptMode(QFileDialog.AcceptSave)
        dlg.setNameFilter("SQL файлы (*.sql)")
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
            if not file_path.lower().endswith('.sql'):
                file_path += '.sql'
            try:
                exporter = SQLExporter(spreadsheet, file_path)
                success = exporter.export()
                if success:
                    self.status_bar.showMessage(f"Экспорт в SQL завершен: {Path(file_path).name}")
                else:
                    show_error_message(self, "Не удалось экспортировать таблицу в SQL")
            except Exception as e:
                show_error_message(self, f"Ошибка при экспорте в SQL: {str(e)}")

    def export_to_text(self):
        """Экспорт в текст"""
        spreadsheet = self.get_current_spreadsheet()
        if not spreadsheet:
            return

        dlg = QFileDialog(self, "Экспорт в текст")
        dlg.setAcceptMode(QFileDialog.AcceptSave)
        dlg.setNameFilter("Текстовые файлы (*.txt)")
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
            if not file_path.lower().endswith('.txt'):
                file_path += '.txt'
            try:
                exporter = TextExporter(spreadsheet, file_path)
                success = exporter.export()
                if success:
                    self.status_bar.showMessage(f"Экспорт в текст завершен: {Path(file_path).name}")
                else:
                    show_error_message(self, "Не удалось экспортировать таблицу в текст")
            except Exception as e:
                show_error_message(self, f"Ошибка при экспорте в текст: {str(e)}")

    def print_table(self):
        """Печать таблицы"""
        spreadsheet = self.get_current_spreadsheet()
        if not spreadsheet:
            show_error_message(self, "Нет открытой таблицы для печати")
            return

        try:
            printer = TablePrinter(spreadsheet)
            printer.print_table(self)
            self.status_bar.showMessage("Печать завершена")
        except Exception as e:
            show_error_message(self, f"Ошибка при печати: {str(e)}")

    def apply_theme(self, theme_name, color):
        """Применяет тему приложению"""
        from pysheets.src.ui.themes import ThemeManager
        from PyQt5.QtWidgets import QApplication
        
        print(f"[MAIN apply_theme] Начало: theme={theme_name}, color={color.name() if color else None}")
        
        try:
            manager = ThemeManager()
            manager.current_theme = theme_name
            if color is not None:
                manager.app_theme_color = color
            
            # Если это галерея, передаём режим (light/dark)
            if theme_name == 'gallery' and hasattr(self, 'current_theme_mode'):
                manager.current_theme_mode = self.current_theme_mode
                print(f"[MAIN apply_theme] Передаю режим галереи: {self.current_theme_mode}")
            
            print(f"[MAIN apply_theme] Вызываю manager.apply_theme()")
            manager.apply_theme(theme_name, color)
            print(f"[MAIN apply_theme] manager.apply_theme() завершена")
            
            self.current_theme = theme_name
            if color is not None:
                self.app_theme_color = color

            # Получаем stylesheet из приложения
            app = QApplication.instance()
            if app:
                current_stylesheet = app.styleSheet()
                print(f"[MAIN apply_theme] Получили stylesheet, длина={len(current_stylesheet) if current_stylesheet else 0}")
                
                if current_stylesheet:
                    # Применяем к главному окну
                    print(f"[MAIN apply_theme] Применяю stylesheet к главному окну")
                    self.setStyleSheet(current_stylesheet)
                    
                    # Применяем ко всем вкладкам (SpreadsheetWidget)
                    print(f"[MAIN apply_theme] Обновляю {self.tab_widget.count()} вкладок")
                    for i in range(self.tab_widget.count()):
                        sheet = self.tab_widget.widget(i)
                        if sheet:
                            sheet.update()
                    
                    # Обновляем все виджеты
                    all_widgets = app.allWidgets()
                    print(f"[MAIN apply_theme] Обновляю {len(all_widgets)} виджетов")
                    for widget in all_widgets:
                        widget.style().unpolish(widget)
                        widget.style().polish(widget)
                        widget.repaint()
                    app.processEvents()
                    self.repaint()
                    print(f"[MAIN apply_theme] Все виджеты обновлены")

            if hasattr(self, 'ai_chat_widget'):
                # Для галереи передаём режим (light/dark)
                if theme_name == 'gallery' and hasattr(self, 'current_theme_mode'):
                    self.ai_chat_widget.update_theme(theme_name, color, self.current_theme_mode)
                else:
                    self.ai_chat_widget.update_theme(theme_name, color)

            self.settings.setValue("theme", theme_name)
            if color is not None:
                self.settings.setValue("theme_color", color.name())
            # Сохраняем theme_mode (для обычных тем это 'light' или 'dark')
            if theme_name in ['light', 'dark', 'system']:
                self.current_theme_mode = theme_name
                self.settings.setValue("theme_mode", theme_name)
            elif theme_name == 'gallery' and hasattr(self, 'current_theme_mode'):
                self.settings.setValue("theme_mode", self.current_theme_mode)
            
            print(f"[MAIN apply_theme] Завершено для {theme_name}")
            
        except Exception as e:
            import traceback
            print(f"[ERROR apply_theme] {e}")
            traceback.print_exc()

    def show_theme_settings(self):
        """Показывает встроенное окно настроек темы в углу главного окна"""
        from pysheets.src.ui.themes import EmbeddedSettingsPanel
        
        # Если уже есть открытая панель - закрываем её
        if hasattr(self, 'settings_panel') and self.settings_panel:
            self.settings_panel.close_panel()
        
        # Создаём новую панель
        self.settings_panel = EmbeddedSettingsPanel(self)
        
        # Подключаем сигналы
        self.settings_panel.settings_changed.connect(lambda s: self.apply_theme(s['theme'], s['color']))
        self.settings_panel.closed.connect(lambda: setattr(self, 'settings_panel', None))
        
        # Позиционируем панель в верхнем правом углу главного окна
        main_rect = self.geometry()
        panel_width = 320
        panel_height = 400
        
        # Выбираем позицию: если есть место справа - там, иначе слева
        if main_rect.width() > panel_width + 50:
            x = main_rect.x() + main_rect.width() - panel_width - 20
        else:
            x = main_rect.x() + 20
        
        y = main_rect.y() + 20
        
        self.settings_panel.move(x, y)
        self.settings_panel.show()
        self.settings_panel.raise_()
        self.settings_panel.setFocus()

    def apply_gallery_theme_full(self, theme_info):
        """Применяет полную тему из галереи"""
        try:
            print(f"[MAIN] apply_gallery_theme_full: тема {theme_info.get('id')}")
            
            # Получаем метаданные и категорию темы
            metadata = theme_info.get('metadata')
            category = metadata.category if metadata else 'custom'
            print(f"[MAIN] Категория темы: {category}")
            
            # Получаем данные темы
            theme_data = theme_info.get('data', {})
            
            if not theme_data:
                print(f"[ERROR] theme_data пуста!")
                return
            
            theme_colors = theme_data.get('theme', {})
            
            # Для ночных тем используем dark, для светлых - light
            if category == 'dark':
                base_theme = theme_colors.get('dark', {})
                base_mode = 'dark'
                print(f"[MAIN] Применяю НОЧНУЮ тему")
            else:
                base_theme = theme_colors.get('light', {})
                base_mode = 'light'
                print(f"[MAIN] Применяю СВЕТЛУЮ тему")
            
            primary_color = base_theme.get('primary', '#DC143C')
            print(f"[MAIN] primary_color: {primary_color}")
            
            color = QColor(primary_color)
            
            if color.isValid():
                print(f"[MAIN] Устанавливаем current_theme='gallery', color={primary_color}, mode={base_mode}")
                self.current_theme = 'gallery'
                self.current_theme_mode = base_mode  # 'light' или 'dark'
                self.app_theme_color = color
                
                # Сохраняем тему, цвет и режим
                self.settings.setValue("theme", self.current_theme)
                self.settings.setValue("theme_color", color.name())
                self.settings.setValue("theme_mode", base_mode)
                
                print(f"[MAIN] Вызываем apply_theme()")
                self.apply_theme(self.current_theme, self.app_theme_color)
                print(f"[MAIN] apply_theme() завершена")
            else:
                print(f"[ERROR] Цвет не валидный: {primary_color}")
        except Exception as e:
            import traceback
            print(f"[ERROR] {e}")
            traceback.print_exc()

    def _generate_stylesheet_from_theme(self, theme_colors: dict) -> str:
        """Генерирует стилевую таблицу на основе цветов темы"""
        primary = theme_colors.get('primary', '#DC143C')
        background = theme_colors.get('background', '#FFFFFF')
        surface = theme_colors.get('surface', '#FFFFFF')
        text_primary = theme_colors.get('text_primary', '#000000')
        text_secondary = theme_colors.get('text_secondary', '#666666')
        border = theme_colors.get('border', '#CCCCCC')
        
        stylesheet = f"""
        QMainWindow {{
            background-color: {background};
            color: {text_primary};
        }}
        
        QMenuBar {{
            background-color: {surface};
            color: {text_primary};
            border-bottom: 1px solid {border};
        }}
        
        QMenuBar::item:selected {{
            background-color: {primary};
        }}
        
        QMenu {{
            background-color: {surface};
            color: {text_primary};
            border: 1px solid {border};
        }}
        
        QMenu::item:selected {{
            background-color: {primary};
        }}
        
        QTabWidget {{
            background-color: {background};
        }}
        
        QTabBar::tab {{
            background-color: {surface};
            color: {text_primary};
            border: 1px solid {border};
        }}
        
        QTabBar::tab:selected {{
            background-color: {primary};
            color: white;
        }}
        
        QStatusBar {{
            background-color: {surface};
            color: {text_primary};
            border-top: 1px solid {border};
        }}
        
        QToolBar {{
            background-color: {surface};
            border-bottom: 1px solid {border};
        }}
        
        QPushButton {{
            background-color: {primary};
            color: white;
            border: none;
            border-radius: 4px;
            padding: 6px 12px;
        }}
        
        QPushButton:hover {{
            background-color: {theme_colors.get('primary_light', primary)};
        }}
        
        QPushButton:pressed {{
            background-color: {theme_colors.get('primary_dark', primary)};
        }}
        
        QLineEdit, QTextEdit {{
            background-color: {surface};
            color: {text_primary};
            border: 1px solid {border};
            border-radius: 4px;
            padding: 4px;
        }}
        
        QLineEdit:focus, QTextEdit:focus {{
            border: 2px solid {primary};
        }}
        
        QTableWidget {{
            background-color: {background};
            color: {text_primary};
            gridline-color: {border};
        }}
        
        QHeaderView::section {{
            background-color: {surface};
            color: {text_primary};
            border: 1px solid {border};
        }}
        """
        
        return stylesheet

    def open_theme_gallery(self):
        """Открывает галерею пользовательских тем внутри приложения"""
        try:
            from pysheets.src.ui.gallery import ThemeGalleryManager, ThemeGalleryWidget
            gallery_manager = ThemeGalleryManager()
            gallery = ThemeGalleryWidget(gallery_manager, self)
            
            # Диалог остается в границах главного окна
            gallery.setWindowModality(Qt.WindowModal)
            
            # Подключаем сигнал выбора темы
            def apply_gallery_theme(theme_info):
                """Применяет выбранную из галереи тему"""
                try:
                    print(f"[MAIN] apply_gallery_theme вызвана с темой {theme_info.get('id')}")
                    self.apply_gallery_theme_full(theme_info)
                    self.status_bar.showMessage(
                        f"Тема '{theme_info['metadata'].name}' успешно применена!"
                    )
                except Exception as e:
                    print(f"[ERROR] Ошибка при применении темы: {e}")
                    import traceback
                    traceback.print_exc()
            
            print(f"[MAIN] Подключаем сигнал gallery.theme_selected")
            gallery.theme_selected.connect(apply_gallery_theme)
            gallery.exec_()
            
            # Обновляем главное окно после закрытия галереи
            print(f"[MAIN] Галерея закрыта, обновляю главное окно")
            self.update()
            self.repaint()
            QApplication.instance().processEvents()
        except ImportError as e:
            QMessageBox.warning(
                self,
                "Ошибка",
                f"Не удалось открыть галерею тем: {str(e)}"
            )

    def closeEvent(self, event):
        """Обработка закрытия окна"""
        if self.current_file_path:
            self.settings.setValue("last_file", self.current_file_path)

        try:
            is_modified = self.workbook.is_modified()
        except Exception:
            is_modified = False

        if is_modified:
            result = self._show_save_dialog()

            if result == "save":
                try:
                    self.save_file()
                except Exception:
                    pass
                event.accept()
            elif result == "discard":
                event.accept()
            else:
                event.ignore()
        else:
            event.accept()

    def _show_save_dialog(self) -> str:
        """Показывает диалог сохранения"""
        from pysheets.src.ui.themes import ThemeManager

        actual_theme = self.current_theme
        if actual_theme == "system":
            manager = ThemeManager()
            actual_theme = manager._get_real_system_theme()

        dlg = QMessageBox(self)
        dlg.setWindowTitle("Сохранение")
        dlg.setText("Есть несохраненные изменения.")
        dlg.setInformativeText("Сохранить изменения перед закрытием?")
        dlg.setIcon(QMessageBox.Question)

        save_btn = dlg.addButton("Сохранить", QMessageBox.AcceptRole)
        discard_btn = dlg.addButton("Не сохранять", QMessageBox.DestructiveRole)
        cancel_btn = dlg.addButton("Отмена", QMessageBox.RejectRole)

        dlg.setDefaultButton(save_btn)

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

        dlg.exec_()

        clicked = dlg.clickedButton()
        if clicked == save_btn:
            return "save"
        elif clicked == discard_btn:
            return "discard"
        else:
            return "cancel"


