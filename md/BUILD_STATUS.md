# SmartTable Build Status - Статус сборок

## ✅ Статус подготовки к сборке

### Исправлены скрипты:
- ✅ **build_exe.py** (Windows) - Обновлён, параметр `--buildpath` исправлен на `--workpath`
- ✅ **build_macos.sh** (macOS) - Готов, все 6 новых экспортеров добавлены
- ✅ **build_appimage.sh** (Linux) - Готов, все 6 новых экспортеров добавлены
- ✅ **requirements.txt** - Обновлён, добавлен `odfpy>=1.4.1`

### Новые экспортеры добавлены в сборки:
```
--hidden-import=pysheets.src.io.odt_export
--hidden-import=pysheets.src.io.print_handler
--hidden-import=pysheets.src.io.json_export        ← НОВОЕ
--hidden-import=pysheets.src.io.html_export        ← НОВОЕ
--hidden-import=pysheets.src.io.xml_export         ← НОВОЕ
--hidden-import=pysheets.src.io.markdown_export    ← НОВОЕ
--hidden-import=pysheets.src.io.sql_export         ← НОВОЕ
--hidden-import=pysheets.src.io.text_export        ← НОВОЕ
```

---

## 🍎 macOS Сборка

### Быстрый старт:
```bash
cd pysheets
source .venv/bin/activate  # или просто работайте с системным Python
bash build_macos.sh
```

**Ожидаемый результат:**
- ✅ `dist/SmartTable.app` - готовое приложение
- ✅ `dist/SmartTable.dmg` - инсталлятор

**Время сборки:** ~5-10 минут

**Требования:**
- Python 3.8+
- PyQt5 >= 5.15.9
- Все пакеты из requirements.txt

---

## 🐧 Linux Сборка

### Быстрый старт:
```bash
# Установка системных зависимостей (Ubuntu/Debian)
sudo apt-get install python3-dev python3-venv libqt5gui5 libqt5core5a libqt5widgets5 wget fuse libfuse2

cd pysheets
source .venv/bin/activate
bash build_appimage.sh
```

**Ожидаемый результат:**
- ✅ `dist/SmartTable.AppImage` - портативное приложение

**Время сборки:** ~8-15 минут

**Требования:**
- Python 3.8+
- PyQt5 >= 5.15.9
- FUSE2 (для AppImage)
- Все пакеты из requirements.txt

---

## 💻 Windows Сборка (готово для позже)

### Быстрый старт:
```cmd
cd pysheets
.\.venv\Scripts\python build_exe.py --clean
```

**Ожидаемый результат:**
- ✅ `dist/SmartTable.exe` - готовое приложение

**Время сборки:** ~5-10 минут

---

## 📦 Все 11 форматов экспорта включены

| # | Формат | Модуль | Тип | Статус |
|---|--------|--------|-----|--------|
| 1 | Excel | `excel_export.py` | Встроенный | ✅ |
| 2 | CSV | `csv_handler.py` | Встроенный | ✅ |
| 3 | PDF | `print_handler.py` | Встроенный | ✅ |
| 4 | PNG | (встроено в UI) | Встроенный | ✅ |
| 5 | ODT | `odt_export.py` | Встроенный | ✅ |
| 6 | JSON | `json_export.py` | **НОВОЕ** | ✅ |
| 7 | HTML | `html_export.py` | **НОВОЕ** | ✅ |
| 8 | XML | `xml_export.py` | **НОВОЕ** | ✅ |
| 9 | Markdown | `markdown_export.py` | **НОВОЕ** | ✅ |
| 10 | SQL | `sql_export.py` | **НОВОЕ** | ✅ |
| 11 | Text | `text_export.py` | **НОВОЕ** | ✅ |

---

## 🔍 Проверка готовности

### macOS (на Mac):
```bash
# 1. Проверить Python
python3 --version  # должен быть 3.8+

# 2. Перейти в папку
cd pysheets

# 3. Создать/активировать venv
python3 -m venv .venv
source .venv/bin/activate

# 4. Установить зависимости
pip install -r requirements.txt
pip install pyinstaller

# 5. Запустить сборку
bash build_macos.sh

# 6. Проверить результат
ls -la dist/SmartTable.app
open dist/SmartTable.app
```

### Linux (на Linux):
```bash
# 1. Установить системные пакеты
sudo apt-get update
sudo apt-get install python3-dev python3-venv libqt5gui5 libqt5core5a libqt5widgets5 wget fuse libfuse2

# 2. Проверить Python
python3 --version  # должен быть 3.8+

# 3. Перейти в папку
cd pysheets

# 4. Создать/активировать venv
python3 -m venv .venv
source .venv/bin/activate

# 5. Установить зависимости
pip install -r requirements.txt
pip install pyinstaller

# 6. Запустить сборку
chmod +x build_appimage.sh
bash build_appimage.sh

# 7. Проверить результат
ls -la dist/SmartTable.AppImage
chmod +x dist/SmartTable.AppImage
./dist/SmartTable.AppImage
```

---

## 📝 Файлы конфигурации сборок

### build_macos.sh
- ✅ Скрипт содержит проверку Python3
- ✅ Автоматически создаёт папку dist
- ✅ Все импорты добавлены
- ✅ Создаёт Info.plist для правильной работы на macOS
- ✅ Генерирует DMG архив для распространения

### build_appimage.sh
- ✅ Скрипт содержит проверку Python3
- ✅ Скачивает appimagetool при необходимости
- ✅ Все импорты добавлены
- ✅ Создаёт корректную структуру AppDir
- ✅ Генерирует портативный AppImage

### requirements.txt
- ✅ PyQt5>=5.15.9
- ✅ pandas>=2.0.3
- ✅ openpyxl>=3.1.2
- ✅ numpy>=1.24.3
- ✅ pyperclip>=1.8.2
- ✅ requests>=2.31.0
- ✅ odfpy>=1.4.1 (для ODT экспорта)

---

## 🎯 Следующие шаги

### Для macOS:
1. Скопировать проект на Mac машину
2. Запустить: `cd pysheets && bash build_macos.sh`
3. Результат: `dist/SmartTable.app` и `dist/SmartTable.dmg`

### Для Linux:
1. Запустить на Linux машине или VM:
2. Установить системные зависимости
3. Запустить: `cd pysheets && bash build_appimage.sh`
4. Результат: `dist/SmartTable.AppImage`

### Для Windows (позже):
1. На Windows машине запустить:
2. `cd pysheets && python build_exe.py --clean`
3. Результат: `dist/SmartTable.exe`

---

## ✨ Статус проекта

**Завершено:**
- ✅ 11 форматов экспорта реализовано и интегрировано
- ✅ Все сборочные скрипты обновлены для всех ОС
- ✅ requirements.txt актуален
- ✅ Документация готова
- ✅ Основные компоненты протестированы

**Статус готовности:**
- 🟢 **ГОТОВО** - Windows EXE (тестирование на Windows)
- 🟢 **ГОТОВО** - macOS APP (тестирование на Mac)
- 🟢 **ГОТОВО** - Linux AppImage (тестирование на Linux)

---

*Документ обновлен: 2026-02-03*
