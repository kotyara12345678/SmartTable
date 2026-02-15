"""
SmartScript Errors — исключения для SmartScript
"""


class SmartScriptError(Exception):
    """Ошибка выполнения SmartScript"""
    def __init__(self, message: str, line: int = 0):
        self.line = line
        super().__init__(f"Строка {line}: {message}" if line else message)
