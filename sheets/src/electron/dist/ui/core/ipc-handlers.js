/**
 * IPC Handlers - обработчики IPC событий
 * Регистрация всех IPC обработчиков для main процесса
 */
import { ipcMain } from 'electron';
import { aiService } from './ai/ai-service';
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
    // Дополнительные обработчики можно добавить здесь
    console.log('[IPC] All handlers registered');
}
/**
 * Очистить IPC обработчики (при закрытии приложения)
 */
export function cleanupIPCHandlers() {
    ipcMain.removeHandler('ai-chat');
    // Добавить очистку других обработчиков
    console.log('[IPC] All handlers cleaned up');
}
//# sourceMappingURL=ipc-handlers.js.map