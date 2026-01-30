# Quick Reference Guide - PySheets Theme System

## What Was Fixed

| Issue | Fix | Status |
|-------|-----|--------|
| Square color buttons | Changed border-radius to 15px | ✓ |
| White table corner in dark mode | Added corner-button styling | ✓ |
| System theme not detecting OS preference | Implemented palette brightness detection | ✓ |
| Theme not saving between sessions | Added QSettings persistence | ✓ |
| Settings dialog staying white | Implemented _apply_dialog_theme() | ✓ |

## How to Use

### Change Theme at Runtime
```python
window.apply_theme("dark", QColor("#1a73e8"))
```

### Open Theme Settings
- Menu: Tools → Preferences → Theme
- Or: Shortcut (if configured)

### Access Saved Theme
```python
from PyQt5.QtCore import QSettings
settings = QSettings("PySheets", "PySheets")
theme = settings.value("theme")  # "light", "dark", or "system"
color = settings.value("theme_color")  # e.g., "#DC143C"
```

## Key Files
- **Theme Implementation:** `pysheets/src/ui/themes.py`
- **Main Window Integration:** `pysheets/src/ui/main_window.py`
- **Settings Storage:** Windows Registry (QSettings)

## Theme Options
1. **Light** - Light background, dark text
2. **Dark** - Dark background, light text
3. **System** - Auto-detects OS preference (Windows dark/light mode)

## Accent Colors
6 presets: Crimson, Blue, Green, Yellow, Purple, Coral
Plus: Custom color picker for unlimited options

## System Requirements
- PyQt5
- Python 3.8+
- Windows/Linux/macOS (theme detection works on all platforms)

## Verification
Run `python validate_app.py` to verify installation:
```
Current theme: dark
Accent color: #dc143c

APPLICATION VALIDATION SUCCESSFUL!
✓ MainWindow created successfully
✓ Theme system initialized
✓ Theme persisted and loaded correctly
```

## Troubleshooting

**Theme not persisting?**
- Check Windows Registry: `HKEY_CURRENT_USER\Software\PySheets\PySheets`
- Keys should exist: "theme" and "theme_color"

**Dialog not themed?**
- Ensure dialog is created with parent parameter
- Example: `dialog = ThemeSettingsDialog(self)`

**Colors not applying?**
- Verify `#` prefix in color hex codes
- Format: `#RRGGBB` (e.g., `#DC143C`)
- Use `QColor.isValid()` to check

**System theme not detecting?**
- Brightness threshold is 128 (0-255 scale)
- Try changing Windows theme to force re-detection
- Check System Palette brightness calculation

## File Locations
```
c:\Users\{username}\PythonProjects\SmartTable\
├── pysheets/
│   └── src/ui/
│       ├── themes.py          # Theme system (400 lines)
│       └── main_window.py      # Integration (799 lines)
├── IMPLEMENTATION_COMPLETE.md  # Detailed documentation
└── validate_app.py            # Verification script
```

## Quick Test
```bash
cd c:\Users\pasaz\PythonProjects\SmartTable
python validate_app.py
```

Expected output: ✓ APPLICATION VALIDATION SUCCESSFUL!
