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
    folders = ['dist', 'build', 'build_appimage', '__pycache__', '*.spec', '.pyinstaller']
    
    script_dir = Path(__file__).parent
    project_root = script_dir / "../.."
    
    # Очищаем из папки построения
    for folder in folders:
        if '*' in folder:
            # Ищем файлы по маске
            for item in project_root.glob(folder):
                if item.is_file():
                    item.unlink()
                    print(f"[CLEANED] Удалён файл {item.name}")
        else:
            path = project_root / folder
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
    if version.major < 3:
        print("[ERROR] Требуется Python 3+!")
        return False
    return True

def install_dependencies():
    """Установить зависимости"""
    # Переходим в папку pysheets чтобы найти requirements.txt
    original_dir = os.getcwd()
    os.chdir(Path(__file__).parent / "../..")
    
    # Проверяем версию Python и выбираем нужный requirements
    version = sys.version_info
    if version.major == 3 and version.minor < 8:
        requirements_file = "requirements-min.txt"
        print(f"\n[WARNING] Python {version.major}.{version.minor} обнаружена")
        print("[INFO] Используем совместимые версии из requirements-min.txt")
    else:
        requirements_file = "requirements.txt"
        print(f"\n[INFO] Python {version.major}.{version.minor} - используем requirements.txt")
    
    print("\n[INFO] Ожидание освобождения dpkg...")
    for i in range(30):
        result = subprocess.run(["lsof", "/var/lib/apt/lists/lock"], 
                              capture_output=True, text=True)
        if result.returncode != 0:
            print("[INFO] dpkg освобожден, продолжаем...")
            break
        print(f"[INFO] dpkg ещё заблокирован... ({i+1}/30)")
        subprocess.run(["sleep", "2"])
    
    print("\n[INFO] Очистка pip кеша...")
    run_command(["pip3", "cache", "purge"], "Очистка pip кеша", check=False)
    
    commands = [
        (["apt-get", "update"], "Обновление apt"),
        (["apt-get", "install", "-y", "--no-install-recommends", "python3-pip"], "Установка pip"),
        (["apt-get", "install", "-y", "--no-install-recommends", "python3-venv"], "Установка venv"),
        (["apt-get", "install", "-y", "--no-install-recommends", "python3-dev"], "Установка python3-dev"),
        (["apt-get", "install", "-y", "--no-install-recommends", "libqt5gui5"], "Установка libqt5gui5"),
        (["pip3", "install", "--upgrade", "--force-reinstall", "pip"], "Обновление pip"),
        (["pip3", "install", "--force-reinstall", "-r", requirements_file], f"Установка зависимостей из {requirements_file}"),
        (["pip3", "install", "pyinstaller"], "Установка PyInstaller"),
    ]
    
    for cmd, desc in commands:
        run_command(cmd, desc, check=False)
    
    os.chdir(original_dir)
    return True

def check_appimage_tool():
    """Проверить/скачать appimagetool"""
    # Проверяем OS - AppImage только для Linux!
    if platform.system() != "Linux":
        print(f"[WARNING] AppImage сборка доступна только на Linux!")
        print(f"[INFO] Текущая OS: {platform.system()}")
        print("[INFO] Сборка AppImage будет пропущена")
        return True  # Не ошибка, просто пропускаем на других ОС
    
    script_dir = Path(__file__).parent
    build_appimage_dir = script_dir / "../../build_appimage"
    build_appimage_dir.mkdir(exist_ok=True, parents=True)
    
    appimage_tool = build_appimage_dir / "appimagetool"
    
    if appimage_tool.exists():
        print("[INFO] appimagetool уже скачан")
        return True
    
    print("\n[INFO] Скачивание appimagetool...")
    
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
    
    # Определяем базовую папку проекта
    script_dir = Path(__file__).parent
    project_root = script_dir / "../.."  # pysheets папка
    pysheets_root = project_root.parent  # SmartTable папка
    
    # Создаём папку linux
    linux_dir = pysheets_root / "pysheets" / "linux"
    linux_dir.mkdir(exist_ok=True, parents=True)
    
    # Создаём папку build_appimage
    build_dir = pysheets_root / "pysheets" / "build_appimage"
    build_dir.mkdir(exist_ok=True, parents=True)
    
    original_dir = os.getcwd()
    os.chdir(build_dir)
    
    # Создаём структуру AppDir
    appdir = Path("SmartTable.AppDir")
    (appdir / "usr" / "bin").mkdir(parents=True, exist_ok=True)
    (appdir / "usr" / "share" / "applications").mkdir(parents=True, exist_ok=True)
    (appdir / "usr" / "share" / "icons").mkdir(parents=True, exist_ok=True)
    
    # Копируем файлы
    assets_icon = project_root / "assets" / "icons" / "app_icon.ico"
    desktop_file = project_root / "SmartTable.desktop"
    
    if assets_icon.exists():
        shutil.copy(str(assets_icon), str(appdir / "usr" / "share" / "icons/"))
    if desktop_file.exists():
        shutil.copy(str(desktop_file), str(appdir / "usr" / "share" / "applications/"))
    
    print("[INFO] Структура AppDir создана")
    
    # Собираем с PyInstaller БЕЗ анализа кода
    main_py = project_root / "main.py"
    cmd = [
        "python3", "-m", "PyInstaller",
        "--onefile",
        "--windowed",
        "--noconfirm",
        "--clean",
        "--name=SmartTable",
        "--collect-all=pysheets",
        "--collect-all=PyQt5",
        str(main_py),
    ]
    
    if not run_command(cmd, "Сборка с помощью PyInstaller"):
        os.chdir(original_dir)
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
        os.chdir(original_dir)
        return False
    
    appimage_tool = Path("appimagetool")
    cmd = [str(appimage_tool), str(appdir), "SmartTable.AppImage"]
    if not run_command(cmd, "Создание AppImage"):
        os.chdir(original_dir)
        return False
    
    # Копируем в dist
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
    linux_path = Path(__file__).parent / "../../linux/SmartTable.AppImage"
    print(f"\nРезультаты в папке '{linux_path.parent}':")
    print("  ✅ SmartTable.AppImage - портативное приложение")
    print("\nДля запуска:")
    print("  chmod +x SmartTable.AppImage")
    print("  ./SmartTable.AppImage")
    print("=" * 60 + "\n")

if __name__ == "__main__":
    main()
