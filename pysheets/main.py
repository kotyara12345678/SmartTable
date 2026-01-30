

import sys
import os

# Добавляем src в путь Python
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from PyQt5.QtWidgets import QApplication
from ui.main_window import SpreadsheetApp


def main():
    app = QApplication(sys.argv)
    app.setStyle('Fusion')

    window = SpreadsheetApp()
    window.show()

    sys.exit(app.exec_())


if __name__ == "__main__":
    main()