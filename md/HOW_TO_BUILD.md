# Как собирать SmartTable на разных ОС

## 💻 Windows

**На машине с Windows:**

### Способ 1: Используя batch скрипт (рекомендуется)
```cmd
cd pysheets
build_exe.bat
```

### Способ 2: Вручную через PowerShell
```powershell
cd pysheets
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m pip install pyinstaller
python build_exe.py --clean
```

**Результат:** `dist/SmartTable.exe`

---

## 🍎 macOS

**На машине с macOS:**

```bash
cd pysheets

# Активируем venv если нужно
python3 -m venv .venv
source .venv/bin/activate

# Устанавливаем зависимости
pip install -r requirements.txt
pip install pyinstaller

# Запускаем сборку
bash build_macos.sh
```

**Результат:** 
- `dist/SmartTable.app` - приложение
- `dist/SmartTable.dmg` - инсталлятор

---

## 🐧 Linux

**На машине с Linux (Ubuntu/Debian):**

```bash
# Сначала установим системные зависимости
sudo apt-get update
sudo apt-get install -y python3-dev python3-venv libqt5gui5 libqt5core5a libqt5widgets5 wget fuse libfuse2

cd pysheets

# Активируем venv
python3 -m venv .venv
source .venv/bin/activate

# Устанавливаем зависимости
pip install -r requirements.txt
pip install pyinstaller

# Запускаем сборку
chmod +x build_appimage.sh
bash build_appimage.sh
```

**Результат:** `dist/SmartTable.AppImage`

---

## ⚠️ ВАЖНО!

- **build_macos.sh** работает ТОЛЬКО на macOS
- **build_appimage.sh** работает ТОЛЬКО на Linux
- **build_exe.bat** и **build_exe.py** работают на Windows

Скрипты привязаны к ОС, поэтому копируйте проект на соответствующую машину перед сборкой.

---

## 🔄 Если у вас есть WSL на Windows

Можно собирать Linux версию через WSL:

```bash
# В WSL терминале
cd /mnt/c/Users/pasaz/PythonProjects/SmartTable/pysheets

# Установить зависимости
sudo apt-get install python3-venv libqt5gui5 libqt5core5a libqt5widgets5 wget fuse libfuse2
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Собрать
bash build_appimage.sh
```

---

## 📋 Чек-лист перед сборкой

### Windows (build_exe.bat):
- [ ] Находитесь в папке `pysheets`
- [ ] Python 3.8+ установлен: `python --version`
- [ ] Интернет подключен (скачивает зависимости)
- [ ] Хватает свободного места (~3-5 GB для сборки)

### macOS (build_macos.sh):
- [ ] Находитесь в папке `pysheets`
- [ ] Python 3.8+ установлен: `python3 --version`
- [ ] Интернет подключен
- [ ] Хватает свободного места (~3-5 GB для сборки)

### Linux (build_appimage.sh):
- [ ] Находитесь в папке `pysheets`
- [ ] Python 3.8+ установлен: `python3 --version`
- [ ] Systemные пакеты установлены (Qt5, fuse)
- [ ] Интернет подключен
- [ ] Хватает свободного места (~3-5 GB для сборки)

---

## 🚀 Быстрый старт

### Вариант 1: Собрать только на той ОС где разрабатываете
```bash
# Windows: просто запустить build_exe.bat
# macOS: просто запустить bash build_macos.sh
# Linux: просто запустить bash build_appimage.sh
```

### Вариант 2: Собрать все три версии
1. На Windows запустить `build_exe.bat` → получить exe
2. На Mac запустить `bash build_macos.sh` → получить app/dmg
3. На Linux запустить `bash build_appimage.sh` → получить AppImage

---

## 🎯 Что входит в каждую сборку

Все три версии содержат:
- ✅ Основное приложение SmartTable
- ✅ Все 11 форматов экспорта (Excel, CSV, PDF, PNG, ODT, JSON, HTML, XML, Markdown, SQL, Text)
- ✅ Все шаблоны таблиц
- ✅ Русский интерфейс
- ✅ Все инструменты и функции

---

## 📞 Помощь при проблемах

### "command not found: pip"
- **Windows**: используйте `python -m pip`
- **macOS/Linux**: используйте `pip3` вместо `pip`

### "No such file or directory"
- Убедитесь что находитесь в папке `pysheets`
- Проверьте пути в скрипте сборки

### "Module not found"
- Переустановите зависимости: `pip install --force-reinstall -r requirements.txt`
- Убедитесь что venv активирован

### На Windows: "build_exe.bat не запускается"
- Скопируйте файл в папку `pysheets` если его там нет
- Запустите PowerShell как администратор
- Выполните: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

---

*Обновлено: 2026-02-03*
