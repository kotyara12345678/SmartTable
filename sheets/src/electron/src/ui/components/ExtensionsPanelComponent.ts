/**
 * ExtensionsPanel Component - панель управления расширениями
 * Дизайн в стиле VS Code Extensions Marketplace
 */

import { BaseComponent } from '../core/component.js';
import { pluginManager } from '../core/plugins/PluginManager.js';
import { pluginMarketplace, MarketplacePlugin } from '../core/plugins/PluginMarketplace.js';
import { PluginInfo, PluginState } from '../core/plugins/PluginTypes.js';
import { createLogger } from '../core/logger.js';

const log = createLogger('ExtensionsPanel');

type ExtensionsTab = 'all' | 'popular' | 'top-rated' | 'recent' | 'installed';

export class ExtensionsPanelComponent extends BaseComponent {
  private panel: HTMLElement | null = null;
  private pluginsList: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private closeBtn: HTMLElement | null = null;
  private tabs: Map<ExtensionsTab, HTMLElement> = new Map();
  private currentTab: ExtensionsTab = 'all';
  private searchQuery: string = '';

  constructor() {
    super('extensions-panel-container');
  }

  init(): void {
    this.render();
    this.initElements();
    this.bindEvents();
    log.info('ExtensionsPanel initialized');
  }

  /**
   * Отрисовка компонента
   */
  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="extensions-panel">
        <div class="extensions-panel-header">
          <div class="extensions-panel-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
            <span>Расширения</span>
          </div>
          <button class="extensions-panel-close" title="Закрыть">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="extensions-search-container">
          <input 
            type="text" 
            class="extensions-search-input" 
            id="extensionsSearch"
            placeholder="Поиск расширений (например: формулы, диаграммы, импорт)"
          >
        </div>

        <div class="extensions-tabs">
          <button class="extensions-tab active" data-tab="all">Все</button>
          <button class="extensions-tab" data-tab="popular">Популярные</button>
          <button class="extensions-tab" data-tab="top-rated">С высоким рейтингом</button>
          <button class="extensions-tab" data-tab="recent">Недавние</button>
          <button class="extensions-tab" data-tab="installed">Установленные</button>
        </div>

        <div class="extensions-list-section">
          <div class="plugins-grid" id="pluginsList">
            <!-- Плагины будут загружены динамически -->
          </div>
        </div>

