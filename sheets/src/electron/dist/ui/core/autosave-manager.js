/**
 * AutoSave Manager - управление системой автосохранений
 * Периодическое сохранение состояния таблицы с настраиваемым интервалом
 */
export class AutoSaveManager {
    constructor() {
        this.config = {
            enabled: false,
            intervalMinutes: 5,
            lastSaveTime: null,
            autoSavePath: null
        };
        this.timerId = null;
        this.isDirty = false;
        this.getContentCallback = null;
        this.onSaveCallback = null;
        this.loadConfig();
    }
    static getInstance() {
        if (!AutoSaveManager.instance) {
            AutoSaveManager.instance = new AutoSaveManager();
        }
        return AutoSaveManager.instance;
    }
    /**
     * Загрузка конфигурации из localStorage
     */
    loadConfig() {
        try {
            const savedConfig = localStorage.getItem('smarttable-autosave-config');
            if (savedConfig) {
                this.config = { ...this.config, ...JSON.parse(savedConfig) };
            }
        }
        catch (error) {
            console.error('[AutoSave] Failed to load config:', error);
        }
    }
    /**
     * Сохранение конфигурации в localStorage
     */
    saveConfig() {
        try {
            localStorage.setItem('smarttable-autosave-config', JSON.stringify(this.config));
        }
        catch (error) {
            console.error('[AutoSave] Failed to save config:', error);
        }
    }
    /**
     * Инициализация менеджера автосохранений
     */
    async init() {
        console.log('[AutoSave] Manager initialized');
        if (this.config.enabled) {
            this.startAutoSave();
        }
    }
    /**
     * Установка колбэка для получения содержимого таблицы
     */
    setGetContentCallback(callback) {
        this.getContentCallback = callback;
    }
    /**
     * Установка колбэка для сохранения содержимого
     */
    setOnSaveCallback(callback) {
        this.onSaveCallback = callback;
    }
    /**
     * Включить автосохранение
     */
    enable() {
        this.config.enabled = true;
        this.saveConfig();
        this.startAutoSave();
        console.log('[AutoSave] Enabled');
    }
    /**
     * Выключить автосохранение
     */
    disable() {
        this.config.enabled = false;
        this.saveConfig();
        this.stopAutoSave();
        console.log('[AutoSave] Disabled');
    }
    /**
     * Установка интервала автосохранения (в минутах)
     */
    setInterval(minutes) {
        this.config.intervalMinutes = Math.max(1, Math.min(60, minutes));
        this.saveConfig();
        if (this.config.enabled) {
            this.restartAutoSave();
        }
        console.log('[AutoSave] Interval set to', this.config.intervalMinutes, 'minutes');
    }
    /**
     * Установка пути для автосохранения
     */
    setAutoSavePath(path) {
        this.config.autoSavePath = path;
        this.saveConfig();
        console.log('[AutoSave] Path set to', path);
    }
    /**
     * Получить текущую конфигурацию
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Запустить цикл автосохранения
     */
    startAutoSave() {
        if (this.timerId) {
            clearInterval(this.timerId);
        }
        const intervalMs = this.config.intervalMinutes * 60 * 1000;
        this.timerId = setInterval(() => {
            if (this.isDirty && this.getContentCallback) {
                this.performAutoSave();
            }
        }, intervalMs);
        console.log('[AutoSave] Started with interval', this.config.intervalMinutes, 'minutes');
    }
    /**
     * Перезапустить цикл автосохранения
     */
    restartAutoSave() {
        this.stopAutoSave();
        this.startAutoSave();
    }
    /**
     * Остановить цикл автосохранения
     */
    stopAutoSave() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
            console.log('[AutoSave] Stopped');
        }
    }
    /**
     * Выполнить автосохранение
     */
    async performAutoSave() {
        if (!this.getContentCallback) {
            console.warn('[AutoSave] No getContent callback set');
            return;
        }
        try {
            const content = this.getContentCallback();
            if (this.onSaveCallback) {
                await this.onSaveCallback(content);
            }
            this.config.lastSaveTime = Date.now();
            this.isDirty = false;
            this.saveConfig();
            // Отправляем событие об успешном автосохранении
            const event = new CustomEvent('autosave-completed', {
                detail: { timestamp: this.config.lastSaveTime }
            });
            window.dispatchEvent(event);
            console.log('[AutoSave] Saved at', new Date(this.config.lastSaveTime).toLocaleTimeString());
        }
        catch (error) {
            console.error('[AutoSave] Failed to save:', error);
        }
    }
    /**
     * Пометить данные как измененные (грязные)
     */
    markDirty() {
        this.isDirty = true;
    }
    /**
     * Пометить данные как сохраненные (чистые)
     */
    markClean() {
        this.isDirty = false;
    }
    /**
     * Получить статус автосохранения
     */
    getStatus() {
        return {
            isDirty: this.isDirty,
            lastSaveTime: this.config.lastSaveTime,
            enabled: this.config.enabled
        };
    }
    /**
     * Выполнить принудительное сохранение
     */
    async forceSave() {
        if (!this.getContentCallback) {
            console.warn('[AutoSave] No getContent callback set');
            return false;
        }
        try {
            await this.performAutoSave();
            return true;
        }
        catch (error) {
            console.error('[AutoSave] Force save failed:', error);
            return false;
        }
    }
    /**
     * Получить время до следующего автосохранения (в секундах)
     */
    getTimeUntilNextSave() {
        if (!this.config.enabled || !this.config.lastSaveTime) {
            return null;
        }
        const elapsed = Date.now() - this.config.lastSaveTime;
        const intervalMs = this.config.intervalMinutes * 60 * 1000;
        const remaining = intervalMs - elapsed;
        return Math.max(0, Math.floor(remaining / 1000));
    }
    /**
     * Очистка ресурсов
     */
    destroy() {
        this.stopAutoSave();
        this.getContentCallback = null;
        this.onSaveCallback = null;
        console.log('[AutoSave] Manager destroyed');
    }
}
// Экспорт singleton экземпляра
export const autosaveManager = AutoSaveManager.getInstance();
//# sourceMappingURL=autosave-manager.js.map