"""
Миксин для контекстного меню электронной таблицы.
"""

from PyQt5.QtWidgets import QMenu, QColorDialog, QAction, QMessageBox
from PyQt5.QtCore import Qt, QPoint
from PyQt5.QtGui import QColor, QKeySequence


class ContextMenuMixin:
    """Миксин для контекстного меню"""

    def show_context_menu(self, position: QPoint):
        """Показать расширенное контекстное меню"""
        menu = QMenu(self)

        # Основные действия (оригинальные)
        copy_action = QAction("Копировать", self)
        copy_action.setShortcut(QKeySequence("Ctrl+C"))
        copy_action.triggered.connect(self.copy_selection)
        menu.addAction(copy_action)

        paste_action = QAction("Вставить", self)
        paste_action.setShortcut(QKeySequence("Ctrl+V"))
        paste_action.triggered.connect(self.paste_selection)
        menu.addAction(paste_action)

        cut_action = QAction("Вырезать", self)
        cut_action.setShortcut(QKeySequence("Ctrl+X"))
        cut_action.triggered.connect(self.cut_selection)
        menu.addAction(cut_action)

        menu.addSeparator()
        
        # НОВОЕ: Удаление содержимого
        delete_content_action = QAction("Удалить содержимое", self)
        delete_content_action.triggered.connect(self.delete_content)
        menu.addAction(delete_content_action)
        
        delete_all_action = QAction("Очистить всю таблицу", self)
        delete_all_action.triggered.connect(self.delete_all)
        menu.addAction(delete_all_action)
        
        menu.addSeparator()
        
        # НОВОЕ: Перемещение ячеек
        move_menu = menu.addMenu("Переместить")
        
        move_up_action = QAction("Вверх", self)
        move_up_action.triggered.connect(self.move_cells_up)
        move_menu.addAction(move_up_action)
        
        move_down_action = QAction("Вниз", self)
        move_down_action.triggered.connect(self.move_cells_down)
        move_menu.addAction(move_down_action)
        
        move_left_action = QAction("Влево", self)
        move_left_action.triggered.connect(self.move_cells_left)
        move_menu.addAction(move_left_action)
        
        move_right_action = QAction("Вправо", self)
        move_right_action.triggered.connect(self.move_cells_right)
        move_menu.addAction(move_right_action)

        menu.addSeparator()

        # НОВОЕ: Автокорректировка
        auto_adjust_menu = menu.addMenu("Автокорректировка")

        auto_adjust_cell_action = QAction("Подогнать выделенные ячейки", self)
        auto_adjust_cell_action.triggered.connect(self.auto_adjust_selection)
        auto_adjust_menu.addAction(auto_adjust_cell_action)

        auto_fit_col_action = QAction("Автоподгонка колонки", self)
        current_col = self.columnAt(position.x())
        auto_fit_col_action.triggered.connect(lambda: self.auto_fit_column(current_col))
        auto_adjust_menu.addAction(auto_fit_col_action)

        auto_fit_row_action = QAction("Автоподгонка строки", self)
        current_row = self.rowAt(position.y())
        auto_fit_row_action.triggered.connect(lambda: self.auto_fit_row(current_row))
        auto_adjust_menu.addAction(auto_fit_row_action)

        # НОВОЕ: Разделение ячеек
        split_menu = menu.addMenu("Разделить ячейку")

        split_vertical_action = QAction("Вертикально (Ctrl+Shift+V)", self)
        split_vertical_action.setShortcut(QKeySequence("Ctrl+Shift+V"))
        split_vertical_action.triggered.connect(
            lambda: self.split_selected_cell('vertical')
        )
        split_menu.addAction(split_vertical_action)

        split_horizontal_action = QAction("Горизонтально (Ctrl+Shift+H)", self)
        split_horizontal_action.setShortcut(QKeySequence("Ctrl+Shift+H"))
        split_horizontal_action.triggered.connect(
            lambda: self.split_selected_cell('horizontal')
        )
        split_menu.addAction(split_horizontal_action)

        split_menu.addSeparator()

        unsplit_action = QAction("Убрать разделение", self)
        unsplit_action.triggered.connect(self.unsplit_selected_cell)
        split_menu.addAction(unsplit_action)

        # НОВОЕ: Заморозка
        freeze_menu = menu.addMenu("Заморозить")

        freeze_action = QAction("Заморозить (Ctrl+F)", self)
        freeze_action.setShortcut(QKeySequence("Ctrl+F"))
        freeze_action.triggered.connect(self.freeze_selection)
        freeze_menu.addAction(freeze_action)

        unfreeze_action = QAction("Разморозить (Ctrl+Shift+F)", self)
        unfreeze_action.setShortcut(QKeySequence("Ctrl+Shift+F"))
        unfreeze_action.triggered.connect(self.unfreeze_selection)
        freeze_menu.addAction(unfreeze_action)

        # НОВОЕ: Скрытие
        hide_menu = menu.addMenu("Скрыть/Показать")

        hide_action = QAction("Скрыть выделение (Ctrl+H)", self)
        hide_action.setShortcut(QKeySequence("Ctrl+H"))
        hide_action.triggered.connect(self.hide_selection)
        hide_menu.addAction(hide_action)

        show_action = QAction("Показать выделение (Ctrl+Shift+H)", self)
        show_action.setShortcut(QKeySequence("Ctrl+Shift+H"))
        show_action.triggered.connect(self.show_selection)
        hide_menu.addAction(show_action)

        menu.addSeparator()

        # Оригинальные пункты меню
        format_menu = menu.addMenu("Форматирование")

        bold_action = QAction("Жирный", self)
        bold_action.setCheckable(True)
        bold_action.triggered.connect(lambda: self.apply_format('bold', None))
        format_menu.addAction(bold_action)

        italic_action = QAction("Курсив", self)
        italic_action.setCheckable(True)
        italic_action.triggered.connect(lambda: self.apply_format('italic', None))
        format_menu.addAction(italic_action)

        underline_action = QAction("Подчеркнутый", self)
        underline_action.setCheckable(True)
        underline_action.triggered.connect(lambda: self.apply_format('underline', None))
        format_menu.addAction(underline_action)

        strike_action = QAction("Перечеркнутый", self)
        strike_action.setCheckable(True)
        strike_action.triggered.connect(lambda: self.apply_format('strike', None))
        format_menu.addAction(strike_action)

        format_menu.addSeparator()

        text_color_action = QAction("Цвет текста...", self)
        text_color_action.triggered.connect(lambda: self.apply_format('text_color', None))
        format_menu.addAction(text_color_action)

        bg_color_action = QAction("Цвет фона...", self)
        bg_color_action.triggered.connect(lambda: self.apply_format('bg_color', None))
        format_menu.addAction(bg_color_action)

        format_menu.addSeparator()

        # Размер шрифта
        font_size_menu = format_menu.addMenu("Размер шрифта")
        for size in [8, 9, 10, 11, 12, 14, 16, 18, 20, 24]:
            size_action = QAction(str(size), self)
            size_action.triggered.connect(lambda checked, s=size: self.apply_format('font_size', s))
            font_size_menu.addAction(size_action)

        # Выравнивание
        align_menu = format_menu.addMenu("Выравнивание")
        align_left_action = QAction("По левому краю", self)
        align_left_action.triggered.connect(lambda: self.apply_format('alignment', 'left'))
        align_menu.addAction(align_left_action)
        align_center_action = QAction("По центру", self)
        align_center_action.triggered.connect(lambda: self.apply_format('alignment', 'center'))
        align_menu.addAction(align_center_action)
        align_right_action = QAction("По правому краю", self)
        align_right_action.triggered.connect(lambda: self.apply_format('alignment', 'right'))
        align_menu.addAction(align_right_action)

        format_menu.addSeparator()

        clear_format_action = QAction("Сбросить форматирование", self)
        clear_format_action.triggered.connect(lambda: self.apply_format('clear_format', True))
        format_menu.addAction(clear_format_action)

        menu.addSeparator()

        # Вставка/удаление строк
        insert_row_action = QAction("Вставить строку", self)
        insert_row_action.triggered.connect(self.insert_row)
        menu.addAction(insert_row_action)

        delete_row_action = QAction("Удалить строку", self)
        delete_row_action.triggered.connect(self.delete_row)
        menu.addAction(delete_row_action)

        # Сортировка
        sort_action = QAction("Сортировка...", self)
        sort_action.triggered.connect(self.open_sort_dialog)
        menu.addAction(sort_action)

        # НОВОЕ: Сброс размеров
        menu.addSeparator()

        # Выпадающий список
        dropdown_action = QAction("📋 Выпадающий список...", self)
        dropdown_action.triggered.connect(self.show_dropdown_dialog)
        menu.addAction(dropdown_action)

        reset_sizes_action = QAction("Сбросить кастомные размеры", self)
        reset_sizes_action.triggered.connect(self.reset_custom_sizes)
        menu.addAction(reset_sizes_action)

        menu.addSeparator()

        # ============ AI ФУНКЦИИ ============
        ai_menu = menu.addMenu("🤖 AI Помощник")

        ai_analyze_action = QAction("📊 Анализ данных", self)
        ai_analyze_action.triggered.connect(self._ai_analyze_data)
        ai_menu.addAction(ai_analyze_action)

        ai_formula_action = QAction("🧮 Предложить формулу", self)
        ai_formula_action.triggered.connect(self._ai_suggest_formula)
        ai_menu.addAction(ai_formula_action)

        ai_nl_formula_action = QAction("💬 Формула из текста...", self)
        ai_nl_formula_action.triggered.connect(self._ai_natural_language_formula)
        ai_menu.addAction(ai_nl_formula_action)

        ai_menu.addSeparator()

        ai_cleanup_action = QAction("🧹 Очистка данных", self)
        ai_cleanup_action.triggered.connect(self._ai_cleanup_data)
        ai_menu.addAction(ai_cleanup_action)

        ai_format_action = QAction("✨ Автоформатирование", self)
        ai_format_action.triggered.connect(self._ai_auto_format)
        ai_menu.addAction(ai_format_action)

        ai_menu.addSeparator()

        ai_predict_action = QAction("🔮 Предсказать значения", self)
        ai_predict_action.triggered.connect(self._ai_predict_values)
        ai_menu.addAction(ai_predict_action)

        ai_summary_action = QAction("📝 Создать отчёт", self)
        ai_summary_action.triggered.connect(self._ai_generate_summary)
        ai_menu.addAction(ai_summary_action)

        ai_explain_action = QAction("💡 Объяснить данные", self)
        ai_explain_action.triggered.connect(self._ai_explain_data)
        ai_menu.addAction(ai_explain_action)

        menu.exec(self.viewport().mapToGlobal(position))

    # ============= НОВЫЕ ФУНКЦИИ =============

    # ============= AI ФУНКЦИИ =============

    def _ai_send_to_chat(self, prompt: str):
        """Отправляет промпт в AI чат через сигнал"""
        if hasattr(self, 'ai_chat_request'):
            self.ai_chat_request.emit(prompt)

    def _ai_analyze_data(self):
        """📊 Анализ данных с помощью AI"""
        try:
            from pysheets.src.core.ai.ai_actions import analyze_data
            prompt = analyze_data(self)
            self._ai_send_to_chat(prompt)
        except Exception as e:
            QMessageBox.warning(self, "Ошибка", f"Не удалось запустить анализ: {e}")

    def _ai_suggest_formula(self):
        """🧮 Предложить формулу"""
        try:
            from pysheets.src.core.ai.ai_actions import suggest_formula
            prompt = suggest_formula(self)
            self._ai_send_to_chat(prompt)
        except Exception as e:
            QMessageBox.warning(self, "Ошибка", f"Не удалось предложить формулу: {e}")

    def _ai_natural_language_formula(self):
        """💬 Формула из текста"""
        from PyQt5.QtWidgets import QInputDialog
        text, ok = QInputDialog.getText(
            self, "🤖 AI Формула",
            "Опишите формулу на естественном языке:\n"
            "Например: \"сумма колонки B\" или \"среднее значение продаж\""
        )
        if ok and text:
            try:
                from pysheets.src.core.ai.ai_actions import natural_language_formula
                prompt = natural_language_formula(text, self)
                self._ai_send_to_chat(prompt)
            except Exception as e:
                QMessageBox.warning(self, "Ошибка", f"Не удалось создать формулу: {e}")

    def _ai_cleanup_data(self):
        """🧹 Очистка данных"""
        try:
            from pysheets.src.core.ai.ai_actions import cleanup_data_prompt
            prompt = cleanup_data_prompt(self)
            self._ai_send_to_chat(prompt)
        except Exception as e:
            QMessageBox.warning(self, "Ошибка", f"Не удалось запустить очистку: {e}")

    def _ai_auto_format(self):
        """✨ Автоформатирование"""
        try:
            from pysheets.src.core.ai.ai_actions import auto_format_prompt
            prompt = auto_format_prompt(self)
            self._ai_send_to_chat(prompt)
        except Exception as e:
            QMessageBox.warning(self, "Ошибка", f"Не удалось запустить автоформат: {e}")

    def _ai_predict_values(self):
        """🔮 Предсказать значения"""
        try:
            from pysheets.src.core.ai.ai_actions import predict_values_prompt
            prompt = predict_values_prompt(self)
            self._ai_send_to_chat(prompt)
        except Exception as e:
            QMessageBox.warning(self, "Ошибка", f"Не удалось запустить предсказание: {e}")

    def _ai_generate_summary(self):
        """📝 Создать отчёт"""
        try:
            from pysheets.src.core.ai.ai_actions import generate_summary_prompt
            prompt = generate_summary_prompt(self)
            self._ai_send_to_chat(prompt)
        except Exception as e:
            QMessageBox.warning(self, "Ошибка", f"Не удалось создать отчёт: {e}")

    def _ai_explain_data(self):
        """💡 Объяснить данные"""
        try:
            from pysheets.src.core.ai.ai_actions import explain_data_prompt
            prompt = explain_data_prompt(self)
            self._ai_send_to_chat(prompt)
        except Exception as e:
            QMessageBox.warning(self, "Ошибка", f"Не удалось объяснить данные: {e}")

    # ============= ОСТАЛЬНЫЕ ФУНКЦИИ =============

    # 1. АВТОКОРРЕКТИРОВКА РАЗМЕРА ЯЧЕЙКИ
