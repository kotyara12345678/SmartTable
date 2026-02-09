#!/usr/bin/env python3
"""
build_linux.py - Скрипт для сборки SmartTable в AppImage для Linux
Использование: python3 build_linux.py
"""

import os
import sys
import shutil
import subprocess
import platform
from pathlib import Path

def run_command(cmd, description, check=True):
    """Выполнить команду и вывести результат"""
    print(f"\n[INFO] {description}...")
    print(f"[CMD] {' '.join(cmd)}")
    try:
        result = subprocess.run(cmd, check=check)
        if check:
            print(f"[OK] {description} успешно")
        return True
    except subprocess.CalledProcessError as e:
        if check:
            print(f"[ERROR] {description} не удалась!")
        return False

def cleanup():
    """Очистить старые сборки"""
    print("[INFO] Очистка старых сборок...")
    folders = ['dist', 'build', 'build_appimage', '__pycache__', 'SmartTable.spec']
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

def check_appimage_tool():
    """Проверить/скачать appimagetool"""
    # Проверяем OS - AppImage только для Linux!
    if platform.system() != "Linux":
        print(f"[WARNING] AppImage сборка доступна только на Linux!")
        print(f"[INFO] Текущая OS: {platform.system()}")
        print("[INFO] Сборка AppImage будет пропущена")
        return True  # Не ошибка, просто пропускаем на других ОС
    
    appimage_tool = Path("build_appimage/appimagetool")
    
    if appimage_tool.exists():
        print("[INFO] appimagetool уже скачан")
        return True
    
    print("\n[INFO] Скачивание appimagetool...")
    build_appimage_dir = Path("../../build_appimage")
    build_appimage_dir.mkdir(exist_ok=True)
    
    url = "https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage"
    cmd = ["wget", "-q", url, "-O", str(appimage_tool)]
    
    if not run_command(cmd, "Скачивание appimagetool", check=False):
        print("[WARNING] Не удалось скачать appimagetool, попробуем curl...")
        cmd = ["curl", "-sL", url, "-o", str(appimage_tool)]
        if not run_command(cmd, "Скачивание appimagetool через curl"):
            return False
    
    # Даем права на выполнение
    os.chmod(appimage_tool, 0o755)
    return True

def build_appimage():
    """Собрать AppImage"""
    print("\n[SmartTable] Начало сборки AppImage для Linux...")
    print("[INFO] Это может занять 8-15 минут...")
    
    # Создаём папку linux
    linux_dir = Path("../../linux")
    linux_dir.mkdir(exist_ok=True)
    
    # Создаём папку build_appimage
    build_dir = Path("../../build_appimage")
    build_dir.mkdir(exist_ok=True)
    os.chdir(build_dir)
    
    # Создаём структуру AppDir
    appdir = Path("SmartTable.AppDir")
    (appdir / "usr" / "bin").mkdir(parents=True, exist_ok=True)
    (appdir / "usr" / "share" / "applications").mkdir(parents=True, exist_ok=True)
    (appdir / "usr" / "share" / "icons").mkdir(parents=True, exist_ok=True)
    
    # Копируем файлы
    if Path("../assets/icons/app_icon.ico").exists():
        shutil.copy("../assets/icons/app_icon.ico", appdir / "usr" / "share" / "icons/")
    if Path("../SmartTable.desktop").exists():
        shutil.copy("../SmartTable.desktop", appdir / "usr" / "share" / "applications/")
    
    print("[INFO] Структура AppDir создана")
    
    # Собираем с PyInstaller
    cmd = [
        "python3", "-m", "PyInstaller",
        "--onefile",
        "--name=SmartTable",
        "--add-data=../assets:assets",
        "--add-data=../templates:templates",
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
        "../main.py",
    ]
    
    if not run_command(cmd, "Сборка с помощью PyInstaller"):
        return False
    
    # Копируем исполняемый файл в AppDir
    if Path("dist/SmartTable").exists():
        shutil.copy("dist/SmartTable", appdir / "usr" / "bin/")
        print("[OK] Исполняемый файл скопирован в AppDir")
    
    # Создаём AppRun скрипт
    apprun = appdir / "AppRun"
    apprun.write_text("#!/bin/bash\nexec \"$(dirname \"$0\")\"/usr/bin/SmartTable \"$@\"\n")
    os.chmod(apprun, 0o755)
    print("[OK] AppRun скрипт создан")
    
    # Создаём AppImage
    print("\n[INFO] Создание AppImage...")
    if not check_appimage_tool():
        print("[ERROR] Не удалось получить appimagetool")
        return False
    
    appimage_tool = Path("appimagetool")
    cmd = [str(appimage_tool), str(appdir), "SmartTable.AppImage"]
    if not run_command(cmd, "Создание AppImage"):
        return False
    
    # Копируем в dist
    dist_dir = Path("../linux")
    dist_dir.mkdir(exist_ok=True)
    if Path("SmartTable.AppImage").exists():
        shutil.copy("SmartTable.AppImage", dist_dir / "SmartTable.AppImage")
        os.chmod(dist_dir / "SmartTable.AppImage", 0o755)
        print("[OK] AppImage скопирован в linux/")
    
    os.chdir("../../..")
    return True

def main():
    """Основная функция"""
    current_os = platform.system()
    print("=" * 60)
    print(f"SmartTable - Сборка для Linux (AppImage) | OS: {current_os}")
    print("=" * 60)
    
    # Предупреждение если не Linux
    if current_os != "Linux":
        print(f"\n[WARNING] Этот скрипт предназначен для Linux!")
        print(f"[WARNING] Текущая ОС: {current_os}")
        print("[WARNING] AppImage сборка будет пропущена")
        print("[INFO] Для сборки Windows EXE используйте: python build_exe.py")
        print("[INFO] Для сборки macOS используйте: python build_macos.py")
        return
    
    # Проверяем Python
    if not check_python():
        sys.exit(1)
    
    # Очищаем старые сборки
    cleanup()
    
    # Устанавливаем зависимости
    if not install_dependencies():
        print("\n[ERROR] Не удалось установить зависимости!")
        sys.exit(1)
    
    # Собираем AppImage
    if not build_appimage():
        print("\n[ERROR] Не удалось собрать AppImage!")
        sys.exit(1)
    
    # Финальное сообщение
    print("\n" + "=" * 60)
    print("[SUCCESS] Сборка завершена!")
    print("=" * 60)
    print("\nРезультаты в папке 'linux/':")
    print("  ✅ linux/SmartTable.AppImage - портативное приложение")
    print("\nДля запуска:")
    print("  chmod +x linux/SmartTable.AppImage")
    print("  ./linux/SmartTable.AppImage")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
