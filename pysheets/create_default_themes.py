#!/usr/bin/env python3
"""
Создание набора стандартных тем для галереи
"""

from pathlib import Path
import sys

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from pysheets.src.ui.gallery.theme_gallery_manager import ThemeGalleryManager, ThemeMetadata
from pysheets.src.ui.gallery.theme_utils import ThemeTemplateGenerator


def create_default_themes():
    """Создает набор стандартных тем"""
    
    gallery_manager = ThemeGalleryManager()
    
    # Определяем темы: (имя, описание, цвет, категория, теги)
    themes_to_create = [
        # === Светлые темы (день) ===
        ("Ocean Day", "Спокойная голубая тема для дневной работы", "#1E88E5", "light", ["синий", "спокойная", "днём"]),
        ("Forest Light", "Зеленая тема вдохновленная природой", "#2E7D32", "light", ["зелёный", "природа", "днём"]),
        ("Sunset", "Теплая оранжевая тема как закат", "#FF6F00", "light", ["оранжевый", "теплая", "днём"]),
        ("Berry Fresh", "Свежая малиновая тема", "#C1185B", "light", ["розовый", "свежая", "днём"]),
        ("Purple Dream", "Спокойная фиолетовая тема", "#7B1FA2", "light", ["фиолетовый", "спокойная", "днём"]),
        ("Mint Cool", "Прохладная мятная тема", "#00897B", "light", ["бирюзовый", "прохладная", "днём"]),
        ("Coral Breeze", "Коралловая освежающая тема", "#FF5252", "light", ["коралловый", "свежая", "днём"]),
        ("Sky Blue", "Светлая небесно-голубая тема", "#0288D1", "light", ["голубой", "светлая", "днём"]),
        
        # === Темные темы (ночь) ===
        ("Midnight Ocean", "Глубокая ночная морская тема", "#00BCD4", "dark", ["синий", "ночь", "спокойная"]),
        ("Night Forest", "Темная лесная тема для ночи", "#4CAF50", "dark", ["зелёный", "ночь", "природа"]),
        ("Neon Glow", "Яркая неоновая тема для ночи", "#FF00FF", "dark", ["неон", "ночь", "яркая"]),
        ("Sunset Night", "Темная тема с закатными цветами", "#FF5722", "dark", ["оранжевый", "ночь", "теплая"]),
        ("Purple Night", "Глубокая фиолетовая ночная тема", "#9C27B0", "dark", ["фиолетовый", "ночь", "спокойная"]),
        ("Aurora", "Ночная тема с цветами полярного сияния", "#00E676", "dark", ["зелёный", "ночь", "яркая"]),
        ("Deep Red", "Глубокая красная ночная тема", "#D32F2F", "dark", ["красный", "ночь", "спокойная"]),
        ("Cyber Blue", "Киберпанк голубая тема для ночи", "#00BCD4", "dark", ["голубой", "ночь", "киберпанк"]),
    ]
    
    print("=" * 60)
    print("Создание стандартных тем SmartTable")
    print("=" * 60)
    
    for theme_name, description, color, category, tags in themes_to_create:
        try:
            # Генерируем шаблон темы
            template = ThemeTemplateGenerator.generate_theme_template(
                name=theme_name,
                description=description,
                author="SmartTable Team",
                primary_color=color,
                tags=tags
            )
            
            # Обновляем категорию
            template["metadata"]["category"] = category
            
            # Создаем метаданные
            metadata = ThemeMetadata(
                name=theme_name,
                description=description,
                author="SmartTable Team",
                category=category,
                tags=tags,
                preview_color=color
            )
            
            # Устанавливаем тему
            if gallery_manager.install_theme("", template["theme"], metadata):
                print(f"✅ Тема '{theme_name}' создана успешно")
            else:
                print(f"❌ Ошибка при создании темы '{theme_name}'")
        
        except Exception as e:
            print(f"❌ Ошибка при создании темы '{theme_name}': {e}")
    
    print("\n" + "=" * 60)
    print("Все темы созданы!")
    print(f"Путь: {gallery_manager.gallery_path}")
    print("=" * 60)


if __name__ == "__main__":
    create_default_themes()
