/**
 * PluginManager - центральный сервис для управления плагинами
 */

import {
  PluginManifest,
  PluginInfo,
  PluginState,
  SmartTablePluginAPI,
  PluginEntryPoint
} from './PluginTypes.js';
import { createLogger } from '../logger.js';

const log = createLogger('PluginManager');

/**
 * Менеджер плагинов
 */
export class PluginManager {
  private plugins: Map<string, PluginInfo> = new Map();
  private pluginInstances: Map<string, any> = new Map();
  private api: SmartTablePluginAPI | null = null;
  private pluginsPath: string = '';

  constructor() {
    // Путь к папке с плагинами будет установлен при инициализации
    this.pluginsPath = '';
  }

  /**
   * Инициализация менеджера плагинов
   */
  async init(api: SmartTablePluginAPI): Promise<void> {
    this.api = api;
    log.info('PluginManager initialized');
    
    // В будущем здесь будет загрузка плагинов из файловой системы
    // Для Electron это будет через IPC вызовы
    await this.loadInstalledPlugins();
  }

  /**
   * Загрузка установленных плагинов
   */
  private async loadInstalledPlugins(): Promise<void> {
    try {
      log.info('Scanning for installed plugins...');

      // Используем IPC для получения списка установленных плагинов
      const electronAPI = (window as any).electronAPI;

      if (electronAPI) {
        const result = await electronAPI.ipcRenderer.invoke('get-installed-plugins');

        if (result.success && result.plugins) {
          // Сначала регистрируем все плагины
          for (const pluginData of result.plugins) {
            this.registerPlugin({
              manifest: pluginData.manifest,
              state: PluginState.INACTIVE,
              path: pluginData.path,
              enabled: pluginData.enabled || false
            });
          }

          log.info(`Found ${this.plugins.size} plugin(s)`);

          // Затем активируем те, которые были включены
          for (const pluginData of result.plugins) {
            if (pluginData.enabled) {
              const pluginId = pluginData.manifest.id;
              log.info(`Auto-enabling plugin: ${pluginId}`);
              // Не блокируем загрузку приложения, активируем асинхронно
              this.enablePlugin(pluginId).catch(err => {
                log.error(`Failed to auto-enable plugin ${pluginId}:`, err.message);
              });
            }
          }
        }
      } else {
        // Fallback для тестирования без Electron
        const installedPlugins = await this.scanPluginsDirectory();
        for (const pluginData of installedPlugins) {
          this.registerPlugin(pluginData);
        }
        log.info(`Found ${this.plugins.size} plugin(s) (fallback mode)`);
      }
    } catch (error: any) {
      log.error('Failed to load installed plugins:', error.message);
    }
  }

  /**
   * Обновить список установленных плагинов (после установки нового)
   */
  async refreshInstalledPlugins(): Promise<void> {
    // Очищаем текущий список
    this.plugins.clear();
    this.pluginInstances.clear();
    
    // Загружаем заново
    await this.loadInstalledPlugins();
  }

  /**
   * Сканирование директории с плагинами (fallback для тестирования)
   */
  private async scanPluginsDirectory(): Promise<PluginInfo[]> {
    // Fallback реализация - в реальности используется IPC
    return [];
  }

  /**
   * Регистрация плагина в системе
   */
  private registerPlugin(pluginData: PluginInfo): void {
    this.plugins.set(pluginData.manifest.id, pluginData);
    log.info(`Plugin registered: ${pluginData.manifest.name}`);
  }

  /**
   * Установка плагина из ZIP архива
   */
  async installPlugin(zipPath: string): Promise<PluginInfo | null> {
    try {
      log.info(`Installing plugin from: ${zipPath}`);
      
      // В реальной реализации:
      // 1. Через IPC вызываем распаковку ZIP в папку plugins/
      // 2. Читаем manifest.json
      // 3. Валидируем манифест
      // 4. Регистрируем плагин
      
      // Заглушка для будущей реализации
      throw new Error('Plugin installation not yet implemented');
      
    } catch (error: any) {
      log.error(`Failed to install plugin: ${error.message}`);
      return null;
    }
  }

