"""
Утилиты для работы с базой данных
"""

import logging
from typing import Optional
from pysheets.src.db.database_manager import DatabaseManager
from pysheets.src.db.models import UserRole, Permission

logger = logging.getLogger(__name__)


class AuthenticationManager:
    """Менеджер аутентификации и авторизации"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
        self.current_user = None
    
    def login(self, username: str, password: str) -> bool:
        """Вход пользователя"""
        user = self.db.authenticate_user(username, password)
        if user and user.is_active:
            self.current_user = user
            logger.info(f"User {username} logged in")
            return True
        
        logger.warning(f"Login failed for {username}")
        return False
    
    def logout(self):
        """Выход пользователя"""
        if self.current_user:
            logger.info(f"User {self.current_user.username} logged out")
        self.current_user = None
    
    def is_authenticated(self) -> bool:
        """Проверить аутентификацию"""
        return self.current_user is not None
    
    def check_permission(self, permission: Permission) -> bool:
        """Проверить разрешение текущего пользователя"""
        if not self.current_user:
            return False
        return self.db.has_permission(self.current_user.id, permission)
    
    def require_permission(self, permission: Permission):
        """Требовать разрешение (выбросить исключение если нет)"""
        if not self.check_permission(permission):
            raise PermissionError(f"User {self.current_user.username} lacks permission: {permission.value}")
    
    def is_admin(self) -> bool:
        """Проверить админ ли пользователь"""
        return self.current_user and self.current_user.role == UserRole.ADMIN


class DatabaseInitializer:
    """Инициализатор БД"""
    
    @staticmethod
    def init_with_demo_data(db_manager: DatabaseManager):
        """Инициализировать БД с демо данными"""
        try:
            # Создаём админ пользователя
            admin = db_manager.create_user(
                username="admin",
                email="admin@smarttable.local",
                password="admin123",
                full_name="Administrator",
                role=UserRole.ADMIN
            )
            logger.info(f"Created admin user: {admin.username}")
            
            # Создаём тестового пользователя
            user = db_manager.create_user(
                username="user",
                email="user@smarttable.local",
                password="user123",
                full_name="Test User",
                role=UserRole.USER
            )
            logger.info(f"Created test user: {user.username}")
            
            # Создаём таблицу админа
            if admin:
                sheet = db_manager.create_spreadsheet(
                    owner_id=admin.id,
                    filename="demo.smarttable",
                    title="Demo Spreadsheet",
                    description="Example spreadsheet with data"
                )
                logger.info(f"Created demo spreadsheet: {sheet.title if sheet else 'Failed'}")
            
        except Exception as e:
            logger.warning(f"Demo data creation: {e}")


__all__ = ['AuthenticationManager', 'DatabaseInitializer']
