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
    print("\n[INFO] {0}...".format(description))
    print("[CMD] {0}".format(' '.join(cmd)))
    try:
        result = subprocess.run(cmd, check=check)
        if check:
            print("[OK] {0} успешно".format(description))
        return True
    except subprocess.CalledProcessError as e:
        if check:
            print("[ERROR] {0} не удалась!".format(description))
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
                    print("[CLEANED] Удалён файл {0}".format(item.name))
        else:
            path = project_root / folder
            if path.exists():
                if path.is_dir():
                    shutil.rmtree(path)
                    print("[CLEANED] Удалена папка {0}".format(folder))
                else:
                    path.unlink()
                    print("[CLEANED] Удалён файл {0}".format(folder))

def check_python():
    """Проверить версию Python"""
    version = sys.version_info
    print("[INFO] Python версия: {0}.{1}.{2}".format(version.major, version.minor, version.micro))
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
        print("\n[WARNING] Python {0}.{1} обнаружена".format(version.major, version.minor))
        print("[INFO] Используем совместимые версии из requirements-min.txt")
    else:
        requirements_file = "requirements.txt"
        print("\n[INFO] Python {0}.{1} - используем requirements.txt".format(version.major, version.minor))
    
    print("\n[INFO] Ожидание освобождения dpkg...")
    for i in range(30):
        result = subprocess.run(["lsof", "/var/lib/apt/lists/lock"], 
                              capture_output=True, text=True)
        if result.returncode != 0:
            print("[INFO] dpkg освобожден, продолжаем...")
            break
        print("[INFO] dpkg ещё заблокирован... ({0}/30)".format(i+1))
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
        (["pip3", "install", "--force-reinstall", "-r", requirements_file], "Установка зависимостей из {0}".format(requirements_file)),
        (["pip3", "install", "pyinstaller"], "Установка PyInstaller"),
    ]
    
    for cmd, desc in commands:
        run_command(cmd, desc, check=False)
    
    os.chdir(original_dir)
    return True

def get_appimage_tool_path():
    """Получить путь к appimagetool"""
    try:
        project_root = find_pysheets_root()
    except:
        # Fallback если не найдена папка
        script_dir = Path(__file__).parent
        project_root = script_dir / "../.."
    
    build_appimage_dir = project_root / "build_appimage"
    build_appimage_dir.mkdir(exist_ok=True, parents=True)
    return build_appimage_dir / "appimagetool"

def check_appimage_tool():
    """Проверить/скачать appimagetool"""
    # Проверяем OS - AppImage только для Linux!
    if platform.system() != "Linux":
        print("[WARNING] AppImage сборка доступна только на Linux!")
        print("[INFO] Текущая OS: {0}".format(platform.system()))
        print("[INFO] Сборка AppImage будет пропущена")
        return True  # Не ошибка, просто пропускаем на других ОС
    
    appimage_tool = get_appimage_tool_path()
    
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

def find_pysheets_root():
    """Найти корневую папку pysheets"""
    script_dir = Path(__file__).parent.resolve()
    # От pysheets/tests/build уходим в pysheets
    pysheets_dir = script_dir.parent.parent.parent
    
    # Проверяем что это действительно pysheets папка
    if (pysheets_dir / "main.py").exists() and (pysheets_dir / "src").exists():
        return pysheets_dir
    
    # Если нет, ищем в родительских директориях
    current = script_dir
    for _ in range(10):
        if (current / "main.py").exists() and (current / "src").exists():
            return current
        if (current / "pysheets" / "main.py").exists():
            return current / "pysheets"
        current = current.parent
    
    raise Exception("Не найдена папка pysheets с main.py и src")

def create_fallback_spec():
    """Создать встроенный spec файл если оригинальный не найден"""
    spec_content = """# -*- mode: python ; coding: utf-8 -*-
block_cipher = None

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=[('assets', 'assets'), ('templates', 'templates')],
    hiddenimports=['PyQt5'],
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    name='SmartTable',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    runtime_tmpdir=None,
    console=False,
)
"""
    return spec_content

