/**
 * PluginMarketplace - сервис каталога плагинов
 * В будущем будет загружать данные из GitHub API или веб-маркетплейса
 */

import { createLogger } from '../logger.js';

const log = createLogger('PluginMarketplace');

/**
 * Информация о плагине в маркетплейсе
 */
export interface MarketplacePlugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  downloads: number;
  rating: number;
  icon?: string;
  repository: string;
  releaseUrl: string;
  tags: string[];
  lastUpdated: string;
}

/**
 * Менеджер маркетплейса плагинов
 */
export class PluginMarketplace {
  private plugins: MarketplacePlugin[] = [];
  private isLoading: boolean = false;

  constructor() {
    this.initializeDefaultPlugins();
  }

  /**
   * Инициализация базового списка плагинов
   * В будущем здесь будет загрузка из GitHub API
   */
  private initializeDefaultPlugins(): void {
    // Заглушка - в реальности будет API запрос к GitHub Releases
    this.plugins = [
      {
        id: 'com.smarttable.example-plugin',
        name: 'Example Plugin',
        version: '1.0.0',
        description: 'Пример плагина для демонстрации API SmartTable. Добавляет кнопку в ленту и показывает уведомления.',
        author: 'SmartTable Team',
        downloads: 1250,
        rating: 4.5,
        icon: '',
        repository: 'https://github.com/SmartTableTeam/example-plugin',
        releaseUrl: 'https://github.com/SmartTableTeam/example-plugin/releases/latest',
        tags: ['example', 'demo'],
        lastUpdated: '2026-03-01'
      },
      {
        id: 'com.smarttable.csv-advanced',
        name: 'CSV Advanced Import',
        version: '2.1.0',
        description: 'Расширенный импорт CSV с поддержкой различных кодировок, разделителей и предпросмотром данных перед импортом.',
        author: 'SmartTable Team',
        downloads: 3420,
        rating: 4.8,
        icon: '',
        repository: 'https://github.com/SmartTableTeam/csv-advanced',
        releaseUrl: 'https://github.com/SmartTableTeam/csv-advanced/releases/latest',
        tags: ['csv', 'import', 'data'],
        lastUpdated: '2026-02-28'
      },
      {
        id: 'com.smarttable.chart-enhancer',
        name: 'Chart Enhancer',
        version: '1.5.2',
        description: 'Дополнительные типы диаграмм: Gantt, Waterfall, Funnel. Расширенные настройки форматирования графиков.',
        author: 'SmartTable Team',
        downloads: 2890,
        rating: 4.7,
        icon: '',
        repository: 'https://github.com/SmartTableTeam/chart-enhancer',
        releaseUrl: 'https://github.com/SmartTableTeam/chart-enhancer/releases/latest',
        tags: ['charts', 'visualization', 'graphs'],
        lastUpdated: '2026-02-25'
      },
      {
        id: 'com.smarttable.formula-plus',
        name: 'Formula Plus',
        version: '3.0.1',
        description: '50+ новых формул: статистика, инженерные расчёты, работа с текстом. Автодополнение и подсказки синтаксиса.',
        author: 'SmartTable Team',
        downloads: 5120,
        rating: 4.9,
        icon: '',
        repository: 'https://github.com/SmartTableTeam/formula-plus',
        releaseUrl: 'https://github.com/SmartTableTeam/formula-plus/releases/latest',
        tags: ['formulas', 'functions', 'math'],
        lastUpdated: '2026-03-05'
      },
      {
        id: 'com.smarttable.auto-format',
        name: 'Auto Format',
        version: '1.2.0',
        description: 'Автоматическое форматирование таблиц по стилям. Быстрое применение тем оформления к выделенным диапазонам.',
        author: 'SmartTable Team',
        downloads: 1876,
        rating: 4.3,
        icon: '',
        repository: 'https://github.com/SmartTableTeam/auto-format',
        releaseUrl: 'https://github.com/SmartTableTeam/auto-format/releases/latest',
        tags: ['formatting', 'styles', 'automation'],
        lastUpdated: '2026-02-20'
      },
      {
        id: 'com.smarttable.notes-plugin',
        name: 'Заметки',
        version: '1.0.0',
        description: 'Простой плагин для создания заметок. Открывается в отдельном окне, сохраняет все заметки локально.',
        author: 'SmartTable Team',
        downloads: 890,
        rating: 4.6,
        icon: '',
        repository: 'https://github.com/kotyara12345678/SmartTable_notes_plugin',
        releaseUrl: 'https://github.com/kotyara12345678/SmartTable_notes_plugin/releases/download/plugin/notes-plugin.zip',
        tags: ['notes', 'заметки', 'текст'],
        lastUpdated: '2026-03-08'
      },
      {
        id: 'com.smarttable.data-validator',
        name: 'Data Validator',
        version: '2.0.3',
        description: 'Валидация данных по правилам: email, телефон, URL, диапазоны значений. Подсветка некорректных ячеек.',
        author: 'SmartTable Team',
        downloads: 2340,
        rating: 4.6,
        icon: '',
        repository: 'https://github.com/SmartTableTeam/data-validator',
        releaseUrl: 'https://github.com/SmartTableTeam/data-validator/releases/latest',
        tags: ['validation', 'data', 'quality'],
        lastUpdated: '2026-02-15'
      }
    ];

    log.info(`Marketplace initialized with ${this.plugins.length} plugins`);
  }

