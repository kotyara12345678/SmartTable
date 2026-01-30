"""
Вспомогательные функции
"""
import os
import sys
import json
from datetime import datetime
from typing import Any, Dict, List


def get_app_path() -> str:
    """Получить путь к приложению"""
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    else:
        return os.path.dirname(os.path.dirname(os.path.dirname(__file__)))


def ensure_directory(path: str):
    """Убедиться, что директория существует"""
    os.makedirs(path, exist_ok=True)


def save_json(data: Any, filepath: str):
    """Сохранить данные в JSON файл"""
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def load_json(filepath: str) -> Any:
    """Загрузить данные из JSON файла"""
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def format_file_size(size_in_bytes: int) -> str:
    """Форматировать размер файла"""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_in_bytes < 1024.0:
            return f"{size_in_bytes:.2f} {unit}"
        size_in_bytes /= 1024.0
    return f"{size_in_bytes:.2f} PB"


def get_timestamp() -> str:
    """Получить текущую временную метку"""
    return datetime.now().isoformat()