        <div class="extensions-panel-footer">
          <a href="#" class="extensions-footer-link" id="btnSubmitPlugin">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
            Опубликовать своё расширение
          </a>
        </div>
      </div>
    `;
  }

  /**
   * Инициализация элементов
   */
  private initElements(): void {
    this.panel = this.container;
    this.pluginsList = this.container?.querySelector('#pluginsList');
    this.searchInput = this.container?.querySelector('#extensionsSearch') as HTMLInputElement;
    this.closeBtn = this.container?.querySelector('.extensions-panel-close');
    
    // Инициализация вкладок
    const tabElements = this.container?.querySelectorAll('.extensions-tab');
    tabElements?.forEach(tab => {
      const tabName = (tab as HTMLElement).dataset.tab as ExtensionsTab;
      if (tabName) {
        this.tabs.set(tabName, tab as HTMLElement);
      }
    });
  }

  /**
   * Привязка событий
   */
  private bindEvents(): void {
    // Закрытие панели
    this.closeBtn?.addEventListener('click', () => this.close());

    // Поиск плагинов
    this.searchInput?.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.loadPluginsList();
    });

    // Переключение вкладок
    this.tabs.forEach((tab, tabName) => {
      tab.addEventListener('click', () => {
        this.switchTab(tabName);
      });
    });

    // Кнопка отправки плагина
    this.container?.querySelector('#btnSubmitPlugin')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openSubmitPluginPage();
    });

    // Закрытие по клику вне панели
    document.addEventListener('click', (e) => {
      if (this.isOpen() && !this.container?.contains(e.target as Node)) {
        this.close();
      }
    });

    // Загрузка списка плагинов при открытии
    this.container?.addEventListener('extensions-panel-open', () => {
      this.loadPluginsList();
    });
  }

  /**
   * Переключение вкладки
   */
  private switchTab(tabName: ExtensionsTab): void {
    this.currentTab = tabName;
    
    // Обновляем активную вкладку
    this.tabs.forEach((tab, name) => {
      if (name === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    this.loadPluginsList();
  }

  /**
   * Загрузка списка плагинов
   */
  private loadPluginsList(): void {
    if (!this.pluginsList) return;

    let plugins: MarketplacePlugin[] = [];
    let sectionTitle = '';
    let showInstalledSection = false;

    // Получаем плагины в зависимости от вкладки
    switch (this.currentTab) {
      case 'popular':
        plugins = pluginMarketplace.getPopularPlugins();
        sectionTitle = 'Популярные расширения';
        break;
      case 'top-rated':
        plugins = pluginMarketplace.getTopRatedPlugins();
        sectionTitle = 'С высоким рейтингом';
        break;
      case 'recent':
        plugins = pluginMarketplace.getRecentlyUpdatedPlugins();
        sectionTitle = 'Недавно обновлённые';
        break;
      case 'installed':
        plugins = this.getInstalledPluginsFromMarketplace();
        sectionTitle = 'Установленные расширения';
        showInstalledSection = true;
        break;
      case 'all':
      default:
        plugins = pluginMarketplace.getAllPlugins();
        sectionTitle = 'Все расширения';
        break;
    }

    // Применяем поиск если есть запрос
    if (this.searchQuery.trim()) {
      plugins = pluginMarketplace.searchPlugins(this.searchQuery);
      sectionTitle = `Результаты поиска: ${this.searchQuery}`;
    }

    if (plugins.length === 0) {
      this.renderEmptyState();
      return;
    }

    // Рендерим заголовок секции
    const headerHtml = `
      <div class="extensions-section-header">
        <span class="extensions-section-title">${sectionTitle}</span>
        <span class="extensions-section-count">${plugins.length}</span>
      </div>
    `;

    // Рендерим карточки плагинов
    const cardsHtml = plugins.map(plugin => this.renderPluginCard(plugin, showInstalledSection)).join('');

    this.pluginsList.innerHTML = headerHtml + cardsHtml;

    // Привязка событий для кнопок
    this.pluginsList.querySelectorAll('[data-plugin-id]').forEach(card => {
      const pluginId = (card as HTMLElement).dataset.pluginId;
      if (!pluginId) return;

      // Кнопка установки (для не установленных плагинов)
      const installBtn = card.querySelector('.plugin-install-btn');
      installBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleInstallPlugin(pluginId);
      });

      // Кнопка включения/выключения (для установленных плагинов)
      const toggleBtn = card.querySelector('.plugin-toggle-btn');
      toggleBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleTogglePlugin(pluginId);
      });

      // Кнопка удаления (для установленных плагинов)
      const uninstallBtn = card.querySelector('.plugin-uninstall-btn');
      uninstallBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleUninstallPlugin(pluginId);
      });

      // Клик по карточке - открытие страницы плагина
      card.addEventListener('click', () => {
        this.openPluginDetails(pluginId);
      });
    });
  }

  /**
   * Получить установленные плагины из маркетплейса
   */
  private getInstalledPluginsFromMarketplace(): MarketplacePlugin[] {
    const installedPlugins = pluginManager.getAllPlugins();
    const installedIds = new Set(installedPlugins.map(p => p.manifest.id));
    
    return pluginMarketplace.getAllPlugins().filter(p => installedIds.has(p.id));
  }

  /**
   * Отрисовка карточки плагина
   */
  private renderPluginCard(plugin: MarketplacePlugin, showInstalledSection: boolean = false): string {
    const isInstalled = pluginManager.hasPlugin(plugin.id);
    const installedPlugin = isInstalled ? pluginManager.getPlugin(plugin.id) : null;
    const isEnabled = installedPlugin?.enabled ?? false;

    return `
      <div class="plugin-card ${showInstalledSection ? 'plugin-card-installed' : ''}" data-plugin-id="${plugin.id}">
        <div class="plugin-card-icon">
          ${plugin.icon
            ? `<img src="${plugin.icon}" alt="${plugin.name}" onerror="this.style.display='none'">`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
               </svg>`
          }
        </div>
        <div class="plugin-card-content">
          <div class="plugin-card-header">
            <h3 class="plugin-card-name">${this.escapeHtml(plugin.name)}</h3>
            <span class="plugin-card-version">v${plugin.version}</span>
          </div>
          <p class="plugin-card-description">${this.escapeHtml(plugin.description)}</p>
          <div class="plugin-card-meta">
            <div class="plugin-meta-item plugin-rating">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
              <span>${plugin.rating.toFixed(1)}</span>
            </div>
            <div class="plugin-meta-item plugin-downloads">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>${this.formatDownloads(plugin.downloads)}</span>
            </div>
            <div class="plugin-meta-item">
              <span>by ${this.escapeHtml(plugin.author)}</span>
            </div>
          </div>
          ${!showInstalledSection && plugin.tags.length > 0 ? `
            <div class="plugin-tags">
              ${plugin.tags.slice(0, 4).map(tag => `<span class="plugin-tag">${tag}</span>`).join('')}
            </div>
          ` : ''}
        </div>
        ${showInstalledSection ? `
          <div class="plugin-actions">
            <button class="plugin-toggle-btn ${isEnabled ? 'enabled' : 'disabled'}" title="${isEnabled ? 'Отключить' : 'Включить'}">
              ${isEnabled ? 'Включено' : 'Отключено'}
            </button>
            <button class="plugin-uninstall-btn" title="Удалить плагин">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3,6 5,6 21,6"/>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                <line x1="10" y1="11" x2="10" y2="17"/>
                <line x1="14" y1="11" x2="14" y2="17"/>
              </svg>
            </button>
          </div>
        ` : `
          <button class="plugin-install-btn ${isInstalled ? 'installed' : ''}">
            ${isInstalled ? (isEnabled ? 'Установлено' : 'Отключено') : 'Установить'}
          </button>
        `}
      </div>
    `;
  }

