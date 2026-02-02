# build_exe.py
"""
Скрипт для сборки SmartTable в exe-файл с помощью PyInstaller
"""
import PyInstaller.__main__

PyInstaller.__main__.run([
    'main.py',
    '--onefile',
    '--windowed',
    '--name=SmartTable',
    '--icon=assets/icons/app_icon.ico',
    '--add-data=assets;assets',
    '--add-data=templates;templates',
    '--add-data=requirements.txt;.',
    '--hidden-import=pysheets.src.ui.main_window',
    '--hidden-import=pysheets.src.ui.spreadsheet_widget',
    '--hidden-import=pysheets.src.core.cell',
    '--hidden-import=pysheets.src.core.formula_engine',
    '--hidden-import=pysheets.src.utils.validators',
])
