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
    # Переходим в папку pysheets чтобы найти requirements.txt
    original_dir = os.getcwd()
    os.chdir(Path(__file__).parent / "../..")
    
    # Сначала скачиваем и устанавливаем pip для Python 3.13
    print("\n[INFO] Скачивание get-pip.py для установки pip в Python 3.13...")
    
    # Скачиваем get-pip.py
    get_pip_path = "/tmp/get-pip.py"
    download_cmd = ["wget", "https://bootstrap.pypa.io/get-pip.py", "-O", get_pip_path]
    if not run_command(download_cmd, "Скачивание get-pip.py", check=False):
        # Если wget не работает, попробуем curl
        print("[INFO] Пробуем curl...")
        download_cmd = ["curl", "https://bootstrap.pypa.io/get-pip.py", "-o", get_pip_path]
        run_command(download_cmd, "Скачивание get-pip.py через curl", check=False)
    
    # Устанавливаем pip
    if Path(get_pip_path).exists():
        install_pip_cmd = ["python3.13", get_pip_path]
        run_command(install_pip_cmd, "Установка pip в Python 3.13")
    
    commands = [
        (["python3.13", "-m", "pip", "install", "--upgrade", "pip"], "Обновление pip"),
        (["python3.13", "-m", "pip", "install", "-r", "requirements.txt"], "Установка зависимостей"),
        (["python3.13", "-m", "pip", "install", "pyinstaller"], "Установка PyInstaller"),
    ]
    
    result = True
    for cmd, desc in commands:
        if not run_command(cmd, desc):
            result = False
            break
    
    os.chdir(original_dir)
    return result

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
    
    # Собираем с PyInstaller
    main_py = project_root / "main.py"
    cmd = [
        "python3.13", "-m", "PyInstaller",
        "--onefile",
        "--name=SmartTable",
        f"--add-data={project_root / 'assets'}:assets",
        f"--add-data={project_root / 'templates'}:templates",
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
