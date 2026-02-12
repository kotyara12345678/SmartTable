#!/usr/bin/env python3
"""
Пример: Создание и установка новой темы
"""

from pathlib import Path
import sys

# Добавляем путь к проекту
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from src.ui.gallery.theme_gallery_manager import ThemeGalleryManager, ThemeMetadata
from src.ui.gallery.theme_utils import ThemeTemplateGenerator, ThemeValidator


def create_custom_theme():
    """Создает и устанавливает пользовательскую тему"""
    
    print("=" * 60)
    print("SmartTable - Создание пользовательской темы")
    print("=" * 60)
    
    # Получаем параметры темы
    theme_name = input("\n📝 Введите название темы (e.g. 'Мой закат'): ").strip()
    if not theme_name:
        print("❌ Название не может быть пустым!")
        return
    
    theme_description = input("📝 Введите описание: ").strip()
    author_name = input("👤 Введите ваше имя: ").strip()
    
    primary_color = input("🎨 Введите основной цвет (HEX, e.g. #FF6B6B): ").strip()
    if not primary_color.startswith('#') or len(primary_color) != 7:
        primary_color = "#FF6B6B"
        print(f"⚠️  Используется цвет по умолчанию: {primary_color}")
    
    tags_input = input("🏷️  Введите теги через запятую (опционально): ").strip()
    tags = [tag.strip() for tag in tags_input.split(',')] if tags_input else []
    
    # Генерируем шаблон
    print("\n🔄 Генерируем шаблон темы...")
    theme_template = ThemeTemplateGenerator.generate_theme_template(
        name=theme_name,
        description=theme_description,
        author=author_name,
        primary_color=primary_color,
        tags=tags
    )
    
    # Валидируем (для примера)
    print("✅ Тема создана:")
    print(f"   Название: {theme_name}")
    print(f"   Описание: {theme_description}")
    print(f"   Автор: {author_name}")
    print(f"   Основной цвет: {primary_color}")
    if tags:
        print(f"   Теги: {', '.join(tags)}")
    
    # Устанавливаем тему
    confirm = input("\n💾 Установить эту тему? (y/n): ").strip().lower()
    if confirm == 'y':
        try:
            gallery_manager = ThemeGalleryManager()
            metadata = ThemeMetadata(
                name=theme_name,
                description=theme_description,
                author=author_name,
                tags=tags,
                preview_color=primary_color
            )
            
            if gallery_manager.install_theme("", theme_template['theme'], metadata):
                print("✅ Тема успешно установлена!")
                print(f"   Путь: {gallery_manager.themes_dir}")
            else:
                print("❌ Ошибка при установке темы!")
        except Exception as e:
            print(f"❌ Ошибка: {e}")
    else:
        print("⏭️  Установка отменена.")


if __name__ == "__main__":
    create_custom_theme()
