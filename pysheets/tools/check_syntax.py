# -*- coding: utf-8 -*-
import py_compile
import sys
files = [
    r"src/ui/main_window.py",
    r"src/ui/templates/templates/template_ui.py",
]
errors = False
for f in files:
    path = f"c:/Users/glino/OneDrive/Рабочий стол/SmartTable-master/pysheets/{f}"
    try:
        py_compile.compile(path, doraise=True)
        print(f"OK: {f}")
    except Exception as e:
        print(f"ERROR compiling {f}: {e}")
        errors = True
if errors:
    sys.exit(1)
print('ALL_OK')
