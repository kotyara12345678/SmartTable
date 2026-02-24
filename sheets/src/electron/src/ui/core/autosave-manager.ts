/**
 * AutoSave Manager - управление системой автосохранений
 * Периодическое сохранение состояния таблицы с настраиваемым интервалом
 */

export interface AutoSaveConfig {
  enabled: boolean;
  intervalMinutes: number;
  lastSaveTime: number | null;
  autoSavePath: string | null;
}

export interface AutoSaveData {
  timestamp: number;
  content: string;
  metadata?: any;
}

export class AutoSaveManager {
  private static instance: AutoSaveManager;
  private config: AutoSaveConfig = {
    enabled: false,
    intervalMinutes: 5,
    lastSaveTime: null,
    autoSavePath: null
  };
  private timerId: NodeJS.Timeout | null = null;
  private isDirty: boolean = false;
  private getContentCallback: (() => string) | null = null;
  private onSaveCallback: ((content: string) => Promise<void>) | null = null;

  private constructor() {
    this.loadConfig();
  }

  static getInstance(): AutoSaveManager {
    if (!AutoSaveManager.instance) {
      AutoSaveManager.instance = new AutoSaveManager();
    }
    return AutoSaveManager.instance;
  }

  /**
   * Загрузка конфигурации из localStorage
   */
  private loadConfig(): void {
    try {
      const savedConfig = localStorage.getItem('smarttable-autosave-config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.error('[AutoSave] Failed to load config:', error);
    }
  }

  /**
   * Сохранение конфигурации в localStorage
   */
  private saveConfig(): void {
    try {
      localStorage.setItem('smarttable-autosave-config', JSON.stringify(this.config));
    } catch (error) {
      console.error('[AutoSave] Failed to save config:', error);
    }
  }

  /**
   * Инициализация менеджера автосохранений
   */
  async init(): Promise<void> {
    console.log('[AutoSave] Manager initialized');
    if (this.config.enabled) {
      this.startAutoSave();
    }
  }

  /**
   * Установка колбэка для получения содержимого таблицы
   */
  setGetContentCallback(callback: () => string): void {
    this.getContentCallback = callback;
  }

  /**
   * Установка колбэка для сохранения содержимого
   */
  setOnSaveCallback(callback: (content: string) => Promise<void>): void {
    this.onSaveCallback = callback;
  }

  /**
   * Включить автосохранение
   */
  enable(): void {
    this.config.enabled = true;
    this.saveConfig();
    this.startAutoSave();
    console.log('[AutoSave] Enabled');
  }

  /**
   * Выключить автосохранение
   */
  disable(): void {
    this.config.enabled = false;
    this.saveConfig();
    this.stopAutoSave();
    console.log('[AutoSave] Disabled');
  }

  /**
   * Установка интервала автосохранения (в минутах)
   */
  setInterval(minutes: number): void {
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
  setAutoSavePath(path: string | null): void {
    this.config.autoSavePath = path;
    this.saveConfig();
    console.log('[AutoSave] Path set to', path);
  }

  /**
   * Получить текущую конфигурацию
   */
  getConfig(): AutoSaveConfig {
    return { ...this.config };
  }

  /**
   * Запустить цикл автосохранения
   */
  private startAutoSave(): void {
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
  private restartAutoSave(): void {
    this.stopAutoSave();
    this.startAutoSave();
  }

  /**
   * Остановить цикл автосохранения
   */
  private stopAutoSave(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
      console.log('[AutoSave] Stopped');
    }
  }

  /**
   * Выполнить автосохранение
   */
  private async performAutoSave(): Promise<void> {
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
    } catch (error) {
      console.error('[AutoSave] Failed to save:', error);
    }
  }

  /**
   * Пометить данные как измененные (грязные)
   */
  markDirty(): void {
    this.isDirty = true;
  }

  /**
   * Пометить данные как сохраненные (чистые)
   */
  markClean(): void {
    this.isDirty = false;
  }

  /**
   * Получить статус автосохранения
   */
  getStatus(): { isDirty: boolean; lastSaveTime: number | null; enabled: boolean } {
    return {
      isDirty: this.isDirty,
      lastSaveTime: this.config.lastSaveTime,
      enabled: this.config.enabled
    };
  }

  /**
   * Выполнить принудительное сохранение
   */
  async forceSave(): Promise<boolean> {
    if (!this.getContentCallback) {
      console.warn('[AutoSave] No getContent callback set');
      return false;
    }

    try {
      await this.performAutoSave();
      return true;
    } catch (error) {
      console.error('[AutoSave] Force save failed:', error);
      return false;
    }
  }

  /**
   * Получить время до следующего автосохранения (в секундах)
   */
  getTimeUntilNextSave(): number | null {
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
  destroy(): void {
    this.stopAutoSave();
    this.getContentCallback = null;
    this.onSaveCallback = null;
    console.log('[AutoSave] Manager destroyed');
  }
}

// Экспорт singleton экземпляра
export const autosaveManager = AutoSaveManager.getInstance();