  /**
   * Отрисовка пустого состояния
   */
  private renderEmptyState(): void {
    if (!this.pluginsList) return;

    const isEmpty = this.searchQuery.trim() === '' && this.currentTab === 'installed';
    
    this.pluginsList.innerHTML = `
      <div class="extensions-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
        ${isEmpty 
          ? `
            <h3 class="extensions-empty-title">Нет установленных расширений</h3>
            <p class="extensions-empty-text">
              Выберите вкладку "Все", "Популярные" или другую, чтобы浏览 доступные плагины и установить их.
            </p>
          ` 
          : `
            <h3 class="extensions-empty-title">Ничего не найдено</h3>
            <p class="extensions-empty-text">
              Попробуйте изменить поисковый запрос или выбрать другую категорию.
            </p>
          `
        }
      </div>
    `;
  }

  /**
   * Обработчик установки плагина
   */
  private async handleInstallPlugin(pluginId: string): Promise<void> {
    try {
      const plugin = pluginMarketplace.getPluginById(pluginId);
      if (!plugin) {
        throw new Error('Плагин не найден в маркетплейсе');
      }

      const isInstalled = pluginManager.hasPlugin(pluginId);

      if (isInstalled) {
        // Плагин уже установлен - переключаем состояние
        const installedPlugin = pluginManager.getPlugin(pluginId);
        
        // Проверяем, существует ли папка плагина физически
        const electronAPI = (window as any).electronAPI;
        let pluginExists = true;
        
        if (electronAPI) {
          const result = await electronAPI.ipcRenderer.invoke('get-installed-plugins');
          if (result.success) {
            pluginExists = result.plugins.some((p: any) => p.id === pluginId);
          }
        }
        
        if (!pluginExists) {
          // Плагин удалён физически - удаляем из реестра и переустанавливаем
          pluginManager.getAllPlugins().forEach(p => {
            if (p.manifest.id === pluginId) {
              pluginManager['plugins'].delete(pluginId);
              pluginManager['pluginInstances'].delete(pluginId);
            }
          });
          // Продолжаем установку как нового плагина
        } else if (installedPlugin?.enabled) {
          await pluginManager.disablePlugin(pluginId);
        } else {
          await pluginManager.enablePlugin(pluginId);
        }
        
        if (pluginExists) {
          this.loadPluginsList();
          return;
        }
      }

      // НОВАЯ ЛОГИКА: Установка из GitHub Releases
      const { pluginInstaller } = await import('../core/plugins/PluginInstaller.js');
      
      // Проверяем URL
      if (!pluginInstaller.isValidGitHubReleaseUrl(plugin.releaseUrl)) {
        throw new Error('Неверный URL релиза. Ожидаемый формат: https://github.com/owner/repo/releases/...');
      }

      // Показываем прогресс установки
      const progressCard = this.showInstallProgress(plugin.name);
      
      try {
        const result = await pluginInstaller.installFromRelease(
          plugin.releaseUrl,
          (progress: any) => {
            this.updateProgress(progressCard, progress);
          }
        );

        if (!result.success) {
          this.hideProgress(progressCard);
          throw new Error(result.error || 'Ошибка установки');
        }

        // Успех - обновляем список плагинов и активируем
        // Используем pluginId из результата установки (из manifest.json)
        const installedPluginId = result.pluginId || pluginId;
        log.info('Plugin installed with ID:', installedPluginId);

        // Обновляем список плагинов в PluginManager
        await pluginManager.refreshInstalledPlugins();
        
        // Теперь активируем плагин
        await pluginManager.enablePlugin(installedPluginId);

        this.hideProgress(progressCard);
        this.loadPluginsList();

        this.showToast(
          `Плагин "${plugin.name}" успешно установлен!`,
          'success'
        );

      } catch (installError: any) {
        this.hideProgress(progressCard);
        throw installError;
      }

    } catch (error: any) {
      log.error('Failed to install plugin:', error.message);
      this.showToast('Ошибка установки: ' + error.message, 'error');
    }
  }

