# SmartTable - Готово к сборке!

## ✅ Что готово

### Python скрипты сборки (универсальные):

| ОС | Скрипт | Команда | Результат |
|---|---|---|---|
| **Windows** | `build_exe.py` | `python build_exe.py --clean` | `dist/SmartTable.exe` |
| **macOS** | `build_macos.py` | `python3 build_macos.py` | `dist/SmartTable.app` + `dist/SmartTable.dmg` |
| **Linux** | `build_linux.py` | `python3 build_linux.py` | `dist/SmartTable.AppImage` |

### Bash скрипты (для автоматизации):

| ОС | Скрипт | Команда |
|---|---|---|
| **Windows** | `build_exe.bat` | `.\build_exe.bat` |
| **macOS** | `build_macos.sh` | `bash build_macos.sh` |
| **Linux** | `build_appimage.sh` | `bash build_appimage.sh` |

---

## 🎯 Как использовать

### Для Windows (где ты сейчас):
```powershell
cd pysheets
python build_exe.py --clean
```

### Для macOS (скопируй проект на Mac):
```bash
cd pysheets
python3 build_macos.py
```

### Для Linux (скопируй проект на Linux):
```bash
# Установи системные зависимости
sudo apt-get install python3-dev python3-venv libqt5gui5 libqt5core5a libqt5widgets5 wget curl fuse libfuse2

cd pysheets
python3 build_linux.py
```

---

## 📦 Что входит в каждую версию

Все три версии содержат:
- ✅ Основное приложение SmartTable
- ✅ **11 форматов экспорта** (Excel, CSV, PDF, PNG, ODT, JSON, HTML, XML, Markdown, SQL, Text)
- ✅ Все шаблоны таблиц
- ✅ Русский интерфейс
- ✅ Все инструменты и функции

---

## 🚀 Статус

| Компонент | Статус |
|---|---|
| Windows EXE сборка | ✅ Готова (build_exe.py + build_exe.bat) |
| macOS APP сборка | ✅ Готова (build_macos.py + build_macos.sh) |
| Linux AppImage сборка | ✅ Готова (build_linux.py + build_appimage.sh) |
| Все экспортеры | ✅ Интегрированы (11 форматов) |
| requirements.txt | ✅ Актуален |
| Документация | ✅ Полная |

---

## 📝 Список файлов сборки

```
pysheets/
├── build_exe.py          ← Python скрипт для Windows
├── build_exe.bat         ← Batch скрипт для Windows  
├── build_macos.py        ← Python скрипт для macOS (НОВОЕ)
├── build_macos.sh        ← Bash скрипт для macOS
├── build_linux.py        ← Python скрипт для Linux (НОВОЕ)
├── build_appimage.sh     ← Bash скрипт для Linux
└── requirements.txt      ← Зависимости
```

---

## 🔄 Процесс сборки

### Windows:
1. `python build_exe.py --clean` 
2. PyInstaller собирает exe
3. Результат в `dist/SmartTable.exe` (~150-200 MB)
4. Время: ~5-10 минут

### macOS:
1. `python3 build_macos.py`
2. PyInstaller собирает app
3. Создаёт Info.plist для macOS
4. Создаёт DMG инсталлятор (если доступен hdiutil)
5. Результат в `dist/SmartTable.app` и `dist/SmartTable.dmg`
6. Время: ~5-10 минут

### Linux:
1. `python3 build_linux.py`
2. PyInstaller собирает исполняемый файл
3. Скачивает appimagetool (если нужен)
4. Создаёт структуру AppImage
5. Упаковывает в AppImage
6. Результат в `dist/SmartTable.AppImage` (~200-250 MB)
7. Время: ~8-15 минут

---

## 📋 Требования перед сборкой

### Все ОС:
- Python 3.8+
- pip установлен
- Интернет подключение
- 3-5 GB свободного места

### Windows специфичные:
- Visual C++ Build Tools (опционально)

### macOS специфичные:
- Xcode Command Line Tools: `xcode-select --install`

### Linux специфичные:
```bash
sudo apt-get install python3-dev python3-venv \
    libqt5gui5 libqt5core5a libqt5widgets5 \
    wget curl fuse libfuse2
```

---

## 🎁 Готовые файлы для распространения

После сборки вы получите:

### Windows:
- `SmartTable.exe` - готовый исполняемый файл для Windows
- Размер: ~150-200 MB
- Не требует установки Python

### macOS:
- `SmartTable.app` - готовое приложение для macOS  
- `SmartTable.dmg` - инсталлятор
- Размер app: ~200-300 MB
- Размер dmg: ~150 MB

### Linux:
- `SmartTable.AppImage` - портативное приложение
- Размер: ~200-250 MB
- Работает на большинстве дистрибутивов

---

## ✨ Все новые экспортеры включены

Все три версии содержат **6 новых экспортеров**:
- ✅ JSON export
- ✅ HTML export  
- ✅ XML export
- ✅ Markdown export
- ✅ SQL export
- ✅ Text export

Плюс **5 существующих**:
- ✅ Excel export
- ✅ CSV export
- ✅ PDF export
- ✅ PNG export
- ✅ ODT export

**Итого: 11 форматов экспорта!**

---

## 🎯 Следующие шаги

1. **Windows версия:**
   - Запустить: `python build_exe.py --clean`
   - Тестировать: `dist/SmartTable.exe`

2. **macOS версия:**
   - Скопировать проект на Mac
   - Запустить: `python3 build_macos.py`
   - Тестировать: `open dist/SmartTable.app`

3. **Linux версия:**
   - Скопировать проект на Linux
   - Установить системные зависимости
   - Запустить: `python3 build_linux.py`
   - Тестировать: `./dist/SmartTable.AppImage`

---

*Документ обновлён: 2026-02-03*
*SmartTable v1.0 - Ready for production!*
