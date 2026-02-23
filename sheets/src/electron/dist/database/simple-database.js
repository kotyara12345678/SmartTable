/**
 * Simple Database Manager - управление локальной базой данных без внешних зависимостей
 */
export class SimpleDatabaseManager {
    constructor() {
        this.messages = [];
        this.sessions = [];
        this.preferences = [];
        this.documentContexts = new Map();
        this.nextId = 1;
        this.loadFromStorage();
    }
    static getInstance() {
        if (!SimpleDatabaseManager.instance) {
            SimpleDatabaseManager.instance = new SimpleDatabaseManager();
        }
        return SimpleDatabaseManager.instance;
    }
    /**
     * Инициализация базы данных
     */
    async init() {
        console.log('[Simple Database] Database initialized successfully');
    }
    /**
     * Загрузка данных из localStorage
     */
    loadFromStorage() {
        try {
            const messages = localStorage.getItem('smarttable_messages');
            const sessions = localStorage.getItem('smarttable_sessions');
            const preferences = localStorage.getItem('smarttable_preferences');
            const contexts = localStorage.getItem('smarttable_contexts');
            if (messages)
                this.messages = JSON.parse(messages);
            if (sessions)
                this.sessions = JSON.parse(sessions);
            if (preferences)
                this.preferences = JSON.parse(preferences);
            if (contexts) {
                const parsed = JSON.parse(contexts);
                this.documentContexts = new Map(parsed);
            }
            // Обновляем nextId
            const maxId = Math.max(...this.messages.map(m => m.id || 0), ...this.sessions.map(s => s.id || 0), ...this.preferences.map(p => p.id || 0), 0);
            this.nextId = maxId + 1;
        }
        catch (error) {
            console.error('[Simple Database] Failed to load from storage:', error);
        }
    }
    /**
     * Сохранение данных в localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem('smarttable_messages', JSON.stringify(this.messages));
            localStorage.setItem('smarttable_sessions', JSON.stringify(this.sessions));
            localStorage.setItem('smarttable_preferences', JSON.stringify(this.preferences));
            localStorage.setItem('smarttable_contexts', JSON.stringify(Array.from(this.documentContexts.entries())));
        }
        catch (error) {
            console.error('[Simple Database] Failed to save to storage:', error);
        }
    }
    /**
     * Сохранение сообщения в базу данных
     */
    async saveMessage(message) {
        try {
            // Проверяем существует ли сессия
            const session = this.sessions.find(s => s.session_id === message.session_id);
            // Если сессии нет, создаем ее
            if (!session) {
                const newSession = {
                    id: this.nextId++,
                    session_id: message.session_id,
                    created_at: new Date(),
                    updated_at: new Date(),
                    message_count: 1
                };
                this.sessions.push(newSession);
            }
            else {
                // Обновляем счетчик сообщений и время
                session.message_count++;
                session.updated_at = new Date();
            }
            // Сохраняем сообщение
            const newMessage = {
                id: this.nextId++,
                ...message
            };
            this.messages.push(newMessage);
            this.saveToStorage();
            return newMessage.id || 0;
        }
        catch (error) {
            console.error('[Simple Database] Failed to save message:', error);
            throw error;
        }
    }
    /**
     * Получение истории сообщений для сессии
     */
    async getMessages(sessionId, limit = 50) {
        try {
            const messages = this.messages
                .filter(m => m.session_id === sessionId)
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                .slice(0, limit);
            return messages.map(msg => ({
                ...msg,
                timestamp: new Date(msg.timestamp)
            }));
        }
        catch (error) {
            console.error('[Simple Database] Failed to get messages:', error);
            throw error;
        }
    }
    /**
     * Получение всех сессий чата
     */
    async getSessions() {
        try {
            return this.sessions
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
                .map(session => ({
                ...session,
                created_at: new Date(session.created_at),
                updated_at: new Date(session.updated_at)
            }));
        }
        catch (error) {
            console.error('[Simple Database] Failed to get sessions:', error);
            throw error;
        }
    }
    /**
     * Удаление сессии и всех ее сообщений
     */
    async deleteSession(sessionId) {
        try {
            this.messages = this.messages.filter(m => m.session_id !== sessionId);
            this.sessions = this.sessions.filter(s => s.session_id !== sessionId);
            this.saveToStorage();
        }
        catch (error) {
            console.error('[Simple Database] Failed to delete session:', error);
            throw error;
        }
    }
    /**
     * Сохранение пользовательской настройки
     */
    async setPreference(key, value) {
        try {
            const existingIndex = this.preferences.findIndex(p => p.key === key);
            if (existingIndex >= 0) {
                this.preferences[existingIndex].value = value;
                this.preferences[existingIndex].updated_at = new Date();
            }
            else {
                this.preferences.push({
                    id: this.nextId++,
                    key,
                    value,
                    updated_at: new Date()
                });
            }
            this.saveToStorage();
        }
        catch (error) {
            console.error('[Simple Database] Failed to set preference:', error);
            throw error;
        }
    }
    /**
     * Получение пользовательской настройки
     */
    async getPreference(key) {
        try {
            const preference = this.preferences.find(p => p.key === key);
            return preference?.value || null;
        }
        catch (error) {
            console.error('[Simple Database] Failed to get preference:', error);
            throw error;
        }
    }
    /**
     * Сохранение контекста документа
     */
    async saveDocumentContext(documentId, content, metadata) {
        try {
            this.documentContexts.set(documentId, {
                content,
                metadata,
                created_at: new Date(),
                updated_at: new Date()
            });
            this.saveToStorage();
        }
        catch (error) {
            console.error('[Simple Database] Failed to save document context:', error);
            throw error;
        }
    }
    /**
     * Получение контекста документа
     */
    async getDocumentContext(documentId) {
        try {
            return this.documentContexts.get(documentId) || null;
        }
        catch (error) {
            console.error('[Simple Database] Failed to get document context:', error);
            throw error;
        }
    }
    /**
     * Поиск по истории сообщений
     */
    async searchMessages(query, sessionId) {
        try {
            let filtered = this.messages.filter(m => m.content.toLowerCase().includes(query.toLowerCase()));
            if (sessionId) {
                filtered = filtered.filter(m => m.session_id === sessionId);
            }
            return filtered
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 20)
                .map(msg => ({
                ...msg,
                timestamp: new Date(msg.timestamp)
            }));
        }
        catch (error) {
            console.error('[Simple Database] Failed to search messages:', error);
            throw error;
        }
    }
    /**
     * Получение статистики базы данных
     */
    async getStats() {
        try {
            return {
                sessions: this.sessions.length,
                messages: this.messages.length,
                documents: this.documentContexts.size
            };
        }
        catch (error) {
            console.error('[Simple Database] Failed to get stats:', error);
            throw error;
        }
    }
    /**
     * Очистка старых данных (старше N дней)
     */
    async cleanupOldData(daysOld = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            this.messages = this.messages.filter(m => new Date(m.timestamp) >= cutoffDate);
            this.sessions = this.sessions.filter(s => new Date(s.updated_at) >= cutoffDate && s.message_count > 0);
            this.saveToStorage();
            console.log(`[Simple Database] Cleaned up data older than ${daysOld} days`);
        }
        catch (error) {
            console.error('[Simple Database] Failed to cleanup old data:', error);
            throw error;
        }
    }
    /**
     * Выполнение SQL запроса с получением одной записи (для совместимости)
     */
    async get(sql, params = []) {
        try {
            // Простая эмуляция SQL запросов для совместимости
            if (sql.includes('chat_sessions') && sql.includes('session_id')) {
                const sessionId = params[0];
                return this.sessions.find(s => s.session_id === sessionId) || null;
            }
            if (sql.includes('COUNT(*)') && sql.includes('chat_messages')) {
                const count = this.messages.length;
                return { count };
            }
            return null;
        }
        catch (error) {
            console.error('[Simple Database] Failed to execute get query:', error);
            throw error;
        }
    }
    /**
     * Закрытие соединения с базой данных
     */
    async close() {
        this.saveToStorage();
        console.log('[Simple Database] Database connection closed');
    }
}
// Экспорт singleton экземпляра
export const databaseManager = SimpleDatabaseManager.getInstance();
//# sourceMappingURL=simple-database.js.map