/**
 * Logger - централизованная система логирования
 * Заменяет console.log/console.error для чистоты кода
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  showTimestamp: boolean;
}

const DEFAULT_CONFIG: LoggerConfig = {
  enabled: true,
  minLevel: 'info',
  showTimestamp: true
};

let config: LoggerConfig = { ...DEFAULT_CONFIG };

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

export const logger = {
  /**
   * Настройка конфигурации логгера
   */
  configure(newConfig: Partial<LoggerConfig>): void {
    config = { ...config, ...newConfig };
  },

  /**
   * Логирование с указанием уровня
   */
  log(level: LogLevel, module: string, message: string, ...args: any[]): void {
    if (!config.enabled || LOG_LEVELS[level] < LOG_LEVELS[config.minLevel]) {
      return;
    }

    const prefix = config.showTimestamp 
      ? `[${new Date().toISOString().slice(11, 19)}][${module}]`
      : `[${module}]`;

    switch (level) {
      case 'debug':
        console.debug(`${prefix} ${message}`, ...args);
        break;
      case 'info':
        console.info(`${prefix} ${message}`, ...args);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`, ...args);
        break;
      case 'error':
        console.error(`${prefix} ${message}`, ...args);
        break;
    }
  },

  debug(module: string, message: string, ...args: any[]): void {
    this.log('debug', module, message, ...args);
  },

  info(module: string, message: string, ...args: any[]): void {
    this.log('info', module, message, ...args);
  },

  warn(module: string, message: string, ...args: any[]): void {
    this.log('warn', module, message, ...args);
  },

  error(module: string, message: string, ...args: any[]): void {
    this.log('error', module, message, ...args);
  },

  /**
   * Логирование ошибки с контекстом
   */
  errorWithContext(module: string, context: string, error: any): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.error(module, `${context}: ${errorMessage}`);
  },

  /**
   * Включить debug логи
   */
  enableDebug(): void {
    this.configure({ minLevel: 'debug' });
  },

  /**
   * Выключить все логи
   */
  disable(): void {
    this.configure({ enabled: false });
  },

  /**
   * Сбросить настройки
   */
  reset(): void {
    config = { ...DEFAULT_CONFIG };
  }
};

/**
 * Создать логгер для конкретного модуля
 */
export function createLogger(module: string) {
  return {
    debug: (message: string, ...args: any[]) => logger.debug(module, message, ...args),
    info: (message: string, ...args: any[]) => logger.info(module, message, ...args),
    warn: (message: string, ...args: any[]) => logger.warn(module, message, ...args),
    error: (message: string, ...args: any[]) => logger.error(module, message, ...args),
    errorWithContext: (context: string, error: any) => logger.errorWithContext(module, context, error)
  };
}
