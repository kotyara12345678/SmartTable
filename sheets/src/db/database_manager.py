"""
Менеджер базы данных SQLite - упрощённая версия
Только для работы с таблицами и функциями
"""

import sqlite3
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any
from contextlib import contextmanager
import logging

from .models import Spreadsheet, SheetFunction, RecentFile

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Менеджер для работы с SQLite базой данных"""
    
    DB_VERSION = 1
    
    def __init__(self, db_path: str = None):
        """Инициализация менеджера БД"""
        if db_path is None:
            self.db_path = Path.home() / ".smarttable" / "smarttable.db"
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
        else:
            self.db_path = db_path if db_path == ":memory:" else str(Path(db_path))
            if self.db_path != ":memory:":
                Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        
        # Для :memory: БД создаём постоянное подключение
        if self.db_path == ":memory:":
            self.connection = sqlite3.connect(":memory:")
            self.connection.row_factory = sqlite3.Row
            self.connection.execute("PRAGMA foreign_keys = ON")
        else:
            self.connection = None
        
        self._init_database()
    
    @contextmanager
    def get_connection(self):
        """Context manager для подключения к БД"""
        if self.connection:
            try:
                yield self.connection
                self.connection.commit()
            except sqlite3.Error as e:
                logger.error(f"Database error: {e}")
                self.connection.rollback()
                raise
        else:
            try:
                conn = sqlite3.connect(str(self.db_path))
                conn.row_factory = sqlite3.Row
                conn.execute("PRAGMA foreign_keys = ON")
                yield conn
                conn.commit()
            except sqlite3.Error as e:
                logger.error(f"Database error: {e}")
                if conn:
                    conn.rollback()
                raise
            finally:
                if conn:
                    conn.close()
    
    def _init_database(self):
        """Инициализация схемы базы данных"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Таблица версии БД
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS db_version (
                    version INTEGER PRIMARY KEY,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            cursor.execute('SELECT version FROM db_version')
            result = cursor.fetchone()
            current_version = result[0] if result else 0
            
            if current_version < self.DB_VERSION:
                self._migrate_database(cursor, current_version)
                cursor.execute('DELETE FROM db_version')
                cursor.execute(f'INSERT INTO db_version (version) VALUES ({self.DB_VERSION})')
                if self.connection:
                    self.connection.commit()
                logger.info(f"Database migrated from {current_version} to {self.DB_VERSION}")
    
    def _migrate_database(self, cursor: sqlite3.Cursor, from_version: int):
        """Миграция схемы БД"""
        if from_version < 1:
            self._create_schema_v1(cursor)
    
    def _create_schema_v1(self, cursor: sqlite3.Cursor):
        """Создание исходной схемы БД версии 1"""
        
        # ==================== ТАБЛИЦЫ ====================
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS spreadsheets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL COLLATE NOCASE,
                title TEXT,
                content TEXT DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                file_size INTEGER DEFAULT 0
            )
        ''')
        
        # Индексы для быстрого поиска
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_ss_title ON spreadsheets(title)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_ss_created ON spreadsheets(created_at DESC)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_ss_updated ON spreadsheets(updated_at DESC)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_ss_filename ON spreadsheets(filename)')
        
        # ==================== ФУНКЦИИ ====================
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sheet_functions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE COLLATE NOCASE,
                category TEXT NOT NULL,
                formula TEXT NOT NULL,
                description TEXT,
                example TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_func_category ON sheet_functions(category)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_func_name ON sheet_functions(name)')
        
        # ==================== НЕДАВНИЕ ФАЙЛЫ ====================
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS recent_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL COLLATE NOCASE,
                file_path TEXT NOT NULL,
                opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                size_mb REAL DEFAULT 0.0
            )
        ''')
        
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_recent_opened ON recent_files(opened_at DESC)')
        
        # Инициализация базовых функций
        self._init_default_functions(cursor)
    
    def _init_default_functions(self, cursor: sqlite3.Cursor):
        """Инициализация базовых функций"""
        functions = [
            # Математические
            ('SUM', 'math', 'SUM(range)', 'Сумма значений', '=SUM(A1:A10)'),
            ('AVERAGE', 'math', 'AVERAGE(range)', 'Среднее значение', '=AVERAGE(B1:B5)'),
            ('MIN', 'math', 'MIN(range)', 'Минимум', '=MIN(C1:C10)'),
            ('MAX', 'math', 'MAX(range)', 'Максимум', '=MAX(C1:C10)'),
            ('COUNT', 'math', 'COUNT(range)', 'Количество', '=COUNT(D1:D10)'),
            ('SQRT', 'math', 'SQRT(number)', 'Корень', '=SQRT(16)'),
            ('POWER', 'math', 'POWER(base, exp)', 'Степень', '=POWER(2, 3)'),
            ('ABS', 'math', 'ABS(number)', 'Модуль', '=ABS(-5)'),
            ('ROUND', 'math', 'ROUND(number, digits)', 'Округление', '=ROUND(3.14, 2)'),
            ('MOD', 'math', 'MOD(number, divisor)', 'Остаток', '=MOD(10, 3)'),
            
            # Текстовые
            ('CONCATENATE', 'text', 'CONCATENATE(text1, text2)', 'Объединение', '=CONCATENATE("Hello", " World")'),
            ('LEN', 'text', 'LEN(text)', 'Длина текста', '=LEN("hello")'),
            ('UPPER', 'text', 'UPPER(text)', 'Верхний регистр', '=UPPER("hello")'),
            ('LOWER', 'text', 'LOWER(text)', 'Нижний регистр', '=LOWER("HELLO")'),
            ('TRIM', 'text', 'TRIM(text)', 'Удалить пробелы', '=TRIM("  text  ")'),
            ('LEFT', 'text', 'LEFT(text, count)', 'Первые символы', '=LEFT("hello", 3)'),
            ('RIGHT', 'text', 'RIGHT(text, count)', 'Последние символы', '=RIGHT("hello", 2)'),
            ('FIND', 'text', 'FIND(search, text)', 'Найти позицию', '=FIND("l", "hello")'),
            ('REPLACE', 'text', 'REPLACE(text, old, new)', 'Заменить', '=REPLACE("hello", "ll", "LL")'),
            
            # Логические
            ('IF', 'logic', 'IF(condition, true, false)', 'Условие', '=IF(A1>10, "Yes", "No")'),
            
            # Дата
            ('NOW', 'date', 'NOW()', 'Текущие дата и время', '=NOW()'),
            ('TODAY', 'date', 'TODAY()', 'Сегодняшняя дата', '=TODAY()'),
        ]
        
        try:
            for name, category, formula, description, example in functions:
                cursor.execute('''
                    INSERT OR IGNORE INTO sheet_functions 
                    (name, category, formula, description, example)
                    VALUES (?, ?, ?, ?, ?)
                ''', (name, category, formula, description, example))
        except Exception as e:
            logger.warning(f"Error initializing functions: {e}")
    
    # ==================== ТАБЛИЦЫ ====================
    
    def create_spreadsheet(self, filename: str, title: str = "", content: str = "{}") -> Optional[Spreadsheet]:
        """Создать таблицу"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute('''
                    INSERT INTO spreadsheets (filename, title, content, file_size)
                    VALUES (?, ?, ?, ?)
                ''', (filename, title, content, len(content)))
                
                sheet_id = cursor.lastrowid
                logger.info(f"Created: {filename} (id={sheet_id})")
                return self.get_spreadsheet_by_id(sheet_id)
            except sqlite3.IntegrityError as e:
                logger.error(f"Error: {e}")
                return None
    
    def get_spreadsheet_by_id(self, sheet_id: int) -> Optional[Spreadsheet]:
        """Получить таблицу по ID"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, filename, title, content, created_at, updated_at, file_size
                FROM spreadsheets WHERE id = ?
            ''', (sheet_id,))
            
            row = cursor.fetchone()
            if row:
                return Spreadsheet(
                    id=row[0],
                    filename=row[1],
                    title=row[2],
                    content=row[3],
                    created_at=datetime.fromisoformat(row[4]) if row[4] else None,
                    updated_at=datetime.fromisoformat(row[5]) if row[5] else None,
                    file_size=row[6]
                )
            return None
    
    def get_spreadsheet_by_filename(self, filename: str) -> Optional[Spreadsheet]:
        """Получить таблицу по имени"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, filename, title, content, created_at, updated_at, file_size
                FROM spreadsheets WHERE filename = ? COLLATE NOCASE
            ''', (filename,))
            
            row = cursor.fetchone()
            if row:
                return Spreadsheet(
                    id=row[0],
                    filename=row[1],
                    title=row[2],
                    content=row[3],
                    created_at=datetime.fromisoformat(row[4]) if row[4] else None,
                    updated_at=datetime.fromisoformat(row[5]) if row[5] else None,
                    file_size=row[6]
                )
            return None
    
    def get_all_spreadsheets(self, limit: int = 50) -> List[Spreadsheet]:
        """Получить все таблицы"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, filename, title, content, created_at, updated_at, file_size
                FROM spreadsheets ORDER BY updated_at DESC LIMIT ?
            ''', (limit,))
            
            sheets = []
            for row in cursor.fetchall():
                sheets.append(Spreadsheet(
                    id=row[0],
                    filename=row[1],
                    title=row[2],
                    content=row[3],
                    created_at=datetime.fromisoformat(row[4]) if row[4] else None,
                    updated_at=datetime.fromisoformat(row[5]) if row[5] else None,
                    file_size=row[6]
                ))
            return sheets
    
    def search_spreadsheets(self, query: str, limit: int = 50) -> List[Spreadsheet]:
        """Поиск таблиц"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            search = f"%{query}%"
            cursor.execute('''
                SELECT id, filename, title, content, created_at, updated_at, file_size
                FROM spreadsheets
                WHERE title LIKE ? OR filename LIKE ?
                ORDER BY updated_at DESC LIMIT ?
            ''', (search, search, limit))
            
            sheets = []
            for row in cursor.fetchall():
                sheets.append(Spreadsheet(
                    id=row[0],
                    filename=row[1],
                    title=row[2],
                    content=row[3],
                    created_at=datetime.fromisoformat(row[4]) if row[4] else None,
                    updated_at=datetime.fromisoformat(row[5]) if row[5] else None,
                    file_size=row[6]
                ))
            return sheets
    
    def update_spreadsheet(self, sheet_id: int, filename: str = None, title: str = None, 
                          content: str = None) -> bool:
        """Обновить таблицу"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            updates = []
            params = []
            
            if filename is not None:
                updates.append("filename = ?")
                params.append(filename)
            if title is not None:
                updates.append("title = ?")
                params.append(title)
            if content is not None:
                updates.append("content = ?")
                updates.append("file_size = ?")
                params.extend([content, len(content)])
            
            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(sheet_id)
            
            if updates:
                query = f"UPDATE spreadsheets SET {', '.join(updates)} WHERE id = ?"
                cursor.execute(query, params)
                return cursor.rowcount > 0
            return False
    
    def delete_spreadsheet(self, sheet_id: int) -> bool:
        """Удалить таблицу"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('DELETE FROM spreadsheets WHERE id = ?', (sheet_id,))
            return cursor.rowcount > 0
    
    # ==================== ФУНКЦИИ ====================
    
    def get_all_functions(self) -> List[SheetFunction]:
        """Получить все функции"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, name, category, formula, description, example, created_at
                FROM sheet_functions ORDER BY category, name
            ''')
            
            functions = []
            for row in cursor.fetchall():
                functions.append(SheetFunction(
                    id=row[0],
                    name=row[1],
                    category=row[2],
                    formula=row[3],
                    description=row[4],
                    example=row[5],
                    created_at=datetime.fromisoformat(row[6]) if row[6] else None
                ))
            return functions
    
    def get_functions_by_category(self, category: str) -> List[SheetFunction]:
        """Функции по категории"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, name, category, formula, description, example, created_at
                FROM sheet_functions WHERE category = ? ORDER BY name
            ''', (category,))
            
            functions = []
            for row in cursor.fetchall():
                functions.append(SheetFunction(
                    id=row[0],
                    name=row[1],
                    category=row[2],
                    formula=row[3],
                    description=row[4],
                    example=row[5],
                    created_at=datetime.fromisoformat(row[6]) if row[6] else None
                ))
            return functions
    
    def search_functions(self, query: str) -> List[SheetFunction]:
        """Поиск функций"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            search = f"%{query}%"
            cursor.execute('''
                SELECT id, name, category, formula, description, example, created_at
                FROM sheet_functions
                WHERE name LIKE ? OR description LIKE ? OR formula LIKE ?
                ORDER BY category, name
            ''', (search, search, search))
            
            functions = []
            for row in cursor.fetchall():
                functions.append(SheetFunction(
                    id=row[0],
                    name=row[1],
                    category=row[2],
                    formula=row[3],
                    description=row[4],
                    example=row[5],
                    created_at=datetime.fromisoformat(row[6]) if row[6] else None
                ))
            return functions
    
    # ==================== НЕДАВНИЕ ====================
    
    def add_recent_file(self, filename: str, file_path: str, size_mb: float = 0.0) -> bool:
        """Добавить в недавние"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute('''
                    INSERT INTO recent_files (filename, file_path, size_mb)
                    VALUES (?, ?, ?)
                ''', (filename, file_path, size_mb))
                return True
            except Exception as e:
                logger.error(f"Error: {e}")
                return False
    
    def get_recent_files(self, limit: int = 20) -> List[RecentFile]:
        """Последние файлы"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, filename, file_path, opened_at, size_mb
                FROM recent_files ORDER BY opened_at DESC LIMIT ?
            ''', (limit,))
            
            files = []
            for row in cursor.fetchall():
                files.append(RecentFile(
                    id=row[0],
                    filename=row[1],
                    file_path=row[2],
                    opened_at=datetime.fromisoformat(row[3]) if row[3] else None,
                    size_mb=row[4]
                ))
            return files
    
    # ==================== INFO ====================
    
    def get_database_info(self) -> Dict[str, Any]:
        """Информация о БД"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('SELECT COUNT(*) FROM spreadsheets')
            sheets = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM sheet_functions')
            funcs = cursor.fetchone()[0]
            
            cursor.execute('SELECT COUNT(*) FROM recent_files')
            recent = cursor.fetchone()[0]
            
            db_size_mb = 0.0
            db_str = str(self.db_path)
            if db_str != ":memory:":
                db_obj = Path(db_str)
                if db_obj.exists():
                    db_size_mb = db_obj.stat().st_size / (1024 * 1024)
            
            return {
                'db_path': db_str,
                'db_size_mb': db_size_mb,
                'spreadsheets': sheets,
                'functions': funcs,
                'recent_files': recent,
                'version': self.DB_VERSION
            }
