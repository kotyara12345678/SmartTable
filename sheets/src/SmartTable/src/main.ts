/**
 * Electron Main Process
 * Основной процесс Electron - создание окна, меню, управление приложением
 */

import * as electron from 'electron';
const { app, BrowserWindow, Menu, ipcMain, dialog } = electron;
import path from 'path';
import { fileURLToPath } from 'url';
import { registerIPCHandlers, cleanupIPCHandlers } from './ui/core/ipc-handlers.js';
import { RunServer } from './ui/core/server/app/server.js';
import { createLogger } from './ui/core/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const log = createLogger('Main');

let mainWindow: electron.BrowserWindow | null = null;
let splashWindow: electron.BrowserWindow | null = null;
let isAppClosing = false;

/**
 * Создать splash screen (заставку при загрузке)
 */
function createSplashScreen(): void {
  splashWindow = new BrowserWindow({
    width: 600,
    height: 400,
    frame: false,
    alwaysOnTop: true,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
  });

  // Загружаем изображение заставки
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  // В режиме разработки используем app.getAppPath() для получения пути к корню проекта
  const splashPath = isDev
    ? path.join(app.getAppPath(), 'SmartTableStartApp.png')
    : path.join(process.resourcesPath, 'SmartTableStartApp.png');

  log.info('[Main] Splash screen path:', splashPath, '| app.getAppPath():', app.getAppPath());
  splashWindow.loadFile(splashPath);

  // Центрируем окно
  splashWindow.center();
}

/**
 * Создать главное окно приложения
 */
function createWindow(): void {
  // Проверяем, запущено ли приложение в режиме разработки
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  // Пути к изображениям и файлам
  const appRoot = app.getAppPath();
  const iconPath = isDev
    ? path.join(appRoot, 'SmartTable.png')
    : path.join(process.resourcesPath, 'SmartTable.png');
  const preloadPath = path.join(__dirname, 'preload.js');
  const indexPath = path.join(__dirname, 'index.html');

  log.info('[Main] App root:', appRoot);
  log.info('[Main] Icon path:', iconPath);
  log.info('[Main] Preload path:', preloadPath);
  log.info('[Main] Index path:', indexPath);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
      devTools: isDev,
    },
    backgroundColor: '#f8f9fa',
    titleBarStyle: 'default',
    show: false, // Не показываем пока не загрузится
  });

  mainWindow.loadFile(indexPath);

  // Отключаем стандартное меню Electron — используем свой Top Bar
  Menu.setApplicationMenu(null);

  // Открываем DevTools ТОЛЬКО в режиме разработки
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Когда окно загрузится - ждём 5 секунд и показываем приложение
  mainWindow.once('ready-to-show', () => {
    // Очищаем кэш чтобы избавиться от старых source maps
    if (isDev && mainWindow) {
      mainWindow.webContents.session.clearCache().then(() => {
        log.info('[Main] Cache cleared');
      });
    }
    
    // Ждём 5 секунд пока показывается splash screen
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
      // Закрываем splash screen
      setTimeout(() => {
        if (splashWindow) {
          splashWindow.close();
          splashWindow = null;
        }
      }, 100);
    }, 5000); // 5 секунд показываем splash
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Обработка попытки закрытия окна
  mainWindow.on('close', (event: electron.Event) => {
    console.log('[Main] Window close event triggered, isAppClosing:', isAppClosing);
    if (!isAppClosing && mainWindow) {
      event.preventDefault();
      console.log('[Main] Sending close-app to renderer...');
      mainWindow.webContents.send('close-app');
      console.log('[Main] close-app sent successfully');
    } else {
      console.log('[Main] Allowing window to close');
    }
  });

  // Обработчик ответа от renderer
  ipcMain.on('close-app-response', () => {
    console.log('[Main] Received close-app-response, closing window');
    isAppClosing = true;
    if (mainWindow) {
      mainWindow.close();
    }
  });
}

/**
 * Инициализация приложения
 */
app.whenReady().then(() => {
  // Показываем splash screen
  createSplashScreen();

  // Регистрируем IPC обработчики (включая save-file)
  registerIPCHandlers();

  // Создаем окно (оно пока скрыто)
  createWindow();
});

/**
 * Закрытие приложения
 */
app.on('window-all-closed', () => {
  // Очищаем IPC обработчики
  cleanupIPCHandlers();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // На macOS - создаём окно только если нет окон
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

/**
 * Обработка ошибок процесса
 */
process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Main] Unhandled Rejection at:', promise, 'reason:', reason);
});
