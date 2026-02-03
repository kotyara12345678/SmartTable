#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Тест интеграции новых экспортеров в main_window.py"""

import sys
import io
import importlib.util
from pathlib import Path

# Fix encoding for Windows console
if sys.stdout.encoding and 'utf' not in sys.stdout.encoding.lower():
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Add project to path
project_root = Path(__file__).parent / "pysheets"
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "src"))

def test_imports():
    """Проверяем что все импорты работают"""
    try:
        from ui.main_window import MainWindow
        print("[OK] MainWindow импортирован успешно")
        
        # Проверяем что методы существуют
        methods_to_check = [
            'export_to_json',
            'export_to_html',
            'export_to_xml',
            'export_to_markdown',
            'export_to_sql',
            'export_to_text'
        ]
        
        for method_name in methods_to_check:
            if hasattr(MainWindow, method_name):
                print(f"[OK] Метод {method_name} существует")
            else:
                print(f"[FAIL] Метод {method_name} не найден")
                return False
        
        return True
        
    except Exception as e:
        print(f"[FAIL] Ошибка при импорте: {e}")
        return False

def test_exporters():
    """Проверяем что все экспортеры импортируются"""
    try:
        # Need to access io submodule from src path
        import sys
        import importlib.util
        
        project_root = Path(__file__).parent / "pysheets"
        io_path = project_root / "src" / "io"
        
        # Load JSON exporter
        spec = importlib.util.spec_from_file_location("json_export", io_path / "json_export.py")
        json_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(json_module)
        print("[OK] JSONExporter импортирован")
        
        # Load HTML exporter
        spec = importlib.util.spec_from_file_location("html_export", io_path / "html_export.py")
        html_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(html_module)
        print("[OK] HTMLExporter импортирован")
        
        # Load XML exporter
        spec = importlib.util.spec_from_file_location("xml_export", io_path / "xml_export.py")
        xml_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(xml_module)
        print("[OK] XMLExporter импортирован")
        
        # Load Markdown exporter
        spec = importlib.util.spec_from_file_location("markdown_export", io_path / "markdown_export.py")
        md_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(md_module)
        print("[OK] MarkdownExporter импортирован")
        
        # Load SQL exporter
        spec = importlib.util.spec_from_file_location("sql_export", io_path / "sql_export.py")
        sql_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(sql_module)
        print("[OK] SQLExporter импортирован")
        
        # Load Text exporter
        spec = importlib.util.spec_from_file_location("text_export", io_path / "text_export.py")
        text_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(text_module)
        print("[OK] TextExporter импортирован")
        
        return True
        
    except Exception as e:
        print(f"[FAIL] Ошибка при импорте экспортеров: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Тест интеграции новых форматов экспорта")
    print("=" * 60)
    
    print("\n1. Проверка методов main_window.py...")
    result1 = test_imports()
    
    print("\n2. Проверка экспортеров...")
    result2 = test_exporters()
    
    print("\n" + "=" * 60)
    if result1 and result2:
        print("[SUCCESS] ВСЕ ТЕСТЫ ПРОЙДЕНЫ - Новые форматы экспорта готовы!")
    else:
        print("[FAIL] НЕКОТОРЫЕ ТЕСТЫ НЕ ПРОЙДЕНЫ")
    print("=" * 60)
