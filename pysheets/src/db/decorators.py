"""
Декораторы для логирования операций БД
"""

import functools
import logging
from typing import Callable, Any

logger = logging.getLogger(__name__)


def audit_log(action: str, resource_type: str):
    """Декоратор для логирования операций в аудит"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            try:
                result = func(*args, **kwargs)
                logger.debug(f"Audit action: {action} on {resource_type}")
                return result
            except Exception as e:
                logger.error(f"Audit action failed: {action} on {resource_type}: {e}")
                raise
        return wrapper
    return decorator


def require_auth(func: Callable) -> Callable:
    """Декоратор требующий аутентификации"""
    @functools.wraps(func)
    def wrapper(self, *args, **kwargs) -> Any:
        if not hasattr(self, 'auth_manager') or not self.auth_manager.is_authenticated():
            raise PermissionError("Authentication required")
        return func(self, *args, **kwargs)
    return wrapper


def require_permission(permission: str):
    """Декоратор требующий определённого разрешения"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(self, *args, **kwargs) -> Any:
            if not hasattr(self, 'auth_manager'):
                raise PermissionError("Authentication manager not found")
            from gdata.contentforshopping.data import Permission
            try:
                perm = Permission(permission)
                self.auth_manager.require_permission(perm)
            except ValueError:
                logger.error(f"Unknown permission: {permission}")
                raise
            
            return func(self, *args, **kwargs)
        return wrapper
    return decorator


__all__ = ['audit_log', 'require_auth', 'require_permission']
