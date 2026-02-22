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
let mainWindow = null;
let isAppClosing = false;
/**
 * Создать главное окно приложения
 */
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        backgroundColor: '#f8f9fa',
        titleBarStyle: 'default',
    });
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    // Открыть DevTools по умолчанию
    mainWindow.webContents.openDevTools();
    // Создаем кастомное меню
    const template = [
        {
            label: 'Файл',
            submenu: [
                { label: 'Новый', accelerator: 'CmdOrCtrl+N', click: () => console.log('Новый файл') },
                { label: 'Открыть', accelerator: 'CmdOrCtrl+O', click: () => console.log('Открыть файл') },
                { label: 'Сохранить', accelerator: 'CmdOrCtrl+S', click: () => console.log('Сохранить') },
                { type: 'separator' },
                { label: 'Экспорт', submenu: [
                        {
                            label: 'Excel (.xlsx)',
                            click: () => mainWindow?.webContents.send('export', 'xlsx')
                        },
                        {
                            label: 'CSV (.csv)',
                            click: () => mainWindow?.webContents.send('export', 'csv')
                        },
                        {
                            label: 'JSON (.json)',
                            click: () => mainWindow?.webContents.send('export', 'json')
                        },
                        {
                            label: 'HTML (.html)',
                            click: () => mainWindow?.webContents.send('export', 'html')
                        },
                        {
                            label: 'PNG (.png)',
                            click: () => mainWindow?.webContents.send('export', 'png')
                        },
                    ] },
                { type: 'separator' },
                { label: 'Выход', accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4', click: () => app.quit() },
            ],
        },
        {
            label: 'Правка',
            submenu: [
                { label: 'Отменить', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
                { label: 'Повторить', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
                { type: 'separator' },
                { label: 'Вырезать', accelerator: 'CmdOrCtrl+X', role: 'cut' },
                { label: 'Копировать', accelerator: 'CmdOrCtrl+C', role: 'copy' },
                { label: 'Вставить', accelerator: 'CmdOrCtrl+V', role: 'paste' },
                { label: 'Удалить', accelerator: 'Delete', click: () => console.log('Удалить') },
                { type: 'separator' },
                { label: 'Выделить всё', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
            ],
        },
        {
            label: 'Вид',
            submenu: [
                { label: 'Масштаб', submenu: [
                        { label: 'Увеличить', accelerator: 'CmdOrCtrl+Plus', click: () => {
                                const win = BrowserWindow.getFocusedWindow();
                                if (win) {
                                    const zoom = win.webContents.getZoomLevel();
                                    win.webContents.setZoomLevel(zoom + 0.5);
                                }
                            } },
                        { label: 'Уменьшить', accelerator: 'CmdOrCtrl+-', click: () => {
                                const win = BrowserWindow.getFocusedWindow();
                                if (win) {
                                    const zoom = win.webContents.getZoomLevel();
                                    win.webContents.setZoomLevel(zoom - 0.5);
                                }
                            } },
                        { label: 'Сбросить (100%)', accelerator: 'CmdOrCtrl+0', click: () => {
                                const win = BrowserWindow.getFocusedWindow();
                                if (win) {
                                    win.webContents.setZoomLevel(0);
                                }
                            } },
                    ] },
                { type: 'separator' },
                { label: 'На весь экран', accelerator: 'F11', role: 'togglefullscreen' },
            ],
        },
        {
            label: 'Вставка',
            submenu: [
                { label: 'Ячейки', click: () => console.log('Вставить ячейки') },
                { label: 'Строки', click: () => console.log('Вставить строки') },
                { label: 'Столбцы', click: () => console.log('Вставить столбцы') },
                { type: 'separator' },
                { label: 'Функцию', click: () => console.log('Вставить функцию') },
                { label: 'Изображение', click: () => console.log('Вставить изображение') },
            ],
        },
        {
            label: 'Формат',
            submenu: [
                { label: 'Числа', submenu: [
                        { label: 'Числовой', click: () => console.log('Числовой формат') },
                        { label: 'Текстовый', click: () => console.log('Текстовый формат') },
                        { label: 'Дата', click: () => console.log('Формат даты') },
                        { label: 'Валюта', click: () => console.log('Валюта') },
                        { label: 'Процент', click: () => console.log('Процент') },
                    ] },
                { type: 'separator' },
                { label: 'Жирный', accelerator: 'CmdOrCtrl+B', click: () => console.log('Жирный') },
                { label: 'Курсив', accelerator: 'CmdOrCtrl+I', click: () => console.log('Курсив') },
                { label: 'Подчеркнутый', accelerator: 'CmdOrCtrl+U', click: () => console.log('Подчеркнутый') },
            ],
        },
        {
            label: 'Данные',
            submenu: [
                { label: 'Сортировать', click: () => console.log('Сортировать') },
                { label: 'Фильтр', accelerator: 'CmdOrCtrl+Shift+L', click: () => console.log('Фильтр') },
            ],
        },
        {
            label: 'ИИ Помощник',
            submenu: [
                { label: 'Анализ данных', accelerator: 'CmdOrCtrl+K', click: () => console.log('ИИ Анализ') },
                { label: 'Генерация формул', click: () => console.log('ИИ Формулы') },
                { label: 'Очистка данных', click: () => console.log('ИИ Очистка') },
            ],
        },
        {
            label: 'Справка',
            submenu: [
                { label: 'О программе', click: () => console.log('О программе') },
                { label: 'Документация', click: () => console.log('Документация') },
            ],
        },
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
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
        }
        else {
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
function registerFileSaveHandler() {
    ipcMain.handle('save-file', async (event, { content, mimeType, extension, defaultName }) => {
        // Получаем папку Документы по умолчанию
        const documentsPath = app.getPath('documents');
        const defaultPath = path.join(documentsPath, `${defaultName}.${extension}`);
        const result = await dialog.showSaveDialog(mainWindow, {
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
    // Регистрируем IPC обработчики
    registerIPCHandlers();
    registerFileSaveHandler();
    // Создаем окно
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
//# sourceMappingURL=main.js.map