  /**
   * Получить все плагины
   */
  getAllPlugins(): MarketplacePlugin[] {
    return [...this.plugins];
  }

  /**
   * Получить плагин по ID
   */
  getPluginById(id: string): MarketplacePlugin | null {
    return this.plugins.find(p => p.id === id) || null;
  }

  /**
   * Поиск плагинов по запросу
   */
  searchPlugins(query: string): MarketplacePlugin[] {
    const lowerQuery = query.toLowerCase();
    return this.plugins.filter(plugin =>
      plugin.name.toLowerCase().includes(lowerQuery) ||
      plugin.description.toLowerCase().includes(lowerQuery) ||
      plugin.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      plugin.author.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Фильтрация по тегам
   */
  filterByTags(tags: string[]): MarketplacePlugin[] {
    return this.plugins.filter(plugin =>
      tags.some(tag => plugin.tags.includes(tag.toLowerCase()))
    );
  }

  /**
   * Получить популярные плагины
   */
  getPopularPlugins(limit: number = 10): MarketplacePlugin[] {
    return [...this.plugins]
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);
  }

  /**
   * Получить плагины с высоким рейтингом
   */
  getTopRatedPlugins(limit: number = 10): MarketplacePlugin[] {
    return [...this.plugins]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }

  /**
   * Получить недавно обновлённые плагины
   */
  getRecentlyUpdatedPlugins(limit: number = 10): MarketplacePlugin[] {
    return [...this.plugins]
      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
      .slice(0, limit);
  }

  /**
   * Получить плагины по категории
   */
  getByCategory(category: string): MarketplacePlugin[] {
    return this.plugins.filter(plugin =>
      plugin.tags.includes(category.toLowerCase())
    );
  }

  /**
   * Загрузить актуальные данные из маркетплейса
   * В будущем будет API запрос к серверу
   */
  async refresh(): Promise<void> {
    if (this.isLoading) return;

    this.isLoading = true;
    log.info('Refreshing marketplace data...');

    try {
      // В будущем здесь будет fetch к API маркетплейса
      // Например: GitHub API для получения данных из Releases
      // const response = await fetch('https://api.smarttable.com/plugins');
      // this.plugins = await response.json();

      // Симуляция задержки сети
      await new Promise(resolve => setTimeout(resolve, 500));

      log.info('Marketplace data refreshed');
    } catch (error: any) {
      log.error('Failed to refresh marketplace:', error.message);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Получить статус загрузки
   */
  isLoadingData(): boolean {
    return this.isLoading;
  }

  /**
   * Получить общее количество плагинов
   */
  getTotalCount(): number {
    return this.plugins.length;
  }

  /**
   * Получить все уникальные теги
   */
  getAllTags(): string[] {
    const tags = new Set<string>();
    this.plugins.forEach(plugin => {
      plugin.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }
}

// Экспорт единственного экземпляра
export const pluginMarketplace = new PluginMarketplace();
