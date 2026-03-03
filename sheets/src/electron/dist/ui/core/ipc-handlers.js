/**
 * IPC Handlers - обработчики IPC событий
 * Регистрация всех IPC обработчиков для main процесса
 */
import { ipcMain } from 'electron';
import { aiService } from './ai/ai-service.js';
import { createLogger } from './logger.js';
const log = createLogger('IPC');
/**
 * Зарегистрировать все IPC обработчики
 */
export function registerIPCHandlers() {
    // AI Chat обработчик
    ipcMain.handle('ai-chat', async (event, data) => {
        try {
            return await aiService.chat(data);
        }
        catch (error) {
            console.error('[IPC] ai-chat error:', error);
            return {
                success: false,
                error: error.message || 'Неизвестная ошибка ИИ'
            };
        }
    });
    // Сканирование файлов на компьютере
    ipcMain.handle('scan-files', async (event, options) => {
        try {
            const fs = await import('fs');
            const path = await import('path');
            const { app } = await import('electron');
            const extensions = options?.extensions || ['.xlsx', '.xls', '.csv'];
            const directories = options?.directories || [
                app.getPath('documents'),
                app.getPath('desktop'),
                app.getPath('downloads')
            ];
            const files = [];
            const scanDirectory = (dir, depth = 0) => {
                if (depth > 3)
                    return;
                try {
                    const entries = fs.readdirSync(dir, { withFileTypes: true });
                    for (const entry of entries) {
                        const fullPath = path.join(dir, entry.name);
                        try {
                            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                                scanDirectory(fullPath, depth + 1);
                            }
                            else if (entry.isFile()) {
                                const ext = path.extname(entry.name).toLowerCase();
                                if (extensions.includes(ext)) {
                                    const stats = fs.statSync(fullPath);
                                    files.push({
                                        name: entry.name,
                                        path: fullPath,
                                        size: stats.size,
                                        date: stats.mtime.toISOString(),
                                        extension: ext
                                    });
                                }
                            }
                        }
                        catch {
                            // Пропускаем файлы к которым нет доступа
                        }
                    }
                }
                catch {
                    // Пропускаем директории к которым нет доступа
                }
            };
            for (const dir of directories) {
                if (fs.existsSync(dir)) {
                    scanDirectory(dir);
                }
            }
            files.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            log.info(`Scanned ${files.length} files`);
            return { success: true, files };
        }
        catch (error) {
            log.errorWithContext('scan-files error', error);
            return {
                success: false,
                error: error.message || 'Ошибка сканирования файлов',
                files: []
            };
        }
    });
    // Открытие файла
    ipcMain.handle('open-file', async (event, filePath) => {
        try {
            const fs = await import('fs');
            if (!fs.existsSync(filePath)) {
                return { success: false, error: 'Файл не найден' };
            }
            const buffer = fs.readFileSync(filePath);
            // Для текстовых файлов (CSV) возвращаем как строку
            const ext = filePath.toLowerCase().split('.').pop();
            if (ext === 'csv') {
                return {
                    success: true,
                    content: buffer.toString('utf8'),
                    path: filePath
                };
            }
            // Для бинарных файлов (XLSX) возвращаем как Uint8Array
            return {
                success: true,
                content: new Uint8Array(buffer),
                path: filePath
            };
        }
        catch (error) {
            console.error('[IPC] open-file error:', error);
            return {
                success: false,
                error: error.message || 'Ошибка открытия файла'
            };
        }
    });
    // Автосохранение файла
    ipcMain.handle('autosave-file', async (event, { content, filePath }) => {
        try {
            const fs = await import('fs');
            const path = await import('path');
            const { app } = await import('electron');
            // Если путь не указан, сохраняем в папке автосохранений
            let savePath = filePath;
            if (!savePath) {
                const autoSaveDir = path.join(app.getPath('userData'), 'autosaves');
                if (!fs.existsSync(autoSaveDir)) {
                    fs.mkdirSync(autoSaveDir, { recursive: true });
                }
                savePath = path.join(autoSaveDir, `autosave-${Date.now()}.json`);
            }
            fs.writeFileSync(savePath, content, 'utf8');
            console.log('[IPC] File autosaved:', savePath);
            return { success: true, filePath: savePath };
        }
        catch (error) {
            console.error('[IPC] autosave-file error:', error);
            return {
                success: false,
                error: error.message || 'Ошибка автосохранения'
            };
        }
    });
    // Загрузка автосохранения
    ipcMain.handle('load-autosave', async (event, { filePath }) => {
        try {
            const fs = await import('fs');
            if (!fs.existsSync(filePath)) {
                return { success: false, error: 'Файл автосохранения не найден' };
            }
            const content = fs.readFileSync(filePath, 'utf8');
            return { success: true, content };
        }
        catch (error) {
            console.error('[IPC] load-autosave error:', error);
            return {
                success: false,
                error: error.message || 'Ошибка загрузки автосохранения'
            };
        }
    });
    // Экспорт в Excel (XLSX)
    ipcMain.handle('export-to-excel', async (event, { data, filePath, sheets }) => {
        try {
            const pathModule = await import('path');
            const { app, dialog } = await import('electron');
            const XLSX = await import('xlsx');
            // Если путь не указан, открываем диалог сохранения
            let savePath = filePath;
            if (!savePath) {
                const result = await dialog.showSaveDialog({
                    title: 'Сохранить как Excel',
                    defaultPath: pathModule.join(app.getPath('documents'), 'SmartTable-Export.xlsx'),
                    filters: [
                        { name: 'Excel Files', extensions: ['xlsx'] }
                    ]
                });
                if (result.canceled || !result.filePath) {
                    return { success: false, canceled: true };
                }
                savePath = result.filePath;
            }
            // Создаём workbook из данных
            const workbook = XLSX.utils.book_new();
            // Если переданы листы - используем их
            if (sheets && sheets.length > 0) {
                sheets.forEach((sheet) => {
                    const worksheet = XLSX.utils.aoa_to_sheet(sheet.data);
                    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
                });
            }
            else if (data) {
                // Для совместимости со старым форматом
                const worksheet = XLSX.utils.aoa_to_sheet(data);
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
            }
            // Сохраняем файл
            const fs = await import('fs');
            XLSX.writeFile(workbook, savePath);
            console.log('[IPC] Exported to Excel:', savePath);
            return { success: true, filePath: savePath };
        }
        catch (error) {
            console.error('[IPC] export-to-excel error:', error);
            return {
                success: false,
                error: error.message || 'Ошибка экспорта'
            };
        }
    });
    // Сохранение файла через диалог
    ipcMain.handle('save-file', async (event, { content, mimeType, extension, defaultName }) => {
        try {
            const pathModule = await import('path');
            const { app, dialog } = await import('electron');
            const result = await dialog.showSaveDialog({
                title: 'Сохранить файл',
                defaultPath: pathModule.join(app.getPath('documents'), `${defaultName}.${extension}`),
                filters: [
                    { name: `${extension.toUpperCase()} Files`, extensions: [extension] }
                ]
            });
            if (result.canceled || !result.filePath) {
                return { success: false, canceled: true };
            }
            const fs = await import('fs');
            fs.writeFileSync(result.filePath, content, 'utf8');
            console.log('[IPC] File saved:', result.filePath);
            return { success: true, filePath: result.filePath };
        }
        catch (error) {
            console.error('[IPC] save-file error:', error);
            return {
                success: false,
                error: error.message || 'Ошибка сохранения файла'
            };
        }
    });
    // Диалог открытия файла
    ipcMain.handle('open-file-dialog', async () => {
        try {
            const { dialog } = await import('electron');
            const result = await dialog.showOpenDialog({
                title: 'Открыть файл',
                filters: [
                    { name: 'Spreadsheet Files', extensions: ['xlsx', 'xls', 'csv'] }
                ],
                properties: ['openFile']
            });
            if (result.canceled || result.filePaths.length === 0) {
                return { success: false, canceled: true };
            }
            return { success: true, filePath: result.filePaths[0] };
        }
        catch (error) {
            console.error('[IPC] open-file-dialog error:', error);
            return {
                success: false,
                error: error.message || 'Ошибка открытия диалога файла'
            };
        }
    });
    // Чтение CSV файла
    ipcMain.handle('read-csv-file', async (event, { filePath }) => {
        try {
            const fs = await import('fs');
            if (!fs.existsSync(filePath)) {
                return { success: false, error: 'Файл не найден' };
            }
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n').map(line => line.trim()).filter(line => line);
            const data = lines.map(line => {
                const row = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    }
                    else if (char === ',' && !inQuotes) {
                        row.push(current.trim().replace(/^"|"$/g, ''));
                        current = '';
                    }
                    else {
                        current += char;
                    }
                }
                row.push(current.trim().replace(/^"|"$/g, ''));
                return row;
            });
            return { success: true, data };
        }
        catch (error) {
            console.error('[IPC] read-csv-file error:', error);
            return {
                success: false,
                error: error.message || 'Ошибка чтения CSV'
            };
        }
    });
    // Чтение XLSX файла с полным извлечением данных и стилей
    ipcMain.handle('read-xlsx-file', async (event, { filePath }) => {
        console.log('====== [DEBUG IPC] read-xlsx-file START ======');
        console.log('[DEBUG] filePath:', filePath);
        try {
            const fs = await import('fs');
            const XLSX = await import('xlsx');
            if (!fs.existsSync(filePath)) {
                console.error('[DEBUG] File does not exist:', filePath);
                return { success: false, error: 'Файл не найден' };
            }
            // Читаем файл с полным извлечением
            const buffer = fs.readFileSync(filePath);
            console.log('[DEBUG] File size:', buffer.length, 'bytes');
            const workbook = XLSX.read(buffer, {
                type: 'buffer',
                cellStyles: true, // Извлекать стили ячеек
                cellNF: true, // Извлекать форматы чисел
                cellFormula: true, // Извлекать формулы
                sheetStubs: true // Извлекать пустые ячейки
            });
            console.log('[DEBUG] Workbook loaded, sheets:', workbook.SheetNames.length);
            const sheets = [];
            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                console.log('[DEBUG] Processing sheet:', sheetName);
                // Конвертируем в JSON с полным извлечением
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    defval: '' // Пустые ячейки = пустая строка
                });
                console.log('[DEBUG] Sheet rows:', jsonData.length);
                // Извлекаем стили и формулы
                const styles = [];
                const formulas = [];
                const data = [];
                // Получаем диапазон ячеек
                const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
                console.log('[DEBUG] Sheet range:', range);
                for (let R = range.s.r; R <= range.e.r; ++R) {
                    const rowData = [];
                    const rowStyles = [];
                    const rowFormulas = [];
                    for (let C = range.s.c; C <= range.e.c; ++C) {
                        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                        const cell = worksheet[cellAddress];
                        if (cell) {
                            // Значение
                            rowData.push(cell.v != null ? String(cell.v) : '');
                            // Формула
                            if (cell.f) {
                                rowFormulas.push('=' + cell.f);
                            }
                            else {
                                rowFormulas.push('');
                            }
                            // Стиль
                            if (cell.s) {
                                rowStyles.push({
                                    fill: cell.s.fill,
                                    font: cell.s.font,
                                    alignment: cell.s.alignment,
                                    border: cell.s.border,
                                    numFmt: cell.s.numFmt
                                });
                            }
                            else {
                                rowStyles.push(null);
                            }
                        }
                        else {
                            rowData.push('');
                            rowFormulas.push('');
                            rowStyles.push(null);
                        }
                    }
                    data.push(rowData);
                    styles.push(rowStyles);
                    formulas.push(rowFormulas);
                }
                sheets.push({
                    name: sheetName,
                    data,
                    styles,
                    formulas
                });
                console.log('[DEBUG] Sheet processed:', sheetName, 'rows:', data.length, 'cols:', data[0]?.length);
            });
            console.log('[DEBUG] Total sheets:', sheets.length);
            console.log('[DEBUG] read-xlsx-file SUCCESS');
            console.log('====== [DEBUG IPC] read-xlsx-file END ======');
            return { success: true, sheets };
        }
        catch (error) {
            console.error('====== [DEBUG IPC] read-xlsx-file ERROR ======');
            console.error('[DEBUG] Error:', error.message);
            console.error('[DEBUG] Stack:', error.stack);
            return {
                success: false,
                error: error.message || 'Ошибка чтения XLSX'
            };
        }
    });
    // Диалог открытия папки
    ipcMain.handle('open-folder-dialog', async () => {
        try {
            const { dialog } = await import('electron');
            const result = await dialog.showOpenDialog({
                title: 'Открыть папку',
                properties: ['openDirectory']
            });
            if (result.canceled || result.filePaths.length === 0) {
                return { success: false, canceled: true };
            }
            return { success: true, folderPath: result.filePaths[0] };
        }
        catch (error) {
            console.error('[IPC] open-folder-dialog error:', error);
            return {
                success: false,
                error: error.message || 'Ошибка открытия диалога папки'
            };
        }
    });
    // Импорт файлов из папки
    ipcMain.handle('import-folder', async (event, { folderPath }) => {
        try {
            const fs = await import('fs');
            const path = await import('path');
            if (!fs.existsSync(folderPath)) {
                return { success: false, error: 'Папка не найдена' };
            }
            const files = fs.readdirSync(folderPath)
                .filter(f => /\.(xlsx|xls|csv)$/i.test(f))
                .map(f => ({
                name: f,
                path: path.join(folderPath, f)
            }));
            const sheets = [];
            for (const file of files) {
                const ext = path.extname(file.name).toLowerCase();
                if (ext === '.csv') {
                    const content = fs.readFileSync(file.path, 'utf8');
                    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
                    const data = lines.map(line => line.split(',').map(cell => cell.trim()));
                    sheets.push({ name: file.name.replace(/\.[^.]+$/, ''), data });
                }
                else {
                    // Для XLSX - заглушка
                    sheets.push({ name: file.name.replace(/\.[^.]+$/, ''), data: [] });
                }
            }
            return { success: true, sheets };
        }
        catch (error) {
            console.error('[IPC] import-folder error:', error);
            return {
                success: false,
                error: error.message || 'Ошибка импорта папки'
            };
        }
    });
    // Дополнительные обработчики можно добавить здесь
    console.log('[IPC] All handlers registered');
}
/**
 * Очистить IPC обработчики (при закрытии приложения)
 */
export function cleanupIPCHandlers() {
    ipcMain.removeHandler('ai-chat');
    ipcMain.removeHandler('scan-files');
    ipcMain.removeHandler('open-file');
    ipcMain.removeHandler('autosave-file');
    ipcMain.removeHandler('load-autosave');
    ipcMain.removeHandler('export-to-excel');
    ipcMain.removeHandler('save-file');
    ipcMain.removeHandler('open-file-dialog');
    ipcMain.removeHandler('read-csv-file');
    ipcMain.removeHandler('read-xlsx-file');
    ipcMain.removeHandler('open-folder-dialog');
    ipcMain.removeHandler('import-folder');
}
//# sourceMappingURL=ipc-handlers.js.map