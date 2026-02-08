@echo off
REM build_exe.bat - Быстрая сборка SmartTable для Windows

echo [SmartTable] Сборка exe для Windows...

REM Проверяем Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python не найден в PATH!
    echo Пожалуйста установите Python 3.8+ или активируйте venv
    pause
    exit /b 1
)

echo [INFO] Активация виртуального окружения...
if exist ".\.venv\Scripts\activate.bat" (
    call .\.venv\Scripts\activate.bat
) else (
    echo [WARNING] .venv не найден, используем системный Python
)

echo [INFO] Установка/обновление зависимостей...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pip install pyinstaller

echo [INFO] Очистка старых сборок...
if exist "dist" rmdir /s /q dist
if exist "build" rmdir /s /q build
if exist "SmartTable.spec" del SmartTable.spec

echo [INFO] Сборка с помощью PyInstaller...
python build_exe.py

if errorlevel 1 (
    echo [ERROR] Сборка не удалась!
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Сборка завершена!
echo [INFO] Exe-файл находится в: dist\SmartTable.exe
echo.
pause
