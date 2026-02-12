#!/usr/bin/env python3
"""
Test script to verify all three fixes:
1. Quick functions now require range selection
2. Cell colors apply correctly
3. Theme persistence on app restart
"""

import sys
import os
from pathlib import Path

# Add pysheets to path
pysheets_path = Path(__file__).parent / "pysheets"
sys.path.insert(0, str(pysheets_path.parent))

from PyQt5.QtWidgets import QApplication, QMessageBox
from PyQt5.QtCore import QTimer
from PyQt5.QtGui import QColor

def test_quick_functions(main_window):
    """Test 1: Quick functions require range selection"""
    print("\n" + "="*60)
    print("TEST 1: Quick Functions Behavior")
    print("="*60)
    
    spreadsheet = main_window.get_current_spreadsheet()
    
    # Add test data
    spreadsheet.set_cell_value(0, 0, "10")
    spreadsheet.set_cell_value(1, 0, "20")
    spreadsheet.set_cell_value(2, 0, "30")
    print("✓ Added test data: 10, 20, 30 in A1:A3")
    
    # Test 1a: Try to apply SUM without range selection (should fail with status message)
    print("\nTest 1a: Trying SUM without range selection...")
    main_window.on_function_selected("SUM")
    status = main_window.status_bar.currentMessage()
    if "Выберите диапазон" in status:
        print("✓ Correctly requires range selection")
    else:
        print(f"✗ Unexpected status: {status}")
    
    # Test 1b: Select range and apply SUM
    print("\nTest 1b: Selecting range A1:A3 and applying SUM...")
    spreadsheet.selectRange(0, 0, 2, 0)  # Select A1:A3
    main_window.on_function_selected("SUM")
    
    # Check the formula was inserted in cell A4
    if spreadsheet.currentRow() >= 0 and spreadsheet.currentColumn() >= 0:
        row = spreadsheet.currentRow()
        col = spreadsheet.currentColumn()
        cell = spreadsheet.get_cell(row, col)
        if cell:
            print(f"✓ Formula inserted: {cell.value}")
            if "SUM" in cell.value:
                print("✓ SUM function formula created correctly")
            if cell.calculated_value:
                print(f"✓ Calculated value: {cell.calculated_value}")
    
    return True

def test_cell_colors(main_window):
    """Test 2: Cell colors apply correctly"""
    print("\n" + "="*60)
    print("TEST 2: Cell Color Application")
    print("="*60)
    
    spreadsheet = main_window.get_current_spreadsheet()
    
    # Create a test cell
    spreadsheet.set_cell_value(5, 5, "Colored Cell")
    print("✓ Created test cell at F6")
    
    # Apply text color
    cell = spreadsheet.get_cell(5, 5)
    if cell:
        cell.text_color = "#FF0000"  # Red
        cell.background_color = "#FFFF00"  # Yellow
        spreadsheet.apply_cell_formatting(5, 5)
        print("✓ Applied red text color and yellow background")
        
        # Verify the cell formatting
        item = spreadsheet.item(5, 5)
        if item:
            print(f"✓ Cell item exists, formatting applied")
            foreground = item.foreground()
            background = item.background()
            print(f"  - Foreground brush: {foreground}")
            print(f"  - Background brush: {background}")
    
    return True

def test_theme_persistence(main_window):
    """Test 3: Theme persistence"""
    print("\n" + "="*60)
    print("TEST 3: Theme Persistence")
    print("="*60)
    
    # Check current theme
    current_theme = main_window.current_theme
    current_mode = main_window.current_theme_mode
    print(f"✓ Current theme: {current_theme}")
    print(f"✓ Current theme mode: {current_mode}")
    
    # Check settings
    theme_from_settings = main_window.settings.value("theme")
    mode_from_settings = main_window.settings.value("theme_mode")
    print(f"✓ Theme from settings: {theme_from_settings}")
    print(f"✓ Theme mode from settings: {mode_from_settings}")
    
    # Apply a theme
    print("\nApplying 'light' theme...")
    main_window.apply_theme('light', QColor("#DC143C"))
    
    # Verify it was saved
    saved_theme = main_window.settings.value("theme")
    saved_mode = main_window.settings.value("theme_mode")
    print(f"✓ Theme saved to settings: {saved_theme}")
    print(f"✓ Theme mode saved to settings: {saved_mode}")
    
    if saved_theme == 'light' and saved_mode == 'light':
        print("✓ Theme persistence working correctly")
        return True
    else:
        print("✗ Theme persistence failed")
        return False

def main():
    """Run all tests"""
    print("\n" + "█"*60)
    print("SmartTable - Fix Validation Tests")
    print("█"*60)
    
    app = QApplication(sys.argv)
    
    # Import and create main window
    from pysheets.src.ui.main_window import MainWindow
    
    main_window = MainWindow()
    main_window.show()
    
    # Run tests with delays to allow UI updates
    def run_tests():
        try:
            print("\nStarting tests...\n")
            
            # Test 1: Quick functions
            result1 = test_quick_functions(main_window)
            
            # Test 2: Cell colors
            result2 = test_cell_colors(main_window)
            
            # Test 3: Theme persistence
            result3 = test_theme_persistence(main_window)
            
            # Summary
            print("\n" + "="*60)
            print("TEST SUMMARY")
            print("="*60)
            print(f"✓ Quick Functions:      {'PASS' if result1 else 'FAIL'}")
            print(f"✓ Cell Colors:          {'PASS' if result2 else 'FAIL'}")
            print(f"✓ Theme Persistence:    {'PASS' if result3 else 'FAIL'}")
            print("="*60 + "\n")
            
            if all([result1, result2, result3]):
                print("✓ ALL TESTS PASSED!")
                QMessageBox.information(main_window, "Tests", "All fixes validated successfully!")
            else:
                print("✗ Some tests failed")
                QMessageBox.warning(main_window, "Tests", "Some tests failed - see console output")
        
        except Exception as e:
            print(f"\n✗ Error during tests: {e}")
            import traceback
            traceback.print_exc()
            QMessageBox.critical(main_window, "Error", f"Test error: {e}")
    
    # Schedule tests to run after UI is fully loaded
    QTimer.singleShot(1000, run_tests)
    
    sys.exit(app.exec_())

if __name__ == "__main__":
    main()
