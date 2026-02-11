# Splash Screen (Стартовый экран)

## Описание

Простой стартовый экран как в PyCharm. Показывает картинку при загрузке приложения и закрывается когда готово главное окно.

## Структура

```
pysheets/
  assets/
    splash/
      splash.png          ← Ваша картинка (вставьте её здесь)
      generate_splash.py  ← Генератор картинки (если нужна заглушка)
  src/ui/
    splash_screen.py      ← Класс SplashScreen
  main.py                 ← Интеграция
```

## Как использовать

### 1. Добавить свою картинку

Просто положите картинку `splash.png` в папку:
```
pysheets/assets/splash/splash.png
```

Рекомендуемые размеры: **600 x 400** пикселей

### 2. Если картинки нет

Можно создать автоматически:
```bash
python pysheets/assets/splash/generate_splash.py
```

Или создать вручную картинку любым редактором (Photoshop, GIMP, Paint.NET и т.д.)

## Как работает

```python
# При запуске приложения:
1. Создаёт SplashScreen()
2. Показывает splash.show()
3. Показывает сообщения splash.show_message("...")
4. Инициализирует БД (показывает прогресс)
5. Инициализирует интерфейс
6. Закрывает splash.finish(window)
7. Показывает главное окно window.show()
```

## API

### SplashScreen класс

```python
from pysheets.src.ui.splash_screen import SplashScreen

# Создать с картинкой по умолчанию
splash = SplashScreen()

# Или с кастомной картинкой
splash = SplashScreen("/path/to/image.png")

# Показать
splash.show()

# Показать сообщение
splash.show_message("Загрузка...")

# Закрыть и показать главное окно
splash.finish(main_window)

# Закрыть сразу
splash.close()
```

### Helper функция

```python
from pysheets.src.ui.splash_screen import show_splash_screen

# Быстро создать и показать
splash = show_splash_screen()
splash.show_message("Инициализация...")
splash.finish(window)

# С автоматическим закрытием
splash = show_splash_screen(auto_close_ms=3000)  # Закроется через 3 сек
```

## Примеры картинок формата

### Что нужно вставить

Картинка любого формата:
- ✅ PNG (рекомендуется)
- ✅ JPG / JPEG
- ✅ BMP
- ✅ GIF (статичная кадр)

### Размеры

- Минимум: **300 x 200**
- Рекомендуется: **600 x 400**
- Максимум: **1200 x 800**

### Содержание

Обычно:
- Логотип/иконка приложения
- Название приложения (SmartTable)
- Версия
- Строка прогресса (опционально)

## Кастомизация

### Изменить размеры

Если ваша картинка другого размера - просто положите её в нужное место. SplashScreen автоматически подстроится.

### Изменить стиль текста

В `splash_screen.py`:
```python
self.font = QFont("Arial", 10)  # Шрифт и размер
QColor(255, 255, 255)            # Белый цвет текста
```

### Скрыть сообщение

```python
splash.show()
# Не вызывайте splash.show_message() если не нужны сообщения
```

## Как менять картинку

1. Откройте папку `pysheets/assets/splash/`
2. Удалите `splash.png` (если есть)
3. Положите свою картинку с именем `splash.png`
4. Перезапустите приложение

## Автоматическое создание картинки

Если PIL установлена (`pip install pillow`):
```bash
python pysheets/assets/splash/generate_splash.py
```

Будет создана красивая серо-красная картинка в стиле PyCharm.

## Откладачить

Если splash screen не показывается:

1. Проверьте что картинка существует:
   ```python
   from pathlib import Path
   path = Path("pysheets/assets/splash/splash.png")
   print(path.exists())  # Должно быть True
   ```

2. Проверьте логи:
   ```
   ~/.smarttable/smarttable.log
   ```

3. Если нет картинки - используется серый фон (это нормально)

## Примеры использования

### Показать с кастомной картинкой

```python
splash = SplashScreen("my_splash.png")
splash.show()
splash.show_message("Loading modules...")
# ... инициализация ...
splash.finish(main_window)
```

### Показать на 2 секунды

```python
splash = show_splash_screen(auto_close_ms=2000)
```

### Без текста

```python
splash = SplashScreen()
splash.show()
QTimer.singleShot(1000, lambda: splash.finish(window))
```

## Структура файлов

```
SmartTable/
  pysheets/
    assets/
      splash/
        splash.png              ← ПОЛОЖИТЕ СЮДА СВОЮ КАРТИНКУ
        generate_splash.py      ← Генератор (опционально)
    src/ui/
      splash_screen.py          ← Класс (готовый, не менять)
  main.py                        ← Интеграция (готова, не менять)
```

## Заключение

Всё просто:
1. Положите картинку в `pysheets/assets/splash/splash.png`
2. При следующем запуске она будет показана
3. Готово!

Если картинки нет - используется серый фон (это нормально).
