import sys
from PyQt5.QtWidgets import (
    QDialog, QVBoxLayout, QLabel, QComboBox, QPushButton,
    QHBoxLayout, QCheckBox, QFormLayout
)


class ChartWizardDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Построение графика")
        self.setMinimumWidth(360)
        layout = QVBoxLayout(self)

        layout.addWidget(QLabel("Выберите тип графика:"))
        self.chart_type_combo = QComboBox()
        self.chart_type_combo.addItems([
            "Столбчатая диаграмма",
            "Горизонтальная столбчатая",
            "Линейный график",
            "Сглаженная линия",
            "Круговая диаграмма",
            "Площадная (Area)"
        ])
        layout.addWidget(self.chart_type_combo)

        form = QFormLayout()
        self.smooth_checkbox = QCheckBox("Применить сглаживание (moving average)")
        self.legend_checkbox = QCheckBox("Показать легенду")
        self.normalize_checkbox = QCheckBox("Нормировать серии")
        form.addRow(self.smooth_checkbox)
        form.addRow(self.legend_checkbox)
        form.addRow(self.normalize_checkbox)
        layout.addLayout(form)

        btn_layout = QHBoxLayout()
        self.ok_btn = QPushButton("Построить")
        self.cancel_btn = QPushButton("Отмена")
        btn_layout.addStretch()
        btn_layout.addWidget(self.ok_btn)
        btn_layout.addWidget(self.cancel_btn)
        layout.addLayout(btn_layout)

        self.ok_btn.clicked.connect(self.accept)
        self.cancel_btn.clicked.connect(self.reject)

    def get_chart_type(self):
        return self.chart_type_combo.currentText()

    def get_options(self):
        return {
            'smooth': self.smooth_checkbox.isChecked(),
            'legend': self.legend_checkbox.isChecked(),
            'normalize': self.normalize_checkbox.isChecked()
        }
