"""
Менеджер шаблонов для SmartTable
Позволяет создавать шаблоны из выделенных ячеек с логикой и паттернами
"""

import json
import os
import re
from datetime import datetime
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional, Tuple, Union
from enum import Enum
from pathlib import Path


class DataPattern(Enum):
    """Паттерны данных"""
    EMAIL = "email"
    PHONE = "phone"
    DATE = "date"
    CURRENCY = "currency"
    PERCENTAGE = "percentage"
    NUMBER = "number"
    TEXT = "text"
    FORMULA = "formula"

    def __str__(self):
        return self.value

    def to_dict(self):
        """Преобразует в словарь для JSON"""
        return self.value


@dataclass
class CellRange:
    """Диапазон ячеек"""
    start_row: int
    start_col: int
    end_row: int
    end_col: int

    def to_excel_format(self):
        """Преобразование в формат Excel (A1:B10)"""
        start = f"{chr(65 + self.start_col)}{self.start_row + 1}"
        end = f"{chr(65 + self.end_col)}{self.end_row + 1}"
        return f"{start}:{end}"

    def to_dict(self):
        """Преобразует в словарь"""
        return {
            "start_row": self.start_row,
            "start_col": self.start_col,
            "end_row": self.end_row,
            "end_col": self.end_col
        }


@dataclass
class TemplateField:
    """Поле шаблона"""
    name: str
    column_index: int
    pattern: DataPattern = DataPattern.TEXT
    format_string: str = ""
    is_key_field: bool = False
    validation_rules: List[Dict] = field(default_factory=list)

    def detect_pattern(self, sample_values: List[str]) -> bool:
        """Определяет паттерн на основе примеров значений"""
        if not sample_values:
            return False

        sample = sample_values[0] if sample_values else ""

        # Проверка email
        if re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', sample):
            self.pattern = DataPattern.EMAIL
            return True

        # Проверка телефона
        if re.match(r'^\+?[\d\s\-\(\)]+$', sample) and any(c.isdigit() for c in sample):
            self.pattern = DataPattern.PHONE
            return True

        # Проверка даты
        date_patterns = [
            r'\d{2}\.\d{2}\.\d{4}',
            r'\d{4}-\d{2}-\d{2}',
            r'\d{2}/\d{2}/\d{4}'
        ]
        for pattern in date_patterns:
            if re.match(pattern, sample):
                self.pattern = DataPattern.DATE
                self.format_string = "DD.MM.YYYY" if "\\." in pattern else "YYYY-MM-DD"
                return True

        # Проверка валюты
        if sample.startswith('$') or sample.startswith('€') or sample.startswith('₽') or 'руб' in sample.lower():
            self.pattern = DataPattern.CURRENCY
            return True

        # Проверка процентов
        if sample.endswith('%'):
            self.pattern = DataPattern.PERCENTAGE
            return True

        # Проверка числа
        try:
            float(sample.replace(',', '.').replace(' ', '').replace('$', '').replace('€', '').replace('₽', '').replace('%', ''))
            self.pattern = DataPattern.NUMBER
            return True
        except:
            pass

        # Проверка формулы
        if sample.startswith('='):
            self.pattern = DataPattern.FORMULA
            return True

        return True

    def to_dict(self):
        """Преобразует в словарь для JSON"""
        return {
            "name": self.name,
            "column_index": self.column_index,
            "pattern": self.pattern.value,  # Используем value вместо объекта
            "format_string": self.format_string,
            "is_key_field": self.is_key_field,
            "validation_rules": self.validation_rules
        }


@dataclass
class TemplateLogic:
    """Логика шаблона"""
    name: str
    condition: Dict[str, Any]  # {field: "имя", operation: "equals", value: "значение"}
    actions: List[Dict[str, Any]]  # [{action: "set_value", field: "имя", value: "значение"}, ...]
    description: str = ""

    def to_dict(self):
        """Преобразует в словарь"""
        return {
            "name": self.name,
            "condition": self.condition,
            "actions": self.actions,
            "description": self.description
        }


