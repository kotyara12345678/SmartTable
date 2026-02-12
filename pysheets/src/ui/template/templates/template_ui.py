"""
UI компоненты для работы с шаблонами
"""

from PyQt5.QtWidgets import *
from PyQt5.QtCore import Qt, pyqtSignal
from PyQt5.QtGui import QFont
from pathlib import Path

from .template_manager import TemplateManager, ExportTemplate, TemplateField, DataPattern, CellRange
# Убираем LogicOperation из импорта, так как он не используется в UI


class TemplateBuilderDialog(QDialog):
    """Диалог создания шаблона из выделенных ячеек"""

    template_created = pyqtSignal(str)  # Сигнал с именем созданного шаблона

    def __init__(self, parent=None, data=None, selection_range=None):
        super().__init__(parent)
        self.template_manager = TemplateManager()
        self.data = data or []
        self.selection_range = selection_range

        self.init_ui()

    def init_ui(self):
        self.setWindowTitle("Создать шаблон из выделения")
        self.setMinimumWidth(600)

        # Устанавливаем фиксированный размер для диалога
        self.setFixedSize(800, 700)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(15, 15, 15, 15)
        layout.setSpacing(10)

        # Основная информация
        form_layout = QFormLayout()
        form_layout.setSpacing(8)

        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText("Введите название шаблона")
        self.name_input.setMinimumHeight(30)
        form_layout.addRow("Название шаблона:", self.name_input)

        self.description_input = QTextEdit()
        self.description_input.setMaximumHeight(60)
        self.description_input.setPlaceholderText("Описание шаблона...")
        form_layout.addRow("Описание:", self.description_input)

        layout.addLayout(form_layout)

        # Предпросмотр данных
        preview_label = QLabel("Предпросмотр данных:")
        preview_label.setStyleSheet("font-weight: bold; margin-top: 10px;")
        layout.addWidget(preview_label)

        self.preview_table = QTableWidget()
        self.preview_table.setMaximumHeight(200)
        self.preview_table.setAlternatingRowColors(True)
        layout.addWidget(self.preview_table)

        # Настройки
        settings_group = QGroupBox("Настройки шаблона")
        settings_group.setStyleSheet("QGroupBox { font-weight: bold; }")
        settings_layout = QVBoxLayout()
        settings_layout.setSpacing(5)

        self.auto_detect_check = QCheckBox("Автоопределение типов данных")
        self.auto_detect_check.setChecked(True)
        settings_layout.addWidget(self.auto_detect_check)

        self.preserve_formulas_check = QCheckBox("Сохранять формулы")
        self.preserve_formulas_check.setChecked(True)
        settings_layout.addWidget(self.preserve_formulas_check)

        self.include_headers_check = QCheckBox("Включать заголовки")
        self.include_headers_check.setChecked(True)
        settings_layout.addWidget(self.include_headers_check)

        settings_group.setLayout(settings_layout)
        layout.addWidget(settings_group)

        # Поля шаблона
        fields_label = QLabel("Настройка полей:")
        fields_label.setStyleSheet("font-weight: bold; margin-top: 10px;")
        layout.addWidget(fields_label)

        self.fields_table = QTableWidget()
        self.fields_table.setColumnCount(4)
        self.fields_table.setHorizontalHeaderLabels([
            "Имя поля", "Тип данных", "Формат", "Ключевое"
        ])
        self.fields_table.horizontalHeader().setStretchLastSection(True)
        self.fields_table.verticalHeader().setDefaultSectionSize(30)
        self.fields_table.setMaximumHeight(150)
        layout.addWidget(self.fields_table)

        # Кнопки управления полями
        fields_buttons = QHBoxLayout()
        add_field_btn = QPushButton("Добавить поле")
        add_field_btn.clicked.connect(self.add_field)
        fields_buttons.addWidget(add_field_btn)

        remove_field_btn = QPushButton("Удалить поле")
        remove_field_btn.clicked.connect(self.remove_field)
        fields_buttons.addWidget(remove_field_btn)

        fields_buttons.addStretch()
        layout.addLayout(fields_buttons)

        # Кнопки действий
        button_layout = QHBoxLayout()
        button_layout.setSpacing(10)

        self.preview_btn = QPushButton("Предпросмотр")
        self.preview_btn.clicked.connect(self.preview_template)
        button_layout.addWidget(self.preview_btn)

        button_layout.addStretch()

        self.cancel_btn = QPushButton("Отмена")
        self.cancel_btn.clicked.connect(self.reject)
        self.cancel_btn.setMinimumWidth(100)
        button_layout.addWidget(self.cancel_btn)

        self.create_btn = QPushButton("Создать шаблон")
        self.create_btn.clicked.connect(self.create_template)
        self.create_btn.setDefault(True)
        self.create_btn.setMinimumWidth(120)
        self.create_btn.setStyleSheet("background-color: #4CAF50; color: white; font-weight: bold;")
        button_layout.addWidget(self.create_btn)

        layout.addLayout(button_layout)

        # Заполняем предпросмотр
        self.update_preview()

        # Автозаполняем поля
        self.auto_fill_fields()

    def add_field(self):
        """Добавляет новое поле"""
        row = self.fields_table.rowCount()
        self.fields_table.insertRow(row)

        # Имя поля
        name_item = QTableWidgetItem(f"Column_{row + 1}")
        self.fields_table.setItem(row, 0, name_item)

        # Тип данных
        type_combo = QComboBox()
        type_combo.addItems(["text", "number", "date", "email", "phone", "currency", "percentage"])
        widget = QWidget()
        layout = QHBoxLayout(widget)
        layout.addWidget(type_combo)
        layout.setContentsMargins(5, 0, 5, 0)
        self.fields_table.setCellWidget(row, 1, widget)

        # Формат
        format_item = QTableWidgetItem("")
        self.fields_table.setItem(row, 2, format_item)

        # Ключевое поле
        key_widget = QWidget()
        key_layout = QHBoxLayout(key_widget)
        key_check = QCheckBox()
        key_layout.addWidget(key_check)
        key_layout.setAlignment(Qt.AlignCenter)
        key_layout.setContentsMargins(0, 0, 0, 0)
        self.fields_table.setCellWidget(row, 3, key_widget)

    def remove_field(self):
        """Удаляет выбранное поле"""
        current_row = self.fields_table.currentRow()
        if current_row >= 0:
            self.fields_table.removeRow(current_row)

    def update_preview(self):
        """Обновляет предпросмотр данных"""
        if not self.data:
            return

        self.preview_table.setRowCount(min(10, len(self.data)))
        self.preview_table.setColumnCount(len(self.data[0]) if self.data else 0)

        for i, row in enumerate(self.data[:10]):
            for j, cell in enumerate(row):
                item = QTableWidgetItem(str(cell))
                self.preview_table.setItem(i, j, item)

    def auto_fill_fields(self):
        """Автоматически заполняет поля на основе данных"""
        if not self.data:
            return

        # Определяем заголовки (первая строка или автоматические)
        if len(self.data) > 0:
            num_columns = len(self.data[0])
            self.fields_table.setRowCount(num_columns)

            for col in range(num_columns):
                # Имя поля
                if len(self.data) > 0 and col < len(self.data[0]):
                    field_name = str(self.data[0][col])
                    if not field_name.strip():
                        field_name = f"Column_{col + 1}"
                else:
                    field_name = f"Column_{col + 1}"

                name_item = QTableWidgetItem(field_name)
                self.fields_table.setItem(col, 0, name_item)

                # Автоопределение типа
                sample_values = []
                for row_idx in range(min(5, len(self.data))):
                    if col < len(self.data[row_idx]):
                        sample_values.append(str(self.data[row_idx][col]))

                detected_type = "text"
                if sample_values:
                    sample = sample_values[0]
                    # Простая логика определения типа
                    if '@' in sample and '.' in sample:
                        detected_type = "email"
                    elif any(c.isdigit() for c in sample.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')):
                        if len(sample.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')) >= 10:
                            detected_type = "phone"
                    elif sample.endswith('%'):
                        detected_type = "percentage"
                    elif sample.startswith('$') or sample.startswith('€') or sample.startswith('₽'):
                        detected_type = "currency"

                type_combo = QComboBox()
                type_combo.addItems(["text", "number", "date", "email", "phone", "currency", "percentage"])
                type_combo.setCurrentText(detected_type)

                # Создаем QWidget для размещения комбобокса
                widget = QWidget()
                layout = QHBoxLayout(widget)
                layout.addWidget(type_combo)
                layout.setContentsMargins(5, 0, 5, 0)
                self.fields_table.setCellWidget(col, 1, widget)

                # Формат (пустой по умолчанию)
                format_item = QTableWidgetItem("")
                self.fields_table.setItem(col, 2, format_item)

                # Ключевое поле (чекбокс)
                key_widget = QWidget()
                key_layout = QHBoxLayout(key_widget)
                key_check = QCheckBox()
                key_layout.addWidget(key_check)
                key_layout.setAlignment(Qt.AlignCenter)
                key_layout.setContentsMargins(0, 0, 0, 0)
                self.fields_table.setCellWidget(col, 3, key_widget)

    def preview_template(self):
        """Предпросмотр шаблона"""
        if not self.validate_input():
            return

        # Показываем диалог предпросмотра
        dialog = TemplatePreviewDialog(self, self.data, self.get_template_settings())
        dialog.exec_()

    def get_template_settings(self):
        """Возвращает настройки шаблона"""
        return {
            "auto_detect_patterns": self.auto_detect_check.isChecked(),
            "preserve_formulas": self.preserve_formulas_check.isChecked(),
            "include_headers": self.include_headers_check.isChecked(),
            "skip_empty_rows": True
        }

    def validate_input(self) -> bool:
        """Проверяет ввод"""
        name = self.name_input.text().strip()
        if not name:
            QMessageBox.warning(self, "Ошибка", "Введите название шаблона")
            return False

        if name in self.template_manager.get_template_names():
            reply = QMessageBox.question(
                self, "Подтверждение",
                f"Шаблон '{name}' уже существует. Перезаписать?",
                QMessageBox.Yes | QMessageBox.No
            )
            if reply == QMessageBox.No:
                return False

        return True

    def create_template(self):
        """Создает шаблон"""
        if not self.validate_input():
            return

        name = self.name_input.text().strip()
        description = self.description_input.toPlainText().strip()

        # Создаем шаблон. Если нет диапазона — сохраняем шаблон без source_range
        if self.selection_range:
            try:
                source_range = CellRange(
                    start_row=self.selection_range.get('start_row', 0),
                    start_col=self.selection_range.get('start_col', 0),
                    end_row=self.selection_range.get('end_row', 0),
                    end_col=self.selection_range.get('end_col', 0)
                )
            except Exception:
                source_range = None
        else:
            source_range = None

        template = ExportTemplate(
            name=name,
            description=description,
            source_range=source_range
        )

        # Добавляем поля из таблицы
        for row in range(self.fields_table.rowCount()):
            field_name_item = self.fields_table.item(row, 0)
            if not field_name_item:
                continue

            field_name = field_name_item.text()

            # Получаем тип данных
            field_type = "text"
            widget = self.fields_table.cellWidget(row, 1)
            if widget:
                combo = widget.findChild(QComboBox)
                if combo:
                    field_type = combo.currentText()

            format_string = self.fields_table.item(row, 2).text() if self.fields_table.item(row, 2) else ""

            # Получаем значение чекбокса
            is_key = False
            key_widget = self.fields_table.cellWidget(row, 3)
            if key_widget:
                key_check = key_widget.findChild(QCheckBox)
                if key_check:
                    is_key = key_check.isChecked()

            # Создаем поле
            try:
                field = TemplateField(
                    name=field_name,
                    column_index=row,
                    pattern=DataPattern(field_type),
                    format_string=format_string,
                    is_key_field=is_key
                )
                template.fields.append(field)
            except ValueError:
                # Если тип данных не распознан, используем text
                field = TemplateField(
                    name=field_name,
                    column_index=row,
                    pattern=DataPattern.TEXT,
                    format_string=format_string,
                    is_key_field=is_key
                )
                template.fields.append(field)

        # Настраиваем дополнительные параметры
        template.settings.update(self.get_template_settings())

        # Сохраняем
        if self.template_manager.save_template(template):
            QMessageBox.information(self, "Успех", f"Шаблон '{name}' создан")
            self.template_created.emit(name)
            self.accept()
        else:
            QMessageBox.critical(self, "Ошибка", "Не удалось сохранить шаблон")


class TemplatePreviewDialog(QDialog):
    """Диалог предпросмотра шаблона"""

    def __init__(self, parent=None, data=None, settings=None):
        super().__init__(parent)
        self.data = data or []
        self.settings = settings or {}

        self.init_ui()

    def init_ui(self):
        self.setWindowTitle("Предпросмотр шаблона")
        self.setFixedSize(800, 500)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(15, 15, 15, 15)
        layout.setSpacing(10)

        # Статистика
        stats_layout = QHBoxLayout()
        stats_layout.setSpacing(20)

        stats_layout.addWidget(QLabel(f"Строк: {len(self.data)}"))
        stats_layout.addWidget(QLabel(f"Столбцов: {len(self.data[0]) if self.data else 0}"))

        layout.addLayout(stats_layout)

        # Таблица с предпросмотром
        self.preview_table = QTableWidget()
        self.preview_table.setAlternatingRowColors(True)

        if self.data:
            self.preview_table.setRowCount(min(20, len(self.data)))
            self.preview_table.setColumnCount(len(self.data[0]))

            for i, row in enumerate(self.data[:20]):
                for j, cell in enumerate(row):
                    item = QTableWidgetItem(str(cell))

                    # Подсветка типов данных
                    cell_str = str(cell)
                    if any(c.isdigit() for c in cell_str.replace('.', '').replace(',', '')):
                        item.setBackground(Qt.yellow)
                    elif cell_str.startswith('='):
                        item.setBackground(Qt.cyan)

                    self.preview_table.setItem(i, j, item)

        layout.addWidget(self.preview_table, 1)  # stretch factor = 1

        # Кнопки
        button_layout = QHBoxLayout()
        button_layout.addStretch()

        close_btn = QPushButton("Закрыть")
        close_btn.clicked.connect(self.accept)
        close_btn.setMinimumWidth(100)
        button_layout.addWidget(close_btn)

        layout.addLayout(button_layout)


class TemplateManagerDialog(QDialog):
    """Диалог управления шаблонами"""

    template_selected = pyqtSignal(str)  # Сигнал с именем выбранного шаблона

    def __init__(self, parent=None):
        super().__init__(parent)
        self.template_manager = TemplateManager()

        self.init_ui()
        self.load_templates()

    def init_ui(self):
        self.setWindowTitle("Управление шаблонами")
        self.setFixedSize(700, 500)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(15, 15, 15, 15)
        layout.setSpacing(10)

        # Список шаблонов
        templates_label = QLabel("Сохраненные шаблоны:")
        templates_label.setStyleSheet("font-weight: bold;")
        layout.addWidget(templates_label)

        self.templates_list = QListWidget()
        self.templates_list.itemDoubleClicked.connect(self.select_template)
        layout.addWidget(self.templates_list)

        # Информация о шаблоне
        info_group = QGroupBox("Информация о шаблоне")
        info_group.setStyleSheet("QGroupBox { font-weight: bold; }")
        info_layout = QVBoxLayout()
        info_layout.setSpacing(5)

        self.info_text = QTextEdit()
        self.info_text.setReadOnly(True)
        self.info_text.setMaximumHeight(150)
        info_layout.addWidget(self.info_text)

        info_group.setLayout(info_layout)
        layout.addWidget(info_group)

        # Кнопки управления
        button_layout = QHBoxLayout()
        button_layout.setSpacing(10)

        self.delete_btn = QPushButton("Удалить")
        self.delete_btn.clicked.connect(self.delete_template)
        self.delete_btn.setMinimumWidth(80)
        button_layout.addWidget(self.delete_btn)

        self.rename_btn = QPushButton("Переименовать")
        self.rename_btn.clicked.connect(self.rename_template)
        self.rename_btn.setMinimumWidth(100)
        button_layout.addWidget(self.rename_btn)

        button_layout.addStretch()

        self.cancel_btn = QPushButton("Отмена")
        self.cancel_btn.clicked.connect(self.reject)
        self.cancel_btn.setMinimumWidth(80)
        button_layout.addWidget(self.cancel_btn)

        self.select_btn = QPushButton("Выбрать")
        self.select_btn.clicked.connect(self.select_current_template)
        self.select_btn.setDefault(True)
        self.select_btn.setMinimumWidth(80)
        self.select_btn.setStyleSheet("background-color: #4CAF50; color: white; font-weight: bold;")
        button_layout.addWidget(self.select_btn)

        layout.addLayout(button_layout)

        # Подключение сигналов
        self.templates_list.currentItemChanged.connect(self.show_template_info)

    def load_templates(self):
        """Загружает список шаблонов"""
        self.templates_list.clear()
        template_names = self.template_manager.get_template_names()

        for name in template_names:
            self.templates_list.addItem(name)

    def show_template_info(self, current, previous):
        """Показывает информацию о выбранном шаблоне"""
        if not current:
            self.info_text.clear()
            return

        template_name = current.text()
        template = self.template_manager.get_template(template_name)

        if template:
            info = f"""
            <b>Название:</b> {template.name}<br>
            <b>Описание:</b> {template.description}<br>
            <b>Создан:</b> {template.created_at}<br>
            <b>Изменен:</b> {template.modified_at}<br>
            <b>Количество полей:</b> {len(template.fields)}<br>
            <b>Количество правил:</b> {len(template.logic_rules)}<br>
            <br>
            <b>Настройки:</b><br>
            • Автоопределение типов: {'Да' if template.settings.get('auto_detect_patterns') else 'Нет'}<br>
            • Сохранение формул: {'Да' if template.settings.get('preserve_formulas') else 'Нет'}<br>
            • Заголовки: {'Да' if template.settings.get('include_headers') else 'Нет'}<br>
            """
            self.info_text.setHtml(info)

    def delete_template(self):
        """Удаляет выбранный шаблон"""
        current = self.templates_list.currentItem()
        if not current:
            return

        template_name = current.text()

        reply = QMessageBox.question(
            self, "Подтверждение",
            f"Удалить шаблон '{template_name}'?",
            QMessageBox.Yes | QMessageBox.No
        )

        if reply == QMessageBox.Yes:
            if self.template_manager.delete_template(template_name):
                self.load_templates()
                self.info_text.clear()

    def rename_template(self):
        """Переименовывает шаблон"""
        current = self.templates_list.currentItem()
        if not current:
            return

        old_name = current.text()
        new_name, ok = QInputDialog.getText(
            self, "Переименование",
            "Введите новое имя шаблона:",
            text=old_name
        )

        if ok and new_name.strip() and new_name != old_name:
            template = self.template_manager.get_template(old_name)
            if template:
                # Сохраняем под новым именем
                template.name = new_name.strip()
                if self.template_manager.save_template(template):
                    # Удаляем старый файл
                    self.template_manager.delete_template(old_name)
                    self.load_templates()

    def select_current_template(self):
        """Выбирает текущий шаблон"""
        current = self.templates_list.currentItem()
        if not current:
            QMessageBox.warning(self, "Ошибка", "Выберите шаблон")
            return

        self.template_selected.emit(current.text())
        self.accept()

    def select_template(self, item):
        """Выбирает шаблон по двойному клику"""
        self.template_selected.emit(item.text())
        self.accept()


class TemplateGalleryDialog(QDialog):
    """Расширенная галерея шаблонов с визуальным отображением"""

    template_selected = pyqtSignal(str)  # Сигнал с именем выбранного шаблона

    def __init__(self, parent=None):
        super().__init__(parent)
        self.template_manager = TemplateManager()
        self.init_ui()
        self.load_templates()

    def init_ui(self):
        self.setWindowTitle("Галерея шаблонов")
        self.setFixedSize(900, 650)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(15, 15, 15, 15)
        layout.setSpacing(10)

        # Заголовок и поиск
        header_layout = QHBoxLayout()

        title = QLabel("Галерея шаблонов")
        title.setStyleSheet("font-size: 16px; font-weight: bold;")
        header_layout.addWidget(title)

        header_layout.addStretch()

        # Поле поиска
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("🔍 Поиск по названию...")
        self.search_input.setMaximumWidth(250)
        self.search_input.textChanged.connect(self.filter_templates)
        header_layout.addWidget(self.search_input)

        layout.addLayout(header_layout)

        # Основной контент - два столбца
        content_layout = QHBoxLayout()
        content_layout.setSpacing(15)

        # Левая часть - список шаблонов
        left_layout = QVBoxLayout()

        list_label = QLabel("Доступные шаблоны:")
        list_label.setStyleSheet("font-weight: bold;")
        left_layout.addWidget(list_label)

        self.templates_list = QListWidget()
        self.templates_list.itemSelectionChanged.connect(self.show_template_details)
        left_layout.addWidget(self.templates_list)

        content_layout.addLayout(left_layout, 1)

        # Правая часть - информация о шаблоне
        right_layout = QVBoxLayout()

        info_label = QLabel("Информация о шаблоне:")
        info_label.setStyleSheet("font-weight: bold;")
        right_layout.addWidget(info_label)

        # Карточка с информацией
        self.info_card = QTextEdit()
        self.info_card.setReadOnly(True)
        self.info_card.setStyleSheet("""
            QTextEdit {
                background-color: #f5f5f5;
                border: 1px solid #ddd;
                border-radius: 5px;
                padding: 10px;
                font-family: 'Courier New', monospace;
                font-size: 10pt;
            }
        """)
        right_layout.addWidget(self.info_card)

        content_layout.addLayout(right_layout, 1)

        layout.addLayout(content_layout, 1)

        # Нижние кнопки
        button_layout = QHBoxLayout()
        button_layout.setSpacing(10)

        import_btn = QPushButton("📥 Импортировать")
        import_btn.clicked.connect(self.import_template)
        button_layout.addWidget(import_btn)

        export_btn = QPushButton("📤 Экспортировать")
        export_btn.clicked.connect(self.export_template)
        button_layout.addWidget(export_btn)

        button_layout.addStretch()

        cancel_btn = QPushButton("Отмена")
        cancel_btn.clicked.connect(self.reject)
        cancel_btn.setMinimumWidth(100)
        button_layout.addWidget(cancel_btn)

        select_btn = QPushButton("✓ Создать таблицу")
        select_btn.clicked.connect(self.select_template_and_apply)
        select_btn.setDefault(True)
        select_btn.setMinimumWidth(140)
        select_btn.setStyleSheet("background-color: #4CAF50; color: white; font-weight: bold;")
        button_layout.addWidget(select_btn)

        layout.addLayout(button_layout)

    def load_templates(self):
        """Загружает список шаблонов"""
        self.templates_list.clear()
        template_names = sorted(self.template_manager.get_template_names())

        for name in template_names:
            item = QListWidgetItem(f"📋 {name}")
            self.templates_list.addItem(item)

    def filter_templates(self, text: str):
        """Фильтрует шаблоны по поисковому запросу"""
        text = text.lower()
        for i in range(self.templates_list.count()):
            item = self.templates_list.item(i)
            item.setHidden(text not in item.text().lower())

    def show_template_details(self):
        """Показывает детали выбранного шаблона"""
        current = self.templates_list.currentItem()
        if not current:
            self.info_card.clear()
            return

        template_name = current.text().replace("📋 ", "").strip()
        template = self.template_manager.get_template(template_name)

        if not template:
            self.info_card.clear()
            return

        # Форматируем информацию
        from .template_applier import TemplateApplier
        info_text = TemplateApplier.get_template_description_text(template)

        self.info_card.setPlainText(info_text)

    def import_template(self):
        """Импортирует шаблон из файла"""
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "Импортировать шаблон",
            "",
            "JSON файлы (*.json)"
        )

        if file_path:
            from pathlib import Path
            if self.template_manager.import_template(Path(file_path), is_user_template=True):
                QMessageBox.information(self, "Успех", "Шаблон успешно импортирован")
                self.load_templates()
            else:
                QMessageBox.critical(self, "Ошибка", "Не удалось импортировать шаблон")

    def export_template(self):
        """Экспортирует выбранный шаблон"""
        current = self.templates_list.currentItem()
        if not current:
            QMessageBox.warning(self, "Ошибка", "Выберите шаблон для экспорта")
            return

        template_name = current.text().replace("📋 ", "").strip()

        file_path, _ = QFileDialog.getSaveFileName(
            self,
            "Экспортировать шаблон",
            f"{template_name}.json",
            "JSON файлы (*.json)"
        )

        if file_path:
            from pathlib import Path
            if self.template_manager.export_template(template_name, Path(file_path)):
                QMessageBox.information(self, "Успех", "Шаблон успешно экспортирован")
            else:
                QMessageBox.critical(self, "Ошибка", "Не удалось экспортировать шаблон")

    def select_template_and_apply(self):
        """Выбирает и применяет шаблон"""
        current = self.templates_list.currentItem()
        if not current:
            QMessageBox.warning(self, "Ошибка", "Выберите шаблон")
            return

        template_name = current.text().replace("📋 ", "").strip()
        self.template_selected.emit(template_name)
        self.accept()
        layout = QVBoxLayout(self)
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(8)

        # Основной контент
        content_layout = QHBoxLayout()

        # Левая часть - основные параметры
        left_layout = QFormLayout()
        left_layout.setSpacing(6)

        # Имя поля
        self.name_input = QLineEdit()
        self.name_input.setText(self.field_data.get("name", ""))
        self.name_input.setMinimumWidth(150)
        left_layout.addRow("Имя поля:", self.name_input)

        # Тип данных
        self.type_combo = QComboBox()
        self.type_combo.addItems([
            "text", "number", "date", "time",
            "email", "phone", "url", "currency", "percentage"
        ])
        self.type_combo.setCurrentText(self.field_data.get("pattern", "text"))
        left_layout.addRow("Тип данных:", self.type_combo)

        # Формат
        self.format_input = QLineEdit()
        self.format_input.setText(self.field_data.get("format_string", ""))
        self.format_input.setPlaceholderText("Например: dd.mm.yyyy для дат")
        left_layout.addRow("Формат:", self.format_input)

        content_layout.addLayout(left_layout)

        # Правая часть - дополнительные параметры
        right_layout = QVBoxLayout()

        # Ключевое поле
        self.key_check = QCheckBox("Ключевое поле")
        self.key_check.setChecked(self.field_data.get("is_key_field", False))
        right_layout.addWidget(self.key_check)

        # Описание
        desc_label = QLabel("Описание:")
        desc_label.setStyleSheet("font-weight: bold; font-size: 9pt;")
        right_layout.addWidget(desc_label)

        self.description_input = QTextEdit()
        self.description_input.setPlainText(self.field_data.get("description", ""))
        self.description_input.setMaximumHeight(70)
        self.description_input.setMaximumWidth(200)
        right_layout.addWidget(self.description_input)

        content_layout.addLayout(right_layout)

        # Кнопка удаления
        delete_btn = QPushButton("🗑️ Удалить")
        delete_btn.setMaximumWidth(100)
        delete_btn.setStyleSheet("color: #d32f2f;")
        delete_btn.clicked.connect(self.emit_removed)
        content_layout.addWidget(delete_btn)

        layout.addLayout(content_layout)

        # Разделитель
        separator = QFrame()
        separator.setFrameShape(QFrame.HLine)
        separator.setFrameShadow(QFrame.Sunken)
        layout.addWidget(separator)

    def emit_removed(self):
        """Сигнал удаления"""
        self.removed.emit()

    def get_field_data(self) -> dict:
        """Возвращает данные поля"""
        return {
            "name": self.name_input.text().strip(),
            "pattern": self.type_combo.currentText(),
            "format_string": self.format_input.text().strip(),
            "is_key_field": self.key_check.isChecked(),
            "description": self.description_input.toPlainText().strip()
        }


class TemplateCreatorDialog(QDialog):
    """Диалог для создания нового пользовательского шаблона"""

    template_created = pyqtSignal(str)  # Сигнал с именем созданного шаблона

    def __init__(self, parent=None):
        super().__init__(parent)
        self.template_manager = TemplateManager()
        self.field_widgets = []
        self.init_ui()

    def init_ui(self):
        self.setWindowTitle("Создать новый шаблон")
        self.setMinimumSize(900, 700)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(15, 15, 15, 15)
        layout.setSpacing(12)

        # === Заголовок ===
        header_label = QLabel("✨ Создание нового шаблона")
        header_label.setStyleSheet("font-size: 14px; font-weight: bold; color: #1976d2;")
        layout.addWidget(header_label)

        # === Основная информация ===
        info_group = QGroupBox("Основная информация")
        info_group.setStyleSheet("""
            QGroupBox {
                font-weight: bold;
                border: 1px solid #ddd;
                border-radius: 5px;
                margin-top: 10px;
                padding-top: 10px;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 3px 0 3px;
            }
        """)
        info_layout = QFormLayout()
        info_layout.setSpacing(10)

        # Название
        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText("Введите название шаблона (обязательно)")
        self.name_input.setMinimumHeight(35)
        self.name_input.setStyleSheet("""
            QLineEdit {
                padding: 5px;
                border: 1px solid #bbb;
                border-radius: 3px;
                font-size: 11pt;
            }
        """)
        info_layout.addRow("Название:", self.name_input)

        # Описание
        self.description_input = QTextEdit()
        self.description_input.setPlaceholderText("Описание шаблона и его назначение...")
        self.description_input.setMaximumHeight(80)
        self.description_input.setStyleSheet("""
            QTextEdit {
                padding: 5px;
                border: 1px solid #bbb;
                border-radius: 3px;
                font-size: 10pt;
            }
        """)
        info_layout.addRow("Описание:", self.description_input)

        info_group.setLayout(info_layout)
        layout.addWidget(info_group)

        # === Поля шаблона ===
        fields_header_layout = QHBoxLayout()
        fields_header = QLabel("📋 Поля шаблона")
        fields_header.setStyleSheet("font-weight: bold; font-size: 12pt; color: #1976d2;")
        fields_header_layout.addWidget(fields_header)
        fields_header_layout.addStretch()

        add_field_btn = QPushButton("➕ Добавить поле")
        add_field_btn.setMinimumWidth(120)
        add_field_btn.setStyleSheet("""
            QPushButton {
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 3px;
                padding: 5px 10px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
        """)
        add_field_btn.clicked.connect(self.add_field)
        fields_header_layout.addWidget(add_field_btn)

        layout.addLayout(fields_header_layout)

        # Область для полей со скроллом
        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        scroll_area.setStyleSheet("""
            QScrollArea {
                border: 1px solid #ddd;
                border-radius: 5px;
            }
        """)

        self.fields_container = QWidget()
        self.fields_layout = QVBoxLayout(self.fields_container)
        self.fields_layout.setContentsMargins(0, 0, 0, 0)
        self.fields_layout.setSpacing(0)

        scroll_area.setWidget(self.fields_container)
        layout.addWidget(scroll_area, 1)

        # Добавляем пустое поле по умолчанию
        self.add_field()

        # === Кнопки действий ===
        button_layout = QHBoxLayout()
        button_layout.setSpacing(12)

        cancel_btn = QPushButton("Отмена")
        cancel_btn.setMinimumWidth(100)
        cancel_btn.setStyleSheet("""
            QPushButton {
                background-color: #f5f5f5;
                border: 1px solid #bbb;
                border-radius: 3px;
                padding: 5px;
            }
        """)
        cancel_btn.clicked.connect(self.reject)
        button_layout.addWidget(cancel_btn)

        button_layout.addStretch()

        reset_btn = QPushButton("⟲ Очистить все")
        reset_btn.setMinimumWidth(100)
        reset_btn.setStyleSheet("""
            QPushButton {
                background-color: #fff3cd;
                border: 1px solid #ffc107;
                border-radius: 3px;
                padding: 5px;
            }
        """)
        reset_btn.clicked.connect(self.reset_fields)
        button_layout.addWidget(reset_btn)

        create_btn = QPushButton("✓ Создать шаблон")
        create_btn.setMinimumWidth(140)
        create_btn.setDefault(True)
        create_btn.setStyleSheet("""
            QPushButton {
                background-color: #1976d2;
                color: white;
                border: none;
                border-radius: 3px;
                padding: 5px 15px;
                font-weight: bold;
                font-size: 11pt;
            }
            QPushButton:hover {
                background-color: #1565c0;
            }
        """)
        create_btn.clicked.connect(self.create_template)
        button_layout.addWidget(create_btn)

        layout.addLayout(button_layout)

    def add_field(self):
        """Добавляет новое поле"""
        field_widget = TemplateFieldEditorWidget()
        field_widget.removed.connect(lambda: self.remove_field(field_widget))
        self.field_widgets.append(field_widget)
        self.fields_layout.addWidget(field_widget)

    def remove_field(self, field_widget):
        """Удаляет поле"""
        if len(self.field_widgets) <= 1:
            QMessageBox.warning(self, "Ошибка", "Шаблон должен содержать минимум одно поле")
            return

        self.field_widgets.remove(field_widget)
        field_widget.deleteLater()

    def reset_fields(self):
        """Очищает все поля"""
        reply = QMessageBox.question(
            self, "Подтверждение",
            "Очистить все поля и начать заново?",
            QMessageBox.Yes | QMessageBox.No
        )

        if reply == QMessageBox.Yes:
            for widget in self.field_widgets:
                widget.deleteLater()
            self.field_widgets.clear()
            self.add_field()

    def validate_input(self) -> bool:
        """Проверяет ввод"""
        name = self.name_input.text().strip()

        if not name:
            QMessageBox.warning(self, "Ошибка", "Введите название шаблона")
            return False

        if name in self.template_manager.get_template_names():
            reply = QMessageBox.question(
                self, "Подтверждение",
                f"Шаблон '{name}' уже существует. Перезаписать?",
                QMessageBox.Yes | QMessageBox.No
            )
            if reply == QMessageBox.No:
                return False

        # Проверяем, что все поля заполнены
        for widget in self.field_widgets:
            field_data = widget.get_field_data()
            if not field_data["name"]:
                QMessageBox.warning(self, "Ошибка", "Заполните имена всех полей")
                return False

        return True

    def create_template(self):
        """Создает новый шаблон"""
        if not self.validate_input():
            return

        name = self.name_input.text().strip()
        description = self.description_input.toPlainText().strip()

        # Собираем поля
        fields = []
        for idx, widget in enumerate(self.field_widgets):
            field_data = widget.get_field_data()
            try:
                field = TemplateField(
                    name=field_data["name"],
                    column_index=idx,
                    pattern=DataPattern(field_data["pattern"]),
                    format_string=field_data["format_string"],
                    is_key_field=field_data["is_key_field"]
                )
                fields.append(field)
            except ValueError:
                field = TemplateField(
                    name=field_data["name"],
                    column_index=idx,
                    pattern=DataPattern.TEXT,
                    format_string=field_data["format_string"],
                    is_key_field=field_data["is_key_field"]
                )
                fields.append(field)

        # Создаем шаблон
        template = ExportTemplate(
            name=name,
            description=description,
            fields=fields,
            source_range=CellRange(0, 0, 0, len(fields) - 1)
        )
        template.settings.update({
            "auto_detect_patterns": True,
            "preserve_formulas": False,
            "include_headers": True,
            "skip_empty_rows": False
        })

        # Сохраняем с флагом is_user_template=True
        if self.template_manager.save_template(template, is_user_template=True):
            QMessageBox.information(
                self, "Успех",
                f"✓ Шаблон '{name}' успешно создан и сохранен!"
            )
            self.template_created.emit(name)
            self.accept()
        else:
            QMessageBox.critical(self, "Ошибка", "Не удалось сохранить шаблон")


class TemplateEditorDialog(QDialog):
    """Диалог для редактирования существующего шаблона"""

    template_updated = pyqtSignal(str)  # Сигнал с именем обновленного шаблона

    def __init__(self, parent=None, template_name: str = None):
        super().__init__(parent)
        self.template_manager = TemplateManager()
        self.template_name = template_name
        self.field_widgets = []

        if template_name:
            self.template = self.template_manager.get_template(template_name)
        else:
            # Показываем диалог выбора шаблона
            self.show_template_selector()

        if self.template:
            self.init_ui()

    def show_template_selector(self):
        """Показывает диалог выбора шаблона для редактирования"""
        templates = self.template_manager.get_template_names()

        if not templates:
            QMessageBox.warning(self, "Ошибка", "Нет доступных шаблонов для редактирования")
            self.template = None
            return

        items, ok = QInputDialog.getItem(
            self,
            "Выберите шаблон",
            "Шаблон для редактирования:",
            templates,
            0,
            False
        )

        if ok and items:
            self.template = self.template_manager.get_template(items)
            self.template_name = items
        else:
            self.template = None

    def init_ui(self):
        self.setWindowTitle(f"Редактирование шаблона: {self.template.name}")
        self.setMinimumSize(900, 700)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(15, 15, 15, 15)
        layout.setSpacing(12)

        # === Заголовок ===
        header_label = QLabel(f"✏️ Редактирование шаблона '{self.template.name}'")
        header_label.setStyleSheet("font-size: 14px; font-weight: bold; color: #f57c00;")
        layout.addWidget(header_label)

        # === Основная информация ===
        info_group = QGroupBox("Основная информация")
        info_group.setStyleSheet("""
            QGroupBox {
                font-weight: bold;
                border: 1px solid #ddd;
                border-radius: 5px;
                margin-top: 10px;
                padding-top: 10px;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 3px 0 3px;
            }
        """)
        info_layout = QFormLayout()
        info_layout.setSpacing(10)

        # Название (не редактируется)
        name_label = QLabel(self.template.name)
        name_label.setStyleSheet("font-weight: bold; color: #333;")
        info_layout.addRow("Название:", name_label)

        # Описание
        self.description_input = QTextEdit()
        self.description_input.setPlainText(self.template.description)
        self.description_input.setMaximumHeight(80)
        self.description_input.setStyleSheet("""
            QTextEdit {
                padding: 5px;
                border: 1px solid #bbb;
                border-radius: 3px;
                font-size: 10pt;
            }
        """)
        info_layout.addRow("Описание:", self.description_input)

        # Статистика
        stats = f"Создан: {self.template.created_at} | Изменен: {self.template.modified_at}"
        stats_label = QLabel(stats)
        stats_label.setStyleSheet("color: #666; font-size: 9pt;")
        info_layout.addRow("", stats_label)

        info_group.setLayout(info_layout)
        layout.addWidget(info_group)

        # === Поля шаблона ===
        fields_header_layout = QHBoxLayout()
        fields_header = QLabel("📋 Поля шаблона")
        fields_header.setStyleSheet("font-weight: bold; font-size: 12pt; color: #f57c00;")
        fields_header_layout.addWidget(fields_header)
        fields_header_layout.addStretch()

        add_field_btn = QPushButton("➕ Добавить поле")
        add_field_btn.setMinimumWidth(120)
        add_field_btn.setStyleSheet("""
            QPushButton {
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 3px;
                padding: 5px 10px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
        """)
        add_field_btn.clicked.connect(self.add_field)
        fields_header_layout.addWidget(add_field_btn)

        layout.addLayout(fields_header_layout)

        # Область для полей со скроллом
        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        scroll_area.setStyleSheet("""
            QScrollArea {
                border: 1px solid #ddd;
                border-radius: 5px;
            }
        """)

        self.fields_container = QWidget()
        self.fields_layout = QVBoxLayout(self.fields_container)
        self.fields_layout.setContentsMargins(0, 0, 0, 0)
        self.fields_layout.setSpacing(0)

        # Загружаем существующие поля
        for field in self.template.fields:
            field_data = {
                "name": field.name,
                "pattern": field.pattern.value,
                "format_string": field.format_string or "",
                "is_key_field": field.is_key_field,
                "description": ""
            }
            self.add_field(field_data)

        scroll_area.setWidget(self.fields_container)
        layout.addWidget(scroll_area, 1)

        # === Кнопки действий ===
        button_layout = QHBoxLayout()
        button_layout.setSpacing(12)

        cancel_btn = QPushButton("Отмена")
        cancel_btn.setMinimumWidth(100)
        cancel_btn.setStyleSheet("""
            QPushButton {
                background-color: #f5f5f5;
                border: 1px solid #bbb;
                border-radius: 3px;
                padding: 5px;
            }
        """)
        cancel_btn.clicked.connect(self.reject)
        button_layout.addWidget(cancel_btn)

        button_layout.addStretch()

        save_btn = QPushButton("💾 Сохранить изменения")
        save_btn.setMinimumWidth(140)
        save_btn.setDefault(True)
        save_btn.setStyleSheet("""
            QPushButton {
                background-color: #f57c00;
                color: white;
                border: none;
                border-radius: 3px;
                padding: 5px 15px;
                font-weight: bold;
                font-size: 11pt;
            }
            QPushButton:hover {
                background-color: #e65100;
            }
        """)
        save_btn.clicked.connect(self.save_template)
        button_layout.addWidget(save_btn)

        layout.addLayout(button_layout)

    def add_field(self, field_data: dict = None):
        """Добавляет поле"""
        field_widget = TemplateFieldEditorWidget(field_data)
        field_widget.removed.connect(lambda: self.remove_field(field_widget))
        self.field_widgets.append(field_widget)
        self.fields_layout.addWidget(field_widget)

    def remove_field(self, field_widget):
        """Удаляет поле"""
        if len(self.field_widgets) <= 1:
            QMessageBox.warning(self, "Ошибка", "Шаблон должен содержать минимум одно поле")
            return

        self.field_widgets.remove(field_widget)
        field_widget.deleteLater()

    def save_template(self):
        """Сохраняет изменения"""
        # Проверяем, что все поля заполнены
        for widget in self.field_widgets:
            field_data = widget.get_field_data()
            if not field_data["name"]:
                QMessageBox.warning(self, "Ошибка", "Заполните имена всех полей")
                return

        # Обновляем описание
        self.template.description = self.description_input.toPlainText().strip()

        # Обновляем поля
        self.template.fields.clear()
        for idx, widget in enumerate(self.field_widgets):
            field_data = widget.get_field_data()
            try:
                field = TemplateField(
                    name=field_data["name"],
                    column_index=idx,
                    pattern=DataPattern(field_data["pattern"]),
                    format_string=field_data["format_string"],
                    is_key_field=field_data["is_key_field"]
                )
                self.template.fields.append(field)
            except ValueError:
                field = TemplateField(
                    name=field_data["name"],
                    column_index=idx,
                    pattern=DataPattern.TEXT,
                    format_string=field_data["format_string"],
                    is_key_field=field_data["is_key_field"]
                )
                self.template.fields.append(field)

        # Сохраняем
        if self.template_manager.save_template(self.template, is_user_template=True):
            QMessageBox.information(
                self, "Успех",
                f"✓ Шаблон '{self.template.name}' успешно обновлен!"
            )
            self.template_updated.emit(self.template.name)
            self.accept()
        else:
            QMessageBox.critical(self, "Ошибка", "Не удалось сохранить шаблон")