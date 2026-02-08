#!/bin/bash
# build_appimage.sh - Сборка SmartTable в AppImage для Linux

set -e

echo "[SmartTable] Сборка AppImage для Linux..."

# Проверяем зависимости
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python3 не найден!"
    exit 1
fi

if ! command -v appimage-builder &> /dev/null; then
    echo "[INFO] Установка appimage-builder..."
    pip install appimage-builder
fi

# Устанавливаем зависимости проекта
echo "[INFO] Установка зависимостей..."
pip install -r requirements.txt
pip install pyinstaller

# Создаём директорию для сборки
mkdir -p build_appimage
cd build_appimage

# Создаём AppDir структуру
mkdir -p SmartTable.AppDir/usr/{bin,lib,share}
mkdir -p SmartTable.AppDir/usr/share/{applications,icons}

# Копируем иконку и .desktop файл
if [ -f "../assets/icons/app_icon.ico" ]; then
    cp "../assets/icons/app_icon.ico" "SmartTable.AppDir/usr/share/icons/"
fi

if [ -f "../SmartTable.desktop" ]; then
    cp "../SmartTable.desktop" "SmartTable.AppDir/usr/share/applications/"
fi

# Создаём AppImage используя PyInstaller
echo "[INFO] Сборка с помощью PyInstaller..."
python3 -m PyInstaller \
    --onefile \
    --name=SmartTable \
    --add-data=../assets:assets \
    --add-data=../templates:templates \
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
    ../main.py

# Копируем исполняемый файл в AppDir
cp dist/SmartTable SmartTable.AppDir/usr/bin/

# Создаём AppRun скрипт
cat > SmartTable.AppDir/AppRun << 'EOF'
#!/bin/bash
exec "$(dirname "$0")"/usr/bin/SmartTable "$@"
EOF

chmod +x SmartTable.AppDir/AppRun

# Скачиваем appimagetool
if [ ! -f "appimagetool" ]; then
    echo "[INFO] Скачивание appimagetool..."
    wget -q https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage -O appimagetool
    chmod +x appimagetool
fi

# Создаём AppImage
echo "[INFO] Создание AppImage..."
./appimagetool SmartTable.AppDir SmartTable.AppImage

# Копируем готовый AppImage в dist
cp SmartTable.AppImage ../dist/

echo "[SUCCESS] SmartTable AppImage создан: dist/SmartTable.AppImage"
echo "[INFO] Для запуска: chmod +x dist/SmartTable.AppImage && ./dist/SmartTable.AppImage"