def build_appimage():
    """Собрать AppImage"""
    print("\n[SmartTable] Начало сборки AppImage для Linux...")
    print("[INFO] Это может занять 8-15 минут...")
    
    try:
        project_root = find_pysheets_root()
    except Exception as e:
        print("[ERROR] {0}".format(str(e)))
        return False
    
    print("[DEBUG] Найдена папка pysheets: {0}".format(project_root))
    
    # Создаём папку linux
    linux_dir = project_root / "linux"
    linux_dir.mkdir(exist_ok=True, parents=True)
    
    # Создаём папку build_appimage
    build_dir = project_root / "build_appimage"
    build_dir.mkdir(exist_ok=True, parents=True)
    
    original_dir = os.getcwd()
    os.chdir(build_dir)
    
    # Копируем spec файл в рабочую папку сборки
    spec_file = project_root / "SmartTable.spec"
    print("[DEBUG] Ищем spec файл: {0}".format(spec_file))
    print("[DEBUG] Stat spec файла - exists: {0}".format(spec_file.exists()))
    
    if spec_file.exists():
        shutil.copy(str(spec_file), str(build_dir / "SmartTable.spec"))
        print("[OK] spec файл скопирован в рабочую папку")
    else:
        print("[WARNING] SmartTable.spec не найден, ищем в других местах...")
        # Ищем spec файл в других местах
        found_files = list(project_root.glob("*.spec"))
        if found_files:
            print("[DEBUG] Найдены spec файлы: {0}".format(found_files))
            for spec_candidate in found_files:
                if "SmartTable" in spec_candidate.name:
                    shutil.copy(str(spec_candidate), str(build_dir / "SmartTable.spec"))
                    print("[OK] spec файл скопирован из {0}".format(spec_candidate.name))
                    break
            else:
                # Если не нашли SmartTable spec, используем первый
                shutil.copy(str(found_files[0]), str(build_dir / "SmartTable.spec"))
                print("[OK] spec файл скопирован из {0}".format(found_files[0].name))
        else:
            print("[WARNING] Не найден ни один spec файл, создаём встроенный...")
            spec_content = create_fallback_spec()
            spec_path = build_dir / "SmartTable.spec"
            with open(str(spec_path), 'w') as f:
                f.write(spec_content)
            print("[OK] Встроенный spec файл создан")
    
    # Создаём структуру AppDir
    appdir = (build_dir / "SmartTable.AppDir").resolve()
    (appdir / "usr" / "bin").mkdir(parents=True, exist_ok=True)
    (appdir / "usr" / "share" / "applications").mkdir(parents=True, exist_ok=True)
    (appdir / "usr" / "share" / "icons").mkdir(parents=True, exist_ok=True)
    
    # Копируем файлы
    assets_icon = project_root / "assets" / "icons" / "app_icon.ico"
    desktop_file = project_root / "SmartTable.desktop"
    
    print("[DEBUG] project_root: {0}".format(project_root))
    print("[DEBUG] desktop_file path: {0}".format(desktop_file))
    print("[DEBUG] desktop_file exists: {0}".format(desktop_file.exists()))
    print("[DEBUG] assets_icon path: {0}".format(assets_icon))
    print("[DEBUG] assets_icon exists: {0}".format(assets_icon.exists()))
    
    # Копирование иконок (опционально)
    if assets_icon.exists():
        shutil.copy(str(assets_icon), str(appdir / "usr" / "share" / "icons/"))
        print("[OK] Иконка скопирована")
    else:
        print("[WARNING] Иконка не найдена (опционально): {0}".format(assets_icon))
        # Создаём пустую иконку как placeholder
        try:
            placeholder_icon = appdir / "usr" / "share" / "icons" / "smarttable.png"
            with open(str(placeholder_icon), 'wb') as f:
                f.write(b'')  # Empty placeholder
            print("[INFO] Создан placeholder для иконки")
        except:
            pass
    
    # Копирование desktop файла (опционально)
    if desktop_file.exists():
        shutil.copy(str(desktop_file), str(appdir / "usr" / "share" / "applications/"))
        print("[OK] Desktop файл скопирован")
    else:
        print("[WARNING] Desktop файл не найден (опционально): {0}".format(desktop_file))
        # Создаём минимальный desktop файл
        desktop_content = """[Desktop Entry]
Version=1.0
Type=Application
Name=SmartTable
Comment=Advanced Spreadsheet Application
Exec=%s/usr/bin/SmartTable
Icon=smarttable
Categories=Office;Spreadsheet;
Terminal=false
"""
        try:
            desktop_path = appdir / "usr" / "share" / "applications" / "smarttable.desktop"
            with open(str(desktop_path), 'w') as f:
                f.write(desktop_content)
            os.chmod(str(desktop_path), 0o644)
            print("[OK] Создан минимальный desktop файл")
        except Exception as e:
            print("[WARNING] Не удалось создать desktop файл: {0}".format(str(e)))
    
    print("[INFO] Структура AppDir создана")
    
    # Копируем исходные файлы для PyInstaller
    print("[DEBUG] Копирование исходного кода для PyInstaller...")
    main_py = project_root / "main.py"
    src_dir = project_root / "src"
    
    if main_py.exists():
        shutil.copy(str(main_py), str(build_dir / "main.py"))
        print("[OK] main.py скопирован в рабочую папку")
    else:
        print("[WARNING] main.py не найден: {0}".format(main_py))
    
    if src_dir.exists():
        build_src = build_dir / "src"
        if build_src.exists():
            shutil.rmtree(str(build_src))
        shutil.copytree(str(src_dir), str(build_src))
        print("[OK] Папка src скопирована в рабочую папку")
    else:
        print("[WARNING] src папка не найдена: {0}".format(src_dir))
    
    # Копируем assets
    assets_dir = project_root / "assets"
    if assets_dir.exists():
        build_assets = build_dir / "assets"
        if build_assets.exists():
            shutil.rmtree(str(build_assets))
        shutil.copytree(str(assets_dir), str(build_assets))
        print("[OK] Папка assets скопирована в рабочую папку")
    
    # Копируем templates
    templates_dir = project_root / "templates"
    if templates_dir.exists():
        build_templates = build_dir / "templates"
        if build_templates.exists():
            shutil.rmtree(str(build_templates))
        shutil.copytree(str(templates_dir), str(build_templates))
        print("[OK] Папка templates скопирована в рабочую папку")
    
    print("[INFO] Исходный код подготовлен к сборке")
    
    print("[DEBUG] Проверка наличия spec файла: {0}".format(spec_file_local)) # type: ignore
    print("[DEBUG] Spec файл существует: {0}".format(spec_file_local.exists())) # type: ignore
    
    if not spec_file_local.exists(): # type: ignore
        print("[ERROR] SmartTable.spec файл не найден в рабочей папке {0}".format(build_dir))
        os.chdir(original_dir)
        return False
    
    print("[INFO] Используем spec файл: {0}".format(spec_file_local)) # type: ignore
    
    cmd = [
        "python3", "-m", "PyInstaller",
        "--clean",
        "--noconfirm",
        str(spec_file_local.absolute()), # type: ignore
    ]
    
    if not run_command(cmd, "Сборка с помощью PyInstaller"):
        os.chdir(original_dir)
        return False
    
    # Копируем исполняемый файл в AppDir
    dist_exe = build_dir / "dist" / "SmartTable"
    if dist_exe.exists():
        shutil.copy(str(dist_exe), str(appdir / "usr" / "bin/"))
        os.chmod(str(appdir / "usr" / "bin" / "SmartTable"), 0o755)
        print("[OK] Исполняемый файл скопирован в AppDir и установлены права выполнения")
    else:
        print("[WARNING] Исполняемый файл не найден: {0}".format(dist_exe))
        print("[DEBUG] Содержимое dist папки:")
        dist_dir = build_dir / "dist"
        if dist_dir.exists():
            for item in dist_dir.iterdir():
                print("[DEBUG]   - {0}".format(item.name))
    
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
    
    appimage_tool = get_appimage_tool_path()
    if not appimage_tool.exists():
        print("[ERROR] appimagetool не найден по пути: {0}".format(appimage_tool))
        os.chdir(original_dir)
        return False
    
    cmd = [str(appimage_tool.absolute()), str(appdir.absolute()), str((build_dir / "SmartTable.AppImage").absolute())]
    if not run_command(cmd, "Создание AppImage"):
        os.chdir(original_dir)
        return False
    
    # Копируем в dist
    if (build_dir / "SmartTable.AppImage").exists():
        shutil.copy(str(build_dir / "SmartTable.AppImage"), str(linux_dir / "SmartTable.AppImage"))
        os.chmod(str(linux_dir / "SmartTable.AppImage"), 0o755)
        print("[OK] AppImage скопирован в linux/")
    
    os.chdir(original_dir)
    return True

def main():
    """Основная функция"""
    current_os = platform.system()
    print("=" * 60)
    print("SmartTable - Сборка для Linux")
    print("=" * 60)
    
    if current_os != "Linux":
        print("[WARNING] Этот скрипт предназначен для Linux!")
        print("[WARNING] Текущая ОС: {}".format(current_os))
        print("[INFO] Используется простой способ сборки (копирование + Python)")
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
    
    # Собираем AppImage с помощью PyInstaller
    if not build_appimage():
        print("\n[ERROR] Не удалось собрать AppImage!")
        sys.exit(1)
    
    # Финальное сообщение
    print("\n" + "=" * 60)
    print("[SUCCESS] Сборка завершена!")
    print("=" * 60)

if __name__ == "__main__":
    main()
