/**
 * AI Context Service - управление контекстом AI с использованием локальной базы данных
 */
import { databaseManager } from '../../../database/simple-database.js';
export class AIContextService {
    constructor() {
        this.currentSession = 'default';
    }
    static getInstance() {
        if (!AIContextService.instance) {
            AIContextService.instance = new AIContextService();
        }
        return AIContextService.instance;
    }
    /**
     * Инициализация сервиса
     */
    async init() {
        try {
            await databaseManager.init();
            console.log('[AI Context] Service initialized successfully');
        }
        catch (error) {
            console.error('[AI Context] Failed to initialize service:', error);
            throw error;
        }
    }
    /**
     * Отправка сообщения AI с сохранением контекста
     */
    async sendMessage(request) {
        try {
            // Сохраняем сообщение пользователя
            await databaseManager.saveMessage({
                session_id: request.sessionId,
                role: 'user',
                content: request.message,
                timestamp: new Date(),
                context: request.context
            });
            // Получаем историю сообщений для контекста
            const messages = await databaseManager.getMessages(request.sessionId, 20);
            // Получаем контекст документа если указан
            let documentContext = null;
            if (request.documentId) {
                documentContext = await databaseManager.getDocumentContext(request.documentId);
            }
            // Формируем полный контекст для AI
            const fullContext = {
                sessionId: request.sessionId,
                messages: messages,
                documentContext: documentContext,
                userPreferences: await this.getUserPreferences()
            };
            // Генерируем ответ AI (здесь будет интеграция с реальным AI)
            const aiResponse = await this.generateAIResponse(request.message, fullContext);
            // Сохраняем ответ AI
            await databaseManager.saveMessage({
                session_id: request.sessionId,
                role: 'assistant',
                content: aiResponse.response,
                timestamp: new Date(),
                context: request.context
            });
            return {
                response: aiResponse.response,
                context: fullContext,
                suggestions: aiResponse.suggestions
            };
        }
        catch (error) {
            console.error('[AI Context] Failed to send message:', error);
            throw error;
        }
    }
    /**
     * Генерация ответа AI (заглушка для демонстрации)
     */
    async generateAIResponse(message, context) {
        // Анализ контекста для генерации персонализированного ответа
        const recentMessages = context.messages.slice(-5);
        const hasPreviousContext = recentMessages.length > 1;
        let response = '';
        const suggestions = [];
        // Анализ сообщения и генерация ответа на основе контекста
        if (message.toLowerCase().includes('формула') || message.toLowerCase().includes('вычислить')) {
            if (hasPreviousContext) {
                response = `Основываясь на нашем предыдущем разговоре, я могу помочь с формулами. 
        Судя по контексту, вы работаете с таблицами. Какие конкретные формулы вас интересуют?`;
                suggestions.push('Создать формулу суммы', 'Добавить условное форматирование', 'Построить график на основе данных');
            }
            else {
                response = `Я могу помочь с созданием формул для таблиц. 
        Какие вычисления вам нужно выполнить?`;
                suggestions.push('Сумма диапазона ячеек', 'Среднее значение', 'Максимальное/минимальное значение');
            }
        }
        else if (message.toLowerCase().includes('диаграмма') || message.toLowerCase().includes('график')) {
            response = `Я помогу вам создать визуализацию данных. 
      ${context.documentContext ? 'Я вижу, что у вас есть документ с данными.' : 'Расскажите о ваших данных.'}`;
            suggestions.push('Круговая диаграмма', 'Линейный график', 'Столбчатая диаграмма');
        }
        else if (message.toLowerCase().includes('анализ') || message.toLowerCase().includes('статистика')) {
            response = `Проведу анализ ваших данных. 
      ${hasPreviousContext ? 'Учитывая предыдущие запросы, я могу предложить:' : 'Я могу предложить:'}`;
            suggestions.push('Статистический анализ', 'Поиск аномалий', 'Прогнозирование трендов');
        }
        else {
            // Общий ответ с учетом контекста
            if (hasPreviousContext) {
                response = `Я помню наш предыдущий разговор. Чем могу помочь на этот раз? 
        Вижу, что вы работаете с ${context.documentContext ? 'документом' : 'таблицами'}.`;
            }
            else {
                response = `Здравствуйте! Я ваш AI-ассистент для SmartTable. 
        Я могу помочь с формулами, анализом данных, созданием диаграмм и многим другим. 
        Чем могу помочь?`;
            }
            suggestions.push('Создать формулу', 'Анализировать данные', 'Построить диаграмму', 'Форматирование таблицы');
        }
        return { response, context, suggestions };
    }
    /**
     * Получение истории сообщений для сессии
     */
    async getMessages(sessionId, limit = 50) {
        try {
            return await databaseManager.getMessages(sessionId, limit);
        }
        catch (error) {
            console.error('[AI Context] Failed to get messages:', error);
            throw error;
        }
    }
    /**
     * Получение истории чата
     */
    async getChatHistory(sessionId) {
        try {
            if (sessionId) {
                const messages = await databaseManager.getMessages(sessionId);
                const session = await databaseManager.get('SELECT * FROM chat_sessions WHERE session_id = ?', [sessionId]);
                if (session) {
                    return [{
                            ...session,
                            messages: messages
                        }];
                }
            }
            return await databaseManager.getSessions();
        }
        catch (error) {
            console.error('[AI Context] Failed to get chat history:', error);
            throw error;
        }
    }
    /**
     * Поиск в истории сообщений
     */
    async searchHistory(query, sessionId) {
        try {
            return await databaseManager.searchMessages(query, sessionId);
        }
        catch (error) {
            console.error('[AI Context] Failed to search history:', error);
            throw error;
        }
    }
    /**
     * Сохранение контекста документа
     */
    async saveDocumentContext(documentId, content, metadata) {
        try {
            await databaseManager.saveDocumentContext(documentId, content, metadata);
            console.log(`[AI Context] Document context saved for ${documentId}`);
        }
        catch (error) {
            console.error('[AI Context] Failed to save document context:', error);
            throw error;
        }
    }
    /**
     * Получение контекста документа
     */
    async getDocumentContext(documentId) {
        try {
            return await databaseManager.getDocumentContext(documentId);
        }
        catch (error) {
            console.error('[AI Context] Failed to get document context:', error);
            throw error;
        }
    }
    /**
     * Сохранение пользовательских настроек
     */
    async setUserPreference(key, value) {
        try {
            await databaseManager.setPreference(key, value);
            console.log(`[AI Context] Preference saved: ${key} = ${value}`);
        }
        catch (error) {
            console.error('[AI Context] Failed to save preference:', error);
            throw error;
        }
    }
    /**
     * Получение пользовательских настроек
     */
    async getUserPreferences() {
        try {
            const preferences = [
                'ai_model',
                'response_style',
                'language',
                'theme_preference',
                'auto_save_context'
            ];
            const prefs = {};
            for (const key of preferences) {
                const value = await databaseManager.getPreference(key);
                if (value) {
                    prefs[key] = value;
                }
            }
            return prefs;
        }
        catch (error) {
            console.error('[AI Context] Failed to get user preferences:', error);
            return {};
        }
    }
    /**
     * Создание новой сессии чата
     */
    async createNewSession(title) {
        try {
            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            // Сохраняем системное сообщение для новой сессии
            await databaseManager.saveMessage({
                session_id: sessionId,
                role: 'system',
                content: `Новая сессия${title ? `: ${title}` : ''} начата. AI готов помочь.`,
                timestamp: new Date()
            });
            console.log(`[AI Context] New session created: ${sessionId}`);
            return sessionId;
        }
        catch (error) {
            console.error('[AI Context] Failed to create new session:', error);
            throw error;
        }
    }
    /**
     * Удаление сессии
     */
    async deleteSession(sessionId) {
        try {
            await databaseManager.deleteSession(sessionId);
            console.log(`[AI Context] Session deleted: ${sessionId}`);
        }
        catch (error) {
            console.error('[AI Context] Failed to delete session:', error);
            throw error;
        }
    }
    /**
     * Получение статистики использования
     */
    async getUsageStats() {
        try {
            const stats = await databaseManager.getStats();
            // Дополнительная статистика
            const recentActivity = await databaseManager.get('SELECT COUNT(*) as count FROM chat_messages WHERE timestamp > datetime("now", "-24 hours")');
            return {
                ...stats,
                recentMessages24h: recentActivity.count,
                averageMessagesPerSession: stats.sessions > 0 ? Math.round(stats.messages / stats.sessions) : 0
            };
        }
        catch (error) {
            console.error('[AI Context] Failed to get usage stats:', error);
            throw error;
        }
    }
    /**
     * Очистка старых данных
     */
    async cleanupOldData(daysOld = 30) {
        try {
            await databaseManager.cleanupOldData(daysOld);
            console.log(`[AI Context] Cleanup completed for data older than ${daysOld} days`);
        }
        catch (error) {
            console.error('[AI Context] Failed to cleanup old data:', error);
            throw error;
        }
    }
    /**
     * Экспорт истории чата
     */
    async exportChatHistory(sessionId) {
        try {
            const messages = await databaseManager.getMessages(sessionId);
            const session = await databaseManager.get('SELECT * FROM chat_sessions WHERE session_id = ?', [sessionId]);
            const exportData = {
                session: session,
                messages: messages,
                exportedAt: new Date().toISOString()
            };
            return JSON.stringify(exportData, null, 2);
        }
        catch (error) {
            console.error('[AI Context] Failed to export chat history:', error);
            throw error;
        }
    }
    /**
     * Установка текущей сессии
     */
    setCurrentSession(sessionId) {
        this.currentSession = sessionId;
    }
    /**
     * Получение текущей сессии
     */
    getCurrentSession() {
        return this.currentSession;
    }
    /**
     * Закрытие сервиса
     */
    async close() {
        try {
            await databaseManager.close();
            console.log('[AI Context] Service closed successfully');
        }
        catch (error) {
            console.error('[AI Context] Failed to close service:', error);
            throw error;
        }
    }
}
// Экспорт singleton экземпляра
export const aiContextService = AIContextService.getInstance();
//# sourceMappingURL=ai-context-service.js.map