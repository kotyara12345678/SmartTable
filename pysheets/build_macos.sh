#!/bin/bash
# build_macos.sh - Сборка SmartTable в .app для macOS

set -e

echo "[SmartTable] Сборка .app для macOS..."

# Проверяем зависимости
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python3 не найден!"
    exit 1
fi

# Устанавливаем зависимости проекта
echo "[INFO] Установка зависимостей..."
pip install -r requirements.txt
pip install pyinstaller

# Создаём директорию для сборки
mkdir -p dist

# Собираем приложение используя PyInstaller
echo "[INFO] Сборка с помощью PyInstaller..."
python3 -m PyInstaller \
    --onefile \
    --windowed \
    --name=SmartTable \
    --add-data=assets:assets \
    --add-data=templates:templates \
    --hidden-import=pysheets.src.ui.main_window \
    --hidden-import=pysheets.src.ui.spreadsheet_widget \
    --hidden-import=pysheets.src.core.cell \
    --hidden-import=pysheets.src.core.formula_engine \
    --hidden-import=pysheets.src.utils.validators \
    --hidden-import=pysheets.src.io.odt_export \
    --hidden-import=pysheets.src.io.print_handler \
    --hidden-import=pysheets.src.io.json_export \
    --hidden-import=pysheets.src.io.html_export \
    --hidden-import=pysheets.src.io.xml_export \
    --hidden-import=pysheets.src.io.markdown_export \
    --hidden-import=pysheets.src.io.sql_export \
    --hidden-import=pysheets.src.io.text_export \
    --osx-bundle-identifier=com.smarttable.app \
    main.py

# Создаём Info.plist для .app
echo "[INFO] Создание Info.plist..."
mkdir -p dist/SmartTable.app/Contents

cat > dist/SmartTable.app/Contents/Info.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleExecutable</key>
    <string>SmartTable</string>
    <key>CFBundleIdentifier</key>
    <string>com.smarttable.app</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>SmartTable</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>NSMainNibFile</key>
    <string>MainMenu</string>
    <key>NSPrincipalClass</key>
    <string>NSApplication</string>
    <key>NSHumanReadableCopyright</key>
    <string>Copyright © 2026 SmartTable. All rights reserved.</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.9</string>
</dict>
</plist>
EOF

echo "[SUCCESS] SmartTable.app создан!"
echo "[INFO] Приложение находится в: dist/SmartTable.app"
echo "[INFO] Для запуска: open dist/SmartTable.app"

# (Опционально) Создаём DMG (installer)
echo "[INFO] Создание DMG архива..."
hdiutil create -volname "SmartTable" \
    -srcfolder dist \
    -ov -format UDZO dist/SmartTable.dmg

echo "[SUCCESS] DMG архив создан: dist/SmartTable.dmg"
