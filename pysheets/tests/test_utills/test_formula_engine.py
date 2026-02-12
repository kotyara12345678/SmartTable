#!/usr/bin/env python3
"""Quick test for MIN, MAX, POWER, and other functions"""

import sys
sys.path.insert(0, r'/')

from pysheets.src.core.formula.engine import FormulaEngine

# Create a simple mock spreadsheet
cells = {}

def create_test_cells():
    """Create test cells with known values"""
    # A1:C2 grid
    # 10  20  30
    # 40  50  60
    
    test_data = {
        'A1': '10',
        'B1': '20',
        'C1': '30',
        'A2': '40',
        'B2': '50',
        'C2': '60',
    }
    return test_data

def mock_cell_resolver(cell_ref):
    """Mock cell resolver that returns test data"""
    return cells.get(cell_ref)

# Test the formula engine
engine = FormulaEngine()
cells = create_test_cells()

print("Test data: A1=10, B1=20, C1=30, A2=40, B2=50, C2=60")
print()

tests = [
    ("=SUM(A1:C2)", "Should be 210"),
    ("=AVERAGE(A1:C2)", "Should be 35"),
    ("=MIN(A1:C2)", "Should be 10"),
    ("=MAX(A1:C2)", "Should be 60"),
    ("=ROUND(25.6)", "Should be 26"),
    ("=ROUND(25.4)", "Should be 25"),
    ("=MOD(17,5)", "Should be 2"),
    ("=POWER(2,3)", "Should be 8"),
    ("=ABS(-42)", "Should be 42"),
    ("=SQRT(16)", "Should be 4"),
]

for formula, expected in tests:
    try:
        result = engine.evaluate(formula[1:], mock_cell_resolver)  # Remove = sign
        status = "✓" if result is not None else "✗"
        print(f"{status} {formula:<25} = {result:<15} ({expected})")
    except Exception as e:
        print(f"✗ {formula:<25} ERROR: {e}")

print("\nNow testing with empty cells mixed in...")
cells['D1'] = ''  # Empty
cells['E1'] = ''  # Empty
cells['D2'] = '100'
cells['E2'] = ''  # Empty

print("Test data with empties: A1=10, B1=20, C1=30, D1=empty, E1=empty")
print("                        A2=40, B2=50, C2=60, D2=100, E2=empty")
print()

empty_tests = [
    ("=SUM(A1:E2)", "Should be 350 (skips empty)"),
    ("=MIN(A1:E2)", "Should be 10 (skips empty)"),
    ("=MAX(A1:E2)", "Should be 100 (skips empty)"),
    ("=AVERAGE(A1:E2)", "Should be 43.75 (350/8, skips empty)"),
    ("=COUNT(A1:E2)", "Should be 8 (counts non-empty)"),
]

for formula, expected in empty_tests:
    try:
        result = engine.evaluate(formula[1:], mock_cell_resolver)
        status = "✓" if result is not None else "✗"
        print(f"{status} {formula:<25} = {result:<15} ({expected})")
    except Exception as e:
        print(f"✗ {formula:<25} ERROR: {e}")