  /**
   * Удаление плагина
   */
  async uninstallPlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        log.warn(`Plugin not found: ${pluginId}`);
        return false;
      }

      // Выключаем плагин если активен
      if (plugin.state === PluginState.ACTIVE) {
        await this.disablePlugin(pluginId);
      }

      // Используем IPC для физического удаления папки
      const electronAPI = (window as any).electronAPI;
      
      if (electronAPI) {
        const result = await electronAPI.ipcRenderer.invoke('uninstall-plugin', {
          pluginId
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to uninstall plugin');
        }
      }

      // Удаляем из реестра
      this.plugins.delete(pluginId);
      this.pluginInstances.delete(pluginId);

      log.info(`Plugin uninstalled: ${pluginId}`);
      return true;

    } catch (error: any) {
      log.error(`Failed to uninstall plugin: ${error.message}`);
      return false;
    }
  }

  /**
   * Включение плагина
   */
  async enablePlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        log.warn(`Plugin not found: ${pluginId}`);
        return false;
      }

      if (plugin.enabled) {
        log.info(`Plugin already enabled: ${pluginId}`);
        return true;
      }

      // Загружаем и активируем плагин
      plugin.state = PluginState.LOADING;

      // Загружаем стили плагина
      await this.loadPluginStyles(plugin);

      const instance = await this.loadPluginInstance(plugin);
      if (!instance) {
        plugin.state = PluginState.ERROR;
        plugin.error = 'Failed to load plugin instance';
        return false;
      }

      // Активируем плагин
      if (instance.activate) {
        instance.activate();
      }

      plugin.state = PluginState.ACTIVE;
      plugin.enabled = true;
      this.pluginInstances.set(pluginId, instance);

      // Сохраняем состояние
      await this.savePluginState(pluginId, true);

      log.info(`Plugin enabled: ${pluginId}`);
      return true;

    } catch (error: any) {
      log.error(`Failed to enable plugin: ${error.message}`);
      const plugin = this.plugins.get(pluginId);
      if (plugin) {
        plugin.state = PluginState.ERROR;
        plugin.error = error.message;
      }
      return false;
    }
  }

  /**
   * Выключение плагина
   */
  async disablePlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        log.warn(`Plugin not found: ${pluginId}`);
        return false;
      }

      if (!plugin.enabled) {
        return true;
      }

      const instance = this.pluginInstances.get(pluginId);
      if (instance && instance.deactivate) {
        instance.deactivate();
      }

      plugin.state = PluginState.INACTIVE;
      plugin.enabled = false;

      // Сохраняем состояние
      await this.savePluginState(pluginId, false);

      log.info(`Plugin disabled: ${pluginId}`);
      return true;
      
    } catch (error: any) {
      log.error(`Failed to disable plugin: ${error.message}`);
      return false;
    }
  }

  /**
   * Загрузка экземпляра плагина
   */
  private async loadPluginInstance(plugin: PluginInfo): Promise<any> {
    try {
      log.info(`Loading plugin instance: ${plugin.manifest.name} from ${plugin.path}`);

      // Используем IPC для загрузки main.js
      const electronAPI = (window as any).electronAPI;
      
      if (!electronAPI) {
        throw new Error('Electron API недоступен');
      }

      // Загружаем содержимое main.js
      const result = await electronAPI.ipcRenderer.invoke('load-plugin-file', {
        pluginPath: plugin.path,
        fileName: plugin.manifest.main
      });

      if (!result.success) {
        throw new Error(`Failed to load ${plugin.manifest.main}: ${result.error}`);
      }

      const code = result.content;

      log.info(`Plugin code loaded, size: ${code.length} bytes`);

      // Создаём blob URL для загрузки ES6 модуля
      const blob = new Blob([code], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);

      try {
        // Импортируем модуль через dynamic import
        const module = await import(url);
        
        log.info(`Plugin module imported successfully: ${plugin.manifest.name}`);
        
        // Освобождаем URL
        URL.revokeObjectURL(url);

        // Проверяем наличие функции activate
        if (!module.activate) {
          throw new Error('Plugin module does not export activate function');
        }

        log.info(`Plugin module loaded: ${plugin.manifest.name}`);

        // Возвращаем объект плагина
        return {
          activate: () => {
            log.info(`Activating plugin: ${plugin.manifest.name}`);
            try {
              const result = module.activate(this.api);
              return result;
            } catch (activateError: any) {
              log.error(`Plugin activation error: ${activateError.message}`);
              throw activateError;
            }
          },
          deactivate: module.deactivate || (() => {
            log.info(`Deactivating plugin: ${plugin.manifest.name}`);
          })
        };

      } catch (importError: any) {
        URL.revokeObjectURL(url);
        log.error(`Failed to import plugin module: ${importError.message}`);
        throw new Error(`Failed to load plugin: ${importError.message}`);
      }

    } catch (error: any) {
      log.error(`Failed to load plugin instance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Получить информацию о плагине
   */
  getPlugin(pluginId: string): PluginInfo | null {
    return this.plugins.get(pluginId) || null;
  }

  /**
   * Получить все плагины
   */
  getAllPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Получить активные плагины
   */
  getActivePlugins(): PluginInfo[] {
    return Array.from(this.plugins.values()).filter(p => p.state === PluginState.ACTIVE);
  }

  /**
   * Получить доступные плагины (не обязательно активные)
   */
  getAvailablePlugins(): PluginInfo[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Проверить наличие плагина
   */
  hasPlugin(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Получить API для плагинов
   */
  getAPI(): SmartTablePluginAPI | null {
    return this.api;
  }

  /**
   * Сохранить состояние плагина
   */
  private async savePluginState(pluginId: string, enabled: boolean): Promise<void> {
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI) {
        await electronAPI.ipcRenderer.invoke('save-plugin-state', {
          pluginId,
          enabled
        });
      }
    } catch (error: any) {
      log.error(`Failed to save plugin state: ${error.message}`);
    }
  }

  /**
   * Загрузить стили плагина
   */
  private async loadPluginStyles(plugin: PluginInfo): Promise<void> {
    try {
      const styles = plugin.manifest.styles;
      if (!styles || styles.length === 0) {
        log.info(`No styles defined for plugin: ${plugin.manifest.id}`);
        return;
      }

      log.info(`Loading styles for plugin ${plugin.manifest.id}:`, styles);

      const electronAPI = (window as any).electronAPI;
      if (!electronAPI) {
        log.warn('Electron API not available, skipping styles load');
        return;
      }

      const result = await electronAPI.ipcRenderer.invoke('load-plugin-styles', {
        pluginPath: plugin.path,
        styles: styles
      });

      log.info(`Load styles result:`, result);

      if (result.success && result.styles && result.styles.length > 0) {
        // Внедряем стили в документ
        result.styles.forEach((css: string, index: number) => {
          const styleId = `plugin-style-${plugin.manifest.id}-${index}`;

          // Проверяем, есть ли уже такой стиль
          let styleEl = document.getElementById(styleId) as HTMLStyleElement;

          if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = styleId;
            document.head.appendChild(styleEl);
            log.info(`Style element created: ${styleId}`);
          } else {
            log.info(`Style element already exists: ${styleId}`);
          }

          styleEl.textContent = css;
          log.info(`Style content set, length: ${css.length} chars`);
        });

        log.info(`Plugin styles loaded: ${plugin.manifest.name}`);
      } else {
        log.warn(`Failed to load styles:`, result);
      }
    } catch (error: any) {
      log.error(`Failed to load plugin styles: ${error.message}`);
    }
  }
}

// Экспорт единственного экземпляра
export const pluginManager = new PluginManager();