@dataclass
class ExportTemplate:
    """Шаблон экспорта"""
    name: str
    description: str = ""
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    modified_at: str = field(default_factory=lambda: datetime.now().isoformat())
    source_range: Optional[CellRange] = None
    fields: List[TemplateField] = field(default_factory=list)
    logic_rules: List[TemplateLogic] = field(default_factory=list)
    settings: Dict[str, Any] = field(default_factory=lambda: {
        "auto_detect_patterns": True,
        "preserve_formulas": True,
        "include_headers": True,
        "skip_empty_rows": True
    })

    def to_dict(self):
        """Преобразование в словарь для сохранения"""
        return {
            "name": self.name,
            "description": self.description,
            "created_at": self.created_at,
            "modified_at": self.modified_at,
            "source_range": self.source_range.to_dict() if self.source_range else None,
            "fields": [field.to_dict() for field in self.fields],
            "logic_rules": [logic.to_dict() for logic in self.logic_rules],
            "settings": self.settings
        }

    @classmethod
    def from_dict(cls, data: Dict):
        """Создание из словаря"""
        template = cls(
            name=data["name"],
            description=data.get("description", ""),
            created_at=data.get("created_at", datetime.now().isoformat()),
            modified_at=data.get("modified_at", datetime.now().isoformat()),
            settings=data.get("settings", {})
        )

        # Восстанавливаем диапазон
        if data.get("source_range"):
            template.source_range = CellRange(**data["source_range"])

        # Восстанавливаем поля
        for field_data in data.get("fields", []):
            field = TemplateField(
                name=field_data.get("name", ""),
                column_index=field_data.get("column_index", 0)
            )
            if "pattern" in field_data:
                # Преобразуем строку в DataPattern
                pattern_value = field_data["pattern"]
                try:
                    field.pattern = DataPattern(pattern_value)
                except ValueError:
                    field.pattern = DataPattern.TEXT
            field.format_string = field_data.get("format_string", "")
            field.is_key_field = field_data.get("is_key_field", False)
            field.validation_rules = field_data.get("validation_rules", [])
            template.fields.append(field)

        # Восстанавливаем логику
        for logic_data in data.get("logic_rules", []):
            template.logic_rules.append(TemplateLogic(**logic_data))

        return template


class EnhancedJSONEncoder(json.JSONEncoder):
    """Кастомный JSON энкодер для поддержки наших объектов"""

    def default(self, obj):
        if isinstance(obj, DataPattern):
            return obj.value
        elif hasattr(obj, 'to_dict'):
            return obj.to_dict()
        elif isinstance(obj, Enum):
            return obj.value
        elif isinstance(obj, (datetime,)):
            return obj.isoformat()
        return super().default(obj)


