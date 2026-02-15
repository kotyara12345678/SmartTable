"""
Автокомплит формул для таблицы и панели формул.
Показывает popup с подсказками функций при вводе = и начале имени функции.
"""

import re
from typing import Optional, List, Tuple

from PyQt5.QtWidgets import QListWidget, QListWidgetItem, QLineEdit, QWidget
from PyQt5.QtCore import Qt, QPoint, QTimer
from PyQt5.QtGui import QColor


# Список всех доступных функций с описаниями
FORMULA_FUNCTIONS: List[Tuple[str, str, str]] = [
    # (имя, синтаксис, описание)
    # Математические
    ("SUM", "SUM(range)", "Сумма значений"),
    ("AVERAGE", "AVERAGE(range)", "Среднее значение"),
    ("COUNT", "COUNT(range)", "Количество числовых значений"),
    ("MAX", "MAX(range)", "Максимальное значение"),
    ("MIN", "MIN(range)", "Минимальное значение"),
    ("ROUND", "ROUND(number, digits)", "Округление числа"),
    ("ABS", "ABS(number)", "Модуль числа"),
    ("SQRT", "SQRT(number)", "Квадратный корень"),
    ("POWER", "POWER(base, exp)", "Возведение в степень"),
    ("MOD", "MOD(number, divisor)", "Остаток от деления"),
    
    # Логические
    ("IF", "IF(condition, true, false)", "Условие"),
    
    # Дата и время
    ("NOW", "NOW()", "Текущая дата и время"),
    ("TODAY", "TODAY()", "Текущая дата"),
    ("DATE", "DATE(year, month, day)", "Создать дату"),
    
    # Текстовые
    ("CONCATENATE", "CONCATENATE(text1, text2, ...)", "Объединение текста"),
    ("CONCAT", "CONCAT(text1, text2, ...)", "Объединение текста"),
    ("LEN", "LEN(text)", "Длина текста"),
    ("UPPER", "UPPER(text)", "Верхний регистр"),
    ("LOWER", "LOWER(text)", "Нижний регистр"),
    ("PROPER", "PROPER(text)", "Каждое слово с заглавной"),
    ("TRIM", "TRIM(text)", "Удалить лишние пробелы"),
    ("LEFT", "LEFT(text, count)", "Левая часть текста"),
    ("RIGHT", "RIGHT(text, count)", "Правая часть текста"),
    ("MID", "MID(text, start, count)", "Часть текста"),
    ("FIND", "FIND(search, text)", "Найти позицию"),
    ("SEARCH", "SEARCH(search, text)", "Поиск (без регистра)"),
    ("REPLACE", "REPLACE(text, pos, len, new)", "Замена по позиции"),
    ("SUBSTITUTE", "SUBSTITUTE(text, old, new)", "Замена текста"),
    ("REPT", "REPT(text, count)", "Повторить текст"),
    ("TEXT", "TEXT(value, format)", "Форматирование числа"),
    ("VALUE", "VALUE(text)", "Текст в число"),
    ("CHAR", "CHAR(code)", "Символ по коду"),
    ("CODE", "CODE(text)", "Код символа"),
    ("CLEAN", "CLEAN(text)", "Удалить непечатные"),
    ("EXACT", "EXACT(text1, text2)", "Точное сравнение"),
    ("T", "T(value)", "Преобразовать в текст"),
    ("TEXTJOIN", "TEXTJOIN(delim, ignore, range)", "Объединить с разделителем"),
    ("NUMBERVALUE", "NUMBERVALUE(text)", "Текст в число"),
    ("FIXED", "FIXED(number, decimals)", "Фиксированный формат"),
    
    # AI
    ("AI", 'AI("prompt")', "AI-генерация значения"),
]


