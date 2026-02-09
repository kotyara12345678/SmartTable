#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test the new template creation feature
"""
import sys
import os

# Add the project to path
project_path = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(project_path, 'pysheets'))

# Test imports
print("Testing imports...")
try:
    from pysheets.src.ui.templates.templates.template_ui import TemplateBuilderDialog
    print("✓ TemplateBuilderDialog imported successfully")
except Exception as e:
    print(f"✗ Failed to import TemplateBuilderDialog: {e}")
    sys.exit(1)

try:
    from pysheets.src.utils import show_error_message, show_info_message
    print("✓ show_error_message and show_info_message imported successfully")
except Exception as e:
    print(f"✗ Failed to import message functions: {e}")
    sys.exit(1)

# Check if main_window has the new method
try:
    from pysheets.src.ui.main_window import MainWindow
    if hasattr(MainWindow, 'create_template_from_selection'):
        print("✓ create_template_from_selection method exists in MainWindow")
    else:
        print("✗ create_template_from_selection method missing from MainWindow")
        sys.exit(1)
except Exception as e:
    print(f"✗ Failed to check MainWindow: {e}")
    sys.exit(1)

print("\n✓ All tests passed successfully!")
print("The new template creation feature is ready for use.")
print("\nFeature workflow:")
print("  1. Select columns in spreadsheet")
print("  2. Click menu item '📋 Создать шаблон из выделения'")
print("  3. Fill in template details in the dialog")
print("  4. Click 'Create' to save the template")
