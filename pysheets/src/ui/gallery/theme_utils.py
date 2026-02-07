"""
Утилиты для работы с галереей тем
"""

import json
from pathlib import Path
from typing import Dict, List, Optional
from PyQt5.QtGui import QColor


class ThemeColorParser:
    """Парсер цветов тем"""
    
    @staticmethod
    def validate_hex_color(color: str) -> bool:
        """Проверка валидности HEX цвета"""
        try:
            QColor(color)
            return True
        except:
            return False
    
    @staticmethod
    def parse_theme_colors(theme_data: dict) -> Dict[str, Dict[str, str]]:
        """Парсинг цветов из данных темы"""
        colors = {}
        
        for theme_type in ['light', 'dark']:
            if theme_type in theme_data:
                colors[theme_type] = {}
                for key, value in theme_data[theme_type].items():
                    if ThemeColorParser.validate_hex_color(value):
                        colors[theme_type][key] = value
        
        return colors
    
    @staticmethod
    def generate_complementary_color(hex_color: str) -> str:
        """Генерирует дополняющий цвет"""
        try:
            color = QColor(hex_color)
            # Преобразуем в HSV и меняем оттенок на противоположный
            h = (color.hue() + 180) % 360
            s = color.saturation()
            v = color.value()
            result = QColor.fromHsv(h, s, v)
            return result.name()
        except:
            return "#000000"


class ThemeValidator:
    """Валидатор структуры тем"""
    
    REQUIRED_METADATA_FIELDS = ['name', 'description', 'author']
    REQUIRED_THEME_FIELDS = ['light', 'dark']
    REQUIRED_COLOR_FIELDS = [
        'primary', 'primary_light', 'primary_dark',
        'secondary', 'background', 'surface',
        'text_primary', 'text_secondary', 'border',
        'success', 'warning', 'error'
    ]
    
    @classmethod
    def validate_theme_file(cls, file_path: str) -> tuple[bool, str]:
        """Валидация файла темы"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Проверяем метаданные
            if 'metadata' not in data:
                return False, "Отсутствует раздел 'metadata'"
            
            metadata = data['metadata']
            for field in cls.REQUIRED_METADATA_FIELDS:
                if field not in metadata:
                    return False, f"В метаданных отсутствует поле '{field}'"
            
            # Проверяем тему
            if 'theme' not in data:
                return False, "Отсутствует раздел 'theme'"
            
            theme = data['theme']
            for theme_type in cls.REQUIRED_THEME_FIELDS:
                if theme_type not in theme:
                    return False, f"Отсутствует тема '{theme_type}'"
                
                # Проверяем цвета
                for color_name in cls.REQUIRED_COLOR_FIELDS:
                    if color_name not in theme[theme_type]:
                        return False, f"В теме '{theme_type}' отсутствует цвет '{color_name}'"
                    
                    # Проверяем валидность цвета
                    color = theme[theme_type][color_name]
                    if not ThemeColorParser.validate_hex_color(color):
                        return False, f"Невальный цвет '{color}' в поле '{color_name}'"
            
            return True, "OK"
        
        except json.JSONDecodeError as e:
            return False, f"Ошибка парсинга JSON: {str(e)}"
        except Exception as e:
            return False, f"Ошибка: {str(e)}"


class ThemeTemplateGenerator:
    """Генератор шаблонов тем"""
    
    @staticmethod
    def generate_theme_template(
        name: str,
        description: str,
        author: str,
        primary_color: str = "#DC143C",
        tags: List[str] = None
    ) -> dict:
        """Генерирует шаблон темы с заданными параметрами"""
        
        if tags is None:
            tags = []
        
        # Генерируем производные цвета
        primary = QColor(primary_color)
        primary_light = primary.lighter(150).name()
        primary_dark = primary.darker(150).name()
        
        # Генерируем вторичный цвет
        secondary = QColor.fromHsv((primary.hue() + 60) % 360, primary.saturation(), primary.value()).name()
        
        return {
            "metadata": {
                "name": name,
                "description": description,
                "author": author,
                "version": "1.0",
                "category": "custom",
                "tags": tags,
                "preview_color": primary_color
            },
            "theme": {
                "light": {
                    "primary": primary_color,
                    "primary_light": primary_light,
                    "primary_dark": primary_dark,
                    "secondary": secondary,
                    "background": "#FAFAFA",
                    "surface": "#FFFFFF",
                    "text_primary": "#212121",
                    "text_secondary": "#666666",
                    "border": "#E0E0E0",
                    "success": "#4CAF50",
                    "warning": "#FF9800",
                    "error": "#F44336"
                },
                "dark": {
                    "primary": primary_color,
                    "primary_light": primary_light,
                    "primary_dark": primary_dark,
                    "secondary": secondary,
                    "background": "#121212",
                    "surface": "#1E1E1E",
                    "text_primary": "#FFFFFF",
                    "text_secondary": "#BDBDBD",
                    "border": "#333333",
                    "success": "#66BB6A",
                    "warning": "#FFA726",
                    "error": "#EF5350"
                }
            }
        }
    
    @staticmethod
    def save_theme(theme_data: dict, file_path: str) -> bool:
        """Сохраняет тему в файл"""
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(theme_data, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"Ошибка при сохранении темы: {e}")
            return False


class ThemeExporter:
    """Экспортер тем"""
    
    @staticmethod
    def create_portable_theme(theme_data: dict, output_dir: Path) -> bool:
        """Создает портативный файл темы с метаданными"""
        try:
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # Сохраняем единый файл с метаданными и темой
            portable_file = output_dir / f"{theme_data['metadata']['name'].lower().replace(' ', '_')}.json"
            
            with open(portable_file, 'w', encoding='utf-8') as f:
                json.dump(theme_data, f, indent=2, ensure_ascii=False)
            
            return True
        except Exception as e:
            print(f"Ошибка при экспорте темы: {e}")
            return False
    
    @staticmethod
    def export_to_qss(theme_data: dict, output_file: Path) -> bool:
        """Экспортирует тему в QtStyleSheets формат"""
        try:
            theme = theme_data.get('theme', {}).get('light', {})
            
            qss_content = f"""
            /* {theme_data['metadata']['name']} */
            /* Author: {theme_data['metadata']['author']} */
            
            * {{
                color: {theme.get('text_primary', '#000000')};
            }}
            
            QMainWindow, QDialog {{
                background-color: {theme.get('background', '#FFFFFF')};
            }}
            
            QPushButton {{
                background-color: {theme.get('primary', '#DC143C')};
                color: white;
                border-radius: 4px;
                padding: 5px 15px;
                border: none;
            }}
            
            QPushButton:hover {{
                background-color: {theme.get('primary_light', '#FF6666')};
            }}
            
            QPushButton:pressed {{
                background-color: {theme.get('primary_dark', '#AA0000')};
            }}
            """
            
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(qss_content)
            
            return True
        except Exception as e:
            print(f"Ошибка при экспорте QSS: {e}")
            return False
