#!/usr/bin/env python3
# build_exe.py
"""
Скрипт для сборки SmartTable в exe-файл с помощью PyInstaller
Использование: python build_exe.py [--clean]
"""

import PyInstaller.__main__
import sys
import shutil
from pathlib import Path

def cleanup():
    """Очистить старые сборки"""
    print("[INFO] Очистка старых сборок...")
    folders = ['dist', 'build', '__pycache__', 'SmartTable.spec']
    for folder in folders:
        path = Path(folder)
        if path.exists():
            if path.is_dir():
                shutil.rmtree(path)
                print(f"[CLEANED] Удалена папка {folder}")
            else:
                path.unlink()
                print(f"[CLEANED] Удалён файл {folder}")

def build():
    """Собрать exe-файл"""
    print("[SmartTable] Начало сборки exe-файла для Windows...")
    
    PyInstaller.__main__.run([
        'main.py',
        '--onefile',                    # Один исполняемый файл
        '--windowed',                   # Без консольного окна
        '--name=SmartTable',
        '--add-data=assets;assets',
        '--add-data=templates;templates',
        '--add-data=requirements.txt;.',
        '--hidden-import=pysheets.src.ui.main_window',
        '--hidden-import=pysheets.src.ui.spreadsheet_widget',
        '--hidden-import=pysheets.src.core.cell',
        '--hidden-import=pysheets.src.core.formula_engine',
        '--hidden-import=pysheets.src.utils.validators',
        '--hidden-import=pysheets.src.io.odt_export',
        '--hidden-import=pysheets.src.io.print_handler',
        '--hidden-import=pysheets.src.io.json_export',
        '--hidden-import=pysheets.src.io.html_export',
        '--hidden-import=pysheets.src.io.xml_export',
        '--hidden-import=pysheets.src.io.markdown_export',
        '--hidden-import=pysheets.src.io.sql_export',
        '--hidden-import=pysheets.src.io.text_export',
        '--distpath=dist',
        '--workpath=build',
        '--specpath=.',
    ])
    
    print("[SUCCESS] Сборка завершена!")
    print("[INFO] Exe-файл находится в: dist/SmartTable.exe")

if __name__ == '__main__':
    # Проверяем аргументы
    if '--clean' in sys.argv or '-c' in sys.argv:
        cleanup()
    
    # Собираем
    build()
