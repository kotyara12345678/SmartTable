#!/usr/bin/env python3
"""
build_macos.py - Скрипт для сборки SmartTable в .app для macOS
Использование: python3 build_macos.py
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path

def run_command(cmd, description):
    """Выполнить команду и вывести результат"""
    print(f"\n[INFO] {description}...")
    print(f"[CMD] {' '.join(cmd)}")
    try:
        result = subprocess.run(cmd, check=True)
        print(f"[OK] {description} успешно")
        return True
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] {description} не удалась!")
        return False

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

def check_python():
    """Проверить версию Python"""
    version = sys.version_info
    print(f"[INFO] Python версия: {version.major}.{version.minor}.{version.micro}")
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("[ERROR] Требуется Python 3.8 или выше!")
        return False
    return True

def install_dependencies():
    """Установить зависимости"""
    commands = [
        (["python3", "-m", "pip", "install", "--upgrade", "pip"], "Обновление pip"),
        (["python3", "-m", "pip", "install", "-r", "requirements.txt"], "Установка зависимостей"),
        (["python3", "-m", "pip", "install", "pyinstaller"], "Установка PyInstaller"),
    ]
    
    for cmd, desc in commands:
        if not run_command(cmd, desc):
            return False
    return True

def build_app():
    """Собрать приложение"""
    print("\n[SmartTable] Начало сборки .app для macOS...")
    print("[INFO] Это может занять 5-10 минут...")
    
    # Создаём папку macos
    macos_dir = Path("../../dist/macos")
    macos_dir.mkdir(exist_ok=True)
    
    cmd = [
        "python3", "-m", "PyInstaller",
        "--onefile",
        "--windowed",
        "--name=SmartTable",
        "--add-data=assets:assets",
        "--add-data=template:template",
        "--distpath=macos",
        "--hidden-import=pysheets.src.ui.main_window",
        "--hidden-import=pysheets.src.ui.spreadsheet_widget",
        "--hidden-import=pysheets.src.core.cell",
        "--hidden-import=pysheets.src.core.formula_engine",
        "--hidden-import=pysheets.src.util.validators",
        "--hidden-import=pysheets.src.io.odt_export",
        "--hidden-import=pysheets.src.io.print_handler",
        "--hidden-import=pysheets.src.io.json_export",
        "--hidden-import=pysheets.src.io.html_export",
        "--hidden-import=pysheets.src.io.xml_export",
        "--hidden-import=pysheets.src.io.markdown_export",
        "--hidden-import=pysheets.src.io.sql_export",
        "--hidden-import=pysheets.src.io.text_export",
        "--osx-bundle-identifier=com.smarttable.app",
        "main.py",
    ]
    
    return run_command(cmd, "Сборка с помощью PyInstaller")

def create_plist():
    """Создать Info.plist"""
    print("\n[INFO] Создание Info.plist...")
    
    plist_dir = Path("macos/SmartTable.app/Contents")
    plist_dir.mkdir(parents=True, exist_ok=True)
    
    plist_content = '''<?xml version="1.0" encoding="UTF-8"?>
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
</plist>'''
    
    plist_file = plist_dir / "Info.plist"
    plist_file.write_text(plist_content)
    print(f"[OK] Info.plist создан: {plist_file}")

def create_dmg():
    """Создать DMG архив"""
    print("\n[INFO] Создание DMG архива...")
    
    cmd = [
        "hdiutil", "create",
        "-volname", "SmartTable",
        "-srcfolder", "macos",
        "-ov",
        "-format", "UDZO",
        "macos/SmartTable.dmg"
    ]
    
    return run_command(cmd, "Создание DMG")

def main():
    """Основная функция"""
    print("=" * 60)
    print("SmartTable - Сборка для macOS")
    print("=" * 60)
    
    # Проверяем Python
    if not check_python():
        sys.exit(1)
    
    # Очищаем старые сборки
    cleanup()
    
    # Устанавливаем зависимости
    if not install_dependencies():
        print("\n[ERROR] Не удалось установить зависимости!")
        sys.exit(1)
    
    # Собираем приложение
    if not build_app():
        print("\n[ERROR] Не удалось собрать приложение!")
        sys.exit(1)
    
    # Создаём Info.plist
    create_plist()
    
    # Создаём DMG (опционально)
    print("\n[INFO] Попытка создания DMG архива...")
    if shutil.which("hdiutil"):
        create_dmg()
    else:
        print("[WARNING] hdiutil не найден, DMG не будет создан")
        print("[INFO] Вы можете создать DMG вручную или просто использовать .app")
    
    # Финальное сообщение
    print("\n" + "=" * 60)
    print("[SUCCESS] Сборка завершена!")
    print("=" * 60)
    print("\nРезультаты в папке 'macos/':")
    print("  ✅ macos/SmartTable.app - готовое приложение")
    if Path("macos/SmartTable.dmg").exists():
        print("  ✅ macos/SmartTable.dmg - инсталлятор")
    print("\nДля запуска:")
    print("  open macos/SmartTable.app")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
