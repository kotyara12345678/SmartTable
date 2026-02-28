/**
 * IPC Handlers - обработчики IPC событий
 * Регистрация всех IPC обработчиков для main процесса
 */

import { ipcMain } from 'electron';
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

  // Сканирование файлов на компьютере
  ipcMain.handle('scan-files', async (event, options?: { extensions?: string[]; directories?: string[] }) => {
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

      const files: Array<{
        name: string;
        path: string;
        size: number;
        date: string;
        extension: string;
      }> = [];

      const scanDirectory = (dir: string, depth = 0) => {
        if (depth > 3) return; // Ограничение глубины сканирования

        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            try {
              if (entry.isDirectory() && !entry.name.startsWith('.')) {
                scanDirectory(fullPath, depth + 1);
              } else if (entry.isFile()) {
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
            } catch (err) {
              // Пропускаем файлы к которым нет доступа
            }
          }
        } catch (err) {
          // Пропускаем директории к которым нет доступа
        }
      };

      // Сканируем каждую директорию
      for (const dir of directories) {
        if (fs.existsSync(dir)) {
          scanDirectory(dir);
        }
      }

      // Сортируем по дате (новые сверху)
      files.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      console.log(`[IPC] Scanned ${files.length} files`);
      return { success: true, files };
    } catch (error: any) {
      console.error('[IPC] scan-files error:', error);
      return {
        success: false,
        error: error.message || 'Ошибка сканирования файлов',
        files: []
      };
    }
  });

  // Открытие файла
  ipcMain.handle('open-file', async (event, filePath: string) => {
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
    } catch (error: any) {
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

  // Экспорт в Excel (XLSX)
  ipcMain.handle('export-to-excel', async (event, { data, filePath }) => {
    try {
      const pathModule = await import('path');
      const { app, dialog } = await import('electron');

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

      // Для простоты сохраняем как JSON с расширением .xlsx
      // В будущем можно подключить библиотеку xlsx для полноценного экспорта
      const fs = await import('fs');
      fs.writeFileSync(savePath, JSON.stringify(data, null, 2), 'utf8');

      console.log('[IPC] Exported to Excel:', savePath);
      return { success: true, filePath: savePath };
    } catch (error: any) {
      console.error('[IPC] export-to-excel error:', error);
      return {
        success: false,
        error: error.message || 'Ошибка экспорта'
      };
    }
  });

  // Дополнительные обработчики можно добавить здесь
  console.log('[IPC] All handlers registered');
}

/**
 * Очистить IPC обработчики (при закрытии приложения)
 */
export function cleanupIPCHandlers(): void {
  ipcMain.removeHandler('ai-chat');
  ipcMain.removeHandler('scan-files');
  ipcMain.removeHandler('open-file');
  ipcMain.removeHandler('autosave-file');
  ipcMain.removeHandler('load-autosave');
  ipcMain.removeHandler('export-to-excel');
  console.log('[IPC] All handlers cleaned up');
}
