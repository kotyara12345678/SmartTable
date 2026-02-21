#!/usr/bin/env python3
"""
Простой скрипт сборки AppImage для SmartTable
Использует Python интерпретатор прямо в AppImage без PyInstaller
"""

import os
import sys
import shutil
import subprocess
import platform
from pathlib import Path


def run_command(cmd, description, check=True):
    """Выполнить команду и вывести результат"""
    print("\n[INFO] {}...".format(description))
    print("[CMD] {}".format(' '.join(cmd)))
    try:
        result = subprocess.run(cmd, check=check)
        if check:
            print("[OK] {} успешно".format(description))
        return True
    except subprocess.CalledProcessError as e:
        if check:
            print("[ERROR] {} не удалась!".format(description))
        return False


def cleanup():
    """Очистить старые сборки"""
    print("[INFO] Очистка старых сборок...")
    folders = ['dist', 'build', 'build_appimage', '__pycache__']
    
    script_dir = Path(__file__).parent
    project_root = script_dir / "../.."
    
    for folder in folders:
        path = project_root / folder
        if path.exists():
            if path.is_dir():
                shutil.rmtree(path)
                print("[CLEANED] Удалена папка {}".format(folder))


def build_appimage_simple():
    """Собрать AppImage простым способом - копируем Python и приложение"""
    print("\n[SmartTable] Начало сборки AppImage для Linux (простой способ)...")
    
    script_dir = Path(__file__).parent
    project_root = script_dir / "../.."
    pysheets_root = project_root.parent
    
    linux_dir = pysheets_root / "pysheets" / "linux"
    linux_dir.mkdir(exist_ok=True, parents=True)
    
    build_dir = pysheets_root / "pysheets" / "build_appimage"
    build_dir.mkdir(exist_ok=True, parents=True)
    
    original_dir = os.getcwd()
    os.chdir(build_dir)
    
    # Создаём структуру AppDir
    appdir = Path("SmartTable.AppDir")
    (appdir / "usr" / "bin").mkdir(parents=True, exist_ok=True)
    (appdir / "usr" / "share" / "applications").mkdir(parents=True, exist_ok=True)
    (appdir / "usr" / "share" / "icons").mkdir(parents=True, exist_ok=True)
    
    print("[INFO] Структура AppDir создана")
    
    # Копируем само приложение
    app_src = project_root
    app_dst = appdir / "usr" / "share" / "smarttable"
    if app_dst.exists():
        shutil.rmtree(app_dst)
    shutil.copytree(app_src, app_dst, ignore=shutil.ignore_patterns('*.pyc', '__pycache__', 'build*', 'dist'))
    print("[OK] Приложение скопировано в AppDir")
    
    # Копируем иконки
    assets_icon = project_root / "assets" / "icons" / "app_icon.ico"
    if assets_icon.exists():
        shutil.copy(str(assets_icon), str(appdir / "usr" / "share" / "icons/"))
    
    # Копируем desktop файл
    desktop_file = project_root / "SmartTable.desktop"
    if desktop_file.exists():
        shutil.copy(str(desktop_file), str(appdir / "usr" / "share" / "applications/"))
    
    # Создаём запускаемый скрипт
    launcher = appdir / "usr" / "bin" / "smarttable"
    launcher_content = '''#!/bin/bash
cd "$(dirname "$0")"
exec python3 /usr/share/smarttable/main.py "$@"
'''
    launcher.write_text(launcher_content)
    os.chmod(launcher, 0o755)
    print("[OK] Launcher скрипт создан")
    
    # Создаём AppRun скрипт
    apprun = appdir / "AppRun"
    apprun_content = '''#!/bin/bash
exec "$(dirname "$0")"/usr/bin/smarttable "$@"
'''
    apprun.write_text(apprun_content)
    os.chmod(apprun, 0o755)
    print("[OK] AppRun скрипт создан")
    
    # Скачиваем и используем appimagetool
    print("\n[INFO] Проверяем appimagetool...")
    
    if not Path("appimagetool").exists():
        print("[INFO] Скачивание appimagetool...")
        url = "https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage"
        run_command(["wget", "-q", url, "-O", "appimagetool"], "Скачивание appimagetool", check=False)
        if not run_command(["chmod", "+x", "appimagetool"], "Установка прав на appimagetool"):
            print("[ERROR] Не удалось подготовить appimagetool")
            os.chdir(original_dir)
            return False
    
    # Создаём AppImage
    print("\n[INFO] Создание AppImage...")
    if not run_command(["./appimagetool", str(appdir), "SmartTable.AppImage"], "Создание AppImage"):
        os.chdir(original_dir)
        return False
    
    # Копируем в папку linux
    if Path("SmartTable.AppImage").exists():
        shutil.copy("SmartTable.AppImage", str(linux_dir / "SmartTable.AppImage"))
        os.chmod(str(linux_dir / "SmartTable.AppImage"), 0o755)
        print("[OK] AppImage скопирован в linux/")
    
    os.chdir(original_dir)
    return True


def main():
    """Основная функция"""
    current_os = platform.system()
    print("=" * 60)
    print("SmartTable - Сборка для Linux (AppImage - простой способ)")
    print("=" * 60)
    
    if current_os != "Linux":
        print("[WARNING] Этот скрипт предназначен для Linux!")
        print("[WARNING] Текущая ОС: {}".format(current_os))
        return
    
    # Очищаем старые сборки
    cleanup()
    
    # Устанавливаем зависимости
    print("\n[INFO] Проверка зависимостей...")
    run_command(["apt-get", "update"], "Обновление apt", check=False)
    run_command(["apt-get", "install", "-y", "--no-install-recommends", "python3-pip"], "Установка pip", check=False)
    run_command(["apt-get", "install", "-y", "--no-install-recommends", "python3-pyqt5"], "Установка PyQt5", check=False)
    run_command(["pip3", "install", "-r", "pysheets/requirements.txt"], "Установка зависимостей", check=False)
    
    # Собираем AppImage
    if not build_appimage_simple():
        print("\n[ERROR] Не удалось собрать AppImage!")
        sys.exit(1)
    
    # Финальное сообщение
    print("\n" + "=" * 60)
    print("[SUCCESS] Сборка завершена!")
    print("=" * 60)
    linux_path = Path(__file__).parent / "../../linux/SmartTable.AppImage"
    print("\nРезультаты в папке '{}':".format(linux_path.parent))
    print("  ✅ SmartTable.AppImage - портативное приложение")
    print("\nДля запуска:")
    print("  chmod +x SmartTable.AppImage")
    print("  ./SmartTable.AppImage")
    print("=" * 60)


if __name__ == "__main__":
    main()
