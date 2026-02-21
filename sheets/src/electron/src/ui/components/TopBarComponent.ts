/**
 * TopBar Component - верхняя панель приложения
 */
import { BaseComponent } from '../core/component';

export class TopBarComponent extends BaseComponent {
  private fileName: HTMLElement | null = null;
  private fileStatus: HTMLElement | null = null;
  private menuItems: NodeListOf<HTMLElement> | null = null;
  private btnAI: HTMLElement | null = null;
  
  constructor() {
    super('top-bar-container');
  }
  
  init(): void {
    this.render();
    this.initElements();
    this.bindEvents();
  }
  
  /**
   * Рендеринг HTML
   */
  private render(): void {
    this.container.innerHTML = `
      <header class="top-bar">
        <div class="top-bar-left">
          <div class="app-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" fill="#10b981"/>
              <path d="M7 8h10M7 12h10M7 16h6" stroke="white" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="file-info">
            <span class="file-name" id="fileName">Без названия 1</span>
            <span class="file-status" id="fileStatus">Сохранено</span>
          </div>
        </div>

        <nav class="main-menu">
          <button class="menu-item active" data-tab="home">Главная</button>
          <button class="menu-item" data-tab="insert">Вставка</button>
          <button class="menu-item" data-tab="formulas">Формулы</button>
          <button class="menu-item" data-tab="data">Данные</button>
          <button class="menu-item" data-tab="view">Вид</button>
          <button class="menu-item" data-tab="help">Справка</button>
        </nav>

        <div class="top-bar-right">
          <button class="btn-ai-top" id="btnAI">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2z"/>
            </svg>
            ИИ Помощник
          </button>
          <button class="btn-share">Поделиться</button>
          <div class="user-avatar" id="userAvatar">U</div>
        </div>
      </header>
    `;
  }
  
  /**
   * Инициализация элементов
   */
  private initElements(): void {
    this.fileName = this.querySelector('#fileName');
    this.fileStatus = this.querySelector('#fileStatus');
    this.menuItems = this.querySelectorAll('.menu-item');
    this.btnAI = this.querySelector('#btnAI');
  }
  
  /**
   * Привязка событий
   */
  private bindEvents(): void {
    // Переключение вкладок меню
    this.menuItems?.forEach(item => {
      item.addEventListener('click', () => this.handleMenuClick(item));
    });
    
    // Кнопка ИИ
    this.bindEvent(this.btnAI, 'click', (e) => this.handleAIClick(e));
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
    this.onTabChange(tab || 'home');
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
   * Событие смены вкладки
   */
  protected onTabChange(tab: string): void {
    console.log('[TopBar] Tab changed:', tab);
    // Переопределяется в наследниках или через события
  }
  
  /**
   * Установить имя файла
   */
  setFileName(name: string): void {
    if (this.fileName) {
      this.fileName.textContent = name;
    }
  }
  
  /**
   * Установить статус файла
   */
  setFileStatus(status: string): void {
    if (this.fileStatus) {
      this.fileStatus.textContent = status;
    }
  }
}
