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
    
    cmd = [
        "python3", "-m", "PyInstaller",
        "--onedir",
        "--windowed",
        "--name=SmartTable",
        "--add-data=assets:assets",
        "--add-data=templates:templates",
        "--hidden-import=pysheets.src.ui.main_window",
        "--hidden-import=pysheets.src.ui.spreadsheet_widget",
        "--hidden-import=pysheets.src.core.cell",
        "--hidden-import=pysheets.src.core.formula_engine",
        "--hidden-import=pysheets.src.utils.validators",
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
    
    if not run_command(cmd, "Сборка с помощью PyInstaller"):
        return False
    
    # Переместить dist/SmartTable.app в macos/
    macos_dir = Path("macos")
    macos_dir.mkdir(exist_ok=True)
    
    dist_app = Path("dist/SmartTable.app")
    macos_app = macos_dir / "SmartTable.app"
    
    if dist_app.exists():
        print(f"\n[INFO] Перемещение {dist_app} в {macos_app}...")
        if macos_app.exists():
            shutil.rmtree(macos_app)
        shutil.move(str(dist_app), str(macos_app))
        print(f"[OK] Приложение перемещено в {macos_app}")
        
        # Проверяем структуру
        macos_bin = macos_app / "Contents" / "MacOS" / "SmartTable"
        if macos_bin.exists():
            print(f"[OK] Исполняемый файл найден: {macos_bin}")
        else:
            print(f"[WARNING] Исполняемый файл не найден в {macos_bin}")
            print("[INFO] Проверьте структуру .app bundle")
    else:
        print(f"[WARNING] {dist_app} не найден, проверьте сборку")
    
    return True

def create_plist():
    """Создать/обновить Info.plist"""
    print("\n[INFO] Обновление Info.plist...")
    
    # PyInstaller уже создаёт Info.plist в правильном месте, но мы можем его обновить
    plist_path = Path("macos/SmartTable.app/Contents/Info.plist")
    
    if not plist_path.exists():
        print(f"[WARNING] Info.plist не найден в {plist_path}")
        print("[INFO] Проверьте что сборка завершилась успешно")
        return
    
    print(f"[OK] Info.plist найден: {plist_path}")
    
    # Проверяем что файл валидный
    try:
        import plistlib
        with open(plist_path, 'rb') as f:
            plist = plistlib.load(f)
        
        # Обновляем некоторые значения
        plist['CFBundleShortVersionString'] = '1.0.0'
        plist['CFBundleVersion'] = '1'
        plist['NSHumanReadableCopyright'] = 'Copyright © 2026 SmartTable. All rights reserved.'
        
        with open(plist_path, 'wb') as f:
            plistlib.dump(plist, f)
        
        print("[OK] Info.plist обновлен")
    except Exception as e:
        print(f"[WARNING] Не удалось обновить Info.plist: {e}")

def fix_permissions():
    """Исправить права доступа для .app"""
    print("\n[INFO] Исправление прав доступа для .app...")
    
    app_path = Path("macos/SmartTable.app")
    if not app_path.exists():
        print(f"[WARNING] {app_path} не найден")
        return
    
    try:
        # Даем права на выполнение для исполняемого файла
        macos_dir = app_path / "Contents/MacOS"
        if macos_dir.exists():
            for executable in macos_dir.glob("SmartTable*"):
                if executable.is_file():
                    os.chmod(executable, 0o755)
                    print(f"[OK] Права установлены: {executable.name}")
        
        # Удаляем extended attributes (может помешать на других Mac)
        if shutil.which("xattr"):
            run_command(["xattr", "-rd", "@", str(app_path)], "Удаление extended attributes")
    except Exception as e:
        print(f"[WARNING] Ошибка при исправлении прав: {e}")

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
    
    # Обновляем Info.plist
    create_plist()
    
    # Исправляем права доступа
    fix_permissions()
    
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
