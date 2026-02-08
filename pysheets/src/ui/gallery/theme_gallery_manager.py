"""
Менеджер галереи пользовательских тем
"""

import json
import os
from pathlib import Path
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict
from datetime import datetime


@dataclass
class ThemeMetadata:
    """Метаданные темы"""
    name: str
    description: str
    author: str
    version: str = "1.0"
    created_at: str = None
    updated_at: str = None
    category: str = "custom"  # custom, light, dark, system
    tags: List[str] = None
    preview_color: str = "#DC143C"  # Основной цвет темы
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now().isoformat()
        if self.updated_at is None:
            self.updated_at = datetime.now().isoformat()
        if self.tags is None:
            self.tags = []
    
    def to_dict(self) -> dict:
        """Сериализация в словарь"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: dict) -> 'ThemeMetadata':
        """Десериализация из словаря"""
        return cls(**data)


class ThemeGalleryManager:
    """Менеджер галереи тем"""
    
    def __init__(self, gallery_path: str = None):
        """Инициализация менеджера"""
        if gallery_path is None:
            # По умолчанию используем папку user_themes в корне проекта
            project_root = Path(__file__).parent.parent.parent.parent
            gallery_path = project_root / "user_themes"
        
        self.gallery_path = Path(gallery_path)
        self.gallery_path.mkdir(parents=True, exist_ok=True)
        
        # Создаем подпапки
        self.themes_dir = self.gallery_path / "themes"
        self.metadata_dir = self.gallery_path / "metadata"
        self.thumbnails_dir = self.gallery_path / "thumbnails"
        
        for dir_path in [self.themes_dir, self.metadata_dir, self.thumbnails_dir]:
            dir_path.mkdir(exist_ok=True)
    
    def install_theme(self, theme_file: str, theme_data: dict, metadata: ThemeMetadata) -> bool:
        """Установка новой темы"""
        try:
            theme_name = metadata.name.lower().replace(" ", "_")
            
            # Сохраняем файл темы
            theme_path = self.themes_dir / f"{theme_name}.json"
            with open(theme_path, 'w', encoding='utf-8') as f:
                json.dump(theme_data, f, indent=2, ensure_ascii=False)
            
            # Сохраняем метаданные
            metadata.updated_at = datetime.now().isoformat()
            metadata_path = self.metadata_dir / f"{theme_name}.json"
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(metadata.to_dict(), f, indent=2, ensure_ascii=False)
            
            return True
        except Exception as e:
            print(f"Ошибка при установке темы: {e}")
            return False
    
    def get_all_themes(self) -> List[Dict]:
        """Получение списка всех установленных тем"""
        themes = []
        
        for metadata_file in self.metadata_dir.glob("*.json"):
            try:
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    meta_data = json.load(f)
                
                theme_name = metadata_file.stem
                theme_file = self.themes_dir / f"{theme_name}.json"
                
                if theme_file.exists():
                    themes.append({
                        'id': theme_name,
                        'metadata': ThemeMetadata.from_dict(meta_data),
                        'path': str(theme_file)
                    })
            except Exception as e:
                print(f"Ошибка при загрузке темы {metadata_file}: {e}")
        
        return themes
    
    def get_theme(self, theme_id: str) -> Optional[Dict]:
        """Получение темы по ID"""
        metadata_file = self.metadata_dir / f"{theme_id}.json"
        theme_file = self.themes_dir / f"{theme_id}.json"
        
        if not metadata_file.exists() or not theme_file.exists():
            return None
        
        try:
            with open(metadata_file, 'r', encoding='utf-8') as f:
                meta_data = json.load(f)
            
            with open(theme_file, 'r', encoding='utf-8') as f:
                theme_file_data = json.load(f)
            
            # JSON файл содержит корневые ключи (id, name, description, version, author, data)
            # Нам нужна только структура 'data' для применения темы
            theme_data = theme_file_data.get('data', {})
            
            return {
                'id': theme_id,
                'metadata': ThemeMetadata.from_dict(meta_data),
                'data': theme_data,
                'path': str(theme_file)
            }
        except Exception as e:
            print(f"Ошибка при загрузке темы {theme_id}: {e}")
            return None
    
    def delete_theme(self, theme_id: str) -> bool:
        """Удаление темы"""
        try:
            metadata_file = self.metadata_dir / f"{theme_id}.json"
            theme_file = self.themes_dir / f"{theme_id}.json"
            
            if metadata_file.exists():
                metadata_file.unlink()
            if theme_file.exists():
                theme_file.unlink()
            
            # Удаляем превью если существует
            thumbnail_file = self.thumbnails_dir / f"{theme_id}.png"
            if thumbnail_file.exists():
                thumbnail_file.unlink()
            
            return True
        except Exception as e:
            print(f"Ошибка при удалении темы: {e}")
            return False
    
    def export_theme(self, theme_id: str, export_path: str) -> bool:
        """Экспорт темы в файл"""
        try:
            theme = self.get_theme(theme_id)
            if not theme:
                return False
            
            export_data = {
                'metadata': theme['metadata'].to_dict(),
                'theme': theme['data']
            }
            
            with open(export_path, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, indent=2, ensure_ascii=False)
            
            return True
        except Exception as e:
            print(f"Ошибка при экспорте темы: {e}")
            return False
    
    def import_theme(self, import_path: str) -> bool:
        """Импорт темы из файла"""
        try:
            with open(import_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            metadata = ThemeMetadata.from_dict(data['metadata'])
            return self.install_theme(import_path, data['theme'], metadata)
        except Exception as e:
            print(f"Ошибка при импорте темы: {e}")
            return False
    
    def get_themes_by_category(self, category: str) -> List[Dict]:
        """Получение тем по категории"""
        all_themes = self.get_all_themes()
        return [t for t in all_themes if t['metadata'].category == category]
    
    def search_themes(self, query: str) -> List[Dict]:
        """Поиск тем по названию и описанию"""
        all_themes = self.get_all_themes()
        query_lower = query.lower()
        
        return [
            t for t in all_themes
            if query_lower in t['metadata'].name.lower() or
               query_lower in t['metadata'].description.lower()
        ]
