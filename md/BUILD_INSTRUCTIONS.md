# Инструкции по сборке SmartTable

Этот документ описывает, как собрать SmartTable для разных платформ.

## 📋 Содержание

- [Windows (EXE)](#windows-exe)
- [Linux (AppImage)](#linux-appimage)
- [macOS (APP)](#macos-app)

---

## Windows (EXE)

### Требования

- Python 3.8+
- Visual Studio Build Tools (для некоторых зависимостей)

### Сборка

1. **Активируйте виртуальное окружение:**
   ```bash
   .venv\Scripts\Activate.ps1
   ```

2. **Установите PyInstaller:**
   ```bash
   pip install pyinstaller
   ```

3. **Соберите exe:**
   ```bash
   python build_exe.py
   ```

   Или с очисткой старых сборок:
   ```bash
   python build_exe.py --clean
   ```

4. **Результат:**
   - Exe-файл: `dist/SmartTable.exe`
   - Размер: ~300-400 MB

### Тестирование

```bash
.\dist\SmartTable.exe
```

### Создание установщика (MSI) — опционально

```bash
pip install cx_Freeze
cxfreeze main.py --target-dir dist_installer
```

---

## Linux (AppImage)

### Требования

- Python 3.8+
- pip
- appimage-builder
- appimagetool (скачивается автоматически)

### Подготовка

1. **Скопируйте проект на Linux:**
   ```bash
   scp -r SmartTable/ user@linux-host:/home/user/
   ```

2. **Перейдите в директорию:**
   ```bash
   cd SmartTable/pysheets
   ```

### Сборка

1. **Дайте права на запуск скрипта:**
   ```bash
   chmod +x build_appimage.sh
   ```

2. **Запустите сборку:**
   ```bash
   ./build_appimage.sh
   ```

3. **Результат:**
   - AppImage: `dist/SmartTable.AppImage`
   - Размер: ~300-350 MB

### Тестирование

```bash
chmod +x dist/SmartTable.AppImage
./dist/SmartTable.AppImage
```

### Установка в систему

```bash
sudo cp dist/SmartTable.AppImage /usr/local/bin/smarttable
sudo chmod +x /usr/local/bin/smarttable
```

Теперь запускать можно из любой директории:
```bash
smarttable
```

### Установка в меню приложений

```bash
sudo cp SmartTable.desktop /usr/share/applications/
```

---

## macOS (APP)

### Требования

- Python 3.8+
- Xcode Command Line Tools (для сборки)
- pip

### Подготовка

1. **Установите Xcode Command Line Tools:**
   ```bash
   xcode-select --install
   ```

2. **Скопируйте проект на macOS** или клонируйте из Git.

### Сборка

1. **Перейдите в директорию:**
   ```bash
   cd SmartTable/pysheets
   ```

2. **Дайте права на запуск скрипта:**
   ```bash
   chmod +x build_macos.sh
   ```

3. **Запустите сборку:**
   ```bash
   ./build_macos.sh
   ```

4. **Результат:**
   - App bundle: `dist/SmartTable.app`
   - DMG архив: `dist/SmartTable.dmg`
   - Размер: ~350-400 MB

### Тестирование

```bash
open dist/SmartTable.app
```

### Установка

Способ 1 — Перетащить в Applications:
```bash
cp -r dist/SmartTable.app /Applications/
```

Способ 2 — Использовать DMG:
```bash
hdiutil attach dist/SmartTable.dmg
# Перетащите SmartTable.app в Applications папку
hdiutil detach /Volumes/SmartTable
```

---

## 🔧 Дополнительные опции

### Очистка

Чтобы удалить все сборки и начать заново:

**Windows:**
```bash
python build_exe.py --clean
```

**Linux/macOS:**
```bash
rm -rf dist build __pycache__ *.spec
```

### Минимизация размера

Удалите ненужные модули из `--hidden-import` в скриптах сборки.

### Добавление иконки

**Windows (exe):**
Добавьте в `build_exe.py`:
```python
'--icon=assets/icons/app_icon.ico',
```

**macOS:**
Скрипт уже включает поддержку иконок через Info.plist.

---

## 🐛 Решение проблем

### Ошибка "Module not found"

Решение: Добавьте модуль в `--hidden-import`:
```python
'--hidden-import=module_name',
```

### Сборка занимает долго

Это нормально. Первая сборка может занять 5-10 минут. Последующие быстрее.

### AppImage не запускается на некоторых дистрибутивах Linux

Используйте статическую сборку:
```bash
./build_appimage.sh --static
```

### macOS: "App can't be opened because it's from an unidentified developer"

Решение:
```bash
sudo xattr -rd com.apple.quarantine /Applications/SmartTable.app
```

---

## 📊 Сравнение размеров

| Платформа | Тип | Размер |
|-----------|-----|--------|
| Windows | EXE | ~350 MB |
| Linux | AppImage | ~320 MB |
| macOS | APP | ~380 MB |
| macOS | DMG | ~250 MB |

---

## 📝 Примечания

- Все сборки включают все ресурсы (assets, templates)
- Все сборки полностью переносимы (не требуют установки Python)
- Для обновления переиндексируйте версию в скриптах

---

**Версия**: 1.0  
**Дата**: Февраль 2026  
**Автор**: SmartTable Team
