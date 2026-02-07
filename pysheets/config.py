"""
Конфигурация приложения
"""

import os
from pathlib import Path
from dataclasses import dataclass
from typing import Dict, Any


@dataclass
class AppConfig:
    """Конфигурация приложения"""

    # Пути
    APP_NAME: str = "SmartTable"
    APP_VERSION: str = "1.0.0"
    APP_DIR: Path = Path(__file__).parent
    DATA_DIR: Path = APP_DIR / "data"
    TEMP_DIR: Path = APP_DIR / "temp"

    # Настройки UI
    DEFAULT_THEME: str = "light"
    DEFAULT_FONT: str = "Segoe UI"
    DEFAULT_FONT_SIZE: int = 11
    MAX_RECENT_FILES: int = 10
    AUTO_SAVE_INTERVAL: int = 300  # секунд

    # Настройки таблицы
    DEFAULT_ROWS: int = 100
    DEFAULT_COLUMNS: int = 26
    MAX_ROWS: int = 10000
    MAX_COLUMNS: int = 702  # ZZ

    # Настройки вычислений
    PRECISION: int = 10
    USE_THREADING: bool = True

    def __post_init__(self):
        """Создание необходимых директорий"""
        self.DATA_DIR.mkdir(exist_ok=True)
        self.TEMP_DIR.mkdir(exist_ok=True)

    def to_dict(self) -> Dict[str, Any]:
        """Конвертация в словарь"""
        return {
            'APP_NAME': self.APP_NAME,
            'APP_VERSION': self.APP_VERSION,
            'DEFAULT_THEME': self.DEFAULT_THEME,
            'DEFAULT_FONT': self.DEFAULT_FONT,
            'DEFAULT_FONT_SIZE': self.DEFAULT_FONT_SIZE,
            'AUTO_SAVE_INTERVAL': self.AUTO_SAVE_INTERVAL
        }


# Глобальный экземпляр конфигурации
config = AppConfig()