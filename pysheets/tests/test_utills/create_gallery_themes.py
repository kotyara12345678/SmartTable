#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Генератор тем галереи с жизненными явлениями"""

import json
import os
from pathlib import Path

# Дневные темы (светлые)
DAY_THEMES = {
    "🌅 Рассвет": {
        "primary": "#FF6B6B",
        "secondary": "#FFB366",
        "accent": "#FFC947",
        "background": "#FFF8F0",
        "description": "Теплые цвета утреннего рассвета"
    },
    "☀️ Солнечный день": {
        "primary": "#FFD93D",
        "secondary": "#FFA500",
        "accent": "#FF8C00",
        "background": "#FFFEF5",
        "description": "Яркие и веселые цвета солнечного дня"
    },
    "🌸 Весенний букет": {
        "primary": "#FF69B4",
        "secondary": "#FFB6C1",
        "accent": "#DDA0DD",
        "background": "#FFF5F7",
        "description": "Нежные весенние цвета"
    },
    "🌊 Морской бриз": {
        "primary": "#4DA6FF",
        "secondary": "#87CEEB",
        "accent": "#00CED1",
        "background": "#F0F8FF",
        "description": "Освежающие морские оттенки"
    },
    "🍃 Зеленый лес": {
        "primary": "#228B22",
        "secondary": "#90EE90",
        "accent": "#3CB371",
        "background": "#F0FFF0",
        "description": "Спокойные зеленые тона природы"
    },
    "🌻 Подсолнухи": {
        "primary": "#DAA520",
        "secondary": "#FFD700",
        "accent": "#FFA500",
        "background": "#FFFACD",
        "description": "Золотистые теплые оттенки"
    },
    "🦋 Летние бабочки": {
        "primary": "#FF1493",
        "secondary": "#FF69B4",
        "accent": "#FF8C00",
        "background": "#FFFAF0",
        "description": "Яркие летние краски"
    },
}

# Ночные темы (темные)
NIGHT_THEMES = {
    "🌙 Голубое небо": {
        "primary": "#6E7DEE",
        "secondary": "#8B9FFF",
        "accent": "#4D5EC4",
        "background": "#1E2139",
        "description": "Спокойные синие тона ночного неба"
    },
    "⭐ Звездная ночь": {
        "primary": "#8B7FF5",
        "secondary": "#A399FF",
        "accent": "#7B68EE",
        "background": "#0F1627",
        "description": "Темный фиолетовый фон со звездами"
    },
    "🌧️ Грозовой шторм": {
        "primary": "#5B7C99",
        "secondary": "#7A94B8",
        "accent": "#4A6FA5",
        "background": "#1A222E",
        "description": "Серые и синие тона грозы"
    },
    "🌌 Млечный путь": {
        "primary": "#9B59B6",
        "secondary": "#BB86FC",
        "accent": "#7B2CBF",
        "background": "#0D0221",
        "description": "Фиолетовые тона космоса"
    },
    "🌑 Полная луна": {
        "primary": "#B8B8D1",
        "secondary": "#D4D4E8",
        "accent": "#9C9CAF",
        "background": "#1F1F2E",
        "description": "Серебристые лунные тона"
    },
    "🐺 Ночной лес": {
        "primary": "#2A5F3F",
        "secondary": "#3D7F54",
        "accent": "#1D4D2E",
        "background": "#0D1B0F",
        "description": "Темные зеленые тона ночного леса"
    },
    "💫 Таинственная ночь": {
        "primary": "#6A4C93",
        "secondary": "#8E7CC3",
        "accent": "#4E3B52",
        "background": "#1A0F2E",
        "description": "Глубокие фиолетовые тона тайны"
    },
    "🌀 Северное сияние": {
        "primary": "#00D4AA",
        "secondary": "#3FE0B5",
        "accent": "#00BFA5",
        "background": "#0B2435",
        "description": "Зеленовато-голубое сияние"
    },
}


