# Быстрая сборка SmartTable для macOS и Linux

## 📌 Предварительные требования

### Для всех ОС:
```bash
# Убедитесь что установлены:
- Python 3.8+
- Git
- pip package manager
```

---

## 🍎 macOS - Быстрая сборка (< 10 минут)

### Шаг 1: Клонируем/переходим в репозиторий
```bash
cd /path/to/SmartTable/pysheets
```

### Шаг 2: Создаём виртуальное окружение (если нет)
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### Шаг 3: Устанавливаем зависимости
```bash
pip install --upgrade pip
pip install -r requirements.txt
pip install pyinstaller
```

### Шаг 4: Запускаем сборку (просто 1 команда!)
```bash
bash build_macos.sh
```

**Результаты:**
- ✅ `dist/SmartTable.app` - готовое приложение
- ✅ `dist/SmartTable.dmg` - installer для распространения

### Запуск готового приложения:
```bash
open dist/SmartTable.app
```

**Время сборки:** ~5-10 минут в зависимости от оборудования

---

## 🐧 Linux (Ubuntu/Debian) - Быстрая сборка (< 15 минут)

### Шаг 1: Переходим в папку проекта
```bash
cd /path/to/SmartTable/pysheets
```

### Шаг 2: Устанавливаем системные зависимости
```bash
# Для Ubuntu/Debian:
sudo apt-get update
sudo apt-get install -y python3-dev python3-pip python3-venv \
    libqt5gui5 libqt5core5a libqt5widgets5 \
    wget fuse libfuse2

# Для Fedora/RHEL:
sudo dnf install -y python3-devel qt5-qtbase-devel \
    wget fuse fuse-libs
```

### Шаг 3: Создаём виртуальное окружение
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### Шаг 4: Устанавливаем зависимости Python
```bash
pip install --upgrade pip
pip install -r requirements.txt
pip install pyinstaller
```

### Шаг 5: Запускаем сборку AppImage
```bash
chmod +x build_appimage.sh
bash build_appimage.sh
```

**Результаты:**
- ✅ `dist/SmartTable.AppImage` - портативное приложение

### Запуск готового приложения:
```bash
chmod +x dist/SmartTable.AppImage
./dist/SmartTable.AppImage
```

**Время сборки:** ~8-15 минут в зависимости от оборудования

---

## 🚀 Альтернатива для Linux - быстрый старт без сборки

Если не хотите собирать, можете запустить напрямую:

```bash
cd /path/to/SmartTable/pysheets
source .venv/bin/activate
pip install -r requirements.txt
python3 main.py
```

---

## 📊 Что изменилось в сборках?

Все скрипты обновлены для поддержки **6 новых форматов экспорта:**
- ✅ JSON export
- ✅ HTML export  
- ✅ XML export
- ✅ Markdown export
- ✅ SQL export
- ✅ Text export

Все эти модули автоматически включены в финальный exe/app/AppImage.

---

## ✨ Итого доступно форматов экспорта:

| Формат | Windows EXE | macOS APP | Linux AppImage | Direct Run |
|--------|:----------:|:---------:|:--------------:|:----------:|
| Excel (.xlsx) | ✅ | ✅ | ✅ | ✅ |
| CSV | ✅ | ✅ | ✅ | ✅ |
| PDF | ✅ | ✅ | ✅ | ✅ |
| PNG | ✅ | ✅ | ✅ | ✅ |
| ODT | ✅ | ✅ | ✅ | ✅ |
| JSON | ✅ | ✅ | ✅ | ✅ |
| HTML | ✅ | ✅ | ✅ | ✅ |
| XML | ✅ | ✅ | ✅ | ✅ |
| Markdown | ✅ | ✅ | ✅ | ✅ |
| SQL | ✅ | ✅ | ✅ | ✅ |
| Text (TXT) | ✅ | ✅ | ✅ | ✅ |

---

## 🔧 Решение проблем

### macOS: "Cannot open SmartTable.app"
```bash
# Дайте прав доступа:
chmod +x dist/SmartTable.app/Contents/MacOS/SmartTable
xattr -d com.apple.quarantine dist/SmartTable.app
```

### Linux: "Permission denied" при запуске AppImage
```bash
chmod +x dist/SmartTable.AppImage
./dist/SmartTable.AppImage
```

### Общее: "ModuleNotFoundError"
```bash
# Переустановите зависимости:
pip install --force-reinstall -r requirements.txt
```

### macOS: Ошибка Qt5
```bash
# Установите Qt5 через homebrew:
brew install qt5
export PATH="/usr/local/opt/qt5/bin:$PATH"
```

---

## 📝 Структура проекта

```
SmartTable/
├── pysheets/
│   ├── main.py                 # Точка входа
│   ├── build_exe.py           # Windows сборка (Python скрипт)
│   ├── build_macos.sh         # macOS сборка (Bash скрипт) 
│   ├── build_appimage.sh      # Linux сборка (Bash скрипт)
│   ├── requirements.txt        # Зависимости
│   ├── assets/                # Ресурсы приложения
│   ├── templates/             # Шаблоны таблиц
│   ├── src/
│   │   ├── ui/               # UI компоненты
│   │   ├── core/             # Бизнес-логика
│   │   ├── io/               # Импорт/экспорт (11 форматов!)
│   │   └── utils/            # Утилиты
│   └── dist/                 # Выходные файлы сборки
├── QUICK_BUILD_GUIDE.md      # Этот файл
├── BUILD_INSTRUCTIONS.md     # Детальные инструкции
└── EXPORT_FORMATS_SUMMARY.md # Информация об экспортерах
```

---

## 🎯 Чек-лист сборки

### macOS:
- [ ] Python 3.8+ установлен: `python3 --version`
- [ ] Репозиторий клонирован/обновлён
- [ ] venv активирован: `source .venv/bin/activate`
- [ ] Зависимости установлены: `pip list | grep PyQt5`
- [ ] Скрипт исполняемый: `ls -l build_macos.sh`
- [ ] Запуск: `bash build_macos.sh`
- [ ] Результат в: `ls dist/SmartTable.app`

### Linux:
- [ ] Python 3.8+ установлен: `python3 --version`
- [ ] Системные зависимости установлены (Qt5, fuse)
- [ ] Репозиторий клонирован/обновлён
- [ ] venv активирован: `source .venv/bin/activate`
- [ ] Зависимости установлены: `pip list | grep PyQt5`
- [ ] Скрипт исполняемый: `chmod +x build_appimage.sh`
- [ ] Запуск: `bash build_appimage.sh`
- [ ] Результат в: `ls dist/SmartTable.AppImage`

---

## 📞 Помощь

Если возникли проблемы:
1. Проверьте что установлены все зависимости: `pip install -r requirements.txt`
2. Обновите PyInstaller: `pip install --upgrade pyinstaller`
3. Очистите кеш: `rm -rf build dist *.spec`
4. Попробуйте запустить прямо: `python3 main.py`

Удачной сборки! 🚀