class TemplateManager:
    """Менеджер шаблонов с поддержкой встроенных и пользовательских шаблонов"""

    def __init__(self, templates_dir: str = "templates", user_templates_dir: str = "user_templates"):
        self.templates_dir = Path(templates_dir)
        self.user_templates_dir = Path(user_templates_dir)
        self.templates_dir.mkdir(exist_ok=True)
        self.user_templates_dir.mkdir(exist_ok=True)
        self.current_template: Optional[ExportTemplate] = None
        self.templates: Dict[str, ExportTemplate] = {}
        self.load_templates()

    def load_templates(self):
        """Загружает все шаблоны из обеих папок (встроенные и пользовательские)"""
        self.templates.clear()

        # Загружаем встроенные шаблоны
        for file in self.templates_dir.glob("*.json"):
            try:
                with open(file, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                template = ExportTemplate.from_dict(data)
                self.templates[template.name] = template
                print(f"✓ Загружен встроенный шаблон: {template.name}")

            except json.JSONDecodeError as e:
                print(f"✗ Ошибка синтаксиса JSON в файле {file}: {e}")
                self._try_fix_json(file)
            except Exception as e:
                print(f"✗ Ошибка загрузки шаблона {file}: {e}")

        # Загружаем пользовательские шаблоны
        for file in self.user_templates_dir.glob("templates/*.json"):
            try:
                with open(file, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                template = ExportTemplate.from_dict(data)
                # Если пользовательский шаблон имеет то же имя, то переписываем встроенный
                self.templates[template.name] = template
                print(f"✓ Загружен пользовательский шаблон: {template.name}")

            except json.JSONDecodeError as e:
                print(f"✗ Ошибка синтаксиса JSON в файле {file}: {e}")
                self._try_fix_json(file)
            except Exception as e:
                print(f"✗ Ошибка загрузки шаблона {file}: {e}")

        # Если шаблонов не найдено, создаём несколько примеров по умолчанию
        if not self.templates:
            print("⚠ Шаблоны не найдены — создаём шаблоны по умолчанию")
            self.create_default_templates()

    def _try_fix_json(self, file_path: Path):
        """Пытается исправить поврежденный JSON файл"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()

            # Удаляем невалидные символы
            content = content.strip()
            if not content.startswith('{'):
                # Находим первую {
                start = content.find('{')
                if start != -1:
                    content = content[start:]

            if not content.endswith('}'):
                # Находим последнюю }
                end = content.rfind('}')
                if end != -1:
                    content = content[:end+1]

            # Удаляем лишние запятые в конце массивов/объектов
            import re
            content = re.sub(r',\s*}', '}', content)
            content = re.sub(r',\s*]', ']', content)

            # Пробуем загрузить исправленный JSON
            data = json.loads(content)

            # Сохраняем исправленный файл
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

            print(f"Файл {file_path} исправлен")

        except Exception as e:
            print(f"Не удалось исправить файл {file_path}: {e}")
            # Создаем резервную копию поврежденного файла
            backup = file_path.with_suffix('.json.bak')
            try:
                with open(file_path, 'r', encoding='utf-8') as src, \
                     open(backup, 'w', encoding='utf-8') as dst:
                    dst.write(src.read())
                print(f"Создана резервная копия: {backup}")
            except:
                pass

    def save_template(self, template: ExportTemplate, is_user_template: bool = True) -> bool:
        """
        Сохраняет шаблон
        
        Args:
            template: Объект шаблона для сохранения
            is_user_template: Если True, сохраняет в user_templates иначе в встроенные
        """
        try:
            template.modified_at = datetime.now().isoformat()

            # Выбираем директорию
            if is_user_template:
                target_dir = self.user_templates_dir / "templates"
                target_dir.mkdir(parents=True, exist_ok=True)
            else:
                target_dir = self.templates_dir

            filename = target_dir / f"{template.name}.json"

            # Используем кастомный энкодер для сериализации
            with open(filename, 'w', encoding='utf-8') as f:
                data = template.to_dict()
                json.dump(data, f, cls=EnhancedJSONEncoder, ensure_ascii=False, indent=2)

            # Сохраняем метаданные для пользовательских шаблонов
            if is_user_template:
                metadata_dir = self.user_templates_dir / "metadata"
                metadata_dir.mkdir(parents=True, exist_ok=True)
                metadata_file = metadata_dir / f"{template.name}.json"
                
                metadata = {
                    "name": template.name,
                    "description": template.description,
                    "created_at": template.created_at,
                    "fields_count": len(template.fields),
                    "tags": []
                }
                
                with open(metadata_file, 'w', encoding='utf-8') as f:
                    json.dump(metadata, f, ensure_ascii=False, indent=2)

            self.templates[template.name] = template
            print(f"✓ Шаблон сохранен: {template.name}")
            return True

        except Exception as e:
            print(f"✗ Ошибка сохранения шаблона: {e}")
            import traceback
            traceback.print_exc()
            return False

    def delete_template(self, template_name: str) -> bool:
        """Удаляет шаблон"""
        try:
            filename = self.templates_dir / f"{template_name}.json"
            if filename.exists():
                filename.unlink()
                self.templates.pop(template_name, None)
                return True
        except Exception as e:
            print(f"Ошибка удаления шаблона: {e}")
        return False

    def get_template_names(self) -> List[str]:
        """Возвращает список имен шаблонов"""
        return list(self.templates.keys())

    def get_template(self, name: str) -> Optional[ExportTemplate]:
        """Возвращает шаблон по имени"""
        return self.templates.get(name)

    def create_default_templates(self):
        """Создаёт несколько примерных шаблонов, если папка пуста"""
        samples = []

        # Контакты
        t1 = ExportTemplate(name="Контакты", description="Шаблон для списка контактов")
        t1.fields = [
            TemplateField(name="Имя", column_index=0, pattern=DataPattern.TEXT),
            TemplateField(name="Email", column_index=1, pattern=DataPattern.EMAIL),
            TemplateField(name="Телефон", column_index=2, pattern=DataPattern.PHONE),
        ]
        samples.append(t1)

        # Товары
        t2 = ExportTemplate(name="Товары", description="Шаблон каталога товаров")
        t2.fields = [
            TemplateField(name="SKU", column_index=0, pattern=DataPattern.TEXT, is_key_field=True),
            TemplateField(name="Название", column_index=1, pattern=DataPattern.TEXT),
            TemplateField(name="Цена", column_index=2, pattern=DataPattern.CURRENCY),
            TemplateField(name="Количество", column_index=3, pattern=DataPattern.NUMBER),
        ]
        samples.append(t2)

        # Продажи
        t3 = ExportTemplate(name="Продажи", description="Шаблон для отчёта продаж")
        t3.fields = [
            TemplateField(name="Дата", column_index=0, pattern=DataPattern.DATE),
            TemplateField(name="Товар", column_index=1, pattern=DataPattern.TEXT),
            TemplateField(name="Количество", column_index=2, pattern=DataPattern.NUMBER),
            TemplateField(name="Выручка", column_index=3, pattern=DataPattern.CURRENCY),
        ]
        samples.append(t3)

        for tpl in samples:
            # Не перезаписываем, если случайно уже появился шаблон с таким именем
            if tpl.name not in self.templates:
                self.save_template(tpl)

    def validate_template_file(self, file_path: Path) -> bool:
        """Проверяет валидность JSON файла шаблона"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                json.load(f)
            return True
        except Exception as e:
            print(f"✗ Файл {file_path} невалиден: {e}")
            return False

    def export_template(self, template_name: str, output_path: Path) -> bool:
        """Экспортирует шаблон в JSON файл"""
        try:
            template = self.get_template(template_name)
            if not template:
                print(f"✗ Шаблон '{template_name}' не найден")
                return False

            with open(output_path, 'w', encoding='utf-8') as f:
                data = template.to_dict()
                json.dump(data, f, cls=EnhancedJSONEncoder, ensure_ascii=False, indent=2)

            print(f"✓ Шаблон экспортирован: {output_path}")
            return True

        except Exception as e:
            print(f"✗ Ошибка экспорта шаблона: {e}")
            return False

    def import_template(self, file_path: Path, is_user_template: bool = True) -> bool:
        """Импортирует шаблон из JSON файла"""
        try:
            if not self.validate_template_file(file_path):
                return False

            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            template = ExportTemplate.from_dict(data)
            return self.save_template(template, is_user_template)

        except Exception as e:
            print(f"✗ Ошибка импорта шаблона: {e}")
            return False

    def get_template_info(self, template_name: str) -> Dict[str, Any]:
        """Возвращает подробную информацию о шаблоне"""
        template = self.get_template(template_name)
        if not template:
            return {}

        return {
            "name": template.name,
            "description": template.description,
            "created_at": template.created_at,
            "modified_at": template.modified_at,
            "fields_count": len(template.fields),
            "fields": [
                {
                    "name": f.name,
                    "type": f.pattern.value,
                    "is_key": f.is_key_field
                }
                for f in template.fields
            ],
            "rules_count": len(template.logic_rules),
            "settings": template.settings
        }