def create_theme_file(name, colors, theme_folder, metadata_folder, category="custom"):
    """Создает файл темы и metadata"""
    # Очищаем имя от эмодзи
    theme_id = name.lower().replace(" ", "_")
    for emoji in ["🌅", "☀️", "🌸", "🌊", "🍃", "🌻", "🦋", "🌙", "⭐", "🌧️", "🌌", "🌑", "🐺", "💫", "🌀"]:
        theme_id = theme_id.replace(emoji, "")
    # Удаляем ведущие и концевые подчеркивания и дефисы
    theme_id = theme_id.strip().replace("-", "_").strip("_")
    
    # Создаем файл темы
    theme_data = {
        "id": theme_id,
        "name": name,
        "description": colors.get("description", ""),
        "version": "1.0",
        "author": "SmartTable",
        "data": {
            "theme": {
                "light": {
                    "primary": colors["primary"],
                    "secondary": colors["secondary"],
                    "accent": colors["accent"],
                    "background": colors["background"]
                },
                "dark": {
                    "primary": colors["primary"],
                    "secondary": colors["secondary"],
                    "accent": colors["accent"],
                    "background": colors["background"]
                }
            }
        }
    }

    # Сохраняем файл темы
    theme_filepath = os.path.join(theme_folder, f"{theme_id}.json")
    os.makedirs(theme_folder, exist_ok=True)
    with open(theme_filepath, "w", encoding="utf-8") as f:
        json.dump(theme_data, f, indent=2, ensure_ascii=False)

    # Создаем metadata файл
    metadata = {
        "name": name,
        "description": colors.get("description", ""),
        "author": "SmartTable",
        "version": "1.0",
        "created_at": "2026-02-08T00:00:00",
        "updated_at": "2026-02-08T00:00:00",
        "category": category,
        "tags": [],
        "preview_color": colors["primary"]
    }
    
    metadata_filepath = os.path.join(metadata_folder, f"{theme_id}.json")
    os.makedirs(metadata_folder, exist_ok=True)
    with open(metadata_filepath, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    print(f"✓ Создана тема: {name} ({category}) -> {theme_filepath}")
    return theme_id


def main():
    """Главная функция"""
    workspace_root = Path(__file__).parent
    themes_folder = workspace_root / "pysheets" / "user_themes" / "themes"
    metadata_folder = workspace_root / "pysheets" / "user_themes" / "metadata"

    print("=" * 60)
    print("🎨 Генератор тем для галереи")
    print("=" * 60)

    # Создаем дневные темы
    print("\n📋 Создание ДНЕВНЫХ тем:")
    print("-" * 60)
    day_ids = []
    for theme_name, colors in DAY_THEMES.items():
        theme_id = create_theme_file(theme_name, colors, str(themes_folder), str(metadata_folder), category="light")
        day_ids.append(theme_id)

    # Создаем ночные темы
    print("\n📋 Создание НОЧНЫХ тем:")
    print("-" * 60)
    night_ids = []
    for theme_name, colors in NIGHT_THEMES.items():
        theme_id = create_theme_file(theme_name, colors, str(themes_folder), str(metadata_folder), category="dark")
        night_ids.append(theme_id)

    print("\n" + "=" * 60)
    print(f"✅ Всего создано тем: {len(day_ids) + len(night_ids)}")
    print(f"   - Дневных: {len(day_ids)}")
    print(f"   - Ночных: {len(night_ids)}")
    print("=" * 60)

    # Создаем metadata файл
    metadata = {
        "day": day_ids,
        "night": night_ids
    }
    metadata_path = workspace_root / "pysheets" / "user_themes" / "metadata" / "theme_tabs.json"
    os.makedirs(metadata_path.parent, exist_ok=True)

    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    print(f"✓ Metadata сохранен: {metadata_path}")


if __name__ == "__main__":
    main()
