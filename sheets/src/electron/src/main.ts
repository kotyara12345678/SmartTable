/**
 * Electron Main Process
 * Основной процесс Electron - создание окна, меню, управление приложением
 */

import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerIPCHandlers, cleanupIPCHandlers } from './ui/core/ipc-handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
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
  splashWindow.loadFile(path.join(__dirname, '../SmartTableStartApp.png'));
  
  // Центрируем окно
  splashWindow.center();
}

/**
 * Создать главное окно приложения
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'SmartTable.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    backgroundColor: '#f8f9fa',
    titleBarStyle: 'default',
    show: false, // Не показываем пока не загрузится
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Отключаем стандартное меню Electron — используем свой Top Bar
  Menu.setApplicationMenu(null);

  // Открываем DevTools для отладки
  mainWindow.webContents.openDevTools();

  // Когда окно загрузится - ждём 5 секунд и показываем приложение
  mainWindow.once('ready-to-show', () => {
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
  mainWindow.on('close', (event) => {
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
 * IPC обработчик для сохранения файла
 */
function registerFileSaveHandler(): void {
  ipcMain.handle('save-file', async (event, { content, mimeType, extension, defaultName }) => {
    // Получаем папку Документы по умолчанию
    const documentsPath = app.getPath('documents');
    const defaultPath = path.join(documentsPath, `${defaultName}.${extension}`);

    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'Сохранить таблицу',
      defaultPath: defaultPath,
      filters: [
        { name: 'Excel Files', extensions: [extension] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      const fs = await import('fs');
      fs.writeFileSync(result.filePath, content, 'utf8');
      console.log('[Main] File saved:', result.filePath);
      return { success: true, filePath: result.filePath };
    }

    return { success: false };
  });
}

/**
 * Инициализация приложения
 */
app.whenReady().then(() => {
  // Показываем splash screen
  createSplashScreen();
  
  // Регистрируем IPC обработчики
  registerIPCHandlers();
  registerFileSaveHandler();

  // Создаем окно (оно пока скрыто)
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
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

/**
 * Обработка ошибок процесса
 */
process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Main] Unhandled Rejection at:', promise, 'reason:', reason);
});