  /**
   * Обработчик переключения состояния плагина (вкл/выкл)
   */
  private async handleTogglePlugin(pluginId: string): Promise<void> {
    try {
      const plugin = pluginManager.getPlugin(pluginId);
      if (!plugin) {
        throw new Error('Плагин не найден');
      }

      if (plugin.enabled) {
        await pluginManager.disablePlugin(pluginId);
        this.showToast(`Плагин "${plugin.manifest.name}" отключён`, 'info');
      } else {
        await pluginManager.enablePlugin(pluginId);
        this.showToast(`Плагин "${plugin.manifest.name}" включён`, 'success');
      }

      this.loadPluginsList();
    } catch (error: any) {
      log.error('Failed to toggle plugin:', error.message);
      this.showToast('Ошибка: ' + error.message, 'error');
    }
  }

  /**
   * Обработчик удаления плагина
   */
  private async handleUninstallPlugin(pluginId: string): Promise<void> {
    try {
      const plugin = pluginManager.getPlugin(pluginId);
      if (!plugin) {
        throw new Error('Плагин не найден');
      }

      // Подтверждение удаления
      const confirmed = confirm(`Вы уверены, что хотите удалить плагин "${plugin.manifest.name}"?\n\nЭто действие нельзя отменить.`);
      
      if (!confirmed) {
        return;
      }

      const success = await pluginManager.uninstallPlugin(pluginId);

      if (success) {
        this.showToast(`Плагин "${plugin.manifest.name}" удалён`, 'success');
        this.loadPluginsList();
      } else {
        throw new Error('Не удалось удалить плагин');
      }
    } catch (error: any) {
      log.error('Failed to uninstall plugin:', error.message);
      this.showToast('Ошибка удаления: ' + error.message, 'error');
    }
  }

