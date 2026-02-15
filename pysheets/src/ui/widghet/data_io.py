"""
Миксин для сохранения/загрузки состояния электронной таблицы.
"""

from typing import Dict, Any


class DataIOMixin:
    """Миксин для сохранения/загрузки состояния"""

    def save_state(self) -> Dict[str, Any]:
        """Сохранить состояние виджета"""
        return {
            'cell_states': self.save_cell_states(),
            'zoom_level': self.zoom_level,
            'column_widths': {col: self.columnWidth(col) for col in range(self.columns)},
            'row_heights': {row: self.rowHeight(row) for row in range(self.rows)}
        }

    def load_state(self, state: Dict[str, Any]):
        """Загрузить состояние виджета"""
        self.load_cell_states(state.get('cell_states', {}))

        if 'zoom_level' in state:
            self.zoom_level = state['zoom_level']
            self.apply_zoom()

        # Загружаем размеры колонок
        for col, width in state.get('column_widths', {}).items():
            if col < self.columnCount():
                self.setColumnWidth(col, width)

        # Загружаем размеры строк
        for row, height in state.get('row_heights', {}).items():
            if row < self.rowCount():
                self.setRowHeight(row, height)

    