"""Quick test for SmartScript cell reference feature"""
import sys
sys.path.insert(0, '.')

from pysheets.src.core.smartscript.interpreter import SmartScriptInterpreter

def mock_cell(row, col):
    """Mock cell getter: D2=Apple, D3=Google"""
    data = {(1, 3): 'Apple', (2, 3): 'Google'}
    return data.get((row, col), '')

i = SmartScriptInterpreter()
i.set_cell_getter(mock_cell)

# Test 1: bare cell reference
code1 = 'k1 = D2\nreturn k1'
r1 = i.execute(code1)
print(f"Test 1 (D2 -> Apple): {r1}")
assert r1 == ['Apple'], f"Expected ['Apple'], got {r1}"

# Test 2: comparison
code2 = 'k1 = D2\nk2 = D3\nif k1 == k2:\n  return "same"\nreturn k1 + " vs " + k2'
r2 = i.execute(code2)
print(f"Test 2 (Apple vs Google): {r2}")
assert r2 == ['Apple vs Google'], f"Expected ['Apple vs Google'], got {r2}"

# Test 3: same values
def mock_cell2(row, col):
    data = {(1, 3): 'Tesla', (2, 3): 'Tesla'}
    return data.get((row, col), '')

i2 = SmartScriptInterpreter()
i2.set_cell_getter(mock_cell2)
code3 = 'k1 = D2\nk2 = D3\nif k1 == k2:\n  return "same"\nreturn "different"'
r3 = i2.execute(code3)
print(f"Test 3 (Tesla == Tesla): {r3}")
assert r3 == ['same'], f"Expected ['same'], got {r3}"

print("\nAll tests passed!")
