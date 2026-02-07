"""
UI компоненты для работы с шаблонами
"""

from PyQt5.QtWidgets import *
from PyQt5.QtCore import Qt, pyqtSignal
from PyQt5.QtGui import QFont

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

        if not self.selection_range:
            QMessageBox.warning(self, "Ошибка", "Не указан диапазон ячеек")
            return

        # Создаем шаблон
        template = ExportTemplate(
            name=name,
            description=description,
            source_range=CellRange(
                start_row=self.selection_range['start_row'],
                start_col=self.selection_range['start_col'],
                end_row=self.selection_range['end_row'],
                end_col=self.selection_range['end_col']
            )
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