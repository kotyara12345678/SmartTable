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

  // Дополнительные обработчики можно добавить здесь
  console.log('[IPC] All handlers registered');
}

/**
 * Очистить IPC обработчики (при закрытии приложения)
 */
export function cleanupIPCHandlers(): void {
  ipcMain.removeHandler('ai-chat');
  ipcMain.removeHandler('autosave-file');
  ipcMain.removeHandler('load-autosave');
  console.log('[IPC] All handlers cleaned up');
}
