/**
 * IPC Handlers - обработчики IPC событий
 * Регистрация всех IPC обработчиков для main процесса
 */

import { ipcMain, dialog } from 'electron';
import { aiService, AIRequest, AIResponse } from './ai/ai-service.js';

/**
 * Зарегистрировать все IPC обработчики
 */
export function registerIPCHandlers(): void {
  // AI Chat обработчик
  ipcMain.handle('ai-chat', async (event, data: AIRequest): Promise<AIResponse> => {
    try {
      return await aiService.chat(data);
    } catch (error: any) {
      console.error('[IPC] ai-chat error:', error);
      return {
        success: false,
        error: error.message || 'Неизвестная ошибка ИИ'
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
    } catch (error: any) {
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
    } catch (error: any) {
      console.error('[IPC] load-autosave error:', error);
      return {
        success: false,
        error: error.message || 'Ошибка загрузки автосохранения'
      };
    }
  });

  // Открытие файла XLSX/CSV
  ipcMain.handle('open-file-dialog', async () => {
    try {
      const { app } = await import('electron');
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Таблицы', extensions: ['xlsx', 'xls', 'csv'] }
        ]
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      return { success: true, filePath: result.filePaths[0] };
    } catch (error: any) {
      console.error('[IPC] open-file-dialog error:', error);
      return { success: false, error: error.message };
    }
  });

  // Открытие папки
  ipcMain.handle('open-folder-dialog', async () => {
    try {
      const { app } = await import('electron');
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      return { success: true, folderPath: result.filePaths[0] };
    } catch (error: any) {
      console.error('[IPC] open-folder-dialog error:', error);
      return { success: false, error: error.message };
    }
  });

  // Открытие папки с файлами XLSX и импорт
  ipcMain.handle('import-folder', async (event, { folderPath }) => {
    try {
      const fs = await import('fs');
      const path = await import('path');

      if (!fs.existsSync(folderPath)) {
        return { success: false, error: 'Папка не найдена' };
      }

      const files = fs.readdirSync(folderPath)
        .filter(f => /\.(xlsx|xls|csv)$/i.test(f))
        .sort();

      if (files.length === 0) {
        return { success: false, error: 'В папке нет файлов XLSX, XLS или CSV' };
      }

      const sheets: Array<{ name: string; data: string[][] }> = [];

      for (const file of files) {
        const filePath = path.join(folderPath, file);
        const sheetName = file.replace(/\.[^.]+$/, '');
        const ext = file.split('.').pop()?.toLowerCase();

        let data: string[][] = [];

        if (ext === 'csv') {
          const content = fs.readFileSync(filePath, 'utf8');
          data = parseCSV(content);
        } else {
          const content = fs.readFileSync(filePath, 'utf8');
          const xlsxSheets = parseXLSX(content);
          data = xlsxSheets[0]?.data || [];
        }

        if (data.length > 0) {
          sheets.push({ name: sheetName, data });
        }
      }

      return { success: true, sheets };
    } catch (error: any) {
      console.error('[IPC] import-folder error:', error);
      return { success: false, error: error.message };
    }
  });

  // Чтение XLSX файла
  ipcMain.handle('read-xlsx-file', async (event, { filePath }) => {
    try {
      const fs = await import('fs');
      const path = await import('path');

      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'Файл не найден' };
      }

      // Простой парсинг XLSX (XML формат)
      const content = fs.readFileSync(filePath, 'utf8');
      const sheets = parseXLSX(content);

      return { success: true, sheets };
    } catch (error: any) {
      console.error('[IPC] read-xlsx-file error:', error);
      return { success: false, error: error.message };
    }
  });

  // Чтение CSV файла
  ipcMain.handle('read-csv-file', async (event, { filePath, delimiter = ',' }) => {
    try {
      const fs = await import('fs');

      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'Файл не найден' };
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const rows = parseCSV(content, delimiter);

      return { success: true, data: rows };
    } catch (error: any) {
      console.error('[IPC] read-csv-file error:', error);
      return { success: false, error: error.message };
    }
  });

  // Сохранение файла
  ipcMain.handle('save-file', async (event, { content, mimeType, extension, defaultName }) => {
    try {
      const { dialog } = await import('electron');
      const fs = await import('fs');

      const result = await dialog.showSaveDialog({
        defaultPath: `${defaultName}.${extension}`,
        filters: [{ name: 'Таблица', extensions: [extension] }]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }

      fs.writeFileSync(result.filePath, content, 'utf8');
      return { success: true, filePath: result.filePath };
    } catch (error: any) {
      console.error('[IPC] save-file error:', error);
      return { success: false, error: error.message };
    }
  });

  // Дополнительные обработчики можно добавить здесь
  console.log('[IPC] All handlers registered');
}

/**
 * Парсинг XLSX (XML Spreadsheet)
 */
function parseXLSX(content: string): Array<{ name: string; data: string[][] }> {
  const sheets: Array<{ name: string; data: string[][] }> = [];

  // Извлекаем имена листов и данные из XML
  const worksheetRegex = /<Worksheet[^>]*ss:Name="([^"]*)"[^>]*>([\s\S]*?)<\/Worksheet>/g;
  let match: RegExpExecArray | null;

  while ((match = worksheetRegex.exec(content)) !== null) {
    const sheetName = match[1];
    const sheetContent = match[2];
    const rows: string[][] = [];

    // Извлекаем строки
    const rowRegex = /<Row[^>]*>([\s\S]*?)<\/Row>/g;
    let rowMatch: RegExpExecArray | null;

    while ((rowMatch = rowRegex.exec(sheetContent)) !== null) {
      const rowContent = rowMatch[1];
      const cells: string[] = [];

      // Извлекаем ячейки
      const cellRegex = /<Cell[^>]*>([\s\S]*?)<\/Cell>/g;
      let cellMatch: RegExpExecArray | null;

      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        const cellContent = cellMatch[1];
        const dataMatch = cellContent.match(/<Data[^>]*>([\s\S]*?)<\/Data>/);
        cells.push(dataMatch ? decodeXml(dataMatch[1]) : '');
      }

      rows.push(cells);
    }

    sheets.push({ name: sheetName, data: rows });
  }

  // Если не найдено листов в формате XML, пробуем простой формат
  if (sheets.length === 0) {
    sheets.push({ name: 'Sheet1', data: [] });
  }

  return sheets;
}

/**
 * Парсинг CSV
 */
function parseCSV(content: string, delimiter: string = ','): string[][] {
  const rows: string[][] = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    if (line.trim() === '') continue;

    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        cells.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    cells.push(current);
    rows.push(cells);
  }

  return rows;
}

/**
 * Декодирование XML сущностей
 */
function decodeXml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Очистить IPC обработчики (при закрытии приложения)
 */
export function cleanupIPCHandlers(): void {
  ipcMain.removeHandler('ai-chat');
  ipcMain.removeHandler('autosave-file');
  ipcMain.removeHandler('load-autosave');
  ipcMain.removeHandler('open-file-dialog');
  ipcMain.removeHandler('open-folder-dialog');
  ipcMain.removeHandler('import-folder');
  ipcMain.removeHandler('read-xlsx-file');
  ipcMain.removeHandler('read-csv-file');
  ipcMain.removeHandler('save-file');
  console.log('[IPC] All handlers cleaned up');
}