class FormulaAutocomplete:
    """
    Автокомплит формул. Привязывается к QLineEdit.
    Показывает popup при вводе = и начале имени функции.
    """
    
    def __init__(self, line_edit: QLineEdit, parent_widget: QWidget, accent_color: Optional[QColor] = None):
        self._edit = line_edit
        self._parent = parent_widget
        # Получаем акцентный цвет из главного окна если не передан
        if accent_color is None:
            accent_color = self._get_app_accent_color()
        self._accent_color = accent_color
        self._popup: Optional[QListWidget] = None
        self._formula_start = -1  # позиция = в тексте
        
        # Создаём popup
        self._create_popup()
        
        # Перехватываем события
        self._original_key_press = line_edit.keyPressEvent
        line_edit.keyPressEvent = self._key_press_handler
        
        # Подключаем textChanged для проверки автокомплита
        line_edit.textChanged.connect(self._on_text_changed)
    
    def _create_popup(self):
        """Создаёт popup виджет"""
        self._popup = QListWidget(self._parent)
        self._popup.setObjectName("formulaAutocomplete")
        self._popup.setFocusPolicy(Qt.NoFocus)
        self._popup.setMaximumHeight(250)
        self._popup.setMinimumWidth(300)
        self._popup.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self._popup.itemClicked.connect(self._on_item_clicked)
        self._popup.hide()
        self._update_style()
    
    def _update_style(self):
        """Обновляет стили popup (автоопределение темы)"""
        if self._popup is None:
            return
        accent = self._accent_color.name()
        
        # Автоопределение темы
        is_dark = True
        try:
            from PyQt5.QtWidgets import QApplication
            from PyQt5.QtGui import QPalette
            app = QApplication.instance()
            if app:
                text_color = app.palette().color(QPalette.Text)
                brightness = (text_color.red() + text_color.green() + text_color.blue()) / 3
                is_dark = brightness > 128
        except Exception:
            pass
        
        if is_dark:
            bg = "#1e1e24"
            border = "#4a4a55"
            text = "#e0e0e0"
            hover = "#2a2a35"
        else:
            bg = "#ffffff"
            border = "#d2d2d7"
            text = "#1d1d1f"
            hover = "#f0f0f5"
        
        self._popup.setStyleSheet(f"""
            QListWidget {{
                background-color: {bg};
                border: 1px solid {border};
                border-radius: 8px;
                padding: 4px;
                font-family: 'Consolas', 'Courier New', monospace;
                font-size: 12px;
                color: {text};
            }}
            QListWidget::item {{
                padding: 6px 10px;
                border-radius: 4px;
            }}
            QListWidget::item:hover {{
                background-color: {hover};
            }}
            QListWidget::item:selected {{
                background-color: {accent};
                color: white;
            }}
        """)
    
    def set_accent_color(self, color: QColor):
        """Обновляет акцентный цвет"""
        self._accent_color = color
        self._update_style()
    
    def set_theme(self, is_dark: bool, accent_color: QColor):
        """Обновляет тему"""
        self._accent_color = accent_color
        if self._popup is None:
            return
        accent = accent_color.name()
        if is_dark:
            bg = "#1e1e24"
            border = "#4a4a55"
            text = "#e0e0e0"
            hover = "#2a2a35"
        else:
            bg = "#ffffff"
            border = "#d2d2d7"
            text = "#1d1d1f"
            hover = "#f0f0f5"
        
        self._popup.setStyleSheet(f"""
            QListWidget {{
                background-color: {bg};
                border: 1px solid {border};
                border-radius: 8px;
                padding: 4px;
                font-family: 'Consolas', 'Courier New', monospace;
                font-size: 12px;
                color: {text};
            }}
            QListWidget::item {{
                padding: 6px 10px;
                border-radius: 4px;
            }}
            QListWidget::item:hover {{
                background-color: {hover};
            }}
            QListWidget::item:selected {{
                background-color: {accent};
                color: white;
            }}
        """)
    
    def _key_press_handler(self, event):
        """Перехват клавиш"""
        if self._popup is not None and self._popup.isVisible():
            if event.key() == Qt.Key_Down:
                row = self._popup.currentRow()
                if row < self._popup.count() - 1:
                    self._popup.setCurrentRow(row + 1)
                return
            elif event.key() == Qt.Key_Up:
                row = self._popup.currentRow()
                if row > 0:
                    self._popup.setCurrentRow(row - 1)
                return
            elif event.key() in (Qt.Key_Tab, Qt.Key_Return):
                if self._popup.count() > 0:
                    self._accept_completion()
                    return
            elif event.key() == Qt.Key_Escape:
                self._hide()
                return
        
        # Вызываем оригинальный обработчик
        self._original_key_press(event)
    
    def _on_text_changed(self, text: str):
        """Проверяет нужно ли показать автокомплит"""
        QTimer.singleShot(10, lambda: self._check_autocomplete(text))
    
    def _check_autocomplete(self, text: str):
        """Проверяет текст и показывает/скрывает popup"""
        if self._popup is None:
            return
        
        cursor_pos = self._edit.cursorPosition()
        
        if not text or cursor_pos == 0:
            self._hide()
            return
        
        text_before = text[:cursor_pos]
        
        # Ищем последний = перед курсором
        eq_idx = text_before.rfind('=')
        if eq_idx == -1:
            self._hide()
            return
        
        # Текст после = до курсора
        after_eq = text_before[eq_idx + 1:]
        
        # Извлекаем текущее имя функции (последнее слово из букв)
        # Например: =SU → "SU", =IF(A1, SU → "SU"
        func_match = re.search(r'([A-Za-z_]+)$', after_eq)
        if not func_match:
            # Если сразу после = или после ( — показываем все функции
            if after_eq == '' or after_eq.endswith('(') or after_eq.endswith(',') or after_eq.endswith(', '):
                self._formula_start = cursor_pos
                self._show_filtered('')
            else:
                self._hide()
            return
        
        query = func_match.group(1)
        self._formula_start = cursor_pos - len(query)
        self._show_filtered(query)
    
    def _show_filtered(self, query: str):
        """Показывает отфильтрованный список функций"""
        if self._popup is None:
            return
        
        query_upper = query.upper()
        filtered = []
        
        for name, syntax, desc in FORMULA_FUNCTIONS:
            if not query or name.startswith(query_upper):
                filtered.append((name, syntax, desc))
        
        if not filtered:
            self._hide()
            return
        
        self._popup.clear()
        for name, syntax, desc in filtered:
            item = QListWidgetItem(f"{name}  —  {desc}")
            item.setData(Qt.UserRole, name)  # чистое имя
            item.setData(Qt.UserRole + 1, syntax)  # синтаксис
            item.setToolTip(syntax)
            self._popup.addItem(item)
        
        if self._popup.count() > 0:
            self._popup.setCurrentRow(0)
        
        # Позиционируем popup
        self._position_popup()
        self._popup.show()
        self._popup.raise_()
    
    def _position_popup(self):
        """Позиционирует popup под полем ввода"""
        if self._popup is None:
            return
        
        edit_pos = self._edit.mapTo(self._parent, QPoint(0, 0))
        popup_height = min(self._popup.count() * 30 + 10, 250)
        
        self._popup.setFixedHeight(popup_height)
        self._popup.setFixedWidth(max(300, self._edit.width()))
        
        # Показываем под полем ввода
        self._popup.move(
            edit_pos.x(),
            edit_pos.y() + self._edit.height() + 2
        )
    
    def _hide(self):
        """Скрывает popup"""
        if self._popup is not None:
            self._popup.hide()
        self._formula_start = -1
    
    def _on_item_clicked(self, item):
        """Клик по элементу"""
        self._accept_completion()
    
    def _accept_completion(self):
        """Принимает выбранный вариант"""
        if self._popup is None or not self._popup.currentItem():
            self._hide()
            return
        
        func_name = self._popup.currentItem().data(Qt.UserRole)
        if not func_name:
            self._hide()
            return
        
        text = self._edit.text()
        cursor_pos = self._edit.cursorPosition()
        
        if self._formula_start >= 0:
            # Заменяем от начала имени функции до курсора
            new_text = text[:self._formula_start] + func_name + "(" + text[cursor_pos:]
            self._edit.setText(new_text)
            # Ставим курсор внутрь скобок
            self._edit.setCursorPosition(self._formula_start + len(func_name) + 1)
        
        self._hide()
    
    @staticmethod
    def _get_app_accent_color() -> QColor:
        """Получает акцентный цвет из главного окна приложения"""
        try:
            from PyQt5.QtWidgets import QApplication
            app = QApplication.instance()
            if app:
                for widget in app.topLevelWidgets():
                    if hasattr(widget, 'app_theme_color'):
                        return widget.app_theme_color
                # Fallback: читаем из QSettings
                from PyQt5.QtCore import QSettings
                settings = QSettings("SmartTable", "SmartTable")
                saved = settings.value("theme_color")
                if saved:
                    return QColor(saved)
        except Exception:
            pass
        return QColor("#DC143C")  # fallback
    
    def destroy(self):
        """Очистка ресурсов"""
        if self._popup is not None:
            self._popup.hide()
            self._popup.deleteLater()
            self._popup = None
        # Восстанавливаем оригинальный обработчик
        if hasattr(self, '_original_key_press'):
            self._edit.keyPressEvent = self._original_key_press
