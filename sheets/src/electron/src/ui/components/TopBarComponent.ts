/**
 * TopBar Component - верхняя панель приложения
 */
import { BaseComponent } from '../core/component.js';

export class TopBarComponent extends BaseComponent {
  private fileName: HTMLElement | null = null;
  private fileStatus: HTMLElement | null = null;
  private menuItems: NodeListOf<HTMLElement> | null = null;
  private btnAI: HTMLElement | null = null;
  private btnSettings: HTMLElement | null = null;
  private appIcon: HTMLElement | null = null;
  private onReturnToStart: (() => void) | null = null;

  constructor() {
    super('top-bar-container');
  }
  
  init(): void {
    // HTML уже есть в index.html, просто инициализируем элементы
    this.initElements();
    this.bindEvents();
  }
  
  /**
   * Инициализация элементов
   */
  private initElements(): void {
    this.fileName = this.querySelector('#fileName');
    this.fileStatus = this.querySelector('#fileStatus');
    this.menuItems = this.querySelectorAll('.menu-item');
    this.btnAI = this.querySelector('#btnAI');
    this.btnSettings = this.querySelector('#btnSettings');
    this.appIcon = this.querySelector('.app-icon');
  }

  /**
   * Привязка событий
   */
  private bindEvents(): void {
    // Клик по иконке приложения
    this.appIcon?.addEventListener('click', () => this.showAppMenu());
    
    // Переключение вкладок меню
    this.menuItems?.forEach(item => {
      item.addEventListener('click', () => this.handleMenuClick(item));
    });

    // Кнопка ИИ
    this.bindEvent(this.btnAI, 'click', (e) => this.handleAIClick(e));

    // Кнопка настроек
    this.bindEvent(this.btnSettings, 'click', (e) => this.handleSettingsClick(e));
  }
  
  /**
   * Обработчик клика по меню
   */
  private handleMenuClick(clickedItem: HTMLElement): void {
    this.menuItems?.forEach(item => {
      item.classList.remove('active');
      if (item === clickedItem) {
        item.classList.add('active');
      }
    });

    const tab = clickedItem.dataset.tab;
    const tabName = tab || 'home';
    
    // Отправляем событие для переключения ribbon
    document.dispatchEvent(new CustomEvent('ribbon-tab-change', { detail: { tab: tabName } }));
    
    this.onTabChange(tabName);
  }

  /**
   * Обработчик клика по кнопке ИИ
   */
  private handleAIClick(event: Event): void {
    event.stopPropagation();
    // Эмитим событие для открытия AI панели
    document.dispatchEvent(new CustomEvent('ai-panel-open'));
  }

  /**
   * Обработчик клика по кнопке настроек
   */
  private handleSettingsClick(event: Event): void {
    event.stopPropagation();
    // Эмитим событие для открытия панели настроек
    document.dispatchEvent(new CustomEvent('settings-panel-open'));
  }
  
  /**
   * Событие смены вкладки
   */
  protected onTabChange(tab: string): void {
    console.log('[TopBar] Tab changed:', tab);
  }
  
  setFileName(name: string): void {
    if (this.fileName) {
      this.fileName.textContent = name;
    }
  }

  setProjectName(name: string): void {
    this.setFileName(name);
  }

  setFileStatus(status: string): void {
    if (this.fileStatus) {
      this.fileStatus.textContent = status;
    }
  }

  /**
   * Показать меню приложения
   */
  private showAppMenu(): void {
    // Удаляем старое меню если есть
    const oldMenu = document.querySelector('.app-context-menu');
    if (oldMenu) oldMenu.remove();

    // Создаём новое меню
    const menu = document.createElement('div');
    menu.className = 'app-context-menu';

    menu.innerHTML = `
      <button class="app-menu-item" id="menuReturnToStart">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>Вернуться на начальный экран</span>
      </button>
      <div class="app-menu-divider"></div>
      <button class="app-menu-item" id="menuClose">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        <span>Закрыть</span>
      </button>
    `;

    document.body.appendChild(menu);

    // Обработчики
    menu.querySelector('#menuReturnToStart')?.addEventListener('click', () => {
      this.returnToStartScreen();
      menu.remove();
    });

    menu.querySelector('#menuClose')?.addEventListener('click', () => {
      menu.remove();
    });

    // Закрыть при клике вне меню
    const closeOnOutsideClick = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        document.removeEventListener('click', closeOnOutsideClick);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', closeOnOutsideClick);
    }, 100);
  }

  /**
   * Вернуться на начальный экран
   */
  private returnToStartScreen(): void {
    // Сохраняем данные перед уходом
    localStorage.removeItem('smarttable-current-project');
    
    // Показываем начальный экран
    const startScreen = (window as any).startScreen;
    if (startScreen) {
      startScreen.show();
    }
    
    // Сбрасываем название
    this.setProjectName('Без названия');
  }

  /**
   * Установить обработчик возврата на начальный экран
   */
  setReturnToStartHandler(handler: () => void): void {
    this.onReturnToStart = handler;
  }
}