  /**
   * Показать карточку прогресса установки
   */
  private showInstallProgress(pluginName: string): HTMLElement {
    const progressCard = document.createElement('div');
    progressCard.className = 'plugin-install-progress';
    progressCard.style.cssText = `
      background: var(--bg-primary, #ffffff);
      border: 1px solid var(--border-color, #e0e0e0);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 12px;
      text-align: center;
    `;
    progressCard.innerHTML = `
      <div class="loading-spinner" style="
        width: 40px;
        height: 40px;
        border: 3px solid var(--border-color, #e0e0e0);
        border-top-color: var(--accent-color, #107c41);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 16px;
      "></div>
      <div class="progress-message" style="
        font-size: 14px;
        font-weight: 500;
        color: var(--text-primary, #333);
        margin-bottom: 12px;
      ">Установка "${pluginName}"...</div>
      <div class="progress-bar" style="
        width: 100%;
        height: 4px;
        background: var(--bg-secondary, #f5f5f5);
        border-radius: 2px;
        overflow: hidden;
      ">
        <div class="progress-fill" style="
          width: 0%;
          height: 100%;
          background: var(--accent-color, #107c41);
          transition: width 0.3s ease;
        "></div>
      </div>
      <div class="progress-status" style="
        font-size: 12px;
        color: var(--text-secondary, #666);
        margin-top: 8px;
      ">Загрузка...</div>
    `;
    
    this.pluginsList?.insertBefore(progressCard, this.pluginsList.firstChild);
    return progressCard;
  }

  /**
   * Обновить прогресс установки
   */
  private updateProgress(card: HTMLElement, progress: any): void {
    const fill = card.querySelector('.progress-fill') as HTMLElement;
    const message = card.querySelector('.progress-message') as HTMLElement;
    const status = card.querySelector('.progress-status') as HTMLElement;
    
    if (fill) fill.style.width = `${progress.progress}%`;
    if (message) message.textContent = progress.message;
    if (status) {
      status.textContent = `${progress.stage === 'complete' ? 'Готово!' : `${progress.progress}%`}`;
    }
  }

  /**
   * Скрыть карточку прогресса
   */
  private hideProgress(card: HTMLElement): void {
    card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    card.style.opacity = '0';
    card.style.transform = 'translateY(-20px)';
    setTimeout(() => card.remove(), 300);
  }

  /**
   * Показать уведомление (toast)
   */
  private showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 14px 20px;
      background: ${type === 'success' ? '#107c41' : type === 'error' ? '#c62828' : '#1976d2'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      font-size: 14px;
      font-weight: 500;
      z-index: 100000;
      animation: slideInRight 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Открытие страницы с деталями плагина
   */
  private openPluginDetails(pluginId: string): void {
    const plugin = pluginMarketplace.getPluginById(pluginId);
    if (!plugin) return;

    // В будущей реализации здесь будет открытие модального окна с подробной информацией
    // Сейчас открываем репозиторий плагина
    log.info('Opening plugin details:', plugin.name);
    
    const details = `
      ${plugin.name} v${plugin.version}
      
      ${plugin.description}
      
      Автор: ${plugin.author}
      Рейтинг: ${plugin.rating.toFixed(1)} ⭐
      Загрузок: ${this.formatDownloads(plugin.downloads)}
      Теги: ${plugin.tags.join(', ')}
      
      Репозиторий: ${plugin.repository}
    `;
    
    alert(details);
    
    // В будущем: открытие модального окна с README, скриншотами, версией, changelog
  }

  /**
   * Открыть страницу отправки плагина
   */
  private openSubmitPluginPage(): void {
    log.info('Opening submit plugin page');
    alert('Публикация расширений\n\n' +
      '1. Создайте плагин по документации (DEVELOPER_GUIDE.md)\n' +
      '2. Опубликуйте на GitHub с релизами\n' +
      '3. Отправьте ссылку на inclusion в SmartTable\n' +
      '4. После проверки плагин появится в маркетплейсе');
  }

  /**
   * Форматирование числа загрузок
   */
  private formatDownloads(count: number): string {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  }

  /**
   * Экранирование HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Открыть панель
   */
  open(): void {
    if (this.panel) {
      this.panel.classList.add('open');
      this.loadPluginsList();
      log.info('ExtensionsPanel opened');
    }
  }

  /**
   * Закрыть панель
   */
  close(): void {
    if (this.panel) {
      this.panel.classList.remove('open');
      log.info('ExtensionsPanel closed');
    }
  }

  /**
   * Проверка: открыта ли панель
   */
  isOpen(): boolean {
    return this.panel?.classList.contains('open') || false;
  }

  /**
   * Переключить состояние панели
   */
  toggle(): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }
}
