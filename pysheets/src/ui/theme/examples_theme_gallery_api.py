#!/usr/bin/env python3
"""
Пример: Использование ThemeGalleryManager в коде
"""

from pathlib import Path
import sys
import json

# Добавляем путь к проекту
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from src.ui.gallery.theme_gallery_manager import ThemeGalleryManager, ThemeMetadata
from src.ui.gallery.theme_utils import ThemeTemplateGenerator


def example_1_list_themes():
    """Пример 1: Вывести все установленные темы"""
    print("\n" + "="*60)
    print("Пример 1: Вывести все установленные темы")
    print("="*60)
    
    manager = ThemeGalleryManager()
    themes = manager.get_all_themes()
    
    print(f"\n📦 Найдено {len(themes)} тем(ы):\n")
    
    for theme in themes:
        meta = theme['metadata']
        print(f"• {meta.name}")
        print(f"  Автор: {meta.author}")
        print(f"  Описание: {meta.description}")
        print(f"  Теги: {', '.join(meta.tags)}")
        print()


def example_2_search_themes():
    """Пример 2: Поиск тем"""
    print("\n" + "="*60)
    print("Пример 2: Поиск тем")
    print("="*60)
    
    manager = ThemeGalleryManager()
    
    queries = ["морской", "код", "мини"]
    
    for query in queries:
        results = manager.search_themes(query)
        print(f"\n🔍 Поиск: '{query}'")
        print(f"📊 Результаты: {len(results)}")
        
        for theme in results:
            print(f"  • {theme['metadata'].name}")


def example_3_get_theme_details():
    """Пример 3: Получить детали конкретной темы"""
    print("\n" + "="*60)
    print("Пример 3: Получить детали конкретной темы")
    print("="*60)
    
    manager = ThemeGalleryManager()
    theme = manager.get_theme('ocean_sunset')
    
    if theme:
        meta = theme['metadata']
        print(f"\n📋 Информация о теме:")
        print(f"   Название: {meta.name}")
        print(f"   Описание: {meta.description}")
        print(f"   Версия: {meta.version}")
        print(f"   Категория: {meta.category}")
        print(f"   Основной цвет: {meta.preview_color}")
        
        print(f"\n🎨 Цвета (Светлая тема):")
        light_colors = theme['data'].get('light', {})
        for color_name, color_value in light_colors.items():
            print(f"   {color_name}: {color_value}")
    else:
        print("❌ Тема не найдена!")


def example_4_create_and_install_theme():
    """Пример 4: Создать и установить новую тему"""
    print("\n" + "="*60)
    print("Пример 4: Создать и установить новую тему")
    print("="*60)
    
    # Генерируем новую тему
    theme_data = ThemeTemplateGenerator.generate_theme_template(
        name="Пример программистов",
        description="Тема создана из примера кода",
        author="SmartTable Developer",
        primary_color="#9C27B0",
        tags=["фиолет", "разработка", "пример"]
    )
    
    print("\n✅ Тема сгенерирована:")
    print(f"   Название: {theme_data['metadata']['name']}")
    print(f"   Основной цвет: {theme_data['metadata']['preview_color']}")
    
    # Устанавливаем тему
    manager = ThemeGalleryManager()
    metadata = ThemeMetadata(
        name=theme_data['metadata']['name'],
        description=theme_data['metadata']['description'],
        author=theme_data['metadata']['author'],
        tags=theme_data['metadata']['tags'],
        preview_color=theme_data['metadata']['preview_color']
    )
    
    if manager.install_theme("", theme_data['theme'], metadata):
        print("\n✅ Тема успешно установлена!")
    else:
        print("\n❌ Ошибка при установке!")


def example_5_export_import():
    """Пример 5: Экспортировать и импортировать тему"""
    print("\n" + "="*60)
    print("Пример 5: Экспортировать и импортировать тему")
    print("="*60)
    
    manager = ThemeGalleryManager()
    
    # Экспортируем тему
    export_path = Path("exported_theme.json")
    if manager.export_theme('ocean_sunset', str(export_path)):
        print(f"\n✅ Тема экспортирована в: {export_path}")
        
        # Показываем содержимое
        with open(export_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"\n📄 Содержимое файла:")
        print(f"   Тема: {data['metadata']['name']}")
        print(f"   Размер: {len(str(data))} байт")
        
        print(f"\n💾 Для импорта используйте:")
        print(f"   manager.import_theme('{export_path}')")
    else:
        print("❌ Ошибка при экспорте!")


def example_6_filter_by_category():
    """Пример 6: Фильтрация по категориям"""
    print("\n" + "="*60)
    print("Пример 6: Фильтрация по категориям")
    print("="*60)
    
    manager = ThemeGalleryManager()
    
    categories = ['custom', 'light', 'dark', 'system']
    
    for category in categories:
        themes = manager.get_themes_by_category(category)
        print(f"\n📁 Категория '{category}': {len(themes)} тем(ы)")
        
        for theme in themes:
            print(f"   • {theme['metadata'].name}")


def main():
    """Запуск всех примеров"""
    print("\n")
    print("╔" + "═"*58 + "╗")
    print("║" + " "*58 + "║")
    print("║" + "  SmartTable - Примеры использования галереи тем".center(58) + "║")
    print("║" + " "*58 + "║")
    print("╚" + "═"*58 + "╝")
    
    try:
        example_1_list_themes()
        example_2_search_themes()
        example_3_get_theme_details()
        example_4_create_and_install_theme()
        example_5_export_import()
        example_6_filter_by_category()
        
        print("\n" + "="*60)
        print("✅ Все примеры выполнены успешно!")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
