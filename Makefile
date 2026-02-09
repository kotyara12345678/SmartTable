# Makefile для SmartTable (минималистичный и удобный)
# Использование:
#  make help         - показать доступные цели
#  make venv         - создать виртуальное окружение в .venv
#  make install      - установить зависимости из requirements.txt
#  make run          - запустить приложение
#  make test         - прогнать pytest
#  make db-test      - запустить быстрый тест БД
#  make lint         - запустить flake8
#  make format       - отформатировать код black
#  make build        - собрать один исполняемый файл (pyinstaller)
#  make clean        - удалить артефакты сборки

PY ?= python
PIP ?= $(PY) -m pip
VENV ?= .venv
REQ ?= requirements.txt
PYTEST ?= $(PY) -m pytest

.PHONY: help venv install install-dev run test db-test lint format format-check build clean db-info

help:
	@echo "Makefile для SmartTable"
	@echo "  make venv         - создать виртуальное окружение в $(VENV)"
	@echo "  make install      - установить зависимости из $(REQ)"
	@echo "  make run          - запустить приложение (pysheets/main.py)"
	@echo "  make test         - запустить pytest для всего проекта"
	@echo "  make db-test      - запустить быстрый тест БД (test_utills/test_db_minimal.py)"
	@echo "  make lint         - запустить flake8"
	@echo "  make format       - применить black"
	@echo "  make format-check - проверить форматирование"
	@echo "  make build        - собрать один исполняемый файл (pyinstaller, при наличии)"
	@echo "  make clean        - удалить build-артефакты и виртуальное окружение"

# Создать виртуальное окружение и обновить pip
venv:
	@echo "Создаём виртуальное окружение в $(VENV)"
	$(PY) -m venv $(VENV)
	@echo "Обновляем pip и setuptools"
	$(VENV)/Scripts/$(PY) -m pip install --upgrade pip setuptools || $(VENV)/bin/$(PY) -m pip install --upgrade pip setuptools

# Установка зависимостей
install:
	@echo "Устанавливаем зависимости из $(REQ)"
	$(PIP) install -r $(REQ)

# Установка dev-зависимостей (если есть файл)
install-dev:
	@echo "Устанавливаем dev зависимости (если есть)"
	$(PIP) install -r $(REQ) || true
	@if [ -f dev-requirements.txt ]; then \
		$(PIP) install -r dev-requirements.txt; \
	fi

# Запуск приложения
run:
	@echo "Запуск SmartTable"
	$(PY) pysheets/main.py

# Тесты
test:
	@echo "Запуск pytest для всего проекта"
	$(PYTEST)

# Быстрый тест БД
db-test:
	@echo "Запуск быстрого теста БД"
	$(PY) test_utills/test_db_minimal.py

# Линтер
lint:
	@echo "Запуск flake8"
	$(PY) -m flake8 .

# Форматирование
format:
	@echo "Форматирование кода black"
	$(PY) -m black .

format-check:
	@echo "Проверка форматирования (black --check)"
	$(PY) -m black --check .

# Сборка в единый исполняемый файл (при наличии pyinstaller)
build:
	@echo "Сборка одного исполняемого файла (pyinstaller)"
	$(PY) -m pyinstaller --noconfirm --onefile pysheets/main.py -n SmartTable || true

# Информация о БД
db-info:
	@echo "Печать информации о локальной БД"
	$(PY) - <<PY
from pysheets.src.db.database_manager import DatabaseManager
print(DatabaseManager().get_database_info())
PY

# Очистка артефактов
clean:
	@echo "Удаляем build, dist, __pycache__, .pytest_cache и виртуальное окружение"
	rm -rf build dist __pycache__ .pytest_cache *.spec $(VENV) || rmdir /S /Q $(VENV) 2> /dev/null || true


# Конец Makefile
