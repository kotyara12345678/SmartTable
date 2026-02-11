"""
Стартовый экран (Splash Screen) - как в PyCharm
Показывает картинку во время загрузки приложения
"""

from pathlib import Path
from PyQt5.QtWidgets import QSplashScreen, QApplication
from PyQt5.QtGui import QPixmap, QFont, QColor
from PyQt5.QtCore import Qt, QTimer, QRect


class SplashScreen(QSplashScreen):
    """Splash screen для SmartTable"""
    
    def __init__(self, image_path: str = None):
        """
        Инициализация splash screen
        
        Args:
            image_path: Путь до картинки (по умолчанию ищет в assets/splash/splash.png)
        """
        # Если путь не передан, ищем стандартный
        if image_path is None:
            # Попробуем найти картинку рядом с этим файлом
            current_dir = Path(__file__).parent.parent.parent  # pysheets/
            image_path = current_dir / "assets" / "splash" / "splash.png"
        
        image_path = Path(image_path)
        
        # Если файл не существует, создаём простую заглушку
        if not image_path.exists():
            # Создаём картинку 500x350 с градиентом (размер побольше)
            pixmap = self._create_default_pixmap()
        else:
            pixmap = QPixmap(str(image_path))
            # Масштабируем если слишком большая (макс 500x350)
            if pixmap.width() > 500 or pixmap.height() > 350:
                pixmap = pixmap.scaledToWidth(500, Qt.SmoothTransformation)
        
        # Инициализируем QSplashScreen с картинкой
        super().__init__(pixmap)
        
        # Параметры
        self.setWindowFlags(Qt.SplashScreen | Qt.FramelessWindowHint)
        self.setAttribute(Qt.WA_TranslucentBackground, False)
        
        # Центрируем окно на экране
        self._center_on_screen()
        
        # Текст прогресса
        self.font = QFont("Arial", 10)
        self.font.setBold(True)
    
    def _create_default_pixmap(self) -> QPixmap:
        """Создание картинки по умолчанию если файл не найден"""
        pixmap = QPixmap(500, 350)
        pixmap.fill(QColor(41, 45, 50))  # Тёмный фон как PyCharm
        return pixmap
    
    def _center_on_screen(self):
        """Центрирование окна на экране"""
        screen = QApplication.primaryScreen()
        screen_geometry = screen.geometry()
        
        # Получаем размеры splash
        splash_width = self.width()
        splash_height = self.height()
        
        # Вычисляем центральную позицию
        x = (screen_geometry.width() - splash_width) // 2
        y = (screen_geometry.height() - splash_height) // 2
        
        # Ставим в центр
        self.move(x + screen_geometry.left(), y + screen_geometry.top())
    
    def show_message(self, message: str, alignment: Qt.Alignment = Qt.AlignBottom | Qt.AlignCenter):
        """Показать сообщение на splash screen
        
        Args:
            message: Текст сообщения
            alignment: Выравнивание текста
        """
        self.showMessage(
            message,
            alignment=alignment,
            color=QColor(255, 255, 255)  # Белый текст
        )
        # Обновляем экран
        QApplication.processEvents()


def show_splash_screen(image_path: str = None, auto_close_ms: int = 3000) -> SplashScreen:
    """
    Показать splash screen
    
    Args:
        image_path: Путь до картинки (опционально)
        auto_close_ms: Автоматически закрыть через N миллисекунд (0 = не закрывать)
        
    Returns:
        SplashScreen объект
        
    Example:
        splash = show_splash_screen()
        splash.show_message("Инициализация...")
        # ... загрузка приложения ...
        splash.finish(main_window)  # Закроет при клике и покажет main_window
    """
    splash = SplashScreen(image_path)
    splash.show()
    
    # Если указано время, закроем автоматически
    if auto_close_ms > 0:
        QTimer.singleShot(auto_close_ms, splash.close)
    
    return splash
